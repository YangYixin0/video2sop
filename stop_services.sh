#!/bin/bash

# App服务停止脚本

echo "🛑 停止App服务..."

# 停止后端服务
if [ -f /root/app/logs/backend.pid ]; then
    BACKEND_PID=$(cat /root/app/logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    else
        echo "⚠️  后端服务进程不存在"
    fi
    rm -f /root/app/logs/backend.pid
else
    echo "⚠️  后端服务PID文件不存在"
fi

# 停止前端服务
if [ -f /root/app/logs/frontend.pid ]; then
    FRONTEND_PID=$(cat /root/app/logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    else
        echo "⚠️  前端服务进程不存在"
    fi
    rm -f /root/app/logs/frontend.pid
else
    echo "⚠️  前端服务PID文件不存在"
fi

# 强制清理可能残留的进程
pkill -f "python main.py" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null

echo "🎉 所有服务已停止"
