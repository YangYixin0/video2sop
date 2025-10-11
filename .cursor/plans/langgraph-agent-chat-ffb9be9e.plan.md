<!-- ffb9be9e-9ce8-46ee-aebc-6b9c08ca074c a6f11e9e-05d1-43d8-a2c4-ec8ccaab66e9 -->
# 视频上传和 OSS 集成功能

## 后端实现

### 1. 复制并集成 OSS 相关代码

将 `temp/oss/` 目录中的代码集成到项目中：

- 复制 `oss_manager.py` 到 `/root/app/langgraph-agent/` 目录
- 复制 `audio_extractor.py` 到 `/root/app/langgraph-agent/` 目录
- 安装必要的依赖：`oss2`、`ffmpeg-python`

### 2. 扩展 FastAPI 后端 API

在 `/root/app/langgraph-agent/main.py` 中添加新的 API 端点：

- `POST /generate_session_id`: 生成新的会话 ID
- `POST /generate_upload_signature`: 生成 OSS 上传签名
- `POST /extract_audio`: 从视频 URL 提取音频并上传到 OSS
- `POST /delete_session_files`: 删除指定会话的所有文件
- `POST /upload_video_proxy`: 通过后端代理上传视频到 OSS（可选）

### 3. 添加环境变量配置

在 `/root/app/.env` 中添加 OSS 配置：

- `OSS_ACCESS_KEY_ID`
- `OSS_ACCESS_KEY_SECRET`
- `OSS_ENDPOINT`
- `OSS_BUCKET_NAME`

### 4. 添加 AI 助手通知功能

修改 WebSocket 消息协议，添加新的消息类型：

- `"upload_complete"`: 上传完成通知（包含视频和音频 URL）
- AI 助手在收到上传完成消息后，在聊天中告知用户两个 URL

## 前端实现

### 5. 创建视频上传组件

创建 `/root/app/chat-frontend/src/components/VideoUploader.tsx`：

- 文件选择功能（支持拖拽上传）
- 上传进度显示
- 视频预览功能
- 移除视频按钮
- 显示上传状态（视频上传中、音频提取中、完成）

### 6. 创建 OSS 上传工具类

创建 `/root/app/chat-frontend/src/utils/ossUpload.ts`：

- `generateSessionId()`: 从后端获取会话 ID
- `uploadVideoToOSS()`: 上传视频到 OSS
- `extractAudioFromVideo()`: 调用后端 API 提取音频
- `deleteSessionFiles()`: 删除会话文件

### 7. 更新主页面布局

修改 `/root/app/chat-frontend/src/app/page.tsx`：

- 调整 `ResizableLayout` 左侧区域布局
- 在左侧顶部添加 `VideoUploader` 组件
- 保留原有的介绍卡片，放在上传组件下方

### 8. 实现文件清理逻辑

- 在 `VideoUploader` 组件中监听：
- 用户点击移除按钮时调用删除 API
- `beforeunload` 事件（页面关闭时）调用删除 API
- 使用 `useEffect` cleanup 函数处理组件卸载

### 9. 集成 AI 助手通知

修改 `/root/app/chat-frontend/src/components/ChatSidebar.tsx`：

- 监听 `upload_complete` 消息类型
- 自动在聊天中添加系统消息，显示视频和音频 URL
- 使用特殊样式区分系统消息

## 测试和优化

### 10. 测试上传流程

- 测试视频上传功能
- 测试音频提取功能
- 测试文件删除功能
- 测试页面关闭时的清理
- 测试 AI 助手通知功能

### 11. 优化用户体验

- 添加错误处理和友好的错误提示
- 添加上传进度条
- 添加文件大小和格式验证
- 优化加载状态显示

## 技术要点

### 前端上传流程

1. 用户选择视频文件（最大 500MB，支持 mp4/mov/avi/mkv/webm）
2. 前端验证文件大小和格式
3. 前端调用后端 API 生成 session_id
4. 前端调用后端 API 获取上传签名
5. 前端直接上传视频到 OSS（使用签名 URL）
6. 如果直接上传失败，自动回退到后端代理上传
7. 显示视频预览
8. 上传成功后，前端调用后端 API 提取音频
9. 后端下载视频、提取音频、上传音频到 OSS
10. 后端返回音频 URL
11. 前端自动在聊天中发送系统消息，显示视频和音频 URL
12. AI 助手可以访问这些 URL（如转录音频）

### 文件清理策略

- **用户主动移除**: 立即删除 OSS 文件
- **文件保留时间**: 2 小时（不在页面关闭时删除）
- **后端定时清理**: 每小时自动清理超过 2 小时的会话文件
- **清理触发**: 添加定时任务或在 API 调用时触发清理

### 配置要求

**环境变量**（在 `/root/app/.env` 中配置）:

- `OSS_ACCESS_KEY_ID`: 阿里云 OSS Access Key ID
- `OSS_ACCESS_KEY_SECRET`: 阿里云 OSS Access Key Secret
- `OSS_ENDPOINT`: OSS 服务端点（如 https://oss-cn-beijing.aliyuncs.com）
- `OSS_BUCKET_NAME`: OSS Bucket 名称

**系统依赖**:

- `ffmpeg`: 音视频处理工具（需要安装）
- `oss2`: 阿里云 OSS Python SDK
- `requests`: HTTP 请求库

### 文件限制

- **最大文件大小**: 500MB
- **支持格式**: mp4, mov, avi, mkv, webm
- **视频预览**: 支持浏览器内预览
- **音频格式**: 提取为 MP3 格式（128kbps）

### To-dos

- [ ] 创建后端项目结构和依赖配置
- [ ] 实现 Qwen3-plus 模型的 LangChain 封装
- [ ] 构建 LangGraph Agent 图结构
- [ ] 实现 FastAPI WebSocket 服务
- [ ] 创建 Next.js 项目和基础配置
- [ ] 实现聊天侧边栏 UI 组件