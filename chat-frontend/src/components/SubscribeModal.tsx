'use client';

import React from 'react';
import Modal from './Modal';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscribeModal({ isOpen, onClose }: SubscribeModalProps) {
  const authorEmail = process.env.NEXT_PUBLIC_AUTHOR_EMAIL || 'your-email@example.com';
  const githubUrl = process.env.NEXT_PUBLIC_APP_GITHUB || 'https://github.com/your-repo/video2sop';

  const handleEmailClick = () => {
    const subject = encodeURIComponent('Video2SOP 功能更新订阅');
    const body = encodeURIComponent('您好！\n\n我想订阅Video2SOP的功能更新通知。\n\n谢谢！');
    window.open(`mailto:${authorEmail}?subject=${subject}&body=${body}`);
  };

  const handleGithubClick = () => {
    window.open(githubUrl, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="订阅功能更新通知">
      <div className="space-y-4">
        <div className="text-sm text-gray-600 leading-relaxed">
          <p className="mb-4">
            如果你喜欢Video2SOP，或者觉得它有待改进不过“教学视频转化为SOP”是应有的工作流，
            欢迎写信给我们，订阅Video2SOP功能更新或关注该项目的GitHub仓库！
          </p>
        </div>

        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">📧 邮件订阅</h4>
            <p className="text-sm text-blue-800 mb-3">
              发送邮件订阅功能更新通知
            </p>
            <button
              onClick={handleEmailClick}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            >
              发送邮件
            </button>
            <div className="mt-2 text-xs text-blue-600">
              {authorEmail}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">🐙 GitHub仓库</h4>
            <p className="text-sm text-gray-700 mb-3">
              关注项目仓库获取最新更新和参与讨论
            </p>
            <button
              onClick={handleGithubClick}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
            >
              访问GitHub
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



