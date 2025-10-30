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

# 配置相对路径（玻尔平台反向代理机制）
echo "🔗 配置相对路径..."
echo "✅ 使用相对路径 - 兼容玻尔平台反向代理机制"

# 启动前端服务
echo "🎨 启动前端服务..."
cd /root/video2sop/chat-frontend

# 配置前端环境变量（生产环境）
echo "🔧 配置前端环境变量（生产环境）..."

# 检查是否存在生产环境配置文件
if [ -f .env.production ]; then
    echo "📝 使用生产环境配置文件 .env.production"
    # 复制生产环境配置到 .env.local（Next.js 会优先使用 .env.local）
    cp .env.production .env.local
    echo "✅ 已应用生产环境配置"
else
    echo "❌ 错误: 生产环境配置文件 .env.production 不存在"
    exit 1
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
