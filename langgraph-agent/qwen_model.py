import os
import json
from typing import Any, AsyncIterator, Iterator, List, Optional, Dict
from dotenv import load_dotenv
import dashscope
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.callbacks import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun
from langchain_core.tools import BaseTool

# 加载环境变量
load_dotenv()

class QwenChatModel(BaseChatModel):
    """Qwen3-plus 模型的 LangChain 封装"""
    
    model_name: str = "qwen-plus"
    api_key: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    tools: Optional[List[BaseTool]] = None
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.api_key = self.api_key or os.getenv('DASHSCOPE_API_KEY')
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY environment variable is required")
    
    def bind_tools(self, tools: List[BaseTool], **kwargs) -> "QwenChatModel":
        """绑定工具到模型"""
        new_model = self.copy()
        new_model.tools = tools
        return new_model
    
    @property
    def _llm_type(self) -> str:
        return "qwen"
    
    def _convert_message_to_dict(self, message: BaseMessage) -> dict:
        """将 LangChain 消息转换为 dashscope 格式"""
        if isinstance(message, HumanMessage):
            return {"role": "user", "content": message.content}
        elif isinstance(message, AIMessage):
            content = message.content
            # 如果有工具调用，添加工具调用信息
            if hasattr(message, 'tool_calls') and message.tool_calls:
                content += f"\n\n可用工具: {[tool.name for tool in (self.tools or [])]}"
            return {"role": "assistant", "content": content}
        elif isinstance(message, SystemMessage):
            content = message.content
            # 如果有工具，在系统消息中添加工具描述
            if self.tools:
                tool_descriptions = []
                for tool in self.tools:
                    tool_descriptions.append(f"- {tool.name}: {tool.description}")
                content += f"\n\n可用工具:\n" + "\n".join(tool_descriptions)
            return {"role": "system", "content": content}
        elif isinstance(message, ToolMessage):
            return {"role": "user", "content": f"工具执行结果: {message.content}"}
        else:
            # 默认作为用户消息
            return {"role": "user", "content": str(message.content)}
    
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """同步生成方法"""
        # 转换消息格式
        dashscope_messages = [self._convert_message_to_dict(msg) for msg in messages]
        
        # 调用 dashscope API
        response = dashscope.Generation.call(
            api_key=self.api_key,
            model=self.model_name,
            messages=dashscope_messages,
            result_format='message',
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            **kwargs
        )
        
        # 处理响应
        if response.status_code == 200:
            content = response.output.choices[0].message.content
            
            # 检查是否需要工具调用
            tool_calls = self._extract_tool_calls(content)
            
            message = AIMessage(content=content)
            if tool_calls:
                message.tool_calls = tool_calls
            
            generation = ChatGeneration(message=message)
            return ChatResult(generations=[generation])
        else:
            raise Exception(f"API call failed: {response.message}")
    
    def _extract_tool_calls(self, content: str) -> List[Dict]:
        """从响应内容中提取工具调用"""
        tool_calls = []
        
        if not self.tools:
            return tool_calls
        
        # 改进的工具调用检测逻辑
        # 检查是否包含音频URL和转录相关关键词
        import re
        
        # 提取所有URL
        url_pattern = r'https?://[^\s<>"]+'
        urls = re.findall(url_pattern, content)
        
        # 检查是否包含转录相关关键词
        transcription_keywords = ['转录', '音频', '语音', '识别', '转写', '听写', '语音转文字']
        has_transcription_keyword = any(keyword in content.lower() for keyword in transcription_keywords)
        
        # 如果包含URL和转录关键词，则调用语音识别工具
        if urls and has_transcription_keyword:
            for i, url in enumerate(urls):
                tool_calls.append({
                    'name': 'speech_recognition',
                    'args': {'file_url': url},
                    'id': f'tool_call_{i}_{hash(url) % 10000}'
                })
        
        return tool_calls
    
    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        """异步生成方法"""
        # 对于异步，我们使用同步方法（dashscope 库可能不支持原生异步）
        return self._generate(messages, stop, run_manager, **kwargs)
    
    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Iterator[ChatGeneration]:
        """流式生成方法"""
        # 转换消息格式
        dashscope_messages = [self._convert_message_to_dict(msg) for msg in messages]
        
        # 调用 dashscope API 流式接口
        responses = dashscope.Generation.call(
            api_key=self.api_key,
            model=self.model_name,
            messages=dashscope_messages,
            result_format='message',
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
            **kwargs
        )
        
        # 处理流式响应
        full_content = ""
        for response in responses:
            if response.status_code == 200:
                if hasattr(response.output, 'choices') and response.output.choices:
                    content = response.output.choices[0].message.content
                    full_content += content
                    
                    # 检查是否需要工具调用（在流式结束时）
                    message = AIMessage(content=full_content)
                    
                    # 只在流式结束时检查工具调用
                    if content.endswith('\n') or not content:  # 流式结束标志
                        tool_calls = self._extract_tool_calls(full_content)
                        if tool_calls:
                            message.tool_calls = tool_calls
                    
                    generation = ChatGeneration(message=message)
                    yield generation
            else:
                raise Exception(f"Stream API call failed: {response.message}")
    
    async def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGeneration]:
        """异步流式生成方法"""
        # 对于异步流式，我们使用同步流式方法
        for generation in self._stream(messages, stop, run_manager, **kwargs):
            yield generation
