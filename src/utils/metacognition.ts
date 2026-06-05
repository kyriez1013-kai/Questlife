import { Category, ExecutionLog, Skill, StateCheckIn } from '../types';

type Confidence = 'low' | 'medium' | 'high';

export type MetacognitionSummary = {
  status: 'insufficient' | 'ok';
  windowDays: 7;
  stateTrend: {
    energyDelta?: number;
    focusDelta?: number;
    moodDelta?: number;
    stressDelta?: number;
    overallDelta?: number;
    direction: 'improving' | 'declining' | 'stable' | 'mixed' | 'unknown';
  };
  behaviorLinks: {
    type: 'positive' | 'negative' | 'neutral';
    label: string;
    evidence: string;
    confidence: Confidence;
  }[];
  predictionGap: {
    status: 'insufficient' | 'ok';
    durationErrorAvg?: number;
    qualityErrorAvg?: number;
    tendency: 'overestimate' | 'underestimate' | 'accurate' | 'unknown';
  };
  currentPattern: {
    titleKey: string;
    bodyKey: string;
    nextActionKey: string;
    confidence: Confidence;
  };
};

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function avg(values: (number | undefined)[]) {
  const nums = values.filter((value): value is number => Number.isFinite(value));
  if (nums.length === 0) return undefined;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function roundDelta(value?: number) {
  return value == null ? undefined : Math.round(value * 10) / 10;
}

export function getLiveExecutionLogs(
  executionLogs: ExecutionLog[] = [],
  context: { skills?: Skill[] } = {},
) {
  const skillIds = new Set((context.skills || []).map((skill) => skill.id));
  return executionLogs.filter((log) => {
    if (!log?.id || !log.date || !log.createdAt) return false;
    if ((log as any).deleted || (log as any).deletedAt) return false;
    if (log.linkedSkillId && !skillIds.has(log.linkedSkillId)) return false;
    if (!log.linkedSkillId && log.orphanedSkillName) return false;
    if ((log.durationMinutes ?? 0) < 0) return false;
    return true;
  });
}

function windowStart(now: Date, windowDays: number) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (windowDays - 1));
  return start;
}

function trendDirection(trend: MetacognitionSummary['stateTrend']) {
  const positive = [
    trend.energyDelta ?? 0,
    trend.focusDelta ?? 0,
    trend.moodDelta ?? 0,
    trend.overallDelta ?? 0,
    -(trend.stressDelta ?? 0),
  ];
  const meaningful = positive.filter((value) => Math.abs(value) >= 0.35);
  if (meaningful.length === 0) return 'stable';
  const up = meaningful.filter((value) => value > 0).length;
  const down = meaningful.filter((value) => value < 0).length;
  if (up > 0 && down > 0) return 'mixed';
  return up > down ? 'improving' : 'declining';
}

function buildStateTrend(rows: StateCheckIn[]): MetacognitionSummary['stateTrend'] {
  if (rows.length < 2) return { direction: 'unknown' };
  const sorted = rows.slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const split = Math.max(1, Math.floor(sorted.length / 2));
  const older = sorted.slice(0, split);
  const newer = sorted.slice(split);
  const trend = {
    energyDelta: roundDelta((avg(newer.map((row) => row.energy)) ?? 0) - (avg(older.map((row) => row.energy)) ?? 0)),
    focusDelta: roundDelta((avg(newer.map((row) => row.focus)) ?? 0) - (avg(older.map((row) => row.focus)) ?? 0)),
    moodDelta: roundDelta((avg(newer.map((row) => row.mood)) ?? 0) - (avg(older.map((row) => row.mood)) ?? 0)),
    stressDelta: roundDelta((avg(newer.map((row) => row.stress)) ?? 0) - (avg(older.map((row) => row.stress)) ?? 0)),
    overallDelta: roundDelta((avg(newer.map((row) => row.overall)) ?? 0) - (avg(older.map((row) => row.overall)) ?? 0)),
    direction: 'unknown' as MetacognitionSummary['stateTrend']['direction'],
  };
  return { ...trend, direction: trendDirection(trend) };
}

function buildPredictionGap(logs: ExecutionLog[]): MetacognitionSummary['predictionGap'] {
  const durationLogs = logs.filter((log) => log.predictedDurationMinutes != null && log.durationMinutes != null);
  const qualityLogs = logs.filter((log) => log.predictedQualityRating != null && log.qualityRating != null);
  if (durationLogs.length + qualityLogs.length < 2) {
    return { status: 'insufficient', tendency: 'unknown' };
  }
  const durationDiffs = durationLogs.map((log) => (log.durationMinutes ?? 0) - (log.predictedDurationMinutes ?? 0));
  const qualityDiffs = qualityLogs.map((log) => (log.qualityRating ?? 0) - (log.predictedQualityRating ?? 0));
  const durationErrorAvg = durationDiffs.length
    ? durationDiffs.reduce((sum, diff) => sum + Math.abs(diff), 0) / durationDiffs.length
    : undefined;
  const qualityErrorAvg = qualityDiffs.length
    ? qualityDiffs.reduce((sum, diff) => sum + Math.abs(diff), 0) / qualityDiffs.length
    : undefined;
  const avgDiff = durationDiffs.length ? durationDiffs.reduce((sum, diff) => sum + diff, 0) / durationDiffs.length : 0;
  const tendency = Math.abs(avgDiff) <= 8
    ? 'accurate'
    : avgDiff < 0
      ? 'overestimate'
      : 'underestimate';
  return {
    status: 'ok',
    durationErrorAvg: roundDelta(durationErrorAvg),
    qualityErrorAvg: roundDelta(qualityErrorAvg),
    tendency,
  };
}

function taskLabel(taskType?: string) {
  if (!taskType) return 'action';
  return taskType.replace(/_/g, ' ');
}

function buildBehaviorLinks(logs: ExecutionLog[], skills: Skill[]): MetacognitionSummary['behaviorLinks'] {
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const groups = new Map<string, { label: string; taskType?: string; qualities: number[]; durations: number[]; count: number }>();
  logs.forEach((log) => {
    const skill = log.linkedSkillId ? skillMap.get(log.linkedSkillId) : undefined;
    const key = skill?.id ?? log.taskType ?? 'unlinked';
    const row = groups.get(key) ?? {
      label: skill?.name ?? taskLabel(log.taskType),
      taskType: log.taskType ?? skill?.taskType,
      qualities: [],
      durations: [],
      count: 0,
    };
    row.count += 1;
    if (log.qualityRating != null) row.qualities.push(log.qualityRating);
    if ((log.durationMinutes ?? 0) > 0) row.durations.push(log.durationMinutes ?? 0);
    groups.set(key, row);
  });
  return Array.from(groups.values())
    .filter((row) => row.count >= 2 || row.qualities.length >= 2)
    .map((row) => {
      const avgQuality = avg(row.qualities);
      const avgDuration = avg(row.durations);
      const type: MetacognitionSummary['behaviorLinks'][number]['type'] = avgQuality == null ? 'neutral' : avgQuality >= 4 ? 'positive' : avgQuality <= 2.5 ? 'negative' : 'neutral';
      const confidence: Confidence = row.count >= 5 ? 'high' : row.count >= 3 ? 'medium' : 'low';
      return {
        type,
        label: row.label,
        evidence: `${row.count}|${avgQuality?.toFixed(1) ?? 'NA'}|${avgDuration?.toFixed(0) ?? 'NA'}`,
        confidence,
      };
    })
    .sort((a, b) => {
      const rank: Record<MetacognitionSummary['behaviorLinks'][number]['type'], number> = { positive: 0, negative: 1, neutral: 2 };
      return rank[a.type] - rank[b.type];
    })
    .slice(0, 3);
}

export function buildMetacognitionSummary({
  executionLogs,
  stateCheckIns,
  skills,
  goals,
  now = new Date(),
}: {
  executionLogs: ExecutionLog[];
  stateCheckIns: StateCheckIn[];
  skills: Skill[];
  goals: Category[];
  now?: Date;
}): MetacognitionSummary {
  const windowDays = 7;
  const startStr = localDate(windowStart(now, windowDays));
  const logs = getLiveExecutionLogs(executionLogs, { skills })
    .filter((log) => log.date >= startStr);
  const states = (stateCheckIns || []).filter((row) => row.date >= startStr);
  const stateTrend = buildStateTrend(states);
  const behaviorLinks = buildBehaviorLinks(logs, skills);
  const predictionGap = buildPredictionGap(logs);
  const insufficient = logs.length < 3 || states.length < 3;

  let currentPattern: MetacognitionSummary['currentPattern'];
  if (insufficient) {
    currentPattern = {
      titleKey: 'dataNotEnoughForMetacognition',
      bodyKey: 'whatToRecordNext',
      nextActionKey: 'recordBeforeAfterAction',
      confidence: 'low',
    };
  } else if (stateTrend.direction === 'declining' && ((stateTrend.focusDelta ?? 0) < -0.3 || (stateTrend.energyDelta ?? 0) < -0.3)) {
    currentPattern = {
      titleKey: (stateTrend.focusDelta ?? 0) < -0.3 ? 'focusDeclining' : 'energyDeclining',
      bodyKey: 'reducePlanningUnit',
      nextActionKey: 'recordBeforeAfterAction',
      confidence: 'medium',
    };
  } else if (predictionGap.status === 'ok' && predictionGap.tendency === 'overestimate' && (predictionGap.durationErrorAvg ?? 0) >= 15) {
    currentPattern = {
      titleKey: 'likelyOverestimating',
      bodyKey: 'reducePlanningUnit',
      nextActionKey: 'recordBeforeAfterAction',
      confidence: 'medium',
    };
  } else if (behaviorLinks.some((link) => link.type === 'positive')) {
    currentPattern = {
      titleKey: 'stateImproving',
      bodyKey: 'associatedNotCausal',
      nextActionKey: 'continueOneMoreRecord',
      confidence: behaviorLinks[0]?.confidence ?? 'low',
    };
  } else {
    currentPattern = {
      titleKey: stateTrend.direction === 'stable' ? 'stateStable' : stateTrend.direction === 'mixed' ? 'stateMixed' : 'currentPattern',
      bodyKey: predictionGap.status === 'ok' && predictionGap.tendency === 'accurate' ? 'planningAccurate' : 'whatToRecordNext',
      nextActionKey: 'recordBeforeAfterAction',
      confidence: goals.length > 0 ? 'medium' : 'low',
    };
  }

  return {
    status: insufficient ? 'insufficient' : 'ok',
    windowDays,
    stateTrend,
    behaviorLinks,
    predictionGap,
    currentPattern,
  };
}
