'use client';

import React, { useEffect, useRef, useState } from 'react';
import FeedbackModal from './FeedbackModal';
import SubscribeModal from './SubscribeModal';
import { API_ENDPOINTS } from '@/config/api';
import { SOPBlock } from '@/types/sop';
import { useStatusI18n } from '@/utils/statusMap';
import { useI18n } from '@/i18n';
import Icon, { IconName } from './Icon';

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

  const getOperationIcon = (type: OperationRecord['type']): IconName => {
    switch (type) {
      case 'upload':
        return 'upload';
      case 'speech_recognition':
        return 'microphone';
      case 'video_understanding':
        return 'video';
      case 'video_compression':
        return 'compress';
      case 'sop_parse':
        return 'clipboard';
      case 'sop_refine':
        return 'sparkles';
      case 'file_removed':
        return 'trash';
      default:
        return 'edit';
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

  const getStatusIcon = (status: OperationRecord['status']): IconName => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'processing':
        return 'waiting';
      default:
        return 'edit';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* 头部 */}
      <div className="p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-900">{t('common.operation_history')}</h2>
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
            <Icon name="notifications" size={16} inline />
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
                  className="px-1 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                  title={t('common.notification_test_title')}
                >
                  {t('common.test')}
                </button>
                <button
                  onClick={onNotificationDisable}
                  className="px-1 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  title={t('common.disable_notifications')}
                >
                  {t('common.disable')}
                </button>
                <button
                  onClick={onNotificationSimulate}
                  className="px-1 py-0.5 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                  title={t('common.simulate_notifications')}
                >
                  {t('common.simulate')}
                </button>
              </>
            ) : (
              <button
                onClick={onNotificationToggle}
                className="px-1 py-0.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
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
            className="flex-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
          >
            {t('common.report_issue')}
          </button>
          <button 
            onClick={() => setShowSubscribe(true)}
            className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
          >
            {t('common.subscribe_updates')}
          </button>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {records.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <Icon name="edit" size={48} className="mb-2 mx-auto" />
            <p>{t('common.no_records')}</p>
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="bg-gray-50 rounded-lg p-2 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {/* 操作头部 */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <Icon name={getOperationIcon(record.type)} size={20} inline />
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
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(record.timestamp)}
                  </span>
                  <Icon name={getStatusIcon(record.status)} size={16} inline />
                </div>
              </div>

              {/* 操作消息 */}
              <p className="text-sm text-gray-700 mb-1">
                {getMessage(record.data?.stage || '', record.message, record.message)}
              </p>


              {/* 删除统计（仅删除操作） */}
              {record.type === 'file_removed' && record.data?.deleted_count !== undefined && (
                <div className="text-xs text-gray-600">
                  {t('common.deleted_count', { count: record.data.deleted_count as number })}
                </div>
              )}
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
