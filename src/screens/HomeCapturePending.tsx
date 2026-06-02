/**
 * HomeCapturePending.tsx — Spec B-3 确认入库卡片
 *
 * 展示 LLM 解析出的结构化执行数据，让用户确认后才真正写入 store。
 * 铁律：
 * - 所有颜色 questTheme.colors.*
 * - 所有文案 t(lang, key)
 * - 容器 QuestCard
 * - 写入通过现有 store mutations（不新建逻辑）
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useStore } from '../store';
import { getQuestTheme } from '../design/tokens';
import { getLanguage, t } from '../i18n';
import { Category, CompletionSchema, ParsedEntry, ProgressType, QuestModule, TaskType } from '../types';
import QuestCard from '../components/ui/QuestCard';
import { assessCaptureCompletion } from '../utils/captureCompletion';
import { getSmartRouteResult, SmartRouteResult } from '../utils/smartRouting';

// ── Per-entry UI state ────────────────────────────────────────────────────────

type EntryUI = {
  include: boolean;    // for existing skills: include in log (default true)
  createNew: boolean;  // for new skills: create it (default false, user opts in)
  moduleId: string | null;
  durationMinutes?: number | null;
  qualityRating?: number;
  rpe?: number;
  selectedSkillName?: string;
  selectedSkillId?: string | null;
  selectedGoalId?: string;
  selectedModuleId?: string;
  selectedExerciseNames?: string[];
  customExerciseNames?: string[];
  customExerciseName?: string;
  exerciseDetails?: Record<string, ExerciseDetailUI>;
  scope?: string;
  studyNote?: string;
};

type ExerciseDetailUI = {
  weight?: string;
  sets?: string;
  reps?: string;
  rpe?: number | null;
};

type SemanticRoute = {
  route: 'chest' | 'back' | 'data' | 'fitness' | 'study' | 'custom';
  goalType: 'fitness' | 'study' | 'project' | 'career' | 'custom';
  taskType: TaskType;
  progressType: ProgressType;
  goalKeywords: string[];
  moduleKeywords: string[];
  avoidGoalKeywords?: string[];
};

type NormalizedStrengthSet = {
  weight?: number;
  reps?: number;
  sets?: number;
  rpe?: number;
};

type RoutingResult = {
  linkedGoalId?: string;
  linkedModuleId?: string;
  linkedSkillId?: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  needsUserChoice: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseTargetDate(text?: string): string {
  const normalized = String(text ?? '').toLowerCase();
  const now = new Date();
  if (normalized.includes('昨天') || normalized.includes('yesterday')) return dateStr(addDays(now, -1));
  return dateStr(now);
}

function inferTaskType(goalType: string, progressType: string): TaskType {
  if (progressType === 'performance_log') return 'strength_training';
  if (goalType === 'fitness') return 'cardio_recovery';
  return 'deep_study';
}

function normalizeName(value?: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fff]/g, '');
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(normalizeName(keyword)));
}

function inferSemanticRoute(entry: ParsedEntry, captureText?: string): SemanticRoute {
  const text = normalizeName(`${entry.skillName} ${entry.fields?.note ?? ''} ${captureText ?? ''}`);

  if (containsAny(text, ['sql', 'python', 'tableau', 'excel', 'bi', 'analytics', '数据', '编程', '学习'])) {
    return {
      route: 'data',
      goalType: containsAny(text, ['app', '项目', 'project', 'coding']) ? 'project' : 'study',
      taskType: 'deep_study',
      progressType: entry.progressType === 'time_based' ? 'time_based' : (entry.progressType as ProgressType),
      goalKeywords: ['data', '数据', 'sql', 'python', 'bi', 'analytics', '分析', '学习', '编程', 'coding', 'study'],
      moduleKeywords: ['data', '数据', 'sql', 'python', 'bi', 'analytics', '练习', '概念', '学习', '编程', 'practice', 'concepts'],
      avoidGoalKeywords: ['健身', '胸', '背', '腿', 'fitness', 'gym', 'strength'],
    };
  }

  if (containsAny(text, ['上斜卧推', '卧推', 'benchpress', 'flatbench', 'inclinebench', 'inclinepress', 'dip', 'dips', '双杠臂屈伸'])) {
    return {
      route: 'chest',
      goalType: 'fitness',
      taskType: 'strength_training',
      progressType: 'performance_log',
      goalKeywords: ['健身', '力量', '胸', '上肢', 'fitness', 'strength', 'physique', 'gym'],
      moduleKeywords: ['练胸', '胸部', '胸', 'push', 'pushing', 'upperpush', 'upper', 'chest'],
    };
  }

  if (containsAny(text, ['划船', '引体向上', 'pullup', 'pull-up', 'chinup', 'chin-up', 'barbellrow', 'cablerow', 'row'])) {
    return {
      route: 'back',
      goalType: 'fitness',
      taskType: 'strength_training',
      progressType: 'performance_log',
      goalKeywords: ['健身', '力量', '背', '上肢', 'fitness', 'strength', 'physique', 'gym'],
      moduleKeywords: ['练背', '背部', '背', 'pull', 'pulling', 'back', 'row'],
    };
  }

  if (entry.progressType === 'performance_log' || entry.goalType === 'fitness') {
    return {
      route: 'fitness',
      goalType: 'fitness',
      taskType: 'strength_training',
      progressType: 'performance_log',
      goalKeywords: ['健身', '力量', 'fitness', 'strength', 'physique', 'gym'],
      moduleKeywords: ['训练', '力量', 'fitness', 'strength', 'workout'],
    };
  }

  if (entry.progressType === 'time_based' || entry.goalType === 'study') {
    return {
      route: 'study',
      goalType: 'study',
      taskType: 'deep_study',
      progressType: 'time_based',
      goalKeywords: ['学习', '课程', 'study', 'course', 'skill'],
      moduleKeywords: ['学习', '概念', '练习', '复习', 'study', 'concepts', 'practice', 'review'],
    };
  }

  return {
    route: 'custom',
    goalType: 'custom',
    taskType: inferTaskType(entry.goalType ?? 'custom', entry.progressType),
    progressType: entry.progressType as ProgressType,
    goalKeywords: [],
    moduleKeywords: [],
  };
}

function scoreByKeywords(value: string | undefined, keywords: string[]): number {
  const normalized = normalizeName(value);
  if (!normalized) return 0;
  return keywords.reduce((score, keyword) => score + (normalized.includes(normalizeName(keyword)) ? 1 : 0), 0);
}

function selectBestCategory(categories: Category[], route: SemanticRoute): Category | null {
  const scored = categories
    .map((category) => {
      const haystack = `${category.name} ${category.description ?? ''} ${category.goalType ?? ''} ${category.domain ?? ''}`;
      const avoid = route.avoidGoalKeywords && scoreByKeywords(haystack, route.avoidGoalKeywords) > 0;
      if (avoid) return { category, score: -100 };
      let score = scoreByKeywords(haystack, route.goalKeywords);
      if (category.goalType === route.goalType) score += 2;
      if (route.goalType === 'fitness' && String(category.domain ?? '').startsWith('fitness')) score += 3;
      if ((route.route === 'data' || route.route === 'study') && ['study_course', 'exam_prep', 'coding_project', 'career_skill'].includes(String(category.domain ?? ''))) score += 3;
      return { category, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.category ?? null;
}

function categoryMatchesRoute(category: Category, route: SemanticRoute): boolean {
  const haystack = `${category.name} ${category.description ?? ''} ${category.goalType ?? ''} ${category.domain ?? ''}`;
  if (route.avoidGoalKeywords && scoreByKeywords(haystack, route.avoidGoalKeywords) > 0) return false;
  if (route.route === 'custom') return true;
  return scoreByKeywords(haystack, route.goalKeywords) > 0
    || category.goalType === route.goalType
    || (route.goalType === 'fitness' && String(category.domain ?? '').startsWith('fitness'))
    || ((route.route === 'data' || route.route === 'study') && ['study_course', 'exam_prep', 'coding_project', 'career_skill'].includes(String(category.domain ?? '')));
}

function selectBestModule(modules: QuestModule[], route: SemanticRoute): QuestModule | null {
  const scored = modules
    .map((module) => ({
      module,
      score: scoreByKeywords(`${module.name} ${module.description ?? ''}`, route.moduleKeywords),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (scored[0]) return scored[0].module;
  if (modules.length === 1 || route.route === 'data' || route.route === 'study') return modules[0] ?? null;
  return null;
}

function expandStrengthSets(entry: ParsedEntry): NormalizedStrengthSet[] {
  const fields: any = entry.fields ?? {};
  const baseWeight = Number.isFinite(Number(fields.weight)) ? Number(fields.weight)
    : Number.isFinite(Number(fields.value)) ? Number(fields.value)
      : Number.isFinite(Number(fields.extraWeight)) ? Number(fields.extraWeight)
        : undefined;
  const rawSets = fields.sets;
  if (Array.isArray(rawSets)) {
    return rawSets.flatMap((set: any) => {
      const count = Math.max(1, Math.round(Number(set.sets ?? set.count ?? 1)));
      const weight = Number.isFinite(Number(set.weight)) ? Number(set.weight) : baseWeight;
      const reps = Number.isFinite(Number(set.reps)) ? Number(set.reps) : undefined;
      return Array.from({ length: count }, () => ({ weight, reps, sets: 1, rpe: Number.isFinite(Number(set.rpe)) ? Number(set.rpe) : undefined }));
    });
  }
  const compactMatch = typeof rawSets === 'string' ? rawSets.match(/(\d+)\s*[x×]\s*(\d+)/i) : null;
  const count = Number.isFinite(Number(fields.sets)) ? Number(fields.sets)
    : compactMatch ? Number(compactMatch[1])
      : undefined;
  const reps = Number.isFinite(Number(fields.reps)) ? Number(fields.reps)
    : compactMatch ? Number(compactMatch[2])
      : undefined;
  if (count && reps) {
    return Array.from({ length: Math.max(1, Math.round(count)) }, () => ({ weight: baseWeight, reps, sets: 1 }));
  }
  return [];
}

function compactStrengthSet(sets: NormalizedStrengthSet[]): NormalizedStrengthSet | undefined {
  if (sets.length === 0) return undefined;
  const first = sets[0];
  const sameWeight = sets.every((set) => set.weight === first.weight);
  const sameReps = sets.every((set) => set.reps === first.reps);
  if (sameWeight && sameReps) {
    return { weight: first.weight, reps: first.reps, sets: sets.length, rpe: first.rpe };
  }
  const top = sets.reduce((best, set) => ((set.weight ?? 0) > (best.weight ?? 0) ? set : best), first);
  return { ...top, sets: sets.length };
}

function setsSummary(entry: ParsedEntry, lang: 'zh' | 'en'): string {
  const sets = expandStrengthSets(entry);
  if (sets.length === 0) return '';
  const compact = compactStrengthSet(sets);
  if (compact?.weight != null && compact.reps != null && compact.sets != null) {
    return t(lang, 'scEntryWeightSets')
      .replace('{w}', String(compact.weight))
      .replace('{r}', String(compact.reps))
      .replace('{s}', String(compact.sets));
  }
  // Group by weight to get compact representation
  const count = sets.length;
  const byWeight = new Map<number | undefined, number[]>();
  for (const s of sets) {
    const w = s.weight;
    if (!byWeight.has(w)) byWeight.set(w, []);
    byWeight.get(w)!.push(s.reps ?? 0);
  }
  const parts: string[] = [];
  for (const [w, repsArr] of byWeight) {
    const repsStr = repsArr.join('/');
    if (w != null && w > 0) {
      parts.push(
        t(lang, 'scEntryWeight').replace('{w}', String(w)).replace('{r}', repsStr),
      );
    } else {
      parts.push(`×${repsStr}`);
    }
  }
  return `${t(lang, 'scEntrySets').replace('{n}', String(count))} (${parts.join(', ')})`;
}

function durationSummary(entry: ParsedEntry, lang: 'zh' | 'en'): string {
  const min = entry.fields.durationMinutes;
  if (min == null) return '';
  const base = t(lang, 'scEntryDuration').replace('{n}', String(min));
  return entry.fields.note ? `${base} · ${entry.fields.note}` : base;
}

function entrySummary(entry: ParsedEntry, lang: 'zh' | 'en'): string {
  if (entry.progressType === 'performance_log') return setsSummary(entry, lang);
  if (entry.progressType === 'time_based')       return durationSummary(entry, lang);
  if (entry.fields.value != null) return `${entry.fields.value}${entry.fields.unit ?? ''}`;
  return '';
}

// Estimate execution duration for totalXP (durationMinutes required by store)
function estimateDuration(entry: ParsedEntry): number {
  if (entry.progressType === 'time_based') return entry.fields.durationMinutes ?? 0;
  if (entry.progressType === 'performance_log') {
    return entry.fields.durationMinutes ?? 0;
  }
  return entry.fields.durationMinutes ?? 0;
}

function entryWithCompletion(entry: ParsedEntry, ui: EntryUI): ParsedEntry {
  const fields = {
    ...entry.fields,
    ...(ui.durationMinutes !== undefined ? { durationMinutes: ui.durationMinutes ?? undefined } : {}),
    ...(ui.rpe != null ? { rpe: ui.rpe } : {}),
    ...(ui.scope ? { scope: ui.scope } : {}),
    ...(ui.studyNote ? { note: ui.studyNote } : {}),
  };
  return {
    ...entry,
    skillName: ui.selectedSkillName ?? entry.skillName,
    matchedSkillId: ui.selectedSkillId !== undefined ? ui.selectedSkillId : entry.matchedSkillId,
    qualityRating: ui.qualityRating ?? entry.qualityRating,
    fields,
  };
}

function parseOptionalNumber(value?: string): number | undefined {
  if (value == null || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function selectedExercisesFor(ui: EntryUI): string[] {
  const selected = ui.selectedExerciseNames ?? [];
  return selected;
}

function displayRouteConfidenceKey(confidence: SmartRouteResult['confidence']) {
  if (confidence === 'high') return 'routeConfidenceHigh';
  if (confidence === 'medium') return 'routeConfidenceMedium';
  return 'routeConfidenceLow';
}

function progressTypeFromCompletionDomain(domain?: CompletionSchema['domain']): ProgressType {
  if (domain === 'fitness') return 'performance_log';
  if (domain === 'learning') return 'time_based';
  return 'qualitative';
}

function goalTypeFromCompletionDomain(domain?: CompletionSchema['domain']): string {
  if (domain === 'fitness') return 'fitness';
  if (domain === 'learning') return 'study';
  if (domain === 'state') return 'health';
  return 'custom';
}

function entryFromTopLevelCompletion(schema: CompletionSchema | undefined, captureText: string): ParsedEntry[] {
  if (!schema?.needsCompletion) return [];
  const progressType = progressTypeFromCompletionDomain(schema.domain);
  return [{
    skillName: captureText.trim() || schema.suggestedActions[0] || 'capture',
    matchedSkillId: null,
    goalType: goalTypeFromCompletionDomain(schema.domain),
    progressType,
    fields: {},
  }];
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  captureId: string;
  entries: ParsedEntry[];
  onDismiss: () => void;  // called after confirm or ignore (marks entriesDismissed)
};

export default function HomeCapturePending({ captureId, entries, onDismiss }: Props) {
  const { data, addSkill, createExecutionLog, addExistingSkillToModule } = useStore();
  const lang = getLanguage(data.settings.language ?? data.settings.preferredLanguage);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const capture = (data.rawCaptures || []).find((item) => item.id === captureId);
  const captureText = capture?.text ?? '';
  const completionSchema = capture?.parsed?.completionSchema;
  const effectiveEntries = entries.length > 0 ? entries : entryFromTopLevelCompletion(completionSchema, captureText);

  const [entryStates, setEntryStates] = useState<EntryUI[]>(() =>
    effectiveEntries.map((e) => ({
      include:   true,                         // confirmation card means user can opt out before writing
      createNew: e.matchedSkillId == null,     // unmatched concrete entries should be written after confirm
      moduleId:  null,
    })),
  );
  const [logged, setLogged] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Modules available for new-skill assignment
  const modulesFor = useCallback((goalType: string) => {
    const cat = data.categories.find((c) => c.goalType === goalType);
    if (!cat) return [];
    return (data.modules || []).filter((m) => m.goalId === cat.id);
  }, [data.categories, data.modules]);

  const toggleInclude = (i: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, include: !e.include } : e));

  const toggleCreateNew = (i: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, createNew: !e.createNew } : e));

  const setModule = (i: number, moduleId: string | null) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, moduleId } : e));

  const setDuration = (i: number, durationMinutes: number | null) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, durationMinutes } : e));

  const setQuality = (i: number, qualityRating: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, qualityRating } : e));

  const setRpe = (i: number, rpe: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, rpe } : e));

  const setSelectedSkill = (i: number, skillName: string, skillId?: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, selectedSkillName: skillName, selectedSkillId: skillId ?? null, createNew: !skillId } : e));

  const setSelectedGoal = (i: number, goalId?: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, selectedGoalId: goalId, selectedModuleId: undefined } : e));

  const setSelectedModule = (i: number, moduleId?: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, selectedModuleId: moduleId, moduleId: moduleId ?? e.moduleId } : e));

  const toggleExercise = (i: number, exerciseName: string) =>
    setEntryStates((s) => s.map((e, idx) => {
      if (idx !== i) return e;
      const current = e.selectedExerciseNames ?? [];
      const exists = current.includes(exerciseName);
      const next = exists ? current.filter((name) => name !== exerciseName) : [...current, exerciseName];
      return {
        ...e,
        selectedExerciseNames: next,
        selectedSkillName: next[0] ?? e.selectedSkillName,
        createNew: true,
      };
    }));

  const setCustomExercise = (i: number, exerciseName: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, customExerciseName: exerciseName } : e));

  const addCustomAction = (i: number, domain: string) =>
    setEntryStates((s) => s.map((e, idx) => {
      if (idx !== i) return e;
      const customName = e.customExerciseName?.trim();
      if (!customName) return e;
      if (domain === 'learning') {
        const currentCustom = e.customExerciseNames ?? [];
        const customExists = currentCustom.some((name) => normalizeName(name) === normalizeName(customName));
        return {
          ...e,
          scope: customName,
          studyNote: customName,
          customExerciseNames: customExists ? currentCustom : [...currentCustom, customName],
          customExerciseName: '',
          selectedSkillName: customName,
          createNew: true,
        };
      }
      const current = e.selectedExerciseNames ?? [];
      const exists = current.some((name) => normalizeName(name) === normalizeName(customName));
      const currentCustom = e.customExerciseNames ?? [];
      const customExists = currentCustom.some((name) => normalizeName(name) === normalizeName(customName));
      return {
        ...e,
        selectedExerciseNames: exists ? current : [...current, customName],
        customExerciseNames: customExists ? currentCustom : [...currentCustom, customName],
        selectedSkillName: customName,
        createNew: true,
        customExerciseName: '',
      };
    }));

  const setExerciseDetail = (i: number, exerciseName: string, key: keyof ExerciseDetailUI, value: string | number | null) =>
    setEntryStates((s) => s.map((e, idx) => {
      if (idx !== i) return e;
      const current = e.exerciseDetails ?? {};
      return {
        ...e,
        exerciseDetails: {
          ...current,
          [exerciseName]: {
            ...(current[exerciseName] ?? {}),
            [key]: value,
          },
        },
      };
    }));

  const setScope = (i: number, scope: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, scope } : e));

  const setStudyNote = (i: number, studyNote: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, studyNote } : e));

  // ── Smart category resolution (no Alert.alert — direct TouchableOpacity) ──

  /** Find the best matching category for an entry.
   *  Strategy: goalType match → same-taskType skill's category → first category.
   *  This fixes the "未分类" bug: most categories have goalType undefined,
   *  so goalType-only lookup always returns null.
   */
  const resolveSkill = useCallback((entry: ParsedEntry) => {
    if (entry.matchedSkillId) {
      const direct = data.skills.find((s) => s.id === entry.matchedSkillId);
      if (direct) return direct;
    }
    const wanted = normalizeName(entry.skillName);
    if (!wanted) return undefined;
    return data.skills.find((s) => {
      const current = normalizeName(s.name);
      return current === wanted || current.includes(wanted) || wanted.includes(current);
    });
  }, [data.skills]);

  const resolvePrimaryLink = useCallback((skillId?: string) => {
    if (!skillId) return undefined;
    return (data.moduleSkillLinks || []).find((link) => link.skillId === skillId);
  }, [data.moduleSkillLinks]);

  const resolveCategory = useCallback((entry: ParsedEntry, skillId?: string) => {
    const route = inferSemanticRoute(entry, captureText);
    const existingSkill = skillId ? data.skills.find((s) => s.id === skillId) : undefined;
    if (existingSkill?.categoryId) {
      const bySkill = data.categories.find((c) => c.id === existingSkill.categoryId);
      if (bySkill && categoryMatchesRoute(bySkill, route)) return bySkill;
    }
    const linkedGoalId = resolvePrimaryLink(skillId)?.goalId;
    if (linkedGoalId) {
      const byLink = data.categories.find((c) => c.id === linkedGoalId);
      if (byLink && categoryMatchesRoute(byLink, route)) return byLink;
    }

    const semanticMatch = selectBestCategory(data.categories || [], route);
    if (semanticMatch) return semanticMatch;

    // Find a category that already hosts a skill with the same taskType, but never
    // use this fallback for data/study routes if it would incorrectly pick fitness.
    const taskType = route.taskType;
    const siblingSkill = data.skills.find((s) => s.taskType === taskType && !!s.categoryId);
    if (siblingSkill) {
      const bySibling = data.categories.find((c) => c.id === siblingSkill.categoryId);
      if (bySibling && categoryMatchesRoute(bySibling, route)) return bySibling;
    }

    // Unknown semantic route may use the first category as a last resort; known
    // semantic routes should stay unlinked rather than polluting the wrong goal.
    return route.route === 'custom' ? data.categories[0] ?? null : null;
  }, [captureText, data.categories, data.skills, resolvePrimaryLink]);

  const resolveModule = useCallback((goalId: string | undefined, entry: ParsedEntry) => {
    if (!goalId) return undefined;
    const route = inferSemanticRoute(entry, captureText);
    const modules = (data.modules || []).filter((module) => module.goalId === goalId);
    return selectBestModule(modules, route)?.id;
  }, [captureText, data.modules]);

  const resolveRouting = useCallback((entry: ParsedEntry): RoutingResult => {
    const matchedSkill = resolveSkill(entry);
    const route = inferSemanticRoute(entry, captureText);
    let linkedGoalId: string | undefined;
    let linkedModuleId: string | undefined;

    if (matchedSkill?.id) {
      const link = resolvePrimaryLink(matchedSkill.id);
      const linkedGoal = link?.goalId ? data.categories.find((goal) => goal.id === link.goalId) : undefined;
      const skillGoal = matchedSkill.categoryId ? data.categories.find((goal) => goal.id === matchedSkill.categoryId) : undefined;
      linkedGoalId = linkedGoal && categoryMatchesRoute(linkedGoal, route)
        ? linkedGoal.id
        : skillGoal && categoryMatchesRoute(skillGoal, route)
          ? skillGoal.id
          : undefined;
      linkedModuleId = linkedGoalId === link?.goalId ? link?.moduleId : undefined;
    }

    if (!linkedGoalId) linkedGoalId = resolveCategory(entry, matchedSkill?.id)?.id;
    linkedModuleId = linkedModuleId ?? resolveModule(linkedGoalId, entry);

    return {
      linkedGoalId,
      linkedModuleId,
      linkedSkillId: matchedSkill?.id,
      confidence: linkedGoalId && linkedModuleId ? 'high' : linkedGoalId ? 'medium' : 'low',
      reason: route.route,
      needsUserChoice: !linkedGoalId,
    };
  }, [captureText, data.categories, resolveCategory, resolveModule, resolvePrimaryLink, resolveSkill]);

  const allActive = entryStates.every((state, index) => {
    const existing = !!resolveSkill(effectiveEntries[index]);
    return existing ? state.include : state.createNew;
  });

  const setAllActive = (active: boolean) => {
    setEntryStates((states) => states.map((state) => ({
      ...state,
      include: active,
      createNew: active,
    })));
  };

  const handleConfirm = useCallback(() => {
    if (confirming || logged) return;
    setConfirming(true);
    const date = parseTargetDate(captureText);

    effectiveEntries.forEach((entry, i) => {
      if (completionSchema && (completionSchema.domain === 'state' || completionSchema.domain === 'food')) return;
      const ui = entryStates[i];
      const assessment = assessCaptureCompletion(captureText, entry, { goals: data.categories, modules: data.modules || [], skills: data.skills, lang });
      if (assessment.status === 'not_recordable') return;
      const completedEntry = entryWithCompletion(entry, ui);
      const smartRoute = getSmartRouteResult({ rawText: captureText, entry: completedEntry, goals: data.categories, modules: data.modules || [], skills: data.skills, lang });
      const multiExercises = smartRoute.domain === 'fitness' ? selectedExercisesFor(ui) : [];
      if (assessment.missingFields.includes('targetSkill') && multiExercises.length === 0 && !ui.selectedSkillName && !resolveSkill(entry)) return;
      const matchedSkill = resolveSkill(completedEntry);
      let skillId = matchedSkill?.id ?? null;
      let linkedGoalId: string | undefined;
      let linkedModuleId: string | undefined;
      const sourceKey = `${captureId}:${i}`;
      const alreadyLogged = (data.executionLogs || []).some((log) => (
        log.structuredData?.sourceCaptureId === captureId
        && log.structuredData?.sourceCaptureEntryIndex === i
      ));
      if (alreadyLogged) return;
      const semanticRoute = inferSemanticRoute(completedEntry, captureText);
      const routing = resolveRouting(completedEntry);

      if (smartRoute.domain === 'fitness' && multiExercises.length > 0) {
        if (matchedSkill && !ui.include) return;
        if (!matchedSkill && !ui.createNew) return;
        const selectedGoalId = ui.selectedGoalId ?? smartRoute.selectedGoalId ?? routing.linkedGoalId;
        const selectedModuleId = ui.selectedModuleId ?? ui.moduleId ?? smartRoute.selectedModuleId ?? routing.linkedModuleId;
        const sessionDuration = estimateDuration(completedEntry);
        const perActionDuration = sessionDuration > 0 ? Math.max(1, Math.round(sessionDuration / multiExercises.length)) : 0;

        multiExercises.forEach((exerciseName, actionIndex) => {
          const isCustomAction = (ui.customExerciseNames ?? []).some((name) => normalizeName(name) === normalizeName(exerciseName));
          const actionKey = `${captureId}:${i}:${normalizeName(exerciseName)}`;
          const actionAlreadyLogged = (data.executionLogs || []).some((log) => log.structuredData?.sourceCaptureEntryKey === actionKey);
          if (actionAlreadyLogged) return;
          const existingSkill = data.skills.find((skill) => normalizeName(skill.name) === normalizeName(exerciseName));
          let actionSkillId = existingSkill?.id;
          if (!actionSkillId && ui.createNew) {
            const created = addSkill({
              name: exerciseName,
              color: questTheme.colors.primary,
              dailyTargetMinutes: 30,
              progressType: 'performance_log',
              taskType: 'strength_training',
              categoryId: selectedGoalId,
              scheduleEnabled: false,
              scheduleType: 'manual_only' as const,
              metricConfig: {
                metricType: 'performance_log',
                performanceType: 'strength',
                primaryMetric: 'weight',
                trackRPE: true,
              },
            });
            actionSkillId = created.id;
            if (selectedGoalId && selectedModuleId) {
              addExistingSkillToModule(selectedGoalId, selectedModuleId, actionSkillId);
            }
          }
          if (!actionSkillId) return;
          const detail = ui.exerciseDetails?.[exerciseName] ?? {};
          const weight = parseOptionalNumber(detail.weight);
          const sets = parseOptionalNumber(detail.sets);
          const reps = parseOptionalNumber(detail.reps);
          const rpe = typeof detail.rpe === 'number' ? detail.rpe : ui.rpe;
          const totalVolume = weight && sets && reps ? weight * sets * reps : undefined;
          const strengthSet = (weight || sets || reps || rpe)
            ? { weight, sets, reps, rpe: rpe ?? undefined }
            : undefined;
          createExecutionLog({
            id: `capture-${captureId}-${i}-${actionIndex}`,
            linkedSkillId: actionSkillId,
            linkedGoalId: selectedGoalId,
            linkedModuleId: selectedModuleId,
            date,
            durationMinutes: perActionDuration,
            qualityRating: completedEntry.qualityRating as any,
            source: 'manual',
            title: exerciseName,
            taskType: 'strength_training',
            actualData: {
              kind: 'strength_training',
              exerciseName,
              strength: { weight, reps, sets, volume: totalVolume, rpe },
              sets: strengthSet ? [strengthSet] : [],
              rawParsedFields: completedEntry.fields,
            },
            structuredData: {
              exerciseName,
              weight,
              sets,
              reps,
              rpe,
              sessionDurationMinutes: sessionDuration || undefined,
              durationMinutes: perActionDuration,
              sourceCaptureId: captureId,
              sourceCaptureEntryIndex: i,
              sourceCaptureEntryKey: actionKey,
              sourceActionType: isCustomAction ? 'customAction' : 'suggestedAction',
              source: isCustomAction ? 'customAction' : 'suggestedAction',
              isCustomAction,
              customAction: isCustomAction ? exerciseName : undefined,
              route: smartRoute.domain,
              routeConfidence: smartRoute.confidence,
              routeReason: smartRoute.reason,
              selectedExerciseCount: multiExercises.length,
              rawParsedFields: completedEntry.fields,
            },
            metricUpdate: {
              metricType: 'performance_log',
              performanceValue: weight,
              performanceUnit: weight != null ? 'kg' : undefined,
              performanceData: {
                performanceType: 'strength',
                strengthSets: strengthSet ? [strengthSet] : [],
                totalVolume,
                sourceCaptureId: captureId,
              },
            },
          });
        });
        return;
      }

      if (!skillId && ui.createNew) {
        // ── New skill path ──────────────────────────────────────────────────
        const cat = resolveCategory(completedEntry);
        const resolvedGoalId = ui.selectedGoalId ?? smartRoute.selectedGoalId ?? routing.linkedGoalId ?? cat?.id;
        const resolvedGoal = resolvedGoalId
          ? data.categories.find((goal) => goal.id === resolvedGoalId)
          : undefined;
        const newSkillTaskType = semanticRoute.taskType;
        const newSkillProgressType = semanticRoute.progressType;
        const newSkill = addSkill({
          name: completedEntry.skillName,
          color: questTheme.colors.primary,
          dailyTargetMinutes: completedEntry.progressType === 'time_based'
            ? (completedEntry.fields.durationMinutes ?? 30) : 30,
          progressType: newSkillProgressType,
          taskType: newSkillTaskType,
          categoryId: resolvedGoalId,                    // explicit categoryId — fixes "未分类"
          scheduleEnabled: false,
          scheduleType: 'manual_only' as const,
          metricConfig: {
            metricType: newSkillProgressType,
            performanceType: newSkillProgressType === 'performance_log' ? 'strength' : undefined,
            primaryMetric: newSkillProgressType === 'performance_log' ? 'weight' : undefined,
          },
        });
        skillId = newSkill.id;
        linkedGoalId = resolvedGoalId;                   // fixes "健身目标里看不到"

        // Link to a module so GoalDetailScreen's linkedSkillIds filter finds it
        const targetModuleId = ui.moduleId
          ?? ui.selectedModuleId
          ?? smartRoute.selectedModuleId
          ?? routing.linkedModuleId
          ?? resolveModule(resolvedGoalId, completedEntry);
        linkedModuleId = targetModuleId;
        if (resolvedGoal && targetModuleId) {
          addExistingSkillToModule(resolvedGoal.id, targetModuleId, skillId);
        }
      } else if (skillId) {
        // ── Existing matched skill path ──────────────────────────────────────
        const link = resolvePrimaryLink(skillId);
        const linkedGoal = link?.goalId ? data.categories.find((goal) => goal.id === link.goalId) : undefined;
        const skillGoal = matchedSkill?.categoryId ? data.categories.find((goal) => goal.id === matchedSkill.categoryId) : undefined;
        linkedGoalId = ui.selectedGoalId ?? smartRoute.selectedGoalId ?? routing.linkedGoalId ?? (linkedGoal && categoryMatchesRoute(linkedGoal, semanticRoute)
          ? linkedGoal.id
          : skillGoal && categoryMatchesRoute(skillGoal, semanticRoute)
            ? skillGoal.id
            : undefined);
        linkedModuleId = linkedGoalId === link?.goalId ? link?.moduleId : undefined;
        linkedModuleId = ui.selectedModuleId ?? smartRoute.selectedModuleId ?? linkedModuleId ?? routing.linkedModuleId ?? resolveModule(linkedGoalId, completedEntry);
        if (!linkedGoalId) {
          linkedGoalId = resolveCategory(completedEntry, skillId)?.id;
          linkedModuleId = resolveModule(linkedGoalId, completedEntry);
        }
      }

      // Gate: existing deselected or new not opted-in
      if (matchedSkill && !ui.include) return;
      if (!matchedSkill && !ui.createNew) return;
      if (!skillId) return;

      const durationMinutes = estimateDuration(completedEntry);
      const isStrength = semanticRoute.progressType === 'performance_log';
      const detailedStrengthSets = expandStrengthSets(completedEntry);
      const compactSet = compactStrengthSet(detailedStrengthSets);
      const strengthSets = compactSet ? [compactSet] : [];
      const topWeight = detailedStrengthSets.reduce((best, set) => Math.max(best, set.weight ?? 0), 0) || compactSet?.weight;
      const totalVolume = detailedStrengthSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0) * (set.sets ?? 1), 0) || undefined;
      const firstReps = compactSet?.reps ?? detailedStrengthSets.find((set) => set.reps)?.reps;
      const performanceData = isStrength ? {
        performanceType: 'strength',
        strengthSets,
        detailedStrengthSets,
        totalVolume,
        sourceCaptureId: captureId,
      } : undefined;
      const isCustomAction = (ui.customExerciseNames ?? []).some((name) => normalizeName(name) === normalizeName(completedEntry.skillName));

      createExecutionLog({
        id: `capture-${captureId}-${i}`,
        linkedSkillId: skillId,
        linkedGoalId,                              // explicit — fixes both symptoms
        linkedModuleId,
        date,
        durationMinutes,
        qualityRating: completedEntry.qualityRating as any,
        source: 'manual',
        title: completedEntry.skillName,
        taskType: semanticRoute.taskType,
        ...(completedEntry.progressType === 'time_based' ? { note: completedEntry.fields.note } : {}),
        actualData: isStrength ? {
          kind: 'strength_training',
          exerciseName: completedEntry.skillName,
          strength: {
            weight: topWeight,
            reps: firstReps,
            sets: strengthSets.length || undefined,
            volume: totalVolume,
          },
          sets: detailedStrengthSets,
          rawParsedFields: completedEntry.fields,
        } : undefined,
        structuredData: isStrength ? {
          exerciseName: completedEntry.skillName,
          weight: topWeight,
          sets: compactSet?.sets ?? (detailedStrengthSets.length || undefined),
          reps: firstReps,
          durationMinutes,
          sourceCaptureId: captureId,
          sourceCaptureEntryIndex: i,
          sourceCaptureEntryKey: sourceKey,
          route: semanticRoute.route,
          routeConfidence: routing.confidence,
          routeReason: routing.reason,
          needsUserChoice: routing.needsUserChoice,
          sourceActionType: isCustomAction ? 'customAction' : 'suggestedAction',
          source: isCustomAction ? 'customAction' : 'suggestedAction',
          isCustomAction,
          customAction: isCustomAction ? completedEntry.skillName : undefined,
          rawParsedFields: completedEntry.fields,
        } : {
          ...completedEntry.fields,
          sourceCaptureId: captureId,
          sourceCaptureEntryIndex: i,
          sourceCaptureEntryKey: sourceKey,
          route: semanticRoute.route,
          routeConfidence: routing.confidence,
          routeReason: routing.reason,
          needsUserChoice: routing.needsUserChoice,
          sourceActionType: isCustomAction ? 'customAction' : 'suggestedAction',
          source: isCustomAction ? 'customAction' : 'suggestedAction',
          isCustomAction,
          customAction: isCustomAction ? completedEntry.skillName : undefined,
        },
        metricUpdate: isStrength
          ? {
              metricType: 'performance_log' as ProgressType,
              performanceValue: topWeight,
              performanceUnit: topWeight != null ? 'kg' : undefined,
              performanceNote: completedEntry.fields.note,
              performanceData,
            }
          : {
              metricType: semanticRoute.progressType,
              minutesAdded: completedEntry.progressType === 'time_based' ? durationMinutes : undefined,
            },
      });
    });

    setLogged(true);
    onDismiss();
  }, [confirming, logged, captureText, effectiveEntries, entryStates, captureId, data.categories, data.modules, data.skills, data.executionLogs, lang, questTheme.colors.primary,
      resolveSkill, resolvePrimaryLink, resolveCategory, resolveModule, resolveRouting, addSkill, addExistingSkillToModule, createExecutionLog, onDismiss]);

  if (logged) {
    return (
      <View style={[pendStyles.loggedRow, { backgroundColor: questTheme.colors.successSoft, borderRadius: questTheme.radius.sm }]}>
        <Text style={[pendStyles.loggedText, { color: questTheme.colors.success }]}>
          {t(lang, 'scEntryLogged')}
        </Text>
      </View>
    );
  }

  const entryAssessments = effectiveEntries.map((entry, index) => {
    const completedEntry = entryWithCompletion(entry, entryStates[index]);
    return assessCaptureCompletion(captureText, completedEntry, { goals: data.categories, modules: data.modules || [], skills: data.skills, lang });
  });
  const recordableCount = entryAssessments.filter((assessment) => assessment.status !== 'not_recordable').length;

  return (
    <QuestCard questTheme={questTheme} variant="flat" style={{ marginTop: questTheme.spacing.sm }}>
      {/* Header */}
      <Text style={[pendStyles.header, { color: questTheme.colors.text, fontSize: questTheme.typography.bodySize }]}>
        {recordableCount > 0
          ? t(lang, 'scEntryDetected').replace('{n}', String(recordableCount))
          : t(lang, 'scContextDetected')}
      </Text>
      {effectiveEntries.length > 1 ? (
        <TouchableOpacity
          onPress={() => setAllActive(!allActive)}
          style={[pendStyles.bulkBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
        >
          <Text style={[pendStyles.bulkText, { color: questTheme.colors.primary }]}>
            {allActive ? t(lang, 'scDeselectAll') : t(lang, 'scSelectAll')}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Entry rows */}
      {effectiveEntries.map((entry, i) => {
        const ui = entryStates[i];
        const completedEntry = entryWithCompletion(entry, ui);
        const assessment = assessCaptureCompletion(captureText, completedEntry, { goals: data.categories, modules: data.modules || [], skills: data.skills, lang });
        const smartRoute = getSmartRouteResult({ rawText: captureText, entry: completedEntry, goals: data.categories, modules: data.modules || [], skills: data.skills, lang });

        // ── LLM-driven completionSchema overrides hardcoded routing ──────────
        const cs = capture?.parsed?.completionSchema;
        // Goal routing: LLM wins when available, falls back to local smartRoute
        const llmGoalId     = cs?.matchedGoalId ?? null;
        const llmModuleId   = cs?.matchedModuleId ?? null;
        const llmConfidence = cs?.goalConfidence ?? smartRoute.confidence;
        const llmDomain     = cs?.domain ?? (smartRoute.domain as string);

        const isRecordable = cs
          ? (cs.domain !== 'state' && cs.domain !== 'food')
          : assessment.status !== 'not_recordable';
        const isExisting = !!resolveSkill(completedEntry);
        const routing = resolveRouting(completedEntry);
        // Prefer LLM goal id → user selection → local routing → smartRoute
        const selectedGoalId   = ui.selectedGoalId ?? llmGoalId ?? smartRoute.selectedGoalId ?? routing.linkedGoalId;
        const selectedModuleId = ui.selectedModuleId ?? llmModuleId ?? smartRoute.selectedModuleId ?? routing.linkedModuleId;
        const selectedGoal   = selectedGoalId   ? data.categories.find((goal)   => goal.id === selectedGoalId)   : undefined;
        const selectedModule = selectedModuleId ? (data.modules || []).find((m)  => m.id    === selectedModuleId) : undefined;
        const routeForModules = inferSemanticRoute(completedEntry, captureText);
        const mods = isExisting ? [] : (
          selectedGoalId
            ? (data.modules || []).filter((module) => module.goalId === selectedGoalId)
            : modulesFor(routeForModules.goalType)
        );
        const summary = entrySummary(completedEntry, lang);
        const selectedExerciseNames = selectedExercisesFor(ui);
        const active = isRecordable && (llmDomain === 'fitness' && selectedExerciseNames.length > 0 ? true : (isExisting ? ui.include : ui.createNew));
        const tagColor = isExisting ? questTheme.colors.success : questTheme.colors.accent;
        const tagBg = isExisting ? questTheme.colors.successSoft : questTheme.colors.accentSoft;

        // Duration/quality/rpe suggestions: keep assessment for quality/rpe; duration comes from LLM durationOptions
        const durationSuggestions = cs?.durationOptions?.length
          ? cs.durationOptions.map((min) => ({
              id: String(min), label: `${min}min`, labelZh: `${min}分钟`,
              kind: 'duration' as const, value: min,
            }))
          : assessment.suggestedActions.filter((item) => item.kind === 'duration');
        const qualitySuggestions = assessment.suggestedActions.filter((item) => item.kind === 'quality');
        const rpeSuggestions     = assessment.suggestedActions.filter((item) => item.kind === 'rpe');
        // Exercise/scope chips: LLM suggestedActions replaces hardcoded lists
        const exerciseSuggestions = cs?.suggestedActions?.length
          ? cs.suggestedActions.map((name) => ({
              id: name, label: name, labelZh: name,
              kind: llmDomain === 'learning' ? ('scope' as const) : ('exercise' as const),
            }))
          : assessment.suggestedActions.filter((item) => item.kind === 'exercise' || item.kind === 'scope');
        const scopeOptions = cs?.suggestedActions?.length
          ? cs.suggestedActions
          : ['practice', 'project', 'debug', 'course', 'custom'];

        // Goal confidence display: suppress "需要确认归属" when LLM says high confidence
        const goalConfidenceKey = llmConfidence === 'high' ? 'routeConfidenceHigh' : displayRouteConfidenceKey(llmConfidence as any);

        return (
          <View key={i} style={[pendStyles.entryRow, { borderColor: questTheme.colors.border }]}>
            {/* Toggle / checkbox */}
            <TouchableOpacity
              onPress={() => isExisting ? toggleInclude(i) : toggleCreateNew(i)}
              style={[
                pendStyles.checkbox,
                {
                  borderColor: active ? tagColor : questTheme.colors.border,
                  backgroundColor: active ? tagColor + '22' : 'transparent',
                },
              ]}
              activeOpacity={0.7}
            >
              {active && <Text style={[pendStyles.checkmark, { color: tagColor }]}>✓</Text>}
            </TouchableOpacity>

            {/* Content */}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={pendStyles.nameRow}>
                <Text style={[pendStyles.skillName, { color: questTheme.colors.text }]}>
                  {assessment.status === 'not_recordable'
                    ? assessment.domain === 'state'
                      ? t(lang, 'scStateCandidate')
                      : t(lang, 'scFoodCandidate')
                    : entry.skillName}
                </Text>
                <View style={[pendStyles.tag, { backgroundColor: tagBg }]}>
                  <Text style={[pendStyles.tagText, { color: tagColor }]}>
                    {isExisting ? t(lang, 'scEntryExisting') : t(lang, 'scEntryNew')}
                  </Text>
                </View>
              </View>
              {summary ? (
                <Text style={[pendStyles.summary, { color: questTheme.colors.textMuted }]}>
                  {summary}
                </Text>
              ) : null}
              {isRecordable ? (
                <Text style={[pendStyles.routeLine, {
                  // high-confidence LLM match: show in muted (no warning); otherwise warn if routing is ambiguous
                  color: llmConfidence === 'high'
                    ? questTheme.colors.textMuted
                    : (routing.needsUserChoice ? questTheme.colors.warning : questTheme.colors.textMuted),
                }]}>
                  {t(lang, selectedGoal && selectedModule ? 'recordToPath' : 'confirmRoute')}: {selectedGoal?.name ?? t(lang, llmDomain === 'learning' ? 'unassignedLearning' : 'scEntryUnassigned')}
                  {selectedModule ? ` → ${selectedModule.name}` : ''}
                  {llmConfidence !== 'high' ? ` · ${t(lang, goalConfidenceKey)}` : ''}
                </Text>
              ) : null}
              {assessment.status === 'not_recordable' ? (
                <View style={[pendStyles.completionBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
                  <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>
                    {assessment.domain === 'state' ? t(lang, 'scStateCandidate') : t(lang, 'scFoodCandidate')}
                  </Text>
                  <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                    {assessment.domain === 'state' ? t(lang, 'scStateCandidateHint') : t(lang, 'scFoodCandidateHint')}
                  </Text>
                </View>
              ) : assessment.status === 'needs_completion' ? (
                <View style={[pendStyles.completionBox, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
                  <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>
                    {t(lang, 'scCompleteRecord')}
                  </Text>
                  {smartRoute.goalCandidates.length > 0 ? (
                    <>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'chooseGoal')}</Text>
                      <View style={pendStyles.chipRow}>
                        {smartRoute.goalCandidates.map((candidate) => {
                          const selected = !!candidate.id && selectedGoalId === candidate.id;
                          return (
                            <TouchableOpacity
                              key={`${candidate.type}:${candidate.id ?? candidate.name}`}
                              onPress={() => setSelectedGoal(i, candidate.id)}
                              style={[pendStyles.optionChip, {
                                borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>{candidate.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                  {smartRoute.moduleCandidates.length > 0 ? (
                    <>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'chooseModule')}</Text>
                      <View style={pendStyles.chipRow}>
                        {smartRoute.moduleCandidates.map((candidate) => {
                          const selected = !!candidate.id && selectedModuleId === candidate.id;
                          return (
                            <TouchableOpacity
                              key={`${candidate.type}:${candidate.id ?? candidate.name}`}
                              onPress={() => setSelectedModule(i, candidate.id)}
                              style={[pendStyles.optionChip, {
                                borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>{candidate.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                  {llmDomain === 'fitness' && exerciseSuggestions.length > 0 ? (
                    <>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'chooseExercises')}</Text>
                      <View style={pendStyles.chipRow}>
                        {exerciseSuggestions.map((item) => {
                          // LLM suggestions use item.id as the exercise name; legacy uses item.value
                          const name = String((item as any).value ?? item.id);
                          const selected = selectedExerciseNames.includes(name);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => {
                                if (llmDomain === 'fitness') toggleExercise(i, name);
                                else setSelectedSkill(i, name, (item as any).skillId);
                              }}
                              style={[pendStyles.optionChip, {
                                borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>{item.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                        {selectedExerciseNames
                          .filter((name) => !exerciseSuggestions.some((item) => normalizeName(String((item as any).value ?? item.id)) === normalizeName(name)))
                          .map((name) => (
                            <TouchableOpacity
                              key={`custom:${normalizeName(name)}`}
                              onPress={() => toggleExercise(i, name)}
                              style={[pendStyles.optionChip, {
                                borderColor: questTheme.colors.primary,
                                backgroundColor: questTheme.colors.primarySoft,
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: questTheme.colors.primary }]}>{name}</Text>
                            </TouchableOpacity>
                          ))}
                      </View>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'customExercise')}</Text>
                      <View style={pendStyles.customActionRow}>
                        <TextInput
                          value={ui.customExerciseName ?? ''}
                          onChangeText={(value) => setCustomExercise(i, value)}
                          placeholder={t(lang, 'addCustomExercise')}
                          placeholderTextColor={questTheme.colors.textSubtle}
                          onSubmitEditing={() => addCustomAction(i, llmDomain)}
                          style={[pendStyles.compactInput, { flex: 1, color: questTheme.colors.text, borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}
                        />
                        <TouchableOpacity
                          onPress={() => addCustomAction(i, llmDomain)}
                          style={[pendStyles.addCustomBtn, { borderColor: questTheme.colors.primary, backgroundColor: questTheme.colors.primarySoft }]}
                          activeOpacity={0.75}
                        >
                          <Text style={[pendStyles.optionText, { color: questTheme.colors.primary }]}>{t(lang, 'addCustomAction')}</Text>
                        </TouchableOpacity>
                      </View>
                      {selectedExerciseNames.length > 0 ? (
                        <View style={pendStyles.exerciseDetailsWrap}>
                          <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'exerciseDetails')}</Text>
                          {selectedExerciseNames.map((exerciseName) => {
                            const details = ui.exerciseDetails?.[exerciseName] ?? {};
                            return (
                              <View key={exerciseName} style={[pendStyles.exerciseDetailCard, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}>
                                <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>{exerciseName}</Text>
                                <View style={pendStyles.detailInputRow}>
                                  <TextInput
                                    value={details.weight ?? ''}
                                    onChangeText={(value) => setExerciseDetail(i, exerciseName, 'weight', value)}
                                    placeholder={t(lang, 'weight')}
                                    placeholderTextColor={questTheme.colors.textSubtle}
                                    keyboardType="numeric"
                                    style={[pendStyles.miniInput, { color: questTheme.colors.text, borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                                  />
                                  <TextInput
                                    value={details.sets ?? ''}
                                    onChangeText={(value) => setExerciseDetail(i, exerciseName, 'sets', value)}
                                    placeholder={t(lang, 'sets')}
                                    placeholderTextColor={questTheme.colors.textSubtle}
                                    keyboardType="numeric"
                                    style={[pendStyles.miniInput, { color: questTheme.colors.text, borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                                  />
                                  <TextInput
                                    value={details.reps ?? ''}
                                    onChangeText={(value) => setExerciseDetail(i, exerciseName, 'reps', value)}
                                    placeholder={t(lang, 'reps')}
                                    placeholderTextColor={questTheme.colors.textSubtle}
                                    keyboardType="numeric"
                                    style={[pendStyles.miniInput, { color: questTheme.colors.text, borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]}
                                  />
                                </View>
                                <View style={pendStyles.chipRow}>
                                  {[6, 7, 8, 9, 10].map((rpeValue) => {
                                    const selected = details.rpe === rpeValue;
                                    return (
                                      <TouchableOpacity
                                        key={rpeValue}
                                        onPress={() => setExerciseDetail(i, exerciseName, 'rpe', rpeValue)}
                                        style={[pendStyles.optionChip, {
                                          borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                          backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                                        }]}
                                      >
                                        <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>{`${t(lang, 'rpe')} ${rpeValue}`}</Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                  <TouchableOpacity
                                    onPress={() => setExerciseDetail(i, exerciseName, 'rpe', null)}
                                    style={[pendStyles.optionChip, { borderColor: questTheme.colors.border, backgroundColor: 'transparent' }]}
                                  >
                                    <Text style={[pendStyles.optionText, { color: questTheme.colors.textMuted }]}>{t(lang, 'scSkip')}</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}
                    </>
                  ) : null}
                  {smartRoute.domain === 'learning' ? (
                    <>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'scope')}</Text>
                      <View style={pendStyles.chipRow}>
                        {scopeOptions.map((scope) => {
                          const selected = ui.scope === scope;
                          return (
                            <TouchableOpacity
                              key={scope}
                              onPress={() => setScope(i, scope)}
                              style={[pendStyles.optionChip, {
                                borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>{t(lang, scope)}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {ui.scope && !scopeOptions.includes(ui.scope) ? (
                        <View style={pendStyles.chipRow}>
                          <TouchableOpacity
                            onPress={() => setScope(i, '')}
                            style={[pendStyles.optionChip, {
                              borderColor: questTheme.colors.primary,
                              backgroundColor: questTheme.colors.primarySoft,
                            }]}
                          >
                            <Text style={[pendStyles.optionText, { color: questTheme.colors.primary }]}>{ui.scope}</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                      <View style={pendStyles.customActionRow}>
                        <TextInput
                          value={ui.customExerciseName ?? ''}
                          onChangeText={(value) => setCustomExercise(i, value)}
                          placeholder={t(lang, 'whatDidYouStudy')}
                          placeholderTextColor={questTheme.colors.textSubtle}
                          onSubmitEditing={() => addCustomAction(i, llmDomain)}
                          style={[pendStyles.compactInput, { flex: 1, color: questTheme.colors.text, borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surface }]}
                        />
                        <TouchableOpacity
                          onPress={() => addCustomAction(i, llmDomain)}
                          style={[pendStyles.addCustomBtn, { borderColor: questTheme.colors.primary, backgroundColor: questTheme.colors.primarySoft }]}
                          activeOpacity={0.75}
                        >
                          <Text style={[pendStyles.optionText, { color: questTheme.colors.primary }]}>{t(lang, 'addCustomAction')}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : null}
                  {durationSuggestions.length > 0 ? (
                    <>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'scTrainingDuration')}</Text>
                      <View style={pendStyles.chipRow}>
                        {durationSuggestions.map((item) => {
                          const value = typeof item.value === 'number' ? item.value : null;
                          const selected = ui.durationMinutes === value;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => setDuration(i, value)}
                              style={[pendStyles.optionChip, {
                                borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>
                                {value == null ? t(lang, 'scSkip') : `${value}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                  {qualitySuggestions.length > 0 ? (
                    <>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'scCompletionQuality')}</Text>
                      <View style={pendStyles.chipRow}>
                        {qualitySuggestions.map((item) => {
                          const value = Number(item.value);
                          const selected = ui.qualityRating === value;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => setQuality(i, value)}
                              style={[pendStyles.optionChip, {
                                borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>{value}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                  {rpeSuggestions.length > 0 ? (
                    <>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'scRpe')}</Text>
                      <View style={pendStyles.chipRow}>
                        {rpeSuggestions.map((item) => {
                          const value = Number(item.value);
                          const selected = ui.rpe === value;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => setRpe(i, value)}
                              style={[pendStyles.optionChip, {
                                borderColor: selected ? questTheme.colors.primary : questTheme.colors.border,
                                backgroundColor: selected ? questTheme.colors.primarySoft : 'transparent',
                              }]}
                            >
                              <Text style={[pendStyles.optionText, { color: selected ? questTheme.colors.primary : questTheme.colors.textMuted }]}>{value}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                  <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                    {routing.needsUserChoice ? t(lang, 'scNeedsRouteConfirm') : t(lang, 'scAutoMatched')}
                  </Text>
                </View>
              ) : null}
              {/* Module selector for new skills */}
              {isRecordable && !isExisting && ui.createNew && mods.length > 0 && (
                <View style={pendStyles.moduleRow}>
                  <Text style={[pendStyles.moduleLabel, { color: questTheme.colors.textMuted }]}>
                    {t(lang, 'scEntryModule')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModule(i, null)}
                    style={[pendStyles.moduleChip, {
                      borderColor: ui.moduleId == null ? questTheme.colors.primary : questTheme.colors.border,
                      backgroundColor: ui.moduleId == null ? questTheme.colors.primarySoft : 'transparent',
                    }]}
                  >
                    <Text style={[pendStyles.moduleChipText, { color: ui.moduleId == null ? questTheme.colors.primary : questTheme.colors.textMuted }]}>
                      {t(lang, 'scEntryNoModule')}
                    </Text>
                  </TouchableOpacity>
                  {mods.slice(0, 3).map((mod) => (
                    <TouchableOpacity
                      key={mod.id}
                      onPress={() => setModule(i, mod.id)}
                      style={[pendStyles.moduleChip, {
                        borderColor: ui.moduleId === mod.id ? questTheme.colors.primary : questTheme.colors.border,
                        backgroundColor: ui.moduleId === mod.id ? questTheme.colors.primarySoft : 'transparent',
                      }]}
                    >
                      <Text style={[pendStyles.moduleChipText, { color: ui.moduleId === mod.id ? questTheme.colors.primary : questTheme.colors.textMuted }]}>
                        {mod.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}

      {/* Action buttons */}
      <View style={pendStyles.actions}>
        {recordableCount > 0 ? (
          <TouchableOpacity
            onPress={handleConfirm}
            style={[pendStyles.confirmBtn, { backgroundColor: questTheme.colors.primary, borderRadius: questTheme.radius.sm }]}
            activeOpacity={0.8}
          >
            <Text style={[pendStyles.confirmText, { color: questTheme.colors.primaryText }]}>
              {t(lang, 'scEntryConfirm')}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={onDismiss} style={pendStyles.ignoreBtn} activeOpacity={0.7}>
          <Text style={[pendStyles.ignoreText, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'scEntryIgnore')}
          </Text>
        </TouchableOpacity>
      </View>
    </QuestCard>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pendStyles = StyleSheet.create({
  header: { fontWeight: '700', marginBottom: 10 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  skillName: { fontSize: 14, fontWeight: '700' },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '600' },
  summary: { fontSize: 12, lineHeight: 17 },
  routeLine: { fontSize: 11, lineHeight: 16 },
  completionBox: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 6, marginTop: 4 },
  completionTitle: { fontSize: 12, fontWeight: '800' },
  completionHint: { fontSize: 11, lineHeight: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optionChip: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  optionText: { fontSize: 11, fontWeight: '700' },
  compactInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, fontWeight: '600' },
  customActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addCustomBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  exerciseDetailsWrap: { gap: 8, marginTop: 4 },
  exerciseDetailCard: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 7 },
  detailInputRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniInput: { minWidth: 72, flexGrow: 1, borderWidth: 1, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, fontWeight: '700' },
  bulkBtn: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  bulkText: { fontSize: 11, fontWeight: '700' },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginTop: 3 },
  moduleLabel: { fontSize: 11 },
  moduleChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  moduleChipText: { fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
  confirmBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  confirmText: { fontSize: 13, fontWeight: '700' },
  ignoreBtn: { paddingVertical: 8 },
  ignoreText: { fontSize: 13 },
  loggedRow: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 8, alignItems: 'center' },
  loggedText: { fontSize: 13, fontWeight: '700' },
});
