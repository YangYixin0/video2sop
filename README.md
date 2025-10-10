# LangGraph Agent Chat

基于 LangGraph 和 Qwen3-plus 的智能对话系统，支持实时流式对话和 LangSmith 调试追踪。

## 🎯 项目特性

- ✅ **LangGraph Agent**: 使用状态图管理对话流程
- ✅ **Qwen3-plus 模型**: 基于阿里云通义千问大语言模型
- ✅ **实时流式对话**: WebSocket 实现消息实时传输
- ✅ **LangSmith 调试**: 支持完整的调试追踪
- ✅ **响应式 UI**: Next.js + TypeScript + Tailwind CSS
- ✅ **自动重连**: WebSocket 连接异常时自动重连
- ✅ **单会话模式**: 简化的对话历史管理

## 🏗️ 系统架构

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Next.js       │ ←─────────────→ │   FastAPI       │
│   Frontend      │                 │   Backend       │
│   (端口 50001)  │                 │   (端口 8123)   │
└─────────────────┘                 └─────────────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │   LangGraph     │
                                    │   Agent         │
                                    └─────────────────┘
                                            │
                                            ▼
                                    ┌─────────────────┐
                                    │   Qwen3-plus    │
                                    │   Model         │
                                    └─────────────────┘
```

## 🚀 快速开始

### 1. 配置环境变量

编辑 `/root/app/.env` 文件：
```env
# 必需的配置
DASHSCOPE_API_KEY=your_dashscope_api_key_here

# 可选的 LangSmith 调试配置
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-agent-chat
```

### 2. 一键启动

**推荐方式（修复版）**:
```bash
cd /root/app
./start_services_fixed.sh
```

**标准方式**:
```bash
cd /root/app
./start_services.sh
```

### 3. 手动启动

**启动后端服务:**
```bash
cd /root/app/langgraph-agent
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8123 --reload
```

**启动前端服务:**
```bash
cd /root/app/chat-frontend
npm install
npm run dev
```

### 4. 访问应用

- 🌐 前端界面: http://127.0.0.1:50001
- 🔧 后端 API: http://127.0.0.1:8123
- 📊 健康检查: http://127.0.0.1:8123/health

## 📁 项目结构

```
/root/app/
├── langgraph-agent/          # 后端服务
│   ├── main.py              # FastAPI 主应用
│   ├── agent.py             # LangGraph Agent
│   ├── qwen_model.py        # Qwen3-plus 模型封装
│   ├── requirements.txt     # Python 依赖
│   └── README.md           # 后端文档
├── chat-frontend/           # 前端应用
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx    # 主页面
│   │   ├── components/
│   │   │   └── ChatSidebar.tsx  # 聊天组件
│   │   └── hooks/
│   │       └── useWebSocket.ts  # WebSocket 钩子
│   ├── package.json        # 前端依赖
│   └── README.md          # 前端文档
├── model_example/          # 模型示例（不改动）
├── start_services.sh       # 一键启动脚本
├── TROUBLESHOOTING.md      # 故障排除指南
└── .env                   # 环境变量配置
```

## 🔧 API 文档

### WebSocket 端点

**连接地址:** `ws://127.0.0.1:8123/ws`

**发送消息格式:**
```json
{
  "type": "message",
  "content": "用户消息内容"
}
```

**接收消息格式:**
```json
// 状态更新
{
  "type": "status",
  "status": "processing"
}

// 流式响应片段
{
  "type": "chunk",
  "content": "响应片段"
}

// 完整响应
{
  "type": "complete",
  "content": "完整响应内容"
}

// 错误信息
{
  "type": "error",
  "content": "错误描述"
}
```

### HTTP 端点

- `GET /` - 根路径信息
- `GET /health` - 健康检查

## 🐛 故障排除

如果遇到问题，请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 文件。

常见问题：
1. **WebSocket 连接失败** - 检查代理设置，使用 `127.0.0.1` 而不是 `localhost`
2. **API 密钥错误** - 确保在 `.env` 文件中设置了有效的 `DASHSCOPE_API_KEY`
3. **端口冲突** - 检查端口 8123 和 50001 是否被占用

## 🧪 测试

### 测试 WebSocket 连接
```bash
cd /root/app/langgraph-agent
python -c "
import asyncio
import websockets
import json

async def test_ws():
    uri = 'ws://127.0.0.1:8123/ws'
    async with websockets.connect(uri) as websocket:
        await websocket.send(json.dumps({'type': 'ping'}))
        response = await websocket.recv()
        print('响应:', response)

asyncio.run(test_ws())
"
```

### 测试 HTTP 健康检查
```bash
curl --noproxy '*' http://127.0.0.1:8123/health
```

### 完整连接测试
```bash
cd /root/app
python test_connection.py
```

## 📝 开发说明

### 后端开发
- 使用 FastAPI 框架
- 支持异步 WebSocket 连接
- 集成 LangGraph 状态图
- 支持 LangSmith 追踪

### 前端开发
- 使用 Next.js 15 + TypeScript
- Tailwind CSS 样式
- 自定义 WebSocket Hook
- 响应式设计

## 🔄 更新日志

- **v1.0.0** - 初始版本
  - 实现基础 LangGraph Agent
  - 集成 Qwen3-plus 模型
  - 支持实时流式对话
  - 添加 LangSmith 调试支持

## 📄 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 请确保在 `.env` 文件中设置有效的 API 密钥，否则系统无法正常工作。
