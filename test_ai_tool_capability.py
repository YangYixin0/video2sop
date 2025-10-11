#!/usr/bin/env python3
"""
测试 AI 助手的工具调用能力
"""

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'langgraph-agent'))
from agent import QwenAgent

def test_tool_capability():
    """测试工具调用能力"""
    print("🧪 测试 AI 助手工具调用能力")
    print("=" * 50)
    
    try:
        agent = QwenAgent()
        print("✅ Agent 初始化成功")
        
        # 测试 1: 询问工具能力
        print("\n📋 测试 1: 询问工具能力")
        print("-" * 30)
        
        question = "你能调用工具吗？你有什么功能？"
        print(f"用户问题: {question}")
        
        result = agent.chat(question)
        if 'messages' in result:
            last_message = result['messages'][-1]
            print(f"AI回复: {last_message.content[:200]}...")
        
        # 测试 2: 测试语音识别工具调用
        print("\n🎤 测试 2: 语音识别工具调用")
        print("-" * 30)
        
        audio_request = "请转录这个音频文件：https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav"
        print(f"用户请求: {audio_request}")
        
        result = agent.chat(audio_request)
        if 'messages' in result:
            messages = result['messages']
            
            # 检查是否有工具调用
            tool_call_found = False
            for msg in messages:
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    print(f"✅ 工具调用检测成功: {len(msg.tool_calls)} 个工具调用")
                    for tool_call in msg.tool_calls:
                        print(f"  - 工具名称: {tool_call['name']}")
                        print(f"  - 参数: {tool_call['args']}")
                    tool_call_found = True
                    break
            
            if tool_call_found:
                print("✅ 工具调用流程正常")
            else:
                print("❌ 未检测到工具调用")
            
            # 显示最终回复
            last_message = messages[-1]
            print(f"AI最终回复: {last_message.content[:200]}...")
        
        # 测试 3: 测试普通对话（无工具调用）
        print("\n💬 测试 3: 普通对话")
        print("-" * 30)
        
        normal_question = "你好，今天天气怎么样？"
        print(f"用户问题: {normal_question}")
        
        result = agent.chat(normal_question)
        if 'messages' in result:
            messages = result['messages']
            
            # 检查是否没有工具调用
            has_tool_calls = False
            for msg in messages:
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    has_tool_calls = True
                    break
            
            if not has_tool_calls:
                print("✅ 普通对话无工具调用（正确）")
            else:
                print("❌ 普通对话意外触发了工具调用")
            
            last_message = messages[-1]
            print(f"AI回复: {last_message.content[:200]}...")
        
        print("\n" + "=" * 50)
        print("🎉 所有测试完成！")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_tool_capability()
