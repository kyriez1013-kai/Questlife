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
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useStore } from '../store';
import { getQuestTheme, getStateToneColor } from '../design/tokens';
import { getLanguage, t } from '../i18n';
import { ParsedEntry, ProgressType, TaskType } from '../types';
import QuestCard from '../components/ui/QuestCard';

// ── Per-entry UI state ────────────────────────────────────────────────────────

type EntryUI = {
  include: boolean;    // for existing skills: include in log (default true)
  createNew: boolean;  // for new skills: create it (default false, user opts in)
  moduleId: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function setsSummary(entry: ParsedEntry, lang: 'zh' | 'en'): string {
  const sets: { weight?: number; reps?: number }[] = entry.fields.sets ?? [];
  if (sets.length === 0) return '';
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

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  captureId: string;
  entries: ParsedEntry[];
  onDismiss: () => void;  // called after confirm or ignore (marks entriesDismissed)
};

export default function HomeCapturePending({ captureId: _captureId, entries, onDismiss }: Props) {
  const { data, addSkill, createExecutionLog, addExistingSkillToModule } = useStore();
  const lang = getLanguage(data.settings.language ?? data.settings.preferredLanguage);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);

  const [entryStates, setEntryStates] = useState<EntryUI[]>(() =>
    entries.map((e) => ({
      include:   true,                         // confirmation card means user can opt out before writing
      createNew: e.matchedSkillId == null,     // unmatched concrete entries should be written after confirm
      moduleId:  null,
    })),
  );
  const [logged, setLogged] = useState(false);

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

  const resolveCategory = useCallback((entryGoalType: string, entryProgressType: string, skillId?: string) => {
    const existingSkill = skillId ? data.skills.find((s) => s.id === skillId) : undefined;
    if (existingSkill?.categoryId) {
      const bySkill = data.categories.find((c) => c.id === existingSkill.categoryId);
      if (bySkill) return bySkill;
    }
    const linkedGoalId = resolvePrimaryLink(skillId)?.goalId;
    if (linkedGoalId) {
      const byLink = data.categories.find((c) => c.id === linkedGoalId);
      if (byLink) return byLink;
    }

    // 1. Exact goalType match (works when user has template-created categories)
    const byGoalType = data.categories.find((c) => c.goalType === entryGoalType);
    if (byGoalType) return byGoalType;

    // 1b. Domain/name fallback for older goals that have no goalType
    if (entryGoalType === 'fitness') {
      const byFitnessDomain = data.categories.find((c) => String(c.domain ?? '').startsWith('fitness'));
      if (byFitnessDomain) return byFitnessDomain;
      const byFitnessName = data.categories.find((c) => {
        const name = normalizeName(c.name);
        return name.includes('健身') || name.includes('力量') || name.includes('fitness') || name.includes('gym');
      });
      if (byFitnessName) return byFitnessName;
    }

    // 2. Find a category that already hosts a skill with the same taskType
    const taskType = inferTaskType(entryGoalType, entryProgressType);
    const siblingSkill = data.skills.find((s) => s.taskType === taskType && !!s.categoryId);
    if (siblingSkill) {
      const bySibling = data.categories.find((c) => c.id === siblingSkill.categoryId);
      if (bySibling) return bySibling;
    }

    // 3. First available category as last resort
    return data.categories[0] ?? null;
  }, [data.categories, data.skills, resolvePrimaryLink]);

  const handleConfirm = useCallback(() => {
    const date = todayStr();

    entries.forEach((entry, i) => {
      const ui = entryStates[i];
      const matchedSkill = resolveSkill(entry);
      let skillId = matchedSkill?.id ?? null;
      let linkedGoalId: string | undefined;
      let linkedModuleId: string | undefined;

      if (!skillId && ui.createNew) {
        // ── New skill path ──────────────────────────────────────────────────
        const cat = resolveCategory(entry.goalType ?? 'custom', entry.progressType);
        const newSkill = addSkill({
          name: entry.skillName,
          color: questTheme.colors.primary,
          dailyTargetMinutes: entry.progressType === 'time_based'
            ? (entry.fields.durationMinutes ?? 30) : 30,
          progressType: entry.progressType as ProgressType,
          taskType: inferTaskType(entry.goalType ?? 'custom', entry.progressType),
          categoryId: cat?.id,                    // explicit categoryId — fixes "未分类"
          scheduleEnabled: false,
          scheduleType: 'manual_only' as const,
          metricConfig: {
            metricType: entry.progressType as ProgressType,
            performanceType: entry.progressType === 'performance_log' ? 'strength' : undefined,
            primaryMetric: entry.progressType === 'performance_log' ? 'weight' : undefined,
          },
        });
        skillId = newSkill.id;
        linkedGoalId = cat?.id;                   // fixes "健身目标里看不到"

        // Link to a module so GoalDetailScreen's linkedSkillIds filter finds it
        const targetModuleId = ui.moduleId
          ?? (cat ? (data.modules || []).find((m) => m.goalId === cat.id)?.id : undefined);
        linkedModuleId = targetModuleId;
        if (cat && targetModuleId) {
          addExistingSkillToModule(cat.id, targetModuleId, skillId);
        }
      } else if (skillId) {
        // ── Existing matched skill path ──────────────────────────────────────
        const link = resolvePrimaryLink(skillId);
        linkedGoalId = link?.goalId ?? matchedSkill?.categoryId;
        linkedModuleId = link?.moduleId;
        if (!linkedGoalId) {
          linkedGoalId = resolveCategory(entry.goalType ?? 'custom', entry.progressType, skillId)?.id;
        }
      }

      // Gate: existing deselected or new not opted-in
      if (matchedSkill && !ui.include) return;
      if (!matchedSkill && !ui.createNew) return;
      if (!skillId) return;

      const durationMinutes = estimateDuration(entry);
      const isStrength = entry.progressType === 'performance_log';
      const sets: { weight?: number; reps?: number }[] = Array.isArray(entry.fields.sets) ? entry.fields.sets : [];
      const strengthSets = sets.map((s) => ({
        weight: (s.weight && s.weight > 0) ? s.weight : entry.fields.extraWeight,
        reps: s.reps ?? 0,
        sets: 1,
      }));
      const topWeight = strengthSets.reduce((best, set) => Math.max(best, set.weight ?? 0), 0) || undefined;
      const totalVolume = strengthSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0) * (set.sets ?? 1), 0) || undefined;
      const firstReps = strengthSets.find((set) => set.reps)?.reps;
      const performanceData = isStrength ? {
        performanceType: 'strength',
        strengthSets,
        totalVolume,
      } : undefined;

      createExecutionLog({
        linkedSkillId: skillId,
        linkedGoalId,                              // explicit — fixes both symptoms
        linkedModuleId,
        date,
        durationMinutes,
        qualityRating: entry.qualityRating as any,
        source: 'manual',
        title: entry.skillName,
        taskType: inferTaskType(entry.goalType ?? 'custom', entry.progressType),
        ...(entry.progressType === 'time_based' ? { note: entry.fields.note } : {}),
        actualData: isStrength ? {
          kind: 'strength_training',
          exerciseName: entry.skillName,
          strength: {
            weight: topWeight,
            reps: firstReps,
            sets: strengthSets.length || undefined,
            volume: totalVolume,
          },
        } : undefined,
        structuredData: isStrength ? {
          exerciseName: entry.skillName,
          weight: topWeight,
          sets: strengthSets.length || undefined,
          reps: firstReps,
          durationMinutes,
        } : entry.fields,
        metricUpdate: isStrength
          ? {
              metricType: 'performance_log' as ProgressType,
              performanceValue: topWeight,
              performanceUnit: topWeight != null ? 'kg' : undefined,
              performanceNote: entry.fields.note,
              performanceData,
            }
          : {
              metricType: entry.progressType as ProgressType,
              minutesAdded: entry.progressType === 'time_based' ? durationMinutes : undefined,
            },
      });
    });

    setLogged(true);
    setTimeout(onDismiss, 800);
  }, [entries, entryStates, data.modules, questTheme.colors.primary,
      resolveSkill, resolvePrimaryLink, resolveCategory, addSkill, addExistingSkillToModule, createExecutionLog, onDismiss]);

  if (logged) {
    return (
      <View style={[pendStyles.loggedRow, { backgroundColor: questTheme.colors.successSoft, borderRadius: questTheme.radius.sm }]}>
        <Text style={[pendStyles.loggedText, { color: questTheme.colors.success }]}>
          {t(lang, 'scEntryLogged')}
        </Text>
      </View>
    );
  }

  return (
    <QuestCard questTheme={questTheme} variant="flat" style={{ marginTop: questTheme.spacing.sm }}>
      {/* Header */}
      <Text style={[pendStyles.header, { color: questTheme.colors.text, fontSize: questTheme.typography.bodySize }]}>
        {t(lang, 'scEntryDetected').replace('{n}', String(entries.length))}
      </Text>

      {/* Entry rows */}
      {entries.map((entry, i) => {
        const ui = entryStates[i];
        const isExisting = !!resolveSkill(entry);
        const mods = isExisting ? [] : modulesFor(entry.goalType ?? '');
        const summary = entrySummary(entry, lang);
        const active = isExisting ? ui.include : ui.createNew;
        const tagColor = isExisting ? questTheme.colors.success : questTheme.colors.accent;
        const tagBg = isExisting ? questTheme.colors.successSoft : questTheme.colors.accentSoft;

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
                  {entry.skillName}
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
              {/* Module selector for new skills */}
              {!isExisting && ui.createNew && mods.length > 0 && (
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
        <TouchableOpacity
          onPress={handleConfirm}
          style={[pendStyles.confirmBtn, { backgroundColor: questTheme.colors.primary, borderRadius: questTheme.radius.sm }]}
          activeOpacity={0.8}
        >
          <Text style={[pendStyles.confirmText, { color: questTheme.colors.primaryText }]}>
            {t(lang, 'scEntryConfirm')}
          </Text>
        </TouchableOpacity>
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
