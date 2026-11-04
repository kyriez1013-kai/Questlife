import { Category, ParsedEntry, QuestModule, Skill } from '../types';
import { parseDurationMinutes, parseStrength } from '../v2/model/localParse';
import { compactStrengthValues, matchCaptureExercise } from './universalCapture';

export type CompletionDomain = 'fitness' | 'learning' | 'reading' | 'project' | 'schedule' | 'state' | 'food' | 'unknown';
export type CompletionMissingField =
  | 'duration'
  | 'quality'
  | 'effortLevel'
  | 'energy'
  | 'focus'
  | 'weight'
  | 'sets'
  | 'reps'
  | 'rpe'
  | 'extraExercises'
  | 'chapterOrSection'
  | 'taskScope'
  | 'progressAmount'
  | 'targetGoal'
  | 'targetModule'
  | 'targetSkill';

export type CompletionSuggestion = {
  id: string;
  label: string;
  labelZh?: string;
  kind: 'duration' | 'quality' | 'rpe' | 'exercise' | 'scope' | 'route' | 'skip';
  value?: string | number;
  skillId?: string;
};

export type CompletionCandidate = {
  id: string;
  label: string;
  confidence: 'high' | 'medium' | 'low';
};

export type CompletionAssessment = {
  status: 'complete' | 'needs_completion' | 'not_recordable';
  domain: CompletionDomain;
  missingFields: CompletionMissingField[];
  suggestedActions: CompletionSuggestion[];
  routeCandidates: {
    goals: CompletionCandidate[];
    modules: CompletionCandidate[];
    skills: CompletionCandidate[];
  };
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

type CompletionContext = {
  goals: Category[];
  modules: QuestModule[];
  skills: Skill[];
  lang: 'zh' | 'en';
};

function normalize(value?: string): string {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '').replace(/[^\w\u4e00-\u9fff]/g, '');
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(normalize(word)));
}

function inferDomain(rawText: string, entry?: ParsedEntry): CompletionDomain {
  const text = normalize(`${rawText} ${entry?.skillName ?? ''} ${entry?.fields?.note ?? ''}`);
  if (hasAny(text, ['巧克力', '吃了', '喝了', '食物', 'food', 'chocolate', 'snack'])) return 'food';
  if (hasAny(text, ['累', '疲惫', '焦虑', '难受', '状态', '心情', 'tired', 'stress', 'mood'])) return 'state';
  if (hasAny(text, ['读了', '阅读', '箴言', '圣经', 'chapter', 'book', 'reading'])) return 'reading';
  if (hasAny(text, ['sql', 'python', 'excel', 'tableau', '学习', '学了', '做了python', 'coding', 'debug'])) return 'learning';
  if (hasAny(text, ['项目', 'feature', 'bug', 'app', 'project'])) return 'project';
  if (matchCaptureExercise(`${rawText} ${entry?.skillName ?? ''}`)) return 'fitness';
  if (hasAny(text, ['练胸', '练背', '练腿', '卧推', '深蹲', '硬拉', '划船', '引体', 'dips', 'bench', 'squat', 'deadlift', 'workout'])) return 'fitness';
  if (entry?.goalType === 'fitness' || entry?.progressType === 'performance_log') return 'fitness';
  if (entry?.goalType === 'study' || entry?.progressType === 'time_based') return 'learning';
  return 'unknown';
}

function commonExerciseSuggestions(rawText: string, skills: Skill[]): CompletionSuggestion[] {
  if (matchCaptureExercise(rawText)?.strength === false) return [];
  const text = normalize(rawText);
  const group = hasAny(text, ['背', 'pull', 'back'])
    ? ['划船', '引体向上', '高位下拉', '面拉', '硬拉']
    : hasAny(text, ['肩', 'shoulder'])
      ? ['推举', '侧平举', '后束飞鸟', '面拉']
      : hasAny(text, ['腿', 'legs', 'leg'])
        ? ['深蹲', '腿举', '罗马尼亚硬拉', '腿弯举']
        : ['卧推', '上斜卧推', 'dips', '飞鸟', '俯卧撑'];
  const existing = skills
    .filter((skill) => group.some((name) => normalize(skill.name).includes(normalize(name)) || normalize(name).includes(normalize(skill.name))))
    .map((skill) => ({ id: `skill:${skill.id}`, label: skill.name, kind: 'exercise' as const, value: skill.name, skillId: skill.id }));
  const seen = new Set(existing.map((item) => normalize(item.label)));
  const common = group
    .filter((name) => !seen.has(normalize(name)))
    .map((name) => ({ id: `common:${normalize(name)}`, label: name, kind: 'exercise' as const, value: name }));
  return [...existing, ...common].slice(0, 8);
}

function learningSuggestions(skills: Skill[]): CompletionSuggestion[] {
  const group = ['SQL', 'Python', 'Excel', 'Tableau', 'Statistics', 'Finance', 'Accounting'];
  const existing = skills
    .filter((skill) => group.some((name) => normalize(skill.name) === normalize(name)))
    .map((skill) => ({ id: `skill:${skill.id}`, label: skill.name, kind: 'exercise' as const, value: skill.name, skillId: skill.id }));
  const seen = new Set(existing.map((item) => normalize(item.label)));
  const common = group
    .filter((name) => !seen.has(normalize(name)))
    .map((name) => ({ id: `common:${normalize(name)}`, label: name, kind: 'exercise' as const, value: name }));
  return [...existing, ...common].slice(0, 8);
}

function routeCandidates(domain: CompletionDomain, context: CompletionContext) {
  const goalWords = domain === 'fitness'
    ? ['fitness', '健身', '力量', '胸', '背', '腿']
    : domain === 'learning'
      ? ['study', '学习', 'data', 'sql', 'python', '项目', 'coding']
      : domain === 'reading'
        ? ['reading', '阅读', 'bible', 'book', '学习']
        : [];
  const moduleWords = domain === 'fitness'
    ? ['胸', 'push', '背', 'pull', '腿', 'legs']
    : domain === 'learning'
      ? ['sql', 'python', 'data', '概念', '练习', '学习']
      : domain === 'reading'
        ? ['reading', '阅读', 'notes', 'book']
        : [];
  const goals = context.goals
    .filter((goal) => goalWords.some((word) => normalize(`${goal.name} ${goal.goalType ?? ''} ${goal.domain ?? ''}`).includes(normalize(word))))
    .map((goal) => ({ id: goal.id, label: goal.name, confidence: 'medium' as const }))
    .slice(0, 4);
  const modules = context.modules
    .filter((module) => moduleWords.some((word) => normalize(module.name).includes(normalize(word))))
    .map((module) => ({ id: module.id, label: module.name, confidence: 'medium' as const }))
    .slice(0, 4);
  return { goals, modules };
}

export function assessCaptureCompletion(
  rawText: string,
  entry: ParsedEntry,
  context: CompletionContext,
  domainOverride?: CompletionDomain,
): CompletionAssessment {
  const domain = domainOverride ?? inferDomain(rawText, entry);
  const fields = entry.fields || {};
  const missing = new Set<CompletionMissingField>();
  const routes = routeCandidates(domain, context);
  const skillCandidates = context.skills
    .filter((skill) => normalize(skill.name) === normalize(entry.skillName))
    .map((skill) => ({ id: skill.id, label: skill.name, confidence: 'high' as const }))
    .slice(0, 4);

  if (domain === 'food') {
    return { status: 'not_recordable', domain, missingFields: [], suggestedActions: [], routeCandidates: { ...routes, skills: [] }, confidence: 'high', reason: 'food_life_factor_later' };
  }
  if (domain === 'state') {
    return { status: 'not_recordable', domain, missingFields: ['energy', 'focus'], suggestedActions: [], routeCandidates: { ...routes, skills: [] }, confidence: 'high', reason: 'state_checkin_candidate' };
  }

  if (domain === 'fitness') {
    const vague = hasAny(normalize(`${rawText} ${entry.skillName}`), ['练胸', '练背', '练腿', '练肩']) && expandSetsLike(fields).length === 0;
    if (vague) missing.add('targetSkill');
    if (fields.durationMinutes == null) missing.add('duration');
    if (entry.qualityRating == null) missing.add('quality');
    if (entry.progressType === 'performance_log' && !vague) {
      const sets = expandSetsLike(fields);
      const strength = compactStrengthValues(entry);
      if (strength.weight == null && !sets.some((set) => set.weight != null)) missing.add('weight');
      if (strength.reps == null && !sets.some((set) => set.reps != null)) missing.add('reps');
      if (strength.sets == null && sets.length === 0) missing.add('sets');
    }
    missing.add('extraExercises');
  } else if (domain === 'learning' || domain === 'project') {
    if (fields.durationMinutes == null) missing.add('duration');
    if (entry.qualityRating == null) missing.add('quality');
    if (!fields.note && !fields.scope && !fields.topic) missing.add('taskScope');
  } else if (domain === 'reading') {
    if (fields.durationMinutes == null) missing.add('duration');
    if (!fields.note && !fields.scope) missing.add('chapterOrSection');
  } else {
    missing.add('targetSkill');
  }

  const suggestions: CompletionSuggestion[] = [];
  if (missing.has('duration')) {
    [10, 20, 30, 45, 60].forEach((min) => suggestions.push({ id: `duration:${min}`, label: `${min}`, kind: 'duration', value: min }));
    suggestions.push({ id: 'duration:skip', label: 'skip', kind: 'duration' });
  }
  if (missing.has('quality')) [1, 2, 3, 4, 5].forEach((q) => suggestions.push({ id: `quality:${q}`, label: String(q), kind: 'quality', value: q }));
  if (missing.has('rpe')) [6, 7, 8, 9, 10].forEach((rpe) => suggestions.push({ id: `rpe:${rpe}`, label: String(rpe), kind: 'rpe', value: rpe }));
  if (domain === 'fitness' && (missing.has('targetSkill') || missing.has('extraExercises'))) suggestions.push(...commonExerciseSuggestions(rawText, context.skills));
  if (domain === 'learning' && missing.has('targetSkill')) suggestions.push(...learningSuggestions(context.skills));

  return {
    status: missing.size > 0 ? 'needs_completion' : 'complete',
    domain,
    missingFields: Array.from(missing),
    suggestedActions: suggestions,
    routeCandidates: { ...routes, skills: skillCandidates },
    confidence: missing.has('targetSkill') || routes.goals.length === 0 ? 'medium' : 'high',
    reason: missing.size > 0 ? 'missing_fields' : 'complete',
  };
}

function expandSetsLike(fields: Record<string, any>): { weight?: number; reps?: number }[] {
  if (Array.isArray(fields.sets)) return fields.sets;
  const rawSets = fields.sets;
  const match = typeof rawSets === 'string' ? rawSets.match(/(\d+)\s*[x×]\s*(\d+)/i) : null;
  if (!match) return [];
  return Array.from({ length: Number(match[1]) }, () => ({
    weight: Number.isFinite(Number(fields.weight ?? fields.value ?? fields.extraWeight)) ? Number(fields.weight ?? fields.value ?? fields.extraWeight) : undefined,
    reps: Number(match[2]),
  }));
}

export function buildFallbackEntriesFromRawText(rawText: string): ParsedEntry[] {
  const domain = inferDomain(rawText);
  const durationMinutes = parseDurationMinutes(rawText) ?? undefined;
  const text = normalize(rawText);
  if (domain === 'state') {
    return [{ skillName: 'state_checkin_candidate', matchedSkillId: null, goalType: 'custom', progressType: 'none', fields: { note: rawText, nonRecordable: true, domain } }];
  }
  if (domain === 'food') {
    return [{ skillName: 'food_life_factor_candidate', matchedSkillId: null, goalType: 'custom', progressType: 'none', fields: { note: rawText, nonRecordable: true, domain } }];
  }
  if (domain === 'fitness') {
    const exercise = matchCaptureExercise(rawText);
    const skillName = exercise?.name ?? (hasAny(text, ['背', 'pull', 'back']) ? '练背'
      : hasAny(text, ['腿', 'legs']) ? '练腿'
        : hasAny(text, ['肩', 'shoulder']) ? '练肩'
          : hasAny(text, ['卧推', 'bench']) ? '卧推'
            : hasAny(text, ['练胸']) ? '练胸'
              : /[\u4e00-\u9fff]/.test(rawText) ? '训练' : 'Workout');
    const strength = exercise?.strength === false ? undefined : parseStrength(rawText);
    const strengthSets = strength?.sets != null && strength.sets > 0
      ? [{ weight: strength.weightKg ?? undefined, reps: strength.reps ?? undefined, count: strength.sets }]
      : undefined;
    return [{
      skillName, matchedSkillId: null, goalType: 'fitness',
      progressType: exercise?.strength === false ? 'time_based' : 'performance_log',
      fields: {
        durationMinutes,
        ...(strength?.weightKg != null ? { weightKg: strength.weightKg } : {}),
        ...(strengthSets ? { sets: strengthSets } : {}),
        ...(strength?.reps != null ? { reps: strength.reps } : {}),
      },
    }];
  }
  if (domain === 'learning' || domain === 'project') {
    const skillName = hasAny(text, ['sql']) ? 'SQL' : hasAny(text, ['python']) ? 'Python' : domain === 'project' ? 'Project Work' : 'Learning';
    return [{ skillName, matchedSkillId: null, goalType: domain === 'project' ? 'project' : 'study', progressType: 'time_based', fields: { durationMinutes, note: rawText } }];
  }
  if (domain === 'reading') {
    return [{ skillName: 'Reading', matchedSkillId: null, goalType: 'study', progressType: 'time_based', fields: { durationMinutes, note: rawText, scope: rawText } }];
  }
  return [];
}
