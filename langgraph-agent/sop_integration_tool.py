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


def integrate_sop_segments(segment_results: List[Dict], audio_transcript: str) -> str:
    """
    将多个片段理解结果与语音全文整合为完整SOP草稿(标题/摘要/关键词/材料/步骤/问题)。

    Returns: 原样返回文本(纯文本，不含Markdown语法)。如失败，返回JSON字符串包含 error。
    """
    try:
        system_prompt = (
            "你是一个SOP整合专家。请将多个视频片段的理解结果与完整语音识别结果进行整合，"
            "生成一份完整的SOP草稿。输出必须为纯文本，不要包含任何Markdown语法。"
        )

        segments_text = []
        for seg in segment_results:
            seg_id = seg.get("segment_id")
            time_range = seg.get("time_range")
            result_text = seg.get("result", "")
            segments_text.append(f"[片段 {seg_id} | {time_range}]\n{result_text}")
        segments_joined = "\n\n".join(segments_text)

        user_prompt = f"""
以下是多个视频片段的理解结果，请基于这些结果与完整的语音识别文本，整合生成完整的SOP草稿。

【片段理解结果】
{segments_joined}

【完整语音识别文本】
{audio_transcript}

请生成包含以下内容的完整SOP草稿：
1. 标题
2. 摘要
3. 关键词
4. 材料试剂工具设备清单
5. 操作步骤（以目的-操作两级结构，按时间顺序整合）
6. 需要澄清的问题

严格要求：输出为纯文本，不使用任何Markdown语法，不添加其他解释性内容。
"""

        response = dashscope.Generation.call(
            api_key=os.getenv('DASHSCOPE_API_KEY'),
            model="qwen-plus",
            messages=[
                {"role": "system", "content": system_prompt},
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



