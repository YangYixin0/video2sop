'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ResizableLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidth?: number;
}

export default function ResizableLayout({
  children,
  sidebar,
  defaultSidebarWidth = 384, // 默认 96 * 4 = 384px (w-96)
  minSidebarWidth = 280,
  maxSidebarWidth = 600,
}: ResizableLayoutProps) {
  // 始终使用默认宽度作为初始状态，避免 SSR/客户端不匹配
  const [sidebarWidth, setSidebarWidth] = useState(defaultSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 客户端挂载后从 localStorage 读取保存的宽度
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('sidebar-width');
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= minSidebarWidth && width <= maxSidebarWidth) {
        setSidebarWidth(width);
      }
    }
  }, [minSidebarWidth, maxSidebarWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;

    // 限制宽度范围
    const clampedWidth = Math.min(
      Math.max(newWidth, minSidebarWidth),
      maxSidebarWidth
    );

    setSidebarWidth(clampedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    // 保存宽度到 localStorage（仅在客户端）
    if (isClient) {
      localStorage.setItem('sidebar-width', sidebarWidth.toString());
    }
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing]);

  return (
    <div ref={containerRef} className="flex h-screen bg-gray-50">
      {/* 主内容区域 */}
      <div 
        className="flex flex-col items-center justify-center p-8 transition-all duration-200"
        style={{ 
          width: `calc(100% - ${sidebarWidth}px)`,
          minWidth: '300px'
        }}
      >
        {children}
      </div>

      {/* 拖拽分隔条 */}
      <div
        className={`
          relative w-1 bg-gray-200 hover:bg-blue-300 cursor-col-resize transition-all duration-200
          ${isResizing ? 'bg-blue-500 shadow-lg' : ''}
          group
        `}
        onMouseDown={handleMouseDown}
      >
        {/* 拖拽指示器 */}
        <div className={`
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-8 h-12 bg-white rounded-full shadow-md border border-gray-300
          flex items-center justify-center opacity-0 group-hover:opacity-100
          transition-all duration-200 ${isResizing ? 'opacity-100 scale-110' : ''}
        `}>
          <div className="flex flex-col space-y-1">
            <div className="w-0.5 h-1.5 bg-gray-400 rounded-full"></div>
            <div className="w-0.5 h-1.5 bg-gray-400 rounded-full"></div>
            <div className="w-0.5 h-1.5 bg-gray-400 rounded-full"></div>
          </div>
        </div>
        
        {/* 宽度显示 */}
        {isResizing && (
          <div className="absolute top-4 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
            {Math.round(sidebarWidth)}px
          </div>
        )}
      </div>

      {/* 聊天侧边栏 */}
      <div 
        className="h-full bg-white border-l border-gray-200"
        style={{ width: `${sidebarWidth}px` }}
      >
        {sidebar}
      </div>
    </div>
  );
}
