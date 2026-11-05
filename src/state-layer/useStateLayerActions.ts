import { useCallback, useRef } from 'react';
import { useStore } from '../store';
import type { ScheduleBlock } from '../types';
import type { DecisionCandidateActionV1, DecisionEpisodeV1, DecisionPlanPatchV1 } from '../adaptive-decision/decisionEpisode';
import { createDecisionEpisode, transitionDecisionEpisode } from '../adaptive-decision/decisionEpisode';
import { applyAcceptedDecision, decisionEpisodeToResult, selectDecisionAction, undoAppliedDecision } from '../adaptive-decision/decisionEngine';
import { createDecisionPlanPatch } from '../adaptive-decision/planPatch';
import { DurableSubmission } from '../utils/durableSubmission';
import { readPlanCalendar } from '../platform/calendar/readPlanCalendar';
import { assertPlanCalendarAvailable, planCalendarDates, CalendarPlanConflictError, CalendarPlanUnavailableError } from '../platform/calendar/planAvailability';
import { t, type Lang } from '../i18n';

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type AppliedPlan = { episode: DecisionEpisodeV1; patch: DecisionPlanPatchV1 };

/**
 * Schedule changes from the state layer go through the existing chain only:
 * preview (the caller shows `patch`) → explicit confirm → owner DecisionEpisode PROPOSED→ACCEPTED→APPLIED
 * → store.applyDecisionSchedulePatch → ACK; undo via undoAppliedDecision + undoDecisionSchedulePatch.
 */
export function useStateLayerPlan() {
  const { data, applyDecisionSchedulePatch, undoDecisionSchedulePatch, waitForLocalWrites, retryLocalWrites } = useStore();
  const applying = useRef(new DurableSubmission<AppliedPlan>());
  const undoing = useRef(new DurableSubmission<void>());
  const latestData = useRef(data); latestData.current = data;

  const checkCalendar = useCallback(async (patch: DecisionPlanPatchV1, direction: 'apply' | 'undo' = 'apply') => {
    const events = await readPlanCalendar(planCalendarDates(patch));
    assertPlanCalendarAvailable(latestData.current.scheduleBlocks || [], patch, events, direction);
  }, []);

  /** Read-only preview using the same live occupancy checks as confirmation. */
  const preview = useCallback(async (input: { date: string; before: ScheduleBlock[]; after: ScheduleBlock[] }): Promise<DecisionPlanPatchV1> => {
    const patch = createDecisionPlanPatch({ id: newId('state-plan'), generatedAt: new Date().toISOString(), date: input.date, before: input.before, after: input.after, reasonByBlockId: Object.fromEntries(input.after.map((b) => [b.id, 'stateLayerPlanReason'])) });
    await checkCalendar(patch);
    return patch;
  }, [checkCalendar]);

  const confirmAndApply = useCallback(async (input: { patch: DecisionPlanPatchV1; headline: string; ruleId: string; skipWait?: boolean }): Promise<AppliedPlan> => {
    const create = (): AppliedPlan => {
      const now = new Date().toISOString();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const candidate: DecisionCandidateActionV1 = {
        id: 'state-layer-plan',
        kind: 'move',
        titleKey: 'stateLayerPlanTitle',
        descriptionKey: 'stateLayerPlanDescription',
        exactEffectKey: 'stateLayerPlanEffect',
        protectsKey: 'stateLayerPlanProtects',
        feasibilityKey: 'stateLayerPlanFeasible',
        uncertaintyKey: 'stateLayerPlanUncertainty',
        reversible: true,
        outcomeHorizon: 'two_hours',
        outcomeFields: ['state'],
        evidenceItemIds: [],
        constraintIds: [],
        planPatch: input.patch,
        policyTrace: [{ criterion: 'state_layer_rule', outcome: 'pass', reason: input.ruleId }],
      };
      let episode = createDecisionEpisode({ id: newId('decision-state'), questionType: 'custom', questionText: 'state_layer', subjectKind: 'owner', now, timezone, observationWindowStart: now });
      episode = transitionDecisionEpisode(episode, 'CONTEXT_ASSEMBLING', now);
      episode = transitionDecisionEpisode(episode, 'READY', now);
      episode = { ...transitionDecisionEpisode(episode, 'PROPOSED', now), candidateActions: [candidate] };
      episode = selectDecisionAction(episode, candidate.id, now);
      const applied = applyAcceptedDecision({ episode, scheduleBlocks: latestData.current.scheduleBlocks || [], appliedAt: now }).episode;
      applyDecisionSchedulePatch(applied.appliedPlanPatch!, decisionEpisodeToResult({ episode: applied, headline: input.headline }));
      return { episode: applied, patch: applied.appliedPlanPatch! };
    };
    // Brain dump owns the combined receipt for its plan and context record.
    if (input.skipWait) { await checkCalendar(input.patch); return create(); }
    return applying.current.run(create, waitForLocalWrites, retryLocalWrites, async () => {}, () => checkCalendar(input.patch));
  }, [applyDecisionSchedulePatch, checkCalendar, waitForLocalWrites, retryLocalWrites]);

  const undo = useCallback(async (plan: AppliedPlan): Promise<void> => {
    await undoing.current.run(() => {
      const now = new Date().toISOString();
      // Throws when a moved block has started or already has an execution record.
      const result = undoAppliedDecision({ episode: plan.episode, scheduleBlocks: latestData.current.scheduleBlocks || [], undoneAt: now, executionLogs: latestData.current.executionLogs || [] });
      undoDecisionSchedulePatch(plan.patch, result.episode);
    }, waitForLocalWrites, retryLocalWrites, async () => {}, () => checkCalendar(plan.patch, 'undo'));
  }, [checkCalendar, undoDecisionSchedulePatch, waitForLocalWrites, retryLocalWrites]);

  return { preview, confirmAndApply, undo, get hasPendingApply() { return applying.current.hasPending; } };
}

export function errorReason(error: unknown, lang: Lang = 'en'): string {
  if (error instanceof CalendarPlanUnavailableError) return t(lang, 'adaptiveCalendarCheckFailed');
  if (error instanceof CalendarPlanConflictError) return t(lang, 'adaptiveCalendarConflict');
  return error instanceof Error ? error.message.replace(/^[A-Za-z ]+: /, '') : String(error);
}
