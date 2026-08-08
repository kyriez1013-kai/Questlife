import type { V11InsightCopy } from '../insightsPresentation';
import type {
  QuantFixtureId,
  QuantMetricId,
  QuantTerminalMetric,
  QuantTerminalPresentation,
  QuantTerminalSignal,
} from './quantTerminalPresentation';

const start = '2026-07-10';
const end = '2026-08-08';

function text(key: string): V11InsightCopy {
  return { kind: 'i18n', key };
}

function points(values: Array<number | null>, uncertainty = false) {
  return values.map((value, index) => {
    const date = new Date(`${start}T00:00:00`);
    date.setDate(date.getDate() + index);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      date: dateKey,
      label: dateKey.slice(5),
      value,
      sourceIds: value == null ? [] : [`fixture-observation-${index}`],
      observation: value == null ? 'missing' as const : 'recorded' as const,
      uncertainty: uncertainty && value != null ? { low: value - 0.24, high: value + 0.24 } : undefined,
    };
  });
}

function metric(
  id: QuantMetricId,
  values: Array<number | null>,
  options: {
    baseline?: number;
    min?: number;
    max?: number;
    established?: boolean;
    unitKey: string;
  },
): QuantTerminalMetric {
  const rows = points(values, options.established);
  const observed = rows.filter((row) => row.value != null);
  const current = observed[observed.length - 1]?.value ?? null;
  return {
    id,
    labelKey: `quantMetric${id[0].toUpperCase()}${id.slice(1)}`,
    unitKey: options.unitKey,
    stage: options.established ? 'S3' : observed.length > 3 ? 'S2' : observed.length > 0 ? 'S1' : 'S0',
    current,
    currentDate: observed[observed.length - 1]?.date,
    baseline: {
      status: options.established ? 'established' : observed.length > 3 ? 'provisional' : observed.length > 0 ? 'forming' : 'unavailable',
      value: options.baseline ?? null,
      min: options.min ?? null,
      max: options.max ?? null,
    },
    delta: current != null && options.baseline != null ? current - options.baseline : null,
    points: rows,
    observations: observed.length,
    activeDays: new Set(observed.map((row) => row.date)).size,
    missingDays: rows.length - observed.length,
    sourceKind: id === 'state' || id === 'recovery' ? 'recorded' : 'derived',
    limitation: text(options.established ? 'quantFixtureEstablishedLimitation' : 'quantFixtureFormingLimitation'),
  };
}

const matureSignals: QuantTerminalSignal[] = [
  {
    id: 'fixture-supported-signal',
    status: 'supported',
    title: text('quantFixtureSupportedSignal'),
    detail: text('quantFixtureSupportedSignalDetail'),
    evidenceCount: 18,
    counterexampleCount: 4,
    sourceIds: ['fixture-observation-4', 'fixture-observation-8'],
    lastSeenAt: '2026-08-07T09:00:00.000Z',
    limitation: text('quantSupportedNotCausal'),
  },
  {
    id: 'fixture-candidate-signal',
    status: 'candidate',
    title: text('quantFixtureCandidateSignal'),
    detail: text('quantFixtureCandidateSignalDetail'),
    evidenceCount: 7,
    counterexampleCount: 3,
    sourceIds: ['fixture-observation-12'],
    lastSeenAt: '2026-08-06T09:00:00.000Z',
    limitation: text('stage3CandidatePatternLimitation'),
  },
];

const matureValues = [
  3.2, 3.3, null, 3.5, 3.4, 3.1, 3.6, null, 3.8, 3.7,
  3.5, 3.9, 3.8, null, 4.0, 3.7, 3.9, 4.1, 3.8, 4.0,
  null, 4.2, 4.0, 4.1, 4.2, 3.9, 4.3, 4.1, 4.2, 4.1,
];

function forming(): QuantTerminalPresentation {
  const state = metric(
    'state',
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 3.0, null, 3.2, null, 3.1],
    { unitKey: 'quantUnitOutOfFive' },
  );
  return {
    fixture: 'forming',
    range: { days: 30, start, end },
    stage: 'S1',
    metrics: [state],
    defaultMetricId: 'state',
    signals: [],
    evidence: [{
      id: 'fixture-forming-evidence',
      title: text('quantFixtureRecordedState'),
      detail: text('quantFixtureFormingEvidenceDetail'),
      sourceIds: ['fixture-observation-25'],
      observedAt: '2026-08-08T09:00:00.000Z',
      sourceKind: 'recorded',
      limitation: text('quantFixtureFormingLimitation'),
    }],
    implication: text('quantFixtureFormingImplication'),
    maturityKey: 'quantMaturityForming',
  };
}

function mature(fixture: QuantFixtureId): QuantTerminalPresentation {
  const state = metric('state', matureValues, { baseline: 3.6, min: 3.2, max: 4.0, established: true, unitKey: 'quantUnitOutOfFive' });
  const execution = metric('execution', matureValues.map((value) => value == null ? null : Math.round(value * 18)), { baseline: 66, min: 42, max: 82, established: true, unitKey: 'quantUnitMinutes' });
  const quality = metric('quality', matureValues.map((value) => value == null ? null : Math.min(5, value + 0.3)), { baseline: 3.8, min: 3.4, max: 4.4, established: true, unitKey: 'quantUnitOutOfFive' });
  const recovery = metric('recovery', matureValues.map((value) => value == null ? null : Math.round(value * 13)), { baseline: 48, min: 42, max: 55, established: true, unitKey: 'quantUnitMilliseconds' });
  return {
    fixture,
    range: { days: 30, start, end },
    stage: fixture === 'signal' ? 'S2' : 'S3',
    metrics: [state, execution, quality, recovery],
    defaultMetricId: 'state',
    signals: fixture === 'signal' ? [matureSignals[1]] : matureSignals,
    evidence: [
      {
        id: 'fixture-evidence-state',
        title: text('quantFixtureRecordedState'),
        detail: text('quantFixtureRecordedStateDetail'),
        sourceIds: ['fixture-observation-29'],
        observedAt: '2026-08-08T09:00:00.000Z',
        sourceKind: 'recorded',
        limitation: text('quantFixtureEstablishedLimitation'),
      },
      {
        id: 'fixture-evidence-execution',
        title: text('quantFixtureExecutionEvidence'),
        detail: text('quantFixtureExecutionEvidenceDetail'),
        sourceIds: ['fixture-observation-27'],
        observedAt: '2026-08-06T20:00:00.000Z',
        sourceKind: 'derived',
        limitation: text('quantFixtureEstablishedLimitation'),
      },
    ],
    implication: text('quantFixtureMatureImplication'),
    maturityKey: fixture === 'signal' ? 'quantMaturityProvisional' : 'quantMaturityEstablished',
  };
}

export function getQuantTerminalFixture(id: QuantFixtureId): QuantTerminalPresentation {
  return id === 'forming' ? forming() : mature(id);
}

