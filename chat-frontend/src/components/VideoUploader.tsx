'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
  onFileRemoved?: () => void;
  onWebSocketMessage?: (message: Record<string, unknown>) => void;
  maxFileSize?: number; // 字节
  allowedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 500 * 1024 * 1024; // 500MB
const DEFAULT_ALLOWED_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];

export default function VideoUploader({
  onUploadComplete,
  onUploadError,
  onFileRemoved,
  onWebSocketMessage,
  maxFileSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES
}: VideoUploaderProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    message: '',
    progress: 0
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 清理函数
  const cleanup = useCallback(async () => {
    if (sessionId && uploadResult) {
      try {
        const response = await fetch('http://127.0.0.1:8123/delete_session_files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        });
        const result = await response.json();
        const deleteResult = result.result || { deleted_count: 0 };
        onFileRemoved?.(); // 通知父组件文件已删除
        return deleteResult;
      } catch (error) {
        console.error('清理文件失败:', error);
        onFileRemoved?.(); // 即使失败也通知父组件
        return { deleted_count: 0 };
      }
    }
    return { deleted_count: 0 };
  }, [sessionId, uploadResult, onFileRemoved]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (sessionId && uploadResult) {
        // 直接调用API，避免依赖cleanup函数
        fetch('http://127.0.0.1:8123/delete_session_files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        }).catch(console.error);
      }
    };
  }, [sessionId, uploadResult]);

  // 页面关闭时清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && uploadResult) {
        // 直接调用API，避免依赖cleanup函数
        fetch('http://127.0.0.1:8123/delete_session_files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId })
        }).catch(console.error);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, uploadResult]);

  // 生成会话 ID
  const generateSessionId = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:8123/generate_session_id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setSessionId(data.session_id);
        return data.session_id;
      } else {
        throw new Error('生成会话 ID 失败');
      }
    } catch (error) {
      throw new Error(`生成会话 ID 失败: ${error}`);
    }
  }, []);

  // 获取上传签名
  const getUploadSignature = useCallback(async (filename: string, sessionId: string) => {
    try {
      const response = await fetch('http://127.0.0.1:8123/generate_upload_signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          session_id: sessionId,
          file_type: 'video'
        })
      });
      const data = await response.json();
      if (data.success) {
        return data.signature;
      } else {
        throw new Error('获取上传签名失败');
      }
    } catch (error) {
      throw new Error(`获取上传签名失败: ${error}`);
    }
  }, []);

  // 直接上传到 OSS
  const uploadToOSS = useCallback(async (file: File, signature: Record<string, unknown>) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', signature.oss_key || '');
    formData.append('policy', signature.policy || '');
    formData.append('OSSAccessKeyId', signature.OSSAccessKeyId || '');
    formData.append('signature', signature.signature || '');
    formData.append('success_action_status', '200');

    const response = await fetch(signature.upload_url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      }
    });

    if (!response.ok) {
      throw new Error(`OSS 上传失败: ${response.statusText}`);
    }

    return signature.oss_url;
  }, []);

  // 代理上传到后端
  const uploadViaProxy = useCallback(async (file: File, sessionId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    formData.append('file_type', 'video');

    const response = await fetch('http://127.0.0.1:8123/upload_file_proxy', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      return data.file_url;
    } else {
      throw new Error('代理上传失败');
    }
  }, []);

  // 提取音频
  const extractAudio = useCallback(async (videoUrl: string, sessionId: string) => {
    const response = await fetch('http://127.0.0.1:8123/extract_audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_url: videoUrl,
        session_id: sessionId
      })
    });

    const data = await response.json();
    if (data.success) {
      return data.audio_url;
    } else {
      throw new Error('音频提取失败');
    }
  }, []);

  // 验证文件
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `文件大小不能超过 ${Math.round(maxFileSize / 1024 / 1024)}MB`;
    }
    
    if (!allowedTypes.includes(file.type)) {
      return `不支持的文件格式。支持的格式: ${allowedTypes.join(', ')}`;
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
    
    // 创建预览 URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
  }, [validateFile, onUploadError]);

  // 上传处理
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      setUploadStatus({ status: 'uploading', message: '正在上传视频...', progress: 0 });

      // 生成会话 ID
      const sessionId = await generateSessionId();
      
      // 尝试直接上传到 OSS
      let videoUrl: string;
      try {
        const signature = await getUploadSignature(selectedFile.name, sessionId);
        videoUrl = await uploadToOSS(selectedFile, signature);
        setUploadStatus({ status: 'uploading', message: '视频上传成功，正在提取音频...', progress: 50 });
      } catch (error) {
        console.warn('直接上传失败，尝试代理上传:', error);
        setUploadStatus({ status: 'uploading', message: '直接上传失败，正在通过服务器上传...', progress: 25 });
        videoUrl = await uploadViaProxy(selectedFile, sessionId);
        setUploadStatus({ status: 'uploading', message: '视频上传成功，正在提取音频...', progress: 50 });
      }

      // 提取音频
      setUploadStatus({ status: 'extracting', message: '正在提取音频...', progress: 75 });
      const audioUrl = await extractAudio(videoUrl, sessionId);

      // 完成
      const result: UploadResult = {
        video_url: videoUrl,
        audio_url: audioUrl,
        session_id: sessionId
      };

      setUploadResult(result);
      setUploadStatus({ status: 'completed', message: '上传完成！', progress: 100 });
      onUploadComplete?.(result);

      // 通过回调发送WebSocket消息
      onWebSocketMessage?.({
        type: 'upload_complete',
        video_url: videoUrl,
        audio_url: audioUrl,
        session_id: sessionId
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      setUploadStatus({ status: 'error', message: errorMessage, progress: 0 });
      onUploadError?.(errorMessage);
    }
  }, [selectedFile, generateSessionId, getUploadSignature, uploadToOSS, uploadViaProxy, extractAudio, onUploadComplete, onUploadError]);

  // 移除文件
  const handleRemove = useCallback(async () => {
    let deletedCount = 0;
    const currentSessionId = sessionId;
    
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
    setSessionId(null);
    setUploadStatus({ status: 'idle', message: '', progress: 0 });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 通过回调发送文件删除通知到 WebSocket
    if (currentSessionId && deletedCount > 0) {
      onWebSocketMessage?.({
        type: 'file_removed',
        session_id: currentSessionId,
        deleted_count: deletedCount
      });
    }
  }, [uploadResult, cleanup, sessionId, onWebSocketMessage]);

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
    try {
      setUploadStatus({ status: 'uploading', message: '正在加载示例视频...', progress: 0 });
      
      // 从后端获取示例视频
      const response = await fetch('http://127.0.0.1:8123/load_example_video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      if (data.success) {
        setUploadStatus({ status: 'completed', message: '示例视频加载完成！', progress: 100 });
        
        const result: UploadResult = {
          video_url: data.video_url,
          audio_url: data.audio_url,
          session_id: data.session_id
        };
        
        // 设置示例视频的预览
        setSelectedFile(new File([], 'pressing_operation.mp4', { type: 'video/mp4' }));
        setVideoPreview(data.video_url);
        
        setUploadResult(result);
        setSessionId(data.session_id);
        
        // 对于示例视频，只通过WebSocket发送消息，不调用onUploadComplete回调
        // 避免重复添加操作记录
        onWebSocketMessage?.({
          type: 'upload_complete',
          video_url: data.video_url,
          audio_url: data.audio_url,
          session_id: data.session_id
        });
      } else {
        throw new Error(data.error || '加载示例视频失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载示例视频失败';
      setUploadStatus({ status: 'error', message: errorMessage, progress: 0 });
      onUploadError?.(errorMessage);
    }
  }, [onUploadComplete, onUploadError, onWebSocketMessage]);

  return (
    <div className="w-full max-w-7xl mx-auto bg-white rounded-lg shadow-sm border max-h-[36rem] overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">🎥</span>
          视频上传
        </h3>
      </div>
      
      <div className="p-4">

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
              拖拽视频文件到这里，或点击选择文件
            </p>
            <p className="text-sm text-gray-500">
              支持格式: MP4, MOV, AVI, MKV, WEBM (最大 {Math.round(maxFileSize / 1024 / 1024)}MB)
            </p>
            <p className="text-xs text-blue-600 mt-2">
              🛡️ 数据保护：当您关闭或刷新网页时，我们不会保留您的视频。
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              选择文件
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
                onClick={handleUpload}
                disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'extracting'}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                上传
              </button>
              <button
                onClick={handleRemove}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                移除
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
          <p className="text-sm text-gray-500 mb-2">或者</p>
          <button
            onClick={handleLoadExampleVideo}
            disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'extracting'}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 mx-auto"
          >
            <span>🎬</span>
            <span>加载示例视频</span>
          </button>
          <p className="text-xs text-gray-400 mt-1">使用预设的压片机操作视频</p>
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
          ) : uploadStatus.status === 'completed' && uploadResult ? (
            <div className="text-green-600 text-sm">
              <p>✅ 上传完成！</p>
              <div className="mt-2 space-y-1 text-xs">
                <p><strong>视频链接:</strong> <a href={uploadResult.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{uploadResult.video_url}</a></p>
                <p><strong>音频链接:</strong> <a href={uploadResult.audio_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{uploadResult.audio_url}</a></p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 视频预览 */}
      {videoPreview && selectedFile && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">视频预览:</h4>
          <video
            src={videoPreview}
            controls
            className="w-full max-h-64 rounded-lg"
            preload="metadata"
          >
            您的浏览器不支持视频播放。
          </video>
        </div>
      )}
      </div>
    </div>
  );
}
