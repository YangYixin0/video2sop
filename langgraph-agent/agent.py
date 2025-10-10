from typing import TypedDict, List, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage
from qwen_model import QwenChatModel

class AgentState(TypedDict):
    """Agent 状态定义"""
    messages: Annotated[List[BaseMessage], "对话消息列表"]

class QwenAgent:
    """基于 Qwen3-plus 的 LangGraph Agent"""
    
    def __init__(self):
        self.llm = QwenChatModel()
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """构建 LangGraph 状态图"""
        
        def call_qwen(state: AgentState) -> AgentState:
            """调用 Qwen3-plus 模型生成响应"""
            try:
                # 获取当前消息列表
                messages = state["messages"]
                
                # 调用模型生成响应
                response = self.llm.invoke(messages)
                
                # 将 AI 响应添加到消息列表
                messages.append(response)
                
                return {"messages": messages}
            except Exception as e:
                # 错误处理：添加错误消息
                from langchain_core.messages import AIMessage
                error_msg = AIMessage(content=f"抱歉，处理您的请求时出现了错误：{str(e)}")
                messages = state["messages"]
                messages.append(error_msg)
                return {"messages": messages}
        
        # 创建状态图
        workflow = StateGraph(AgentState)
        
        # 添加节点
        workflow.add_node("qwen", call_qwen)
        
        # 设置入口点和结束点
        workflow.set_entry_point("qwen")
        workflow.add_edge("qwen", END)
        
        # 编译图
        return workflow.compile()
    
    def chat(self, user_message: str, chat_history: List[BaseMessage] = None) -> dict:
        """同步聊天方法"""
        if chat_history is None:
            chat_history = []
        
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
        
        # 添加用户消息
        from langchain_core.messages import HumanMessage
        chat_history.append(HumanMessage(content=user_message))
        
        # 流式执行图
        async for chunk in self.graph.astream({"messages": chat_history}):
            if "qwen" in chunk:
                messages = chunk["qwen"]["messages"]
                if messages:
                    last_message = messages[-1]
                    if hasattr(last_message, 'content'):
                        yield last_message.content
    
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
