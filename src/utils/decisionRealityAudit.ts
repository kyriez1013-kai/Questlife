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
  historyIndexCount: number;
  executionSamplesLast7Days: number;
  executionRows7d: number;
  executionRows28d: number;
  stateCheckInCount7d: number;
  contextCount24h: number;
  contextCount7d: number;
  contextTypesPresent: string[];
  last28AggregateAvailable: boolean;
  activeGoalsCount: number;
  modulesCount: number;
  skillsCount: number;
  afterStateDeltaCount: number;
  afterStateSampleCount: number;
  scheduleBlocksCount: number;
  confirmedPatternsCount: number;
  acceptedPatternMemoryCount: number;
  candidatePatternsCount: number;
  inferredPatternsCount: number;
  evidenceRichness: 'none' | 'sparse' | 'usable' | 'rich';
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
  acceptedPatternsAvailable: number;
  candidatePatternsAvailable: number;
  acceptedPatternUsed: boolean;
  ignoredAcceptedPatterns: boolean;
  candidateMisuse: boolean;
  populationPriorOnly: boolean;
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

function richnessFor(args: {
  hasState: boolean;
  executionCount: number;
  contextCount: number;
  afterStateCount: number;
  patternCount: number;
}) {
  const categories = [
    args.hasState,
    args.executionCount > 0,
    args.contextCount > 0,
    args.afterStateCount > 0 || args.patternCount > 0,
  ].filter(Boolean).length;
  if (categories === 0) return 'none';
  if (categories === 1) return 'sparse';
  if (categories >= 4) return 'rich';
  return 'usable';
}

export function auditDecisionPayload(payload: DecisionBriefInput): DecisionPayloadAudit {
  const contextLogs = payload.today_context?.recent_context_logs || [];
  const contextSummary = (payload.today_context?.context_summary || {}) as Record<string, any>;
  const contextText = lower(safeStringify({
    recent_context_logs: contextLogs,
    objective_context_brief: payload.today_context?.objective_context_brief,
    context_summary: contextSummary,
  }));
  const historyRows = payload.history_index?.last_7_days || [];
  const executionSamplesLast7Days = historyRows.reduce((sum, row) => {
    const samples = Array.isArray((row as any).samples) ? (row as any).samples.length : 0;
    const events = Array.isArray((row as any).execution_events) ? (row as any).execution_events.length : 0;
    return sum + Math.max(samples, events);
  }, 0);
  const afterStateDeltaCount = historyRows.reduce((sum, row) => {
    const samples = Array.isArray((row as any).samples) ? (row as any).samples : [];
    const events = Array.isArray((row as any).execution_events) ? (row as any).execution_events : [];
    return sum + [...samples, ...events].filter((sample: any) => !!sample?.afterStateDelta).length;
  }, 0);
  const stateCheckInCount7d = Number((payload.state_summary as any)?.count_7d || 0);
  const contextCount24h = Number(contextSummary.count_24h || 0);
  const contextCount7d = Number(contextSummary.count_7d || contextLogs.length || 0);
  const contextTypesPresent = Array.isArray(contextSummary.types_present) ? contextSummary.types_present.map(String) : [];
  const last28 = payload.history_index?.last_28_days || {};
  const executionRows28d = Number((last28 as any).log_count || 0);
  const afterStateSampleCount = Number((payload.after_state_summary as any)?.sample_count || (last28 as any).after_state_sample_count || afterStateDeltaCount || 0);
  const inferredPatternsCount = Math.max(0, (payload.profile?.inferred_patterns_v0 || []).filter((pattern: any) => Number(pattern?.sample_n || 0) > 0).length);
  const confirmedPatternsCount = (payload.profile?.confirmed_patterns || []).length;
  const acceptedPatternMemoryCount = (payload.profile?.confirmed_patterns || []).filter((pattern: any) => typeof pattern?.id === 'string' && pattern.id.startsWith('pattern-')).length;
  const candidatePatternsCount = (payload.profile?.pattern_candidates || []).length;
  const evidenceRichness = richnessFor({
    hasState: !!payload.current_state || stateCheckInCount7d > 0,
    executionCount: Math.max(executionSamplesLast7Days, executionRows28d),
    contextCount: contextCount7d,
    afterStateCount: afterStateSampleCount,
    patternCount: confirmedPatternsCount + inferredPatternsCount,
  });
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
  if (Object.values(contextTypes).some(Boolean) || contextCount7d > 0) evidenceReasons.push('objective_context');
  else missingEvidence.push('objective_context');
  if (executionSamplesLast7Days > 0 || executionRows28d > 0) evidenceReasons.push('recent_execution');
  else missingEvidence.push('recent_execution');
  if (confirmedPatternsCount > 0) evidenceReasons.push('confirmed_patterns');
  else missingEvidence.push('confirmed_patterns');
  if (afterStateSampleCount > 0) evidenceReasons.push('after_state_delta');
  else missingEvidence.push('after_state_delta');

  return {
    mode: payload.mode,
    trigger: payload.trigger,
    latestStateIncluded: !!payload.current_state,
    contextCount: contextLogs.length,
    contextTypes,
    historyRowsCount: historyRows.length,
    historyIndexCount: historyRows.length,
    executionSamplesLast7Days,
    executionRows7d: executionSamplesLast7Days,
    executionRows28d,
    stateCheckInCount7d,
    contextCount24h,
    contextCount7d,
    contextTypesPresent,
    last28AggregateAvailable: Object.keys(last28).length > 0 && ((last28 as any).log_count > 0 || (last28 as any).total_duration > 0),
    activeGoalsCount: (payload.profile?.active_goals || []).length,
    modulesCount: (payload.profile?.modules || []).length,
    skillsCount: (payload.profile?.skills || []).length,
    afterStateDeltaCount,
    afterStateSampleCount,
    scheduleBlocksCount: (payload.schedule_today || []).length,
    confirmedPatternsCount,
    acceptedPatternMemoryCount,
    candidatePatternsCount,
    inferredPatternsCount,
    evidenceRichness,
    estimatedBytes: safeStringify(payload).length,
    enoughEvidenceForPersonalizedJudgement: evidenceRichness === 'usable' || evidenceRichness === 'rich',
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
  const acceptedPatterns = (payload.profile?.confirmed_patterns || []).filter((pattern: any) => typeof pattern?.id === 'string' && pattern.id.startsWith('pattern-'));
  const candidates = payload.profile?.pattern_candidates || [];
  const patternRefs = result.pattern_references || [];
  const acceptedPatternUsed = patternRefs.some((ref) => ref.status === 'accepted')
    || acceptedPatterns.some((pattern: any) => includesAny(fullText, [String(pattern.id || ''), String(pattern.label || ''), String(pattern.title || '')].filter(Boolean)));
  const candidateMisuse = patternRefs.some((ref) => ref.status === 'candidate' && ref.used_as === 'primary_evidence')
    || candidates.some((pattern: any) => includesAny(fullText, [String(pattern.label || '')].filter(Boolean)) && includesAny(fullText, ['confirmed', '已确认', '模式证明']));
  const ignoredAcceptedPatterns = acceptedPatterns.length > 0 && result.evidence_basis === 'personal_pattern' && !acceptedPatternUsed;
  const populationPriorOnly = result.evidence_basis === 'population_prior' && acceptedPatterns.length === 0 && audit.evidenceRichness !== 'rich';
  const likelyCauses: string[] = [];
  if (source === 'legacy_fallback') likelyCauses.push('fallback_only_visible_path');
  if (source === 'ai' && audit.evidenceRichness === 'none') likelyCauses.push('ai_path_but_no_evidence_payload');
  if (source === 'ai' && audit.evidenceRichness === 'sparse') likelyCauses.push('ai_path_but_sparse_payload');
  if (source === 'ai' && (audit.evidenceRichness === 'usable' || audit.evidenceRichness === 'rich') && (quality.flags.generic || quality.flags.tooVague)) {
    likelyCauses.push('usable_payload_but_generic_response_prompt_or_model_issue');
  }
  if (quality.flags.missingEvidence) likelyCauses.push('quality_gate_grounding_issue');
  if (!audit.enoughEvidenceForPersonalizedJudgement) likelyCauses.push('v1_3_not_ready_evidence_sparse');
  if (!audit.latestStateIncluded) likelyCauses.push('missing_latest_state');
  if (!Object.values(audit.contextTypes).some(Boolean)) likelyCauses.push('missing_objective_context');
  if (audit.executionRows7d === 0 && audit.executionRows28d === 0) likelyCauses.push('missing_recent_execution');
  if (audit.afterStateSampleCount === 0 && audit.confirmedPatternsCount + audit.inferredPatternsCount === 0) likelyCauses.push('missing_after_state_or_patterns');
  if (acceptedPatterns.length > 0 && !acceptedPatternUsed) likelyCauses.push('accepted_patterns_available_but_ignored');
  if (acceptedPatterns.length === 0 && candidates.length > 0) likelyCauses.push('only_candidates_available');
  if (candidateMisuse) likelyCauses.push('candidate_misused_as_confirmed');
  if (ignoredAcceptedPatterns) likelyCauses.push('personal_pattern_claim_without_pattern_reference');
  if (acceptedPatternUsed) likelyCauses.push('accepted_pattern_used');
  if (populationPriorOnly) likelyCauses.push('population_prior_only');

  return {
    resultSource: source,
    headlineMentionsRealData: includesAny(headline, ['sleep', '睡眠', 'state', '状态', 'hrv', 'steps', '步数', '记录', 'execution', 'schedule', '日程']),
    firstStepReferencesGoalOrSkill: hasSkillOrGoal && includesAny(step, ['skill', '技能', '任务', 'goal', '目标', 'sql', 'python', 'bench', '卧推', '练']),
    usesLatestState: audit.latestStateIncluded && includesAny(fullText, ['state', '状态', '主观', 'check-in']),
    usesContext: (Object.values(audit.contextTypes).some(Boolean) || audit.contextCount7d > 0) && includesAny(fullText, ['sleep', '睡眠', 'hrv', 'steps', '步数', 'context', '上下文', '身体']),
    usesRecentExecution: (audit.executionRows7d > 0 || audit.executionRows28d > 0) && includesAny(fullText, ['execution', '执行', '记录', 'recent', '最近']),
    usesAfterStateOrPatterns: (audit.afterStateSampleCount > 0 || audit.confirmedPatternsCount + audit.inferredPatternsCount > 0) && includesAny(fullText, ['pattern', '模式', 'after', '之后', '复评']),
    suggestedActionsPresent: !!String(result.prescription?.do_first?.step || '').trim(),
    genericLowFrictionOnly: includesAny(step, ['low-friction', '低阻力', '低摩擦']) && !includesAny(step, ['sql', 'python', '卧推', '写', '读', '练', 'review', 'practice']),
    failedChecks: quality.checks.filter((check) => !check.passed).map((check) => check.id),
    acceptedPatternsAvailable: acceptedPatterns.length,
    candidatePatternsAvailable: candidates.length,
    acceptedPatternUsed,
    ignoredAcceptedPatterns,
    candidateMisuse,
    populationPriorOnly,
    likelyCauses,
  };
}
