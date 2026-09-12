import { StyleSheet } from 'react-native';
import type { QuestTheme } from './tokens';
import { getQuestVisualFoundation } from './visualFoundation';

export function getNativeFoundation(theme: QuestTheme) {
  return {
    ...getQuestVisualFoundation(theme),
    layout: { gutter: 20, gap: 12, touch: 44, radius: 8, sheetRadius: 24 },
    typography: { title: 22, body: 15, secondary: 13, metadata: 12 },
  };
}
export const nativeLayout = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  action: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  label: { fontSize: 15, lineHeight: 22 },
});
