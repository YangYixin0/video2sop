"""
OSS管理工具：处理文件上传签名生成、文件删除等操作
"""

import os
import uuid
import time
import oss2
from typing import Dict, List
from datetime import datetime, timedelta

# OSS配置 - 使用真实的凭据
ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID')
ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET')
ENDPOINT = os.getenv('OSS_ENDPOINT')
BUCKET_NAME = os.getenv('OSS_BUCKET_NAME')

# 检查OSS配置
def check_oss_config():
    """检查OSS配置是否完整"""
    missing_vars = []
    if not ACCESS_KEY_ID:
        missing_vars.append('OSS_ACCESS_KEY_ID')
    if not ACCESS_KEY_SECRET:
        missing_vars.append('OSS_ACCESS_KEY_SECRET')
    if not ENDPOINT:
        missing_vars.append('OSS_ENDPOINT')
    if not BUCKET_NAME:
        missing_vars.append('OSS_BUCKET_NAME')
    
    if missing_vars:
        raise ValueError(f"Missing OSS environment variables: {', '.join(missing_vars)}")
    
    return True

# 初始化OSS客户端（延迟初始化）
_auth = None
_bucket = None

def get_auth():
    """获取OSS认证对象"""
    global _auth
    if _auth is None:
        check_oss_config()
        _auth = oss2.Auth(ACCESS_KEY_ID, ACCESS_KEY_SECRET)
    return _auth

def get_bucket():
    """获取OSS Bucket对象"""
    global _bucket
    if _bucket is None:
        check_oss_config()
        auth = get_auth()
        _bucket = oss2.Bucket(auth, ENDPOINT, BUCKET_NAME)
    return _bucket

# 为了向后兼容，保留这些变量
auth = None  # 将在需要时初始化
bucket = None  # 将在需要时初始化

def generate_session_id() -> str:
    """生成唯一的会话ID"""
    return f"session_{uuid.uuid4().hex[:16]}_{int(time.time())}"

def generate_upload_signature(filename: str, session_id: str, file_type: str = "video") -> Dict:
    """
    生成OSS上传签名
    
    Args:
        filename: 原始文件名
        session_id: 会话ID
        file_type: 文件类型 ("video" 或 "audio")
    
    Returns:
        包含上传URL和参数的字典
    """
    import urllib.parse
    
    # 生成OSS对象键
    file_extension = filename.split('.')[-1] if '.' in filename else 'mp4'
    oss_key = f"{session_id}/{file_type}.{file_extension}"
    
    # 确保路径正确编码，避免403错误
    encoded_oss_key = urllib.parse.quote(oss_key, safe='/')
    
    # 生成上传URL（有效期1小时）
    bucket = get_bucket()
    url = bucket.sign_url('PUT', encoded_oss_key, 3600)
    
    # 生成完整的OSS URL
    oss_url = f'https://{BUCKET_NAME}.{ENDPOINT.replace("https://", "")}/{encoded_oss_key}'
    
    return {
        "upload_url": url,
        "oss_url": oss_url,
        "oss_key": oss_key,  # 返回原始key用于其他逻辑
        "expires_in": 3600
    }

def upload_file_to_oss(local_file_path: str, oss_key: str) -> str:
    """
    上传本地文件到OSS
    
    Args:
        local_file_path: 本地文件路径
        oss_key: OSS对象键
        
    Returns:
        OSS文件URL
    """
    bucket = get_bucket()
    bucket.put_object_from_file(oss_key, local_file_path)
    oss_url = f'https://{BUCKET_NAME}.{ENDPOINT.replace("https://", "")}/{oss_key}'
    return oss_url

def delete_session_files(session_id: str) -> Dict:
    """
    删除指定会话的所有文件
    
    Args:
        session_id: 会话ID
    
    Returns:
        删除结果统计
    """
    deleted_count = 0
    errors = []
    
    try:
        # 列出会话目录下的所有文件
        bucket = get_bucket()
        for obj in oss2.ObjectIterator(bucket, prefix=f"{session_id}/"):
            try:
                bucket.delete_object(obj.key)
                deleted_count += 1
                print(f"已删除文件: {obj.key}")
            except Exception as e:
                error_msg = f"删除文件 {obj.key} 失败: {str(e)}"
                errors.append(error_msg)
                print(error_msg)
        
        # 尝试删除会话目录（如果为空）
        try:
            bucket.delete_object(f"{session_id}/")
        except:
            pass  # 忽略删除目录的错误
            
    except Exception as e:
        error_msg = f"列出会话文件失败: {str(e)}"
        errors.append(error_msg)
        print(error_msg)
    
    return {
        "deleted_count": deleted_count,
        "errors": errors,
        "session_id": session_id
    }

def cleanup_old_sessions(hours: int = 2, keep_sessions: set = None) -> Dict:
    """
    清理超过指定小时的会话文件
    
    Args:
        hours: 清理多少小时前的文件
        keep_sessions: 需要保留的会话ID集合
    
    Returns:
        清理结果统计
    """
    cutoff_time = datetime.now() - timedelta(hours=hours)
    cleaned_sessions = []
    total_deleted = 0
    
    if keep_sessions is None:
        keep_sessions = set()
    
    try:
        # 获取所有对象
        bucket = get_bucket()
        for obj in oss2.ObjectIterator(bucket):
            # 解析会话ID（格式: session_xxxxxxxx_timestamp）
            if obj.key.startswith("session_") and "/" in obj.key:
                session_id = obj.key.split("/")[0]
                
                # 检查是否在保留列表中
                if session_id in keep_sessions:
                    print(f"跳过保留的会话: {session_id}")
                    continue
                
                # 从会话ID中提取时间戳
                if "_" in session_id:
                    timestamp_str = session_id.split("_")[-1]
                    try:
                        session_time = datetime.fromtimestamp(int(timestamp_str))
                        if session_time < cutoff_time:
                            result = delete_session_files(session_id)
                            if result["deleted_count"] > 0:
                                cleaned_sessions.append(session_id)
                                total_deleted += result["deleted_count"]
                    except ValueError:
                        continue  # 无效的时间戳格式
                        
    except Exception as e:
        print(f"清理旧会话时出错: {str(e)}")
    
    return {
        "cleaned_sessions": cleaned_sessions,
        "total_deleted": total_deleted,
        "cutoff_hours": hours
    }

def get_file_info(oss_url: str) -> Dict:
    """
    获取OSS文件信息
    
    Args:
        oss_url: OSS文件URL
    
    Returns:
        文件信息字典
    """
    try:
        # 从URL中提取对象键
        if BUCKET_NAME in oss_url and ENDPOINT.replace("https://", "") in oss_url:
            oss_key = oss_url.split(f"{BUCKET_NAME}.{ENDPOINT.replace('https://', '')}/")[-1]
            
            # 获取文件头信息
            bucket = get_bucket()
            head_result = bucket.head_object(oss_key)
            
            return {
                "exists": True,
                "size": head_result.content_length,
                "last_modified": head_result.last_modified,
                "content_type": head_result.content_type,
                "oss_key": oss_key
            }
        else:
            return {"exists": False, "error": "Invalid OSS URL format"}
            
    except oss2.exceptions.NoSuchKey:
        return {"exists": False, "error": "File not found"}
    except Exception as e:
        return {"exists": False, "error": str(e)}

# 测试函数
if __name__ == "__main__":
    # 测试生成会话ID和上传签名
    session_id = generate_session_id()
    print(f"生成的会话ID: {session_id}")
    
    # 测试生成上传签名
    signature = generate_upload_signature("test_video.mp4", session_id, "video")
    print(f"上传签名: {signature}")
    
    # 测试清理功能
    cleanup_result = cleanup_old_sessions(1, set())  # 清理1小时前的文件
    print(f"清理结果: {cleanup_result}")
