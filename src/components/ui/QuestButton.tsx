import React from 'react';
import { ActivityIndicator, Pressable, Text, View, ViewStyle } from 'react-native';
import { getQuestTheme, questLayout, QuestTheme } from '../../design/tokens';
import QuestIcon, { QuestIconName } from './QuestIcon';

type Props = {
  label?: string;
  children?: React.ReactNode;
  icon?: QuestIconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'emergency';
  questTheme?: QuestTheme;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  loading?: boolean;
  status?: 'idle' | 'success' | 'error';
  accessibilityLabel?: string;
};

export default function QuestButton({
  label,
  children,
  icon,
  variant = 'primary',
  questTheme,
  onPress,
  style,
  disabled,
  loading = false,
  status = 'idle',
  accessibilityLabel,
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const resolvedVariant =
    status === 'success' ? 'success'
      : status === 'error' ? 'danger'
        : variant;
  const isDisabled = disabled || loading;
  const bg =
    isDisabled ? q.colors.disabledBg
      : resolvedVariant === 'danger' ? q.colors.danger
      : resolvedVariant === 'success' ? q.colors.success
        : resolvedVariant === 'emergency' ? q.colors.warning
          : resolvedVariant === 'secondary' ? q.colors.chipSelectedBg
            : resolvedVariant === 'ghost' ? q.colors.chipBg
              : q.colors.primary;
  const resolvedFilled = ['primary', 'danger', 'success', 'emergency'].includes(resolvedVariant);
  const fg = isDisabled ? q.colors.disabledText : resolvedFilled ? q.colors.primaryText : q.colors.primary;
  const borderColor =
    isDisabled ? q.colors.inputBorder
      : resolvedVariant === 'ghost' || resolvedVariant === 'secondary' ? q.colors.chipBorder
        : q.colors.borderStrong;
  const Button = Pressable as any;
  return (
    <Button
      className="quest-button quest-interactive"
      data-state={isDisabled ? 'disabled' : loading ? 'loading' : status}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        {
          minHeight: questLayout.controlMinHeight,
          borderRadius: q.radius.pill,
          paddingHorizontal: q.spacing.md,
          paddingVertical: q.spacing.sm,
          borderWidth: resolvedVariant === 'ghost' || resolvedVariant === 'secondary' || isDisabled ? 1 : 0,
          borderColor,
          backgroundColor: bg,
          opacity: pressed && !isDisabled ? 0.86 : 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: q.spacing.tight, maxWidth: '100%' }}>
        {loading ? <ActivityIndicator size="small" color={fg} /> : icon ? <QuestIcon name={icon} size={16} color={fg} strokeWidth={2.4} /> : null}
        {children ?? (
          <Text
            numberOfLines={2}
            style={{
              color: fg,
              fontSize: q.typography.buttonSize,
              fontWeight: q.typography.weightBold,
              textAlign: 'center',
              flexShrink: 1,
            }}
          >
            {label}
          </Text>
        )}
      </View>
    </Button>
  );
}
