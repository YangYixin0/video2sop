'use client';

import React, { useState } from 'react';
import OperationHistory, { OperationRecord } from '@/components/OperationHistory';
import ResizableLayout from '@/components/ResizableLayout';
import VideoUploader from '@/components/VideoUploader';
import SpeechRecognitionPanel from '@/components/SpeechRecognitionPanel';
import VideoUnderstandingPanel from '@/components/VideoUnderstandingPanel';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Home() {
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

  // WebSocket 连接用于接收操作记录
  const { isConnected: wsConnected, sendMessage: sendWebSocketMessage } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'upload_complete') {
        // 更新当前上传结果状态
        setCurrentUploadResult({
          video_url: data.video_url || '',
          audio_url: data.audio_url || '',
          session_id: data.session_id || ''
        });
        
        // 添加上传记录
        const uploadRecord: OperationRecord = {
          id: `upload-${Date.now()}`,
          type: 'upload',
          timestamp: new Date(),
          status: 'success',
          message: data.message || '视频和音频上传完成！',
          data: {
            video_url: data.video_url,
            audio_url: data.audio_url,
            session_id: data.session_id
          }
        };
        setOperationRecords(prev => [...prev, uploadRecord]);
      } else if (data.type === 'file_removed') {
        // 清空当前上传结果状态
        setCurrentUploadResult(null);
        
        // 添加删除记录
        const removeRecord: OperationRecord = {
          id: `remove-${Date.now()}`,
          type: 'file_removed',
          timestamp: new Date(),
          status: 'success',
          message: data.message || '上传的文件已从服务器删除',
          data: {
            session_id: data.session_id,
            deleted_count: data.deleted_count
          }
        };
        setOperationRecords(prev => [...prev, removeRecord]);
      } else if (data.type === 'speech_recognition_complete') {
        // 添加语音识别记录
        const speechRecord: OperationRecord = {
          id: `speech-${Date.now()}`,
          type: 'speech_recognition',
          timestamp: new Date(),
          status: 'success',
          message: data.message || '语音识别已执行',
          data: {
            speech_result: data.result
          }
        };
        setOperationRecords(prev => [...prev, speechRecord]);
      } else if (data.type === 'video_understanding_complete') {
        // 添加视频理解记录
        const videoRecord: OperationRecord = {
          id: `video-${Date.now()}`,
          type: 'video_understanding',
          timestamp: new Date(),
          status: 'success',
          message: data.message || '视频理解已执行',
          data: {
            video_result: typeof data.result === 'string' ? data.result : String(data.result),
            fps: data.fps,
            has_audio_context: data.has_audio_context
          }
        };
        setOperationRecords(prev => [...prev, videoRecord]);
      }
    }
  });

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
          audio_url: audioUrl
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
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.result || '';
    } catch (error) {
      console.error('视频理解失败:', error);
      throw error;
    }
  };

  return (
    <ResizableLayout
      defaultSidebarWidth={400}
      minSidebarWidth={300}
      maxSidebarWidth={600}
      sidebar={<OperationHistory records={operationRecords} isConnected={wsConnected} />}
    >
      <div className="w-full max-w-6xl mx-auto px-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Video2SOP：将仪器教学视频转化为SOP
          </h1>
        </div>

        {/* 视频上传组件 */}
        <div className="mb-6">
          <VideoUploader 
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
        
        {/* 技术栈 */}
        <div className="w-full max-w-4xl mx-auto mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-base font-semibold text-gray-800 mb-2">🚀 技术栈</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• LangGraph Agent</li>
              <li>• Qwen3-plus 模型</li>
              <li>• FastAPI + WebSocket</li>
              <li>• Next.js + TypeScript</li>
            </ul>
          </div>
        </div>
      </div>
    </ResizableLayout>
  );
}