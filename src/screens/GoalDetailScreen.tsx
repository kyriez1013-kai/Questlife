import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useStore } from '../store';
import { theme } from '../theme';
import { ModuleSkillLink, OutcomeCriterion, OutcomeMetricType, QuestModule, Skill } from '../types';
import GoalForm from '../components/GoalForm';
import SkillForm from '../components/SkillForm';
import BottomSheetForm from '../components/BottomSheetForm';
import { getLanguage, goalTypeLabel, metricTypeLabel, progressModelLabel, progressTypeLabel, t } from '../i18n';
import {
  calculateGoalProgress,
  calculateModuleProgress,
  calculateOutcomeCriterionProgress,
  calculateSkillProgress,
  formatMetricUpdateSummary,
  getSuggestedModulesForGoalType,
  progressTypeForSkill,
  skillsForModule,
} from '../progress';
import { uid } from '../storage';
import { getGoalCoreLoopStatus } from '../utils/coreLoop';
import { getQuestTheme, QuestTheme } from '../design/tokens';
import { systemIcons } from '../design/systemIcons';
import { getGoalSemanticIcon, getModuleSemanticIcon, getSkillSemanticIcon } from '../design/entityIcons';
import QuestButton from '../components/ui/QuestButton';
import QuestCard from '../components/ui/QuestCard';
import QuestEmptyState from '../components/ui/QuestEmptyState';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import QuestIcon from '../components/ui/QuestIcon';
import QuestInput from '../components/ui/QuestInput';
import QuestPill from '../components/ui/QuestPill';
import QuestProgressBar from '../components/ui/QuestProgressBar';
import { confirmAction } from '../utils/confirm';
import { formatEffortUnitSummary } from '../utils/effort';

type ParamList = { GoalDetail: { categoryId: string } };

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, String(value)), template);
}

function progressSummary(skill: Skill, lang: 'zh' | 'en') {
  const type = progressTypeForSkill(skill);
  const progress = calculateSkillProgress(skill);
  const percent = progress.percent ?? 0;
  if (type === 'none') return progressTypeLabel(lang, type);
  if (type === 'qualitative') return t(lang, 'qualitativeReview');
  if (type === 'curriculum') {
    const items = skill.curriculumItems ?? [];
    const done = items.filter((item) => item.completed).length;
    return `${fill(t(lang, 'itemsCompleted'), { done, total: items.length })} · ${percent}%`;
  }
  if (type === 'frequency') {
    return `${fill(t(lang, 'thisWeekCount'), { done: skill.completedThisWeek ?? 0, total: skill.weeklyTargetCount ?? 0 })} · ${percent}%`;
  }
  return `${progress.summary} · ${percent}%`;
}

function displayModuleName(module: QuestModule, lang: 'zh' | 'en') {
  return module.id.includes('-default') ? t(lang, 'defaultModule') : module.name;
}

const METRIC_TYPES: OutcomeMetricType[] = ['target_value', 'time_based', 'frequency', 'checklist', 'performance_log', 'quality_score', 'state_based', 'money_based', 'manual', 'binary', 'qualitative'];

export default function GoalDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'GoalDetail'>>();
  const { data, updateCategory, addModule, updateModule, deleteModule, addExistingSkillToModule, removeSkillFromModule } = useStore();
  const lang = getLanguage(data.settings.language);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const categoryId = route.params.categoryId;
  const cat = data.categories.find((c) => c.id === categoryId);

  const [editing, setEditing] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | undefined>();
  const [moduleName, setModuleName] = useState('');
  const [moduleIcon, setModuleIcon] = useState('📁');
  const [moduleDescription, setModuleDescription] = useState('');
  const [skillModuleId, setSkillModuleId] = useState<string | undefined>();
  const [existingModuleId, setExistingModuleId] = useState<string | undefined>();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [criterionOpen, setCriterionOpen] = useState(false);
  const [editingCriterionId, setEditingCriterionId] = useState<string | undefined>();
  const [criterionTitle, setCriterionTitle] = useState('');
  const [criterionDescription, setCriterionDescription] = useState('');
  const [criterionMetric, setCriterionMetric] = useState<OutcomeMetricType>('target_value');
  const [criterionCurrent, setCriterionCurrent] = useState('');
  const [criterionTarget, setCriterionTarget] = useState('');
  const [criterionUnit, setCriterionUnit] = useState('');
  const [criterionWeight, setCriterionWeight] = useState('25');
  const [criterionLinkedSkillId, setCriterionLinkedSkillId] = useState<string | undefined>();
  const [criterionCompleted, setCriterionCompleted] = useState(false);

  useEffect(() => {
    if (!cat) nav.goBack();
  }, [cat, nav]);

  const modules = useMemo(
    () => (data.modules || []).filter((m) => m.goalId === categoryId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [data.modules, categoryId]
  );
  const skills = useMemo(
    () => data.skills,
    [data.skills]
  );
  const links = data.moduleSkillLinks || [];
  const goalProgress = cat ? calculateGoalProgress(cat, modules, skills, links) : 0;
  const criteria = cat?.outcomeCriteria ?? [];
  const totalWeight = criteria.reduce((sum, criterion) => sum + (criterion.weight || 0), 0);
  const suggestedModules = getSuggestedModulesForGoalType(cat?.goalType);
  const missingSuggestedModules = suggestedModules.filter((name) => (
    !modules.some((module) => module.name.toLowerCase() === name.toLowerCase())
  ));
  const goalLoopStatus = useMemo(() => (
    cat
      ? getGoalCoreLoopStatus(cat, data.modules || [], skills, links, data.scheduleBlocks || [], data.executionLogs || [], lang)
      : null
  ), [cat, data.modules, data.scheduleBlocks, data.executionLogs, skills, links, lang]);
  const recentExecutionLogs = useMemo(() => {
    const linkedSkillIds = new Set(links.filter((link) => link.goalId === categoryId).map((link) => link.skillId));
    return (data.executionLogs || [])
      .filter((log) => log.linkedGoalId === categoryId || (!!log.linkedSkillId && linkedSkillIds.has(log.linkedSkillId)))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 3);
  }, [data.executionLogs, links, categoryId]);
  const goalEffortSummary = useMemo(() => {
    const relevantLinks = (data.contributionLinks || []).filter((link) => link.targetType === 'goal' && link.targetId === categoryId);
    const effortById = new Map((data.effortUnits || []).map((unit) => [unit.id, unit]));
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const rows = relevantLinks
      .map((link) => ({ link, effort: effortById.get(link.effortUnitId) }))
      .filter((row): row is { link: typeof relevantLinks[number]; effort: NonNullable<ReturnType<typeof effortById.get>> } => !!row.effort)
      .sort((a, b) => b.effort.timestamp.localeCompare(a.effort.timestamp));
    const weeklyRows = rows.filter((row) => row.effort.date >= weekStartStr);
    return {
      rows,
      weeklyCount: weeklyRows.length,
      directCount: weeklyRows.filter((row) => row.link.contributionType === 'direct').length,
      indirectCount: weeklyRows.filter((row) => row.link.contributionType === 'indirect').length,
      recent: rows.slice(0, 3),
    };
  }, [data.contributionLinks, data.effortUnits, categoryId]);

  useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      modules.forEach((m, index) => {
        if (next[m.id] == null) next[m.id] = index === 0;
      });
      return next;
    });
  }, [modules]);

  if (!cat) return null;

  const submitModule = () => {
    if (!moduleName.trim()) {
      Alert.alert(t(lang, 'enterModuleName'));
      return;
    }
    if (editingModuleId) {
      updateModule(editingModuleId, {
        name: moduleName.trim(),
        icon: moduleIcon.trim() || '📁',
        description: moduleDescription.trim() || undefined,
      });
    } else {
      addModule({
        goalId: cat.id,
        name: moduleName.trim(),
        icon: moduleIcon.trim() || '📁',
        description: moduleDescription.trim() || undefined,
        order: modules.length,
      });
    }
    setModuleName('');
    setModuleIcon('📁');
    setModuleDescription('');
    setEditingModuleId(undefined);
    setModuleOpen(false);
  };

  const openCreateModule = () => {
    setEditingModuleId(undefined);
    setModuleName('');
    setModuleIcon('📁');
    setModuleDescription('');
    setModuleOpen(true);
  };

  const openEditModule = (module: QuestModule) => {
    setEditingModuleId(module.id);
    setModuleName(module.name);
    setModuleIcon(module.icon ?? '');
    setModuleDescription(module.description ?? '');
    setModuleOpen(true);
  };

  const confirmDeleteModule = (module: QuestModule) => {
    const doDelete = () => deleteModule(module.id);
    confirmAction({
      title: t(lang, 'deleteModuleConfirmTitle'),
      message: t(lang, 'deleteModuleConfirmBody'),
      cancelText: t(lang, 'cancel'),
      confirmText: t(lang, 'deleteModule'),
      destructive: true,
      onConfirm: doDelete,
    });
  };

  const openCriterion = (criterion?: OutcomeCriterion) => {
    setEditingCriterionId(criterion?.id);
    setCriterionTitle(criterion?.title ?? '');
    setCriterionDescription(criterion?.description ?? '');
    setCriterionMetric(criterion?.metricType ?? 'target_value');
    setCriterionCurrent(criterion?.currentValue != null ? String(criterion.currentValue) : '');
    setCriterionTarget(criterion?.targetValue != null ? String(criterion.targetValue) : '');
    setCriterionUnit(criterion?.unit ?? '');
    setCriterionWeight(String(criterion?.weight ?? 25));
    setCriterionLinkedSkillId(criterion?.linkedSkillId);
    setCriterionCompleted(!!criterion?.completed);
    setCriterionOpen(true);
  };

  const closeCriterion = () => {
    setCriterionOpen(false);
    setEditingCriterionId(undefined);
  };

  const saveCriterion = () => {
    if (!criterionTitle.trim()) {
      Alert.alert(t(lang, 'criterionTitle'));
      return;
    }
    const nextCriterion: OutcomeCriterion = {
      id: editingCriterionId ?? uid(),
      title: criterionTitle.trim(),
      description: criterionDescription.trim() || undefined,
      metricType: criterionMetric,
      currentValue: criterionCurrent.trim() ? Number(criterionCurrent) : undefined,
      targetValue: criterionTarget.trim() ? Number(criterionTarget) : undefined,
      unit: criterionUnit.trim() || undefined,
      weight: Number(criterionWeight) || 0,
      linkedSkillId: criterionLinkedSkillId,
      completed: criterionCompleted,
    };
    const next = editingCriterionId
      ? criteria.map((criterion) => (criterion.id === editingCriterionId ? nextCriterion : criterion))
      : [...criteria, nextCriterion];
    updateCategory(cat.id, { outcomeCriteria: next });
    closeCriterion();
  };

  const deleteCriterion = (criterionId: string) => {
    updateCategory(cat.id, { outcomeCriteria: criteria.filter((criterion) => criterion.id !== criterionId) });
    closeCriterion();
  };

  const addSuggestedModules = () => {
    missingSuggestedModules.forEach((name) => {
      addModule({
        goalId: cat.id,
        name,
        icon: '📁',
        order: modules.length + missingSuggestedModules.indexOf(name),
      });
    });
  };

  const openAddSkill = (moduleId: string) => setSkillModuleId(moduleId);
  const linkExistingSkill = (module: QuestModule, skill: Skill) => {
    addExistingSkillToModule(module.goalId, module.id, skill.id);
  };
  const activeExistingModule = modules.find((m) => m.id === existingModuleId);
  const existingSkillOptions = activeExistingModule
    ? data.skills.filter((skill) => !links.some((link) => link.moduleId === activeExistingModule.id && link.skillId === skill.id))
    : [];

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: questTheme.colors.border }]}>
        <QuestButton questTheme={questTheme} variant="ghost" icon="target" label={t(lang, 'back')} onPress={() => nav.goBack()} />
        <QuestButton questTheme={questTheme} variant="secondary" icon="plus" label={t(lang, 'edit')} onPress={() => setEditing(true)} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 180, maxWidth: 960, width: '100%', alignSelf: 'center' }}>
        <View style={styles.titleRow}>
          <QuestEntityIcon icon={cat.emoji} systemIcon={getGoalSemanticIcon(cat)} color={cat.color} questTheme={questTheme} size="xl" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: questTheme.colors.text }]}>{cat.name}</Text>
            <Text style={[styles.subline, { color: questTheme.colors.textMuted }]}>
              {modules.length} {t(lang, 'modules')} · {new Set(links.filter((l) => l.goalId === cat.id).map((l) => l.skillId)).size} {t(lang, 'skillCount')} · {t(lang, 'goalProgress')} {goalProgress}%
            </Text>
          </View>
        </View>
        {cat.description ? <Text style={[styles.desc, { backgroundColor: questTheme.colors.surface, color: questTheme.colors.textMuted }]}>{cat.description}</Text> : null}
        <View style={styles.goalMetaGrid}>
          <QuestPill questTheme={questTheme} label={`${t(lang, 'goalType')}: ${goalTypeLabel(lang, cat.goalType)}`} variant="muted" />
          <QuestPill questTheme={questTheme} label={`${t(lang, 'progressModel')}: ${progressModelLabel(lang, cat.progressModel)}`} variant="muted" />
          {cat.targetDate ? (
            <QuestPill questTheme={questTheme} label={`${t(lang, 'targetDate')}: ${cat.targetDate}`} variant="muted" />
          ) : null}
        </View>
        <QuestCard questTheme={questTheme} variant="flat" style={[styles.visionCard, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.borderStrong }]} className="goal-detail-card">
          <Text style={[styles.metaLabel, { color: questTheme.colors.textMuted }]}>{t(lang, 'vision')}</Text>
          <Text style={[styles.visionText, { color: questTheme.colors.text }]}>{cat.vision || t(lang, 'noVision')}</Text>
        </QuestCard>

        <QuestProgressBar questTheme={questTheme} value={goalProgress} style={{ marginTop: 12 }} />

        {goalLoopStatus ? (
          <QuestCard questTheme={questTheme} variant="data" style={[styles.loopCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.primary }]} className="goal-loop-card">
            <View style={styles.loopHeader}>
              <View style={styles.cardTitleRow}>
                <QuestIcon name={systemIcons.progress} size={18} color={questTheme.colors.primary} />
                <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'goalLoop')}</Text>
              </View>
              <Text style={[styles.loopNext, { color: questTheme.colors.primary }]}>{t(lang, 'next')}: {goalLoopStatus.nextBestAction}</Text>
            </View>
            <View style={styles.loopGrid}>
              <LoopItem questTheme={questTheme} label={t(lang, 'goalDefinition')} value={goalLoopStatus.hasGoalDefinition ? t(lang, 'done') : t(lang, 'missing')} />
              <LoopItem questTheme={questTheme} label={t(lang, 'modulePath')} value={`${goalLoopStatus.moduleCount}`} />
              <LoopItem questTheme={questTheme} label={t(lang, 'linkedSkills')} value={`${goalLoopStatus.linkedSkillCount}`} />
              <LoopItem questTheme={questTheme} label={t(lang, 'metricsConfigured')} value={`${goalLoopStatus.metricConfiguredCount} / ${goalLoopStatus.linkedSkillCount}`} />
              <LoopItem questTheme={questTheme} label={t(lang, 'executionLogs')} value={`${goalLoopStatus.executionLogCount}`} />
            </View>
          </QuestCard>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'outcomeCriteria')}</Text>
            <Text style={[styles.sectionSub, { color: questTheme.colors.textMuted }]}>{t(lang, 'totalWeight')}: {totalWeight}</Text>
          </View>
          <QuestButton questTheme={questTheme} variant="secondary" icon="plus" label={t(lang, 'addCriterion')} onPress={() => openCriterion()} />
        </View>

        {criteria.length === 0 ? (
          <QuestEmptyState questTheme={questTheme} icon="target" title={t(lang, 'outcomeCriteria')} body={t(lang, 'noCriteria')} />
        ) : (
          criteria.map((criterion) => {
            const progress = calculateOutcomeCriterionProgress(criterion, skills);
            const linkedSkill = criterion.linkedSkillId ? skills.find((skill) => skill.id === criterion.linkedSkillId) : undefined;
            const current = criterion.metricType === 'binary'
              ? (criterion.completed ? t(lang, 'completed') : t(lang, 'planned'))
              : `${criterion.currentValue ?? 0} / ${criterion.targetValue ?? 0}${criterion.unit ?? ''}`;
            return (
              <TouchableOpacity key={criterion.id} onPress={() => openCriterion(criterion)} activeOpacity={0.8}>
                <QuestCard questTheme={questTheme} variant="flat" style={[styles.criterionCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} className="goal-detail-card">
                <View style={styles.criterionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.criterionTitle, { color: questTheme.colors.text }]}>{criterion.title}</Text>
                    {criterion.description ? <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>{criterion.description}</Text> : null}
                    <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>
                      {metricTypeLabel(lang, criterion.metricType)} · {current} · {t(lang, 'weight')} {criterion.weight}
                    </Text>
                    {linkedSkill ? <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedSkillOptional')}: {linkedSkill.name}</Text> : null}
                  </View>
                  <Text style={[styles.criterionPercent, { color: questTheme.colors.primary }]}>{progress}%</Text>
                </View>
                <QuestProgressBar questTheme={questTheme} value={progress} style={{ marginTop: 12 }} />
                </QuestCard>
              </TouchableOpacity>
            );
          })
        )}

        {suggestedModules.length > 0 ? (
          <QuestCard questTheme={questTheme} variant="data" style={[styles.suggestedCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.accent }]} className="suggested-modules-card">
            <View style={styles.cardTitleRow}>
              <QuestIcon name={systemIcons.suggestedModules} size={18} color={questTheme.colors.primary} />
              <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'suggestedModules')}</Text>
            </View>
            <View style={styles.suggestedWrap}>
              {suggestedModules.map((name) => (
                <QuestPill key={name} questTheme={questTheme} label={name} active={missingSuggestedModules.includes(name)} variant={missingSuggestedModules.includes(name) ? 'default' : 'muted'} />
              ))}
            </View>
            <QuestButton
              questTheme={questTheme}
              variant="primary"
              icon="plus"
              label={t(lang, 'addSuggestedModules')}
              onPress={addSuggestedModules}
              disabled={missingSuggestedModules.length === 0}
              style={{ marginTop: 14, opacity: missingSuggestedModules.length === 0 ? 0.45 : 1 }}
            />
          </QuestCard>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'recentExecution')}</Text>
        </View>
        {recentExecutionLogs.length === 0 ? (
          <QuestEmptyState questTheme={questTheme} icon="activity" title={t(lang, 'recentExecution')} body={t(lang, 'noExecutionLogsForGoal')} />
        ) : (
          <QuestCard questTheme={questTheme} variant="flat" style={[styles.recentCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} className="goal-detail-card">
            {recentExecutionLogs.map((log) => {
              const skill = log.linkedSkillId ? skills.find((item) => item.id === log.linkedSkillId) : undefined;
              return (
                <View key={log.id} style={styles.recentRow}>
                  <View style={styles.inlineEntityRow}>
                    <QuestEntityIcon icon={skill?.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill?.color} questTheme={questTheme} size="sm" />
                    <Text style={[styles.skillName, { color: questTheme.colors.text }]}>
                      {skill?.name ?? log.orphanedSkillName ?? log.title ?? t(lang, 'deletedSkill')}
                    </Text>
                  </View>
                  <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>
                    {log.date} · {formatMetricUpdateSummary(log, skill, lang)}
                    {log.qualityRating ? ` · ${t(lang, 'quality')} ${log.qualityRating}/5` : ''}
                  </Text>
                </View>
              );
            })}
          </QuestCard>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'effortsDrivingGoal')}</Text>
        </View>
        {goalEffortSummary.recent.length === 0 ? (
          <QuestEmptyState questTheme={questTheme} icon="activity" title={t(lang, 'effortsDrivingGoal')} body={t(lang, 'noAttributedEfforts')} />
        ) : (
          <QuestCard questTheme={questTheme} variant="flat" style={[styles.recentCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} className="goal-detail-card">
            <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted, marginBottom: 10 }]}>
              {t(lang, 'thisWeek')}: {goalEffortSummary.weeklyCount} · {t(lang, 'directContribution')} {goalEffortSummary.directCount} · {t(lang, 'indirectContribution')} {goalEffortSummary.indirectCount}
            </Text>
            {goalEffortSummary.recent.map(({ link, effort }) => (
              <View key={link.id} style={styles.recentRow}>
                <Text style={[styles.skillName, { color: questTheme.colors.text }]}>{formatEffortUnitSummary(effort, lang)}</Text>
                <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>
                  {link.contributionType === 'direct'
                    ? t(lang, 'directContribution')
                    : link.contributionType === 'indirect'
                      ? t(lang, 'indirectContribution')
                      : link.contributionType === 'recovery'
                        ? t(lang, 'recoveryContribution')
                        : t(lang, 'supportingContribution')}
                </Text>
              </View>
            ))}
          </QuestCard>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'modules')}</Text>
          <QuestButton questTheme={questTheme} variant="secondary" icon="plus" label={t(lang, 'addModule')} onPress={openCreateModule} />
        </View>

        {modules.length === 0 ? (
          <QuestEmptyState questTheme={questTheme} icon="folder" title={t(lang, 'modules')} body={t(lang, 'noModulesEmptyState')} />
        ) : (
          modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              skills={skillsForModule(module.id, skills, links)}
              links={links.filter((l) => l.moduleId === module.id)}
              expanded={!!expanded[module.id]}
              toggle={() => setExpanded((prev) => ({ ...prev, [module.id]: !prev[module.id] }))}
              addSkill={() => openAddSkill(module.id)}
              addExisting={() => setExistingModuleId(module.id)}
              removeSkill={(skillId) => removeSkillFromModule(module.id, skillId)}
              editModule={() => openEditModule(module)}
              deleteModule={() => confirmDeleteModule(module)}
              openSkill={(skillId) => nav.navigate('SkillDetail', { skillId })}
              lang={lang}
              questTheme={questTheme}
            />
          ))
        )}
      </ScrollView>

      <GoalForm visible={editing} onClose={() => setEditing(false)} initial={cat} />
      <SkillForm
        visible={!!skillModuleId}
        onClose={() => setSkillModuleId(undefined)}
        presetCategoryId={cat.id}
        presetModuleId={skillModuleId}
        linkOnCreate
      />
      <BottomSheetForm visible={criterionOpen} onClose={closeCriterion}>
        <Text style={[styles.sheetTitle, { color: questTheme.colors.text }]}>{editingCriterionId ? t(lang, 'editCriterion') : t(lang, 'addCriterion')}</Text>
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'criterionTitle')}</Text>
        <QuestInput questTheme={questTheme} value={criterionTitle} onChangeText={setCriterionTitle} placeholder={t(lang, 'criterionTitle')} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'criterionDescription')}</Text>
        <QuestInput
          questTheme={questTheme}
          value={criterionDescription}
          onChangeText={setCriterionDescription}
          style={{ height: 72, textAlignVertical: 'top' }}
          multiline
          placeholder={t(lang, 'criterionDescription')}
        />

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricType')}</Text>
        <View style={styles.chipWrap}>
          {METRIC_TYPES.map((metric) => (
            <QuestPill key={metric} questTheme={questTheme} label={metricTypeLabel(lang, metric)} active={criterionMetric === metric} onPress={() => setCriterionMetric(metric)} />
          ))}
        </View>

        {criterionMetric === 'binary' ? (
          <QuestPill questTheme={questTheme} label={t(lang, 'completedToggle')} active={criterionCompleted} onPress={() => setCriterionCompleted((value) => !value)} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
        ) : (
          <View style={styles.threeCols}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'currentValue')}</Text>
              <QuestInput questTheme={questTheme} value={criterionCurrent} onChangeText={setCriterionCurrent} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetValueLabel')}</Text>
              <QuestInput questTheme={questTheme} value={criterionTarget} onChangeText={setCriterionTarget} keyboardType="numeric" placeholder="100" />
            </View>
            <View style={{ flex: 0.8 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'unit')}</Text>
              <QuestInput questTheme={questTheme} value={criterionUnit} onChangeText={setCriterionUnit} placeholder="kg" />
            </View>
          </View>
        )}

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'weight')}</Text>
        <QuestInput questTheme={questTheme} value={criterionWeight} onChangeText={setCriterionWeight} keyboardType="numeric" placeholder="25" />

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedSkillOptional')}</Text>
        <View style={styles.chipWrap}>
          <QuestPill questTheme={questTheme} label={t(lang, 'none')} active={!criterionLinkedSkillId} onPress={() => setCriterionLinkedSkillId(undefined)} />
          {skills.map((skill) => (
            <QuestPill key={skill.id} questTheme={questTheme} label={skill.name} active={criterionLinkedSkillId === skill.id} onPress={() => setCriterionLinkedSkillId(skill.id)} />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          {editingCriterionId ? (
            <QuestButton questTheme={questTheme} variant="danger" label={t(lang, 'deleteCriterion')} onPress={() => deleteCriterion(editingCriterionId)} style={{ flex: 1 }} />
          ) : null}
          <QuestButton questTheme={questTheme} variant="primary" label={t(lang, 'save')} onPress={saveCriterion} style={{ flex: 1 }} />
        </View>
      </BottomSheetForm>
      <BottomSheetForm visible={!!existingModuleId} onClose={() => setExistingModuleId(undefined)}>
        <Text style={[styles.sheetTitle, { color: questTheme.colors.text }]}>{t(lang, 'addExistingSkill')}</Text>
        {activeExistingModule ? (
          <View style={styles.inlineEntityRow}>
            <QuestEntityIcon icon={activeExistingModule.icon} systemIcon="folder" questTheme={questTheme} size="sm" />
            <Text style={[styles.sheetSub, { color: questTheme.colors.textMuted }]}>{displayModuleName(activeExistingModule, lang)}</Text>
          </View>
        ) : null}
        {existingSkillOptions.length === 0 ? (
          <Text style={[styles.emptySmall, { color: questTheme.colors.textMuted }]}>{data.skills.length === 0 ? t(lang, 'noSkillsInLibrary') : t(lang, 'noAvailableSkills')}</Text>
        ) : (
          existingSkillOptions.map((skill) => (
            <TouchableOpacity
              key={skill.id}
              style={[styles.existingSkillRow, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}
              onPress={() => {
                if (activeExistingModule) linkExistingSkill(activeExistingModule, skill);
              }}
            >
              <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} size="sm" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.skillName, { color: questTheme.colors.text }]}>{skill.name}</Text>
                <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>
                  {progressTypeLabel(lang, progressTypeForSkill(skill))} · {progressSummary(skill, lang)} · {fill(t(lang, 'linkedCount'), { count: links.filter((link) => link.skillId === skill.id).length })}
                </Text>
              </View>
              <QuestIcon name="plus" size={18} color={questTheme.colors.primary} />
            </TouchableOpacity>
          ))
        )}
      </BottomSheetForm>
      <BottomSheetForm visible={moduleOpen} onClose={() => setModuleOpen(false)}>
        <Text style={[styles.sheetTitle, { color: questTheme.colors.text }]}>{editingModuleId ? t(lang, 'editModule') : t(lang, 'createModule')}</Text>
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'moduleName')}</Text>
        <QuestInput questTheme={questTheme} value={moduleName} onChangeText={setModuleName} placeholder={t(lang, 'defaultModule')} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'moduleIcon')}</Text>
        <View style={styles.inlineEntityRow}>
          <QuestEntityIcon icon={moduleIcon} systemIcon={getModuleSemanticIcon({ name: moduleName })} questTheme={questTheme} />
          <QuestInput questTheme={questTheme} value={moduleIcon} onChangeText={setModuleIcon} placeholder="folder" style={{ flex: 1 }} />
        </View>
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'description')}</Text>
        <QuestInput questTheme={questTheme} value={moduleDescription} onChangeText={setModuleDescription} style={{ height: 72, textAlignVertical: 'top' }} multiline placeholder={t(lang, 'description')} />
        <QuestButton questTheme={questTheme} variant="primary" label={t(lang, 'save')} onPress={submitModule} style={{ marginTop: 18 }} />
      </BottomSheetForm>
    </SafeAreaView>
  );
}

function ModuleCard({
  module, skills, links, expanded, toggle, addSkill, addExisting, removeSkill, editModule, deleteModule, openSkill, lang, questTheme,
}: {
  module: QuestModule;
  skills: Skill[];
  links: ModuleSkillLink[];
  expanded: boolean;
  toggle: () => void;
  addSkill: () => void;
  addExisting: () => void;
  removeSkill: (skillId: string) => void;
  editModule: () => void;
  deleteModule: () => void;
  openSkill: (skillId: string) => void;
  lang: 'zh' | 'en';
  questTheme: QuestTheme;
}) {
  const progress = calculateModuleProgress(module, skills, links);
  const openModuleMenu = () => {
    deleteModule();
  };
  return (
    <QuestCard questTheme={questTheme} variant="flat" style={[styles.moduleCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.borderStrong, borderLeftWidth: 3, borderLeftColor: questTheme.colors.primary }]} className="module-card module-row">
      <TouchableOpacity style={styles.moduleHeader} onPress={toggle} activeOpacity={0.75}>
        <QuestEntityIcon icon={module.icon} systemIcon={getModuleSemanticIcon(module)} questTheme={questTheme} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.moduleTitle, { color: questTheme.colors.text }]}>{displayModuleName(module, lang)}</Text>
          <Text style={[styles.moduleMeta, { color: questTheme.colors.textMuted }]}>
            {t(lang, 'moduleProgress')} {progress}% · {skills.length} {t(lang, 'skillCount')}
          </Text>
          {module.description ? <Text style={[styles.moduleMeta, { color: questTheme.colors.textMuted }]}>{module.description}</Text> : null}
        </View>
        <TouchableOpacity style={[styles.moduleMenuBtn, { borderColor: questTheme.colors.border, backgroundColor: questTheme.colors.surfaceSoft }]} onPress={openModuleMenu}>
          <Text style={[styles.moduleMenuText, { color: questTheme.colors.textMuted }]}>•••</Text>
        </TouchableOpacity>
        <QuestIcon name={expanded ? 'check' : 'target'} size={16} color={questTheme.colors.textSubtle} />
      </TouchableOpacity>
      <QuestProgressBar questTheme={questTheme} value={progress} style={{ marginTop: 12 }} />

      {expanded ? (
        <View style={styles.moduleBody}>
          {skills.length === 0 ? (
            <Text style={[styles.emptySmall, { color: questTheme.colors.textMuted }]}>{t(lang, 'noSkillsUnderQuest')}</Text>
          ) : (
            skills.map((skill) => (
              <TouchableOpacity
                key={skill.id}
                style={[styles.skillCard, { backgroundColor: questTheme.colors.surfaceMuted, borderColor: questTheme.colors.border, borderWidth: 1 }]}
                onPress={() => openSkill(skill.id)}
                onLongPress={() => {
                  confirmAction({
                    title: t(lang, 'removeFromModuleTitle'),
                    message: t(lang, 'removeFromModuleConfirm'),
                    cancelText: t(lang, 'cancel'),
                    confirmText: t(lang, 'removeFromModule'),
                    destructive: true,
                    onConfirm: () => removeSkill(skill.id),
                  });
                }}
                activeOpacity={0.75}
              >
                <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.skillName, { color: questTheme.colors.text }]}>{skill.name}</Text>
                  <Text style={[styles.skillMeta, { color: questTheme.colors.textMuted }]}>{progressTypeLabel(lang, progressTypeForSkill(skill))} · {progressSummary(skill, lang)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.removeLinkBtn, { borderColor: questTheme.colors.border }]}
                  onPress={() => {
                    confirmAction({
                      title: t(lang, 'removeFromModuleTitle'),
                      message: t(lang, 'removeFromModuleConfirm'),
                      cancelText: t(lang, 'cancel'),
                      confirmText: t(lang, 'removeFromModule'),
                      destructive: true,
                      onConfirm: () => removeSkill(skill.id),
                    });
                  }}
                >
                  <Text style={[styles.removeLinkText, { color: questTheme.colors.textMuted }]}>{t(lang, 'removeFromModule')}</Text>
                </TouchableOpacity>
                <QuestIcon name="target" size={16} color={questTheme.colors.textSubtle} />
              </TouchableOpacity>
            ))
          )}
          <QuestButton questTheme={questTheme} variant="secondary" icon="plus" label={t(lang, 'addExistingSkill')} onPress={addExisting} />
          <QuestButton questTheme={questTheme} variant="ghost" icon="plus" label={t(lang, 'createNewSkill')} onPress={addSkill} />
        </View>
      ) : null}
    </QuestCard>
  );
}

function LoopItem({ label, value, questTheme }: { label: string; value: string; questTheme: QuestTheme }) {
  return (
    <View style={[styles.loopItem, { backgroundColor: questTheme.colors.surfaceSoft }]}>
      <Text style={[styles.loopLabel, { color: questTheme.colors.textMuted }]}>{label}</Text>
      <Text style={[styles.loopValue, { color: questTheme.colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  backBtn: { padding: 8 },
  backText: { color: theme.primary, fontSize: 16, fontWeight: '600' },
  headerBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: theme.border,
  },
  headerBtnText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineEntityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardAlt },
  title: { color: theme.text, fontSize: 26, fontWeight: '700' },
  subline: { color: theme.textDim, fontSize: 12, marginTop: 4 },
  desc: { color: theme.textDim, fontSize: 14, lineHeight: 22, marginTop: 12, backgroundColor: theme.card, padding: 14, borderRadius: 12 },
  goalMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  metaPill: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  metaLabel: { color: theme.textDim, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  metaValue: { color: theme.text, fontSize: 13, fontWeight: '800' },
  visionCard: { marginTop: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14 },
  visionText: { color: theme.text, fontSize: 14, lineHeight: 21 },
  progressBarBg: { height: 8, backgroundColor: theme.cardAlt, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
  progressBarFg: { height: '100%', borderRadius: 4, backgroundColor: theme.primary },
  loopCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, marginTop: 16 },
  loopHeader: { gap: 4 },
  loopNext: { color: theme.primary, fontSize: 13, fontWeight: '800', lineHeight: 19 },
  loopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  loopItem: { width: '31%', minWidth: 92, backgroundColor: theme.cardAlt, borderRadius: 10, padding: 10 },
  loopLabel: { color: theme.textDim, fontSize: 10, fontWeight: '800' },
  loopValue: { color: theme.text, fontSize: 14, fontWeight: '900', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  h2: { color: theme.text, fontSize: 18, fontWeight: '700' },
  sectionSub: { color: theme.textDim, fontSize: 12, marginTop: 4 },
  criterionCard: { backgroundColor: theme.card, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  recentCard: { backgroundColor: theme.card, padding: 14, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border, gap: 10 },
  recentRow: { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  criterionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  criterionTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
  criterionPercent: { color: theme.primary, fontSize: 18, fontWeight: '900' },
  suggestedCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, marginTop: 14 },
  suggestedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  suggestedChip: { borderWidth: 1, borderColor: theme.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: theme.cardAlt },
  suggestedChipMuted: { borderColor: theme.border, opacity: 0.5 },
  suggestedChipText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  addModuleBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  addModuleText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  empty: { color: theme.textDim, fontStyle: 'italic', backgroundColor: theme.card, padding: 14, borderRadius: 10 },
  moduleCard: { backgroundColor: theme.card, padding: 14, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.border },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moduleTitle: { color: theme.text, fontSize: 17, fontWeight: '800' },
  moduleMeta: { color: theme.textDim, fontSize: 12, marginTop: 4 },
  moduleMenuBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  moduleMenuText: { color: theme.textDim, fontSize: 15, fontWeight: '900', marginTop: -4 },
  chev: { color: theme.textDim, fontSize: 22, fontWeight: '700' },
  moduleBody: { marginTop: 12, gap: 8 },
  emptySmall: { color: theme.textDim, fontSize: 12, paddingVertical: 6 },
  skillCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.cardAlt, padding: 10, borderRadius: 12 },
  skillIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  skillName: { color: theme.text, fontSize: 15, fontWeight: '700' },
  skillMeta: { color: theme.textDim, fontSize: 12, marginTop: 3 },
  addSkillBtn: { borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  addSkillText: { color: theme.primary, fontSize: 13, fontWeight: '800' },
  removeLinkBtn: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  removeLinkText: { color: theme.textDim, fontSize: 11, fontWeight: '800' },
  sheetTitle: { color: theme.text, fontSize: 20, fontWeight: '800' },
  sheetSub: { color: theme.textDim, fontSize: 13, marginTop: 6, marginBottom: 10 },
  label: { color: theme.textDim, marginTop: 14, marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: theme.card, borderRadius: theme.radius.md, padding: 12, color: theme.text, borderWidth: 1, borderColor: theme.border },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderWidth: 1, borderColor: theme.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: theme.card },
  optionChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  optionChipText: { color: theme.textDim, fontSize: 12, fontWeight: '800' },
  optionChipTextActive: { color: '#fff' },
  threeCols: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  existingSkillRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.card, padding: 12, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: theme.border },
  saveBtn: { marginTop: 18, paddingVertical: 14, borderRadius: theme.radius.md, alignItems: 'center', backgroundColor: theme.primary },
  dangerBtn: { backgroundColor: '#E5484D' },
  saveText: { color: '#fff', fontWeight: '800' },
});
