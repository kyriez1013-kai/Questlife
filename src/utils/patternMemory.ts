import type { AppData, ContextLog, DecisionResult, ExecutionLog, PatternMemory, PatternMemorySupport, StateCheckIn } from '../types';

export type PatternMemorySummary = {
  accepted_count: number;
  candidate_count: number;
  rejected_count: number;
  archived_count: number;
  recent_patterns: Array<{
    id: string;
    label: string;
    patternType: PatternMemory['patternType'];
    status: PatternMemory['status'];
    confidence: number;
    sampleN: number;
  }>;
  top_pattern_types: string[];
  low_confidence_count: number;
  last_updated?: string;
};

const MAX_SUPPORT = 5;

function shortText(value: unknown, limit = 120) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function stableKey(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-').replace(/^-|-$/g, '') || 'pattern';
}

function nowIso() {
  return new Date().toISOString();
}

function safeTime(value?: string | number) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sourceSummary(sourceType: PatternMemorySupport['sourceType'], sourceId: string | undefined, ts: string | undefined, summary: string): PatternMemorySupport {
  return { sourceType, sourceId, ts, summary: shortText(summary, 90) };
}

function language(data: AppData) {
  return data.settings?.language === 'en' ? 'en' : 'zh';
}

function skillNameForLog(log: ExecutionLog, data: AppData) {
  const skill = log.linkedSkillId ? (data.skills || []).find((item) => item.id === log.linkedSkillId) : undefined;
  const legacy = log as any;
  return shortText(skill?.name || legacy.skillName || legacy.title || legacy.taskTitle || 'action', 50);
}

function afterStateDelta(log: ExecutionLog) {
  const delta = log.structuredData?.afterStateDelta as Record<string, unknown> | undefined;
  if (!delta || delta.skipped) return undefined;
  const normalize = (value: unknown) => (
    value === 'up' || value === 'same' || value === 'down' || value === 'unknown' ? value : undefined
  );
  return {
    energy: normalize(delta.energy),
    focus: normalize(delta.focus),
    mood: normalize(delta.mood),
  };
}

function dominantDirection(values: Array<string | undefined>) {
  const counts = values.reduce((acc, value) => {
    if (value === 'up' || value === 'same' || value === 'down') acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [direction, count] = sorted[0] || [];
  if (!direction || !count) return undefined;
  return { direction, count, ratio: count / Math.max(1, values.length) };
}

function makePattern(args: Omit<PatternMemory, 'createdAt' | 'updatedAt' | 'status'> & { status?: PatternMemory['status'] }): PatternMemory {
  const ts = nowIso();
  return {
    createdAt: ts,
    updatedAt: ts,
    status: args.status || 'candidate',
    ...args,
    confidence: Math.max(0, Math.min(1, args.confidence)),
    sampleN: Math.max(0, Math.round(args.sampleN)),
    support: (args.support || []).slice(0, MAX_SUPPORT),
  };
}

function deriveActionAfterStateCandidates(data: AppData): PatternMemory[] {
  const lang = language(data);
  const grouped = new Map<string, { name: string; logs: ExecutionLog[] }>();
  (data.executionLogs || []).forEach((log) => {
    const delta = afterStateDelta(log);
    if (!delta) return;
    const name = skillNameForLog(log, data);
    const key = stableKey(String(log.linkedSkillId || name));
    const group = grouped.get(key) || { name, logs: [] };
    group.logs.push(log);
    grouped.set(key, group);
  });

  const candidates: PatternMemory[] = [];
  grouped.forEach((group, key) => {
    if (group.logs.length < 2) return;
    const deltas = group.logs.map(afterStateDelta).filter(Boolean) as ReturnType<typeof afterStateDelta>[];
    const focus = dominantDirection(deltas.map((delta) => delta?.focus));
    const mood = dominantDirection(deltas.map((delta) => delta?.mood));
    const energy = dominantDirection(deltas.map((delta) => delta?.energy));
    const strongest = [
      focus ? { metric: lang === 'zh' ? '专注' : 'focus', ...focus } : undefined,
      mood ? { metric: lang === 'zh' ? '情绪' : 'mood', ...mood } : undefined,
      energy ? { metric: lang === 'zh' ? '精力' : 'energy', ...energy } : undefined,
    ].filter(Boolean).sort((a: any, b: any) => b.ratio - a.ratio)[0] as any;
    if (!strongest || strongest.ratio < 0.6) return;
    const directionText = lang === 'zh'
      ? strongest.direction === 'up' ? '上升' : strongest.direction === 'down' ? '下降' : '保持稳定'
      : strongest.direction === 'up' ? 'improve' : strongest.direction === 'down' ? 'drop' : 'stay stable';
    candidates.push(makePattern({
      id: `pattern-action-state-${key}-${strongest.metric}-${strongest.direction}`,
      label: lang === 'zh'
        ? `${group.name} 后 ${strongest.metric} 常见${directionText}`
        : `${group.name} often sees ${strongest.metric} ${directionText} afterward`,
      description: lang === 'zh'
        ? `基于 ${group.logs.length} 条带事后状态的记录。这只是关联信号，不代表因果。`
        : `Based on ${group.logs.length} logs with after-state checks. This is an association, not causality.`,
      patternType: 'action_state_effect',
      evidenceBasis: 'personal_pattern',
      confidence: group.logs.length >= 3 ? Math.min(0.75, 0.35 + strongest.ratio * 0.4) : 0.42,
      sampleN: group.logs.length,
      support: group.logs.slice(-MAX_SUPPORT).map((log) => sourceSummary('after_state', log.id, log.createdAt, `${group.name} · ${strongest.metric} ${directionText}`)),
      caution: lang === 'zh' ? '候选模式，样本仍少；不要当成确定因果。' : 'Candidate pattern with limited samples; do not treat as causal.',
      lastSeenAt: group.logs.map((log) => log.createdAt || '').sort().pop(),
    }));
  });
  return candidates;
}

function closeStateForContext(log: ContextLog, states: StateCheckIn[]) {
  const time = safeTime(log.createdAt);
  if (!time) return undefined;
  return states
    .map((state) => ({ state, distance: Math.abs(safeTime(state.timestamp || state.createdAt) - time) }))
    .filter((item) => item.distance <= 12 * 60 * 60 * 1000)
    .sort((a, b) => a.distance - b.distance)[0]?.state;
}

function deriveContextStateCandidates(data: AppData): PatternMemory[] {
  const lang = language(data);
  const states = data.stateCheckIns || [];
  const grouped = new Map<string, { logs: ContextLog[]; stateScores: number[] }>();
  (data.contextLogs || []).forEach((log) => {
    const state = closeStateForContext(log, states);
    if (!state?.overall) return;
    const key = String(log.type || 'custom');
    const group = grouped.get(key) || { logs: [], stateScores: [] };
    group.logs.push(log);
    group.stateScores.push(Number(state.overall));
    grouped.set(key, group);
  });
  const candidates: PatternMemory[] = [];
  grouped.forEach((group, type) => {
    if (group.logs.length < 2) return;
    const avg = group.stateScores.reduce((sum, value) => sum + value, 0) / Math.max(1, group.stateScores.length);
    const low = avg <= 2.6;
    const high = avg >= 3.6;
    if (!low && !high) return;
    candidates.push(makePattern({
      id: `pattern-context-state-${stableKey(type)}-${low ? 'lower' : 'higher'}`,
      label: lang === 'zh'
        ? `${type} 上下文附近状态偏${low ? '低' : '高'}`
        : `${type} context appears near ${low ? 'lower' : 'higher'} state`,
      description: lang === 'zh'
        ? `基于 ${group.logs.length} 条上下文与相近状态记录。这里只表示接近出现，不表示因果。`
        : `Based on ${group.logs.length} context logs near state check-ins. This only means they appeared near each other.`,
      patternType: 'context_state_effect',
      evidenceBasis: group.logs.length >= 5 ? 'mixed' : 'population_prior',
      confidence: group.logs.length >= 5 ? 0.55 : 0.32,
      sampleN: group.logs.length,
      support: group.logs.slice(-MAX_SUPPORT).map((log) => sourceSummary('context', log.id, log.createdAt, `${type} context near state check-in`)),
      caution: lang === 'zh' ? '低样本关联，不能用于医学判断。' : 'Low-sample association, not medical guidance.',
      lastSeenAt: group.logs.map((log) => log.createdAt || '').sort().pop(),
    }));
  });
  return candidates;
}

function deriveDecisionFeedbackCandidates(data: AppData): PatternMemory[] {
  const lang = language(data);
  const results = data.decisionResults || [];
  const useful = results.filter((result) => result.userFeedback?.rating === 'useful');
  const notUseful = results.filter((result) => result.userFeedback?.rating === 'not_useful');
  const candidates: PatternMemory[] = [];
  if (useful.length >= 1) {
    const concrete = useful.filter((result) => result.firstStep?.step && !result.quality?.flags?.generic);
    candidates.push(makePattern({
      id: 'pattern-decision-feedback-concrete-first-step-useful',
      label: lang === 'zh' ? '具体第一步的简报更容易被标记有用' : 'Briefs with concrete first steps are more often marked useful',
      description: lang === 'zh'
        ? `基于 ${useful.length} 条有用反馈。这是 AI 输出质量偏好，不是生活行为诊断。`
        : `Based on ${useful.length} useful feedback item(s). This is an output-quality preference, not a life diagnosis.`,
      patternType: 'decision_feedback',
      evidenceBasis: 'mixed',
      confidence: Math.min(0.65, 0.35 + concrete.length * 0.1),
      sampleN: useful.length,
      support: useful.slice(-MAX_SUPPORT).map((result) => sourceSummary('decision_result', result.id, result.createdAt, `useful · ${result.mode} · ${result.quality?.grade || 'ungraded'}`)),
      usefulness: { usefulCount: useful.length, notUsefulCount: 0 },
      caution: lang === 'zh' ? '仅用于校准输出风格，不应扩大成个人心理判断。' : 'Use only to calibrate output style; do not broaden into psychological claims.',
      lastSeenAt: useful.map((result) => result.createdAt || '').sort().pop(),
    }));
  }
  if (notUseful.length >= 1) {
    const generic = notUseful.filter((result) => result.quality?.flags?.generic || result.quality?.flags?.missingEvidence || result.quality?.flags?.tooVague);
    candidates.push(makePattern({
      id: 'pattern-decision-feedback-generic-low-evidence-not-useful',
      label: lang === 'zh' ? '泛泛或低证据简报容易被标记没用' : 'Generic or low-evidence briefs are more often marked not useful',
      description: lang === 'zh'
        ? `基于 ${notUseful.length} 条没用反馈。这是输出反馈模式，不是用户行为模式。`
        : `Based on ${notUseful.length} not-useful feedback item(s). This is an output feedback pattern, not a behavior pattern.`,
      patternType: 'decision_feedback',
      evidenceBasis: 'mixed',
      confidence: Math.min(0.65, 0.35 + generic.length * 0.1),
      sampleN: notUseful.length,
      support: notUseful.slice(-MAX_SUPPORT).map((result) => sourceSummary('decision_result', result.id, result.createdAt, `not useful · ${result.mode} · ${result.quality?.grade || 'ungraded'}`)),
      usefulness: { usefulCount: 0, notUsefulCount: notUseful.length },
      caution: lang === 'zh' ? '仅用于校准输出风格，不应扩大成个人心理判断。' : 'Use only to calibrate output style; do not broaden into psychological claims.',
      lastSeenAt: notUseful.map((result) => result.createdAt || '').sort().pop(),
    }));
  }
  const perceptionGap = results.filter((result) => result.perceptionGapDetected);
  if (perceptionGap.length >= 1) {
    const usefulGap = perceptionGap.filter((result) => result.userFeedback?.rating === 'useful').length;
    const notUsefulGap = perceptionGap.filter((result) => result.userFeedback?.rating === 'not_useful').length;
    candidates.push(makePattern({
      id: 'pattern-perception-gap-feedback',
      label: lang === 'zh' ? '体感差异解读已有反馈信号' : 'Perception-gap insights have feedback signals',
      description: lang === 'zh'
        ? `基于 ${perceptionGap.length} 条体感差异解读，其中有用 ${usefulGap}，没用 ${notUsefulGap}。`
        : `Based on ${perceptionGap.length} perception-gap result(s): ${usefulGap} useful, ${notUsefulGap} not useful.`,
      patternType: 'perception_gap',
      evidenceBasis: 'mixed',
      confidence: 0.35,
      sampleN: perceptionGap.length,
      support: perceptionGap.slice(-MAX_SUPPORT).map((result) => sourceSummary('decision_result', result.id, result.createdAt, `perception gap · ${result.userFeedback?.rating || 'no feedback'}`)),
      usefulness: { usefulCount: usefulGap, notUsefulCount: notUsefulGap },
      caution: lang === 'zh' ? '候选反馈信号，不代表体感一定错误。' : 'Candidate feedback signal; it does not mean perception is wrong.',
      lastSeenAt: perceptionGap.map((result) => result.createdAt || '').sort().pop(),
    }));
  }
  return candidates;
}

export function derivePatternCandidates(data: AppData): PatternMemory[] {
  const candidates = [
    ...deriveActionAfterStateCandidates(data),
    ...deriveContextStateCandidates(data),
    ...deriveDecisionFeedbackCandidates(data),
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}

export function mergePatternCandidates(existing: PatternMemory[] = [], candidates: PatternMemory[] = []): PatternMemory[] {
  const byId = new Map<string, PatternMemory>();
  existing.forEach((pattern) => byId.set(pattern.id, pattern));
  candidates.forEach((candidate) => {
    const previous = byId.get(candidate.id);
    if (!previous) {
      byId.set(candidate.id, candidate);
      return;
    }
    byId.set(candidate.id, {
      ...candidate,
      status: previous.status,
      createdAt: previous.createdAt,
      updatedAt: previous.updatedAt,
      usefulness: candidate.usefulness || previous.usefulness,
    });
  });
  return Array.from(byId.values()).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export function buildPatternMemorySummary(patternMemory: PatternMemory[] = []): PatternMemorySummary {
  const counts = patternMemory.reduce((acc, pattern) => {
    acc[pattern.status] = (acc[pattern.status] || 0) + 1;
    return acc;
  }, {} as Record<PatternMemory['status'], number>);
  const typeCounts = patternMemory.reduce((acc, pattern) => {
    acc[pattern.patternType] = (acc[pattern.patternType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return {
    accepted_count: counts.accepted || 0,
    candidate_count: counts.candidate || 0,
    rejected_count: counts.rejected || 0,
    archived_count: counts.archived || 0,
    recent_patterns: patternMemory
      .slice()
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .slice(0, 5)
      .map((pattern) => ({
        id: pattern.id,
        label: pattern.label,
        patternType: pattern.patternType,
        status: pattern.status,
        confidence: pattern.confidence,
        sampleN: pattern.sampleN,
      })),
    top_pattern_types: Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type]) => type).slice(0, 5),
    low_confidence_count: patternMemory.filter((pattern) => pattern.confidence < 0.45).length,
    last_updated: patternMemory.map((pattern) => pattern.updatedAt || '').sort().pop(),
  };
}

export function sanitizePatternMemoryForPayload(patternMemory: PatternMemory[] = []) {
  const accepted = patternMemory.filter((pattern) => pattern.status === 'accepted');
  const candidates = patternMemory.filter((pattern) => pattern.status === 'candidate');
  return {
    confirmed_patterns: accepted.slice(0, 8).map((pattern) => ({
      id: pattern.id,
      type: pattern.patternType,
      title: shortText(pattern.label, 120),
      label: shortText(pattern.label, 120),
      patternType: pattern.patternType,
      evidenceBasis: pattern.evidenceBasis,
      confidence: pattern.confidence,
      sampleN: pattern.sampleN,
      caution: pattern.caution ? shortText(pattern.caution, 120) : undefined,
    })),
    candidate_patterns: candidates.slice(0, 5).map((pattern) => ({
      id: pattern.id,
      label: shortText(pattern.label, 120),
      patternType: pattern.patternType,
      confidence: pattern.confidence,
      sampleN: pattern.sampleN,
      unconfirmed: true,
    })),
    pattern_memory_summary: buildPatternMemorySummary(patternMemory),
  };
}
