import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { QuestTheme } from '../../design/tokens';
import QuestButton from '../ui/QuestButton';
import QuestCard from '../ui/QuestCard';
import QuestIcon from '../ui/QuestIcon';

export type TodayStateOption = {
  value: number;
  label: string;
  toneColor: string;
};

type Props = {
  questTheme: QuestTheme;
  title: string;
  summary: string;
  time?: string;
  detailedLabel: string;
  options: TodayStateOption[];
  onSelect: (value: number) => void;
  onOpenDetailed: () => void;
};

export default function TodayStateStrip({
  questTheme,
  title,
  summary,
  time,
  detailedLabel,
  options,
  onSelect,
  onOpenDetailed,
}: Props) {
  return (
    <QuestCard questTheme={questTheme} variant="flat" style={{ gap: questTheme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: questTheme.spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: questTheme.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: questTheme.colors.primarySoft,
            flexShrink: 0,
          }}
        >
          <QuestIcon name="activity" size={18} color={questTheme.colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              color: questTheme.colors.textMuted,
              fontSize: questTheme.typography.metaSize,
              lineHeight: questTheme.typography.metaLineHeight,
              fontWeight: questTheme.typography.weightBold,
            }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: questTheme.colors.text,
              fontSize: questTheme.typography.cardTitleSize,
              lineHeight: questTheme.typography.cardTitleLineHeight,
              fontWeight: questTheme.typography.weightBold,
            }}
          >
            {summary}{time ? ` · ${time}` : ''}
          </Text>
        </View>
        <QuestButton
          questTheme={questTheme}
          variant="ghost"
          label={detailedLabel}
          onPress={onOpenDetailed}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: questTheme.spacing.xs }}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            accessibilityLabel={option.label}
            activeOpacity={0.76}
            onPress={() => onSelect(option.value)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              borderRadius: questTheme.radius.md,
              backgroundColor: questTheme.colors.surface,
              borderWidth: 1,
              borderColor: questTheme.colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: questTheme.spacing.xxs,
              gap: questTheme.spacing.xxs,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: questTheme.radius.pill,
                backgroundColor: option.toneColor,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                color: questTheme.colors.textMuted,
                fontSize: questTheme.typography.metaSize,
                lineHeight: questTheme.typography.metaLineHeight,
                fontWeight: questTheme.typography.weightBold,
                maxWidth: '100%',
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </QuestCard>
  );
}
