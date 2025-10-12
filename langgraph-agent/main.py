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
import dashscope

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

@app.post("/load_example_video")
async def load_example_video_endpoint():
    """加载示例视频API端点"""
    try:
        from oss_manager import generate_session_id, upload_file_to_oss
        from audio_extractor import extract_audio_from_video
        import shutil
        from pathlib import Path
        
        # 示例视频路径
        example_video_path = "/root/app/temp/video_example/pressing_operation.mp4"
        
        # 检查示例视频文件是否存在
        if not os.path.exists(example_video_path):
            raise HTTPException(status_code=404, detail="示例视频文件不存在")
        
        # 生成会话ID
        session_id = generate_session_id()
        
        # 创建临时目录
        temp_dir = Path(f"/tmp/video2sop/{session_id}")
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # 复制示例视频到临时目录
        temp_video_path = temp_dir / "pressing_operation.mp4"
        shutil.copy2(example_video_path, temp_video_path)
        
        # 上传视频到OSS
        video_oss_key = f"{session_id}/video/pressing_operation.mp4"
        video_url = upload_file_to_oss(str(temp_video_path), video_oss_key)
        
        # 提取音频
        temp_audio_path = temp_dir / "extracted_audio.mp3"
        extracted_audio_path = extract_audio_from_video(str(temp_video_path), str(temp_audio_path))
        
        # 上传音频到OSS
        audio_oss_key = f"{session_id}/audio/extracted_audio.mp3"
        audio_url = upload_file_to_oss(extracted_audio_path, audio_oss_key)
        
        # 清理临时文件
        try:
            shutil.rmtree(temp_dir)
        except:
            pass  # 忽略清理失败
        
        # 通过WebSocket广播操作记录
        upload_notification = {
            "type": "upload_complete",
            "video_url": video_url,
            "audio_url": audio_url,
            "session_id": session_id
        }
        
        # 发送给所有连接的客户端
        for connection in manager.active_connections:
            try:
                await manager.send_message(connection, json.dumps(upload_notification))
            except:
                pass  # 忽略发送失败
        
        return {
            "success": True,
            "video_url": video_url,
            "audio_url": audio_url,
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"加载示例视频异常: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

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

async def refine_sop_blocks(blocks, user_notes):
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

        # 调用qwen3-max
        response = dashscope.Generation.call(
            api_key=os.getenv('DASHSCOPE_API_KEY'),
            model="qwen-max",
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

@app.post("/refine_sop")
async def refine_sop_endpoint(request: dict):
    """SOP精修API端点"""
    try:
        blocks = request.get("blocks")
        user_notes = request.get("user_notes", "")
        
        if not blocks:
            raise HTTPException(status_code=400, detail="缺少 blocks 参数")
        
        # 直接调用精修逻辑，避免LangChain工具包装问题
        result = await refine_sop_blocks(blocks, user_notes)
        
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
