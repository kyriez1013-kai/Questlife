import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Lang } from '../i18n';
import type { ScheduleBlock } from '../types';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import { V11GlassSheet, V11Pill } from '../v11/components/V11Material';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import { getV11ThemeTokens, type V11ThemeMode } from '../v11/tokens';
import {
  applyAcceptedDecision,
  beginDecisionEpisode,
  decisionEpisodeToResult,
  proposeDecisionEpisode,
  selectDecisionAction,
  undoAppliedDecision,
} from './decisionEngine';
import type {
  DecisionEpisodeV1,
  DecisionFollowUpOutcomeV1,
  DecisionMissingQuestionV1,
} from './decisionEpisode';
import { transitionDecisionEpisode } from './decisionEpisode';
import { createAdaptiveDecisionDemoFixture, type AdaptiveDecisionDemoScenarioId } from './demoFixtures';
import { classifyDecisionQuestion } from './contextAssembler';
import { markDecisionFollowUpDue, recordDecisionOutcome, validateDecisionOutcome } from './followUp';
import {
  adaptiveText,
  candidateCopy,
  contextFactLabel,
  evidenceItemText,
  horizonLabel,
  planOperationText,
  questionTypeLabel,
} from './presentation';
import {
  clearAdaptiveDecisionTelemetry,
  getAdaptiveDecisionTelemetry,
  recordAdaptiveDecisionTelemetry,
} from './telemetry';
import './adaptive-decision-loop.css';

function createAdaptiveWebComponent(Component: any) {
  return function AdaptiveWebComponent({ uiClass, dataSet, ...props }: any) {
    return (
      <Component
        {...props}
        testID={uiClass}
        dataSet={{
          ...dataSet,
          ...(uiClass ? { adlui: uiClass } : {}),
        }}
      />
    );
  };
}

const WebView = createAdaptiveWebComponent(View);
const WebText = createAdaptiveWebComponent(Text);
const WebPressable = createAdaptiveWebComponent(Pressable);
const WebScrollView = createAdaptiveWebComponent(ScrollView);
const WebTextInput = createAdaptiveWebComponent(TextInput);

type DemoView = 'entry' | 'question' | 'proposals' | 'preview' | 'receipt' | 'follow_up' | 'memory';

type DemoTimings = {
  contextAndProposalMs?: number;
  applyMs?: number;
  undoMs?: number;
  followUpMs?: number;
};

type DemoSession = {
  version: 1;
  episode: DecisionEpisodeV1;
  scheduleBlocks: ScheduleBlock[];
  view: DemoView;
  answers: Record<string, string>;
  customQuestion: string;
  outcome: Omit<DecisionFollowUpOutcomeV1, 'id' | 'recordedAt'>;
  evidenceOpen: boolean;
  developerOpen: boolean;
  timings: DemoTimings;
  error?: string;
};

function routeOptions(): {
  scenario: AdaptiveDecisionDemoScenarioId;
  lang: Lang;
  themeMode: V11ThemeMode;
} {
  if (typeof window === 'undefined') return { scenario: 'training', lang: 'zh', themeMode: 'dark' };
  const params = new URLSearchParams(window.location.search);
  const requestedScenario = params.get('scenario');
  return {
    scenario: requestedScenario === 'cognitive' || requestedScenario === 'overloaded' ? requestedScenario : 'training',
    lang: params.get('lang') === 'en' ? 'en' : 'zh',
    themeMode: params.get('theme') === 'light' ? 'light' : 'dark',
  };
}

function newSession(scenario: AdaptiveDecisionDemoScenarioId, lang: Lang): DemoSession {
  const fixture = createAdaptiveDecisionDemoFixture(scenario, lang);
  return {
    version: 1,
    episode: beginDecisionEpisode({
      id: `demo-decision-${scenario}`,
      questionType: fixture.questionType,
      questionText: fixture.questionText,
      subjectKind: 'demo',
      now: fixture.now,
      timezone: fixture.timezone,
      observationWindowStart: fixture.observationWindowStart,
    }),
    scheduleBlocks: fixture.data.scheduleBlocks.map((block) => ({ ...block })),
    view: 'entry',
    answers: {},
    customQuestion: '',
    outcome: {},
    evidenceOpen: false,
    developerOpen: false,
    timings: {},
  };
}

function sessionKey(scenario: AdaptiveDecisionDemoScenarioId, lang: Lang): string {
  return `questlife_adaptive_decision_demo_v1:${scenario}:${lang}`;
}

function loadSession(scenario: AdaptiveDecisionDemoScenarioId, lang: Lang): DemoSession {
  if (typeof window === 'undefined') return newSession(scenario, lang);
  try {
    const raw = window.sessionStorage.getItem(sessionKey(scenario, lang));
    const parsed = raw ? JSON.parse(raw) as DemoSession : null;
    if (parsed?.version === 1 && parsed.episode?.contractVersion === 'questlife.decision.episode.v1') return parsed;
  } catch {
    // A corrupted demo snapshot must not block the isolated review route.
  }
  return newSession(scenario, lang);
}

function scenarioUrl(id: AdaptiveDecisionDemoScenarioId, lang: Lang, themeMode: V11ThemeMode): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams({
    demo: 'adaptive-decision-loop',
    scenario: id,
    lang,
    theme: themeMode,
  });
  return `${window.location.pathname}?${params.toString()}`;
}

function contextFactValue(value: string | number | boolean | undefined, unit?: string): string {
  if (value == null) return '—';
  return `${String(value)}${unit ? ` ${unit}` : ''}`;
}

function isRequired(
  episode: DecisionEpisodeV1,
  field: 'state' | 'fatigue' | 'task_result' | 'carryover' | 'usefulness',
): boolean {
  return episode.followUpPlan?.requiredFields.includes(field) ?? false;
}

function stageIndex(view: DemoView): number {
  if (view === 'entry') return 0;
  if (view === 'question' || view === 'proposals') return 1;
  if (view === 'preview') return 2;
  if (view === 'receipt') return 3;
  if (view === 'follow_up') return 4;
  return 5;
}

export default function AdaptiveDecisionLoopDemoScreen() {
  const route = useMemo(routeOptions, []);
  const fixture = useMemo(
    () => createAdaptiveDecisionDemoFixture(route.scenario, route.lang),
    [route.lang, route.scenario],
  );
  const theme = getV11ThemeTokens(route.themeMode);
  const reducedMotion = useV11ReducedMotion();
  const [session, setSession] = useState(() => loadSession(route.scenario, route.lang));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(sessionKey(route.scenario, route.lang), JSON.stringify(session));
    } catch {
      // The demo remains usable without session persistence.
    }
  }, [route.lang, route.scenario, session]);

  const copy = (key: string, values: Record<string, string | number> = {}) => adaptiveText(route.lang, key, values);
  const selectedAction = session.episode.candidateActions.find((candidate) => candidate.id === session.episode.selectedActionId);
  const selectedCopy = selectedAction ? candidateCopy(route.lang, selectedAction) : null;
  const decisionMemory = session.view === 'memory'
    ? decisionEpisodeToResult({ episode: session.episode, headline: fixture.title })
    : null;
  const evidence = session.episode.evidencePacket;
  const currentStage = stageIndex(session.view);
  const contextFacts = session.episode.contextSnapshot?.facts ?? [];
  const telemetry = session.developerOpen ? getAdaptiveDecisionTelemetry() : [];

  const reset = () => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(sessionKey(route.scenario, route.lang));
    clearAdaptiveDecisionTelemetry();
    setSession(newSession(route.scenario, route.lang));
  };

  const runProposal = (draft: DecisionEpisodeV1, answers: Record<string, string>) => {
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const proposed = proposeDecisionEpisode({
        episode: draft,
        data: { ...fixture.data, scheduleBlocks: session.scheduleBlocks },
        answers,
        quantProduct: fixture.quantProduct,
        quantAnalysis: fixture.quantAnalysis,
        now: fixture.now,
      });
      const elapsedMs = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_context_assembled',
        questionType: proposed.question.type,
        contextFactCount: proposed.contextSnapshot?.facts.length ?? 0,
        missingQuestionCount: proposed.missingContext.length,
        elapsedMs,
        fixtureOnly: true,
      });
      if (proposed.missingContext.length > 0) {
        recordAdaptiveDecisionTelemetry({
          name: 'decision_missing_questions_shown',
          questionType: proposed.question.type,
          missingQuestionCount: proposed.missingContext.length,
          fixtureOnly: true,
        });
      } else {
        recordAdaptiveDecisionTelemetry({
          name: 'decision_proposals_ready',
          questionType: proposed.question.type,
          proposalCount: proposed.candidateActions.length,
          elapsedMs,
          fixtureOnly: true,
        });
      }
      setSession((current) => ({
        ...current,
        episode: proposed,
        answers,
        view: proposed.status === 'NEEDS_INPUT' ? 'question' : 'proposals',
        timings: { ...current.timings, contextAndProposalMs: elapsedMs },
        error: undefined,
      }));
    } catch (error) {
      setSession((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const openDefaultDecision = () => {
    const draft = beginDecisionEpisode({
      id: `demo-decision-${route.scenario}`,
      questionType: fixture.questionType,
      questionText: fixture.questionText,
      subjectKind: 'demo',
      now: fixture.now,
      timezone: fixture.timezone,
      observationWindowStart: fixture.observationWindowStart,
    });
    recordAdaptiveDecisionTelemetry({
      name: 'decision_flow_opened',
      questionType: fixture.questionType,
      fixtureOnly: true,
    });
    runProposal(draft, {});
  };

  const openCustomDecision = () => {
    const text = session.customQuestion.trim();
    if (!text) return;
    const questionType = classifyDecisionQuestion(text);
    const draft = beginDecisionEpisode({
      id: `demo-decision-${route.scenario}-custom`,
      questionType,
      questionText: text,
      subjectKind: 'demo',
      now: fixture.now,
      timezone: fixture.timezone,
      observationWindowStart: fixture.observationWindowStart,
    });
    recordAdaptiveDecisionTelemetry({ name: 'decision_flow_opened', questionType, fixtureOnly: true });
    runProposal(draft, {});
  };

  const answerMissingQuestion = (question: DecisionMissingQuestionV1, value: string) => {
    setSession((current) => ({
      ...current,
      answers: { ...current.answers, [question.id]: value },
    }));
  };

  const submitMissingAnswers = () => {
    if (session.episode.missingContext.some((question) => !session.answers[question.id])) return;
    runProposal(session.episode, session.answers);
  };

  const selectProposal = (actionId: string) => {
    try {
      const episode = selectDecisionAction(session.episode, actionId, fixture.now);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_proposal_selected',
        questionType: episode.question.type,
        fixtureOnly: true,
      });
      setSession((current) => ({ ...current, episode, view: 'preview', error: undefined }));
    } catch (error) {
      setSession((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const applyPlan = () => {
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const applied = applyAcceptedDecision({
        episode: session.episode,
        scheduleBlocks: session.scheduleBlocks,
        appliedAt: fixture.now,
      });
      const elapsedMs = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_plan_applied',
        questionType: applied.episode.question.type,
        operationCount: applied.episode.appliedPlanPatch?.operations.length ?? 0,
        elapsedMs,
        fixtureOnly: true,
      });
      setSession((current) => ({
        ...current,
        episode: applied.episode,
        scheduleBlocks: applied.scheduleBlocks,
        view: 'receipt',
        timings: { ...current.timings, applyMs: elapsedMs },
        error: undefined,
      }));
    } catch (error) {
      setSession((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const undoPlan = () => {
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const undone = undoAppliedDecision({
        episode: session.episode,
        scheduleBlocks: session.scheduleBlocks,
        undoneAt: fixture.now,
      });
      const elapsedMs = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_undo_used',
        questionType: undone.episode.question.type,
        elapsedMs,
        fixtureOnly: true,
      });
      setSession((current) => ({
        ...current,
        episode: undone.episode,
        scheduleBlocks: undone.scheduleBlocks,
        view: 'proposals',
        timings: { ...current.timings, undoMs: elapsedMs },
        error: undefined,
      }));
    } catch (error) {
      setSession((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const openFollowUp = () => {
    if (!session.episode.followUpPlan) return;
    const episode = markDecisionFollowUpDue(session.episode, session.episode.followUpPlan.dueAt);
    recordAdaptiveDecisionTelemetry({
      name: 'decision_follow_up_due',
      questionType: episode.question.type,
      fixtureOnly: true,
    });
    setSession((current) => ({ ...current, episode, view: 'follow_up', error: undefined }));
  };

  const submitOutcome = () => {
    if (!session.episode.followUpPlan) return;
    const missing = validateDecisionOutcome(session.episode.followUpPlan, session.outcome);
    if (missing.length > 0) {
      setSession((current) => ({ ...current, error: copy('adaptiveOutcomeMissing', { fields: missing.join(', ') }) }));
      return;
    }
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const episode = recordDecisionOutcome(
        session.episode,
        session.outcome,
        session.episode.followUpPlan.dueAt,
      );
      const elapsedMs = Math.max(0, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_follow_up_completed',
        questionType: episode.question.type,
        usefulness: session.outcome.usefulness,
        elapsedMs,
        fixtureOnly: true,
      });
      setSession((current) => ({
        ...current,
        episode,
        view: 'memory',
        timings: { ...current.timings, followUpMs: elapsedMs },
        error: undefined,
      }));
    } catch (error) {
      setSession((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
    }
  };

  const updateOutcome = (patch: Partial<DemoSession['outcome']>) => {
    setSession((current) => ({ ...current, outcome: { ...current.outcome, ...patch }, error: undefined }));
  };

  const rootVariables = {
    '--adl-bg': theme.field.background,
    '--adl-near': theme.field.near,
    '--adl-far': theme.field.far,
    '--adl-text': theme.text.primary,
    '--adl-muted': theme.text.secondary,
    '--adl-meta': theme.text.metadata,
    '--adl-surface': theme.control.neutralSurface,
    '--adl-surface-raised': theme.control.neutralElevatedSurface,
    '--adl-border': theme.control.neutralBorder,
    '--adl-selected': theme.control.neutralSelectedSurface,
    '--adl-selected-border': theme.control.neutralSelectedBorder,
    '--adl-action': theme.control.neutralAction,
    '--adl-action-text': theme.control.neutralActionText,
    '--adl-primary': theme.glow.primary,
    '--adl-supporting': theme.glow.supporting,
    '--adl-error': theme.control.error,
  } as any;

  return (
    <WebView
      uiClass="adl-root"
      dataSet={{ 'adl-theme': route.themeMode, 'v11-motion': reducedMotion ? 'reduced' : 'normal' }}
      style={rootVariables}
    >
      <V11GlowOrb stage="S2" theme={theme} style={{ position: 'absolute', top: -90, left: '8%' }} />
      <V11GlowOrb stage="S1" theme={theme} tone="supporting" style={{ position: 'absolute', top: 220, right: '-6%' }} />
      <WebScrollView
        uiClass="adl-scroll"
        contentContainerStyle={{ paddingBottom: 72 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <WebView uiClass="adl-page">
          <WebView uiClass="adl-topbar">
            <WebView uiClass="adl-brand-block">
              <WebText uiClass="adl-eyebrow">QUESTLIFE · {copy('adaptiveDemoLabel')}</WebText>
              <WebText uiClass="adl-top-title">{copy('adaptiveLoopTitle')}</WebText>
            </WebView>
            <WebView uiClass="adl-top-actions">
              <WebPressable
                accessibilityLabel={copy('adaptiveResetDemo')}
                accessibilityRole="button"
                uiClass="adl-quiet-button"
                onPress={reset}
              >
                <WebText>{copy('adaptiveReset')}</WebText>
              </WebPressable>
            </WebView>
          </WebView>

          <WebView uiClass="adl-scenario-switch" accessibilityRole="tablist">
            {(['training', 'cognitive', 'overloaded'] as AdaptiveDecisionDemoScenarioId[]).map((id) => (
              <WebPressable
                accessibilityRole="tab"
                accessibilityState={{ selected: id === route.scenario }}
                uiClass={`adl-scenario-tab${id === route.scenario ? ' is-selected' : ''}`}
                key={id}
                onPress={() => {
                  if (typeof window !== 'undefined') window.location.assign(scenarioUrl(id, route.lang, route.themeMode));
                }}
              >
                <WebText>{questionTypeLabel(route.lang, createAdaptiveDecisionDemoFixture(id, route.lang).questionType)}</WebText>
              </WebPressable>
            ))}
          </WebView>

          <WebView uiClass="adl-progress" accessibilityLabel={copy('adaptiveFlowProgress')}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <WebView uiClass={`adl-progress-segment${index <= currentStage ? ' is-active' : ''}`} key={index} />
            ))}
          </WebView>

          <WebView uiClass="adl-layout">
            <WebView uiClass="adl-main-column">
              <V11GlassSheet
                contentStyle={{ padding: 0 }}
                minHeight={420}
                reducedMotion={reducedMotion}
                stage="S2"
                theme={theme}
              >
                <WebView uiClass="adl-workspace">
                  <WebView uiClass="adl-workspace-header">
                    <WebText uiClass="adl-kicker">{questionTypeLabel(route.lang, session.episode.question.type)}</WebText>
                    <WebText uiClass="adl-heading">{fixture.title}</WebText>
                    <WebText uiClass="adl-subheading">{fixture.description}</WebText>
                  </WebView>

                  {session.view === 'entry' ? (
                    <WebView uiClass="adl-entry" dataSet={{ 'adl-state': 'entry' }}>
                      <WebText uiClass="adl-section-label">{copy('adaptiveDecisionQuestion')}</WebText>
                      <WebText uiClass="adl-question">{fixture.questionText}</WebText>
                      <V11Pill
                        accessibilityLabel={copy('adaptiveAssembleContext')}
                        contentStyle={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 }}
                        height={58}
                        onPress={openDefaultDecision}
                        reducedMotion={reducedMotion}
                        stage="S2"
                        theme={theme}
                      >
                        <WebText uiClass="adl-primary-pill-text">{copy('adaptiveAssembleContext')}</WebText>
                      </V11Pill>
                      <WebView uiClass="adl-divider-row">
                        <WebView />
                        <WebText>{copy('adaptiveOrAskCustom')}</WebText>
                        <WebView />
                      </WebView>
                      <WebView uiClass="adl-custom-composer">
                        <WebTextInput
                          accessibilityLabel={copy('adaptiveCustomQuestion')}
                          uiClass="adl-custom-input"
                          multiline
                          onChangeText={(customQuestion: string) => setSession((current) => ({ ...current, customQuestion }))}
                          placeholder={copy('adaptiveCustomQuestionPlaceholder')}
                          placeholderTextColor={theme.text.metadata}
                          value={session.customQuestion}
                        />
                        <WebPressable
                          accessibilityRole="button"
                          uiClass="adl-send-button"
                          disabled={!session.customQuestion.trim()}
                          onPress={openCustomDecision}
                        >
                          <WebText>{copy('adaptiveAnalyze')}</WebText>
                        </WebPressable>
                      </WebView>
                      <WebText uiClass="adl-privacy-note">{copy('adaptiveDemoPrivacy')}</WebText>
                    </WebView>
                  ) : null}

                  {session.view !== 'entry' ? (
                    <WebView uiClass="adl-context" dataSet={{ 'adl-state': 'context' }}>
                      <WebView uiClass="adl-section-heading-row">
                        <WebView>
                          <WebText uiClass="adl-section-label">{copy('adaptiveContextAssembled')}</WebText>
                          <WebText uiClass="adl-section-title">{copy('adaptiveUsedKnownContext', { count: contextFacts.length })}</WebText>
                        </WebView>
                        <WebText uiClass="adl-status-chip">{session.episode.status}</WebText>
                      </WebView>
                      <WebView uiClass="adl-context-grid">
                        {contextFacts.slice(0, 6).map((fact) => (
                          <WebView uiClass="adl-context-row" key={fact.id}>
                            <WebView uiClass="adl-context-dot" />
                            <WebView uiClass="adl-context-copy">
                              <WebText uiClass="adl-context-label">{contextFactLabel(route.lang, fact)}</WebText>
                              <WebText uiClass="adl-context-value">{contextFactValue(fact.value, fact.unit)}</WebText>
                            </WebView>
                          </WebView>
                        ))}
                      </WebView>
                      <WebText uiClass="adl-asof">{copy('adaptiveAsOf', { value: session.episode.time.asOf })}</WebText>
                    </WebView>
                  ) : null}

                  {session.view === 'question' ? (
                    <WebView uiClass="adl-question-block" dataSet={{ 'adl-state': 'needs-input' }}>
                      <WebText uiClass="adl-section-label">{copy('adaptiveOneMaterialQuestion')}</WebText>
                      {session.episode.missingContext.map((question) => (
                        <WebView uiClass="adl-missing-question" key={question.id}>
                          <WebText uiClass="adl-section-title">{copy(question.promptKey)}</WebText>
                          <WebText uiClass="adl-helper">{copy(question.materialReasonKey)}</WebText>
                          <WebView uiClass="adl-choice-row">
                            {question.options.map((option) => (
                              <WebPressable
                                accessibilityRole="radio"
                                accessibilityState={{ checked: session.answers[question.id] === option.value }}
                                uiClass={`adl-choice${session.answers[question.id] === option.value ? ' is-selected' : ''}`}
                                key={option.value}
                                onPress={() => answerMissingQuestion(question, option.value)}
                              >
                                <WebText>{copy(option.labelKey)}</WebText>
                              </WebPressable>
                            ))}
                          </WebView>
                        </WebView>
                      ))}
                      <WebPressable
                        accessibilityRole="button"
                        uiClass="adl-primary-button"
                        disabled={session.episode.missingContext.some((question) => !session.answers[question.id])}
                        onPress={submitMissingAnswers}
                      >
                        <WebText>{copy('adaptiveShowProposals')}</WebText>
                      </WebPressable>
                    </WebView>
                  ) : null}

                  {session.episode.status === 'ABSTAINED' ? (
                    <WebView uiClass="adl-safety-panel" dataSet={{ 'adl-state': 'abstained' }}>
                      <WebText uiClass="adl-section-label">{copy('adaptiveSafetyGate')}</WebText>
                      <WebText uiClass="adl-section-title">{copy('adaptiveSafetyBlocked')}</WebText>
                      <WebText uiClass="adl-helper">{copy('adaptiveSafetyNoPrescription')}</WebText>
                    </WebView>
                  ) : null}

                  {(session.view === 'proposals' || session.view === 'preview') && session.episode.status !== 'ABSTAINED' ? (
                    <WebView uiClass="adl-proposals" dataSet={{ 'adl-state': session.view }}>
                      <WebView uiClass="adl-section-heading-row">
                        <WebView>
                          <WebText uiClass="adl-section-label">{copy('adaptiveCandidateActions')}</WebText>
                          <WebText uiClass="adl-section-title">{copy('adaptiveChooseOneAction')}</WebText>
                        </WebView>
                        <WebText uiClass="adl-count-chip">{session.episode.candidateActions.length}</WebText>
                      </WebView>
                      <WebView uiClass="adl-proposal-list">
                        {session.episode.candidateActions.map((candidate) => {
                          const detail = candidateCopy(route.lang, candidate);
                          const selected = candidate.id === session.episode.selectedActionId;
                          return (
                            <WebPressable
                              accessibilityRole="radio"
                              accessibilityState={{ checked: selected }}
                              uiClass={`adl-proposal${selected ? ' is-selected' : ''}`}
                              key={candidate.id}
                              onPress={() => selectProposal(candidate.id)}
                            >
                              <WebView uiClass="adl-proposal-marker" />
                              <WebView uiClass="adl-proposal-copy">
                                <WebText uiClass="adl-proposal-title">{detail.title}</WebText>
                                <WebText uiClass="adl-proposal-description">{detail.description}</WebText>
                                <WebText uiClass="adl-proposal-effect">{detail.effect}</WebText>
                                <WebView uiClass="adl-proposal-meta-row">
                                  <WebText>{copy('adaptiveFollowUp')}: {horizonLabel(route.lang, candidate.outcomeHorizon)}</WebText>
                                  <WebText>{candidate.reversible ? copy('adaptiveReversible') : copy('adaptiveNotReversible')}</WebText>
                                </WebView>
                              </WebView>
                            </WebPressable>
                          );
                        })}
                      </WebView>
                    </WebView>
                  ) : null}

                  {session.view !== 'entry' && session.view !== 'question' && evidence ? (
                    <WebView uiClass="adl-evidence">
                      <WebPressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: session.evidenceOpen }}
                        uiClass="adl-disclosure"
                        onPress={() => setSession((current) => ({ ...current, evidenceOpen: !current.evidenceOpen }))}
                      >
                        <WebView>
                          <WebText uiClass="adl-section-label">{copy('adaptiveEvidence')}</WebText>
                          <WebText uiClass="adl-section-title">{copy('adaptiveEvidenceSummary')}</WebText>
                        </WebView>
                        <WebText>{session.evidenceOpen ? '−' : '+'}</WebText>
                      </WebPressable>
                      <WebView uiClass="adl-evidence-preview">
                        {evidence.items.filter((item) => item.category === 'fact' || item.category === 'personal_comparison' || item.category === 'unknown').slice(0, 3).map((item) => (
                          <WebView uiClass={`adl-evidence-row is-${item.category}`} key={item.id}>
                            <WebText uiClass="adl-evidence-category">{copy(`adaptiveEvidenceCategory_${item.category}`)}</WebText>
                            <WebText uiClass="adl-evidence-text">{evidenceItemText(route.lang, item)}</WebText>
                          </WebView>
                        ))}
                      </WebView>
                      {session.evidenceOpen ? (
                        <WebView uiClass="adl-evidence-detail">
                          {evidence.items.map((item) => (
                            <WebView uiClass={`adl-evidence-row is-${item.category}`} key={`detail-${item.id}`}>
                              <WebView uiClass="adl-evidence-heading">
                                <WebText uiClass="adl-evidence-category">{copy(`adaptiveEvidenceCategory_${item.category}`)}</WebText>
                                {item.supportCount != null || item.counterexampleCount != null ? (
                                  <WebText uiClass="adl-evidence-counts">
                                    {copy('adaptiveSupportCounter', { support: item.supportCount ?? 0, counter: item.counterexampleCount ?? 0 })}
                                  </WebText>
                                ) : null}
                              </WebView>
                              <WebText uiClass="adl-evidence-text">{evidenceItemText(route.lang, item)}</WebText>
                            </WebView>
                          ))}
                          {evidence.jointModel ? (
                            <WebView uiClass="adl-residual-strip">
                              <WebView><WebText>{copy('adaptiveObservedDeviation')}</WebText><WebText>{evidence.jointModel.observedDeviation.toFixed(2)}</WebText></WebView>
                              <WebView><WebText>{copy('adaptiveModelAssociated')}</WebText><WebText>{evidence.jointModel.modelAssociated.toFixed(2)}</WebText></WebView>
                              <WebView><WebText>{copy('adaptiveStillUnexplained')}</WebText><WebText>{evidence.jointModel.unexplainedResidual.toFixed(2)}</WebText></WebView>
                            </WebView>
                          ) : null}
                        </WebView>
                      ) : null}
                    </WebView>
                  ) : null}

                  {session.view === 'preview' && selectedAction && selectedCopy ? (
                    <WebView uiClass="adl-plan-preview" dataSet={{ 'adl-state': 'plan-preview' }}>
                      <WebText uiClass="adl-section-label">{copy('adaptivePlanPatchPreview')}</WebText>
                      <WebText uiClass="adl-section-title">{selectedCopy.title}</WebText>
                      <WebText uiClass="adl-helper">{copy('adaptiveNoMutationBeforeConfirm')}</WebText>
                      <WebView uiClass="adl-proposal-rationale">
                        <WebView><WebText>{copy('adaptiveProtects')}</WebText><WebText>{selectedCopy.protects}</WebText></WebView>
                        <WebView><WebText>{copy('adaptiveFeasibility')}</WebText><WebText>{selectedCopy.feasibility}</WebText></WebView>
                        <WebView><WebText>{copy('adaptiveUncertainty')}</WebText><WebText>{selectedCopy.uncertainty}</WebText></WebView>
                      </WebView>
                      <WebView uiClass="adl-patch-list">
                        {selectedAction.planPatch.operations.length > 0 ? selectedAction.planPatch.operations.map((operation) => (
                          <WebView uiClass="adl-patch-row" key={operation.id}>
                            <WebText uiClass="adl-patch-kind">{copy(`adaptivePatchType_${operation.type}`)}</WebText>
                            <WebText uiClass="adl-patch-text">{planOperationText(route.lang, operation)}</WebText>
                          </WebView>
                        )) : (
                          <WebView uiClass="adl-patch-row"><WebText uiClass="adl-patch-text">{copy('adaptiveNoScheduleMutation')}</WebText></WebView>
                        )}
                        {selectedAction.planPatch.unplacedBlockIds.length > 0 ? (
                          <WebText uiClass="adl-unplaced">{copy('adaptiveUnplacedCount', { count: selectedAction.planPatch.unplacedBlockIds.length })}</WebText>
                        ) : null}
                      </WebView>
                      <WebView uiClass="adl-confirm-row">
                        <WebPressable accessibilityRole="button" uiClass="adl-secondary-button" onPress={() => setSession((current) => ({
                          ...current,
                          episode: {
                            ...transitionDecisionEpisode(current.episode, 'PROPOSED', fixture.now),
                            selectedActionId: undefined,
                            proposedPlanPatch: undefined,
                          },
                          view: 'proposals',
                        }))}>
                          <WebText>{copy('adaptiveBackToOptions')}</WebText>
                        </WebPressable>
                        <WebPressable accessibilityRole="button" uiClass="adl-primary-button" onPress={applyPlan}>
                          <WebText>{copy('adaptiveConfirmAndApply')}</WebText>
                        </WebPressable>
                      </WebView>
                    </WebView>
                  ) : null}

                  {session.view === 'receipt' && selectedAction && selectedCopy ? (
                    <WebView uiClass="adl-receipt" dataSet={{ 'adl-state': 'receipt' }}>
                      <WebText uiClass="adl-receipt-mark">✓</WebText>
                      <WebText uiClass="adl-section-label">{copy('adaptiveDecisionApplied')}</WebText>
                      <WebText uiClass="adl-receipt-title">{selectedCopy.title}</WebText>
                      <WebText uiClass="adl-receipt-effect">{selectedCopy.effect}</WebText>
                      <WebView uiClass="adl-receipt-grid">
                        <WebView><WebText>{copy('adaptiveUsed')}</WebText><WebText>{copy('adaptiveUsedCount', { count: session.episode.contextSources.length })}</WebText></WebView>
                        <WebView><WebText>{copy('adaptiveStillUnknown')}</WebText><WebText>{copy('adaptiveUnknownCount', { count: evidence?.items.filter((item) => item.category === 'unknown').length ?? 0 })}</WebText></WebView>
                        <WebView><WebText>{copy('adaptiveFollowUp')}</WebText><WebText>{session.episode.followUpPlan ? horizonLabel(route.lang, session.episode.followUpPlan.horizon) : '—'}</WebText></WebView>
                      </WebView>
                      <WebView uiClass="adl-confirm-row">
                        <WebPressable accessibilityRole="button" uiClass="adl-secondary-button" onPress={undoPlan}>
                          <WebText>{copy('adaptiveUndoExactChange')}</WebText>
                        </WebPressable>
                        <WebPressable accessibilityRole="button" uiClass="adl-primary-button" onPress={openFollowUp}>
                          <WebText>{copy('adaptiveAdvanceToFollowUp')}</WebText>
                        </WebPressable>
                      </WebView>
                    </WebView>
                  ) : null}

                  {session.view === 'follow_up' ? (
                    <WebView uiClass="adl-follow-up" dataSet={{ 'adl-state': 'follow-up' }}>
                      <WebText uiClass="adl-section-label">{copy('adaptiveFollowUpDue')}</WebText>
                      <WebText uiClass="adl-section-title">{copy('adaptiveHowDidAdjustmentGo')}</WebText>
                      {isRequired(session.episode, 'state') ? (
                        <WebView uiClass="adl-outcome-group">
                          <WebText>{copy('adaptiveOutcomeState')}</WebText>
                          <WebView uiClass="adl-choice-row">{[1, 2, 3, 4, 5].map((value) => <WebPressable accessibilityRole="radio" accessibilityState={{ checked: session.outcome.state === value }} uiClass={`adl-choice is-number${session.outcome.state === value ? ' is-selected' : ''}`} key={value} onPress={() => updateOutcome({ state: value })}><WebText>{value}</WebText></WebPressable>)}</WebView>
                        </WebView>
                      ) : null}
                      {isRequired(session.episode, 'fatigue') ? (
                        <WebView uiClass="adl-outcome-group">
                          <WebText>{copy('adaptiveOutcomeFatigue')}</WebText>
                          <WebView uiClass="adl-choice-row">{[1, 2, 3, 4, 5].map((value) => <WebPressable accessibilityRole="radio" accessibilityState={{ checked: session.outcome.fatigue === value }} uiClass={`adl-choice is-number${session.outcome.fatigue === value ? ' is-selected' : ''}`} key={value} onPress={() => updateOutcome({ fatigue: value })}><WebText>{value}</WebText></WebPressable>)}</WebView>
                        </WebView>
                      ) : null}
                      {isRequired(session.episode, 'task_result') ? (
                        <WebView uiClass="adl-outcome-group">
                          <WebText>{copy('adaptiveOutcomeTask')}</WebText>
                          <WebView uiClass="adl-choice-row">{(['completed', 'partially_completed', 'not_completed'] as const).map((value) => <WebPressable accessibilityRole="radio" accessibilityState={{ checked: session.outcome.taskResult === value }} uiClass={`adl-choice${session.outcome.taskResult === value ? ' is-selected' : ''}`} key={value} onPress={() => updateOutcome({ taskResult: value })}><WebText>{copy(`adaptiveTaskResult_${value}`)}</WebText></WebPressable>)}</WebView>
                        </WebView>
                      ) : null}
                      {isRequired(session.episode, 'carryover') ? (
                        <WebView uiClass="adl-outcome-group">
                          <WebText>{copy('adaptiveOutcomeCarryover')}</WebText>
                          <WebView uiClass="adl-choice-row">{(['none', 'some', 'significant'] as const).map((value) => <WebPressable accessibilityRole="radio" accessibilityState={{ checked: session.outcome.carryover === value }} uiClass={`adl-choice${session.outcome.carryover === value ? ' is-selected' : ''}`} key={value} onPress={() => updateOutcome({ carryover: value })}><WebText>{copy(`adaptiveCarryover_${value}`)}</WebText></WebPressable>)}</WebView>
                        </WebView>
                      ) : null}
                      {isRequired(session.episode, 'usefulness') ? (
                        <WebView uiClass="adl-outcome-group">
                          <WebText>{copy('adaptiveOutcomeUseful')}</WebText>
                          <WebView uiClass="adl-choice-row">{(['helpful', 'uncertain', 'not_helpful'] as const).map((value) => <WebPressable accessibilityRole="radio" accessibilityState={{ checked: session.outcome.usefulness === value }} uiClass={`adl-choice${session.outcome.usefulness === value ? ' is-selected' : ''}`} key={value} onPress={() => updateOutcome({ usefulness: value })}><WebText>{copy(`adaptiveUsefulness_${value}`)}</WebText></WebPressable>)}</WebView>
                        </WebView>
                      ) : null}
                      <WebPressable accessibilityRole="button" uiClass="adl-primary-button" onPress={submitOutcome}>
                        <WebText>{copy('adaptiveSaveOutcome')}</WebText>
                      </WebPressable>
                    </WebView>
                  ) : null}

                  {session.view === 'memory' ? (
                    <WebView uiClass="adl-memory" dataSet={{ 'adl-state': 'memory' }}>
                      <WebText uiClass="adl-section-label">{copy('adaptiveDecisionMemory')}</WebText>
                      <WebText uiClass="adl-receipt-title">{copy('adaptiveEpisodeRemembered')}</WebText>
                      <WebView uiClass="adl-memory-timeline">
                        {[
                          [copy('adaptiveMemoryQuestion'), session.episode.question.text ?? questionTypeLabel(route.lang, session.episode.question.type)],
                          [copy('adaptiveMemoryChoice'), selectedCopy?.title ?? '—'],
                          [copy('adaptiveMemoryPlan'), copy('adaptiveOperationCount', { count: session.episode.appliedPlanPatch?.operations.length ?? 0 })],
                          [copy('adaptiveMemoryOutcome'), copy('adaptiveOutcomeRecorded')],
                          [copy('adaptiveMemoryArtifact'), decisionMemory?.id ?? '—'],
                          [copy('adaptiveMemoryBoundary'), copy('adaptiveOneEpisodeNotPattern')],
                        ].map(([label, value]) => (
                          <WebView uiClass="adl-memory-row" key={label}>
                            <WebText>{label}</WebText>
                            <WebText>{value}</WebText>
                          </WebView>
                        ))}
                      </WebView>
                      <WebText uiClass="adl-helper">{copy('adaptiveMemoryObservational')}</WebText>
                      <WebPressable accessibilityRole="button" uiClass="adl-secondary-button" onPress={reset}>
                        <WebText>{copy('adaptiveRunAgain')}</WebText>
                      </WebPressable>
                    </WebView>
                  ) : null}

                  {session.error ? <WebText uiClass="adl-error" accessibilityRole="alert">{session.error}</WebText> : null}
                </WebView>
              </V11GlassSheet>
            </WebView>

            <WebView uiClass="adl-side-column">
              <WebView uiClass="adl-side-section">
                <WebText uiClass="adl-section-label">{copy('adaptiveCurrentPlan')}</WebText>
                <WebText uiClass="adl-side-title">{copy('adaptivePlanDate', { date: session.scheduleBlocks[0]?.date ?? fixture.data.scheduleBlocks[0]?.date ?? '' })}</WebText>
                <WebView uiClass="adl-schedule-list">
                  {session.scheduleBlocks.slice().sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)).map((block) => (
                    <WebView uiClass={`adl-schedule-row${block.flexibility === 'fixed' ? ' is-fixed' : ''}`} key={block.id}>
                      <WebText uiClass="adl-schedule-time">{block.date === '2025-05-02' ? block.startTime : copy('adaptiveTomorrow')}</WebText>
                      <WebView><WebText uiClass="adl-schedule-title">{block.title}</WebText><WebText uiClass="adl-schedule-meta">{block.plannedMinutes} min · {copy(`adaptiveFlexibility_${block.flexibility}`)}</WebText></WebView>
                    </WebView>
                  ))}
                </WebView>
              </WebView>

              <WebPressable
                accessibilityRole="button"
                accessibilityState={{ expanded: session.developerOpen }}
                uiClass="adl-developer-toggle"
                onPress={() => setSession((current) => ({ ...current, developerOpen: !current.developerOpen }))}
              >
                <WebText>{copy('adaptiveDeveloperReport')}</WebText>
                <WebText>{session.developerOpen ? '−' : '+'}</WebText>
              </WebPressable>
              {session.developerOpen ? (
                <WebView uiClass="adl-developer-report">
                  <WebText>{copy('adaptiveFixtureOnlyWarning')}</WebText>
                  <WebText>{copy('adaptiveAutoContextCount', { count: session.episode.leverage?.contextItemsAutoAssembled ?? 0 })}</WebText>
                  <WebText>{copy('adaptiveQuestionsAvoidedCount', { count: session.episode.leverage?.questionsAvoided ?? 0 })}</WebText>
                  <WebText>{copy('adaptiveQuestionsAskedCount', { count: session.episode.leverage?.questionsAsked ?? 0 })}</WebText>
                  <WebText>{copy('adaptiveTapsCount', { count: session.episode.leverage?.userTaps ?? 0 })}</WebText>
                  <WebText>{copy('adaptiveOperationCount', { count: session.episode.leverage?.planActionsApplied ?? 0 })}</WebText>
                  <WebText>{copy('adaptiveTimingSummary', {
                    proposal: session.timings.contextAndProposalMs?.toFixed(2) ?? '—',
                    apply: session.timings.applyMs?.toFixed(2) ?? '—',
                    followup: session.timings.followUpMs?.toFixed(2) ?? '—',
                  })}</WebText>
                  <WebText>{copy('adaptiveTelemetryCount', { count: telemetry.length })}</WebText>
                </WebView>
              ) : null}
            </WebView>
          </WebView>

          <WebView uiClass="adl-footer-note">
            <WebText>{copy('adaptiveDemoFooter')}</WebText>
            <WebText>{copy('adaptiveContractVersion', { value: session.episode.contractVersion })}</WebText>
          </WebView>
        </WebView>
      </WebScrollView>
    </WebView>
  );
}
