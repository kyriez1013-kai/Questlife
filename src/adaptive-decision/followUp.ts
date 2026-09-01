import type {
  DecisionCandidateActionV1,
  DecisionEpisodeV1,
  DecisionFollowUpOutcomeV1,
  DecisionFollowUpPlanV1,
} from './decisionEpisode';
import { transitionDecisionEpisode } from './decisionEpisode';

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString();
}

function offsetSuffix(iso: string): string {
  return iso.endsWith('Z') ? 'Z' : iso.match(/[+-]\d{2}:\d{2}$/)?.[0] ?? 'Z';
}

function nextCalendarDate(dateText: string): string {
  const [year, month, day] = dateText.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + 1));
  return value.toISOString().slice(0, 10);
}

export function followUpDueAt(
  selected: Pick<DecisionCandidateActionV1, 'outcomeHorizon'>,
  appliedAt: string,
): string {
  if (selected.outcomeHorizon === 'two_hours') return addHours(appliedAt, 2);
  const date = appliedAt.slice(0, 10);
  const offset = offsetSuffix(appliedAt);
  if (selected.outcomeHorizon === 'next_morning') {
    return `${nextCalendarDate(date)}T08:00:00${offset}`;
  }
  const endOfDay = `${date}T21:30:00${offset}`;
  return Date.parse(endOfDay) > Date.parse(appliedAt) ? endOfDay : addHours(appliedAt, 2);
}

export function createDecisionFollowUpPlan(
  episodeId: string,
  selected: DecisionCandidateActionV1,
  appliedAt: string,
): DecisionFollowUpPlanV1 {
  return {
    id: `${episodeId}:follow-up`,
    horizon: selected.outcomeHorizon,
    dueAt: followUpDueAt(selected, appliedAt),
    requiredFields: selected.outcomeFields,
    status: 'pending',
  };
}

export function markDecisionFollowUpDue(episode: DecisionEpisodeV1, now: string): DecisionEpisodeV1 {
  if (!episode.followUpPlan || episode.followUpPlan.status !== 'pending') return episode;
  if (Date.parse(now) < Date.parse(episode.followUpPlan.dueAt)) return episode;
  if (episode.status !== 'APPLIED') return episode;
  return {
    ...transitionDecisionEpisode(episode, 'FOLLOW_UP_DUE', now),
    followUpPlan: { ...episode.followUpPlan, status: 'due' },
  };
}

export function validateDecisionOutcome(
  plan: DecisionFollowUpPlanV1,
  outcome: Omit<DecisionFollowUpOutcomeV1, 'id' | 'recordedAt'>,
): string[] {
  const missing: string[] = [];
  plan.requiredFields.forEach((field) => {
    if (field === 'state' && outcome.state == null) missing.push('state');
    if (field === 'fatigue' && outcome.fatigue == null) missing.push('fatigue');
    if (field === 'task_result' && outcome.taskResult == null) missing.push('task_result');
    if (field === 'usefulness' && outcome.usefulness == null) missing.push('usefulness');
    if (field === 'carryover' && outcome.carryover == null) missing.push('carryover');
  });
  return missing;
}

export function recordDecisionOutcome(
  episode: DecisionEpisodeV1,
  outcome: Omit<DecisionFollowUpOutcomeV1, 'id' | 'recordedAt'>,
  recordedAt: string,
): DecisionEpisodeV1 {
  const dueEpisode = markDecisionFollowUpDue(episode, recordedAt);
  if (dueEpisode.status !== 'FOLLOW_UP_DUE' || !dueEpisode.followUpPlan) {
    throw new Error('Decision follow-up is not due.');
  }
  const missing = validateDecisionOutcome(dueEpisode.followUpPlan, outcome);
  if (missing.length > 0) throw new Error(`Decision outcome missing required fields: ${missing.join(',')}`);
  const record: DecisionFollowUpOutcomeV1 = {
    id: `${episode.id}:outcome:${dueEpisode.followUpOutcomes.length + 1}`,
    recordedAt,
    ...outcome,
  };
  return {
    ...transitionDecisionEpisode(dueEpisode, 'OUTCOME_RECORDED', recordedAt),
    followUpPlan: { ...dueEpisode.followUpPlan, status: 'completed' },
    followUpOutcomes: [...dueEpisode.followUpOutcomes, record],
    leverage: dueEpisode.leverage ? {
      ...dueEpisode.leverage,
      followUpCompleted: true,
      outcomeAvailable: true,
    } : undefined,
  };
}

export function skipDecisionFollowUp(episode: DecisionEpisodeV1, skippedAt: string): DecisionEpisodeV1 {
  const dueEpisode = markDecisionFollowUpDue(episode, skippedAt);
  if (dueEpisode.status !== 'FOLLOW_UP_DUE' || !dueEpisode.followUpPlan) return dueEpisode;
  return {
    ...transitionDecisionEpisode(dueEpisode, 'CLOSED', skippedAt),
    followUpPlan: { ...dueEpisode.followUpPlan, status: 'skipped' },
  };
}
