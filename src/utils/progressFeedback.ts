import { AppData, ExecutionLog } from '../types';

export type PostSaveFeedbackTrend = 'improved' | 'maintained' | 'lower' | 'unknown';
export type PostSaveBaselineStatus = 'first_record' | 'has_history';
export type PostSaveRecordType = 'time' | 'performance' | 'quality' | 'custom' | 'unknown';

export type PostSaveFeedbackItem = {
  logId: string;
  title: string;
  goalName?: string;
  moduleName?: string;
  skillName?: string;
  recordType: PostSaveRecordType;
  durationMinutes?: number;
  qualityRating?: number;
  baselineStatus: PostSaveBaselineStatus;
  trend: PostSaveFeedbackTrend;
  summaryKey: string;
  summaryValues: Record<string, string | number>;
  nextActionKey: string;
  nextActionValues: Record<string, string | number>;
  comparison?: {
    previousLabel: string;
    currentLabel: string;
  };
};

export type PostSaveFeedback = {
  items: PostSaveFeedbackItem[];
  overflowCount: number;
};

function safeNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeName(value?: string) {
  return (value || '').trim().toLowerCase().replace(/[_\s-]+/g, ' ');
}

function logTitle(log: ExecutionLog, data: AppData) {
  const skill = log.linkedSkillId ? data.skills.find((item) => item.id === log.linkedSkillId) : undefined;
  return log.title || skill?.name || log.orphanedSkillName || (log.source === 'manual' ? 'Manual log' : 'Execution log');
}

function strengthMetrics(log: ExecutionLog) {
  const structured = log.structuredData || {};
  const firstSet = Array.isArray(log.actualData?.sets) ? log.actualData.sets[0] : undefined;
  const strength = log.actualData?.strength || {};
  const performanceSet = log.metricUpdate?.performanceData?.strengthSets?.[0];
  const weight = safeNumber(strength.weight ?? firstSet?.weight ?? performanceSet?.weight ?? log.actualData?.topWeight ?? log.metricUpdate?.performanceValue ?? structured.weight);
  const sets = safeNumber(strength.sets ?? firstSet?.sets ?? performanceSet?.sets ?? structured.sets);
  const reps = safeNumber(strength.reps ?? firstSet?.reps ?? performanceSet?.reps ?? structured.reps);
  const rpe = safeNumber(strength.rpe ?? firstSet?.rpe ?? performanceSet?.rpe ?? structured.rpe);
  const volume = safeNumber(strength.volume ?? log.metricUpdate?.performanceData?.totalVolume ?? structured.totalVolume);
  const estimatedVolume = volume ?? (weight != null && sets != null && reps != null ? weight * sets * reps : undefined);
  return { weight, sets, reps, rpe, volume: estimatedVolume };
}

function hasStrengthData(log: ExecutionLog) {
  const metrics = strengthMetrics(log);
  return metrics.weight != null || metrics.sets != null || metrics.reps != null || metrics.volume != null;
}

function formatStrengthLabel(log: ExecutionLog) {
  const metrics = strengthMetrics(log);
  if (metrics.weight != null && metrics.reps != null && metrics.sets != null) {
    return `${metrics.weight}kg × ${metrics.reps} × ${metrics.sets}${metrics.rpe != null ? ` · RPE ${metrics.rpe}` : ''}`;
  }
  if (metrics.weight != null) return `${metrics.weight}kg`;
  if (metrics.volume != null) return `${Math.round(metrics.volume)}`;
  return undefined;
}

function formatTimeLabel(log: ExecutionLog, lang: 'zh' | 'en') {
  const minutes = safeNumber(log.durationMinutes);
  if (!minutes || minutes <= 0) return undefined;
  return lang === 'zh' ? `${minutes}分钟` : `${minutes} min`;
}

function recordTypeFor(log: ExecutionLog): PostSaveRecordType {
  if (hasStrengthData(log) || log.metricUpdate?.metricType === 'performance_log') return 'performance';
  if ((log.durationMinutes || 0) > 0 || log.metricUpdate?.metricType === 'time_based') return 'time';
  if (log.qualityRating != null || log.metricUpdate?.qualityValue != null) return 'quality';
  if (log.structuredData?.isCustomAction || log.structuredData?.source === 'customAction') return 'custom';
  return 'unknown';
}

function comparableKey(log: ExecutionLog, data: AppData) {
  if (log.linkedSkillId) return `skill:${log.linkedSkillId}`;
  const title = normalizeName(log.title || log.orphanedSkillName || log.structuredData?.exerciseName as string | undefined);
  return title ? `title:${title}` : undefined;
}

function findPreviousLog(log: ExecutionLog, data: AppData, savedIds: Set<string>) {
  const key = comparableKey(log, data);
  if (!key) return undefined;
  const createdAt = new Date(log.createdAt).getTime();
  return (data.executionLogs || [])
    .filter((candidate) => !savedIds.has(candidate.id))
    .filter((candidate) => comparableKey(candidate, data) === key)
    .filter((candidate) => new Date(candidate.createdAt).getTime() < createdAt || candidate.id !== log.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

function compareStrength(current: ExecutionLog, previous: ExecutionLog): PostSaveFeedbackTrend {
  const c = strengthMetrics(current);
  const p = strengthMetrics(previous);
  if (c.volume != null && p.volume != null && p.volume > 0) {
    const delta = (c.volume - p.volume) / p.volume;
    if (delta > 0.05) return 'improved';
    if (delta < -0.05) return 'lower';
    return 'maintained';
  }
  if (c.weight != null && p.weight != null) {
    if (c.weight > p.weight) return 'improved';
    if (c.weight < p.weight) return 'lower';
    return 'maintained';
  }
  return 'unknown';
}

function compareTime(current: ExecutionLog, previous: ExecutionLog): PostSaveFeedbackTrend {
  const c = safeNumber(current.durationMinutes);
  const p = safeNumber(previous.durationMinutes);
  if (c == null || p == null || c <= 0 || p <= 0) return 'unknown';
  if (c > p) return 'improved';
  if (c < p) return 'lower';
  return 'maintained';
}

function compareQuality(current: ExecutionLog, previous: ExecutionLog): PostSaveFeedbackTrend {
  const c = safeNumber(current.qualityRating ?? current.metricUpdate?.qualityValue);
  const p = safeNumber(previous.qualityRating ?? previous.metricUpdate?.qualityValue);
  if (c == null || p == null) return 'unknown';
  if (c > p) return 'improved';
  if (c < p) return 'lower';
  return 'maintained';
}

function trendFor(current: ExecutionLog, previous: ExecutionLog | undefined) {
  if (!previous) return 'unknown';
  if (hasStrengthData(current) || hasStrengthData(previous)) return compareStrength(current, previous);
  if ((current.durationMinutes || 0) > 0 || (previous.durationMinutes || 0) > 0) return compareTime(current, previous);
  return compareQuality(current, previous);
}

function comparisonLabels(current: ExecutionLog, previous: ExecutionLog | undefined, lang: 'zh' | 'en') {
  if (!previous) return undefined;
  const currentLabel = formatStrengthLabel(current) ?? formatTimeLabel(current, lang);
  const previousLabel = formatStrengthLabel(previous) ?? formatTimeLabel(previous, lang);
  if (!currentLabel || !previousLabel) return undefined;
  return { currentLabel, previousLabel };
}

function nextActionKeyFor(log: ExecutionLog, trend: PostSaveFeedbackTrend, recordType: PostSaveRecordType) {
  const isFitness = log.taskType === 'strength_training' || recordType === 'performance';
  if (isFitness) {
    if (trend === 'improved') return 'nextActionKeepGoing';
    if (trend === 'lower') return 'nextActionWatchRecovery';
    if (!hasStrengthData(log)) return 'nextActionAddDetails';
    return 'nextActionKeepGoing';
  }
  if (recordType === 'time') return 'nextActionContinueSameDirection';
  return 'nextActionKeepGoing';
}

export function buildPostSaveFeedback({
  savedLogs,
  data,
  lang,
}: {
  savedLogs: ExecutionLog[];
  data: AppData;
  lang: 'zh' | 'en';
}): PostSaveFeedback {
  const savedIds = new Set(savedLogs.map((log) => log.id));
  const items = savedLogs.slice(0, 3).map((log) => {
    const skill = log.linkedSkillId ? data.skills.find((item) => item.id === log.linkedSkillId) : undefined;
    const goal = log.linkedGoalId ? data.categories.find((item) => item.id === log.linkedGoalId) : undefined;
    const module = log.linkedModuleId ? (data.modules || []).find((item) => item.id === log.linkedModuleId) : undefined;
    const previous = findPreviousLog(log, data, savedIds);
    const recordType = recordTypeFor(log);
    const trend = trendFor(log, previous);
    return {
      logId: log.id,
      title: logTitle(log, data),
      goalName: goal?.name,
      moduleName: module?.name,
      skillName: skill?.name,
      recordType,
      durationMinutes: safeNumber(log.durationMinutes),
      qualityRating: safeNumber(log.qualityRating ?? log.metricUpdate?.qualityValue),
      baselineStatus: previous ? 'has_history' : 'first_record',
      trend,
      summaryKey: previous ? `progress${trend.charAt(0).toUpperCase()}${trend.slice(1)}` : 'firstRecordBaseline',
      summaryValues: {},
      nextActionKey: nextActionKeyFor(log, trend, recordType),
      nextActionValues: {},
      comparison: comparisonLabels(log, previous, lang),
    } satisfies PostSaveFeedbackItem;
  });
  return {
    items,
    overflowCount: Math.max(0, savedLogs.length - items.length),
  };
}
