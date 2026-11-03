import { useCallback } from 'react';
import { useStore } from '../store';
import type { ScheduleBlock } from '../types';
import type { DecisionCandidateActionV1, DecisionEpisodeV1, DecisionPlanPatchV1 } from '../adaptive-decision/decisionEpisode';
import { createDecisionEpisode, transitionDecisionEpisode } from '../adaptive-decision/decisionEpisode';
import { applyAcceptedDecision, decisionEpisodeToResult, selectDecisionAction, undoAppliedDecision } from '../adaptive-decision/decisionEngine';
import { applyDecisionPlanPatch, createDecisionPlanPatch } from '../adaptive-decision/planPatch';

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export type AppliedPlan = { episode: DecisionEpisodeV1; patch: DecisionPlanPatchV1 };

/**
 * Schedule changes from the state layer go through the existing chain only:
 * preview (the caller shows `patch`) → explicit confirm → owner DecisionEpisode PROPOSED→ACCEPTED→APPLIED
 * → store.applyDecisionSchedulePatch → ACK; undo via undoAppliedDecision + undoDecisionSchedulePatch.
 */
export function useStateLayerPlan() {
  const { data, addDecisionResult, applyDecisionSchedulePatch, undoDecisionSchedulePatch, updateDecisionEpisode, waitForLocalWrites } = useStore();

  /** Pure preview: throws DecisionPlanPatchConflictError when the change cannot be applied. */
  const preview = useCallback((input: { date: string; before: ScheduleBlock[]; after: ScheduleBlock[] }): DecisionPlanPatchV1 => {
    const patch = createDecisionPlanPatch({ id: newId('state-plan'), generatedAt: new Date().toISOString(), date: input.date, before: input.before, after: input.after, reasonByBlockId: Object.fromEntries(input.after.map((b) => [b.id, 'stateLayerPlanReason'])) });
    applyDecisionPlanPatch(data.scheduleBlocks || [], patch); // dry run against the live schedule
    return patch;
  }, [data.scheduleBlocks]);

  const confirmAndApply = useCallback(async (input: { patch: DecisionPlanPatchV1; headline: string; ruleId: string; skipWait?: boolean }): Promise<AppliedPlan> => {
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
    const applied = applyAcceptedDecision({ episode, scheduleBlocks: data.scheduleBlocks || [], appliedAt: now }).episode;
    applyDecisionSchedulePatch(applied.appliedPlanPatch!);
    addDecisionResult(decisionEpisodeToResult({ episode: applied, headline: input.headline }));
    if (!input.skipWait) await waitForLocalWrites();
    return { episode: applied, patch: applied.appliedPlanPatch! };
  }, [addDecisionResult, applyDecisionSchedulePatch, data.scheduleBlocks, waitForLocalWrites]);

  const undo = useCallback(async (plan: AppliedPlan): Promise<void> => {
    const now = new Date().toISOString();
    // Throws when a moved block has started or already has an execution record.
    const result = undoAppliedDecision({ episode: plan.episode, scheduleBlocks: data.scheduleBlocks || [], undoneAt: now, executionLogs: data.executionLogs || [] });
    undoDecisionSchedulePatch(plan.patch);
    updateDecisionEpisode(plan.episode.id, result.episode);
    await waitForLocalWrites();
  }, [data.executionLogs, data.scheduleBlocks, undoDecisionSchedulePatch, updateDecisionEpisode, waitForLocalWrites]);

  return { preview, confirmAndApply, undo };
}

export function errorReason(error: unknown): string {
  return error instanceof Error ? error.message.replace(/^[A-Za-z ]+: /, '') : String(error);
}
