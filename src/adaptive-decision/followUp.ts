import type {
  DecisionCandidateActionV1,
  DecisionEpisodeV1,
  DecisionFollowUpOutcomeV1,
  DecisionFollowUpPlanV1,
} from './decisionEpisode';
import { transitionDecisionEpisode } from './decisionEpisode';
import type { ExecutionLog, ScheduleBlock } from '../types';

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
  endedAt: string,
  timezone?: string,
): string {
  if (selected.outcomeHorizon === 'two_hours') return addHours(endedAt, 2);
  const date = timezone ? localDate(endedAt, timezone) : endedAt.slice(0, 10);
  const wallTime = (day: string, clock: string) => timezone
    ? zonedWallTime(day, clock, timezone)
    : `${day}T${clock}:00${offsetSuffix(endedAt)}`;
  if (selected.outcomeHorizon === 'next_morning') {
    return wallTime(nextCalendarDate(date), '08:00');
  }
  const endOfDay = wallTime(date, '21:30');
  return Date.parse(endOfDay) > Date.parse(endedAt) ? endOfDay : addHours(endedAt, 2);
}

function localDate(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(instant));
}

// Resolve the named-zone offset at the target civil time, including a DST change overnight.
function zonedWallTime(date: string, clock: string, timezone: string): string {
  const target = Date.parse(`${date}T${clock}:00Z`);
  let instant = target;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)!.value;
    const represented = Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`);
    if (represented === target) return new Date(instant).toISOString();
    instant += target - represented;
  }
  throw new Error('Follow-up civil time cannot be resolved.');
}

export function decisionActionTargets(
  episode: DecisionEpisodeV1,
  selected: DecisionCandidateActionV1,
): ScheduleBlock[] {
  const hasAppliedAction = episode.selectedActionId === selected.id && ['APPLIED', 'FOLLOW_UP_DUE', 'OUTCOME_RECORDED', 'CLOSED'].includes(episode.status);
  const patch = (hasAppliedAction ? episode.appliedPlanPatch : undefined) ?? selected.planPatch;
  if (patch.operations.length > 0) {
    return patch.operations.flatMap((operation) => operation.after && operation.after.status !== 'skipped' ? [operation.after] : []);
  }
  // A no-change decision still needs an explicit target; never guess from nearby activity.
  return patch.afterSnapshot.filter((block) => block.id === episode.question.targetId && block.status !== 'skipped');
}

export type DecisionExecutionAnchor = { endedAt: string; executionIds: string[] };

function explicitInstant(value?: string): number {
  return value && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
}

export function decisionExecutionAnchor(
  episode: DecisionEpisodeV1,
  executionLogs: ExecutionLog[],
  now: string,
): DecisionExecutionAnchor | null {
  if (episode.subject.kind !== 'owner' || episode.provenance.syntheticOnly || !episode.provenance.containsRealUserData
    || ['QA_TEST', 'SYNTHETIC', 'DEBUG_FIXTURE'].includes(episode.provenance.origin)) return null;
  const appliedAt = episode.appliedPlanPatch?.appliedAt;
  const selected = episode.candidateActions.find((action) => action.id === episode.selectedActionId);
  if (!selected || !appliedAt || !Number.isFinite(Date.parse(appliedAt)) || !Number.isFinite(Date.parse(now))) return null;
  const targets = decisionActionTargets(episode, selected);
  if (targets.length === 0) return null;
  const matches: Array<{ id: string; endedAt: string }> = [];
  for (const target of targets) {
    const matching = executionLogs.filter((log) => {
      const provenance = log.dataProvenance;
      if (!provenance || provenance.deleted || !['OWNER_OBSERVED', 'OWNER_CONFIRMED_AI_PARSE'].includes(provenance.origin)
        || !['USER_ENTERED', 'USER_CONFIRMED', 'USER_CORRECTED'].includes(provenance.confirmation)
        || log.linkedScheduleBlockId !== target.id || log.date !== target.date) return false;
      const start = explicitInstant(provenance.eventStartAt);
      const end = explicitInstant(provenance.eventEndAt);
      const available = explicitInstant(provenance.availableAt);
      const recorded = explicitInstant(provenance.recordedAt);
      const updated = log.updatedAt ? explicitInstant(log.updatedAt) : available;
      // Recorded/created time and planned duration are never substitutes for actual endpoints.
      return [start, end, available, recorded, updated].every(Number.isFinite)
        && start >= Date.parse(appliedAt) && end > start && end <= recorded
        && available <= Date.parse(now) && recorded <= Date.parse(now) && updated <= Date.parse(now);
    });
    // Multiple logs on one block have no existing decision-specific link. Stay unanchored.
    if (matching.length !== 1) return null;
    matches.push({ id: matching[0].id, endedAt: matching[0].dataProvenance!.eventEndAt! });
  }
  return {
    endedAt: matches.reduce((latest, match) => Date.parse(match.endedAt) > Date.parse(latest) ? match.endedAt : latest, matches[0].endedAt),
    executionIds: matches.map((match) => match.id),
  };
}

export function createDecisionFollowUpPlan(
  episodeId: string,
  selected: DecisionCandidateActionV1,
  endedAt: string,
  timezone?: string,
): DecisionFollowUpPlanV1 {
  return {
    id: `${episodeId}:follow-up`,
    horizon: selected.outcomeHorizon,
    dueAt: followUpDueAt(selected, endedAt, timezone),
    requiredFields: selected.outcomeFields,
    status: 'pending',
  };
}

export function markDecisionFollowUpDue(episode: DecisionEpisodeV1, now: string, executionLogs: ExecutionLog[] = []): DecisionEpisodeV1 {
  if (episode.subject.kind === 'owner' && (episode.status === 'APPLIED' || episode.status === 'FOLLOW_UP_DUE')) {
    const anchor = decisionExecutionAnchor(episode, executionLogs, now);
    const selected = episode.candidateActions.find((action) => action.id === episode.selectedActionId);
    // Revalidate legacy apply-timed plans and corrected/deleted execution on every read/save.
    if (!anchor || !selected) return { ...episode, status: 'APPLIED', followUpPlan: undefined };
    let plan: DecisionFollowUpPlanV1;
    try {
      plan = createDecisionFollowUpPlan(episode.id, selected, anchor.endedAt, episode.time.timezone);
    } catch {
      return { ...episode, status: 'APPLIED', followUpPlan: undefined };
    }
    const due = Date.parse(now) >= Date.parse(plan.dueAt);
    return {
      ...episode,
      status: due ? 'FOLLOW_UP_DUE' : 'APPLIED',
      followUpPlan: { ...plan, status: due ? 'due' : 'pending' },
    };
  }
  if (!episode.followUpPlan || episode.followUpPlan.status !== 'pending') return episode;
  if (!Number.isFinite(Date.parse(now)) || !Number.isFinite(Date.parse(episode.followUpPlan.dueAt))) return episode;
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
  for (const field of ['state', 'fatigue'] as const) {
    const value = outcome[field];
    if (value != null && (!Number.isInteger(value) || value < 1 || value > 5)) missing.push(field);
  }
  if (outcome.taskResult != null && !['completed', 'partially_completed', 'not_completed', 'not_applicable'].includes(outcome.taskResult)) missing.push('task_result');
  if (outcome.usefulness != null && !['helpful', 'uncertain', 'not_helpful'].includes(outcome.usefulness)) missing.push('usefulness');
  if (outcome.carryover != null && !['none', 'some', 'significant'].includes(outcome.carryover)) missing.push('carryover');
  return [...new Set(missing)];
}

export function recordDecisionOutcome(
  episode: DecisionEpisodeV1,
  outcome: Omit<DecisionFollowUpOutcomeV1, 'id' | 'recordedAt'>,
  recordedAt: string,
  executionLogs: ExecutionLog[] = [],
): DecisionEpisodeV1 {
  const dueEpisode = markDecisionFollowUpDue(episode, recordedAt, executionLogs);
  if (dueEpisode.status !== 'FOLLOW_UP_DUE' || !dueEpisode.followUpPlan) {
    throw new Error('Decision follow-up is not due.');
  }
  const missing = validateDecisionOutcome(dueEpisode.followUpPlan, outcome);
  if (missing.length > 0) throw new Error(`Decision outcome missing required fields: ${missing.join(',')}`);
  const record: DecisionFollowUpOutcomeV1 = {
    ...outcome,
    id: `${episode.id}:outcome:${dueEpisode.followUpOutcomes.length + 1}`,
    recordedAt,
  };
  return {
    ...transitionDecisionEpisode(dueEpisode, 'OUTCOME_RECORDED', recordedAt),
    followUpPlan: { ...dueEpisode.followUpPlan, status: 'completed' },
    followUpOutcomes: [...dueEpisode.followUpOutcomes, record],
    provenance: {
      ...dueEpisode.provenance,
      sourceIds: [...new Set([
        ...dueEpisode.provenance.sourceIds,
        ...(dueEpisode.subject.kind === 'owner' ? decisionExecutionAnchor(dueEpisode, executionLogs, recordedAt)?.executionIds ?? [] : []),
      ])],
    },
    leverage: dueEpisode.leverage ? {
      ...dueEpisode.leverage,
      followUpCompleted: true,
      outcomeAvailable: true,
    } : undefined,
  };
}

export function skipDecisionFollowUp(episode: DecisionEpisodeV1, skippedAt: string, executionLogs: ExecutionLog[] = []): DecisionEpisodeV1 {
  const dueEpisode = markDecisionFollowUpDue(episode, skippedAt, executionLogs);
  if (dueEpisode.status !== 'FOLLOW_UP_DUE' || !dueEpisode.followUpPlan) return dueEpisode;
  return {
    ...transitionDecisionEpisode(dueEpisode, 'CLOSED', skippedAt),
    followUpPlan: { ...dueEpisode.followUpPlan, status: 'skipped' },
  };
}
