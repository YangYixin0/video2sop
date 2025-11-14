'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import Icon from './Icon';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCall?: {
    name: string;
    status: 'running' | 'completed';
    message?: string;
  };
  isToolResult?: boolean;
  uploadResult?: {
    video_url: string;
    audio_url: string;
    session_id: string;
  };
  removeResult?: {
    session_id: string;
    deleted_count: number;
  };
}

// 生成唯一 ID 的辅助函数
const generateMessageId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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
            // 如果有工具调用，标记为已完成
            if (lastMessage.toolCall) {
              lastMessage.toolCall.status = 'completed';
            }
          }
          return newMessages;
        });
      } else if (data.type === 'tool_call') {
        // 添加工具调用消息
        const toolMessage: Message = {
          id: generateMessageId('tool'),
          type: 'assistant',
          content: data.message || '正在处理...',
          timestamp: new Date(),
          toolCall: {
            name: data.tool_name || '',
            status: (data.status === 'running' || data.status === 'completed') ? data.status : 'running',
            message: data.message || ''
          }
        };
        setMessages(prev => [...prev, toolMessage]);
      } else if (data.type === 'status' && data.status === 'processing') {
        setIsTyping(true);
      } else if (data.type === 'error') {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: generateMessageId('error'),
            type: 'assistant',
            content: `错误: ${data.content}`,
            timestamp: new Date()
          }
        ]);
      } else if (data.type === 'upload_complete') {
        // 处理上传完成通知
        const uploadMessage: Message = {
          id: generateMessageId('upload'),
          type: 'system',
          content: data.message || '视频和音频上传完成！',
          timestamp: new Date(),
          uploadResult: {
            video_url: data.video_url || '',
            audio_url: data.audio_url || '',
            session_id: data.session_id || ''
          }
        };
        setMessages(prev => [...prev, uploadMessage]);
      } else if (data.type === 'file_removed') {
        // 处理文件删除通知
        const removeMessage: Message = {
          id: generateMessageId('remove'),
          type: 'system',
          content: data.message || '上传的文件已从服务器删除',
          timestamp: new Date(),
          removeResult: {
            session_id: data.session_id || '',
            deleted_count: data.deleted_count || 0
          }
        };
        setMessages(prev => [...prev, removeMessage]);
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
      id: generateMessageId('user'),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // 添加占位的 AI 消息
    const aiMessage: Message = {
      id: generateMessageId('ai'),
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
                  : message.type === 'system'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : message.toolCall
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {/* 系统消息标识 */}
              {message.type === 'system' && (
                <div className="flex items-center space-x-2 mb-2">
                  {message.removeResult ? (
                    <>
                      <Icon name="trash" size={20} inline />
                      <span className="text-xs font-medium">文件删除</span>
                    </>
                  ) : (
                    <>
                      <Icon name="upload" size={20} inline />
                      <span className="text-xs font-medium">文件上传</span>
                    </>
                  )}
                </div>
              )}

              {/* 工具调用标识 */}
              {message.toolCall && (
                <div className="flex items-center space-x-2 mb-2">
                  <Icon name="microphone" size={20} inline />
                  <span className="text-xs font-medium">
                    {message.toolCall.name === 'speech_recognition' ? '语音识别' : message.toolCall.name}
                  </span>
                  {message.toolCall.status === 'running' && (
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1 h-1 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-sm whitespace-pre-wrap font-mono">{message.content}</p>
              
              {/* 上传结果链接 */}
              {message.uploadResult && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs">
                    <strong>视频:</strong> 
                    <a 
                      href={message.uploadResult.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      查看视频
                    </a>
                  </div>
                  <div className="text-xs">
                    <strong>音频:</strong> 
                    <a 
                      href={message.uploadResult.audio_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-1"
                    >
                      下载音频
                    </a>
                  </div>
                </div>
              )}
              
              <p className={`text-xs mt-1 ${
                message.type === 'user' 
                  ? 'text-blue-100' 
                  : message.type === 'system'
                  ? 'text-green-600'
                  : message.toolCall 
                  ? 'text-yellow-600' 
                  : 'text-gray-500'
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
