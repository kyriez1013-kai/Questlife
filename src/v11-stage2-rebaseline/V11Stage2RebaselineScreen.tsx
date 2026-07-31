import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { t, type Lang } from '../i18n';
import {
  getV11ThemeTokens,
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
  const [latestExpanded, setLatestExpanded] = useState(false);
  const [instantExpanded, setInstantExpanded] = useState(
    query().get('instant') === 'open',
  );
  const [feedback, setFeedback] = useState<'useful' | 'not_useful' | null>(
    query().get('feedback') === 'not_useful'
      ? 'not_useful'
      : query().get('feedback') === 'useful'
        ? 'useful'
        : buildRebaselineFixture(initialScenario()).instantFeedback,
  );
  const [stateValue, setStateValue] = useState<number | null>(null);
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
    '--v11-rebaseline-primary': theme.glow.primary,
    '--v11-rebaseline-supporting': theme.glow.supporting,
    '--v11-rebaseline-soft': theme.questTheme.colors.cardSurface,
    '--v11-rebaseline-elevated': theme.questTheme.colors.surfaceElevated,
    '--v11-rebaseline-border': theme.questTheme.colors.border,
  } as any;

  const openState = () => setSheet('state');
  const selectState = (value: number) => {
    setStateValue(value);
    setSheet(null);
    setExpanded(true);
    setInstantExpanded(true);
  };

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
        'v11-theme': themeMode,
      }}
      style={cssVariables}
    >
      <WebView dataSet={{ 'v11-rebaseline-role': 'field' }} pointerEvents="none" />
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
        contentContainerStyle={{ paddingBottom: 124 }}
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

          <WebPressable
            accessibilityLabel={t(language, 'rebaselineCapturePlaceholder')}
            accessibilityRole="button"
            dataSet={{ 'v11-rebaseline-role': 'capture-entry' }}
            onPress={() => setSheet('capture')}
          >
            <V11RebaselineIcon name="capture" size={18} color={theme.glow.primary} />
            <Text
              numberOfLines={1}
              style={{ flex: 1, color: theme.text.secondary, fontSize: 14, lineHeight: 20 }}
            >
              {t(language, 'rebaselineCapturePlaceholder')}
            </Text>
            <WebView dataSet={{ 'v11-rebaseline-role': 'capture-send' }}>
              <V11RebaselineIcon name="arrow" size={16} color={theme.text.primary} />
            </WebView>
          </WebPressable>

          {fixture.latestRecordKey ? (
            <WebPressable
              accessibilityRole="button"
              accessibilityState={{ expanded: latestExpanded }}
              dataSet={{ 'v11-rebaseline-role': 'latest-record' }}
              onPress={() => setLatestExpanded((value) => !value)}
            >
              <WebView style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
                  {t(language, 'rebaselineLatestRecordLabel')}
                </Text>
                <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                  {t(language, fixture.latestRecordKey)}
                </Text>
                {latestExpanded ? (
                  <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18, marginTop: 4 }}>
                    {t(language, fixture.latestRecordMetaKey || '')}
                  </Text>
                ) : null}
              </WebView>
              <V11RebaselineIcon
                name={latestExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.text.secondary}
              />
            </WebPressable>
          ) : null}

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
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                height={64}
                onPress={displayScenario === 's0' ? openState : () => undefined}
                reducedMotion={reducedMotion}
                stage={effectiveStage}
                theme={theme}
              >
                <WebView>
                  <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 20, fontWeight: '500' }}>
                    {copy(language, calibratedDecision.actionLabel)}
                  </Text>
                  <Text style={{ color: theme.text.secondary, fontSize: 11, lineHeight: 16, marginTop: 2 }}>
                    {copy(language, calibratedDecision.actionReason)}
                  </Text>
                </WebView>
                <V11RebaselineIcon name="arrow" size={18} color={theme.text.primary} />
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

          <WebView dataSet={{ 'v11-rebaseline-role': 'state-summary' }}>
            <WebPressable
              accessibilityLabel={t(language, 'rebaselineToggleMore')}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              dataSet={{ 'v11-rebaseline-role': 'state-reading' }}
              onPress={() => setExpanded((value) => !value)}
            >
              <WebView>
                <Text style={{ color: theme.text.metadata, fontSize: 10, lineHeight: 15, letterSpacing: 0.7 }}>
                  {t(language, 'currentState')}
                </Text>
                <Text style={{ color: theme.text.primary, fontSize: 22, lineHeight: 29, fontWeight: '400' }}>
                  {reading == null
                    ? t(language, 'rebaselineStateNotRecorded')
                    : `${reading} / 5 · ${t(language, reading <= 2 ? 'low' : 'average')}`}
                </Text>
              </WebView>
              <V11RebaselineIcon
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={17}
                color={theme.text.secondary}
              />
            </WebPressable>
            <WebPressable
              accessibilityLabel={t(language, 'rebaselineUpdateState')}
              accessibilityRole="button"
              dataSet={{ 'v11-rebaseline-role': 'state-update' }}
              onPress={openState}
            >
              <V11RebaselineIcon name="update" size={17} color={theme.text.primary} />
              <Text style={{ color: theme.text.primary, fontSize: 11, fontWeight: '500' }}>
                {t(language, 'rebaselineUpdateStateShort')}
              </Text>
            </WebPressable>
          </WebView>

          {expanded ? (
            <WebView dataSet={{ 'v11-rebaseline-role': 'l2' }}>
              {reading != null ? (
                <WebView dataSet={{ 'v11-rebaseline-role': 'instant-read' }}>
                  <WebPressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: instantExpanded }}
                    dataSet={{ 'v11-rebaseline-role': 'section-heading' }}
                    onPress={() => setInstantExpanded((value) => !value)}
                  >
                    <WebView style={{ flex: 1 }}>
                      <Text style={{ color: theme.text.primary, fontSize: 16, lineHeight: 22, fontWeight: '500' }}>
                        {t(language, 'instantRead')}
                      </Text>
                      <Text style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                        {feedback
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
                      <Text style={{ color: theme.text.primary, fontSize: 14, lineHeight: 21 }}>
                        {t(language, displayScenario === 's3' ? 'rebaselineInstantS3' : 'rebaselineInstantS1')}
                      </Text>
                      <WebView dataSet={{ 'v11-rebaseline-role': 'feedback-row' }}>
                        {(['useful', 'not_useful'] as const).map((value) => (
                          <WebPressable
                            accessibilityRole="button"
                            dataSet={{
                              'v11-rebaseline-role': 'feedback-choice',
                              'v11-selected': feedback === value ? 'true' : 'false',
                            }}
                            key={value}
                            onPress={() => setFeedback(value)}
                          >
                            <Text style={{ color: theme.text.primary, fontSize: 12, fontWeight: '500' }}>
                              {t(language, value === 'useful' ? 'useful' : 'notUseful')}
                            </Text>
                          </WebPressable>
                        ))}
                      </WebView>
                    </WebView>
                  ) : null}
                </WebView>
              ) : null}

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
                      <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                        {t(language, row.titleKey)}
                      </Text>
                      <Text numberOfLines={1} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
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

              <WebView dataSet={{ 'v11-rebaseline-role': 'section' }}>
                <WebView dataSet={{ 'v11-rebaseline-role': 'section-heading' }}>
                  <Text style={{ color: theme.text.primary, fontSize: 16, lineHeight: 22, fontWeight: '500' }}>
                    {t(language, 'recentExecution')}
                  </Text>
                  <WebPressable
                    accessibilityRole="button"
                    onPress={() => setSheet('history')}
                  >
                    <Text style={{ color: theme.text.secondary, fontSize: 12 }}>
                      {t(language, 'rebaselineViewAll')}
                    </Text>
                  </WebPressable>
                </WebView>
                {fixture.recent.length === 0 ? (
                  <Text style={{ color: theme.text.secondary, fontSize: 13, lineHeight: 20 }}>
                    {t(language, 'rebaselineNoRecentExecution')}
                  </Text>
                ) : fixture.recent.slice(0, 3).map((row) => (
                  <WebPressable
                    accessibilityRole="button"
                    dataSet={{ 'v11-rebaseline-role': 'execution-row' }}
                    key={row.id}
                    onPress={() => setSheet('record')}
                  >
                    <WebView style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: 14, lineHeight: 20, fontWeight: '500' }}>
                        {t(language, row.titleKey)}
                      </Text>
                      <Text numberOfLines={1} style={{ color: theme.text.secondary, fontSize: 12, lineHeight: 18 }}>
                        {t(language, row.metaKey)} · {t(language, row.resultKey)}
                      </Text>
                    </WebView>
                    <Text style={{ color: theme.text.metadata, fontSize: 11 }}>
                      {t(language, row.timeKey)}
                    </Text>
                  </WebPressable>
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
                <Text style={{ color: theme.text.secondary, fontSize: 12 }}>
                  {t(language, 'viewEvidence')}
                </Text>
              </WebPressable>
            </WebView>
          ) : null}
        </WebView>
      </WebScrollView>

      {!sheet ? (
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
      ) : null}

      <V11Stage2RebaselineSheet
        feedback={feedback}
        language={language}
        onClose={() => setSheet(null)}
        onFeedback={setFeedback}
        onState={selectState}
        sheet={sheet}
        themeMode={themeMode}
      />
    </WebView>
  );
}
