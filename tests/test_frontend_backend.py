#!/usr/bin/env python3
"""
测试前端和后端的连接
"""

import asyncio
import websockets
import json

async def test_websocket_connection():
    """测试 WebSocket 连接"""
    print("🔌 测试 WebSocket 连接")
    print("=" * 40)
    
    try:
        # 连接到后端 WebSocket
        uri = "ws://127.0.0.1:8123/ws"
        print(f"连接地址: {uri}")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket 连接成功")
            
            # 发送测试消息
            test_message = {
                "type": "message",
                "content": "请转录这个音频文件：https://video2sop-yixin.oss-cn-beijing.aliyuncs.com/session_uni1dpqi5o_1760132735912/audio.mp3"
            }
            
            print(f"发送消息: {test_message['content']}")
            await websocket.send(json.dumps(test_message))
            
            # 接收响应
            print("等待响应...")
            response_count = 0
            
            async for message in websocket:
                response_count += 1
                data = json.loads(message)
                print(f"响应 {response_count}: {data['type']}")
                
                if data['type'] == 'tool_call':
                    print(f"  🎤 工具调用: {data.get('tool_name')} - {data.get('message')}")
                elif data['type'] == 'complete':
                    print(f"  ✅ 完成: {data.get('content', '')[:100]}...")
                    break
                elif data['type'] == 'error':
                    print(f"  ❌ 错误: {data.get('content')}")
                    break
                elif data['type'] == 'chunk':
                    print(f"  📝 内容片段: {data.get('content', '')[:50]}...")
            
            print(f"总共收到 {response_count} 个响应")
            
    except Exception as e:
        print(f"❌ WebSocket 连接失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_websocket_connection())
