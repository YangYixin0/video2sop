'use client';

import React, { useState, useCallback } from 'react';
import OperationHistory, { OperationRecord } from '@/components/OperationHistory';
import ResizableLayout from '@/components/ResizableLayout';
import VideoUploader from '@/components/VideoUploader';
import SpeechRecognitionPanel from '@/components/SpeechRecognitionPanel';
import VideoUnderstandingPanel from '@/components/VideoUnderstandingPanel';
import SOPEditor from '@/components/SOPEditor';
import { useWebSocket } from '@/hooks/useWebSocket';
import { SOPBlock } from '@/types/sop';
import { notificationManager } from '@/utils/notifications';

export default function Home() {
  // 生成唯一的客户端会话ID
  const [clientSessionId] = useState(() => {
    // 兼容性更好的UUID生成方法
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // 降级方案：使用时间戳和随机数生成唯一ID
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  });
  
  // 全局状态管理
  const [currentUploadResult, setCurrentUploadResult] = useState<{
    video_url: string;
    audio_url: string;
    session_id: string;
  } | null>(null);
  
  const [operationRecords, setOperationRecords] = useState<OperationRecord[]>([]);
  const [speechRecognitionResult, setSpeechRecognitionResult] = useState<{
    sentence_id: number;
    text: string;
    begin_time: number;
    end_time: number;
  }[] | null>(null);
  
  const [videoUnderstandingResult, setVideoUnderstandingResult] = useState<string>('');
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  // WebSocket消息处理函数
  const handleWebSocketMessage = useCallback((data: { 
    type: string; 
    [key: string]: unknown;
  }) => {
    if (data.type === 'upload_complete') {
      // 发送通知
      if (notificationEnabled) {
        notificationManager.sendNotification(
          '📁 视频上传完成',
          '视频和音频文件已成功上传，可以进行语音识别',
          undefined,
          true
        );
      }

      // 更新当前上传结果状态
      setCurrentUploadResult({
        video_url: (data.video_url as string) || '',
        audio_url: (data.audio_url as string) || '',
        session_id: (data.session_id as string) || ''
      });
      
      // 注意：不在这里添加操作记录，因为onUploadComplete回调已经处理了
      // 这避免了重复的操作记录
    } else if (data.type === 'file_removed') {
      // 清空当前上传结果状态
      setCurrentUploadResult(null);
      
      // 注意：不在这里添加操作记录，因为onFileRemoved回调已经处理了
      // 这避免了重复的操作记录
    } else if (data.type === 'speech_recognition_complete') {
      // 发送通知
      if (notificationEnabled) {
        notificationManager.sendNotification(
          '🎤 语音识别完成',
          '音频转录已完成，可以进行视频理解分析',
          undefined,
          true
        );
      }

      // 添加语音识别记录
      const speechRecord: OperationRecord = {
        id: `speech-${Date.now()}`,
        type: 'speech_recognition',
        timestamp: new Date(),
        status: 'success',
        message: (data.message as string) || '语音识别已执行',
        data: {
          speech_result: data.result as string
        }
      };
      setOperationRecords(prev => [...prev, speechRecord]);
    } else if (data.type === 'video_understanding_complete') {
      // 发送通知
      if (notificationEnabled) {
        notificationManager.sendNotification(
          '🎬 视频理解完成',
          '视频分析已完成，SOP草稿已生成，可以进行解析',
          undefined,
          true
        );
      }

      // 添加视频理解记录
      const videoRecord: OperationRecord = {
        id: `video-${Date.now()}`,
        type: 'video_understanding',
        timestamp: new Date(),
        status: 'success',
        message: (data.message as string) || '视频理解已执行',
        data: {
          video_result: typeof data.result === 'string' ? data.result : String(data.result),
          fps: data.fps as number | undefined,
          has_audio_context: data.has_audio_context as boolean | undefined
        }
      };
      setOperationRecords(prev => [...prev, videoRecord]);
      
      // 保存视频理解结果
      if (typeof data.result === 'string') {
        setVideoUnderstandingResult(data.result);
      }
    } else if (data.type === 'sop_parse_complete') {
      // 发送通知
      if (notificationEnabled) {
        notificationManager.sendNotification(
          '📋 SOP解析完成',
          'SOP文档已解析为结构化区块，可以进行编辑和精修',
          undefined,
          true
        );
      }

      // 添加SOP解析记录
      const parseRecord: OperationRecord = {
        id: `parse-${Date.now()}`,
        type: 'sop_parse',
        timestamp: new Date(),
        status: 'success',
        message: (data.message as string) || 'SOP解析完成',
        data: {
          blocks_count: data.blocks_count as number
        }
      };
      setOperationRecords(prev => [...prev, parseRecord]);
    } else if (data.type === 'sop_refine_complete') {
      // 发送通知
      if (notificationEnabled) {
        notificationManager.sendNotification(
          '✨ SOP精修完成',
          'AI精修已完成，文档质量已提升，可以导出最终版本',
          undefined,
          true
        );
      }

      // 添加SOP精修记录
      const refineRecord: OperationRecord = {
        id: `refine-${Date.now()}`,
        type: 'sop_refine',
        timestamp: new Date(),
        status: 'success',
        message: (data.message as string) || 'SOP精修完成',
        data: {
          blocks_count: data.blocks_count as number,
          has_user_notes: data.has_user_notes as boolean
        }
      };
      setOperationRecords(prev => [...prev, refineRecord]);
    }
  }, [notificationEnabled]);

  // WebSocket 连接用于接收操作记录
  const { isConnected: wsConnected, sendMessage: sendWebSocketMessage, connect: reconnectWebSocket } = useWebSocket({
    onMessage: handleWebSocketMessage,
    clientSessionId: clientSessionId
  });

  // 初始化通知权限
  React.useEffect(() => {
    const initNotifications = async () => {
      const enabled = await notificationManager.initialize();
      setNotificationEnabled(enabled);
    };
    
    initNotifications();

    // 监听页面可见性变化
    notificationManager.onVisibilityChange((visible) => {
      console.log('页面可见性变化:', visible);
    });

    // 监听窗口焦点变化
    notificationManager.onFocusChange((focused) => {
      console.log('窗口焦点变化:', focused);
    });

  }, []);

  // 处理VideoUploader的WebSocket消息
  const handleVideoUploaderWebSocketMessage = (message: Record<string, unknown>) => {
    console.log('handleVideoUploaderWebSocketMessage:', message, 'wsConnected:', wsConnected);
    if (sendWebSocketMessage && wsConnected) {
      console.log('发送WebSocket消息:', JSON.stringify(message));
      sendWebSocketMessage(JSON.stringify(message));
    } else {
      console.log('无法发送WebSocket消息 - 连接状态:', wsConnected, 'sendMessage函数:', !!sendWebSocketMessage);
    }
  };

  // 语音识别处理函数
  const handleSpeechRecognition = async (audioUrl: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8123/speech_recognition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          client_session_id: clientSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const speechResults = result.result || [];
      
      // 保存语音识别结果到state
      setSpeechRecognitionResult(speechResults);
      
      return speechResults;
    } catch (error) {
      console.error('语音识别失败:', error);
      throw error;
    }
  };

  // 视频理解处理函数
  const handleVideoUnderstanding = async (params: {
    video_url: string;
    prompt: string;
    fps: number;
    audio_transcript?: string;
  }) => {
    try {
      const response = await fetch('http://127.0.0.1:8123/video_understanding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          client_session_id: clientSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const videoResult = result.result || '';
      
      // 保存视频理解结果
      setVideoUnderstandingResult(videoResult);
      
      return videoResult;
    } catch (error) {
      console.error('视频理解失败:', error);
      throw error;
    }
  };

  // SOP解析处理函数
  const handleParseSOP = async (manuscript: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8123/parse_sop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          manuscript,
          client_session_id: clientSessionId
        }),
        // 添加代理绕过设置
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('SOP解析失败:', error);
      throw error;
    }
  };

  // SOP精修处理函数
  const handleRefineSOP = async (blocks: SOPBlock[], userNotes: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8123/refine_sop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          blocks, 
          user_notes: userNotes,
          client_session_id: clientSessionId
        }),
        // 添加代理绕过设置
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('SOP精修失败:', error);
      throw error;
    }
  };

  return (
    <ResizableLayout
      defaultSidebarWidth={240}
      minSidebarWidth={200}
      maxSidebarWidth={600}
      sidebar={<OperationHistory records={operationRecords} isConnected={wsConnected} onReconnect={reconnectWebSocket} />}
    >
      <div className="w-full max-w-6xl mx-auto px-4 relative">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Video2SOP：将仪器教学视频转化为SOP
          </h1>
        </div>

        {/* 通知设置 - 右上角 */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm">🔔</span>
              <span className="text-xs text-gray-600">
                {notificationEnabled ? '已启用' : '浏览器通知未启用'}
              </span>
              {notificationEnabled && (
                <>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-orange-600">通知不一定发挥效果</span>
                </>
              )}
              {notificationEnabled ? (
                <>
                  <button
                    onClick={() => {
                      notificationManager.sendNotification(
                        '🔔 通知测试',
                        '这是一条测试通知，证明通知功能正常工作！'
                      );
                    }}
                    className="px-1 py-0.5 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
                    title="测试通知"
                  >
                    测试
                  </button>
                  <button
                    onClick={() => {
                      notificationManager.disable();
                      setNotificationEnabled(false);
                    }}
                    className="px-1 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
                    title="禁用通知"
                  >
                    禁用
                  </button>
                  <button
                    onClick={() => {
                      // 强制发送通知，模拟实际处理完成时的通知
                      notificationManager.sendNotification(
                        '🎬 视频理解完成',
                        '视频分析已完成，SOP草稿已生成，可以进行解析',
                        undefined,
                        true // force参数
                      );
                    }}
                    className="px-1 py-0.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 transition-colors"
                    title="模拟通知"
                  >
                    模拟
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      console.log('点击启用通知按钮');
                      const enabled = await notificationManager.initialize();
                      console.log('通知权限状态:', enabled);
                      setNotificationEnabled(enabled);
                      
                      if (enabled) {
                        // 测试通知
                        notificationManager.sendNotification(
                          '🔔 通知测试',
                          '浏览器通知功能已启用！'
                        );
                      }
                    } catch (error) {
                      console.error('启用通知失败:', error);
                      alert('启用通知失败，请检查浏览器设置');
                    }
                  }}
                  className="px-1 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                  title="启用通知"
                >
                  启用
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 视频上传组件 */}
        <div className="mb-6">
          <VideoUploader 
            clientSessionId={clientSessionId}
            onUploadComplete={(result) => {
              setCurrentUploadResult(result);
              
              // 直接添加操作记录，不依赖WebSocket
              const uploadRecord: OperationRecord = {
                id: `upload-${Date.now()}`,
                type: 'upload',
                timestamp: new Date(),
                status: 'success',
                message: '视频和音频上传完成！',
                data: {
                  video_url: result.video_url,
                  audio_url: result.audio_url,
                  session_id: result.session_id
                }
              };
              setOperationRecords(prev => [...prev, uploadRecord]);
            }}
            onUploadError={(error) => {
              console.error('视频上传失败:', error);
            }}
            onFileRemoved={() => {
              setCurrentUploadResult(null);
              
              // 直接添加删除记录，不依赖WebSocket
              const removeRecord: OperationRecord = {
                id: `remove-${Date.now()}`,
                type: 'file_removed',
                timestamp: new Date(),
                status: 'success',
                message: '视频和音频已从OSS删除',
                data: {
                  deleted_count: 2
                }
              };
              setOperationRecords(prev => [...prev, removeRecord]);
            }}
            onWebSocketMessage={handleVideoUploaderWebSocketMessage}
          />
        </div>

        {/* 语音识别面板 */}
        <div className="mb-6">
          <SpeechRecognitionPanel
            uploadResult={currentUploadResult}
            onSpeechRecognition={handleSpeechRecognition}
          />
        </div>
        
        {/* 视频理解面板 */}
        <div className="mb-6">
          <VideoUnderstandingPanel
            uploadResult={currentUploadResult}
            speechRecognitionResult={speechRecognitionResult}
            onVideoUnderstanding={handleVideoUnderstanding}
          />
        </div>

        {/* SOP编辑器 */}
        <div className="mb-6">
          <SOPEditor
            manuscript={videoUnderstandingResult}
            videoUrl={currentUploadResult?.video_url}
            onParseSOP={handleParseSOP}
            onRefineSOP={handleRefineSOP}
          />
        </div>
        
        {/* 技术栈 */}
        <div className="w-full max-w-7xl mx-auto mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-base font-semibold text-gray-800 mb-2">🚀 技术栈</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• <strong>AI模型</strong>: Qwen3-VL-Plus (视频理解) + Paraformer-V2 (语音识别) + Qwen-Plus (文本处理)</li>
              <li>• <strong>后端</strong>: FastAPI + WebSocket + LangGraph Agent</li>
              <li>• <strong>前端</strong>: Next.js 15 + TypeScript + React 19 + Tailwind CSS</li>
              <li>• <strong>存储</strong>: 阿里云OSS + 实时音频提取</li>
            </ul>
          </div>
        </div>
      </div>
    </ResizableLayout>
  );
}