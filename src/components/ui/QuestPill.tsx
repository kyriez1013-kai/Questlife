import React from 'react';
import { Pressable, Text, ViewStyle } from 'react-native';
import { getQuestTheme, questLayout, QuestTheme } from '../../design/tokens';

type Props = {
  label: string;
  active?: boolean;
  variant?: 'default' | 'muted' | 'success' | 'warning' | 'danger';
  questTheme?: QuestTheme;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  accessibilityLabel?: string;
};

export default function QuestPill({ label, active, variant = 'default', questTheme, onPress, style, disabled, accessibilityLabel }: Props) {
  const q = questTheme ?? getQuestTheme();
  const color =
    variant === 'success' ? q.colors.success
      : variant === 'warning' ? q.colors.warning
        : variant === 'danger' ? q.colors.danger
          : q.colors.primary;
  const Pill = Pressable as any;
  return (
    <Pill
      className="quest-pill quest-interactive"
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: Boolean(active), disabled: Boolean(disabled) }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        {
          minHeight: onPress ? questLayout.controlMinHeight : undefined,
          justifyContent: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: q.radius.pill,
          borderWidth: 1,
          borderColor: active ? color : q.colors.chipBorder,
          backgroundColor: active
            ? q.colors.chipSelectedBg
            : pressed
              ? q.colors.cardSurfaceHover
              : q.colors.chipBg,
          opacity: disabled ? 0.72 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: active ? color : q.colors.textMuted, fontSize: 12, fontWeight: '800' }}>{label}</Text>
    </Pill>
  );
}
