from typing import TypedDict, List, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, ToolMessage, AIMessage, HumanMessage, SystemMessage
from qwen_model import QwenChatModel
from speech_tool import speech_recognition

class AgentState(TypedDict):
    """Agent 状态定义"""
    messages: Annotated[List[BaseMessage], "对话消息列表"]

class QwenAgent:
    """基于 Qwen3-plus 的 LangGraph Agent"""
    
    def __init__(self):
        self.llm = QwenChatModel()
        # 注意：speech_recognition 已不再是 tool，agent 功能已不再使用
        # self.llm_with_tools = self.llm.bind_tools([speech_recognition])
        self.llm_with_tools = self.llm  # 不再绑定工具
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """构建 LangGraph 状态图"""
        
        def call_qwen(state: AgentState) -> AgentState:
            """调用 Qwen3-plus 模型生成响应"""
            try:
                # 获取当前消息列表
                messages = state["messages"]
                
                # 检查最后一条消息是否需要工具调用
                last_message = messages[-1] if messages else None
                tool_calls = []
                
                if last_message and isinstance(last_message, HumanMessage):
                    # 检查用户消息中是否包含音频URL和转录关键词
                    import re
                    content = last_message.content
                    
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
                
                if tool_calls:
                    # 如果需要工具调用，创建包含工具调用的AI消息
                    response = AIMessage(content="我来帮您转录这个音频文件。", tool_calls=tool_calls)
                else:
                    # 否则正常调用模型
                    response = self.llm_with_tools.invoke(messages)
                
                # 将 AI 响应添加到消息列表
                messages.append(response)
                
                return {"messages": messages}
            except Exception as e:
                # 错误处理：添加错误消息
                error_msg = AIMessage(content=f"抱歉，处理您的请求时出现了错误：{str(e)}")
                messages = state["messages"]
                messages.append(error_msg)
                return {"messages": messages}
        
        def call_tools(state: AgentState) -> AgentState:
            """执行工具调用"""
            messages = state["messages"]
            last_message = messages[-1]
            
            # 检查是否有工具调用
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                for tool_call in last_message.tool_calls:
                    # 执行语音识别工具（注意：speech_recognition 已不再是 tool）
                    if tool_call['name'] == 'speech_recognition':
                        file_url = tool_call['args']['file_url']
                        # 直接调用函数，不再使用 .invoke() 方法
                        result = speech_recognition(file_url)
                        
                        # 添加工具结果消息
                        tool_message = ToolMessage(
                            content=result,
                            tool_call_id=tool_call['id']
                        )
                        messages.append(tool_message)
                
                # 调用 LLM 处理工具结果
                final_response = self.llm.invoke(messages)
                messages.append(final_response)
            
            return {"messages": messages}
        
        def should_continue(state: AgentState) -> str:
            """判断是否继续执行工具调用"""
            messages = state["messages"]
            last_message = messages[-1]
            
            # 如果有工具调用，继续执行工具
            if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                return "tools"
            # 否则结束
            return END
        
        # 创建状态图
        workflow = StateGraph(AgentState)
        
        # 添加节点
        workflow.add_node("qwen", call_qwen)
        workflow.add_node("tools", call_tools)
        
        # 设置入口点
        workflow.set_entry_point("qwen")
        
        # 添加条件边
        workflow.add_conditional_edges(
            "qwen",
            should_continue,
            {
                "tools": "tools",
                END: END
            }
        )
        
        # 工具执行后结束
        workflow.add_edge("tools", END)
        
        # 编译图
        return workflow.compile()
    
    def chat(self, user_message: str, chat_history: List[BaseMessage] = None) -> dict:
        """同步聊天方法"""
        if chat_history is None:
            chat_history = []
        
        # 确保有系统消息（只在第一次对话时添加）
        if not chat_history or not any(isinstance(msg, SystemMessage) for msg in chat_history):
            system_message = SystemMessage(content="你是一个智能助手，能够调用工具来帮助用户。当用户询问你的能力时，请明确说明你可以调用语音识别工具来转录音频文件。")
            chat_history = [system_message] + chat_history
        
        # 添加用户消息
        from langchain_core.messages import HumanMessage
        chat_history.append(HumanMessage(content=user_message))
        
        # 执行图
        result = self.graph.invoke({"messages": chat_history})
        
        return result
    
    async def astream_chat(self, user_message: str, chat_history: List[BaseMessage] = None):
        """异步流式聊天方法"""
        if chat_history is None:
            chat_history = []
        
        # 确保有系统消息（只在第一次对话时添加）
        if not chat_history or not any(isinstance(msg, SystemMessage) for msg in chat_history):
            system_message = SystemMessage(content="你是一个智能助手，能够调用工具来帮助用户。当用户询问你的能力时，请明确说明你可以调用语音识别工具来转录音频文件。")
            chat_history = [system_message] + chat_history
        
        # 添加用户消息
        from langchain_core.messages import HumanMessage
        chat_history.append(HumanMessage(content=user_message))
        
        # 流式执行图
        async for chunk in self.graph.astream({"messages": chat_history}):
            # 处理 qwen 节点的响应
            if "qwen" in chunk:
                messages = chunk["qwen"]["messages"]
                if messages:
                    last_message = messages[-1]
                    yield last_message
            
            # 处理 tools 节点的响应
            if "tools" in chunk:
                messages = chunk["tools"]["messages"]
                if messages:
                    last_message = messages[-1]
                    if hasattr(last_message, 'content') and last_message.content:
                        yield last_message
    
    def stream_chat(self, user_message: str, chat_history: List[BaseMessage] = None):
        """同步流式聊天方法"""
        if chat_history is None:
            chat_history = []
        
        # 添加用户消息
        from langchain_core.messages import HumanMessage
        chat_history.append(HumanMessage(content=user_message))
        
        # 流式执行图
        for chunk in self.graph.stream({"messages": chat_history}):
            if "qwen" in chunk:
                messages = chunk["qwen"]["messages"]
                if messages:
                    last_message = messages[-1]
                    if hasattr(last_message, 'content'):
                        yield last_message.content
