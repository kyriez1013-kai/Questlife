import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from 'react-native-svg';

const WebView = View as any;

type InstrumentProps = {
  accessibilityLabel: string;
  color: string;
  mutedColor: string;
  size?: number;
};

function InstrumentFrame({
  accessibilityLabel,
  children,
  size,
}: {
  accessibilityLabel: string;
  children: React.ReactNode;
  size: number;
}) {
  return (
    <WebView
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      dataSet={{ 'v11-component': 'micro-instrument' }}
      style={{ width: size, height: size }}
    >
      {children}
    </WebView>
  );
}

export function V11RadialGauge({
  accessibilityLabel,
  color,
  mutedColor,
  size = 56,
  value = 0.62,
}: InstrumentProps & { value?: number }) {
  const safeValue = Math.max(0, Math.min(1, value));
  const angle = -120 + safeValue * 240;
  const radians = angle * Math.PI / 180;
  const pointerX = 28 + Math.cos(radians) * 15;
  const pointerY = 28 + Math.sin(radians) * 15;

  return (
    <InstrumentFrame accessibilityLabel={accessibilityLabel} size={size}>
      <Svg width="100%" height="100%" viewBox="0 0 56 56">
        {Array.from({ length: 25 }, (_, index) => {
          const tickAngle = -120 + index * 10;
          const active = index / 24 <= safeValue;
          return (
            <Line
              key={tickAngle}
              x1={28}
              y1={6}
              x2={28}
              y2={active ? 10 : 9}
              stroke={active ? color : mutedColor}
              strokeWidth={active ? 1 : 0.5}
              transform={`rotate(${tickAngle + 90} 28 28)`}
            />
          );
        })}
        <Line
          x1={28}
          y1={28}
          x2={pointerX}
          y2={pointerY}
          stroke={color}
          strokeWidth={1}
        />
        <Circle cx={28} cy={28} r={2} fill={color} />
      </Svg>
    </InstrumentFrame>
  );
}

export function V11Sparkline({
  accessibilityLabel,
  color,
  mutedColor,
  size = 56,
  values = [0.28, 0.42, 0.35, 0.64, 0.58, 0.76],
}: InstrumentProps & { values?: number[] }) {
  const denominator = Math.max(1, values.length - 1);
  const points = values.map((value, index) => {
    const x = 5 + index / denominator * 46;
    const y = 47 - Math.max(0, Math.min(1, value)) * 38;
    return `${x},${y}`;
  }).join(' ');
  const finalPoint = points.split(' ').at(-1)?.split(',') ?? ['51', '28'];

  return (
    <InstrumentFrame accessibilityLabel={accessibilityLabel} size={size}>
      <Svg width="100%" height="100%" viewBox="0 0 56 56">
        <Line x1={5} y1={47} x2={51} y2={47} stroke={mutedColor} strokeWidth={0.5} />
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle
          cx={Number(finalPoint[0])}
          cy={Number(finalPoint[1])}
          r={2}
          fill={color}
        />
      </Svg>
    </InstrumentFrame>
  );
}

export function V11Distribution({
  accessibilityLabel,
  color,
  mutedColor,
  size = 56,
  values = [0.24, 0.46, 0.72, 0.58, 0.36, 0.62, 0.82],
}: InstrumentProps & { values?: number[] }) {
  const barWidth = 4;
  const gap = 2.5;
  const totalWidth = values.length * barWidth + (values.length - 1) * gap;
  const startX = (56 - totalWidth) / 2;

  return (
    <InstrumentFrame accessibilityLabel={accessibilityLabel} size={size}>
      <Svg width="100%" height="100%" viewBox="0 0 56 56">
        {values.map((value, index) => {
          const height = Math.max(2, Math.min(1, value) * 40);
          return (
            <Rect
              key={`${index}-${value}`}
              x={startX + index * (barWidth + gap)}
              y={48 - height}
              width={barWidth}
              height={height}
              rx={2}
              fill={index === values.length - 1 ? color : mutedColor}
            />
          );
        })}
      </Svg>
    </InstrumentFrame>
  );
}

export function V11ArcRange({
  accessibilityLabel,
  color,
  mutedColor,
  size = 56,
  value = 0.68,
}: InstrumentProps & { value?: number }) {
  const safeValue = Math.max(0, Math.min(1, value));
  const angle = -150 + safeValue * 120;
  const radians = angle * Math.PI / 180;
  const markerX = 28 + Math.cos(radians) * 20;
  const markerY = 34 + Math.sin(radians) * 20;

  return (
    <InstrumentFrame accessibilityLabel={accessibilityLabel} size={size}>
      <Svg width="100%" height="100%" viewBox="0 0 56 56">
        <Path
          d="M 10.7 44 A 20 20 0 0 1 45.3 44"
          fill="none"
          stroke={mutedColor}
          strokeWidth={1}
        />
        <Path
          d="M 15 39 A 15 15 0 0 1 41 39"
          fill="none"
          stroke={color}
          strokeWidth={0.75}
        />
        <Circle cx={markerX} cy={markerY} r={2.2} fill={color} />
      </Svg>
    </InstrumentFrame>
  );
}

export function V11IntervalRange({
  accessibilityLabel,
  color,
  mutedColor,
  size = 56,
  start = 0.24,
  end = 0.74,
  current = 0.58,
}: InstrumentProps & {
  current?: number;
  end?: number;
  start?: number;
}) {
  const x = (value: number) => 7 + Math.max(0, Math.min(1, value)) * 42;
  const currentX = x(current);

  return (
    <InstrumentFrame accessibilityLabel={accessibilityLabel} size={size}>
      <Svg width="100%" height="100%" viewBox="0 0 56 56">
        <Line x1={7} y1={30} x2={49} y2={30} stroke={mutedColor} strokeWidth={1} />
        <Line x1={x(start)} y1={30} x2={x(end)} y2={30} stroke={color} strokeWidth={1.5} />
        <Line x1={x(start)} y1={25} x2={x(start)} y2={35} stroke={color} strokeWidth={0.75} />
        <Line x1={x(end)} y1={25} x2={x(end)} y2={35} stroke={color} strokeWidth={0.75} />
        <Path
          d={`M ${currentX - 3} 20 L ${currentX + 3} 20 L ${currentX} 25 Z`}
          fill={color}
        />
      </Svg>
    </InstrumentFrame>
  );
}
