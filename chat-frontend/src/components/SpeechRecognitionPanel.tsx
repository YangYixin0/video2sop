'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/i18n';
import { OperationRecord } from './OperationHistory';
import Icon from './Icon';

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
  onSpeechRecognition: (audioUrl: string, vocabulary?: string[]) => Promise<SpeechResult[]>; // 添加易错词参数
  onResultsChange?: (results: SpeechResult[]) => void;
  autoTriggered?: boolean;  // 新增：标记是否自动触发
  autoError?: string | null;  // 新增：自动触发的错误信息
  onAddOperationRecord?: (record: OperationRecord) => void;  // 新增：添加操作记录的回调
  initialVocabulary?: string;  // 新增：初始易错词（用于示例视频）
}

export default function SpeechRecognitionPanel({ 
  uploadResult, 
  onSpeechRecognition,
  onResultsChange,
  autoTriggered = false,
  autoError = null,
  onAddOperationRecord,
  initialVocabulary
}: SpeechRecognitionPanelProps) {
  const { t } = useI18n();
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<SpeechResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingBeginTime, setEditingBeginTime] = useState<number>(0);
  const [editingEndTime, setEditingEndTime] = useState<number>(0);
  const [vocabularyText, setVocabularyText] = useState<string>('');
  const [vocabularyInitialized, setVocabularyInitialized] = useState<boolean>(false);
  
  // 使用 useRef 跟踪是否已经自动触发过，防止无限循环
  const hasAutoTriggeredRef = useRef<boolean>(false);
  // 使用 useRef 跟踪是否已经尝试触发（包括失败的尝试）
  const hasAttemptedTriggerRef = useRef<boolean>(false);

  // 监听初始易错词变化（仅在未手动修改时填充）
  useEffect(() => {
    if (initialVocabulary && !vocabularyInitialized) {
      setVocabularyText(initialVocabulary);
      setVocabularyInitialized(true);
    }
  }, [initialVocabulary, vocabularyInitialized]);

  // 当 autoTriggered 变为 false 时，重置自动触发标记
  useEffect(() => {
    if (!autoTriggered) {
      hasAutoTriggeredRef.current = false;
      hasAttemptedTriggerRef.current = false;
    }
  }, [autoTriggered]);

  // 记忆化语音识别处理函数
  const handleSpeechRecognition = useCallback(async () => {
    // 自动触发时，uploadResult可能还没有设置，所以不检查uploadResult
    if (!autoTriggered && !uploadResult) return;

    setIsProcessing(true);
    setError(null);
    setResults([]);

    try {
      // 处理易错词：自动触发时优先使用 initialVocabulary，否则使用 vocabularyText
      // 这样可以确保自动触发时能使用到从后端传来的易错词
      const vocabularySource = autoTriggered && initialVocabulary 
        ? initialVocabulary 
        : vocabularyText;
      
      const vocabulary = vocabularySource
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      const speechResults = await onSpeechRecognition('', vocabulary.length > 0 ? vocabulary : undefined);
      setResults(speechResults);
      if (onResultsChange) {
        onResultsChange(speechResults);
      }
      
      // 自动触发时不添加操作记录，让WebSocket消息处理
    } catch (err) {
      setError(err instanceof Error ? err.message : '语音识别失败');
    } finally {
      setIsProcessing(false);
    }
  }, [autoTriggered, uploadResult, initialVocabulary, vocabularyText, onSpeechRecognition, onResultsChange]);

  // 执行自动语音识别的函数
  const executeAutoSpeechRecognition = useCallback(() => {
    if (!autoTriggered || hasAutoTriggeredRef.current || isProcessing) {
      return;
    }
    
    const isPageVisible = !document.hidden;
    console.log('条件满足，准备自动触发语音识别', { isPageVisible });
    
    // 标记为已尝试触发
    hasAttemptedTriggerRef.current = true;
    
    // 如果页面在后台，尝试执行（浏览器可能会延迟或限制，但我们会通过可见性监听重试）
    // 如果页面在前台，立即执行
    handleSpeechRecognition()
      .then(() => {
        // 成功执行后标记为已触发
        console.log('自动触发语音识别成功');
        hasAutoTriggeredRef.current = true;
      })
      .catch((err) => {
        console.error('自动触发语音识别失败:', err);
        // 如果失败，不标记为已触发，允许重试
        hasAutoTriggeredRef.current = false;
        setError(err instanceof Error ? err.message : '语音识别失败');
      });
  }, [autoTriggered, isProcessing, handleSpeechRecognition]);

  // 监听自动触发状态
  useEffect(() => {
    if (autoTriggered && !hasAutoTriggeredRef.current && !isProcessing) {
      // 立即尝试执行，不管页面是否可见
      // 如果页面在后台，执行可能会被延迟，但我们会通过可见性监听来处理
      executeAutoSpeechRecognition();
    }
  }, [autoTriggered, isProcessing, executeAutoSpeechRecognition]);

  // 监听页面可见性变化，当页面从后台切换回前台时，如果还没有成功触发，则重试
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isPageVisible = !document.hidden;
      console.log('页面可见性变化:', { isPageVisible, autoTriggered, hasAttemptedTriggerRef: hasAttemptedTriggerRef.current, hasAutoTriggeredRef: hasAutoTriggeredRef.current, isProcessing });
      
      // 如果页面变为可见，且需要自动触发但还没有成功触发
      if (isPageVisible && 
          autoTriggered && 
          hasAttemptedTriggerRef.current && 
          !hasAutoTriggeredRef.current && 
          !isProcessing) {
        console.log('页面变为可见，重试自动触发语音识别');
        // 延迟一小段时间，确保页面完全激活，网络请求可以正常发送
        setTimeout(() => {
          executeAutoSpeechRecognition();
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoTriggered, isProcessing, executeAutoSpeechRecognition]);

  // 监听自动错误状态
  useEffect(() => {
    if (autoError) {
      setError(autoError);
    }
  }, [autoError]);

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
            <Icon name="microphone" size={20} className="mr-2" inline />
            {t('speech.title')}
            <span className="ml-2 text-sm font-normal text-blue-600">(Paraformer-V2)</span>
          </h3>
        </div>

      <div className="p-4">
        {/* 当前视频信息 */}
        {uploadResult ? (
          <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <Icon name="success" size={20} inline />
              <span className="font-medium text-green-800">
                {results.length > 0 ? t('speech.ready_done') : t('speech.ready_upload_done')}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2">
              <Icon name="waiting" size={20} inline />
              <span className="text-yellow-700">{t('speech.need_upload')}</span>
            </div>
          </div>
        )}

        {/* 易错词输入区 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('speech.vocabulary_label')}
          </label>
          <textarea
            value={vocabularyText}
            onChange={(e) => {
              setVocabularyText(e.target.value);
              setVocabularyInitialized(true); // 标记为已手动修改
            }}
            placeholder={t('speech.vocabulary_placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            rows={4}
          />
        </div>

        {/* 语音识别按钮 */}
        <div className="mb-4">
          <button
            onClick={handleSpeechRecognition}
            disabled={!uploadResult || (isProcessing && !autoError)}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              !uploadResult || (isProcessing && !autoError)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : autoError
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('speech.processing')}</span>
              </div>
            ) : autoError ? (
              <div className="flex items-center justify-center space-x-2">
                <Icon name="loading" size={18} inline />
                <span>{t('speech.retry')}</span>
              </div>
            ) : uploadResult ? (
              <div className="flex items-center justify-center space-x-2">
                <Icon name="microphone" size={18} inline />
                <span>{t('speech.start')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Icon name="microphone" size={18} inline />
                <span>{t('speech.need_upload_short')}</span>
              </div>
            )}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="error" size={20} color="#ef4444" inline />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 自动语音识别错误提示 */}
        {autoError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="error" size={20} color="#ef4444" inline />
              <div className="text-red-700 text-sm">
                <p>{t('speech.auto_failed')}: {autoError}</p>
                <p className="text-red-500 text-xs mt-1">{t('speech.manual_retry')}</p>
              </div>
            </div>
          </div>
        )}

        {/* 识别结果 */}
        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h4 className="font-medium text-gray-800 flex items-center">
                {t('speech.result_title', { count: results.length })}
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
                      {t('speech.sentence_index', { index: index + 1 })}
                    </span>
                      {result.isEdited && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                          <Icon name="pencil" size={14} inline />
                          已编辑
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
            <Icon name="microphone" size={48} className="mb-2 mx-auto" />
            <p>点击上方&ldquo;开始语音识别&rdquo;按钮</p>
            <p className="text-sm mt-1">系统将自动处理视频中的音频并显示识别结果</p>
          </div>
        )}
      </div>
    </div>
  );
}
