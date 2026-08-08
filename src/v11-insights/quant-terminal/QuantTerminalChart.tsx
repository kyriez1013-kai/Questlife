import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import type {
  QuantTerminalMetric,
  QuantTerminalPoint,
} from './quantTerminalPresentation';

const WebView = View as any;
const WIDTH = 760;
const HEIGHT = 250;
const LEFT = 42;
const RIGHT = 18;
const TOP = 18;
const BOTTOM = 34;

function bounds(metric: QuantTerminalMetric) {
  const values = metric.points.flatMap((point) => {
    if (point.value == null) return [];
    return point.uncertainty
      ? [point.value, point.uncertainty.low, point.uncertainty.high]
      : [point.value];
  });
  if (metric.baseline.min != null) values.push(metric.baseline.min);
  if (metric.baseline.max != null) values.push(metric.baseline.max);
  if (metric.baseline.value != null) values.push(metric.baseline.value);
  const minimum = Math.min(...values, 0);
  const maximum = Math.max(...values, 1);
  const span = Math.max(1, maximum - minimum);
  return { minimum: minimum - span * 0.12, maximum: maximum + span * 0.12 };
}

function geometry(metric: QuantTerminalMetric) {
  const { minimum, maximum } = bounds(metric);
  const usableWidth = WIDTH - LEFT - RIGHT;
  const usableHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => LEFT + index / Math.max(1, metric.points.length - 1) * usableWidth;
  const y = (value: number) => TOP + (1 - (value - minimum) / Math.max(0.001, maximum - minimum)) * usableHeight;
  return {
    minimum,
    maximum,
    x,
    y,
    rows: metric.points.map((point, index) => ({ ...point, x: x(index), y: point.value == null ? null : y(point.value) })),
  };
}

function segments(rows: ReturnType<typeof geometry>['rows']) {
  const result: string[] = [];
  let path = '';
  rows.forEach((point) => {
    if (point.y == null) {
      if (path) result.push(path);
      path = '';
      return;
    }
    path += `${path ? ' L' : 'M'} ${point.x} ${point.y}`;
  });
  if (path) result.push(path);
  return result;
}

export default function QuantTerminalChart({
  language,
  metric,
  onSelectPoint,
  selectedDate,
  theme,
}: {
  language: Lang;
  metric: QuantTerminalMetric;
  onSelectPoint: (point: QuantTerminalPoint) => void;
  selectedDate: string | null;
  theme: V11ThemeTokens;
}) {
  const plot = useMemo(() => geometry(metric), [metric]);
  const lineSegments = useMemo(() => segments(plot.rows), [plot.rows]);
  const bandTop = metric.baseline.max == null ? null : plot.y(metric.baseline.max);
  const bandBottom = metric.baseline.min == null ? null : plot.y(metric.baseline.min);
  const baselineY = metric.baseline.value == null ? null : plot.y(metric.baseline.value);
  const labelIndexes = [0, 7, 14, 21, 29];

  return (
    <WebView
      accessibilityLabel={t(language, 'quantTrendAccessibility')}
      accessibilityRole="image"
      dataSet={{ 'quant-terminal-role': 'chart' }}
    >
      <Svg height="100%" preserveAspectRatio="none" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%">
        {Array.from({ length: 7 }, (_, index) => {
          const x = LEFT + index / 6 * (WIDTH - LEFT - RIGHT);
          return (
            <Line
              key={`grid-${index}`}
              stroke={theme.questTheme.colors.border}
              strokeOpacity={index === 0 || index === 6 ? 0.58 : 0.28}
              strokeWidth={0.55}
              x1={x}
              x2={x}
              y1={TOP}
              y2={HEIGHT - BOTTOM}
            />
          );
        })}

        {bandTop != null && bandBottom != null ? (
          <Rect
            fill={theme.glow.supporting}
            height={Math.max(1, bandBottom - bandTop)}
            opacity={0.1}
            width={WIDTH - LEFT - RIGHT}
            x={LEFT}
            y={bandTop}
          />
        ) : null}

        {baselineY != null ? (
          <Line
            stroke={theme.text.secondary}
            strokeDasharray="4 5"
            strokeOpacity={0.68}
            strokeWidth={0.8}
            x1={LEFT}
            x2={WIDTH - RIGHT}
            y1={baselineY}
            y2={baselineY}
          />
        ) : null}

        {lineSegments.map((path, index) => (
          <Path
            d={path}
            fill="none"
            key={`line-${index}`}
            stroke={theme.glow.primary}
            strokeLinecap="square"
            strokeLinejoin="round"
            strokeWidth={1.5}
          />
        ))}

        {plot.rows.map((point) => {
          if (point.y == null) {
            return (
              <Circle
                cx={point.x}
                cy={HEIGHT - BOTTOM + 7}
                fill={theme.questTheme.colors.border}
                key={point.date}
                opacity={0.54}
                r={1.2}
              />
            );
          }
          return (
            <React.Fragment key={point.date}>
              {point.uncertainty ? (
                <Line
                  stroke={theme.glow.supporting}
                  strokeOpacity={0.46}
                  strokeWidth={1}
                  x1={point.x}
                  x2={point.x}
                  y1={plot.y(point.uncertainty.high)}
                  y2={plot.y(point.uncertainty.low)}
                />
              ) : null}
              <Circle
                accessibilityLabel={`${point.date}: ${point.value}`}
                cx={point.x}
                cy={point.y}
                fill={theme.glow.primary}
                onPress={() => onSelectPoint(point)}
                r={selectedDate === point.date ? 5 : 2.8}
                stroke={selectedDate === point.date ? theme.text.primary : theme.glow.primary}
                strokeWidth={selectedDate === point.date ? 1.2 : 0}
              />
            </React.Fragment>
          );
        })}

        {labelIndexes.map((index) => {
          const point = plot.rows[index];
          if (!point) return null;
          return (
            <SvgText
              fill={theme.text.metadata}
              fontSize="10"
              key={`label-${point.date}`}
              textAnchor={index === 0 ? 'start' : index === 29 ? 'end' : 'middle'}
              x={point.x}
              y={HEIGHT - 8}
            >
              {point.label}
            </SvgText>
          );
        })}
      </Svg>
      <WebView dataSet={{ 'quant-terminal-role': 'chart-legend' }}>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantLegendObserved')}</Text>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantLegendBaseline')}</Text>
        <Text style={{ color: theme.text.metadata }}>{t(language, 'quantLegendMissing')}</Text>
      </WebView>
    </WebView>
  );
}
