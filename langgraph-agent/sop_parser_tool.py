import os
import json
import re
from typing import List, Dict, Any
from langchain_core.tools import tool
from dotenv import load_dotenv
import dashscope

# 加载环境变量
load_dotenv()

@tool
def sop_parser(manuscript: str) -> str:
    """
    将SOP草稿文本解析为结构化的区块数组。
    
    Args:
        manuscript: 原始SOP草稿文本内容
        
    Returns:
        JSON字符串，包含区块数组，每个区块包含：
        - id: 唯一标识符
        - type: 区块类型('title', 'abstract', 'keywords', 'materials', 'step', 'unknown')
        - content: 文本内容
        - start_time: 开始时间(秒，可选)
        - end_time: 结束时间(秒，可选)  
        - show_play_button: 是否显示播放按钮
    """
    try:
        # 构建提示词
        system_prompt = """你是一个专业的SOP文档解析专家。请将给定的SOP草稿文本解析为结构化的区块数组。

重要：操作步骤分组规则
- 将相关的子步骤组合成一个区块，而不是拆分
- 例如："第一步：准备材料" 及其子步骤 1.1、1.2、1.3 应该组合成一个区块
- 例如："第二步：设备检查" 及其子步骤 2.1、2.2、2.3 应该组合成一个区块
- 每个主要步骤（第一步、第二步等）作为一个独立的区块

区块类型说明：
- title: 文档标题
- abstract: 摘要部分
- keywords: 关键词部分
- materials: 材料试剂工具设备清单
- step: 操作步骤（包含完整步骤及其所有子步骤）
- question: 问题澄清请求
- unknown: 其他类型内容

时间戳提取规则：
- 查找形如"(0:05 - 0:08)"、"时间范围：0:03 - 0:21"等时间范围标记
- 一般只有操作步骤有时间戳，其他区块没有时间戳
- 时间戳可能在所属的区块开头或末尾，由上一点可以确定某个时间戳属于前面区块还是后面区块
- 将时间转换为秒数（如"1:25"转换为85秒）
- 对于包含多个子步骤的区块，使用整个步骤的时间范围
- 如果区块包含时间戳，show_play_button设为true

内容组合规则：
- 将主要步骤标题和所有子步骤内容组合在一个区块的content中
- 保持原有的层级结构和编号
- 确保内容完整，不遗漏任何子步骤
- 不要使用方括号[]包围内容，直接输出文本内容

请严格按照以下JSON格式返回结果：
{
  "blocks": [
    {
      "id": "unique_id_1",
      "type": "title",
      "content": "区块文本内容",
      "start_time": 5,
      "end_time": 8,
      "show_play_button": true
    }
  ]
}"""

        user_prompt = f"""请解析以下SOP草稿文本：

{manuscript}

重要要求：
1. 操作步骤分组：将每个主要步骤（如"第一步"、"第二步"）及其所有子步骤（如1.1、1.2、1.3）组合成一个区块
2. 不要将子步骤拆分成独立区块
3. 保持原文的逻辑结构和层级关系
4. 准确提取时间戳并转换为秒数
5. 合理分类区块类型
6. 为每个区块生成唯一ID
7. 不要使用方括号[]包围任何内容，直接输出纯文本
8. 只返回JSON格式，不要添加其他文字说明

示例：
如果原文有：
"第一步：准备材料
1.1 检查设备状态
1.2 准备所需试剂
1.3 确认工具齐全"

应该解析为一个区块，content包含完整内容。"""

        # 调用qwen-plus，开启reasoning功能
        response = dashscope.Generation.call(
            api_key=os.getenv('DASHSCOPE_API_KEY'),
            model="qwen-plus",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            result_format='message',
            temperature=0.1,
            enable_thinking=True  # 开启思考过程，但不参与后续处理
        )
        
        if response.status_code == 200:
            result = response.output.choices[0].message.content
            
            # 尝试解析JSON结果
            try:
                # 提取JSON部分（可能包含在```json```代码块中）
                json_match = re.search(r'```json\s*(.*?)\s*```', result, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    # 尝试直接解析
                    json_str = result
                
                parsed_result = json.loads(json_str)
                
                # 验证结果格式
                if 'blocks' in parsed_result and isinstance(parsed_result['blocks'], list):
                    # 确保每个区块都有必需的字段
                    for i, block in enumerate(parsed_result['blocks']):
                        if 'id' not in block:
                            block['id'] = f"block_{i+1}"
                        if 'type' not in block:
                            block['type'] = 'unknown'
                        if 'content' not in block:
                            block['content'] = ''
                        if 'show_play_button' not in block:
                            block['show_play_button'] = bool(block.get('start_time') and block.get('end_time'))
                    
                    return json.dumps(parsed_result, ensure_ascii=False)
                else:
                    raise ValueError("解析结果格式不正确")
                    
            except json.JSONDecodeError as e:
                # 如果JSON解析失败，返回默认结构
                return json.dumps({
                    "blocks": [{
                        "id": "block_1",
                        "type": "unknown", 
                        "content": manuscript,
                        "start_time": None,
                        "end_time": None,
                        "show_play_button": False
                    }]
                }, ensure_ascii=False)
        else:
            raise Exception(f"API调用失败: {response.message}")
            
    except Exception as e:
        # 发生错误时返回基本的区块结构
        return json.dumps({
            "error": str(e),
            "blocks": [{
                "id": "block_1",
                "type": "unknown",
                "content": manuscript,
                "start_time": None, 
                "end_time": None,
                "show_play_button": False
            }]
        }, ensure_ascii=False)
