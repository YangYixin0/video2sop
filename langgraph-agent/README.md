# LangGraph Agent Chat Backend

基于 LangGraph 和 Qwen3-plus 的聊天 Agent 后端服务。

## 功能特性

- 使用 LangGraph 构建的智能 Agent
- 集成 Qwen3-plus 大语言模型
- WebSocket 实时流式对话
- 支持 LangSmith 调试追踪
- 单会话对话模式

## 安装依赖

```bash
pip install -r requirements.txt
```

## 环境变量配置

在项目根目录创建 `.env` 文件：

```env
DASHSCOPE_API_KEY=your_dashscope_api_key_here
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-agent-chat
```

## 启动服务

```bash
uvicorn main:app --host 0.0.0.0 --port 8123 --reload
```

服务将在 `http://localhost:8123` 启动。

## API 端点

- `GET /` - 根路径信息
- `GET /health` - 健康检查
- `WebSocket /ws` - 聊天 WebSocket 连接

## WebSocket 消息格式

### 发送消息格式
```json
{
  "type": "message",
  "content": "用户消息内容"
}
```

### 接收消息格式
```json
// 状态更新
{
  "type": "status",
  "status": "processing"
}

// 流式响应块
{
  "type": "chunk",
  "content": "响应片段"
}

// 完成响应
{
  "type": "complete",
  "content": "完整响应"
}

// 错误信息
{
  "type": "error",
  "content": "错误描述"
}

// 心跳响应
{
  "type": "pong"
}
```
