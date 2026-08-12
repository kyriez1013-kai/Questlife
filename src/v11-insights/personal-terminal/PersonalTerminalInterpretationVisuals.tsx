import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import type {
  QuantDriverTimeline,
  QuantDriverTimelineLane,
  QuantScenarioPresentationBranch,
} from './quantInterpretationPresentation';

const WebView = View as any;

function copy(language: Lang, value: { kind: 'text'; text: string } | { kind: 'i18n'; key: string; values?: Record<string, string | number> }) {
  if (value.kind === 'text') return value.text;
  return Object.entries(value.values || {}).reduce(
    (result, [key, replacement]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(replacement)),
    t(language, value.key),
  );
}

function construct(language: Lang, value: string) {
  return t(language, `quantInterpretationConstruct_${value.replace(/[^a-zA-Z0-9]+/g, '_')}`);
}

function linePath(lane: QuantDriverTimelineLane, left: number, width: number, top: number, height: number) {
  let drawing = false;
  return lane.points.reduce((path, point, index) => {
    if (point.normalizedValue == null) {
      drawing = false;
      return path;
    }
    const x = left + (index / Math.max(1, lane.points.length - 1)) * width;
    const y = top + (1 - point.normalizedValue) * height;
    const command = drawing ? 'L' : 'M';
    drawing = true;
    return `${path} ${command}${x.toFixed(1)},${y.toFixed(1)}`.trim();
  }, '');
}

export function DriverTimeline({
  language,
  theme,
  timeline,
}: {
  language: Lang;
  theme: V11ThemeTokens;
  timeline: QuantDriverTimeline;
}) {
  const width = 330;
  const labelWidth = 86;
  const plotWidth = width - labelWidth - 10;
  const laneHeight = 46;
  const headerHeight = 24;
  const footerHeight = 20;
  const height = headerHeight + timeline.lanes.length * laneHeight + footerHeight;
  const colors = [theme.glow.primary, theme.glow.supporting, theme.text.secondary];
  return (
    <WebView dataSet={{ 'quant-interpretation-role': 'driver-timeline' }}>
      <WebView dataSet={{ 'quant-interpretation-role': 'section-heading' }}>
        <WebView>
          <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationTemporalAlignment')}</Text>
          <Text style={{ color: theme.text.primary }}>{t(language, 'quantInterpretationDriverTimeline')}</Text>
        </WebView>
        <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationDayMinusSevenToToday')}</Text>
      </WebView>
      {timeline.lanes.length ? (
        <Svg accessibilityLabel={t(language, 'quantInterpretationDriverTimelineAccessibility')} accessibilityRole="image" height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
          {timeline.lanes.map((lane, laneIndex) => {
            const laneTop = headerHeight + laneIndex * laneHeight + 7;
            const laneColor = colors[laneIndex] || theme.text.secondary;
            const baselineY = lane.baselineNormalized == null ? null : laneTop + (1 - lane.baselineNormalized) * 28;
            return (
              <React.Fragment key={lane.id}>
                <SvgText fill={laneColor} fontSize={8.5} x={0} y={laneTop + 13}>{construct(language, lane.construct)}</SvgText>
                <Line stroke={theme.questTheme.colors.border} strokeWidth={0.75} x1={labelWidth} x2={labelWidth + plotWidth} y1={laneTop + 28} y2={laneTop + 28} />
                {baselineY == null ? null : <Line opacity={0.6} stroke={theme.text.metadata} strokeDasharray="2 3" strokeWidth={0.75} x1={labelWidth} x2={labelWidth + plotWidth} y1={baselineY} y2={baselineY} />}
                <Path d={linePath(lane, labelWidth, plotWidth, laneTop, 28)} fill="none" stroke={laneColor} strokeLinecap="square" strokeLinejoin="miter" strokeWidth={laneIndex === 0 ? 1.8 : 1.2} />
                {lane.points.map((point, pointIndex) => {
                  if (point.normalizedValue == null) return null;
                  const x = labelWidth + (pointIndex / Math.max(1, lane.points.length - 1)) * plotWidth;
                  const y = laneTop + (1 - point.normalizedValue) * 28;
                  return <Circle cx={x} cy={y} fill={laneColor} key={`${lane.id}:${point.day}`} r={laneIndex === 0 ? 2.2 : 1.6} />;
                })}
              </React.Fragment>
            );
          })}
          {timeline.events.map((event) => {
            const index = timeline.lanes[0]?.points.findIndex((point) => point.day === event.timestamp.slice(0, 10)) ?? -1;
            if (index < 0) return null;
            const x = labelWidth + (index / Math.max(1, (timeline.lanes[0]?.points.length ?? 1) - 1)) * plotWidth;
            return <Line key={event.id} opacity={0.62} stroke={theme.glow.supporting} strokeDasharray="2 2" strokeWidth={0.8} x1={x} x2={x} y1={headerHeight - 1} y2={height - footerHeight + 2} />;
          })}
          <SvgText fill={theme.text.metadata} fontSize={8} x={labelWidth} y={height - 3}>{t(language, 'quantInterpretationDayMinusSeven')}</SvgText>
          <SvgText fill={theme.text.metadata} fontSize={8} textAnchor="end" x={labelWidth + plotWidth} y={height - 3}>{t(language, 'quantInterpretationToday')}</SvgText>
        </Svg>
      ) : (
        <Text style={{ color: theme.text.secondary }}>{t(language, 'quantInterpretationTimelineUnavailable')}</Text>
      )}
      {timeline.events.length ? (
        <WebView dataSet={{ 'quant-interpretation-role': 'timeline-events' }}>
          {timeline.events.slice(-3).map((event) => (
            <Text key={event.id} style={{ color: theme.text.metadata }}>{event.timestamp.slice(5, 10)} · {copy(language, event.shortLabel)}</Text>
          ))}
        </WebView>
      ) : null}
      <Text style={{ color: theme.text.metadata }}>{t(language, 'quantInterpretationAlignmentNotCause')}</Text>
    </WebView>
  );
}

export function ScenarioBranchVisual({
  branch,
  language,
  theme,
}: {
  branch: QuantScenarioPresentationBranch;
  language: Lang;
  theme: V11ThemeTokens;
}) {
  const support = branch.supportCount ?? 0;
  const counter = branch.counterexampleCount ?? 0;
  const missing = branch.missingOutcomeCount ?? 0;
  const total = Math.max(1, support + counter + missing);
  const point = branch.medianOutcomeChange == null ? null : Math.max(8, Math.min(152, 80 + branch.medianOutcomeChange * 30));
  return (
    <WebView dataSet={{ 'quant-interpretation-evidence': branch.evidenceState, 'quant-interpretation-role': 'scenario-branch' }}>
      <WebView dataSet={{ 'quant-interpretation-role': 'row-heading' }}>
        <Text style={{ color: theme.text.primary }}>{t(language, `quantInterpretationAction_${branch.actionKey}`)}</Text>
        <Text style={{ color: theme.text.metadata }}>{t(language, `quantInterpretationScenarioState_${branch.evidenceState}`)}</Text>
      </WebView>
      <Svg accessibilityRole="image" height={42} viewBox="0 0 160 42" width="100%">
        <Line stroke={theme.questTheme.colors.border} strokeWidth={1} x1={8} x2={152} y1={21} y2={21} />
        <Line opacity={0.7} stroke={theme.text.metadata} strokeDasharray="2 3" strokeWidth={0.75} x1={80} x2={80} y1={7} y2={35} />
        {point == null ? <Line stroke={theme.text.metadata} strokeDasharray="2 3" strokeWidth={1} x1={54} x2={106} y1={21} y2={21} /> : <><Line stroke={theme.glow.primary} strokeWidth={2} x1={80} x2={point} y1={21} y2={21} /><Circle cx={point} cy={21} fill={theme.glow.primary} r={3} /></>}
      </Svg>
      <WebView dataSet={{ 'quant-interpretation-role': 'scenario-evidence-bar' }}>
        <WebView style={{ flex: support / total }} />
        <WebView style={{ flex: counter / total }} />
        <WebView style={{ flex: missing / total }} />
      </WebView>
      <WebView dataSet={{ 'quant-interpretation-role': 'scenario-facts' }}>
        <Text style={{ color: theme.text.secondary }}>
          {branch.comparableCount == null
            ? t(language, 'quantInterpretationNoComparableHistory')
            : t(language, 'quantInterpretationComparableHistory').replace('{count}', String(branch.comparableCount))}
        </Text>
        <Text style={{ color: theme.text.metadata }}>
          {t(language, 'quantInterpretationScenarioEvidenceCompact')
            .replace('{support}', String(branch.supportCount ?? 0))
            .replace('{counter}', String(branch.counterexampleCount ?? 0))
            .replace('{missing}', String(branch.missingOutcomeCount ?? 0))}
        </Text>
      </WebView>
    </WebView>
  );
}
