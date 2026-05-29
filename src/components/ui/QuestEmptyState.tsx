import React from 'react';
import { Text, View } from 'react-native';
import { getQuestTheme, QuestTheme } from '../../design/tokens';
import { getSurfaceStyle } from '../../design/surfaces';
import QuestIcon, { QuestIconName } from './QuestIcon';

type Props = {
  title: string;
  body?: string;
  icon?: QuestIconName;
  questTheme?: QuestTheme;
};

export default function QuestEmptyState({ title, body, icon = 'target', questTheme }: Props) {
  const q = questTheme ?? getQuestTheme();
  const surface = getSurfaceStyle(q, 'empty');
  const soft = getSurfaceStyle(q, 'soft');
  const EmptyView = View as any;
  return (
    <EmptyView className="empty-state" style={{ ...surface, borderWidth: 1, borderStyle: 'dashed', borderRadius: q.radius.lg, padding: q.spacing.xl, alignItems: 'center' }}>
      <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: soft.backgroundColor, alignItems: 'center', justifyContent: 'center', marginBottom: q.spacing.md }}>
        <QuestIcon name={icon} size={22} color={q.colors.primary} />
      </View>
      <Text style={{ color: q.colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
      {body ? <Text style={{ color: q.colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: q.spacing.sm }}>{body}</Text> : null}
    </EmptyView>
  );
}
