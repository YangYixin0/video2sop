'use client';

import React from 'react';
import Modal from './Modal';
import { generateSessionReport, downloadSessionReport, SessionReportOptions } from '@/utils/sessionReport';
import { useI18n } from '@/i18n';

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
  const { t } = useI18n();
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
      console.error('Download report failed:', error);
      alert(t('feedback.download_failed'));
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
      console.error('Download report failed:', error);
      alert(t('feedback.download_failed'));
    }
  };

  const handleSuggestOnly = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('feedback.title')}>
      <div className="space-y-4">
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="mb-3">
            {t('feedback.intro_1')}
            <span className="font-semibold text-blue-700">{authorEmail}</span>
          </p>
          <p className="mb-6">
            {t('feedback.intro_2')}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleDownloadWithVideo}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            {t('feedback.btn_with_video')}
          </button>

          <button
            onClick={handleDownloadWithoutVideo}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('feedback.btn_without_video')}
          </button>

          <button
            onClick={handleSuggestOnly}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            {t('feedback.btn_suggest_only')}
          </button>
        </div>
      </div>
    </Modal>
  );
}



