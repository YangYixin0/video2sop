"""本地视频文件存储管理"""
import os
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List

# 本地存储根目录
LOCAL_STORAGE_ROOT = "/root/video2sop/temp/user_upload"

def get_session_video_dir(client_session_id: str) -> str:
    """获取会话的视频存储目录"""
    return os.path.join(LOCAL_STORAGE_ROOT, client_session_id)

def save_video_locally(file_content: bytes, client_session_id: str, filename: str = "original_video.mp4") -> str:
    """保存视频到本地，返回本地路径"""
    session_dir = get_session_video_dir(client_session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    video_path = os.path.join(session_dir, filename)
    with open(video_path, 'wb') as f:
        f.write(file_content)
    
    return video_path

def get_local_video_path(client_session_id: str, filename: str = "original_video.mp4") -> str:
    """获取本地视频路径"""
    return os.path.join(get_session_video_dir(client_session_id), filename)

def delete_session_local_files(client_session_id: str) -> Dict:
    """删除会话的本地文件"""
    session_dir = get_session_video_dir(client_session_id)
    if os.path.exists(session_dir):
        shutil.rmtree(session_dir)
        return {"deleted": True, "path": session_dir}
    return {"deleted": False, "path": session_dir}

def cleanup_old_local_files(hours: int = 24) -> Dict:
    """清理超过指定小时数的本地文件"""
    if not os.path.exists(LOCAL_STORAGE_ROOT):
        return {"cleaned_sessions": 0}
    
    cutoff_time = datetime.now() - timedelta(hours=hours)
    cleaned_count = 0
    
    for client_session_id in os.listdir(LOCAL_STORAGE_ROOT):
        session_dir = os.path.join(LOCAL_STORAGE_ROOT, client_session_id)
        if os.path.isdir(session_dir):
            dir_mtime = datetime.fromtimestamp(os.path.getmtime(session_dir))
            if dir_mtime < cutoff_time:
                shutil.rmtree(session_dir)
                cleaned_count += 1
    
    return {"cleaned_sessions": cleaned_count}

