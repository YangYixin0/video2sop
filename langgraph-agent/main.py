import os
import json
import asyncio
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from agent import QwenAgent
from langchain_core.messages import BaseMessage

# 加载环境变量
load_dotenv()

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
    allow_origins=["http://localhost:50001", "http://127.0.0.1:50001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket 错误: {e}")
        manager.disconnect(websocket)

@app.get("/")
async def root():
    """根路径"""
    return {"message": "LangGraph Agent Chat API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8123)
