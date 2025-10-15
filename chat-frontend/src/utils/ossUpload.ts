/**
 * OSS 上传工具类
 */

import { API_BASE_URL } from '@/config/api';

export interface UploadSignature {
  upload_url: string;
  oss_url: string;
  oss_key: string;
  expires_in: number;
}

export interface UploadResult {
  video_url: string;
  audio_url: string;
  session_id: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 生成会话 ID
 */
export async function generateSessionId(): Promise<string> {
  try {
    console.log('Attempting to generate session ID from:', `${API_BASE_URL}/generate_session_id`);
    
    const response = await fetch(`${API_BASE_URL}/generate_session_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response data:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate session ID');
    }

    return data.session_id;
  } catch (error) {
    console.error('Error generating session ID:', error);
    throw new Error(`生成会话 ID 失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 获取上传签名
 */
export async function getUploadSignature(
  filename: string,
  sessionId: string,
  fileType: string = 'video'
): Promise<UploadSignature> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate_upload_signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        session_id: sessionId,
        file_type: fileType,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to generate upload signature');
    }

    return data.signature;
  } catch (error) {
    console.error('Error getting upload signature:', error);
    throw new Error(`获取上传签名失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 直接上传文件到 OSS
 */
export async function uploadFileToOSS(
  file: File,
  signature: UploadSignature,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // 监听完成事件
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(signature.oss_url);
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    // 监听错误事件
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    // 监听超时事件
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timeout'));
    });

    // 设置超时时间（5分钟）
    xhr.timeout = 5 * 60 * 1000;

    // 开始上传
    xhr.open('PUT', signature.upload_url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * 通过后端代理上传文件
 */
export async function uploadFileViaProxy(
  file: File,
  sessionId: string,
  fileType: string = 'video',
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    formData.append('file_type', fileType);

    // 监听上传进度
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // 监听完成事件
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            resolve(data.file_url);
          } else {
            reject(new Error(data.error || 'Proxy upload failed'));
          }
        } catch {
          reject(new Error('Failed to parse response'));
        }
      } else {
        reject(new Error(`Proxy upload failed with status: ${xhr.status}`));
      }
    });

    // 监听错误事件
    xhr.addEventListener('error', () => {
      reject(new Error('Proxy upload failed due to network error'));
    });

    // 监听超时事件
    xhr.addEventListener('timeout', () => {
      reject(new Error('Proxy upload timeout'));
    });

    // 设置超时时间（10分钟，因为需要经过服务器）
    xhr.timeout = 10 * 60 * 1000;

    // 开始上传
    xhr.open('POST', `${API_BASE_URL}/upload_file_proxy`);
    xhr.send(formData);
  });
}

/**
 * 从视频 URL 提取音频
 */
export async function extractAudioFromVideo(
  videoUrl: string,
  sessionId: string
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/extract_audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Audio extraction failed');
    }

    return data.audio_url;
  } catch (error) {
    console.error('Error extracting audio:', error);
    throw new Error(`音频提取失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 删除会话文件
 */
export async function deleteSessionFiles(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/delete_session_files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      console.warn('Failed to delete session files:', data.error);
    }
  } catch (error) {
    console.error('Error deleting session files:', error);
    // 不抛出错误，因为删除失败不应该影响用户体验
  }
}

/**
 * 检查 FFmpeg 状态
 */
export async function checkFFmpegStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/check_ffmpeg`);
    
    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success && data.ffmpeg_available;
  } catch (error) {
    console.error('Error checking FFmpeg status:', error);
    return false;
  }
}

/**
 * 完整的视频上传流程
 */
export async function uploadVideoWithAudio(
  file: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<UploadResult> {
  try {
    // 生成会话 ID
    onProgress?.('生成会话 ID...', 0);
    const sessionId = await generateSessionId();
    onProgress?.('会话 ID 生成完成', 10);

    // 尝试直接上传到 OSS
    let videoUrl: string;
    try {
      onProgress?.('获取上传签名...', 15);
      const signature = await getUploadSignature(file.name, sessionId);
      onProgress?.('开始上传视频...', 20);
      
      videoUrl = await uploadFileToOSS(file, signature, (progress) => {
        onProgress?.('上传视频中...', 20 + (progress * 0.3));
      });
      
      onProgress?.('视频上传完成', 50);
    } catch (error) {
      console.warn('Direct upload failed, trying proxy upload:', error);
      onProgress?.('直接上传失败，尝试代理上传...', 25);
      
      videoUrl = await uploadFileViaProxy(file, sessionId, 'video', (progress) => {
        onProgress?.('代理上传中...', 25 + (progress * 0.25));
      });
      
      onProgress?.('视频上传完成', 50);
    }

    // 提取音频
    onProgress?.('开始提取音频...', 60);
    const audioUrl = await extractAudioFromVideo(videoUrl, sessionId);
    onProgress?.('音频提取完成', 100);

    return {
      video_url: videoUrl,
      audio_url: audioUrl,
      session_id: sessionId,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error(`上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 验证文件
 */
export function validateVideoFile(
  file: File,
  maxSize: number = 500 * 1024 * 1024, // 500MB
  allowedTypes: string[] = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm']
): string | null {
  if (file.size > maxSize) {
    return `文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`;
  }
  
  if (!allowedTypes.includes(file.type)) {
    return `不支持的文件格式。支持的格式: ${allowedTypes.join(', ')}`;
  }
  
  return null;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
