#!/bin/bash

echo "🚀 启动 LangGraph Agent Chat 系统"
echo "=============================================="

# 清理之前的进程
echo "🧹 清理之前的进程..."
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "npm run start" 2>/dev/null || true

# 强制清理端口占用
echo "🔍 检查端口占用..."
if netstat -tlnp 2>/dev/null | grep -q ":50001 "; then
    echo "⚠️  端口50001被占用，正在清理..."
    # 尝试多种方法获取PID
    PID=$(netstat -tlnp 2>/dev/null | grep ":50001 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
        # 如果netstat无法获取PID，使用fuser或lsof
        if command -v fuser >/dev/null 2>&1; then
            PID=$(fuser 50001/tcp 2>/dev/null)
        elif command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:50001 2>/dev/null)
        fi
    fi
    if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
        echo "🔧 终止进程 $PID"
        kill -9 $PID 2>/dev/null || true
    else
        echo "⚠️  无法获取端口50001的进程ID，尝试强制清理nginx进程"
        pkill -f nginx 2>/dev/null || true
    fi
fi

if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "⚠️  端口3000被占用，正在清理..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":3000 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
        if command -v fuser >/dev/null 2>&1; then
            PID=$(fuser 3000/tcp 2>/dev/null)
        elif command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:3000 2>/dev/null)
        fi
    fi
    if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
        echo "🔧 终止进程 $PID"
        kill -9 $PID 2>/dev/null || true
    else
        echo "⚠️  无法获取端口3000的进程ID，尝试强制清理前端进程"
        pkill -f "next" 2>/dev/null || true
    fi
fi

if netstat -tlnp 2>/dev/null | grep -q ":8123 "; then
    echo "⚠️  端口8123被占用，正在清理..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":8123 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
        if command -v fuser >/dev/null 2>&1; then
            PID=$(fuser 8123/tcp 2>/dev/null)
        elif command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:8123 2>/dev/null)
        fi
    fi
    if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
        echo "🔧 终止进程 $PID"
        kill -9 $PID 2>/dev/null || true
    else
        echo "⚠️  无法获取端口8123的进程ID，尝试强制清理后端进程"
        pkill -f "uvicorn" 2>/dev/null || true
    fi
fi

sleep 3

# 检查环境变量
if [ ! -f "/root/video2sop/.env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请先配置 .env 文件，设置 DASHSCOPE_API_KEY等环境变量"
    exit 1
fi

# 检查 API 密钥
if ! grep -q "DASHSCOPE_API_KEY=sk-" /root/video2sop/.env; then
    echo "⚠️  警告: 请确保在 .env 文件中设置了有效的 DASHSCOPE_API_KEY"
    echo "当前配置:"
    grep "DASHSCOPE_API_KEY" /root/video2sop/.env | head -1
fi

# 检查 OSS 配置
echo "🔧 检查OSS配置..."
oss_missing=false

if ! grep -q "OSS_ACCESS_KEY_ID=" /root/video2sop/.env || grep -q "OSS_ACCESS_KEY_ID=your_oss_access_key_id" /root/video2sop/.env; then
    echo "❌ 错误: 未找到有效的 OSS_ACCESS_KEY_ID"
    oss_missing=true
fi

if ! grep -q "OSS_ACCESS_KEY_SECRET=" /root/video2sop/.env || grep -q "OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret" /root/video2sop/.env; then
    echo "❌ 错误: 未找到有效的 OSS_ACCESS_KEY_SECRET"
    oss_missing=true
fi

if ! grep -q "OSS_ENDPOINT=" /root/video2sop/.env || grep -q "OSS_ENDPOINT=your_oss_endpoint" /root/video2sop/.env; then
    echo "❌ 错误: 未找到有效的 OSS_ENDPOINT"
    oss_missing=true
fi

if ! grep -q "OSS_BUCKET_NAME=" /root/video2sop/.env || grep -q "OSS_BUCKET_NAME=your_bucket_name" /root/video2sop/.env; then
    echo "❌ 错误: 未找到有效的 OSS_BUCKET_NAME"
    oss_missing=true
fi

if [ "$oss_missing" = true ]; then
    echo "❌ 错误: OSS 配置不完整，请检查 .env 文件中的 OSS 相关配置"
    echo "必需的 OSS 配置项:"
    echo "  - OSS_ACCESS_KEY_ID"
    echo "  - OSS_ACCESS_KEY_SECRET"
    echo "  - OSS_ENDPOINT"
    echo "  - OSS_BUCKET_NAME"
    exit 1
else
    echo "✅ OSS 配置检查通过"
fi

echo "📦 安装后端依赖..."
cd /root/video2sop/langgraph-agent
if pip install -r requirements.txt > /dev/null 2>&1; then
    echo "✅ 后端依赖安装成功"
else
    echo "❌ 后端依赖安装失败"
    exit 1
fi

echo "📦 安装前端依赖..."
cd /root/video2sop/chat-frontend
if npm install > /dev/null 2>&1; then
    echo "✅ 前端依赖安装成功"
else
    echo "❌ 前端依赖安装失败"
    exit 1
fi

echo "🔧 配置环境变量..."
# 智能处理 .env.local 文件，保留用户自定义配置
if [ ! -f .env.local ]; then
    echo "📝 创建新的 .env.local 文件"
    cat > .env.local << EOF
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:50001/ws
NEXT_PUBLIC_API_URL=http://127.0.0.1:50001
NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT=600000
NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT=300000
NEXT_PUBLIC_SPEECH_RECOGNITION_TIMEOUT=300000
NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT=1800000
NEXT_PUBLIC_SOP_PARSE_TIMEOUT=1200000
NEXT_PUBLIC_SOP_REFINE_TIMEOUT=1200000
EOF
else
    echo "📝 检查现有 .env.local 文件"
    # 检查并添加必要的环境变量
    if ! grep -q "NEXT_PUBLIC_WS_URL" .env.local; then
        echo "NEXT_PUBLIC_WS_URL=ws://127.0.0.1:50001/ws" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_WS_URL 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_WS_URL，保持现有配置"
    fi
    
    if ! grep -q "NEXT_PUBLIC_API_URL" .env.local; then
        echo "NEXT_PUBLIC_API_URL=http://127.0.0.1:50001" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_API_URL 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_API_URL，保持现有配置"
    fi
    
    if ! grep -q "NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT" .env.local; then
        echo "NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT=1800000" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT，保持现有配置"
    fi
    
    if ! grep -q "NEXT_PUBLIC_SPEECH_RECOGNITION_TIMEOUT" .env.local; then
        echo "NEXT_PUBLIC_SPEECH_RECOGNITION_TIMEOUT=300000" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_SPEECH_RECOGNITION_TIMEOUT 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_SPEECH_RECOGNITION_TIMEOUT，保持现有配置"
    fi
    
    if ! grep -q "NEXT_PUBLIC_SOP_PARSE_TIMEOUT" .env.local; then
        echo "NEXT_PUBLIC_SOP_PARSE_TIMEOUT=1200000" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_SOP_PARSE_TIMEOUT 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_SOP_PARSE_TIMEOUT，保持现有配置"
    fi
    
    if ! grep -q "NEXT_PUBLIC_SOP_REFINE_TIMEOUT" .env.local; then
        echo "NEXT_PUBLIC_SOP_REFINE_TIMEOUT=1200000" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_SOP_REFINE_TIMEOUT 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_SOP_REFINE_TIMEOUT，保持现有配置"
    fi
    
    if ! grep -q "NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT" .env.local; then
        echo "NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT=600000" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT，保持现有配置"
    fi
    
    if ! grep -q "NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT" .env.local; then
        echo "NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT=300000" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT，保持现有配置"
    fi
fi

# 安装 Node.js 和 npm（如果未安装）
echo "🔧 检查Node.js和npm..."
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "📦 安装Node.js和npm..."
    apt-get update -qq && apt-get install -y nodejs npm > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Node.js和npm安装成功"
        node --version
        npm --version
    else
        echo "❌ Node.js和npm安装失败"
        exit 1
    fi
else
    echo "✅ Node.js和npm已安装"
    node --version
    npm --version
fi

# 安装 FFmpeg（如果未安装）
echo "🔧 检查FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "📦 安装FFmpeg..."
    apt-get update -qq && apt-get install -y ffmpeg > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ FFmpeg安装成功"
        ffmpeg -version | head -1
    else
        echo "❌ FFmpeg安装失败"
        exit 1
    fi
else
    echo "✅ FFmpeg已安装"
    ffmpeg -version | head -1
fi

# 安装和启动 Nginx（如果未安装）
echo "🔧 安装和配置Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "📦 安装Nginx..."
    apt-get update -qq && apt-get install -y nginx > /dev/null 2>&1
fi

echo "📝 配置Nginx..."
cp /root/video2sop/nginx.conf /etc/nginx/nginx.conf

echo "🚀 启动Nginx..."
nginx -t && nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx启动成功"
else
    echo "❌ Nginx启动失败"
    exit 1
fi

echo "🌐 启动后端服务 (端口 8123)..."
cd /root/video2sop/langgraph-agent
python main.py &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务启动..."
for i in {1..10}; do
    if curl -s --noproxy '*' http://127.0.0.1:8123/api/health > /dev/null 2>&1; then
        echo "✅ 后端服务启动成功"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ 后端服务启动失败"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

echo "🎨 启动前端服务 (端口 3000)..."
cd /root/video2sop/chat-frontend
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
echo "⏳ 等待前端服务启动..."
for i in {1..15}; do
    if curl -s --noproxy '*' http://127.0.0.1:3000 > /dev/null 2>&1; then
        echo "✅ 前端服务启动成功"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "❌ 前端服务启动失败"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    sleep 2
done

echo ""
echo "✅ 所有服务启动完成！"
echo "=============================================="
echo "🌐 访问地址: http://127.0.0.1:50001 (通过Nginx)"
echo "🔧 内部服务:"
echo "   - 前端: http://127.0.0.1:3000 (开发模式)"
echo "   - 后端: http://127.0.0.1:8123"
echo "📊 健康检查: http://127.0.0.1:50001/api/health"
echo ""
echo "💡 使用提示:"
echo "   - 如果浏览器无法访问，请尝试使用 --no-proxy 参数"
echo "   - 确保防火墙允许访问端口 8123 和 50001"
echo "   - 如果 WebSocket 连接失败，请点击聊天面板中的'重连'按钮"
echo ""
echo "🔍 调试信息:"
echo "   - 后端 PID: $BACKEND_PID"
echo "   - 前端 PID: $FRONTEND_PID"
echo ""
echo "🛑 按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ 服务已停止'; exit 0" INT

# 保持脚本运行
while true; do
    sleep 1
    # 检查进程是否还在运行
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ 后端服务意外停止"
        kill $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ 前端服务意外停止"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
done
