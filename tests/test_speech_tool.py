#!/usr/bin/env python3
"""
测试语音识别工具功能
"""

import asyncio
import json
from langgraph_agent.speech_tool import speech_recognition

async def test_speech_recognition():
    """测试语音识别工具"""
    
    # 使用示例音频 URL
    test_url = "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world_female2.wav"
    
    print("🎤 开始测试语音识别工具...")
    print(f"📁 测试音频 URL: {test_url}")
    
    try:
        # 调用语音识别工具
        result = speech_recognition.invoke({"file_url": test_url})
        
        print("✅ 语音识别完成!")
        print("📄 转录结果:")
        print("-" * 50)
        
        # 解析并格式化输出
        try:
            sentences = json.loads(result)
            if isinstance(sentences, list):
                for sentence in sentences:
                    if 'sentence_id' in sentence and 'text' in sentence:
                        begin_time = sentence.get('begin_time', 0) / 1000  # 转换为秒
                        end_time = sentence.get('end_time', 0) / 1000
                        print(f"句子 {sentence['sentence_id']}: {sentence['text']}")
                        print(f"时间: {begin_time:.2f}s - {end_time:.2f}s")
                        print()
                print(f"📊 总共转录了 {len(sentences)} 个句子")
            else:
                print("⚠️ 返回结果不是预期的句子列表")
                print(result)
        except json.JSONDecodeError as e:
            print(f"❌ JSON 解析错误: {e}")
            print(f"原始结果: {result}")
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")

def test_tool_description():
    """测试工具描述"""
    print("\n🔧 工具信息:")
    print("-" * 30)
    print(f"工具名称: {speech_recognition.name}")
    print(f"工具描述: {speech_recognition.description}")
    print(f"工具参数: {speech_recognition.args}")

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 语音识别工具测试")
    print("=" * 60)
    
    # 测试工具描述
    test_tool_description()
    
    # 运行异步测试
    asyncio.run(test_speech_recognition())
    
    print("=" * 60)
    print("✨ 测试完成!")
    print("=" * 60)
