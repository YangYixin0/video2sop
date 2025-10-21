"""
SOP 片段结果整合工具：使用 qwen-plus(可启用 thinking) 将多片段理解结果与语音全文整合为完整SOP草稿。
"""

import os
import json
from typing import List, Dict

import dashscope
from dotenv import load_dotenv

load_dotenv()
dashscope.api_key = os.getenv('DASHSCOPE_API_KEY')


def integrate_sop_segments(
    segment_results: List[Dict], 
    audio_transcript: str,
    user_integration_prompt: str = ""
) -> str:
    """
    将多个片段理解结果与语音全文整合为完整SOP草稿。
    
    Args:
        segment_results: 片段理解结果列表
        audio_transcript: 完整语音识别文本
        user_integration_prompt: 用户的整合提示词（由提示词拆分工具生成）

    Returns: 原样返回文本(纯文本，不含Markdown语法)。如失败，返回JSON字符串包含 error。
    """
    try:
        segments_text = []
        for seg in segment_results:
            seg_id = seg.get("segment_id")
            time_range = seg.get("time_range")
            result_text = seg.get("result", "")
            segments_text.append(f"[片段 {seg_id} | {time_range}]\n{result_text}")
        segments_joined = "\n\n".join(segments_text)

        user_prompt = f"""
以下是多个视频片段的理解结果和完整的语音识别文本。

【片段理解结果】
{segments_joined}

【完整语音识别文本】
{audio_transcript}

{user_integration_prompt}
"""

        response = dashscope.Generation.call(
            api_key=os.getenv('DASHSCOPE_API_KEY'),
            model="qwen-plus",
            messages=[
                {"role": "user", "content": user_prompt}
            ],
            result_format='message',
            temperature=0.3,
            enable_thinking=True
        )

        if response.status_code == 200:
            content = response.output.choices[0].message.content
            return content
        else:
            return json.dumps({
                "error": f"整合API失败: status={response.status_code}",
                "message": getattr(response, 'message', '')
            })
    except Exception as e:
        return json.dumps({"error": str(e)})



