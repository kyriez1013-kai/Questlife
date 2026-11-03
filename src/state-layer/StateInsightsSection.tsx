import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useStore } from '../store';
import type { V11ThemeTokens } from '../v11/tokens';
import { V11SegmentedSelector } from '../v11/components/V11SheetControls';
import { useDeviceData } from '../platform/useDeviceData';
import { personalBaseline } from './baseline';
import { calendarSummary, lagSleepDescription, stateCalendar } from './calendar';
import { ACTION_COPY, TYPE_NAME, sl, type Lang } from './copy';
import { MIN_OUTCOME_N, summarizeOutcomes } from './outcomes';
import { GENERAL_SHORT_SLEEP_MIN, localYmd, sleepMinutesByDate } from './signals';
import { STATE_TYPES } from './types';
import { typeColor } from './StateLayerToday';
import './state-layer.styles';

const WebView = View as any;

/** The same variables the Today surface sets, so the glass card recipe works outside Today. */
export function stateLayerCssVars(theme: V11ThemeTokens): any {
  return {
    '--v11-rebaseline-bg': theme.field.background,
    '--v11-rebaseline-primary': theme.glow.primary,
    '--v11-rebaseline-text': theme.text.primary,
    '--v11-rebaseline-neutral-border': theme.control.neutralBorder,
    '--v11-rebaseline-neutral-elevated': theme.control.neutralElevatedSurface,
    '--v11-rebaseline-neutral-surface': theme.control.neutralSurface,
  };
}

/** Descriptive only: what happened, counted. No forecasts, no rates, no causal wording. */
export default function StateInsightsSection({ lang, theme }: { lang: Lang; theme: V11ThemeTokens }) {
  const { data } = useStore();
  const { data: device } = useDeviceData();
  const [range, setRange] = useState<'30' | '90'>('30');
  const days = Number(range);
  const rows = data.stateCheckIns || [];
  const today = localYmd(new Date());
  const cal = useMemo(() => stateCalendar(rows, today, days), [rows, today, days]);
  const summary = calendarSummary(cal);
  const outcomes = useMemo(() => summarizeOutcomes(rows).filter((c) => c.n > 0 || c.pendingOrDismissed > 0), [rows]);
  const sleep = useMemo(() => sleepMinutesByDate(data.contextLogs || [], device.observations || []), [data.contextLogs, device.observations]);
  const lag = useMemo(() => {
    const base = personalBaseline([...sleep.values()], 30);
    const isShort = (m: number) => (base ? m <= base.median - base.scale : m < GENERAL_SHORT_SLEEP_MIN);
    return lagSleepDescription(cal, sleep, isShort);
  }, [cal, sleep]);
  const sep = lang === 'zh' ? '、' : ', ';
  const dayWord = (n: number) => (lang === 'zh' ? `${n} 天` : `${n} day${n === 1 ? '' : 's'}`);

  const h = (text: string) => <Text style={{ color: theme.text.primary, fontSize: 15, lineHeight: 21, fontWeight: '600' }}>{text}</Text>;
  const p = (text: string, muted = false) => <Text style={{ color: muted ? theme.text.metadata : theme.text.secondary, fontSize: 13, lineHeight: 19 }}>{text}</Text>;

  return (
    <WebView dataSet={{ 'sl-role': 'ins-section' }} style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 14, ...stateLayerCssVars(theme) }}>
      <WebView dataSet={{ 'sl-role': 'card' }} style={{ gap: 12 }}>
        <WebView dataSet={{ 'sl-role': 'kicker-row' }}>
          {h(sl(lang, 'insTitle'))}
          <WebView style={{ width: 170 }}>
            <V11SegmentedSelector<'30' | '90'>
              onChange={setRange}
              options={[{ value: '30', label: sl(lang, 'insRange30') }, { value: '90', label: sl(lang, 'insRange90') }]}
              theme={theme}
              value={range}
            />
          </WebView>
        </WebView>
        <WebView accessibilityLabel={sl(lang, 'insTitle')} dataSet={{ 'sl-role': 'ins-grid', 'sl-range': range }}>
          {cal.map((d) => (
            <WebView
              accessibilityLabel={`${d.date} ${d.type ? TYPE_NAME[lang][d.type] : '—'}`}
              dataSet={{ 'sl-role': 'ins-cell' }}
              key={d.date}
              style={d.type ? { backgroundColor: typeColor(theme, d.type), borderColor: 'transparent', opacity: d.type === 'unclear' ? 0.45 : 0.9 } : undefined}
            />
          ))}
        </WebView>
        <WebView dataSet={{ 'sl-role': 'kicker-row' }} style={{ minHeight: 0 }}>
          <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 15 }}>{lang === 'zh' ? `← ${days} 天前` : `← ${days} days ago`}</Text>
          <Text style={{ color: theme.text.metadata, fontSize: 11, lineHeight: 15 }}>{lang === 'zh' ? '今天 →' : 'today →'}</Text>
        </WebView>
        <WebView dataSet={{ 'sl-role': 'ins-legend' }}>
          {[...STATE_TYPES, 'unclear' as const].map((t) => (
            <WebView dataSet={{ 'sl-role': 'ins-legend-item' }} key={t}>
              <WebView dataSet={{ 'sl-role': 'type-dot' }} style={{ backgroundColor: typeColor(theme, t), opacity: t === 'unclear' ? 0.45 : 0.9 }} />
              <Text style={{ color: theme.text.secondary, fontSize: 11.5, lineHeight: 16 }}>{TYPE_NAME[lang][t]}</Text>
            </WebView>
          ))}
        </WebView>
        {summary.logged
          ? p(sl(lang, 'insSummary', { days, parts: summary.counts.map((c) => `${TYPE_NAME[lang][c.type]} ${dayWord(c.days)}`).join(sep), logged: summary.logged }))
          : p(sl(lang, 'insNone'), true)}
        {p(lang === 'zh' ? '空格 = 那天没签到，不补。' : 'Empty = no check-in that day; never filled in.', true)}
      </WebView>

      <WebView dataSet={{ 'sl-role': 'card' }}>
        {h(sl(lang, 'insOutcomes'))}
        {outcomes.length ? outcomes.map((c) => (
          <WebView dataSet={{ 'sl-role': 'ins-row' }} key={`${c.type}-${c.actionId}`}>
            <Text style={{ color: theme.text.primary, fontSize: 13.5, lineHeight: 19, fontWeight: '500' }}>
              {TYPE_NAME[lang][c.type]} → {ACTION_COPY[lang][c.actionId].title}
            </Text>
            {p(c.n >= MIN_OUTCOME_N
              ? sl(lang, 'personalSummary', { n: c.n, up: c.energyUp, down: c.tensionDown })
              : sl(lang, 'personalCount', { n: c.n }) + (lang === 'zh' ? '（满 5 次才显示结果）' : ' (results shown from 5)'))}
            {c.randomizedN ? p(sl(lang, 'randomCount', { n: c.randomizedN }), true) : null}
            {c.pendingOrDismissed ? p(lang === 'zh' ? `另有 ${c.pendingOrDismissed} 次没有回访，不计入` : `${c.pendingOrDismissed} more without a follow-up, not counted`, true) : null}
          </WebView>
        )) : p(sl(lang, 'insOutcomesEmpty'), true)}
      </WebView>

      <WebView dataSet={{ 'sl-role': 'card' }}>
        {h(sl(lang, 'insLag'))}
        {lag.shown
          ? p(sl(lang, 'insLagLine', { lowN: lag.lowN, lowFuel: lag.lowTarget, normN: lag.normN, normFuel: lag.normTarget }))
          : p(sl(lang, 'insLagNeedMore', { n: lag.pairs }), true)}
        {p(sl(lang, 'insNoPredict'), true)}
      </WebView>
    </WebView>
  );
}
