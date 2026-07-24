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
    <EmptyView
      className="empty-state"
      style={{
        ...surface,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: q.radius.md,
        padding: q.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: q.spacing.sm,
      }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: soft.backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
        <QuestIcon name={icon} size={18} color={q.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: q.colors.text, fontSize: q.typography.cardTitleSize, lineHeight: q.typography.cardTitleLineHeight, fontWeight: '800' }}>{title}</Text>
        {body ? <Text style={{ color: q.colors.textMuted, fontSize: q.typography.helperSize, lineHeight: q.typography.helperLineHeight, marginTop: q.spacing.xs }}>{body}</Text> : null}
      </View>
    </EmptyView>
  );
}
