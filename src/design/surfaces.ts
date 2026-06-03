import { TextStyle, ViewStyle } from 'react-native';
import { QuestTheme } from './tokens';

export type SurfaceVariant =
  | 'page'
  | 'card'
  | 'elevated'
  | 'soft'
  | 'row'
  | 'stat'
  | 'empty'
  | 'input'
  | 'modal'
  | 'outline';

const LIGHT_SURFACES = new Set([
  '#fff',
  '#ffffff',
  '#f8fafc',
  '#f9fafb',
  '#f3f4f6',
  '#f1f5f9',
  '#e5e7eb',
  'white',
]);

function normalizeColor(value?: string) {
  return value?.trim().toLowerCase();
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return undefined;
  const value = Number.parseInt(clean, 16);
  if (Number.isNaN(value)) return undefined;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return undefined;
  const toLinear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

export function isDarkTheme(theme: QuestTheme) {
  const bg = normalizeColor(theme.colors.background);
  if (theme.id === 'deepWork') return true;
  if (!bg?.startsWith('#')) return false;
  return (luminance(bg) ?? 1) < 0.28;
}

export function isLightSurfaceColor(color?: string) {
  const normalized = normalizeColor(color);
  if (!normalized) return false;
  if (LIGHT_SURFACES.has(normalized)) return true;
  if (!normalized.startsWith('#')) return false;
  return (luminance(normalized) ?? 0) > 0.82;
}

export function resolveSurfaceColor(theme: QuestTheme, variant: SurfaceVariant = 'card') {
  const dark = isDarkTheme(theme);
  const color =
    variant === 'page'
      ? theme.colors.background
      : variant === 'elevated' || variant === 'modal'
        ? theme.colors.surfaceElevated
        : variant === 'input'
          ? theme.colors.inputBg
        : variant === 'soft' || variant === 'empty'
          ? theme.colors.surfaceSoft
          : variant === 'row' || variant === 'stat'
            ? theme.colors.surfaceMuted
          : theme.colors.surface;
  if (dark && isLightSurfaceColor(color)) return theme.colors.surface;
  return color;
}

export function getSurfaceStyle(theme: QuestTheme, variant: SurfaceVariant = 'card'): ViewStyle {
  const backgroundColor = resolveSurfaceColor(theme, variant);
  return {
    backgroundColor,
    borderColor: variant === 'input' ? theme.colors.inputBorder : variant === 'elevated' || variant === 'modal' ? theme.colors.borderStrong : theme.colors.border,
  };
}

export function getSurfaceTextStyle(theme: QuestTheme, muted = false): TextStyle {
  return { color: muted ? theme.colors.textMuted : theme.colors.text };
}

export function sanitizeSurfaceStyle(theme: QuestTheme, style?: ViewStyle): ViewStyle {
  if (!style || !isDarkTheme(theme)) return style ?? {};
  const next = { ...style };
  if (isLightSurfaceColor(next.backgroundColor as string | undefined)) {
    next.backgroundColor = theme.colors.surface;
  }
  if (isLightSurfaceColor(next.borderColor as string | undefined)) {
    next.borderColor = theme.colors.border;
  }
  return next;
}
