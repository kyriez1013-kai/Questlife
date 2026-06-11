import { ContextLog } from '../types';
import { today } from '../storage';

export type ParsedHealthContext = {
  contextLogs: ContextLog[];
  summary: {
    sleepMinutes?: number;
    deepSleepMinutes?: number;
    remMinutes?: number;
    restingHeartRate?: number;
    hrv?: number;
    steps?: number;
    workoutMinutes?: number;
    caffeineCount?: number;
    foodNote?: string;
    bodyNote?: string;
    confidence: 'low' | 'medium' | 'high';
  };
};

function parseDurationMinutes(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const hours = Number(match.groups?.hours ?? match[1] ?? 0);
    const minutes = Number(match.groups?.minutes ?? match[2] ?? 0);
    if (Number.isFinite(hours) || Number.isFinite(minutes)) {
      return Math.max(0, Math.round((Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0)));
    }
  }
  return undefined;
}

function parseNumber(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match.groups?.value ?? match[1]);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function pushMetric(
  logs: ContextLog[],
  input: {
    date: string;
    createdAt: string;
    rawText: string;
    type: ContextLog['type'];
    label: string;
    value?: number | string;
    unit?: string;
    intensity?: number;
    note?: string;
  },
) {
  if (input.value == null && !input.note) return;
  logs.push({
    id: `ctx-${input.label}-${input.createdAt}-${logs.length}`,
    date: input.date,
    createdAt: input.createdAt,
    source: 'manual',
    type: input.type,
    label: input.label,
    value: input.value,
    unit: input.unit,
    intensity: input.intensity,
    note: input.note,
    rawText: input.rawText,
  });
}

function countCaffeine(text: string) {
  const matches = text.match(/咖啡|coffee|caffeine|espresso|拿铁|latte/gi) || [];
  if (matches.length === 0) return undefined;
  const cupMatch = text.match(/(?<value>\d+(?:\.\d+)?)\s*(?:cups?|杯)/i);
  const zhCupMatch = text.match(/(?<value>[一二两三四五六七八九十\d]+)\s*杯/);
  if (cupMatch?.groups?.value) return Number(cupMatch.groups.value);
  if (zhCupMatch?.groups?.value) {
    const map: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    return map[zhCupMatch.groups.value] ?? Number(zhCupMatch.groups.value) ?? 1;
  }
  return matches.length;
}

export function parseHealthContextText(text: string, now = new Date()): ParsedHealthContext {
  const source = text.trim();
  const createdAt = now.toISOString();
  const date = today();
  const logs: ContextLog[] = [];

  const sleepMinutes = parseDurationMinutes(source, [
    /sleep\s*(?<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?<minutes>\d+)?\s*m?/i,
    /睡眠\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /睡了\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
  ]);
  const deepSleepMinutes = parseDurationMinutes(source, [
    /deep\s*sleep\s*(?<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?<minutes>\d+)?\s*m?/i,
    /deep\s*sleep\s*(?<minutes>\d+)\s*(?:m|min|minutes?)/i,
    /深睡\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /深睡\s*(?<minutes>\d+)\s*(?:分钟|m)/i,
  ]);
  const remMinutes = parseDurationMinutes(source, [
    /rem\s*(?<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?<minutes>\d+)?\s*m?/i,
    /rem\s*(?<minutes>\d+)\s*(?:m|min|minutes?)/i,
    /(?:REM|快速眼动)\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /(?:REM|快速眼动)\s*(?<minutes>\d+)\s*(?:分钟|m)/i,
  ]);
  const restingHeartRate = parseNumber(source, [
    /resting\s*(?:hr|heart\s*rate)\s*:?\s*(?<value>\d+)/i,
    /静息心率\s*:?\s*(?<value>\d+)/i,
  ]);
  const hrv = parseNumber(source, [
    /hrv\s*:?\s*(?<value>\d+)/i,
    /心率变异(?:性)?\s*:?\s*(?<value>\d+)/i,
  ]);
  const steps = parseNumber(source, [
    /steps?\s*:?\s*(?<value>\d+)/i,
    /步数\s*:?\s*(?<value>\d+)/i,
  ]);
  const workoutMinutes = parseDurationMinutes(source, [
    /workout\s*(?<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?<minutes>\d+)?\s*m?/i,
    /workout\s*(?<minutes>\d+)\s*(?:m|min|minutes?)/i,
    /(?:训练|运动)\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /(?:训练|运动)\s*(?<minutes>\d+)\s*(?:分钟|m)/i,
  ]);
  const caffeineCount = countCaffeine(source);
  const foodNote = /吃|food|meal|chocolate|巧克力|晚餐|早餐|午餐|snack/i.test(source) ? source : undefined;
  const bodyNote = /疲劳|酸痛|疼|痛|sore|tired|fatigue|body|身体/i.test(source) ? source : undefined;

  pushMetric(logs, { date, createdAt, rawText: source, type: 'sleep', label: 'sleep_duration', value: sleepMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'sleep', label: 'deep_sleep', value: deepSleepMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'sleep', label: 'rem_sleep', value: remMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'resting_heart_rate', value: restingHeartRate, unit: 'bpm' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'hrv', value: hrv, unit: 'ms' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'steps', value: steps, unit: 'steps' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'workout_minutes', value: workoutMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'food', label: 'caffeine', value: caffeineCount, unit: 'count' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'food', label: 'food_note', value: foodNote, note: foodNote });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'body_note', value: bodyNote, note: bodyNote });

  const found = logs.length;
  return {
    contextLogs: logs,
    summary: {
      sleepMinutes,
      deepSleepMinutes,
      remMinutes,
      restingHeartRate,
      hrv,
      steps,
      workoutMinutes,
      caffeineCount,
      foodNote,
      bodyNote,
      confidence: found >= 4 ? 'high' : found >= 2 ? 'medium' : found >= 1 ? 'low' : 'low',
    },
  };
}
