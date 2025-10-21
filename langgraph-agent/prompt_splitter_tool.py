"""
提示词拆分工具：使用 Qwen-Plus 智能拆分用户提示词为片段理解提示词和整合提示词。
"""

import os
import json
from typing import Dict
import dashscope
from dotenv import load_dotenv

load_dotenv()
dashscope.api_key = os.getenv('DASHSCOPE_API_KEY')


def split_prompt_for_long_video(user_prompt: str) -> Dict[str, str]:
    """
    使用Qwen-Plus智能拆分用户提示词，用于长视频处理流程。
    
    Args:
        user_prompt: 用户的原始提示词
        
    Returns:
        {
            "segment_prompt": "给片段理解模型的提示词",
            "integration_prompt": "给整合模型的提示词"
        }
    """
    try:
        system_prompt = """你是一个提示词分析专家。你的任务是将用户提供的视频理解提示词拆分为两部分：

1. **片段理解提示词** - 用于理解单个视频片段，应包括：
   - 视频内容的特殊性说明（如"这是实验室操作视频"、"演示者讲的话是重点"等）
   - 内容理解的注意事项（如"注意细节"、"结合语音识别理解"等）
   - 片段级别的输出要求（如"提供材料清单"、"列出操作步骤"、"提出待澄清的问题"等）
   - 通用格式要求（如"时间戳格式"、"纯文本输出"、"不使用Markdown"等）

2. **整合提示词** - 用于整合所有片段结果，应包括：
   - 整合级别的输出要求（如"生成标题"、"写摘要"、"提取关键词"等）
   - 最终文档的结构要求（如"包含标题、摘要、关键词、材料、步骤、问题"等）
   - 通用格式要求（如"时间戳格式"、"纯文本输出"、"不使用Markdown"等）

**重要原则**：
- 某些格式要求（如时间戳格式、输出格式）需要同时出现在两个提示词中
- 某些输出要求只属于整合阶段（如标题、摘要、关键词通常在整合时生成）
- 某些输出要求可能同时需要（如材料清单、操作步骤可能片段需要提取，整合时需要汇总）
- 用户的整合要求可能包括标题、摘要、关键词、材料清单、操作步骤、待澄清问题等任意组合
- 要完全尊重用户的原始要求，不要遗漏任何内容

请严格按照以下JSON格式返回结果：
{
  "segment_prompt": "片段理解模型需要的完整提示词",
  "integration_prompt": "整合模型需要的完整提示词"
}

只返回JSON，不要添加其他文字说明。"""

        user_analysis_prompt = f"""请分析以下用户提示词，将其拆分为"片段理解提示词"和"整合提示词"：

{user_prompt}

要求：
1. 识别哪些内容是关于视频内容理解的指导
2. 识别哪些是片段级别的输出要求
3. 识别哪些是整合级别的输出要求
4. 识别哪些格式要求需要同时传递给两个模型
5. 确保拆分后的提示词完整、清晰、可直接使用
6. 只返回JSON格式，不要添加其他内容"""

        response = dashscope.Generation.call(
            api_key=os.getenv('DASHSCOPE_API_KEY'),
            model="qwen-plus",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_analysis_prompt}
            ],
            result_format='message',
            temperature=0.1,
            enable_thinking=True  # 开启推理功能
        )

        if response.status_code == 200:
            content = response.output.choices[0].message.content
            
            # 清理可能的markdown代码块标记
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            # 解析JSON
            result = json.loads(content)
            
            # 验证结果
            if "segment_prompt" not in result or "integration_prompt" not in result:
                print(f"警告: 提示词拆分结果缺少必要字段，使用原始提示词")
                return {
                    "segment_prompt": user_prompt,
                    "integration_prompt": user_prompt
                }
            
            print(f"提示词拆分成功:")
            print(f"片段提示词长度: {len(result['segment_prompt'])} 字符")
            print(f"整合提示词长度: {len(result['integration_prompt'])} 字符")
            
            return result
        else:
            print(f"提示词拆分API调用失败: status={response.status_code}")
            # 降级处理：返回原始提示词
            return {
                "segment_prompt": user_prompt,
                "integration_prompt": user_prompt
            }
            
    except Exception as e:
        print(f"提示词拆分异常: {str(e)}")
        # 降级处理：返回原始提示词
        return {
            "segment_prompt": user_prompt,
            "integration_prompt": user_prompt
        }


def test_split_prompt():
    """测试提示词拆分功能"""
    test_prompt = """1. 提供给你的是一个实验室仪器或实验处理的操作教学视频和它的语音识别结果，请按照这些内容理解视频内演示者的操作，写一个标准操作流程（SOP）草稿。这个草稿包含标题、摘要、关键词、材料试剂工具设备清单、操作步骤和也许其他内容。其他内容请你合理地整理成段落。

2. 这份草稿的操作步骤越具体越好。步骤包含"目的"和"操作"两个层级，相邻的多个操作由它们的共同目的所统领。每个目的的开头带有一个时间起终范围（精确到秒），操作不要带时间起终范围。

3. 演示者讲的话一定是操作重点，不过细节可能偶尔讲错。同时，语音识别结果也可能有错误，一般是被错误识别为读音相近的字。请你结合上下文来理解。

4. 最终以纯文本格式输出，不要使用任何Markdown语法标记。

5. 生成一些问题请用户澄清一些重要细节。"""

    result = split_prompt_for_long_video(test_prompt)
    print("\n=== 测试结果 ===")
    print("\n片段理解提示词:")
    print(result["segment_prompt"])
    print("\n整合提示词:")
    print(result["integration_prompt"])


if __name__ == "__main__":
    test_split_prompt()

