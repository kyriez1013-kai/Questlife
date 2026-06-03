import React from 'react';
import { Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
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
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const filled = ['primary', 'danger', 'success', 'emergency'].includes(variant);
  const bg =
    disabled ? q.colors.disabledBg
      : variant === 'danger' ? q.colors.danger
      : variant === 'success' ? q.colors.success
        : variant === 'emergency' ? q.colors.warning
          : variant === 'secondary' ? q.colors.chipSelectedBg
            : variant === 'ghost' ? q.colors.chipBg
              : q.colors.primary;
  const fg = disabled ? q.colors.disabledText : filled ? q.colors.primaryText : q.colors.primary;
  const borderColor =
    disabled ? q.colors.inputBorder
      : variant === 'ghost' || variant === 'secondary' ? q.colors.chipBorder
        : q.colors.borderStrong;
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          minHeight: 38,
          borderRadius: q.radius.pill,
          paddingHorizontal: 13,
          paddingVertical: 9,
          borderWidth: variant === 'ghost' || variant === 'secondary' || disabled ? 1 : 0,
          borderColor,
          backgroundColor: bg,
          opacity: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <QuestIcon name={icon} size={16} color={fg} strokeWidth={2.4} /> : null}
        {children ?? <Text style={{ color: fg, fontSize: 12, fontWeight: '800' }}>{label}</Text>}
      </View>
    </TouchableOpacity>
  );
}
