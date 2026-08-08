import type {
  ExecutionLog,
  PatternMemory,
  StateCheckIn,
} from '../../types';
import type { ObjectiveContextBrief } from '../../utils/objectiveContextBrief';
import type { V11EvidenceStage } from '../../v11/tokens';
import type {
  V11InsightCopy,
  V11InsightsPresentation,
} from '../insightsPresentation';

export type QuantMetricId = 'state' | 'execution' | 'quality' | 'recovery';
export type QuantBaselineStatus = 'unavailable' | 'forming' | 'provisional' | 'established';
export type QuantSignalStatus = 'candidate' | 'supported' | 'archived';
export type QuantFixtureId = 'empty' | 'forming' | 'signal' | 'mature';

export type QuantTerminalPoint = {
  date: string;
  label: string;
  value: number | null;
  sourceIds: string[];
  observation: 'recorded' | 'derived' | 'missing';
  uncertainty?: { low: number; high: number };
};

export type QuantTerminalMetric = {
  id: QuantMetricId;
  labelKey: string;
  unitKey: string;
  stage: V11EvidenceStage;
  current: number | null;
  currentDate?: string;
  baseline: {
    status: QuantBaselineStatus;
    value: number | null;
    min: number | null;
    max: number | null;
  };
  delta: number | null;
  points: QuantTerminalPoint[];
  observations: number;
  activeDays: number;
  missingDays: number;
  sourceKind: 'recorded' | 'derived';
  limitation: V11InsightCopy;
};

export type QuantTerminalSignal = {
  id: string;
  status: QuantSignalStatus;
  title: V11InsightCopy;
  detail: V11InsightCopy;
  evidenceCount: number;
  counterexampleCount: number | null;
  sourceIds: string[];
  lastSeenAt?: string;
  limitation: V11InsightCopy;
};

export type QuantTerminalEvidence = {
  id: string;
  title: V11InsightCopy;
  detail: V11InsightCopy;
  sourceIds: string[];
  observedAt?: string;
  sourceKind: 'recorded' | 'derived' | 'inferred';
  limitation: V11InsightCopy;
};

export type QuantTerminalPresentation = {
  fixture: QuantFixtureId | null;
  range: { days: 30; start: string; end: string };
  stage: V11EvidenceStage;
  metrics: QuantTerminalMetric[];
  defaultMetricId: QuantMetricId;
  signals: QuantTerminalSignal[];
  evidence: QuantTerminalEvidence[];
  implication: V11InsightCopy;
  maturityKey: string;
};

export type BuildQuantTerminalInput = {
  now: Date;
  base: V11InsightsPresentation;
  liveLogs: ExecutionLog[];
  stateCheckIns: StateCheckIn[];
  patternMemory: PatternMemory[];
  objectiveContext: ObjectiveContextBrief;
};

function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateRange(now: Date) {
  const endDate = new Date(now);
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 29);
  return { startDate, endDate, start: localDate(startDate), end: localDate(endDate) };
}

function dateKeys(now: Date) {
  const { startDate } = dateRange(now);
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return localDate(date);
  });
}

function stageRank(stage: V11EvidenceStage) {
  return Number(stage.slice(1));
}

function observedSummary(points: QuantTerminalPoint[]) {
  const observed = points.filter((point) => point.value != null);
  return {
    currentPoint: observed[observed.length - 1] ?? null,
    observations: observed.length,
    activeDays: new Set(observed.map((point) => point.date)).size,
    missingDays: points.filter((point) => point.value == null).length,
  };
}

function metricDelta(current: number | null, baseline: number | null) {
  return current == null || baseline == null ? null : current - baseline;
}

function stateMetric(
  now: Date,
  states: StateCheckIn[],
  base: V11InsightsPresentation,
): QuantTerminalMetric {
  const keys = dateKeys(now);
  const latestByDay = new Map<string, StateCheckIn>();
  states
    .filter((row) => Number.isFinite(row.overall) && row.overall >= 1 && row.overall <= 5)
    .forEach((row) => {
      const existing = latestByDay.get(row.date);
      if (!existing || row.timestamp > existing.timestamp) latestByDay.set(row.date, row);
    });
  const points = keys.map<QuantTerminalPoint>((date) => {
    const row = latestByDay.get(date);
    return {
      date,
      label: date.slice(5),
      value: row?.overall ?? null,
      sourceIds: row ? [row.id] : [],
      observation: row ? 'recorded' : 'missing',
    };
  });
  const summary = observedSummary(points);
  const status: QuantBaselineStatus = summary.observations === 0
    ? 'unavailable'
    : base.overview.comparison.status === 'comparable'
      ? 'provisional'
      : 'forming';
  return {
    id: 'state',
    labelKey: 'quantMetricState',
    unitKey: 'quantUnitOutOfFive',
    stage: base.overview.stage,
    current: summary.currentPoint?.value ?? null,
    currentDate: summary.currentPoint?.date,
    baseline: { status, value: null, min: null, max: null },
    delta: null,
    points,
    observations: summary.observations,
    activeDays: summary.activeDays,
    missingDays: summary.missingDays,
    sourceKind: 'recorded',
    limitation: base.overview.limitation,
  };
}

function executionMetric(
  now: Date,
  logs: ExecutionLog[],
  base: V11InsightsPresentation,
): QuantTerminalMetric {
  const keys = dateKeys(now);
  const byDay = new Map<string, { value: number; sourceIds: string[] }>();
  logs.forEach((log) => {
    if ((log.durationMinutes ?? 0) <= 0) return;
    const row = byDay.get(log.date) ?? { value: 0, sourceIds: [] };
    row.value += log.durationMinutes;
    row.sourceIds.push(log.id);
    byDay.set(log.date, row);
  });
  const points = keys.map<QuantTerminalPoint>((date) => {
    const row = byDay.get(date);
    return {
      date,
      label: date.slice(5),
      value: row?.value ?? null,
      sourceIds: row?.sourceIds ?? [],
      observation: row ? 'derived' : 'missing',
    };
  });
  const summary = observedSummary(points);
  const baseline = base.trends.baselineMinutes;
  return {
    id: 'execution',
    labelKey: 'quantMetricExecution',
    unitKey: 'quantUnitMinutes',
    stage: base.trends.stage,
    current: summary.currentPoint?.value ?? null,
    currentDate: summary.currentPoint?.date,
    baseline: {
      status: baseline == null ? (summary.observations > 0 ? 'forming' : 'unavailable') : 'provisional',
      value: baseline,
      min: base.trends.observedRangeMinutes?.min ?? null,
      max: base.trends.observedRangeMinutes?.max ?? null,
    },
    delta: metricDelta(summary.currentPoint?.value ?? null, baseline),
    points,
    observations: summary.observations,
    activeDays: summary.activeDays,
    missingDays: summary.missingDays,
    sourceKind: 'derived',
    limitation: base.trends.limitation,
  };
}

function qualityMetric(
  now: Date,
  logs: ExecutionLog[],
  stage: V11EvidenceStage,
): QuantTerminalMetric {
  const keys = dateKeys(now);
  const byDay = new Map<string, { total: number; count: number; sourceIds: string[] }>();
  logs.forEach((log) => {
    if (!Number.isFinite(log.qualityRating)) return;
    const row = byDay.get(log.date) ?? { total: 0, count: 0, sourceIds: [] };
    row.total += log.qualityRating ?? 0;
    row.count += 1;
    row.sourceIds.push(log.id);
    byDay.set(log.date, row);
  });
  const points = keys.map<QuantTerminalPoint>((date) => {
    const row = byDay.get(date);
    return {
      date,
      label: date.slice(5),
      value: row && row.count > 0 ? row.total / row.count : null,
      sourceIds: row?.sourceIds ?? [],
      observation: row ? 'derived' : 'missing',
    };
  });
  const summary = observedSummary(points);
  return {
    id: 'quality',
    labelKey: 'quantMetricQuality',
    unitKey: 'quantUnitOutOfFive',
    stage: summary.observations > 0 ? (stageRank(stage) >= 2 ? 'S2' : 'S1') : 'S0',
    current: summary.currentPoint?.value ?? null,
    currentDate: summary.currentPoint?.date,
    baseline: {
      status: summary.observations === 0 ? 'unavailable' : 'forming',
      value: null,
      min: null,
      max: null,
    },
    delta: null,
    points,
    observations: summary.observations,
    activeDays: summary.activeDays,
    missingDays: summary.missingDays,
    sourceKind: 'derived',
    limitation: { kind: 'i18n', key: 'quantQualityBaselineLimitation' },
  };
}

function recoveryMetric(
  now: Date,
  context: ObjectiveContextBrief,
): QuantTerminalMetric | null {
  const value = context.metrics.hrv;
  if (value == null || !Number.isFinite(value)) return null;
  const keys = dateKeys(now);
  const end = keys[keys.length - 1];
  const points = keys.map<QuantTerminalPoint>((date) => ({
    date,
    label: date.slice(5),
    value: date === end ? value : null,
    sourceIds: [],
    observation: date === end ? 'recorded' : 'missing',
  }));
  return {
    id: 'recovery',
    labelKey: 'quantMetricRecovery',
    unitKey: 'quantUnitMilliseconds',
    stage: 'S1',
    current: value,
    currentDate: end,
    baseline: { status: 'forming', value: null, min: null, max: null },
    delta: null,
    points,
    observations: 1,
    activeDays: 1,
    missingDays: 29,
    sourceKind: 'recorded',
    limitation: { kind: 'i18n', key: 'quantRecoveryBaselineLimitation' },
  };
}

function signalRows(base: V11InsightsPresentation): QuantTerminalSignal[] {
  return base.patterns.rows.slice(0, 4).map((row) => ({
    id: row.id,
    status: row.status === 'accepted' ? 'supported' : row.status,
    title: row.title,
    detail: row.description,
    evidenceCount: row.evidenceCount,
    counterexampleCount: null,
    sourceIds: row.sourceIds,
    lastSeenAt: row.lastSeenAt,
    limitation: row.status === 'accepted'
      ? { kind: 'i18n', key: 'quantSupportedNotCausal' }
      : { kind: 'i18n', key: 'stage3CandidatePatternLimitation' },
  }));
}

function evidenceRows(base: V11InsightsPresentation): QuantTerminalEvidence[] {
  return base.overview.evidence.map((row) => ({
    id: row.id,
    title: row.title,
    detail: row.detail,
    sourceIds: row.sourceIds,
    observedAt: row.observedAt,
    sourceKind: row.sourceType === 'association' || row.sourceType === 'pattern'
      ? 'inferred'
      : row.sourceType === 'state' || row.sourceType === 'execution'
        ? 'recorded'
        : 'derived',
    limitation: row.limitation,
  }));
}

function maturityKey(stage: V11EvidenceStage) {
  if (stage === 'S3') return 'quantMaturityEstablished';
  if (stage === 'S2') return 'quantMaturityProvisional';
  if (stage === 'S1') return 'quantMaturityForming';
  return 'quantMaturityUnavailable';
}

export function buildQuantTerminalPresentation(
  input: BuildQuantTerminalInput,
): QuantTerminalPresentation {
  const state = stateMetric(input.now, input.stateCheckIns, input.base);
  const execution = executionMetric(input.now, input.liveLogs, input.base);
  const quality = qualityMetric(input.now, input.liveLogs, input.base.overview.stage);
  const recovery = recoveryMetric(input.now, input.objectiveContext);
  const metrics = [state, execution, quality, recovery].filter((metric): metric is QuantTerminalMetric => metric != null);
  const defaultMetric = state.current != null
    ? state
    : execution.current != null
      ? execution
      : metrics[0];
  const stage = defaultMetric?.stage ?? 'S0';
  const range = dateRange(input.now);
  return {
    fixture: null,
    range: { days: 30, start: range.start, end: range.end },
    stage,
    metrics,
    defaultMetricId: defaultMetric?.id ?? 'state',
    signals: signalRows(input.base),
    evidence: evidenceRows(input.base),
    implication: input.base.overview.nextAction,
    maturityKey: maturityKey(stage),
  };
}
