// 技能详情页 — drill-down from 技能 Tab
// 顶部: 返回 + emoji + 名称 + 大目标标签 + 编辑/删除
// 时间范围: 日 | 周 | 月 | 全部 (默认: 周)
// 图表: 4 种 (timeline / bar / 30 cells / cumulative line)
// 底部 stats: 本周投入 / 平均质量 / 连续天数
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useStore } from '../store';
import { theme } from '../theme';
import {
  Skill, Action, skillStreak, skillMinutesOnDate,
  emojiForAvgQuality, skillMilestones, HOUR_MILESTONES,
} from '../types';
import SkillForm from '../components/SkillForm';
import { SKILL_PROFILE_DEFAULTS } from '../scheduleAdjust';
import { flexibilityLabel, getLanguage, progressTypeLabel, rigidityLabel, t, taskTypeLabel } from '../i18n';
import { calculateSkillProgress, formatMetricSummary, formatMetricUpdateSummary, progressTypeForSkill } from '../progress';
import { getQuestTheme } from '../design/tokens';
import { systemIcons } from '../design/systemIcons';
import { getGoalSemanticIcon, getSkillSemanticIcon } from '../design/entityIcons';
import QuestButton from '../components/ui/QuestButton';
import QuestCard from '../components/ui/QuestCard';
import QuestEntityIcon from '../components/ui/QuestEntityIcon';
import QuestIcon from '../components/ui/QuestIcon';
import QuestPill from '../components/ui/QuestPill';
import QuestProgressBar from '../components/ui/QuestProgressBar';
import { compareEffortToPrevious, formatEffortUnitSummary, getComparableHistory } from '../utils/effort';
import { confirmAction } from '../utils/confirm';

type Range = 'day' | 'week' | 'month' | 'all';
const WEEKDAY_KEYS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'];

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const WEEKDAY_LABEL_KEYS: Record<string, string> = {
  mon: 'weekdayMon', tue: 'weekdayTue', wed: 'weekdayWed', thu: 'weekdayThu', fri: 'weekdayFri', sat: 'weekdaySat', sun: 'weekdaySun',
};

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, String(value)), template);
}

function scheduleSummary(skill: Skill, lang: 'zh' | 'en') {
  if (!skill.scheduleEnabled || skill.scheduleType === 'manual_only') return t(lang, 'manualSchedule');
  const time = `${skill.defaultStartTime ?? '09:00'} · ${skill.defaultDurationMinutes ?? skill.dailyTargetMinutes} ${t(lang, 'minutes')}`;
  if (skill.scheduleType === 'daily') return fill(t(lang, 'autoDailySchedule'), { time });
  if (skill.scheduleType === 'weekly_days') {
    const separator = lang === 'zh' ? '、' : ', ';
    const days = (skill.weeklyDays ?? []).map((d) => t(lang, WEEKDAY_LABEL_KEYS[d] ?? d)).join(separator) || t(lang, 'noWeekdaysSelected');
    return fill(t(lang, 'autoWeeklySchedule'), { days, time });
  }
  if (skill.scheduleType === 'times_per_week') return fill(t(lang, 'autoTimesSchedule'), { count: skill.timesPerWeek ?? 1, time });
  return t(lang, 'manualSchedule');
}

// 把 hex 颜色转 rgba (alpha 0-1)
function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ParamList = { SkillDetail: { skillId: string } };

export default function SkillDetailScreen() {
  const route = useRoute<RouteProp<ParamList, 'SkillDetail'>>();
  const nav = useNavigation<any>();
  const { data, deleteSkillFromLibrary } = useStore();
  const lang = getLanguage(data.settings.language);
  const questTheme = getQuestTheme(data.settings.selectedThemeId);
  const skillId = route.params.skillId;
  const skill = data.skills.find((s) => s.id === skillId);

  const [range, setRange] = useState<Range>('week');
  const [editing, setEditing] = useState(false);

  // skill 被删除了 (从详情页删除自身) → 自动回上一层
  React.useEffect(() => {
    if (!skill) nav.goBack();
  }, [skill, nav]);

  const skillActions = useMemo(
    () => skill
      ? data.actions
        .filter((a) => a.skillIds.includes(skill.id))
        .sort((a, b) => a.createdAt - b.createdAt)
      : [],
    [data.actions, skill]
  );

  const skillLogs = useMemo(
    () => skill
      ? (data.executionLogs || [])
        .filter((log) => log.linkedSkillId === skill.id)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      : [],
    [data.executionLogs, skill]
  );
  const comparableEffort = useMemo(() => {
    if (!skill) return null;
    const efforts = (data.effortUnits || [])
      .filter((unit) => unit.primarySkillId === skill.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const latest = efforts[0];
    if (!latest) return null;
    const history = getComparableHistory(latest, data.effortUnits || []);
    return { latest, comparison: compareEffortToPrevious(latest, history) };
  }, [data.effortUnits, skill]);

  const weeklyMinutes = useMemo(() => {
    if (!skill) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - 6);
    const cutoffStr = fmtDate(cutoff);
    return skillActions
      .filter((a) => a.date >= cutoffStr)
      .reduce((s, a) => s + a.minutes, 0);
  }, [skill, skillActions]);

  const avgQuality = useMemo(() => {
    if (!skill) return null;
    const rated = skillActions.filter((a) => a.quality != null);
    if (rated.length === 0) return null;
    const sum = rated.reduce((s, a) => s + (a.quality as number), 0);
    return { avg: sum / rated.length, count: rated.length };
  }, [skill, skillActions]);

  const streak = useMemo(() => skill ? skillStreak(skill.id, data.actions) : 0, [data.actions, skill]);

  const milestones = useMemo(() => skill ? skillMilestones(skill.id, data.actions) : [], [data.actions, skill]);
  const compound = useMemo(() => {
    if (!skill) return { points: [] as number[], status: t(lang, 'buildingData'), growth: null as number | null };
    const type = progressTypeForSkill(skill);
    const sorted = skillLogs.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 2) return { points: [] as number[], status: t(lang, 'buildingData'), growth: null as number | null };
    let cumulative = 0;
    let best = 0;
    const values = sorted.map((log) => {
      if (type === 'time_based') cumulative += (log.metricUpdate?.minutesAdded ?? log.durationMinutes ?? 0) / 60;
      else if (type === 'target_value') cumulative = Math.max(cumulative, log.metricUpdate?.newCurrentValue ?? 0);
      else if (type === 'frequency') cumulative += log.metricUpdate?.countAdded ?? 1;
      else if (type === 'checklist' || type === 'curriculum') cumulative += (log.metricUpdate?.completedChecklistItemIds ?? []).length;
      else if (type === 'performance_log') {
        best = Math.max(best, log.metricUpdate?.performanceValue ?? 0);
        cumulative = best;
      } else if (type === 'quality_score') {
        const rated = sorted.filter((item) => item.date <= log.date && (item.metricUpdate?.qualityValue ?? item.qualityRating) != null);
        cumulative = rated.reduce((sum, item) => sum + (item.metricUpdate?.qualityValue ?? item.qualityRating ?? 0), 0) / Math.max(1, rated.length);
      } else if (type === 'state_based') {
        const rated = sorted.filter((item) => item.date <= log.date && item.metricUpdate?.stateValue != null);
        cumulative = rated.reduce((sum, item) => sum + (item.metricUpdate?.stateValue ?? 0), 0) / Math.max(1, rated.length);
      } else if (type === 'money_based') {
        cumulative = log.metricUpdate?.newCurrentAmount ?? (cumulative + (log.metricUpdate?.amountAdded ?? 0));
      } else if (type === 'binary') cumulative = log.metricUpdate?.markCompleted ? 1 : cumulative;
      else cumulative += 1;
      return cumulative;
    }).filter((value) => Number.isFinite(value));
    if (values.length < 2) return { points: [] as number[], status: t(lang, 'buildingData'), growth: null as number | null };
    const midpoint = Math.floor(values.length / 2);
    const earlier = values[midpoint - 1] || values[0] || 0;
    const latest = values[values.length - 1] || 0;
    const growth = earlier > 0 ? ((latest - earlier) / earlier) * 100 : latest > 0 ? 100 : 0;
    const prev = values[Math.max(0, midpoint - 2)] || 0;
    const prevGrowth = prev > 0 ? ((earlier - prev) / prev) * 100 : 0;
    const status = values.length < 4
      ? t(lang, 'buildingData')
      : growth > prevGrowth + 5
        ? `↑ ${t(lang, 'accelerating')}`
        : Math.abs(growth - prevGrowth) < 5
          ? `→ ${t(lang, 'stable')}`
          : `↓ ${t(lang, 'slowing')}`;
    return { points: values.slice(-8), status, growth };
  }, [skill, skillLogs, lang]);

  if (!skill) {
    return (
      <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: questTheme.colors.border }]}>
          <QuestButton questTheme={questTheme} variant="ghost" icon="target" label={t(lang, 'back')} onPress={() => nav.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const cat = data.categories.find((c) => c.id === skill.categoryId);
  const linkedCats = data.categories.filter((c) => (skill.linkedGoalIds ?? (skill.categoryId ? [skill.categoryId] : [])).includes(c.id));
  const taskType = skill.taskType ?? 'deep_study';
  const profile = SKILL_PROFILE_DEFAULTS[taskType];
  const skillProgress = calculateSkillProgress(skill);
  const linkedLocations = (data.moduleSkillLinks || [])
    .filter((link) => link.skillId === skill.id)
    .map((link) => {
      const goal = data.categories.find((c) => c.id === link.goalId);
      const module = (data.modules || []).find((m) => m.id === link.moduleId);
      return goal && module ? { goal, module } : null;
    })
    .filter(Boolean) as { goal: { name: string; emoji?: string }; module: { name: string; icon?: string; id: string } }[];
  const last7LogCount = (() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffStr = fmtDate(cutoff);
    return skillLogs.filter((log) => log.date >= cutoffStr).length;
  })();
  const skillFitNext = linkedLocations.length === 0
    ? t(lang, 'notLinkedSkillHint')
    : last7LogCount === 0
      ? t(lang, 'logProgressTodayAction')
      : t(lang, 'reviewInsightsAction');

  const confirmDeleteSkill = () => {
    const extra = linkedLocations.length > 0
      ? `\n\n${fill(t(lang, 'linkedLocationsCount'), { count: linkedLocations.length })}`
      : '';
    confirmAction({
      title: t(lang, 'deleteSkillPermanentTitle'),
      message: `${t(lang, 'deleteSkillPermanentBody')}${extra}`,
      cancelText: t(lang, 'cancel'),
      confirmText: t(lang, 'deletePermanently'),
      destructive: true,
      onConfirm: () => {
        deleteSkillFromLibrary(skill.id);
        nav.goBack();
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: questTheme.colors.background }]}>
      {/* 顶部 header */}
      <View style={[styles.header, { borderBottomColor: questTheme.colors.border }]}>
        <QuestButton questTheme={questTheme} variant="ghost" icon="target" label={t(lang, 'back')} onPress={() => nav.goBack()} />
        <QuestButton questTheme={questTheme} variant="secondary" icon="plus" label={t(lang, 'edit')} onPress={() => setEditing(true)} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130, maxWidth: 960, width: '100%', alignSelf: 'center' }}>
        {/* 技能标题 */}
        <View style={styles.titleRow}>
          <QuestEntityIcon icon={skill.icon} systemIcon={getSkillSemanticIcon(skill)} color={skill.color} questTheme={questTheme} size="xl" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: questTheme.colors.text }]}>{skill.name}</Text>
            {cat && (
              <View style={styles.inlineEntityRow}>
                <QuestEntityIcon icon={cat.emoji} systemIcon={getGoalSemanticIcon(cat)} color={cat.color} questTheme={questTheme} size="sm" />
                <QuestPill questTheme={questTheme} label={cat.name} variant="muted" />
              </View>
            )}
          </View>
        </View>

        <QuestCard questTheme={questTheme} variant="data" style={styles.compoundCard}>
          <View style={styles.cardTitleRow}>
            <QuestIcon name="barChart" size={18} color={questTheme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: questTheme.colors.text, marginTop: 0, marginBottom: 0 }]}>{t(lang, 'compoundCurve')}</Text>
          </View>
          {compound.points.length < 2 ? (
            <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{t(lang, 'compoundNeedsData')}</Text>
          ) : (
            <>
              <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>
                {compound.growth == null ? t(lang, 'buildingData') : `${lang === 'zh' ? '本月' : 'This month'} ${compound.growth >= 0 ? '+' : ''}${compound.growth.toFixed(0)}% · ${compound.status}`}
              </Text>
              <MiniLineChart values={compound.points} color={skill.color} />
            </>
          )}
        </QuestCard>

        {/* 时间范围切换 */}
        <View style={styles.rangeRow}>
          {(['day', 'week', 'month', 'all'] as Range[]).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={[styles.rangePill, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }, range === r && { backgroundColor: questTheme.colors.primary, borderColor: questTheme.colors.primary }]}
            >
              <Text style={[styles.rangePillText, { color: range === r ? questTheme.colors.primaryText : questTheme.colors.textMuted }, range === r && { fontWeight: '700' }]}>
                {r === 'day' ? t(lang, 'day') : r === 'week' ? t(lang, 'week') : r === 'month' ? t(lang, 'month') : t(lang, 'all')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 图表 */}
        <QuestCard questTheme={questTheme} variant="flat" style={styles.chartCard}>
          {range === 'day' && <DayView skill={skill} actions={skillActions} lang={lang} />}
          {range === 'week' && <WeekView skill={skill} actions={skillActions} lang={lang} />}
          {range === 'month' && <MonthView skill={skill} actions={skillActions} lang={lang} />}
          {range === 'all' && <AllView skill={skill} actions={skillActions} lang={lang} />}
        </QuestCard>

        <Text style={[styles.sectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'executionRules')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={styles.ruleCard}>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{t(lang, 'linkedGoals')}: {linkedCats.length > 0 ? linkedCats.map((c) => c.name).join(lang === 'zh' ? '、' : ', ') : t(lang, 'notSet')}</Text>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{t(lang, 'taskType')}: {taskTypeLabel(lang, taskType)}</Text>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>
            {t(lang, 'progressType')}: {progressTypeLabel(lang, progressTypeForSkill(skill))} · {
              skillProgress.percent == null
                ? (skillProgress.tracked ? skillProgress.summary : (lang === 'zh' ? '记录型进度' : 'Log-based progress'))
                : `${skillProgress.summary} · ${skillProgress.percent}%`
            }
          </Text>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{scheduleSummary(skill, lang)}</Text>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{t(lang, 'flexibility')}: {flexibilityLabel(lang, skill.flexibility)} · {t(lang, 'rigidity')}: {rigidityLabel(lang, skill.rigidity)}</Text>
          <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>
            {fill(t(lang, 'costProfileShort'), {
              mental: skill.mentalCost ?? profile.mentalCost,
              physical: skill.physicalCost ?? profile.physicalCost,
              emotional: skill.emotionalCost ?? profile.emotionalCost,
              recovery: skill.recoveryImpact ?? profile.recoveryImpact,
              compress: skill.compressibility ?? profile.compressibility,
            })}
          </Text>
        </QuestCard>

        <Text style={[styles.sectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'linkedLocations')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={styles.ruleCard}>
          {linkedLocations.length === 0 ? (
            <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{t(lang, 'notLinkedToAnyGoal')}</Text>
          ) : (
            linkedLocations.map(({ goal, module }) => (
              <View key={`${goal.name}-${module.id}`} style={styles.inlineEntityRow}>
                <QuestEntityIcon icon={goal.emoji} systemIcon={systemIcons.goal} questTheme={questTheme} size="sm" />
                <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{goal.name} &gt; {module.id.includes('-default') ? t(lang, 'defaultModule') : module.name}</Text>
              </View>
            ))
          )}
        </QuestCard>

        <Text style={[styles.sectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'whereSkillFits')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={styles.ruleCard}>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>
            {t(lang, 'linkedTo')}: {linkedLocations.length > 0
              ? linkedLocations.map(({ goal, module }) => `${goal.name} > ${module.id.includes('-default') ? t(lang, 'defaultModule') : module.name}`).join(lang === 'zh' ? '、' : ', ')
              : t(lang, 'notSet')}
          </Text>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>
            {t(lang, 'metricType')}: {progressTypeLabel(lang, progressTypeForSkill(skill))} · {formatMetricSummary(skill, lang)}
          </Text>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{t(lang, 'scheduleStatus')}: {scheduleSummary(skill, lang)}</Text>
          <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{t(lang, 'logsLast7Days')}: {last7LogCount}</Text>
          <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{t(lang, 'next')}: {skillFitNext}</Text>
        </QuestCard>

        <Text style={[styles.sectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'comparableProgress')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={styles.ruleCard}>
          {!comparableEffort ? (
            <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{t(lang, 'notEnoughHistory')}</Text>
          ) : (
            <>
              <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{t(lang, 'latest')}: {formatEffortUnitSummary(comparableEffort.latest, lang)}</Text>
              {comparableEffort.comparison.hasComparison && comparableEffort.comparison.previous ? (
                <>
                  <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>{t(lang, 'previous')}: {formatEffortUnitSummary(comparableEffort.comparison.previous, lang)}</Text>
                  <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>
                    {t(lang, 'change')}: {[
                      comparableEffort.comparison.changes?.durationChange != null ? `${t(lang, 'durationChange')} ${comparableEffort.comparison.changes.durationChange >= 0 ? '+' : ''}${comparableEffort.comparison.changes.durationChange}` : null,
                      comparableEffort.comparison.changes?.weightChange != null ? `${t(lang, 'weightChange')} ${comparableEffort.comparison.changes.weightChange >= 0 ? '+' : ''}${comparableEffort.comparison.changes.weightChange}` : null,
                      comparableEffort.comparison.changes?.volumeChange != null ? `${t(lang, 'volumeChange')} ${comparableEffort.comparison.changes.volumeChange >= 0 ? '+' : ''}${comparableEffort.comparison.changes.volumeChange}` : null,
                    ].filter(Boolean).join(' · ') || t(lang, 'differentDimension')}
                  </Text>
                </>
              ) : (
                <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{t(lang, 'notComparable')}</Text>
              )}
            </>
          )}
        </QuestCard>

        <Text style={[styles.sectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'executionLogs')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={styles.ruleCard}>
          {skillLogs.length === 0 ? (
            <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{t(lang, 'noSkillLogs')}</Text>
          ) : (
            skillLogs.slice(0, 8).map((log) => (
              <View key={log.id} style={[styles.logRow, { borderBottomColor: questTheme.colors.border }]}>
                <Text style={[styles.ruleLine, { color: questTheme.colors.text }]}>
                  {log.date} · {log.durationMinutes} {t(lang, 'minutes')}
                  {log.qualityRating ? ` · ${t(lang, 'quality')} ${log.qualityRating}/5` : ''}
                </Text>
                <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>
                  {[
                    log.actualMentalCost != null ? `${t(lang, 'mentalCost')} ${log.actualMentalCost}` : null,
                    log.actualPhysicalCost != null ? `${t(lang, 'physicalCost')} ${log.actualPhysicalCost}` : null,
                    log.actualEmotionalCost != null ? `${t(lang, 'emotionalCost')} ${log.actualEmotionalCost}` : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
                <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{t(lang, 'progressUpdate')}: {formatMetricUpdateSummary(log, skill, lang)}</Text>
                {log.note ? <Text style={[styles.ruleMuted, { color: questTheme.colors.textMuted }]}>{log.note}</Text> : null}
              </View>
            ))
          )}
        </QuestCard>

        {/* 底部 stats */}
        <View style={styles.statsRow}>
          <StatCard questTheme={questTheme} label={t(lang, 'weeklyInvestment')} value={`${(weeklyMinutes / 60).toFixed(1)}h`} accent={skill.color} />
          <StatCard
            questTheme={questTheme}
            label={t(lang, 'averageQuality')}
            value={avgQuality
              ? `${avgQuality.avg.toFixed(1)}/5`
              : '— —'
            }
            accent={questTheme.colors.accent}
          />
          <StatCard questTheme={questTheme} label={t(lang, 'streak')} value={`${streak} ${t(lang, 'days')}`} accent={questTheme.colors.success} />
        </View>

        {/* 成就里程碑区块 */}
        <View style={styles.cardTitleRow}>
          <QuestIcon name="target" size={18} color={questTheme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'achievements')}</Text>
        </View>
        <QuestCard questTheme={questTheme} variant="flat" style={styles.milestonesCard}>
          {milestones.map((m, idx) => (
            <View
              key={m.hours}
              style={[
                styles.milestoneRow,
                idx < milestones.length - 1 && styles.milestoneRowBorder,
                { borderBottomColor: questTheme.colors.border },
              ]}
            >
              <View style={[
                styles.milestoneBadge,
                { backgroundColor: m.unlocked ? skill.color : questTheme.colors.surfaceSoft },
              ]}>
                <QuestIcon name={m.unlocked ? 'check' : 'target'} size={18} color={m.unlocked ? questTheme.colors.primaryText : questTheme.colors.textSubtle} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.milestoneLabel, { color: questTheme.colors.text }, !m.unlocked && styles.milestoneLocked]}>
                  {fill(t(lang, 'milestone'), { hours: m.hours })}
                </Text>
                {m.unlocked && m.unlockedAt ? (
                  <Text style={[styles.milestoneDate, { color: questTheme.colors.textMuted }]}>{fill(t(lang, 'unlockedAt'), { date: m.unlockedAt })}</Text>
                ) : (
                  <Text style={[styles.milestoneLockHint, { color: questTheme.colors.textMuted }]}>
                    {fill(t(lang, 'unlockAtHours'), { hours: m.hours })}
                  </Text>
                )}
              </View>
              {m.unlocked && (
                <Text style={[styles.milestoneCheck, { color: skill.color }]}>✓</Text>
              )}
            </View>
          ))}
        </QuestCard>

        <Text style={[styles.sectionTitle, { color: questTheme.colors.text }]}>{t(lang, 'dangerZone')}</Text>
        <QuestCard questTheme={questTheme} variant="flat" style={[styles.dangerCard, { borderColor: questTheme.colors.danger }]}>
          <Text style={[styles.dangerText, { color: questTheme.colors.textMuted }]}>{t(lang, 'deleteSkillPermanentBody')}</Text>
          {linkedLocations.length > 0 ? (
            <Text style={[styles.dangerText, { color: questTheme.colors.textMuted }]}>{fill(t(lang, 'linkedLocationsCount'), { count: linkedLocations.length })}</Text>
          ) : null}
          <QuestButton questTheme={questTheme} variant="danger" label={t(lang, 'deleteSkillPermanently')} onPress={confirmDeleteSkill} style={{ alignSelf: 'flex-start' }} />
        </QuestCard>
      </ScrollView>

      {/* 编辑 modal */}
      <SkillForm visible={editing} onClose={() => setEditing(false)} initial={skill} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
// 日 view: 今天每次记录的 timeline
// ─────────────────────────────────────────────────────────
function DayView({ skill, actions, lang }: { skill: Skill; actions: Action[]; lang: 'zh' | 'en' }) {
  const todayStr = fmtDate(new Date());
  const todayActions = actions.filter((a) => a.date === todayStr);
  if (todayActions.length === 0) {
    return <Text style={styles.emptyChart}>{fill(t(lang, 'noSkillCheckinsToday'), { name: skill.name })}</Text>;
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.chartTitle}>{fill(t(lang, 'checkinsTodayWithMinutes'), { minutes: todayActions.reduce((s, a) => s + a.minutes, 0) })}</Text>
      {todayActions.map((a) => (
        <View key={a.id} style={styles.tlRow}>
          <View style={[styles.tlDot, { backgroundColor: skill.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tlMain}>
              {fmtTime(a.createdAt)} · {a.minutes} {t(lang, 'minutes')}
              {a.quality != null ? `  ${qEmoji(a.quality)}` : ''}
            </Text>
            {a.note ? <Text style={styles.tlNote}>{a.note}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function qEmoji(q: number): string {
  return emojiForAvgQuality(q);
}

function MiniLineChart({ values, color }: { values: number[]; color: string }) {
  const width = 300;
  const height = 120;
  const pad = 12;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <View style={{ alignItems: 'center', marginTop: 10 }}>
      <Svg width={width} height={height}>
        <Polyline points={points} fill="none" stroke={color} strokeWidth={3} />
        {points.split(' ').map((point, index) => {
          const [x, y] = point.split(',').map(Number);
          return <Circle key={index} cx={x} cy={y} r={3} fill={color} />;
        })}
      </Svg>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// 周 view: 近 7 天柱图 (只统计本技能)
// ─────────────────────────────────────────────────────────
function WeekView({ skill, actions, lang }: { skill: Skill; actions: Action[]; lang: 'zh' | 'en' }) {
  const days = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const arr: { date: string; label: string; dayNum: number; minutes: number; avgQuality: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const ds = fmtDate(d);
      const dayActs = actions.filter((a) => a.date === ds);
      const minutes = dayActs.reduce((s, a) => s + a.minutes, 0);
      const rated = dayActs.filter((a) => a.quality != null);
      const avgQuality = rated.length
        ? rated.reduce((s, a) => s + (a.quality as number), 0) / rated.length
        : null;
      arr.push({ date: ds, label: t(lang, WEEKDAY_KEYS[d.getDay()]), dayNum: d.getDate(), minutes, avgQuality });
    }
    return arr;
  }, [actions]);

  const maxMin = Math.max(skill.dailyTargetMinutes, ...days.map((d) => d.minutes));
  const totalWeek = days.reduce((s, d) => s + d.minutes, 0);

  return (
    <View>
      <Text style={styles.chartTitle}>{fill(t(lang, 'last7Total'), { minutes: totalWeek })}</Text>
      <View style={styles.barChartRow}>
        {days.map((d) => (
          <View key={d.date} style={styles.barCol}>
            <View style={styles.barEmojiSlot}>
              {d.avgQuality != null && <Text style={styles.barEmoji}>{emojiForAvgQuality(d.avgQuality)}</Text>}
            </View>
            <View style={styles.barWrap}>
              <View style={[styles.barFg, {
                // min 4px so zero-bars still show; opacity distinguishes has-data vs empty
                height: d.minutes > 0 ? `${Math.max(4, (d.minutes / maxMin) * 100)}%` : 4,
                backgroundColor: d.minutes >= skill.dailyTargetMinutes ? theme.success : skill.color,
                opacity: d.minutes > 0 ? 1 : 0.15,
              }]} />
            </View>
            <Text style={styles.barLabel}>{lang === 'zh' ? `周${d.label}` : d.label}</Text>
            <Text style={styles.barDate}>{d.dayNum}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.axis}>{t(lang, 'maxScale')}: {maxMin} {t(lang, 'minutes')}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// 月 view: 30 天小格热力图 (技能色, 深浅表强度)
// 布局: 5 行 × 6 列 = 30 cells, 最近一天在右下
// ─────────────────────────────────────────────────────────
function MonthView({ skill, actions, lang }: { skill: Skill; actions: Action[]; lang: 'zh' | 'en' }) {
  const cells = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const arr: { date: string; dayNum: number; minutes: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const ds = fmtDate(d);
      const minutes = actions.filter((a) => a.date === ds).reduce((s, a) => s + a.minutes, 0);
      arr.push({ date: ds, dayNum: d.getDate(), minutes });
    }
    return arr;
  }, [actions]);

  const maxMin = Math.max(skill.dailyTargetMinutes, ...cells.map((c) => c.minutes), 60);
  const activeDays = cells.filter((c) => c.minutes > 0).length;
  const total = cells.reduce((s, c) => s + c.minutes, 0);

  return (
    <View>
      <Text style={styles.chartTitle}>{fill(t(lang, 'last30Summary'), { days: activeDays, hours: (total / 60).toFixed(1) })}</Text>
      <View style={styles.gridRow}>
        {cells.map((c) => {
          const alpha = c.minutes === 0 ? 0 : Math.max(0.18, Math.min(1, c.minutes / maxMin));
          const bg = c.minutes === 0 ? theme.cardAlt : hexToRgba(skill.color, alpha);
          return (
            <View key={c.date} style={[styles.gridCell, { backgroundColor: bg }]}>
              <Text style={styles.gridDay}>{c.dayNum}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>{t(lang, 'less')}</Text>
        {[0.2, 0.4, 0.6, 0.8, 1].map((a) => (
          <View key={a} style={[styles.legendDot, { backgroundColor: hexToRgba(skill.color, a) }]} />
        ))}
        <Text style={styles.legendText}>{t(lang, 'more')}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// 全部 view: 累计时长折线图
// ─────────────────────────────────────────────────────────
function AllView({ skill, actions, lang }: { skill: Skill; actions: Action[]; lang: 'zh' | 'en' }) {
  // 按日聚合然后做累加
  const series = useMemo(() => {
    if (actions.length === 0) return [];
    const byDate = new Map<string, number>();
    actions.forEach((a) => byDate.set(a.date, (byDate.get(a.date) ?? 0) + a.minutes));
    const dates = Array.from(byDate.keys()).sort();
    let cum = 0;
    return dates.map((d) => {
      cum += byDate.get(d)!;
      return { date: d, cumHours: cum / 60 };
    });
  }, [actions]);

  if (series.length === 0) {
    return <Text style={styles.emptyChart}>{fill(t(lang, 'noSkillCheckinsToday'), { name: skill.name })}</Text>;
  }
  if (series.length === 1) {
    return (
      <View>
        <Text style={styles.chartTitle}>{fill(t(lang, 'cumulativeHours'), { hours: series[0].cumHours.toFixed(1) })}</Text>
        <Text style={styles.emptyChart}>{t(lang, 'patternLocked')}</Text>
      </View>
    );
  }

  const width = 300;
  const height = 180;
  const padL = 32, padR = 12, padT = 12, padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const maxY = Math.max(...series.map((s) => s.cumHours));

  // x: 日期均匀分布 (按索引而非真实时间间隔, 简洁)
  const points = series.map((s, i) => {
    const x = padL + (i / (series.length - 1)) * innerW;
    const y = padT + (1 - s.cumHours / maxY) * innerH;
    return { x, y, label: s.date, val: s.cumHours };
  });

  const polylinePts = points.map((p) => `${p.x},${p.y}`).join(' ');

  // 简化 x 轴标签: 第一个、最后一个、中间一个
  const ticks = [
    points[0],
    points[Math.floor(points.length / 2)],
    points[points.length - 1],
  ];

  return (
    <View>
      <Text style={styles.chartTitle}>{fill(t(lang, 'cumulativeDays'), { hours: series[series.length - 1].cumHours.toFixed(1), days: series.length })}</Text>
      <View style={{ alignItems: 'center' }}>
        <Svg width={width} height={height}>
          {/* y 轴: 4 条横线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const y = padT + (1 - f) * innerH;
            return (
              <React.Fragment key={i}>
                <Line x1={padL} x2={width - padR} y1={y} y2={y} stroke={theme.border} strokeWidth={1} strokeOpacity={0.5} />
                <SvgText x={4} y={y + 4} fontSize={10} fill={theme.textDim}>
                  {(f * maxY).toFixed(1)}
                </SvgText>
              </React.Fragment>
            );
          })}
          {/* 折线 */}
          <Polyline points={polylinePts} fill="none" stroke={skill.color} strokeWidth={2.5} />
          {/* 数据点 */}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={skill.color} />
          ))}
          {/* x 轴标签 */}
          {ticks.map((t, i) => (
            <SvgText
              key={i} x={t.x} y={height - 6} fontSize={9} fill={theme.textDim}
              textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}
            >
              {t.label.slice(5)}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// stat 卡
// ─────────────────────────────────────────────────────────
function StatCard({ label, value, accent, questTheme }: { label: string; value: string; accent: string; questTheme: ReturnType<typeof getQuestTheme> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: questTheme.colors.surface, borderColor: questTheme.colors.border }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: questTheme.colors.textMuted }]}>{label}</Text>
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

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12 },
  inlineEntityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  iconBox: { width: 60, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.text, fontSize: 24, fontWeight: '700' },
  catBadge: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: theme.cardAlt, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  catBadgeText: { color: theme.textDim, fontSize: 12, fontWeight: '600' },

  rangeRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  rangePill: {
    flex: 1, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card,
    alignItems: 'center',
  },
  rangePillText: { color: theme.text, fontSize: 14, fontWeight: '600' },

  chartCard: { backgroundColor: theme.card, padding: 14, borderRadius: 12, marginTop: 12, minHeight: 220 },
  compoundCard: { backgroundColor: theme.card, padding: 14, borderRadius: 14, marginTop: 16, borderWidth: 1, borderColor: theme.border },
  chartTitle: { color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 12 },
  emptyChart: { color: theme.textDim, textAlign: 'center', paddingVertical: 40, fontStyle: 'italic' },

  // timeline (day)
  tlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: theme.cardAlt, padding: 12, borderRadius: 10 },
  tlDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  tlMain: { color: theme.text, fontSize: 14, fontWeight: '600' },
  tlNote: { color: theme.textDim, fontSize: 12, marginTop: 4 },

  // bar (week)
  barChartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barEmojiSlot: { height: 20, justifyContent: 'flex-end' },
  barEmoji: { fontSize: 14 },
  barWrap: { flex: 1, width: '70%', borderRadius: 6, backgroundColor: theme.cardAlt, justifyContent: 'flex-end', overflow: 'hidden', marginTop: 2 },
  barFg: { width: '100%', borderRadius: 6 },
  barLabel: { color: theme.text, fontSize: 11, fontWeight: '600', marginTop: 6 },
  barDate: { color: theme.textDim, fontSize: 10 },
  axis: { color: theme.textDim, fontSize: 10, textAlign: 'right', marginTop: 8 },

  // grid (month)
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: {
    width: '15%', aspectRatio: 1, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  gridDay: { color: theme.text, fontSize: 11, opacity: 0.85, fontWeight: '600' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' },
  legendDot: { width: 14, height: 14, borderRadius: 4 },
  legendText: { color: theme.textDim, fontSize: 11 },

  // stats
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, backgroundColor: theme.card, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { color: theme.textDim, fontSize: 11, marginTop: 6 },

  // 成就里程碑
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  ruleCard: { backgroundColor: theme.card, borderRadius: 14, padding: 14, gap: 8 },
  logRow: { paddingBottom: 10, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  ruleLine: { color: theme.text, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  ruleMuted: { color: theme.textDim, fontSize: 12, lineHeight: 18 },
  dangerCard: { backgroundColor: theme.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F3B4B4', gap: 10 },
  dangerText: { color: theme.textDim, fontSize: 12, lineHeight: 18 },
  dangerBtn: { alignSelf: 'flex-start', borderRadius: 14, borderWidth: 1, borderColor: '#E5484D', paddingHorizontal: 12, paddingVertical: 8 },
  dangerBtnText: { color: '#E5484D', fontSize: 12, fontWeight: '900' },
  milestonesCard: { backgroundColor: theme.card, borderRadius: 14, overflow: 'hidden' },
  milestoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  milestoneRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  milestoneBadge: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneBadgeText: { fontSize: 20 },
  milestoneLabel: { color: theme.text, fontSize: 15, fontWeight: '600' },
  milestoneLocked: { color: theme.textDim, opacity: 0.5 },
  milestoneDate: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  milestoneLockHint: { color: theme.textDim, fontSize: 12, marginTop: 2, opacity: 0.6 },
  milestoneCheck: { fontSize: 18, fontWeight: '700' },
});
