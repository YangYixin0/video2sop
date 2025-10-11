"""
OSS 相关 API 端点
"""
import os
import tempfile
import requests
from typing import Dict, Any
from fastapi import HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from oss_manager import (
    generate_session_id,
    generate_upload_signature,
    delete_session_files,
    cleanup_old_sessions,
    get_file_info,
    upload_file_to_oss,
    get_bucket,
    BUCKET_NAME,
    ENDPOINT
)
from audio_extractor import extract_audio_from_video, check_ffmpeg_available

class UploadSignatureRequest(BaseModel):
    filename: str
    session_id: str
    file_type: str = "video"

class DeleteSessionRequest(BaseModel):
    session_id: str

class ExtractAudioRequest(BaseModel):
    video_url: str
    session_id: str

def setup_oss_routes(app):
    """设置 OSS 相关的路由"""
    
    @app.post("/generate_session_id")
    async def generate_new_session_id() -> Dict[str, Any]:
        """生成新的会话 ID"""
        try:
            session_id = generate_session_id()
            return {
                "success": True,
                "session_id": session_id
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate session ID: {str(e)}")

    @app.post("/generate_upload_signature")
    async def generate_signature(request: UploadSignatureRequest) -> Dict[str, Any]:
        """生成 OSS 上传签名"""
        try:
            signature = generate_upload_signature(
                filename=request.filename,
                session_id=request.session_id,
                file_type=request.file_type
            )
            return {
                "success": True,
                "signature": signature
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate signature: {str(e)}")

    @app.post("/delete_session_files")
    async def delete_files(request: DeleteSessionRequest) -> Dict[str, Any]:
        """删除指定会话的所有文件"""
        try:
            result = delete_session_files(request.session_id)
            return {
                "success": True,
                "result": result
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete files: {str(e)}")

    @app.get("/cleanup_old_sessions")
    async def cleanup_sessions(hours: int = 2) -> Dict[str, Any]:
        """清理旧的会话文件"""
        try:
            result = cleanup_old_sessions(hours)
            return {
                "success": True,
                "result": result
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to cleanup sessions: {str(e)}")

    @app.get("/file_info")
    async def get_file_info_endpoint(oss_url: str) -> Dict[str, Any]:
        """获取文件信息"""
        try:
            info = get_file_info(oss_url)
            return {
                "success": True,
                "info": info
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get file info: {str(e)}")

    @app.post("/extract_audio")
    async def extract_audio_endpoint(request: ExtractAudioRequest) -> Dict[str, Any]:
        """从视频 URL 提取音频并上传到 OSS"""
        try:
            if not check_ffmpeg_available():
                raise HTTPException(status_code=500, detail="FFmpeg not available")
            
            with tempfile.TemporaryDirectory() as temp_dir:
                video_path = os.path.join(temp_dir, "input_video.mp4")
                
                # 下载视频文件
                video_response = requests.get(request.video_url, timeout=300)
                video_response.raise_for_status()
                
                with open(video_path, 'wb') as f:
                    f.write(video_response.content)
                
                # 提取音频
                audio_path = extract_audio_from_video(video_path)
                
                # 上传音频到 OSS
                oss_key = f"{request.session_id}/audio.mp3"
                audio_url = upload_file_to_oss(audio_path, oss_key)
                
                return {
                    "success": True,
                    "audio_url": audio_url,
                    "session_id": request.session_id
                }
                
        except requests.RequestException as e:
            raise HTTPException(status_code=500, detail=f"Failed to download video: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Audio extraction failed: {str(e)}")

    @app.get("/check_ffmpeg")
    async def check_ffmpeg_status() -> Dict[str, bool]:
        """检查 FFmpeg 是否可用"""
        return {
            "success": True,
            "ffmpeg_available": check_ffmpeg_available()
        }

    @app.post("/upload_file_proxy")
    async def upload_file_proxy(
        file: UploadFile = File(...),
        session_id: str = Form(...),
        file_type: str = Form(...)
    ) -> Dict[str, Any]:
        """通过后端代理上传文件到 OSS"""
        try:
            file_content = await file.read()
            file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
            oss_key = f"{session_id}/{file_type}.{file_extension}"
            
            bucket = get_bucket()
            result = bucket.put_object(oss_key, file_content)
            
            if result.status != 200:
                raise HTTPException(status_code=500, detail="Failed to upload to OSS")
            
            oss_url = f'https://{BUCKET_NAME}.{ENDPOINT.replace("https://", "")}/{oss_key}'
            
            return {
                "success": True,
                "file_url": oss_url,
                "oss_key": oss_key,
                "session_id": session_id
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Proxy upload failed: {str(e)}")
