import React from 'react';
import { Text, View, ViewStyle } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
import QuestIcon, { QuestIconName } from './QuestIcon';

type Props = {
  icon?: string;
  systemIcon?: QuestIconName;
  color?: string;
  questTheme?: QuestTheme;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  style?: ViewStyle | ViewStyle[];
  preferEmoji?: boolean;
};

const sizeMap = {
  sm: { box: 32, icon: 16, font: 15, radius: 11 },
  md: { box: 42, icon: 20, font: 19, radius: 14 },
  lg: { box: 52, icon: 24, font: 24, radius: 17 },
  xl: { box: 64, icon: 30, font: 30, radius: 21 },
};

function looksLikeEmoji(value?: string) {
  return !!value && !/^[a-z_ -]+$/i.test(value) && value.length <= 4;
}

export default function QuestEntityIcon({
  icon,
  systemIcon = 'target',
  color,
  questTheme,
  size = 'md',
  shape = 'rounded',
  style,
  preferEmoji = false,
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const s = sizeMap[size];
  const bg = color ? `${color}22` : q.colors.primarySoft;
  const fg = color ?? q.colors.primary;
  const showEmoji = preferEmoji && looksLikeEmoji(icon);
  return (
    <View
      style={[
        {
          width: s.box,
          height: s.box,
          borderRadius: shape === 'circle' ? s.box / 2 : s.radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: color ? `${color}55` : q.colors.border,
        },
        style,
      ]}
    >
      {showEmoji ? (
        <Text style={{ fontSize: s.font, lineHeight: s.font + 3 }}>{icon}</Text>
      ) : (
        <QuestIcon name={systemIcon} size={s.icon} color={fg} strokeWidth={2.35} />
      )}
    </View>
  );
}
