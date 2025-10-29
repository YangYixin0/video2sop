"""
视频处理工具：获取视频时长、叠加时间戳、分段切割并上传到OSS
"""

import os
import json
import tempfile
import subprocess
import time
from typing import List, Dict, Optional, Tuple, Callable

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


def check_video_metadata(input_video_path: str) -> bool:
    """
    检查视频元数据中的description字段是否为Video2SOP v1.7.0
    Args:
        input_video_path: 视频文件路径
    Returns:
        True if 已经是压缩视频，False if 需要压缩
    """
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            input_video_path
        ]
        
        code, out, err = _run_cmd(cmd, timeout=30)
        if code != 0:
            print(f"ffprobe failed: {err}")
            return False
            
        import json
        metadata = json.loads(out)
        format_info = metadata.get('format', {})
        tags = format_info.get('tags', {})
        description = tags.get('description', '')
        
        return description == 'Video2SOP v1.7.0'
    except Exception as e:
        print(f"Error checking video metadata: {e}")
        return False


def compress_and_overlay_video(
    input_video_path: str,
    client_session_id: str,
    output_filename: str = "compressed_video.mp4",
    target_resolution: str = "720p",
    progress_callback: Optional[Callable[[int, int], None]] = None,
    cancel_flag: Optional[object] = None
) -> str:
    """
    压缩视频并叠加时间戳，添加元数据标识
    Args:
        input_video_path: 原始视频本地路径
        client_session_id: 会话ID
        output_filename: 输出文件名
        target_resolution: 目标分辨率，"1080p" 或 "720p"
        progress_callback: 进度回调函数，参数为(current_frame, total_frames)
        cancel_flag: 取消标志对象，如果设置了cancelled属性则停止压缩
    Returns:
        压缩视频的本地路径
    """
    from local_storage_manager import get_session_video_dir
    
    # 获取输出路径
    session_dir = get_session_video_dir(client_session_id)
    output_path = os.path.join(session_dir, output_filename)
    
    # 获取视频时长并计算总帧数
    duration_sec = get_video_duration(input_video_path, is_local_file=True)
    total_frames = int(duration_sec * 10)  # 输出10fps
    
    # 根据目标分辨率确定高度
    resolution_height = 1080 if target_resolution == "1080p" else 720
    
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
        '-hide_banner',
        '-nostats',
        '-v', 'error',
        '-progress', 'pipe:1',  # 输出进度到stdout
        '-i', input_video_path,
        '-vf', f'scale=-2:{resolution_height},{drawtext}',  # 保持宽高比，根据目标分辨率调整高度，叠加时间戳
        '-r', '10',  # 帧率10fps
        '-c:v', 'libx265',  # h265编码
        '-x265-params', 'log-level=error',  # 降低x265日志量
        '-crf', '23',  # CRF质量
        '-preset', 'ultrafast',  # 最快预设
        '-c:a', 'copy',  # 复制原音频，不重新编码
        '-metadata', 'description=Video2SOP v1.7.0',  # 元数据标识
        '-movflags', '+faststart',  # 优化流媒体播放
        '-threads', '0',  # 使用所有可用CPU核心进行多线程编码
        '-y',
        output_path
    ]
    
    # 使用Popen实时解析进度
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    last_progress_time = time.time()
    current_frame = 0
    last_frame_update = 0
    
    # 实时读取FFmpeg输出
    try:
        import select
        import sys
        
        no_progress_count = 0  # 连续无进度更新计数
        max_no_progress = 30   # 最大无进度次数（30秒）
        output_fps = 10  # 与编码参数 -r 10 保持一致

        def _parse_out_time_to_seconds(out_time_value: str) -> float:
            try:
                # 形如 HH:MM:SS.micro
                hh, mm, ss = out_time_value.split(":")
                return int(hh) * 3600 + int(mm) * 60 + float(ss)
            except Exception:
                return 0.0
        
        # 使用非阻塞方式读取FFmpeg输出
        while True:
            # 检查是否被取消
            if cancel_flag and hasattr(cancel_flag, 'cancelled') and cancel_flag.cancelled:
                print("压缩任务被取消，终止FFmpeg进程")
                process.terminate()
                raise RuntimeError("压缩任务被用户取消")
            
            # 检查进程是否结束
            if process.poll() is not None:
                print("FFmpeg进程已结束")
                break
            
            # 检查是否长时间无进度更新
            if no_progress_count > max_no_progress:
                print(f"警告: 已{max_no_progress}秒无进度更新，但FFmpeg仍在运行，继续监控...")
                no_progress_count = 0  # 重置计数，避免重复警告
            
            # 非阻塞读取
            if sys.platform != 'win32':
                ready, _, _ = select.select([process.stdout], [], [], 1.0)  # 1秒超时
                if not ready:
                    # 超时，检查进程状态
                    if process.poll() is not None:
                        break
                    no_progress_count += 1
                    continue
            else:
                # Windows平台使用不同的方法
                import msvcrt
                if not msvcrt.kbhit():
                    time.sleep(0.1)
                    no_progress_count += 1
                    continue
            
            line = process.stdout.readline()
            if not line:
                print("FFmpeg输出结束")
                break
            
            line = line.strip()
            if not line:
                continue
                
            # 调试：输出关键FFmpeg行
            if line.startswith('frame=') or line.startswith('progress=') or line.startswith('out_time='):
                print(f"FFmpeg输出: {line}")
            
            if line.startswith('frame='):
                try:
                    new_frame = int(line.split('=')[1].strip())
                    if new_frame > current_frame:
                        current_frame = new_frame
                        last_frame_update = time.time()
                        no_progress_count = 0  # 重置无进度计数
                        
                        # 每5秒回调一次，或者帧数有明显变化时也回调
                        time_elapsed = time.time() - last_progress_time
                        
                        if time_elapsed >= 5 or (current_frame > 0 and time_elapsed >= 2):
                            if progress_callback:
                                try:
                                    progress_callback(current_frame, total_frames)
                                    print(f"压缩进度: {current_frame}/{total_frames} 帧 ({int((current_frame / total_frames) * 100)}%)")
                                except Exception as e:
                                    print(f"进度回调异常: {e}")
                            last_progress_time = time.time()
                except (ValueError, IndexError) as e:
                    print(f"解析帧数失败: {line}, 错误: {e}")
                    continue
            elif line.startswith('out_time='):
                # 使用 out_time 估算进度，避免 frame 行刷新不及时导致卡住
                out_time_value = line.split('=')[1].strip()
                secs = _parse_out_time_to_seconds(out_time_value)
                estimated_frame = min(total_frames, int(secs * output_fps))
                if estimated_frame > current_frame:
                    current_frame = estimated_frame
                    last_frame_update = time.time()
                    no_progress_count = 0
                    time_elapsed = time.time() - last_progress_time
                    if time_elapsed >= 3:
                        if progress_callback:
                            try:
                                progress_callback(current_frame, total_frames)
                                print(f"基于时间的进度: {current_frame}/{total_frames} 帧 ({int((current_frame / total_frames) * 100)}%)")
                            except Exception as e:
                                print(f"进度回调异常: {e}")
                        last_progress_time = time.time()
            elif line.startswith('progress=') and line.split('=')[1].strip() == 'end':
                # FFmpeg 显式结束信号，强制更新到 100%
                if progress_callback:
                    try:
                        progress_callback(total_frames, total_frames)
                        print("收到 progress=end，强制设置进度为 100%")
                    except Exception as e:
                        print(f"进度回调异常: {e}")
    except Exception as e:
        print(f"读取FFmpeg输出异常: {e}")
        # 继续执行，不中断压缩过程
    
    # 如果压缩过程中没有收到进度更新，添加一个最终检查
    if current_frame == 0 and process.poll() is None:
        print("警告: 压缩过程中未收到进度更新，但进程仍在运行")
        # 尝试从stderr获取信息
        try:
            stderr_output = process.stderr.read(1024)
            if stderr_output:
                print(f"FFmpeg stderr: {stderr_output}")
        except:
            pass
    
    # 取消文件大小估算的备用进度监控，避免与真实进度混淆
    
    # 等待进程完成
    stdout, stderr = process.communicate()
    
    if process.returncode != 0:
        raise RuntimeError(f"ffmpeg compression failed: {stderr}")
    
    # 进程成功结束后，补发一次 100% 进度，确保前端与脚本收敛
    if progress_callback:
        try:
            progress_callback(total_frames, total_frames)
            print("压缩完成，发送最终 100% 进度")
        except Exception as e:
            print(f"最终进度回调异常: {e}")
    
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
                '-avoid_negative_ts', 'make_zero',  # 处理负时间戳
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


