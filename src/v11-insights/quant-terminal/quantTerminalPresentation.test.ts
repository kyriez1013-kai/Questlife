import type { V11InsightsPresentation } from '../insightsPresentation';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { buildQuantTerminalPresentation } from './quantTerminalPresentation.ts';
// @ts-expect-error Test-only Node TypeScript entry.
import { getQuantTerminalFixture } from './quantTerminalFixtures.ts';

function equal(actual: unknown, expected: unknown, name: string) {
  if (actual !== expected) throw new Error(`${name}: expected ${String(expected)}, received ${String(actual)}`);
}

const emptyBase = {
  range: { start: '2026-08-02', end: '2026-08-08', labelKey: 'last7Days' },
  overview: {
    stage: 'S0',
    currentReading: null,
    comparison: { status: 'unavailable', direction: 'unknown' },
    primary: { kind: 'empty', title: { kind: 'i18n', key: 'dataStillAccumulating' }, body: { kind: 'i18n', key: 'stage3NoUsableObservation' }, confidence: 'low', sourceIds: [] },
    evidence: [],
    limitation: { kind: 'i18n', key: 'stage3NoMeasurementLimitation' },
    nextAction: { kind: 'i18n', key: 'recordBeforeAfterAction' },
  },
  trends: { stage: 'S0', status: 'insufficient', points: [], sampleCount: 0, activeDays: 0, baselineMinutes: null, currentMinutes: null, observedRangeMinutes: null, skillAllocation: [], limitation: { kind: 'i18n', key: 'trendNeedsComparableDays' } },
  patterns: { stage: 'S0', rows: [], counts: { accepted: 0, candidate: 0, archived: 0 } },
  advanced: { stage: 'S0', modes: [] },
} as V11InsightsPresentation;

const empty = buildQuantTerminalPresentation({
  now: new Date('2026-08-08T12:00:00+10:00'),
  base: emptyBase,
  liveLogs: [],
  stateCheckIns: [],
  patternMemory: [],
  objectiveContext: { status: 'empty', recoveryStatus: 'unknown', cognitiveLoadSuggestionKey: '', recommendedActionKey: '', avoidKeys: [], confidence: 'low', metrics: {} },
});

equal(empty.stage, 'S0', 'real empty data stays S0');
equal(empty.metrics[0]?.current, null, 'S0 does not invent a current reading');
equal(empty.metrics[0]?.baseline.status, 'unavailable', 'S0 baseline stays unavailable');
equal(empty.fixture, null, 'ordinary presentation is not fixture data');

const forming = getQuantTerminalFixture('forming');
equal(forming.fixture, 'forming', 'forming fixture is explicitly labelled');
equal(forming.stage, 'S1', 'forming fixture stays early');

const mature = getQuantTerminalFixture('mature');
equal(mature.stage, 'S3', 'mature QA fixture exercises S3');
equal(mature.metrics.length, 4, 'mature QA fixture covers multiple metrics');
equal(mature.signals[0]?.status, 'supported', 'mature QA fixture covers supported relation');
equal(mature.metrics[0]?.points.some((point) => point.value == null), true, 'mature QA fixture includes missing values');

