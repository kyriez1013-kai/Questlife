import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Lang } from '../i18n';
import type { DecisionResult, ScheduleBlock } from '../types';
import {
  V11CategoricalChip,
  V11DiscreteNumericRail,
  V11SheetButton,
  V11StickySheetFooter,
  V11TextField,
} from '../v11/components/V11SheetControls';
import type { V11ThemeTokens } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import { classifyDecisionQuestion } from './contextAssembler';
import {
  applyAcceptedDecision,
  beginDecisionEpisode,
  decisionEpisodeToResult,
  proposeDecisionEpisode,
  selectDecisionAction,
  type DecisionEngineData,
  undoAppliedDecision,
} from './decisionEngine';
import type {
  DecisionEpisodeV1,
  DecisionFollowUpOutcomeV1,
  DecisionMissingQuestionV1,
  DecisionQuestionType,
} from './decisionEpisode';
import { transitionDecisionEpisode } from './decisionEpisode';
import {
  markDecisionFollowUpDue,
  recordDecisionOutcome,
  skipDecisionFollowUp,
  validateDecisionOutcome,
} from './followUp';
import {
  adaptiveText,
  candidateCopy,
  contextFactLabel,
  evidenceItemText,
  horizonLabel,
  planOperationText,
  questionTypeLabel,
} from './presentation';
import { recordAdaptiveDecisionTelemetry } from './telemetry';

type OwnerView = 'entry' | 'question' | 'proposals' | 'preview' | 'receipt' | 'follow_up' | 'memory';
type OwnerOutcome = Omit<DecisionFollowUpOutcomeV1, 'id' | 'recordedAt'>;

type Props = {
  data: DecisionEngineData;
  decisionResults: DecisionResult[];
  lang: Lang;
  onAddDecisionResult: (
    result: ReturnType<typeof decisionEpisodeToResult>,
  ) => DecisionResult;
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
  return `decision-owner-${suffix}`;
}

function viewForEpisode(episode: DecisionEpisodeV1): OwnerView {
  if (episode.status === 'NEEDS_INPUT') return 'question';
  if (episode.status === 'ACCEPTED') return 'preview';
  if (episode.status === 'APPLIED') return 'receipt';
  if (episode.status === 'FOLLOW_UP_DUE') return 'follow_up';
  if (episode.status === 'OUTCOME_RECORDED' || episode.status === 'CLOSED') return 'memory';
  if (episode.status === 'PROPOSED' || episode.status === 'READY' || episode.status === 'ABSTAINED') return 'proposals';
  return 'entry';
}

function latestOwnerEpisode(results: DecisionResult[]): DecisionEpisodeV1 | null {
  return results
    .map((result) => result.decisionEpisode)
    .filter((episode): episode is DecisionEpisodeV1 => episode?.subject.kind === 'owner')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

function required(
  episode: DecisionEpisodeV1,
  field: 'state' | 'fatigue' | 'task_result' | 'carryover' | 'usefulness',
): boolean {
  return episode.followUpPlan?.requiredFields.includes(field) ?? false;
}

function factValue(
  lang: Lang,
  value: string | number | boolean | undefined,
  unit?: string,
): string {
  if (value == null) return '—';
  const displayUnit = unit === 'minutes' ? adaptiveText(lang, 'minutes') : unit;
  return `${String(value)}${displayUnit ? ` ${displayUnit}` : ''}`;
}

function compactDateTime(value: string, lang: Lang): string {
  return new Date(value).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-AU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdaptiveDecisionLoopOwnerSheet({
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
  const [episode, setEpisode] = useState<DecisionEpisodeV1 | null>(null);
  const [view, setView] = useState<OwnerView>('entry');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [customQuestion, setCustomQuestion] = useState('');
  const [outcome, setOutcome] = useState<OwnerOutcome>({});
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [persistedEpisodeId, setPersistedEpisodeId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const latest = latestOwnerEpisode(decisionResults);
    if (!latest) {
      setEpisode(null);
      setView('entry');
      setPersistedEpisodeId(null);
      return;
    }
    const due = markDecisionFollowUpDue(latest, new Date().toISOString());
    if (due.status !== latest.status || due.followUpPlan?.status !== latest.followUpPlan?.status) {
      onUpdateDecisionEpisode(due.id, due);
    }
    setEpisode(due);
    setView(viewForEpisode(due));
    setPersistedEpisodeId(due.id);
    setError('');
  }, [decisionResults, onUpdateDecisionEpisode, visible]);

  const selectedAction = episode?.candidateActions.find((candidate) => candidate.id === episode.selectedActionId);
  const selectedCopy = selectedAction ? candidateCopy(lang, selectedAction) : null;
  const evidence = episode?.evidencePacket;

  const persistEpisode = useCallback((next: DecisionEpisodeV1) => {
    if (persistedEpisodeId === next.id || decisionResults.some((result) => result.id === next.id)) {
      onUpdateDecisionEpisode(next.id, next);
    } else {
      onAddDecisionResult(decisionEpisodeToResult({
        episode: next,
        headline: next.question.text ?? questionTypeLabel(lang, next.question.type),
      }));
      setPersistedEpisodeId(next.id);
    }
  }, [decisionResults, lang, onAddDecisionResult, onUpdateDecisionEpisode, persistedEpisodeId]);

  const resetToEntry = useCallback(() => {
    setEpisode(null);
    setView('entry');
    setAnswers({});
    setCustomQuestion('');
    setOutcome({});
    setEvidenceOpen(false);
    setPersistedEpisodeId(null);
    setError('');
  }, []);

  const runProposal = useCallback((draft: DecisionEpisodeV1, nextAnswers: Record<string, string>) => {
    setBusy(true);
    setError('');
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const proposed = proposeDecisionEpisode({
        episode: draft,
        data,
        answers: nextAnswers,
        now: new Date().toISOString(),
      });
      const elapsedMs = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      persistEpisode(proposed);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_context_assembled',
        questionType: proposed.question.type,
        contextFactCount: proposed.contextSnapshot?.facts.length ?? 0,
        missingQuestionCount: proposed.missingContext.length,
        elapsedMs,
        fixtureOnly: false,
      });
      recordAdaptiveDecisionTelemetry({
        name: proposed.missingContext.length > 0 ? 'decision_missing_questions_shown' : 'decision_proposals_ready',
        questionType: proposed.question.type,
        missingQuestionCount: proposed.missingContext.length,
        proposalCount: proposed.candidateActions.length,
        elapsedMs,
        fixtureOnly: false,
      });
      setEpisode(proposed);
      setAnswers(nextAnswers);
      setView(viewForEpisode(proposed));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [data, persistEpisode]);

  const begin = useCallback((questionType: DecisionQuestionType, questionText: string) => {
    const now = new Date().toISOString();
    const draft = beginDecisionEpisode({
      id: ownerEpisodeId(),
      questionType,
      questionText,
      subjectKind: 'owner',
      now,
      timezone: timezone(),
      observationWindowStart: observationWindowStart(now),
    });
    recordAdaptiveDecisionTelemetry({ name: 'decision_flow_opened', questionType, fixtureOnly: false });
    runProposal(draft, {});
  }, [runProposal]);

  const submitCustom = useCallback(() => {
    const text = customQuestion.trim();
    if (!text) return;
    begin(classifyDecisionQuestion(text), text);
  }, [begin, customQuestion]);

  const submitAnswers = useCallback(() => {
    if (!episode || episode.missingContext.some((question) => !answers[question.id])) return;
    runProposal(episode, answers);
  }, [answers, episode, runProposal]);

  const chooseProposal = useCallback((id: string) => {
    if (!episode) return;
    try {
      const next = selectDecisionAction(episode, id, new Date().toISOString());
      persistEpisode(next);
      setEpisode(next);
      setView('preview');
      recordAdaptiveDecisionTelemetry({ name: 'decision_proposal_selected', questionType: next.question.type, fixtureOnly: false });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, [episode, persistEpisode]);

  const backToProposals = useCallback(() => {
    if (!episode || episode.status !== 'ACCEPTED') return;
    const next = {
      ...transitionDecisionEpisode(episode, 'PROPOSED', new Date().toISOString()),
      selectedActionId: undefined,
      proposedPlanPatch: undefined,
    };
    persistEpisode(next);
    setEpisode(next);
    setView('proposals');
  }, [episode, persistEpisode]);

  const applyPlan = useCallback(() => {
    if (!episode) return;
    setBusy(true);
    setError('');
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const applied = applyAcceptedDecision({
        episode,
        scheduleBlocks: data.scheduleBlocks,
        appliedAt: new Date().toISOString(),
      });
      if (!applied.episode.appliedPlanPatch) throw new Error('Decision plan patch was not created.');
      onApplySchedulePatch(applied.episode.appliedPlanPatch);
      persistEpisode(applied.episode);
      setEpisode(applied.episode);
      setView('receipt');
      recordAdaptiveDecisionTelemetry({
        name: 'decision_plan_applied',
        questionType: applied.episode.question.type,
        operationCount: applied.episode.appliedPlanPatch.operations.length,
        elapsedMs: Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started),
        fixtureOnly: false,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [data.scheduleBlocks, episode, onApplySchedulePatch, persistEpisode]);

  const undoPlan = useCallback(() => {
    if (!episode?.appliedPlanPatch) return;
    setBusy(true);
    setError('');
    try {
      const undone = undoAppliedDecision({
        episode,
        scheduleBlocks: data.scheduleBlocks,
        undoneAt: new Date().toISOString(),
      });
      onUndoSchedulePatch(episode.appliedPlanPatch);
      persistEpisode(undone.episode);
      setEpisode(undone.episode);
      setView('proposals');
      recordAdaptiveDecisionTelemetry({ name: 'decision_undo_used', questionType: episode.question.type, fixtureOnly: false });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, [data.scheduleBlocks, episode, onUndoSchedulePatch, persistEpisode]);

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

  const footer = useMemo(() => {
    if (view === 'question') {
      return (
        <V11StickySheetFooter
          cancelLabel={copy('cancel')}
          disabled={!episode || episode.missingContext.some((question) => !answers[question.id])}
          onCancel={onClose}
          onSave={submitAnswers}
          saveLabel={copy('adaptiveShowProposals')}
          saving={busy}
          theme={theme}
        />
      );
    }
    if (view === 'preview') {
      return (
        <V11StickySheetFooter
          cancelLabel={copy('adaptiveBackToOptions')}
          onCancel={backToProposals}
          onSave={applyPlan}
          saveLabel={copy('adaptiveConfirmAndApply')}
          saving={busy}
          theme={theme}
        />
      );
    }
    if (view === 'receipt') {
      return (
        <V11StickySheetFooter
          cancelLabel={copy('adaptiveUndoExactChange')}
          disabled={!episode?.undoState.available}
          onCancel={undoPlan}
          onSave={onClose}
          saveLabel={copy('adaptiveOwnerClose')}
          saving={busy}
          theme={theme}
        />
      );
    }
    if (view === 'follow_up') {
      return (
        <V11StickySheetFooter
          cancelLabel={copy('adaptiveSkipFollowUp')}
          onCancel={skipOutcome}
          onSave={saveOutcome}
          saveLabel={copy('adaptiveSaveOutcome')}
          saving={busy}
          theme={theme}
        />
      );
    }
    return undefined;
  }, [answers, applyPlan, backToProposals, busy, copy, episode, onClose, saveOutcome, skipOutcome, submitAnswers, theme, undoPlan, view]);

  const sectionStyle = {
    backgroundColor: theme.control.neutralSurface,
    borderColor: theme.control.neutralBorder,
  };
  const ownerChoices: Array<{ type: DecisionQuestionType; labelKey: string; promptKey: string }> = [
    { type: 'training_recovery', labelKey: 'adaptiveOwnerTrainingQuestion', promptKey: 'adaptiveOwnerTrainingPrompt' },
    { type: 'cognitive_adjustment', labelKey: 'adaptiveOwnerCognitiveQuestion', promptKey: 'adaptiveOwnerCognitivePrompt' },
    { type: 'overloaded_day', labelKey: 'adaptiveOwnerOverloadedQuestion', promptKey: 'adaptiveOwnerOverloadedPrompt' },
  ];

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
      <View style={styles.content}>
        {view === 'entry' ? (
          <View style={styles.stack}>
            <Text style={[styles.intro, { color: theme.text.secondary }]}>{copy('adaptiveOwnerEntryMeta')}</Text>
            {ownerChoices.map((choice) => (
              <Pressable
                accessibilityLabel={copy(choice.labelKey)}
                accessibilityRole="button"
                key={choice.type}
                onPress={() => begin(choice.type, copy(choice.promptKey))}
                style={[styles.entryRow, sectionStyle]}
              >
                <View style={styles.flexCopy}>
                  <Text style={[styles.rowTitle, { color: theme.text.primary }]}>{copy(choice.labelKey)}</Text>
                  <Text style={[styles.rowMeta, { color: theme.text.secondary }]}>{copy(choice.promptKey)}</Text>
                </View>
                <Text style={[styles.arrow, { color: theme.text.metadata }]}>›</Text>
              </Pressable>
            ))}
            <View style={styles.customBlock}>
              <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveOwnerOtherQuestion')}</Text>
              <V11TextField
                accessibilityLabel={copy('adaptiveCustomQuestion')}
                multiline
                onChangeText={setCustomQuestion}
                placeholder={copy('adaptiveCustomQuestionPlaceholder')}
                theme={theme}
                value={customQuestion}
              />
              <V11SheetButton
                disabled={!customQuestion.trim()}
                label={copy('adaptiveAnalyze')}
                loading={busy}
                onPress={submitCustom}
                theme={theme}
                variant="primary"
              />
            </View>
            <Text style={[styles.note, { color: theme.text.metadata }]}>{copy('adaptiveOwnerPrivacy')}</Text>
          </View>
        ) : null}

        {episode && view !== 'entry' ? (
          <View style={styles.stack}>
            <View style={styles.headingBlock}>
              <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{questionTypeLabel(lang, episode.question.type)}</Text>
              <Text style={[styles.heading, { color: theme.text.primary }]}>{episode.question.text ?? questionTypeLabel(lang, episode.question.type)}</Text>
              <Text style={[styles.note, { color: theme.text.metadata }]}>{copy('adaptiveAsOf', { value: compactDateTime(episode.time.asOf, lang) })}</Text>
            </View>

            <View style={[styles.section, sectionStyle]}>
              <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveContextAssembled')}</Text>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{copy('adaptiveUsedKnownContext', { count: episode.contextSnapshot?.facts.length ?? 0 })}</Text>
              {(episode.contextSnapshot?.facts ?? []).slice(0, 6).map((fact) => (
                <View key={fact.id} style={[styles.factRow, { borderTopColor: theme.control.neutralBorder }]}>
                  <Text style={[styles.factLabel, { color: theme.text.secondary }]}>{contextFactLabel(lang, fact)}</Text>
                  <Text style={[styles.factValue, { color: theme.text.primary }]}>{factValue(lang, fact.value, fact.unit)}</Text>
                </View>
              ))}
              {(episode.contextSnapshot?.facts.length ?? 0) === 0 ? (
                <Text style={[styles.note, { color: theme.text.secondary }]}>{copy('adaptiveOwnerNoQuant')}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {episode && view === 'question' ? (
          <View style={styles.stack}>
            <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveOneMaterialQuestion')}</Text>
            {episode.missingContext.map((question: DecisionMissingQuestionV1) => (
              <View key={question.id} style={[styles.section, sectionStyle]}>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{copy(question.promptKey)}</Text>
                <Text style={[styles.note, { color: theme.text.secondary }]}>{copy(question.materialReasonKey)}</Text>
                <View accessibilityRole="radiogroup" style={styles.chipRow}>
                  {question.options.map((option) => (
                    <V11CategoricalChip
                      accessibilityRole="radio"
                      key={option.value}
                      label={copy(option.labelKey)}
                      onPress={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))}
                      selected={answers[question.id] === option.value}
                      theme={theme}
                      tone="neutral"
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {episode?.status === 'ABSTAINED' ? (
          <View style={[styles.section, sectionStyle]}>
            <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveSafetyGate')}</Text>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{copy('adaptiveSafetyBlocked')}</Text>
            <Text style={[styles.note, { color: theme.text.secondary }]}>{copy('adaptiveSafetyNoPrescription')}</Text>
            <V11SheetButton label={copy('adaptiveOwnerStartNew')} onPress={resetToEntry} theme={theme} variant="secondary" />
          </View>
        ) : null}

        {episode && (view === 'proposals' || view === 'preview') && episode.status !== 'ABSTAINED' ? (
          <View style={styles.stack}>
            <View>
              <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveCandidateActions')}</Text>
              <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{copy('adaptiveChooseOneAction')}</Text>
            </View>
            {episode.candidateActions.map((candidate) => {
              const detail = candidateCopy(lang, candidate);
              const selected = candidate.id === episode.selectedActionId;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  key={candidate.id}
                  onPress={() => chooseProposal(candidate.id)}
                  style={[
                    styles.proposal,
                    sectionStyle,
                    selected && { borderColor: theme.control.neutralSelectedBorder, backgroundColor: theme.control.neutralSelectedSurface },
                  ]}
                >
                  <Text style={[styles.rowTitle, { color: theme.text.primary }]}>{detail.title}</Text>
                  <Text style={[styles.rowMeta, { color: theme.text.secondary }]}>{detail.description}</Text>
                  <Text style={[styles.effect, { color: theme.control.focus }]}>{detail.effect}</Text>
                  <Text style={[styles.note, { color: theme.text.metadata }]}>{copy('adaptiveFollowUp')}: {horizonLabel(lang, candidate.outcomeHorizon)}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {episode && evidence && view !== 'entry' && view !== 'question' && episode.status !== 'ABSTAINED' ? (
          <View style={[styles.section, sectionStyle]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: evidenceOpen }}
              onPress={() => setEvidenceOpen((current) => !current)}
              style={styles.disclosure}
            >
              <View style={styles.flexCopy}>
                <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveEvidence')}</Text>
                <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{copy('adaptiveEvidenceSummary')}</Text>
              </View>
              <Text style={[styles.arrow, { color: theme.text.secondary }]}>{evidenceOpen ? '−' : '+'}</Text>
            </Pressable>
            {(evidenceOpen
              ? evidence.items
              : evidence.items.filter((item) => item.category === 'fact' || item.category === 'personal_comparison' || item.category === 'unknown').slice(0, 3)
            ).map((item) => (
              <View key={item.id} style={[styles.evidenceRow, { borderTopColor: theme.control.neutralBorder }]}>
                <Text style={[styles.evidenceCategory, { color: theme.text.metadata }]}>{copy(`adaptiveEvidenceCategory_${item.category}`)}</Text>
                <Text style={[styles.evidenceText, { color: theme.text.secondary }]}>{evidenceItemText(lang, item)}</Text>
                {item.supportCount != null || item.counterexampleCount != null ? (
                  <Text style={[styles.note, { color: theme.text.metadata }]}>{copy('adaptiveSupportCounter', { support: item.supportCount ?? 0, counter: item.counterexampleCount ?? 0 })}</Text>
                ) : null}
              </View>
            ))}
            {!evidence.personalReference && !evidence.jointModel ? (
              <Text style={[styles.note, { color: theme.text.metadata }]}>{copy('adaptiveOwnerNoQuant')}</Text>
            ) : null}
          </View>
        ) : null}

        {episode && view === 'preview' && selectedAction && selectedCopy ? (
          <View style={[styles.section, sectionStyle]}>
            <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptivePlanPatchPreview')}</Text>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{selectedCopy.title}</Text>
            <Text style={[styles.note, { color: theme.text.secondary }]}>{copy('adaptiveNoMutationBeforeConfirm')}</Text>
            <View style={styles.rationaleGrid}>
              <View><Text style={[styles.factLabel, { color: theme.text.metadata }]}>{copy('adaptiveProtects')}</Text><Text style={[styles.rowMeta, { color: theme.text.primary }]}>{selectedCopy.protects}</Text></View>
              <View><Text style={[styles.factLabel, { color: theme.text.metadata }]}>{copy('adaptiveFeasibility')}</Text><Text style={[styles.rowMeta, { color: theme.text.primary }]}>{selectedCopy.feasibility}</Text></View>
              <View><Text style={[styles.factLabel, { color: theme.text.metadata }]}>{copy('adaptiveUncertainty')}</Text><Text style={[styles.rowMeta, { color: theme.text.primary }]}>{selectedCopy.uncertainty}</Text></View>
            </View>
            {selectedAction.planPatch.operations.length > 0 ? selectedAction.planPatch.operations.map((operation) => (
              <View key={operation.id} style={[styles.patchRow, { borderTopColor: theme.control.neutralBorder }]}>
                <Text style={[styles.evidenceCategory, { color: theme.text.metadata }]}>{copy(`adaptivePatchType_${operation.type}`)}</Text>
                <Text style={[styles.evidenceText, { color: theme.text.primary }]}>{planOperationText(lang, operation)}</Text>
              </View>
            )) : (
              <Text style={[styles.patchRow, { color: theme.text.secondary, borderTopColor: theme.control.neutralBorder }]}>{copy('adaptiveNoScheduleMutation')}</Text>
            )}
          </View>
        ) : null}

        {episode && view === 'receipt' && selectedCopy ? (
          <View style={[styles.section, sectionStyle]}>
            <Text style={[styles.receiptMark, { color: theme.control.focus }]}>✓</Text>
            <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveDecisionApplied')}</Text>
            <Text style={[styles.heading, { color: theme.text.primary }]}>{selectedCopy.title}</Text>
            <Text style={[styles.effect, { color: theme.control.focus }]}>{selectedCopy.effect}</Text>
            <View style={styles.receiptGrid}>
              <View><Text style={[styles.factLabel, { color: theme.text.metadata }]}>{copy('adaptiveUsed')}</Text><Text style={[styles.factValue, { color: theme.text.primary }]}>{copy('adaptiveUsedCount', { count: episode.contextSources.length })}</Text></View>
              <View><Text style={[styles.factLabel, { color: theme.text.metadata }]}>{copy('adaptiveStillUnknown')}</Text><Text style={[styles.factValue, { color: theme.text.primary }]}>{copy('adaptiveUnknownCount', { count: evidence?.items.filter((item) => item.category === 'unknown').length ?? 0 })}</Text></View>
            </View>
            {episode.followUpPlan ? (
              <Text style={[styles.note, { color: theme.text.secondary }]}>{copy('adaptiveOwnerFollowUpPending', { value: compactDateTime(episode.followUpPlan.dueAt, lang) })}</Text>
            ) : null}
          </View>
        ) : null}

        {episode && view === 'follow_up' ? (
          <View style={styles.stack}>
            <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveFollowUpDue')}</Text>
            <Text style={[styles.heading, { color: theme.text.primary }]}>{copy('adaptiveHowDidAdjustmentGo')}</Text>
            {required(episode, 'state') ? (
              <V11DiscreteNumericRail label={copy('adaptiveOutcomeState')} onChange={(state) => updateOutcome({ state })} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: copy(`adaptiveState${value}`) }))} theme={theme} value={outcome.state ?? 3} />
            ) : null}
            {required(episode, 'fatigue') ? (
              <V11DiscreteNumericRail label={copy('adaptiveOutcomeFatigue')} onChange={(fatigue) => updateOutcome({ fatigue })} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: copy(`adaptiveState${value}`) }))} theme={theme} value={outcome.fatigue ?? 3} />
            ) : null}
            {required(episode, 'task_result') ? (
              <View style={styles.outcomeGroup}><Text style={[styles.factLabel, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeTask')}</Text><View style={styles.chipRow}>{(['completed', 'partially_completed', 'not_completed'] as const).map((value) => <V11CategoricalChip accessibilityRole="radio" key={value} label={copy(`adaptiveTaskResult_${value}`)} onPress={() => updateOutcome({ taskResult: value })} selected={outcome.taskResult === value} theme={theme} tone="neutral" />)}</View></View>
            ) : null}
            {required(episode, 'carryover') ? (
              <View style={styles.outcomeGroup}><Text style={[styles.factLabel, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeCarryover')}</Text><View style={styles.chipRow}>{(['none', 'some', 'significant'] as const).map((value) => <V11CategoricalChip accessibilityRole="radio" key={value} label={copy(`adaptiveCarryover_${value}`)} onPress={() => updateOutcome({ carryover: value })} selected={outcome.carryover === value} theme={theme} tone="neutral" />)}</View></View>
            ) : null}
            {required(episode, 'usefulness') ? (
              <View style={styles.outcomeGroup}><Text style={[styles.factLabel, { color: theme.text.secondary }]}>{copy('adaptiveOutcomeUseful')}</Text><View style={styles.chipRow}>{(['helpful', 'uncertain', 'not_helpful'] as const).map((value) => <V11CategoricalChip accessibilityRole="radio" key={value} label={copy(`adaptiveUsefulness_${value}`)} onPress={() => updateOutcome({ usefulness: value })} selected={outcome.usefulness === value} theme={theme} tone="neutral" />)}</View></View>
            ) : null}
          </View>
        ) : null}

        {episode && view === 'memory' ? (
          <View style={[styles.section, sectionStyle]}>
            <Text style={[styles.sectionLabel, { color: theme.text.metadata }]}>{copy('adaptiveDecisionMemory')}</Text>
            <Text style={[styles.heading, { color: theme.text.primary }]}>{copy('adaptiveEpisodeRemembered')}</Text>
            {[
              [copy('adaptiveMemoryQuestion'), episode.question.text ?? questionTypeLabel(lang, episode.question.type)],
              [copy('adaptiveMemoryChoice'), selectedCopy?.title ?? '—'],
              [copy('adaptiveMemoryPlan'), copy('adaptiveOperationCount', { count: episode.appliedPlanPatch?.operations.length ?? 0 })],
              [copy('adaptiveMemoryOutcome'), episode.followUpOutcomes.length > 0 ? copy('adaptiveOutcomeRecorded') : copy('adaptiveSkipFollowUp')],
              [copy('adaptiveMemoryBoundary'), copy('adaptiveOneEpisodeNotPattern')],
            ].map(([label, value]) => (
              <View key={label} style={[styles.memoryRow, { borderTopColor: theme.control.neutralBorder }]}>
                <Text style={[styles.factLabel, { color: theme.text.metadata }]}>{label}</Text>
                <Text style={[styles.evidenceText, { color: theme.text.primary }]}>{value}</Text>
              </View>
            ))}
            <Text style={[styles.note, { color: theme.text.secondary }]}>{copy('adaptiveMemoryObservational')}</Text>
            <V11SheetButton label={copy('adaptiveOwnerStartNew')} onPress={resetToEntry} theme={theme} variant="secondary" />
          </View>
        ) : null}

        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.control.error }]}>{error}</Text> : null}
      </View>
    </V11Stage2ProductionSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: 18,
  },
  stack: {
    width: '100%',
    gap: 14,
  },
  headingBlock: {
    gap: 5,
  },
  intro: {
    fontSize: 14,
    lineHeight: 21,
  },
  heading: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '500',
  },
  section: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  entryRow: {
    width: '100%',
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flexCopy: {
    minWidth: 0,
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 13,
    lineHeight: 19,
  },
  arrow: {
    fontSize: 24,
    lineHeight: 28,
  },
  customBlock: {
    gap: 10,
    paddingTop: 8,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
  },
  factRow: {
    minHeight: 44,
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  factLabel: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  factValue: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'right',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  proposal: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  effect: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  disclosure: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  evidenceRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  evidenceCategory: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  evidenceText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  rationaleGrid: {
    gap: 12,
  },
  patchRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  receiptMark: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
  },
  receiptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  outcomeGroup: {
    gap: 8,
  },
  memoryRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 4,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
});
