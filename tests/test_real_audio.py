#!/usr/bin/env python3
"""
测试真实音频 URL 的转录功能
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'langgraph-agent'))

def test_audio_urls():
    """测试不同的音频 URL"""
    print("🎤 测试音频转录功能")
    print("=" * 50)
    
    # 测试 URL 列表
    test_urls = [
        # 有效的测试 URL
        "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav",
        # 用户提供的 URL（去掉省略号）
        "https://video2sop-yixin.oss-cn-beijing.aliyuncs.com/audio.mp3",
        # 无效 URL
        "https://video2sop-yixin.oss-cn-beijing.aliyuncs.com/.../audio.mp3"
    ]
    
    try:
        from agent import QwenAgent
        agent = QwenAgent()
        print("✅ Agent 初始化成功")
        
        for i, url in enumerate(test_urls, 1):
            print(f"\n📝 测试 {i}: {url}")
            print("-" * 40)
            
            # 测试语音识别工具直接调用
            try:
                from speech_tool import speech_recognition
                result = speech_recognition.invoke({'file_url': url})
                print(f"工具直接调用结果: {result[:200]}...")
            except Exception as e:
                print(f"工具直接调用错误: {e}")
            
            # 测试通过 Agent 调用
            try:
                message = f"请转录这个音频文件：{url}"
                result = agent.chat(message)
                
                if 'messages' in result:
                    messages = result['messages']
                    last_message = messages[-1]
                    if hasattr(last_message, 'content'):
                        print(f"Agent 回复: {last_message.content[:200]}...")
                
            except Exception as e:
                print(f"Agent 调用错误: {e}")
        
    except Exception as e:
        print(f"❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_audio_urls()
