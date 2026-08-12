// 抽离的颜色选择网格. 同 EmojiPicker, 用 React.memo 防止文本输入引起的重渲染.
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useStore } from '../store';
import { getQuestTheme } from '../design/tokens';
import { getV11ProductThemeId } from '../v11/featureFlag';

export interface ColorPickerProps {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}

function ColorPickerInner({ colors, value, onChange }: ColorPickerProps) {
  const { data } = useStore();
  const questTheme = getQuestTheme(getV11ProductThemeId(data.settings.selectedThemeId));
  return (
    <View style={styles.row}>
      {colors.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => onChange(c)}
          accessibilityRole="button"
          accessibilityLabel={c}
          accessibilityState={{ selected: value === c }}
          style={[
            styles.dot,
            {
              backgroundColor: c,
              borderColor: value === c ? questTheme.colors.primary : questTheme.colors.surfaceElevated,
              shadowColor: questTheme.colors.cardShadow,
            },
          ]}
        />
      ))}
    </View>
  );
}

const ColorPicker = React.memo(ColorPickerInner);
ColorPicker.displayName = 'ColorPicker';
export default ColorPicker;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: theme.card, ...theme.shadow },
});
