import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { getLanguage, t, type Lang } from '../i18n';
import { getQuestTheme, questLayout } from '../design/tokens';
import { isDarkTheme } from '../design/darkSurfaceGuard';
import { getAppCoreLoopStatus } from '../utils/coreLoop';
import { generateInsightsSummary } from '../utils/insightsEngine';
import {
  buildMetacognitionSummary,
  getLiveExecutionLogs,
} from '../utils/metacognition';
import { buildObjectiveContextBrief } from '../utils/objectiveContextBrief';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import { V11GlassSheet, V11Pill } from '../v11/components/V11Material';
import {
  getV11ThemeTokens,
  v11Spacing,
  v11Typography,
  type V11EvidenceStage,
} from '../v11/tokens';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import V11InsightsAdvancedCanvas from './V11InsightsAdvancedCanvas';
import V11InsightsEvidenceSheet, {
  type V11InsightsDetailSelection,
} from './V11InsightsEvidenceSheet';
import {
  getV11InsightsDebugLanguage,
  getV11InsightsDebugTheme,
} from '../v11/featureFlag';
import {
  buildV11InsightsPresentation,
  type V11AdvancedModeId,
  type V11InsightCopy,
  type V11InsightsEvidenceItem,
  type V11InsightsView,
  type V11PatternFilter,
  type V11PatternRow,
  type V11TrendPoint,
} from './insightsPresentation';
import {
  V11DistributionBars,
  V11EvidenceStageMarker,
  V11TrendCanvas,
} from './V11InsightsVisuals';
import '../v11/v11-components.css';
import './v11-insights.css';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

type PerformanceResult = {
  p50: number;
  p95: number;
  over20: number;
  frames: number;
};

function query() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function initialView(): V11InsightsView {
  const value = query().get('insightsMode');
  return value === 'trends' || value === 'patterns' || value === 'advanced'
    ? value
    : 'overview';
}

function initialAdvancedMode(): V11AdvancedModeId {
  const value = query().get('analysis') as V11AdvancedModeId | null;
  const supported: V11AdvancedModeId[] = [
    'ability',
    'tomorrow',
    'monthly',
    'growth',
    'anomalies',
    'combination',
    'self_knowledge',
    'weekly_execution',
    'rescue',
    'system_loop',
  ];
  return value && supported.includes(value) ? value : 'ability';
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function copy(language: Lang, value: V11InsightCopy) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function stageLabel(language: Lang, stage: V11EvidenceStage) {
  return t(language, `stage3Evidence${stage}`);
}

function viewStage(
  view: V11InsightsView,
  overview: V11EvidenceStage,
  trends: V11EvidenceStage,
  patterns: V11EvidenceStage,
  advanced: V11EvidenceStage,
) {
  if (view === 'trends') return trends;
  if (view === 'patterns') return patterns;
  if (view === 'advanced') return advanced;
  return overview;
}

function usePerformanceProbe({
  debug,
  detailOpen,
  themeMode,
  view,
}: {
  debug: boolean;
  detailOpen: boolean;
  themeMode: string;
  view: V11InsightsView;
}) {
  const [result, setResult] = useState<PerformanceResult | null>(null);

  useEffect(() => {
    if (!debug || typeof window === 'undefined') return;
    let cancelled = false;
    let frame = 0;
    let previous = performance.now();
    const deltas: number[] = [];
    let handle = 0;

    const sample = (time: number) => {
      if (cancelled) return;
      const delta = time - previous;
      previous = time;
      if (frame > 4) deltas.push(delta);
      frame += 1;
      if (frame < 150) {
        handle = window.requestAnimationFrame(sample);
        return;
      }
      const sorted = deltas.slice().sort((a, b) => a - b);
      const percentile = (value: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))] ?? 0;
      const next = {
        p50: Math.round(percentile(0.5) * 10) / 10,
        p95: Math.round(percentile(0.95) * 10) / 10,
        over20: sorted.filter((value) => value > 20).length,
        frames: sorted.length,
      };
      setResult(next);
      (window as any).__questlifeV11InsightsPerformance = {
        ...next,
        view,
        detailOpen,
        themeMode,
        measuredAt: new Date().toISOString(),
      };
      console.log('[v11 insights performance]', JSON.stringify((window as any).__questlifeV11InsightsPerformance));
    };

    handle = window.requestAnimationFrame(sample);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(handle);
    };
  }, [debug, detailOpen, themeMode, view]);

  return result;
}

function EvidenceRow({
  item,
  language,
  onPress,
  theme,
}: {
  item: V11InsightsEvidenceItem;
  language: Lang;
  onPress: () => void;
  theme: ReturnType<typeof getV11ThemeTokens>;
}) {
  return (
    <WebPressable
      accessibilityLabel={copy(language, item.title)}
      accessibilityRole="button"
      dataSet={{ 'v11-insights-role': 'evidence-row' }}
      onPress={onPress}
    >
      <WebView dataSet={{ 'v11-insights-role': 'evidence-index' }}>
        <V11RebaselineIcon color={theme.text.metadata} name="activity" size={17} />
      </WebView>
      <WebView dataSet={{ 'v11-insights-role': 'evidence-copy' }}>
        <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{copy(language, item.title)}</Text>
        <Text style={{ color: theme.text.primary, ...v11Typography.body }}>{copy(language, item.detail)}</Text>
      </WebView>
      <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={16} />
    </WebPressable>
  );
}

function PatternRow({
  language,
  onPress,
  pattern,
  theme,
}: {
  language: Lang;
  onPress: () => void;
  pattern: V11PatternRow;
  theme: ReturnType<typeof getV11ThemeTokens>;
}) {
  return (
    <WebPressable
      accessibilityLabel={copy(language, pattern.title)}
      accessibilityRole="button"
      dataSet={{ 'v11-insights-role': 'pattern-row' }}
      onPress={onPress}
    >
      <WebView dataSet={{ 'v11-insights-role': 'pattern-status' }}>
        <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, `stage3Pattern_${pattern.status}`)}</Text>
        <Text style={{ color: theme.text.secondary, fontSize: 18, lineHeight: 24, fontWeight: '400' }}>{pattern.evidenceCount}</Text>
      </WebView>
      <WebView dataSet={{ 'v11-insights-role': 'pattern-copy' }}>
        <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>{copy(language, pattern.title)}</Text>
        <Text numberOfLines={2} style={{ color: theme.text.secondary, ...v11Typography.body }}>{copy(language, pattern.description)}</Text>
      </WebView>
      <V11RebaselineIcon color={theme.text.secondary} name="arrow" size={16} />
    </WebPressable>
  );
}

export default function V11InsightsScreen() {
  const { data } = useStore();
  const navigation = useNavigation<any>();
  const language = getV11InsightsDebugLanguage() ?? getLanguage(data.settings.language);
  const debugTheme = getV11InsightsDebugTheme();
  const questTheme = getQuestTheme(
    debugTheme === 'light'
      ? 'cleanFocus'
      : debugTheme === 'dark'
        ? 'deepWork'
        : data.settings.selectedThemeId,
  );
  const theme = getV11ThemeTokens(isDarkTheme(questTheme) ? 'dark' : 'light');
  const reducedMotion = useV11ReducedMotion() || query().get('debugReducedMotion') === '1';
  const [view, setView] = useState<V11InsightsView>(initialView);
  const [overviewExpanded, setOverviewExpanded] = useState(query().get('layer') === 'l2');
  const [patternFilter, setPatternFilter] = useState<V11PatternFilter>('accepted');
  const [advancedModeId, setAdvancedModeId] = useState<V11AdvancedModeId>(initialAdvancedMode);
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<V11InsightsDetailSelection>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const liveLogs = useMemo(
    () => getLiveExecutionLogs(data.executionLogs || [], { skills: data.skills }),
    [data.executionLogs, data.skills],
  );
  const timedLogs = useMemo(
    () => liveLogs.filter((log) => (log.durationMinutes ?? 0) > 0),
    [liveLogs],
  );
  const engine = useMemo(
    () => generateInsightsSummary(timedLogs, data.stateCheckIns || [], data.skills),
    [data.skills, data.stateCheckIns, timedLogs],
  );
  const metacognition = useMemo(() => buildMetacognitionSummary({
    executionLogs: liveLogs,
    stateCheckIns: data.stateCheckIns || [],
    skills: data.skills,
    goals: data.categories,
    contextLogs: data.contextLogs || [],
  }), [data.categories, data.contextLogs, data.skills, data.stateCheckIns, liveLogs]);
  const objectiveContext = useMemo(
    () => buildObjectiveContextBrief(data.contextLogs || []),
    [data.contextLogs],
  );
  const selfKnowledge = useMemo(() => {
    const predicted = liveLogs.filter((log) => log.predictedDurationMinutes != null && log.durationMinutes != null);
    if (predicted.length < 3) return null;
    const durationError = predicted.reduce(
      (sum, log) => sum + Math.abs((log.durationMinutes ?? 0) - (log.predictedDurationMinutes ?? 0)),
      0,
    ) / predicted.length;
    const qualityLogs = liveLogs.filter((log) => log.predictedQualityRating != null && log.qualityRating != null);
    const qualityError = qualityLogs.length > 0
      ? qualityLogs.reduce(
        (sum, log) => sum + Math.abs((log.qualityRating ?? 0) - (log.predictedQualityRating ?? 0)),
        0,
      ) / qualityLogs.length
      : null;
    const weeks = new Map<string, { total: number; count: number }>();
    predicted.forEach((log) => {
      const date = new Date(`${log.date}T00:00:00`);
      date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const key = formatDate(date);
      const row = weeks.get(key) ?? { total: 0, count: 0 };
      row.total += Math.abs((log.durationMinutes ?? 0) - (log.predictedDurationMinutes ?? 0));
      row.count += 1;
      weeks.set(key, row);
    });
    return {
      durationError,
      qualityError,
      weeks: Array.from(weeks.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(-8)
        .map(([week, row]) => ({ week, error: row.count > 0 ? row.total / row.count : 0 })),
    };
  }, [liveLogs]);
  const rescue = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    const startKey = formatDate(start);
    const rows = (data.rescueLogs || []).filter((row) => row.date >= startKey);
    const completed = rows.filter((row) => row.activationStepCompleted).length;
    return {
      total: rows.length,
      completed,
      completionRate: rows.length > 0 ? Math.round(completed / rows.length * 100) : 0,
    };
  }, [data.rescueLogs]);
  const appLoop = useMemo(
    () => getAppCoreLoopStatus({ ...data, executionLogs: liveLogs }, language),
    [data, language, liveLogs],
  );
  const presentation = useMemo(() => buildV11InsightsPresentation({
    now: new Date(),
    liveLogs,
    stateCheckIns: data.stateCheckIns || [],
    skills: data.skills,
    patternMemory: data.patternMemory || [],
    metacognition,
    objectiveContext,
    engine,
    selfKnowledge,
    rescue,
    loop: {
      activeGoals: appLoop.activeGoals,
      totalGoals: appLoop.totalGoals,
      skillsWithLogs: appLoop.skillsWithLogs,
      totalSkills: appLoop.totalSkills,
      scheduledBlocksThisWeek: appLoop.scheduledBlocksThisWeek,
      executionLogsThisWeek: appLoop.executionLogsThisWeek,
    },
  }), [appLoop, data.patternMemory, data.skills, data.stateCheckIns, engine, liveLogs, metacognition, objectiveContext, rescue, selfKnowledge]);
  const selectedAdvancedMode = presentation.advanced.modes.find((mode) => mode.id === advancedModeId)
    ?? presentation.advanced.modes[0];
  const selectedStage = viewStage(
    view,
    presentation.overview.stage,
    presentation.trends.stage,
    presentation.patterns.stage,
    selectedAdvancedMode?.status === 'available'
      ? selectedAdvancedMode.confidence === 'high' ? 'S3' : 'S2'
      : presentation.advanced.stage,
  );
  const debugPerformance = query().get('debugPerformance') === '1';
  const performanceResult = usePerformanceProbe({
    debug: debugPerformance,
    detailOpen: detail != null,
    themeMode: theme.mode,
    view,
  });

  const changeView = useCallback((next: V11InsightsView) => {
    setView(next);
    setDetail(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('insightsMode', next);
      window.history.pushState({ insightsMode: next }, '', url);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => setView(initialView());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openTrend = useCallback((point: V11TrendPoint) => {
    setSelectedTrendDate(point.date);
    setDetail({ kind: 'trend', item: point });
  }, []);

  const patternRows = presentation.patterns.rows.filter((row) => row.status === patternFilter);
  const cssVariables = {
    '--v11-insights-bg': theme.field.background,
    '--v11-insights-near': theme.field.near,
    '--v11-insights-middle': theme.field.middle,
    '--v11-insights-far': theme.field.far,
    '--v11-insights-grid': theme.field.grid,
    '--v11-insights-text': theme.text.primary,
    '--v11-insights-secondary': theme.text.secondary,
    '--v11-insights-metadata': theme.text.metadata,
    '--v11-insights-primary': theme.glow.primary,
    '--v11-insights-supporting': theme.glow.supporting,
    '--v11-insights-border': theme.questTheme.colors.border,
    '--v11-insights-surface': theme.questTheme.colors.surface,
    '--v11-insights-surface-soft': theme.questTheme.colors.surfaceSoft,
    '--v11-insights-bottom-inset': `${questLayout.contentBottomInset + v11Spacing.lg}px`,
  } as any;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.field.background }}>
      <WebView
        dataSet={{
          'v11-insights-role': 'root',
          'v11-motion': reducedMotion ? 'reduced' : 'normal',
          'v11-stage': selectedStage.toLowerCase(),
          'v11-theme': theme.mode,
        }}
        style={cssVariables}
      >
        <WebView dataSet={{ 'v11-insights-role': 'field' }} pointerEvents="none" />
        <V11GlowOrb stage={selectedStage} style={{ position: 'absolute', top: 78, left: '7%' }} theme={theme} />
        <V11GlowOrb stage={selectedStage} style={{ position: 'absolute', top: 310, right: '8%' }} theme={theme} tone="supporting" />

        <WebScrollView
          contentContainerStyle={{ paddingBottom: questLayout.contentBottomInset + v11Spacing.lg }}
          dataSet={{ 'v11-insights-role': 'scroll' }}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
        >
          <WebView dataSet={{ 'v11-insights-role': 'content' }}>
            <WebView dataSet={{ 'v11-insights-role': 'context-row' }}>
              <WebView>
                <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage3QuestionRange')}</Text>
                <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 17 }}>
                  {presentation.range.start} – {presentation.range.end}
                </Text>
              </WebView>
              <WebView dataSet={{ 'v11-insights-role': 'stage-context' }}>
                <V11EvidenceStageMarker
                  accessibilityLabel={`${t(language, 'v11EvidenceStage')}: ${stageLabel(language, selectedStage)}`}
                  stage={selectedStage}
                  theme={theme}
                />
                <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{stageLabel(language, selectedStage)}</Text>
              </WebView>
            </WebView>

            <WebView accessibilityRole="tablist" dataSet={{ 'v11-insights-role': 'mode-switch' }}>
              {(['overview', 'trends', 'patterns', 'advanced'] as const).map((item) => (
                <WebPressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: view === item }}
                  dataSet={{ 'v11-selected': view === item ? 'true' : 'false' }}
                  key={item}
                  onPress={() => changeView(item)}
                >
                  <Text style={{ color: view === item ? theme.text.primary : theme.text.metadata }}>
                    {t(language, `stage3Mode_${item}`)}
                  </Text>
                </WebPressable>
              ))}
            </WebView>

            {view === 'overview' ? (
              <WebView dataSet={{ 'v11-insights-role': 'overview' }}>
                <WebView dataSet={{ 'v11-insights-role': 'analysis-question' }}>
                  <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage3StrongestSignalQuestion')}</Text>
                  <Text style={{ color: theme.text.primary }}>{copy(language, presentation.overview.primary.title)}</Text>
                  <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{copy(language, presentation.overview.primary.body)}</Text>
                </WebView>

                <V11GlassSheet
                  contentStyle={{ padding: 22, gap: v11Spacing.lg }}
                  minHeight={190}
                  stage={selectedStage}
                  style={{ width: '100%' }}
                  theme={theme}
                >
                  <WebPressable
                    accessibilityLabel={t(language, overviewExpanded ? 'stage3HideEvidence' : 'stage3ShowEvidence')}
                    accessibilityRole="button"
                    dataSet={{ 'v11-insights-role': 'overview-signal' }}
                    onPress={() => setOverviewExpanded((current) => !current)}
                  >
                    <WebView>
                      <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'keyEvidence')}</Text>
                      <Text style={{ color: theme.text.primary, fontSize: 19, lineHeight: 27, fontWeight: '400' }}>
                        {presentation.overview.evidence.length > 0
                          ? copy(language, presentation.overview.evidence[0].detail)
                          : t(language, 'stage3NoEvidenceYet')}
                      </Text>
                    </WebView>
                    <V11RebaselineIcon color={theme.text.secondary} name={overviewExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
                  </WebPressable>

                  {overviewExpanded ? (
                    <WebView dataSet={{ 'v11-insights-role': 'overview-l2' }}>
                      {presentation.overview.evidence.map((item) => (
                        <EvidenceRow
                          item={item}
                          key={item.id}
                          language={language}
                          onPress={() => setDetail({ kind: 'evidence', item })}
                          theme={theme}
                        />
                      ))}
                    </WebView>
                  ) : null}

                  <WebView dataSet={{ 'v11-insights-role': 'limitation' }}>
                    <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'stage3KnownLimitation')}</Text>
                    <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>
                      {copy(language, presentation.overview.limitation) || t(language, 'stage3NoAdditionalLimitation')}
                    </Text>
                  </WebView>
                </V11GlassSheet>

                <V11Pill
                  accessibilityLabel={copy(language, presentation.overview.nextAction)}
                  contentStyle={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  height={58}
                  onPress={() => navigation.navigate('Today')}
                  stage={selectedStage}
                  theme={theme}
                >
                  <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 20, fontWeight: '500', flex: 1 }} numberOfLines={2}>
                    {copy(language, presentation.overview.nextAction)}
                  </Text>
                  <V11RebaselineIcon color={theme.text.primary} name="arrow" size={18} />
                </V11Pill>
              </WebView>
            ) : null}

            {view === 'trends' ? (
              <WebView dataSet={{ 'v11-insights-role': 'trends' }}>
                <WebView dataSet={{ 'v11-insights-role': 'analysis-question' }}>
                  <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage3TrendQuestionLabel')}</Text>
                  <Text style={{ color: theme.text.primary }}>{t(language, 'stage3TrendQuestion')}</Text>
                  <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>
                    {presentation.trends.status === 'available'
                      ? t(language, 'stage3TrendAvailableSummary')
                      : copy(language, presentation.trends.limitation)}
                  </Text>
                </WebView>

                <V11GlassSheet contentStyle={{ padding: 20, gap: v11Spacing.md }} minHeight={340} stage={presentation.trends.stage} theme={theme}>
                  <WebView dataSet={{ 'v11-insights-role': 'trend-provenance' }}>
                    <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>{t(language, 'recordedExecutionDuration')}</Text>
                    <Text style={{ color: theme.text.secondary, ...v11Typography.metadata }}>
                      {t(language, 'sampleN')}: {presentation.trends.sampleCount} · {t(language, 'activeDays')}: {presentation.trends.activeDays}
                    </Text>
                  </WebView>
                  <V11TrendCanvas
                    accessibilityLabel={t(language, 'stage3TrendVisualLabel')}
                    baselineMinutes={presentation.trends.baselineMinutes}
                    onSelectPoint={openTrend}
                    points={presentation.trends.points}
                    selectedDate={selectedTrendDate}
                    theme={theme}
                  />
                  <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
                    {copy(language, presentation.trends.limitation)}
                  </Text>
                </V11GlassSheet>

                {presentation.trends.skillAllocation.length > 0 ? (
                  <WebView dataSet={{ 'v11-insights-role': 'secondary-analysis' }}>
                    <Text style={{ color: theme.text.primary, ...v11Typography.title }}>{t(language, 'timeBySkill')}</Text>
                    <V11DistributionBars
                      accessibilityLabel={t(language, 'stage3AllocationVisualLabel')}
                      rows={presentation.trends.skillAllocation.map((row) => ({
                        id: row.id,
                        label: row.label,
                        value: row.minutes,
                        meta: `${row.minutes}m`,
                      }))}
                      theme={theme}
                    />
                  </WebView>
                ) : null}
              </WebView>
            ) : null}

            {view === 'patterns' ? (
              <WebView dataSet={{ 'v11-insights-role': 'patterns' }}>
                <WebView dataSet={{ 'v11-insights-role': 'analysis-question' }}>
                  <Text style={{ color: theme.text.metadata, ...v11Typography.label }}>{t(language, 'stage3PatternQuestionLabel')}</Text>
                  <Text style={{ color: theme.text.primary }}>{t(language, 'stage3PatternQuestion')}</Text>
                  <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{t(language, 'stage3PatternsNonCausal')}</Text>
                </WebView>

                <WebView accessibilityRole="tablist" dataSet={{ 'v11-insights-role': 'pattern-filter' }}>
                  {(['accepted', 'candidate', 'archived'] as const).map((status) => (
                    <WebPressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: patternFilter === status }}
                      dataSet={{ 'v11-selected': patternFilter === status ? 'true' : 'false' }}
                      key={status}
                      onPress={() => setPatternFilter(status)}
                    >
                      <Text style={{ color: patternFilter === status ? theme.text.primary : theme.text.metadata }}>
                        {t(language, `stage3Pattern_${status}`)} · {presentation.patterns.counts[status]}
                      </Text>
                    </WebPressable>
                  ))}
                </WebView>

                {patternRows.length > 0 ? (
                  <WebView dataSet={{ 'v11-insights-role': 'pattern-list' }}>
                    {patternRows.map((pattern) => (
                      <PatternRow
                        key={pattern.id}
                        language={language}
                        onPress={() => setDetail({ kind: 'pattern', item: pattern })}
                        pattern={pattern}
                        theme={theme}
                      />
                    ))}
                  </WebView>
                ) : (
                  <WebView dataSet={{ 'v11-insights-role': 'empty-state' }}>
                    <Text style={{ color: theme.text.primary, fontSize: 20, lineHeight: 28, fontWeight: '400' }}>{t(language, 'stage3NoPatternsInState')}</Text>
                    <Text style={{ color: theme.text.secondary, ...v11Typography.body }}>{t(language, 'stage3PatternEmptyGuidance')}</Text>
                  </WebView>
                )}
              </WebView>
            ) : null}

            {view === 'advanced' && selectedAdvancedMode ? (
              <WebView dataSet={{ 'v11-insights-role': 'advanced' }}>
                <WebScrollView
                  contentContainerStyle={{ gap: v11Spacing.xs, paddingRight: v11Spacing.lg }}
                  dataSet={{ 'v11-insights-role': 'analysis-mode-strip' }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                >
                  {presentation.advanced.modes.map((mode) => (
                    <WebPressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: mode.id === selectedAdvancedMode.id }}
                      dataSet={{ 'v11-selected': mode.id === selectedAdvancedMode.id ? 'true' : 'false' }}
                      key={mode.id}
                      onPress={() => {
                        setAdvancedModeId(mode.id);
                        if (typeof window !== 'undefined') {
                          const url = new URL(window.location.href);
                          url.searchParams.set('analysis', mode.id);
                          window.history.replaceState(window.history.state, '', url);
                        }
                      }}
                    >
                      <Text style={{ color: mode.id === selectedAdvancedMode.id ? theme.text.primary : theme.text.metadata }}>
                        {t(language, mode.titleKey)}
                      </Text>
                    </WebPressable>
                  ))}
                </WebScrollView>

                <V11GlassSheet contentStyle={{ padding: 22 }} minHeight={420} stage={selectedStage} theme={theme}>
                  <V11InsightsAdvancedCanvas
                    language={language}
                    mode={selectedAdvancedMode}
                    onOpenDetail={() => setDetail({ kind: 'advanced', item: selectedAdvancedMode })}
                    onSelectTrend={openTrend}
                    theme={theme}
                  />
                </V11GlassSheet>
              </WebView>
            ) : null}

            {debugPerformance && performanceResult ? (
              <WebView dataSet={{ 'v11-insights-role': 'performance-readout' }}>
                <Text style={{ color: theme.text.metadata, ...v11Typography.metadata }}>
                  P50 {performanceResult.p50}ms · P95 {performanceResult.p95}ms · &gt;20ms {performanceResult.over20}/{performanceResult.frames}
                </Text>
              </WebView>
            ) : null}
          </WebView>
        </WebScrollView>

        <V11InsightsEvidenceSheet
          language={language}
          onClose={() => setDetail(null)}
          reducedMotion={reducedMotion}
          selection={detail}
          theme={theme}
        />
      </WebView>
    </SafeAreaView>
  );
}
