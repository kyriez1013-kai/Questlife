import type { Lang } from '../i18n';
import type { ScheduleBlock } from '../types';
import {
  applyAcceptedDecision,
  beginDecisionEpisode,
  proposeDecisionEpisode,
  selectDecisionAction,
  undoAppliedDecision,
} from './decisionEngine';
import type { DecisionEpisodeV1 } from './decisionEpisode';
import {
  createAdaptiveDecisionDemoFixture,
  type AdaptiveDecisionDemoFixture,
  type AdaptiveDecisionDemoScenarioId,
} from './demoFixtures';
import { adaptiveText } from './presentation';

export type DecisionSurfaceDemoOptionsV2 = {
  safety?: boolean;
  sparse?: boolean;
  missingCurrentState?: boolean;
};

export type DecisionSurfaceSessionV2 = {
  version: 2;
  scenario: AdaptiveDecisionDemoScenarioId;
  lang: Lang;
  options: DecisionSurfaceDemoOptionsV2;
  episode: DecisionEpisodeV1;
  scheduleBlocks: ScheduleBlock[];
  answers: Record<string, string>;
  activeActionId?: string;
};

function fixtureFor(
  scenario: AdaptiveDecisionDemoScenarioId,
  lang: Lang,
  options: DecisionSurfaceDemoOptionsV2,
): AdaptiveDecisionDemoFixture {
  const fixture = createAdaptiveDecisionDemoFixture(scenario, lang);
  return {
    ...fixture,
    questionText: options.safety
      ? adaptiveText(lang, 'adaptiveSurfaceSafetyQuestion')
      : fixture.questionText,
    data: {
      ...fixture.data,
      stateCheckIns: options.missingCurrentState ? [] : fixture.data.stateCheckIns,
      contextLogs: options.sparse ? [] : fixture.data.contextLogs,
      executionLogs: options.sparse ? [] : fixture.data.executionLogs,
    },
    quantProduct: options.sparse ? undefined : fixture.quantProduct,
    quantAnalysis: options.sparse ? undefined : fixture.quantAnalysis,
  };
}

function propose(
  fixture: AdaptiveDecisionDemoFixture,
  episode: DecisionEpisodeV1,
  answers: Record<string, string>,
): DecisionEpisodeV1 {
  return proposeDecisionEpisode({
    episode,
    data: fixture.data,
    answers,
    quantProduct: fixture.quantProduct,
    quantAnalysis: fixture.quantAnalysis,
    now: fixture.now,
  });
}

export function createDecisionSurfaceSession(input: {
  scenario: AdaptiveDecisionDemoScenarioId;
  lang: Lang;
  options?: DecisionSurfaceDemoOptionsV2;
}): DecisionSurfaceSessionV2 {
  const options = input.options ?? {};
  const fixture = fixtureFor(input.scenario, input.lang, options);
  const answers = { ...(fixture.initialAnswers ?? {}) };
  const draft = beginDecisionEpisode({
    id: `demo-decision-surface-v2-${input.scenario}${options.safety ? '-safety' : ''}${options.sparse ? '-sparse' : ''}`,
    questionType: fixture.questionType,
    questionText: fixture.questionText,
    subjectKind: 'demo',
    now: fixture.now,
    timezone: fixture.timezone,
    observationWindowStart: fixture.observationWindowStart,
  });
  const episode = propose(fixture, draft, answers);
  return {
    version: 2,
    scenario: input.scenario,
    lang: input.lang,
    options,
    episode,
    scheduleBlocks: fixture.data.scheduleBlocks.map((block) => ({ ...block })),
    answers,
    activeActionId: episode.status === 'PROPOSED' ? episode.candidateActions[0]?.id : undefined,
  };
}

export function answerDecisionSurfaceQuestion(
  session: DecisionSurfaceSessionV2,
  questionId: string,
  value: string,
): DecisionSurfaceSessionV2 {
  if (session.episode.status !== 'NEEDS_INPUT') return session;
  const answers = { ...session.answers, [questionId]: value };
  const unanswered = session.episode.missingContext.filter((question) => !answers[question.id]);
  if (unanswered.length > 0) return { ...session, answers };

  const fixture = fixtureFor(session.scenario, session.lang, session.options);
  const episode = propose(fixture, session.episode, answers);
  return {
    ...session,
    answers,
    episode,
    activeActionId: episode.status === 'PROPOSED' ? episode.candidateActions[0]?.id : undefined,
  };
}

export function selectDecisionSurfaceAction(
  session: DecisionSurfaceSessionV2,
  actionId: string,
): DecisionSurfaceSessionV2 {
  if (session.episode.status !== 'PROPOSED') return session;
  if (!session.episode.candidateActions.some((candidate) => candidate.id === actionId)) return session;
  return { ...session, activeActionId: actionId };
}

export function canApplyDecisionSurface(session: DecisionSurfaceSessionV2): boolean {
  return session.episode.status === 'PROPOSED'
    && session.episode.safetyStatus.level !== 'blocked'
    && Boolean(session.activeActionId);
}

export function applyDecisionSurface(session: DecisionSurfaceSessionV2): DecisionSurfaceSessionV2 {
  if (!canApplyDecisionSurface(session) || !session.activeActionId) return session;
  const fixture = fixtureFor(session.scenario, session.lang, session.options);
  const accepted = selectDecisionAction(session.episode, session.activeActionId, fixture.now);
  const applied = applyAcceptedDecision({
    episode: accepted,
    scheduleBlocks: session.scheduleBlocks,
    appliedAt: fixture.now,
  });
  return {
    ...session,
    episode: applied.episode,
    scheduleBlocks: applied.scheduleBlocks,
  };
}

export function undoDecisionSurface(session: DecisionSurfaceSessionV2): DecisionSurfaceSessionV2 {
  if (!session.episode.appliedPlanPatch) return session;
  const fixture = fixtureFor(session.scenario, session.lang, session.options);
  const undone = undoAppliedDecision({
    episode: session.episode,
    scheduleBlocks: session.scheduleBlocks,
    undoneAt: fixture.now,
  });
  return {
    ...session,
    episode: undone.episode,
    scheduleBlocks: undone.scheduleBlocks,
    activeActionId: undone.episode.candidateActions[0]?.id,
  };
}
