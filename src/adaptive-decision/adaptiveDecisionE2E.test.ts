import assert from 'node:assert/strict';
import {
  applyAcceptedDecision,
  beginDecisionEpisode,
  decisionEpisodeToResult,
  proposeDecisionEpisode,
  selectDecisionAction,
} from './decisionEngine';
import { createAdaptiveDecisionDemoFixture, type AdaptiveDecisionDemoScenarioId } from './demoFixtures';
import { markDecisionFollowUpDue, recordDecisionOutcome } from './followUp';

const scenarios: AdaptiveDecisionDemoScenarioId[] = ['training', 'cognitive', 'overloaded'];

scenarios.forEach((scenario) => {
  const fixture = createAdaptiveDecisionDemoFixture(scenario, 'en');
  const draft = beginDecisionEpisode({
    id: `e2e-${scenario}`,
    questionType: fixture.questionType,
    questionText: fixture.questionText,
    subjectKind: 'demo',
    now: fixture.now,
    timezone: fixture.timezone,
    observationWindowStart: fixture.observationWindowStart,
  });
  let proposed = proposeDecisionEpisode({
    episode: draft,
    data: fixture.data,
    quantProduct: fixture.quantProduct,
    quantAnalysis: fixture.quantAnalysis,
    now: fixture.now,
  });
  if (proposed.status === 'NEEDS_INPUT') {
    assert.ok(proposed.missingContext.length > 0 && proposed.missingContext.length <= 2, `${scenario}: material question limit`);
    const answers = Object.fromEntries(proposed.missingContext.map((question) => [
      question.id,
      question.options?.[0]?.value ?? 'unknown',
    ]));
    proposed = proposeDecisionEpisode({
      episode: proposed,
      data: fixture.data,
      answers,
      quantProduct: fixture.quantProduct,
      quantAnalysis: fixture.quantAnalysis,
      now: fixture.now,
    });
  }
  assert.equal(proposed.status, 'PROPOSED', `${scenario}: proposal`);
  assert.equal(proposed.missingContext.length, 0, `${scenario}: context auto-assembled`);
  assert.ok(proposed.contextSnapshot && proposed.contextSnapshot.facts.length >= 4, `${scenario}: context facts`);
  assert.ok(proposed.candidateActions.length >= 1 && proposed.candidateActions.length <= 3, `${scenario}: proposal count`);
  assert.ok(proposed.evidencePacket?.jointModel, `${scenario}: multivariate evidence`);
  if (scenario === 'cognitive') {
    assert.ok(proposed.evidencePacket?.similarPeriods.length, `${scenario}: target-matched similar periods`);
  } else {
    assert.ok(
      proposed.evidencePacket?.missingness.includes('SIMILAR_PERIODS_UNAVAILABLE'),
      `${scenario}: unrelated similar periods are not reused`,
    );
  }
  assert.ok(proposed.evidencePacket?.items.some((item) => item.category === 'unknown'), `${scenario}: unknowns`);

  const selected = selectDecisionAction(proposed, proposed.candidateActions[0].id, fixture.now);
  const before = fixture.data.scheduleBlocks.map((block) => ({ ...block }));
  assert.deepEqual(fixture.data.scheduleBlocks, before, `${scenario}: preview does not mutate`);
  const applied = applyAcceptedDecision({ episode: selected, scheduleBlocks: fixture.data.scheduleBlocks, appliedAt: fixture.now });
  assert.equal(applied.episode.status, 'APPLIED', `${scenario}: applied`);
  assert.ok(applied.episode.followUpPlan, `${scenario}: follow-up planned`);
  const due = markDecisionFollowUpDue(applied.episode, applied.episode.followUpPlan!.dueAt);
  assert.equal(due.status, 'FOLLOW_UP_DUE', `${scenario}: follow-up due`);
  const outcome = recordDecisionOutcome(due, fixture.sampleOutcome, due.followUpPlan!.dueAt);
  assert.equal(outcome.status, 'OUTCOME_RECORDED', `${scenario}: outcome recorded`);
  const memory = decisionEpisodeToResult({ episode: outcome, headline: fixture.title });
  assert.equal(memory.decisionEpisode?.followUpOutcomes.length, 1, `${scenario}: memory materialized`);
  assert.equal(memory.decisionEpisode?.provenance.syntheticOnly, true, `${scenario}: fixture provenance`);
  assert.equal(memory.decisionEpisode?.leverage?.fixtureOnly, true, `${scenario}: leverage caveat`);
});

console.log('adaptive decision loop E2E scenarios A/B/C: passed');
