import json
import os
import re
import requests
from typing import List, Dict, Any, Optional
from http import HTTPStatus
import dashscope
from dashscope.audio.asr import Transcription, VocabularyService
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 设置 dashscope API key
dashscope.api_key = os.getenv('DASHSCOPE_API_KEY')


def detect_language(word: str) -> str:
    """
    根据字符自动识别语言（中文或英文）
    
    Args:
        word: 要识别的词
        
    Returns:
        'zh' 如果包含中文字符，否则返回 'en'
    """
    if re.search(r'[\u4e00-\u9fa5]', word):
        return 'zh'
    return 'en'


def speech_recognition(file_url: str, vocabulary: Optional[List[str]] = None) -> str:
    """
    使用 Paraformer-V2 模型转录音频文件。
    
    Args:
        file_url: 音频文件的公开访问 URL
        vocabulary: 易错词列表（可选），每行一个词
        
    Returns:
        JSON 字符串，包含转录音频的句子列表，每个句子包含 sentence_id, text, begin_time, end_time
    """
    vocabulary_id = None
    service = VocabularyService()
    
    try:
        # 创建易错词表（如果提供了易错词）
        if vocabulary and len(vocabulary) > 0:
            # 过滤空词，构建易错词表数据
            vocabulary_data = []
            for word in vocabulary:
                word = word.strip()
                if word:  # 只处理非空词
                    vocabulary_data.append({
                        "text": word,
                        "weight": 3,  # 默认权重为3
                        "lang": detect_language(word)  # 自动识别语言
                    })
            
            if vocabulary_data:
                try:
                    vocabulary_id = service.create_vocabulary(
                        prefix="video2sop",  # 自定义前缀
                        target_model="paraformer-v2",  # 目标模型
                        vocabulary=vocabulary_data
                    )
                    print(f"易错词表创建成功，ID: {vocabulary_id}")
                except Exception as e:
                    print(f"创建易错词表失败: {e}，继续使用无易错词表的识别")
                    vocabulary_id = None
        
        # 调用 Paraformer-V2 API 进行异步转录
        # 构建调用参数
        call_kwargs = {
            'model': 'paraformer-v2',
            'file_urls': [file_url]
        }
        # 使用 vocabulary_id 作为直接参数（测试发现比 phrase_id 更可靠）
        if vocabulary_id:
            call_kwargs['vocabulary_id'] = vocabulary_id
        
        task_response = Transcription.async_call(**call_kwargs)
        
        # 检查响应是否有效
        if not task_response:
            return json.dumps({
                "error": "转录任务提交失败：响应为空"
            })
        
        if task_response.status_code != HTTPStatus.OK:
            return json.dumps({
                "error": f"转录任务提交失败，状态码: {task_response.status_code}, 消息: {getattr(task_response, 'message', '未知错误')}"
            })
        
        if not task_response.output or not hasattr(task_response.output, 'task_id'):
            return json.dumps({
                "error": f"转录任务提交失败：响应中缺少 task_id，响应: {task_response}"
            })
        
        task_id = task_response.output.task_id
        if not task_id:
            return json.dumps({
                "error": "转录任务提交失败：task_id 为空"
            })
        
        # 等待转录任务完成
        transcribe_response = Transcription.wait(task=task_id)
        
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
        result = json.dumps(sentences)
        
        # 在转录完成后删除易错词表（确保转录任务已经完成，不再需要易错词表）
        if vocabulary_id:
            try:
                service.delete_vocabulary(vocabulary_id)
                print(f"易错词表已删除: {vocabulary_id}")
            except Exception as e:
                print(f"删除易错词表失败: {e}，但不影响识别结果")
        
        return result
        
    except Exception as e:
        # 如果发生错误，也要尝试删除易错词表
        if vocabulary_id:
            try:
                service.delete_vocabulary(vocabulary_id)
                print(f"发生错误后删除易错词表: {vocabulary_id}")
            except Exception as del_e:
                print(f"删除易错词表失败: {del_e}")
        
        return json.dumps({
            "error": f"语音识别处理异常: {str(e)}"
        })
