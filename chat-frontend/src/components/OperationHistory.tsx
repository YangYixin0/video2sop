'use client';

import React, { useEffect, useRef } from 'react';

export interface OperationRecord {
  id: string;
  type: 'upload' | 'speech_recognition' | 'file_removed' | 'video_understanding';
  timestamp: Date;
  status: 'success' | 'error' | 'processing';
  message: string;
  data?: {
    video_url?: string;
    audio_url?: string;
    session_id?: string;
    deleted_count?: number;
    speech_result?: unknown;
    video_result?: string;
    fps?: number;
    has_audio_context?: boolean;
  };
}

interface OperationHistoryProps {
  records: OperationRecord[];
  isConnected?: boolean;
}

export default function OperationHistory({ records, isConnected = true }: OperationHistoryProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [records]);

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getOperationIcon = (type: OperationRecord['type']) => {
    switch (type) {
      case 'upload':
        return '📁';
      case 'speech_recognition':
        return '🎤';
      case 'video_understanding':
        return '🎬';
      case 'file_removed':
        return '🗑️';
      default:
        return '📝';
    }
  };

  const getStatusColor = (status: OperationRecord['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'processing':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: OperationRecord['status']) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'processing':
        return '⏳';
      default:
        return '📝';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">操作记录</h2>
        <div className="flex items-center space-x-3">
          {/* 连接状态指示器 */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`}></div>
            <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {records.length} 条记录
          </div>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {records.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">📝</div>
            <p>暂无操作记录</p>
            <p className="text-sm mt-1">上传视频或执行语音识别后将显示记录</p>
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {/* 操作头部 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getOperationIcon(record.type)}</span>
                  <span className="font-medium text-gray-800">
                    {record.type === 'upload' && '视频上传'}
                    {record.type === 'speech_recognition' && '语音识别'}
                    {record.type === 'video_understanding' && '视频理解'}
                    {record.type === 'file_removed' && '文件删除'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm">{getStatusIcon(record.status)}</span>
                  <span className={`text-xs ${getStatusColor(record.status)}`}>
                    {record.status === 'success' && '成功'}
                    {record.status === 'error' && '失败'}
                    {record.status === 'processing' && '处理中'}
                  </span>
                </div>
              </div>

              {/* 操作消息 */}
              <p className="text-sm text-gray-700 mb-2">{record.message}</p>


              {/* 删除统计（仅删除操作） */}
              {record.type === 'file_removed' && record.data?.deleted_count !== undefined && (
                <div className="text-xs text-gray-600 mb-2">
                  共删除 {record.data.deleted_count} 个文件
                </div>
              )}

              {/* 时间戳 */}
              <div className="text-xs text-gray-500">
                {formatTimestamp(record.timestamp)}
              </div>
            </div>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
