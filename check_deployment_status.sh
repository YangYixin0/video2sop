#!/bin/bash

# 部署后状态检查脚本
# 用于检查Video2SOP在玻尔生产环境中的运行状态

echo "🔍 Video2SOP 部署状态检查"
echo "================================"

# 设置颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_status() {
    local service_name="$1"
    local check_command="$2"
    local expected_result="$3"
    
    echo -n "检查 $service_name: "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 正常${NC}"
        return 0
    else
        echo -e "${RED}❌ 异常${NC}"
        return 1
    fi
}

# 1. 检查进程状态
echo -e "\n${BLUE}📊 进程状态检查${NC}"
echo "--------------------------------"

# 检查Nginx进程
if pgrep -f "nginx" > /dev/null; then
    echo -e "Nginx: ${GREEN}✅ 运行中${NC}"
    nginx_pid=$(pgrep -f "nginx" | head -1)
    echo "  PID: $nginx_pid"
else
    echo -e "Nginx: ${RED}❌ 未运行${NC}"
fi

# 检查前端进程
if pgrep -f "next" > /dev/null; then
    echo -e "前端服务: ${GREEN}✅ 运行中${NC}"
    frontend_pid=$(pgrep -f "next" | head -1)
    echo "  PID: $frontend_pid"
else
    echo -e "前端服务: ${RED}❌ 未运行${NC}"
fi

# 检查后端进程
if pgrep -f "python main.py" > /dev/null; then
    echo -e "后端服务: ${GREEN}✅ 运行中${NC}"
    backend_pid=$(pgrep -f "python main.py" | head -1)
    echo "  PID: $backend_pid"
else
    echo -e "后端服务: ${RED}❌ 未运行${NC}"
fi

# 2. 检查端口监听
echo -e "\n${BLUE}🔌 端口监听检查${NC}"
echo "--------------------------------"

# 检查50001端口（Nginx）
if netstat -tlnp 2>/dev/null | grep -q ":50001 "; then
    echo -e "端口 50001 (Nginx): ${GREEN}✅ 监听中${NC}"
    netstat -tlnp 2>/dev/null | grep ":50001 " | head -1
else
    echo -e "端口 50001 (Nginx): ${RED}❌ 未监听${NC}"
fi

# 检查3000端口（前端）
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo -e "端口 3000 (前端): ${GREEN}✅ 监听中${NC}"
    netstat -tlnp 2>/dev/null | grep ":3000 " | head -1
else
    echo -e "端口 3000 (前端): ${RED}❌ 未监听${NC}"
fi

# 检查8123端口（后端）
if netstat -tlnp 2>/dev/null | grep -q ":8123 "; then
    echo -e "端口 8123 (后端): ${GREEN}✅ 监听中${NC}"
    netstat -tlnp 2>/dev/null | grep ":8123 " | head -1
else
    echo -e "端口 8123 (后端): ${RED}❌ 未监听${NC}"
fi

# 3. 检查服务健康状态
echo -e "\n${BLUE}🏥 服务健康检查${NC}"
echo "--------------------------------"

# 检查Nginx健康状态
echo -n "Nginx健康检查: "
if curl --noproxy '*' -s -o /dev/null -w "%{http_code}" http://127.0.0.1:50001/ | grep -q "200"; then
    echo -e "${GREEN}✅ 正常 (200)${NC}"
else
    echo -e "${RED}❌ 异常${NC}"
    echo "  响应: $(curl --noproxy '*' -s -o /dev/null -w "%{http_code}" http://127.0.0.1:50001/)"
fi

# 检查后端API健康状态
echo -n "后端API健康检查: "
api_response=$(curl --noproxy '*' -s http://127.0.0.1:50001/api/health 2>/dev/null)
if echo "$api_response" | grep -q "healthy"; then
    echo -e "${GREEN}✅ 正常${NC}"
    echo "  响应: $api_response"
else
    echo -e "${RED}❌ 异常${NC}"
    echo "  响应: $api_response"
fi

# 检查前端页面
echo -n "前端页面检查: "
frontend_response=$(curl --noproxy '*' -s -o /dev/null -w "%{http_code}" http://127.0.0.1:50001/ 2>/dev/null)
if [ "$frontend_response" = "200" ]; then
    echo -e "${GREEN}✅ 正常 (200)${NC}"
else
    echo -e "${RED}❌ 异常${NC}"
    echo "  响应码: $frontend_response"
fi

# 4. 检查WebSocket连接
echo -e "\n${BLUE}🔌 WebSocket连接检查${NC}"
echo "--------------------------------"

echo -n "WebSocket端点检查: "
ws_response=$(curl --noproxy '*' -s -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" http://127.0.0.1:50001/ws 2>/dev/null)
if [ "$ws_response" = "101" ] || [ "$ws_response" = "400" ]; then
    echo -e "${GREEN}✅ 端点可访问${NC}"
    echo "  响应码: $ws_response (101=升级成功, 400=需要WebSocket握手)"
else
    echo -e "${RED}❌ 端点异常${NC}"
    echo "  响应码: $ws_response"
fi

# 5. 检查环境变量配置
echo -e "\n${BLUE}⚙️ 环境变量检查${NC}"
echo "--------------------------------"

# 检查.env文件
if [ -f "/root/video2sop/.env" ]; then
    echo -e ".env文件: ${GREEN}✅ 存在${NC}"
    
    # 检查关键配置
    if grep -q "DASHSCOPE_API_KEY=sk-" /root/video2sop/.env; then
        echo -e "  DASHSCOPE_API_KEY: ${GREEN}✅ 已配置${NC}"
    else
        echo -e "  DASHSCOPE_API_KEY: ${RED}❌ 未配置或无效${NC}"
    fi
    
    if grep -q "OSS_ACCESS_KEY_ID=" /root/video2sop/.env && ! grep -q "OSS_ACCESS_KEY_ID=your_oss_access_key_id" /root/video2sop/.env; then
        echo -e "  OSS配置: ${GREEN}✅ 已配置${NC}"
    else
        echo -e "  OSS配置: ${RED}❌ 未配置或使用默认值${NC}"
    fi
else
    echo -e ".env文件: ${RED}❌ 不存在${NC}"
fi

# 检查前端环境变量
if [ -f "/root/video2sop/chat-frontend/.env.local" ]; then
    echo -e ".env.local文件: ${GREEN}✅ 存在${NC}"
    
    if grep -q "NEXT_PUBLIC_WS_URL=ws://127.0.0.1:50001/ws" /root/video2sop/chat-frontend/.env.local; then
        echo -e "  WebSocket URL: ${GREEN}✅ 正确配置${NC}"
    else
        echo -e "  WebSocket URL: ${RED}❌ 配置错误${NC}"
    fi
    
    if grep -q "NEXT_PUBLIC_API_URL=http://127.0.0.1:50001" /root/video2sop/chat-frontend/.env.local; then
        echo -e "  API URL: ${GREEN}✅ 正确配置${NC}"
    else
        echo -e "  API URL: ${RED}❌ 配置错误${NC}"
    fi
else
    echo -e ".env.local文件: ${RED}❌ 不存在${NC}"
fi

# 6. 检查日志文件
echo -e "\n${BLUE}📝 日志文件检查${NC}"
echo "--------------------------------"

# 检查日志目录
if [ -d "/root/video2sop/logs" ]; then
    echo -e "日志目录: ${GREEN}✅ 存在${NC}"
    
    # 检查前端日志
    if [ -f "/root/video2sop/logs/frontend.log" ]; then
        echo -e "  前端日志: ${GREEN}✅ 存在${NC}"
        echo "    大小: $(du -h /root/video2sop/logs/frontend.log | cut -f1)"
        echo "    最后修改: $(stat -c %y /root/video2sop/logs/frontend.log 2>/dev/null | cut -d' ' -f1-2)"
    else
        echo -e "  前端日志: ${RED}❌ 不存在${NC}"
    fi
    
    # 检查后端日志
    if [ -f "/root/video2sop/logs/backend.log" ]; then
        echo -e "  后端日志: ${GREEN}✅ 存在${NC}"
        echo "    大小: $(du -h /root/video2sop/logs/backend.log | cut -f1)"
        echo "    最后修改: $(stat -c %y /root/video2sop/logs/backend.log 2>/dev/null | cut -d' ' -f1-2)"
    else
        echo -e "  后端日志: ${RED}❌ 不存在${NC}"
    fi
else
    echo -e "日志目录: ${RED}❌ 不存在${NC}"
fi

# 检查Nginx日志
if [ -f "/var/log/nginx/error.log" ]; then
    echo -e "  Nginx错误日志: ${GREEN}✅ 存在${NC}"
    echo "    大小: $(du -h /var/log/nginx/error.log | cut -f1)"
    echo "    最后修改: $(stat -c %y /var/log/nginx/error.log 2>/dev/null | cut -d' ' -f1-2)"
else
    echo -e "  Nginx错误日志: ${RED}❌ 不存在${NC}"
fi

# 7. 检查Nginx配置
echo -e "\n${BLUE}⚙️ Nginx配置检查${NC}"
echo "--------------------------------"

if nginx -t 2>/dev/null; then
    echo -e "Nginx配置: ${GREEN}✅ 语法正确${NC}"
else
    echo -e "Nginx配置: ${RED}❌ 语法错误${NC}"
    nginx -t 2>&1 | head -5
fi

# 8. 检查磁盘空间
echo -e "\n${BLUE}💾 系统资源检查${NC}"
echo "--------------------------------"

# 检查磁盘空间
disk_usage=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$disk_usage" -lt 80 ]; then
    echo -e "磁盘空间: ${GREEN}✅ 充足 (${disk_usage}% 使用)${NC}"
else
    echo -e "磁盘空间: ${YELLOW}⚠️ 不足 (${disk_usage}% 使用)${NC}"
fi

# 检查内存使用
memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$memory_usage" -lt 80 ]; then
    echo -e "内存使用: ${GREEN}✅ 正常 (${memory_usage}% 使用)${NC}"
else
    echo -e "内存使用: ${YELLOW}⚠️ 较高 (${memory_usage}% 使用)${NC}"
fi

# 9. 总结
echo -e "\n${BLUE}📋 检查总结${NC}"
echo "================================"

# 统计检查结果
total_checks=0
passed_checks=0

# 这里可以添加更详细的统计逻辑
echo -e "${GREEN}✅ 检查完成${NC}"
echo ""
echo "🔧 如果发现问题，请检查："
echo "  1. 服务进程是否正常运行"
echo "  2. 端口是否正确监听"
echo "  3. 环境变量是否正确配置"
echo "  4. 日志文件中的错误信息"
echo "  5. Nginx配置是否正确"
echo ""
echo "📞 如需进一步诊断，请运行："
echo "  tail -f /root/video2sop/logs/frontend.log"
echo "  tail -f /root/video2sop/logs/backend.log"
echo "  tail -f /var/log/nginx/error.log"
