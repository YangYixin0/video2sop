'use client';

import ChatSidebar from '@/components/ChatSidebar';
import ResizableLayout from '@/components/ResizableLayout';
import VideoUploader from '@/components/VideoUploader';

export default function Home() {
  return (
    <ResizableLayout
      defaultSidebarWidth={400}
      minSidebarWidth={300}
      maxSidebarWidth={600}
      sidebar={<ChatSidebar />}
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
              console.log('视频上传完成:', result);
            }}
            onUploadError={(error) => {
              console.error('视频上传失败:', error);
            }}
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