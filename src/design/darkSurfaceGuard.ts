import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { QuestTheme } from './tokens';
import { getSurfaceStyle, isDarkTheme, isLightSurfaceColor, SurfaceVariant } from './surfaces';

export type SurfaceRole =
  | 'card'
  | 'row'
  | 'stat'
  | 'empty'
  | 'panel'
  | 'elevated'
  | 'soft'
  | 'input'
  | 'modal'
  | 'outline';

function surfaceVariantForRole(role: SurfaceRole): SurfaceVariant {
  if (role === 'elevated') return 'elevated';
  if (role === 'soft') return 'soft';
  if (role === 'input') return 'input';
  if (role === 'modal') return 'modal';
  if (role === 'empty') return 'empty';
  if (role === 'row') return 'row';
  if (role === 'stat') return 'stat';
  if (role === 'outline') return 'outline';
  return 'card';
}

export function guardDarkSurfaceStyle(
  style: ViewStyle | ViewStyle[] | undefined,
  theme: QuestTheme,
  role: SurfaceRole = 'card',
): ViewStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  if (!isDarkTheme(theme)) return flat;

  const surface = getSurfaceStyle(theme, surfaceVariantForRole(role));
  const next: ViewStyle = { ...flat };

  if (!next.backgroundColor || isLightSurfaceColor(String(next.backgroundColor))) {
    next.backgroundColor = surface.backgroundColor;
  }
  if (!next.borderColor || isLightSurfaceColor(String(next.borderColor))) {
    next.borderColor = surface.borderColor;
  }

  return next;
}

export function guardDarkTextStyle(
  style: TextStyle | TextStyle[] | undefined,
  theme: QuestTheme,
  muted = false,
): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  if (!isDarkTheme(theme)) return flat;
  return {
    ...flat,
    color: muted ? theme.colors.textMuted : theme.colors.text,
  };
}

export { isDarkTheme, isLightSurfaceColor };
