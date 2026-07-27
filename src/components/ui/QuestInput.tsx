import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { getQuestTheme, questLayout, QuestTheme } from '../../design/tokens';

type Props = TextInputProps & {
  questTheme?: QuestTheme;
  status?: 'default' | 'success' | 'error';
};

export default function QuestInput({
  questTheme,
  style,
  placeholderTextColor,
  status = 'default',
  onFocus,
  onBlur,
  ...props
}: Props) {
  const q = questTheme ?? getQuestTheme();
  const [focused, setFocused] = React.useState(false);
  const Input = TextInput as any;
  const borderColor =
    status === 'error' ? q.colors.danger
      : status === 'success' ? q.colors.success
        : focused ? q.colors.primary
          : q.colors.inputBorder;
  return (
    <Input
      className="quest-input"
      data-state={status === 'default' ? (focused ? 'focused' : 'idle') : status}
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
      placeholderTextColor={placeholderTextColor ?? q.colors.textSubtle}
      onFocus={(event: any) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event: any) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        {
          minHeight: questLayout.controlMinHeight,
          backgroundColor: q.colors.inputBg,
          borderRadius: q.radius.md,
          paddingHorizontal: q.spacing.md,
          paddingVertical: q.spacing.sm,
          color: q.colors.text,
          borderWidth: 1,
          borderColor,
          fontSize: q.typography.bodySize,
          lineHeight: q.typography.bodyLineHeight,
        },
        style,
      ]}
    />
  );
}
