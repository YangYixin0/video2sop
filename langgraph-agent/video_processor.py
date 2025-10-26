"""
视频处理工具：获取视频时长、叠加时间戳、分段切割并上传到OSS
"""

import os
import json
import tempfile
import subprocess
from typing import List, Dict, Optional, Tuple

import requests

from oss_manager import upload_file_to_oss


def _run_cmd(cmd: List[str], timeout: int = 600) -> Tuple[int, str, str]:
    """运行子进程命令，返回(returncode, stdout, stderr)"""
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return result.returncode, result.stdout, result.stderr


def _download_to_temp(url: str, suffix: str = ".mp4") -> str:
    """下载远程文件到本地临时路径，返回本地路径"""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        resp = requests.get(url, timeout=300)
        resp.raise_for_status()
        f.write(resp.content)
        return f.name


def get_video_duration(video_source: str, is_local_file: bool = False) -> float:
    """获取视频时长（秒），支持URL和本地文件"""
    input_path = None
    try:
        if is_local_file:
            input_path = video_source
        else:
            input_path = _download_to_temp(video_source, ".mp4")
        
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            input_path
        ]
        code, out, err = _run_cmd(cmd, timeout=60)
        if code != 0:
            raise RuntimeError(f"ffprobe failed: {err}")
        return float(out.strip())
    finally:
        if not is_local_file and input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass


def add_timestamp_overlay(
    video_source: str,  # 可以是URL或本地路径
    client_session_id: str,  # 改用client_session_id
    output_filename: str = "video_with_ts.mp4",
    is_local_file: bool = False
) -> str:
    """
    为视频添加右上角时间戳(MM:SS)覆盖，并上传到OSS。
    Args:
        video_source: 源视频URL或本地路径
        client_session_id: 会话ID
        output_filename: 输出文件名
        is_local_file: 是否为本地文件
    Returns:
        带时间戳视频的OSS URL
    """
    input_path = None
    output_path = None
    try:
        if is_local_file:
            input_path = video_source
        else:
            input_path = _download_to_temp(video_source, ".mp4")
        fd, output_path = tempfile.mkstemp(suffix=".mp4")
        os.close(fd)

        # 字体路径(常见Linux字体路径)，如无该字体，ffmpeg仍可回退默认
        font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        # 使用 t(秒) 显示 "时间：mm:ss"，更通用，不依赖 gmtime
        # minutes = floor(t/60), seconds = mod(t,60)
        # 使用英文避免中文字体问题，并优化编码速度
        drawtext = (
            f"drawtext=fontfile={font_path}:"
            "text='Time\\: %{eif\\:floor(t/60)\\:d\\:2}\\:%{eif\\:mod(t\\,60)\\:d\\:2}':"
            "x=w-tw-10:y=h-th-10:"
            "fontsize=40:fontcolor=white:box=1:boxcolor=black@0.55:"
            "borderw=2:bordercolor=black@0.8"
        )

        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-vf', drawtext,
            # 使用x264最快预设以提速叠加过程
            '-c:v', 'libx264',
            '-preset', 'ultrafast',  # 最快编码预设
            '-crf', '28',  # 稍微降低质量换取速度
            '-threads', '0',  # 使用所有可用CPU核心进行多线程编码
            '-c:a', 'copy',  # 音频直接复制，不重编码
            '-movflags', '+faststart',  # 优化流媒体播放
            '-y',
            output_path
        ]
        code, out, err = _run_cmd(cmd, timeout=1800)
        if code != 0:
            raise RuntimeError(f"ffmpeg overlay failed: {err}")

        # 上传到OSS（使用client_session_id）
        oss_key = f"{client_session_id}/{output_filename}"
        oss_url = upload_file_to_oss(output_path, oss_key)
        return oss_url
    finally:
        # 只删除临时下载的文件，不删除本地存储的原始视频
        if not is_local_file and input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass
        if output_path and os.path.exists(output_path):
            try:
                os.remove(output_path)
            except Exception:
                pass


def compress_and_overlay_video(
    input_video_path: str,
    client_session_id: str,
    output_filename: str = "compressed_video.mp4"
) -> str:
    """
    压缩视频并叠加时间戳，添加元数据标识
    Args:
        input_video_path: 原始视频本地路径
        client_session_id: 会话ID
        output_filename: 输出文件名
    Returns:
        压缩视频的本地路径
    """
    from local_storage_manager import get_session_video_dir
    
    # 获取输出路径
    session_dir = get_session_video_dir(client_session_id)
    output_path = os.path.join(session_dir, output_filename)
    
    # 字体路径(常见Linux字体路径)，如无该字体，ffmpeg仍可回退默认
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    # 使用 t(秒) 显示 "Time: mm:ss"，更通用，不依赖 gmtime
    # minutes = floor(t/60), seconds = mod(t,60)
    # 使用英文避免中文字体问题，并优化编码速度
    drawtext = (
        f"drawtext=fontfile={font_path}:"
        "text='Time\\: %{eif\\:floor(t/60)\\:d\\:2}\\:%{eif\\:mod(t\\,60)\\:d\\:2}':"
        "x=w-tw-10:y=h-th-10:"
        "fontsize=30:fontcolor=white:box=1:boxcolor=black@0.55:"
        "borderw=2:bordercolor=black@0.8"
    )

    cmd = [
        'ffmpeg',
        '-i', input_video_path,
        '-vf', f'scale=-2:720,{drawtext}',  # 保持宽高比，高度720p，叠加时间戳
        '-r', '10',  # 帧率10fps
        '-c:v', 'libx265',  # h265编码
        '-crf', '23',  # CRF质量
        '-preset', 'ultrafast',  # 最快预设
        '-c:a', 'copy',  # 复制原音频，不重新编码
        '-metadata', 'Description=Video2SOP v1.7.0',  # 元数据标识
        '-movflags', '+faststart',  # 优化流媒体播放
        '-threads', '0',  # 使用所有可用CPU核心进行多线程编码
        '-y',
        output_path
    ]
    
    code, out, err = _run_cmd(cmd, timeout=1800)
    if code != 0:
        raise RuntimeError(f"ffmpeg compression failed: {err}")
    
    return output_path


def split_video_segments(
    video_source: str,
    client_session_id: str,  # 改用client_session_id
    duration_sec: float,
    segment_seconds: int = 15 * 60, 
    overlap_seconds: int = 120,
    is_local_file: bool = False
) -> List[Dict]:
    """
    将视频分割为多个片段并上传到OSS。
    Args:
        video_source: 源视频URL或本地路径
        client_session_id: 会话ID
        duration_sec: 总时长(秒)
        segment_seconds: 每段时长(默认15分钟)
        overlap_seconds: 相邻片段重叠(默认120秒)
        is_local_file: 是否为本地文件
    Returns:
        [{segment_id, start_time, end_time, url}]
    """
    oss_dir = f"{client_session_id}/segments"

    input_path = None
    try:
        if is_local_file:
            input_path = video_source
        else:
            input_path = _download_to_temp(video_source, ".mp4")
        segments: List[Dict] = []

        start = 0
        seg_id = 1
        while start < duration_sec:
            end = min(start + segment_seconds, duration_sec)
            # 与下一个片段重叠：下一片段从 (end - overlap) 开始
            duration = int(end - start)
            if duration <= 0:
                break

            fd, seg_path = tempfile.mkstemp(suffix=f"_seg{seg_id}.mp4")
            os.close(fd)

            # 使用 -ss -t + re-encode 可最稳定；这里先尝试流拷贝以速度优先
            cmd = [
                'ffmpeg',
                '-ss', str(int(start)),
                '-t', str(duration),
                '-i', input_path,
                '-c', 'copy',
                '-y',
                seg_path
            ]
            code, out, err = _run_cmd(cmd, timeout=1800)
            if code != 0 or not os.path.exists(seg_path) or os.path.getsize(seg_path) == 0:
                # 回退到重编码以避免关键帧切割失败
                cmd = [
                    'ffmpeg',
                    '-ss', str(int(start)),
                    '-t', str(duration),
                    '-i', input_path,
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-y',
                    seg_path
                ]
                code2, out2, err2 = _run_cmd(cmd, timeout=1800)
                if code2 != 0:
                    raise RuntimeError(f"ffmpeg segment failed: {err2}")

            oss_key = f"{oss_dir}/segment_{seg_id:02d}.mp4"
            url = upload_file_to_oss(seg_path, oss_key)
            segments.append({
                "segment_id": seg_id,
                "start_time": int(start),
                "end_time": int(end),
                "url": url
            })

            # 下一段起点：当前end - overlap
            if end >= duration_sec:
                break
            start = max(0, end - overlap_seconds)
            seg_id += 1

            try:
                os.remove(seg_path)
            except Exception:
                pass

        return segments
    finally:
        # 只删除临时下载的文件，不删除本地存储的原始视频
        if not is_local_file and input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass


