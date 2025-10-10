import os
from typing import Any, AsyncIterator, Iterator, List, Optional
from dotenv import load_dotenv
import dashscope
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.callbacks import CallbackManagerForLLMRun, AsyncCallbackManagerForLLMRun

# 加载环境变量
load_dotenv()

class QwenChatModel(BaseChatModel):
    """Qwen3-plus 模型的 LangChain 封装"""
    
    model_name: str = "qwen-plus"
    api_key: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.api_key = self.api_key or os.getenv('DASHSCOPE_API_KEY')
        if not self.api_key:
            raise ValueError("DASHSCOPE_API_KEY environment variable is required")
    
    @property
    def _llm_type(self) -> str:
        return "qwen"
    
    def _convert_message_to_dict(self, message: BaseMessage) -> dict:
        """将 LangChain 消息转换为 dashscope 格式"""
        if isinstance(message, HumanMessage):
            return {"role": "user", "content": message.content}
        elif isinstance(message, AIMessage):
            return {"role": "assistant", "content": message.content}
        elif isinstance(message, SystemMessage):
            return {"role": "system", "content": message.content}
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
            message = AIMessage(content=content)
            generation = ChatGeneration(message=message)
            return ChatResult(generations=[generation])
        else:
            raise Exception(f"API call failed: {response.message}")
    
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
                    message = AIMessage(content=full_content)
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
