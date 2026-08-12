import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error Test-only Node TypeScript entry.
import { adaptQuantInterpretationPayload } from './quantInterpretationAdapter.ts';
// @ts-expect-error Test-only Node TypeScript entry.
import { buildDecisionPresentation, buildDriverTimeline, buildHistoricalActionEvents, buildInterpretationOperatorOptions, buildScenarioComparisonPresentation, similarPeriodOutcome } from './quantInterpretationPresentation.ts';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), 'interpretation-fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtureDir, `${name}.json`), 'utf8'));

const exercise = adaptQuantInterpretationPayload(load('exercise_branch'));
const bundle = exercise.interpretation!;
const timeline = buildDriverTimeline(bundle, exercise.series);
assert.equal(timeline.lanes[0]?.construct, bundle.driver_analysis.context.target_construct);
assert.equal(timeline.lanes.every((lane) => lane.points.length === 8), true);
assert.equal(timeline.lanes.flatMap((lane) => lane.points).every((point) => point.timestamp == null || point.timestamp <= bundle.driver_analysis.context.as_of), true);
assert.deepEqual(
  buildDriverTimeline(bundle, exercise.series).lanes,
  timeline.lanes,
  'timeline presentation must be deterministic',
);

const scenarios = buildScenarioComparisonPresentation(bundle);
assert.deepEqual(scenarios.map((row) => row.actionKey), ['normal_training', 'lower_intensity_activity', 'recovery_rest']);
assert.equal(scenarios[0].evidenceState, 'observed');
assert.equal(scenarios[1].evidenceState, 'insufficient');
assert.equal(scenarios[1].comparableCount, null, 'missing branch must remain missing rather than become a zero observation');
assert.equal(bundle.scenario_comparison.causal_effect_estimated, false);

const similar = bundle.similar_periods.periods[0];
assert.ok(similar);
assert.equal(similar.period_id.includes(bundle.driver_analysis.context.window_start), false, 'current window must not be presented as its own analogue');
assert.equal(similarPeriodOutcome(similar).observationCount, similar.subsequent_trajectory.length);

const decision = buildDecisionPresentation(bundle);
assert.equal(decision.abstains, false);
assert.equal(decision.leading?.action_key, 'normal_training');

const insufficient = adaptQuantInterpretationPayload(load('insufficient')).interpretation!;
assert.equal(buildDecisionPresentation(insufficient).abstains, true);
assert.equal(buildDecisionPresentation(insufficient).leading, null);

const actions = buildInterpretationOperatorOptions(bundle);
assert.equal(actions.find((row) => row.id === 'show_recovery')?.enabled, true);
assert.equal(actions.find((row) => row.id === 'find_similar')?.enabled, true);

const events = buildHistoricalActionEvents(bundle);
assert.equal(events.length > 0, true);
assert.equal(new Set(events.map((event) => event.id)).size, events.length);
assert.equal(events.every((event) => event.sourceIds.length > 0), true);

console.log('Quant interpretation presentation tests passed');
