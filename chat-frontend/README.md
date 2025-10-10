# LangGraph Agent Chat Frontend

基于 Next.js 的聊天前端界面，与 LangGraph Agent 后端通过 WebSocket 进行实时通信。

## 功能特性

- 实时流式对话界面
- 响应式设计，支持移动端
- WebSocket 自动重连机制
- 消息状态指示器
- 美观的聊天 UI

## 技术栈

- Next.js 15.5.4
- TypeScript
- Tailwind CSS
- React Hooks

## 安装依赖

```bash
npm install
```

## 环境变量配置

在 `.env.local` 文件中配置：

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8123/ws
```

## 启动开发服务器

```bash
npm run dev
```

前端将在 `http://localhost:50001` 启动。

## 项目结构

```
src/
├── app/
│   └── page.tsx          # 主页面
├── components/
│   └── ChatSidebar.tsx   # 聊天侧边栏组件
└── hooks/
    └── useWebSocket.ts   # WebSocket 连接钩子
```

## WebSocket 通信协议

### 发送消息
```json
{
  "type": "message",
  "content": "用户消息内容"
}
```

### 接收消息类型
- `status`: 状态更新（processing）
- `chunk`: 流式响应片段
- `complete`: 完整响应
- `error`: 错误信息
- `pong`: 心跳响应

## 使用说明

1. 确保后端服务（端口 8123）正在运行
2. 启动前端开发服务器
3. 在浏览器中打开 `http://localhost:50001`
4. 右侧聊天面板会自动连接到后端
5. 开始与 AI 助手对话！