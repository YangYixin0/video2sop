#!/usr/bin/env python3
"""
连接测试工具
用于测试 WebSocket 和 HTTP 连接是否正常
"""

import asyncio
import json
import sys
import time
import websockets
import requests
from urllib.parse import urlparse

def test_http_connection(url):
    """测试 HTTP 连接"""
    try:
        print(f"🔍 测试 HTTP 连接: {url}")
        response = requests.get(url, timeout=5, proxies={'http': None, 'https': None})
        if response.status_code == 200:
            print(f"✅ HTTP 连接成功: {response.status_code}")
            return True
        else:
            print(f"❌ HTTP 连接失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ HTTP 连接异常: {e}")
        return False

async def test_websocket_connection(url):
    """测试 WebSocket 连接"""
    try:
        print(f"🔍 测试 WebSocket 连接: {url}")
        
        # 解析 URL
        parsed = urlparse(url)
        ws_url = f"ws://{parsed.netloc}{parsed.path}"
        
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket 连接成功")
            
            # 发送心跳测试
            ping_msg = {"type": "ping"}
            await websocket.send(json.dumps(ping_msg))
            print("📤 发送心跳消息")
            
            # 接收响应
            response = await websocket.recv()
            data = json.loads(response)
            print(f"📥 收到响应: {data}")
            
            if data.get("type") == "pong":
                print("✅ 心跳测试成功")
                return True
            else:
                print("❌ 心跳测试失败")
                return False
                
    except Exception as e:
        print(f"❌ WebSocket 连接异常: {e}")
        return False

async def test_chat_message(url):
    """测试聊天消息"""
    try:
        print(f"🔍 测试聊天消息: {url}")
        
        # 解析 URL
        parsed = urlparse(url)
        ws_url = f"ws://{parsed.netloc}{parsed.path}"
        
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket 连接成功")
            
            # 发送聊天消息
            chat_msg = {"type": "message", "content": "你好，请简单介绍一下你自己"}
            await websocket.send(json.dumps(chat_msg))
            print(f"📤 发送聊天消息: {chat_msg['content']}")
            
            # 接收响应
            response_count = 0
            async for message in websocket:
                data = json.loads(message)
                print(f"📥 收到响应 {response_count + 1}: {data.get('type', 'unknown')}")
                
                if data.get("type") == "complete":
                    print("✅ 聊天测试成功")
                    print(f"📝 AI 响应: {data.get('content', '')[:100]}...")
                    return True
                    
                response_count += 1
                if response_count > 10:  # 防止无限循环
                    break
                    
    except Exception as e:
        print(f"❌ 聊天测试异常: {e}")
        return False

async def main():
    """主测试函数"""
    print("🧪 LangGraph Agent Chat 连接测试")
    print("=" * 50)
    
    # 测试配置
    backend_url = "http://127.0.0.1:8123"
    frontend_url = "http://127.0.0.1:50001"
    websocket_url = "ws://127.0.0.1:8123/ws"
    
    # 测试 HTTP 连接
    print("\n1️⃣ 测试 HTTP 连接")
    print("-" * 30)
    http_success = test_http_connection(f"{backend_url}/health")
    
    # 测试前端连接
    print("\n2️⃣ 测试前端连接")
    print("-" * 30)
    frontend_success = test_http_connection(frontend_url)
    
    # 测试 WebSocket 连接
    print("\n3️⃣ 测试 WebSocket 连接")
    print("-" * 30)
    ws_success = await test_websocket_connection(websocket_url)
    
    # 测试聊天功能
    if ws_success:
        print("\n4️⃣ 测试聊天功能")
        print("-" * 30)
        chat_success = await test_chat_message(websocket_url)
    else:
        chat_success = False
    
    # 总结
    print("\n📊 测试结果总结")
    print("=" * 50)
    print(f"HTTP 后端: {'✅ 正常' if http_success else '❌ 失败'}")
    print(f"HTTP 前端: {'✅ 正常' if frontend_success else '❌ 失败'}")
    print(f"WebSocket: {'✅ 正常' if ws_success else '❌ 失败'}")
    print(f"聊天功能: {'✅ 正常' if chat_success else '❌ 失败'}")
    
    if all([http_success, frontend_success, ws_success, chat_success]):
        print("\n🎉 所有测试通过！系统运行正常")
        return 0
    else:
        print("\n⚠️  部分测试失败，请检查服务状态")
        return 1

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(result)
    except KeyboardInterrupt:
        print("\n\n🛑 测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {e}")
        sys.exit(1)
