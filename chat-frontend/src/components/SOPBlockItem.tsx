'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SOPBlock, BLOCK_TYPE_CONFIGS } from '@/types/sop';
import { useI18n } from '@/i18n';

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
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

const SOPBlockItem: React.FC<SOPBlockItemProps> = React.memo(({
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
  const { t } = useI18n();
  const [localContent, setLocalContent] = useState(block.content);
  const [localStartTime, setLocalStartTime] = useState(block.start_time?.toString() || '');
  const [localEndTime, setLocalEndTime] = useState(block.end_time?.toString() || '');
  const [localShowPlayButton, setLocalShowPlayButton] = useState(block.show_play_button);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 同步本地状态与props - 只在非编辑状态下同步，避免编辑时被覆盖
  useEffect(() => {
    // 如果正在编辑，不要覆盖本地状态
    if (!isEditing) {
    setLocalContent(block.content);
    setLocalStartTime(block.start_time?.toString() || '');
    setLocalEndTime(block.end_time?.toString() || '');
    setLocalShowPlayButton(block.show_play_button);
    }
  }, [block.content, block.start_time, block.end_time, block.show_play_button, isEditing]);

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 处理内容编辑 - 编辑状态下不调用onEdit，避免状态更新
  const handleContentChange = useCallback((value: string) => {
    setLocalContent(value);
    
    // 清除之前的防抖定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // 只在非编辑状态下才调用onEdit，避免编辑时状态更新导致重新渲染
    if (!isEditing) {
      debounceTimeoutRef.current = setTimeout(() => {
    onEdit?.(block.id, 'content', value);
      }, 1000);
    }
  }, [block.id, onEdit, isEditing]);

  // 处理时间编辑
  const handleTimeChange = (field: 'start_time' | 'end_time', value: string) => {
    const numValue = value ? parseInt(value, 10) : 0;
    
    if (field === 'start_time') {
      setLocalStartTime(value);
    } else {
      setLocalEndTime(value);
    }
    
    // 只在非编辑状态下才调用onEdit
    if (!isEditing) {
      onEdit?.(block.id, field, numValue);
    }
  };

  // 处理播放按钮切换
  const handlePlayButtonToggle = () => {
    const newValue = !localShowPlayButton;
    setLocalShowPlayButton(newValue);
    onEdit?.(block.id, 'show_play_button', newValue);
  };

  // 处理编辑状态切换 - 退出编辑时保存更改
  const handleToggleEdit = () => {
    if (isEditing) {
      // 退出编辑状态时，保存所有本地更改
      onEdit?.(block.id, 'content', localContent);
      if (localStartTime) {
        onEdit?.(block.id, 'start_time', parseInt(localStartTime, 10));
      }
      if (localEndTime) {
        onEdit?.(block.id, 'end_time', parseInt(localEndTime, 10));
      }
      onEdit?.(block.id, 'show_play_button', localShowPlayButton);
    }
    onToggleEdit?.(block.id);
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
      const textarea = textareaRef.current;
      const scrollContainer = textarea.closest('.overflow-y-auto');
      
      const adjustHeight = () => {
        // 保存当前滚动位置
        const scrollTop = scrollContainer?.scrollTop || 0;
        
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        
        // 恢复滚动位置
        if (scrollContainer && scrollTop > 0) {
          scrollContainer.scrollTop = scrollTop;
        }
      };
      
      // 只在编辑模式开始时调整一次高度
      adjustHeight();
      
      // 使用ResizeObserver监听内容变化
      const resizeObserver = new ResizeObserver(() => {
        adjustHeight();
      });
      
      resizeObserver.observe(textarea);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isEditing]); // 只依赖isEditing，不依赖localContent

  const typeConfig = BLOCK_TYPE_CONFIGS[block.type] || BLOCK_TYPE_CONFIGS.unknown;
  const typeLabel = t(
    block.type === 'title' ? 'sop.block_labels.title' :
    block.type === 'abstract' ? 'sop.block_labels.abstract' :
    block.type === 'keywords' ? 'sop.block_labels.keywords' :
    block.type === 'materials' ? 'sop.block_labels.materials' :
    block.type === 'step' ? 'sop.block_labels.step' :
    'sop.block_labels.unknown'
  );
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
            <span className="text-xs font-medium text-gray-700">{typeLabel}</span>
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
              <span className="text-gray-400 italic">{t('sop.block_fields.no_content')}</span>
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
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded">{t('sop.block_fields.playable')}</span>
            )}
          </div>
          
          {/* 操作按钮 */}
          <div className="flex items-center space-x-1">
            {/* 播放按钮 */}
            {canPlay && (
              <button
                onClick={handlePlay}
                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                title={
                  block.end_time && block.start_time !== undefined
                    ? t('sop.tooltip.play_range', { start: formatTime(block.start_time), end: formatTime(block.end_time) })
                    : t('sop.tooltip.play_at', { start: block.start_time !== undefined ? formatTime(block.start_time) : '' })
                }
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="text-sm">▶️</span>
              </button>
            )}
            
            {/* 编辑按钮 */}
            <button
              onClick={handleToggleEdit}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={isEditing ? t('common.done_editing') : t('common.edit_block')}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="text-sm">{isEditing ? '✓' : '✏️'}</span>
            </button>
            
            {/* 删除按钮 */}
            <button
              onClick={() => onDelete?.(block.id)}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title={t('common.delete_block')}
              onPointerDown={(e) => e.stopPropagation()}
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
              {t('sop.block_fields.content')}
            </label>
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              rows={3}
              placeholder={t('sop.block_fields.content_placeholder')}
            />
          </div>

          {/* 时间和设置 - 紧凑布局 */}
          <div className="grid grid-cols-3 gap-3">
            {/* 开始时间 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('sop.block_fields.begin_time')}
              </label>
              <input
                type="number"
                value={localStartTime}
                onChange={(e) => handleTimeChange('start_time', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder={t('sop.block_fields.time_placeholder')}
                min="0"
              />
            </div>
            
            {/* 结束时间 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('sop.block_fields.end_time')}
              </label>
              <input
                type="number"
                value={localEndTime}
                onChange={(e) => handleTimeChange('end_time', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder={t('sop.block_fields.time_placeholder')}
                min="0"
              />
            </div>
            
            {/* 播放按钮设置 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('sop.block_fields.show_play_button')}
              </label>
              <label className="flex items-center justify-center h-8 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={localShowPlayButton}
                  onChange={handlePlayButtonToggle}
                  className="sr-only"
                />
                <span className={`text-xs px-2 py-1 rounded transition-colors ${localShowPlayButton ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {localShowPlayButton ? t('common.enabled') : t('common.disabled')}
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
                <span className="text-xs text-gray-600">{t('sop.select_this_block')}</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SOPBlockItem.displayName = 'SOPBlockItem';

export default SOPBlockItem;
