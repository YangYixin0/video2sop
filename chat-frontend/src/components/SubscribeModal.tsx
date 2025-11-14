'use client';

import React from 'react';
import Modal from './Modal';
import { useI18n } from '@/i18n';
import Icon from './Icon';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscribeModal({ isOpen, onClose }: SubscribeModalProps) {
  const { t } = useI18n();
  const authorEmail = process.env.NEXT_PUBLIC_AUTHOR_EMAIL || 'your-email@example.com';
  const githubUrl = process.env.NEXT_PUBLIC_APP_GITHUB || 'https://github.com/your-repo/video2sop';

  const handleEmailClick = () => {
    const subject = encodeURIComponent(t('subscribe.email_subject'));
    const body = encodeURIComponent(t('subscribe.email_body'));
    window.open(`mailto:${authorEmail}?subject=${subject}&body=${body}`);
  };

  const handleGithubClick = () => {
    window.open(githubUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('subscribe.title')}>
      <div className="space-y-4">
        <div className="text-sm text-gray-700 leading-relaxed">
          <p className="mb-4">
            {t('subscribe.desc_line1')}<br/>
            {t('subscribe.desc_line2')}
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Icon name="mail" size={20} inline />
              {t('subscribe.email_subscribe')}
            </h4>
            <p className="text-sm text-blue-800 mb-3">
              {t('subscribe.email_hint')}
            </p>
            <button
              onClick={handleEmailClick}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {t('subscribe.send_email')}
            </button>
            <div className="mt-2 text-xs text-blue-600">
              {authorEmail}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Icon name="code" size={20} inline />
              {t('subscribe.github_repo')}
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              {t('subscribe.github_hint')}
            </p>
            <button
              onClick={handleGithubClick}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {t('subscribe.visit_github')}
            </button>
            <div className="mt-2 text-xs text-gray-600 break-all">
              {githubUrl}
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}



