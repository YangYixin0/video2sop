#!/bin/bash

# WebSocket配置测试脚本
# 用于验证玻尔平台WebSocket代理配置

echo "🔌 WebSocket配置测试"
echo "================================"

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检测环境类型
echo -e "\n${BLUE}🔍 环境检测${NC}"
echo "--------------------------------"

# 检查环境变量配置
if [ -f "/root/video2sop/chat-frontend/.env.local" ]; then
    if grep -q "NEXT_PUBLIC_WS_URL=/ws" /root/video2sop/chat-frontend/.env.local; then
        ENV_TYPE="production"
        echo -e "环境类型: ${GREEN}生产环境 (相对路径配置)${NC}"
    elif grep -q "NEXT_PUBLIC_WS_URL=ws://127.0.0.1:50001/ws" /root/video2sop/chat-frontend/.env.local; then
        ENV_TYPE="development"
        echo -e "环境类型: ${GREEN}开发环境 (本地配置)${NC}"
    else
        ENV_TYPE="unknown"
        echo -e "环境类型: ${YELLOW}未知配置${NC}"
    fi
else
    ENV_TYPE="unknown"
    echo -e "环境类型: ${YELLOW}无法检测 (.env.local不存在)${NC}"
fi

# 测试WebSocket连接
echo -e "\n${BLUE}🧪 WebSocket连接测试${NC}"
echo "--------------------------------"

echo "测试1: 基本WebSocket端点访问"
ws_response=$(curl --noproxy '*' -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" http://127.0.0.1:50001/ws 2>/dev/null)
if [ "$ws_response" = "101" ] || [ "$ws_response" = "400" ]; then
    echo -e "  结果: ${GREEN}✅ 端点可访问${NC} (响应码: $ws_response)"
else
    echo -e "  结果: ${RED}❌ 端点异常${NC} (响应码: $ws_response)"
fi

echo ""
echo "测试2: 完整WebSocket握手测试"
ws_handshake=$(curl --noproxy '*' -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" http://127.0.0.1:50001/ws 2>&1 | head -10)
echo "  握手响应:"
echo "$ws_handshake" | sed 's/^/    /'

echo ""
echo "测试3: 检查Nginx配置中的关键设置"
echo "--------------------------------"

# 检查proxy_cache_bypass设置
if grep -q "proxy_cache_bypass \$http_upgrade" /root/video2sop/nginx.conf; then
    echo -e "  proxy_cache_bypass: ${GREEN}✅ 已配置${NC}"
else
    echo -e "  proxy_cache_bypass: ${RED}❌ 未配置${NC}"
fi

# 检查Connection设置
if grep -q 'proxy_set_header Connection "upgrade"' /root/video2sop/nginx.conf; then
    echo -e "  Connection upgrade: ${GREEN}✅ 已配置${NC}"
else
    echo -e "  Connection upgrade: ${RED}❌ 未配置${NC}"
fi

# 检查Upgrade设置
if grep -q "proxy_set_header Upgrade \$http_upgrade" /root/video2sop/nginx.conf; then
    echo -e "  Upgrade header: ${GREEN}✅ 已配置${NC}"
else
    echo -e "  Upgrade header: ${RED}❌ 未配置${NC}"
fi

# 检查超时设置
if grep -q "proxy_connect_timeout 1800s" /root/video2sop/nginx.conf; then
    echo -e "  连接超时: ${GREEN}✅ 已配置 (1800s)${NC}"
else
    echo -e "  连接超时: ${RED}❌ 未配置或配置错误${NC}"
fi

echo ""
echo "测试4: 检查后端WebSocket服务"
echo "--------------------------------"

# 检查后端WebSocket端点
backend_ws_response=$(curl --noproxy '*' -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" http://127.0.0.1:8123/ws 2>/dev/null)
if [ "$backend_ws_response" = "101" ] || [ "$backend_ws_response" = "400" ]; then
    echo -e "  后端WebSocket: ${GREEN}✅ 可访问${NC} (响应码: $backend_ws_response)"
else
    echo -e "  后端WebSocket: ${RED}❌ 不可访问${NC} (响应码: $backend_ws_response)"
fi

echo ""
echo "📋 测试总结"
echo "================================"
echo "如果所有测试都通过，WebSocket配置应该可以正常工作。"
echo "如果仍有问题，请检查："
echo "  1. Nginx配置是否正确加载"
echo "  2. 后端服务是否正常运行"
echo "  3. 玻尔平台的代理设置"
echo ""
echo "🔧 重新加载Nginx配置："
echo "  nginx -s reload"
echo ""
echo "📝 环境特定说明："
if [ "$ENV_TYPE" = "production" ]; then
    echo -e "  ${GREEN}生产环境${NC}: 使用相对路径配置，通过玻尔平台反向代理访问"
    echo "  - WebSocket: wss://域名/ws"
    echo "  - API: https://域名/api/..."
    echo "  - 确保玻尔平台端口映射配置为50001"
elif [ "$ENV_TYPE" = "development" ]; then
    echo -e "  ${GREEN}开发环境${NC}: 使用本地配置，直接访问127.0.0.1:50001"
    echo "  - WebSocket: ws://127.0.0.1:50001/ws"
    echo "  - API: http://127.0.0.1:50001/api/..."
    echo "  - 确保本地服务正常运行"
else
    echo -e "  ${YELLOW}未知环境${NC}: 请检查.env.local文件配置"
fi

