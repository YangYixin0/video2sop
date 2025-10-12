# Video2SOP：将仪器教学视频转化为SOP

基于 AI 的视频理解和文档生成系统，专门用于将实验室仪器操作教学视频转换为标准操作流程（SOP）文档。

## 🎯 项目特性

- ✅ **视频理解**: 基于 Qwen3-VL-Plus 模型的视频内容分析
- ✅ **语音识别**: 集成 Paraformer-V2 的音频转录功能
- ✅ **SOP生成**: 自动生成标准操作流程文档
- ✅ **实时处理**: WebSocket 实现实时状态更新
- ✅ **响应式 UI**: Next.js + TypeScript + Tailwind CSS
- ✅ **多模态分析**: 结合视频和音频内容进行综合分析
- ✅ **操作历史**: 完整的操作记录和结果追踪

## 🏗️ 系统架构

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Next.js       │ ←─────────────→ │   FastAPI       │
│   Frontend      │                 │   Backend       │
│   (端口 50001)  │                 │   (端口 8000)   │
└─────────────────┘                 └─────────────────┘
                                           │
                                           ▼
                                   ┌─────────────────┐
                                   │   LangGraph     │
                                   │   Agent         │
                                   └─────────────────┘
                                           │
                                           ▼
                    ┌─────────────────┐  ┌─────────────────┐
                    │   Qwen3-VL-Plus │  │  Paraformer-V2  │
                    │   (视频理解)     │  │   (语音识别)     │
                    └─────────────────┘  └─────────────────┘
                                           │
                                           ▼
                                   ┌─────────────────┐
                                   │   OSS Storage   │
                                   │   (文件存储)     │
                                   └─────────────────┘
```

## 🚀 快速开始

### 1. 配置环境变量

编辑 `/root/app/.env` 文件：
```env
# 必需的配置
DASHSCOPE_API_KEY=your_dashscope_api_key_here

# OSS 存储配置（用于视频和音频文件存储）
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_ENDPOINT=your_oss_endpoint
OSS_BUCKET_NAME=your_bucket_name

# 可选的 LangSmith 调试配置
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=video2sop
```

### 2. 一键启动

**标准启动（推荐）:**
```bash
cd /root/app
./start_services.sh
```

**持久化启动（断开Shell连接后继续运行）:**
```bash
cd /root/app
./start_services_persistent.sh
```

**停止服务:**
```bash
cd /root/app
./stop_services.sh
```

### 3. 手动启动

**启动后端服务:**
```bash
cd /root/app/langgraph-agent
pip install -r requirements.txt
python main.py
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
├── langgraph-agent/                    # 后端服务
│   ├── main.py                        # FastAPI 主应用
│   ├── agent.py                       # LangGraph Agent
│   ├── video_understanding_tool.py    # 视频理解工具
│   ├── speech_tool.py                 # 语音识别工具
│   ├── oss_manager.py                 # OSS存储管理
│   ├── requirements.txt               # Python 依赖
│   └── README.md                     # 后端文档
├── chat-frontend/                     # 前端应用
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # 主页面
│   │   │   └── layout.tsx            # 布局组件
│   │   ├── components/
│   │   │   ├── VideoUploader.tsx     # 视频上传组件
│   │   │   ├── SpeechRecognitionPanel.tsx  # 语音识别组件
│   │   │   ├── VideoUnderstandingPanel.tsx # 视频理解组件
│   │   │   ├── OperationHistory.tsx  # 操作历史组件
│   │   │   └── SOPExporter.tsx       # SOP导出组件
│   │   └── hooks/
│   │       └── useWebSocket.ts       # WebSocket 钩子
│   ├── package.json                  # 前端依赖
│   ├── tailwind.config.js           # Tailwind配置
│   └── README.md                    # 前端文档
├── temp/
│   ├── model_example/               # 模型示例
│   │   ├── qwen3_vl_plus_video.py  # 视频理解参考实现
│   │   └── paraformer-v2.py        # 语音识别参考实现
│   └── manuscript_video_understanding/  # 生成的文档示例
├── start_services.sh                # 标准启动脚本
├── start_services_persistent.sh     # 持久化启动脚本
├── stop_services.sh                 # 停止服务脚本
├── TROUBLESHOOTING.md               # 故障排除指南
└── .env                            # 环境变量配置
```

## 🔧 API 文档

### WebSocket 端点

**连接地址:** `ws://127.0.0.1:8123/ws`

**接收消息格式:**
```json
// 视频上传完成
{
  "type": "upload_complete",
  "video_url": "https://...",
  "audio_url": "https://...",
  "session_id": "session_123"
}

// 语音识别完成
{
  "type": "speech_recognition_complete",
  "message": "语音识别已执行",
  "result": "转录文本内容"
}

// 视频理解完成
{
  "type": "video_understanding_complete",
  "message": "视频理解已执行",
  "result": "SOP文档内容",
  "fps": 2,
  "has_audio_context": true
}

// 工具调用状态
{
  "type": "tool_call",
  "tool_name": "video_understanding",
  "status": "running|completed"
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
- `POST /video_upload` - 视频上传
- `POST /speech_recognition` - 语音识别
- `POST /video_understanding` - 视频理解
- `POST /cleanup_files` - 清理文件

## 🔄 工作流程

1. **视频上传** → 用户上传实验室仪器操作视频
2. **语音识别** → 自动提取视频中的音频并进行转录
3. **视频理解** → 结合视频和音频内容，使用 Qwen3-VL-Plus 分析操作流程
4. **SOP生成** → 生成包含标题、摘要、关键词、材料清单、操作步骤的标准操作流程文档
5. **结果展示** → 在操作历史中记录并显示生成的SOP文档
6. **文档导出** → 支持导出TXT格式（适合修改后发布至开放获取平台）和HTML格式（适合实验室内部使用）

## 🎨 界面特性

- **响应式设计**: 使用 Tailwind CSS，支持多种屏幕尺寸
- **组件宽度**: 主左区域所有组件使用 `max-w-4xl` (896px) 提供充足空间
- **Markdown渲染**: 支持 Markdown 格式的结果展示和源码查看切换
- **实时状态**: WebSocket 实时更新操作状态和进度
- **操作历史**: 完整记录所有操作，新记录显示在底部
- **会话隔离**: 每个浏览器标签页独立运行，操作记录不互相干扰
- **SOP导出**: 支持TXT和HTML格式的SOP文档导出功能

## 🐛 故障排除

如果遇到问题，请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 文件。

常见问题：
1. **WebSocket 连接失败** - 检查代理设置，使用 `127.0.0.1` 而不是 `localhost`
2. **API 密钥错误** - 确保在 `.env` 文件中设置了有效的 `DASHSCOPE_API_KEY`
3. **OSS配置错误** - 确保正确配置了 OSS 存储参数
4. **端口冲突** - 检查端口 8123 和 50001 是否被占用
5. **视频格式不支持** - 确保上传的视频格式为 MP4, MOV, AVI, MKV, WEBM
6. **服务无法停止** - 使用 `./stop_services.sh` 强制停止所有相关进程
7. **断开连接后服务停止** - 使用 `./start_services_persistent.sh` 启动持久化服务

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
        print('WebSocket 连接成功')
        # 监听消息
        while True:
            try:
                message = await websocket.recv()
                data = json.loads(message)
                print('收到消息:', data)
            except websockets.exceptions.ConnectionClosed:
                print('连接已关闭')
                break

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
- OSS 文件存储管理
- 多模态 AI 模型集成

### 前端开发
- 使用 Next.js 15 + TypeScript
- Tailwind CSS 样式 + Typography 插件
- 自定义 WebSocket Hook
- 响应式设计
- Markdown 渲染支持

## 🔄 更新日志

- **v1.2.0** - 会话隔离和SOP导出优化
  - 实现浏览器标签页会话隔离
  - 改进用户体验和界面交互

- **v1.1.0** - Video2SOP 基础版本
  - 集成 Qwen3-VL-Plus 视频理解模型
  - 集成 Paraformer-V2 语音识别
  - 实现视频上传和 OSS 存储
  - 支持 SOP 文档自动生成

## 📄 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 
- 请确保在 `.env` 文件中设置有效的 `DASHSCOPE_API_KEY`，否则 AI 模型无法正常工作
- 请配置 OSS 存储参数，用于视频和音频文件的存储
- 系统支持最大 500MB 的视频文件上传
- 生成的 SOP 文档将包含标题、摘要、关键词、材料清单和详细操作步骤
