<!-- ffb9be9e-9ce8-46ee-aebc-6b9c08ca074c a6f11e9e-05d1-43d8-a2c4-ec8ccaab66e9 -->
# 添加语音识别工具功能

## 后端实现

### 1. 创建语音识别工具模块

创建 `/root/app/langgraph-agent/speech_tool.py`：

- 实现 `transcribe_audio` 函数，调用 Paraformer-V2 API
- 参考 `paraformer-v2.py` 的实现逻辑
- 使用 `dashscope.audio.asr.Transcription` 进行异步转录
- 处理 API 响应，提取 sentences 字段（包含 sentence_id, text, begin_time, end_time）
- 返回格式：JSON 字符串，仅包含 sentences 数组
- 示例输出：`[{"sentence_id": 0, "text": "你好", "begin_time": 0, "end_time": 500}, ...]`
- 错误处理：网络错误、API 错误、无效 URL 等

### 2. 集成 LangChain Tool

在 `speech_tool.py` 中：

- 使用 `@tool` 装饰器将函数包装为 LangChain Tool
- 定义工具名称：`"speech_recognition"`
- 定义工具描述：说明该工具用于转录音频 URL，返回 JSON 格式的句子列表（包含时间戳）
- 工具参数：`file_url: str`（音频文件的公开访问 URL）
- 工具返回：JSON 字符串，供 LLM 处理后展示给用户

### 3. 更新 Agent 支持工具调用

修改 `/root/app/langgraph-agent/agent.py`：

- 在 `QwenAgent.__init__` 中绑定语音识别工具到 LLM
- 使用 `self.llm.bind_tools([speech_tool])`
- 更新 `_build_graph` 方法，添加工具调用节点
- 添加条件边：判断 LLM 响应是否包含 tool_calls
- 添加 `call_tools` 节点：执行工具并返回结果
- 更新流式输出逻辑，支持工具调用状态的流式传递

### 4. 更新 WebSocket 消息协议

修改 `/root/app/langgraph-agent/main.py`：

- 在 WebSocket 处理中添加新的消息类型：
- `"tool_call"`: 工具开始调用（包含工具名称和参数）
- `"tool_result"`: 工具执行完成（包含转录结果）
- 在 `astream_chat` 流式处理中检测工具调用
- 发送工具状态更新到前端

### 5. 更新依赖

在 `/root/app/langgraph-agent/requirements.txt` 中添加：

- `requests`（如果未包含，用于下载转录结果）

## 前端实现

### 6. 更新 ChatSidebar 显示工具调用

修改 `/root/app/chat-frontend/src/components/ChatSidebar.tsx`：

- 扩展 `Message` 接口，添加可选字段：
- `toolCall?: { name: string; status: 'running' | 'completed' }`
- `isToolResult?: boolean`
- 在 `useWebSocket` 的 `onMessage` 回调中处理新的消息类型：
- `"tool_call"`: 添加工具调用提示消息（显示"正在转录音频..."）
- `"tool_result"`: 更新消息为转录结果
- 在消息渲染中：
- 工具调用中显示加载动画和提示文本
- 转录结果使用不同的样式（如浅黄色背景）区分

### 7. 样式优化

在 `ChatSidebar.tsx` 中：

- 为工具调用消息添加特殊样式（图标 + 加载动画）
- 转录结果使用等宽字体和合适的行间距
- 添加工具调用标识图标（如 🎤）

## 测试验证

### 8. 测试工具功能

- 测试用户发送包含音频 URL 的消息
- 验证 LLM 是否正确判断需要调用工具
- 验证工具调用状态在聊天界面正确显示
- 验证转录结果格式正确（包含时间戳）
- 测试错误处理（无效 URL、API 失败等）

### To-dos

- [ ] 创建后端项目结构和依赖配置
- [ ] 实现 Qwen3-plus 模型的 LangChain 封装
- [ ] 构建 LangGraph Agent 图结构
- [ ] 实现 FastAPI WebSocket 服务
- [ ] 创建 Next.js 项目和基础配置
- [ ] 实现聊天侧边栏 UI 组件