// 可复用的技能表单 (创建 / 编辑共用一份 UI 和校验逻辑)
// - 创建: 传 initial=undefined, presetCategoryId 可选
// - 编辑: 传 initial=skill
// - 提交后自动调 addSkill / updateSkill, 然后 onClose
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, Alert, Keyboard,
} from 'react-native';
import { useStore } from '../store';
import { appAccent, theme } from '../theme';
import { PerformanceType, PrimaryPerformanceMetric, ProgressType, Skill, StateMetric, TaskType } from '../types';
import { SKILL_PROFILE_DEFAULTS } from '../scheduleAdjust';
import BottomSheetForm from './BottomSheetForm';
import EmojiPicker from './EmojiPicker';
import ColorPicker from './ColorPicker';
import TimePickerInput from './TimePickerInput';
import { flexibilityLabel, getLanguage, progressTypeLabel, rigidityLabel, t, taskTypeLabel } from '../i18n';
import { getQuestTheme } from '../design/tokens';
import QuestButton from './ui/QuestButton';
import QuestEntityIcon from './ui/QuestEntityIcon';
import QuestInput from './ui/QuestInput';
import QuestPill from './ui/QuestPill';
import { getSkillSemanticIcon } from '../design/entityIcons';

const EMOJIS = ['🧩','💻','🎨','📚','🏃','🧘','🎸','🍳','📷','🧠','💪','🌱','✍️','🎯','🎮','🔬','🐍','📐','🎤','🏊'];

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: 'deep_study', label: '深度学习' },
  { value: 'light_review', label: '轻复习' },
  { value: 'strength_training', label: '力量训练' },
  { value: 'cardio_recovery', label: '恢复/轻运动' },
  { value: 'admin', label: '行政事务' },
  { value: 'life_maintenance', label: '生活维持' },
  { value: 'creative_building', label: '创造/搭建' },
];
const WEEKDAY_OPTIONS = [
  { value: 'mon', key: 'weekdayMon' },
  { value: 'tue', key: 'weekdayTue' },
  { value: 'wed', key: 'weekdayWed' },
  { value: 'thu', key: 'weekdayThu' },
  { value: 'fri', key: 'weekdayFri' },
  { value: 'sat', key: 'weekdaySat' },
  { value: 'sun', key: 'weekdaySun' },
];
const PROGRESS_TYPE_OPTIONS: ProgressType[] = ['none', 'time_based', 'target_value', 'frequency', 'checklist', 'performance_log', 'quality_score', 'state_based', 'money_based', 'binary', 'qualitative'];

const PERFORMANCE_LABEL_KEYS: Record<PerformanceType, string> = {
  strength: 'perfStrength',
  endurance: 'perfEndurance',
  skill_reps: 'perfSkillReps',
  speed: 'perfSpeed',
  accuracy: 'perfAccuracy',
  business: 'perfBusiness',
  custom: 'perfCustom',
};

const PRIMARY_METRIC_LABEL_KEYS: Record<PrimaryPerformanceMetric, string> = {
  weight: 'metricWeight',
  volume: 'metricVolume',
  estimated_1rm: 'metricEstimated1rm',
  reps: 'metricReps',
  distance: 'metricDistance',
  pace: 'metricPace',
  accuracy: 'metricAccuracyValue',
  conversion_rate: 'metricConversionRate',
  revenue: 'metricRevenue',
  custom: 'metricCustom',
};

const STATE_METRIC_LABEL_KEYS: Record<StateMetric, string> = {
  energy: 'energy',
  focus: 'focus',
  mood: 'mood',
  sleep: 'stateSleep',
  stress: 'stateStress',
  recovery: 'stateRecovery',
  health: 'health',
  custom: 'stateCustom',
};

function inferTaskType(name: string): TaskType {
  const n = name.toLowerCase();
  if (/python|sql|finance|study|学习|考试/.test(n)) return 'deep_study';
  if (/卧推|硬拉|深蹲|健身|gym|bench|deadlift|squat/.test(n)) return 'strength_training';
  if (/cook|cooking|做饭|吃饭|shower|洗澡|clean|清洁|打扫/.test(n)) return 'life_maintenance';
  return 'deep_study';
}

export interface SkillFormProps {
  visible: boolean;
  onClose: () => void;
  initial?: Skill;
  presetCategoryId?: string;
  presetModuleId?: string;
  linkOnCreate?: boolean;
}

export default function SkillForm({ visible, onClose, initial, presetCategoryId, presetModuleId, linkOnCreate }: SkillFormProps) {
  const { data, addSkill, updateSkill, createSkillAndAttachToModule } = useStore();
  const lang = getLanguage(data.settings.language);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const accent = appAccent(data.settings.accentColor ?? questTheme.colors.primary);
  const themedInputStyle = { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border, color: questTheme.colors.text };
  const placeholderColor = questTheme.colors.textSubtle;
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧩');
  const [color, setColor] = useState(theme.palette[0]);
  const [dailyMin, setDailyMin] = useState('30');
  const [totalHrs, setTotalHrs] = useState('');
  const [catId, setCatId] = useState<string | null>(null);
  const [moduleId, setModuleId] = useState<string | undefined>();
  const [linkedGoalIds, setLinkedGoalIds] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<TaskType>('deep_study');
  const [progressType, setProgressType] = useState<ProgressType>('time_based');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [completedHours, setCompletedHours] = useState('0');
  const [targetHours, setTargetHours] = useState('100');
  const [completedThisWeek, setCompletedThisWeek] = useState('0');
  const [weeklyTargetCount, setWeeklyTargetCount] = useState('3');
  const [checklistText, setChecklistText] = useState('');
  const [performanceType, setPerformanceType] = useState<PerformanceType>('custom');
  const [primaryMetric, setPrimaryMetric] = useState<PrimaryPerformanceMetric>('custom');
  const [targetQuality, setTargetQuality] = useState('4');
  const [averageQuality, setAverageQuality] = useState('');
  const [stateMetric, setStateMetric] = useState<StateMetric>('energy');
  const [targetStateValue, setTargetStateValue] = useState('5');
  const [averageStateValue, setAverageStateValue] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState('$');
  const [binaryCompleted, setBinaryCompleted] = useState(false);
  const [trackVolume, setTrackVolume] = useState(true);
  const [trackRPE, setTrackRPE] = useState(false);
  const [useEstimated1RM, setUseEstimated1RM] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleType, setScheduleType] = useState<Skill['scheduleType']>('manual_only');
  const [weeklyDays, setWeeklyDays] = useState<string[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState('3');
  const [defaultStartTime, setDefaultStartTime] = useState('09:00');
  const [defaultDuration, setDefaultDuration] = useState('30');
  const [flexibility, setFlexibility] = useState<NonNullable<Skill['flexibility']>>('flexible');
  const [rigidity, setRigidity] = useState<NonNullable<Skill['rigidity']>>('medium');
  const [mentalCost, setMentalCost] = useState('80');
  const [physicalCost, setPhysicalCost] = useState('10');
  const [emotionalCost, setEmotionalCost] = useState('40');
  const [recoveryImpact, setRecoveryImpact] = useState('20');
  const [compressibility, setCompressibility] = useState('70');
  const [remEnabled, setRemEnabled] = useState(false);
  const [remHour, setRemHour] = useState(21);
  const [remMin, setRemMin] = useState(0);
  const [customIcon, setCustomIcon] = useState(false);

  // 每次弹窗打开时, 按 initial 重置表单 (避免上一次的脏数据残留)
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setName(initial.name);
      setIcon(initial.icon ?? '');
      setCustomIcon(Boolean(initial.icon));
      setColor(initial.color);
      setDailyMin(String(initial.dailyTargetMinutes));
      setTotalHrs(initial.totalTargetHours ? String(initial.totalTargetHours) : '');
      setCatId(initial.categoryId ?? null);
      setModuleId(initial.moduleId ?? presetModuleId);
      setLinkedGoalIds(initial.linkedGoalIds ?? (initial.categoryId ? [initial.categoryId] : []));
      setTaskType(initial.taskType ?? inferTaskType(initial.name));
      const metric = initial.metricConfig;
      setProgressType(metric?.metricType ?? initial.progressType ?? (/卧推|硬拉|深蹲|bench|deadlift|squat/i.test(initial.name) ? 'performance_log' : 'time_based'));
      setCurrentValue((metric?.currentValue ?? initial.currentValue) != null ? String(metric?.currentValue ?? initial.currentValue) : '');
      setTargetValue((metric?.targetValue ?? initial.targetValue) != null ? String(metric?.targetValue ?? initial.targetValue) : '');
      setUnit(metric?.unit ?? initial.unit ?? (/卧推|硬拉|深蹲|bench|deadlift|squat/i.test(initial.name) ? 'kg' : ''));
      setCompletedHours(String(metric?.completedHours ?? initial.completedHours ?? (initial.totalXP ?? 0) / 60));
      setTargetHours(String(metric?.targetHours ?? initial.targetHours ?? initial.totalTargetHours ?? 100));
      setCompletedThisWeek(String(metric?.completedThisWeek ?? initial.completedThisWeek ?? 0));
      setWeeklyTargetCount(String(metric?.weeklyTargetCount ?? initial.weeklyTargetCount ?? 3));
      setChecklistText((metric?.checklistItems ?? initial.curriculumItems ?? []).map((item) => item.title).join('\n'));
      setPerformanceType(metric?.performanceType ?? 'custom');
      setPrimaryMetric(metric?.primaryMetric ?? 'custom');
      setTargetQuality(metric?.targetQuality != null ? String(metric.targetQuality) : '4');
      setAverageQuality(metric?.averageQuality != null ? String(metric.averageQuality) : '');
      setStateMetric(metric?.stateMetric ?? 'energy');
      setTargetStateValue(metric?.targetStateValue != null ? String(metric.targetStateValue) : '5');
      setAverageStateValue(metric?.averageStateValue != null ? String(metric.averageStateValue) : '');
      setCurrentAmount(metric?.currentAmount != null ? String(metric.currentAmount) : '');
      setTargetAmount(metric?.targetAmount != null ? String(metric.targetAmount) : '');
      setCurrency(metric?.currency ?? '$');
      setBinaryCompleted(!!metric?.completed);
      setTrackVolume(!!metric?.trackVolume);
      setTrackRPE(!!metric?.trackRPE);
      setUseEstimated1RM(!!metric?.useEstimated1RM);
      setScheduleEnabled(!!initial.scheduleEnabled);
      setScheduleType(initial.scheduleType ?? 'manual_only');
      setWeeklyDays(initial.weeklyDays ?? []);
      setTimesPerWeek(String(initial.timesPerWeek ?? 3));
      setDefaultStartTime(initial.defaultStartTime ?? '09:00');
      setDefaultDuration(String(initial.defaultDurationMinutes ?? initial.dailyTargetMinutes));
      setFlexibility(initial.flexibility ?? 'flexible');
      setRigidity(initial.rigidity ?? 'medium');
      const profile = SKILL_PROFILE_DEFAULTS[initial.taskType ?? inferTaskType(initial.name)];
      setMentalCost(String(initial.mentalCost ?? profile.mentalCost));
      setPhysicalCost(String(initial.physicalCost ?? profile.physicalCost));
      setEmotionalCost(String(initial.emotionalCost ?? profile.emotionalCost));
      setRecoveryImpact(String(initial.recoveryImpact ?? profile.recoveryImpact));
      setCompressibility(String(initial.compressibility ?? profile.compressibility));
      setRemEnabled(!!initial.reminderEnabled);
      setRemHour(initial.reminderHour ?? 21);
      setRemMin(initial.reminderMinute ?? 0);
    } else {
      setName('');
      setIcon('');
      setColor(theme.palette[0]);
      setDailyMin('30');
      setTotalHrs('');
      setCatId(presetCategoryId ?? null);
      setModuleId(presetModuleId);
      setLinkedGoalIds(presetCategoryId ? [presetCategoryId] : []);
      setTaskType('deep_study');
      setProgressType('time_based');
      setCurrentValue('');
      setTargetValue('');
      setUnit('');
      setCompletedHours('0');
      setTargetHours('100');
      setCompletedThisWeek('0');
      setWeeklyTargetCount('3');
      setChecklistText('');
      setPerformanceType('custom');
      setPrimaryMetric('custom');
      setTargetQuality('4');
      setAverageQuality('');
      setStateMetric('energy');
      setTargetStateValue('5');
      setAverageStateValue('');
      setCurrentAmount('');
      setTargetAmount('');
      setCurrency('$');
      setBinaryCompleted(false);
      setTrackVolume(true);
      setTrackRPE(false);
      setUseEstimated1RM(false);
      setScheduleEnabled(false);
      setScheduleType('manual_only');
      setWeeklyDays([]);
      setTimesPerWeek('3');
      setDefaultStartTime('09:00');
      setDefaultDuration('30');
      setFlexibility('flexible');
      setRigidity('medium');
      const profile = SKILL_PROFILE_DEFAULTS.deep_study;
      setMentalCost(String(profile.mentalCost));
      setPhysicalCost(String(profile.physicalCost));
      setEmotionalCost(String(profile.emotionalCost));
      setRecoveryImpact(String(profile.recoveryImpact));
      setCompressibility(String(profile.compressibility));
      setRemEnabled(false);
      setRemHour(21);
      setRemMin(0);
      setCustomIcon(false);
    }
  }, [visible, initial?.id, presetCategoryId, presetModuleId, data.categories]);

  useEffect(() => {
    if (!customIcon) setIcon('');
  }, [taskType, progressType, customIcon]);

  const submit = () => {
    if (!name.trim()) { Alert.alert(t(lang, 'name')); return; }
    const dm = parseInt(dailyMin, 10);
    if (!dm || dm <= 0) { Alert.alert(t(lang, 'dailyTargetInvalid')); return; }
    const th = totalHrs.trim() ? parseFloat(totalHrs) : undefined;
    if (totalHrs.trim() && (!th || th <= 0)) { Alert.alert(t(lang, 'totalTargetInvalid')); return; }
    const duration = parseInt(defaultDuration, 10) || dm;
    const tpw = parseInt(timesPerWeek, 10) || 1;
    const cv = currentValue.trim() ? parseFloat(currentValue) : undefined;
    const tv = targetValue.trim() ? parseFloat(targetValue) : undefined;
    const thours = targetHours.trim() ? parseFloat(targetHours) : undefined;
    const chours = completedHours.trim() ? parseFloat(completedHours) : undefined;
    const ctw = completedThisWeek.trim() ? parseInt(completedThisWeek, 10) : undefined;
    const wtc = weeklyTargetCount.trim() ? parseInt(weeklyTargetCount, 10) : undefined;
    const checklistItems = checklistText
      .split('\n')
      .map((title, index) => ({ id: initial?.metricConfig?.checklistItems?.[index]?.id ?? initial?.curriculumItems?.[index]?.id ?? `item-${Date.now()}-${index}`, title: title.trim(), completed: initial?.metricConfig?.checklistItems?.[index]?.completed ?? initial?.curriculumItems?.[index]?.completed ?? false }))
      .filter((item) => item.title.length > 0);
    const nums = [mentalCost, physicalCost, emotionalCost, recoveryImpact, compressibility].map((v) => Math.max(0, Math.min(100, parseInt(v, 10) || 0)));
    const metricConfig = {
      metricType: progressType,
      unit: unit.trim() || undefined,
      completedHours: chours,
      targetHours: thours,
      currentValue: cv,
      targetValue: tv,
      completedThisWeek: ctw,
      weeklyTargetCount: wtc,
      checklistItems,
      performanceType,
      primaryMetric,
      bestValue: cv,
      targetPerformanceValue: tv,
      targetQuality: targetQuality.trim() ? Number(targetQuality) : undefined,
      averageQuality: averageQuality.trim() ? Number(averageQuality) : undefined,
      stateMetric,
      targetStateValue: targetStateValue.trim() ? Number(targetStateValue) : undefined,
      averageStateValue: averageStateValue.trim() ? Number(averageStateValue) : undefined,
      currentAmount: currentAmount.trim() ? Number(currentAmount) : undefined,
      targetAmount: targetAmount.trim() ? Number(targetAmount) : undefined,
      currency: currency.trim() || undefined,
      completed: binaryCompleted,
      trackVolume,
      trackRPE,
      useEstimated1RM,
    };

    const payload = {
      name: name.trim(), icon: customIcon ? icon : '', color,
      dailyTargetMinutes: dm,
      totalTargetHours: th,
      categoryId: catId ?? undefined,
      goalId: catId ?? undefined,
      moduleId,
      linkedGoalIds: linkedGoalIds.length > 0 ? linkedGoalIds : undefined,
      taskType,
      progressType,
      metricConfig,
      currentValue: cv,
      targetValue: tv,
      unit: unit.trim() || undefined,
      completedHours: chours,
      targetHours: thours,
      completedThisWeek: ctw,
      weeklyTargetCount: wtc,
      curriculumItems: checklistItems,
      scheduleEnabled,
      scheduleType: scheduleEnabled ? scheduleType : 'manual_only',
      weeklyDays,
      timesPerWeek: Math.max(1, Math.min(7, tpw)),
      defaultStartTime,
      defaultDurationMinutes: duration,
      flexibility,
      rigidity,
      mentalCost: nums[0],
      physicalCost: nums[1],
      emotionalCost: nums[2],
      recoveryImpact: nums[3],
      compressibility: nums[4],
      reminderEnabled: remEnabled,
      reminderHour: remEnabled ? remHour : undefined,
      reminderMinute: remEnabled ? remMin : undefined,
    };

    if (initial) updateSkill(initial.id, payload);
    else {
      if (linkOnCreate && catId && moduleId) {
        createSkillAndAttachToModule(catId, moduleId, payload);
      } else {
        addSkill(payload);
      }
    }
    onClose();
  };

  return (
    <BottomSheetForm visible={visible} onClose={onClose}>
      <Text style={[styles.h2, { color: questTheme.colors.text }]}>{initial ? t(lang, 'editSkill') : t(lang, 'newSkill')}</Text>

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'linkedGoals')}</Text>
      <View style={styles.chipsRow}>
        {data.categories.map((c) => {
          const on = linkedGoalIds.includes(c.id);
          return (
            <QuestPill
              key={c.id} onPress={() => {
                setLinkedGoalIds((ids) => {
                  const next = ids.includes(c.id) ? ids.filter((id) => id !== c.id) : [...ids, c.id];
                  setCatId(next[0] ?? c.id);
                  return next;
                });
              }}
              questTheme={questTheme}
              label={c.name}
              active={on}
            />
          );
        })}
      </View>

      {catId ? (
        <>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'modules')}</Text>
          <View style={styles.chipsRow}>
            {(data.modules || []).filter((m) => m.goalId === catId).map((m) => {
              const on = moduleId === m.id;
              return (
                <QuestPill
                  key={m.id}
                  onPress={() => setModuleId(m.id)}
                  questTheme={questTheme}
                  label={m.name}
                  active={on}
                />
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'name')}</Text>
      <QuestInput
        questTheme={questTheme}
        value={name} onChangeText={setName}
        placeholder={t(lang, 'exampleBench')}
        returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit
      />

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'color')}</Text>
      <ColorPicker colors={theme.palette} value={color} onChange={setColor} />

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'taskType')}</Text>
      <View style={styles.chipsRow}>
        {TASK_TYPE_OPTIONS.map((opt) => {
          const on = taskType === opt.value;
          return (
            <QuestPill
              key={opt.value}
              onPress={() => setTaskType(opt.value)}
              questTheme={questTheme}
              label={taskTypeLabel(lang, opt.value)}
              active={on}
            />
          );
        })}
      </View>

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'icon')}</Text>
      <View style={[styles.iconPanel, { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border }]}>
        <QuestEntityIcon
          icon={customIcon ? icon : undefined}
          systemIcon={getSkillSemanticIcon({ name, taskType, progressType, metricConfig: { metricType: progressType } } as Skill)}
          color={color}
          questTheme={questTheme}
          size="md"
          preferEmoji={customIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.iconPanelTitle, { color: questTheme.colors.text }]}>
            {customIcon ? t(lang, 'customIconEnabled') : `${t(lang, 'autoIcon')}: ${taskTypeLabel(lang, taskType)}`}
          </Text>
          <Text style={[styles.iconPanelSub, { color: questTheme.colors.textMuted }]}>
            {customIcon ? t(lang, 'legacyEmoji') : t(lang, 'semanticIcon')}
          </Text>
        </View>
        {customIcon ? (
          <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'useAutoIcon')} onPress={() => { setCustomIcon(false); setIcon(''); }} />
        ) : (
          <QuestButton questTheme={questTheme} variant="ghost" label={t(lang, 'customizeIcon')} onPress={() => setCustomIcon(true)} />
        )}
      </View>
      {customIcon ? (
        <View style={{ marginTop: 10 }}>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'legacyEmoji')}</Text>
          <EmojiPicker emojis={EMOJIS} value={icon} onChange={setIcon} />
        </View>
      ) : null}

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'progressType')}</Text>
      <View style={styles.chipsRow}>
        {PROGRESS_TYPE_OPTIONS.map((value) => {
          const on = progressType === value;
          return (
            <QuestPill
              key={value}
              onPress={() => setProgressType(value)}
              questTheme={questTheme}
              label={progressTypeLabel(lang, value)}
              active={on}
            />
          );
        })}
      </View>

      {progressType === 'target_value' ? (
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'currentValue')}</Text>
            <TextInput value={currentValue} onChangeText={setCurrentValue} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="80" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetValueLabel')}</Text>
            <TextInput value={targetValue} onChangeText={setTargetValue} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="100" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ width: 72 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'unit')}</Text>
            <TextInput value={unit} onChangeText={setUnit} style={[styles.input, themedInputStyle]} placeholder="kg" placeholderTextColor={placeholderColor} />
          </View>
        </View>
      ) : null}

      {progressType === 'time_based' ? (
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'completedHours')}</Text>
            <TextInput value={completedHours} onChangeText={setCompletedHours} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="0" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetHours')}</Text>
            <TextInput value={targetHours} onChangeText={setTargetHours} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="100" placeholderTextColor={placeholderColor} />
          </View>
        </View>
      ) : null}

      {progressType === 'frequency' ? (
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'completedThisWeek')}</Text>
            <TextInput value={completedThisWeek} onChangeText={setCompletedThisWeek} keyboardType="number-pad" style={[styles.input, themedInputStyle]} placeholder="0" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'weeklyTargetCount')}</Text>
            <TextInput value={weeklyTargetCount} onChangeText={setWeeklyTargetCount} keyboardType="number-pad" style={[styles.input, themedInputStyle]} placeholder="3" placeholderTextColor={placeholderColor} />
          </View>
        </View>
      ) : null}

      {progressType === 'checklist' || progressType === 'curriculum' ? (
        <>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'checklistItems')}</Text>
          <TextInput
            value={checklistText}
            onChangeText={setChecklistText}
            style={[styles.input, themedInputStyle, { height: 96, textAlignVertical: 'top' }]}
            multiline
            placeholder={'SELECT\nJOIN\nGROUP BY'}
            placeholderTextColor={placeholderColor}
          />
        </>
      ) : null}

      {progressType === 'performance_log' ? (
        <View style={[styles.sectionCard, { backgroundColor: questTheme.colors.surfaceSoft }]}>
          <Text style={[styles.label2, { color: questTheme.colors.text }]}>{t(lang, 'performanceLog')}</Text>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'performanceType')}</Text>
          <View style={styles.chipsRow}>
            {(['strength', 'endurance', 'skill_reps', 'speed', 'accuracy', 'business', 'custom'] as PerformanceType[]).map((value) => {
              const on = performanceType === value;
              return <TouchableOpacity key={value} onPress={() => setPerformanceType(value)} style={[styles.chip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]}><Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: '#fff', fontWeight: '700' }]}>{t(lang, PERFORMANCE_LABEL_KEYS[value])}</Text></TouchableOpacity>;
            })}
          </View>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'primaryMetric')}</Text>
          <View style={styles.chipsRow}>
            {(['weight', 'volume', 'estimated_1rm', 'reps', 'distance', 'pace', 'accuracy', 'conversion_rate', 'revenue', 'custom'] as PrimaryPerformanceMetric[]).map((value) => {
              const on = primaryMetric === value;
              return <TouchableOpacity key={value} onPress={() => setPrimaryMetric(value)} style={[styles.chip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]}><Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: '#fff', fontWeight: '700' }]}>{t(lang, PRIMARY_METRIC_LABEL_KEYS[value])}</Text></TouchableOpacity>;
            })}
          </View>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'performanceValue')}</Text>
              <TextInput value={currentValue} onChangeText={setCurrentValue} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="90" placeholderTextColor={placeholderColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetValueLabel')}</Text>
              <TextInput value={targetValue} onChangeText={setTargetValue} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="100" placeholderTextColor={placeholderColor} />
            </View>
            <View style={{ width: 90 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'unit')}</Text>
              <TextInput value={unit} onChangeText={setUnit} style={[styles.input, themedInputStyle]} placeholder="kg" placeholderTextColor={placeholderColor} />
            </View>
          </View>
          {[
            [t(lang, 'trackVolume'), trackVolume, setTrackVolume],
            [t(lang, 'trackRPE'), trackRPE, setTrackRPE],
            [t(lang, 'useEstimated1RM'), useEstimated1RM, setUseEstimated1RM],
          ].map(([label, value, setter]) => (
            <View key={label as string} style={[styles.row, { marginTop: 12 }]}>
              <Text style={[styles.label2, { color: questTheme.colors.text }]}>{label as string}</Text>
              <Switch value={value as boolean} onValueChange={setter as any} trackColor={{ true: accent }} />
            </View>
          ))}
        </View>
      ) : null}

      {progressType === 'quality_score' ? (
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'averageQualityValue')}</Text>
            <TextInput value={averageQuality} onChangeText={setAverageQuality} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="0" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetQuality')}</Text>
            <TextInput value={targetQuality} onChangeText={setTargetQuality} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="4" placeholderTextColor={placeholderColor} />
          </View>
        </View>
      ) : null}

      {progressType === 'state_based' ? (
        <>
          <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'stateMetric')}</Text>
          <View style={styles.chipsRow}>
            {(['energy', 'focus', 'mood', 'sleep', 'stress', 'recovery', 'health', 'custom'] as StateMetric[]).map((value) => {
              const on = stateMetric === value;
              return <TouchableOpacity key={value} onPress={() => setStateMetric(value)} style={[styles.chip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]}><Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: '#fff', fontWeight: '700' }]}>{t(lang, STATE_METRIC_LABEL_KEYS[value])}</Text></TouchableOpacity>;
            })}
          </View>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'averageStateValue')}</Text>
              <TextInput value={averageStateValue} onChangeText={setAverageStateValue} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="0" placeholderTextColor={placeholderColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetStateValue')}</Text>
              <TextInput value={targetStateValue} onChangeText={setTargetStateValue} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="5" placeholderTextColor={placeholderColor} />
            </View>
          </View>
        </>
      ) : null}

      {progressType === 'money_based' ? (
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'currentAmount')}</Text>
            <TextInput value={currentAmount} onChangeText={setCurrentAmount} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="0" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'targetAmount')}</Text>
            <TextInput value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" style={[styles.input, themedInputStyle]} placeholder="2000" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ width: 72 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'currency')}</Text>
            <TextInput value={currency} onChangeText={setCurrency} style={[styles.input, themedInputStyle]} placeholder="$" placeholderTextColor={placeholderColor} />
          </View>
        </View>
      ) : null}

      {progressType === 'binary' ? (
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={[styles.label2, { color: questTheme.colors.text }]}>{t(lang, 'completedToggle')}</Text>
          <Switch value={binaryCompleted} onValueChange={setBinaryCompleted} trackColor={{ true: accent }} />
        </View>
      ) : null}

      {progressType === 'qualitative' || progressType === 'none' ? (
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{progressType === 'none' ? t(lang, 'metricNoTrackingDesc') : t(lang, 'noNumericProgress')}</Text>
      ) : null}

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'dailyTarget')}</Text>
      <QuestInput
        questTheme={questTheme}
        value={dailyMin} onChangeText={setDailyMin} keyboardType="number-pad"
        placeholder="60"
        returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit
      />

      <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'totalTarget')}</Text>
      <QuestInput
        questTheme={questTheme}
        value={totalHrs} onChangeText={setTotalHrs} keyboardType="decimal-pad"
        placeholder={t(lang, 'exampleHours')}
        returnKeyType="done" onSubmitEditing={Keyboard.dismiss} blurOnSubmit
      />

      <View style={[styles.sectionCard, { backgroundColor: questTheme.colors.surfaceSoft }]}>
        <View style={styles.row}>
          <Text style={[styles.label2, { color: questTheme.colors.text }]}>{t(lang, 'autoSchedule')}</Text>
          <Switch value={scheduleEnabled} onValueChange={setScheduleEnabled} trackColor={{ true: accent }} />
        </View>
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'autoSchedule')}</Text>
        <View style={styles.chipsRow}>
          {[
            ['daily', t(lang, 'day')],
            ['weekly_days', t(lang, 'selectedWeekdays')],
            ['times_per_week', t(lang, 'timesPerWeek')],
            ['manual_only', t(lang, 'manualOnly')],
          ].map(([value, label]) => {
            const on = scheduleType === value;
            return (
              <TouchableOpacity key={value} style={[styles.chip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]} onPress={() => setScheduleType(value as Skill['scheduleType'])}>
                <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: '#fff', fontWeight: '700' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {scheduleType === 'weekly_days' && (
          <View style={[styles.chipsRow, { marginTop: 8 }]}>
            {WEEKDAY_OPTIONS.map((d) => {
              const on = weeklyDays.includes(d.value);
              return (
                <TouchableOpacity key={d.value} style={[styles.chip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]} onPress={() => setWeeklyDays((days) => on ? days.filter((x) => x !== d.value) : [...days, d.value])}>
                  <Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: '#fff', fontWeight: '700' }]}>{t(lang, d.key)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {scheduleType === 'times_per_week' && (
          <>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'timesPerWeek')}</Text>
            <TextInput value={timesPerWeek} onChangeText={setTimesPerWeek} keyboardType="number-pad" style={[styles.input, themedInputStyle]} placeholder="3" placeholderTextColor={placeholderColor} />
          </>
        )}
        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'defaultStartTime')}</Text>
            <TextInput value={defaultStartTime} onChangeText={setDefaultStartTime} style={[styles.input, themedInputStyle]} placeholder="09:00" placeholderTextColor={placeholderColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'defaultDuration')}</Text>
            <TextInput value={defaultDuration} onChangeText={setDefaultDuration} keyboardType="number-pad" style={[styles.input, themedInputStyle]} placeholder="60" placeholderTextColor={placeholderColor} />
          </View>
        </View>
      </View>

      <View style={[styles.sectionCard, { backgroundColor: questTheme.colors.surfaceSoft }]}>
        <Text style={[styles.label2, { color: questTheme.colors.text }]}>{t(lang, 'costProfile')}</Text>
        {[
          [t(lang, 'mentalCost'), mentalCost, setMentalCost],
          [t(lang, 'physicalCost'), physicalCost, setPhysicalCost],
          [t(lang, 'emotionalCost'), emotionalCost, setEmotionalCost],
          [t(lang, 'recoveryImpact'), recoveryImpact, setRecoveryImpact],
          [t(lang, 'compressibility'), compressibility, setCompressibility],
        ].map(([label, value, setter]) => (
          <View key={label as string} style={styles.profileRow}>
            <Text style={[styles.profileLabel, { color: questTheme.colors.text }]}>{label as string}</Text>
            <TextInput value={value as string} onChangeText={setter as any} keyboardType="number-pad" style={[styles.profileInput, themedInputStyle]} placeholderTextColor={placeholderColor} />
          </View>
        ))}
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'flexibility')}</Text>
        <View style={styles.chipsRow}>
          {(['fixed', 'flexible', 'movable'] as const).map((v) => {
            const on = flexibility === v;
            return <TouchableOpacity key={v} style={[styles.chip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]} onPress={() => setFlexibility(v)}><Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: '#fff', fontWeight: '700' }]}>{flexibilityLabel(lang, v)}</Text></TouchableOpacity>;
          })}
        </View>
        <Text style={[styles.label, { color: questTheme.colors.textMuted }]}>{t(lang, 'rigidity')}</Text>
        <View style={styles.chipsRow}>
          {(['low', 'medium', 'high'] as const).map((v) => {
            const on = rigidity === v;
            return <TouchableOpacity key={v} style={[styles.chip, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, on && { backgroundColor: accent, borderColor: accent }]} onPress={() => setRigidity(v)}><Text style={[styles.chipText, { color: questTheme.colors.text }, on && { color: '#fff', fontWeight: '700' }]}>{rigidityLabel(lang, v)}</Text></TouchableOpacity>;
          })}
        </View>
      </View>

      <View style={[styles.row, { marginTop: 18 }]}>
        <Text style={[styles.label2, { color: questTheme.colors.text }]}>{t(lang, 'dailyReminder')}</Text>
        <Switch value={remEnabled} onValueChange={setRemEnabled} trackColor={{ true: accent }} />
      </View>
      {remEnabled && (
        <View style={styles.timeRow}>
          <TimePickerInput hour={remHour} minute={remMin}
            onChange={(h, m) => { setRemHour(h); setRemMin(m); }} />
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <QuestButton questTheme={questTheme} variant="secondary" label={t(lang, 'cancel')} onPress={onClose} style={{ flex: 1 }} />
        <QuestButton questTheme={questTheme} variant="primary" label={initial ? t(lang, 'save') : t(lang, 'create')} onPress={submit} style={{ flex: 1 }} />
      </View>
    </BottomSheetForm>
  );
}

const styles = StyleSheet.create({
  h2: { color: theme.text, fontSize: 18, fontWeight: '600' },
  label: { color: theme.textDim, marginTop: 12, marginBottom: 6 },
  label2: { color: theme.text, fontSize: 15, fontWeight: '600', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: theme.card, borderRadius: theme.radius.md, padding: 12, color: theme.text, borderWidth: 1, borderColor: theme.border },
  iconPanel: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: theme.radius.lg, padding: 10 },
  iconPanelTitle: { fontSize: 13, fontWeight: '900' },
  iconPanelSub: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  chipText: { color: theme.text, fontSize: 13 },
  sectionCard: { backgroundColor: theme.cardAlt, borderRadius: theme.radius.lg, padding: 12, marginTop: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  profileLabel: { color: theme.text, flex: 1, fontWeight: '700' },
  profileInput: { width: 72, backgroundColor: theme.card, borderRadius: theme.radius.md, padding: 10, color: theme.text, borderWidth: 1, borderColor: theme.border, textAlign: 'center' },
  btn: { paddingVertical: 12, borderRadius: theme.radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
  btnGhostText: { color: theme.text, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8 },
});
