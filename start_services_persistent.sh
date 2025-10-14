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

# 启动后端服务
echo "🔧 启动后端服务..."
cd /root/app/langgraph-agent
nohup python main.py > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   后端服务PID: $BACKEND_PID"

# 等待后端启动
sleep 3

# 检查后端是否正常启动
if curl --noproxy '*' -s http://127.0.0.1:8123/health > /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

# 启动前端服务
echo "🎨 启动前端服务..."
cd /root/app/chat-frontend

# 智能处理 .env.local 文件，保留用户自定义配置
echo "🔧 配置前端环境变量..."
if [ ! -f .env.local ]; then
    echo "📝 创建新的 .env.local 文件"
    echo "NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8123/ws" > .env.local
else
    echo "📝 检查现有 .env.local 文件"
    # 检查是否已存在 NEXT_PUBLIC_WS_URL，如果不存在则追加
    if ! grep -q "NEXT_PUBLIC_WS_URL" .env.local; then
        echo "NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8123/ws" >> .env.local
        echo "✅ 已添加 NEXT_PUBLIC_WS_URL 到现有 .env.local 文件"
    else
        echo "✅ .env.local 文件已包含 NEXT_PUBLIC_WS_URL，保持现有配置"
    fi
fi

# 构建生产版本
echo "📦 构建生产版本..."
if npm run build; then
    # 构建成功，启动生产服务器
    echo "🚀 启动生产服务器..."
    nohup npm run start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   前端服务PID: $FRONTEND_PID (生产模式)"
else
    # 构建失败，回退到开发模式
    echo "⚠️  生产构建失败，回退到开发模式..."
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "   前端服务PID: $FRONTEND_PID (开发模式)"
fi

# 等待前端启动
sleep 8

# 创建日志目录
mkdir -p /root/app/logs

# 保存PID到文件
echo "$BACKEND_PID" > /root/app/logs/backend.pid
echo "$FRONTEND_PID" > /root/app/logs/frontend.pid

echo ""
echo "🎉 App服务启动完成！"
echo "📊 服务状态："
echo "   后端: http://127.0.0.1:8123 (PID: $BACKEND_PID)"
echo "   前端: http://127.0.0.1:50001 (PID: $FRONTEND_PID)"
echo ""
echo "📝 日志文件："
echo "   后端日志: /root/app/logs/backend.log"
echo "   前端日志: /root/app/logs/frontend.log"
echo ""
echo "🛑 停止服务命令："
echo "   /root/app/stop_services.sh"
echo ""
echo "🔄 重启服务命令："
echo "   /root/app/start_services_persistent.sh"
echo ""
echo "✅ 现在您可以安全地断开远程连接，App将继续运行！"
