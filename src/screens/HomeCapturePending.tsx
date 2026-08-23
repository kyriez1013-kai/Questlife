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
import { View, Text, TouchableOpacity, StyleSheet, TextInput, TextInputProps } from 'react-native';
import { useStore } from '../store';
import { getQuestTheme } from '../design/tokens';
import { useQuestTheme } from '../design/useQuestTheme';
import { getLanguage, t } from '../i18n';
import { Category, CompletionSchema, DataFieldOrigin, DataParserMetadata, ExecutionLog, GoalType, ParsedEntry, ProgressType, QuestModule, TaskType } from '../types';
import QuestCard from '../components/ui/QuestCard';
import { assessCaptureCompletion, type CompletionDomain } from '../utils/captureCompletion';
import { getSmartRouteResult, SmartRouteResult } from '../utils/smartRouting';
import { buildPostSaveFeedback, PostSaveFeedback } from '../utils/progressFeedback';
import { getV11ProductLanguage, getV11ProductThemeId, isV11TodayEnabled } from '../v11/featureFlag';
import { getV11ThemeTokens, v11Typography } from '../v11/tokens';
import {
  V11CategoricalChip,
  V11CheckboxControl,
  V11CompactValueSelector,
  V11SheetButton,
  V11TextField,
} from '../v11/components/V11SheetControls';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import UniversalCaptureComposer, {
  UniversalCaptureEntryView,
} from '../components/capture/UniversalCaptureComposer';
import {
  compactStrengthValues,
  deriveUniversalCaptureDomain,
  isConcreteExercise,
  uniqueLocalizedActions,
} from '../utils/universalCapture';
import {
  buildConfirmedCaptureProvenance,
  captureCandidateCorrections,
} from '../utils/dataProvenance';
import {
  recordCaptureFriction,
  type CaptureFrictionDomain,
} from '../utils/captureFriction';

const WebView = View as any;

function pendingV11Theme(questTheme: ReturnType<typeof getQuestTheme>) {
  return getV11ThemeTokens(questTheme.id === 'cleanFocus' ? 'light' : 'dark');
}

function completionAssessmentDomain(schema?: CompletionSchema): CompletionDomain | undefined {
  if (schema?.domain === 'fitness') return 'fitness';
  if (schema?.domain === 'learning') return 'learning';
  if (schema?.domain === 'state') return 'state';
  if (schema?.domain === 'food') return 'food';
  return undefined;
}

function PendingChip({
  label,
  legacyStyle,
  legacyTextStyle,
  onPress,
  questTheme,
  selected,
}: {
  label: string;
  legacyStyle: any;
  legacyTextStyle: any;
  onPress: () => void;
  questTheme: ReturnType<typeof getQuestTheme>;
  selected: boolean;
}) {
  if (isV11TodayEnabled()) {
    return (
      <V11CategoricalChip
        accessibilityRole="checkbox"
        density="compact"
        label={label}
        onPress={onPress}
        selected={selected}
        theme={pendingV11Theme(questTheme)}
        tone="neutral"
      />
    );
  }
  return (
    <TouchableOpacity onPress={onPress} style={legacyStyle} activeOpacity={0.75}>
      <Text style={legacyTextStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

function PendingTextField({
  questTheme,
  style,
  placeholderTextColor,
  ...props
}: TextInputProps & { questTheme: ReturnType<typeof getQuestTheme> }) {
  if (isV11TodayEnabled()) {
    const flat = StyleSheet.flatten(style) || {};
    return (
      <V11TextField
        {...props}
        style={{
          flex: flat.flex,
          flexGrow: flat.flexGrow,
          minWidth: flat.minWidth,
          width: flat.width,
        }}
        theme={pendingV11Theme(questTheme)}
        tone="neutral"
      />
    );
  }
  return <TextInput {...props} placeholderTextColor={placeholderTextColor} style={style} />;
}

function PendingAction({
  disabled = false,
  label,
  legacyStyle,
  legacyTextStyle,
  loading = false,
  onPress,
  questTheme,
  variant,
}: {
  disabled?: boolean;
  label: string;
  legacyStyle: any;
  legacyTextStyle: any;
  loading?: boolean;
  onPress: () => void;
  questTheme: ReturnType<typeof getQuestTheme>;
  variant: 'primary' | 'secondary';
}) {
  if (isV11TodayEnabled()) {
    const flat = StyleSheet.flatten(legacyStyle) || {};
    const canGrow = flat.alignSelf !== 'flex-start';
    return (
      <V11SheetButton
        disabled={disabled}
        label={label}
        loading={loading}
        onPress={onPress}
        style={{
          alignSelf: flat.alignSelf,
          flex: canGrow ? (flat.flex ?? 1) : flat.flex,
          minWidth: 0,
          width: 'auto',
        }}
        theme={pendingV11Theme(questTheme)}
        tone="neutral"
        variant={variant}
      />
    );
  }
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} style={legacyStyle} activeOpacity={0.8}>
      <Text style={legacyTextStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

function PendingCheckbox({
  checked,
  label,
  legacyStyle,
  legacyTextStyle,
  onPress,
  questTheme,
}: {
  checked: boolean;
  label: string;
  legacyStyle: any;
  legacyTextStyle: any;
  onPress: () => void;
  questTheme: ReturnType<typeof getQuestTheme>;
}) {
  if (isV11TodayEnabled()) {
    return (
      <V11CheckboxControl
        accessibilityLabel={label}
        checked={checked}
        onPress={onPress}
        theme={pendingV11Theme(questTheme)}
        tone="neutral"
      />
    );
  }
  return (
    <TouchableOpacity onPress={onPress} style={legacyStyle} activeOpacity={0.7}>
      {checked ? <Text style={legacyTextStyle}>✓</Text> : null}
    </TouchableOpacity>
  );
}

function CapturePendingSurface({
  children,
  questTheme,
  status,
}: {
  children: React.ReactNode;
  questTheme: ReturnType<typeof getQuestTheme>;
  status: 'pending' | 'saved';
}) {
  if (isV11TodayEnabled()) {
    return (
      <WebView
        dataSet={{
          'v11-capture-status': status,
          'v11-rebaseline-role': 'capture-pending',
        }}
      >
        {children}
      </WebView>
    );
  }

  return (
    <QuestCard
      questTheme={questTheme}
      variant="data"
      style={{
        marginTop: questTheme.spacing.sm,
        borderColor: questTheme.colors.borderStrong,
        borderLeftWidth: 3,
        borderLeftColor: status === 'saved' ? questTheme.colors.success : questTheme.colors.info,
        backgroundColor: questTheme.colors.surfaceElevated,
      }}
    >
      {children}
    </QuestCard>
  );
}

function CaptureAttribution({
  color,
  label,
  state,
}: {
  color: string;
  label: string;
  state: 'matched' | 'uncertain';
}) {
  if (!isV11TodayEnabled()) {
    return <Text style={[pendStyles.routeLine, { color }]}>{label}</Text>;
  }

  return (
    <WebView
      dataSet={{
        'v11-attribution-state': state,
        'v11-rebaseline-role': 'capture-attribution',
      }}
    >
      <V11RebaselineIcon name="target" size={15} color={color} />
      <Text style={[pendStyles.routeLine, { color }]}>{label}</Text>
    </WebView>
  );
}

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
  selectedGoalId?: string | null;
  selectedModuleId?: string | null;
  createNewGoal?: boolean;
  newGoalName?: string;
  createNewModule?: boolean;
  newModuleName?: string;
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

function provenanceDomain(domain: string): CaptureFrictionDomain {
  if (domain === 'fitness' || domain === 'exercise') return 'exercise';
  if (domain === 'learning' || domain === 'reading') return 'learning';
  if (domain === 'work' || domain === 'project') return 'work';
  if (domain === 'state') return 'state';
  return 'other';
}

function proposedStrengthValue(entry: ParsedEntry, field: 'weight' | 'sets' | 'reps' | 'rpe') {
  if (field === 'weight') return entry.fields.extraWeight ?? entry.fields.sets?.find((set) => set.weight != null)?.weight;
  if (field === 'sets') return entry.fields.sets?.length;
  if (field === 'reps') return entry.fields.sets?.find((set) => set.reps != null)?.reps;
  return typeof entry.fields.rpe === 'number' ? entry.fields.rpe : undefined;
}

function captureLogProvenance(input: {
  captureId: string;
  entryIndex: number;
  entryKey: string;
  parser?: DataParserMetadata;
  proposed: ParsedEntry;
  confirmed: ParsedEntry;
  title: string;
  linkedSkillId?: string;
  linkedGoalId?: string;
  linkedModuleId?: string;
  proposedGoalId?: string | null;
  proposedModuleId?: string | null;
  durationMinutes: number;
  qualityRating?: number;
  structuredData?: Record<string, unknown>;
  userEnteredStrengthFields?: string[];
  isCustomAction?: boolean;
}) {
  const corrections = captureCandidateCorrections(input.proposed, input.confirmed);
  const correctionByField = new Map(corrections.map((row) => [row.field, row]));
  const addCorrection = (field: string, proposed: unknown, confirmed: unknown) => {
    if (JSON.stringify(proposed) === JSON.stringify(confirmed) || correctionByField.has(field)) return;
    const scalar = (value: unknown) => (
      value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value as string | number | boolean | null | undefined
        : undefined
    );
    const row = { field, proposed: scalar(proposed), confirmed: scalar(confirmed) };
    corrections.push(row);
    correctionByField.set(field, row);
  };
  addCorrection('title', input.proposed.skillName, input.title);
  addCorrection('linkedSkillId', input.proposed.matchedSkillId, input.linkedSkillId);
  addCorrection('linkedGoalId', input.proposedGoalId, input.linkedGoalId);
  addCorrection('linkedModuleId', input.proposedModuleId, input.linkedModuleId);

  const corrected = new Set(corrections.map((row) => row.field));
  const fieldOrigins: Record<string, DataFieldOrigin> = {
    title: input.isCustomAction
      ? 'owner_entered'
      : corrected.has('title') ? 'owner_corrected' : 'model_proposed_owner_confirmed',
    linkedSkillId: corrected.has('linkedSkillId')
      ? 'owner_corrected'
      : input.proposed.matchedSkillId ? 'model_proposed_owner_confirmed' : 'owner_entered',
    linkedGoalId: corrected.has('linkedGoalId')
      ? 'owner_corrected'
      : input.proposedGoalId ? 'model_proposed_owner_confirmed' : 'owner_entered',
    linkedModuleId: corrected.has('linkedModuleId')
      ? 'owner_corrected'
      : input.proposedModuleId ? 'model_proposed_owner_confirmed' : 'owner_entered',
  };
  if (input.durationMinutes > 0) {
    fieldOrigins.durationMinutes = corrected.has('fields.durationMinutes')
      ? 'owner_corrected'
      : input.proposed.fields.durationMinutes != null
        ? 'model_proposed_owner_confirmed'
        : 'owner_entered';
  }
  if (input.qualityRating != null) {
    fieldOrigins.qualityRating = corrected.has('qualityRating')
      ? 'owner_corrected'
      : input.proposed.qualityRating != null
        ? 'model_proposed_owner_confirmed'
        : 'owner_entered';
  }
  (['weight', 'sets', 'reps', 'rpe'] as const).forEach((field) => {
    if (input.structuredData?.[field] == null) return;
    const userEntered = input.userEnteredStrengthFields?.includes(field) === true;
    fieldOrigins[`structuredData.${field}`] = userEntered
      ? (proposedStrengthValue(input.proposed, field) == null ? 'owner_entered' : 'owner_corrected')
      : proposedStrengthValue(input.proposed, field) != null
        ? 'model_proposed_owner_confirmed'
        : 'unknown';
  });

  return buildConfirmedCaptureProvenance({
    rawCaptureId: input.captureId,
    entryIndex: input.entryIndex,
    entryKey: input.entryKey,
    parser: input.parser,
    corrections,
    fieldOrigins,
  });
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

function goalTypeForRouteDomain(domain?: string): GoalType {
  if (domain === 'fitness') return 'fitness';
  if (domain === 'learning' || domain === 'reading') return 'study';
  if (domain === 'project') return 'project';
  if (domain === 'state') return 'health';
  return 'custom';
}

function suggestedGoalName(domain: string | undefined, rawText: string, lang: 'zh' | 'en'): string {
  const text = normalizeName(rawText);
  if (domain === 'fitness') {
    if (containsAny(text, ['篮球', 'basketball'])) return lang === 'zh' ? '篮球训练' : 'Basketball Training';
    return lang === 'zh' ? '健身' : 'Fitness';
  }
  if (domain === 'learning') {
    if (containsAny(text, ['c', 'c++', 'code', 'coding', '编程'])) return lang === 'zh' ? '编程学习' : 'Coding';
    return lang === 'zh' ? '学习' : 'Learning';
  }
  if (domain === 'reading') return lang === 'zh' ? '阅读' : 'Reading';
  return lang === 'zh' ? '新目标' : 'New Goal';
}

function suggestedModuleName(domain: string | undefined, rawText: string, entryName: string, lang: 'zh' | 'en'): string {
  const text = normalizeName(`${rawText} ${entryName}`);
  if (domain === 'fitness') {
    if (containsAny(text, ['篮球', 'basketball', '投篮', '运球'])) return lang === 'zh' ? '篮球' : 'Basketball';
    if (containsAny(text, ['肩', 'shoulder', '推举', '侧平举'])) return lang === 'zh' ? '肩' : 'Shoulders';
    if (containsAny(text, ['背', 'back', 'pull', '划船', '引体'])) return lang === 'zh' ? '背' : 'Back';
    if (containsAny(text, ['腿', 'legs', 'squat', '深蹲'])) return lang === 'zh' ? '腿' : 'Legs';
    return lang === 'zh' ? '胸' : 'Chest';
  }
  if (domain === 'learning') {
    if (containsAny(text, ['sql', 'data', '数据'])) return lang === 'zh' ? '数据' : 'Data';
    if (containsAny(text, ['c++', 'code', 'coding', '编程', 'python'])) return lang === 'zh' ? '编程' : 'Coding';
    return lang === 'zh' ? '学习' : 'Learning';
  }
  if (domain === 'reading') return lang === 'zh' ? '阅读' : 'Reading';
  return lang === 'zh' ? '默认模块' : 'Default Module';
}

function orderedGoals(goals: Category[], preferredIds: Array<string | undefined | null>): Category[] {
  const seen = new Set<string>();
  const ordered: Category[] = [];
  preferredIds.forEach((id) => {
    const goal = id ? goals.find((item) => item.id === id) : undefined;
    if (goal && !seen.has(goal.id)) {
      seen.add(goal.id);
      ordered.push(goal);
    }
  });
  goals.forEach((goal) => {
    if (!seen.has(goal.id)) {
      seen.add(goal.id);
      ordered.push(goal);
    }
  });
  return ordered;
}

function orderedModules(modules: QuestModule[], goalId: string | undefined, preferredId?: string | null): QuestModule[] {
  const scoped = goalId ? modules.filter((module) => module.goalId === goalId) : [];
  if (!preferredId) return scoped;
  const preferred = scoped.find((module) => module.id === preferredId);
  return preferred ? [preferred, ...scoped.filter((module) => module.id !== preferred.id)] : scoped;
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
  onOpenState?: () => void;
};

type StateDeltaValue = 'down' | 'same' | 'up' | 'unknown';
type AfterStateDeltaDraft = {
  energy?: StateDeltaValue;
  focus?: StateDeltaValue;
  mood?: StateDeltaValue;
};

export default function HomeCapturePending({ captureId, entries, onDismiss, onOpenState }: Props) {
  const { data, addCategory, addModule, addSkill, createExecutionLog, updateExecutionLog, addExistingSkillToModule } = useStore();
  const v11TodayEnabled = isV11TodayEnabled();
  const lang = v11TodayEnabled
    ? getV11ProductLanguage(getLanguage(data.settings.language ?? data.settings.preferredLanguage))
    : getLanguage(data.settings.language ?? data.settings.preferredLanguage);
  const questTheme = useQuestTheme(v11TodayEnabled
    ? getV11ProductThemeId(data.settings.selectedThemeId)
    : data.settings.selectedThemeId);
  const capture = (data.rawCaptures || []).find((item) => item.id === captureId);
  const captureText = capture?.text ?? '';
  const completionSchema = capture?.parsed?.completionSchema;
  const assessmentDomainOverride = v11TodayEnabled
    ? completionAssessmentDomain(completionSchema)
    : undefined;
  const effectiveEntries = entries.length > 0 ? entries : entryFromTopLevelCompletion(completionSchema, captureText);

  const [entryStates, setEntryStates] = useState<EntryUI[]>(() =>
    effectiveEntries.map((entry) => {
      const domain = deriveUniversalCaptureDomain({ captureText, completionSchema, entry });
      const strength = compactStrengthValues(entry);
      const useConcreteExercise = domain === 'exercise' && isConcreteExercise(entry, captureText);
      return {
        include: true,
        createNew: entry.matchedSkillId == null,
        moduleId: null,
        selectedExerciseNames: useConcreteExercise ? [entry.skillName] : [],
        exerciseDetails: useConcreteExercise ? {
          [entry.skillName]: {
            weight: strength.weight == null ? '' : String(strength.weight),
            sets: strength.sets == null ? '' : String(strength.sets),
            reps: strength.reps == null ? '' : String(strength.reps),
            rpe: strength.rpe,
          },
        } : {},
      };
    }),
  );
  const [logged, setLogged] = useState(false);
  const [postSaveFeedback, setPostSaveFeedback] = useState<PostSaveFeedback | null>(null);
  const [savedLogIds, setSavedLogIds] = useState<string[]>([]);
  const [afterStateDraft, setAfterStateDraft] = useState<AfterStateDeltaDraft>({});
  const [afterStateStatus, setAfterStateStatus] = useState<'idle' | 'saved' | 'skipped'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [expandedRoutingRows, setExpandedRoutingRows] = useState<number[]>([]);
  const chipStyle = (selected: boolean) => [
    pendStyles.optionChip,
    v11TodayEnabled ? pendStyles.v11OptionChip : null,
    {
      borderColor: selected ? questTheme.colors.primary : questTheme.colors.chipBorder,
      backgroundColor: selected ? questTheme.colors.chipSelectedBg : questTheme.colors.chipBg,
    },
  ];
  const chipTextStyle = (selected: boolean) => [pendStyles.optionText, {
    color: selected ? questTheme.colors.primary : questTheme.colors.textMuted,
  }];
  const compactInputStyle = [pendStyles.compactInput, {
    color: questTheme.colors.text,
    borderColor: questTheme.colors.inputBorder,
    backgroundColor: questTheme.colors.inputBg,
  }];
  const miniInputStyle = [pendStyles.miniInput, {
    color: questTheme.colors.text,
    borderColor: questTheme.colors.inputBorder,
    backgroundColor: questTheme.colors.inputBg,
  }];

  // Modules available for new-skill assignment
  const toggleInclude = (i: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, include: !e.include } : e));

  const toggleCreateNew = (i: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, createNew: !e.createNew } : e));

  const setDuration = (i: number, durationMinutes: number | null) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, durationMinutes } : e));

  const setQuality = (i: number, qualityRating: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, qualityRating } : e));

  const setRpe = (i: number, rpe: number | undefined) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, rpe } : e));

  const setAfterStateValue = (key: keyof AfterStateDeltaDraft, value: StateDeltaValue) => {
    setAfterStateDraft((current) => ({
      ...current,
      [key]: current[key] === value ? undefined : value,
    }));
  };

  const saveAfterStateDelta = () => {
    const hasSelection = Object.values(afterStateDraft).some(Boolean);
    const delta = {
      energy: afterStateDraft.energy ?? 'unknown',
      focus: afterStateDraft.focus ?? 'unknown',
      mood: afterStateDraft.mood ?? 'unknown',
      capturedAt: new Date().toISOString(),
      skipped: false,
    };
    savedLogIds.forEach((logId) => {
      const existing = data.executionLogs.find((log) => log.id === logId);
      updateExecutionLog(logId, {
        structuredData: {
          ...(existing?.structuredData || {}),
          afterStateDelta: hasSelection ? delta : { ...delta, skipped: true },
        },
      });
    });
    setAfterStateStatus(hasSelection ? 'saved' : 'skipped');
  };

  const skipAfterStateDelta = () => {
    const skippedDelta = {
      energy: 'unknown' as const,
      focus: 'unknown' as const,
      mood: 'unknown' as const,
      capturedAt: new Date().toISOString(),
      skipped: true,
    };
    savedLogIds.forEach((logId) => {
      const existing = data.executionLogs.find((log) => log.id === logId);
      updateExecutionLog(logId, {
        structuredData: {
          ...(existing?.structuredData || {}),
          afterStateDelta: skippedDelta,
        },
      });
    });
    setAfterStateStatus('skipped');
  };

  const setSelectedSkill = (i: number, skillName: string, skillId?: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, selectedSkillName: skillName, selectedSkillId: skillId ?? null, createNew: !skillId } : e));

  const setSelectedGoal = (i: number, goalId?: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? {
      ...e,
      selectedGoalId: goalId,
      createNewGoal: false,
      selectedModuleId: undefined,
      createNewModule: false,
    } : e));

  const setNoGoal = (i: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? {
      ...e,
      selectedGoalId: null,
      createNewGoal: false,
      selectedModuleId: null,
      createNewModule: false,
    } : e));

  const setCreateGoal = (i: number, name: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? {
      ...e,
      selectedGoalId: undefined,
      createNewGoal: true,
      newGoalName: e.newGoalName ?? name,
      selectedModuleId: undefined,
      createNewModule: false,
    } : e));

  const setNewGoalName = (i: number, name: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, newGoalName: name } : e));

  const setSelectedModule = (i: number, moduleId?: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? {
      ...e,
      selectedModuleId: moduleId,
      createNewModule: false,
      moduleId: moduleId ?? e.moduleId,
    } : e));

  const setNoModule = (i: number) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? {
      ...e,
      selectedModuleId: null,
      createNewModule: false,
      moduleId: null,
    } : e));

  const setCreateModule = (i: number, name: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? {
      ...e,
      selectedModuleId: undefined,
      createNewModule: true,
      newModuleName: e.newModuleName ?? name,
    } : e));

  const setNewModuleName = (i: number, name: string) =>
    setEntryStates((s) => s.map((e, idx) => idx === i ? { ...e, newModuleName: name } : e));

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

  const resolveGoalForSave = useCallback((
    ui: EntryUI,
    domain: string,
    entry: ParsedEntry,
    smartRoute: SmartRouteResult,
    routing: RoutingResult,
  ): Category | undefined => {
    if (ui.createNewGoal) {
      const name = ui.newGoalName?.trim() || suggestedGoalName(domain, captureText, lang);
      return addCategory({
        name,
        color: questTheme.colors.primary,
        goalType: goalTypeForRouteDomain(domain),
        progressModel: 'module_average',
      });
    }
    if (ui.selectedGoalId === null) return undefined;
    const goalId = ui.selectedGoalId
      ?? completionSchema?.matchedGoalId
      ?? smartRoute.selectedGoalId
      ?? routing.linkedGoalId
      ?? resolveCategory(entry)?.id;
    return goalId ? data.categories.find((goal) => goal.id === goalId) : undefined;
  }, [addCategory, captureText, completionSchema?.matchedGoalId, data.categories, lang, questTheme.colors.primary, resolveCategory]);

  const resolveModuleForSave = useCallback((
    ui: EntryUI,
    domain: string,
    entry: ParsedEntry,
    goal: Category | undefined,
    smartRoute: SmartRouteResult,
    routing: RoutingResult,
  ): QuestModule | undefined => {
    if (!goal) return undefined;
    if (ui.createNewModule) {
      const name = ui.newModuleName?.trim() || suggestedModuleName(domain, captureText, entry.skillName, lang);
      return addModule({
        goalId: goal.id,
        name,
        progress: 0,
      });
    }
    if (ui.selectedModuleId === null) return undefined;
    const moduleId = ui.selectedModuleId
      ?? completionSchema?.matchedModuleId
      ?? smartRoute.selectedModuleId
      ?? routing.linkedModuleId
      ?? ui.moduleId
      ?? resolveModule(goal.id, entry);
    const module = moduleId ? (data.modules || []).find((item) => item.id === moduleId && item.goalId === goal.id) : undefined;
    return module;
  }, [addModule, captureText, completionSchema?.matchedModuleId, data.modules, lang, resolveModule]);

  const handleConfirm = useCallback(() => {
    if (confirming || logged) return;
    setConfirming(true);
    const date = parseTargetDate(captureText);
    const savedLogs: ExecutionLog[] = [];
    const frictionCorrectedFields = new Set<string>();
    let frictionDomain: CaptureFrictionDomain = 'unknown';

    effectiveEntries.forEach((entry, i) => {
      if (completionSchema && (completionSchema.domain === 'state' || completionSchema.domain === 'food')) return;
      const ui = entryStates[i];
      const assessment = assessCaptureCompletion(
        captureText,
        entry,
        { goals: data.categories, modules: data.modules || [], skills: data.skills, lang },
        assessmentDomainOverride,
      );
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
      const saveDomain = completionSchema?.domain ?? smartRoute.domain;
      frictionDomain = provenanceDomain(saveDomain);
      const resolvedGoalForEntry = resolveGoalForSave(ui, saveDomain, completedEntry, smartRoute, routing);
      const resolvedModuleForEntry = resolveModuleForSave(ui, saveDomain, completedEntry, resolvedGoalForEntry, smartRoute, routing);

      if (smartRoute.domain === 'fitness' && multiExercises.length > 0) {
        if (matchedSkill && !ui.include) return;
        if (!matchedSkill && !ui.createNew) return;
        const selectedGoalId = resolvedGoalForEntry?.id;
        const selectedModuleId = resolvedModuleForEntry?.id;
        const sessionDuration = estimateDuration(completedEntry);
        const perActionDuration = sessionDuration > 0 ? Math.max(1, Math.round(sessionDuration / multiExercises.length)) : 0;

        multiExercises.forEach((exerciseName, actionIndex) => {
          const isCustomAction = (ui.customExerciseNames ?? []).some((name) => normalizeName(name) === normalizeName(exerciseName));
          const actionKey = `${captureId}:${i}:${normalizeName(exerciseName)}`;
          const actionAlreadyLogged = (data.executionLogs || []).some((log) => log.structuredData?.sourceCaptureEntryKey === actionKey);
          if (actionAlreadyLogged) return;
          const existingSkill = data.skills.find((skill) => normalizeName(skill.name) === normalizeName(exerciseName))
            ?? (normalizeName(exerciseName) === normalizeName(completedEntry.skillName) ? matchedSkill : undefined);
          let actionSkillId = existingSkill?.id;
          const shouldCreateActionSkill = ui.createNew
            || (matchedSkill != null && normalizeName(exerciseName) !== normalizeName(matchedSkill.name));
          if (!actionSkillId && shouldCreateActionSkill) {
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
          const structuredData = {
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
          };
          const captureProvenance = captureLogProvenance({
            captureId,
            entryIndex: i,
            entryKey: actionKey,
            parser: capture?.parsed?.parserMeta,
            proposed: entry,
            confirmed: completedEntry,
            title: exerciseName,
            linkedSkillId: actionSkillId,
            linkedGoalId: selectedGoalId,
            linkedModuleId: selectedModuleId,
            proposedGoalId: completionSchema?.matchedGoalId,
            proposedModuleId: completionSchema?.matchedModuleId,
            durationMinutes: perActionDuration,
            qualityRating: completedEntry.qualityRating,
            structuredData,
            userEnteredStrengthFields: [
              ...(detail.weight?.trim() ? ['weight'] : []),
              ...(detail.sets?.trim() ? ['sets'] : []),
              ...(detail.reps?.trim() ? ['reps'] : []),
              ...(detail.rpe != null || ui.rpe != null ? ['rpe'] : []),
            ],
            isCustomAction,
          });
          if (multiExercises.length > 1 && perActionDuration > 0) {
            captureProvenance.fieldOrigins = {
              ...(captureProvenance.fieldOrigins || {}),
              durationMinutes: 'rule_derived',
            };
            captureProvenance.limitations = [
              ...(captureProvenance.limitations || []),
              'CAPTURE_DURATION_SPLIT_ACROSS_ACTIONS',
            ];
          }
          (captureProvenance.correctedFields || []).forEach((field) => frictionCorrectedFields.add(field));
          const savedLog = createExecutionLog({
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
            structuredData,
            dataProvenance: captureProvenance,
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
          savedLogs.push(savedLog);
        });
        return;
      }

      if (!skillId && ui.createNew) {
        // ── New skill path ──────────────────────────────────────────────────
        const resolvedGoalId = resolvedGoalForEntry?.id;
        const resolvedGoal = resolvedGoalForEntry;
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
        const targetModuleId = resolvedModuleForEntry?.id;
        linkedModuleId = targetModuleId;
        if (resolvedGoal && targetModuleId) {
          addExistingSkillToModule(resolvedGoal.id, targetModuleId, skillId);
        }
      } else if (skillId) {
        // ── Existing matched skill path ──────────────────────────────────────
        linkedGoalId = resolvedGoalForEntry?.id;
        linkedModuleId = resolvedModuleForEntry?.id;
        if (linkedGoalId && linkedModuleId) {
          addExistingSkillToModule(linkedGoalId, linkedModuleId, skillId);
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
      const structuredData = isStrength ? {
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
      };
      const captureProvenance = captureLogProvenance({
        captureId,
        entryIndex: i,
        entryKey: sourceKey,
        parser: capture?.parsed?.parserMeta,
        proposed: entry,
        confirmed: completedEntry,
        title: completedEntry.skillName,
        linkedSkillId: skillId,
        linkedGoalId,
        linkedModuleId,
        proposedGoalId: completionSchema?.matchedGoalId,
        proposedModuleId: completionSchema?.matchedModuleId,
        durationMinutes,
        qualityRating: completedEntry.qualityRating,
        structuredData,
        userEnteredStrengthFields: [
          ...(ui.rpe != null ? ['rpe'] : []),
        ],
        isCustomAction,
      });
      (captureProvenance.correctedFields || []).forEach((field) => frictionCorrectedFields.add(field));

      const savedLog = createExecutionLog({
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
        structuredData,
        dataProvenance: captureProvenance,
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
      savedLogs.push(savedLog);
    });

    if (savedLogs.length > 0) {
      if (frictionCorrectedFields.size > 0) {
        recordCaptureFriction(captureId, 'candidate_corrected', {
          domain: frictionDomain,
          correctedFields: Array.from(frictionCorrectedFields),
        });
      }
      recordCaptureFriction(captureId, 'capture_confirmed', {
        domain: frictionDomain,
        candidateCount: effectiveEntries.length,
        correctedFields: Array.from(frictionCorrectedFields),
        tapCount: 1,
      });
      setPostSaveFeedback(buildPostSaveFeedback({ savedLogs, data, lang }));
      setSavedLogIds(savedLogs.map((log) => log.id));
      setAfterStateDraft({});
      setAfterStateStatus('idle');
    }
    setLogged(true);
  }, [confirming, logged, captureText, effectiveEntries, entryStates, captureId, data, data.categories, data.modules, data.skills, data.executionLogs, lang, questTheme.colors.primary,
      assessmentDomainOverride, completionSchema?.domain, resolveSkill, resolveGoalForSave, resolveModuleForSave, resolveRouting, addSkill, addExistingSkillToModule, createExecutionLog, updateExecutionLog, onDismiss]);

  if (logged) {
    if (postSaveFeedback?.items.length) {
      const recordTypeKey = {
        time: 'savedRecordTypeTime',
        performance: 'savedRecordTypePerformance',
        quality: 'savedRecordTypeQuality',
        custom: 'savedRecordTypeCustom',
        unknown: 'savedRecordTypeUnknown',
      } as const;
      return (
        <CapturePendingSurface questTheme={questTheme} status="saved">
          <Text style={[pendStyles.header, { color: questTheme.colors.text, fontSize: questTheme.typography.bodySize }]}>
            {t(lang, 'savedFeedbackTitle')}
          </Text>
          <Text style={[pendStyles.summary, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'savedFeedbackSubtitle')}
          </Text>
          <View style={pendStyles.feedbackList}>
            {postSaveFeedback.items.map((item) => {
              const path = [item.goalName, item.moduleName].filter(Boolean).join(' / ');
              return (
                <View key={item.logId} style={[pendStyles.feedbackItem, { borderColor: questTheme.colors.borderStrong, backgroundColor: questTheme.colors.surfaceMuted }]}>
                  <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                    {t(lang, 'recordToPath')}: {path || t(lang, 'scEntryUnassigned')} · {t(lang, recordTypeKey[item.recordType])}
                    {item.durationMinutes && item.durationMinutes > 0 ? ` · ${t(lang, 'duration')}: ${item.durationMinutes}${lang === 'zh' ? '分钟' : ' min'}` : ''}
                    {item.qualityRating ? ` · ${t(lang, 'quality')}: ${item.qualityRating}/5` : ''}
                  </Text>
                  {item.comparison ? (
                    <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                      {t(lang, 'feedbackPrevious')}: {item.comparison.previousLabel} · {t(lang, 'feedbackCurrent')}: {item.comparison.currentLabel}
                    </Text>
                  ) : null}
                  <Text style={[pendStyles.completionHint, { color: questTheme.colors.success }]}>
                    {t(lang, item.summaryKey)}
                  </Text>
                  <Text style={[pendStyles.completionHint, { color: questTheme.colors.primary }]}>
                    {t(lang, item.nextActionKey)}
                  </Text>
                </View>
              );
            })}
          </View>
          {postSaveFeedback.overflowCount > 0 ? (
            <Text style={[pendStyles.summary, { color: questTheme.colors.textMuted }]}>
              {t(lang, 'moreSavedItems').replace('{n}', String(postSaveFeedback.overflowCount))}
            </Text>
          ) : null}
          {afterStateStatus === 'idle' ? (
            <View style={[pendStyles.afterStateBox, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceMuted }]}>
              <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>
                {t(lang, 'afterStatePrompt')}
              </Text>
              {([
                ['energy', 'afterStateEnergy'],
                ['focus', 'afterStateFocus'],
                ['mood', 'afterStateMood'],
              ] as const).map(([key, labelKey]) => (
                <View key={key} style={pendStyles.afterStateRow}>
                  <Text style={[pendStyles.afterStateLabel, { color: questTheme.colors.textMuted }]}>
                    {t(lang, labelKey)}
                  </Text>
                  <View style={pendStyles.afterStateChipRow}>
                    {([
                      ['down', 'stateDown'],
                      ['same', 'stateSame'],
                      ['up', 'stateUp'],
                    ] as const).map(([value, textKey]) => {
                      const selected = afterStateDraft[key] === value;
                      return (
                        <PendingChip
                          key={value}
                          label={t(lang, textKey)}
                          legacyStyle={chipStyle(selected)}
                          legacyTextStyle={chipTextStyle(selected)}
                          onPress={() => setAfterStateValue(key, value)}
                          questTheme={questTheme}
                          selected={selected}
                        />
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={pendStyles.afterStateActions}>
                <PendingAction
                  label={t(lang, 'saveStateChange')}
                  legacyStyle={[pendStyles.confirmBtn, { backgroundColor: questTheme.colors.primary, borderRadius: questTheme.radius.sm }]}
                  legacyTextStyle={[pendStyles.confirmText, { color: questTheme.colors.primaryText }]}
                  onPress={saveAfterStateDelta}
                  questTheme={questTheme}
                  variant="primary"
                />
                <PendingAction
                  label={t(lang, 'skipStateChange')}
                  legacyStyle={pendStyles.ignoreBtn}
                  legacyTextStyle={[pendStyles.ignoreText, { color: questTheme.colors.textMuted }]}
                  onPress={skipAfterStateDelta}
                  questTheme={questTheme}
                  variant="secondary"
                />
              </View>
            </View>
          ) : (
            <Text style={[pendStyles.summary, { color: afterStateStatus === 'saved' ? questTheme.colors.success : questTheme.colors.textMuted }]}>
              {t(lang, afterStateStatus === 'saved' ? 'stateChangeSaved' : 'stateChangeSkipped')}
            </Text>
          )}
          <PendingAction
            label={t(lang, 'done')}
            legacyStyle={[pendStyles.confirmBtn, { backgroundColor: questTheme.colors.primary, borderRadius: questTheme.radius.sm, alignSelf: 'flex-start' }]}
            legacyTextStyle={[pendStyles.confirmText, { color: questTheme.colors.primaryText }]}
            onPress={onDismiss}
            questTheme={questTheme}
            variant="primary"
          />
        </CapturePendingSurface>
      );
    }
    return (
      <View style={[pendStyles.loggedRow, { backgroundColor: questTheme.colors.successSoft, borderRadius: questTheme.radius.sm }]}>
        <Text style={[pendStyles.loggedText, { color: questTheme.colors.success }]}>
          {t(lang, 'scEntryLogged')}
        </Text>
        <PendingAction
          label={t(lang, 'done')}
          legacyStyle={[pendStyles.ignoreBtn, { marginTop: 6 }]}
          legacyTextStyle={[pendStyles.ignoreText, { color: questTheme.colors.textMuted }]}
          onPress={onDismiss}
          questTheme={questTheme}
          variant="secondary"
        />
      </View>
    );
  }

  const entryAssessments = effectiveEntries.map((entry, index) => {
    const completedEntry = entryWithCompletion(entry, entryStates[index]);
    return assessCaptureCompletion(
      captureText,
      completedEntry,
      { goals: data.categories, modules: data.modules || [], skills: data.skills, lang },
      assessmentDomainOverride,
    );
  });
  const recordableCount = entryAssessments.filter((assessment) => assessment.status !== 'not_recordable').length;

  if (v11TodayEnabled) {
    const universalEntries: UniversalCaptureEntryView[] = effectiveEntries.map((entry, i) => {
      const ui = entryStates[i];
      const completedEntry = entryWithCompletion(entry, ui);
      const assessment = entryAssessments[i];
      const smartRoute = getSmartRouteResult({
        rawText: captureText,
        entry: completedEntry,
        goals: data.categories,
        modules: data.modules || [],
        skills: data.skills,
        lang,
      });
      const routing = resolveRouting(completedEntry);
      const cs = capture?.parsed?.completionSchema;
      const domain = deriveUniversalCaptureDomain({ captureText, completionSchema: cs, entry: completedEntry });
      const activeGoalId = ui.createNewGoal || ui.selectedGoalId === null
        ? undefined
        : ui.selectedGoalId ?? cs?.matchedGoalId ?? smartRoute.selectedGoalId ?? routing.linkedGoalId;
      const selectedGoal = activeGoalId ? data.categories.find((goal) => goal.id === activeGoalId) : undefined;
      const activeModuleId = ui.createNewModule || ui.selectedModuleId === null
        ? undefined
        : ui.selectedModuleId ?? cs?.matchedModuleId ?? smartRoute.selectedModuleId ?? routing.linkedModuleId;
      const selectedModule = activeModuleId && selectedGoal
        ? (data.modules || []).find((module) => module.id === activeModuleId && module.goalId === selectedGoal.id)
        : undefined;
      const selectedExercises = selectedExercisesFor(ui);
      const isExisting = !!resolveSkill(completedEntry);
      const recordable = assessment.status !== 'not_recordable';
      const active = recordable && (domain === 'exercise'
        ? selectedExercises.length > 0 && (isExisting ? ui.include : ui.createNew)
        : isExisting ? ui.include : ui.createNew);
      const rawActions = cs?.suggestedActions?.length
        ? cs.suggestedActions
        : assessment.suggestedActions
          .filter((suggestion) => suggestion.kind === 'exercise' || suggestion.kind === 'scope')
          .map((suggestion) => String(suggestion.value ?? suggestion.label));
      const actionOptions = uniqueLocalizedActions(
        domain === 'exercise' && isConcreteExercise(completedEntry, captureText)
          ? [completedEntry.skillName, ...rawActions]
          : rawActions,
        lang,
      );
      const durationValue = ui.durationMinutes !== undefined
        ? ui.durationMinutes
        : typeof completedEntry.fields.durationMinutes === 'number'
          ? completedEntry.fields.durationMinutes
          : undefined;
      return {
        index: i,
        active,
        domain,
        domainLabel: t(lang, `universalCaptureDomain_${domain}`),
        existing: isExisting,
        recordable,
        title: completedEntry.skillName,
        summary: entrySummary(completedEntry, lang),
        routeLabel: recordable
          ? `${t(lang, 'recordToPath')}: ${selectedGoal?.name ?? t(lang, 'scEntryUnassigned')}${selectedModule ? ` → ${selectedModule.name}` : ''}`
          : undefined,
        routeUncertain: recordable && (!selectedGoal || routing.needsUserChoice),
        actionOptions,
        selectedActions: domain === 'exercise'
          ? selectedExercises
          : ui.scope ? [ui.scope] : [],
        customActionValue: ui.customExerciseName ?? '',
        durationValue,
        qualityValue: ui.qualityRating ?? completedEntry.qualityRating,
        showDuration: domain === 'learning'
          || domain === 'work'
          || (domain === 'exercise' && typeof durationValue === 'number')
          || (domain === 'generic' && completedEntry.progressType === 'time_based'),
        showQuality: recordable,
        exercises: domain === 'exercise'
          ? selectedExercises.map((name) => ({
              name,
              weight: ui.exerciseDetails?.[name]?.weight,
              sets: ui.exerciseDetails?.[name]?.sets,
              reps: ui.exerciseDetails?.[name]?.reps,
            }))
          : [],
        goalOptions: orderedGoals(data.categories || [], [activeGoalId, cs?.matchedGoalId, smartRoute.selectedGoalId, routing.linkedGoalId])
          .slice(0, 5)
          .map((goal) => ({ id: goal.id, label: goal.name })),
        moduleOptions: orderedModules(data.modules || [], selectedGoal?.id, activeModuleId)
          .slice(0, 5)
          .map((module) => ({ id: module.id, label: module.name })),
        selectedGoalId: ui.selectedGoalId === null ? null : activeGoalId,
        selectedModuleId: ui.selectedModuleId === null ? null : activeModuleId,
        createNewGoal: !!ui.createNewGoal,
        createNewModule: !!ui.createNewModule,
        newGoalName: ui.newGoalName ?? suggestedGoalName(cs?.domain ?? smartRoute.domain, captureText, lang),
        newModuleName: ui.newModuleName ?? suggestedModuleName(cs?.domain ?? smartRoute.domain, captureText, completedEntry.skillName, lang),
        nonRecordableHint: assessment.domain === 'state'
          ? t(lang, 'universalCaptureStateHandoff')
          : t(lang, 'universalCaptureContextOnly'),
      };
    });
    const confirmDisabled = !universalEntries.some((entry) => entry.recordable && entry.active);

    return (
      <CapturePendingSurface questTheme={questTheme} status="pending">
        <UniversalCaptureComposer
          confirming={confirming}
          confirmDisabled={confirmDisabled}
          entries={universalEntries}
          labels={{
            add: t(lang, 'addCustomAction'),
            advanced: t(lang, 'universalCaptureMoreFields'),
            cancel: t(lang, 'scEntryIgnore'),
            changeRoute: t(lang, 'change'),
            confirm: t(lang, 'scEntryConfirm'),
            confirmAs: t(lang, 'universalCaptureConfirmAs'),
            createGoal: t(lang, 'createNewGoal'),
            createModule: t(lang, 'createModule'),
            customAction: t(lang, 'universalCaptureCustomAction'),
            decreaseDuration: t(lang, 'universalCaptureDecreaseDuration'),
            duration: t(lang, 'universalCaptureDuration'),
            durationPlaceholder: t(lang, 'universalCaptureDurationPlaceholder'),
            existing: t(lang, 'scEntryExisting'),
            goal: t(lang, 'goal'),
            interpreted: t(lang, 'universalCaptureInterpreted'),
            increaseDuration: t(lang, 'universalCaptureIncreaseDuration'),
            less: t(lang, 'universalCaptureLess'),
            module: t(lang, 'module'),
            more: t(lang, 'universalCaptureMore'),
            newEntry: t(lang, 'scEntryNew'),
            noGoal: t(lang, 'noGoal'),
            noModule: t(lang, 'noModule'),
            quality: t(lang, 'quality'),
            reps: t(lang, 'reps'),
            route: t(lang, 'routing'),
            saving: t(lang, 'savingRecord'),
            stateAction: t(lang, 'universalCaptureOpenState'),
            stateHint: t(lang, 'universalCaptureStateHandoff'),
            sets: t(lang, 'sets'),
            weight: t(lang, 'captureWeight'),
            weightUnit: t(lang, 'captureWeightUnit'),
          }}
          onAddCustomAction={(index) => {
            const entry = effectiveEntries[index];
            const domain = deriveUniversalCaptureDomain({ captureText, completionSchema, entry });
            addCustomAction(index, domain === 'exercise' ? 'fitness' : domain === 'learning' || domain === 'work' ? 'learning' : 'other');
          }}
          onCancel={onDismiss}
          onConfirm={handleConfirm}
          onCreateGoal={(index) => {
            const entry = effectiveEntries[index];
            const domain = capture?.parsed?.completionSchema?.domain ?? deriveUniversalCaptureDomain({ captureText, completionSchema, entry });
            setCreateGoal(index, suggestedGoalName(domain, captureText, lang));
          }}
          onCreateModule={(index) => {
            const entry = effectiveEntries[index];
            const domain = capture?.parsed?.completionSchema?.domain ?? deriveUniversalCaptureDomain({ captureText, completionSchema, entry });
            setCreateModule(index, suggestedModuleName(domain, captureText, entry.skillName, lang));
          }}
          onCustomActionChange={setCustomExercise}
          onDurationChange={setDuration}
          onExerciseValueChange={(index, exerciseName, field, value) => setExerciseDetail(index, exerciseName, field, value)}
          onNewGoalNameChange={setNewGoalName}
          onNewModuleNameChange={setNewModuleName}
          onOpenState={onOpenState ? () => {
            onDismiss();
            onOpenState();
          } : undefined}
          onQualityChange={setQuality}
          onSelectGoal={(index, value) => value == null ? setNoGoal(index) : setSelectedGoal(index, value)}
          onSelectModule={(index, value) => value == null ? setNoModule(index) : setSelectedModule(index, value)}
          onToggleAction={(index, value) => {
            const entry = effectiveEntries[index];
            const domain = deriveUniversalCaptureDomain({ captureText, completionSchema, entry });
            if (domain === 'exercise') {
              toggleExercise(index, value);
              return;
            }
            if (domain === 'learning' || domain === 'work') {
              setScope(index, entryStates[index]?.scope === value ? '' : value);
              return;
            }
            setSelectedSkill(index, value);
          }}
          onToggleEntry={(index) => resolveSkill(effectiveEntries[index]) ? toggleInclude(index) : toggleCreateNew(index)}
          theme={pendingV11Theme(questTheme)}
        />
      </CapturePendingSurface>
    );
  }

  return (
    <CapturePendingSurface questTheme={questTheme} status="pending">
      {/* Header */}
      <Text style={[pendStyles.header, { color: questTheme.colors.text, fontSize: questTheme.typography.bodySize }]}>
        {recordableCount > 0
          ? t(lang, 'scEntryDetected').replace('{n}', String(recordableCount))
          : t(lang, 'scContextDetected')}
      </Text>
      {effectiveEntries.length > 1 ? (
        <PendingAction
          label={allActive ? t(lang, 'scDeselectAll') : t(lang, 'scSelectAll')}
          legacyStyle={[pendStyles.bulkBtn, { borderColor: questTheme.colors.borderStrong, backgroundColor: questTheme.colors.surfaceMuted }]}
          legacyTextStyle={[pendStyles.bulkText, { color: questTheme.colors.primary }]}
          onPress={() => setAllActive(!allActive)}
          questTheme={questTheme}
          variant="secondary"
        />
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
        const activeGoalId = ui.createNewGoal || ui.selectedGoalId === null
          ? undefined
          : ui.selectedGoalId ?? llmGoalId ?? smartRoute.selectedGoalId ?? routing.linkedGoalId;
        const selectedGoal = activeGoalId ? data.categories.find((goal) => goal.id === activeGoalId) : undefined;
        const activeModuleId = ui.createNewModule || ui.selectedModuleId === null
          ? undefined
          : ui.selectedModuleId ?? llmModuleId ?? smartRoute.selectedModuleId ?? routing.linkedModuleId;
        const selectedModule = activeModuleId && selectedGoal
          ? (data.modules || []).find((m) => m.id === activeModuleId && m.goalId === selectedGoal.id)
          : undefined;
        const goalOptions = orderedGoals(data.categories || [], [activeGoalId, llmGoalId, smartRoute.selectedGoalId, routing.linkedGoalId]).slice(0, 6);
        const moduleOptions = orderedModules(data.modules || [], selectedGoal?.id, activeModuleId).slice(0, 6);
        const suggestedGoal = suggestedGoalName(llmDomain, captureText, lang);
        const suggestedModule = suggestedModuleName(llmDomain, captureText, completedEntry.skillName, lang);
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
          <WebView
            dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-recognized-action' } : undefined}
            key={i}
            style={[pendStyles.entryRow, v11TodayEnabled ? pendStyles.v11EntryRow : null, { borderColor: questTheme.colors.border }]}
          >
            {/* Toggle / checkbox */}
            <PendingCheckbox
              checked={active}
              label={entry.skillName}
              legacyStyle={[
                pendStyles.checkbox,
                {
                  borderColor: active ? tagColor : questTheme.colors.border,
                  backgroundColor: active ? tagColor + '22' : 'transparent',
                },
              ]}
              legacyTextStyle={[pendStyles.checkmark, { color: tagColor }]}
              onPress={() => isExisting ? toggleInclude(i) : toggleCreateNew(i)}
              questTheme={questTheme}
            />

            {/* Content */}
            <View style={{ flex: 1, gap: 3 }}>
              <WebView
                dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-recognized-heading' } : undefined}
                style={pendStyles.nameRow}
              >
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
              </WebView>
              {summary ? (
                <Text style={[pendStyles.summary, { color: questTheme.colors.textMuted }]}>
                  {summary}
                </Text>
              ) : null}
              {isRecordable ? (
                <CaptureAttribution
                  color={llmConfidence === 'high'
                    ? questTheme.colors.textMuted
                    : (routing.needsUserChoice ? questTheme.colors.warning : questTheme.colors.textMuted)}
                  label={`${t(lang, selectedGoal && selectedModule ? 'recordToPath' : 'confirmRoute')}: ${selectedGoal?.name ?? t(lang, llmDomain === 'learning' ? 'unassignedLearning' : 'scEntryUnassigned')}${selectedModule ? ` → ${selectedModule.name}` : ''}${llmConfidence !== 'high' ? ` · ${t(lang, goalConfidenceKey)}` : ''}`}
                  state={llmConfidence === 'high' && !routing.needsUserChoice ? 'matched' : 'uncertain'}
                />
              ) : null}
              {assessment.status === 'not_recordable' ? (
                <WebView
                  dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-structured-details' } : undefined}
                  style={[pendStyles.completionBox, v11TodayEnabled ? pendStyles.v11SectionSurface : null, { backgroundColor: v11TodayEnabled ? 'transparent' : questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]}
                >
                  <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>
                    {assessment.domain === 'state' ? t(lang, 'scStateCandidate') : t(lang, 'scFoodCandidate')}
                  </Text>
                  <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                    {assessment.domain === 'state' ? t(lang, 'scStateCandidateHint') : t(lang, 'scFoodCandidateHint')}
                  </Text>
                </WebView>
              ) : assessment.status === 'needs_completion' ? (
                <WebView
                  dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-structured-details' } : undefined}
                  style={[pendStyles.completionBox, v11TodayEnabled ? pendStyles.v11SectionSurface : null, { backgroundColor: v11TodayEnabled ? 'transparent' : questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]}
                >
                  <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>
                    {t(lang, 'scCompleteRecord')}
                  </Text>
                  {v11TodayEnabled ? (
                    <V11SheetButton
                      label={t(lang, expandedRoutingRows.includes(i) ? 'hideAdvancedFields' : 'showAdvancedFields')}
                      onPress={() => setExpandedRoutingRows((current) => (
                        current.includes(i) ? current.filter((index) => index !== i) : [...current, i]
                      ))}
                      theme={pendingV11Theme(questTheme)}
                      tone="neutral"
                      variant="secondary"
                    />
                  ) : null}
                  {(!v11TodayEnabled || expandedRoutingRows.includes(i)) ? (
                  <View style={[pendStyles.routingBox, v11TodayEnabled ? pendStyles.v11RoutingGroup : null, { borderColor: questTheme.colors.border, backgroundColor: v11TodayEnabled ? 'transparent' : questTheme.colors.surfaceSubtle }]}>
                    <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>
                      {t(lang, 'routing')}
                    </Text>
                    <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                      {t(lang, 'autoSuggestedEditable')}
                    </Text>
                    <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                      {t(lang, 'suggestedGoal')}
                    </Text>
                    <View style={pendStyles.chipRow}>
                      {goalOptions.map((goal) => {
                        const selected = !ui.createNewGoal && ui.selectedGoalId !== null && selectedGoal?.id === goal.id;
                        return (
                          <PendingChip
                            key={goal.id}
                            label={goal.name}
                            legacyStyle={chipStyle(selected)}
                            legacyTextStyle={chipTextStyle(selected)}
                            onPress={() => setSelectedGoal(i, goal.id)}
                            questTheme={questTheme}
                            selected={selected}
                          />
                        );
                      })}
                      <PendingChip label={t(lang, 'noGoal')} legacyStyle={chipStyle(ui.selectedGoalId === null)} legacyTextStyle={chipTextStyle(ui.selectedGoalId === null)} onPress={() => setNoGoal(i)} questTheme={questTheme} selected={ui.selectedGoalId === null} />
                      <PendingChip label={t(lang, 'createNewGoal')} legacyStyle={chipStyle(!!ui.createNewGoal)} legacyTextStyle={chipTextStyle(!!ui.createNewGoal)} onPress={() => setCreateGoal(i, suggestedGoal)} questTheme={questTheme} selected={!!ui.createNewGoal} />
                    </View>
                    {ui.createNewGoal ? (
                      <PendingTextField
                        questTheme={questTheme}
                        value={ui.newGoalName ?? suggestedGoal}
                        onChangeText={(value) => setNewGoalName(i, value)}
                        placeholder={t(lang, 'goalName')}
                        placeholderTextColor={questTheme.colors.textSubtle}
                        style={compactInputStyle}
                      />
                    ) : null}
                    {(selectedGoal || ui.createNewGoal) && ui.selectedGoalId !== null ? (
                      <>
                        <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                          {t(lang, 'suggestedModule')}
                        </Text>
                        <View style={pendStyles.chipRow}>
                          {moduleOptions.map((module) => {
                            const selected = !ui.createNewModule && ui.selectedModuleId !== null && selectedModule?.id === module.id;
                            return (
                              <PendingChip
                                key={module.id}
                                label={module.name}
                                legacyStyle={[pendStyles.optionChip, {
                                  borderColor: selected ? questTheme.colors.primary : questTheme.colors.chipBorder,
                                  backgroundColor: selected ? questTheme.colors.chipSelectedBg : questTheme.colors.chipBg,
                                }]}
                                legacyTextStyle={chipTextStyle(selected)}
                                onPress={() => setSelectedModule(i, module.id)}
                                questTheme={questTheme}
                                selected={selected}
                              />
                            );
                          })}
                          <PendingChip
                            label={t(lang, 'noModule')}
                            legacyStyle={[pendStyles.optionChip, {
                              borderColor: ui.selectedModuleId === null ? questTheme.colors.primary : questTheme.colors.chipBorder,
                              backgroundColor: ui.selectedModuleId === null ? questTheme.colors.chipSelectedBg : questTheme.colors.chipBg,
                            }]}
                            legacyTextStyle={chipTextStyle(ui.selectedModuleId === null)}
                            onPress={() => setNoModule(i)}
                            questTheme={questTheme}
                            selected={ui.selectedModuleId === null}
                          />
                          <PendingChip
                            label={t(lang, 'createModule')}
                            legacyStyle={[pendStyles.optionChip, {
                              borderColor: ui.createNewModule ? questTheme.colors.primary : questTheme.colors.chipBorder,
                              backgroundColor: ui.createNewModule ? questTheme.colors.chipSelectedBg : questTheme.colors.chipBg,
                            }]}
                            legacyTextStyle={chipTextStyle(!!ui.createNewModule)}
                            onPress={() => setCreateModule(i, suggestedModule)}
                            questTheme={questTheme}
                            selected={!!ui.createNewModule}
                          />
                        </View>
                        {ui.createNewModule ? (
                          <PendingTextField
                            questTheme={questTheme}
                            value={ui.newModuleName ?? suggestedModule}
                            onChangeText={(value) => setNewModuleName(i, value)}
                            placeholder={t(lang, 'moduleName')}
                            placeholderTextColor={questTheme.colors.textSubtle}
                            style={compactInputStyle}
                          />
                        ) : null}
                      </>
                    ) : null}
                  </View>
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
                            <PendingChip
                              key={item.id}
                              label={item.label}
                              legacyStyle={chipStyle(selected)}
                              legacyTextStyle={chipTextStyle(selected)}
                              onPress={() => {
                                if (llmDomain === 'fitness') toggleExercise(i, name);
                                else setSelectedSkill(i, name, (item as any).skillId);
                              }}
                              questTheme={questTheme}
                              selected={selected}
                            />
                          );
                        })}
                        {selectedExerciseNames
                          .filter((name) => !exerciseSuggestions.some((item) => normalizeName(String((item as any).value ?? item.id)) === normalizeName(name)))
                          .map((name) => (
                            <PendingChip
                              key={`custom:${normalizeName(name)}`}
                              label={name}
                              legacyStyle={chipStyle(true)}
                              legacyTextStyle={chipTextStyle(true)}
                              onPress={() => toggleExercise(i, name)}
                              questTheme={questTheme}
                              selected
                            />
                          ))}
                      </View>
                      <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'customExercise')}</Text>
                      <WebView
                        dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-inline-add' } : undefined}
                        style={pendStyles.customActionRow}
                      >
                        <PendingTextField
                          questTheme={questTheme}
                          value={ui.customExerciseName ?? ''}
                          onChangeText={(value) => setCustomExercise(i, value)}
                          placeholder={t(lang, 'addCustomExercise')}
                          placeholderTextColor={questTheme.colors.textSubtle}
                          onSubmitEditing={() => addCustomAction(i, llmDomain)}
                          style={[compactInputStyle, { flex: 1 }]}
                        />
                        <PendingAction
                          label={t(lang, 'addCustomAction')}
                          legacyStyle={[pendStyles.addCustomBtn, { borderColor: questTheme.colors.primary, backgroundColor: questTheme.colors.chipSelectedBg }]}
                          legacyTextStyle={[pendStyles.optionText, { color: questTheme.colors.primary }]}
                          onPress={() => addCustomAction(i, llmDomain)}
                          questTheme={questTheme}
                          variant="secondary"
                        />
                      </WebView>
                      {selectedExerciseNames.length > 0 ? (
                        <View style={pendStyles.exerciseDetailsWrap}>
                          <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'exerciseDetails')}</Text>
                          {selectedExerciseNames.map((exerciseName) => {
                            const details = ui.exerciseDetails?.[exerciseName] ?? {};
                            return (
                              <View key={exerciseName} style={[pendStyles.exerciseDetailCard, v11TodayEnabled ? pendStyles.v11ExerciseDetail : null, { borderColor: questTheme.colors.borderStrong, backgroundColor: v11TodayEnabled ? 'transparent' : questTheme.colors.surfaceSubtle }]}>
                                <Text style={[pendStyles.completionTitle, { color: questTheme.colors.text }]}>{exerciseName}</Text>
                                {v11TodayEnabled ? (
                                  <>
                                    <WebView dataSet={{ 'v11-rebaseline-role': 'capture-metric-grid' }}>
                                      <WebView dataSet={{ 'v11-rebaseline-role': 'capture-metric-field' }}>
                                        <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                                          {t(lang, 'captureWeight')}
                                        </Text>
                                        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-metric-control' }}>
                                          <PendingTextField
                                            keyboardType="numeric"
                                            onChangeText={(value) => setExerciseDetail(i, exerciseName, 'weight', value)}
                                            placeholder="0"
                                            placeholderTextColor={questTheme.colors.textSubtle}
                                            questTheme={questTheme}
                                            style={{ minWidth: 0, width: '100%' }}
                                            value={details.weight ?? ''}
                                          />
                                          <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                                            {t(lang, 'captureWeightUnit')}
                                          </Text>
                                        </WebView>
                                      </WebView>
                                      <WebView dataSet={{ 'v11-rebaseline-role': 'capture-metric-field' }}>
                                        <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                                          {t(lang, 'sets')}
                                        </Text>
                                        <PendingTextField
                                          keyboardType="numeric"
                                          onChangeText={(value) => setExerciseDetail(i, exerciseName, 'sets', value)}
                                          placeholder="0"
                                          placeholderTextColor={questTheme.colors.textSubtle}
                                          questTheme={questTheme}
                                          style={{ minWidth: 0, width: '100%' }}
                                          value={details.sets ?? ''}
                                        />
                                      </WebView>
                                      <WebView dataSet={{ 'v11-rebaseline-role': 'capture-metric-field' }}>
                                        <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                                          {t(lang, 'reps')}
                                        </Text>
                                        <PendingTextField
                                          keyboardType="numeric"
                                          onChangeText={(value) => setExerciseDetail(i, exerciseName, 'reps', value)}
                                          placeholder="0"
                                          placeholderTextColor={questTheme.colors.textSubtle}
                                          questTheme={questTheme}
                                          style={{ minWidth: 0, width: '100%' }}
                                          value={details.reps ?? ''}
                                        />
                                      </WebView>
                                    </WebView>
                                    <WebView dataSet={{ 'v11-rebaseline-role': 'capture-calibration-row' }}>
                                      <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                                        {t(lang, 'scRpe')}
                                      </Text>
                                      <V11CompactValueSelector<number | null>
                                        columns={3}
                                        onChange={(value) => setExerciseDetail(i, exerciseName, 'rpe', value)}
                                        options={[
                                          ...[6, 7, 8, 9, 10].map((value) => ({ value, label: String(value) })),
                                          { value: null, label: t(lang, 'scSkip') },
                                        ]}
                                        theme={pendingV11Theme(questTheme)}
                                        value={details.rpe}
                                      />
                                    </WebView>
                                  </>
                                ) : (
                                  <>
                                    <View style={pendStyles.detailInputRow}>
                                      <PendingTextField
                                        questTheme={questTheme}
                                        value={details.weight ?? ''}
                                        onChangeText={(value) => setExerciseDetail(i, exerciseName, 'weight', value)}
                                        placeholder={t(lang, 'weight')}
                                        placeholderTextColor={questTheme.colors.textSubtle}
                                        keyboardType="numeric"
                                        style={miniInputStyle}
                                      />
                                      <PendingTextField
                                        questTheme={questTheme}
                                        value={details.sets ?? ''}
                                        onChangeText={(value) => setExerciseDetail(i, exerciseName, 'sets', value)}
                                        placeholder={t(lang, 'sets')}
                                        placeholderTextColor={questTheme.colors.textSubtle}
                                        keyboardType="numeric"
                                        style={miniInputStyle}
                                      />
                                      <PendingTextField
                                        questTheme={questTheme}
                                        value={details.reps ?? ''}
                                        onChangeText={(value) => setExerciseDetail(i, exerciseName, 'reps', value)}
                                        placeholder={t(lang, 'reps')}
                                        placeholderTextColor={questTheme.colors.textSubtle}
                                        keyboardType="numeric"
                                        style={miniInputStyle}
                                      />
                                    </View>
                                    <View style={pendStyles.chipRow}>
                                      {[6, 7, 8, 9, 10].map((rpeValue) => {
                                        const selected = details.rpe === rpeValue;
                                        return (
                                          <PendingChip
                                            key={rpeValue}
                                            label={`${t(lang, 'rpe')} ${rpeValue}`}
                                            legacyStyle={chipStyle(selected)}
                                            legacyTextStyle={chipTextStyle(selected)}
                                            onPress={() => setExerciseDetail(i, exerciseName, 'rpe', rpeValue)}
                                            questTheme={questTheme}
                                            selected={selected}
                                          />
                                        );
                                      })}
                                      <PendingChip label={t(lang, 'scSkip')} legacyStyle={chipStyle(false)} legacyTextStyle={chipTextStyle(false)} onPress={() => setExerciseDetail(i, exerciseName, 'rpe', null)} questTheme={questTheme} selected={false} />
                                    </View>
                                  </>
                                )}
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
                            <PendingChip
                              key={scope}
                              label={t(lang, scope)}
                              legacyStyle={chipStyle(selected)}
                              legacyTextStyle={chipTextStyle(selected)}
                              onPress={() => setScope(i, scope)}
                              questTheme={questTheme}
                              selected={selected}
                            />
                          );
                        })}
                      </View>
                      {ui.scope && !scopeOptions.includes(ui.scope) ? (
                        <View style={pendStyles.chipRow}>
                          <PendingChip label={ui.scope} legacyStyle={chipStyle(true)} legacyTextStyle={chipTextStyle(true)} onPress={() => setScope(i, '')} questTheme={questTheme} selected />
                        </View>
                      ) : null}
                      <WebView
                        dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-inline-add' } : undefined}
                        style={pendStyles.customActionRow}
                      >
                        <PendingTextField
                          questTheme={questTheme}
                          value={ui.customExerciseName ?? ''}
                          onChangeText={(value) => setCustomExercise(i, value)}
                          placeholder={t(lang, 'whatDidYouStudy')}
                          placeholderTextColor={questTheme.colors.textSubtle}
                          onSubmitEditing={() => addCustomAction(i, llmDomain)}
                          style={[compactInputStyle, { flex: 1 }]}
                        />
                        <PendingAction
                          label={t(lang, 'addCustomAction')}
                          legacyStyle={[pendStyles.addCustomBtn, { borderColor: questTheme.colors.primary, backgroundColor: questTheme.colors.chipSelectedBg }]}
                          legacyTextStyle={[pendStyles.optionText, { color: questTheme.colors.primary }]}
                          onPress={() => addCustomAction(i, llmDomain)}
                          questTheme={questTheme}
                          variant="secondary"
                        />
                      </WebView>
                    </>
                  ) : null}
                  {v11TodayEnabled && (durationSuggestions.length > 0 || qualitySuggestions.length > 0 || rpeSuggestions.length > 0) ? (
                    <WebView dataSet={{ 'v11-rebaseline-role': 'capture-optional-calibration' }}>
                      <Text style={{ color: questTheme.colors.text, ...v11Typography.label }}>
                        {t(lang, 'captureOptionalCalibration')}
                      </Text>
                      {durationSuggestions.length > 0 ? (
                        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-calibration-row' }}>
                          <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                            {t(lang, 'scTrainingDuration')}
                          </Text>
                          <V11CompactValueSelector<number | null>
                            columns={Math.min(4, durationSuggestions.length)}
                            onChange={(value) => setDuration(i, value)}
                            options={durationSuggestions.map((item) => {
                              const value = typeof item.value === 'number' ? item.value : null;
                              return { value, label: value == null ? t(lang, 'scSkip') : String(value) };
                            })}
                            theme={pendingV11Theme(questTheme)}
                            value={ui.durationMinutes}
                          />
                        </WebView>
                      ) : null}
                      {qualitySuggestions.length > 0 ? (
                        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-calibration-row' }}>
                          <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                            {t(lang, 'scCompletionQuality')}
                          </Text>
                          <V11CompactValueSelector<number>
                            columns={qualitySuggestions.length}
                            onChange={(value) => setQuality(i, value)}
                            options={qualitySuggestions.map((item) => ({ value: Number(item.value), label: String(Number(item.value)) }))}
                            theme={pendingV11Theme(questTheme)}
                            value={ui.qualityRating}
                          />
                        </WebView>
                      ) : null}
                      {rpeSuggestions.length > 0 ? (
                        <WebView dataSet={{ 'v11-rebaseline-role': 'capture-calibration-row' }}>
                          <Text style={{ color: questTheme.colors.textMuted, ...v11Typography.metadata }}>
                            {t(lang, 'scRpe')}
                          </Text>
                          <V11CompactValueSelector<number | null>
                            columns={3}
                            onChange={(value) => setRpe(i, value ?? undefined)}
                            options={[
                              ...rpeSuggestions.map((item) => ({ value: Number(item.value), label: String(Number(item.value)) })),
                              { value: null, label: t(lang, 'scSkip') },
                            ]}
                            theme={pendingV11Theme(questTheme)}
                            value={ui.rpe}
                          />
                        </WebView>
                      ) : null}
                    </WebView>
                  ) : (
                    <>
                      {durationSuggestions.length > 0 ? (
                        <>
                          <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'scTrainingDuration')}</Text>
                          <View style={pendStyles.chipRow}>
                            {durationSuggestions.map((item) => {
                              const value = typeof item.value === 'number' ? item.value : null;
                              const selected = ui.durationMinutes === value;
                              return (
                                <PendingChip
                                  key={item.id}
                                  label={value == null ? t(lang, 'scSkip') : `${value}`}
                                  legacyStyle={chipStyle(selected)}
                                  legacyTextStyle={chipTextStyle(selected)}
                                  onPress={() => setDuration(i, value)}
                                  questTheme={questTheme}
                                  selected={selected}
                                />
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
                                <PendingChip key={item.id} label={String(value)} legacyStyle={chipStyle(selected)} legacyTextStyle={chipTextStyle(selected)} onPress={() => setQuality(i, value)} questTheme={questTheme} selected={selected} />
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
                                <PendingChip key={item.id} label={String(value)} legacyStyle={chipStyle(selected)} legacyTextStyle={chipTextStyle(selected)} onPress={() => setRpe(i, value)} questTheme={questTheme} selected={selected} />
                              );
                            })}
                          </View>
                        </>
                      ) : null}
                    </>
                  )}
                  <Text style={[pendStyles.completionHint, { color: questTheme.colors.textMuted }]}>
                    {routing.needsUserChoice ? t(lang, 'scNeedsRouteConfirm') : t(lang, 'scAutoMatched')}
                  </Text>
                </WebView>
              ) : null}
            </View>
          </WebView>
        );
      })}

      {/* Action buttons */}
      <WebView
        dataSet={v11TodayEnabled ? { 'v11-rebaseline-role': 'capture-pending-actions' } : undefined}
        style={[
          pendStyles.actions,
          v11TodayEnabled ? pendStyles.v11Actions : null,
          v11TodayEnabled ? { borderColor: questTheme.colors.border } : null,
        ]}
      >
        {recordableCount > 0 ? (
          <PendingAction
            disabled={confirming}
            label={t(lang, confirming ? 'savingRecord' : 'scEntryConfirm')}
            legacyStyle={[pendStyles.confirmBtn, { backgroundColor: confirming ? questTheme.colors.disabledBg : questTheme.colors.primary, borderRadius: questTheme.radius.sm }]}
            legacyTextStyle={[pendStyles.confirmText, { color: confirming ? questTheme.colors.disabledText : questTheme.colors.primaryText }]}
            loading={confirming}
            onPress={handleConfirm}
            questTheme={questTheme}
            variant="primary"
          />
        ) : null}
        <PendingAction
          label={t(lang, 'scEntryIgnore')}
          legacyStyle={pendStyles.ignoreBtn}
          legacyTextStyle={[pendStyles.ignoreText, { color: questTheme.colors.textMuted }]}
          onPress={onDismiss}
          questTheme={questTheme}
          variant="secondary"
        />
      </WebView>
    </CapturePendingSurface>
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
  routingBox: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 6 },
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
  feedbackList: { gap: 8, marginTop: 8, marginBottom: 8 },
  feedbackItem: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 5 },
  afterStateBox: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 7, marginTop: 4, marginBottom: 8 },
  afterStateRow: { gap: 5 },
  afterStateLabel: { fontSize: 11, fontWeight: '700' },
  afterStateChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  afterStateActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 2 },
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
  v11EntryRow: { paddingVertical: 12, gap: 12 },
  v11Checkbox: { width: 44, height: 44, borderRadius: 14, marginTop: 0 },
  v11OptionChip: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  v11SectionSurface: { borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: 10, gap: 10 },
  v11RoutingGroup: { borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: 8 },
  v11Disclosure: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', borderBottomWidth: 1 },
  v11ExerciseDetail: { borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingVertical: 10 },
  v11Actions: { paddingTop: 12, paddingBottom: 4, borderTopWidth: 1 },
  v11ConfirmBtn: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center' },
});
