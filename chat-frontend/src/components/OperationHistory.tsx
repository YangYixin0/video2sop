'use client';

import React, { useEffect, useRef, useState } from 'react';
import FeedbackModal from './FeedbackModal';
import SubscribeModal from './SubscribeModal';
import { API_ENDPOINTS } from '@/config/api';
import { SOPBlock } from '@/types/sop';
import { useStatusI18n } from '@/utils/statusMap';
import { useI18n } from '@/i18n';

export interface OperationRecord {
  id: string;
  type: 'upload' | 'speech_recognition' | 'file_removed' | 'video_understanding' | 'video_compression' | 'sop_parse' | 'sop_refine';
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
    blocks_count?: number;
    has_user_notes?: boolean;
    stage?: string;
    segment_id?: number;
    time_range?: string;
  };
}

interface OperationHistoryProps {
  records: OperationRecord[];
  isConnected?: boolean;
  onReconnect?: () => void;
  notificationEnabled?: boolean;
  onNotificationToggle?: () => void;
  onNotificationTest?: () => void;
  onNotificationDisable?: () => void;
  onNotificationSimulate?: () => void;
  currentUploadResult?: {
    video_url: string;
    audio_url: string;
    session_id: string;
  } | null;
  speechRecognitionResult?: {
    sentence_id: number;
    text: string;
  }[] | null;
  videoUnderstandingResult?: string;
  videoUnderstandingPrompt?: string;
  clientSessionId?: string;
  sopBlocks?: SOPBlock[];
  refinedSopBlocks?: SOPBlock[];
  sopParsePrompt?: string;
  sopRefinePrompt?: string;
  systemResources?: {
    cpu_count: number;
    cpu_percent: number;
    memory_total_gb: number;
    memory_percent: number;
  } | null;
}

export default function OperationHistory({ 
  records, 
  isConnected = true, 
  onReconnect,
  notificationEnabled = false,
  onNotificationToggle,
  onNotificationTest,
  onNotificationDisable,
  onNotificationSimulate,
  currentUploadResult,
  speechRecognitionResult,
  videoUnderstandingResult,
  videoUnderstandingPrompt,
  clientSessionId,
  sopBlocks,
  refinedSopBlocks,
  sopParsePrompt,
  sopRefinePrompt,
  systemResources
}: OperationHistoryProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const { getMessage } = useStatusI18n();
  const { t, locale } = useI18n();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [records]);

  const handleMarkVideoKeep = async (sessionId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.MARK_SESSION_KEEP_VIDEO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          client_session_id: clientSessionId
        }),
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error('标记视频保留失败');
      }

      console.log('视频已标记为保留');
    } catch (error) {
      console.error('标记视频保留失败:', error);
      alert('标记视频保留失败，请重试');
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-CN', {
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
      case 'video_compression':
        return '🗜️';
      case 'sop_parse':
        return '📋';
      case 'sop_refine':
        return '✨';
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
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">{t('common.operation_history')}</h2>
          <div className="flex items-center space-x-3">
            {/* 连接状态指示器 */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isConnected ? 'animate-pulse' : ''}`}></div>
                <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected 
                    ? (systemResources 
                        ? t('common.connected_resources', {
                            cpu_count: systemResources.cpu_count,
                            cpu_percent: systemResources.cpu_percent,
                            memory_total_gb: systemResources.memory_total_gb,
                            memory_percent: systemResources.memory_percent
                          })
                        : t('common.connected'))
                    : t('common.disconnected')
                  }
                </span>
              </div>
              {!isConnected && onReconnect && (
                <button
                  onClick={onReconnect}
                  className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  {t('common.reconnect')}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* 通知设置 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm">🔔</span>
            <span className="text-xs text-gray-600">
              {notificationEnabled ? t('common.enabled') : t('common.notifications_not_enabled')}
            </span>
            {notificationEnabled && (
              <>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-orange-600">{t('common.notifications_may_not_work')}</span>
              </>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {notificationEnabled ? (
              <>
                <button
                  onClick={onNotificationTest}
                  className="px-1 py-0.5 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                  title={t('common.notification_test_title')}
                >
                  {t('common.test')}
                </button>
                <button
                  onClick={onNotificationDisable}
                  className="px-1 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                  title={t('common.disable_notifications')}
                >
                  {t('common.disable')}
                </button>
                <button
                  onClick={onNotificationSimulate}
                  className="px-1 py-0.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
                  title={t('common.simulate_notifications')}
                >
                  {t('common.simulate')}
                </button>
              </>
            ) : (
              <button
                onClick={onNotificationToggle}
                className="px-1 py-0.5 bg-blue-400 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                title={t('common.enable_notifications')}
              >
                {t('common.enable')}
              </button>
            )}
          </div>
        </div>
        
        {/* 反馈和订阅按钮 */}
        <div className="mt-2 flex space-x-2">
          <button 
            onClick={() => setShowFeedback(true)} 
            className="flex-2 px-3 py-1.5 bg-blue-400 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            {t('common.report_issue')}
          </button>
          <button 
            onClick={() => setShowSubscribe(true)}
            className="flex-1 px-3 py-1.5 bg-blue-400 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            {t('common.subscribe_updates')}
          </button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {records.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">📝</div>
            <p>{t('common.no_records')}</p>
            <p className="text-sm mt-1">{t('common.upload_to_show_records')}</p>
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
                    {record.type === 'upload' && t('types.upload')}
                    {record.type === 'speech_recognition' && t('types.speech_recognition')}
                    {record.type === 'video_understanding' && t('types.video_understanding')}
                    {record.type === 'video_compression' && t('types.video_compression')}
                    {record.type === 'sop_parse' && t('types.sop_parse')}
                    {record.type === 'sop_refine' && t('types.sop_refine')}
                    {record.type === 'file_removed' && t('types.file_removed')}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm">{getStatusIcon(record.status)}</span>
                  <span className={`text-xs ${getStatusColor(record.status)}`}>
                    {record.status === 'success' && t('status_label.success')}
                    {record.status === 'error' && t('status_label.error')}
                    {record.status === 'processing' && t('status_label.processing')}
                  </span>
                </div>
              </div>

              {/* 操作消息 */}
              <p className="text-sm text-gray-700 mb-2">
                {getMessage(record.data?.stage || '', record.message, record.message)}
              </p>


              {/* 删除统计（仅删除操作） */}
              {record.type === 'file_removed' && record.data?.deleted_count !== undefined && (
                <div className="text-xs text-gray-600 mb-2">
                  {t('common.deleted_count', { count: record.data.deleted_count as number })}
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
      
      {/* 反馈Modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        onMarkVideoKeep={handleMarkVideoKeep}
        sessionData={{
          includeVideoLinks: false,
          sessionId: currentUploadResult?.session_id,
          clientSessionId: clientSessionId,
          uploadResult: currentUploadResult,
          speechRecognitionResult: speechRecognitionResult,
          videoUnderstandingResult: videoUnderstandingResult,
          videoUnderstandingPrompt: videoUnderstandingPrompt,
          operationRecords: records,
          sopBlocks: sopBlocks || [],
          refinedSopBlocks: refinedSopBlocks || [],
          sopParsePrompt: sopParsePrompt,
          sopRefinePrompt: sopRefinePrompt
        }}
      />
      
      {/* 订阅Modal */}
      <SubscribeModal
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
      />
    </div>
  );
}
