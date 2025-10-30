#!/bin/bash

echo "🚀 启动 Video2SOP 系统"
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

# 首先尝试优雅停止nginx
if command -v nginx >/dev/null 2>&1; then
    echo "🛑 优雅停止Nginx..."
    nginx -s stop 2>/dev/null || true
    sleep 2
fi

# 强制清理所有相关进程
echo "🧹 强制清理所有相关进程..."
pkill -f "python main.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "npm run start" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f nginx 2>/dev/null || true

# 等待进程完全退出
sleep 3

# 检查并强制清理端口占用
cleanup_port() {
    local port=$1
    local service_name=$2
    local process_pattern=$3
    
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo "⚠️  端口${port}仍被占用，强制清理..."
        
    # 尝试多种方法获取PID
        local PID=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
        if command -v fuser >/dev/null 2>&1; then
                PID=$(fuser ${port}/tcp 2>/dev/null)
        elif command -v lsof >/dev/null 2>&1; then
                PID=$(lsof -ti:${port} 2>/dev/null)
            fi
        fi
        
    if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
            echo "🔧 强制终止进程 $PID (端口 $port)"
            # 终止进程组
            kill -9 -$PID 2>/dev/null || kill -9 $PID 2>/dev/null || true
    fi
        
        # 如果还有残留，强制清理进程模式
        if [ ! -z "$process_pattern" ]; then
            echo "🔧 强制清理 $service_name 进程"
            pkill -9 -f "$process_pattern" 2>/dev/null || true
    fi
        
        # 再次等待
        sleep 2
        
        # 最终检查
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo "❌ 端口 $port 清理失败，请手动检查"
            return 1
        else
            echo "✅ 端口 $port 清理成功"
        fi
    else
        echo "✅ 端口 $port 未被占用"
    fi
    return 0
}

# 清理各个端口
cleanup_port 50001 "Nginx" "nginx"
cleanup_port 3000 "前端" "next"
cleanup_port 8123 "后端" "uvicorn"

# 最终等待
sleep 2

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

echo "🔧 配置环境变量（开发环境）..."
# 检查是否存在开发环境配置文件
if [ -f .env.development ]; then
    echo "📝 使用开发环境配置文件 .env.development"
    # 复制开发环境配置到 .env.local（Next.js 会优先使用 .env.local）
    cp .env.development .env.local
    echo "✅ 已应用开发环境配置"
else
    echo "❌ 错误: 开发环境配置文件 .env.development 不存在"
    exit 1
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
