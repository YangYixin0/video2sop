'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/i18n';

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
    split_threshold?: number;
    segment_length?: number;
    segment_overlap?: number;
    lang?: string;
  }) => Promise<string>;
  // 可选：长视频时用于展示片段与整合结果
  segmentResults?: { segment_id: number; time_range: string; result: string; status: 'processing' | 'completed' | 'error'; }[];
  integratedResult?: string;
  compressionStatus?: 'idle' | 'compressing' | 'completed' | 'error';
  autoSpeechRecognitionError?: string | null;
}

const DEFAULT_PROMPT_ZH = `1. 提供给你的是一个实验室仪器或实验处理的操作教学视频和它的语音识别结果，请按照这些内容去理解视频内演示者的操作，写一个标准操作流程（SOP）草稿。这个草稿包含标题、摘要、关键词、材料试剂工具设备清单、操作步骤和也许其他内容。其他内容请你合理地整理成一个或多个段落。

2. 这份草稿的操作步骤越具体越好。操作步骤中适当分段，每一段包含"目的"和"操作"两个层级，"操作"是时间上相邻的多个操作，各放一行，"目的"是这些相邻的多个操作的共同目的。每个目的的开头带有一个时间起终范围，格式为(mm:ss-mm:ss)，而操作不要带时间起终范围。

3. 演示者讲的话一定是操作重点，不过细节可能偶尔讲错。同时，语音识别结果也可能有错误，一般是被错误识别为读音相近的字。请你结合上下文来理解。

4. 最终以中文、纯文本格式输出，不使用Markdown语法。

5. 生成一些问题请用户澄清一些重要细节。`;

const DEFAULT_PROMPT_EN = `1. You are given an instructional video of a lab instrument or process, along with its speech recognition transcript. Understand the presenter's actions and write a draft SOP (Standard Operating Procedure). The draft should include: title, abstract, keywords, materials/reagents/tools/equipment list, operation steps, and possibly other relevant content. Organize any other content into one or more paragraphs.

2. The operation steps should be as specific as possible. Split steps appropriately. For each step, include two levels: "Purpose" and "Operations". "Operations" are multiple time-adjacent actions (one per line). "Purpose" is the common purpose of those adjacent actions. Prefix each purpose with a time range in the format (mm:ss-mm:ss). Do NOT add time ranges to the operations.

3. The presenter's speech is the key for understanding, but details may occasionally be incorrect. The transcript can also contain recognition errors (often homophones). Use context to infer the correct meaning.

4. Output in English, plain text only. Do not use Markdown.

5. Generate a few clarification questions for the user about important details.`;

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
  integratedResult = '',
  compressionStatus = 'idle',
  autoSpeechRecognitionError = null
}: VideoUnderstandingPanelProps) {
  const { locale, t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(locale === 'en' ? DEFAULT_PROMPT_EN : DEFAULT_PROMPT_ZH);
  const [userModifiedPrompt, setUserModifiedPrompt] = useState(false);
  const [fps, setFps] = useState(2);
  const [showMarkdown, setShowMarkdown] = useState(true);
  // 语言切换时，如果用户未修改提示词，则同步默认提示词
  useEffect(() => {
    if (!userModifiedPrompt) {
      setPrompt(locale === 'en' ? DEFAULT_PROMPT_EN : DEFAULT_PROMPT_ZH);
    }
    // 仅在 locale 或 userModifiedPrompt 变化时触发
  }, [locale, userModifiedPrompt]);

  
  // 视频分段参数
  const [splitThreshold, setSplitThreshold] = useState(18); // 判定分段阈值（分钟）
  const [segmentLength, setSegmentLength] = useState(15); // 片段时长上限（分钟）
  const [segmentOverlap, setSegmentOverlap] = useState(2); // 片段重叠（分钟）
  const [isParametersExpanded, setIsParametersExpanded] = useState(false); // 视频处理参数折叠状态
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
        split_threshold: splitThreshold, // 判定分段阈值（分钟）
        segment_length: segmentLength, // 片段时长上限（分钟）
        segment_overlap: segmentOverlap, // 片段重叠（分钟）
        lang: locale
      });
      
      setResult(markdownResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '视频理解失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 需要同时满足：上传完成、语音识别完成、压缩完成、没有语音识别错误
  const isReady = Boolean(
    uploadResult && 
    speechRecognitionResult && 
    speechRecognitionResult.length > 0 &&
    compressionStatus === 'completed' &&
    !autoSpeechRecognitionError
  );
  
  // 检查是否有编辑过的语音内容
  const hasEditedSpeech = speechRecognitionResult?.some(item => item.isEdited) || false;

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🎬</span>
            {t('vu.title')}
            <span className="ml-2 text-sm font-normal text-blue-600">{t('vu.model')}</span>
          </h3>
        </div>

      <div className="p-4">
        {/* 前置条件检查 */}
        {!uploadResult ? (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏳</span>
              <span className="text-yellow-700">{t('vu.need_upload')}</span>
            </div>
          </div>
        ) : !speechRecognitionResult || speechRecognitionResult.length === 0 ? (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🎤</span>
              <span className="text-yellow-700">{t('vu.need_asr')}</span>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-green-800">{t('vu.ready_hint')}</span>
            </div>
          </div>
        )}

        {/* 提示词输入框 */}
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            {t('vu.prompt_label')}
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setUserModifiedPrompt(true); }}
            rows={16}
            maxLength={3000}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder={t('vu.prompt_placeholder')}
          />
          <div className="text-xs text-gray-500 mt-1">
            {prompt.length}/3000 {t('vu.chars')}
          </div>
        </div>

        {/* FPS参数输入和视频分段参数设置 - 折叠面板 */}
        <div className="mb-4">
          <button
            onClick={() => setIsParametersExpanded(!isParametersExpanded)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <span className="font-medium text-gray-700">{t('vu.params_title')}</span>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">
                {isParametersExpanded ? t('vu.collapse') : t('vu.expand')}
              </span>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${isParametersExpanded ? '' : 'rotate-90'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {isParametersExpanded && (
            <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg">
        {/* FPS参数输入 */}
        <div className="mb-4">
          <label htmlFor="fps" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vu.fps_label')}
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
                    {t('vu.fps_help', { fps })}
            </span>
          </div>
              </div>

              {/* 视频分段参数设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vu.seg_params')}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 判定分段阈值 */}
                  <div>
                    <label htmlFor="splitThreshold" className="block text-xs text-gray-600 mb-1">
                      {t('vu.seg_threshold')}
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
                      {t('vu.seg_threshold_help')}
                    </div>
                  </div>

                  {/* 片段时长上限 */}
                  <div>
                    <label htmlFor="segmentLength" className="block text-xs text-gray-600 mb-1">
                      {t('vu.seg_length')}
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
                      {t('vu.seg_length_help')}
                    </div>
                  </div>

                  {/* 片段重叠 */}
                  <div>
                    <label htmlFor="segmentOverlap" className="block text-xs text-gray-600 mb-1">
                      {t('vu.seg_overlap')}
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
                      {t('vu.seg_overlap_help')}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {t('vu.seg_summary', { threshold: splitThreshold, length: segmentLength, overlap: segmentOverlap })}
                  <br />
                  <span className="text-blue-600">
                    {t('vu.seg_constraints')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>


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
                <span>{t('vu.run_btn_processing')}</span>
              </div>
            ) : !isReady ? (
              <div className="flex items-center justify-center space-x-2">
                <span>🎬</span>
                <span>{t('vu.run_btn_prereq')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>🎬</span>
                <span>{t('vu.run_btn')}</span>
              </div>
            )}
          </button>
          
          {/* 压缩等待提示 */}
          {!isReady && uploadResult && speechRecognitionResult && speechRecognitionResult.length > 0 && compressionStatus !== 'completed' && (
            <div className="mt-2 text-sm text-amber-600">
              {compressionStatus === 'compressing' && t('vu.waiting_compress_doing')}
              {compressionStatus === 'idle' && t('vu.waiting_compress_idle')}
              {compressionStatus === 'error' && t('vu.waiting_compress_error')}
            </div>
          )}

          {/* 语音识别错误提示 */}
          {autoSpeechRecognitionError && (
            <div className="mt-2 text-sm text-red-600">
              ❌ 语音识别失败，请先重试语音识别
            </div>
          )}
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
                  {t('vu.result_title')}
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
                    📖 {t('vu.view_rendered')}
                  </button>
                  <button
                    onClick={() => setShowMarkdown(false)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      !showMarkdown 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    📝 {t('vu.view_source')}
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
                {t('vu.segments_title')}
              </h4>
            </div>
            <div className="p-3 space-y-2">
              {segmentResults.sort((a,b) => a.segment_id - b.segment_id).map(seg => (
                <details key={seg.segment_id} className="border rounded">
                  <summary className="cursor-pointer select-none px-3 py-2 bg-gray-50 flex items-center justify-between">
                    <span>{t('vu.segment_item', { id: seg.segment_id, range: seg.time_range })}</span>
                    <span className={`text-xs ${seg.status === 'completed' ? 'text-green-600' : seg.status === 'processing' ? 'text-amber-600' : 'text-red-600'}`}>
                      {seg.status === 'completed' ? t('vu.status_completed') : seg.status === 'processing' ? t('vu.status_processing') : t('vu.status_error')}
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
                {t('vu.integrated_title')}
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
            <p>{t('vu.empty_ready_title')}</p>
            <p className="text-sm mt-1">{t('vu.empty_ready_desc')}</p>
            
          </div>
        )}
      </div>
    </div>
  );
}
