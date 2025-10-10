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
  const isConnectingRef = useRef(false);

  const connect = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket 已连接或正在连接中，跳过重复连接');
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8123/ws';
    console.log('尝试连接 WebSocket:', wsUrl);
    
    isConnectingRef.current = true;
    setError(null);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket 连接已建立');
        setIsConnected(true);
        setError(null);
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
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket 错误:', event);
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
    if (wsRef.current) {
      wsRef.current.close(1000, '主动断开连接');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    isConnectingRef.current = false;
    setError(null);
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
      disconnect();
    };
  }, [connect, disconnect, sendPing]);

  return {
    isConnected,
    error,
    sendMessage,
    sendPing,
    connect,
    disconnect
  };
}
