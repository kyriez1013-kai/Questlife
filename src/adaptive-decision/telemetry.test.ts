import assert from 'node:assert/strict';
import {
  clearAdaptiveDecisionTelemetry,
  getAdaptiveDecisionTelemetry,
  recordAdaptiveDecisionTelemetry,
} from './telemetry';

const values = new Map<string, string>();
const sessionStorage = {
  getItem(key: string) {
    return values.get(key) ?? null;
  },
  removeItem(key: string) {
    values.delete(key);
  },
  setItem(key: string, value: string) {
    values.set(key, value);
  },
};

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { sessionStorage },
});

clearAdaptiveDecisionTelemetry();
recordAdaptiveDecisionTelemetry({
  name: 'decision_proposals_ready',
  fixtureOnly: false,
  questionType: 'training_recovery',
  contextFactCount: 4,
  missingQuestionCount: 1,
  proposalCount: 2,
  operationCount: 1,
  elapsedMs: 12,
  quantLatencyMs: 8,
  totalDecisionLatencyMs: 12,
  planMutationLatencyMs: 2,
  usefulness: 'helpful',
  rawQuestion: 'private owner question',
  note: 'private note',
} as never);

const events = getAdaptiveDecisionTelemetry();
assert.equal(events.length, 1);
assert.deepEqual(Object.keys(events[0]).sort(), [
  'at',
  'contextFactCount',
  'elapsedMs',
  'fixtureOnly',
  'missingQuestionCount',
  'name',
  'operationCount',
  'planMutationLatencyMs',
  'proposalCount',
  'quantLatencyMs',
  'questionType',
  'totalDecisionLatencyMs',
  'usefulness',
]);
assert.equal(JSON.stringify(events).includes('private owner question'), false);
assert.equal(JSON.stringify(events).includes('private note'), false);

clearAdaptiveDecisionTelemetry();
assert.equal(getAdaptiveDecisionTelemetry().length, 0);

console.log('adaptive decision telemetry privacy: passed');
