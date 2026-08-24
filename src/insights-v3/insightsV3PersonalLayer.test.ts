import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseQuantProductBundleV1 } from '../quant-product/quantProductContract';
import {
  buildCompactCue,
  buildInsightsV3Consumer,
  buildPersonalContext,
  driverRelationshipCopy,
  selectDefaultInstrumentId,
} from './insightsV3Presentation';

const fixtureRoot = resolve(process.cwd(), 'src/quant-product/fixtures');

function load(name: string) {
  const raw = JSON.parse(readFileSync(resolve(fixtureRoot, `${name}.json`), 'utf8'));
  const parsed = parseQuantProductBundleV1(raw);
  assert.equal(parsed.ok, true, `${name} must pass the Product Contract`);
  if (!parsed.ok) throw new Error(`${name} failed Product Contract validation`);
  return parsed.bundle;
}

function selectedInstrument(name: string) {
  const bundle = load(name);
  const model = buildInsightsV3Consumer(bundle);
  const selectedId = selectDefaultInstrumentId(model);
  assert.ok(selectedId);
  const instrument = model.instruments.find((row) => row.id === selectedId);
  assert.ok(instrument);
  return { bundle, instrument: instrument! };
}

const sparse = selectedInstrument('one_observation_full');
const sparseContextZh = buildPersonalContext('zh', sparse.instrument);
assert.notEqual(sparseContextZh.currentValue, '—');
assert.equal(sparseContextZh.referenceValue, '参考尚未形成');
assert.equal(sparseContextZh.changeValue, '暂无可比变化');
assert.match(sparseContextZh.evidenceValue, /1 条观察/);
assert.equal(sparseContextZh.relationship, 'reference_forming');

const mature = selectedInstrument('mature_market_full');
const matureContextEn = buildPersonalContext('en', mature.instrument);
assert.notEqual(matureContextEn.currentValue, '—');
assert.notEqual(matureContextEn.referenceValue, 'Reference not formed');
assert.match(matureContextEn.evidenceValue, /observations/);
assert.match(matureContextEn.summary, /recent personal reference/i);

const driver = selectedInstrument('driver_analysis_full');
const driverCueZh = buildCompactCue('zh', driver.bundle, driver.instrument);
const driverCueEn = buildCompactCue('en', driver.bundle, driver.instrument);
assert.equal(driverCueZh.boundary, 'inference');
assert.equal(driverCueZh.action, 'drivers');
assert.match(driverCueZh.text, /同时出现/);
assert.match(driverCueZh.evidence, /94 次符合 · 23 次反例/);
assert.match(driverCueEn.text, /appears alongside/i);
assert.match(driverCueEn.evidence, /94 supporting observations · 23 counterexamples/);

const mixedCandidate = driver.bundle.interpretation?.driver_analysis?.candidates[2];
assert.ok(mixedCandidate);
assert.match(driverRelationshipCopy('zh', mixedCandidate!), /反例/);
assert.match(driverRelationshipCopy('en', mixedCandidate!), /still being observed/i);

const similar = selectedInstrument('similar_periods_full');
assert.ok(similar.bundle.interpretation);
const similarOnlyBundle = {
  ...similar.bundle,
  interpretation: { ...similar.bundle.interpretation!, driver_analysis: null },
};
const similarCue = buildCompactCue('en', similarOnlyBundle, similar.instrument);
assert.equal(similarCue.action, 'similar');
assert.match(similarCue.text, /historical periods resemble/i);
assert.match(similarCue.detail || '', /does not imply/i);

const noInterpretationCue = buildCompactCue('en', mature.bundle, mature.instrument);
assert.equal(noInterpretationCue.action, 'evidence');
assert.match(noInterpretationCue.detail || '', /not enough evidence/i);

for (const cue of [driverCueEn, similarCue, noInterpretationCue]) {
  const productText = [cue.text, cue.detail, cue.evidence].filter(Boolean).join(' ');
  assert.doesNotMatch(productText, /will improve|will recover|causes|should rest|should exercise|recommend/i);
  assert.doesNotMatch(productText, /\byour\b/i, 'Synthetic review evidence must not be presented as owner-specific intelligence');
}
assert.doesNotMatch([driverCueZh.text, driverCueZh.detail, driverCueZh.evidence].filter(Boolean).join(' '), /导致|应该|建议|将会/);
assert.doesNotMatch([driverCueZh.text, driverCueZh.detail, driverCueZh.evidence].filter(Boolean).join(' '), /你的/);

console.log('Insights V3 personal intelligence layer tests passed');
