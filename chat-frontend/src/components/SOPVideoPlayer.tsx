'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { VideoPlayerProps } from '@/types/sop';
import { useI18n } from '@/i18n';
import Icon from './Icon';

const SOPVideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  currentStartTime,
  currentEndTime,
  onTimeUpdate,
  onAspectRatioChange
}) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isAutoPlayModeRef = useRef(false); // 标记是否处于自动播放模式

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
    }
  }, []);

  // 播放指定时间段
  const playSegment = useCallback(async (startTime: number) => {
    if (videoRef.current) {
      isAutoPlayModeRef.current = true; // 进入自动播放模式
      seekTo(startTime);
      try {
        await videoRef.current.play();
      } catch (_) {
        // ignore autoplay restrictions
      }
    }
  }, [seekTo]);

  // 监听视频事件 - 主要用于时间范围控制和回调
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      onTimeUpdate?.(time);
      // 边界检查：只在自动播放模式下，到达片段结束自动暂停（时间范围控制）
      if (isAutoPlayModeRef.current && currentEndTime !== undefined && time >= currentEndTime) {
        video.pause();
        isAutoPlayModeRef.current = false; // 退出自动播放模式
      }
    };

    // 监听用户手动操作，退出自动播放模式
    const handleSeeking = () => {
      isAutoPlayModeRef.current = false;
    };

    const handlePlay = () => {
      // 如果用户手动播放，且不在自动播放的时间范围内，退出自动播放模式
      if (!isAutoPlayModeRef.current) {
        return;
      }
      const time = video.currentTime;
      if (currentStartTime !== undefined && currentEndTime !== undefined) {
        if (time < currentStartTime || time > currentEndTime) {
          isAutoPlayModeRef.current = false;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('play', handlePlay);
    };
  }, [onTimeUpdate, currentEndTime, currentStartTime]);

  // 当currentStartTime或currentEndTime变化时自动播放
  useEffect(() => {
    if (currentStartTime !== undefined) {
      if (currentEndTime !== undefined) {
        // 每次调用playSegment时都会设置isAutoPlayModeRef.current = true
        playSegment(currentStartTime);
      } else {
        isAutoPlayModeRef.current = false; // 没有结束时间，不限制
        seekTo(currentStartTime);
      }
    } else {
      isAutoPlayModeRef.current = false; // 没有开始时间，退出自动播放模式
    }
  }, [currentStartTime, currentEndTime, playSegment, seekTo]);

  // 添加一个额外的effect来确保每次currentStartTime和currentEndTime同时存在时都进入自动播放模式
  // 这解决了点击同一个区块两次时，由于值没变化导致useEffect不触发的问题
  // 使用一个ref来跟踪上一次的值，确保每次点击都能触发
  const lastPlayTimeRef = useRef<{ start?: number; end?: number }>({});
  useEffect(() => {
    if (currentStartTime !== undefined && currentEndTime !== undefined) {
      // 检查是否是新的播放请求（时间值变化或首次设置）
      const isNewPlay = 
        lastPlayTimeRef.current.start !== currentStartTime ||
        lastPlayTimeRef.current.end !== currentEndTime;
      
      if (isNewPlay) {
        lastPlayTimeRef.current = { start: currentStartTime, end: currentEndTime };
        // 强制进入自动播放模式并重新播放
        isAutoPlayModeRef.current = true;
        // 如果视频已经在播放，重新跳转到开始时间并播放
        if (videoRef.current) {
          videoRef.current.currentTime = currentStartTime;
          videoRef.current.play().catch(() => {
            // ignore autoplay restrictions
          });
        }
      } else {
        // 即使值相同（用户再次点击同一个区块），也跳转到开始时间并进入自动播放模式
        isAutoPlayModeRef.current = true;
        if (videoRef.current) {
          videoRef.current.currentTime = currentStartTime;
          videoRef.current.play().catch(() => {
            // ignore autoplay restrictions
          });
        }
      }
    }
  }, [currentStartTime, currentEndTime]);

  // 获取视频高宽比
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        const aspectRatio = video.videoWidth / video.videoHeight;
        onAspectRatioChange?.(aspectRatio);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // 如果视频已经加载，立即获取
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoUrl, onAspectRatioChange]);


  return (
    <div className="w-full h-full flex flex-col">
      {videoUrl && (
        <>
          {/* 视频元素 - 使用浏览器原生控制条 */}
          <video
            ref={videoRef}
            className="w-full h-full rounded-lg object-contain"
            controls
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
            {t('uploader.no_video_support')}
          </video>

          {/* 时间段标签 */}
          {currentStartTime !== undefined && currentEndTime !== undefined && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded text-center mt-2">
              {t('sop.player.segment_label')} {formatTime(currentStartTime)} - {formatTime(currentEndTime)}
            </div>
          )}
        </>
      )}

      {!videoUrl && (
        <div className="text-center py-8 text-gray-500">
          <Icon name="camera" size={48} className="mb-2 mx-auto" />
          <div>请先上传视频文件</div>
        </div>
      )}
    </div>
  );
};

export default SOPVideoPlayer;
