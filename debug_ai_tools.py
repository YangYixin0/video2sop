#!/usr/bin/env python3
"""
调试 AI 助手工具调用问题
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'langgraph-agent'))

def test_ai_tool_response():
    """测试 AI 助手对工具能力问题的回答"""
    print("🔍 调试 AI 助手工具调用问题")
    print("=" * 60)
    
    try:
        from agent import QwenAgent
        agent = QwenAgent()
        print("✅ Agent 初始化成功")
        
        # 测试问题列表
        test_questions = [
            "你能调用工具吗？",
            "你有什么功能？",
            "你会使用工具吗？",
            "你能转录音频吗？",
            "请转录这个音频文件：https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav"
        ]
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n📝 测试问题 {i}: {question}")
            print("-" * 50)
            
            try:
                result = agent.chat(question)
                
                if 'messages' in result:
                    messages = result['messages']
                    
                    # 检查是否有工具调用
                    has_tool_calls = False
                    for msg in messages:
                        if hasattr(msg, 'tool_calls') and msg.tool_calls:
                            has_tool_calls = True
                            print(f"🔧 检测到工具调用: {len(msg.tool_calls)} 个")
                            for tool_call in msg.tool_calls:
                                print(f"  - 工具: {tool_call['name']}")
                                print(f"  - 参数: {tool_call['args']}")
                    
                    # 显示 AI 回复
                    last_message = messages[-1]
                    if hasattr(last_message, 'content'):
                        reply = last_message.content
                        print(f"🤖 AI 回复: {reply[:300]}...")
                        
                        # 检查回复中是否提到工具
                        tool_keywords = ['工具', '调用', '功能', '转录', '语音识别']
                        mentions_tools = any(keyword in reply for keyword in tool_keywords)
                        print(f"💡 回复中提到工具: {'是' if mentions_tools else '否'}")
                        
                        if has_tool_calls:
                            print("✅ 工具调用成功")
                        elif mentions_tools:
                            print("⚠️ 提到了工具但未调用")
                        else:
                            print("❌ 未检测到工具相关信息")
                
            except Exception as e:
                print(f"❌ 测试失败: {e}")
                import traceback
                traceback.print_exc()
        
        print("\n" + "=" * 60)
        print("🎯 调试完成")
        
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ai_tool_response()
