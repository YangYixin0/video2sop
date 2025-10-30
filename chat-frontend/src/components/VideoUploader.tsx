'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useI18n } from '@/i18n';
import { API_ENDPOINTS } from '@/config/api';

// 各环节用时典型值面板组件
const PerformanceAnalysisPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useI18n();

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
      >
        <span className="font-medium text-gray-700">{t('vu.factors_title')}</span>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">
            {isExpanded ? t('vu.factors_collapse') : t('vu.factors_expand')}
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
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_video_len')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_file_size')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_resolution')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_upload')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_asr')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_compression_720p')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_compression_1080p')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_understanding')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_parse')}</th>
                  <th className="border border-gray-300 px-3 py-2 text-center">{t('vu.table_refine')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                  <td className="border border-gray-300 px-3 py-2 text-center">9:38</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1.37 GB</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1080×1920</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">10:08</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0:13</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">10:13</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">11:50</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1:10</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">3:15</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0:56</td>
                  </tr>
                  <tr className="bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-center">17:39</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">2.11 GB</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1080×1920</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">14:11</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">0:22</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">19:18</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">27:32</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1:12</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">2:46</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">1:19</td>
                  </tr>
                </tbody>
              </table>
          </div>
        </div>
      )}
    </div>
  );
};

interface UploadStatus {
  status: 'idle' | 'uploading' | 'extracting' | 'completed' | 'error';
  message: string;
  progress: number;
}

interface UploadResult {
  video_url: string;
  audio_url: string;
  session_id: string;
}

interface VideoUploaderProps {
  onUploadStart?: () => void;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  onFileRemoved?: () => void;
  onWebSocketMessage?: (message: Record<string, unknown>) => void;
  onCompressionMessage?: (message: Record<string, unknown>) => void;
  onVideoPreviewChange?: (previewUrl: string | null) => void; // 新增：视频预览URL变化回调
  compressionMessage?: {
    type: string;
    message?: string;
    current_frame?: number;
    total_frames?: number;
    percentage?: number;
    [key: string]: unknown;
  } | null;
  maxFileSize?: number; // 字节
  allowedTypes?: string[];
  clientSessionId?: string;
}

const DEFAULT_MAX_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
const DEFAULT_ALLOWED_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];

export default function VideoUploader({
  onUploadStart,
  onUploadComplete,
  onUploadError,
  onFileRemoved,
  onWebSocketMessage,
  onCompressionMessage,
  onVideoPreviewChange,
  compressionMessage,
  maxFileSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  clientSessionId
}: VideoUploaderProps) {
  const { t } = useI18n();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: '',
    progress: 0
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [compressionStatus, setCompressionStatus] = useState<'idle' | 'compressing' | 'completed' | 'error'>('idle');
  const [compressionStatusMessage, setCompressionStatusMessage] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState<{
    currentFrame: number;
    totalFrames: number;
    percentage: number;
  } | null>(null);
  const [exampleVideoFilename, setExampleVideoFilename] = useState<string>('example_video.mp4');
  const [isExampleVideo, setIsExampleVideo] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 获取示例视频信息
  useEffect(() => {
    const fetchExampleVideoInfo = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.EXAMPLE_VIDEO_INFO);
        if (response.ok) {
          const data = await response.json();
          setExampleVideoFilename(data.filename || 'example_video.mp4');
        }
      } catch (error) {
        console.error('获取示例视频信息失败:', error);
        // 保持默认文件名
      }
    };

    fetchExampleVideoInfo();
  }, []);

  // 处理压缩消息
  useEffect(() => {
    if (compressionMessage) {
      if (compressionMessage.type === 'compression_started') {
        setCompressionStatus('compressing');
        setCompressionStatusMessage(compressionMessage.message as string || t('uploader.compressing'));
        setCompressionProgress(null); // 重置进度
      } else if (compressionMessage.type === 'compression_progress') {
        setCompressionProgress({
          currentFrame: compressionMessage.current_frame as number,
          totalFrames: compressionMessage.total_frames as number,
          percentage: compressionMessage.percentage as number
        });
        setCompressionStatusMessage(compressionMessage.message as string);
      } else if (compressionMessage.type === 'compression_completed') {
        setCompressionStatus('completed');
        setCompressionStatusMessage(compressionMessage.message as string || t('uploader.compression_done'));
        setCompressionProgress(null); // 清除进度
      } else if (compressionMessage.type === 'compression_error') {
        setCompressionStatus('error');
        setCompressionStatusMessage(compressionMessage.message as string || t('uploader.compression_failed'));
        setCompressionProgress(null); // 清除进度
      }
    }
  }, [compressionMessage]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((msg: Record<string, unknown>) => {
    // 转发消息给父组件
    if (onWebSocketMessage) {
      onWebSocketMessage(msg);
    }
  }, [onWebSocketMessage]);

  // 检查会话是否被保留，如果未保留则清理
  const checkAndCleanup = useCallback(async (sessionId: string) => {
    try {
      // 检查会话是否被标记为保留
      const checkResponse = await fetch(`${API_ENDPOINTS.CHECK_SESSION_KEEP_VIDEO}?session_id=${sessionId}`);
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.is_kept) {
          console.log(`会话 ${sessionId} 被标记为保留，跳过清理`);
          return;
        }
      }
      
      // 如果未保留，则清理文件
      const deleteResponse = await fetch(API_ENDPOINTS.DELETE_SESSION_FILES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: sessionId,
          client_session_id: clientSessionId
        }),
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (deleteResponse.ok) {
        console.log(`会话 ${sessionId} 的文件已清理`);
      }
    } catch (error) {
      console.error('检查或清理文件时出错:', error);
    }
  }, [clientSessionId]);

  // 使用 Blob 下载压缩视频，避免同标签导航触发 beforeunload
  const handleDownloadCompressed = useCallback(async () => {
    if (!uploadResult?.session_id) return;
    const url = `${API_ENDPOINTS.DOWNLOAD_COMPRESSED_VIDEO}?session_id=${encodeURIComponent(uploadResult.session_id)}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = 'compressed_video.mp4';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error('下载压缩视频失败:', e);
    }
  }, [uploadResult]);

  // 清理函数
  const cleanup = useCallback(async () => {
    if (uploadResult && uploadResult.session_id) {
      try {
        // 检查会话是否被标记为保留
        const checkResponse = await fetch(`${API_ENDPOINTS.CHECK_SESSION_KEEP_VIDEO}?session_id=${uploadResult.session_id}`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.is_kept) {
            console.log(`会话 ${uploadResult.session_id} 被标记为保留，跳过清理`);
            return { deleted_count: 0 };
          }
        }
        
        // 如果未保留，则清理文件
        const response = await fetch(API_ENDPOINTS.DELETE_SESSION_FILES, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: uploadResult.session_id,
            client_session_id: clientSessionId
          }),
          mode: 'cors',
          credentials: 'omit'
        });
        const result = await response.json();
        const deleteResult = result.result || { deleted_count: 0 };
        
        // 重置压缩状态
        setCompressionStatus('idle');
        setCompressionStatusMessage('');
        
        return deleteResult;
      } catch (error) {
        console.error('清理文件失败:', error);
        return { deleted_count: 0 };
      }
    }
    return { deleted_count: 0 };
  }, [uploadResult, clientSessionId]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (uploadResult && uploadResult.session_id) {
        // 检查会话是否被标记为保留
        checkAndCleanup(uploadResult.session_id);
      }
    };
  }, [uploadResult, clientSessionId, checkAndCleanup]);

  // 页面关闭时清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (uploadResult && uploadResult.session_id) {
        // 检查会话是否被标记为保留
        checkAndCleanup(uploadResult.session_id);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploadResult, clientSessionId, checkAndCleanup]);

  // 获取上传签名
  const getUploadSignature = useCallback(async (filename: string, sessionId: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.GENERATE_UPLOAD_SIGNATURE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          session_id: sessionId,
          file_type: 'video'
        }),
        mode: 'cors',
        credentials: 'omit'
      });
      const data = await response.json();
      if (data.success) {
        return data.signature;
      } else {
        throw new Error(t('uploader.sign_failed'));
      }
    } catch (error) {
      throw new Error(`${t('uploader.sign_failed')}: ${error}`);
    }
  }, []);

  // 直接上传到 OSS
  const uploadToOSS = useCallback(async (file: File, signature: Record<string, unknown>) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', String(signature.oss_key || ''));
    formData.append('policy', String(signature.policy || ''));
    formData.append('OSSAccessKeyId', String(signature.OSSAccessKeyId || ''));
    formData.append('signature', String(signature.signature || ''));
    formData.append('success_action_status', '200');

    const response = await fetch(String(signature.upload_url || ''), {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      }
    });

    if (!response.ok) {
      throw new Error(`OSS ${t('uploader.oss_upload_failed')}: ${response.statusText}`);
    }

    return signature.oss_url;
  }, []);

  // 代理上传到后端
  const uploadViaProxy = useCallback(async (file: File, sessionId: string) => {
    // 从环境变量获取超时时间，默认10分钟
    const timeoutMs = parseInt(process.env.NEXT_PUBLIC_VIDEO_UPLOAD_TIMEOUT || '600000', 10);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', sessionId);
      formData.append('file_type', 'video');
      if (clientSessionId) {
        formData.append('client_session_id', clientSessionId);
      }

      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(API_ENDPOINTS.UPLOAD_FILE_PROXY, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();
      if (data.success) {
        return data.file_url;
      } else {
        throw new Error(t('uploader.proxy_failed'));
      }
    } catch (error) {
      console.error(t('uploader.upload_failed') + ':', error);
      
      // 检查是否是超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutMinutes = Math.round(timeoutMs / 60000);
        throw new Error(t('uploader.upload_timeout', { minutes: timeoutMinutes }));
      }
      
      throw error;
    }
  }, [clientSessionId]);

  // 提取音频
  const extractAudio = useCallback(async (videoUrl: string, sessionId: string) => {
    // 从环境变量获取超时时间，默认5分钟
    const timeoutMs = parseInt(process.env.NEXT_PUBLIC_AUDIO_EXTRACT_TIMEOUT || '300000', 10);
    
    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(API_ENDPOINTS.EXTRACT_AUDIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          session_id: sessionId,
          client_session_id: clientSessionId
        }),
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();
      if (data.success) {
        return data.audio_url;
      } else {
        throw new Error(t('uploader.audio_extract_failed'));
      }
    } catch (error) {
      console.error(t('uploader.audio_extract_failed') + ':', error);
      
      // 检查是否是超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutMinutes = Math.round(timeoutMs / 60000);
        throw new Error(t('uploader.audio_extract_timeout', { minutes: timeoutMinutes }));
      }
      
      throw error;
    }
  }, [clientSessionId]);

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return t('uploader.file_too_large', { size: Math.round(maxFileSize / 1024 / 1024) });
    }
    
    if (!allowedTypes.includes(file.type)) {
      return t('uploader.unsupported_type', { types: allowedTypes.join(', ') });
    }
    
    return null;
  }, [maxFileSize, allowedTypes]);

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadStatus({ status: 'error', message: error, progress: 0 });
      onUploadError?.(error);
      return;
    }

    setSelectedFile(file);
    setUploadStatus({ status: 'idle', message: '', progress: 0 });
    setUploadResult(null);
    setIsExampleVideo(false); // 重置示例视频状态
    
    // 创建预览 URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
    
    // 通知父组件视频预览URL变化
    if (onVideoPreviewChange) {
      onVideoPreviewChange(previewUrl);
    }
  }, [validateFile, onUploadError, onVideoPreviewChange]);

  // 上传处理
  const handleUpload = useCallback(async (resolution: '1080p' | '720p') => {
    if (!selectedFile || !clientSessionId) return;

    try {
      // 调用上传开始回调
      if (onUploadStart) {
        onUploadStart();
      }

      setUploadStatus({ status: 'uploading', message: t('uploader.uploading_hint'), progress: 10 });

      // 直接上传视频到后端，使用 clientSessionId
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('client_session_id', clientSessionId);
      formData.append('target_resolution', resolution);

      const response = await fetch(API_ENDPOINTS.UPLOAD_VIDEO_TO_BACKEND, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(t('uploader.upload_failed'));
      }

      setUploadStatus({ status: 'completed', message: t('uploader.upload_done'), progress: 100 });

      // 回调，返回session_id和audio_url
      const result: UploadResult = {
        session_id: data.session_id,  // 实际是client_session_id
        video_url: '',
        audio_url: data.audio_url || ''  // 从后端获取音频URL
      };
      setUploadResult(result);
      onUploadComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('uploader.upload_failed');
      setUploadStatus({ status: 'error', message: errorMessage, progress: 0 });
      onUploadError?.(errorMessage);
    }
  }, [selectedFile, onUploadStart, onUploadComplete, onUploadError, clientSessionId]);

  // 移除文件
  const handleRemove = useCallback(async () => {
    let deletedCount = 0;
    const currentSessionId = uploadResult?.session_id;
    
    // 如果正在压缩，先取消压缩任务
    if (compressionStatus === 'compressing' && currentSessionId) {
      try {
        const response = await fetch(API_ENDPOINTS.CANCEL_COMPRESSION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: currentSessionId }),
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (response.ok) {
          console.log('压缩任务已取消');
        }
      } catch (error) {
        console.error('取消压缩任务失败:', error);
      }
    }
    
    if (uploadResult) {
      try {
        const result = await cleanup();
        deletedCount = result?.deleted_count || 0;
      } catch (error) {
        console.error('清理文件时出错:', error);
      }
    }
    
    setSelectedFile(null);
    setVideoPreview(null);
    setUploadResult(null);
    setUploadStatus({ status: 'idle', message: '', progress: 0 });
    setCompressionStatus('idle');
    setCompressionStatusMessage('');
    setCompressionProgress(null);
    
    // 通知父组件视频预览URL已清除
    if (onVideoPreviewChange) {
      onVideoPreviewChange(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 通知父组件文件已删除（通过回调处理操作记录）
    if (currentSessionId && deletedCount > 0) {
      onFileRemoved?.();
    }
  }, [uploadResult, cleanup, onFileRemoved, compressionStatus]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 文件输入处理
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 加载示例视频
  const handleLoadExampleVideo = useCallback(async () => {
    if (!clientSessionId) return;
    
    try {
      setUploadStatus({ status: 'uploading', message: t('uploader.loading_example'), progress: 10 });
      
      // 从后端获取示例视频
      const response = await fetch(API_ENDPOINTS.LOAD_EXAMPLE_VIDEO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_session_id: clientSessionId }),
        mode: 'cors',
        credentials: 'omit'
      });
      
      const data = await response.json();
      if (data.success) {
        setUploadStatus({ status: 'completed', message: t('uploader.example_loaded'), progress: 100 });
        setIsExampleVideo(true); // 标记为示例视频
        
        const result: UploadResult = {
          session_id: data.session_id,
          video_url: '',
          audio_url: data.audio_url || ''  // 从后端获取音频URL
        };
        
        
        // 设置示例视频的预览
        const exampleFile = new File([], exampleVideoFilename, { type: 'video/mp4' });
        setSelectedFile(exampleFile);
        
        // 为示例视频创建预览URL
        setVideoPreview(API_ENDPOINTS.EXAMPLE_VIDEO_PREVIEW);
        
        // 通知父组件视频预览URL变化
        if (onVideoPreviewChange) {
          onVideoPreviewChange(API_ENDPOINTS.EXAMPLE_VIDEO_PREVIEW);
        }
        
        setUploadResult(result);
        
        // 调用onUploadComplete回调，确保前端状态正确更新
        onUploadComplete?.(result);
        
        // 同时发送WebSocket消息
        onWebSocketMessage?.({
          type: 'upload_complete',
          session_id: data.session_id,
          client_session_id: clientSessionId
        });
      } else {
        throw new Error(data.error || t('uploader.example_failed'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('uploader.example_failed');
      setUploadStatus({ status: 'error', message: errorMessage, progress: 0 });
      onUploadError?.(errorMessage);
    }
  }, [clientSessionId, onUploadComplete, onUploadError, onWebSocketMessage]);

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">📁</span>
          {t('uploader.title')}
        </h3>
      </div>
      
      <div className="p-4">

      {/* 视频预览 */}
      {videoPreview && selectedFile && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('uploader.preview')}</h4>
          <video
            src={videoPreview}
            controls
            className="w-full max-h-64 rounded-lg"
            preload="metadata"
          >
            {t('uploader.no_video_support')}
          </video>
        </div>
      )}

      {/* 拖拽区域 */}
      <div
        ref={dropZoneRef}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          uploadStatus.status === 'idle' || uploadStatus.status === 'completed'
            ? 'border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50'
            : 'border-blue-400 bg-blue-50'
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
      >
        {!selectedFile ? (
          <div>
            <div className="text-4xl mb-4">📁</div>
            <p className="text-gray-600 mb-2">
              {t('uploader.drop_or_click')}
            </p>
            <p className="text-sm text-gray-500">
              {t('uploader.support_formats', { size_gb: Math.round(maxFileSize / 1024 / 1024 / 1024) })}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              🛡️ {t('uploader.data_protection')}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t('uploader.choose_file')}
            </button>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-800 font-medium">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <div className="mt-4 flex space-x-2 justify-center">
              <button
                onClick={() => handleUpload('1080p')}
                disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'extracting' || uploadResult !== null}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {t('uploader.upload_and_compress_1080p')}
              </button>
              <button
                onClick={() => handleUpload('720p')}
                disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'extracting' || uploadResult !== null}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {t('uploader.upload_and_compress_720p')}
              </button>
              <button
                onClick={handleRemove}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('uploader.remove')}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 示例视频按钮 */}
      {!uploadResult && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 mb-2">{t('uploader.or')}</p>
          <button
            onClick={handleLoadExampleVideo}
            disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'extracting'}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 mx-auto"
          >
            <span>🎬</span>
            <span>{t('uploader.load_example')}</span>
          </button>
        </div>
      )}

      {/* 上传状态 */}
      {uploadStatus.status !== 'idle' && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {uploadStatus.message}
            </span>
            <span className="text-sm text-gray-500">
              {uploadStatus.progress}%
            </span>
          </div>
          
          {uploadStatus.status === 'uploading' || uploadStatus.status === 'extracting' ? (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadStatus.progress}%` }}
              ></div>
            </div>
          ) : uploadStatus.status === 'error' ? (
            <div className="text-red-600 text-sm">{uploadStatus.message}</div>
          ) : uploadStatus.status === 'completed' ? (
            <div className="text-green-600 text-sm">
              <p>✅ {t('uploader.upload_ok')}</p>
            </div>
          ) : null}
        </div>
      )}


      {/* 压缩状态和下载按钮 */}
      {compressionStatus === 'completed' && uploadResult?.session_id && !isExampleVideo && (
        <div className="mt-4">
          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <button
                  onClick={handleDownloadCompressed}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mb-3"
                  type="button"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('uploader.download_compressed')}
                </button>
                <p className="font-medium text-blue-800 mb-2">💡 {t('uploader.keep_recommend')}</p>
                <p className="text-blue-700">
                  {t('uploader.keep_detail')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {compressionStatus === 'compressing' && (
        <div className="mt-4">
          {compressionProgress && (
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{compressionStatusMessage}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${compressionProgress.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
          {!compressionProgress && (
            <div className="text-sm text-blue-600">
              {compressionStatusMessage}
            </div>
          )}
        </div>
      )}

      {compressionStatus === 'error' && (
        <div className="mt-4 text-sm text-red-600">
          {compressionStatusMessage}
        </div>
      )}

      {/* 各环节用时典型值 */}
      <div className="mt-4">
        <PerformanceAnalysisPanel />
      </div>
      </div>
    </div>
  );
}
