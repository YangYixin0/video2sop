// SOP区块数据类型定义

export interface SOPBlock {
  id: string;
  type: 'title' | 'abstract' | 'keywords' | 'materials' | 'step' | 'unknown';
  content: string;
  start_time?: number;  // 秒
  end_time?: number;    // 秒
  show_play_button: boolean;
}

export interface SOPBlocksData {
  blocks: SOPBlock[];
  error?: string;
}

// API请求/响应类型
export interface ParseSOPRequest {
  manuscript: string;
}

export interface ParseSOPResponse {
  success: boolean;
  result: SOPBlocksData;
}

export interface RefineSOPRequest {
  blocks: SOPBlock[];
  user_notes: string;
}

export interface RefineSOPResponse {
  success: boolean;
  result: SOPBlocksData;
}

// 区块类型配置
export interface BlockTypeConfig {
  label: string;
  color: string;
  icon: string;
}

export const BLOCK_TYPE_CONFIGS: Record<SOPBlock['type'], BlockTypeConfig> = {
  title: {
    label: '标题',
    color: 'bg-blue-100 border-blue-300',
    icon: '📋'
  },
  abstract: {
    label: '摘要',
    color: 'bg-green-100 border-green-300',
    icon: '📄'
  },
  keywords: {
    label: '关键词',
    color: 'bg-yellow-100 border-yellow-300',
    icon: '🏷️'
  },
  materials: {
    label: '材料清单',
    color: 'bg-purple-100 border-purple-300',
    icon: '🧪'
  },
  step: {
    label: '操作步骤',
    color: 'bg-orange-100 border-orange-300',
    icon: '⚡'
  },
  unknown: {
    label: '其他',
    color: 'bg-gray-100 border-gray-300',
    icon: '📝'
  }
};

// 导出格式类型
export type ExportFormat = 'txt' | 'html';

// 视频播放器相关类型
export interface VideoPlayerProps {
  videoUrl: string;
  currentStartTime?: number;
  currentEndTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

// 区块编辑相关类型
export interface BlockEditMode {
  [blockId: string]: boolean;
}

export interface BlockSelection {
  [blockId: string]: boolean;
}

// 拖拽相关类型
export interface DragResult {
  source: {
    index: number;
    droppableId: string;
  };
  destination: {
    index: number;
    droppableId: string;
  } | null;
}

// 合并拆分相关类型
export interface MergeSplitOperation {
  type: 'merge' | 'split';
  blockIds: string[];
  splitPosition?: number; // 用于拆分操作
}

