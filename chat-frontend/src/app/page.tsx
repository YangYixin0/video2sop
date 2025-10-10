import ChatSidebar from '@/components/ChatSidebar';

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            LangGraph Agent Chat
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            基于 Qwen3-plus 模型的智能对话助手，使用 LangGraph 构建，支持实时流式对话。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
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
                <li>• 自动重连机制</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              💡 点击右侧聊天面板开始与 AI 助手对话！
            </p>
          </div>
        </div>
      </div>

      {/* 聊天侧边栏 */}
      <div className="w-96 h-full">
        <ChatSidebar />
      </div>
    </div>
  );
}