import React from 'react';
import { Text, View } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  questTheme?: QuestTheme;
};

export default function QuestSection({ title, subtitle, children, questTheme }: Props) {
  const q = questTheme ?? getQuestTheme();
  return (
    <View style={{ marginTop: q.spacing.section }}>
      <Text style={{
        color: q.colors.text,
        fontSize: q.typography.sectionTitleSize,
        lineHeight: q.typography.sectionTitleLineHeight,
        fontWeight: q.typography.weightBold,
        marginBottom: q.spacing.xs,
      }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{
          color: q.colors.textMuted,
          fontSize: q.typography.helperSize,
          lineHeight: q.typography.helperLineHeight,
          marginBottom: q.spacing.sm,
        }}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
