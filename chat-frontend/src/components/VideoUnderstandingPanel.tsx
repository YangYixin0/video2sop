'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// 各环节用时典型值面板组件
const PerformanceAnalysisPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
      >
        <span className="font-medium text-gray-700">各环节用时典型值</span>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">
            {isExpanded ? '点击折叠' : '点击展开'}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? '' : 'rotate-90'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-center">视频时长 (min)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">文件大小 (MB)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">分辨率 (px)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">视频上传 (min)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">语音识别 (min)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">视频理解 (min)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">草稿解析 (min)</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">AI精修 (min)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 text-center">1.6</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">30</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1080×1906</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0.4</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0.1</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1.3</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1.7</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0.9</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-center">6.3</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">132</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1080×1920</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0.2</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1.3</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1.5</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0.9</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-3 py-2 text-center">18.4</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">239</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">720×1280</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">2.3</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0.4</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">4.2</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">2</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1.1</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-center">29.5</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">569</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1080×1908</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">5.3</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0.6</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">N/A</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">N/A</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">N/A</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

interface SpeechResult {
  sentence_id: number;
  text: string;
  begin_time: number;
  end_time: number;
  isEdited?: boolean;
  editedText?: string;
}

interface UploadResult {
  video_url: string;
  audio_url: string;
  session_id: string;
}

interface VideoUnderstandingPanelProps {
  uploadResult: UploadResult | null;
  speechRecognitionResult: SpeechResult[] | null;
  onVideoUnderstanding: (params: {
    video_url: string;
    prompt: string;
    fps: number;
    audio_transcript?: string;
    add_timestamp?: boolean;
    split_threshold?: number;
    segment_length?: number;
    segment_overlap?: number;
  }) => Promise<string>;
  // 可选：长视频时用于展示片段与整合结果
  segmentResults?: { segment_id: number; time_range: string; result: string; status: 'processing' | 'completed' | 'error'; }[];
  integratedResult?: string;
}

const DEFAULT_PROMPT = `1. 提供给你的是一个实验室仪器或实验处理的操作教学视频和它的语音识别结果，请按照这些内容去理解视频内演示者的操作，写一个标准操作流程（SOP）草稿。这个草稿包含标题、摘要、关键词、材料试剂工具设备清单、操作步骤和也许其他内容。其他内容请你合理地整理成一个或多个段落。

2. 这份草稿的操作步骤越具体越好。操作步骤中适当分段，每一段包含"目的"和"操作"两个层级，"操作"是时间上相邻的多个操作，各放一行，"目的"是这些相邻的多个操作的共同目的。每个目的的开头带有一个时间起终范围（格式为mm:ss-mm:ss），操作不要带时间起终范围。

3. 演示者讲的话一定是操作重点，不过细节可能偶尔讲错。同时，语音识别结果也可能有错误，一般是被错误识别为读音相近的字。请你结合上下文来理解。

4. 最终以中文、纯文本格式输出，不使用Markdown语法。

5. 生成一些问题请用户澄清一些重要细节。`;

// 清理Markdown内容，移除AI可能添加的代码块标记
const cleanMarkdownContent = (content: string): string => {
  if (!content) return '';
  
  // 移除开头的```markdown标记
  let cleaned = content.replace(/^```markdown\s*\n?/i, '');
  
  // 移除结尾的```标记
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  
  // 移除开头的```标记（如果没有语言标识）
  cleaned = cleaned.replace(/^```\s*\n?/i, '');
  
  // 移除可能的额外换行
  cleaned = cleaned.trim();
  
  return cleaned;
};

export default function VideoUnderstandingPanel({ 
  uploadResult, 
  speechRecognitionResult,
  onVideoUnderstanding,
  segmentResults = [],
  integratedResult = ''
}: VideoUnderstandingPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [fps, setFps] = useState(2);
  const [showMarkdown, setShowMarkdown] = useState(true);
  const [addTimestamp, setAddTimestamp] = useState(false); // 是否叠加时间戳
  
  // 视频分段参数
  const [splitThreshold, setSplitThreshold] = useState(18); // 判定分段阈值（分钟）
  const [segmentLength, setSegmentLength] = useState(15); // 片段时长上限（分钟）
  const [segmentOverlap, setSegmentOverlap] = useState(2); // 片段重叠（分钟）
  const isLongVideo = (segmentResults?.length || 0) > 0 || Boolean(integratedResult);

  const handleVideoUnderstanding = async () => {
    if (!uploadResult || !speechRecognitionResult) return;

    setIsProcessing(true);
    setError(null);
    setResult('');

    try {
      // 将语音识别结果转换为文本，包含时间信息（mm:ss格式）
      const formatTimeForTranscript = (milliseconds: number) => {
        const seconds = Math.floor(milliseconds / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      };

      const audioTranscript = speechRecognitionResult
        .map((item, index) => {
          const startTime = formatTimeForTranscript(item.begin_time);
          const endTime = formatTimeForTranscript(item.end_time);
          return `${index + 1}. [${startTime}-${endTime}] ${item.editedText || item.text}`;
        })
        .join('\n');

      const markdownResult = await onVideoUnderstanding({
        video_url: '', // 不再需要video_url，后端使用client_session_id
        prompt: prompt,
        fps: fps,
        audio_transcript: audioTranscript,
        add_timestamp: addTimestamp, // 传递是否叠加时间戳的选择
        split_threshold: splitThreshold, // 判定分段阈值（分钟）
        segment_length: segmentLength, // 片段时长上限（分钟）
        segment_overlap: segmentOverlap // 片段重叠（分钟）
      });
      
      setResult(markdownResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '视频理解失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const isReady = uploadResult && speechRecognitionResult && speechRecognitionResult.length > 0;
  
  // 检查是否有编辑过的语音内容
  const hasEditedSpeech = speechRecognitionResult?.some(item => item.isEdited) || false;

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🎬</span>
            视频理解
            <span className="ml-2 text-sm font-normal text-blue-600">(Qwen3-VL-Plus)</span>
          </h3>
        </div>

      <div className="p-4">
        {/* 前置条件检查 */}
        {!uploadResult ? (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏳</span>
              <span className="text-yellow-700">请先上传视频文件</span>
            </div>
          </div>
        ) : !speechRecognitionResult || speechRecognitionResult.length === 0 ? (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🎤</span>
              <span className="text-yellow-700">请先执行语音识别获取音频内容</span>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-medium text-green-800">可以进行视频理解</span>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div>
                <strong>视频已上传:</strong> 
                <a 
                  href={uploadResult.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline ml-1"
                >
                  查看视频
                </a>
              </div>
              <div>
                <strong>语音识别完成:</strong> {speechRecognitionResult.length} 句
              </div>
            </div>
          </div>
        )}

        {/* 提示词输入框 */}
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            提示词
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            maxLength={2000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="请输入您的提示词..."
          />
          <div className="text-xs text-gray-500 mt-1">
            {prompt.length}/2000 字符
          </div>
        </div>

        {/* FPS参数输入 */}
        <div className="mb-4">
          <label htmlFor="fps" className="block text-sm font-medium text-gray-700 mb-2">
            视频抽帧参数 (FPS)
          </label>
          <div className="flex items-center space-x-3">
            <input
              id="fps"
              type="number"
              min="1"
              max="10"
              value={fps}
              onChange={(e) => setFps(Math.max(1, Math.min(10, parseInt(e.target.value) || 2)))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-600">
              表示每1秒视频中抽取 {fps} 帧用于理解。FPS值越大，理解越可靠，但处理时间越长
            </span>
          </div>
        </div>

        {/* 时间戳叠加选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            视频处理选项
          </label>
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={addTimestamp}
                onChange={(e) => setAddTimestamp(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="ml-2 text-sm text-gray-700">叠加时间戳</span>
            </label>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {addTimestamp ? 
              "在视频画面上叠加时间戳，便于AI理解音频句子与视频画面的对应关系，用时较长" : 
              "不在视频画面上叠加时间戳，AI将凭音频句子含义和视频画面含义来判断对应关系"
            }
          </div>
        </div>

        {/* 视频分段参数设置 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            视频分段参数
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 判定分段阈值 */}
            <div>
              <label htmlFor="splitThreshold" className="block text-xs text-gray-600 mb-1">
                判定分段阈值（分钟）
              </label>
              <input
                id="splitThreshold"
                type="number"
                min="1"
                max="18"
                value={splitThreshold}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value)) return; // 如果输入无效，不更新状态
                  const newThreshold = Math.max(1, Math.min(18, value));
                  setSplitThreshold(newThreshold);
                  // 如果片段时长上限大于等于新的判定分段阈值，自动调整
                  if (segmentLength >= newThreshold) {
                    const newSegmentLength = Math.max(1, newThreshold - 1);
                    setSegmentLength(newSegmentLength);
                    // 如果片段重叠大于等于新的片段时长上限，自动调整
                    if (segmentOverlap >= newSegmentLength) {
                      setSegmentOverlap(Math.max(0, newSegmentLength - 1));
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">
                超过此时长将分段处理
              </div>
            </div>

            {/* 片段时长上限 */}
            <div>
              <label htmlFor="segmentLength" className="block text-xs text-gray-600 mb-1">
                片段时长上限（分钟）
              </label>
              <input
                id="segmentLength"
                type="number"
                min="1"
                max={Math.min(18, splitThreshold - 1)}
                value={segmentLength}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value)) return; // 如果输入无效，不更新状态
                  const newValue = Math.max(1, Math.min(18, Math.min(splitThreshold - 1, value)));
                  setSegmentLength(newValue);
                  // 如果片段重叠超过新的片段时长上限，自动调整
                  if (segmentOverlap >= newValue) {
                    setSegmentOverlap(Math.max(0, newValue - 1));
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">
                每个片段的最大时长
              </div>
            </div>

            {/* 片段重叠 */}
            <div>
              <label htmlFor="segmentOverlap" className="block text-xs text-gray-600 mb-1">
                片段重叠（分钟）
              </label>
              <input
                id="segmentOverlap"
                type="number"
                min="0"
                max={Math.max(0, segmentLength - 1)}
                value={segmentOverlap}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value)) return; // 如果输入无效，不更新状态
                  setSegmentOverlap(Math.max(0, Math.min(segmentLength - 1, value)));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="text-xs text-gray-500 mt-1">
                相邻片段的重叠时长
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            当前设置：视频超过 {splitThreshold} 分钟将分段，每段最长 {segmentLength} 分钟，重叠 {segmentOverlap} 分钟
            <br />
            <span className="text-blue-600">
              约束条件：片段时长上限 &lt; 判定分段阈值，片段重叠 &lt; 片段时长上限，所有参数最大18分钟
            </span>
          </div>
        </div>

        {/* 用时影响因素分析 - 折叠面板 */}
        <PerformanceAnalysisPanel />

        {/* 执行按钮 */}
        <div className="mb-4">
          <button
            onClick={handleVideoUnderstanding}
            disabled={!isReady || isProcessing}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              !isReady || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>正在分析视频...</span>
              </div>
            ) : !isReady ? (
              <div className="flex items-center justify-center space-x-2">
                <span>🎬</span>
                <span>请先完成前置步骤</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>🎬</span>
                <span>开始视频理解</span>
              </div>
            )}
          </button>
        </div>

        {/* 编辑提示 */}
        {hasEditedSpeech && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">✏️</span>
              <span className="text-blue-700 text-sm">将使用编辑后的语音内容进行视频理解</span>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">❌</span>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 结果显示 */}
        {result && (
          <div className="border border-gray-200 rounded-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-800 flex items-center">
                  <span className="mr-2">📄</span>
                  视频理解结果
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMarkdown(true)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      showMarkdown 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    📖 渲染
                  </button>
                  <button
                    onClick={() => setShowMarkdown(false)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      !showMarkdown 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    📝 源码
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {showMarkdown ? (
                <div className="prose prose-sm max-w-none break-words">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // 覆盖一些样式以确保正确显示
                      h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6 border-b border-gray-200 pb-2 break-words">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-5 break-words">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-lg font-medium text-gray-700 mb-2 mt-4 break-words">{children}</h3>,
                      h4: ({ children }) => <h4 className="text-base font-medium text-gray-700 mb-2 mt-3 break-words">{children}</h4>,
                      p: ({ children }) => <p className="text-gray-700 mb-3 leading-relaxed break-words">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-3 text-gray-700 space-y-1 break-words">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-3 text-gray-700 space-y-1 break-words">{children}</ol>,
                      li: ({ children }) => <li className="mb-1 break-words">{children}</li>,
                      code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono break-all text-gray-800">{children}</code>,
                      pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm break-words whitespace-pre-wrap border">{children}</pre>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 mb-3 break-words bg-blue-50 py-2">{children}</blockquote>,
                      strong: ({ children }) => <strong className="font-bold text-gray-900 break-words">{children}</strong>,
                      em: ({ children }) => <em className="italic text-gray-800 break-words">{children}</em>,
                      // 处理表格
                      table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="min-w-full border-collapse border border-gray-300 bg-white">{children}</table></div>,
                      th: ({ children }) => <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left break-words">{children}</th>,
                      td: ({ children }) => <td className="border border-gray-300 px-3 py-2 break-words">{children}</td>,
                      // 处理链接
                      a: ({ children, href }) => <a href={href} className="text-blue-600 hover:text-blue-800 underline break-words" target="_blank" rel="noopener noreferrer">{children}</a>,
                      // 处理分割线
                      hr: () => <hr className="my-6 border-gray-300" />
                    }}
                  >
                    {cleanMarkdownContent(result)}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono bg-gray-50 p-3 rounded-lg border">
                  {result}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* 长视频：片段结果（可折叠） */}
        {isLongVideo && segmentResults && segmentResults.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h4 className="font-medium text-gray-800 flex items-center">
                <span className="mr-2">🧩</span>
                分段结果
              </h4>
            </div>
            <div className="p-3 space-y-2">
              {segmentResults.sort((a,b) => a.segment_id - b.segment_id).map(seg => (
                <details key={seg.segment_id} className="border rounded">
                  <summary className="cursor-pointer select-none px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <span>片段 {seg.segment_id}（{seg.time_range}）</span>
                    <span className={`text-xs ${seg.status === 'completed' ? 'text-green-600' : seg.status === 'processing' ? 'text-amber-600' : 'text-red-600'}`}>
                      {seg.status === 'completed' ? '已完成' : seg.status === 'processing' ? '处理中' : '错误'}
                    </span>
                  </summary>
                  <div className="px-3 py-2 whitespace-pre-wrap break-words text-sm text-gray-700">
                    {seg.result || '（无内容）'}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* 长视频：整合结果 */}
        {isLongVideo && integratedResult && (
          <div className="mt-4 border border-gray-200 rounded-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h4 className="font-medium text-gray-800 flex items-center">
                <span className="mr-2">🧷</span>
                整合后的SOP草稿
              </h4>
            </div>
            <div className="p-3 whitespace-pre-wrap break-words text-sm text-gray-800">
              {integratedResult}
            </div>
          </div>
        )}

        {/* 空状态提示 */}
        {!isProcessing && !result && !integratedResult && !error && isReady && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🎬</div>
            <p>点击上方&ldquo;开始视频理解&rdquo;按钮</p>
            <p className="text-sm mt-1">系统将结合语音内容分析视频中的操作步骤</p>
            
          </div>
        )}
      </div>
    </div>
  );
}
