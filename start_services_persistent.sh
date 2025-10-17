#!/bin/bash

# App服务持久化启动脚本
# 这个脚本确保App在断开远程连接后继续运行

echo "🚀 启动App持久化服务..."

# 设置工作目录
cd /root/video2sop

# 停止可能存在的旧进程
echo "📋 停止旧进程..."
pkill -f "python main.py" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm run start" 2>/dev/null
pkill -f "next start" 2>/dev/null
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "next-server" 2>/dev/null

# 强制清理端口占用
echo "🔍 检查端口占用..."
if netstat -tlnp 2>/dev/null | grep -q ":50001 "; then
    echo "⚠️  端口50001被占用，正在清理..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":50001 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
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

# 等待进程完全停止
sleep 3

# 创建日志目录
mkdir -p /root/video2sop/logs

# 检查环境变量
if [ ! -f "/root/video2sop/.env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请先配置 .env 文件，设置 DASHSCOPE_API_KEY 和 OSS 配置"
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

# 安装和配置Nginx
echo "🔧 安装和配置Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "📦 安装Nginx..."
    apt-get update -qq
    apt-get install -y nginx
fi

# 复制Nginx配置文件
echo "📝 配置Nginx..."
cp /root/video2sop/nginx.conf /etc/nginx/nginx.conf

# 创建Nginx日志目录
mkdir -p /var/log/nginx

# 启动Nginx
echo "🚀 启动Nginx..."
nginx -t && nginx
echo "✅ Nginx启动成功"

# 获取生产服务器IP地址
echo "🌐 获取生产服务器IP地址..."
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    echo "⚠️  无法获取服务器IP，使用默认地址 127.0.0.1"
    SERVER_IP="127.0.0.1"
else
    echo "✅ 检测到服务器IP: $SERVER_IP"
fi

# 配置安全协议（玻尔平台使用HTTPS，所以使用WSS/HTTPS）
echo "🔒 配置安全协议..."
WS_PROTOCOL="wss"
HTTP_PROTOCOL="https"
echo "✅ 使用安全协议 (WSS/HTTPS) - 兼容玻尔平台HTTPS环境"

# 启动前端服务
echo "🎨 启动前端服务..."
cd /root/video2sop/chat-frontend

# 智能处理 .env.local 文件，使用生产服务器IP地址和安全协议
echo "🔧 配置前端环境变量（使用生产服务器IP: $SERVER_IP，协议: $WS_PROTOCOL/$HTTP_PROTOCOL）..."
if [ ! -f .env.local ]; then
    echo "📝 创建新的 .env.local 文件（使用生产服务器IP: $SERVER_IP，安全协议）"
    cat > .env.local << EOF
NEXT_PUBLIC_WS_URL=$WS_PROTOCOL://$SERVER_IP:50001/ws
NEXT_PUBLIC_API_URL=$HTTP_PROTOCOL://$SERVER_IP:50001
NEXT_PUBLIC_VIDEO_UNDERSTANDING_TIMEOUT=1800000
NEXT_PUBLIC_SPEECH_RECOGNITION_TIMEOUT=300000
NEXT_PUBLIC_SOP_PARSE_TIMEOUT=1200000
NEXT_PUBLIC_SOP_REFINE_TIMEOUT=1200000
NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT=600000
NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT=300000
EOF
else
    echo "📝 更新现有 .env.local 文件（使用生产服务器IP: $SERVER_IP，安全协议）"
    
    # 创建临时文件来更新配置
    cp .env.local .env.local.backup
    
    # 更新或添加 NEXT_PUBLIC_WS_URL
    if grep -q "NEXT_PUBLIC_WS_URL" .env.local; then
        sed -i "s|NEXT_PUBLIC_WS_URL=.*|NEXT_PUBLIC_WS_URL=$WS_PROTOCOL://$SERVER_IP:50001/ws|" .env.local
        echo "✅ 已更新 NEXT_PUBLIC_WS_URL 为 $WS_PROTOCOL://$SERVER_IP:50001/ws"
    else
        echo "NEXT_PUBLIC_WS_URL=$WS_PROTOCOL://$SERVER_IP:50001/ws" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_WS_URL 到现有 .env.local 文件"
    fi
    
    # 更新或添加 NEXT_PUBLIC_API_URL
    if grep -q "NEXT_PUBLIC_API_URL" .env.local; then
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$HTTP_PROTOCOL://$SERVER_IP:50001|" .env.local
        echo "✅ 已更新 NEXT_PUBLIC_API_URL 为 $HTTP_PROTOCOL://$SERVER_IP:50001"
    else
        echo "NEXT_PUBLIC_API_URL=$HTTP_PROTOCOL://$SERVER_IP:50001" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_API_URL 到现有 .env.local 文件"
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

# 构建生产版本
echo "📦 构建生产版本..."
if npm run build; then
    # 构建成功，启动生产服务器
    echo "🚀 启动生产服务器..."
    npm run start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   前端服务PID: $FRONTEND_PID (生产模式)"
else
    # 构建失败，回退到开发模式
    echo "⚠️  生产构建失败，回退到开发模式..."
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   前端服务PID: $FRONTEND_PID (开发模式)"
fi

# 等待前端启动
sleep 8

# 保存前端PID到文件
echo "$FRONTEND_PID" > /root/video2sop/logs/frontend.pid

# 启动后端服务（作为主进程，保持脚本运行）
echo "🔧 启动后端服务..."
cd /root/video2sop/langgraph-agent

echo ""
echo "🎉 App服务启动完成！"
echo "📊 服务状态："
echo "   Nginx: http://127.0.0.1:50001 (反向代理)"
echo "   前端: http://127.0.0.1:3000 (内部)"
echo "   后端: http://127.0.0.1:8123 (内部)"
echo ""
echo "📝 日志文件："
echo "   前端日志: /root/video2sop/logs/frontend.log"
echo "   后端日志: /root/video2sop/logs/backend.log"
echo "   Nginx日志: /var/log/nginx/access.log, /var/log/nginx/error.log"
echo ""
echo "✅ 后端服务将作为主进程运行，保持容器存活..."

# 启动后端服务作为主进程（前台运行）
# 这样脚本会一直运行，直到后端服务停止
python main.py
