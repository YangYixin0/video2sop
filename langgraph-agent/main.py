import os
import json
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from agent import QwenAgent
from langchain_core.messages import BaseMessage
from oss_api import setup_oss_routes
from speech_tool import speech_recognition
from video_understanding_tool import video_understanding
from video_processor import (
    get_video_duration,
    add_timestamp_overlay,
    split_video_segments,
)
from sop_integration_tool import integrate_sop_segments
from sop_parser_tool import sop_parser
from sop_refine_tool import sop_refine
import dashscope
import psutil

# 加载环境变量
load_dotenv('../.env')

def get_system_resources():
    """获取系统资源信息"""
    cpu_count = os.cpu_count() or 1
    cpu_percent = psutil.cpu_percent(interval=0.1)  # 短采样提高响应速度
    memory = psutil.virtual_memory()
    memory_total_gb = round(memory.total / (1024**3))
    memory_percent = round(memory.percent, 1)
    
    return {
        "cpu_count": cpu_count,
        "cpu_percent": round(cpu_percent, 1),
        "memory_total_gb": memory_total_gb,
        "memory_percent": memory_percent
    }

# 配置 LangSmith 追踪（如果设置了环境变量）
if os.getenv('LANGSMITH_TRACING'):
    os.environ['LANGCHAIN_TRACING_V2'] = 'true'
    os.environ['LANGCHAIN_ENDPOINT'] = 'https://api.smith.langchain.com'
    os.environ['LANGCHAIN_API_KEY'] = os.getenv('LANGSMITH_API_KEY')
    os.environ['LANGCHAIN_PROJECT'] = os.getenv('LANGSMITH_PROJECT', 'langgraph-agent-chat')

# 创建 FastAPI 应用
app = FastAPI(title="LangGraph Agent Chat", version="1.0.0")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:50001",
        "http://127.0.0.1:50001",
        "https://www.bohrium.com",
        "http://www.bohrium.com",
        # 移除开发服务器域名，确保生产环境独立运行
        # "http://pdtd1393499.bohrium.tech",
        # "https://pdtd1393499.bohrium.tech",
        # "http://pdtd1393499.bohrium.tech:50001",
        # "https://pdtd1393499.bohrium.tech:50001",
        "*",  # 临时允许所有源，用于调试
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 Agent 实例池（3个实例）
agent_pool = [QwenAgent() for _ in range(3)]
next_agent_index = 0

# 会话管理
session_histories: Dict[str, Dict[str, Any]] = {}
# 结构: {
#   "client_session_id": {
#     "history": List[BaseMessage],
#     "last_active": datetime,
#     "agent_index": int
#   }
# }
SESSION_TIMEOUT_HOURS = 1  # 1小时超时

# 视频保留标记集合
keep_sessions: set = set()

# WebSocket断连追踪
websocket_disconnect_tracker: Dict[str, datetime] = {}
DISCONNECT_GRACE_PERIOD = timedelta(minutes=5)

def update_session_activity(client_session_id: str):
    """更新会话活跃时间"""
    if client_session_id in session_histories:
        session_histories[client_session_id]["last_active"] = datetime.now()

def cleanup_expired_sessions():
    """清理过期会话"""
    now = datetime.now()
    expired_sessions = [
        sid for sid, session in session_histories.items()
        if now - session["last_active"] > timedelta(hours=SESSION_TIMEOUT_HOURS)
    ]
    for sid in expired_sessions:
        del session_histories[sid]
        print(f"清理过期会话: {sid}")
    
    if expired_sessions:
        print(f"已清理 {len(expired_sessions)} 个过期会话")

def get_or_create_session(client_session_id: str) -> Dict[str, Any]:
    """获取或创建会话，并清理过期会话"""
    global next_agent_index
    
    # 清理过期会话
    cleanup_expired_sessions()
    
    # 获取或创建会话
    if client_session_id not in session_histories:
        session_histories[client_session_id] = {
            "history": [],
            "last_active": datetime.now(),
            "agent_index": next_agent_index % len(agent_pool)
        }
        next_agent_index += 1
        print(f"创建新会话: {client_session_id}, 分配Agent实例: {session_histories[client_session_id]['agent_index']}")
    else:
        session_histories[client_session_id]["last_active"] = datetime.now()
    
    return session_histories[client_session_id]

def get_agent_for_session(session: Dict[str, Any]) -> QwenAgent:
    """获取会话对应的Agent实例"""
    return agent_pool[session["agent_index"]]

class ConnectionManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # 维护 client_session_id 到 WebSocket 连接的映射
        self.client_sessions: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"客户端已连接，当前连接数: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        client_session_id_to_remove = None
        for client_session_id, ws in self.client_sessions.items():
            if ws == websocket:
                client_session_id_to_remove = client_session_id
                break
        
        if client_session_id_to_remove:
            # 记录断连时间，而非立即清理
            websocket_disconnect_tracker[client_session_id_to_remove] = datetime.now()
            del self.client_sessions[client_session_id_to_remove]
            print(f"客户端断开，开始5分钟宽限期: {client_session_id_to_remove}")
        
        print(f"客户端已断开，当前连接数: {len(self.active_connections)}")
    
    async def send_message(self, websocket: WebSocket, message: str):
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"发送消息失败: {e}")
            self.disconnect(websocket)
    
    def register_client(self, client_session_id: str, websocket: WebSocket):
        """注册客户端会话"""
        self.client_sessions[client_session_id] = websocket
        print(f"客户端会话已注册: {client_session_id}")
    
    async def send_to_client(self, client_session_id: str, message: str):
        """向特定客户端发送消息"""
        if client_session_id in self.client_sessions:
            websocket = self.client_sessions[client_session_id]
            try:
                await websocket.send_text(message)
                print(f"已向客户端 {client_session_id} 发送消息")
            except Exception as e:
                print(f"向客户端 {client_session_id} 发送消息失败: {e}")
                self.disconnect(websocket)
        else:
            print(f"客户端 {client_session_id} 未找到或已断开连接")

manager = ConnectionManager()

# 设置 OSS 相关路由
setup_oss_routes(app, manager)

@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "langgraph-agent-chat"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 聊天端点"""
    await manager.connect(websocket)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                user_message = message_data.get("content", "")
                client_session_id = message_data.get("client_session_id", "")
                
                if not client_session_id:
                    await manager.send_message(websocket, json.dumps({
                        "type": "error",
                        "content": "缺少 client_session_id"
                    }))
                    continue
                
                print(f"收到用户消息: {user_message} (会话: {client_session_id})")
                
                # 如果content是一个JSON并包含 upload_complete，则作为上传完成事件处理，避免触发Agent自动语音识别
                try:
                    parsed = json.loads(user_message)
                    if isinstance(parsed, dict) and parsed.get("type") == "upload_complete":
                        video_url = parsed.get("video_url", "")
                        audio_url = parsed.get("audio_url", "")
                        session_id = parsed.get("session_id", "")
                        upload_notification = {
                            "type": "upload_complete",
                            "video_url": video_url,
                            "audio_url": audio_url,
                            "session_id": session_id,
                            "message": f"视频和音频上传完成！视频链接：{video_url}，音频链接：{audio_url}"
                        }
                        await manager.send_message(websocket, json.dumps(upload_notification))
                        continue
                except Exception:
                    pass
                
                # 获取或创建会话
                session = get_or_create_session(client_session_id)
                session_history = session["history"]
                agent = get_agent_for_session(session)
                
                # 发送开始处理信号
                await manager.send_message(websocket, json.dumps({
                    "type": "status",
                    "status": "processing"
                }))
                
                try:
                    # 流式调用 Agent（使用会话独立的历史）
                    final_message = None
                    
                    async for message in agent.astream_chat(user_message, session_history.copy()):
                        final_message = message
                        
                        # 检查是否包含工具调用
                        if hasattr(message, 'tool_calls') and message.tool_calls:
                            for tool_call in message.tool_calls:
                                if tool_call['name'] == 'speech_recognition':
                                    # 发送工具调用状态
                                    await manager.send_message(websocket, json.dumps({
                                        "type": "tool_call",
                                        "tool_name": "speech_recognition",
                                        "status": "running",
                                        "message": "正在转录音频..."
                                    }))
                        
                        # 发送普通消息内容
                        elif hasattr(message, 'content') and message.content:
                            await manager.send_message(websocket, json.dumps({
                                "type": "chunk",
                                "content": message.content
                            }))
                    
                    # 发送完成信号
                    if final_message and hasattr(final_message, 'content'):
                        await manager.send_message(websocket, json.dumps({
                            "type": "complete",
                            "content": final_message.content
                        }))
                    
                    # 更新会话历史（而非全局历史）
                    from langchain_core.messages import HumanMessage, AIMessage
                    session_history.append(HumanMessage(content=user_message))
                    if final_message and hasattr(final_message, 'content'):
                        session_history.append(AIMessage(content=final_message.content))
                    
                    print(f"AI 响应完成 (会话: {client_session_id}): {final_message.content[:100] if final_message and hasattr(final_message, 'content') else 'No content'}...")
                    
                except Exception as e:
                    error_msg = f"处理消息时出现错误: {str(e)}"
                    print(error_msg)
                    await manager.send_message(websocket, json.dumps({
                        "type": "error",
                        "content": error_msg
                    }))
            
            elif message_data.get("type") == "ping":
                # 心跳检测 + 系统资源信息
                system_resources = get_system_resources()
                await manager.send_message(websocket, json.dumps({
                    "type": "pong",
                    "system_resources": system_resources
                }))
            
            elif message_data.get("type") == "register":
                # 客户端注册
                client_session_id = message_data.get("client_session_id")
                if client_session_id:
                    manager.register_client(client_session_id, websocket)
                    
                    # 检查是否在宽限期内重连
                    if client_session_id in websocket_disconnect_tracker:
                        del websocket_disconnect_tracker[client_session_id]
                        print(f"客户端重连，取消清理: {client_session_id}")
                    
                    await manager.send_message(websocket, json.dumps({
                        "type": "register_success",
                        "client_session_id": client_session_id
                    }))
                    
                    # 立即发送第一个心跳响应，包含系统资源信息
                    system_resources = get_system_resources()
                    await manager.send_message(websocket, json.dumps({
                        "type": "pong",
                        "system_resources": system_resources
                    }))
                else:
                    await manager.send_message(websocket, json.dumps({
                        "type": "register_error",
                        "message": "缺少 client_session_id"
                }))
            
            elif message_data.get("type") == "upload_complete":
                # 处理上传完成通知
                video_url = message_data.get("video_url", "")
                audio_url = message_data.get("audio_url", "")
                session_id = message_data.get("session_id", "")
                client_session_id = message_data.get("client_session_id", "")
                
                # 发送上传完成通知给特定客户端
                upload_notification = {
                    "type": "upload_complete",
                    "video_url": video_url,
                    "audio_url": audio_url,
                    "session_id": session_id,
                    "message": f"视频和音频上传完成！视频链接：{video_url}，音频链接：{audio_url}"
                }
                
                # 只发送给发送消息的客户端
                await manager.send_message(websocket, json.dumps(upload_notification))
            
            elif message_data.get("type") == "file_removed":
                # 处理文件删除通知
                session_id = message_data.get("session_id", "")
                file_count = message_data.get("deleted_count", 0)
                client_session_id = message_data.get("client_session_id", "")
                
                # 发送文件删除通知给特定客户端
                remove_notification = {
                    "type": "file_removed",
                    "session_id": session_id,
                    "deleted_count": file_count,
                    "message": f"上传的文件已从服务器删除（共删除 {file_count} 个文件）"
                }
                
                # 只发送给发送消息的客户端
                await manager.send_message(websocket, json.dumps(remove_notification))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket 错误: {e}")
        manager.disconnect(websocket)

@app.get("/api/example_video_info")
async def get_example_video_info():
    """获取示例视频信息（文件名等）"""
    try:
        example_video_path = os.getenv('EXAMPLE_VIDEO_PATH')
        if not example_video_path:
            raise HTTPException(status_code=404, detail="示例视频路径未配置")
        
        if not os.path.exists(example_video_path):
            raise HTTPException(status_code=404, detail="示例视频文件不存在")
        
        # 从环境变量路径中提取文件名
        filename = os.path.basename(example_video_path)
        
        return {
            "filename": filename,
            "path": example_video_path,
            "exists": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取示例视频信息失败: {str(e)}")

@app.get("/api/example_video_preview")
async def get_example_video_preview():
    """获取示例视频预览"""
    try:
        example_video_path = os.getenv('EXAMPLE_VIDEO_PATH')
        if not os.path.exists(example_video_path):
            raise HTTPException(status_code=404, detail="示例视频文件不存在")
        
        # 从环境变量路径中提取文件名
        filename = os.path.basename(example_video_path) if example_video_path else "example_video.mp4"
        
        from fastapi.responses import FileResponse
        return FileResponse(
            example_video_path,
            media_type="video/mp4",
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取示例视频预览失败: {str(e)}")

@app.post("/api/load_example_video")
async def load_example_video_endpoint(request: dict):
    """加载示例视频API端点"""
    try:
        from local_storage_manager import save_video_locally
        from audio_extractor import extract_audio_from_video
        from oss_manager import upload_file_to_oss
        
        # 从请求中获取client_session_id
        client_session_id = request.get("client_session_id")
        if not client_session_id:
            raise HTTPException(status_code=400, detail="缺少 client_session_id 参数")
        
        # 示例视频路径
        example_video_path = os.getenv('EXAMPLE_VIDEO_PATH')
        if not os.path.exists(example_video_path):
            raise HTTPException(status_code=404, detail="示例视频文件不存在")
        
        # 1 & 2. 高效复制示例视频到本地存储
        from local_storage_manager import save_video_locally_file
        local_video_path = save_video_locally_file(example_video_path, client_session_id)
        
        # 3. 提取音频
        audio_path = extract_audio_from_video(local_video_path)
        
        # 4. 上传音频到OSS
        audio_oss_key = f"{client_session_id}/audio/extracted_audio.mp3"
        audio_url = upload_file_to_oss(audio_path, audio_oss_key)
        
        # 5. 删除临时音频文件
        if os.path.exists(audio_path):
            os.remove(audio_path)
        
        # 6. 从环境变量读取示例视频的易错词
        vocabulary_text = os.getenv('EXAMPLE_VIDEO_VOCABULARY', '')
        vocabulary = []
        if vocabulary_text:
            # 支持两种格式：
            # 1. 使用分号分隔：硬脂酸;悬浊液
            # 2. 使用换行符分隔（如果环境变量支持）：硬脂酸\n悬浊液
            # 优先按分号分割，如果没有分号则按换行符分割
            if ';' in vocabulary_text:
                vocabulary = [word.strip() for word in vocabulary_text.split(';') if word.strip()]
            else:
                # 处理转义的换行符 \n 或实际的换行符
                vocabulary_text = vocabulary_text.replace('\\n', '\n')
                vocabulary = [line.strip() for line in vocabulary_text.split('\n') if line.strip()]
        
        # 7. WebSocket通知音频提取完成并触发自动语音识别
        if client_session_id:
            ws_message = {
                "type": "audio_extraction_complete",
                "audio_url": audio_url,
                "session_id": client_session_id,
                "message": "示例视频音频提取完成",
                "auto_start_speech_recognition": True  # 标记触发自动语音识别
            }
            # 如果有易错词，添加到WebSocket消息中
            if vocabulary:
                ws_message["vocabulary"] = vocabulary
            
            await manager.send_to_client(client_session_id, json.dumps(ws_message))
            
            # 8. 触发视频压缩任务（与正常上传流程一致）
            from oss_api import start_compression_task
            await start_compression_task(client_session_id, local_video_path, "720p", manager)
        
        response = {
            "success": True,
            "session_id": client_session_id,
            "audio_url": audio_url  # 返回音频URL供语音识别使用
        }
        # 如果有易错词，添加到响应中
        if vocabulary:
            response["vocabulary"] = vocabulary
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"加载示例视频异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/speech_recognition")
async def speech_recognition_endpoint(request: dict):
    """语音识别API端点"""
    try:
        client_session_id = request.get("client_session_id")
        if not client_session_id:
            raise HTTPException(status_code=400, detail="缺少 client_session_id 参数")
        
        # 获取易错词列表（可选）
        vocabulary = request.get("vocabulary")  # 字符串数组，每行一个词
        
        # 更新会话活跃时间
        update_session_activity(client_session_id)
        
        # 从OSS获取音频URL
        from oss_manager import get_oss_url
        audio_oss_key = f"{client_session_id}/audio/extracted_audio.mp3"
        audio_url = get_oss_url(audio_oss_key)

        # 验证音频URL可访问性（避免后续模型调用直接500）
        try:
            import requests
            head_resp = requests.head(audio_url, timeout=10)
            if head_resp.status_code != 200:
                raise HTTPException(status_code=404, detail=f"音频文件不可访问，状态码: {head_resp.status_code}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"音频URL验证失败: {str(e)}")
        
        # 使用线程池执行同步调用，避免阻塞事件循环
        # 传递易错词列表给 speech_recognition 函数
        result_json = await asyncio.to_thread(speech_recognition, audio_url, vocabulary)
        result = json.loads(result_json)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket发送操作记录给特定客户端
        speech_notification = {
            "type": "speech_recognition_complete",
            "audio_url": audio_url,
            "result": result,
            "message": "语音识别已完成"
        }
        
        # 发送给特定客户端
        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps(speech_notification))
        
        return {"success": True, "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"语音识别处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/video_understanding")
async def video_understanding_endpoint(request: dict):
    """视频理解API端点"""
    try:
        video_url = request.get("video_url")
        prompt = request.get("prompt")
        fps = request.get("fps", 2)
        audio_transcript = request.get("audio_transcript")
        # 兼容旧字段：若未提供 client_session_id，则回退到 session_id
        client_session_id = request.get("client_session_id") or request.get("session_id")
        
        if not video_url:
            raise HTTPException(status_code=400, detail="缺少 video_url 参数")
        if not prompt:
            raise HTTPException(status_code=400, detail="缺少 prompt 参数")
        
        # 验证视频URL是否可访问
        try:
            import requests
            response = requests.head(video_url, timeout=10)
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail=f"视频文件无法访问，状态码: {response.status_code}")
        except requests.RequestException as e:
            raise HTTPException(status_code=400, detail=f"视频URL验证失败: {str(e)}")
        
        # 确保fps是整数且在合理范围内
        try:
            fps = int(fps)
            if fps < 1 or fps > 10:
                fps = 2  # 默认值
        except (ValueError, TypeError):
            fps = 2
        
        # 更新会话活跃时间
        if client_session_id:
            update_session_activity(client_session_id)
        
        # 使用线程池执行同步调用
        result_json = await asyncio.to_thread(
            video_understanding,
            video_url=video_url,
            prompt=prompt,
            fps=fps,
            audio_transcript=audio_transcript
        )
        result = json.loads(result_json)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket发送操作记录给特定客户端
        video_notification = {
            "type": "video_understanding_complete",
            "video_url": video_url,
            "result": result.get("result", ""),
            "fps": fps,
            "has_audio_context": bool(audio_transcript),
            "message": "视频理解已完成"
        }
        
        # 发送给特定客户端
        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps(video_notification))
        
        return {"success": True, "result": result.get("result", "")}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"视频理解处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/api/get_video_duration")
async def get_video_duration_endpoint(request: dict):
    """获取视频时长,返回是否需要分段"""
    try:
        client_session_id = request.get("client_session_id")
        if not client_session_id:
            raise HTTPException(status_code=400, detail="缺少 client_session_id 参数")
        
        from local_storage_manager import get_local_video_path
        local_path = get_local_video_path(client_session_id)
        
        if not os.path.exists(local_path):
            raise HTTPException(status_code=404, detail="视频文件不存在")

        duration_sec = await asyncio.to_thread(get_video_duration, local_path, True)
        duration_min = round(duration_sec / 60, 2)
        
        # 使用用户设置的参数
        split_threshold_sec = request.get("split_threshold", 18) * 60
        segment_length_sec = request.get("segment_length", 15) * 60
        overlap_sec = request.get("segment_overlap", 2) * 60
        
        needs_segmentation = duration_sec > split_threshold_sec
        if needs_segmentation:
            # 估算分段数量
            segment_length = segment_length_sec
            overlap = overlap_sec
            if duration_sec <= segment_length:
                estimated = 1
            else:
                # 简单估算：首段segment_length，后续每段有效新增(segment_length - overlap)
                remaining = duration_sec - segment_length
                extra = max(0, remaining)
                step = max(1, segment_length - overlap)
                estimated = 1 + (extra + step - 1) // step
        else:
            estimated = 1

        return {
            "success": True,
            "duration": duration_min,
            "duration_seconds": int(duration_sec),
            "needs_segmentation": needs_segmentation,
            "estimated_segments": int(estimated)
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"获取视频时长异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/api/video_understanding_long")
async def video_understanding_long_endpoint(request: dict):
    """处理视频的完整流程(短/长统一入口)"""
    try:
        prompt = request.get("prompt")
        fps = request.get("fps", 2)
        audio_transcript = request.get("audio_transcript")
        client_session_id = request.get("client_session_id")
        req_lang = request.get("lang", "zh")
        
        # 视频分段参数（限制最大18分钟）
        split_threshold = min(request.get("split_threshold", 18), 18)  # 拆分界限（分钟）
        segment_length = min(request.get("segment_length", 15), 18)    # 片段时长上限（分钟）
        segment_overlap = request.get("segment_overlap", 2)   # 片段重叠（分钟）
        
        # 调试日志
        print(f"DEBUG: 接收到的分段参数 - split_threshold: {split_threshold}, segment_length: {segment_length}, segment_overlap: {segment_overlap}")
        print(f"DEBUG: 原始请求参数 - split_threshold: {request.get('split_threshold')}, segment_length: {request.get('segment_length')}, segment_overlap: {request.get('segment_overlap')}")

        if not client_session_id:
            raise HTTPException(status_code=400, detail="缺少 client_session_id 参数")
        # 若 prompt 为空，使用内置默认提示词，避免因大请求或前端状态异常导致400
        if not prompt or (isinstance(prompt, str) and not prompt.strip()):
            prompt = (
                "Please analyze the instructional video and generate a SOP draft including title, abstract, keywords, materials/tools, and step-by-step operations."
                if str(req_lang).lower().startswith("en")
                else "请分析教学视频并生成SOP草稿，包含标题、摘要、关键词、材料/工具清单与详细操作步骤。"
            )

        # 检查压缩视频是否存在
        from local_storage_manager import get_local_video_path
        compressed_video_path = get_local_video_path(client_session_id, "compressed_video.mp4")
        
        # 等待压缩文件短暂就绪（最多10秒），降低竞态导致的400
        if not os.path.exists(compressed_video_path):
            import time
            max_wait_s = 10
            waited = 0
            while waited < max_wait_s and not os.path.exists(compressed_video_path):
                time.sleep(0.5)
                waited += 0.5
        if not os.path.exists(compressed_video_path):
            raise HTTPException(
                status_code=400,
                detail=f"压缩视频尚未完成或不存在 (session={client_session_id})"
            )
        
        # 使用压缩视频而不是原始视频
        local_video_path = compressed_video_path

        # 第二步：获取时长（先获取时长，再决定是否需要上传）
        duration_sec = await asyncio.to_thread(get_video_duration, local_video_path, True)
        is_long = duration_sec > split_threshold * 60
        
        # 调试日志
        print(f"DEBUG: 视频时长检测 - duration_sec: {duration_sec}, split_threshold: {split_threshold}, split_threshold*60: {split_threshold * 60}, is_long: {is_long}")
        
        # 根据视频长度决定处理方式
        video_for_processing = local_video_path  # 用于后续处理的视频路径
        video_url = None  # 用于短视频AI处理的视频URL
        
        if not is_long:
            # 短视频：上传压缩视频到OSS
            await manager.send_to_client(client_session_id, json.dumps({
                "type": "status", "stage": "upload_start", "message": "开始上传压缩视频"
            }))
            
            from oss_manager import upload_file_to_oss
            video_oss_key = f"{client_session_id}/compressed_video.mp4"
            video_url = await asyncio.to_thread(
                upload_file_to_oss,
                local_video_path,  # 此时 local_video_path 已是 compressed_video_path
                video_oss_key
            )
            
            await manager.send_to_client(client_session_id, json.dumps({
                "type": "status", "stage": "upload_done", "message": "压缩视频上传完成"
            }))
        # 长视频不需要上传，直接使用本地文件
        
        if client_session_id:
            # 格式化时长为分钟和秒
            minutes = int(duration_sec // 60)
            seconds = int(duration_sec % 60)
            duration_text = f"{minutes}分{seconds}秒" if minutes > 0 else f"{seconds}秒"
            
            await manager.send_to_client(client_session_id, json.dumps({
                "type": "status",
                "stage": "length_detected",
                "message": (
                    f"视频时长 {duration_text}，将分段" if is_long else f"视频时长 {duration_text}，不分段"
                )
            }))

        # 更新会话活跃
        if client_session_id:
            update_session_activity(client_session_id)

        if not is_long:
            # 短视频：直接调用Qwen3-VL-Plus输出完整草稿(含标题/摘要/关键词)
            if client_session_id:
                await manager.send_to_client(client_session_id, json.dumps({
                    "type": "status", "stage": "understanding_start", "message": "开始视频理解(短视频)"
                }))
            result_json = await asyncio.to_thread(
                video_understanding,
                video_url,
                prompt,
                int(fps),
                audio_transcript
            )
            result = json.loads(result_json)
            if "error" in result:
                raise HTTPException(status_code=500, detail=result["error"])

            # 通过WebSocket发送完成
            if client_session_id:
                await manager.send_to_client(client_session_id, json.dumps({
                    "type": "video_understanding_complete",
                    "video_url": video_url,
                    "result": result.get("result", ""),
                    "fps": int(fps),
                    "has_audio_context": bool(audio_transcript),
                    "message": "短视频理解完成"
                }))
            return {"success": True, "result": result.get("result", "")}

        # 长视频：分段并行
        # 拆分提示词
        from prompt_splitter_tool import split_prompt_for_long_video
        
        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps({
                "type": "status", "stage": "splitting_prompt", "message": "正在分析提示词..."
            }))
        
        prompt_split_result = await asyncio.to_thread(
            split_prompt_for_long_video, 
            prompt
        )
        segment_prompt_user = prompt_split_result.get("segment_prompt", "")
        integration_prompt_user = prompt_split_result.get("integration_prompt", "")
        
        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps({
                "type": "status", "stage": "segmenting", "message": "正在分段..."
            }))
        segments = await asyncio.to_thread(
            split_video_segments, video_for_processing, client_session_id, duration_sec, segment_length*60, segment_overlap*60, True
        )

        # 逐段并行处理
        async def process_segment(seg):
            # 格式化时间段信息为 mm:ss 格式
            def format_time_mmss(seconds):
                mins = int(seconds) // 60
                secs = int(seconds) % 60
                return f"{mins:02d}:{secs:02d}"
            
            start_time_str = format_time_mmss(seg['start_time'])
            end_time_str = format_time_mmss(seg['end_time'])
            time_range_formatted = f"{start_time_str}-{end_time_str}"
            
            # 通知开始
            if client_session_id:
                await manager.send_to_client(client_session_id, json.dumps({
                    "type": "segment_processing",
                    "segment_id": seg['segment_id'],
                    "time_range": time_range_formatted
                }))
            
            # 在片段提示词前添加时间段信息
            segment_prompt_with_context = f"""你获得的视频片段是完整视频的{time_range_formatted}部分。

{segment_prompt_user}"""

            res_json = await asyncio.to_thread(
                video_understanding,
                seg['url'],
                segment_prompt_with_context,  # 使用包含时间段信息的提示词
                int(fps),
                audio_transcript
            )
            res = json.loads(res_json)
            text = res.get("result", "") if "error" not in res else f"[error] {res.get('error')}"
            if client_session_id:
                await manager.send_to_client(client_session_id, json.dumps({
                    "type": "segment_completed",
                    "segment_id": seg['segment_id'],
                    "time_range": time_range_formatted,
                    "result": text
                }))
            return {
                "segment_id": seg['segment_id'],
                "time_range": time_range_formatted,
                "result": text
            }

        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps({
                "type": "status", "stage": "segments_running", "message": f"已启动 {len(segments)} 个片段并行理解"
            }))
        segment_results = await asyncio.gather(*[process_segment(seg) for seg in segments])

        # 整合
        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps({
                "type": "status", "stage": "integrating", "message": "正在整合片段结果..."
            }))
        integrated = await asyncio.to_thread(
            integrate_sop_segments, 
            segment_results, 
            audio_transcript or "",
            integration_prompt_user  # 传递拆分后的整合提示词
        )
        if isinstance(integrated, str) and integrated.startswith('{') and '"error"' in integrated:
            # 失败也继续返回片段结果，供前端展示
            if client_session_id:
                await manager.send_to_client(client_session_id, json.dumps({
                    "type": "integration_completed",
                    "result": integrated
                }))
        else:
            if client_session_id:
                await manager.send_to_client(client_session_id, json.dumps({
                    "type": "integration_completed",
                    "result": integrated
                }))

        return {"success": True, "segments": segment_results, "integrated": integrated}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"长视频处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/parse_sop")
async def parse_sop_endpoint(request: dict):
    """SOP解析API端点"""
    try:
        manuscript = request.get("manuscript")
        client_session_id = request.get("client_session_id")
        if not manuscript:
            raise HTTPException(status_code=400, detail="缺少 manuscript 参数")
        
        # 更新会话活跃时间
        if client_session_id:
            update_session_activity(client_session_id)
        
        # 使用线程池执行同步调用
        result_json = await asyncio.to_thread(sop_parser, manuscript)
        result = json.loads(result_json)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket发送解析完成通知给特定客户端
        parse_notification = {
            "type": "sop_parse_complete",
            "blocks_count": len(result.get("blocks", [])),
            "message": f"SOP解析完成，共生成 {len(result.get('blocks', []))} 个区块"
        }
        
        # 发送给特定客户端
        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps(parse_notification))
        
        return {"success": True, "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"SOP解析处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

def refine_sop_blocks(blocks, user_notes):
    """直接调用DashScope API进行SOP精修，避免LangChain工具包装问题"""
    try:
        # 构建提示词
        system_prompt = """你是一个专业的SOP文档精修专家。请根据用户的批注和建议，对SOP区块数组进行精修改进。

精修原则：
1. 保持原有的区块结构和类型分类
2. 根据用户批注改进文本内容，使其更加专业、准确、易读
3. 保持时间戳信息不变
4. 确保技术术语的准确性和一致性
5. 改进语言表达，使其符合标准SOP文档规范
6. 保持逻辑清晰和操作步骤的完整性

请严格按照以下JSON格式返回精修结果：
{
  "blocks": [
    {
      "id": "保持原ID",
      "type": "保持原类型",
      "content": "精修后的文本内容",
      "start_time": 保持原时间戳,
      "end_time": 保持原时间戳,
      "show_play_button": 保持原设置
    }
  ]
}"""

        user_prompt = f"""请根据以下用户批注精修SOP区块：

用户批注：
{user_notes}

原始区块数据：
{json.dumps(blocks, ensure_ascii=False, indent=2)}

要求：
1. 根据用户批注改进相关内容
2. 保持区块的ID、type、时间戳和show_play_button字段不变
3. 主要精修content字段的文本内容
4. 确保精修后的内容更加专业和准确
5. 只返回JSON格式，不要添加其他文字说明"""

        # 调用qwen-plus
        response = dashscope.Generation.call(
            api_key=os.getenv('DASHSCOPE_API_KEY'),
            model="qwen-plus",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            result_format='message',
            temperature=0.3
        )
        
        if response.status_code == 200:
            result = response.output.choices[0].message.content
            
            # 尝试解析JSON结果
            try:
                # 提取JSON部分（可能包含在```json```代码块中）
                import re
                json_match = re.search(r'```json\s*(.*?)\s*```', result, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    # 尝试直接解析
                    json_str = result
                
                parsed_result = json.loads(json_str)
                
                # 验证结果格式
                if 'blocks' in parsed_result and isinstance(parsed_result['blocks'], list):
                    # 确保精修后的区块保持原有结构
                    refined_blocks = parsed_result['blocks']
                    
                    # 验证每个区块都有必需的字段，如果缺失则从原区块复制
                    for i, refined_block in enumerate(refined_blocks):
                        if i < len(blocks):
                            original_block = blocks[i]
                            # 确保关键字段存在
                            if 'id' not in refined_block:
                                refined_block['id'] = original_block.get('id', f"block_{i+1}")
                            if 'type' not in refined_block:
                                refined_block['type'] = original_block.get('type', 'unknown')
                            if 'start_time' not in refined_block:
                                refined_block['start_time'] = original_block.get('start_time')
                            if 'end_time' not in refined_block:
                                refined_block['end_time'] = original_block.get('end_time')
                            if 'show_play_button' not in refined_block:
                                refined_block['show_play_button'] = original_block.get('show_play_button', False)
                            if 'content' not in refined_block:
                                refined_block['content'] = original_block.get('content', '')
                    
                    return parsed_result
                else:
                    return {"error": "精修结果格式不正确", "blocks": blocks}
                    
            except json.JSONDecodeError as e:
                # 如果JSON解析失败，返回原始区块（表示精修失败）
                return {"error": f"JSON解析失败: {str(e)}", "blocks": blocks}
        else:
            return {"error": f"API调用失败: {response.message}", "blocks": blocks}
            
    except Exception as e:
        # 发生错误时返回原始区块
        return {"error": str(e), "blocks": blocks}

@app.post("/api/refine_sop")
async def refine_sop_endpoint(request: dict):
    """SOP精修API端点"""
    try:
        blocks = request.get("blocks")
        user_notes = request.get("user_notes", "")
        client_session_id = request.get("client_session_id")
        
        if not blocks:
            raise HTTPException(status_code=400, detail="缺少 blocks 参数")
        
        # 更新会话活跃时间
        if client_session_id:
            update_session_activity(client_session_id)
        
        # 使用线程池执行同步调用
        result = await asyncio.to_thread(refine_sop_blocks, blocks, user_notes)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket发送精修完成通知给特定客户端
        refine_notification = {
            "type": "sop_refine_complete",
            "blocks_count": len(result.get("blocks", [])),
            "has_user_notes": bool(user_notes),
            "message": f"SOP精修完成，共处理 {len(result.get('blocks', []))} 个区块"
        }
        
        # 发送给特定客户端
        if client_session_id:
            await manager.send_to_client(client_session_id, json.dumps(refine_notification))
        
        return {"success": True, "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"SOP精修处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/sessions/stats")
async def get_session_stats():
    """获取会话统计信息"""
    cleanup_expired_sessions()  # 先清理过期会话
    
    return {
        "active_sessions": len(session_histories),
        "agent_pool_size": len(agent_pool),
        "timeout_hours": SESSION_TIMEOUT_HOURS,
        "sessions": [
            {
                "client_session_id": sid[:16] + "...",
                "message_count": len(session["history"]),
                "agent_index": session["agent_index"],
                "last_active": session["last_active"].isoformat(),
                "inactive_minutes": (datetime.now() - session["last_active"]).total_seconds() / 60
            }
            for sid, session in session_histories.items()
        ]
    }

@app.post("/api/mark_session_keep_video")
async def mark_session_keep_video(request: dict):
    """标记会话视频保留"""
    try:
        session_id = request.get("session_id")
        client_session_id = request.get("client_session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="缺少 session_id 参数")
        
        # 将session_id添加到保留列表
        keep_sessions.add(session_id)
        print(f"会话 {session_id} 的视频已标记为保留")
        
        return {"success": True, "session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"标记视频保留异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/api/check_session_keep_video")
async def check_session_keep_video(session_id: str):
    """检查会话视频是否被标记为保留"""
    try:
        if not session_id:
            raise HTTPException(status_code=400, detail="缺少 session_id 参数")
        
        is_kept = session_id in keep_sessions
        return {"success": True, "session_id": session_id, "is_kept": is_kept}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"检查视频保留状态异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

async def check_disconnected_sessions():
    """定期检查断开连接的会话，超过宽限期则清理"""
    while True:
        await asyncio.sleep(60)  # 每分钟检查一次
        now = datetime.now()
        to_cleanup = []
        
        for client_session_id, disconnect_time in list(websocket_disconnect_tracker.items()):
            if now - disconnect_time > DISCONNECT_GRACE_PERIOD:
                to_cleanup.append(client_session_id)
        
        for client_session_id in to_cleanup:
            print(f"清理断线超过5分钟的会话: {client_session_id}")
            
            # 清理OSS文件
            from oss_manager import delete_session_files
            delete_session_files(client_session_id)
            
            # 清理本地文件
            from local_storage_manager import delete_session_local_files
            delete_session_local_files(client_session_id)
            
            # 清理会话历史
            if client_session_id in session_histories:
                del session_histories[client_session_id]
            
            del websocket_disconnect_tracker[client_session_id]

async def daily_cleanup_task():
    """每天清理超过24小时的本地文件"""
    while True:
        await asyncio.sleep(86400)  # 24小时
        from local_storage_manager import cleanup_old_local_files
        result = cleanup_old_local_files(hours=24)
        print(f"定期清理完成: {result}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_disconnected_sessions())
    asyncio.create_task(daily_cleanup_task())

@app.get("/")
async def root():
    """根路径"""
    return {"message": "LangGraph Agent Chat API", "version": "1.0.0"}

# 设置 OSS 路由
setup_oss_routes(app, manager)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8123)
