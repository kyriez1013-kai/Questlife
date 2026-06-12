import { ContextLog } from '../types';

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
    const hasNamedGroups = !!match.groups;
    const hoursRaw = match.groups?.hours ?? (hasNamedGroups ? undefined : match[1]);
    const minutesRaw = match.groups?.minutes ?? (hasNamedGroups ? undefined : match[2]);
    const hours = hoursRaw == null ? 0 : Number(hoursRaw);
    const minutes = minutesRaw == null ? 0 : Number(minutesRaw);
    if (Number.isFinite(hours) && Number.isFinite(minutes) && (hours > 0 || minutes > 0)) {
      return Math.max(0, Math.round(hours * 60 + minutes));
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

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function inferContextDate(text: string, now: Date) {
  if (/昨天|昨晚|last\s*night|yesterday/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return formatLocalDate(d);
  }
  return formatLocalDate(now);
}

function normalizeSleepHour(rawHour: number, marker: string | undefined, role: 'start' | 'end') {
  const markerText = marker || '';
  if (/凌晨|早上|上午|morning|am/i.test(markerText)) {
    if (rawHour === 12) return role === 'start' ? 0 : 12;
    return rawHour;
  }
  if (/下午|晚上|夜里|晚|pm|night|evening/i.test(markerText)) {
    if (rawHour === 12) return role === 'start' ? 0 : 12;
    return rawHour < 12 ? rawHour + 12 : rawHour;
  }
  if (role === 'start' && rawHour === 12) return 0;
  return rawHour;
}

function parseSleepRangeMinutes(text: string) {
  const rangePatterns = [
    /(?<startMarker>昨天晚上|昨晚|晚上|夜里|凌晨)?\s*(?<start>\d{1,2})(?:点|:00)?\s*(?:睡觉|睡|入睡)\s*(?:睡了)?.{0,8}?(?:睡到|到)\s*(?<endMarker>今天早上|早上|上午|凌晨)?\s*(?<end>\d{1,2})(?:点|:00)?/i,
    /(?<startMarker>昨天晚上|昨晚|晚上|夜里|凌晨)?\s*(?<start>\d{1,2})(?:点|:00)?\s*(?:睡觉|睡|入睡).{0,12}?(?<endMarker>今天早上|早上|上午|凌晨)?\s*(?<end>\d{1,2})(?:点|:00)?\s*(?:起|醒|起床)/i,
    /from\s*(?<start>\d{1,2})(?::00)?\s*(?<startMarker>pm|am|night|evening)?\s*(?:to|-)\s*(?<end>\d{1,2})(?::00)?\s*(?<endMarker>am|pm|morning)?/i,
  ];
  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    const start = Number(match?.groups?.start);
    const end = Number(match?.groups?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const startHour = normalizeSleepHour(start, match?.groups?.startMarker, 'start');
    let endHour = normalizeSleepHour(end, match?.groups?.endMarker, 'end');
    if (endHour <= startHour) endHour += 24;
    const minutes = (endHour - startHour) * 60;
    if (minutes >= 120 && minutes <= 960) return minutes;
  }
  return undefined;
}

function parseChineseHalfHourSleep(text: string) {
  const match = text.match(/睡(?:了|眠)?\s*(?<hours>\d+(?:\.\d+)?)\s*(?:个)?半?\s*小时/);
  if (!match?.groups?.hours) return undefined;
  if (!/半\s*小时|个半小时/.test(match[0])) return undefined;
  const base = Number(match.groups.hours);
  if (!Number.isFinite(base)) return undefined;
  return Math.round(base * 60 + 30);
}

function pushLowConfidenceNote(logs: ContextLog[], input: { date: string; createdAt: string; rawText: string; type: ContextLog['type']; label: string; note?: string }) {
  if (!input.note) return;
  pushMetric(logs, {
    date: input.date,
    createdAt: input.createdAt,
    rawText: input.rawText,
    type: input.type,
    label: input.label,
    value: input.note,
    note: input.note,
  });
}

export function parseHealthContextText(text: string, now = new Date()): ParsedHealthContext {
  const source = text.trim();
  const createdAt = now.toISOString();
  const date = inferContextDate(source, now);
  const logs: ContextLog[] = [];

  const sleepMinutes = parseSleepRangeMinutes(source) ?? parseChineseHalfHourSleep(source) ?? parseDurationMinutes(source, [
    /sleep\s*(?<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?<minutes>\d+)?\s*m?/i,
    /sleep\s*:?\s*(?<hours>\d+(?:\.\d+)?)\s*h\s*(?<minutes>\d+)?\s*m?/i,
    /slept\s*(?<hours>\d+(?:\.\d+)?)\s*(?:h|hours?)\s*(?<minutes>\d+)?\s*(?:m|min|minutes?)?/i,
    /睡眠\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /睡了\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /睡觉睡了\s*(?<hours>\d+(?:\.\d+)?)\s*(?:个)?(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /(?:昨晚|昨天晚上|晚上|今天)?\s*睡(?:了|眠)?\s*(?<hours>\d+(?:\.\d+)?)\s*(?:个)?(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
  ]);
  const deepSleepMinutes = parseDurationMinutes(source, [
    /deep\s*sleep\s*:?\s*(?<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?<minutes>\d+)?\s*m?/i,
    /deep\s*sleep\s*:?\s*(?<minutes>\d+)\s*(?:m|min|minutes?)/i,
    /深睡\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /深睡\s*(?<minutes>\d+)\s*(?:分钟|m)/i,
  ]);
  const remMinutes = parseDurationMinutes(source, [
    /rem\s*:?\s*(?<hours>\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(?<minutes>\d+)?\s*m?/i,
    /rem\s*:?\s*(?<minutes>\d+)\s*(?:m|min|minutes?)/i,
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
    /(?:workout|training|trained|exercise|exercised).{0,18}?(?<minutes>\d+)\s*(?:m|min|minutes?)/i,
    /(?:训练|运动)\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /(?:训练|运动)\s*(?<minutes>\d+)\s*(?:分钟|m)/i,
    /(?:练了|训练了|运动了|锻炼了)\s*(?<hours>\d+(?:\.\d+)?)\s*(?:小时|h)\s*(?<minutes>\d+)?\s*(?:分钟|m)?/i,
    /(?:练了|训练了|运动了|锻炼了)\s*(?<minutes>\d+)\s*(?:分钟|m)/i,
  ]);
  const caffeineCount = countCaffeine(source);
  const foodNote = /吃|food|meal|chocolate|巧克力|晚餐|早餐|午餐|snack|快餐|高碳水|油|油腻|carb|greasy|takeout/i.test(source) ? source : undefined;
  const bodyNote = /疲劳|酸痛|疼|痛|sore|tired|fatigue|body|身体/i.test(source) ? source : undefined;

  pushMetric(logs, { date, createdAt, rawText: source, type: 'sleep', label: 'sleep_duration', value: sleepMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'sleep', label: 'deep_sleep', value: deepSleepMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'sleep', label: 'rem_sleep', value: remMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'resting_heart_rate', value: restingHeartRate, unit: 'bpm' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'hrv', value: hrv, unit: 'ms' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'steps', value: steps, unit: 'steps' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'body', label: 'workout_minutes', value: workoutMinutes, unit: 'min' });
  pushMetric(logs, { date, createdAt, rawText: source, type: 'food', label: 'caffeine', value: caffeineCount, unit: 'count' });
  pushLowConfidenceNote(logs, { date, createdAt, rawText: source, type: 'food', label: 'food_note', note: foodNote });
  pushLowConfidenceNote(logs, { date, createdAt, rawText: source, type: 'body', label: 'body_note', note: bodyNote });

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
