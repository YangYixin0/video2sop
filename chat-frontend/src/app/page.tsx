'use client';

import React, { useState } from 'react';
import OperationHistory, { OperationRecord } from '@/components/OperationHistory';
import ResizableLayout from '@/components/ResizableLayout';
import VideoUploader from '@/components/VideoUploader';
import SpeechRecognitionPanel from '@/components/SpeechRecognitionPanel';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Home() {
  // 全局状态管理
  const [currentUploadResult, setCurrentUploadResult] = useState<{
    video_url: string;
    audio_url: string;
    session_id: string;
  } | null>(null);
  
  const [operationRecords, setOperationRecords] = useState<OperationRecord[]>([]);

  // WebSocket 连接用于接收操作记录
  const { isConnected: wsConnected, sendMessage: sendWebSocketMessage } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'upload_complete') {
        // 更新当前上传结果状态
        setCurrentUploadResult({
          video_url: data.video_url,
          audio_url: data.audio_url,
          session_id: data.session_id
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
        setOperationRecords(prev => [uploadRecord, ...prev]);
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
        setOperationRecords(prev => [removeRecord, ...prev]);
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
        setOperationRecords(prev => [speechRecord, ...prev]);
      }
    }
  });

  // 处理VideoUploader的WebSocket消息
  const handleVideoUploaderWebSocketMessage = (message: any) => {
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
      return result.result || [];
    } catch (error) {
      console.error('语音识别失败:', error);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            LangGraph Agent Chat
          </h1>
          <p className="text-base text-gray-600 mb-6">
            基于 Qwen3-plus 模型的智能对话助手，使用 LangGraph 构建，支持实时流式对话和视频处理。
          </p>
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
              setOperationRecords(prev => [uploadRecord, ...prev]);
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
              setOperationRecords(prev => [removeRecord, ...prev]);
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
        
        {/* 响应式网格布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 text-left mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-base font-semibold text-gray-800 mb-2">🚀 技术栈</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• LangGraph Agent</li>
              <li>• Qwen3-plus 模型</li>
              <li>• FastAPI + WebSocket</li>
              <li>• Next.js + TypeScript</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="text-base font-semibold text-gray-800 mb-2">✨ 功能特性</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• 实时流式对话</li>
              <li>• 语音识别转录</li>
              <li>• 视频上传处理</li>
              <li>• 音频自动提取</li>
              <li>• LangSmith 调试追踪</li>
              <li>• 响应式 UI 设计</li>
              <li>• 可调节侧边栏</li>
            </ul>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border lg:col-span-2 xl:col-span-1">
            <h3 className="text-base font-semibold text-gray-800 mb-2">🎯 使用指南</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• 上传视频文件，自动提取音频</li>
              <li>• 在聊天中发送音频链接进行转录</li>
              <li>• 拖拽右侧边缘调整聊天面板宽度</li>
              <li>• 左侧内容区域会自动响应式调整</li>
              <li>• 最小宽度: 300px，最大宽度: 600px</li>
              <li>• 支持实时预览调整效果</li>
            </ul>
          </div>
        </div>
        
        {/* 操作提示 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm">
              💡
            </div>
            <h3 className="text-base font-semibold text-blue-800">开始使用</h3>
          </div>
          <p className="text-sm text-blue-700 mb-3">
            上传视频文件后，系统会自动提取音频并上传到云端。在右侧聊天面板中发送音频链接，AI 助手可以帮您转录内容。
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-blue-600">
            <span className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span>视频上传</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <span>音频提取</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
              <span>语音转录</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
              <span>云端存储</span>
            </span>
          </div>
        </div>
      </div>
    </ResizableLayout>
  );
}