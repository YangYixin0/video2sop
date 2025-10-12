'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoPlayerProps } from '@/types/sop';

const SOPVideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  currentStartTime,
  currentEndTime,
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 跳转到指定时间
  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // 播放指定时间段
  const playSegment = useCallback((startTime: number, endTime?: number) => {
    if (videoRef.current) {
      seekTo(startTime);
      setIsPlaying(true);
      
      // 如果指定了结束时间，设置自动暂停
      if (endTime) {
        const checkEndTime = () => {
          if (videoRef.current && videoRef.current.currentTime >= endTime) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        };
        
        // 使用定时器检查播放进度
        const interval = setInterval(checkEndTime, 100);
        
        // 监听暂停事件清除定时器
        const handlePause = () => {
          clearInterval(interval);
          setIsPlaying(false);
        };
        
        videoRef.current.addEventListener('pause', handlePause, { once: true });
      }
    }
  }, [seekTo]);

  // 播放/暂停控制
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 监听视频事件
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate]);

  // 当currentStartTime或currentEndTime变化时自动播放
  useEffect(() => {
    if (currentStartTime !== undefined && currentEndTime !== undefined) {
      playSegment(currentStartTime, currentEndTime);
    } else if (currentStartTime !== undefined) {
      seekTo(currentStartTime);
    }
  }, [currentStartTime, currentEndTime, playSegment, seekTo]);

  // 进度条点击处理
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      seekTo(newTime);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="mb-4">
        {videoUrl ? (
          <div className="text-sm text-gray-600 mb-2">
            视频文件: {videoUrl.split('/').pop()}
          </div>
        ) : (
          <div className="text-sm text-gray-500 mb-2">
            暂无视频文件
          </div>
        )}
      </div>

      {videoUrl && (
        <>
          {/* 视频元素 */}
          <video
            ref={videoRef}
            className="max-w-full max-h-96 rounded-lg mb-4 mx-auto block"
            controls
            preload="metadata"
            style={{ maxWidth: '600px' }}
          >
            <source src={videoUrl} type="video/mp4" />
            您的浏览器不支持视频播放。
          </video>

          {/* 自定义控制条 */}
          <div className="space-y-3">
            {/* 播放控制 */}
            <div className="flex items-center space-x-3">
              <button
                onClick={togglePlayPause}
                className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              <div className="flex-1 text-sm text-gray-600">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              
              {currentStartTime !== undefined && currentEndTime !== undefined && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  播放段: {formatTime(currentStartTime)} - {formatTime(currentEndTime)}
                </div>
              )}
            </div>

            {/* 进度条 */}
            <div className="relative">
              <div
                className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
                onClick={handleProgressClick}
              >
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all duration-100"
                  style={{
                    width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                  }}
                />
              </div>
              
              {/* 时间段标记 */}
              {currentStartTime !== undefined && currentEndTime !== undefined && duration > 0 && (
                <div
                  className="absolute top-0 h-2 bg-green-400 rounded-full opacity-50"
                  style={{
                    left: `${(currentStartTime / duration) * 100}%`,
                    width: `${((currentEndTime - currentStartTime) / duration) * 100}%`
                  }}
                />
              )}
            </div>

            {/* 快速跳转按钮 */}
            <div className="flex space-x-2">
              {currentStartTime !== undefined && (
                <button
                  onClick={() => seekTo(currentStartTime)}
                  className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                >
                  跳转到开始 ({formatTime(currentStartTime)})
                </button>
              )}
              
              {currentEndTime !== undefined && (
                <button
                  onClick={() => seekTo(currentEndTime)}
                  className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                >
                  跳转到结束 ({formatTime(currentEndTime)})
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {!videoUrl && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📹</div>
          <div>请先上传视频文件</div>
        </div>
      )}
    </div>
  );
};

export default SOPVideoPlayer;
