import React from 'react';
import { Text, TouchableOpacity, ViewStyle } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
import { getSurfaceStyle } from '../../design/surfaces';

type Props = {
  label: string;
  active?: boolean;
  variant?: 'default' | 'muted' | 'success' | 'warning' | 'danger';
  questTheme?: QuestTheme;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export default function QuestPill({ label, active, variant = 'default', questTheme, onPress, style }: Props) {
  const q = questTheme ?? getQuestTheme();
  const color =
    variant === 'success' ? q.colors.success
      : variant === 'warning' ? q.colors.warning
        : variant === 'danger' ? q.colors.danger
          : q.colors.primary;
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: q.radius.pill,
          borderWidth: 1,
          borderColor: active ? color : q.colors.border,
          backgroundColor: active ? color : getSurfaceStyle(q, variant === 'muted' ? 'soft' : 'row').backgroundColor,
        },
        style,
      ]}
    >
      <Text style={{ color: active ? q.colors.primaryText : q.colors.textMuted, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </TouchableOpacity>
  );
}
