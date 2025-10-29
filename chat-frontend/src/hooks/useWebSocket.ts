import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_ENDPOINTS } from '@/config/api';

interface WebSocketMessage {
  type: string;
  content?: string;
  status?: string;
  video_url?: string;
  audio_url?: string;
  session_id?: string;
  message?: string;
  result?: unknown;
  fps?: number;
  has_audio_context?: boolean;
  deleted_count?: number;
  tool_name?: string;
  blocks_count?: number;
  has_user_notes?: boolean;
  [key: string]: unknown;
}

interface UseWebSocketOptions {
  onMessage?: (data: WebSocketMessage) => void;
  onError?: (error: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  clientSessionId?: string;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, onError, onOpen, onClose, clientSessionId } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayRef = useRef(1000); // 初始重连延迟1秒
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

    const wsUrl = WS_ENDPOINTS.MAIN;
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
        
        // 发送客户端注册消息
        if (clientSessionId) {
          const registerMessage = {
            type: 'register',
            client_session_id: clientSessionId
          };
          ws.send(JSON.stringify(registerMessage));
          console.log('已发送客户端注册消息:', registerMessage);
        }
        
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

        // 自动重连逻辑
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelayRef.current * Math.pow(2, reconnectAttemptsRef.current); // 指数退避
          console.log(`连接断开，${delay}ms后尝试重连 (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          setError(`连接已断开，正在重连... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError(`连接已断开，重连失败 (${event.code})`);
          console.log('重连次数已达上限，需要手动重连');
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
  }, [onMessage, onError, onOpen, onClose, clientSessionId]);

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
        content: message,
        client_session_id: clientSessionId
      };
      wsRef.current.send(JSON.stringify(messageData));
      console.log('发送消息:', messageData);
    } else {
      console.warn('WebSocket 未连接，消息将在连接恢复后发送');
      // 不设置错误状态，因为会自动重连
      // 可以考虑添加消息队列机制
    }
  }, [clientSessionId]);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, []);

  useEffect(() => {
    // 立即尝试连接
    console.log('useWebSocket: 开始连接WebSocket');
    connect();

    // 定期发送心跳（仅在连接时）
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendPing();
      }
    }, 20000);

    return () => {
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
