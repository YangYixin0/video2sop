'use client';

import React, { useState } from 'react';

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

interface SpeechRecognitionPanelProps {
  uploadResult: UploadResult | null;
  onSpeechRecognition: (audioUrl: string) => Promise<SpeechResult[]>;
}

export default function SpeechRecognitionPanel({ 
  uploadResult, 
  onSpeechRecognition 
}: SpeechRecognitionPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<SpeechResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSpeechRecognition = async () => {
    if (!uploadResult?.audio_url) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);

    try {
      const speechResults = await onSpeechRecognition(uploadResult.audio_url);
      setResults(speechResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : '语音识别失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = milliseconds / 1000;  // 将毫秒转换为秒
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours} h ${mins} min ${secs} s`;
    } else if (mins > 0) {
      return `${mins} min ${secs} s`;
    } else {
      return `${secs} s`;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🎤</span>
            语音识别
            <span className="ml-2 text-sm font-normal text-blue-600">(Paraformer-V2)</span>
          </h3>
        </div>

      <div className="p-4">
        {/* 当前视频信息 */}
        {uploadResult ? (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">✅</span>
              <span className="font-medium text-green-800">视频已上传，可以进行语音识别</span>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏳</span>
              <span className="text-yellow-700">请先上传视频文件，然后即可进行语音识别</span>
            </div>
          </div>
        )}

        {/* 语音识别按钮 */}
        <div className="mb-4">
          <button
            onClick={handleSpeechRecognition}
            disabled={!uploadResult || isProcessing}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              !uploadResult || isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>正在识别中...</span>
              </div>
            ) : uploadResult ? (
              <div className="flex items-center justify-center space-x-2">
                <span>🎤</span>
                <span>开始语音识别</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>🎤</span>
                <span>请先上传视频</span>
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

        {/* 识别结果 */}
        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h4 className="font-medium text-gray-800 flex items-center">
                <span className="mr-2">📄</span>
                识别结果 ({results.length} 句)
              </h4>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div 
                  key={result.sentence_id || index}
                  className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-gray-500 font-mono">
                      第 {index + 1} 句
                    </span>
                    <div className="text-xs text-gray-500 font-mono">
                      {formatTime(result.begin_time)} - {formatTime(result.end_time)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {result.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 空状态提示 */}
        {!isProcessing && results.length === 0 && !error && uploadResult && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🎤</div>
            <p>点击上方&ldquo;开始语音识别&rdquo;按钮</p>
            <p className="text-sm mt-1">系统将自动处理视频中的音频并显示识别结果</p>
          </div>
        )}
      </div>
    </div>
  );
}
