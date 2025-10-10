import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  content?: string;
  status?: string;
}

interface UseWebSocketOptions {
  onMessage?: (data: WebSocketMessage) => void;
  onError?: (error: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onError, onOpen, onClose } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 1;
  const reconnectDelay = 10000;
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket 已连接或正在连接中，跳过重复连接');
      return;
    }

    // 如果有现有连接，先关闭
    if (wsRef.current) {
      console.log('关闭现有连接');
      wsRef.current.close(1000, '准备重连');
      wsRef.current = null;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8123/ws';
    console.log('尝试连接 WebSocket:', wsUrl);
    console.log('环境变量 NEXT_PUBLIC_WS_URL:', process.env.NEXT_PUBLIC_WS_URL);
    
    isConnectingRef.current = true;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket 连接已建立');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('收到消息:', data);
          onMessage?.(data);
        } catch (err) {
          console.error('解析消息失败:', err);
          setError('消息解析失败');
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket 连接已关闭:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        isConnectingRef.current = false;
        onClose?.();

        // 不自动重连，只设置错误状态
        if (event.code !== 1000) {
          setError(`连接已断开 (${event.code})`);
          console.log('连接断开，需要手动重连');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket 错误:', event);
        console.error('WebSocket URL:', wsUrl);
        setError(`WebSocket 连接错误: ${wsUrl}`);
        isConnectingRef.current = false;
        onError?.(`WebSocket 连接错误: ${wsUrl}`);
      };

    } catch (err) {
      console.error('创建 WebSocket 连接失败:', err);
      setError('无法创建 WebSocket 连接');
      isConnectingRef.current = false;
    }
  }, [onMessage, onError, onOpen, onClose]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, '主动断开连接');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = maxReconnectAttempts; // 阻止自动重连
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        type: 'message',
        content: message
      };
      wsRef.current.send(JSON.stringify(messageData));
      console.log('发送消息:', messageData);
    } else {
      console.error('WebSocket 未连接，无法发送消息');
      setError('WebSocket 未连接');
    }
  }, []);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  useEffect(() => {
    // 延迟连接，避免组件加载时立即连接
    const connectTimeout = setTimeout(() => {
      connect();
    }, 2000);

    // 定期发送心跳（仅在连接时）
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendPing();
      }
    }, 30000);

    return () => {
      clearTimeout(connectTimeout);
      clearInterval(pingInterval);
      // 不主动断开连接，让连接自然保持
    };
  }, [connect, sendPing]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    sendPing,
    connect,
    disconnect
  };
}
