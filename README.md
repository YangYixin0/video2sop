# Video2SOP：将仪器教学视频转化为SOP

基于AI的视频理解和文档生成系统，专门用于将实验室仪器操作教学视频转换为标准操作流程（SOP）文档。

## 工作流程

1. **视频上传**: 用户上传实验室仪器操作视频
2. **语音识别**: 自动提取视频中的音频并进行转录
3. **视频理解**: 结合视频和音频内容，使用 Qwen3-VL-Plus 分析操作流程
4. **草稿解析**: 将视频理解结果解析为结构化的SOP区块
5. **SOP修改**: 用户或AI对SOP区块内容进行精修改进
7. **文档导出**: 支持导出TXT格式（适合修改后发布至开放获取平台）和HTML格式（适合实验室内部使用）

## 项目特性

- **能处理的视频长度**: 已测试能处理18分钟的视频，不能处理29分钟的视频，限制在于Qwen3-VL-Plus的上下文长度。
- **多模态分析**: 使用Qwen3-VL-Plus和Paraformer-V2对视频和音频内容进行综合分析
- **多媒体SOP**: 支持TXT和HTML格式的文档导出功能。HTML格式文档可同时展现文字和视频，带来直观理解
- **可交互编辑区**：SOP修改区中的区块可以方便地修改内容、调整次序、跳转并播放视频片段以核实
- **操作历史**: 重要操作会被记录，便于回顾
- **会话隔离**: 每个用户会话独立运行，避免操作冲突
- **异步并发**: 支持多个会话同时调用工具，提升吞吐量

### 各环节用时典型值
| 视频时长 (min) | 文件大小 (MB) | 分辨率 (px)   | 视频上传 (min) | 语音识别 (min) | 视频理解 (min) | 草稿解析 (min) | AI精修 (min) |
|:-------------:|:------------:|:-------------:|:--------------:|:--------------:|:--------------:|:--------------:|:------------:|
| 1.6           | 30           | 1080×1906     | 0.4            | 0.1            | 1.3            | 1.7            | 0.9          |
| 6.3           | 132          | 1080×1920     | 1              | 0.2            | 1.3            | 1.5            | 0.9          |
| 18.4          | 239          | 720×1280      | 2.3            | 0.4            | 4.2            | 2              | 1.1          |
| 29.5          | 569          | 1080×1908     | 5.3            | 0.6            | N/A            | N/A            | N/A          |

## 即将增加的功能

- 支持处理一小时量级的长视频
- 支持上传PDF文件，例如已有的仪器使用说明书、已有的SOP，供AI参考
- 英文界面

## 系统架构

### 架构主体
```
外部请求 (50001)
    ↓
┌─────────────────┐
│   Nginx         │
│   (反向代理)     │
│   (端口 50001)  │
└─────────────────┘
    ├─→ / (静态文件) → Next.js (3000)
    ├─→ /api/* (API) → FastAPI (8123)
    └─→ /ws (WebSocket) → FastAPI (8123)
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

**架构特点：**
- **统一入口**：所有请求通过 Nginx 在 50001 端口统一处理
- **反向代理**：Nginx 将请求路由到对应的内部服务
- **环境一致**：开发和生产环境使用完全相同的架构

### 后端开发
- 使用 FastAPI 框架
- 支持异步 WebSocket 连接
- 集成 LangGraph 状态图
- 支持 LangSmith 追踪
- OSS 文件存储管理
- 多模态 AI 模型集成
- 会话隔离和Agent实例池管理
- 异步并发处理，支持多会话同时调用工具
- 使用 `asyncio.to_thread` 避免同步调用阻塞事件循环

### 前端开发
- 使用 Next.js 15 + TypeScript
- Tailwind CSS 样式 + Typography 插件
- 自定义 WebSocket Hook
- 响应式设计
- Markdown 渲染支持
- 生产构建优化（自动选择最佳运行模式）
- 严格的TypeScript类型检查

## 🚀 开发模式快速开始

### 1. 配置环境变量

编辑 `/root/video2sop/.env` 文件：
```env
# 大模型配置（必须）
DASHSCOPE_API_KEY=your_dashscope_api_key_here

# OSS 存储配置（必须，用于视频和音频文件存储）
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_ENDPOINT=your_oss_endpoint
OSS_BUCKET_NAME=your_bucket_name

# 示例视频配置（可选，用于演示功能。如果使用这个配置，应在相应目录存放示例视频）
EXAMPLE_VIDEO_PATH=/root/video2sop/temp/video_example/pressing_operation.mp4

# LangSmith 调试配置（可选，用于LangGraph测试）
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=video2sop
```

确认 `/root/video2sop/chat-frontend/.env.development` 文件符合需求：
```env
# WebSocket 地址，用于与后端实时通信
# 统一架构：开发和生产环境都通过 Nginx 代理
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:50001/ws

# API 地址
# 统一架构：开发和生产环境都通过 Nginx 代理
NEXT_PUBLIC_API_URL=http://127.0.0.1:50001/api

# 各功能超时时间配置（毫秒，可选）
# 视频理解超时时间，默认1800000（30分钟）
NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT=1800000
# 语音识别超时时间，默认300000（5分钟）
NEXT_PUBLIC_SPEECH_RECOGNITION_TIMEOUT=300000
# SOP解析超时时间，默认1200000（20分钟）
NEXT_PUBLIC_SOP_PARSE_TIMEOUT=1200000
# SOP精修超时时间，默认1200000（20分钟）
NEXT_PUBLIC_SOP_REFINE_TIMEOUT=1200000
# 视频上传超时时间，默认600000（10分钟）
NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT=600000
# 音频提取超时时间，默认300000（5分钟）
NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT=300000

# 联系方式（可选）
NEXT_PUBLIC_AUTHOR_EMAIL=your-email@example.com
NEXT_PUBLIC_APP_GITHUB=https://github.com/your-repo/video2sop
```

### 2. 一键启动

**开发模式启动:**
```bash
cd /root/video2sop
./start_services.sh
```

**停止服务:**
```bash
cd /root/video2sop
./stop_services.sh
```

### 3. 手动启动

**启动后端服务:**
```bash
cd /root/video2sop/langgraph-agent
pip install -r requirements.txt
python main.py
```

**启动前端服务:**
```bash
cd /root/video2sop/chat-frontend
npm install
npm run dev
```

**环境变量文件说明**：
- 手动启动会使用现有的 `.env.local` 配置
- 一键启动脚本 `start_services.sh` 将先用预定义的环境配置 `.env.development` **覆盖** `.env.local` 文件，后启动

### 4. 访问应用

- 前端界面: http://127.0.0.1:50001
- 后端 API: http://127.0.0.1:50001/api/*
- 健康检查: http://127.0.0.1:50001/api/health
- WebSocket: ws://127.0.0.1:50001/ws

### 5. 启动方式对比

| 特性 | 开发环境启动 | 生产环境启动（见后文） |
|------|-------------|-------------|
| **运行模式** | 开发模式 (`npm run dev`) | 生产模式 (`npm run start`) |
| **开发工具** | 包含热重载、开发辅助按钮 | 生产模式无开发工具 |
| **性能** | 适合开发调试 | 生产模式性能更优 |
| **连接断开** | 服务会停止 | 服务继续运行 |
| **适用场景** | 开发调试 | 容器化部署（玻尔平台等） |
| **启动速度** | 快速 | 稍慢（需构建） |
| **容器兼容** | 适合容器部署 | 专为容器化设计 |
| **主进程管理** | 脚本持续运行监控服务 | 后端服务作为主进程保持运行 |
| **反向代理** | Nginx统一代理 | Nginx统一代理 |
| **端口暴露** | 仅50001端口对外 | 仅50001端口对外 |
| **架构一致性** | 与生产环境完全一致 | 与开发环境完全一致 |

## 🚀 玻尔平台生产环境快速开始

### 1. 玻尔平台特性说明
- **端口映射**: 在玻尔平台配置中明确指定端口映射为 `50001`
- **反向代理**: 玻尔平台会自动将请求转发到容器的50001端口
- **协议转换**: 玻尔平台自动处理HTTPS→HTTP和WSS→WS的协议转换
- **相对路径**: 前端使用相对路径配置，无需硬编码服务器IP

### 2. 环境变量配置
确认 `.env` 中的后端环境变量已配置

确认 `.env.production` 中的前端环境变量已配置，注意以下环境变量与 `.env.development` 中的有不同取值
```bash
NEXT_PUBLIC_WS_URL=/ws          # WebSocket相对路径
NEXT_PUBLIC_API_URL=./api       # API基础路径（使用./api避免相对路径解析问题）
```

`start_services_persistent.sh` 将先用预定义的环境配置 `.env.development` **覆盖** `.env.local` 文件，后构建前端，最后启动前端和后端

### 3. 部署步骤
1. 在玻尔平台构建镜像
2. 在玻尔平台开发者中心相应App内，新建版本，选择刚构建的镜像，配置启动命令为 `cd /root/video2sop && ./start_services_persistent.sh` ，服务端口为 `50001`
3. 以这个版本部署服务
4. 发布这个服务

**部署特点:**
- **环境变量配置**: 自动配置玻尔平台生产环境必需的环境变量
- **自动依赖安装**: 脚本自动安装Node.js、npm、FFmpeg等依赖
- **WebSocket支持**: 通过Nginx代理WebSocket连接，解决玻尔平台代理拦截问题
- **智能构建**: 自动尝试生产构建，失败时回退到开发模式
- **容器持久化**: 后端服务作为主进程，确保容器不会退出
- **日志管理**: 所有日志输出到 `/root/video2sop/logs/` 目录

**部署后状态检查:**
```bash
# 运行状态检查脚本
cd /root/video2sop
./check_deployment_status.sh

# 运行WebSocket配置测试
./test_websocket_config.sh
```

## 🔄 更新日志

- **v1.6.0** - 玻尔平台相对路径配置优化
  - 修改生产环境启动脚本使用相对路径配置，解决玻尔平台WebSocket连接失败问题
  - 前端环境变量改为相对路径：`NEXT_PUBLIC_WS_URL=/ws` 和 `NEXT_PUBLIC_API_URL=./api`
  - 重构API端点配置：移除API端点中的 `/api` 前缀，通过环境变量统一控制
  - 修复API路径解析问题：使用 `./api` 避免相对路径被错误解析为 `https://api/...`
  - 实现多环境配置文件管理：创建 `.env.development` 和 `.env.production` 文件并加入git跟踪

- **v1.5.1** - 玻尔平台WebSocket连接优化和部署工具完善
  - 按照玻尔官方建议优化Nginx WebSocket代理配置，添加proxy_cache_bypass $http_upgrade关键设置
  - 统一Nginx代理超时配置为30分钟，确保长时间AI处理任务正常完成
  - 新增部署后状态检查脚本check_deployment_status.sh，支持玻尔平台环境全面诊断
  - 新增WebSocket配置测试脚本test_websocket_config.sh，便于WebSocket连接问题排查

- **v1.5.0** - Nginx反向代理配置和项目结构优化
  - 添加Nginx反向代理，统一开发和生产环境架构，解决玻尔平台WebSocket代理拦截问题
  - 重构端口配置：前端3000端口，通过Nginx在50001端口统一代理，仅50001端口对外暴露
  - 为所有API端点添加 `/api` 前缀，更新CORS配置支持玻尔平台域名访问
  - 重新组织项目结构，创建tests和docs文件夹，统一项目路径从/root/app到/root/video2sop
  - 优化启动脚本，自动安装Nginx、Node.js、npm、FFmpeg等依赖，增强环境变量检查
  - 修复前端CORS配置问题，优化超时处理：支持环境变量配置各功能超时时间
  - 修复Nginx代理超时问题，将API代理超时从60秒优化为30分钟。所有功能的时间限制都受此限制。
  - 优化示例视频功能，支持环境变量配置示例视频路径

- **v1.4.0** - 视频保留功能和容器化部署优化
  - 实现视频保留功能，用户可选择允许运营者保留视频以分析异常
  - 优化UI界面
  - 重构生产环境启动脚本，后端服务作为主进程，专为容器化部署设计

- **v1.3.0** - 并发性能优化和会话管理
  - 优化大模型API调用，实现异步并发处理，支持多会话同时操作
  - 添加会话隔离和超时清理
  - Agent实例池管理

- **v1.2.0** - 会话隔离和生产模式优化
  - 实现浏览器标签页会话隔离
  - 新增持久化服务启动脚本（自动选择生产/开发模式）
  - 修复所有TypeScript类型错误，支持严格生产构建
  - 改进用户体验和界面交互

- **v1.1.0** - Video2SOP 基础版本
  - 集成 Qwen3-VL-Plus 视频理解模型
  - 集成 Paraformer-V2 语音识别
  - 实现视频上传和 OSS 存储
  - 支持 SOP 文档自动生成

## 📁 项目结构

```
/root/video2sop/
├── langgraph-agent/                    # 后端服务
│   ├── main.py                        # FastAPI 主应用
│   ├── agent.py                       # LangGraph Agent
│   ├── video_understanding_tool.py    # 视频理解工具
│   ├── speech_tool.py                 # 语音识别工具
│   ├── sop_parser_tool.py             # SOP解析工具
│   ├── sop_refine_tool.py             # SOP精修工具
│   ├── oss_manager.py                 # OSS存储管理
│   ├── oss_api.py                     # OSS API路由
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
├── tests/                          # 测试文件
│   ├── test_*.py                   # Python测试脚本
│   └── test_*.html                 # HTML测试页面
├── docs/                           # 文档文件
│   └── *.md                        # 技术文档
├── start_services.sh                # 标准启动脚本
├── start_services_persistent.sh     # 持久化启动脚本
├── stop_services.sh                 # 停止服务脚本
├── nginx.conf                       # Nginx配置文件
├── app.service                      # 系统服务配置
├── TROUBLESHOOTING.md               # 故障排除指南
└── .env                            # 环境变量配置
```

## 🔄 会话管理

系统实现了基于client_session_id的会话隔离机制：

### 会话特性

- 每个浏览器标签页拥有独立的会话ID
- 会话超时时间：1小时（从最后活跃时间起算）
- Agent实例池：3个实例，轮流分配给新会话
- 自动清理：创建新会话时自动清理过期会话

### 会话活跃判定

以下操作会更新会话活跃时间：
- WebSocket心跳消息（每30秒）
- 语音识别请求
- 视频理解请求
- SOP解析/精修请求

### 监控会话状态

访问 `/api/sessions/stats` 端点查看当前活跃会话：

```bash
curl http://127.0.0.1:50001/api/sessions/stats
```

返回信息包括：
- 活跃会话数量
- 每个会话的消息数量
- 分配的Agent实例
- 最后活跃时间
- 不活跃时长

### 技术实现

- **会话存储**：使用内存字典存储会话信息，包含历史记录、活跃时间和分配的Agent索引
- **Agent实例池**：3个独立的QwenAgent实例，轮流分配给新会话
- **自动清理**：创建新会话时自动清理1小时未活动的过期会话
- **并发安全**：使用asyncio.to_thread确保同步API调用不阻塞事件循环

## ⏱️ 超时配置说明

### 超时配置策略

系统采用**分层超时控制**策略，确保长时间运行的AI处理任务能够正常完成：

| 层级 | 配置位置 | 超时时间 | 说明 |
|------|----------|----------|------|
| **前端控制** | `.env.local` | 各功能独立配置 | 精确控制每个功能的超时时间 |
| **Nginx代理** | `nginx.conf` | 30分钟 (1800s) | 统一代理超时，支持所有API请求 |
| **后端处理** | 无限制 | 无限制 | 后端服务无超时限制 |

### 当前超时配置

| 功能 | 前端超时 | 设计理由 |
|------|----------|----------|
| **视频理解** | 30分钟 | 调用Qwen3-VL-Plus，处理复杂视频内容 |
| **SOP解析** | 20分钟 | 调用qwen-plus，处理长视频内容 |
| **SOP精修** | 20分钟 | 调用qwen-plus，处理长视频内容 |
| **视频上传** | 10分钟 | 大文件上传，通常较快完成 |
| **语音识别** | 5分钟 | 调用Paraformer-V2，处理较快 |
| **音频提取** | 5分钟 | FFmpeg处理，通常很快 |

### 自定义超时配置

如需调整超时时间，修改 `chat-frontend/.env.local` 文件：

```env
# 例如：将视频理解超时改为45分钟
NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT=2700000

# 例如：将SOP解析超时改为30分钟
NEXT_PUBLIC_SOP_PARSE_TIMEOUT=1800000
```

**注意**：Nginx代理超时已设置为30分钟，如需更长的处理时间，请同时调整Nginx配置。

## 🔧 API 文档

### WebSocket 端点

**连接地址:** `ws://127.0.0.1:50001/ws`

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

// SOP解析完成
{
  "type": "sop_parse_complete",
  "message": "SOP解析完成，共生成 x 个区块",
  "blocks_count": 5
}

// SOP精修完成
{
  "type": "sop_refine_complete",
  "message": "SOP精修完成，共处理 x 个区块",
  "blocks_count": 5,
  "has_user_notes": true
}

// 文件删除完成
{
  "type": "file_removed",
  "message": "上传的文件已从服务器删除（共删除 x 个文件）",
  "deleted_count": 2
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
- `GET /api/health` - 健康检查
- `GET /api/sessions/stats` - 会话统计信息
- `POST /api/load_example_video` - 加载示例视频
- `POST /api/video_upload` - 视频上传
- `POST /api/speech_recognition` - 语音识别
- `POST /api/video_understanding` - 视频理解
- `POST /api/parse_sop` - SOP解析
- `POST /api/refine_sop` - SOP精修
- `POST /api/delete_session_files` - 删除会话文件
- `POST /api/cleanup_files` - 清理文件

## 🐛 故障排除

如果遇到问题，请查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 文件。

### 常见问题

1. **WebSocket 连接失败** 
   - 开发环境：检查代理设置，使用 `127.0.0.1` 而不是 `localhost`
   - 容器化部署：确认Nginx正确代理WebSocket请求

2. **API 密钥错误** 
   - 确保在 `.env` 文件中设置了有效的 `DASHSCOPE_API_KEY`

3. **OSS配置错误** 
   - 确保正确配置了 OSS 存储参数

4. **端口冲突** 
   - 统一架构：检查端口 50001, 3000, 8123 是否被占用

5. **视频格式不支持** 
   - 确保上传的视频格式为 MP4, MOV, AVI, MKV, WEBM

6. **Nginx相关问题**
   ```bash
   # 检查Nginx配置
   nginx -t
   
   # 查看Nginx日志
   tail -f /var/log/nginx/error.log
   tail -f /var/log/nginx/access.log
   
   # 重启Nginx
   nginx -s reload
   
   # 完全重启Nginx（应用新配置）
   nginx -s stop
   nginx
   ```

7. **统一架构部署问题**
   - 确认容器内所有服务都在运行（Nginx、前端、后端）
   - 检查Nginx是否正确代理请求
   - 确认环境变量指向正确的端口（50001）
   - 检查玻尔平台的代理设置

8. **服务无法停止** - 使用 `./stop_services.sh` 强制停止所有相关进程

9. **容器化部署失败** - 使用 `./start_services_persistent.sh` 启动，确保后端服务作为主进程运行

10. **生产构建失败** - 检查TypeScript错误，或脚本会自动回退到开发模式

11. **开发辅助按钮消失** - 这是正常的，生产环境启动使用生产模式时会隐藏开发工具

12. **多标签页性能慢** - 已优化为并发处理，多标签页可同时处理请求

13. **会话超时** - 会话1小时无活动会自动清理，重新操作即可

14. **玻尔平台部署失败** - 确保使用正确的启动命令：`cd /root/video2sop && ./start_services_persistent.sh`

15. **容器退出** - 检查后端服务是否正常启动，查看 `/root/video2sop/logs/backend.log` 日志

16. **前端连接不到后端** - 检查环境变量配置，确保 `NEXT_PUBLIC_API_URL` 和 `NEXT_PUBLIC_WS_URL` 正确设置为50001端口

17. **环境配置不生效** - 启动脚本会覆盖 `.env.local` 文件；如果手动修改了配置，需要选择：使用启动脚本（覆盖修改）或直接运行npm（保留修改）

18. **统一架构API连接失败** - 使用Nginx反向代理后，所有请求都通过50001端口，无需修改API地址

19. **视频理解超时问题** - Nginx代理超时已优化为30分钟，支持长时间AI处理；可通过环境变量调整各功能超时时间

20. **API请求超时** - 如果遇到"upstream timed out"错误，检查Nginx配置中的proxy_read_timeout设置

21. **玻尔平台WebSocket连接失败** - 使用Nginx反向代理解决，确保WebSocket通过50001端口访问

22. **容器部署后无法访问** - 运行 `./check_deployment_status.sh` 检查服务状态，确保所有服务正常运行

23. **玻尔平台代理拦截** - 所有请求通过Nginx在50001端口统一处理，避免直接访问内部端口

24. **WebSocket配置优化** - v1.5.1已添加玻尔官方建议的proxy_cache_bypass $http_upgrade配置，如仍有问题请运行test_websocket_config.sh诊断

25. **部署后状态检查** - 使用./check_deployment_status.sh脚本全面检查服务状态，包括进程、端口、健康检查等

## 🧪 测试

### 测试 WebSocket 连接
```bash
cd /root/video2sop/langgraph-agent
python -c "
import asyncio
import websockets
import json

async def test_ws():
    uri = 'ws://127.0.0.1:50001/ws'
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
# 统一架构（开发和生产环境）
curl --noproxy '*' http://127.0.0.1:50001/api/health
```

### 测试会话统计
```bash
# 统一架构（开发和生产环境）
curl --noproxy '*' http://127.0.0.1:50001/api/sessions/stats
```

### 完整连接测试
```bash
cd /root/video2sop
python tests/test_connection.py
```

## 📄 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！