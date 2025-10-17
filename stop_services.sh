#!/bin/bash

# App服务停止脚本

echo "🛑 停止App服务..."

# 停止后端服务
if [ -f /root/video2sop/logs/backend.pid ]; then
    BACKEND_PID=$(cat /root/video2sop/logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ 后端服务已停止 (PID: $BACKEND_PID)"
    else
        echo "⚠️  后端服务进程不存在"
    fi
    rm -f /root/video2sop/logs/backend.pid
else
    echo "⚠️  后端服务PID文件不存在"
fi

# 停止前端服务
if [ -f /root/video2sop/logs/frontend.pid ]; then
    FRONTEND_PID=$(cat /root/video2sop/logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ 前端服务已停止 (PID: $FRONTEND_PID)"
    else
        echo "⚠️  前端服务进程不存在"
    fi
    rm -f /root/video2sop/logs/frontend.pid
else
    echo "⚠️  前端服务PID文件不存在"
fi

# 停止Nginx
echo "🛑 停止Nginx..."
nginx -s stop 2>/dev/null || true

# 强制清理可能残留的进程
pkill -f "python main.py" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm run start" 2>/dev/null
pkill -f "next start" 2>/dev/null
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "next-server" 2>/dev/null

# 强制清理端口占用
echo "🔍 强制清理端口占用..."
if netstat -tlnp 2>/dev/null | grep -q ":50001 "; then
    echo "⚠️  强制清理端口50001..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":50001 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
        if command -v fuser >/dev/null 2>&1; then
            PID=$(fuser 50001/tcp 2>/dev/null)
        elif command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:50001 2>/dev/null)
        fi
    fi
    if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
        echo "🔧 强制终止进程 $PID"
        kill -9 $PID 2>/dev/null || true
    else
        echo "⚠️  强制清理nginx进程"
        pkill -9 -f nginx 2>/dev/null || true
    fi
fi

if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "⚠️  强制清理端口3000..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":3000 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
        if command -v fuser >/dev/null 2>&1; then
            PID=$(fuser 3000/tcp 2>/dev/null)
        elif command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:3000 2>/dev/null)
        fi
    fi
    if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
        echo "🔧 强制终止进程 $PID"
        kill -9 $PID 2>/dev/null || true
    else
        echo "⚠️  强制清理前端进程"
        pkill -9 -f "next" 2>/dev/null || true
    fi
fi

if netstat -tlnp 2>/dev/null | grep -q ":8123 "; then
    echo "⚠️  强制清理端口8123..."
    PID=$(netstat -tlnp 2>/dev/null | grep ":8123 " | awk '{print $7}' | cut -d'/' -f1)
    if [ -z "$PID" ] || [ "$PID" = "-" ]; then
        if command -v fuser >/dev/null 2>&1; then
            PID=$(fuser 8123/tcp 2>/dev/null)
        elif command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:8123 2>/dev/null)
        fi
    fi
    if [ ! -z "$PID" ] && [ "$PID" != "-" ]; then
        echo "🔧 强制终止进程 $PID"
        kill -9 $PID 2>/dev/null || true
    else
        echo "⚠️  强制清理后端进程"
        pkill -9 -f "uvicorn" 2>/dev/null || true
    fi
fi

echo "🎉 所有服务已停止"
