'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SOPBlock, BLOCK_TYPE_CONFIGS } from '@/types/sop';

interface SOPBlockItemProps {
  block: SOPBlock;
  isEditing?: boolean;
  isSelected?: boolean;
  videoUrl?: string;
  onEdit?: (blockId: string, field: keyof SOPBlock, value: string | number | boolean) => void;
  onDelete?: (blockId: string) => void;
  onPlay?: (startTime: number, endTime?: number) => void;
  onSelect?: (blockId: string, selected: boolean) => void;
  onToggleEdit?: (blockId: string) => void;
  className?: string;
  // 拖拽相关属性
  dragHandleProps?: any;
  isDragging?: boolean;
}

const SOPBlockItem: React.FC<SOPBlockItemProps> = ({
  block,
  isEditing = false,
  isSelected = false,
  videoUrl,
  onEdit,
  onDelete,
  onPlay,
  onSelect,
  onToggleEdit,
  className = '',
  dragHandleProps,
  isDragging = false
}) => {
  const [localContent, setLocalContent] = useState(block.content);
  const [localStartTime, setLocalStartTime] = useState(block.start_time?.toString() || '');
  const [localEndTime, setLocalEndTime] = useState(block.end_time?.toString() || '');
  const [localShowPlayButton, setLocalShowPlayButton] = useState(block.show_play_button);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 同步本地状态与props
  useEffect(() => {
    setLocalContent(block.content);
    setLocalStartTime(block.start_time?.toString() || '');
    setLocalEndTime(block.end_time?.toString() || '');
    setLocalShowPlayButton(block.show_play_button);
  }, [block]);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理内容编辑
  const handleContentChange = (value: string) => {
    setLocalContent(value);
    onEdit?.(block.id, 'content', value);
  };

  // 处理时间编辑
  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    const numValue = value ? parseInt(value, 10) : 0;
    
    if (field === 'start_time') {
      setLocalStartTime(value);
      onEdit?.(block.id, 'start_time', numValue);
    } else {
      setLocalEndTime(value);
      onEdit?.(block.id, 'end_time', numValue);
    }
  };

  // 处理播放按钮切换
  const handlePlayButtonToggle = () => {
    const newValue = !localShowPlayButton;
    setLocalShowPlayButton(newValue);
    onEdit?.(block.id, 'show_play_button', newValue);
  };

  // 处理播放
  const handlePlay = () => {
    if (block.start_time !== undefined) {
      onPlay?.(block.start_time, block.end_time);
    }
  };

  // 自动调整textarea高度
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localContent, isEditing]);

  const typeConfig = BLOCK_TYPE_CONFIGS[block.type] || BLOCK_TYPE_CONFIGS.unknown;
  const canPlay = videoUrl && block.start_time !== undefined && localShowPlayButton;

  return (
    <div
      className={`
        relative border rounded-lg transition-all duration-200
        ${typeConfig.color}
        ${isSelected ? 'ring-2 ring-blue-400' : ''}
        ${isEditing ? 'shadow-md' : 'hover:shadow-sm'}
        ${isDragging ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {/* 紧凑的头部 - 包含类型、内容预览和操作按钮 */}
      <div 
        className="flex items-start justify-between p-3 border-b border-gray-100 cursor-grab active:cursor-grabbing"
        {...dragHandleProps}
      >
        {/* 左侧：类型图标和内容预览 */}
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm">{typeConfig.icon}</span>
            <span className="text-xs font-medium text-gray-700">{typeConfig.label}</span>
            <span className="text-xs text-gray-400">#{block.id.slice(-6)}</span>
          </div>
          {/* 内容预览 - 步骤类型显示更多行，其他类型显示2行 */}
          <div 
            className="text-sm text-gray-800"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: block.type === 'step' ? 6 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {block.content ? (
              <span className="whitespace-pre-wrap">{block.content}</span>
            ) : (
              <span className="text-gray-400 italic">暂无内容</span>
            )}
          </div>
        </div>
        
        {/* 右侧：时间和操作按钮 */}
        <div className="flex flex-col items-end space-y-2">
          {/* 时间信息 */}
          <div className="flex items-center space-x-2 text-xs">
            {block.start_time !== undefined && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                {formatTime(block.start_time)}
                {block.end_time && ` - ${formatTime(block.end_time)}`}
              </span>
            )}
            {localShowPlayButton && (
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded">可播放</span>
            )}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center space-x-1">
            {/* 播放按钮 */}
            {canPlay && (
              <button
                onClick={handlePlay}
                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                title={`播放 ${block.start_time !== undefined ? formatTime(block.start_time) : ''}${block.end_time ? ` - ${formatTime(block.end_time)}` : ''}`}
              >
                <span className="text-sm">▶️</span>
              </button>
            )}
            
            {/* 编辑按钮 */}
            <button
              onClick={() => onToggleEdit?.(block.id)}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={isEditing ? '完成编辑' : '编辑区块'}
            >
              <span className="text-sm">{isEditing ? '✓' : '✏️'}</span>
            </button>
            
            {/* 删除按钮 */}
            <button
              onClick={() => onDelete?.(block.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="删除区块"
            >
              <span className="text-sm">🗑️</span>
            </button>
          </div>
        </div>
      </div>

      {/* 编辑区域 - 仅在编辑模式下显示 */}
      {isEditing && (
        <div className="p-3 space-y-3">
          {/* 文本内容编辑 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              内容
            </label>
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              rows={3}
              placeholder="输入区块内容..."
            />
          </div>

          {/* 时间和设置 - 紧凑布局 */}
          <div className="grid grid-cols-3 gap-3">
            {/* 开始时间 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                开始时间
              </label>
              <input
                type="number"
                value={localStartTime}
                onChange={(e) => handleTimeChange('start_time', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>
            
            {/* 结束时间 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                结束时间
              </label>
              <input
                type="number"
                value={localEndTime}
                onChange={(e) => handleTimeChange('end_time', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>
            
            {/* 播放按钮设置 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                显示播放按钮
              </label>
              <label className="flex items-center justify-center h-8 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={localShowPlayButton}
                  onChange={handlePlayButtonToggle}
                  className="sr-only"
                />
                <span className={`text-xs px-2 py-1 rounded transition-colors ${localShowPlayButton ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {localShowPlayButton ? '启用' : '禁用'}
                </span>
              </label>
            </div>
          </div>

          {/* 选择框 */}
          {onSelect && (
            <div className="flex items-center justify-center pt-2 border-t border-gray-100">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelect?.(block.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                />
                <span className="text-xs text-gray-600">选择此区块</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SOPBlockItem;
