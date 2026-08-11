import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Lang } from '../../i18n';
import { t } from '../../i18n';
import type { V11ThemeTokens } from '../../v11/tokens';
import PersonalTerminalIcon from './PersonalTerminalIcon';
import type {
  PersonalTerminalDisplayRange,
  PersonalTerminalQuickRange,
} from './personalTerminalWorkspace';
import { rangeDebugLabel } from './personalTerminalWorkspace';

const WebView = View as any;
const WebPressable = Pressable as any;

export default function PersonalTerminalRangeControl({
  available,
  language,
  onChange,
  onOpenCustom,
  quickRanges,
  range,
  theme,
}: {
  available: PersonalTerminalQuickRange[];
  language: Lang;
  onChange: (range: PersonalTerminalDisplayRange) => void;
  onOpenCustom: () => void;
  quickRanges: PersonalTerminalQuickRange[];
  range: PersonalTerminalDisplayRange;
  theme: V11ThemeTokens;
}) {
  const visible = quickRanges.filter((item) => available.includes(item));
  const isCustom = range.kind !== 'preset';
  return (
    <WebView accessibilityRole="toolbar" dataSet={{ 'personal-terminal-workspace-role': 'range-control' }}>
      <WebView dataSet={{ 'personal-terminal-workspace-role': 'range-presets' }}>
        {visible.map((item) => {
          const selected = range.kind === 'preset' && range.preset === item;
          return (
            <WebPressable
              accessibilityLabel={t(language, 'personalTerminalRangePreset').replace('{range}', item)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              dataSet={{ 'personal-terminal-selected': selected ? 'true' : 'false' }}
              key={item}
              onPress={() => onChange({ kind: 'preset', preset: item })}
            >
              <Text style={{ color: selected ? theme.text.primary : theme.text.metadata }}>{item}</Text>
            </WebPressable>
          );
        })}
      </WebView>
      <WebPressable
        accessibilityLabel={t(language, 'personalTerminalCustomRange')}
        accessibilityRole="button"
        accessibilityState={{ selected: isCustom }}
        dataSet={{ 'personal-terminal-selected': isCustom ? 'true' : 'false', 'personal-terminal-workspace-role': 'custom-range-trigger' }}
        onPress={onOpenCustom}
      >
        <PersonalTerminalIcon color={isCustom ? theme.text.primary : theme.text.metadata} name="calendar" size={14} />
        <Text numberOfLines={1} style={{ color: isCustom ? theme.text.primary : theme.text.metadata }}>
          {isCustom ? rangeDebugLabel(range) : t(language, 'personalTerminalCustomRangeShort')}
        </Text>
      </WebPressable>
    </WebView>
  );
}
