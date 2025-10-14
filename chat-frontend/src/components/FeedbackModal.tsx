'use client';

import React from 'react';
import Modal from './Modal';
import { generateSessionReport, downloadSessionReport, SessionReportOptions } from '@/utils/sessionReport';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkVideoKeep?: (sessionId: string) => Promise<void>;
  sessionData: SessionReportOptions;
}

export default function FeedbackModal({ 
  isOpen, 
  onClose, 
  onMarkVideoKeep,
  sessionData 
}: FeedbackModalProps) {
  const authorEmail = process.env.NEXT_PUBLIC_AUTHOR_EMAIL || 'your-email@example.com';

  const handleDownloadWithVideo = async () => {
    try {
      // 生成包含视频链接的报告
      const report = generateSessionReport({
        ...sessionData,
        includeVideoLinks: true
      });
      
      // 下载报告
      downloadSessionReport(report, `video2sop-session-with-video-${Date.now()}.html`);
      
      // 标记视频保留
      if (onMarkVideoKeep && sessionData.sessionId) {
        await onMarkVideoKeep(sessionData.sessionId);
      }
      
      onClose();
    } catch (error) {
      console.error('下载报告失败:', error);
      alert('下载报告失败，请重试');
    }
  };

  const handleDownloadWithoutVideo = async () => {
    try {
      // 生成不包含视频链接的报告
      const report = generateSessionReport({
        ...sessionData,
        includeVideoLinks: false
      });
      
      // 下载报告
      downloadSessionReport(report, `video2sop-session-without-video-${Date.now()}.html`);
      
      onClose();
    } catch (error) {
      console.error('下载报告失败:', error);
      alert('下载报告失败，请重试');
    }
  };

  const handleSuggestOnly = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="报告异常或提建议">
      <div className="space-y-4">
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="mb-3">
            请从下列选项中选择，然后将下载的内容、异常情况描述和建议发送至评论区或我们的邮箱。
            <span className="font-semibold text-blue-700">{authorEmail}</span>
          </p>
          <p className="mb-6">
            我们会尽快修理异常并通知您，或者将暂不能实现的需求作为未来的开发方向之一！
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleDownloadWithVideo}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            1. 下载当前会话内容，而且我同意Video2SOP保留当前会话的视频用于分析
          </button>

          <button
            onClick={handleDownloadWithoutVideo}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            2. 下载当前会话内容，不过我不同意Video2SOP保留当前会话的视频
          </button>

          <button
            onClick={handleSuggestOnly}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            3. 不下载会话内容，我只是提建议
          </button>
        </div>
      </div>
    </Modal>
  );
}



