import { DecisionQualityEvaluation } from './decisionQuality';
import { DecisionBriefInput, DecisionBriefResult } from './decisionTypes';

export type DecisionPayloadAudit = {
  mode: DecisionBriefInput['mode'];
  trigger: DecisionBriefInput['trigger'];
  latestStateIncluded: boolean;
  contextCount: number;
  contextTypes: {
    sleep: boolean;
    hrv: boolean;
    restingHeartRate: boolean;
    steps: boolean;
    caffeine: boolean;
    workout: boolean;
    foodOrBodyNotes: boolean;
  };
  historyRowsCount: number;
  executionSamplesLast7Days: number;
  last28AggregateAvailable: boolean;
  activeGoalsCount: number;
  modulesCount: number;
  skillsCount: number;
  afterStateDeltaCount: number;
  scheduleBlocksCount: number;
  confirmedPatternsCount: number;
  estimatedBytes: number;
  enoughEvidenceForPersonalizedJudgement: boolean;
  evidenceReasons: string[];
  missingEvidence: string[];
};

export type DecisionGenericDiagnosis = {
  resultSource: string;
  headlineMentionsRealData: boolean;
  firstStepReferencesGoalOrSkill: boolean;
  usesLatestState: boolean;
  usesContext: boolean;
  usesRecentExecution: boolean;
  usesAfterStateOrPatterns: boolean;
  suggestedActionsPresent: boolean;
  genericLowFrictionOnly: boolean;
  failedChecks: string[];
  likelyCauses: string[];
};

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function lower(value: unknown) {
  return String(value || '').toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term.toLowerCase()));
}

export function auditDecisionPayload(payload: DecisionBriefInput): DecisionPayloadAudit {
  const contextLogs = payload.today_context?.recent_context_logs || [];
  const contextText = lower(safeStringify({
    recent_context_logs: contextLogs,
    objective_context_brief: payload.today_context?.objective_context_brief,
  }));
  const historyRows = payload.history_index?.last_7_days || [];
  const executionSamplesLast7Days = historyRows.reduce((sum, row) => {
    const samples = Array.isArray((row as any).samples) ? (row as any).samples.length : 0;
    return sum + samples;
  }, 0);
  const afterStateDeltaCount = historyRows.reduce((sum, row) => {
    const samples = Array.isArray((row as any).samples) ? (row as any).samples : [];
    return sum + samples.filter((sample: any) => !!sample?.afterStateDelta).length;
  }, 0);
  const evidenceReasons: string[] = [];
  const missingEvidence: string[] = [];
  const contextTypes = {
    sleep: typeof payload.today_context?.latest_sleep_minutes === 'number' || includesAny(contextText, ['sleep', '睡眠']),
    hrv: typeof payload.today_context?.hrv === 'number' || contextText.includes('hrv'),
    restingHeartRate: typeof payload.today_context?.resting_heart_rate === 'number' || includesAny(contextText, ['resting', 'heart', '心率']),
    steps: typeof payload.today_context?.steps === 'number' || includesAny(contextText, ['steps', '步数']),
    caffeine: typeof payload.today_context?.caffeine_count === 'number' || includesAny(contextText, ['caffeine', '咖啡', '咖啡因']),
    workout: typeof payload.today_context?.workout_minutes === 'number' || includesAny(contextText, ['workout', '训练', '运动']),
    foodOrBodyNotes: includesAny(contextText, ['food', 'body', 'meal', '吃', '胃', '身体', '疲劳']),
  };
  if (payload.current_state) evidenceReasons.push('latest_state');
  else missingEvidence.push('latest_state');
  if (Object.values(contextTypes).some(Boolean)) evidenceReasons.push('objective_context');
  else missingEvidence.push('objective_context');
  if (executionSamplesLast7Days > 0) evidenceReasons.push('recent_execution');
  else missingEvidence.push('recent_execution');
  if ((payload.profile?.confirmed_patterns || []).length > 0) evidenceReasons.push('confirmed_patterns');
  else missingEvidence.push('confirmed_patterns');
  if (afterStateDeltaCount > 0) evidenceReasons.push('after_state_delta');
  else missingEvidence.push('after_state_delta');

  const last28 = payload.history_index?.last_28_days || {};
  return {
    mode: payload.mode,
    trigger: payload.trigger,
    latestStateIncluded: !!payload.current_state,
    contextCount: contextLogs.length,
    contextTypes,
    historyRowsCount: historyRows.length,
    executionSamplesLast7Days,
    last28AggregateAvailable: Object.keys(last28).length > 0 && ((last28 as any).log_count > 0 || (last28 as any).total_duration > 0),
    activeGoalsCount: (payload.profile?.active_goals || []).length,
    modulesCount: (payload.profile?.modules || []).length,
    skillsCount: (payload.profile?.skills || []).length,
    afterStateDeltaCount,
    scheduleBlocksCount: (payload.schedule_today || []).length,
    confirmedPatternsCount: (payload.profile?.confirmed_patterns || []).length,
    estimatedBytes: safeStringify(payload).length,
    enoughEvidenceForPersonalizedJudgement: !!payload.current_state
      && (Object.values(contextTypes).some(Boolean) || executionSamplesLast7Days >= 2 || (payload.profile?.confirmed_patterns || []).length > 0),
    evidenceReasons,
    missingEvidence,
  };
}

export function diagnoseDecisionOutput(args: {
  payload: DecisionBriefInput;
  result: DecisionBriefResult;
  quality: DecisionQualityEvaluation;
  source: string;
}): DecisionGenericDiagnosis {
  const { payload, result, quality, source } = args;
  const audit = auditDecisionPayload(payload);
  const headline = lower(result.headline_insight);
  const step = lower(result.prescription?.do_first?.step);
  const fullText = lower([
    result.headline_insight,
    result.deep_analysis,
    result.prescription?.do_first?.step,
    result.prescription?.do_first?.why,
    ...(result.patterns_surfaced || []),
  ].join(' '));
  const hasSkillOrGoal = (payload.profile?.skills || []).length > 0 || (payload.profile?.active_goals || []).length > 0;
  const likelyCauses: string[] = [];
  if (source === 'legacy_fallback') likelyCauses.push('visible_result_is_legacy_fallback');
  if (source === 'ai' && quality.flags.generic) likelyCauses.push('ai_output_contains_generic_language');
  if (!audit.enoughEvidenceForPersonalizedJudgement) likelyCauses.push('payload_sparse_for_personalized_judgement');
  if (!audit.latestStateIncluded) likelyCauses.push('missing_latest_state');
  if (!Object.values(audit.contextTypes).some(Boolean)) likelyCauses.push('missing_objective_context');
  if (audit.executionSamplesLast7Days === 0) likelyCauses.push('missing_recent_execution');
  if (audit.afterStateDeltaCount === 0 && audit.confirmedPatternsCount === 0) likelyCauses.push('missing_after_state_or_confirmed_patterns');
  if (quality.flags.tooVague || quality.flags.missingEvidence) likelyCauses.push('quality_gate_flags_weak_specificity_or_evidence');

  return {
    resultSource: source,
    headlineMentionsRealData: includesAny(headline, ['sleep', '睡眠', 'state', '状态', 'hrv', 'steps', '步数', '记录', 'execution', 'schedule', '日程']),
    firstStepReferencesGoalOrSkill: hasSkillOrGoal && includesAny(step, ['skill', '技能', '任务', 'goal', '目标', 'sql', 'python', 'bench', '卧推', '练']),
    usesLatestState: audit.latestStateIncluded && includesAny(fullText, ['state', '状态', '主观', 'check-in']),
    usesContext: Object.values(audit.contextTypes).some(Boolean) && includesAny(fullText, ['sleep', '睡眠', 'hrv', 'steps', '步数', 'context', '上下文', '身体']),
    usesRecentExecution: audit.executionSamplesLast7Days > 0 && includesAny(fullText, ['execution', '执行', '记录', 'recent', '最近']),
    usesAfterStateOrPatterns: (audit.afterStateDeltaCount > 0 || audit.confirmedPatternsCount > 0) && includesAny(fullText, ['pattern', '模式', 'after', '之后', '复评']),
    suggestedActionsPresent: !!String(result.prescription?.do_first?.step || '').trim(),
    genericLowFrictionOnly: includesAny(step, ['low-friction', '低阻力', '低摩擦']) && !includesAny(step, ['sql', 'python', '卧推', '写', '读', '练', 'review', 'practice']),
    failedChecks: quality.checks.filter((check) => !check.passed).map((check) => check.id),
    likelyCauses,
  };
}
