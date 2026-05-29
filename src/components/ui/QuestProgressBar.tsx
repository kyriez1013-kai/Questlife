import React from 'react';
import { View, ViewStyle } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';

type Props = {
  value: number | null | undefined;
  questTheme?: QuestTheme;
  color?: string;
  height?: number;
  style?: ViewStyle | ViewStyle[];
};

export default function QuestProgressBar({ value, questTheme, color, height = 8, style }: Props) {
  const q = questTheme ?? getQuestTheme();
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, Number(value))) : 0;
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: q.colors.surfaceSoft, overflow: 'hidden' }, style]}>
      <View style={{ height: '100%', width: `${safeValue}%`, borderRadius: height / 2, backgroundColor: color ?? q.colors.primary }} />
    </View>
  );
}
