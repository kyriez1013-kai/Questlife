import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import type { QuestTheme } from '../design/tokens';
import { questLayout } from '../design/tokens';
import V11RebaselineIcon from '../v11-stage2-rebaseline/V11RebaselineIcon';

/** Presentation-only; field state stays with the original form when collapsed. */
export default function NativeFormDisclosure({ title, summary, q, children }: {
  title: string; summary?: string; q: QuestTheme; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') return <>{children}</>;
  return <View style={{ borderTopWidth: 1, borderTopColor: q.colors.border, marginTop: q.spacing.md }}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }}
      onPress={() => setOpen(value => !value)} style={({ pressed }) => ({
        minHeight: questLayout.controlMinHeight, paddingVertical: q.spacing.sm, flexDirection: 'row',
        alignItems: 'center', gap: q.spacing.sm, backgroundColor: pressed ? q.colors.surfaceSoft : 'transparent',
      })}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: q.colors.text, fontSize: q.typography.bodySize }}>{title}</Text>
        {summary ? <Text style={{ color: q.colors.textMuted, fontSize: q.typography.captionSize }}>{summary}</Text> : null}
      </View>
      <V11RebaselineIcon name={open ? 'chevron-up' : 'chevron-down'} size={q.typography.bodySize} color={q.colors.textMuted} />
    </Pressable>
    {open ? <View style={{ paddingBottom: q.spacing.md }}>{children}</View> : null}
  </View>;
}
