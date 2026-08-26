import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseQuantAnalysisExtensionV1,
  QUANT_ANALYSIS_CONTRACT_VERSION,
} from './quantAnalysisContract';
import {
  clearInsightsV3AnalysisCacheForTests,
  loadInsightsV3AnalysisExtension,
} from '../insights-v3/insightsV3AnalysisSource';

const fixtureRoot = resolve(process.cwd(), 'src/quant-product/fixtures');
const load = (name: string) => JSON.parse(readFileSync(resolve(fixtureRoot, `${name}.json`), 'utf8'));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

for (const name of [
  'analysis_extension_v1',
  'one_observation_analysis_v1',
  'forming_history_analysis_v1',
  'mature_market_analysis_v1',
]) {
  const result = parseQuantAnalysisExtensionV1(load(name));
  assert.equal(result.ok, true, `${name} must pass the Quant analysis runtime boundary`);
  if (result.ok) {
    assert.equal(result.extension.contract_version, QUANT_ANALYSIS_CONTRACT_VERSION);
    assert.equal(result.extension.synthetic_only, true);
    assert.equal(result.extension.contains_real_user_data, false);
    assert.ok(result.extension.limitation_codes.includes('NO_FORECAST_OUTPUT'));
    assert.ok(result.extension.limitation_codes.includes('RESEARCH_MODELS_EXCLUDED'));
  }
}

const base = load('analysis_extension_v1');

const missingEwmaBoundary = clone(base);
missingEwmaBoundary.indicator_series[0].limitation_codes = [];
assert.equal(parseQuantAnalysisExtensionV1(missingEwmaBoundary).ok, false);

const inconsistentDecomposition = clone(base);
const available = inconsistentDecomposition.joint_analyses.find((item: any) => item.status === 'AVAILABLE');
assert.ok(available);
available.residual_deviation += 1;
assert.equal(parseQuantAnalysisExtensionV1(inconsistentDecomposition).ok, false);

const futureLeakage = clone(base);
const leaked = futureLeakage.joint_analyses.find((item: any) => item.status === 'AVAILABLE');
assert.ok(leaked);
leaked.validation.future_leakage_check_passed = false;
assert.equal(parseQuantAnalysisExtensionV1(futureLeakage).ok, false);

const causalLeak = clone(base);
causalLeak.joint_analyses[0].drivers[0].limitation_codes = [];
assert.equal(parseQuantAnalysisExtensionV1(causalLeak).ok, false);

const unsafeProvenance = clone(base);
unsafeProvenance.synthetic_only = false;
unsafeProvenance.contains_real_user_data = false;
assert.equal(parseQuantAnalysisExtensionV1(unsafeProvenance).ok, false);

async function verifyLoaderBoundary() {
  clearInsightsV3AnalysisCacheForTests();
  const correct = await loadInsightsV3AnalysisExtension('drivers', base.base_bundle_id);
  assert.equal(correct.ok, true);

  const mismatch = await loadInsightsV3AnalysisExtension('drivers', 'product:different');
  assert.equal(mismatch.ok, false);
  if (mismatch.ok === false) assert.equal(mismatch.code, 'BASE_BUNDLE_MISMATCH');
}

verifyLoaderBoundary()
  .then(() => console.log('Quant analysis extension App boundary tests passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
