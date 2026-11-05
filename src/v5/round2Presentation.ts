import type { AppData } from '../types';

export function v5Enabled(search: string) {
  return new URLSearchParams(search).get('v5_ui') !== '0';
}

export function durationLabel(minutes: number, lang: 'zh' | 'en') {
  const n = Math.round(minutes);
  const h = Math.floor(n / 60), m = n % 60;
  return lang === 'zh' ? [h ? `${h} 小时` : '', m || !h ? `${m} 分钟` : ''].filter(Boolean).join(' ')
    : [h ? `${h} h` : '', m || !h ? `${m} min` : ''].filter(Boolean).join(' ');
}

export function emptyToday(data: AppData, active: boolean, pendingCapture: boolean) {
  return !active && !pendingCapture && !data.skills.length && !data.categories.length
    && !data.scheduleBlocks.length && !data.executionLogs.some(row => !row.dataProvenance?.deleted);
}

/** A timeout is an error, never an empty result. Late requests cannot replace newer results. */
export async function withinThreeSeconds<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('analysis_timeout')), 3000);
    })]);
  } finally { clearTimeout(timer!); }
}
