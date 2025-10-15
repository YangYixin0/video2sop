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
    PID=$(netstat -tlnp 2>/dev/null | grep ":50001 " | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
    fi
fi

if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "⚠️  端口3000被占用，正在清理..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":3000 " | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
    fi
fi

if netstat -tlnp 2>/dev/null | grep -q ":8123 "; then
    echo "⚠️  端口8123被占用，正在清理..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":8123 " | awk '{print $7}' | cut -d'/' -f1)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
    fi
fi

sleep 3

# 检查环境变量
if [ ! -f "/root/app/.env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请先配置 .env 文件，设置 DASHSCOPE_API_KEY"
    exit 1
fi

# 检查 API 密钥
if ! grep -q "DASHSCOPE_API_KEY=sk-" /root/app/.env; then
    echo "⚠️  警告: 请确保在 .env 文件中设置了有效的 DASHSCOPE_API_KEY"
    echo "当前配置:"
    grep "DASHSCOPE_API_KEY" /root/app/.env | head -1
fi

echo "📦 安装后端依赖..."
cd /root/app/langgraph-agent
pip install -r requirements.txt > /dev/null 2>&1

echo "📦 安装前端依赖..."
cd /root/app/chat-frontend
npm install > /dev/null 2>&1

echo "🔧 配置环境变量..."
# 智能处理 .env.local 文件，保留用户自定义配置
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

# 安装和启动 Nginx（如果未安装）
echo "🔧 安装和配置Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "📦 安装Nginx..."
    apt-get update -qq && apt-get install -y nginx > /dev/null 2>&1
fi

echo "📝 配置Nginx..."
cp /root/app/nginx.conf /etc/nginx/nginx.conf

echo "🚀 启动Nginx..."
nginx -t && nginx
if [ $? -eq 0 ]; then
    echo "✅ Nginx启动成功"
else
    echo "❌ Nginx启动失败"
    exit 1
fi

echo "🌐 启动后端服务 (端口 8123)..."
cd /root/app/langgraph-agent
python main.py &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务启动..."
for i in {1..10}; do
    if curl -s --noproxy '*' http://127.0.0.1:8123/health > /dev/null 2>&1; then
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
cd /root/app/chat-frontend
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
