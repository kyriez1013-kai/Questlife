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
    <View style={{ marginTop: q.spacing.xl }}>
      <Text style={{ color: q.colors.text, fontSize: q.typography.sectionTitleSize, fontWeight: q.typography.weightBold, marginBottom: 4 }}>
        {title}
      </Text>
      {subtitle ? <Text style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize, marginBottom: q.spacing.md }}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}
