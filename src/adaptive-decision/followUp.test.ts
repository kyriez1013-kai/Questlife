import assert from 'node:assert/strict';
import type { DecisionResult, ExecutionLog, ScheduleBlock } from '../types';
import { createDecisionEpisode, type DecisionCandidateActionV1, type DecisionEpisodeV1 } from './decisionEpisode';
import { createDecisionPlanPatch, scheduleBlockWithDuration } from './planPatch';
import { decisionExecutionAnchor, followUpDueAt, markDecisionFollowUpDue, recordDecisionOutcome, skipDecisionFollowUp } from './followUp';
import { dueOwnerDecisionEpisode } from './ownerDecisionFlow';

const appliedAt = '2026-09-02T09:00:00Z';
const block: ScheduleBlock = {
  id: 'exact-training', title: 'Training', date: '2026-09-02', startTime: '19:00', endTime: '20:00',
  plannedMinutes: 60, taskType: 'strength_training', flexibility: 'movable', rigidity: 'medium', status: 'planned', createdAt: 1,
};
const patch = { ...createDecisionPlanPatch({ id: 'patch', date: block.date, generatedAt: appliedAt, before: [block], after: [scheduleBlockWithDuration(block, 30)] }), appliedAt };
const action: DecisionCandidateActionV1 = {
  id: 'shorten', kind: 'shorten', titleKey: 'shorten', descriptionKey: 'description', exactEffectKey: 'effect',
  protectsKey: 'protect', feasibilityKey: 'feasible', uncertaintyKey: 'uncertain', reversible: true,
  outcomeHorizon: 'two_hours', outcomeFields: ['state', 'fatigue', 'task_result', 'usefulness'],
  evidenceItemIds: [], constraintIds: [block.id], planPatch: patch, policyTrace: [],
};
const episode: DecisionEpisodeV1 = {
  ...createDecisionEpisode({ id: 'owner-follow-up', subjectKind: 'owner', questionType: 'training_recovery', targetId: block.id, now: appliedAt, timezone: 'Asia/Shanghai', observationWindowStart: appliedAt }),
  status: 'APPLIED', selectedActionId: action.id, candidateActions: [action], appliedPlanPatch: patch,
};
const execution: ExecutionLog = {
  id: 'real-execution', date: block.date, linkedScheduleBlockId: block.id, source: 'timer', durationMinutes: 30,
  createdAt: '2026-09-02T11:30:00Z',
  dataProvenance: {
    schemaVersion: 'questlife.data.provenance.v1', origin: 'OWNER_OBSERVED', confirmation: 'USER_ENTERED', captureMethod: 'timer',
    recordedAt: '2026-09-02T11:30:00Z', availableAt: '2026-09-02T11:30:00Z',
    eventStartAt: '2026-09-02T11:00:00Z', eventEndAt: '2026-09-02T11:30:00Z', timezone: 'Asia/Shanghai',
  },
};
const dueAt = '2026-09-02T13:30:00.000Z';
let checks = 0;
function check(name: string, run: () => void) { run(); checks += 1; }
function changedLog(patch: Partial<NonNullable<ExecutionLog['dataProvenance']>>) {
  return { ...execution, dataProvenance: { ...execution.dataProvenance!, ...patch } };
}

check('applying a plan is not behavior', () => {
  assert.equal(markDecisionFollowUpDue(episode, dueAt).followUpPlan, undefined);
  assert.equal(markDecisionFollowUpDue(episode, dueAt).status, 'APPLIED');
});
check('fixture episode cannot borrow real owner execution', () => assert.equal(decisionExecutionAnchor({ ...episode, provenance: { ...episode.provenance, origin: 'QA_TEST' } }, [execution], dueAt), null));
check('before actual end no anchor', () => assert.equal(decisionExecutionAnchor(episode, [execution], '2026-09-02T11:15:00Z'), null));
check('end starts the full horizon', () => {
  const pending = markDecisionFollowUpDue(episode, '2026-09-02T11:30:00Z', [execution]);
  assert.equal(pending.status, 'APPLIED');
  assert.equal(pending.followUpPlan?.dueAt, dueAt);
  assert.equal(markDecisionFollowUpDue(pending, '2026-09-02T13:29:59Z', [execution]).status, 'APPLIED');
  assert.equal(markDecisionFollowUpDue(pending, dueAt, [execution]).status, 'FOLLOW_UP_DUE');
});
check('exact record lineage', () => assert.deepEqual(decisionExecutionAnchor(episode, [execution], dueAt)?.executionIds, [execution.id]));
check('unrelated record same time', () => assert.equal(decisionExecutionAnchor(episode, [{ ...execution, linkedScheduleBlockId: 'other' }], dueAt), null));
check('same skill is not exact block', () => assert.equal(decisionExecutionAnchor(episode, [{ ...execution, linkedScheduleBlockId: undefined, linkedSkillId: block.id }], dueAt), null));
check('wrong day', () => assert.equal(decisionExecutionAnchor(episode, [{ ...execution, date: '2026-09-03' }], dueAt), null));
check('missing actual end', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ eventEndAt: undefined })], dueAt), null));
check('local wall clock without zone is not an endpoint', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ eventEndAt: '2026-09-02T11:30:00' })], dueAt), null));
check('missing actual start', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ eventStartAt: undefined })], dueAt), null));
check('unknown provenance', () => assert.equal(decisionExecutionAnchor(episode, [{ ...execution, dataProvenance: undefined }], dueAt), null));
check('zero length', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ eventEndAt: execution.dataProvenance!.eventStartAt })], dueAt), null));
check('execution predating adjustment', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ eventStartAt: '2026-09-02T08:00:00Z' })], dueAt), null));
check('not yet available', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ availableAt: '2026-09-03T11:30:00Z' })], dueAt), null));
for (const origin of ['QA_TEST', 'SYNTHETIC', 'DEBUG_FIXTURE', 'LEGACY_UNKNOWN', 'DERIVED'] as const) {
  check(`reject ${origin}`, () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ origin })], dueAt), null));
}
check('unconfirmed', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ confirmation: 'UNCONFIRMED' })], dueAt), null));
check('deleted', () => assert.equal(decisionExecutionAnchor(episode, [changedLog({ deleted: true })], dueAt), null));
check('ambiguous executions', () => assert.equal(decisionExecutionAnchor(episode, [execution, { ...execution, id: 'other-execution' }], dueAt), null));
check('old apply-timed due is invalidated', () => {
  const legacy = { ...episode, status: 'FOLLOW_UP_DUE' as const, followUpPlan: { id: 'legacy', horizon: 'two_hours' as const, dueAt: appliedAt, requiredFields: action.outcomeFields, status: 'due' as const } };
  assert.equal(markDecisionFollowUpDue(legacy, dueAt).status, 'APPLIED');
  assert.equal(markDecisionFollowUpDue(legacy, dueAt).followUpPlan, undefined);
  assert.equal(markDecisionFollowUpDue(legacy, '2026-09-02T12:00:00Z', [execution]).followUpPlan?.status, 'pending');
});
check('corrected end moves horizon, no stale due', () => {
  const due = markDecisionFollowUpDue(episode, dueAt, [execution]);
  const corrected = changedLog({ eventEndAt: '2026-09-02T12:30:00Z', recordedAt: '2026-09-02T12:30:00Z', availableAt: '2026-09-02T12:30:00Z' });
  const pending = markDecisionFollowUpDue(due, dueAt, [corrected]);
  assert.equal(pending.status, 'APPLIED');
  assert.equal(pending.followUpPlan?.dueAt, '2026-09-02T14:30:00.000Z');
});
check('save revalidates record deletion', () => {
  const due = markDecisionFollowUpDue(episode, dueAt, [execution]);
  assert.throws(() => recordDecisionOutcome(due, { state: 4, fatigue: 5, taskResult: 'completed', usefulness: 'not_helpful' }, dueAt, []));
});
check('outcome dimensions retain independent values', () => {
  const completed = recordDecisionOutcome(episode, { state: 4, fatigue: 5, taskResult: 'completed', usefulness: 'not_helpful' }, dueAt, [execution]);
  assert.equal(completed.followUpOutcomes[0].state, 4);
  assert.equal(completed.followUpOutcomes[0].fatigue, 5);
  assert.equal(completed.followUpOutcomes[0].taskResult, 'completed');
  assert.equal(completed.followUpOutcomes[0].usefulness, 'not_helpful');
  assert.ok(completed.provenance.sourceIds.includes(execution.id));
  assert.throws(() => recordDecisionOutcome(completed, { state: 4 }, dueAt, [execution]), 'no duplicate outcome');
});
check('out of range values rejected', () => assert.throws(() => recordDecisionOutcome(episode, { state: 6, fatigue: NaN, taskResult: 'completed', usefulness: 'helpful' }, dueAt, [execution])));
check('skip only after real due', () => {
  assert.equal(skipDecisionFollowUp(episode, dueAt).status, 'APPLIED');
  assert.equal(skipDecisionFollowUp(episode, dueAt, [execution]).followUpPlan?.status, 'skipped');
});
check('no-op needs explicit target', () => {
  const unchanged = { ...patch, operations: [], afterSnapshot: [block] };
  const noTarget = { ...episode, question: { ...episode.question, targetId: undefined }, appliedPlanPatch: unchanged };
  assert.equal(decisionExecutionAnchor(noTarget, [execution], dueAt), null);
});
check('removal is not executed behavior', () => {
  const removed = { ...createDecisionPlanPatch({ id: 'remove', date: block.date, generatedAt: appliedAt, before: [block], after: [] }), appliedAt };
  assert.equal(decisionExecutionAnchor({ ...episode, appliedPlanPatch: removed }, [execution], dueAt), null);
});
check('all changed targets must have execution', () => {
  const second = { ...block, id: 'second', startTime: '21:00', endTime: '22:00' };
  const multiple = { ...createDecisionPlanPatch({ id: 'multi', date: block.date, generatedAt: appliedAt, before: [block, second], after: [scheduleBlockWithDuration(block, 30), scheduleBlockWithDuration(second, 30)] }), appliedAt };
  assert.equal(decisionExecutionAnchor({ ...episode, appliedPlanPatch: multiple }, [execution], dueAt), null);
  const secondExecution = { ...execution, id: 'second-execution', linkedScheduleBlockId: second.id, dataProvenance: { ...execution.dataProvenance!, eventStartAt: '2026-09-02T13:00:00Z', eventEndAt: '2026-09-02T13:30:00Z', recordedAt: '2026-09-02T13:30:00Z', availableAt: '2026-09-02T13:30:00Z' } };
  assert.equal(markDecisionFollowUpDue({ ...episode, appliedPlanPatch: multiple }, dueAt, [execution, secondExecution]).followUpPlan?.dueAt, '2026-09-02T15:30:00.000Z');
});
check('a moved plan waits for execution on the moved day', () => {
  const movedBlock = { ...block, date: '2026-09-03' };
  const movePatch = { ...createDecisionPlanPatch({ id: 'move', date: block.date, generatedAt: appliedAt, before: [block], after: [movedBlock] }), appliedAt };
  const movedEpisode = { ...episode, appliedPlanPatch: movePatch, candidateActions: [{ ...action, kind: 'move' as const, outcomeHorizon: 'next_morning' as const, planPatch: movePatch }] };
  assert.equal(markDecisionFollowUpDue(movedEpisode, '2026-09-03T02:00:00Z', [execution]).followUpPlan, undefined);
  const movedExecution = { ...execution, date: movedBlock.date, dataProvenance: { ...execution.dataProvenance!, eventStartAt: '2026-09-03T11:00:00Z', eventEndAt: '2026-09-03T12:00:00Z', recordedAt: '2026-09-03T12:00:00Z', availableAt: '2026-09-03T12:00:00Z' } };
  assert.equal(markDecisionFollowUpDue(movedEpisode, '2026-09-03T12:00:00Z', [movedExecution]).followUpPlan?.dueAt, '2026-09-04T00:00:00.000Z');
});
check('next morning uses execution day and named timezone', () => assert.equal(followUpDueAt({ outcomeHorizon: 'next_morning' }, '2026-09-03T11:30:00Z', 'Asia/Shanghai'), '2026-09-04T00:00:00.000Z'));
check('end of day uses owner timezone', () => assert.equal(followUpDueAt({ outcomeHorizon: 'end_of_day' }, '2026-09-02T11:30:00Z', 'Asia/Shanghai'), dueAt));
check('after day boundary waits two actual hours', () => assert.equal(followUpDueAt({ outcomeHorizon: 'end_of_day' }, '2026-09-02T14:00:00Z', 'Asia/Shanghai'), '2026-09-02T16:00:00.000Z'));
check('next morning honors DST change', () => assert.equal(followUpDueAt({ outcomeHorizon: 'next_morning' }, '2026-03-07T23:00:00-05:00', 'America/New_York'), '2026-03-08T12:00:00.000Z'));
check('new draft cannot conceal an older due follow-up', () => {
  const result = (value: DecisionEpisodeV1): DecisionResult => ({ id: value.id, createdAt: value.createdAt, mode: 'daily_brief', trigger: 'manual', source: 'legacy_fallback', schemaVersion: value.contractVersion, headlineInsight: '', evidenceBasis: 'mixed', decisionEpisode: value });
  const newer = { ...episode, id: 'new-draft', status: 'DRAFT' as const, updatedAt: dueAt };
  assert.equal(dueOwnerDecisionEpisode([result(newer), result(episode)], dueAt, [execution])?.id, episode.id);
});

console.log(`decision follow-up execution semantics: ${checks}/${checks} passed`);
