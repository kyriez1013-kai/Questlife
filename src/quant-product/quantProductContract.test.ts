import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Node's built-in TypeScript runner requires the extension; Expo does not.
// @ts-expect-error Test-only TypeScript entry.
import { parseQuantProductBundleV1, QUANT_PRODUCT_CONTRACT_VERSION, QUANT_PRODUCT_SCHEMA_HASH } from './quantProductContract.ts';
// @ts-expect-error Test-only TypeScript entry.
import { adaptQuantProductBundleV1, buildTodayQuantProductSurface, selectQuantProductInstrument, selectQuantProductRange } from './quantProductV1Adapter.ts';

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtureRoot, `${name}.json`), 'utf8'));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const manifest = load('manifest');
assert.equal(manifest.contractVersion, QUANT_PRODUCT_CONTRACT_VERSION);
assert.equal(manifest.contractSchemaHash, QUANT_PRODUCT_SCHEMA_HASH);
assert.equal(manifest.syntheticOnly, true);
assert.equal(manifest.containsRealUserData, false);

for (const name of manifest.fixtures) {
  const parsed = parseQuantProductBundleV1(load(name));
  assert.equal(parsed.ok, true, `${name} must pass the ProductBundle runtime boundary`);
}

const noData = parseQuantProductBundleV1(load('no_data_compact'));
assert.equal(noData.ok, true);
if (noData.ok) {
  assert.equal(noData.bundle.metadata.mode, 'COMPACT');
  assert.deepEqual(noData.bundle.instruments, []);
  assert.deepEqual(noData.bundle.series, []);
}

const forming = parseQuantProductBundleV1(load('forming_history_full'));
assert.equal(forming.ok, true);
if (!forming.ok) throw new Error('forming fixture failed');
const formingInstrument = forming.bundle.instruments[0];
assert.equal(formingInstrument.scale, 'ORDINAL');
assert.notEqual(formingInstrument.change.kind, 'RELATIVE');
const consumer = adaptQuantProductBundleV1(forming.bundle);
const selected = selectQuantProductInstrument(consumer, formingInstrument.instrument_id);
assert.ok(selected);
assert.equal(selected!.latest, formingInstrument.latest);
assert.equal(selected!.reference, formingInstrument.reference);
assert.equal(selected!.change, formingInstrument.change);
assert.equal(selected!.evidence, formingInstrument.evidence);
assert.equal(selected!.series[0], forming.bundle.series[0]);
assert.ok(selectQuantProductRange(selected!, selected!.series[0].default_range_key!));
assert.equal(buildTodayQuantProductSurface(forming.bundle).todayCommandAuthority, 'existing_today_command');

const goal = parseQuantProductBundleV1(load('goal_full'));
const skill = parseQuantProductBundleV1(load('skill_full'));
assert.equal(goal.ok && goal.bundle.instruments.length, 1);
assert.equal(skill.ok && skill.bundle.instruments.length, 1);
if (goal.ok) assert.equal(goal.bundle.goal_surfaces[0].scope, 'GOAL');
if (skill.ok) {
  assert.equal(skill.bundle.skill_surfaces[0].scope, 'SKILL');
  assert.ok(skill.bundle.skill_surfaces[0].limitation_codes.includes('NO_MASTERY_OR_PROGRESS_PERCENT_INFERRED'));
}

const missingVersion = clone(load('no_data_compact'));
delete missingVersion.metadata.contract_version;
const missingVersionResult = parseQuantProductBundleV1(missingVersion);
assert.equal(missingVersionResult.ok, false);
if (!missingVersionResult.ok) assert.equal(missingVersionResult.code, 'MISSING_CONTRACT_VERSION');

const futureVersion = clone(load('no_data_compact'));
futureVersion.metadata.contract_version = 'questlife.quant.product.v2';
const futureVersionResult = parseQuantProductBundleV1(futureVersion);
assert.equal(futureVersionResult.ok, false);
if (!futureVersionResult.ok) assert.equal(futureVersionResult.code, 'UNSUPPORTED_CONTRACT_VERSION');

const schemaMismatch = clone(load('no_data_compact'));
schemaMismatch.metadata.contract_schema_hash = 'different';
const schemaMismatchResult = parseQuantProductBundleV1(schemaMismatch);
assert.equal(schemaMismatchResult.ok, false);
if (!schemaMismatchResult.ok) assert.equal(schemaMismatchResult.code, 'SCHEMA_HASH_MISMATCH');

const malformedInstrument = clone(load('one_observation_full'));
delete malformedInstrument.instruments[0].instrument_id;
assert.equal(parseQuantProductBundleV1(malformedInstrument).ok, false);

const invalidScale = clone(load('one_observation_full'));
invalidScale.instruments[0].scale = 'PERCENT_OF_LIFE';
assert.equal(parseQuantProductBundleV1(invalidScale).ok, false);

const researchLeak = clone(load('one_observation_full'));
researchLeak.metadata.eligibility = 'RESEARCH_ONLY';
assert.equal(parseQuantProductBundleV1(researchLeak).ok, false);

const futureObservation = clone(load('one_observation_full'));
futureObservation.series[0].points[0].observed_at = '2099-01-01T00:00:00+00:00';
assert.equal(parseQuantProductBundleV1(futureObservation).ok, false);

const futureCompactObservation = clone(load('mature_market_compact'));
futureCompactObservation.instruments[0].latest.observed_at = '2099-01-01T00:00:00+00:00';
assert.equal(parseQuantProductBundleV1(futureCompactObservation).ok, false);

const inconsistentStaleness = clone(load('one_observation_full'));
inconsistentStaleness.metadata.staleness.state = 'STALE';
assert.equal(parseQuantProductBundleV1(inconsistentStaleness).ok, false);

const duplicateInstrument = clone(load('driver_analysis_full'));
duplicateInstrument.instruments.push(clone(duplicateInstrument.instruments[0]));
assert.equal(parseQuantProductBundleV1(duplicateInstrument).ok, false);

const illegalCandle = clone(load('forming_history_full'));
const candleKey = Object.keys(illegalCandle.series[0].candles)[0];
illegalCandle.series[0].candles[candleKey][0].high = -999;
assert.equal(parseQuantProductBundleV1(illegalCandle).ok, false);

const unsupportedChart = clone(load('forming_history_full'));
unsupportedChart.series[0].supported_chart_types.push('HEATMAP_OF_DESTINY');
assert.equal(parseQuantProductBundleV1(unsupportedChart).ok, false);

const malformedInterpretation = clone(load('driver_analysis_full'));
malformedInterpretation.interpretation.driver_analysis.candidates[0].rank = 0;
const malformedInterpretationResult = parseQuantProductBundleV1(malformedInterpretation);
assert.equal(malformedInterpretationResult.ok, true);
if (malformedInterpretationResult.ok) {
  assert.equal(malformedInterpretationResult.bundle.interpretation, null);
  assert.deepEqual(malformedInterpretationResult.warnings, ['OPTIONAL_INTERPRETATION_REJECTED']);
}

const causalScenario = clone(load('driver_analysis_full'));
causalScenario.interpretation.scenario.claim_type = 'causal';
const causalScenarioResult = parseQuantProductBundleV1(causalScenario);
assert.equal(causalScenarioResult.ok, true);
if (causalScenarioResult.ok) {
  assert.equal(causalScenarioResult.bundle.interpretation, null);
  assert.deepEqual(causalScenarioResult.warnings, ['OPTIONAL_INTERPRETATION_REJECTED']);
}

console.log('Quant Product V1 App consumer tests passed');
