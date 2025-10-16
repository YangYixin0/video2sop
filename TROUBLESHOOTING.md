# 故障排除指南

## WebSocket 连接问题

### 问题描述
如果前端显示"未连接"状态或出现 WebSocket 错误，可能是以下原因：

### 常见错误：客户端连接数持续增加
**症状**: 后端日志显示客户端连接数不断增加，前端报错 "WebSocket 错误: {}"

**原因**: 前端重连逻辑过于激进，导致大量连接尝试

**解决方案**:
1. 使用修复版启动脚本: `./start_services_fixed.sh`
2. 点击聊天面板中的"重连"按钮手动重连
3. 检查后端服务是否正常运行

### 解决方案

#### 1. 检查服务状态
```bash
# 检查后端服务
curl -I --noproxy '*' http://127.0.0.1:8123/health

# 检查前端服务
curl -I --noproxy '*' http://127.0.0.1:50001
```

#### 2. 代理问题
如果系统中有代理服务器（如 Privoxy），WebSocket 连接可能被拦截：

**解决方案 A: 使用 127.0.0.1 而不是 localhost**
```bash
# 修改前端环境变量
echo "NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8123/ws" > /root/video2sop/chat-frontend/.env.local
```

**解决方案 B: 在浏览器中禁用代理**
- Chrome: 设置 → 高级 → 系统 → 打开代理设置
- Firefox: 设置 → 网络设置 → 不使用代理

#### 3. 端口冲突
检查端口是否被占用：
```bash
netstat -tlnp | grep -E "(8123|50001)"
```

#### 4. 防火墙问题
确保防火墙允许访问：
```bash
# Ubuntu/Debian
ufw allow 8123
ufw allow 50001

# CentOS/RHEL
firewall-cmd --add-port=8123/tcp --permanent
firewall-cmd --add-port=50001/tcp --permanent
firewall-cmd --reload
```

#### 5. 手动测试 WebSocket 连接
```bash
cd /root/video2sop/langgraph-agent
python -c "
import asyncio
import websockets
import json

async def test_ws():
    try:
        uri = 'ws://127.0.0.1:8123/ws'
        async with websockets.connect(uri) as websocket:
            print('✅ WebSocket 连接成功')
            await websocket.send(json.dumps({'type': 'ping'}))
            response = await websocket.recv()
            print('✅ 收到响应:', response)
    except Exception as e:
        print('❌ WebSocket 连接失败:', e)

asyncio.run(test_ws())
"
```

## 环境变量配置

### 必需的配置
在 `/root/video2sop/.env` 文件中：
```env
DASHSCOPE_API_KEY=your_dashscope_api_key_here
```

### 可选的 LangSmith 配置
```env
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-agent-chat
```

## 常见错误

### 1. "DASHSCOPE_API_KEY environment variable is required"
- 确保在 `.env` 文件中设置了有效的 API 密钥
- 重启后端服务

### 2. "WebSocket 连接错误"
- 检查后端服务是否正在运行
- 尝试使用 `127.0.0.1` 而不是 `localhost`
- 检查防火墙设置

### 3. "连接失败，已达到最大重连次数"
- 检查网络连接
- 重启后端服务
- 清除浏览器缓存

## 调试技巧

### 1. 查看后端日志
后端服务会在控制台输出详细的连接和错误信息。

### 2. 查看浏览器控制台
打开浏览器开发者工具，查看 Console 标签页中的错误信息。

### 3. 网络调试
在浏览器开发者工具的 Network 标签页中查看 WebSocket 连接状态。

## 重启服务

如果遇到问题，可以重启所有服务：

**推荐方式（修复版）**:
```bash
cd /root/video2sop
./start_services_fixed.sh
```

**手动方式**:
```bash
# 停止所有服务
pkill -f "uvicorn main:app"
pkill -f "next dev"

# 重新启动
cd /root/video2sop
./start_services.sh
```

## 连接测试

使用测试工具检查连接状态：
```bash
cd /root/video2sop
python tests/test_connection.py
```

测试工具会检查：
- HTTP 后端连接
- HTTP 前端连接  
- WebSocket 连接
- 聊天功能

## 联系支持

如果以上解决方案都无法解决问题，请提供：
1. 错误日志
2. 系统信息
3. 网络配置
4. 浏览器版本
