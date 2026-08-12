import { strict as assert } from 'node:assert';
import type {
  PersonalTerminalModel,
  PersonalTerminalSeries,
  PersonalTerminalSignal,
  PersonalTerminalViewData,
} from './personalTerminalPresentation';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { buildPersonalTerminalExplorationModel, highlightWindowForEvents, highlightWindowForSignal } from './personalTerminalExploration.ts';

const text = (value: string) => ({ kind: 'text' as const, text: value });

function series(id: string, constructKey: string): PersonalTerminalSeries {
  return {
    id,
    entityId: 'market:personal',
    label: text(id),
    unit: text('unit'),
    stage: 'S2',
    semantic: 'count',
    valueChangeMode: 'absolute',
    supportsCandle: false,
    observations: [
      { id: `${id}:1`, timestamp: '2026-08-01T09:00:00.000Z', value: 1, provenance: 'questlife_confirmed', sourceIds: [`${id}:source:1`] },
      { id: `${id}:2`, timestamp: '2026-08-03T09:00:00.000Z', value: 3, provenance: 'questlife_confirmed', sourceIds: [`${id}:source:2`] },
    ],
    load: [],
    events: [{
      id: `${id}:event:1`,
      timestamp: '2026-08-02T12:00:00.000Z',
      type: 'execution',
      category: 'execution',
      title: text('execution'),
      shortLabel: text('execution'),
      detail: text('confirmed execution'),
      provenance: 'questlife_confirmed',
      scopeId: null,
      sourceIds: [`${id}:event-source`],
    }],
    baseline: { status: 'provisional', value: 2, low: 1, high: 3, referenceKind: 'active' },
    limitation: text('observational only'),
    constructKey,
    coverage: {
      observedDays: 2,
      expectedDays: 4,
      coverageRatio: 0.5,
      firstAvailableAt: '2026-08-01T09:00:00.000Z',
      lastAvailableAt: '2026-08-03T09:00:00.000Z',
      sourceCount: 2,
    },
  };
}

const steps = series('steps', 'activity.steps');
const sleep = series('sleep', 'sleep.duration');
const unrelated = series('quality', 'execution.quality');
const signal: PersonalTerminalSignal = {
  id: 'steps-focus',
  status: 'candidate',
  title: text('steps and focus'),
  relationship: text('steps and focus co-occur'),
  observationCount: 6,
  counterexampleCount: 2,
  direction: 'higher',
  lagDays: 1,
  maturity: 'forming',
  windowDays: 7,
  sourceIds: ['signal:1'],
  limitation: text('not causal'),
  sourceConstruct: 'activity.steps',
  targetConstruct: 'state.focus',
  recentExamples: [{
    sourceObservationId: 'steps:1',
    sourceAt: '2026-08-01T09:00:00.000Z',
    sourceValue: 1,
    sourceUnit: 'count',
    targetObservationId: 'focus:1',
    targetAt: '2026-08-02T09:00:00.000Z',
    targetValue: 4,
    targetUnit: '/5',
  }],
};
const unrelatedSignal: PersonalTerminalSignal = { ...signal, id: 'sleep-quality', sourceConstruct: 'sleep.duration', targetConstruct: 'execution.quality' };
const model: PersonalTerminalModel = {
  fixture: null,
  dataMode: 'real',
  defaultScope: 'market',
  defaultEntityId: 'market:personal',
  defaultSeriesId: steps.id,
  entities: [{ id: 'market:personal', scope: 'market', label: text('market'), context: text('market'), seriesIds: [steps.id, sleep.id, unrelated.id] }],
  series: [steps, sleep, unrelated],
  signals: [unrelatedSignal, signal],
  implication: text('observe'),
  range: { start: '2026-08-01T09:00:00.000Z', end: '2026-08-03T09:00:00.000Z' },
};
const viewData: PersonalTerminalViewData = {
  timeframe: '7D',
  observations: steps.observations,
  line: steps.observations.map((row) => ({ time: row.timestamp, value: row.value, observationCount: 1, sourceIds: row.sourceIds, provenance: row.provenance })),
  candles: [],
  incompleteCandles: [],
  load: [],
  emaShort: [],
  emaLong: [],
};

const exploration = buildPersonalTerminalExplorationModel({
  comparisonSeries: [steps, sleep],
  model,
  series: steps,
  viewData,
});
assert.equal(exploration.primarySignal?.id, signal.id);
assert.equal(exploration.relatedSeries?.id, sleep.id);
assert.equal(exploration.events.length, 1);
assert.equal(exploration.evidence.observationCount, 2);
assert.equal(exploration.evidence.independentDayCount, 2);
assert.equal(exploration.evidence.missingDayCount, 2);
assert.equal(exploration.analystModules.find((row) => row.id === 'related')?.action, 'compare');
assert.equal(exploration.analystModules.find((row) => row.id === 'signal')?.targetId, signal.id);

assert.deepEqual(highlightWindowForEvents(steps.events), {
  kind: 'event',
  start: '2026-08-02T12:00:00.000Z',
  end: '2026-08-02T12:00:00.000Z',
  sourceIds: ['steps:event-source'],
});
assert.deepEqual(highlightWindowForSignal(signal), {
  kind: 'signal',
  start: '2026-08-01T09:00:00.000Z',
  end: '2026-08-02T09:00:00.000Z',
  sourceIds: ['steps:1', 'focus:1'],
});
assert.equal(highlightWindowForSignal({ ...signal, recentExamples: [] }), null);

console.log('personalTerminalExploration tests passed');
