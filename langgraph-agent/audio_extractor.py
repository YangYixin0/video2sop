"""
音频提取工具 - 从视频文件中提取音频
"""

import os
import subprocess
import tempfile
from typing import Optional

def extract_audio_from_video(video_file_path: str, output_audio_path: Optional[str] = None) -> str:
    """
    从视频文件中提取音频
    
    Args:
        video_file_path: 视频文件路径
        output_audio_path: 输出音频文件路径，如果为None则自动生成
    
    Returns:
        提取的音频文件路径
    """
    try:
        # 如果没有指定输出路径，创建一个临时文件
        if output_audio_path is None:
            temp_dir = tempfile.gettempdir()
            output_audio_path = os.path.join(temp_dir, f"extracted_audio_{os.getpid()}.mp3")
        
        # 使用ffmpeg提取音频
        cmd = [
            'ffmpeg',
            '-i', video_file_path,
            '-vn',  # 不处理视频流
            '-acodec', 'mp3',  # 音频编码为mp3
            '-ab', '128k',  # 音频比特率
            '-ar', '44100',  # 音频采样率
            '-y',  # 覆盖输出文件
            output_audio_path
        ]
        
        # 执行ffmpeg命令
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg failed: {result.stderr}")
        
        # 检查输出文件是否存在
        if not os.path.exists(output_audio_path):
            raise Exception("Audio extraction failed - output file not created")
        
        return output_audio_path
        
    except subprocess.TimeoutExpired:
        raise Exception("Audio extraction timed out")
    except FileNotFoundError:
        raise Exception("FFmpeg not found. Please install ffmpeg.")
    except Exception as e:
        raise Exception(f"Audio extraction failed: {str(e)}")

def check_ffmpeg_available() -> bool:
    """
    检查ffmpeg是否可用
    """
    try:
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def has_audio_stream(video_file_path: str) -> bool:
    """
    检查视频文件是否包含音频流
    
    Args:
        video_file_path: 视频文件路径
    
    Returns:
        True if 视频包含音频流, False otherwise
    """
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-select_streams', 'a',  # 只选择音频流
            '-show_entries', 'stream=codec_type',
            '-of', 'csv=p=0',
            video_file_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            # 如果ffprobe失败，可能是文件不存在或其他问题
            print(f"Warning: FFprobe failed to check audio stream: {result.stderr}")
            return False
        
        # 如果输出包含 'audio'，说明有音频流
        output = result.stdout.strip()
        return 'audio' in output.lower()
        
    except subprocess.TimeoutExpired:
        print(f"Warning: Audio stream check timed out for {video_file_path}")
        return False
    except FileNotFoundError:
        print("Warning: FFprobe not found. Please install ffmpeg.")
        return False
    except Exception as e:
        print(f"Warning: Error checking audio stream: {str(e)}")
        return False

def get_video_duration(video_file_path: str) -> float:
    """
    获取视频时长（秒）
    """
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-show_entries', 'format=duration',
            '-of', 'csv=p=0',
            video_file_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            raise Exception(f"FFprobe failed: {result.stderr}")
        
        duration = float(result.stdout.strip())
        return duration
        
    except Exception as e:
        print(f"Warning: Could not get video duration: {str(e)}")
        return 0.0

# 测试函数
if __name__ == "__main__":
    # 检查ffmpeg是否可用
    if check_ffmpeg_available():
        print("FFmpeg is available")
    else:
        print("FFmpeg is not available")
