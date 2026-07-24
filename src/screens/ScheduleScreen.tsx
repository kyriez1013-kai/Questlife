import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import {
  flexibilityLabel, getLanguage, progressTypeLabel, qualityLabel, rigidityLabel, sourceLabel, statusLabel, t, taskTypeLabel,
} from '../i18n';
import { today } from '../storage';
import { appAccent, theme } from '../theme';
import { Quality, QUALITY_OPTIONS, ScheduleBlock, TaskType } from '../types';
import BottomSheetForm from '../components/BottomSheetForm';
import { generateScheduleBlocksFromSkills } from '../scheduleAdjust';
import { formatMetricSummary, progressTypeForSkill } from '../progress';
import { getQuestTheme, questLayout, QuestTheme } from '../design/tokens';
import { systemIcons } from '../design/systemIcons';
import { getSkillSemanticIcon } from '../design/entityIcons';
import { isStrengthPredictionSkill, strengthVolume } from '../utils/prediction';
import QuestButton from '../components/ui/QuestButton';
import QuestCard from '../components/ui/QuestCard';
import { QuestContextBar } from '../components/ui/QuestPrimitives';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import QuestIcon from '../components/ui/QuestIcon';
import QuestInput from '../components/ui/QuestInput';
import QuestPill from '../components/ui/QuestPill';

const TASK_TYPES: TaskType[] = [
  'deep_study',
  'light_review',
  'strength_training',
  'cardio_recovery',
  'admin',
  'life_maintenance',
  'creative_building',
];

const FLEX = ['fixed', 'flexible', 'movable'] as const;
const RIGID = ['low', 'medium', 'high'] as const;

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function weekDates(base: string) {
  const d = new Date(`${base}T00:00:00`);
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  });
}

const HOURS = Array.from({ length: 10 }, (_, i) => i * 2 + 6);
const WEEKDAY_FULL_KEYS = ['weekdayFullSun', 'weekdayFullMon', 'weekdayFullTue', 'weekdayFullWed', 'weekdayFullThu', 'weekdayFullFri', 'weekdayFullSat'];

function hourOf(time: string) {
  return Number(time.split(':')[0]);
}

function minuteOfDay(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function closestSectionHour(time: string) {
  const hour = Math.max(6, Math.min(24, hourOf(time)));
  return Math.max(6, Math.min(24, Math.floor(hour / 2) * 2));
}

function currentSectionHour() {
  const h = new Date().getHours();
  return Math.max(6, Math.min(24, Math.floor(h / 2) * 2));
}

function currentTimeTop() {
  const now = new Date();
  return ((now.getHours() * 60 + now.getMinutes()) - 6 * 60) / (18 * 60);
}

function dateWithWeekday(date: string, lang: 'zh' | 'en') {
  const d = new Date(`${date}T00:00:00`);
  return `${date} · ${t(lang, WEEKDAY_FULL_KEYS[d.getDay()])}`;
}

export default function ScheduleScreen() {
  const { data, addScheduleBlock, createExecutionLog } = useStore();
  const lang = getLanguage(data.settings.language);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState(today());
  const [highlightHour, setHighlightHour] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [taskType, setTaskType] = useState<TaskType>('deep_study');
  const [flexibility, setFlexibility] = useState<ScheduleBlock['flexibility']>('flexible');
  const [rigidity, setRigidity] = useState<ScheduleBlock['rigidity']>('medium');
  const [linkedGoalId, setLinkedGoalId] = useState<string | undefined>();
  const [linkedSkillId, setLinkedSkillId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [logBlock, setLogBlock] = useState<ScheduleBlock | null>(null);
  const [logMinutes, setLogMinutes] = useState('');
  const [logQuality, setLogQuality] = useState<Quality | null>(null);
  const [logNote, setLogNote] = useState('');
  const [logNewCurrentValue, setLogNewCurrentValue] = useState('');
  const [logPerformanceValue, setLogPerformanceValue] = useState('');
  const [logPerformanceUnit, setLogPerformanceUnit] = useState('');
  const [logPerformanceNote, setLogPerformanceNote] = useState('');
  const [logStrengthWeight, setLogStrengthWeight] = useState('');
  const [logStrengthReps, setLogStrengthReps] = useState('');
  const [logStrengthSets, setLogStrengthSets] = useState('3');
  const [logStrengthRpe, setLogStrengthRpe] = useState('');
  const [logStateValue, setLogStateValue] = useState('');
  const [logAmountAdded, setLogAmountAdded] = useState('');
  const [logNewCurrentAmount, setLogNewCurrentAmount] = useState('');
  const [logBinaryCompleted, setLogBinaryCompleted] = useState(true);
  const [logQualitativeText, setLogQualitativeText] = useState('');
  const [logChecklistIds, setLogChecklistIds] = useState<string[]>([]);

  const week = useMemo(() => weekDates(selectedDate), [selectedDate]);
  const generatedBlocks = useMemo(
    () => generateScheduleBlocksFromSkills(data.skills, week, data.scheduleBlocks || []),
    [data.skills, week, data.scheduleBlocks]
  );
  const allBlocks = useMemo(
    () => [...(data.scheduleBlocks || []), ...generatedBlocks],
    [data.scheduleBlocks, generatedBlocks]
  );
  const dayBlocks = useMemo(
    () => allBlocks.filter((b) => b.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [allBlocks, selectedDate]
  );
  const nowInfo = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const active = selectedDate === today()
      ? dayBlocks.find((b) => minuteOfDay(b.startTime) <= nowMinutes && nowMinutes < minuteOfDay(b.endTime))
      : undefined;
    const next = selectedDate === today()
      ? dayBlocks.find((b) => minuteOfDay(b.startTime) > nowMinutes)
      : dayBlocks[0];
    return { active, next };
  }, [dayBlocks, selectedDate]);

  const jumpToNow = () => {
    const hour = currentSectionHour();
    setHighlightHour(hour);
    scrollRef.current?.scrollTo({ y: 190 + HOURS.indexOf(hour) * 48, animated: true });
  };

  const submit = () => {
    const plannedMinutes = minutesBetween(startTime, endTime);
    if (!title.trim()) { Alert.alert(t(lang, 'enterTitle')); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert(t(lang, 'invalidDate')); return; }
    if (plannedMinutes <= 0) { Alert.alert(t(lang, 'invalidTimeRange')); return; }
    addScheduleBlock({
      title: title.trim(),
      date,
      startTime,
      endTime,
      plannedMinutes,
      taskType,
      flexibility,
      rigidity,
      linkedGoalId,
      linkedSkillId,
      status: 'planned',
      notes: notes.trim() || undefined,
      source: 'manual',
    });
    setOpen(false);
    setSelectedDate(date);
    setTitle('');
    setNotes('');
  };

  const openLogBlock = (block: ScheduleBlock) => {
    setLogBlock(block);
    setLogMinutes(String(block.plannedMinutes));
    setLogQuality(null);
    setLogNote('');
    setLogNewCurrentValue('');
    setLogPerformanceValue('');
    setLogPerformanceUnit('');
    setLogPerformanceNote('');
    setLogStrengthWeight('');
    setLogStrengthReps('');
    setLogStrengthSets('3');
    setLogStrengthRpe('');
    setLogStateValue('');
    setLogAmountAdded('');
    setLogNewCurrentAmount('');
    setLogBinaryCompleted(true);
    setLogQualitativeText('');
    setLogChecklistIds([]);
  };

  const submitLogBlock = () => {
    if (!logBlock) return;
    const durationMinutes = parseInt(logMinutes, 10);
    if (!durationMinutes || durationMinutes <= 0) {
      Alert.alert(t(lang, 'invalidMinutes'));
      return;
    }
    const skill = logBlock.linkedSkillId ? data.skills.find((item) => item.id === logBlock.linkedSkillId) : undefined;
    const link = skill ? (data.moduleSkillLinks || []).find((item) => item.skillId === skill.id) : undefined;
    const metricType = skill ? progressTypeForSkill(skill) : 'time_based';
    const newCurrentValue = optionalNumber(logNewCurrentValue);
    const performanceValue = optionalNumber(logPerformanceValue);
    const strengthWeight = optionalNumber(logStrengthWeight);
    const strengthReps = optionalNumber(logStrengthReps);
    const strengthSets = optionalNumber(logStrengthSets);
    const strengthRpe = optionalNumber(logStrengthRpe);
    const stateValue = optionalNumber(logStateValue);
    const amountAdded = optionalNumber(logAmountAdded);
    const newCurrentAmount = optionalNumber(logNewCurrentAmount);
    const isStrengthLog = isStrengthPredictionSkill(skill);
    const totalVolume = strengthVolume(strengthWeight, strengthReps, strengthSets);
    const strengthSet = strengthWeight != null || strengthReps != null
      ? { weight: strengthWeight, reps: strengthReps, sets: strengthSets ?? 1, rpe: strengthRpe }
      : undefined;
    const performanceUnit = logPerformanceUnit.trim() || skill?.metricConfig?.unit || (isStrengthLog ? 'kg' : undefined);
    const effectivePerformanceValue = metricType === 'performance_log'
      ? performanceValue
        ?? (skill?.metricConfig?.primaryMetric === 'volume' ? totalVolume : strengthWeight)
        ?? totalVolume
      : undefined;
    const targetValueUpdate = metricType === 'target_value'
      ? (newCurrentValue ?? (isStrengthLog ? strengthWeight : undefined))
      : undefined;
    createExecutionLog({
      date: logBlock.date,
      durationMinutes,
      title: logBlock.title,
      note: logNote.trim() || undefined,
      linkedSkillId: logBlock.linkedSkillId,
      linkedGoalId: logBlock.linkedGoalId ?? link?.goalId,
      linkedModuleId: link?.moduleId,
      linkedScheduleBlockId: logBlock.id,
      source: 'schedule_log',
      taskType: logBlock.taskType,
      qualityRating: logQuality ?? undefined,
      actualData: strengthSet ? {
        kind: 'strength_training',
        exerciseName: skill?.name ?? logBlock.title,
        strength: {
          weight: strengthWeight,
          reps: strengthReps,
          sets: strengthSets,
          rpe: strengthRpe,
          volume: totalVolume,
        },
      } : undefined,
      progressUpdate: {
        progressType: metricType,
        valueAdded: metricType === 'time_based' ? durationMinutes : metricType === 'frequency' ? 1 : undefined,
        newCurrentValue: metricType === 'target_value' ? targetValueUpdate : undefined,
        completedCurriculumItemIds: metricType === 'checklist' || metricType === 'curriculum' ? logChecklistIds : undefined,
        performanceData: metricType === 'performance_log' ? {
          performanceType: skill?.metricConfig?.performanceType,
          values: effectivePerformanceValue != null ? [{ metric: skill?.metricConfig?.primaryMetric ?? 'custom', value: effectivePerformanceValue, unit: performanceUnit }] : undefined,
          strengthSets: strengthSet ? [strengthSet] : undefined,
          totalVolume,
          notes: logPerformanceNote.trim() || logNote.trim() || undefined,
        } : undefined,
        qualitativeSummary: metricType === 'qualitative' ? logQualitativeText.trim() || undefined : undefined,
        stateValue: metricType === 'state_based' ? stateValue : undefined,
        amountAdded: metricType === 'money_based' ? amountAdded : undefined,
        newCurrentAmount: metricType === 'money_based' ? newCurrentAmount : undefined,
        completed: metricType === 'binary' ? logBinaryCompleted : undefined,
      },
      metricUpdate: {
        metricType,
        minutesAdded: metricType === 'time_based' ? durationMinutes : undefined,
        countAdded: metricType === 'frequency' ? 1 : undefined,
        newCurrentValue: metricType === 'target_value' ? targetValueUpdate : undefined,
        completedChecklistItemIds: metricType === 'checklist' || metricType === 'curriculum' ? logChecklistIds : undefined,
        performanceValue: metricType === 'performance_log' ? effectivePerformanceValue : undefined,
        performanceUnit: metricType === 'performance_log' ? performanceUnit : undefined,
        performanceNote: metricType === 'performance_log' ? logPerformanceNote.trim() || undefined : undefined,
        performanceData: metricType === 'performance_log' ? {
          performanceType: skill?.metricConfig?.performanceType,
          values: effectivePerformanceValue != null ? [{ metric: skill?.metricConfig?.primaryMetric ?? 'custom', value: effectivePerformanceValue, unit: performanceUnit }] : undefined,
          strengthSets: strengthSet ? [strengthSet] : undefined,
          totalVolume,
          notes: logPerformanceNote.trim() || logNote.trim() || undefined,
        } : undefined,
        qualityValue: metricType === 'quality_score' ? logQuality ?? undefined : undefined,
        stateValue: metricType === 'state_based' ? stateValue : undefined,
        amountAdded: metricType === 'money_based' ? amountAdded : undefined,
        newCurrentAmount: metricType === 'money_based' ? newCurrentAmount : undefined,
        markCompleted: metricType === 'binary' ? logBinaryCompleted : undefined,
        qualitativeText: metricType === 'qualitative' ? logQualitativeText.trim() || undefined : undefined,
      },
    });
    setLogBlock(null);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: questTheme.colors.background }]}
        contentContainerStyle={{
          paddingHorizontal: questTheme.spacing.md,
          paddingTop: questTheme.spacing.sm,
          paddingBottom: questLayout.contentBottomInset,
          maxWidth: questLayout.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <QuestContextBar
          questTheme={questTheme}
          primary={dateWithWeekday(selectedDate, lang)}
          secondary={t(lang, 'scheduleSubtitle')}
          trailing={<QuestButton questTheme={questTheme} variant="primary" icon="plus" label={t(lang, 'addBlock')} onPress={() => setOpen(true)} />}
        />

        <View style={[styles.switcher, { backgroundColor: questTheme.colors.surfaceSoft }]}>
          {(['day', 'week', 'month', 'year'] as const).map((v) => (
            <TouchableOpacity key={v} style={[styles.switchBtn, view === v && { backgroundColor: questTheme.colors.primary }]} onPress={() => setView(v)}>
              <Text style={[styles.switchText, { color: view === v ? questTheme.colors.primaryText : questTheme.colors.textMuted }]}>{t(lang, v)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {view === 'day' ? (
          <>
            <Text style={[styles.dateTitle, { color: questTheme.colors.text }]}>{t(lang, 'selectDate')} · {dateWithWeekday(selectedDate, lang)}</Text>
            <QuestCard questTheme={questTheme} variant="hero" style={[styles.nowNextCard, { backgroundColor: questTheme.colors.surfaceElevated, borderColor: questTheme.colors.border }]} className="schedule-card current-next-card">
              <Text style={[styles.nowNextKicker, { color: questTheme.colors.textMuted }]}>{t(lang, 'nowNext')}</Text>
              <View style={styles.nowNextRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nowNextLabel, { color: questTheme.colors.textMuted }]}>
                    {t(lang, 'currentTime')} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={[styles.nowNextLabel, { color: questTheme.colors.textMuted }]}>{t(lang, 'currentSlot')}</Text>
                  <Text style={[styles.nowNextMain, { color: questTheme.colors.text }]}>
                    {nowInfo.active
                      ? `${nowInfo.active.title} · ${nowInfo.active.startTime}-${nowInfo.active.endTime}`
                      : `${t(lang, 'noBlockRightNow')}${lang === 'zh' ? '，' : '. '}${t(lang, 'addLightTask')}`}
                  </Text>
                </View>
                {selectedDate === today() ? (
                  <QuestButton questTheme={questTheme} variant="secondary" icon="activity" label={t(lang, 'jumpToNow')} onPress={jumpToNow} />
                ) : null}
              </View>
              <Text style={[styles.nowNextSub, { color: questTheme.colors.textMuted }]}>
                {t(lang, 'nextBlock')}: {nowInfo.next ? `${nowInfo.next.title} · ${nowInfo.next.startTime}-${nowInfo.next.endTime}` : t(lang, 'noneBlock')}
              </Text>
            </QuestCard>
            {dayBlocks.length === 0 ? <Text style={[styles.emptyInline, { color: questTheme.colors.textMuted }]}>{t(lang, 'noBlocksToday')}</Text> : null}
            <View style={[styles.timelineSurface, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
              {selectedDate === today() && currentTimeTop() >= 0 && currentTimeTop() <= 1 ? (
                <View style={[styles.nowLine, { top: `${currentTimeTop() * 100}%` }]}>
                  <View style={[styles.nowDot, { backgroundColor: questTheme.colors.primary }]} />
                  <View style={[styles.nowRule, { backgroundColor: questTheme.colors.primary }]} />
                  <Text style={[styles.nowLabel, { color: questTheme.colors.primary, backgroundColor: questTheme.colors.surface }]}>{t(lang, 'currentTime')}</Text>
                </View>
              ) : null}
              {HOURS.map((hour) => {
                const blocks = dayBlocks.filter((b) => closestSectionHour(b.startTime) === hour);
                const highlighted = selectedDate === today() && (highlightHour ?? currentSectionHour()) === hour;
                return (
                  <View key={hour} style={[styles.hourRow, { borderBottomColor: questTheme.colors.border }, highlighted && { backgroundColor: questTheme.colors.primarySoft }]}>
                    <Text style={[styles.hourLabel, { color: questTheme.colors.textMuted }]}>{hour}:00</Text>
                    <View style={styles.hourContent}>
                      {blocks.map((b) => {
                        const skill = b.linkedSkillId ? data.skills.find((item) => item.id === b.linkedSkillId) : undefined;
                        const link = skill ? (data.moduleSkillLinks || []).find((item) => item.skillId === skill.id) : undefined;
                        const goal = (b.linkedGoalId ?? link?.goalId)
                          ? data.categories.find((item) => item.id === (b.linkedGoalId ?? link?.goalId))
                          : undefined;
                        const module = link?.moduleId ? (data.modules || []).find((item) => item.id === link.moduleId) : undefined;
                        return (
                          <View key={b.id} style={[styles.timelineBlock, { backgroundColor: questTheme.colors.surfaceSoft, borderLeftColor: b.status === 'completed' ? questTheme.colors.success : questTheme.colors.primary }]}>
                            <View style={styles.blockTitleRow}>
                              <QuestEntityIcon icon={skill?.icon} systemIcon={skill ? getSkillSemanticIcon(skill) : systemIcons.schedule} color={skill?.color} questTheme={questTheme} size="sm" />
                              <Text style={[styles.blockTitle, { color: questTheme.colors.text }]}>{b.title}</Text>
                            </View>
                            <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{b.startTime}-{b.endTime} · {taskTypeLabel(lang, b.taskType)} · {b.plannedMinutes}m · {statusLabel(lang, b.status)} · {sourceLabel(lang, b.source)}</Text>
                            {skill ? (
                              <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>
                                {skill.name} · {progressTypeLabel(lang, progressTypeForSkill(skill))} · {formatMetricSummary(skill, lang)}
                              </Text>
                            ) : (
                              <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'manualBlock')}</Text>
                            )}
                            {goal || module ? (
                              <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>
                                {goal ? `${goal.name}` : ''}
                                {goal && module ? ' > ' : ''}
                                {module ? `${module.id.includes('-default') ? t(lang, 'defaultModule') : module.name}` : ''}
                              </Text>
                            ) : null}
                            <QuestButton questTheme={questTheme} variant="secondary" icon="play" label={t(lang, 'logProgress')} onPress={() => openLogBlock(b)} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : view === 'week' ? (
          <View style={styles.weekGrid}>
            {week.map((d) => {
              const blocks = allBlocks.filter((b) => b.date === d);
              const mins = blocks.reduce((s, b) => s + b.plannedMinutes, 0);
              return (
                <TouchableOpacity key={d} style={[styles.weekDay, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} onPress={() => { setSelectedDate(d); setView('day'); }}>
                  <Text style={[styles.weekDate, { color: questTheme.colors.text }]}>{d.slice(5)}</Text>
                  <Text style={[styles.weekTotal, { color: questTheme.colors.textMuted }]}>{t(lang, 'totalPlanned')} {mins}m</Text>
                  <Text style={[styles.weekTotal, { color: questTheme.colors.textMuted }]}>{blocks.length} {t(lang, 'blocks')}</Text>
                  {blocks.slice(0, 2).map((b) => <Text key={b.id} style={[styles.weekBlock, { color: questTheme.colors.text }]} numberOfLines={1}>{b.title}</Text>)}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <QuestCard questTheme={questTheme} variant="data" style={[styles.placeholderCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]} className="schedule-card empty-state">
            <Text style={[styles.placeholderTitle, { color: questTheme.colors.text }]}>{view === 'month' ? t(lang, 'month') : t(lang, 'year')}</Text>
            <Text style={[styles.placeholderText, { color: questTheme.colors.textMuted }]}>{view === 'month' ? t(lang, 'monthPlaceholder') : t(lang, 'yearPlaceholder')}</Text>
          </QuestCard>
        )}
      </ScrollView>

      <BottomSheetForm visible={open} onClose={() => setOpen(false)}>
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'addBlock')}</Text>
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'title')}</Text>
        <QuestInput questTheme={questTheme} value={title} onChangeText={setTitle} placeholder={t(lang, 'scheduleTitlePlaceholder')} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'date')}</Text>
        <QuestInput questTheme={questTheme} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'start')}</Text>
            <QuestInput questTheme={questTheme} value={startTime} onChangeText={setStartTime} placeholder="09:00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'end')}</Text>
            <QuestInput questTheme={questTheme} value={endTime} onChangeText={setEndTime} placeholder="10:00" />
          </View>
        </View>
        <Text style={[styles.calc, { color: questTheme.colors.textMuted }]}>{t(lang, 'planned')}: {minutesBetween(startTime, endTime)}m</Text>

        <ChipGroup questTheme={questTheme} title={t(lang, 'taskType')} values={TASK_TYPES} labels={Object.fromEntries(TASK_TYPES.map((v) => [v, taskTypeLabel(lang, v)]))} value={taskType} onChange={(v) => v && setTaskType(v)} accent={accent} />
        <ChipGroup questTheme={questTheme} title={t(lang, 'flexibility')} values={FLEX} labels={Object.fromEntries(FLEX.map((v) => [v, flexibilityLabel(lang, v)]))} value={flexibility} onChange={(v) => v && setFlexibility(v)} accent={accent} />
        <ChipGroup questTheme={questTheme} title={t(lang, 'rigidity')} values={RIGID} labels={Object.fromEntries(RIGID.map((v) => [v, rigidityLabel(lang, v)]))} value={rigidity} onChange={(v) => v && setRigidity(v)} accent={accent} />

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedGoalOptional')}</Text>
        <ChipGroup questTheme={questTheme} values={data.categories.map((c) => c.id)} labels={Object.fromEntries(data.categories.map((c) => [c.id, c.name]))} value={linkedGoalId} onChange={setLinkedGoalId} accent={accent} allowNone noneLabel={t(lang, 'none')} />
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedSkillOptional')}</Text>
        <ChipGroup questTheme={questTheme} values={data.skills.map((s) => s.id)} labels={Object.fromEntries(data.skills.map((s) => [s.id, s.name]))} value={linkedSkillId} onChange={setLinkedSkillId} accent={accent} allowNone noneLabel={t(lang, 'none')} />

        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'notes')}</Text>
        <QuestInput questTheme={questTheme} value={notes} onChangeText={setNotes} style={{ height: 70, textAlignVertical: 'top' }} multiline />
        <QuestButton questTheme={questTheme} variant="primary" icon="plus" label={t(lang, 'createBlock')} onPress={submit} style={{ marginTop: 18 }} />
      </BottomSheetForm>

      <BottomSheetForm visible={!!logBlock} onClose={() => setLogBlock(null)}>
        <Text style={[styles.h2, { color: questTheme.colors.text }]}>{t(lang, 'logProgress')}</Text>
        {logBlock ? (
          <>
            <Text style={[styles.logSheetTitle, { color: questTheme.colors.text }]}>{logBlock.title}</Text>
            <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{logBlock.startTime}-{logBlock.endTime} · {taskTypeLabel(lang, logBlock.taskType)} · {statusLabel(lang, logBlock.status)}</Text>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'sessionDurationOptional')}</Text>
            <QuestInput questTheme={questTheme} value={logMinutes} onChangeText={setLogMinutes} keyboardType="number-pad" placeholder="30" />
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'optionalQuality')}</Text>
            <View style={styles.qualityRow}>
              {QUALITY_OPTIONS.map((q) => {
                const on = logQuality === q.value;
                return (
                  <TouchableOpacity key={q.value} style={[styles.qualityChip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { borderColor: accent, backgroundColor: questTheme.colors.primarySoft }]} onPress={() => setLogQuality(on ? null : q.value)}>
                    <Text style={[styles.qualityEmoji, { color: questTheme.colors.text }]}>{q.value}</Text>
                    <Text style={[styles.qualityText, { color: questTheme.colors.textMuted }]}>{qualityLabel(lang, q.value)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {(() => {
              const skill = logBlock.linkedSkillId ? data.skills.find((item) => item.id === logBlock.linkedSkillId) : undefined;
              const metricType = skill ? progressTypeForSkill(skill) : 'none';
              const isStrengthLog = isStrengthPredictionSkill(skill);
              const checklistItems = skill?.metricConfig?.checklistItems ?? skill?.curriculumItems ?? [];
              if (!skill) return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'noNumericProgress')}</Text>;
              if (metricType === 'time_based') return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescTime')}</Text>;
              if (metricType === 'target_value') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescTarget')}</Text>
                    <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>
                      {(skill.metricConfig?.currentValue ?? skill.currentValue ?? 0)}{skill.metricConfig?.unit ?? skill.unit ?? ''} / {(skill.metricConfig?.targetValue ?? skill.targetValue ?? 0)}{skill.metricConfig?.unit ?? skill.unit ?? ''}
                    </Text>
                    <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'newCurrentValue')}</Text>
                    <QuestInput questTheme={questTheme} value={logNewCurrentValue} onChangeText={setLogNewCurrentValue} keyboardType="decimal-pad" placeholder={t(lang, 'newCurrentValue')} />
                    {isStrengthLog ? (
                      <View style={styles.timeRow}>
                        <QuestInput questTheme={questTheme} value={logStrengthWeight} onChangeText={setLogStrengthWeight} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthReps} onChangeText={setLogStrengthReps} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthSets} onChangeText={setLogStrengthSets} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                      </View>
                    ) : null}
                  </View>
                );
              }
              if (metricType === 'frequency') return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescFrequency')}</Text>;
              if (metricType === 'checklist' || metricType === 'curriculum') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescChecklist')}</Text>
                    {checklistItems.length === 0 ? <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{t(lang, 'noProgressItems')}</Text> : checklistItems.map((item) => {
                      const checked = logChecklistIds.includes(item.id);
                      return (
                        <TouchableOpacity key={item.id} style={styles.checkRow} onPress={() => setLogChecklistIds((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id])}>
                          <Text style={styles.checkMark}>{checked || item.completed ? '✓' : '○'}</Text>
                          <Text style={[styles.blockMeta, { color: questTheme.colors.textMuted }]}>{item.title}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              }
              if (metricType === 'performance_log') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{isStrengthLog ? t(lang, 'actualPerformance') : t(lang, 'metricDescPerformance')}</Text>
                    {isStrengthLog ? (
                      <View style={styles.timeRow}>
                        <QuestInput questTheme={questTheme} value={logStrengthWeight} onChangeText={setLogStrengthWeight} keyboardType="decimal-pad" placeholder={t(lang, 'actualWorkingWeight')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthReps} onChangeText={setLogStrengthReps} keyboardType="number-pad" placeholder={t(lang, 'actualReps')} style={{ flex: 1 }} />
                        <QuestInput questTheme={questTheme} value={logStrengthSets} onChangeText={setLogStrengthSets} keyboardType="number-pad" placeholder={t(lang, 'actualSets')} style={{ flex: 1 }} />
                      </View>
                    ) : (
                      <>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'performanceValue')}</Text>
                        <QuestInput questTheme={questTheme} value={logPerformanceValue} onChangeText={setLogPerformanceValue} keyboardType="decimal-pad" placeholder={t(lang, 'performanceValue')} />
                      </>
                    )}
                    <QuestInput questTheme={questTheme} value={logStrengthRpe} onChangeText={setLogStrengthRpe} keyboardType="decimal-pad" placeholder={t(lang, 'actualRPE')} />
                    <QuestInput questTheme={questTheme} value={logPerformanceUnit} onChangeText={setLogPerformanceUnit} placeholder={skill.metricConfig?.unit ?? '%'} />
                    <QuestInput questTheme={questTheme} value={logPerformanceNote} onChangeText={setLogPerformanceNote} style={{ height: 60, textAlignVertical: 'top' }} multiline placeholder={t(lang, 'notes')} />
                  </View>
                );
              }
              if (metricType === 'quality_score') return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescQuality')}</Text>;
              if (metricType === 'state_based') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescState')}</Text>
                    <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'stateMetric')}</Text>
                    <QuestInput questTheme={questTheme} value={logStateValue} onChangeText={setLogStateValue} keyboardType="decimal-pad" placeholder={skill.metricConfig?.stateMetric ?? t(lang, 'stateMetric')} />
                  </View>
                );
              }
              if (metricType === 'money_based') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescMoney')}</Text>
                    <View style={styles.timeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'amountAdded')}</Text>
                        <QuestInput questTheme={questTheme} value={logAmountAdded} onChangeText={setLogAmountAdded} keyboardType="decimal-pad" placeholder="100" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'newCurrentAmount')}</Text>
                        <QuestInput questTheme={questTheme} value={logNewCurrentAmount} onChangeText={setLogNewCurrentAmount} keyboardType="decimal-pad" placeholder="500" />
                      </View>
                    </View>
                  </View>
                );
              }
              if (metricType === 'binary') {
                return (
                  <TouchableOpacity style={styles.checkRow} onPress={() => setLogBinaryCompleted((value) => !value)}>
                    <Text style={styles.checkMark}>{logBinaryCompleted ? '✓' : '○'}</Text>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescBinary')}</Text>
                  </TouchableOpacity>
                );
              }
              if (metricType === 'qualitative') {
                return (
                  <View>
                    <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'metricDescQualitative')}</Text>
                    <QuestInput questTheme={questTheme} value={logQualitativeText} onChangeText={setLogQualitativeText} style={{ height: 70, textAlignVertical: 'top' }} multiline placeholder={t(lang, 'qualitativeSummary')} />
                  </View>
                );
              }
              return <Text style={[styles.metricHint, { color: questTheme.colors.textMuted }]}>{t(lang, 'noNumericProgress')}</Text>;
            })()}
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'notes')}</Text>
            <QuestInput questTheme={questTheme} value={logNote} onChangeText={setLogNote} style={{ height: 70, textAlignVertical: 'top' }} multiline />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.saveBtn, styles.cancelBtn, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]} onPress={() => setLogBlock(null)}>
                <Text style={[styles.cancelText, { color: questTheme.colors.text }]}>{t(lang, 'cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent, flex: 1 }]} onPress={submitLogBlock}>
                <Text style={styles.saveText}>{t(lang, 'logProgress')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </BottomSheetForm>
    </SafeAreaView>
  );
}

function ChipGroup<T extends string>({ title, values, labels, value, onChange, accent, questTheme, allowNone, noneLabel = 'None' }: {
  title?: string; values: readonly T[]; labels?: Record<string, string>; value?: T; onChange: (v: T | undefined) => void; accent: string; questTheme: QuestTheme; allowNone?: boolean; noneLabel?: string;
}) {
  return (
    <>
      {title ? <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{title}</Text> : null}
      <View style={styles.chipsRow}>
        {allowNone ? (
          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border },
              !value && { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => onChange(undefined)}
          >
            <Text style={[styles.chipText, { color: !value ? questTheme.colors.primaryText : questTheme.colors.text }]}>{noneLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {values.map((v) => {
          const on = value === v;
          return (
            <TouchableOpacity
              key={v}
              style={[
                styles.chip,
                { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border },
                on && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => onChange(v)}
            >
              <Text style={[styles.chipText, { color: on ? questTheme.colors.primaryText : questTheme.colors.text }]}>{labels?.[v] ?? v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, backgroundColor: theme.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  h1: { color: theme.text, fontSize: 34, fontWeight: '800' },
  h2: { color: theme.text, fontSize: 20, fontWeight: '800' },
  sub: { color: theme.textDim, marginTop: 4, maxWidth: 230 },
  addBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: theme.radius.md, ...theme.shadow },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  switcher: { flexDirection: 'row', backgroundColor: theme.cardAlt, borderRadius: theme.radius.md, padding: 4, marginTop: 18 },
  switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  switchText: { color: theme.textDim, fontWeight: '800' },
  switchTextOn: { color: '#fff' },
  dateTitle: { color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 10 },
  nowNextCard: { backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 12, ...theme.shadow },
  nowNextKicker: { color: theme.textDim, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
  nowNextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nowNextLabel: { color: theme.textDim, fontSize: 12, fontWeight: '800' },
  nowNextMain: { color: theme.text, fontSize: 15, fontWeight: '800', lineHeight: 21, marginTop: 2 },
  nowNextSub: { color: theme.textDim, fontSize: 12, fontWeight: '700', marginTop: 10 },
  jumpBtn: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  jumpText: { fontSize: 12, fontWeight: '900' },
  empty: { color: theme.textDim, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  emptyInline: { color: theme.textDim, fontSize: 13, marginBottom: 10 },
  timelineSurface: { position: 'relative', backgroundColor: theme.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', ...theme.shadow },
  // minHeight 是空档位的下限;有日程块时内容会自然撑高,这里只收紧空档位的高度
  hourRow: { flexDirection: 'row', minHeight: 32, borderBottomWidth: 1, borderBottomColor: theme.border },
  hourLabel: { width: 58, color: theme.textDim, fontSize: 12, fontWeight: '800', paddingTop: 6, textAlign: 'center' },
  hourContent: { flex: 1, paddingVertical: 5, paddingRight: 10, gap: 5 },
  timelineBlock: { backgroundColor: theme.cardAlt, borderRadius: theme.radius.md, padding: 8, borderLeftWidth: 3, borderLeftColor: theme.primary },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logBlockBtn: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  logBlockText: { fontSize: 11, fontWeight: '900' },
  nowLine: { position: 'absolute', left: 50, right: 8, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowRule: { height: 2, flex: 1 },
  nowLabel: { fontSize: 10, fontWeight: '800', marginLeft: 6, backgroundColor: theme.card, paddingHorizontal: 4 },
  timeline: { gap: 10 },
  blockCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  time: { color: theme.text, fontWeight: '800', width: 92 },
  blockTitle: { color: theme.text, fontSize: 14, fontWeight: '800' },
  blockMeta: { color: theme.textDim, fontSize: 11, marginTop: 3 },
  status: { color: theme.textDim, fontSize: 11, fontWeight: '800' },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  weekDay: { width: '31.8%', minHeight: 88, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 12, borderWidth: 1, borderColor: theme.border },
  weekDate: { color: theme.text, fontWeight: '800' },
  weekTotal: { color: theme.textDim, marginTop: 8, fontSize: 12 },
  weekBlock: { color: theme.text, marginTop: 6, fontSize: 11, fontWeight: '700' },
  placeholderCard: { marginTop: 10, backgroundColor: theme.card, borderRadius: theme.radius.lg, padding: 14, borderWidth: 1, borderColor: theme.border, ...theme.shadow },
  placeholderTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  placeholderText: { color: theme.textDim, marginTop: 8, lineHeight: 20 },
  label: { color: theme.textDim, marginTop: 14, marginBottom: 6, fontWeight: '700' },
  input: { backgroundColor: theme.card, borderRadius: theme.radius.md, padding: 12, color: theme.text, borderWidth: 1, borderColor: theme.border },
  timeRow: { flexDirection: 'row', gap: 10 },
  calc: { color: theme.textDim, marginTop: 10, fontSize: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  chipText: { color: theme.text, fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: '#fff' },
  saveBtn: { marginTop: 18, paddingVertical: 14, borderRadius: theme.radius.md, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800' },
  logSheetTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 8 },
  qualityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  qualityChip: { flexGrow: 1, alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8, backgroundColor: theme.card },
  qualityEmoji: { fontSize: 18 },
  qualityText: { color: theme.textDim, fontSize: 11, fontWeight: '800', marginTop: 2 },
  metricHint: { color: theme.textDim, fontSize: 12, lineHeight: 18, marginTop: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checkMark: { color: theme.primary, fontSize: 18, fontWeight: '900', width: 22 },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border },
  cancelText: { color: theme.text, fontWeight: '800' },
});
