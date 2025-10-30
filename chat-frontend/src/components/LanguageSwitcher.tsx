'use client';

import React from 'react';
import { useI18n } from '@/i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={`px-2 py-1 rounded text-sm border ${locale === 'zh' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
        onClick={() => setLocale('zh')}
      >
        中文
      </button>
      <button
        type="button"
        className={`px-2 py-1 rounded text-sm border ${locale === 'en' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700'}`}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  );
}






