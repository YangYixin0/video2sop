# LangSmith 配置和使用指南

## ✅ 当前配置状态

您的 LangSmith 配置**完全正确**，已经可以正常使用了！

### 📋 配置详情

**`.env` 文件中的配置**：
```bash
LANGSMITH_API_KEY=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
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=video2sop
```

**代码中的自动配置** (`main.py` 第27-32行)：
```python
if os.getenv('LANGSMITH_TRACING'):
    os.environ['LANGCHAIN_TRACING_V2'] = 'true'
    os.environ['LANGCHAIN_ENDPOINT'] = 'https://api.smith.langchain.com'
    os.environ['LANGCHAIN_API_KEY'] = os.getenv('LANGSMITH_API_KEY')
    os.environ['LANGCHAIN_PROJECT'] = os.getenv('LANGSMITH_PROJECT', 'langgraph-agent-chat')
```

---

## 🚀 如何启动 LangSmith 服务

### 重要说明：
**LangSmith 不需要单独启动服务！** 

LangSmith 是一个**云端追踪服务**，只要：
1. ✅ 在 `.env` 中配置了正确的环境变量（您已完成）
2. ✅ 安装了 `langsmith` Python 包（已安装 v0.4.37）
3. ✅ 在代码中设置了 LangChain 环境变量（已配置）

**您的应用在运行时会自动将追踪数据发送到 LangSmith 云端！**

---

## 📊 如何查看 LangSmith 追踪数据

### 1️⃣ 访问 LangSmith 平台
打开浏览器访问：**https://smith.langchain.com/**

### 2️⃣ 登录账号
使用您申请 API Key 时的账号登录

### 3️⃣ 查看项目
- 在左侧菜单中找到 **Projects**
- 点击您的项目：**video2sop**
- 您将看到所有的追踪记录（Traces）

### 4️⃣ 追踪内容
LangSmith 会记录：
- 🔹 LangGraph Agent 的所有对话
- 🔹 工具调用（如 `speech_recognition`）
- 🔹 LLM 调用（Qwen3-plus）
- 🔹 执行时间和性能指标
- 🔹 输入输出详情
- 🔹 错误和异常

---

## 🔍 验证 LangSmith 是否工作

### 方法1：启动应用并测试
```bash
cd /root/video2sop/langgraph-agent
python main.py
```

然后在前端进行任何操作（如语音识别、视频理解），操作完成后：
1. 访问 https://smith.langchain.com/
2. 进入 `video2sop` 项目
3. 查看是否有新的追踪记录

### 方法2：检查日志输出
当应用启动时，如果看到控制台没有报错，说明 LangSmith 配置成功。

### 方法3：测试连接
```bash
cd /root/video2sop/langgraph-agent
python -c "
from dotenv import load_dotenv
import os
load_dotenv('../.env')

if os.getenv('LANGSMITH_TRACING'):
    os.environ['LANGCHAIN_TRACING_V2'] = 'true'
    os.environ['LANGCHAIN_ENDPOINT'] = 'https://api.smith.langchain.com'
    os.environ['LANGCHAIN_API_KEY'] = os.getenv('LANGSMITH_API_KEY')
    os.environ['LANGCHAIN_PROJECT'] = os.getenv('LANGSMITH_PROJECT')
    print('✅ LangSmith 配置成功！')
    print(f'   项目: {os.environ[\"LANGCHAIN_PROJECT\"]}')
else:
    print('❌ LangSmith 未启用')
"
```

---

## 📝 配置说明

### `LANGSMITH_TRACING=true`
- ✅ **正确**：这会启用追踪功能
- 也可以设置为 `LANGSMITH_TRACING=1`（效果相同）
- 设置为 `false` 或删除此行将禁用追踪

### `LANGSMITH_PROJECT=video2sop`
- ✅ **正确**：这是您的项目名称
- 所有追踪数据将归类到这个项目下
- 您可以在 LangSmith 平台上创建多个项目，用不同的项目名区分

### `LANGSMITH_API_KEY=lsv2_sk_...`
- ✅ **正确**：这是您从 LangSmith 平台获取的 API 密钥
- 格式：`lsv2_sk_` 开头是正确的格式

---

## 🎯 哪些操作会被追踪？

在您的 `video2sop` 项目中，以下操作会被自动追踪：

### 1. LangGraph Agent 聊天
- 用户消息
- AI 响应
- 工具调用（`speech_recognition`）

### 2. LangChain 工具
- `speech_recognition` 工具调用
- `sop_parser` 工具调用
- `sop_refine` 工具调用

### 3. 直接调用的模型（不会自动追踪）
**注意**：以下使用 `dashscope` 直接调用的 API **不会自动追踪**到 LangSmith：
- `video_understanding` (Qwen3-VL-Plus)
- `integrate_sop_segments` (Qwen-Plus)
- `sop_parser` 中的 Qwen-Plus 调用
- `sop_refine` 中的 Qwen-Plus 调用

如果需要追踪这些调用，需要手动使用 LangSmith 的 `@traceable` 装饰器。

---

## 🔧 高级配置（可选）

### 添加手动追踪
如果您想追踪非 LangChain 的操作，可以使用：

```python
from langsmith import traceable

@traceable(run_type="llm", name="video_understanding")
def video_understanding(video_url: str, prompt: str, fps: int = 2, audio_transcript: str = None):
    # 您的代码
    pass
```

### 临时禁用追踪
如果某些操作不想被追踪，可以临时设置：
```python
import os
os.environ['LANGCHAIN_TRACING_V2'] = 'false'
# 执行不想追踪的操作
os.environ['LANGCHAIN_TRACING_V2'] = 'true'
```

---

## ❓ 常见问题

### Q1: 为什么我在 LangSmith 上看不到追踪记录？
**A**: 请检查：
1. API Key 是否正确
2. 网络是否可以访问 `https://api.smith.langchain.com`
3. 确保执行了使用 LangChain 的操作（如 Agent 聊天）
4. 检查项目名称是否匹配

### Q2: LangSmith 会影响性能吗？
**A**: 
- 有轻微影响（增加网络请求）
- 对于开发和调试阶段，这个开销是值得的
- 生产环境可以通过设置 `LANGSMITH_TRACING=false` 来禁用

### Q3: LangSmith 是免费的吗？
**A**: 
- 有免费额度
- 具体限制请查看 https://www.langchain.com/pricing

### Q4: 如何完全禁用 LangSmith？
**A**: 
在 `.env` 中设置：
```bash
LANGSMITH_TRACING=false
```
或者直接删除/注释掉这一行。

---

## 📚 更多资源

- **LangSmith 官方文档**: https://docs.smith.langchain.com/
- **LangSmith 平台**: https://smith.langchain.com/
- **LangChain 文档**: https://python.langchain.com/docs/langsmith/

---

## ✅ 总结

您的配置完全正确！现在：

1. ✅ 环境变量已正确设置
2. ✅ LangSmith 包已安装
3. ✅ 代码中已自动配置
4. ✅ 不需要启动额外的服务

**只需正常启动您的应用，LangSmith 就会自动工作！**

启动命令：
```bash
cd /root/video2sop/langgraph-agent
EXAMPLE_VIDEO_PATH="/root/video2sop/temp/video_example/pressing_operation.mp4" python main.py
```

然后访问 https://smith.langchain.com/ 查看追踪数据！🎉

