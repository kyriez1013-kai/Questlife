import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { t, type Lang } from '../i18n';
import {
  getV11ThemeTokens,
  v11Spacing,
  type V11ThemeMode,
} from '../v11/tokens';
import V11GlowOrb from '../v11/components/V11GlowOrb';
import { V11Pill } from '../v11/components/V11Material';
import useV11ReducedMotion from '../v11/useV11ReducedMotion';
import '../v11/v11-components.css';
import './v11-stage2-rebaseline.css';
import {
  buildRebaselineFixture,
  type RebaselineScenario,
} from './fixtures';
import V11Stage2RebaselineSheet, {
  type RebaselineSheet,
} from './V11Stage2RebaselineSheet';
import V11CalibrationRail from './V11CalibrationRail';
import V11RebaselineIcon, {
  type V11RebaselineIconName,
} from './V11RebaselineIcon';

const WebView = View as any;
const WebPressable = Pressable as any;
const WebScrollView = ScrollView as any;

function query() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function initialScenario(): RebaselineScenario {
  const params = query();
  if (params.get('debugDecision') !== '1') return 's1';
  const fixture = params.get('fixture')?.toLowerCase();
  return fixture === 's0' || fixture === 's1' || fixture === 's3'
    ? fixture
    : 's1';
}

function initialTheme(): V11ThemeMode {
  return query().get('theme') === 'light' ? 'light' : 'dark';
}

function initialLanguage(): Lang {
  return query().get('lang') === 'en' ? 'en' : 'zh';
}

function initialLayerExpanded() {
  return query().get('layer') === 'l2';
}

function initialSheet(): RebaselineSheet {
  const value = query().get('sheet');
  return value === 'capture'
    || value === 'state'
    || value === 'state-detail'
    || value === 'decision'
    || value === 'history'
    || value === 'record'
    ? value
    : null;
}

function copy(
  language: Lang,
  value: { kind: 'i18n'; key: string; values?: Record<string, string | number> }
    | { kind: 'text'; text: string },
) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(`{${key}}`, String(replacement)),
    t(language, value.key),
  );
}

function stageLabelKey(scenario: RebaselineScenario) {
  if (scenario === 's0') return 'rebaselineStageUncalibrated';
  if (scenario === 's1') return 'rebaselineStageFirstObservation';
  return 'rebaselineStageStablePattern';
}

function stateLabelKey(value: number) {
  return ['veryBad', 'bad', 'average', 'good', 'great'][Math.max(0, Math.min(4, value - 1))];
}

function navItems(language: Lang): Array<{
  icon: V11RebaselineIconName;
  key: string;
  label: string;
}> {
  return [
    { icon: 'home', key: 'today', label: t(language, 'today') },
    { icon: 'target', key: 'goals', label: t(language, 'quest') },
    { icon: 'calendar', key: 'schedule', label: t(language, 'schedule') },
    { icon: 'insights', key: 'insights', label: t(language, 'insights') },
    { icon: 'settings', key: 'settings', label: t(language, 'settings') },
  ];
}

export default function V11Stage2RebaselineScreen() {
  const [scenario, setScenario] = useState<RebaselineScenario>(initialScenario);
  const [themeMode, setThemeMode] = useState<V11ThemeMode>(initialTheme);
  const [language, setLanguage] = useState<Lang>(initialLanguage);
  const [expanded, setExpanded] = useState(initialLayerExpanded);
  const [sheet, setSheet] = useState<RebaselineSheet>(initialSheet);
  const [instantExpanded, setInstantExpanded] = useState(
    query().get('instant') === 'open',
  );
  const [quickStateExpanded, setQuickStateExpanded] = useState(
    initialScenario() === 's0',
  );
  const [instantStatus, setInstantStatus] = useState<'idle' | 'generating' | 'ready' | 'fallback' | 'error'>(
    initialScenario() === 's0' ? 'idle' : 'ready',
  );
  const [feedback, setFeedback] = useState<'useful' | 'not_useful' | null>(
    query().get('feedback') === 'not_useful'
      ? 'not_useful'
      : query().get('feedback') === 'useful'
        ? 'useful'
        : buildRebaselineFixture(initialScenario()).instantFeedback,
  );
  const [stateValue, setStateValue] = useState<number | null>(null);
  const [pendingStateValue, setPendingStateValue] = useState<number | null>(null);
  const [stateSaveStatus, setStateSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [stateRecordedAt, setStateRecordedAt] = useState<'fixture' | 'just_now' | null>(
    initialScenario() === 's0' ? null : 'fixture',
  );
  const stateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const instantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fixture = useMemo(() => buildRebaselineFixture(scenario), [scenario]);
  const calibratedDecision = useMemo(
    () => scenario === 's0' && stateValue != null
      ? buildRebaselineFixture('s1').decision
      : fixture.decision,
    [fixture.decision, scenario, stateValue],
  );
  const displayScenario: RebaselineScenario = scenario === 's0' && stateValue != null
    ? 's1'
    : scenario;
  const theme = getV11ThemeTokens(themeMode);
  const reading = stateValue ?? calibratedDecision.reading.value;
  const systemReducedMotion = useV11ReducedMotion();
  const reducedMotion = systemReducedMotion || query().get('reducedMotion') === '1';
  const debugPerformance = query().get('debugPerformance') === '1';
  const debugControls = query().get('debugDecision') === '1'
    && query().get('debugControls') === '1';
  const effectiveStage = calibratedDecision.evidenceStage;
  const cssVariables = {
    '--v11-rebaseline-bg': theme.field.background,
    '--v11-rebaseline-near': theme.field.near,
    '--v11-rebaseline-middle': theme.field.middle,
    '--v11-rebaseline-far': theme.field.far,
    '--v11-rebaseline-grid': theme.field.grid,
    '--v11-rebaseline-text': theme.text.primary,
    '--v11-rebaseline-secondary': theme.text.secondary,
    '--v11-rebaseline-metadata': theme.text.metadata,
    '--v11-rebaseline-disabled': theme.text.disabled,
    '--v11-rebaseline-primary': theme.glow.primary,
    '--v11-rebaseline-supporting': theme.glow.supporting,
    '--v11-state-low': theme.questTheme.colors.predicted,
    '--v11-state-neutral': theme.questTheme.colors.textSubtle,
    '--v11-state-high': theme.questTheme.colors.neutral,
    '--v11-rebaseline-soft': theme.questTheme.colors.cardSurface,
    '--v11-rebaseline-elevated': theme.questTheme.colors.surfaceElevated,
    '--v11-rebaseline-border': theme.questTheme.colors.border,
    '--v11-rebaseline-nav-height': '64px',
    '--v11-rebaseline-nav-clearance': `${v11Spacing.md}px`,
  } as any;

  const selectState = (value: number, closeSheetAfterSave = true) => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    if (closeStateTimerRef.current) clearTimeout(closeStateTimerRef.current);
    if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
    setPendingStateValue(value);
    setStateSaveStatus('saving');
    stateTimerRef.current = setTimeout(() => {
      const shouldFail = query().get('debugDecision') === '1'
        && query().get('stateSave') === 'error';
      if (shouldFail) {
        setStateSaveStatus('error');
        return;
      }
      setStateValue(value);
      setStateRecordedAt('just_now');
      setStateSaveStatus('saved');
      setQuickStateExpanded(false);
      setInstantStatus('generating');
      setInstantExpanded(true);
      instantTimerRef.current = setTimeout(() => {
        const requestedStatus = query().get('instantState');
        setInstantStatus(requestedStatus === 'fallback'
          ? 'fallback'
          : requestedStatus === 'error'
            ? 'error'
            : 'ready');
      }, 640);
      if (closeSheetAfterSave) {
        closeStateTimerRef.current = setTimeout(() => {
          setSheet(null);
          setStateSaveStatus('idle');
        }, 640);
      }
    }, 320);
  };

  const selectQuickState = (value: number) => selectState(value, false);

  const selectFeedback = (value: 'useful' | 'not_useful') => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback(value);
    setFeedbackStatus('saving');
    feedbackTimerRef.current = setTimeout(() => {
      setFeedbackStatus('saved');
      setInstantExpanded(false);
    }, 320);
  };

  const retryInstantRead = () => {
    if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
    setInstantStatus('generating');
    setInstantExpanded(true);
    instantTimerRef.current = setTimeout(() => {
      const requestedStatus = query().get('instantState');
      setInstantStatus(requestedStatus === 'error' ? 'error' : requestedStatus === 'fallback' ? 'fallback' : 'ready');
    }, 640);
  };

  useEffect(() => () => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    if (closeStateTimerRef.current) clearTimeout(closeStateTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (instantTimerRef.current) clearTimeout(instantTimerRef.current);
  }, []);

  useEffect(() => {
    if (!debugPerformance || typeof window === 'undefined') return;
    let cancelled = false;
    let frame = 0;
    let previous: number | null = null;
    const intervals: number[] = [];
    const tick = (now: number) => {
      if (cancelled) return;
      if (previous != null) intervals.push(now - previous);
      previous = now;
      if (intervals.length < 300) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      const sorted = [...intervals].sort((a, b) => a - b);
      const quantile = (value: number) => (
        sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))]
      );
      const root = document.querySelector('[data-v11-rebaseline-role="root"]');
      const result = {
        frames: intervals.length,
        max: sorted[sorted.length - 1],
        mean: intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
        over20: intervals.filter((value) => value > 20).length,
        over32: intervals.filter((value) => value > 32).length,
        p50: quantile(0.5),
        p95: quantile(0.95),
        p99: quantile(0.99),
        reducedMotion: root?.getAttribute('data-v11-motion') === 'reduced',
        theme: root?.getAttribute('data-v11-theme'),
      };
      (window as any).__questlifeV11RebaselinePerformance = result;
      console.info('[v11-rebaseline-performance]', JSON.stringify(result));
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [debugPerformance]);

  return (
    <WebView
      dataSet={{
        'v11-evidence-stage': effectiveStage.toLowerCase(),
        'v11-layer': expanded ? 'l2' : 'l1',
        'v11-motion': reducedMotion ? 'reduced' : 'normal',
        'v11-rebaseline-role': 'root',
        'v11-state-reading': reading == null ? 'none' : String(reading),
        'v11-theme': themeMode,
      }}
      style={cssVariables}
    >
      <WebView
        dataSet={{
          'v11-rebaseline-role': 'background-layer',
          'v11-sheet-open': sheet ? 'true' : 'false',
        }}
        pointerEvents={sheet ? 'none' : 'auto'}
      >
        <WebView dataSet={{ 'v11-rebaseline-role': 'field' }} pointerEvents="none" />
        <WebView dataSet={{ 'v11-rebaseline-role': 'state-field-low' }} pointerEvents="none" />
        <WebView dataSet={{ 'v11-rebaseline-role': 'state-field-neutral' }} pointerEvents="none" />
        <WebView dataSet={{ 'v11-rebaseline-role': 'state-field-high' }} pointerEvents="none" />
        <V11GlowOrb
          stage={effectiveStage}
          style={{ position: 'absolute', top: 148, left: -92 }}
          theme={theme}
        />
        <V11GlowOrb
          stage={effectiveStage === 'S3' ? 'S2' : effectiveStage}
          style={{ position: 'absolute', top: 430, right: -138 }}
          theme={theme}
          tone="supporting"
        />

        {debugControls ? (
        <WebView dataSet={{ 'v11-rebaseline-role': 'debug-controls' }}>
          {(['s0', 's1', 's3'] as const).map((value) => (
            <WebPressable
              accessibilityRole="button"
              dataSet={{ 'v11-selected': scenario === value ? 'true' : 'false' }}
              key={value}
              onPress={() => {
                setScenario(value);
                setStateValue(null);
                setPendingStateValue(null);
                setStateRecordedAt(value === 's0' ? null : 'fixture');
                setQuickStateExpanded(value === 's0');
                setInstantStatus(value === 's0' ? 'idle' : 'ready');
                setInstantExpanded(false);
                setStateSaveStatus('idle');
              }}
            >
              <Text>{value.toUpperCase()}</Text>
            </WebPressable>
          ))}
          <WebPressable
            accessibilityRole="button"
            onPress={() => setThemeMode((value) => value === 'dark' ? 'light' : 'dark')}
          >
            <Text>{themeMode === 'dark' ? 'LIGHT' : 'DARK'}</Text>
          </WebPressable>
          <WebPressable
            accessibilityRole="button"
            onPress={() => setLanguage((value) => value === 'zh' ? 'en' : 'zh')}
          >
            <Text>{language.toUpperCase()}</Text>
          </WebPressable>
        </WebView>
        ) : null}

      <WebScrollView
        dataSet={{ 'v11-rebaseline-role': 'scroll' }}
        showsVerticalScrollIndicator={false}
      >
        <WebView dataSet={{ 'v11-rebaseline-role': 'content' }}>
          <WebView dataSet={{ 'v11-rebaseline-role': 'context-line' }}>
            <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
              {t(language, 'rebaselineDateContext')}
            </Text>
            <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.8 }}>
              {t(language, stageLabelKey(displayScenario))}
            </Text>
          </WebView>

          <WebView dataSet={{ 'v11-rebaseline-role': 'capture-group' }}>
            <WebPressable
              accessibilityLabel={t(language, 'rebaselineCapturePlaceholder')}
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'capture-entry' }}
              onPress={() => setSheet('capture')}
            >
              <V11RebaselineIcon name="capture" size={18} color={theme.glow.primary} />
              <Text
                numberOfLines={1}
                style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.secondary, fontSize: 14, lineHeight: 20 }}
              >
                {t(language, 'rebaselineCaptureCompact')}
              </Text>
              <WebView dataSet={{ 'v11-rebaseline-role': 'capture-send' }}>
                <V11RebaselineIcon name="arrow" size={16} color={theme.text.primary} />
              </WebView>
            </WebPressable>
            <WebPressable
              accessibilityLabel={t(language, fixture.latestRecordKey
                ? 'rebaselineOpenActivityHistory'
                : 'rebaselineNoLatestRecord')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !fixture.latestRecordKey }}
              dataSet={{ 'v11-rebaseline-role': 'latest-record' }}
              disabled={!fixture.latestRecordKey}
              onPress={() => setSheet('history')}
            >
              <Text
                numberOfLines={2}
                style={{
                  flex: 1,
                  flexShrink: 1,
                  minWidth: 0,
                  color: fixture.latestRecordKey ? theme.text.secondary : theme.text.disabled,
                  fontSize: 12.5,
                  lineHeight: 18,
                }}
              >
                {fixture.latestRecordKey
                  ? `${t(language, 'rebaselineLatestRecordLabel')} · ${t(language, fixture.latestRecordKey)} · ${t(language, 'rebaselineTimeMorning')}`
                  : t(language, 'rebaselineNoLatestRecord')}
              </Text>
              {fixture.latestRecordKey ? (
                <WebView dataSet={{ 'v11-rebaseline-role': 'latest-record-trailing' }}>
                  <V11RebaselineIcon name="arrow" size={14} color={theme.text.metadata} />
                </WebView>
              ) : null}
            </WebPressable>
          </WebView>

          <WebView dataSet={{ 'v11-rebaseline-role': 'decision-group' }}>
            <WebView dataSet={{ 'v11-rebaseline-role': 'decision-copy' }}>
              <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.8 }}>
                {t(language, 'rebaselineDecisionLabel')}
              </Text>
              <Text style={{ color: theme.text.primary, fontSize: 25, lineHeight: 33, fontWeight: '400' }}>
                {copy(language, calibratedDecision.judgement)}
              </Text>
            </WebView>

            <WebView dataSet={{ 'v11-rebaseline-role': 'action-stack' }}>
              <V11Pill
                accessibilityLabel={copy(language, calibratedDecision.actionLabel)}
                contentStyle={{
                  paddingVertical: 12,
                  paddingLeft: 20,
                  paddingRight: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
                height={80}
                onPress={displayScenario === 's0'
                  ? () => setQuickStateExpanded(true)
                  : () => undefined}
                reducedMotion={reducedMotion}
                stage={effectiveStage}
                theme={theme}
              >
                <WebView
                  dataSet={{ 'v11-rebaseline-role': 'primary-action-copy' }}
                  style={{ flex: 1, flexShrink: 1, minWidth: 0 }}
                >
                  <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 15, lineHeight: 20, fontWeight: '500' }}>
                    {copy(language, calibratedDecision.actionLabel)}
                  </Text>
                  <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.secondary, fontSize: 11, lineHeight: 16, marginTop: 2 }}>
                    {copy(language, calibratedDecision.actionReason)}
                  </Text>
                </WebView>
                <WebView dataSet={{ 'v11-rebaseline-role': 'primary-action-trailing' }}>
                  <V11RebaselineIcon name="arrow" size={18} color={theme.text.primary} />
                </WebView>
              </V11Pill>
              {displayScenario !== 's0' ? (
                <WebPressable
                  accessibilityRole="button"
                  dataSet={{ 'v11-rebaseline-role': 'direct-log' }}
                  onPress={() => setSheet('record')}
                >
                  <V11RebaselineIcon name="add" size={15} color={theme.text.secondary} />
                  <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {t(language, 'logAfterDone')}
                  </Text>
                </WebPressable>
              ) : null}
            </WebView>
          </WebView>

          <WebView dataSet={{ 'v11-rebaseline-role': 'state-section' }}>
            <WebView dataSet={{ 'v11-rebaseline-role': 'state-section-heading' }}>
              <WebView style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
                  {t(language, 'currentState')}
                </Text>
              </WebView>
              {reading != null ? (
                <WebPressable
                  accessibilityLabel={t(language, 'rebaselineUpdateState')}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: quickStateExpanded }}
                  dataSet={{ 'v11-rebaseline-role': 'state-update-inline' }}
                  onPress={() => setQuickStateExpanded((value) => !value)}
                >
                  <V11RebaselineIcon name="update" size={16} color={theme.text.primary} />
                  <Text style={{ color: theme.text.primary, fontSize: 11, fontWeight: '500' }}>
                    {t(language, quickStateExpanded
                      ? 'rebaselineQuickStateCollapse'
                      : 'rebaselineUpdateStateShort')}
                  </Text>
                </WebPressable>
              ) : (
                <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 16 }}>
                  {t(language, 'rebaselineStageUncalibrated')}
                </Text>
              )}
            </WebView>

            <WebView dataSet={{ 'v11-rebaseline-role': 'state-reading-copy' }}>
              <Text style={{ color: theme.text.primary, fontSize: reading == null ? 17 : 22, lineHeight: reading == null ? 24 : 29, fontWeight: '400' }}>
                {reading == null
                  ? t(language, 'rebaselineStateQuestionOverall')
                  : `${reading} / 5 · ${t(language, stateLabelKey(reading))}`}
              </Text>
              {reading != null && stateRecordedAt ? (
                <Text style={{ color: theme.text.secondary, fontSize: 11, lineHeight: 17, marginTop: 2 }}>
                  {t(language, stateRecordedAt === 'just_now'
                    ? 'rebaselineStateRecordedJustNow'
                    : 'rebaselineStateRecordedToday')}
                </Text>
              ) : null}
            </WebView>

            {(reading == null || quickStateExpanded) ? (
              <V11CalibrationRail
                accessibilityLabel={t(language, 'rebaselineCalibrationRailLabel')}
                language={language}
                onSelect={selectQuickState}
                reducedMotion={reducedMotion}
                selectedValue={pendingStateValue ?? reading}
                status={stateSaveStatus}
                theme={theme}
                variant="today"
              />
            ) : null}

            {stateSaveStatus !== 'idle' ? (
              <WebView dataSet={{ 'v11-rebaseline-role': 'state-inline-status' }}>
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ color: stateSaveStatus === 'error' ? theme.questTheme.colors.danger : theme.text.secondary, fontSize: 12, lineHeight: 18 }}
                >
                  {t(language, stateSaveStatus === 'saving'
                    ? 'rebaselineStateSaving'
                    : stateSaveStatus === 'error'
                      ? 'rebaselineStateSaveError'
                      : 'stateCheckInSaved')}
                </Text>
                {stateSaveStatus === 'error' && pendingStateValue != null ? (
                  <WebPressable
                    accessibilityRole="button"
                    dataSet={{ 'v11-rebaseline-role': 'state-retry' }}
                    onPress={() => selectQuickState(pendingStateValue)}
                  >
                    <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                      {t(language, 'rebaselineRetry')}
                    </Text>
                  </WebPressable>
                ) : null}
              </WebView>
            ) : null}

            <WebPressable
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'state-detail-inline-action' }}
              onPress={() => setSheet('state-detail')}
            >
              <Text numberOfLines={2} style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                {t(language, 'rebaselineRecordMoreState')}
              </Text>
              <V11RebaselineIcon name="arrow" size={14} color={theme.text.secondary} />
            </WebPressable>
          </WebView>

          {reading != null && instantStatus !== 'idle' ? (
            <WebView
              dataSet={{
                'v11-instant-status': instantStatus,
                'v11-rebaseline-role': 'instant-read-inline',
              }}
            >
              <WebPressable
                accessibilityRole="button"
                accessibilityState={{ expanded: instantExpanded }}
                dataSet={{ 'v11-rebaseline-role': 'section-heading' }}
                onPress={() => setInstantExpanded((value) => !value)}
              >
                <WebView style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
                  <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '500' }}>
                    {t(language, 'instantRead')}
                  </Text>
                  <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {instantStatus === 'generating'
                      ? t(language, 'rebaselineInstantGenerating')
                      : instantStatus === 'fallback'
                        ? t(language, 'rebaselineInstantFallback')
                        : instantStatus === 'error'
                          ? t(language, 'rebaselineInstantError')
                          : feedbackStatus === 'saving'
                            ? t(language, 'feedbackSaving')
                            : feedback
                              ? `${t(language, 'feedbackSaved')} · ${t(language, feedback === 'useful' ? 'useful' : 'notUseful')}`
                              : t(language, 'rebaselineInstantSummary')}
                  </Text>
                </WebView>
                <V11RebaselineIcon
                  name={instantExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={theme.text.secondary}
                />
              </WebPressable>
              {instantExpanded ? (
                <WebView dataSet={{ 'v11-rebaseline-role': 'instant-body' }}>
                  {instantStatus === 'generating' ? (
                    <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
                      {t(language, 'rebaselineInstantGenerating')}
                    </Text>
                  ) : instantStatus === 'error' ? (
                    <WebPressable accessibilityRole="button" dataSet={{ 'v11-rebaseline-role': 'instant-retry' }} onPress={retryInstantRead}>
                      <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                        {t(language, 'rebaselineRetry')}
                      </Text>
                    </WebPressable>
                  ) : (
                    <>
                      {instantStatus === 'fallback' ? (
                        <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
                          {t(language, 'rebaselineInstantFallbackBadge')}
                        </Text>
                      ) : null}
                      <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 21 }}>
                        {t(language, displayScenario === 's3' ? 'rebaselineInstantS3' : 'rebaselineInstantS1')}
                      </Text>
                      <WebView dataSet={{ 'v11-rebaseline-role': 'feedback-row' }}>
                        {(['useful', 'not_useful'] as const).map((value) => (
                          <WebPressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: feedback === value }}
                            dataSet={{
                              'v11-rebaseline-role': 'feedback-choice',
                              'v11-selected': feedback === value ? 'true' : 'false',
                            }}
                            key={value}
                            onPress={() => selectFeedback(value)}
                          >
                            <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                              {t(language, value === 'useful' ? 'useful' : 'notUseful')}
                            </Text>
                          </WebPressable>
                        ))}
                      </WebView>
                    </>
                  )}
                </WebView>
              ) : null}
            </WebView>
          ) : null}

          {fixture.plan.length > 0 ? (
            <WebPressable
              accessibilityLabel={t(language, expanded
                ? 'rebaselineCollapseTodayDetails'
                : 'rebaselineExpandTodayDetails')}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              dataSet={{ 'v11-rebaseline-role': 'plan-preview' }}
              onPress={() => setExpanded((value) => !value)}
            >
              <V11RebaselineIcon name="calendar" size={15} color={theme.glow.primary} />
              <Text numberOfLines={2} style={{ flex: 1, flexShrink: 1, minWidth: 0, color: theme.text.secondary, fontSize: 12.5, lineHeight: 18 }}>
                {t(language, expanded ? 'rebaselinePlanPreviewExpanded' : 'rebaselinePlanPreview')
                  .replace('{count}', String(fixture.plan.length))
                  .replace('{time}', fixture.plan[0].time)
                  .replace('{title}', t(language, fixture.plan[0].titleKey))}
              </Text>
              <V11RebaselineIcon
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={15}
                color={theme.text.secondary}
              />
            </WebPressable>
          ) : null}

          {expanded ? (
            <WebView dataSet={{ 'v11-rebaseline-role': 'l2' }}>
              <WebView dataSet={{ 'v11-rebaseline-role': 'section' }}>
                <WebView dataSet={{ 'v11-rebaseline-role': 'section-heading' }}>
                  <Text style={{ color: theme.text.primary, fontSize: 16, lineHeight: 22, fontWeight: '500' }}>
                    {t(language, 'todayPlan')}
                  </Text>
                  <Text style={{ color: theme.text.metadata, fontSize: 10, letterSpacing: 0.6 }}>
                    {t(language, 'rebaselineThreeItemsMaximum')}
                  </Text>
                </WebView>
                {fixture.plan.slice(0, 3).map((row) => (
                  <WebView dataSet={{ 'v11-rebaseline-role': 'plan-row' }} key={row.id}>
                    <Text style={{ color: theme.text.metadata, fontSize: 11, width: 40 }}>{row.time}</Text>
                    <WebView dataSet={{ 'v11-rebaseline-role': 'plan-rail' }} />
                    <WebView style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                        {t(language, row.titleKey)}
                      </Text>
                      <Text numberOfLines={2} style={{ flexShrink: 1, color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                        {t(language, row.metaKey)}
                      </Text>
                    </WebView>
                    <WebPressable
                      accessibilityRole="button"
                      dataSet={{ 'v11-rebaseline-role': 'row-action' }}
                      onPress={() => undefined}
                    >
                      <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                        {t(language, row.status === 'done' ? 'done' : 'rebaselineStartAction')}
                      </Text>
                    </WebPressable>
                  </WebView>
                ))}
              </WebView>

              <WebPressable
                accessibilityRole="button"
                dataSet={{ 'v11-rebaseline-role': 'evidence-summary' }}
                onPress={() => setSheet('decision')}
              >
                <V11RebaselineIcon
                  name="insights"
                  size={22}
                  color={theme.glow.primary}
                />
                <WebView style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                    {t(language, 'rebaselineEvidenceSummary')}
                  </Text>
                  <Text numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                    {t(language, displayScenario === 's3'
                      ? 'rebaselineEvidenceSummaryS3'
                      : 'rebaselineEvidenceSummaryS1')}
                  </Text>
                </WebView>
                <WebView dataSet={{ 'v11-rebaseline-role': 'evidence-summary-trailing' }}>
                  <V11RebaselineIcon name="arrow" size={15} color={theme.text.metadata} />
                </WebView>
              </WebPressable>
              <WebPressable
                accessibilityLabel={t(language, 'rebaselineCollapseTodayDetails')}
                accessibilityRole="button"
                dataSet={{ 'v11-rebaseline-role': 'l2-collapse-end' }}
                onPress={() => setExpanded(false)}
              >
                <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                  {t(language, 'rebaselineCollapseTodayDetails')}
                </Text>
                <V11RebaselineIcon name="chevron-up" size={15} color={theme.text.secondary} />
              </WebPressable>
            </WebView>
          ) : null}
        </WebView>
      </WebScrollView>

        <WebView
          dataSet={{ 'v11-rebaseline-role': 'nav-shield' }}
          pointerEvents="none"
        />
        <WebView dataSet={{ 'v11-rebaseline-role': 'bottom-nav' }}>
          {navItems(language).map((item) => (
            <WebView
              dataSet={{
                'v11-active': item.key === 'today' ? 'true' : 'false',
                'v11-rebaseline-role': 'nav-item',
              }}
              key={item.key}
            >
              <V11RebaselineIcon
                name={item.icon}
                size={19}
                color={item.key === 'today' ? theme.glow.primary : theme.text.metadata}
              />
              <Text style={{
                color: item.key === 'today' ? theme.text.primary : theme.text.metadata,
                fontSize: 10,
                lineHeight: 14,
                fontWeight: item.key === 'today' ? '600' : '400',
              }}>
                {item.label}
              </Text>
            </WebView>
          ))}
        </WebView>
      </WebView>

      <V11Stage2RebaselineSheet
        feedback={feedback}
        feedbackStatus={feedbackStatus}
        language={language}
        onClose={() => {
          setSheet(null);
          setStateSaveStatus('idle');
        }}
        onDetailedState={() => setSheet('state-detail')}
        onFeedback={selectFeedback}
        onOpenRecord={() => setSheet('record')}
        onState={selectState}
        recent={fixture.recent}
        reducedMotion={reducedMotion}
        selectedState={pendingStateValue ?? reading}
        sheet={sheet}
        stateSaveStatus={stateSaveStatus}
        themeMode={themeMode}
      />
    </WebView>
  );
}
