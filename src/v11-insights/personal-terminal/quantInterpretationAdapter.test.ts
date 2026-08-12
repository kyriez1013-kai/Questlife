import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Node's built-in TypeScript runner requires the extension; Expo typecheck does not.
// @ts-expect-error Test-only Node TypeScript entry.
import { adaptQuantInterpretationPayload } from './quantInterpretationAdapter.ts';
import type { QuantInterpretationScenarioId } from './personalTerminalPresentation';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), 'interpretation-fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtureDir, `${name}.json`), 'utf8'));
const scenarios: QuantInterpretationScenarioId[] = [
  'accumulated_load',
  'sleep_disruption',
  'conflicting',
  'exercise_branch',
  'rest_branch',
  'insufficient',
];

scenarios.forEach((scenario) => {
  const model = adaptQuantInterpretationPayload(load(scenario));
  assert.equal(model.dataMode, 'quant_interpretation_fixture');
  assert.equal(model.interpretationScenario, scenario);
  assert.equal(model.sourceMetadata?.syntheticOnly, true);
  assert.equal(model.sourceMetadata?.containsRealUserData, false);
  assert.equal(model.interpretation?.scenario_comparison.causal_effect_estimated, false);
  assert.equal(model.interpretation?.recovery_trajectory.forecast_allowed, false);
  assert.equal(model.interpretation?.decision_support.handoff_authority, 'today_decision');
  assert.equal(model.interpretation?.decision_support.automatic_execution, false);
  assert.equal(model.series.some((row) => row.constructKey === 'state.focus'), true);
  assert.equal(model.series.every((row) => row.events.every((event) => event.sourceIds.length > 0)), true);
});

const conflict = adaptQuantInterpretationPayload(load('conflicting'));
assert.deepEqual(
  conflict.interpretation?.driver_analysis.competing_candidate_ids,
  ['driver:sleep', 'driver:load'],
);
const insufficient = adaptQuantInterpretationPayload(load('insufficient'));
assert.equal(insufficient.interpretation?.driver_analysis.status, 'INSUFFICIENT');
assert.equal(insufficient.interpretation?.decision_support.leading_candidate_id, 'decision:gather-information');
assert.equal(insufficient.interpretation?.decision_support.next_useful_observation, 'observe:sleep.duration');
const exercise = adaptQuantInterpretationPayload(load('exercise_branch'));
assert.equal(exercise.series[0].events.length > 0, true);

const realData = load('conflicting');
realData.containsRealUserData = true;
assert.throws(() => adaptQuantInterpretationPayload(realData));

const fakeForecast = load('conflicting');
fakeForecast.interpretation.recovery_trajectory.forecast_allowed = true;
assert.throws(() => adaptQuantInterpretationPayload(fakeForecast));

console.log('Quant interpretation adapter tests passed');
