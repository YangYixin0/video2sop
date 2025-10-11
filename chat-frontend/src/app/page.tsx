import ChatSidebar from '@/components/ChatSidebar';
import ResizableLayout from '@/components/ResizableLayout';

export default function Home() {
  return (
    <ResizableLayout
      defaultSidebarWidth={400}
      minSidebarWidth={300}
      maxSidebarWidth={600}
      sidebar={<ChatSidebar />}
    >
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          LangGraph Agent Chat
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          基于 Qwen3-plus 模型的智能对话助手，使用 LangGraph 构建，支持实时流式对话。
        </p>
        
        {/* 响应式网格布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 text-left mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🚀 技术栈</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• LangGraph Agent</li>
              <li>• Qwen3-plus 模型</li>
              <li>• FastAPI + WebSocket</li>
              <li>• Next.js + TypeScript</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">✨ 功能特性</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• 实时流式对话</li>
              <li>• LangSmith 调试追踪</li>
              <li>• 响应式 UI 设计</li>
              <li>• 可调节侧边栏</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border lg:col-span-2 xl:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 使用指南</h3>
            <ul className="space-y-2 text-gray-600">
              <li>• 拖拽右侧边缘调整聊天面板宽度</li>
              <li>• 左侧内容区域会自动响应式调整</li>
              <li>• 最小宽度: 300px，最大宽度: 600px</li>
              <li>• 支持实时预览调整效果</li>
            </ul>
          </div>
        </div>
        
        {/* 操作提示 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              💡
            </div>
            <h3 className="text-lg font-semibold text-blue-800">开始使用</h3>
          </div>
          <p className="text-blue-700 mb-4">
            拖拽右侧聊天面板的边缘来调整宽度，左侧内容会根据可用空间自动重新排列。
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-blue-600">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>实时调整</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>响应式布局</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>平滑过渡</span>
            </span>
          </div>
        </div>
      </div>
    </ResizableLayout>
  );
}