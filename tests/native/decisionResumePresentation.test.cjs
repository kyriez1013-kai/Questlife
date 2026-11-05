const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const { createDecisionEpisode } = require('../../src/adaptive-decision/decisionEpisode.ts');
const { createDecisionPlanPatch } = require('../../src/adaptive-decision/planPatch.ts');
const { buildDecisionSurfacePresentation } = require('../../src/adaptive-decision/decisionSurfacePresentation.ts');
const { candidateCopy } = require('../../src/adaptive-decision/presentation.ts');
function fixture(timezone, asOf, date) {
  const block = { id: 'TEST_BLOCK', title: 'TEST', date, startTime: '20:00', endTime: '21:00', plannedMinutes: 60, taskType: 'deep_study', flexibility: 'movable', status: 'planned' };
  const episode = createDecisionEpisode({ id: 'TEST_EPISODE', questionType: 'custom', questionText: 'state_layer', subjectKind: 'owner', now: asOf, timezone, observationWindowStart: asOf });
  episode.status = 'PROPOSED';
  episode.candidateActions = [{ id: 'state-layer-plan', kind: 'move', titleKey: 'stateLayerPlanTitle', descriptionKey: 'stateLayerPlanDescription', exactEffectKey: 'stateLayerPlanEffect', protectsKey: 'stateLayerPlanProtects', feasibilityKey: 'stateLayerPlanFeasible', uncertaintyKey: 'stateLayerPlanUncertainty', reversible: true, outcomeHorizon: 'two_hours', outcomeFields: ['state'], evidenceItemIds: [], constraintIds: [], policyTrace: [],
    planPatch: createDecisionPlanPatch({ id: 'TEST_PATCH', date, generatedAt: asOf, before: [block], after: [{ ...block, startTime: '21:00', endTime: '22:00' }] }) }];
  return { episode, scheduleBlocks: [block] };
}
for (const lang of ['zh', 'en']) test(`resumed state-layer decision uses user-facing ${lang} text`, () => {
  const input = fixture('Australia/Sydney', '2026-11-04T22:00:00Z', '2026-11-05');
  const view = buildDecisionSurfacePresentation({ ...input, lang });
  assert.doesNotMatch(view.question, /state_layer/);
  for (const text of Object.values(candidateCopy(lang, input.episode.candidateActions[0]))) {
    assert.ok(text.length > 0); assert.doesNotMatch(text, /stateLayerPlan/);
  }
  input.episode.candidateActions[0].id = 'custom-user-action';
  assert.equal(buildDecisionSurfacePresentation({ ...input, lang }).question, 'state_layer', 'arbitrary user question is not rewritten');
});
for (const [timezone, asOf, date] of [
  ['Australia/Sydney', '2026-11-04T22:00:00Z', '2026-11-05'],
  ['America/Los_Angeles', '2026-11-05T02:00:00Z', '2026-11-04'],
]) test(`current day labels follow episode timezone ${timezone}, not UTC`, () => {
  const view = buildDecisionSurfacePresentation({ ...fixture(timezone, asOf, date), lang: 'en' });
  assert.match(view.primaryAction.planChanges[0].before, /^Today/);
  assert.match(view.primaryAction.planChanges[0].after, /^Today/);
});
test('tomorrow label uses calendar-day difference across daylight saving', () => {
  const previous = process.env.TZ; process.env.TZ = 'America/Los_Angeles';
  try {
    const input = fixture('America/Los_Angeles', '2026-03-07T20:00:00Z', '2026-03-08');
    const view = buildDecisionSurfacePresentation({ ...input, lang: 'en' });
    assert.match(view.primaryAction.planChanges[0].before, /^Tomorrow/);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
