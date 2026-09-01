import assert from 'node:assert/strict';
import {
  canTransitionDecisionEpisode,
  createDecisionEpisode,
  DecisionEpisodeTransitionError,
  transitionDecisionEpisode,
  type DecisionEpisodeStatus,
} from './decisionEpisode';

const NOW = '2026-09-01T08:00:00+08:00';
const episode = createDecisionEpisode({
  id: 'episode-test',
  questionType: 'training_recovery',
  subjectKind: 'demo',
  now: NOW,
  timezone: 'Asia/Shanghai',
  observationWindowStart: '2026-08-03T08:00:00+08:00',
});

const validPath: DecisionEpisodeStatus[] = [
  'CONTEXT_ASSEMBLING',
  'READY',
  'PROPOSED',
  'ACCEPTED',
  'APPLIED',
  'FOLLOW_UP_DUE',
  'OUTCOME_RECORDED',
  'CLOSED',
];

let current = episode;
validPath.forEach((status, index) => {
  assert.equal(canTransitionDecisionEpisode(current.status, status), true);
  current = transitionDecisionEpisode(current, status, `2026-09-01T08:0${index + 1}:00+08:00`);
});
assert.equal(current.status, 'CLOSED');

assert.equal(canTransitionDecisionEpisode('DRAFT', 'APPLIED'), false);
assert.equal(canTransitionDecisionEpisode('PROPOSED', 'OUTCOME_RECORDED'), false);
assert.equal(canTransitionDecisionEpisode('ABSTAINED', 'APPLIED'), false);
assert.throws(
  () => transitionDecisionEpisode(episode, 'APPLIED', NOW),
  DecisionEpisodeTransitionError,
);

const needsInputPath = transitionDecisionEpisode(
  transitionDecisionEpisode(episode, 'CONTEXT_ASSEMBLING', NOW),
  'NEEDS_INPUT',
  NOW,
);
assert.equal(canTransitionDecisionEpisode(needsInputPath.status, 'CONTEXT_ASSEMBLING'), true);

console.log('adaptive decision episode state machine: passed');
