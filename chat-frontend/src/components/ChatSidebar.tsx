'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatSidebar() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isConnected, error, connect } = useWebSocket({
    onMessage: (data) => {
        if (data.type === 'chunk') {
          // 更新最后一条消息的内容
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.type === 'assistant' && data.content) {
              lastMessage.content = data.content;
              return newMessages;
            }
            return prev;
          });
      } else if (data.type === 'complete') {
        setIsTyping(false);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.type === 'assistant' && data.content) {
            lastMessage.content = data.content;
          }
          return newMessages;
        });
      } else if (data.type === 'status' && data.status === 'processing') {
        setIsTyping(true);
      } else if (data.type === 'error') {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            type: 'assistant',
            content: `错误: ${data.content}`,
            timestamp: new Date()
          }
        ]);
      }
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReconnect = () => {
    console.log('用户点击重连按钮');
    connect();
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || !isConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 添加占位的 AI 消息
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMessage]);
    
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">AI 助手</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isConnected ? '已连接' : '未连接'}
          </span>
          {!isConnected && (
            <button
              onClick={handleReconnect}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重连
            </button>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {/* 输入中指示器 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "输入消息..." : "连接中..."}
            disabled={!isConnected}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
