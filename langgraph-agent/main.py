import os
import json
import asyncio
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from agent import QwenAgent
from langchain_core.messages import BaseMessage
from oss_api import setup_oss_routes
from speech_tool import speech_recognition
from video_understanding_tool import video_understanding
from sop_parser_tool import sop_parser
from sop_refine_tool import sop_refine

# 加载环境变量
load_dotenv('../.env')

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
        "http://maqp1391303.bohrium.tech:50001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 设置 OSS 相关路由
setup_oss_routes(app)

# 初始化 Agent
agent = QwenAgent()

# 全局会话历史（单会话模式）
chat_history: List[BaseMessage] = []

class ConnectionManager:
    """WebSocket 连接管理器"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"客户端已连接，当前连接数: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"客户端已断开，当前连接数: {len(self.active_connections)}")
    
    async def send_message(self, websocket: WebSocket, message: str):
        try:
            await websocket.send_text(message)
        except Exception as e:
            print(f"发送消息失败: {e}")
            self.disconnect(websocket)

manager = ConnectionManager()

@app.get("/health")
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
                print(f"收到用户消息: {user_message}")
                
                # 发送开始处理信号
                await manager.send_message(websocket, json.dumps({
                    "type": "status",
                    "status": "processing"
                }))
                
                try:
                    # 流式调用 Agent
                    final_message = None
                    
                    async for message in agent.astream_chat(user_message, chat_history.copy()):
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
                    
                    # 更新全局会话历史
                    from langchain_core.messages import HumanMessage, AIMessage
                    chat_history.append(HumanMessage(content=user_message))
                    if final_message and hasattr(final_message, 'content'):
                        chat_history.append(AIMessage(content=final_message.content))
                    
                    print(f"AI 响应完成: {final_message.content[:100] if final_message and hasattr(final_message, 'content') else 'No content'}...")
                    
                except Exception as e:
                    error_msg = f"处理消息时出现错误: {str(e)}"
                    print(error_msg)
                    await manager.send_message(websocket, json.dumps({
                        "type": "error",
                        "content": error_msg
                    }))
            
            elif message_data.get("type") == "ping":
                # 心跳检测
                await manager.send_message(websocket, json.dumps({
                    "type": "pong"
                }))
            
            elif message_data.get("type") == "upload_complete":
                # 处理上传完成通知
                video_url = message_data.get("video_url", "")
                audio_url = message_data.get("audio_url", "")
                session_id = message_data.get("session_id", "")
                
                # 发送上传完成通知给所有连接的客户端
                upload_notification = {
                    "type": "upload_complete",
                    "video_url": video_url,
                    "audio_url": audio_url,
                    "session_id": session_id,
                    "message": f"视频和音频上传完成！视频链接：{video_url}，音频链接：{audio_url}"
                }
                
                # 发送给当前连接的客户端
                await manager.send_message(websocket, json.dumps(upload_notification))
                
                # 可选：发送给所有连接的客户端
                for connection in manager.active_connections:
                    try:
                        await manager.send_message(connection, json.dumps(upload_notification))
                    except:
                        pass  # 忽略发送失败
            
            elif message_data.get("type") == "file_removed":
                # 处理文件删除通知
                session_id = message_data.get("session_id", "")
                file_count = message_data.get("deleted_count", 0)
                
                # 发送文件删除通知给所有连接的客户端
                remove_notification = {
                    "type": "file_removed",
                    "session_id": session_id,
                    "deleted_count": file_count,
                    "message": f"上传的文件已从服务器删除（共删除 {file_count} 个文件）"
                }
                
                # 发送给当前连接的客户端
                await manager.send_message(websocket, json.dumps(remove_notification))
                
                # 可选：发送给所有连接的客户端
                for connection in manager.active_connections:
                    try:
                        await manager.send_message(connection, json.dumps(remove_notification))
                    except:
                        pass  # 忽略发送失败
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket 错误: {e}")
        manager.disconnect(websocket)

@app.post("/speech_recognition")
async def speech_recognition_endpoint(request: dict):
    """语音识别API端点"""
    try:
        audio_url = request.get("audio_url")
        if not audio_url:
            raise HTTPException(status_code=400, detail="缺少 audio_url 参数")
        
        # 调用语音识别工具
        result_json = speech_recognition(audio_url)
        result = json.loads(result_json)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket广播操作记录
        speech_notification = {
            "type": "speech_recognition_complete",
            "audio_url": audio_url,
            "result": result,
            "message": "语音识别已执行"
        }
        
        # 发送给所有连接的客户端
        for connection in manager.active_connections:
            try:
                await manager.send_message(connection, json.dumps(speech_notification))
            except:
                pass  # 忽略发送失败
        
        return {"success": True, "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"语音识别处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/video_understanding")
async def video_understanding_endpoint(request: dict):
    """视频理解API端点"""
    try:
        video_url = request.get("video_url")
        prompt = request.get("prompt")
        fps = request.get("fps", 2)
        audio_transcript = request.get("audio_transcript")
        
        if not video_url:
            raise HTTPException(status_code=400, detail="缺少 video_url 参数")
        if not prompt:
            raise HTTPException(status_code=400, detail="缺少 prompt 参数")
        
        # 确保fps是整数且在合理范围内
        try:
            fps = int(fps)
            if fps < 1 or fps > 10:
                fps = 2  # 默认值
        except (ValueError, TypeError):
            fps = 2
        
        # 调用视频理解工具
        result_json = video_understanding(
            video_url=video_url,
            prompt=prompt,
            fps=fps,
            audio_transcript=audio_transcript
        )
        result = json.loads(result_json)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket广播操作记录
        video_notification = {
            "type": "video_understanding_complete",
            "video_url": video_url,
            "result": result.get("result", ""),
            "fps": fps,
            "has_audio_context": bool(audio_transcript),
            "message": "视频理解已执行"
        }
        
        # 发送给所有连接的客户端
        for connection in manager.active_connections:
            try:
                await manager.send_message(connection, json.dumps(video_notification))
            except:
                pass  # 忽略发送失败
        
        return {"success": True, "result": result.get("result", "")}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"视频理解处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/parse_sop")
async def parse_sop_endpoint(request: dict):
    """SOP解析API端点"""
    try:
        manuscript = request.get("manuscript")
        if not manuscript:
            raise HTTPException(status_code=400, detail="缺少 manuscript 参数")
        
        # 调用SOP解析工具
        result_json = sop_parser(manuscript)
        result = json.loads(result_json)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket广播解析完成通知
        parse_notification = {
            "type": "sop_parse_complete",
            "blocks_count": len(result.get("blocks", [])),
            "message": f"SOP解析完成，共生成 {len(result.get('blocks', []))} 个区块"
        }
        
        # 发送给所有连接的客户端
        for connection in manager.active_connections:
            try:
                await manager.send_message(connection, json.dumps(parse_notification))
            except:
                pass  # 忽略发送失败
        
        return {"success": True, "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"SOP解析处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/refine_sop")
async def refine_sop_endpoint(request: dict):
    """SOP精修API端点"""
    try:
        blocks = request.get("blocks")
        user_notes = request.get("user_notes", "")
        
        if not blocks:
            raise HTTPException(status_code=400, detail="缺少 blocks 参数")
        
        # 将区块数组转换为JSON字符串
        blocks_json = json.dumps({"blocks": blocks}, ensure_ascii=False)
        
        # 调用SOP精修工具
        result_json = sop_refine(blocks_json, user_notes)
        result = json.loads(result_json)
        
        # 检查是否有错误
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        # 通过WebSocket广播精修完成通知
        refine_notification = {
            "type": "sop_refine_complete",
            "blocks_count": len(result.get("blocks", [])),
            "has_user_notes": bool(user_notes),
            "message": f"SOP精修完成，共处理 {len(result.get('blocks', []))} 个区块"
        }
        
        # 发送给所有连接的客户端
        for connection in manager.active_connections:
            try:
                await manager.send_message(connection, json.dumps(refine_notification))
            except:
                pass  # 忽略发送失败
        
        return {"success": True, "result": result}
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"SOP精修处理异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/")
async def root():
    """根路径"""
    return {"message": "LangGraph Agent Chat API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8123)
