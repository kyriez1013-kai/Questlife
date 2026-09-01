import assert from 'node:assert/strict';
import driverBundle from '../quant-product/fixtures/driver_analysis_full.json';
import analysisExtension from '../quant-product/fixtures/analysis_extension_v1.json';
import researchFilteredBundle from '../quant-product/fixtures/research_filtered_compact.json';
import { buildDecisionEvidence } from './evidenceAdapter';
import type { DecisionContextSnapshotV1 } from './decisionEpisode';

const AS_OF = '2025-05-01T23:59:00+00:00';
const context: DecisionContextSnapshotV1 = {
  assembledAt: AS_OF,
  asOf: AS_OF,
  facts: [{
    id: 'fact-state',
    kind: 'state',
    label: 'current_state',
    value: 2,
    unit: '/5',
    sourceIds: ['state-1'],
    observedAt: '2025-05-01T18:00:00+00:00',
  }],
  currentState: {
    overall: 2,
    focus: 2,
    observedAt: '2025-05-01T18:00:00+00:00',
    sourceId: 'state-1',
  },
  sleepMinutes: {
    value: 345,
    observedAt: '2025-05-01T06:00:00+00:00',
    sourceId: 'sleep-1',
  },
  recentExecution: { count: 3, totalMinutes: 150, averageQuality: 3, sourceIds: ['exec-1', 'exec-2', 'exec-3'] },
  schedule: {
    date: '2025-05-01',
    blocks: [],
    fixedCount: 0,
    flexibleCount: 0,
    remainingPlannedMinutes: 0,
    openWindows: [],
  },
  sourceRefs: [],
  missingness: [],
  limitations: [],
};

const demo = buildDecisionEvidence({
  questionType: 'cognitive_adjustment',
  context,
  asOf: AS_OF,
  mode: 'demo',
  quantProduct: driverBundle,
  quantAnalysis: analysisExtension,
});

assert.deepEqual(demo.parseIssues, []);
assert.equal(demo.packet.target, 'market:state.focus');
assert.equal(demo.packet.eligibility, 'eligible');
assert.ok(demo.packet.personalReference);
assert.ok(demo.packet.ewma?.short != null);
assert.ok(demo.packet.ewma?.long != null);
assert.ok(demo.packet.jointModel);
assert.equal(
  Number((demo.packet.jointModel!.modelAssociated + demo.packet.jointModel!.unexplainedResidual).toFixed(8)),
  Number(demo.packet.jointModel!.observedDeviation.toFixed(8)),
);
assert.ok(demo.packet.jointModel!.drivers.some((driver) => driver.lagPeriods > 0));
assert.ok(demo.packet.similarPeriods.length > 0);
assert.ok(demo.packet.recovery);
assert.ok(demo.packet.scenarioBranches.length > 0);
assert.ok(demo.packet.items.some((item) => item.counterexampleCount && item.counterexampleCount > 0));
assert.ok(demo.packet.limitations.includes('OBSERVATIONAL_NOT_CAUSAL'));
assert.ok(demo.packet.sourceArtifactIds.includes('analysis:254d4a55c38f9df6de63'));

const owner = buildDecisionEvidence({
  questionType: 'cognitive_adjustment',
  context,
  asOf: AS_OF,
  mode: 'owner',
  quantProduct: driverBundle,
  quantAnalysis: analysisExtension,
});
assert.equal(owner.packet.eligibility, 'limited');
assert.ok(owner.parseIssues.includes('SYNTHETIC_QUANT_EXCLUDED_FROM_OWNER_MODE'));
assert.ok(owner.parseIssues.includes('SYNTHETIC_ANALYSIS_EXCLUDED_FROM_OWNER_MODE'));
assert.equal(owner.packet.jointModel, undefined);

const future = buildDecisionEvidence({
  questionType: 'cognitive_adjustment',
  context,
  asOf: '2025-04-01T23:59:00+00:00',
  mode: 'demo',
  quantProduct: driverBundle,
  quantAnalysis: analysisExtension,
});
assert.ok(future.parseIssues.includes('QUANT_ARTIFACT_AFTER_DECISION_AS_OF'));
assert.ok(future.parseIssues.includes('QUANT_ANALYSIS_AFTER_DECISION_AS_OF'));

const researchFiltered = buildDecisionEvidence({
  questionType: 'training_recovery',
  context,
  asOf: '2026-07-01T07:59:00+10:00',
  mode: 'demo',
  quantProduct: researchFilteredBundle,
});
assert.ok(researchFiltered.packet.limitations.includes('NO_ADVANCED_RESEARCH_ARTIFACTS'));
assert.equal(researchFiltered.packet.jointModel, undefined);

console.log('adaptive decision Quant evidence adapter: passed');
