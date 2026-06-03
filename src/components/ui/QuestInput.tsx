import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';

type Props = TextInputProps & {
  questTheme?: QuestTheme;
};

export default function QuestInput({ questTheme, style, placeholderTextColor, ...props }: Props) {
  const q = questTheme ?? getQuestTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholderTextColor ?? q.colors.textSubtle}
      style={[
        {
          backgroundColor: q.colors.inputBg,
          borderRadius: q.radius.md,
          padding: 12,
          color: q.colors.text,
          borderWidth: 1,
          borderColor: q.colors.inputBorder,
          fontSize: 14,
        },
        style,
      ]}
    />
  );
}
