import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { Lang } from '../i18n';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import { V11Pill } from '../v11/components/V11Material';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import {
  getV11ThemeTokens,
  v11Radius,
  v11Spacing,
  v11Typography,
  type V11ThemeMode,
} from '../v11/tokens';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import AdaptiveDecisionEvidenceSheet from './AdaptiveDecisionEvidenceSheet';
import {
  answerDecisionSurfaceQuestion,
  applyDecisionSurface,
  canApplyDecisionSurface,
  createDecisionSurfaceSession,
  selectDecisionSurfaceAction,
  undoDecisionSurface,
  type DecisionSurfaceDemoOptionsV2,
} from './decisionSurfaceFlow';
import { buildDecisionSurfacePresentation } from './decisionSurfacePresentation';
import type { AdaptiveDecisionDemoScenarioId } from './demoFixtures';
import { adaptiveText } from './presentation';
import { recordAdaptiveDecisionTelemetry } from './telemetry';
import './adaptive-decision-surface.css';

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

type RouteOptions = {
  scenario: AdaptiveDecisionDemoScenarioId;
  lang: Lang;
  themeMode: V11ThemeMode;
  demoOptions: DecisionSurfaceDemoOptionsV2;
};

function routeOptions(): RouteOptions {
  if (typeof window === 'undefined') {
    return { scenario: 'training', lang: 'zh', themeMode: 'dark', demoOptions: {} };
  }
  const params = new URLSearchParams(window.location.search);
  const requestedScenario = params.get('scenario');
  return {
    scenario: requestedScenario === 'cognitive' || requestedScenario === 'overloaded'
      ? requestedScenario
      : 'training',
    lang: params.get('lang') === 'en' ? 'en' : 'zh',
    themeMode: params.get('theme') === 'light' ? 'light' : 'dark',
    demoOptions: {
      safety: params.get('safety') === '1',
      sparse: params.get('sparse') === '1',
      missingCurrentState: params.get('missing') === 'state',
    },
  };
}

function dateLabel(value: string, lang: Lang): string {
  return new Date(value).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-AU', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export default function AdaptiveDecisionSurfaceScreen() {
  const route = useMemo(routeOptions, []);
  const theme = getV11ThemeTokens(route.themeMode);
  const reducedMotion = useV11ReducedMotion();
  const [session, setSession] = useState(() => createDecisionSurfaceSession({
    scenario: route.scenario,
    lang: route.lang,
    options: route.demoOptions,
  }));
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [error, setError] = useState('');
  const presentation = useMemo(() => buildDecisionSurfacePresentation({
    episode: session.episode,
    scheduleBlocks: session.scheduleBlocks,
    activeActionId: session.activeActionId,
    lang: route.lang,
  }), [route.lang, session.activeActionId, session.episode, session.scheduleBlocks]);
  const copy = (key: string, values: Record<string, string | number> = {}) => adaptiveText(route.lang, key, values);
  const applied = session.episode.status === 'APPLIED' || session.episode.status === 'FOLLOW_UP_DUE';
  const canApply = canApplyDecisionSurface(session);

  useEffect(() => {
    recordAdaptiveDecisionTelemetry({
      name: 'decision_flow_opened',
      questionType: session.episode.question.type,
      fixtureOnly: true,
    });
    recordAdaptiveDecisionTelemetry({
      name: 'decision_context_assembled',
      questionType: session.episode.question.type,
      contextFactCount: session.episode.contextSnapshot?.facts.length ?? 0,
      missingQuestionCount: session.episode.missingContext.length,
      fixtureOnly: true,
    });
    recordAdaptiveDecisionTelemetry({
      name: session.episode.status === 'NEEDS_INPUT'
        ? 'decision_missing_questions_shown'
        : 'decision_proposals_ready',
      questionType: session.episode.question.type,
      missingQuestionCount: session.episode.missingContext.length,
      proposalCount: session.episode.candidateActions.length,
      fixtureOnly: true,
    });
  }, [route.scenario, route.demoOptions.missingCurrentState, route.demoOptions.safety, route.demoOptions.sparse]);

  const selectAction = (actionId: string) => {
    setSession((current) => selectDecisionSurfaceAction(current, actionId));
    recordAdaptiveDecisionTelemetry({
      name: 'decision_proposal_selected',
      questionType: session.episode.question.type,
      fixtureOnly: true,
    });
  };

  const apply = () => {
    try {
      const next = applyDecisionSurface(session);
      if (next === session) return;
      setSession(next);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_plan_applied',
        questionType: next.episode.question.type,
        operationCount: next.episode.appliedPlanPatch?.operations.length ?? 0,
        fixtureOnly: true,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const undo = () => {
    try {
      const next = undoDecisionSurface(session);
      setSession(next);
      recordAdaptiveDecisionTelemetry({
        name: 'decision_undo_used',
        questionType: next.episode.question.type,
        fixtureOnly: true,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const rootVariables = {
    '--adl2-bg': theme.field.background,
    '--adl2-near': theme.field.near,
    '--adl2-far': theme.field.far,
    '--adl2-text': theme.text.primary,
    '--adl2-muted': theme.text.secondary,
    '--adl2-meta': theme.text.metadata,
    '--adl2-surface': theme.control.neutralSurface,
    '--adl2-surface-raised': theme.control.neutralElevatedSurface,
    '--adl2-border': theme.control.neutralBorder,
    '--adl2-selected': theme.control.neutralSelectedSurface,
    '--adl2-selected-border': theme.control.neutralSelectedBorder,
    '--adl2-action': theme.control.neutralAction,
    '--adl2-action-text': theme.text.primary,
    '--adl2-focus': theme.control.focus,
    '--adl2-primary': theme.glow.primary,
    '--adl2-supporting': theme.glow.supporting,
    '--adl2-overlay': theme.questTheme.colors.overlay,
    '--adl2-error': theme.control.error,
    '--adl2-space-xs': `${v11Spacing.xs}px`,
    '--adl2-space-sm': `${v11Spacing.sm}px`,
    '--adl2-space-md': `${v11Spacing.md}px`,
    '--adl2-space-lg': `${v11Spacing.lg}px`,
    '--adl2-space-xl': `${v11Spacing.xl}px`,
    '--adl2-space-section': `${v11Spacing.section}px`,
    '--adl2-radius-control': `${v11Radius.control}px`,
    '--adl2-radius-panel': `${v11Radius.panel}px`,
    '--adl2-radius-pill': `${v11Radius.pill}px`,
    '--adl2-type-body-size': `${v11Typography.body.fontSize}px`,
    '--adl2-type-body-line': `${v11Typography.body.lineHeight}px`,
    '--adl2-type-label-size': `${v11Typography.label.fontSize}px`,
    '--adl2-type-label-line': `${v11Typography.label.lineHeight}px`,
    '--adl2-type-label-weight': v11Typography.label.fontWeight,
    '--adl2-type-meta-size': `${v11Typography.metadata.fontSize}px`,
    '--adl2-type-meta-line': `${v11Typography.metadata.lineHeight}px`,
  } as any;

  return (
    <WebView
      dataSet={{ 'adl-theme': route.themeMode, 'v11-motion': reducedMotion ? 'reduced' : 'normal' }}
      style={rootVariables}
      uiClass="adl2-root"
    >
      <V11GlowOrb stage={presentation.isSparse ? 'S1' : 'S2'} theme={theme} style={{ position: 'absolute', top: -120, left: '-6%' }} />
      <V11GlowOrb stage="S1" theme={theme} tone="supporting" style={{ position: 'absolute', top: 280, right: '-12%' }} />
      <WebScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        uiClass="adl2-scroll"
      >
        <WebView uiClass="adl2-page">
          <WebView uiClass="adl2-topbar">
            <WebText uiClass="adl2-brand">QUESTLIFE</WebText>
            <WebText uiClass="adl2-date">{dateLabel(session.episode.time.asOf, route.lang)}</WebText>
          </WebView>

          <WebView uiClass="adl2-question-block">
            <WebText uiClass="adl2-eyebrow">{copy('adaptiveSurfaceDecisionLabel')}</WebText>
            <WebText accessibilityRole="header" uiClass="adl2-question">{presentation.question}</WebText>
          </WebView>

          <WebView uiClass="adl2-context-block">
            <WebView uiClass="adl2-section-heading">
              <V11RebaselineIcon color={theme.text.secondary} name="activity" size={16} />
              <WebText uiClass="adl2-context-title">{copy('adaptiveSurfaceAlreadyRead')}</WebText>
            </WebView>
            <WebView uiClass="adl2-context-grid">
              {presentation.contextItems.map((item) => (
                <WebView key={item.id} uiClass="adl2-context-item">
                  <WebText uiClass="adl2-context-label">{item.label}</WebText>
                  <WebText uiClass="adl2-context-value">{item.value}</WebText>
                </WebView>
              ))}
            </WebView>
          </WebView>

          {session.episode.status === 'NEEDS_INPUT' ? (
            <WebView dataSet={{ 'adl-state': 'needs-input' }} uiClass="adl2-missing-block">
              <WebText uiClass="adl2-eyebrow">{copy('adaptiveSurfaceMissingInfo')}</WebText>
              {session.episode.missingContext.map((question) => (
                <WebView key={question.id} uiClass="adl2-inline-question">
                  <WebText uiClass="adl2-inline-question-title">{copy(question.promptKey)}</WebText>
                  <WebView accessibilityRole="radiogroup" uiClass="adl2-answer-row">
                    {question.options.map((option) => (
                      <WebPressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: session.answers[question.id] === option.value }}
                        key={option.value}
                        onPress={() => setSession((current) => answerDecisionSurfaceQuestion(current, question.id, option.value))}
                        uiClass={`adl2-answer${session.answers[question.id] === option.value ? ' is-selected' : ''}`}
                      >
                        <WebText uiClass="adl2-answer-text">{copy(option.labelKey)}</WebText>
                      </WebPressable>
                    ))}
                  </WebView>
                </WebView>
              ))}
            </WebView>
          ) : null}

          {presentation.isAbstained ? (
            <WebView dataSet={{ 'adl-state': 'abstained' }} uiClass="adl2-safety-layout">
              <WebView uiClass="adl2-safety-mark">
                <V11RebaselineIcon color={theme.text.primary} name="activity" size={24} />
              </WebView>
              <WebText uiClass="adl2-recommendation-label">{copy('adaptiveSurfaceSafetyBoundary')}</WebText>
              <WebText uiClass="adl2-safety-title">{copy('adaptiveSurfaceSafetyTitle')}</WebText>
              <WebText uiClass="adl2-safety-copy">{copy('adaptiveSurfaceSafetyBody')}</WebText>
              <WebView uiClass="adl2-safety-plan">
                <WebText uiClass="adl2-safety-plan-text">{copy('adaptiveSurfacePlanNotChanged')}</WebText>
              </WebView>
              <WebPressable accessibilityRole="button" onPress={() => setEvidenceOpen(true)} uiClass="adl2-evidence-link">
                <WebText uiClass="adl2-evidence-link-text">{copy('adaptiveSurfaceViewReadContext')}</WebText>
                <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={16} />
              </WebPressable>
            </WebView>
          ) : null}

          {!presentation.isAbstained && session.episode.status !== 'NEEDS_INPUT' && presentation.primaryAction ? (
            <WebView uiClass="adl2-decision-layout">
              <WebView uiClass="adl2-primary-column">
                {applied ? (
                  <WebView dataSet={{ 'adl-state': 'receipt' }} uiClass="adl2-receipt">
                    <WebView uiClass="adl2-receipt-mark">
                      <V11RebaselineIcon color={theme.text.primary} name="update" size={22} />
                    </WebView>
                    <WebText uiClass="adl2-recommendation-label">{copy('adaptiveSurfaceApplied')}</WebText>
                    <WebText uiClass="adl2-recommendation-title">{presentation.primaryAction.title}</WebText>
                    <WebView uiClass="adl2-plan-diff">
                      {[...presentation.primaryAction.planChanges, ...presentation.primaryAction.protectedItems].map((change) => (
                        <WebView
                          dataSet={{ 'adl-change-kind': change.kind }}
                          key={change.id}
                          uiClass="adl2-plan-row"
                        >
                          <WebText uiClass="adl2-plan-title">{change.title}</WebText>
                          <WebView uiClass="adl2-plan-values">
                            <WebText uiClass="adl2-plan-before">{change.before}</WebText>
                            <WebText uiClass="adl2-plan-arrow">{change.kind === 'unchanged' ? '·' : '→'}</WebText>
                            <WebText uiClass="adl2-plan-after">{change.after}</WebText>
                          </WebView>
                        </WebView>
                      ))}
                    </WebView>
                    <WebText uiClass="adl2-follow-up-note">{copy('adaptiveSurfaceFollowUpLater')}</WebText>
                    <WebPressable accessibilityRole="button" onPress={undo} uiClass="adl2-undo-button">
                      <WebText uiClass="adl2-undo-text">{copy('adaptiveSurfaceUndo')}</WebText>
                    </WebPressable>
                  </WebView>
                ) : (
                  <WebView dataSet={{ 'adl-state': 'resolved' }} uiClass="adl2-recommendation">
                    <WebText uiClass="adl2-recommendation-label">{copy('adaptiveSurfaceRecommendation')}</WebText>
                    <WebText uiClass="adl2-recommendation-title">{presentation.primaryAction.title}</WebText>
                    <WebText uiClass="adl2-recommendation-description">{presentation.primaryAction.description}</WebText>
                    <WebView uiClass="adl2-plan-diff">
                      {[...presentation.primaryAction.planChanges, ...presentation.primaryAction.protectedItems].map((change) => (
                        <WebView
                          dataSet={{ 'adl-change-kind': change.kind }}
                          key={change.id}
                          uiClass="adl2-plan-row"
                        >
                          <WebText uiClass="adl2-plan-title">{change.title}</WebText>
                          <WebView uiClass="adl2-plan-values">
                            <WebText uiClass="adl2-plan-before">{change.before}</WebText>
                            <WebText uiClass="adl2-plan-arrow">{change.kind === 'unchanged' ? '·' : '→'}</WebText>
                            <WebText uiClass="adl2-plan-after">{change.after}</WebText>
                          </WebView>
                        </WebView>
                      ))}
                    </WebView>
                    <WebView uiClass="adl2-outcome-list">
                      {presentation.primaryAction.outcomes.map((outcome) => (
                        <WebView key={outcome} uiClass="adl2-outcome-row">
                          <WebView uiClass="adl2-outcome-mark" />
                          <WebText uiClass="adl2-outcome-text">{outcome}</WebText>
                        </WebView>
                      ))}
                    </WebView>
                  </WebView>
                )}

                {!applied && canApply ? (
                  <WebView uiClass="adl2-apply-wrap">
                    <V11Pill
                      accessibilityLabel={copy('adaptiveSurfaceApply')}
                      contentStyle={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
                      height={58}
                      onPress={apply}
                      reducedMotion={reducedMotion}
                      stage="S2"
                      theme={theme}
                    >
                      <WebText uiClass="adl2-apply-text">{copy('adaptiveSurfaceApply')}</WebText>
                    </V11Pill>
                  </WebView>
                ) : null}
              </WebView>

              <WebView uiClass="adl2-secondary-column">
                <WebView uiClass="adl2-why-block">
                  <WebText uiClass="adl2-eyebrow">{copy('adaptiveSurfaceWhy')}</WebText>
                  {presentation.primaryAction.reasonLines.map((line, index) => (
                    <WebView key={`${index}:${line}`} uiClass="adl2-reason-row">
                      <WebText uiClass="adl2-reason-index">0{index + 1}</WebText>
                      <WebText uiClass="adl2-reason-text">{line}</WebText>
                    </WebView>
                  ))}
                  <WebPressable accessibilityRole="button" onPress={() => setEvidenceOpen(true)} uiClass="adl2-evidence-link">
                    <WebText uiClass="adl2-evidence-link-text">{copy('adaptiveSurfaceFullEvidence')}</WebText>
                    <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={16} />
                  </WebPressable>
                </WebView>

                {!applied && presentation.alternatives.length > 0 ? (
                  <WebView uiClass="adl2-alternatives">
                    <WebText uiClass="adl2-eyebrow">{copy('adaptiveSurfaceOtherChoices')}</WebText>
                    {presentation.alternatives.map((alternative) => (
                      <WebPressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: session.activeActionId === alternative.id }}
                        key={alternative.id}
                        onPress={() => selectAction(alternative.id)}
                        uiClass="adl2-alternative"
                      >
                        <WebView uiClass="adl2-alternative-copy">
                          <WebText uiClass="adl2-alternative-title">{alternative.title}</WebText>
                          <WebText uiClass="adl2-alternative-effect">{alternative.exactEffect}</WebText>
                        </WebView>
                        <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={16} />
                      </WebPressable>
                    ))}
                  </WebView>
                ) : null}
              </WebView>
            </WebView>
          ) : null}

          {presentation.isSparse && !presentation.isAbstained ? (
            <WebText uiClass="adl2-sparse-note">{copy('adaptiveSurfaceSparseBoundary')}</WebText>
          ) : null}
          {error ? <WebText accessibilityRole="alert" uiClass="adl2-error">{error}</WebText> : null}
        </WebView>
      </WebScrollView>

      <AdaptiveDecisionEvidenceSheet
        lang={route.lang}
        onClose={() => setEvidenceOpen(false)}
        presentation={presentation}
        reducedMotion={reducedMotion}
        theme={theme}
        visible={evidenceOpen}
      />
    </WebView>
  );
}
