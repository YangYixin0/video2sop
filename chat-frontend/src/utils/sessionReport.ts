import { OperationRecord } from '@/components/OperationHistory';
import { SOPBlock } from '@/types/sop';

// 定义操作数据的类型
interface UploadData {
  video_url?: string;
  audio_url?: string;
  session_id?: string;
}

interface SpeechRecognitionData {
  speech_result?: unknown;
}

interface VideoUnderstandingData {
  video_result?: string;
  fps?: number;
}

interface SOPParseData {
  blocks_count?: number;
}

interface SOPRefineData {
  blocks_count?: number;
  has_user_notes?: boolean;
}

interface FileRemovedData {
  deleted_count?: number;
}


export interface SessionReportOptions {
  includeVideoLinks: boolean;
  sessionId?: string;
  clientSessionId?: string;
  uploadResult?: {
    video_url: string;
    audio_url: string;
    session_id: string;
  } | null;
  speechRecognitionResult?: {
    sentence_id: number;
    text: string;
  }[] | null;
  videoUnderstandingResult?: string;
  videoUnderstandingPrompt?: string;
  operationRecords: OperationRecord[];
  sopBlocks?: SOPBlock[];
  refinedSopBlocks?: SOPBlock[];
  sopParsePrompt?: string;
  sopRefinePrompt?: string;
}

export function generateSessionReport(options: SessionReportOptions): string {
  const {
    includeVideoLinks,
    sessionId,
    clientSessionId,
    uploadResult,
    speechRecognitionResult,
    videoUnderstandingResult,
    videoUnderstandingPrompt,
    operationRecords,
    sopBlocks,
    refinedSopBlocks,
    sopParsePrompt,
    sopRefinePrompt
  } = options;

  const timestamp = new Date().toLocaleString('zh-CN');
  const reportId = sessionId || clientSessionId || 'unknown';

  // 生成操作记录HTML
  const operationRecordsHtml = operationRecords.map(record => {
    const icon = getOperationIcon(record.type);
    const statusColor = record.status === 'success' ? 'text-green-600' : 
                       record.status === 'error' ? 'text-red-600' : 'text-yellow-600';
    
    return `
      <div class="bg-white rounded-lg border border-gray-200 p-4 mb-3">
        <div class="flex items-start space-x-3">
          <span class="text-2xl">${icon}</span>
          <div class="flex-1">
            <div class="flex items-center space-x-2 mb-2">
              <h4 class="font-semibold text-gray-800">${getOperationTitle(record.type)}</h4>
              <span class="text-xs ${statusColor}">${record.status}</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${record.message}</p>
            <p class="text-xs text-gray-500">${record.timestamp.toLocaleString('zh-CN')}</p>
            ${record.data ? generateDataHtml(record.data, record.type, includeVideoLinks) : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // 生成语音识别结果HTML
  const speechRecognitionHtml = speechRecognitionResult && speechRecognitionResult.length > 0 ? `
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">🎤 语音识别结果</h3>
      <div class="space-y-2">
        ${speechRecognitionResult.map((item) => `
          <div class="bg-gray-50 rounded p-3">
            <div class="text-sm text-gray-600 mb-1">句子 ${item.sentence_id}</div>
            <div class="text-gray-800">${item.text}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // 生成视频理解结果HTML
  const videoUnderstandingHtml = videoUnderstandingResult ? `
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">🎬 视频理解结果</h3>
      ${videoUnderstandingPrompt ? `
        <div class="mb-3">
          <h4 class="text-sm font-medium text-gray-700 mb-2">用户提示词：</h4>
          <div class="bg-blue-50 rounded p-3">
            <pre class="whitespace-pre-wrap text-sm text-gray-800">${videoUnderstandingPrompt}</pre>
          </div>
        </div>
      ` : ''}
      <div class="bg-gray-50 rounded p-4">
        <h4 class="text-sm font-medium text-gray-700 mb-2">理解结果：</h4>
        <pre class="whitespace-pre-wrap text-sm text-gray-800">${videoUnderstandingResult}</pre>
      </div>
    </div>
  ` : '';

  // 生成SOP区块HTML
  const sopBlocksHtml = sopBlocks && sopBlocks.length > 0 ? `
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">📋 SOP解析结果</h3>
      ${sopParsePrompt ? `
        <div class="mb-3">
          <h4 class="text-sm font-medium text-gray-700 mb-2">解析提示词：</h4>
          <div class="bg-blue-50 rounded p-3">
            <pre class="whitespace-pre-wrap text-sm text-gray-800">${sopParsePrompt}</pre>
          </div>
        </div>
      ` : ''}
      <div class="space-y-3">
        ${sopBlocks.map((block, index) => `
          <div class="bg-gray-50 rounded p-3">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-sm font-medium text-gray-700">区块 ${index + 1}</span>
              <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">${block.type || 'unknown'}</span>
            </div>
            <div class="text-sm text-gray-800">${block.content || '无内容'}</div>
            ${block.start_time !== undefined && block.end_time !== undefined ? `
              <div class="text-xs text-gray-500 mt-1">时间: ${block.start_time}s - ${block.end_time}s</div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  // 生成SOP精修结果HTML
  const refinedSopBlocksHtml = refinedSopBlocks && refinedSopBlocks.length > 0 ? `
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">✨ SOP精修结果</h3>
      ${sopRefinePrompt ? `
        <div class="mb-3">
          <h4 class="text-sm font-medium text-gray-700 mb-2">精修提示词：</h4>
          <div class="bg-blue-50 rounded p-3">
            <pre class="whitespace-pre-wrap text-sm text-gray-800">${sopRefinePrompt}</pre>
          </div>
        </div>
      ` : ''}
      <div class="space-y-3">
        ${refinedSopBlocks.map((block, index) => `
          <div class="bg-gray-50 rounded p-3">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-sm font-medium text-gray-700">区块 ${index + 1}</span>
              <span class="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">${block.type || 'unknown'}</span>
            </div>
            <div class="text-sm text-gray-800">${block.content || '无内容'}</div>
            ${block.start_time !== undefined && block.end_time !== undefined ? `
              <div class="text-xs text-gray-500 mt-1">时间: ${block.start_time}s - ${block.end_time}s</div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Video2SOP 会话报告</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
  <div class="max-w-4xl mx-auto p-6">
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Video2SOP 会话报告</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <span class="font-medium">生成时间:</span> ${timestamp}
        </div>
        <div>
          <span class="font-medium">会话ID:</span> ${reportId}
        </div>
        <div>
          <span class="font-medium">报告类型:</span> ${includeVideoLinks ? '包含视频链接' : '不包含视频链接'}
        </div>
        <div>
          <span class="font-medium">操作记录数:</span> ${operationRecords.length}
        </div>
      </div>
    </div>

    ${includeVideoLinks && uploadResult ? `
      <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 class="text-lg font-semibold text-gray-800 mb-3">📁 上传文件</h3>
        <div class="space-y-2">
          <div class="bg-gray-50 rounded p-3">
            <div class="text-sm text-gray-600 mb-1">视频文件</div>
            <div class="text-sm text-blue-600 break-all">${uploadResult.video_url}</div>
          </div>
          <div class="bg-gray-50 rounded p-3">
            <div class="text-sm text-gray-600 mb-1">音频文件</div>
            <div class="text-sm text-blue-600 break-all">${uploadResult.audio_url}</div>
          </div>
        </div>
      </div>
    ` : ''}

    ${speechRecognitionHtml}
    ${videoUnderstandingHtml}
    ${sopBlocksHtml}
    ${refinedSopBlocksHtml}

    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">📝 操作记录</h3>
      <div class="space-y-3">
        ${operationRecordsHtml}
      </div>
    </div>

    <div class="mt-6 text-center text-sm text-gray-500">
      <p>此报告由 Video2SOP 自动生成</p>
      <p>生成时间: ${timestamp}</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function getOperationIcon(type: OperationRecord['type']): string {
  switch (type) {
    case 'upload': return '📁';
    case 'speech_recognition': return '🎤';
    case 'video_understanding': return '🎬';
    case 'sop_parse': return '📋';
    case 'sop_refine': return '✨';
    case 'file_removed': return '🗑️';
    default: return '📝';
  }
}

function getOperationTitle(type: OperationRecord['type']): string {
  switch (type) {
    case 'upload': return '视频上传';
    case 'speech_recognition': return '语音识别';
    case 'video_understanding': return '视频理解';
    case 'sop_parse': return '草稿解析';
    case 'sop_refine': return 'SOP精修';
    case 'file_removed': return '文件删除';
    default: return '未知操作';
  }
}

function generateDataHtml(data: unknown, type: OperationRecord['type'], includeVideoLinks: boolean): string {
  if (!data) return '';
  
  let html = '<div class="mt-2 text-xs text-gray-500">';
  
  switch (type) {
    case 'upload': {
      const uploadData = data as UploadData;
      if (includeVideoLinks) {
        if (uploadData.video_url) {
          html += `<div>视频: <span class="text-blue-600 break-all">${uploadData.video_url}</span></div>`;
        }
        if (uploadData.audio_url) {
          html += `<div>音频: <span class="text-blue-600 break-all">${uploadData.audio_url}</span></div>`;
        }
      } else {
        // 不包含视频链接时，只显示其他信息
        if (uploadData.session_id) {
          html += `<div>会话ID: ${uploadData.session_id}</div>`;
        }
      }
      break;
    }
    case 'speech_recognition': {
      const speechData = data as SpeechRecognitionData;
      if (speechData.speech_result) {
        html += `<div>识别结果: ${JSON.stringify(speechData.speech_result)}</div>`;
      }
      break;
    }
    case 'video_understanding': {
      const videoData = data as VideoUnderstandingData;
      if (videoData.video_result) {
        html += `<div>理解结果: ${videoData.video_result.substring(0, 100)}${videoData.video_result.length > 100 ? '...' : ''}</div>`;
      }
      if (videoData.fps) {
        html += `<div>帧率: ${videoData.fps}</div>`;
      }
      break;
    }
    case 'sop_parse': {
      const parseData = data as SOPParseData;
      if (parseData.blocks_count) {
        html += `<div>区块数量: ${parseData.blocks_count}</div>`;
      }
      break;
    }
    case 'sop_refine': {
      const refineData = data as SOPRefineData;
      if (refineData.blocks_count) {
        html += `<div>区块数量: ${refineData.blocks_count}</div>`;
      }
      if (refineData.has_user_notes) {
        html += `<div>包含用户批注: 是</div>`;
      }
      break;
    }
    case 'file_removed': {
      const removedData = data as FileRemovedData;
      if (removedData.deleted_count) {
        html += `<div>删除文件数: ${removedData.deleted_count}</div>`;
      }
      break;
    }
  }
  
  html += '</div>';
  return html;
}

export function downloadSessionReport(html: string, filename?: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `video2sop-session-${Date.now()}.html`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
