import type { AppData, DecisionResult, ScheduleBlock, TaskType } from '../types';
import { compileScheduleDay, scheduleTimeToMinutes } from '../utils/scheduleCompiler';
import type {
  DecisionCandidateActionV1,
  DecisionEpisodeV1,
  DecisionQuestionType,
} from './decisionEpisode';
import { markDecisionFollowUpDue } from './followUp';

export const OWNER_DECISION_FLOW_VERSION = 'questlife.owner-decision-flow.v1' as const;

export type OwnerDecisionIntentV1 = {
  questionType: DecisionQuestionType;
  questionKey:
    | 'adaptiveCoreQuestionTraining'
    | 'adaptiveCoreQuestionCognitive'
    | 'adaptiveCoreQuestionOverloaded'
    | 'adaptiveCoreQuestionGeneral';
  questionValues: Record<string, string>;
  targetId?: string;
};

function localClock(instant: string, timezone: string): { date: string; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
    const hour = Number(value('hour'));
    const minute = Number(value('minute'));
    return {
      date: `${value('year')}-${value('month')}-${value('day')}`,
      minutes: Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0,
    };
  } catch {
    const date = new Date(instant);
    return {
      date: instant.slice(0, 10),
      minutes: date.getHours() * 60 + date.getMinutes(),
    };
  }
}

function questionTypeForTask(taskType: TaskType): DecisionQuestionType {
  if (taskType === 'strength_training' || taskType === 'cardio_recovery') return 'training_recovery';
  if (taskType === 'deep_study' || taskType === 'light_review' || taskType === 'creative_building') {
    return 'cognitive_adjustment';
  }
  return 'overloaded_day';
}

function questionKeyForType(questionType: DecisionQuestionType): OwnerDecisionIntentV1['questionKey'] {
  if (questionType === 'training_recovery') return 'adaptiveCoreQuestionTraining';
  if (questionType === 'cognitive_adjustment') return 'adaptiveCoreQuestionCognitive';
  if (questionType === 'overloaded_day') return 'adaptiveCoreQuestionOverloaded';
  return 'adaptiveCoreQuestionGeneral';
}

export function inferOwnerDecisionIntent(input: {
  data: Pick<AppData, 'scheduleBlocks'>;
  now: string;
  timezone: string;
}): OwnerDecisionIntentV1 {
  const clock = localClock(input.now, input.timezone);
  const remaining = (input.data.scheduleBlocks || [])
    .filter((block) => (
      block.date === clock.date
      && block.status !== 'completed'
      && block.status !== 'skipped'
      && (scheduleTimeToMinutes(block.endTime) >= clock.minutes || !Number.isFinite(scheduleTimeToMinutes(block.endTime)))
    ))
    .sort((left, right) => left.startTime.localeCompare(right.startTime) || left.id.localeCompare(right.id));
  const active = remaining.find((block) => {
    const start = scheduleTimeToMinutes(block.startTime);
    const end = scheduleTimeToMinutes(block.endTime);
    return Number.isFinite(start) && Number.isFinite(end) && start <= clock.minutes && end >= clock.minutes;
  });
  const target = active
    ?? remaining.find((block) => block.flexibility !== 'fixed')
    ?? remaining[0];
  const questionType = target ? questionTypeForTask(target.taskType) : 'custom';
  return {
    questionType,
    questionKey: questionKeyForType(questionType),
    questionValues: target ? { title: target.title } : {},
    targetId: target?.id,
  };
}

function rangesOverlap(left: ScheduleBlock, right: ScheduleBlock): boolean {
  const leftStart = scheduleTimeToMinutes(left.startTime);
  const leftEnd = scheduleTimeToMinutes(left.endTime);
  const rightStart = scheduleTimeToMinutes(right.startTime);
  const rightEnd = scheduleTimeToMinutes(right.endTime);
  if (![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)) return true;
  return leftStart < rightEnd && rightStart < leftEnd;
}

function exactPlacementIsAvailable(after: ScheduleBlock, scheduleBlocks: ScheduleBlock[]): boolean {
  const occupied = scheduleBlocks.filter((block) => (
    block.id !== after.id
    && block.date === after.date
    && block.status !== 'skipped'
  ));
  if (after.flexibility === 'fixed' || after.placementLocked) {
    return occupied.every((block) => !rangesOverlap(after, block));
  }
  const compiled = compileScheduleDay({
    date: after.date,
    fixedBlocks: occupied,
    flexibleBlocks: [{
      block: after,
      persisted: false,
      preferredStartTime: after.startTime,
    }],
    dayStartMinutes: 0,
    dayEndMinutes: 24 * 60,
    notBeforeMinutes: 0,
    mode: 'replan',
  });
  const placement = compiled.placements.find((item) => item.candidate.block.id === after.id);
  return Boolean(
    placement
    && placement.startTime === after.startTime
    && placement.endTime === after.endTime
    && compiled.unplaced.length === 0,
  );
}

export function candidateHasFeasibleExactPatch(
  candidate: DecisionCandidateActionV1,
  scheduleBlocks: ScheduleBlock[],
): boolean {
  return candidate.planPatch.operations.every((operation) => (
    operation.after == null || exactPlacementIsAvailable(operation.after, scheduleBlocks)
  ));
}

export function retainFeasibleOwnerCandidates(
  episode: DecisionEpisodeV1,
  scheduleBlocks: ScheduleBlock[],
): DecisionEpisodeV1 {
  const candidateActions = episode.candidateActions.filter((candidate) => (
    candidateHasFeasibleExactPatch(candidate, scheduleBlocks)
  ));
  if (candidateActions.length === episode.candidateActions.length) return episode;
  return {
    ...episode,
    candidateActions,
    selectedActionId: candidateActions.some((candidate) => candidate.id === episode.selectedActionId)
      ? episode.selectedActionId
      : undefined,
    limitations: Array.from(new Set([...episode.limitations, 'INFEASIBLE_EXACT_PLAN_PATCH_EXCLUDED'])),
  };
}

export function latestOwnerDecisionEpisode(results: DecisionResult[]): DecisionEpisodeV1 | null {
  return results
    .map((result) => result.decisionEpisode)
    .filter((episode): episode is DecisionEpisodeV1 => episode?.subject.kind === 'owner')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

export function dueOwnerDecisionEpisode(
  results: DecisionResult[],
  now: string,
): DecisionEpisodeV1 | null {
  const latest = latestOwnerDecisionEpisode(results);
  if (!latest) return null;
  const due = markDecisionFollowUpDue(latest, now);
  return due.status === 'FOLLOW_UP_DUE' ? due : null;
}

export function ownerEpisodeCanResume(episode: DecisionEpisodeV1): boolean {
  return episode.status === 'NEEDS_INPUT'
    || episode.status === 'PROPOSED'
    || episode.status === 'ACCEPTED'
    || episode.status === 'APPLIED'
    || episode.status === 'FOLLOW_UP_DUE';
}
