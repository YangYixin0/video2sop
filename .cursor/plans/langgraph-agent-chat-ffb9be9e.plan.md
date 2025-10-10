<!-- ffb9be9e-9ce8-46ee-aebc-6b9c08ca074c 27c3cb0b-19d0-4d0d-aa46-ed2ceaf937ea -->
# LangGraph Agent 聊天系统实施计划

## 1. 后端服务（FastAPI + LangGraph）

### 1.1 创建项目结构

- 在 `/root/app` 下创建 `langgraph-agent` 目录
- 创建 `requirements.txt` 包含依赖：
  - `fastapi`
  - `uvicorn[standard]`
  - `websockets`
  - `langgraph`
  - `langchain-core`
  - `dashscope`
  - `python-dotenv`

### 1.2 实现 Qwen3-plus LangChain 集成

创建 `langgraph-agent/qwen_model.py`：

- 实现自定义 `BaseChatModel` 类封装 dashscope API
- 使用 `dashscope.Generation.call()` 方法（参考 `model_example/qwen3-max.py`）
- 模型设置为 `qwen-plus`
- 支持流式输出（`stream=True`）

### 1.3 构建 LangGraph Agent

创建 `langgraph-agent/agent.py`：

- 定义简单的 Agent 状态（包含 messages 列表）
- 创建单节点 graph：调用 Qwen3-plus 模型
- 配置 StateGraph，设置入口点和结束点
- 编译 graph 供 API 调用

### 1.4 实现 FastAPI WebSocket 服务

创建 `langgraph-agent/main.py`：

- 初始化 FastAPI 应用
- 配置 CORS 允许前端访问
- 实现 WebSocket endpoint `/ws`：
  - 接收用户消息（JSON 格式）
  - 调用 LangGraph agent 处理
  - 流式返回 AI 响应
  - 维护单会话对话历史（内存中）
- 添加健康检查 endpoint `/health`

### 1.5 环境变量配置

在 `/root/app/.env` 添加：

```
DASHSCOPE_API_KEY=your_api_key_here
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-agent-chat
```

### 1.6 集成 LangSmith 追踪

在 `langgraph-agent/main.py` 中：

- 导入 `langsmith` 相关模块
- 从环境变量加载 LangSmith 配置
- LangGraph agent 调用会自动被 LangSmith 追踪
- 在 WebSocket 响应中可选返回 trace URL

## 2. 前端应用（Next.js）

### 2.1 创建 Next.js 项目

- 在 `/root/app` 下创建 `chat-frontend` 目录
- 使用 TypeScript + Tailwind CSS
- 配置端口 50001

### 2.2 实现聊天界面组件

创建 `chat-frontend/src/components/ChatSidebar.tsx`：

- 右侧侧边栏布局（宽度 400-500px）
- 消息列表区域（上方）
- 输入框和发送按钮（底部）
- 显示用户和 AI 消息（不同样式）
- 支持 Markdown 渲染（可选）

### 2.3 实现 WebSocket 客户端

创建 `chat-frontend/src/hooks/useWebSocket.ts`：

- 连接到 `ws://localhost:8123/ws`
- 发送消息功能
- 接收流式响应并更新 UI
- 错误处理和重连逻辑

### 2.4 主页面集成

修改 `chat-frontend/src/app/page.tsx`：

- 左侧主内容区域（占位或简单介绍）
- 右侧集成 ChatSidebar 组件
- 响应式布局

### 2.5 环境变量配置

创建 `chat-frontend/.env.local`：

```
NEXT_PUBLIC_WS_URL=ws://localhost:8123/ws
```

## 3. 配置文件

### 3.1 后端配置

- 创建 `langgraph-agent/README.md` 说明启动方式
- 启动命令：`uvicorn main:app --host 0.0.0.0 --port 8123`

### 3.2 前端配置

- 修改 `chat-frontend/package.json` 设置端口 50001
- 创建 `chat-frontend/README.md` 说明启动方式
- 启动命令：`npm run dev`

## 关键实现要点

1. **流式响应**：LangGraph agent 使用 `astream` 方法，WebSocket 逐块发送响应
2. **消息格式**：统一使用 JSON 格式 `{type: "message", content: "..."}`
3. **会话管理**：单会话模式，对话历史存储在后端内存中（重启丢失）
4. **错误处理**：WebSocket 断开自动重连，API 错误友好提示

### To-dos

- [ ] 创建后端项目结构和依赖配置
- [ ] 实现 Qwen3-plus 模型的 LangChain 封装
- [ ] 构建 LangGraph Agent 图结构
- [ ] 实现 FastAPI WebSocket 服务
- [ ] 创建 Next.js 项目和基础配置
- [ ] 实现聊天侧边栏 UI 组件
- [ ] 实现前端 WebSocket 客户端逻辑
- [ ] 集成前后端，测试完整对话流程