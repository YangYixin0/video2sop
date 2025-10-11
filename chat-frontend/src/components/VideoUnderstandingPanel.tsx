'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SpeechResult {
  sentence_id: number;
  text: string;
  begin_time: number;
  end_time: number;
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
  }) => Promise<string>;
}

const DEFAULT_PROMPT = `1. 这是一个实验室仪器的操作教学视频和它的语音内容，请按照这些内容理解视频内演示者的操作，描述一个标准操作流程（SOP）草稿。这个草稿包含标题、摘要、关键词、操作步骤，还有材料试剂工具设备清单。

2. 操作步骤越细致越好。步骤包含"目的"和"操作"两个层级，相邻的多个操作由它们的共同目的所统领。每个目的或步骤带有一个时间起终范围（精确到秒）。

3. 最终以纯文本格式输出，不要使用任何Markdown语法标记。`;

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
  onVideoUnderstanding 
}: VideoUnderstandingPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [fps, setFps] = useState(2);
  const [showMarkdown, setShowMarkdown] = useState(true);

  const handleVideoUnderstanding = async () => {
    if (!uploadResult?.video_url || !speechRecognitionResult) return;

    setIsProcessing(true);
    setError(null);
    setResult('');

    try {
      // 将语音识别结果转换为文本
      const audioTranscript = speechRecognitionResult
        .map((item, index) => `${index + 1}. ${item.text}`)
        .join('\n');

      const markdownResult = await onVideoUnderstanding({
        video_url: uploadResult.video_url,
        prompt: prompt,
        fps: fps,
        audio_transcript: audioTranscript
      });
      
      setResult(markdownResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '视频理解失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const isReady = uploadResult && speechRecognitionResult && speechRecognitionResult.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">🎬</span>
          视频理解
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
              表示每隔 1/{fps} 秒抽取一帧，值越小分析越详细但处理时间越长
            </span>
          </div>
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

        {/* 空状态提示 */}
        {!isProcessing && !result && !error && isReady && (
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
