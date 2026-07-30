import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import {
  V11EvidenceStage,
  V11ThemeTokens,
  v11EvidenceVisual,
} from '../tokens';

const WebView = View as any;

export type V11GlowOrbProps = {
  stage: V11EvidenceStage;
  theme: V11ThemeTokens;
  tone?: 'primary' | 'supporting';
  style?: any;
};

export default function V11GlowOrb({
  stage,
  style,
  theme,
  tone = 'primary',
}: V11GlowOrbProps) {
  const gradientId = `v11Glow${useId().replace(/:/g, '')}`;
  const evidence = v11EvidenceVisual[stage];
  const supporting = tone === 'supporting';
  const diameter = supporting
    ? theme.glow.supportingDiameter
    : theme.glow.primaryDiameter;
  const blur = supporting
    ? theme.glow.supportingBlur
    : theme.glow.primaryBlur;
  const color = supporting
    ? theme.glow.supporting
    : theme.glow.primary;
  const opacity = supporting
    ? evidence.glowOpacity * 0.58
    : evidence.glowOpacity;

  return (
    <WebView
      pointerEvents="none"
      dataSet={{
        'v11-component': 'glow-orb',
        'v11-stage': stage.toLowerCase(),
        'v11-tone': tone,
      }}
      style={[
        {
          width: diameter,
          height: diameter,
          opacity,
          '--v11-glow-blur': `${blur}px`,
          '--v11-glow-saturation': `${Math.round(evidence.glowSaturation * 100)}%`,
          '--v11-glow-scale': String(evidence.glowScale),
          '--v11-glow-scale-min': String(evidence.glowScale * 0.96),
          '--v11-glow-scale-max': String(evidence.glowScale * 1.04),
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 280 280">
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.72} />
            <Stop offset="34%" stopColor={color} stopOpacity={0.38} />
            <Stop offset="68%" stopColor={color} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={140} cy={140} r={140} fill={`url(#${gradientId})`} />
      </Svg>
    </WebView>
  );
}
