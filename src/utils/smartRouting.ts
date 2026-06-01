import { Category, ParsedEntry, QuestModule, Skill } from '../types';

export type SmartRouteDomain = 'fitness' | 'learning' | 'reading' | 'state' | 'food' | 'project' | 'unknown';
export type SmartRouteConfidence = 'high' | 'medium' | 'low';

export type RouteCandidate = {
  id?: string;
  name: string;
  type: 'existing' | 'suggested' | 'create_new' | 'unassigned';
  confidence: number;
};

export type SmartRouteResult = {
  domain: SmartRouteDomain;
  confidence: SmartRouteConfidence;
  goalCandidates: RouteCandidate[];
  moduleCandidates: RouteCandidate[];
  skillCandidates: RouteCandidate[];
  selectedGoalId?: string;
  selectedModuleId?: string;
  selectedSkillIds?: string[];
  allowCreateGoal: boolean;
  allowCreateModule: boolean;
  allowCreateSkill: boolean;
  reason: string;
};

type SmartRouteContext = {
  rawText: string;
  entry: ParsedEntry;
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

function scoreText(value: string | undefined, words: string[]): number {
  const text = normalize(value);
  if (!text) return 0;
  return words.reduce((sum, word) => sum + (text.includes(normalize(word)) ? 1 : 0), 0);
}

export function inferSmartRouteDomain(rawText: string, entry?: ParsedEntry): SmartRouteDomain {
  const text = normalize(`${rawText} ${entry?.skillName ?? ''} ${entry?.fields?.note ?? ''}`);
  if (hasAny(text, ['巧克力', '吃了', '喝了', 'meal', 'food', 'chocolate', 'snack'])) return 'food';
  if (hasAny(text, ['累', '疲惫', '焦虑', '状态差', '精力低', '状态', 'tired', 'stress', 'mood'])) return 'state';
  if (hasAny(text, ['读了', '阅读', '箴言', '圣经', 'reading', 'book', 'chapter'])) return 'reading';
  if (hasAny(text, ['sql', 'python', 'excel', 'tableau', 'statistics', 'finance', 'accounting', '学习', '学了', '课程', 'debug'])) return 'learning';
  if (hasAny(text, ['项目', 'feature', 'bug', 'app', 'project'])) return 'project';
  if (hasAny(text, ['练胸', '练背', '练肩', '练腿', '卧推', '上斜', '划船', '引体', '下拉', '深蹲', '硬拉', 'dips', 'bench', 'pull', 'push', 'workout'])) return 'fitness';
  if (entry?.goalType === 'fitness' || entry?.progressType === 'performance_log') return 'fitness';
  if (entry?.goalType === 'study' || entry?.progressType === 'time_based') return 'learning';
  return 'unknown';
}

function routeWords(domain: SmartRouteDomain, rawText: string) {
  const text = normalize(rawText);
  if (domain === 'fitness') {
    const moduleWords = hasAny(text, ['背', 'pull', 'back', '划船', '引体', '下拉'])
      ? ['背', '练背', 'pull', 'back', '拉']
      : hasAny(text, ['肩', 'shoulder'])
        ? ['肩', 'shoulder', '推举']
        : hasAny(text, ['腿', 'legs', 'squat', '深蹲'])
          ? ['腿', 'legs', 'squat', '深蹲']
          : ['胸', '练胸', 'push', 'chest', '卧推'];
    return {
      goal: ['健身', '力量', 'fitness', 'strength', 'physique', 'gym'],
      module: moduleWords,
    };
  }
  if (domain === 'learning') {
    return {
      goal: ['学习', '课程', 'study', 'data', 'sql', 'python', 'coding', '编程', '数据'],
      module: ['学习', '概念', '练习', '复习', 'data', 'sql', 'python', 'practice', 'course'],
    };
  }
  if (domain === 'project') {
    return {
      goal: ['项目', 'project', 'coding', 'app', 'build'],
      module: ['规划', '前端', '后端', '测试', 'project', 'feature', 'build'],
    };
  }
  if (domain === 'reading') {
    return {
      goal: ['阅读', '读书', 'reading', 'book', 'study'],
      module: ['阅读', 'notes', 'reading', 'book'],
    };
  }
  return { goal: [], module: [] };
}

function candidateFromGoal(goal: Category, confidence: number): RouteCandidate {
  return { id: goal.id, name: goal.name, type: 'existing', confidence };
}

function candidateFromModule(module: QuestModule, confidence: number): RouteCandidate {
  return { id: module.id, name: module.name, type: 'existing', confidence };
}

function candidateFromSkill(skill: Skill, confidence: number): RouteCandidate {
  return { id: skill.id, name: skill.name, type: 'existing', confidence };
}

function goalMatchesDomain(goal: Category, domain: SmartRouteDomain, rawText: string): number {
  const words = routeWords(domain, rawText).goal;
  const haystack = `${goal.name} ${goal.description ?? ''} ${goal.goalType ?? ''} ${goal.domain ?? ''}`;
  let score = scoreText(haystack, words);
  if (domain === 'fitness' && (goal.goalType === 'fitness' || String(goal.domain ?? '').startsWith('fitness'))) score += 4;
  if (domain === 'learning' && ['study', 'career', 'project'].includes(String(goal.goalType ?? ''))) score += 2;
  if (domain === 'learning' && ['study_course', 'exam_prep', 'coding_project', 'career_skill'].includes(String(goal.domain ?? ''))) score += 4;
  if (domain === 'project' && goal.goalType === 'project') score += 4;
  if (domain === 'fitness' && scoreText(haystack, ['sql', 'python', 'data', '学习', 'coding']) > 0) score -= 100;
  if (domain === 'learning' && scoreText(haystack, ['健身', '胸', '背', '腿', 'fitness', 'strength']) > 0) score -= 100;
  return score;
}

function moduleMatchesDomain(module: QuestModule, domain: SmartRouteDomain, rawText: string): number {
  const words = routeWords(domain, rawText).module;
  return scoreText(`${module.name} ${module.description ?? ''}`, words);
}

export function getSmartRouteResult(context: SmartRouteContext): SmartRouteResult {
  const { rawText, entry, goals, modules, skills, lang } = context;
  const domain = inferSmartRouteDomain(rawText, entry);
  const goalCandidates = goals
    .map((goal) => ({ goal, score: goalMatchesDomain(goal, domain, rawText) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => candidateFromGoal(item.goal, Math.min(1, item.score / 8)));

  const selectedGoalId = goalCandidates[0]?.id;
  const candidateModules = modules
    .filter((module) => !selectedGoalId || module.goalId === selectedGoalId)
    .map((module) => ({ module, score: moduleMatchesDomain(module, domain, rawText) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => candidateFromModule(item.module, Math.min(1, item.score / 4)));

  const selectedModuleId = candidateModules[0]?.id;
  const needle = normalize(entry.skillName);
  const skillCandidates = skills
    .filter((skill) => {
      const name = normalize(skill.name);
      if (needle && (name === needle || name.includes(needle) || needle.includes(name))) return true;
      if (domain === 'fitness') return scoreText(skill.name, routeWords(domain, rawText).module) > 0 || skill.taskType === 'strength_training';
      if (domain === 'learning') return scoreText(skill.name, ['sql', 'python', 'excel', 'tableau', '学习', 'coding']) > 0 || skill.taskType === 'deep_study';
      return false;
    })
    .slice(0, 6)
    .map((skill) => candidateFromSkill(skill, normalize(skill.name) === needle ? 1 : 0.65));

  if (domain === 'learning') {
    goalCandidates.push({ name: lang === 'zh' ? '创建学习目标' : 'Create learning goal', type: 'create_new', confidence: 0.35 });
    goalCandidates.push({ name: lang === 'zh' ? '未归属学习记录' : 'Unassigned learning log', type: 'unassigned', confidence: 0.25 });
  }
  if (domain === 'fitness' && goalCandidates.length === 0) {
    goalCandidates.push({ name: lang === 'zh' ? '创建健身目标' : 'Create fitness goal', type: 'create_new', confidence: 0.3 });
  }

  const confidence: SmartRouteConfidence = selectedGoalId && selectedModuleId ? 'high' : selectedGoalId ? 'medium' : 'low';
  return {
    domain,
    confidence,
    goalCandidates,
    moduleCandidates: candidateModules,
    skillCandidates,
    selectedGoalId,
    selectedModuleId,
    selectedSkillIds: skillCandidates.map((skill) => skill.id).filter(Boolean) as string[],
    allowCreateGoal: domain === 'fitness' || domain === 'learning' || domain === 'project',
    allowCreateModule: domain === 'fitness' || domain === 'learning' || domain === 'project',
    allowCreateSkill: domain !== 'food' && domain !== 'state',
    reason: domain,
  };
}

