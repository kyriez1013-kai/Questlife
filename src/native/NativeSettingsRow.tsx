import React from 'react';
import { Pressable, Text, View } from 'react-native';
import QuestIcon, { type QuestIconName } from '../components/ui/QuestIcon';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';
import { useNativeTheme } from './NativeControls';

export default function NativeSettingsRow({ label, summary, icon, onPress }: {
  label: string;
  summary?: string;
  icon: QuestIconName;
  onPress: () => void;
}) {
  const f = useNativeTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={summary ? `${label}, ${summary}` : label}
    onPress={onPress} style={({ pressed }) => ({
      minHeight: f.layout.touch, paddingVertical: f.spacing.sm, gap: f.layout.gap,
      flexDirection: 'row', alignItems: 'center', backgroundColor: pressed ? f.material.muted : undefined,
    })}>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ flexShrink: 0 }}>
      <QuestIcon name={icon} size={f.typography.body} color={f.text.secondary} />
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: f.spacing.xs }}>
      <Text style={[f.type.body, { color: f.text.primary }]}>{label}</Text>
      {summary ? <Text style={[f.type.metadata, { color: f.text.secondary }]}>{summary}</Text> : null}
    </View>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ transform: [{ rotate: '-90deg' }], flexShrink: 0 }}>
      <V11RebaselineIcon name="chevron-down" size={f.typography.secondary} color={f.text.secondary} />
    </View>
  </Pressable>;
}
