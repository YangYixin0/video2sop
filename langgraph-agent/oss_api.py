"""
OSS 相关 API 端点
"""
import os
import tempfile
import requests
import json
from typing import Dict, Any
from fastapi import HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
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

# 全局变量存储压缩任务和取消标志
compression_tasks = {}
compression_cancel_flags = {}

class UploadSignatureRequest(BaseModel):
    filename: str
    session_id: str
    file_type: str = "video"

class DeleteSessionRequest(BaseModel):
    session_id: str
    client_session_id: str

class CancelCompressionRequest(BaseModel):
    session_id: str = None

class ExtractAudioRequest(BaseModel):
    video_url: str
    session_id: str
    client_session_id: str = None

def setup_oss_routes(app, connection_manager=None):
    """设置 OSS 相关的路由"""
    
    # 废弃：不再需要单独生成session_id
    # @app.post("/api/generate_session_id")
    # async def generate_new_session_id() -> Dict[str, Any]:
    #     """生成新的会话 ID"""
    #     try:
    #         session_id = generate_session_id()
    #         return {
    #             "success": True,
    #             "session_id": session_id
    #         }
    #     except Exception as e:
    #         raise HTTPException(status_code=500, detail=f"Failed to generate session ID: {str(e)}")

    @app.post("/api/generate_upload_signature")
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

    @app.post("/api/delete_session_files")
    async def delete_files(request: DeleteSessionRequest) -> Dict[str, Any]:
        """删除指定会话的所有文件（OSS + 本地）"""
        try:
            from local_storage_manager import delete_session_local_files
            
            # session_id实际上是client_session_id
            client_session_id = request.session_id
            
            # 删除OSS文件
            oss_result = delete_session_files(client_session_id)
            
            # 删除本地文件
            local_result = delete_session_local_files(client_session_id)
            
            return {
                "success": True,
                "result": {
                    "oss": oss_result,
                    "local": local_result
                }
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete files: {str(e)}")

    @app.get("/api/cleanup_old_sessions")
    async def cleanup_sessions(hours: int = 2) -> Dict[str, Any]:
        """清理旧的会话文件"""
        try:
            # 从main.py导入keep_sessions
            from main import keep_sessions
            result = cleanup_old_sessions(hours, keep_sessions)
            return {
                "success": True,
                "result": result
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to cleanup sessions: {str(e)}")

    @app.get("/api/file_info")
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

    @app.post("/api/extract_audio")
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

    @app.get("/api/check_ffmpeg")
    async def check_ffmpeg_status() -> Dict[str, bool]:
        """检查 FFmpeg 是否可用"""
        return {
            "success": True,
            "ffmpeg_available": check_ffmpeg_available()
        }

    @app.post("/api/upload_file_proxy")
    async def upload_file_proxy(
        file: UploadFile = File(...),
        session_id: str = Form(...),
        file_type: str = Form(...),
        client_session_id: str = Form(None)
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

    @app.post("/api/upload_video_to_backend")
    async def upload_video_to_backend_endpoint(
        file: UploadFile = File(...),
        client_session_id: str = Form(...)
    ) -> Dict[str, Any]:
        """接收视频文件，保存到本地，提取并上传音频到OSS"""
        try:
            from local_storage_manager import save_video_locally_streaming
            from audio_extractor import extract_audio_from_video
            
            # 1 & 2. 流式保存视频到本地（合并步骤，避免大文件内存溢出）
            local_video_path = await save_video_locally_streaming(file, client_session_id)
            
            # 3. 提取音频
            audio_path = extract_audio_from_video(local_video_path)
            
            # 4. 上传音频到OSS（使用client_session_id作为路径）
            audio_oss_key = f"{client_session_id}/audio/extracted_audio.mp3"
            audio_url = upload_file_to_oss(audio_path, audio_oss_key)
            
            # 5. 删除临时音频文件
            if os.path.exists(audio_path):
                os.remove(audio_path)
            
            # 6. WebSocket通知音频提取完成并触发自动语音识别
            if connection_manager and client_session_id:
                await connection_manager.send_to_client(client_session_id, json.dumps({
                    "type": "audio_extraction_complete",
                    "audio_url": audio_url,
                    "session_id": client_session_id,
                    "message": "音频提取完成",
                    "auto_start_speech_recognition": True  # 新增：标记触发自动语音识别
                }))
            
            # 7. 启动异步压缩任务
            import asyncio
            from video_processor import compress_and_overlay_video, check_video_metadata
            from local_storage_manager import get_local_video_path
            
            # 创建取消标志
            cancel_flag = type('CancelFlag', (), {'cancelled': False})()
            compression_cancel_flags[client_session_id] = cancel_flag
            
            async def compress_task():
                # 检查视频是否已经是压缩过的
                is_already_compressed = await asyncio.to_thread(
                    check_video_metadata,
                    local_video_path
                )
                
                if is_already_compressed:
                    # 视频已经是压缩过的，直接重命名
                    compressed_video_path = get_local_video_path(client_session_id, "compressed_video.mp4")
                    
                    if connection_manager and client_session_id:
                        await connection_manager.send_to_client(client_session_id, json.dumps({
                            "type": "compression_started",
                            "message": "检测到已压缩视频，跳过压缩..."
                        }))
                    
                    # 重命名原视频为压缩视频
                    import shutil
                    shutil.move(local_video_path, compressed_video_path)
                    print(f"已重命名原视频为压缩视频: {compressed_video_path}")
                    
                    if connection_manager and client_session_id:
                        await connection_manager.send_to_client(client_session_id, json.dumps({
                            "type": "compression_completed",
                            "message": "视频无需压缩，已准备就绪",
                            "compressed_filename": "compressed_video.mp4"
                        }))
                else:
                    # 需要压缩
                    if connection_manager and client_session_id:
                        await connection_manager.send_to_client(client_session_id, json.dumps({
                            "type": "compression_started",
                            "message": "开始压缩视频..."
                        }))
                    
                    try:
                        # 定义进度回调函数
                        async def send_progress(current_frame, total_frames):
                            try:
                                if connection_manager and client_session_id:
                                    percentage = int((current_frame / total_frames) * 100) if total_frames > 0 else 0
                                    await connection_manager.send_to_client(client_session_id, json.dumps({
                                        "type": "compression_progress",
                                        "current_frame": current_frame,
                                        "total_frames": total_frames,
                                        "percentage": percentage,
                                        "message": f"压缩中... {current_frame}/{total_frames} 帧 ({percentage}%)"
                                    }))
                            except Exception as e:
                                print(f"发送压缩进度异常: {e}")
                        
                        # 获取当前事件循环
                        loop = asyncio.get_event_loop()
                        
                        # 包装为同步回调（因为compress_and_overlay_video是同步函数）
                        def progress_callback(current_frame, total_frames):
                            try:
                                # 使用asyncio.run_coroutine_threadsafe在事件循环中运行
                                future = asyncio.run_coroutine_threadsafe(send_progress(current_frame, total_frames), loop)
                                # 不等待结果，避免阻塞压缩过程
                            except Exception as e:
                                print(f"进度回调异常: {e}")
                        
                        compressed_path = await asyncio.to_thread(
                            compress_and_overlay_video,
                            local_video_path,
                            client_session_id,
                            "compressed_video.mp4",
                            progress_callback,  # 传入回调
                            cancel_flag  # 传入取消标志
                        )
                        
                        # 压缩完成后删除原视频
                        if os.path.exists(local_video_path):
                            os.remove(local_video_path)
                            print(f"已删除原视频: {local_video_path}")
                        
                        if connection_manager and client_session_id:
                            await connection_manager.send_to_client(client_session_id, json.dumps({
                                "type": "compression_completed",
                                "message": "视频压缩完成，已删除原视频",
                                "compressed_filename": "compressed_video.mp4"
                            }))
                    except Exception as e:
                        if connection_manager and client_session_id:
                            await connection_manager.send_to_client(client_session_id, json.dumps({
                                "type": "compression_error",
                                "message": f"视频压缩失败: {str(e)}"
                            }))
                    finally:
                        # 清理取消标志
                        if client_session_id in compression_cancel_flags:
                            del compression_cancel_flags[client_session_id]
            
            # 启动压缩任务（不等待完成）
            asyncio.create_task(compress_task())
            
            # 7. 通过WebSocket通知上传完成（仅返回client_session_id）
            if connection_manager and client_session_id:
                notification = {
                    "type": "video_upload_complete",
                    "session_id": client_session_id,  # 为兼容前端，字段名保持session_id
                    "message": "视频已上传并提取音频"
                }
                await connection_manager.send_to_client(client_session_id, json.dumps(notification))
            
            return {
                "success": True,
                "session_id": client_session_id,  # 返回client_session_id，字段名保持session_id兼容
                "audio_url": audio_url  # 返回音频URL供语音识别使用
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"视频上传失败: {str(e)}")

    @app.get("/api/download_compressed_video")
    async def download_compressed_video(session_id: str):
        """下载压缩后的视频"""
        try:
            from local_storage_manager import get_local_video_path
            
            compressed_path = get_local_video_path(session_id, "compressed_video.mp4")
            
            if not os.path.exists(compressed_path):
                raise HTTPException(status_code=404, detail="压缩视频不存在")
            
            return FileResponse(
                compressed_path,
                media_type="video/mp4",
                filename="compressed_video.mp4",
                headers={
                    "Content-Disposition": "attachment; filename=compressed_video.mp4"
                }
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")

    @app.post("/api/cancel_compression")
    async def cancel_compression(request: CancelCompressionRequest):
        """取消视频压缩任务"""
        try:
            session_id = request.session_id
            if not session_id:
                raise HTTPException(status_code=400, detail="缺少session_id参数")
                
            if session_id in compression_cancel_flags:
                # 设置取消标志
                compression_cancel_flags[session_id].cancelled = True
                print(f"已取消会话 {session_id} 的压缩任务")
                return {"success": True, "message": "压缩任务已取消"}
            else:
                return {"success": False, "message": "未找到正在进行的压缩任务"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"取消压缩任务失败: {str(e)}")
