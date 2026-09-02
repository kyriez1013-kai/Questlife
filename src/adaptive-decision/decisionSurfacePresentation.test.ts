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
  assert.ok(presentation.contextItems.length >= 3 && presentation.contextItems.length <= 4, `${scenario}: compact context`);
  assert.ok(presentation.primaryAction, `${scenario}: one primary action`);
  assert.ok(presentation.alternatives.length <= 2, `${scenario}: at most two alternatives`);
  assert.ok(presentation.primaryAction!.planChanges.length >= 1, `${scenario}: exact plan effect is visible`);
  assert.ok(presentation.primaryAction!.reasonLines.length >= 2 && presentation.primaryAction!.reasonLines.length <= 3, `${scenario}: concise evidence`);
  assert.ok(presentation.evidenceGroups.length >= 2, `${scenario}: full evidence remains available`);
});

console.log('adaptive decision surface presentation: passed');
