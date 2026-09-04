import assert from 'node:assert/strict';
import { beginDecisionEpisode, proposeDecisionEpisode } from './decisionEngine';
import { createAdaptiveDecisionDemoFixture, type AdaptiveDecisionDemoScenarioId } from './demoFixtures';
import { buildDecisionSurfacePresentation } from './decisionSurfacePresentation';

const scenarios: AdaptiveDecisionDemoScenarioId[] = ['training', 'cognitive', 'overloaded'];

scenarios.forEach((scenario) => {
  const fixture = createAdaptiveDecisionDemoFixture(scenario, 'en');
  const draft = beginDecisionEpisode({
    id: `surface-presentation-${scenario}`,
    questionType: fixture.questionType,
    questionText: fixture.questionText,
    subjectKind: 'demo',
    now: fixture.now,
    timezone: fixture.timezone,
    observationWindowStart: fixture.observationWindowStart,
  });
  const episode = proposeDecisionEpisode({
    episode: draft,
    data: fixture.data,
    answers: fixture.initialAnswers,
    quantProduct: fixture.quantProduct,
    quantAnalysis: fixture.quantAnalysis,
    now: fixture.now,
  });
  assert.equal(episode.status, 'PROPOSED', `${scenario}: fixture resolves without a wizard`);

  const presentation = buildDecisionSurfacePresentation({
    episode,
    scheduleBlocks: fixture.data.scheduleBlocks,
    lang: 'en',
  });

  assert.equal(presentation.question, fixture.questionText, `${scenario}: question is the title`);
  assert.ok(presentation.contextItems.length >= 1 && presentation.contextItems.length <= 4, `${scenario}: compact context`);
  assert.ok(presentation.primaryAction, `${scenario}: one primary action`);
  assert.ok(presentation.alternatives.length <= 2, `${scenario}: at most two alternatives`);
  assert.ok(presentation.primaryAction!.planChanges.length >= 1, `${scenario}: exact plan effect is visible`);
  assert.ok(presentation.primaryAction!.reasonLines.length >= 1 && presentation.primaryAction!.reasonLines.length <= 2, `${scenario}: concise evidence`);
  assert.ok(presentation.evidenceSummary.length > 0, `${scenario}: practical evidence state is present`);
  assert.ok(presentation.evidenceGroups.length >= 2, `${scenario}: full evidence remains available`);
  assert.equal(/\b[ABCDE]\b/.test(presentation.evidenceSummary), false, `${scenario}: no internal evidence code in summary`);
  assert.equal(presentation.contextItems.some((item) => item.value === 'first'), false, `${scenario}: no raw priority enum`);
  if (presentation.primaryAction!.planChanges.some((change) => (
    change.kind === 'update' && change.before !== change.after
  ))) {
    assert.ok(presentation.primaryAction!.basisNote, `${scenario}: deterministic duration change explains its basis`);
  }
  presentation.primaryAction!.planChanges.forEach((change) => {
    assert.equal(change.before.includes('2025-'), false, `${scenario}: current-day changes use a human date label`);
    assert.equal(change.after.includes('2025-05-03'), false, `${scenario}: next-day changes use a human date label`);
  });
});

console.log('adaptive decision surface presentation: passed');
