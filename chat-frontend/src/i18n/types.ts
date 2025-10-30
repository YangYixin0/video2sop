'use client';

export type Locale = 'zh' | 'en';

export type TranslationDict = Record<string, unknown>;

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number | boolean>) => string;
}






