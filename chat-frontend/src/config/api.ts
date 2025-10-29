/**
 * API 配置
 * 通过环境变量控制后端API地址，支持不同部署环境
 */

// API 基础地址
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8123';

// WebSocket 地址
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8123/ws';

// 导出配置
export { API_BASE_URL, WS_BASE_URL };

// 导出常用的API端点
export const API_ENDPOINTS = {
  // 会话管理
  MARK_SESSION_KEEP_VIDEO: `${API_BASE_URL}/mark_session_keep_video`,
  CHECK_SESSION_KEEP_VIDEO: `${API_BASE_URL}/check_session_keep_video`,
  DELETE_SESSION_FILES: `${API_BASE_URL}/delete_session_files`,
  
  // 文件上传
  GENERATE_UPLOAD_SIGNATURE: `${API_BASE_URL}/generate_upload_signature`,
  UPLOAD_FILE_PROXY: `${API_BASE_URL}/upload_file_proxy`,
  UPLOAD_VIDEO_TO_BACKEND: `${API_BASE_URL}/upload_video_to_backend`,
  EXTRACT_AUDIO: `${API_BASE_URL}/extract_audio`,
  LOAD_EXAMPLE_VIDEO: `${API_BASE_URL}/load_example_video`,
  EXAMPLE_VIDEO_PREVIEW: `${API_BASE_URL}/example_video_preview`,
  EXAMPLE_VIDEO_INFO: `${API_BASE_URL}/example_video_info`,
  DOWNLOAD_COMPRESSED_VIDEO: `${API_BASE_URL}/download_compressed_video`,
  CANCEL_COMPRESSION: `${API_BASE_URL}/cancel_compression`,
  
  // AI 处理
  SPEECH_RECOGNITION: `${API_BASE_URL}/speech_recognition`,
  VIDEO_UNDERSTANDING: `${API_BASE_URL}/video_understanding`,
  VIDEO_UNDERSTANDING_LONG: `${API_BASE_URL}/video_understanding_long`,
  GET_VIDEO_DURATION: `${API_BASE_URL}/get_video_duration`,
  PARSE_SOP: `${API_BASE_URL}/parse_sop`,
  REFINE_SOP: `${API_BASE_URL}/refine_sop`,
  
  // 健康检查
  HEALTH: `${API_BASE_URL}/health`,
} as const;

// WebSocket 端点
export const WS_ENDPOINTS = {
  MAIN: WS_BASE_URL,
} as const;
