import React, { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import PersonalTerminalIcon from './PersonalTerminalIcon';
import type {
  PersonalMarketInstrument,
  PersonalMarketOverview,
  PersonalTerminalScope,
} from './personalTerminalPresentation';

const WebView = View as any;
const WebPressable = Pressable as any;

function copy(language: Lang, value: PersonalMarketInstrument['label']) {
  if (value.kind === 'text') return value.text;
  return t(language, value.key);
}

function locale(language: Lang) {
  return language === 'zh' ? 'zh-CN' : 'en-AU';
}

function compactNumber(language: Lang, value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat(locale(language), {
    maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0,
    notation: 'standard',
  }).format(value);
}

function instrumentReading(language: Lang, instrument: PersonalMarketInstrument, value: number | null) {
  if (value == null) return '—';
  if (instrument.constructKey === 'sleep.duration') return compactNumber(language, value / 60);
  if (instrument.semantic === 'timing') {
    const minutes = Math.round(value + 12 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }
  return compactNumber(language, value);
}

function instrumentUnit(language: Lang, instrument: PersonalMarketInstrument) {
  if (instrument.constructKey === 'sleep.duration') return t(language, 'personalTerminalV041Unit_hours');
  return copy(language, instrument.unit);
}

function signed(language: Lang, value: number | null, percent = false) {
  if (value == null) return '—';
  const formatted = new Intl.NumberFormat(locale(language), { maximumFractionDigits: 1 }).format(value);
  return `${value > 0 ? '+' : ''}${formatted}${percent ? '%' : ''}`;
}

function stageLabel(language: Lang, instrument: PersonalMarketInstrument) {
  return t(language, `personalMarketMaturity_${instrument.maturity}`);
}

function referenceLabel(language: Lang, instrument: PersonalMarketInstrument) {
  if (!instrument.adaptive.referenceAvailable && instrument.reference == null) return t(language, 'personalMarketReferenceUnavailable');
  if (instrument.referenceType === 'historical_personal_reference') return t(language, 'personalMarketHistoricalReference');
  if (instrument.referenceType === 'active_questlife_baseline') return t(language, 'personalMarketActiveReference');
  return t(language, 'personalMarketPersonalReference');
}

function positionLabel(language: Lang, position: PersonalMarketInstrument['position']) {
  return t(language, `personalMarketPosition_${position}`);
}

function directionLabel(language: Lang, direction: PersonalMarketInstrument['direction']) {
  return t(language, `personalMarketDirection_${direction}`);
}

function domainTone(domain: string, theme: V11ThemeTokens) {
  if (domain === 'sleep') return theme.glow.supporting;
  if (domain === 'movement' || domain === 'activity') return '#D8A86C';
  if (domain === 'cardiovascular') return '#BCA8E6';
  return theme.glow.primary;
}

function Sparkline({ instrument, language, theme }: { instrument: PersonalMarketInstrument; language: Lang; theme: V11ThemeTokens }) {
  const width = 190;
  const height = 34;
  const rows = instrument.miniSeries;
  const geometry = useMemo(() => {
    if (!rows.length) return { lastY: height / 2, path: '' };
    const values = rows.map((row) => row.value);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const spread = Math.max(1e-9, high - low);
    const points = rows.map((row, index) => {
      const x = rows.length === 1 ? width / 2 : index / (rows.length - 1) * width;
      const y = height - 4 - (row.value - low) / spread * (height - 8);
      return { x, y };
    });
    return {
      lastY: points[points.length - 1]?.y ?? height / 2,
      path: points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
    };
  }, [rows]);
  const tone = domainTone(instrument.domain, theme);
  return (
    <Svg accessibilityLabel={t(language, 'personalMarketMiniSeries')} height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
      <Line stroke={theme.questTheme.colors.border} strokeWidth={0.7} x1={0} x2={width} y1={height - 4} y2={height - 4} />
      {geometry.path ? <Path d={geometry.path} fill="none" stroke={tone} strokeLinecap="square" strokeWidth={1.35} /> : null}
      {rows.length ? <Circle cx={rows.length === 1 ? width / 2 : width} cy={geometry.lastY} fill={tone} r={2.3} /> : null}
    </Svg>
  );
}

function InstrumentRow({
  instrument,
  language,
  onPress,
  theme,
}: {
  instrument: PersonalMarketInstrument;
  language: Lang;
  onPress: () => void;
  theme: V11ThemeTokens;
}) {
  const deviation = instrument.deviationPercent != null
    ? signed(language, instrument.deviationPercent, true)
    : signed(language, instrument.deviationAbsolute);
  return (
    <WebPressable
      accessibilityLabel={`${copy(language, instrument.label)} · ${t(language, 'personalMarketOpenInstrument')}`}
      accessibilityRole="button"
      dataSet={{
        'personal-market-position': instrument.position,
        'personal-market-role': 'instrument-row',
      }}
      onPress={onPress}
    >
      <WebView dataSet={{ 'personal-market-role': 'instrument-identity' }}>
        <WebView style={{ backgroundColor: domainTone(instrument.domain, theme) }} />
        <WebView>
          <Text numberOfLines={1} style={{ color: theme.text.primary }}>{copy(language, instrument.label)}</Text>
          <Text numberOfLines={1} style={{ color: theme.text.metadata }}>{positionLabel(language, instrument.position)} · {directionLabel(language, instrument.direction)}</Text>
        </WebView>
      </WebView>
      <WebView dataSet={{ 'personal-market-role': 'instrument-track' }}>
        <Sparkline instrument={instrument} language={language} theme={theme} />
      </WebView>
      <WebView dataSet={{ 'personal-market-role': 'instrument-reading' }}>
        <Text style={{ color: theme.text.primary }}>{instrumentReading(language, instrument, instrument.current)}</Text>
        <Text style={{ color: theme.text.metadata }}>{instrumentUnit(language, instrument)}</Text>
        <Text style={{ color: theme.text.secondary }}>{deviation}</Text>
      </WebView>
      <WebView dataSet={{ 'personal-market-role': 'instrument-reference' }}>
        <Text numberOfLines={1} style={{ color: theme.text.metadata }}>{referenceLabel(language, instrument)}</Text>
        <Text style={{ color: theme.text.secondary }}>{instrumentReading(language, instrument, instrument.reference)} {instrument.reference == null ? '' : instrumentUnit(language, instrument)}</Text>
      </WebView>
      <WebView dataSet={{ 'personal-market-role': 'instrument-evidence' }}>
        <Text style={{ color: theme.text.secondary }}>{stageLabel(language, instrument)}</Text>
        <Text style={{ color: theme.text.metadata }}>{instrument.observationCount} {t(language, 'personalMarketObservationsShort')} · {instrument.independentDayCount} {t(language, 'personalMarketIndependentDays')}</Text>
      </WebView>
      <PersonalTerminalIcon color={theme.text.metadata} name="open" size={14} />
    </WebPressable>
  );
}

function AnalystRow({
  language,
  overview,
  theme,
}: {
  language: Lang;
  overview: PersonalMarketOverview;
  theme: V11ThemeTokens;
}) {
  const primary = overview.analyst.rows[0];
  const kind = String(primary?.kind || 'acquisition');
  const instrument = primary?.seriesId
    ? overview.instruments.find((row) => row.seriesId === primary.seriesId)
    : null;
  let body = t(language, 'personalMarketAnalystAcquisition');
  if (kind === 'reference_relative_change' && instrument) {
    body = t(language, 'personalMarketAnalystReferenceMove')
      .replace('{instrument}', copy(language, instrument.label))
      .replace('{change}', signed(language, instrument.deviationPercent, true));
  } else if (kind === 'forming_instruments') {
    body = t(language, 'personalMarketAnalystForming').replace('{count}', String(primary?.count ?? 0));
  } else if (kind === 'signal_available') {
    body = t(language, 'personalMarketAnalystSignal');
  } else if (kind === 'coverage_unknown') {
    body = t(language, 'personalMarketAnalystCoverageUnknown').replace('{count}', String(primary?.count ?? 0));
  } else if (kind === 'new_capability' && instrument) {
    body = t(language, 'personalMarketAnalystCapabilityUnlocked')
      .replace('{instrument}', copy(language, instrument.label))
      .replace('{count}', String(instrument.observationCount));
  }
  return (
    <WebView dataSet={{ 'personal-market-role': 'analyst-answer' }}>
      <WebView dataSet={{ 'personal-market-role': 'section-label' }}>
        <PersonalTerminalIcon color={theme.text.secondary} name="analyst" size={15} />
        <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketAnalyst')}</Text>
      </WebView>
      <Text style={{ color: theme.text.primary }}>{body}</Text>
      <Text style={{ color: theme.text.secondary }}>{t(language, 'personalMarketAnalystBoundary')}</Text>
    </WebView>
  );
}

export default function V11PersonalMarketOverview({
  language,
  onNextAction,
  onSelectScope,
  onSelectSeries,
  overview,
  performanceReadout,
  theme,
}: {
  language: Lang;
  onNextAction: () => void;
  onSelectScope: (scope: PersonalTerminalScope) => void;
  onSelectSeries: (seriesId: string) => void;
  overview: PersonalMarketOverview;
  performanceReadout?: string | null;
  theme: V11ThemeTokens;
}) {
  const [expanded, setExpanded] = useState(false);
  const { width } = useWindowDimensions();
  const compactOverview = width <= 620;
  const desktopOverview = width >= 900;
  const rows = expanded || desktopOverview ? overview.instruments : overview.instruments.slice(0, 5);
  const historyLabel = overview.historyPeriod.start && overview.historyPeriod.end
    ? `${overview.historyPeriod.start.slice(0, 10)} — ${overview.historyPeriod.end.slice(0, 10)}`
    : t(language, 'personalMarketNoHistory');

  if (overview.state === 'no_data') {
    return (
      <WebView dataSet={{ 'personal-market-role': 'no-data' }}>
        <WebView dataSet={{ 'personal-market-role': 'no-data-calibration' }}><WebView /><WebView /><WebView /><WebView /><WebView /></WebView>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketTitle')}</Text>
        <Text style={{ color: theme.text.primary }}>{t(language, 'personalMarketNoDataTitle')}</Text>
        <Text style={{ color: theme.text.secondary }}>{t(language, 'personalMarketNoDataBody')}</Text>
        <WebPressable accessibilityRole="button" onPress={onNextAction}>
          <Text style={{ color: theme.text.primary }}>{t(language, 'personalMarketRecordFirst')}</Text>
          <PersonalTerminalIcon color={theme.text.primary} name="open" size={16} />
        </WebPressable>
      </WebView>
    );
  }

  const breadth = overview.breadth;
  const total = Math.max(1, overview.instrumentCount);
  const breadthRows = [
    ['above_reference', breadth.aboveReference],
    ['near_reference', breadth.nearReference],
    ['below_reference', breadth.belowReference],
    ['forming', breadth.forming],
  ] as const;
  return (
    <WebView dataSet={{ 'personal-market-role': 'overview' }}>
      <WebView dataSet={{ 'personal-market-role': 'header' }}>
        <WebView>
          <Text style={{ color: theme.text.primary }}>{t(language, 'personalMarketTitle')}</Text>
          <Text style={{ color: theme.text.metadata }}>{historyLabel}</Text>
        </WebView>
        <WebView>
          <Text style={{ color: theme.text.metadata }}>{t(language, compactOverview ? 'personalMarketAvailableShort' : 'personalMarketAvailable')}</Text>
          <Text style={{ color: theme.text.primary }}>{overview.instrumentCount}</Text>
        </WebView>
      </WebView>

      <WebView dataSet={{ 'personal-market-role': 'workstation' }}>
        <WebView dataSet={{ 'personal-market-role': 'browser' }}>
          {!compactOverview ? <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketResolution')}</Text> : null}
          {(['market', 'goal', 'skill'] as const).map((scope) => {
            const count = scope === 'market'
              ? overview.instrumentCount
              : scope === 'goal' ? overview.entitySummary.goalCount : overview.entitySummary.skillCount;
            if (!count && scope !== 'market') return null;
            return (
              <WebPressable accessibilityRole="button" key={scope} onPress={() => onSelectScope(scope)}>
                <PersonalTerminalIcon color={scope === 'market' ? theme.text.primary : theme.text.secondary} name={scope} size={15} />
                <WebView><Text style={{ color: scope === 'market' ? theme.text.primary : theme.text.secondary }}>{t(language, `personalTerminalResolution_${scope}`)}</Text><Text style={{ color: theme.text.metadata }}>{count}</Text></WebView>
              </WebPressable>
            );
          })}
          {!compactOverview ? <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketIndependentScales')}</Text> : null}
        </WebView>

        <WebView dataSet={{ 'personal-market-role': 'canvas' }}>
          <WebView dataSet={{ 'personal-market-role': 'breadth' }}>
            <WebView dataSet={{ 'personal-market-role': 'section-label' }}>
              <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketBreadth')}</Text>
              <Text style={{ color: theme.text.secondary }}>{t(language, 'personalMarketBreadthNotScore')}</Text>
            </WebView>
            <WebView dataSet={{ 'personal-market-role': 'breadth-strip' }}>
              {breadthRows.map(([key, value]) => (
                value ? <WebView key={key} style={{ flex: value / total }}><Text style={{ color: theme.text.primary }}>{value}</Text></WebView> : null
              ))}
            </WebView>
            <WebView dataSet={{ 'personal-market-role': 'breadth-labels' }}>
              {breadthRows.map(([key, value]) => <Text key={key} style={{ color: theme.text.metadata }}>{t(language, `personalMarketPosition_${key}`)} {value}</Text>)}
            </WebView>
          </WebView>

          <WebView dataSet={{ 'personal-market-role': 'timeline' }}>
            <WebView dataSet={{ 'personal-market-role': 'timeline-header' }}>
              <WebView><Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketTimeline')}</Text><Text style={{ color: theme.text.secondary }}>{t(language, 'personalMarketTimelineHint')}</Text></WebView>
              {!compactOverview ? <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketCurrentReference')}</Text> : null}
            </WebView>
            {rows.map((instrument) => (
              <InstrumentRow
                instrument={instrument}
                key={instrument.seriesId}
                language={language}
                onPress={() => onSelectSeries(instrument.seriesId)}
                theme={theme}
              />
            ))}
            {!desktopOverview && overview.instruments.length > 5 ? (
              <WebPressable accessibilityRole="button" dataSet={{ 'personal-market-role': 'expand' }} onPress={() => setExpanded((value) => !value)}>
                <Text style={{ color: theme.text.secondary }}>{t(language, expanded ? 'personalMarketShowLess' : 'personalMarketShowAll').replace('{count}', String(overview.instruments.length))}</Text>
              </WebPressable>
            ) : null}
          </WebView>
        </WebView>

        <WebView dataSet={{ 'personal-market-role': 'side' }}>
          <AnalystRow language={language} overview={overview} theme={theme} />
          <WebView dataSet={{ 'personal-market-role': 'top-moves' }}>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketTopMoves')}</Text>
            {overview.topMoves.slice(0, 3).map((move, index) => {
              const instrument = move.seriesId ? overview.instruments.find((row) => row.seriesId === move.seriesId) : null;
              const label = move.kind === 'new_capability'
                ? `${instrument ? `${copy(language, instrument.label)} · ` : ''}${t(language, 'personalMarketCapabilityUnlocked')}`
                : move.kind === 'eligible_signal'
                  ? t(language, 'personalMarketSignalEligible')
                  : instrument ? copy(language, instrument.label) : t(language, 'personalMarketChange');
              return (
                <WebView key={`${move.kind}:${move.seriesId || move.signalId || index}`}>
                  <Text style={{ color: theme.text.primary }}>{label}</Text>
                  <Text style={{ color: theme.text.secondary }}>{move.deviationPercent == null ? t(language, 'personalMarketEvidenceUpdate') : signed(language, move.deviationPercent, true)}</Text>
                </WebView>
              );
            })}
          </WebView>
          <WebView dataSet={{ 'personal-market-role': 'boundary' }}>
            <Text style={{ color: theme.text.metadata }}>{t(language, 'personalMarketInterpretationBoundary')}</Text>
            <Text style={{ color: theme.text.secondary }}>{t(language, 'personalMarketNoCausalClaims')}</Text>
          </WebView>
        </WebView>
      </WebView>
      {performanceReadout ? <Text style={{ color: theme.text.metadata }}>{performanceReadout}</Text> : null}
    </WebView>
  );
}
