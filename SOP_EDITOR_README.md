# SOP编辑器功能说明

## 概述

SOP编辑器是Video2SOP应用的新增功能，允许用户将视频理解生成的SOP草稿进行精修、编辑和导出。

## 功能特性

### 🔧 核心功能

1. **SOP解析**: 使用qwen3-max将SOP草稿文本自动解析为结构化区块
2. **区块编辑**: 支持编辑文本内容、调整时间戳、切换播放按钮显示
3. **AI精修**: 基于用户批注使用AI精修SOP内容
4. **视频关联**: 点击播放按钮观看对应时间段的视频片段
5. **多格式导出**: 支持导出为TXT和HTML格式

### 📝 区块类型

- **标题** (title): 文档标题
- **摘要** (abstract): 文档摘要
- **关键词** (keywords): 关键词列表
- **材料清单** (materials): 材料试剂工具设备清单
- **操作步骤** (step): 包含时间戳的操作步骤
- **其他** (unknown): 其他类型内容

## 使用流程

### 1. 生成SOP草稿
1. 上传视频文件
2. 执行语音识别（可选）
3. 执行视频理解，生成SOP草稿

### 2. 解析SOP
1. 在SOP编辑器中点击"解析SOP文档"按钮
2. 系统自动将草稿解析为结构化区块

### 3. 编辑区块
1. 在左侧编辑区(A)中编辑区块内容
2. 点击区块的"编辑"按钮进入编辑模式
3. 可以修改：
   - 文本内容
   - 开始/结束时间
   - 播放按钮显示设置

### 4. AI精修（可选）
1. 在右侧AI精修区(B)的批注框中输入修改建议
2. 点击"AI精修"按钮
3. 查看精修结果，满意后点击"应用精修"

### 5. 导出文档
1. 点击"导出TXT"生成纯文本文档
2. 点击"导出HTML"生成带视频关联的HTML文档

## 技术实现

### 后端组件

- `sop_parser_tool.py`: SOP解析工具，使用qwen3-max解析文本
- `sop_refine_tool.py`: SOP精修工具，基于用户批注精修内容
- API端点: `/parse_sop` 和 `/refine_sop`

### 前端组件

- `SOPEditor.tsx`: 主编辑器组件，双栏布局
- `SOPBlockItem.tsx`: 区块项组件，支持编辑和播放
- `SOPVideoPlayer.tsx`: 视频播放器，支持时间段播放
- `SOPExporter.tsx`: 导出组件，支持TXT和HTML格式

## 文件结构

```
chat-frontend/src/
├── types/
│   └── sop.ts                    # SOP数据类型定义
├── components/
│   ├── SOPEditor.tsx            # 主编辑器
│   ├── SOPBlockItem.tsx         # 区块项
│   ├── SOPVideoPlayer.tsx       # 视频播放器
│   └── SOPExporter.tsx          # 导出组件
└── app/
    └── page.tsx                 # 主页面（已集成）

langgraph-agent/
├── sop_parser_tool.py           # SOP解析工具
├── sop_refine_tool.py           # SOP精修工具
└── main.py                     # API端点（已更新）
```

## 配置要求

### 环境变量
- `DASHSCOPE_API_KEY`: 通义千问API密钥

### 依赖包
- 后端: `dashscope`, `langchain-core`, `fastapi`
- 前端: `react`, `next.js`, `typescript`

## 使用示例

### 1. 测试功能
```bash
cd /root/app
python test_sop_functionality.py
```

### 2. 启动服务
```bash
# 启动后端
cd langgraph-agent
python main.py

# 启动前端（另一个终端）
cd chat-frontend
npm run dev
```

### 3. 访问应用
打开浏览器访问: `http://localhost:3000`

## 注意事项

1. **视频文件**: HTML导出需要视频文件与HTML文件在同一目录下
2. **API限制**: 使用qwen3-max模型，请注意API调用频率限制
3. **浏览器兼容**: 视频播放功能需要现代浏览器支持HTML5 video
4. **文件大小**: 大型SOP文档可能需要较长的处理时间

## 故障排除

### 常见问题

1. **解析失败**: 检查API密钥配置和网络连接
2. **视频无法播放**: 确认视频文件路径正确
3. **导出失败**: 检查浏览器是否支持文件下载

### 调试方法

1. 查看浏览器控制台错误信息
2. 检查后端日志输出
3. 使用测试脚本验证功能

## 更新日志

- **v1.0.0**: 初始版本，包含基础SOP编辑功能
- 支持区块解析、编辑、AI精修和导出
- 集成视频播放和时间段关联功能



