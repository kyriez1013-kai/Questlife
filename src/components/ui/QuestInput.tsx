import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { getQuestTheme, questLayout, QuestTheme } from '../../design/tokens';

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
          minHeight: questLayout.controlMinHeight,
          backgroundColor: q.colors.inputBg,
          borderRadius: q.radius.md,
          paddingHorizontal: q.spacing.md,
          paddingVertical: q.spacing.sm,
          color: q.colors.text,
          borderWidth: 1,
          borderColor: q.colors.inputBorder,
          fontSize: q.typography.bodySize,
          lineHeight: q.typography.bodyLineHeight,
        },
        style,
      ]}
    />
  );
}
