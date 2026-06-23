import { DecisionBriefInput, DecisionBriefResult } from './decisionTypes';

export type DecisionQualityGrade = 'excellent' | 'good' | 'weak' | 'bad';
export type DecisionQualityCheck = {
  id: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'high';
  messageKey: string;
  detail?: string;
};

export type DecisionQualityEvaluation = {
  score: number;
  grade: DecisionQualityGrade;
  checks: DecisionQualityCheck[];
  flags: {
    generic: boolean;
    missingEvidence: boolean;
    missingFirstStep: boolean;
    overclaiming: boolean;
    medicalRisk: boolean;
    schemaWeakness: boolean;
    tooVerbose: boolean;
    tooVague: boolean;
  };
};

type EvaluateArgs = {
  result: DecisionBriefResult;
  payload: DecisionBriefInput;
  mode?: DecisionBriefInput['mode'];
};

const genericPhrases = [
  '保持积极',
  '照顾好自己',
  '继续努力',
  'listen to your body',
  'try your best',
  'stay motivated',
  'stay positive',
  'take care of yourself',
];

const medicalRiskPhrases = [
  '你有焦虑',
  '你有抑郁',
  '你患有',
  '诊断',
  '治疗',
  'cure',
  'diagnose',
  'diagnosis',
  'you have anxiety',
  'you have depression',
  'treatment',
];

const overclaimPhrases = [
  '一定是',
  '必然',
  '直接导致',
  'caused by',
  'will definitely',
  'guarantees',
  'always means',
];

function textOf(result: DecisionBriefResult) {
  return [
    result.headline_insight,
    result.perception_gap?.interpretation,
    result.perception_gap?.test_action,
    result.deep_analysis,
    result.prescription?.do_first?.step,
    result.prescription?.do_first?.why,
    ...(result.prescription?.do_not || []),
    ...(result.patterns_surfaced || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function hasAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase.toLowerCase()));
}

function hasPayloadData(payload: DecisionBriefInput) {
  const rows = payload.history_index.last_7_days || [];
  const executionCount = rows.reduce((sum, row: any) => {
    const samples = Array.isArray(row.samples) ? row.samples.length : 0;
    const events = Array.isArray(row.execution_events) ? row.execution_events.length : 0;
    return sum + Math.max(samples, events);
  }, 0);
  const contextSummary = (payload.today_context.context_summary || {}) as Record<string, any>;
  const afterStateSamples = Number((payload.after_state_summary as any)?.sample_count || (payload.history_index.last_28_days as any)?.after_state_sample_count || 0);
  const inferredPatterns = (payload.profile.inferred_patterns_v0 || []).filter((pattern: any) => Number(pattern?.sample_n || 0) > 0).length;
  return {
    latestState: !!payload.current_state,
    sleep: typeof payload.today_context.latest_sleep_minutes === 'number',
    hrv: typeof payload.today_context.hrv === 'number',
    steps: typeof payload.today_context.steps === 'number',
    context: (payload.today_context.recent_context_logs || []).length > 0 || Number(contextSummary.count_7d || 0) > 0,
    execution: executionCount > 0 || Number((payload.history_index.last_28_days as any)?.log_count || 0) > 0,
    afterState: afterStateSamples > 0,
    skill: (payload.profile.skills || []).length > 0,
    schedule: (payload.schedule_today || []).length > 0,
    pattern: (payload.profile.confirmed_patterns || []).length > 0 || inferredPatterns > 0,
  };
}

function mentionsEvidence(text: string, payload: DecisionBriefInput) {
  const data = hasPayloadData(payload);
  const evidenceTerms = [
    data.latestState ? ['state', '状态', 'check-in', '主观'] : [],
    data.sleep ? ['sleep', '睡眠', '昨晚'] : [],
    data.hrv ? ['hrv'] : [],
    data.steps ? ['steps', '步数'] : [],
    data.context ? ['context', '上下文', '身体'] : [],
    data.execution ? ['execution', '执行', '记录', 'recent'] : [],
    data.afterState ? ['after', '之后', '复评', '状态变化'] : [],
    data.skill ? ['skill', '技能', '任务'] : [],
    data.schedule ? ['schedule', '日程', '计划'] : [],
    data.pattern ? ['pattern', '模式'] : [],
  ].flat();
  return evidenceTerms.some((term) => text.includes(term.toLowerCase()));
}

function hasConcreteAction(step: string, duration: number | null | undefined) {
  const normalized = String(step || '').toLowerCase();
  if (!normalized.trim()) return false;
  if (typeof duration === 'number' && duration > 0) return true;
  return /\d+\s*(分钟|min|minute|m\b)/i.test(normalized)
    || /(写|读|做|记录|练|walk|read|write|log|start|review|practice)/i.test(normalized);
}

function gradeForScore(score: number): DecisionQualityGrade {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 45) return 'weak';
  return 'bad';
}

export function evaluateDecisionBriefQuality({ result, payload, mode }: EvaluateArgs): DecisionQualityEvaluation {
  const outputText = textOf(result);
  const checks: DecisionQualityCheck[] = [];
  const add = (check: DecisionQualityCheck) => checks.push(check);
  const doFirst = result.prescription?.do_first;
  const hasStep = !!String(doFirst?.step || '').trim();
  const hasConfidence = typeof result.confidence === 'number' && Number.isFinite(result.confidence);
  const hasEvidenceBasis = ['population_prior', 'personal_pattern', 'mixed'].includes(result.evidence_basis);
  const hasReadinessBand = ['green', 'yellow', 'red', 'unknown'].includes(result.readiness?.band);
  const data = hasPayloadData(payload);
  const anyPayloadData = Object.values(data).some(Boolean);
  const evidenceMentioned = mentionsEvidence(outputText, payload);
  const explicitInsufficient = /insufficient|not enough|missing|data gap|数据不足|缺少|不足/.test(outputText);
  const concreteAction = hasConcreteAction(doFirst?.step || '', doFirst?.duration_min);
  const generic = hasAny(outputText, genericPhrases);
  const medicalRisk = hasAny(outputText, medicalRiskPhrases);
  const overclaiming = hasAny(outputText, overclaimPhrases)
    || (result.evidence_basis === 'population_prior' && result.tone === 'assertive' && result.confidence > 0.6);
  const tooVerbose = (mode ?? payload.mode) === 'instant_micro' && outputText.length > 900;
  const tooVague = !concreteAction || /keep going|继续推进|继续正常|保持/.test(String(doFirst?.step || '').toLowerCase());

  add({ id: 'headline', passed: !!String(result.headline_insight || '').trim(), severity: 'high', messageKey: 'dqCheckHeadline' });
  add({ id: 'first_step', passed: hasStep, severity: 'high', messageKey: 'dqCheckFirstStep' });
  add({ id: 'confidence', passed: hasConfidence, severity: 'medium', messageKey: 'dqCheckConfidence' });
  add({ id: 'evidence_basis', passed: hasEvidenceBasis, severity: 'medium', messageKey: 'dqCheckEvidenceBasis' });
  add({ id: 'readiness_band', passed: hasReadinessBand, severity: 'low', messageKey: 'dqCheckReadinessBand' });
  add({
    id: 'personalization',
    passed: anyPayloadData ? evidenceMentioned : explicitInsufficient,
    severity: 'high',
    messageKey: 'dqCheckPersonalization',
    detail: anyPayloadData ? Object.entries(data).filter(([, value]) => value).map(([key]) => key).join(', ') : 'no_payload_data',
  });
  add({ id: 'actionability', passed: concreteAction, severity: 'high', messageKey: 'dqCheckActionability' });
  add({ id: 'specificity', passed: !tooVague, severity: 'medium', messageKey: 'dqCheckSpecificity' });
  add({ id: 'generic_language', passed: !generic, severity: 'medium', messageKey: 'dqCheckGeneric' });
  add({ id: 'safety', passed: !medicalRisk, severity: 'high', messageKey: 'dqCheckSafety' });
  add({ id: 'causality', passed: !overclaiming, severity: 'medium', messageKey: 'dqCheckCausality' });
  add({ id: 'length', passed: !tooVerbose, severity: 'low', messageKey: 'dqCheckLength' });

  const penaltyBySeverity = { low: 6, medium: 12, high: 20 };
  const penalty = checks.reduce((sum, check) => sum + (check.passed ? 0 : penaltyBySeverity[check.severity]), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    score,
    grade: gradeForScore(score),
    checks,
    flags: {
      generic,
      missingEvidence: anyPayloadData ? !evidenceMentioned : !explicitInsufficient,
      missingFirstStep: !hasStep,
      overclaiming,
      medicalRisk,
      schemaWeakness: checks.some((check) => !check.passed && ['headline', 'first_step', 'confidence', 'evidence_basis', 'readiness_band'].includes(check.id)),
      tooVerbose,
      tooVague,
    },
  };
}
