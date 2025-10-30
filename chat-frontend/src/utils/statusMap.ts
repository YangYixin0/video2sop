import { Locale } from '@/i18n/types';
import { I18nContext } from '@/i18n';
import React from 'react';

// 将后端 stage/code 映射到 i18n key
const stageToKey: Record<string, string> = {
  upload_start: 'status.upload_start',
  upload_done: 'status.upload_done',
  understanding_start: 'status.understanding_start',
  video_understanding_complete: 'status.understanding_done',
  parse_start: 'status.parse_start',
  parse_done: 'status.parse_done',
  refine_done: 'status.refine_done',
};

export function useStatusI18n() {
  const { t } = React.useContext(I18nContext);
  const getMessage = React.useCallback(
    (stage: string, fallback: string, rawMessage?: string) => {
      // 1) 优先使用 stage → i18n key
      const key = stageToKey[stage];
      if (key) {
        const text = t(key);
        if (text && text !== key) return text;
      }

      // 2) 无stage或未知stage：对中文原文进行兜底匹配
      const msg = rawMessage ?? fallback ?? '';
      if (typeof msg === 'string' && msg) {
        // 语音识别已完成
        if (/^语音识别已完成/.test(msg)) return t('status.speech_done');

        // 长视频理解完成
        if (/^长视频理解完成/.test(msg)) return t('status.long_understanding_done');

        // SOP解析完成，共生成 20 个区块
        let m = msg.match(/SOP解析完成，共生成\s+(\d+)\s+个区块/);
        if (m) return t('status.parse_done_with_count', { count: Number(m[1]) });

        // SOP精修完成，共处理 20 个区块
        m = msg.match(/SOP精修完成，共处理\s+(\d+)\s+个区块/);
        if (m) return t('status.refine_done_with_count', { count: Number(m[1]) });

        // 视频时长 9分39秒，(不分段|分段)
        m = msg.match(/视频时长\s+(\d+)分(\d+)秒，(不分段|分段)/);
        if (m) {
          const minutes = Number(m[1]);
          const seconds = Number(m[2]);
          const segmented = m[3] === '分段';
          return segmented
            ? t('status.video_length_segmented', { minutes, seconds })
            : t('status.video_length_no_segment', { minutes, seconds });
        }

        // 其他常见中文原文
        if (/^检测到已压缩视频，跳过压缩/.test(msg)) return t('status.compressed_skipped');
        if (/^视频无需压缩，已准备就绪/.test(msg)) return t('status.no_compression_needed');
        if (/^短视频理解完成/.test(msg)) return t('status.short_understanding_done');
        if (/^开始SOP拆解/.test(msg)) return t('status.parse_start');
        if (/^SOP解析完成/.test(msg)) return t('status.parse_done');
        if (/^开始上传压缩视频/.test(msg)) return t('status.upload_start');
        if (/^压缩视频上传完成/.test(msg)) return t('status.upload_compressed_done');
      }

      // 3) 兜底：如果fallback像是i18n键（包含'.'），尝试直接翻译；否则返回原文
      if (typeof fallback === 'string' && fallback.includes('.')) {
        const translated = t(fallback);
        if (translated && translated !== fallback) return translated;
      }
      return fallback;
    },
    [t]
  );
  return { getMessage };
}


