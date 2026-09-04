import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../i18n';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import { getV11ThemeTokens, type V11ThemeMode } from '../v11/tokens';
import V11Stage2ProductionSheet from '../v11-stage2-rebaseline/V11Stage2ProductionSheet';
import AdaptiveDecisionWorkspace from './AdaptiveDecisionWorkspace';
import {
  answerDecisionSurfaceQuestion,
  applyDecisionSurface,
  canApplyDecisionSurface,
  createDecisionSurfaceSession,
  selectDecisionSurfaceAction,
  undoDecisionSurface,
  type DecisionSurfaceDemoOptionsV2,
} from './decisionSurfaceFlow';
import type { AdaptiveDecisionDemoScenarioId } from './demoFixtures';
import { adaptiveText } from './presentation';
import { recordAdaptiveDecisionTelemetry } from './telemetry';

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

export default function AdaptiveDecisionSurfaceScreen() {
  const route = useMemo(routeOptions, []);
  const theme = getV11ThemeTokens(route.themeMode);
  const reducedMotion = useV11ReducedMotion();
  const [session, setSession] = useState(() => createDecisionSurfaceSession({
    scenario: route.scenario,
    lang: route.lang,
    options: route.demoOptions,
  }));
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState('');
  const canApply = canApplyDecisionSurface(session);
  const copy = (key: string) => adaptiveText(route.lang, key);

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

  return (
    <View style={[styles.fixtureBackground, { backgroundColor: theme.field.background }]}>
      {!visible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setVisible(true)}
          style={[styles.reopen, { backgroundColor: theme.control.neutralSurface }]}
        >
          <Text style={[styles.reopenText, { color: theme.text.primary }]}>{copy('adaptiveOwnerEntryAction')}</Text>
        </Pressable>
      ) : null}
      <V11Stage2ProductionSheet
        closeLabel={copy('cancel')}
        minHeight={500}
        onClose={() => setVisible(false)}
        reducedMotion={reducedMotion}
        theme={theme}
        title={copy('adaptiveOwnerSheetTitle')}
        visible={visible}
      >
        <AdaptiveDecisionWorkspace
          activeActionId={session.activeActionId}
          answers={session.answers}
          canApply={canApply}
          embedded
          episode={session.episode}
          error={error}
          lang={route.lang}
          onAnswer={(questionId, value) => setSession((current) => answerDecisionSurfaceQuestion(current, questionId, value))}
          onApply={apply}
          onSelectAction={selectAction}
          onUndo={undo}
          reducedMotion={reducedMotion}
          scheduleBlocks={session.scheduleBlocks}
          showTopbar={false}
          theme={theme}
          themeMode={route.themeMode}
        />
      </V11Stage2ProductionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fixtureBackground: {
    flex: 1,
    minHeight: '100vh' as any,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopen: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  reopenText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
});
