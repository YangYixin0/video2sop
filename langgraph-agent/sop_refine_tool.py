import os
import json
from typing import List, Dict, Any
from langchain_core.tools import tool
from dotenv import load_dotenv
import dashscope

# 加载环境变量
load_dotenv()

@tool
def sop_refine(blocks_json: str, user_notes: str) -> str:
    """
    根据用户批注精修SOP区块数组。
    
    Args:
        blocks_json: 区块数组的JSON字符串
        user_notes: 用户的批注和修改建议
        
    Returns:
        JSON字符串，包含精修后的区块数组，保持相同的结构：
        - id: 唯一标识符
        - type: 区块类型
        - content: 精修后的文本内容
        - start_time: 开始时间(秒，可选)
        - end_time: 结束时间(秒，可选)  
        - show_play_button: 是否显示播放按钮
    """
    try:
        # 解析输入的区块数组
        blocks_data = json.loads(blocks_json)
        blocks = blocks_data.get('blocks', [])
        
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

        # 调用qwen-plus，开启reasoning功能
        response = dashscope.Generation.call(
            api_key=os.getenv('DASHSCOPE_API_KEY'),
            model="qwen-plus",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            result_format='message',
            temperature=0.3,
            enable_thinking=True  # 开启思考过程，但不参与后续处理
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
                    
                    return json.dumps(parsed_result, ensure_ascii=False)
                else:
                    raise ValueError("精修结果格式不正确")
                    
            except json.JSONDecodeError as e:
                # 如果JSON解析失败，返回原始区块（表示精修失败）
                return json.dumps({
                    "error": f"JSON解析失败: {str(e)}",
                    "blocks": blocks
                }, ensure_ascii=False)
        else:
            raise Exception(f"API调用失败: {response.message}")
            
    except Exception as e:
        # 发生错误时返回原始区块
        try:
            blocks_data = json.loads(blocks_json)
            return json.dumps({
                "error": str(e),
                "blocks": blocks_data.get('blocks', [])
            }, ensure_ascii=False)
        except:
            return json.dumps({
                "error": str(e),
                "blocks": []
            }, ensure_ascii=False)



