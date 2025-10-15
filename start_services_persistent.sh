#!/bin/bash

# App服务持久化启动脚本
# 这个脚本确保App在断开远程连接后继续运行

echo "🚀 启动App持久化服务..."

# 设置工作目录
cd /root/app

# 停止可能存在的旧进程
echo "📋 停止旧进程..."
pkill -f "python main.py" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm run start" 2>/dev/null
pkill -f "next start" 2>/dev/null

# 等待进程完全停止
sleep 2

# 创建日志目录
mkdir -p /root/app/logs

# 安装和配置Nginx
echo "🔧 安装和配置Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "📦 安装Nginx..."
    apt-get update -qq
    apt-get install -y nginx
fi

# 复制Nginx配置文件
echo "📝 配置Nginx..."
cp /root/app/nginx.conf /etc/nginx/nginx.conf

# 创建Nginx日志目录
mkdir -p /var/log/nginx

# 启动Nginx
echo "🚀 启动Nginx..."
nginx -t && nginx
echo "✅ Nginx启动成功"

# 启动前端服务
echo "🎨 启动前端服务..."
cd /root/app/chat-frontend

# 智能处理 .env.local 文件，保留用户自定义配置
echo "🔧 配置前端环境变量..."
if [ ! -f .env.local ]; then
    echo "📝 创建新的 .env.local 文件"
    cat > .env.local << EOF
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:50001/ws
NEXT_PUBLIC_API_URL=http://127.0.0.1:50001
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
echo "$FRONTEND_PID" > /root/app/logs/frontend.pid

# 启动后端服务（作为主进程，保持脚本运行）
echo "🔧 启动后端服务..."
cd /root/app/langgraph-agent

echo ""
echo "🎉 App服务启动完成！"
echo "📊 服务状态："
echo "   Nginx: http://127.0.0.1:50001 (反向代理)"
echo "   前端: http://127.0.0.1:3000 (内部)"
echo "   后端: http://127.0.0.1:8123 (内部)"
echo ""
echo "📝 日志文件："
echo "   前端日志: /root/app/logs/frontend.log"
echo "   后端日志: /root/app/logs/backend.log"
echo "   Nginx日志: /var/log/nginx/access.log, /var/log/nginx/error.log"
echo ""
echo "✅ 后端服务将作为主进程运行，保持容器存活..."

# 启动后端服务作为主进程（前台运行）
# 这样脚本会一直运行，直到后端服务停止
python main.py
