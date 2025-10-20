'use client';

import React, { useState } from 'react';

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

interface SpeechRecognitionPanelProps {
  uploadResult: UploadResult | null;
  onSpeechRecognition: (audioUrl: string) => Promise<SpeechResult[]>; // 保持接口兼容，但实际不使用audioUrl
  onResultsChange?: (results: SpeechResult[]) => void;
}

export default function SpeechRecognitionPanel({ 
  uploadResult, 
  onSpeechRecognition,
  onResultsChange
}: SpeechRecognitionPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<SpeechResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingBeginTime, setEditingBeginTime] = useState<number>(0);
  const [editingEndTime, setEditingEndTime] = useState<number>(0);

  const handleSpeechRecognition = async () => {
    if (!uploadResult) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);

    try {
      const speechResults = await onSpeechRecognition(''); // 不再需要audio_url参数
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

  // 开始编辑
  const handleStartEdit = (index: number) => {
    const result = results[index];
    setEditingIndex(index);
    setEditingText(result.editedText || result.text);
    setEditingBeginTime(result.begin_time);
    setEditingEndTime(result.end_time);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const newResults = [...results];
    newResults[editingIndex] = {
      ...newResults[editingIndex],
      editedText: editingText,
      begin_time: editingBeginTime,
      end_time: editingEndTime,
      isEdited: true
    };
    
    setResults(newResults);
    setEditingIndex(null);
    setEditingText('');
    setEditingBeginTime(0);
    setEditingEndTime(0);
    
    // 通知父组件结果变化
    onResultsChange?.(newResults);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
    setEditingBeginTime(0);
    setEditingEndTime(0);
  };

  // 获取显示的文本（编辑后的或原始文本）
  const getDisplayText = (result: SpeechResult) => {
    return result.editedText || result.text;
  };

  // 将毫秒转换为秒（用于输入框）
  const millisecondsToSeconds = (milliseconds: number) => {
    return (milliseconds / 1000).toFixed(1);
  };

  // 将秒转换为毫秒（用于保存）
  const secondsToMilliseconds = (seconds: string) => {
    return Math.round(parseFloat(seconds) * 1000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-lg shadow-sm border">
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
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 font-mono">
                        第 {index + 1} 句
                      </span>
                      {result.isEdited && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✏️ 已编辑
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingIndex === index ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">开始:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={millisecondsToSeconds(editingBeginTime)}
                              onChange={(e) => setEditingBeginTime(secondsToMilliseconds(e.target.value))}
                              className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                              placeholder="0.0"
                            />
                            <span className="text-xs text-gray-500">s</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">结束:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={millisecondsToSeconds(editingEndTime)}
                              onChange={(e) => setEditingEndTime(secondsToMilliseconds(e.target.value))}
                              className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                              placeholder="0.0"
                            />
                            <span className="text-xs text-gray-500">s</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 font-mono">
                          {formatTime(result.begin_time)} - {formatTime(result.end_time)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {editingIndex === index ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        rows={3}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            handleCancelEdit();
                          } else if (e.ctrlKey && e.key === 'Enter') {
                            handleSaveEdit();
                          }
                        }}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p 
                      className="text-sm text-gray-800 leading-relaxed cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                      onClick={() => handleStartEdit(index)}
                      title="点击编辑文本和时间"
                    >
                      {getDisplayText(result)}
                    </p>
                  )}
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
