import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { AppData, DecisionResult, ScheduleBlock } from '../types';
import {
  V11CategoricalChip,
  V11DiscreteNumericRail,
  V11SheetButton,
  V11StickySheetFooter,
} from '../v11/components/V11SheetControls';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import AdaptiveDecisionWorkspace from './AdaptiveDecisionWorkspace';
import {
  applyAcceptedDecision,
  beginDecisionEpisode,
  decisionEpisodeToResult,
  proposeDecisionEpisode,
  selectDecisionAction,
  undoAppliedDecision,
} from './decisionEngine';
import type { DecisionEpisodeV1, DecisionFollowUpOutcomeV1 } from './decisionEpisode';
import {
  markDecisionFollowUpDue,
  recordDecisionOutcome,
  skipDecisionFollowUp,
  validateDecisionOutcome,
} from './followUp';
import {
  inferOwnerDecisionIntent,
  latestOwnerDecisionEpisode,
  ownerEpisodeCanResume,
  retainFeasibleOwnerCandidates,
} from './ownerDecisionFlow';
import { loadOwnerQuantArtifacts, type OwnerQuantRuntimeArtifacts } from './ownerQuantRuntime';
import { adaptiveText, candidateCopy, questionTypeLabel } from './presentation';
import { recordAdaptiveDecisionTelemetry } from './telemetry';

type OwnerOutcome = Omit<DecisionFollowUpOutcomeV1, 'id' | 'recordedAt'>;
type CoreView = 'loading' | 'decision' | 'follow_up' | 'memory';

type Props = {
  data: AppData;
  decisionResults: DecisionResult[];
  lang: Lang;
  onAddDecisionResult: (result: ReturnType<typeof decisionEpisodeToResult>) => DecisionResult;
  onApplySchedulePatch: (patch: NonNullable<DecisionEpisodeV1['appliedPlanPatch']>) => ScheduleBlock[];
  onClose: () => void;
  onUndoSchedulePatch: (patch: NonNullable<DecisionEpisodeV1['appliedPlanPatch']>) => ScheduleBlock[];
  onUpdateDecisionEpisode: (id: string, episode: DecisionEpisodeV1) => void;
  reducedMotion: boolean;
  theme: V11ThemeTokens;
  visible: boolean;
};

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function observationWindowStart(now: string): string {
  return new Date(Date.parse(now) - 28 * 24 * 60 * 60 * 1000).toISOString();
}

function ownerEpisodeId(): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `decision-owner-core-${suffix}`;
}

function required(
  episode: DecisionEpisodeV1,
  field: 'state' | 'fatigue' | 'task_result' | 'carryover' | 'usefulness',
): boolean {
  return episode.followUpPlan?.requiredFields.includes(field) ?? false;
}

function runtimeLimitations(artifacts: OwnerQuantRuntimeArtifacts): string[] {
  if (artifacts.status === 'available') return artifacts.limitations;
  if (artifacts.status === 'no_eligible_data') {
    return Array.from(new Set([...artifacts.limitations, 'OWNER_QUANT_NOT_YET_ELIGIBLE']));
  }
  return Array.from(new Set([...artifacts.limitations, 'OWNER_QUANT_RUNTIME_UNAVAILABLE_CONTEXT_ONLY']));
}

export default function QuestLifeCoreOwnerSheet({
  data,
  decisionResults,
  lang,
  onAddDecisionResult,
  onApplySchedulePatch,
  onClose,
  onUndoSchedulePatch,
  onUpdateDecisionEpisode,
  reducedMotion,
  theme,
  visible,
}: Props) {
  const copy = useCallback(
    (key: string, values: Record<string, string | number> = {}) => adaptiveText(lang, key, values),
    [lang],
  );
  const [view, setView] = useState<CoreView>('loading');
  const [episode, setEpisode] = useState<DecisionEpisodeV1 | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeActionId, setActiveActionId] = useState<string>();
  const [outcome, setOutcome] = useState<OwnerOutcome>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generationRef = useRef(0);
  const initializedVisibleRef = useRef(false);
  const persistedEpisodeIdsRef = useRef(new Set<string>());
  const artifactsRef = useRef<OwnerQuantRuntimeArtifacts | null>(null);

  useEffect(() => {
    persistedEpisodeIdsRef.current = new Set(
      decisionResults
        .map((result) => result.decisionEpisode?.id)
        .filter((id): id is string => Boolean(id)),
    );
  }, [decisionResults]);

  const persistEpisode = useCallback((next: DecisionEpisodeV1) => {
    if (persistedEpisodeIdsRef.current.has(next.id)) {
      onUpdateDecisionEpisode(next.id, next);
      return;
    }
    onAddDecisionResult(decisionEpisodeToResult({
      episode: next,
      headline: next.question.text ?? questionTypeLabel(lang, next.question.type),
    }));
    persistedEpisodeIdsRef.current.add(next.id);
  }, [lang, onAddDecisionResult, onUpdateDecisionEpisode]);

  const propose = useCallback(async (
    draft: DecisionEpisodeV1,
    nextAnswers: Record<string, string>,
    generation: number,
  ) => {
    setBusy(true);
    setError('');
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const quantStarted = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const artifacts = artifactsRef.current ?? await loadOwnerQuantArtifacts({
        data,
        timezone: draft.time.timezone,
        asOf: draft.time.asOf,
      });
      const quantLatencyMs = artifactsRef.current
        ? 0
        : Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - quantStarted);
      if (generation !== generationRef.current) return;
      artifactsRef.current = artifacts;
      const proposed = retainFeasibleOwnerCandidates(proposeDecisionEpisode({
        episode: draft,
        data,
        answers: nextAnswers,
        quantProduct: artifacts.status === 'available' ? artifacts.product : undefined,
        quantAnalysis: artifacts.status === 'available' ? artifacts.analysis : undefined,
        now: new Date().toISOString(),
      }), data.scheduleBlocks || []);
      const resolved = {
        ...proposed,
        limitations: Array.from(new Set([
          ...proposed.limitations,
          ...runtimeLimitations(artifacts),
        ])),
      };
      persistEpisode(resolved);
      setEpisode(resolved);
      setAnswers(nextAnswers);
      setActiveActionId(resolved.selectedActionId ?? resolved.candidateActions[0]?.id);
      setView(resolved.status === 'FOLLOW_UP_DUE' ? 'follow_up' : 'decision');
      const elapsedMs = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_context_assembled',
        questionType: resolved.question.type,
        contextFactCount: resolved.contextSnapshot?.facts.length ?? 0,
        missingQuestionCount: resolved.missingContext.length,
        elapsedMs,
        quantLatencyMs,
        totalDecisionLatencyMs: elapsedMs,
        fixtureOnly: false,
      });
      recordAdaptiveDecisionTelemetry({
        name: resolved.status === 'NEEDS_INPUT' ? 'decision_missing_questions_shown' : 'decision_proposals_ready',
        questionType: resolved.question.type,
        missingQuestionCount: resolved.missingContext.length,
        proposalCount: resolved.candidateActions.length,
        elapsedMs,
        quantLatencyMs,
        totalDecisionLatencyMs: elapsedMs,
        fixtureOnly: false,
      });
    } catch (caught) {
      if (generation !== generationRef.current) return;
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      if (generation === generationRef.current) setBusy(false);
    }
  }, [data, persistEpisode]);

  const startNewDecision = useCallback(() => {
    const generation = ++generationRef.current;
    artifactsRef.current = null;
    setView('loading');
    setEpisode(null);
    setAnswers({});
    setOutcome({});
    setActiveActionId(undefined);
    setError('');
    const now = new Date().toISOString();
    const zone = timezone();
    const intent = inferOwnerDecisionIntent({ data, now, timezone: zone });
    const draft = beginDecisionEpisode({
      id: ownerEpisodeId(),
      questionType: intent.questionType,
      questionText: copy(intent.questionKey, intent.questionValues),
      targetId: intent.targetId,
      subjectKind: 'owner',
      now,
      timezone: zone,
      observationWindowStart: observationWindowStart(now),
    });
    recordAdaptiveDecisionTelemetry({
      name: 'decision_flow_opened',
      questionType: intent.questionType,
      fixtureOnly: false,
    });
    void propose(draft, {}, generation);
  }, [copy, data, propose]);

  useEffect(() => {
    if (!visible) {
      generationRef.current += 1;
      initializedVisibleRef.current = false;
      return;
    }
    if (initializedVisibleRef.current) return;
    initializedVisibleRef.current = true;
    const latest = latestOwnerDecisionEpisode(decisionResults);
    if (latest) {
      const due = markDecisionFollowUpDue(latest, new Date().toISOString());
      if (due.status === 'FOLLOW_UP_DUE') {
        if (due.status !== latest.status || due.followUpPlan?.status !== latest.followUpPlan?.status) {
          onUpdateDecisionEpisode(due.id, due);
        }
        persistedEpisodeIdsRef.current.add(due.id);
        setEpisode(due);
        setOutcome({});
        setView('follow_up');
        setActiveActionId(due.selectedActionId);
        setError('');
        recordAdaptiveDecisionTelemetry({
          name: 'decision_follow_up_due',
          questionType: due.question.type,
          fixtureOnly: false,
        });
        return;
      }
      if (ownerEpisodeCanResume(due)) {
        persistedEpisodeIdsRef.current.add(due.id);
        setEpisode(due);
        setAnswers({});
        setOutcome({});
        setActiveActionId(due.selectedActionId ?? due.candidateActions[0]?.id);
        setView('decision');
        setError('');
        return;
      }
    }
    startNewDecision();
  }, [decisionResults, onUpdateDecisionEpisode, startNewDecision, visible]);

  const answerQuestion = useCallback((questionId: string, value: string) => {
    if (!episode || episode.status !== 'NEEDS_INPUT') return;
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    if (episode.missingContext.some((question) => !nextAnswers[question.id])) return;
    const generation = ++generationRef.current;
    void propose(episode, nextAnswers, generation);
  }, [answers, episode, propose]);

  const selectAction = useCallback((actionId: string) => {
    if (!episode?.candidateActions.some((candidate) => candidate.id === actionId)) return;
    setActiveActionId(actionId);
    recordAdaptiveDecisionTelemetry({
      name: 'decision_proposal_selected',
      questionType: episode.question.type,
      fixtureOnly: false,
    });
  }, [episode]);

  const apply = useCallback(() => {
    if (!episode || !activeActionId || busy) return;
    setBusy(true);
    setError('');
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const accepted = episode.status === 'PROPOSED'
        ? selectDecisionAction(episode, activeActionId, new Date().toISOString())
        : episode;
      const applied = applyAcceptedDecision({
        episode: accepted,
        scheduleBlocks: data.scheduleBlocks || [],
        appliedAt: new Date().toISOString(),
      });
      if (!applied.episode.appliedPlanPatch) throw new Error('Decision plan patch was not created.');
      onApplySchedulePatch(applied.episode.appliedPlanPatch);
      persistEpisode(applied.episode);
      setEpisode(applied.episode);
      setActiveActionId(applied.episode.selectedActionId);
      const planMutationLatencyMs = Math.max(
        0,
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started,
      );
      recordAdaptiveDecisionTelemetry({
        name: 'decision_plan_applied',
        questionType: applied.episode.question.type,
        operationCount: applied.episode.appliedPlanPatch.operations.length,
        elapsedMs: planMutationLatencyMs,
        planMutationLatencyMs,
        fixtureOnly: false,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [activeActionId, busy, data.scheduleBlocks, episode, onApplySchedulePatch, persistEpisode]);

  const undo = useCallback(() => {
    if (!episode?.appliedPlanPatch || busy) return;
    setBusy(true);
    setError('');
    try {
      const undone = undoAppliedDecision({
        episode,
        scheduleBlocks: data.scheduleBlocks || [],
        undoneAt: new Date().toISOString(),
      });
      onUndoSchedulePatch(episode.appliedPlanPatch);
      persistEpisode(undone.episode);
      setEpisode(undone.episode);
      setActiveActionId(undone.episode.candidateActions[0]?.id);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_undo_used',
        questionType: episode.question.type,
        fixtureOnly: false,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [busy, data.scheduleBlocks, episode, onUndoSchedulePatch, persistEpisode]);

  const updateOutcome = useCallback((patch: Partial<OwnerOutcome>) => {
    setOutcome((current) => ({ ...current, ...patch }));
    setError('');
  }, []);

  const saveOutcome = useCallback(() => {
    if (!episode?.followUpPlan) return;
    const missing = validateDecisionOutcome(episode.followUpPlan, outcome);
    if (missing.length > 0) {
      setError(copy('adaptiveOutcomeMissing', { fields: missing.join(', ') }));
      return;
    }
    try {
      const next = recordDecisionOutcome(episode, outcome, new Date().toISOString());
      persistEpisode(next);
      setEpisode(next);
      setView('memory');
      recordAdaptiveDecisionTelemetry({
        name: 'decision_follow_up_completed',
        questionType: next.question.type,
        usefulness: outcome.usefulness,
        fixtureOnly: false,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [copy, episode, outcome, persistEpisode]);

  const skipOutcome = useCallback(() => {
    if (!episode) return;
    const next = skipDecisionFollowUp(episode, new Date().toISOString());
    persistEpisode(next);
    setEpisode(next);
    setView('memory');
  }, [episode, persistEpisode]);

  const footer = useMemo(() => view === 'follow_up' ? (
    <V11StickySheetFooter
      cancelLabel={copy('adaptiveSkipFollowUp')}
      onCancel={skipOutcome}
      onSave={saveOutcome}
      saveLabel={copy('adaptiveSaveOutcome')}
      saving={busy}
      theme={theme}
    />
  ) : undefined, [busy, copy, saveOutcome, skipOutcome, theme, view]);

  const selectedAction = episode?.candidateActions.find((candidate) => candidate.id === episode.selectedActionId);
  const selectedCopy = selectedAction ? candidateCopy(lang, selectedAction) : null;
  const canApply = Boolean(
    activeActionId
    && episode
    && (episode.status === 'PROPOSED' || episode.status === 'ACCEPTED')
    && episode.safetyStatus.level !== 'blocked'
    && episode.candidateActions.some((candidate) => candidate.id === activeActionId),
  );

  return (
    <V11Stage2ProductionSheet
      closeLabel={copy('cancel')}
      footer={footer}
      minHeight={500}
      onClose={onClose}
      reducedMotion={reducedMotion}
      theme={theme}
      title={copy('adaptiveOwnerSheetTitle')}
      visible={visible}
    >
      {view === 'loading' ? (
        <View accessibilityLiveRegion="polite" style={styles.loading}>
          <Text style={[styles.loadingTitle, { color: theme.text.primary }]}>{copy('adaptiveCoreLoadingTitle')}</Text>
          <Text style={[styles.meta, { color: theme.text.secondary }]}>{copy('adaptiveCoreLoadingMeta')}</Text>
          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.control.error }]}>{error}</Text> : null}
        </View>
      ) : null}

      {episode && view === 'decision' ? (
        <AdaptiveDecisionWorkspace
          activeActionId={activeActionId}
          answers={answers}
          busy={busy}
          canApply={canApply}
          embedded
          episode={episode}
          error={error}
          lang={lang}
          onAnswer={answerQuestion}
          onApply={apply}
          onSelectAction={selectAction}
          onUndo={undo}
          reducedMotion={reducedMotion}
          scheduleBlocks={data.scheduleBlocks || []}
          showTopbar={false}
          theme={theme}
          themeMode={theme.mode}
        />
      ) : null}

      {episode && view === 'follow_up' ? (
        <View style={styles.stack}>
          <Text style={[styles.eyebrow, { color: theme.text.metadata }]}>{copy('adaptiveFollowUpDue')}</Text>
          <Text style={[styles.heading, { color: theme.text.primary }]}>{copy('adaptiveHowDidAdjustmentGo')}</Text>
          {required(episode, 'state') ? (
            <View style={styles.outcomeGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeState')}</Text>
              <V11DiscreteNumericRail onChange={(state) => updateOutcome({ state })} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: copy(`adaptiveState${value}`) }))} theme={theme} value={outcome.state ?? 0} />
            </View>
          ) : null}
          {required(episode, 'fatigue') ? (
            <View style={styles.outcomeGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeFatigue')}</Text>
              <V11DiscreteNumericRail onChange={(fatigue) => updateOutcome({ fatigue })} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: copy(`adaptiveState${value}`) }))} theme={theme} value={outcome.fatigue ?? 0} />
            </View>
          ) : null}
          {required(episode, 'task_result') ? (
            <View style={styles.outcomeGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeTask')}</Text>
              <View style={styles.chipRow}>{(['completed', 'partially_completed', 'not_completed'] as const).map((value) => (
                <V11CategoricalChip accessibilityRole="radio" key={value} label={copy(`adaptiveTaskResult_${value}`)} onPress={() => updateOutcome({ taskResult: value })} selected={outcome.taskResult === value} theme={theme} tone="neutral" />
              ))}</View>
            </View>
          ) : null}
          {required(episode, 'carryover') ? (
            <View style={styles.outcomeGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeCarryover')}</Text>
              <View style={styles.chipRow}>{(['none', 'some', 'significant'] as const).map((value) => (
                <V11CategoricalChip accessibilityRole="radio" key={value} label={copy(`adaptiveCarryover_${value}`)} onPress={() => updateOutcome({ carryover: value })} selected={outcome.carryover === value} theme={theme} tone="neutral" />
              ))}</View>
            </View>
          ) : null}
          {required(episode, 'usefulness') ? (
            <View style={styles.outcomeGroup}>
              <Text style={[styles.label, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeUseful')}</Text>
              <View style={styles.chipRow}>{(['helpful', 'uncertain', 'not_helpful'] as const).map((value) => (
                <V11CategoricalChip accessibilityRole="radio" key={value} label={copy(`adaptiveUsefulness_${value}`)} onPress={() => updateOutcome({ usefulness: value })} selected={outcome.usefulness === value} theme={theme} tone="neutral" />
              ))}</View>
            </View>
          ) : null}
          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.control.error }]}>{error}</Text> : null}
        </View>
      ) : null}

      {episode && view === 'memory' ? (
        <View style={styles.stack}>
          <Text style={[styles.eyebrow, { color: theme.text.metadata }]}>{copy('adaptiveDecisionMemory')}</Text>
          <Text style={[styles.heading, { color: theme.text.primary }]}>{copy('adaptiveEpisodeRemembered')}</Text>
          <View style={[styles.memory, { backgroundColor: theme.control.neutralSurface }]}> 
            <Text style={[styles.label, { color: theme.text.metadata }]}>{copy('adaptiveMemoryChoice')}</Text>
            <Text style={[styles.memoryValue, { color: theme.text.primary }]}>{selectedCopy?.title ?? copy('adaptiveSurfaceNoChange')}</Text>
            <Text style={[styles.meta, { color: theme.text.secondary }]}>{copy('adaptiveOneEpisodeNotPattern')}</Text>
          </View>
          <V11SheetButton label={copy('adaptiveCoreStartAnother')} onPress={startNewDecision} theme={theme} variant="secondary" />
        </View>
      ) : null}
    </V11Stage2ProductionSheet>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 220, width: '100%', justifyContent: 'center', gap: 8 },
  loadingTitle: { fontSize: 22, lineHeight: 29, fontWeight: '500' },
  stack: { width: '100%', gap: 18 },
  heading: { fontSize: 26, lineHeight: 33, fontWeight: '500' },
  eyebrow: { fontSize: 10, lineHeight: 15, fontWeight: '600', letterSpacing: 1.05, textTransform: 'uppercase' },
  label: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  meta: { fontSize: 13, lineHeight: 19 },
  outcomeGroup: { gap: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memory: { width: '100%', borderRadius: 18, padding: 16, gap: 7 },
  memoryValue: { fontSize: 18, lineHeight: 25, fontWeight: '500' },
  error: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
