import assert from 'node:assert/strict';
import {
  answerDecisionSurfaceQuestion,
  applyDecisionSurface,
  canApplyDecisionSurface,
  createDecisionSurfaceSession,
  selectDecisionSurfaceAction,
  undoDecisionSurface,
} from './decisionSurfaceFlow';

const mature = createDecisionSurfaceSession({ scenario: 'training', lang: 'en' });
assert.equal(mature.episode.status, 'PROPOSED', 'mature context opens directly on a recommendation');
assert.equal(mature.activeActionId, mature.episode.candidateActions[0]?.id, 'primary recommendation is selected for presentation');
assert.equal(canApplyDecisionSurface(mature), true, 'primary recommendation is one-tap applicable');

const missing = createDecisionSurfaceSession({
  scenario: 'training',
  lang: 'en',
  options: { missingCurrentState: true },
});
assert.equal(missing.episode.status, 'NEEDS_INPUT', 'one genuinely material missing fact stays inline');
assert.equal(missing.episode.missingContext.length, 1, 'only the material state question is shown');
const answered = answerDecisionSurfaceQuestion(missing, missing.episode.missingContext[0].id, '2');
assert.equal(answered.episode.status, 'PROPOSED', 'answer immediately refreshes the same decision surface');

const alternativeId = mature.episode.candidateActions[1].id;
const alternative = selectDecisionSurfaceAction(mature, alternativeId);
assert.equal(alternative.activeActionId, alternativeId, 'alternative updates the active recommendation');
assert.notDeepEqual(
  alternative.episode.candidateActions[0].planPatch.afterSnapshot,
  alternative.episode.candidateActions[1].planPatch.afterSnapshot,
  'alternative has a materially different plan patch',
);

const before = mature.scheduleBlocks.map((block) => ({ ...block }));
const applied = applyDecisionSurface(mature);
assert.equal(applied.episode.status, 'APPLIED', 'one Apply action accepts and applies the exact patch');
assert.notDeepEqual(applied.scheduleBlocks, before, 'Apply mutates the isolated demo schedule');
const undone = undoDecisionSurface(applied);
assert.equal(undone.episode.status, 'PROPOSED', 'Undo returns to the recommendation surface');
assert.deepEqual(undone.scheduleBlocks, before, 'Undo restores the exact schedule snapshot');

const safety = createDecisionSurfaceSession({
  scenario: 'training',
  lang: 'en',
  options: { safety: true },
});
assert.equal(safety.episode.status, 'ABSTAINED', 'safety-sensitive wording uses the existing safety gate');
assert.equal(canApplyDecisionSurface(safety), false, 'ordinary optimization has no Apply action');
assert.deepEqual(applyDecisionSurface(safety).scheduleBlocks, safety.scheduleBlocks, 'safety state never mutates the plan');

const sparse = createDecisionSurfaceSession({
  scenario: 'training',
  lang: 'en',
  options: { sparse: true },
});
assert.equal(sparse.episode.status, 'PROPOSED', 'sparse context remains useful through current state and constraints');
assert.equal(sparse.episode.evidencePacket?.eligibility, 'limited', 'sparse evidence remains explicitly limited');
assert.ok(sparse.episode.evidencePacket?.items.some((item) => item.category === 'unknown'), 'sparse state exposes unknowns');

console.log('adaptive decision surface flow: passed');
