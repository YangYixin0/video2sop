# WebSocket 反复重连问题修复方案

## 🔍 问题分析

**症状**:
- 前端不断尝试重连 WebSocket
- 后端日志显示大量连接和断开
- 前端显示"未连接"状态，持续重连

**根本原因**:
1. 前端重连逻辑过于激进
2. 缺乏连接状态管理
3. 组件重新渲染导致重复连接
4. 网络问题导致连接不稳定

## 🛠️ 修复方案

### 1. 创建无自动重连版本

创建了 `useWebSocketNoAutoReconnect.ts`，完全禁用自动重连：

```typescript
// 主要特性:
- 禁用自动重连
- 添加连接状态管理 (isConnectingRef)
- 防止重复连接
- 只保留手动重连功能
```

### 2. 连接状态管理

```typescript
const isConnectingRef = useRef(false);

const connect = useCallback(() => {
  if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
    console.log('WebSocket 已连接或正在连接中，跳过重复连接');
    return;
  }
  // ... 连接逻辑
}, []);
```

### 3. 手动重连按钮

在聊天面板头部添加重连按钮：

```typescript
{!isConnected && (
  <button
    onClick={connect}
    className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
  >
    重连
  </button>
)}
```

## 📊 修复效果

### 修复前:
```
INFO:     127.0.0.1:40488 - "WebSocket /ws" [accepted]
INFO:     connection open
INFO:     connection closed
INFO:     127.0.0.1:40494 - "WebSocket /ws" [accepted]
INFO:     connection open
INFO:     connection closed
客户端已连接，当前连接数: 1
客户端已断开，当前连接数: 0
客户端已连接，当前连接数: 1
客户端已断开，当前连接数: 0
// ... 大量重复连接
```

### 修复后:
```
INFO:     127.0.0.1:40522 - "WebSocket /ws" [accepted]
INFO:     connection open
// 连接稳定，不再反复重连
```

## 🚀 使用方法

### 1. 启动服务
```bash
cd /root/app
./start_services_fixed.sh
```

### 2. 访问应用
- 前端: http://127.0.0.1:50001
- 如果显示"未连接"，点击"重连"按钮

### 3. 测试连接
```bash
python test_connection.py
```

## 🔧 技术细节

### 连接管理策略
1. **延迟连接**: 组件加载后延迟2秒连接
2. **状态检查**: 连接前检查是否已连接或正在连接
3. **手动重连**: 连接失败后需要用户手动点击重连
4. **心跳检测**: 每30秒发送一次心跳（仅在连接时）

### 错误处理
```typescript
ws.onclose = (event) => {
  console.log('WebSocket 连接已关闭:', event.code, event.reason);
  setIsConnected(false);
  wsRef.current = null;
  isConnectingRef.current = false;
  onClose?.();
  
  // 不自动重连，只设置错误状态
  if (event.code !== 1000) {
    setError(`连接已断开 (${event.code})`);
  }
};
```

## 📝 文件变更

### 新增文件:
- `useWebSocketNoAutoReconnect.ts`: 无自动重连版本

### 修改文件:
- `ChatSidebar.tsx`: 使用新的 WebSocket Hook
- `start_services_fixed.sh`: 改进的启动脚本

## 🎯 最佳实践

1. **避免自动重连**: 在网络不稳定的环境中，自动重连可能导致更多问题
2. **用户控制**: 让用户决定何时重连
3. **状态清晰**: 明确显示连接状态
4. **错误提示**: 提供清晰的错误信息

## ✅ 验证方法

1. 启动服务后等待2分钟
2. 检查后端日志，应该没有大量重复连接
3. 前端应该显示稳定连接状态
4. 如果连接断开，点击重连按钮应该能正常重连

现在系统应该不会再出现反复重连的问题了！
