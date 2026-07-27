import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { getQuestTheme, questLayout, QuestTheme } from '../../design/tokens';

export type QuestSegmentOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: QuestSegmentOption<T>[];
  onChange: (value: T) => void;
  questTheme?: QuestTheme;
  accessibilityLabel?: string;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
};

export default function QuestSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  questTheme,
  accessibilityLabel,
  style,
  disabled = false,
}: Props<T>) {
  const q = questTheme ?? getQuestTheme();
  const Container = View as any;
  const Segment = Pressable as any;

  return (
    <Container
      className="quest-segmented-control"
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          gap: q.spacing.xs,
          padding: q.spacing.xs,
          borderRadius: q.radius.md,
          backgroundColor: q.colors.surfaceSoft,
          borderWidth: 1,
          borderColor: q.colors.divider,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Segment
            key={option.value}
            className="quest-segment-option"
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }: { pressed: boolean }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: questLayout.controlMinHeight,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: q.spacing.sm,
              paddingVertical: q.spacing.sm,
              borderRadius: q.radius.sm,
              borderWidth: 1,
              borderColor: selected ? q.colors.borderStrong : 'transparent',
              backgroundColor: selected
                ? q.colors.surfaceElevated
                : pressed
                  ? q.colors.cardSurfaceHover
                  : 'transparent',
              opacity: disabled ? 0.72 : 1,
            })}
          >
            <Text
              numberOfLines={2}
              style={{
                color: selected ? q.colors.text : q.colors.textMuted,
                fontSize: q.typography.buttonSize,
                lineHeight: q.typography.metaLineHeight,
                fontWeight: q.typography.weightBold,
                textAlign: 'center',
              }}
            >
              {option.label}
            </Text>
          </Segment>
        );
      })}
    </Container>
  );
}
