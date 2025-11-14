'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import SOPVideoPlayer from './SOPVideoPlayer';
import { VideoPlayerProps } from '@/types/sop';
import Icon from './Icon';

interface FloatingVideoPlayerProps extends VideoPlayerProps {
  onClose?: () => void;
  onAspectRatioChange?: (aspectRatio: number) => void;
}

const FloatingVideoPlayer: React.FC<FloatingVideoPlayerProps> = ({
  videoUrl,
  currentStartTime,
  currentEndTime,
  onTimeUpdate,
  onClose,
  onAspectRatioChange
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 300, height: 169 }); // 默认300px宽，16:9比例
  const [aspectRatio, setAspectRatio] = useState(16 / 9); // 默认16:9
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const dragMovedRef = useRef(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 112; // 200 / (16/9)

  // 计算初始位置（右侧居中），确保窗口完全在视口内
  useEffect(() => {
    if (isVisible && position.x === 0 && position.y === 0) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const initialX = viewportWidth - size.width - 20; // 右侧，距离边缘20px
      
      // 垂直居中，但确保窗口完全在视口内
      let initialY = (viewportHeight - size.height) / 2;
      
      // 确保窗口完全在视口内
      // 如果窗口高度超出视口，则贴顶显示
      if (size.height >= viewportHeight - 40) { // 留出上下各20px的边距
        initialY = 20; // 距离顶部20px
      } else {
        // 确保顶部不超出视口
        if (initialY < 20) {
          initialY = 20;
        }
        // 确保底部不超出视口
        if (initialY + size.height > viewportHeight - 20) {
          initialY = viewportHeight - size.height - 20;
          // 如果调整后顶部超出，则贴顶显示
          if (initialY < 20) {
            initialY = 20;
          }
        }
      }
      
      setPosition({ x: initialX, y: initialY });
    }
  }, [isVisible, size, position]);

  // 处理视频高宽比变化
  const handleAspectRatioChange = useCallback((ratio: number) => {
    setAspectRatio(ratio);
    // 根据新的高宽比调整高度，保持宽度不变
    setSize(prev => {
      const newHeight = prev.width / ratio;
      // 当高度变化时，调整位置确保窗口完全在视口内
      const viewportHeight = window.innerHeight;
      setPosition(prevPos => {
        let newY = prevPos.y;
        // 如果底部超出视口，向上调整
        if (prevPos.y + newHeight > viewportHeight - 20) {
          newY = viewportHeight - newHeight - 20;
          // 如果调整后顶部超出，则贴顶显示
          if (newY < 20) {
            newY = 20;
          }
        }
        // 如果顶部超出视口，向下调整
        if (newY < 20) {
          newY = 20;
        }
        return { ...prevPos, y: newY };
      });
      return {
        width: prev.width,
        height: newHeight
      };
    });
    onAspectRatioChange?.(ratio);
  }, [onAspectRatioChange]);

  // 拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 如果点击的是调整大小的区域，不触发拖拽
    const target = e.target as HTMLElement;
    if (target.classList.contains('resize-handle') || target.closest('.resize-handle')) {
      return;
    }
    // 如果点击的是关闭按钮，不触发拖拽
    if (target.closest('.close-button')) {
      return;
    }
    // 如果点击的是视频控制条区域，不触发拖拽（允许用户操作控制条）
    // 但允许在视频其他区域拖动窗口
    const videoElement = target.closest('video') as HTMLVideoElement;
    if (videoElement) {
      const rect = videoElement.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const videoHeight = rect.height;
      // 如果点击在视频底部25%区域（通常是控制条区域），不触发拖拽
      if (clickY > videoHeight * 0.75) {
        return;
      }
      // 在视频其他区域允许拖拽，但阻止视频的默认点击行为
      e.preventDefault();
    }
    
    setIsDragging(true);
    dragMovedRef.current = false;
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  // 调整大小开始
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    });
  }, [size, position]);

  // 全局鼠标移动处理
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // 防止视频元素响应鼠标事件
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // 判断是否发生了实际拖动
        if (!dragMovedRef.current) {
          const dx = newX - position.x;
          const dy = newY - position.y;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            dragMovedRef.current = true;
          }
        }
        
        // 限制在视口内
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const constrainedX = Math.max(0, Math.min(newX, viewportWidth - size.width));
        const constrainedY = Math.max(0, Math.min(newY, viewportHeight - size.height));
        
        setPosition({ x: constrainedX, y: constrainedY });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = resizeStart.posX;
        let newY = resizeStart.posY;
        
        // 根据方向调整大小，保持高宽比
        // 优先使用宽度变化来计算（更直观）
        if (resizeDirection === 'right') {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width + deltaX);
          newHeight = newWidth / aspectRatio;
        } else if (resizeDirection === 'left') {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width - deltaX);
          newHeight = newWidth / aspectRatio;
          const widthDiff = resizeStart.width - newWidth;
          newX = resizeStart.posX + widthDiff;
        }
        
        // 如果涉及上下方向，使用高度变化来计算
        if (resizeDirection === 'bottom') {
          newHeight = Math.max(MIN_HEIGHT, resizeStart.height + deltaY);
          newWidth = newHeight * aspectRatio;
        } else if (resizeDirection === 'top') {
          newHeight = Math.max(MIN_HEIGHT, resizeStart.height - deltaY);
          newWidth = newHeight * aspectRatio;
          const heightDiff = resizeStart.height - newHeight;
          newY = resizeStart.posY + heightDiff;
        }
        
        // 对于角落调整，同时考虑两个方向，优先使用宽度
        if (resizeDirection === 'top-left') {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width - deltaX);
          newHeight = newWidth / aspectRatio;
          const widthDiff = resizeStart.width - newWidth;
          const heightDiff = resizeStart.height - newHeight;
          newX = resizeStart.posX + widthDiff;
          newY = resizeStart.posY + heightDiff;
        } else if (resizeDirection === 'top-right') {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width + deltaX);
          newHeight = newWidth / aspectRatio;
          const heightDiff = resizeStart.height - newHeight;
          newY = resizeStart.posY + heightDiff;
        } else if (resizeDirection === 'bottom-left') {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width - deltaX);
          newHeight = newWidth / aspectRatio;
          const widthDiff = resizeStart.width - newWidth;
          newX = resizeStart.posX + widthDiff;
        } else if (resizeDirection === 'bottom-right') {
          newWidth = Math.max(MIN_WIDTH, resizeStart.width + deltaX);
          newHeight = newWidth / aspectRatio;
        }
        
        // 确保满足最小尺寸要求
        if (newWidth < MIN_WIDTH) {
          newWidth = MIN_WIDTH;
          newHeight = newWidth / aspectRatio;
        }
        if (newHeight < MIN_HEIGHT) {
          newHeight = MIN_HEIGHT;
          newWidth = newHeight * aspectRatio;
        }
        
        // 限制在视口内
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxWidth = viewportWidth - newX;
        const maxHeight = viewportHeight - newY;
        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          newHeight = newWidth / aspectRatio;
        }
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * aspectRatio;
        }
        
        // 确保位置不超出视口
        if (newX < 0) {
          newX = 0;
        }
        if (newY < 0) {
          newY = 0;
        }
        
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = (_e: MouseEvent) => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection, size, position, aspectRatio]);

  // 关闭窗口
  const handleClose = useCallback(() => {
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  if (!isVisible || !videoUrl) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-300 z-[1000]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
      onClickCapture={(e) => {
        // 如果刚刚发生过拖拽，阻止点击事件，避免触发视频播放/暂停
        if (dragMovedRef.current) {
          e.preventDefault();
          e.stopPropagation();
          dragMovedRef.current = false;
        }
      }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-sm font-medium text-gray-700">视频播放器</span>
        <button
          onClick={handleClose}
          className="close-button p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <Icon name="close" size={16} className="text-gray-600" />
        </button>
      </div>

      {/* 视频内容区域 */}
      <div 
        className="relative w-full overflow-hidden" 
        style={{ height: `calc(100% - 40px)` }}
      >
        <SOPVideoPlayer
          videoUrl={videoUrl}
          currentStartTime={currentStartTime}
          currentEndTime={currentEndTime}
          onTimeUpdate={onTimeUpdate}
          onAspectRatioChange={handleAspectRatioChange}
        />
      </div>

      {/* 调整大小的手柄 */}
      {/* 上边缘 */}
      <div
        className="resize-handle absolute top-0 left-0 right-0 h-2 cursor-ns-resize"
        onMouseDown={(e) => handleResizeStart(e, 'top')}
      />
      {/* 下边缘 */}
      <div
        className="resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
      {/* 左边缘 */}
      <div
        className="resize-handle absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize"
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
      {/* 右边缘 */}
      <div
        className="resize-handle absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize"
        onMouseDown={(e) => handleResizeStart(e, 'right')}
      />
      {/* 左上角 */}
      <div
        className="resize-handle absolute top-0 left-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={(e) => handleResizeStart(e, 'top-left')}
      />
      {/* 右上角 */}
      <div
        className="resize-handle absolute top-0 right-0 w-4 h-4 cursor-nesw-resize"
        onMouseDown={(e) => handleResizeStart(e, 'top-right')}
      />
      {/* 左下角 */}
      <div
        className="resize-handle absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
      />
      {/* 右下角 */}
      <div
        className="resize-handle absolute top-0 right-0 w-4 h-4 cursor-nwse-resize"
        onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
      />
    </div>
  );
};

export default FloatingVideoPlayer;

