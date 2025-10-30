'use client';

import React from 'react';
import { en, enUploader, enSpeech, enSOP, enExporter, enVideoUnderstanding, enRecords, enExporterHtml, enSOPBlockFields, enSOPTooltips, enSOPPlayer } from './en';
import { zh, zhUploader, zhSpeech, zhSOP, zhExporter, zhVideoUnderstanding, zhRecords, zhExporterHtml, zhSOPBlockFields, zhSOPTooltips } from './zh';
import { I18nContextValue, Locale, TranslationDict } from './types';

const STORAGE_KEY = 'app_lang';

function getFromDict(dict: TranslationDict, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dict);
}

function format(str: string, params?: Record<string, string | number | boolean>): string {
  if (!params) return str;
  return Object.keys(params).reduce((s, key) => {
    const value = String(params[key]);
    return s.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }, str);
}

export function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
    const nav = navigator.language || (Array.isArray(navigator.languages) ? navigator.languages[0] : '');
    if (nav && nav.toLowerCase().startsWith('zh')) return 'zh';
    return 'en';
  }
  // SSR fallback
  return 'zh';
}

function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj);
}

function deepMerge<T extends Record<string, unknown>>(...objects: T[]): T {
  const result: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const key of Object.keys(obj || {})) {
      const prev = result[key];
      const next = (obj as Record<string, unknown>)[key];
      if (isPlainObject(prev) && isPlainObject(next)) {
        result[key] = deepMerge(prev as Record<string, unknown>, next as Record<string, unknown>);
      } else {
        result[key] = next;
      }
    }
  }
  return result as T;
}

const dictionaries: Record<Locale, TranslationDict> = {
  zh: deepMerge(
    zh,
    zhUploader,
    zhSpeech,
    zhSOP,
    zhSOPTooltips,
    zhSOPBlockFields,
    zhExporter,
    zhExporterHtml,
    zhVideoUnderstanding,
    zhRecords
  ),
  en: deepMerge(
    en,
    enUploader,
    enSpeech,
    enSOP,
    enSOPTooltips,
    enSOPPlayer,
    enSOPBlockFields,
    enExporter,
    enExporterHtml,
    enVideoUnderstanding,
    enRecords
  )
};

export const I18nContext = React.createContext<I18nContextValue>({
  locale: 'zh',
  setLocale: () => {},
  t: (key: string) => key
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // 为避免SSR/CSR水合不一致，首次渲染采用SSR安全的默认值，挂载后再切换
  const [locale, setLocaleState] = React.useState<Locale>('zh');

  React.useEffect(() => {
    const initial = getInitialLocale();
    if (initial !== locale) setLocaleState(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = React.useCallback((loc: Locale) => {
    setLocaleState(loc);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, loc);
      } catch (e) {
        // ignore storage error
      }
    }
  }, []);

  const t = React.useCallback((key: string, params?: Record<string, string | number | boolean>) => {
    const dict = dictionaries[locale];
    const raw = getFromDict(dict, key);
    if (typeof raw === 'string') return format(raw, params);
    return key; // fallback to key when missing
  }, [locale]);

  const value = React.useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  return ctx;
}


