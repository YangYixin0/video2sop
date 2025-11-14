'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n';
import { SOPBlock } from '@/types/sop';
import SOPBlockItem from './SOPBlockItem';
import SOPVideoPlayer from './SOPVideoPlayer';
import SOPExporter from './SOPExporter';
import Icon from './Icon';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SOPEditorProps {
  manuscript?: string;
  videoUrl?: string;
  onParseSOP?: (manuscript: string) => Promise<{ blocks: SOPBlock[] }>;
  onRefineSOP?: (blocks: SOPBlock[], userNotes: string) => Promise<{ blocks: SOPBlock[] }>;
  onBlocksChange?: (blocks: SOPBlock[]) => void;
  initialBlocks?: SOPBlock[];
}

const SOPEditor: React.FC<SOPEditorProps> = ({
  manuscript = '',
  videoUrl,
  onParseSOP,
  onRefineSOP,
  onBlocksChange,
  initialBlocks = []
}) => {
  const { t } = useI18n();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  // 状态管理
  const [blocksA, setBlocksA] = useState<SOPBlock[]>(initialBlocks);
  const [blocksB, setBlocksB] = useState<SOPBlock[]>([]);
  const [editingBlocks, setEditingBlocks] = useState<Set<string>>(new Set());
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());
  const [userNotes, setUserNotes] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState<{ start?: number; end?: number }>({});
  const [isParsing, setIsParsing] = useState(false);
  const [isVideoPlayerCollapsed, setIsVideoPlayerCollapsed] = useState(true); // 默认折叠

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 可排序区块组件
  const SortableBlockItem: React.FC<{
    block: SOPBlock;
    index: number;
    videoUrl?: string;
    editingBlocks: Set<string>;
    selectedBlocks: Set<string>;
    onBlockEdit: (blockId: string, field: keyof SOPBlock, value: string | number | boolean) => void;
    onDeleteBlock: (blockId: string) => void;
    onPlay: (startTime: number, endTime?: number) => void;
    onSelectBlock: (blockId: string, selected: boolean) => void;
    onToggleEdit: (blockId: string) => void;
  }> = ({ block, index, videoUrl, editingBlocks, selectedBlocks, onBlockEdit, onDeleteBlock, onPlay, onSelectBlock, onToggleEdit }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: block.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style} className="relative">
        <div className="absolute left-0 top-2 text-xs text-gray-400 font-mono">
          {index + 1}
        </div>
        <div className="ml-6">
          <SOPBlockItem
            block={block}
            isEditing={editingBlocks.has(block.id)}
            isSelected={selectedBlocks.has(block.id)}
            videoUrl={videoUrl}
            onEdit={onBlockEdit}
            onDelete={onDeleteBlock}
            onPlay={onPlay}
            onSelect={onSelectBlock}
            onToggleEdit={onToggleEdit}
            dragHandleProps={{ ...attributes, ...listeners }}
            isDragging={isDragging}
          />
        </div>
      </div>
    );
  };

  // 拖拽结束处理
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setBlocksA((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  // 监听blocksA变化并通知父组件
  useEffect(() => {
    if (blocksA.length > 0) {
      onBlocksChange?.(blocksA);
    }
  }, [blocksA, onBlocksChange]);


  // 生成唯一ID
  const generateId = useCallback(() => {
    return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 解析SOP草稿
  const handleParseSOP = async () => {
    if (!manuscript || !onParseSOP) return;
    
    setIsParsing(true);
    try {
      const result = await onParseSOP(manuscript);
      setBlocksA(result.blocks);
      // 通知父组件blocks变化
      onBlocksChange?.(result.blocks);
    } catch (error) {
      console.error('拆解SOP失败:', error);
      alert('拆解SOP失败，请重试');
    } finally {
      setIsParsing(false);
    }
  };

  // AI精修
  const handleRefine = async () => {
    if (!onRefineSOP || blocksA.length === 0) return;
    
    setIsRefining(true);
    try {
      const result = await onRefineSOP(blocksA, userNotes);
      setBlocksB(result.blocks);
    } catch (error) {
      console.error('AI精修失败:', error);
      alert('AI精修失败，请重试');
    } finally {
      setIsRefining(false);
    }
  };

  // 应用精修结果
  const handleApplyRefinement = () => {
    setBlocksA(blocksB);
    setBlocksB([]);
    setUserNotes('');
  };

  // 区块编辑处理 - 使用更高效的状态更新
  const handleBlockEdit = useCallback((blockId: string, field: keyof SOPBlock, value: string | number | boolean) => {
    setBlocksA(prev => {
      const newBlocks = prev.map(block => {
        if (block.id === blockId) {
          // 只有值真正改变时才创建新对象
          if (block[field] !== value) {
            return { ...block, [field]: value };
          }
        }
        return block; // 返回原对象，避免不必要的重新渲染
      });
      return newBlocks;
    });
  }, []);

  // 切换编辑模式
  const handleToggleEdit = useCallback((blockId: string) => {
    setEditingBlocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  }, []);

  // 删除区块
  const handleDeleteBlock = useCallback((blockId: string) => {
    if (confirm('确定要删除这个区块吗？')) {
      setBlocksA(prev => prev.filter(block => block.id !== blockId));
      setEditingBlocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(blockId);
        return newSet;
      });
      setSelectedBlocks(prev => {
        const newSet = new Set(prev);
        newSet.delete(blockId);
        return newSet;
      });
    }
  }, []);

  // 播放视频片段
  const handlePlay = useCallback((startTime: number, endTime?: number) => {
    setCurrentVideoTime({ start: startTime, end: endTime });
    // 自动展开视频播放器
    setIsVideoPlayerCollapsed(false);
    // 平滑滚动到视频区域
    requestAnimationFrame(() => {
      const el = videoContainerRef.current;
      if (el) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {
          // 兼容不支持smooth的环境
          const rect = el.getBoundingClientRect();
          window.scrollTo(0, window.scrollY + rect.top - 80);
        }
      }
    });
  }, []);

  // 选择区块
  const handleSelectBlock = useCallback((blockId: string, selected: boolean) => {
    setSelectedBlocks(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(blockId);
      } else {
        newSet.delete(blockId);
      }
      return newSet;
    });
  }, []);

  // 添加新区块
  const handleAddBlock = useCallback((type: SOPBlock['type'] = 'unknown') => {
    const newBlock: SOPBlock = {
      id: generateId(),
      type,
      content: '',
      show_play_button: false
    };
    setBlocksA(prev => [...prev, newBlock]);
    setEditingBlocks(prev => new Set(prev).add(newBlock.id));
  }, [generateId]);

  // 合并选中的区块
  const handleMergeBlocks = useCallback(() => {
    if (selectedBlocks.size < 2) {
      alert('请至少选择2个区块进行合并');
      return;
    }

    const selectedBlocksArray = Array.from(selectedBlocks);
    const blocksToMerge = blocksA.filter(block => selectedBlocksArray.includes(block.id));
    
    if (blocksToMerge.length === 0) return;

    // 合并内容
    const mergedContent = blocksToMerge.map(block => block.content).join('\n\n');
    const mergedBlock: SOPBlock = {
      id: generateId(),
      type: blocksToMerge[0].type, // 使用第一个区块的类型
      content: mergedContent,
      start_time: blocksToMerge[0].start_time, // 使用第一个区块的开始时间
      end_time: blocksToMerge[blocksToMerge.length - 1].end_time, // 使用最后一个区块的结束时间
      show_play_button: blocksToMerge.some(block => block.show_play_button)
    };

    // 删除原区块，添加合并后的区块
    setBlocksA(prev => {
      const filtered = prev.filter(block => !selectedBlocksArray.includes(block.id));
      return [...filtered, mergedBlock];
    });

    // 清理状态
    setSelectedBlocks(new Set());
    setEditingBlocks(new Set());
  }, [selectedBlocks, blocksA, generateId]);

  // 拆分区块
  const handleSplitBlock = useCallback(() => {
    if (selectedBlocks.size !== 1) {
      alert('请选择1个区块进行拆分');
      return;
    }

    const blockId = Array.from(selectedBlocks)[0];
    const blockToSplit = blocksA.find(block => block.id === blockId);
    
    if (!blockToSplit) return;

    // 简单的按段落拆分
    const paragraphs = blockToSplit.content.split('\n\n').filter(p => p.trim());
    
    if (paragraphs.length < 2) {
      alert('区块内容不足以拆分（需要至少2个段落）');
      return;
    }

    // 创建拆分后的区块
    const splitBlocks: SOPBlock[] = paragraphs.map((paragraph) => ({
      id: generateId(),
      type: blockToSplit.type,
      content: paragraph.trim(),
      start_time: blockToSplit.start_time,
      end_time: blockToSplit.end_time,
      show_play_button: blockToSplit.show_play_button
    }));

    // 替换原区块
    setBlocksA(prev => {
      const filtered = prev.filter(block => block.id !== blockId);
      return [...filtered, ...splitBlocks];
    });

    // 清理状态
    setSelectedBlocks(new Set());
    setEditingBlocks(new Set());
  }, [selectedBlocks, blocksA, generateId]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Icon name="edit" size={24} inline />
          {t('sop.editor_title')}
        </h2>
        
        {/* 解析按钮 */}
        {manuscript && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 mb-3">
              {blocksA.length > 0 ? t('sop.parse_tip_done') : t('sop.parse_tip_ready')}
            </p>
            <button
              onClick={handleParseSOP}
              disabled={isParsing}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
            >
              {isParsing ? t('sop.parsing') : t('sop.parse_action')}
            </button>
          </div>
        )}
      </div>

      {/* 视频播放器 - 可折叠 */}
      <div className="mb-6" ref={videoContainerRef}>
        <div className="bg-white rounded-lg shadow-sm border">
          {/* 可折叠标题栏 */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-200"
            onClick={() => setIsVideoPlayerCollapsed(!isVideoPlayerCollapsed)}
          >
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Icon name="video" size={20} className="mr-2" inline />
              {t('sop.video_player')}
            </h3>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">
                {isVideoPlayerCollapsed ? t('sop.expand') : t('sop.collapse')}
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${isVideoPlayerCollapsed ? 'rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* 视频播放器内容 */}
          {!isVideoPlayerCollapsed && (
            <div className="p-4">
              <SOPVideoPlayer
                videoUrl={videoUrl || ''}
                currentStartTime={currentVideoTime.start}
                currentEndTime={currentVideoTime.end}
              />
            </div>
          )}
        </div>
      </div>

      {/* 上下布局编辑器 */}
      <div className="space-y-6 mb-6">
        {/* 上方：用户编辑区 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Icon name="edit" size={20} inline />
              {t('sop.edit_area')}
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handleAddBlock('step')}
                className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              >
                + {t('sop.add_step')}
              </button>
              <button
                onClick={handleMergeBlocks}
                disabled={selectedBlocks.size < 2}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400"
              >
                {t('sop.merge_selected')}
              </button>
              <button
                onClick={handleSplitBlock}
                disabled={selectedBlocks.size !== 1}
                className="px-3 py-1 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors disabled:bg-gray-100 disabled:text-gray-400"
              >
                {t('sop.split_selected')}
              </button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={blocksA.map(block => block.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3 max-h-[40rem] overflow-y-auto">
            {blocksA.map((block, index) => (
                  <SortableBlockItem
                    key={block.id}
                    block={block}
                    index={index}
                    videoUrl={videoUrl}
                    editingBlocks={editingBlocks}
                    selectedBlocks={selectedBlocks}
                    onBlockEdit={handleBlockEdit}
                    onDeleteBlock={handleDeleteBlock}
                    onPlay={handlePlay}
                    onSelectBlock={handleSelectBlock}
                    onToggleEdit={handleToggleEdit}
                  />
            ))}
            
            {blocksA.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Icon name="edit" size={48} className="mb-2 mx-auto" />
                    <div>{t('sop.no_blocks')}</div>
              </div>
            )}
          </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* 下方：AI精修区 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Icon name="sparkles" size={20} inline />
              {t('sop.refine_area')}
            </h3>
            {blocksB.length > 0 && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {t('sop.refine_tip')}
                </span>
                <button
                  onClick={handleApplyRefinement}
                  className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                >
                  {t('sop.replace')}
                </button>
              </div>
            )}
          </div>

          {/* 用户批注输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('sop.user_notes')}
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              rows={3}
              placeholder={t('sop.user_notes_placeholder')}
            />
            <div className="mt-2 flex justify-between">
              <span className="text-xs text-gray-500">
                {userNotes.length}/500 {t('sop.chars')}
              </span>
              <button
                onClick={handleRefine}
                disabled={isRefining || blocksA.length === 0}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg transition-colors text-sm"
              >
                {isRefining ? t('sop.refining') : t('sop.refine_action')}
              </button>
            </div>
          </div>

          {/* 精修结果 */}
          <div className="space-y-3 max-h-[40rem] overflow-y-auto">
            {blocksB.map((block, index) => (
              <div key={block.id} className="relative">
                <div className="absolute left-0 top-2 text-xs text-gray-400 font-mono">
                  {index + 1}
                </div>
                <div className="ml-6">
                  <SOPBlockItem
                    block={block}
                    isEditing={false}
                    isSelected={false}
                    videoUrl={videoUrl}
                    className="opacity-90"
                  />
                </div>
              </div>
            ))}
            
            {blocksB.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Icon name="sparkles" size={48} className="mb-2 mx-auto" />
                <div>{t('sop.refine_empty')}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导出组件 */}
      <div className="mb-6">
        <SOPExporter
          blocksA={blocksA}
          blocksB={blocksB}
          videoUrl={videoUrl}
          fileName="sop_document"
        />
      </div>
    </div>
  );
};

export default SOPEditor;
