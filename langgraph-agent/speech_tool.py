import json
import os
import requests
from typing import List, Dict, Any
from langchain_core.tools import tool
from http import HTTPStatus
import dashscope
from dashscope.audio.asr import Transcription
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 设置 dashscope API key
dashscope.api_key = os.getenv('DASHSCOPE_API_KEY')


@tool
def speech_recognition(file_url: str) -> str:
    """
    使用 Paraformer-V2 模型转录音频文件。
    
    Args:
        file_url: 音频文件的公开访问 URL
        
    Returns:
        JSON 字符串，包含转录音频的句子列表，每个句子包含 sentence_id, text, begin_time, end_time
    """
    try:
        # 调用 Paraformer-V2 API 进行异步转录
        task_response = Transcription.async_call(
            model='paraformer-v2',
            file_urls=[file_url],
            language_hints=['zh', 'en']  # 支持中英文
        )
        
        # 等待转录任务完成
        transcribe_response = Transcription.wait(task=task_response.output.task_id)
        
        if transcribe_response.status_code != HTTPStatus.OK:
            return json.dumps({
                "error": f"转录任务失败，状态码: {transcribe_response.status_code}"
            })
        
        # 处理转录结果
        sentences = []
        
        for result in transcribe_response.output.results:
            if result.get("subtask_status") == "SUCCEEDED":
                try:
                    # 从 transcription_url 下载 JSON 文件
                    response = requests.get(result.get("transcription_url"))
                    response.raise_for_status()
                    transcription_data = response.json()
                    
                    # 提取 sentences 字段
                    for transcript in transcription_data.get("transcripts", []):
                        for sentence in transcript.get("sentences", []):
                            sentences.append({
                                "sentence_id": sentence.get('sentence_id', 0),
                                "text": sentence.get('text', ''),
                                "begin_time": sentence.get('begin_time', 0),
                                "end_time": sentence.get('end_time', 0)
                            })
                            
                except requests.RequestException as e:
                    return json.dumps({
                        "error": f"下载转录结果失败: {str(e)}"
                    })
                except json.JSONDecodeError as e:
                    return json.dumps({
                        "error": f"解析转录结果失败: {str(e)}"
                    })
            else:
                return json.dumps({
                    "error": f"音频文件转录失败: {result.get('file_url', 'N/A')}"
                })
        
        # 返回仅包含 sentences 的 JSON
        return json.dumps(sentences)
        
    except Exception as e:
        return json.dumps({
            "error": f"语音识别处理异常: {str(e)}"
        })
