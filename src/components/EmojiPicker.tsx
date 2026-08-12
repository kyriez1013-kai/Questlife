// 抽离的 emoji 选择网格.
// React.memo 包住 → 父组件文本输入 keystroke 不会触发 emoji 列表重渲染.
//
// 关键: onChange 必须是稳定引用 (e.g. 直接传 setIcon, 或 useCallback 包装),
//       否则 memo 会失效.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useStore } from '../store';
import { getQuestTheme } from '../design/tokens';
import { getV11ProductThemeId } from '../v11/featureFlag';

export interface EmojiPickerProps {
  emojis: string[];
  value: string;
  onChange: (emoji: string) => void;
}

function EmojiPickerInner({ emojis, value, onChange }: EmojiPickerProps) {
  const { data } = useStore();
  const questTheme = getQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  return (
    <View style={styles.row}>
      {emojis.map((e) => (
        <TouchableOpacity
          key={e}
          onPress={() => onChange(e)}
          accessibilityRole="button"
          accessibilityLabel={e}
          accessibilityState={{ selected: value === e }}
          style={[
            styles.box,
            { backgroundColor: questTheme.colors.surfaceSoft, borderColor: questTheme.colors.border },
            value === e && { borderColor: questTheme.colors.primary, backgroundColor: questTheme.colors.primarySoft, borderWidth: 2 },
          ]}
        >
          <Text style={styles.emoji}>{e}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const EmojiPicker = React.memo(EmojiPickerInner);
EmojiPicker.displayName = 'EmojiPicker';
export default EmojiPicker;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  box: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: theme.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.border,
  },
  boxOn: { borderColor: theme.primary, borderWidth: 2 },
  emoji: { fontSize: 22 },
});
