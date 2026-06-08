import { Category, ExecutionLog, Skill, StateCheckIn } from '../types';

type Confidence = 'low' | 'medium' | 'high';
type StateDeltaValue = 'down' | 'same' | 'up' | 'unknown';
type StatePatternType =
  | 'restorative_action'
  | 'draining_action'
  | 'focus_stabilizer'
  | 'mood_lifter'
  | 'low_state_starter'
  | 'high_state_push'
  | 'mixed_effect';

export type ContextLog = {
  id: string;
  date?: string;
  createdAt?: string;
  type: 'sleep' | 'food' | 'environment' | 'body' | 'weather' | 'symptom' | 'custom';
  label: string;
  value?: number | string;
  unit?: string;
  intensity?: number;
  source?: 'manual' | 'healthkit' | 'sensor' | 'import' | 'unknown';
};

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
    linkType: 'execution_state' | 'context_state' | 'context_execution' | 'context_state_execution';
    direction: 'positive' | 'negative' | 'neutral';
    label: string;
    evidence: string;
    confidence: Confidence;
    sourceIds?: string[];
    stateEffects?: {
      energy?: StateDeltaValue;
      focus?: StateDeltaValue;
      mood?: StateDeltaValue;
      body?: StateDeltaValue;
    };
  }[];
  statePatterns: {
    status: 'insufficient' | 'ok';
    patterns: {
      id: string;
      patternType: StatePatternType;
      labelKey: string;
      labelValues?: Record<string, any>;
      evidenceKey: string;
      evidenceValues?: Record<string, any>;
      nextActionKey: string;
      nextActionValues?: Record<string, any>;
      confidence: Confidence;
      sourceIds: string[];
    }[];
  };
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

function normalizeDelta(value: unknown): StateDeltaValue | undefined {
  return value === 'down' || value === 'same' || value === 'up' || value === 'unknown' ? value : undefined;
}

function dominantDelta(values: StateDeltaValue[]): StateDeltaValue | undefined {
  const useful = values.filter((value) => value !== 'unknown');
  if (useful.length === 0) return undefined;
  const counts = useful.reduce<Record<StateDeltaValue, number>>((acc, value) => {
    acc[value] += 1;
    return acc;
  }, { down: 0, same: 0, up: 0, unknown: 0 });
  const ordered: StateDeltaValue[] = ['up', 'same', 'down'];
  return ordered.sort((a, b) => counts[b] - counts[a])[0];
}

function directionFromStateEffects(effects: NonNullable<MetacognitionSummary['behaviorLinks'][number]['stateEffects']>) {
  const values = [effects.energy, effects.focus, effects.mood, effects.body].filter(Boolean) as StateDeltaValue[];
  const positive = values.filter((value) => value === 'up').length;
  const negative = values.filter((value) => value === 'down').length;
  if (positive > negative) return 'positive';
  if (negative > positive) return 'negative';
  return 'neutral';
}

function confidenceForCount(count: number, mixed = false): Confidence {
  if (count >= 5 && !mixed) return 'high';
  if (count >= 3 && !mixed) return 'medium';
  return 'low';
}

function isLowStartingState(log: ExecutionLog) {
  const snapshot = log.stateSnapshot;
  if (!snapshot) return false;
  return [snapshot.energy, snapshot.focus, snapshot.mood].some((value) => typeof value === 'number' && value <= 2);
}

function buildStatePatterns(logs: ExecutionLog[], skills: Skill[]): MetacognitionSummary['statePatterns'] {
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const groups = new Map<string, {
    id: string;
    label: string;
    taskType?: string;
    logs: ExecutionLog[];
    sourceIds: string[];
    energy: StateDeltaValue[];
    focus: StateDeltaValue[];
    mood: StateDeltaValue[];
    body: StateDeltaValue[];
    quality: number[];
    lowStartCount: number;
  }>();
  logs.forEach((log) => {
    const delta = log.structuredData?.afterStateDelta as Record<string, unknown> | undefined;
    if (!delta || delta.skipped) return;
    const energy = normalizeDelta(delta.energy);
    const focus = normalizeDelta(delta.focus);
    const mood = normalizeDelta(delta.mood);
    const body = normalizeDelta(delta.body);
    if (!energy && !focus && !mood && !body) return;
    const skill = log.linkedSkillId ? skillMap.get(log.linkedSkillId) : undefined;
    const key = skill?.id ?? log.title ?? log.orphanedSkillName ?? log.taskType ?? 'unlinked';
    const row = groups.get(key) ?? {
      id: key,
      label: skill?.name ?? log.title ?? log.orphanedSkillName ?? taskLabel(log.taskType),
      taskType: log.taskType ?? skill?.taskType,
      logs: [],
      sourceIds: [],
      energy: [],
      focus: [],
      mood: [],
      body: [],
      quality: [],
      lowStartCount: 0,
    };
    row.logs.push(log);
    row.sourceIds.push(log.id);
    if (energy) row.energy.push(energy);
    if (focus) row.focus.push(focus);
    if (mood) row.mood.push(mood);
    if (body) row.body.push(body);
    if (typeof log.qualityRating === 'number') row.quality.push(log.qualityRating);
    if (isLowStartingState(log)) row.lowStartCount += 1;
    groups.set(key, row);
  });
  const totalAfterStateLogs = Array.from(groups.values()).reduce((sum, row) => sum + row.logs.length, 0);
  if (totalAfterStateLogs < 2) return { status: 'insufficient', patterns: [] };

  const patterns: MetacognitionSummary['statePatterns']['patterns'] = [];
  Array.from(groups.values()).forEach((row) => {
    const count = row.logs.length;
    if (count < 2) return;
    const up = (values: StateDeltaValue[]) => values.filter((value) => value === 'up').length;
    const sameOrUp = (values: StateDeltaValue[]) => values.filter((value) => value === 'same' || value === 'up').length;
    const down = (values: StateDeltaValue[]) => values.filter((value) => value === 'down').length;
    const majority = Math.ceil(count / 2);
    const energyUp = up(row.energy) >= majority;
    const energyDown = down(row.energy) >= majority;
    const focusSameUp = sameOrUp(row.focus) >= majority;
    const focusDown = down(row.focus) >= majority;
    const moodUp = up(row.mood) >= majority;
    const moodSameUp = sameOrUp(row.mood) >= majority;
    const moodDown = down(row.mood) >= majority;
    const strongDownSignals = down(row.energy) + down(row.focus) + down(row.mood);
    const highQuality = row.quality.length > 0 && (avg(row.quality) ?? 0) >= 4;
    const mixed = energyDown && (moodUp || focusSameUp);
    const baseValues = { action: row.label, count: String(count) };
    const pushPattern = (
      patternType: StatePatternType,
      labelKey: string,
      evidenceKey: string,
      nextActionKey: string,
      options: { mixed?: boolean; confidence?: Confidence } = {},
    ) => {
      patterns.push({
        id: `${row.id}:${patternType}`,
        patternType,
        labelKey,
        labelValues: baseValues,
        evidenceKey,
        evidenceValues: baseValues,
        nextActionKey,
        nextActionValues: baseValues,
        confidence: options.confidence ?? confidenceForCount(count, options.mixed),
        sourceIds: row.sourceIds.slice(0, 5),
      });
    };

    if (mixed) {
      pushPattern('mixed_effect', 'mixedEffect', 'mixedStateEffect', 'leaveRecoveryWindow', { mixed: true });
      return;
    }
    if (energyDown && (focusDown || moodDown)) {
      pushPattern('draining_action', 'drainingAction', 'mayDrainState', 'leaveRecoveryWindow');
      return;
    }
    if ((energyUp || moodUp) && focusSameUp && strongDownSignals <= 1) {
      pushPattern('restorative_action', 'restorativeAction', 'mayRestoreState', 'tryAsStarterTask');
      return;
    }
    if (moodUp) {
      pushPattern('mood_lifter', 'moodLifter', 'mayLiftMood', 'continueToConfirmPattern');
      return;
    }
    if (focusSameUp && !energyDown) {
      const weakLowStart = row.lowStartCount === 0;
      pushPattern(
        weakLowStart ? 'focus_stabilizer' : 'low_state_starter',
        weakLowStart ? 'focusStabilizer' : 'lowStateStarter',
        weakLowStart ? 'mayStabilizeFocus' : 'goodLowStateStarter',
        'tryAsStarterTask',
        { confidence: weakLowStart && count === 2 ? 'low' : undefined },
      );
      return;
    }
    if (highQuality && !energyDown && moodSameUp) {
      pushPattern('high_state_push', 'highStatePush', 'goodHighStatePush', 'continueToConfirmPattern');
    }
  });

  return { status: patterns.length > 0 ? 'ok' : 'insufficient', patterns: patterns.slice(0, 3) };
}

function buildAfterStateLinks(logs: ExecutionLog[], skills: Skill[]): MetacognitionSummary['behaviorLinks'] {
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const groups = new Map<string, {
    label: string;
    count: number;
    sourceIds: string[];
    energy: StateDeltaValue[];
    focus: StateDeltaValue[];
    mood: StateDeltaValue[];
    body: StateDeltaValue[];
  }>();
  logs.forEach((log) => {
    const delta = log.structuredData?.afterStateDelta as Record<string, unknown> | undefined;
    if (!delta || delta.skipped) return;
    const energy = normalizeDelta(delta.energy);
    const focus = normalizeDelta(delta.focus);
    const mood = normalizeDelta(delta.mood);
    const body = normalizeDelta(delta.body);
    if (!energy && !focus && !mood && !body) return;
    const skill = log.linkedSkillId ? skillMap.get(log.linkedSkillId) : undefined;
    const key = skill?.id ?? log.taskType ?? 'unlinked';
    const row = groups.get(key) ?? {
      label: skill?.name ?? taskLabel(log.taskType),
      count: 0,
      sourceIds: [],
      energy: [],
      focus: [],
      mood: [],
      body: [],
    };
    row.count += 1;
    row.sourceIds.push(log.id);
    if (energy) row.energy.push(energy);
    if (focus) row.focus.push(focus);
    if (mood) row.mood.push(mood);
    if (body) row.body.push(body);
    groups.set(key, row);
  });
  return Array.from(groups.values())
    .filter((row) => row.count >= 2)
    .map((row) => {
      const stateEffects = {
        energy: dominantDelta(row.energy),
        focus: dominantDelta(row.focus),
        mood: dominantDelta(row.mood),
        body: dominantDelta(row.body),
      };
      const direction = directionFromStateEffects(stateEffects);
      const confidence: Confidence = row.count >= 5 ? 'high' : row.count >= 3 ? 'medium' : 'low';
      return {
        linkType: 'execution_state' as const,
        direction,
        label: row.label,
        evidence: `after|${row.count}`,
        confidence,
        sourceIds: row.sourceIds.slice(0, 5),
        stateEffects,
      };
    });
}

function buildBehaviorLinks(logs: ExecutionLog[], skills: Skill[]): MetacognitionSummary['behaviorLinks'] {
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  const groups = new Map<string, { label: string; taskType?: string; qualities: number[]; durations: number[]; count: number; sourceIds: string[] }>();
  logs.forEach((log) => {
    const skill = log.linkedSkillId ? skillMap.get(log.linkedSkillId) : undefined;
    const key = skill?.id ?? log.taskType ?? 'unlinked';
    const row = groups.get(key) ?? {
      label: skill?.name ?? taskLabel(log.taskType),
      taskType: log.taskType ?? skill?.taskType,
      qualities: [],
      durations: [],
      count: 0,
      sourceIds: [],
    };
    row.count += 1;
    row.sourceIds.push(log.id);
    if (log.qualityRating != null) row.qualities.push(log.qualityRating);
    if ((log.durationMinutes ?? 0) > 0) row.durations.push(log.durationMinutes ?? 0);
    groups.set(key, row);
  });
  const genericLinks = Array.from(groups.values())
    .filter((row) => row.count >= 2 || row.qualities.length >= 2)
    .map((row) => {
      const avgQuality = avg(row.qualities);
      const avgDuration = avg(row.durations);
      const direction: MetacognitionSummary['behaviorLinks'][number]['direction'] = avgQuality == null ? 'neutral' : avgQuality >= 4 ? 'positive' : avgQuality <= 2.5 ? 'negative' : 'neutral';
      const confidence: Confidence = row.count >= 5 ? 'high' : row.count >= 3 ? 'medium' : 'low';
      return {
        linkType: 'execution_state' as const,
        direction,
        label: row.label,
        evidence: `${row.count}|${avgQuality?.toFixed(1) ?? 'NA'}|${avgDuration?.toFixed(0) ?? 'NA'}`,
        confidence,
        sourceIds: row.sourceIds.slice(0, 5),
      };
    })
    .sort((a, b) => {
      const rank: Record<MetacognitionSummary['behaviorLinks'][number]['direction'], number> = { positive: 0, negative: 1, neutral: 2 };
      return rank[a.direction] - rank[b.direction];
    })
    .slice(0, 3);
  const afterStateLinks = buildAfterStateLinks(logs, skills);
  return [...afterStateLinks, ...genericLinks].slice(0, 3);
}

export function buildMetacognitionSummary({
  executionLogs,
  stateCheckIns,
  skills,
  goals,
  contextLogs = [],
  now = new Date(),
}: {
  executionLogs: ExecutionLog[];
  stateCheckIns: StateCheckIn[];
  skills: Skill[];
  goals: Category[];
  contextLogs?: ContextLog[];
  now?: Date;
}): MetacognitionSummary {
  const windowDays = 7;
  const startStr = localDate(windowStart(now, windowDays));
  const logs = getLiveExecutionLogs(executionLogs, { skills })
    .filter((log) => log.date >= startStr);
  const states = (stateCheckIns || []).filter((row) => row.date >= startStr);
  const contexts = (contextLogs || []).filter((row) => (row.date ?? row.createdAt ?? '') >= startStr);
  const stateTrend = buildStateTrend(states);
  const behaviorLinks = buildBehaviorLinks(logs, skills);
  const statePatterns = buildStatePatterns(logs, skills);
  const predictionGap = buildPredictionGap(logs);
  const insufficient = logs.length < 3 || states.length < 3;
  void contexts;

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
  } else if (behaviorLinks.some((link) => link.direction === 'positive')) {
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
    statePatterns,
    predictionGap,
    currentPattern,
  };
}
