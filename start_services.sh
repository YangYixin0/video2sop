#!/bin/bash

echo "🚀 启动 LangGraph Agent Chat 系统"
echo "=================================="

# 检查环境变量
if [ ! -f "/root/app/.env" ]; then
    echo "❌ 错误: 未找到 .env 文件"
    echo "请先配置 .env 文件，设置 DASHSCOPE_API_KEY"
    exit 1
fi

# 检查 API 密钥
if ! grep -q "DASHSCOPE_API_KEY=sk-" /root/app/.env; then
    echo "⚠️  警告: 请确保在 .env 文件中设置了有效的 DASHSCOPE_API_KEY"
fi

echo "📦 安装后端依赖..."
cd /root/app/langgraph-agent
pip install -r requirements.txt

echo "📦 安装前端依赖..."
cd /root/app/chat-frontend
npm install

echo "🔧 配置环境变量..."
# 确保使用正确的 WebSocket URL
echo "NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8123/ws" > .env.local

echo "🌐 启动后端服务 (端口 8123)..."
cd /root/app/langgraph-agent
python main.py &
BACKEND_PID=$!

# 等待后端启动
sleep 3

echo "🎨 启动前端服务 (端口 50001)..."
cd /root/app/chat-frontend
npm run dev &
FRONTEND_PID=$!

# 等待前端启动
sleep 5

echo ""
echo "✅ 服务启动完成！"
echo "=================================="
echo "🌐 前端地址: http://127.0.0.1:50001"
echo "🔧 后端地址: http://127.0.0.1:8123"
echo "📊 健康检查: http://127.0.0.1:8123/health"
echo ""
echo "💡 提示:"
echo "   - 如果浏览器无法访问，请尝试使用 --no-proxy 参数"
echo "   - 确保防火墙允许访问端口 8123 和 50001"
echo "   - 检查浏览器控制台是否有 WebSocket 连接错误"
echo ""
echo "🛑 按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT
wait
