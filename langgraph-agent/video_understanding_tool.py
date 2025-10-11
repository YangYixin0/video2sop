import json
import os
from typing import Optional
from dotenv import load_dotenv
import dashscope
from dashscope import MultiModalConversation
from http import HTTPStatus

# 加载环境变量
load_dotenv()

# 设置 dashscope API key
dashscope.api_key = os.getenv('DASHSCOPE_API_KEY')


def video_understanding(
    video_url: str, 
    prompt: str, 
    fps: int = 2, 
    audio_transcript: Optional[str] = None
) -> str:
    """
    使用 Qwen3-VL-Plus 模型进行视频理解分析。
    
    Args:
        video_url: 视频文件的公开访问 URL
        prompt: 用户自定义提示词
        fps: 视频抽帧参数，表示每隔1/fps秒抽取一帧，默认值2
        audio_transcript: 语音识别结果（可选）
        
    Returns:
        JSON 字符串，包含视频理解的分析结果（Markdown格式）
    """
    try:
        # 组合提示词
        if audio_transcript:
            combined_prompt = f"""以下是视频的语音内容：

{audio_transcript}

---

{prompt}"""
        else:
            combined_prompt = prompt
        
        # 构建消息
        messages = [
            {
                'role': 'user',
                'content': [
                    {'video': video_url, "fps": fps},
                    {'text': combined_prompt}
                ]
            }
        ]
        
        # 调用 Qwen3-VL-Plus API
        response = MultiModalConversation.call(
            api_key=dashscope.api_key,
            model='qwen3-vl-plus',
            messages=messages
        )
        
        # 检查响应状态
        if response.status_code != HTTPStatus.OK:
            return json.dumps({
                "error": f"视频理解API调用失败，状态码: {response.status_code}",
                "details": response.message if hasattr(response, 'message') else "未知错误"
            })
        
        # 提取结果
        try:
            result_text = response.output.choices[0].message.content[0]["text"]
        except (KeyError, IndexError, TypeError) as e:
            return json.dumps({
                "error": f"解析API响应失败: {str(e)}",
                "raw_response": str(response)
            })
        
        # 返回成功结果
        return json.dumps({
            "success": True,
            "result": result_text,
            "video_url": video_url,
            "fps": fps,
            "has_audio_context": bool(audio_transcript)
        })
        
    except Exception as e:
        error_msg = f"视频理解处理异常: {str(e)}"
        print(f"视频理解错误: {error_msg}")
        return json.dumps({
            "error": error_msg,
            "video_url": video_url,
            "fps": fps,
            "has_audio_context": bool(audio_transcript)
        })


def test_video_understanding():
    """测试视频理解功能"""
    # 测试用的视频URL（需要替换为实际可访问的URL）
    test_video_url = "https://example.com/test.mp4"
    test_prompt = "这是一个实验室仪器的操作教学视频和它的语音内容，请按照这些内容描述视频内演示者的操作。尽量详细。分成两个层级，相邻的多个有共同目的的步骤由它们的共同目所统领，带有一个时间范围。最终输出为Markdown格式"
    test_audio = "这是测试语音内容"
    
    print("测试视频理解功能...")
    result = video_understanding(
        video_url=test_video_url,
        prompt=test_prompt,
        fps=2,
        audio_transcript=test_audio
    )
    
    result_data = json.loads(result)
    if "error" in result_data:
        print(f"测试失败: {result_data['error']}")
    else:
        print(f"测试成功: {result_data['result'][:100]}...")
    
    return result


if __name__ == "__main__":
    test_video_understanding()
