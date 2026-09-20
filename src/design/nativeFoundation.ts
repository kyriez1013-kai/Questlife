import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState, Platform, StyleSheet } from 'react-native';
import { getQuestTheme, questLayout, type QuestTheme } from './tokens';
import { getQuestVisualFoundation } from './visualFoundation';

export function getNativeFoundation(theme: QuestTheme) {
  return {
    ...getQuestVisualFoundation(theme),
    layout: {
      gutter: theme.spacing.xl,
      gap: theme.spacing.sm + theme.spacing.xs,
      touch: questLayout.controlMinHeight,
      radius: theme.radius.sm,
      sheetRadius: theme.radius.xxl,
      sheetMaxWidth: questLayout.contentMaxWidth,
    },
    spacing: theme.spacing,
    typography: {
      title: theme.typography.screenTitleSize,
      body: theme.typography.cardTitleSize,
      secondary: theme.typography.compactBodySize,
      metadata: theme.typography.captionSize,
    },
    type: {
      title: { fontSize: theme.typography.titleSize, lineHeight: theme.typography.titleLineHeight, letterSpacing: 0 },
      body: { fontSize: theme.typography.cardTitleSize, lineHeight: theme.typography.bodyLineHeight, letterSpacing: 0 },
      secondary: { fontSize: theme.typography.compactBodySize, lineHeight: theme.typography.compactBodyLineHeight, letterSpacing: 0 },
      metadata: { fontSize: theme.typography.captionSize, lineHeight: theme.typography.helperLineHeight, letterSpacing: 0 },
    },
    surface: {
      // Opaque, theme-derived gradients remain intentional materials on Android
      // and in nested content, without sampling the text behind a sheet.
      colors: [theme.colors.surfaceElevated, theme.colors.surface, theme.colors.surfaceMuted] as const,
      edge: theme.colors.borderStrong,
      highlight: theme.id === 'deepWork' ? theme.colors.text : theme.colors.surface,
      blurIntensity: 28,
      frostOpacity: 0.84,
      glassVeilOpacity: 0.16,
      edgeOpacity: 0.55,
      shadowOpacity: theme.id === 'deepWork' ? 0.24 : 0.12,
      shadowRadius: theme.spacing.lg,
      shadowOffset: { width: 0, height: theme.spacing.sm },
      elevation: 3,
    },
  };
}

export type NativeAccessibility = Readonly<{
  reduceMotion: boolean;
  reduceTransparency: boolean;
}>;

// Fail closed while native preferences resolve. Share listeners rather than
// making a pair of native bridge subscriptions for every visible control.
const conservativeAccessibility: NativeAccessibility = { reduceMotion: true, reduceTransparency: true };
let accessibility = conservativeAccessibility;
const listeners = new Set<() => void>();
let stopListening: (() => void) | undefined;

function subscribeAccessibility(listener: () => void) {
  listeners.add(listener);
  if (!stopListening) {
    let active = true;
    const revisions = { reduceMotion: 0, reduceTransparency: 0 };
    const update = (key: keyof NativeAccessibility, value: boolean) => {
      if (!active || accessibility[key] === value) return;
      accessibility = { ...accessibility, [key]: value };
      listeners.forEach(notify => notify());
    };
    const read = (key: keyof NativeAccessibility, query: () => Promise<boolean>) => {
      const revision = ++revisions[key];
      void Promise.resolve().then(query).then(value => {
        if (revision === revisions[key]) update(key, value);
      }).catch(() => {
        if (revision === revisions[key]) update(key, true);
      });
    };
    const refresh = () => {
      read('reduceMotion', () => AccessibilityInfo.isReduceMotionEnabled());
      if (Platform.OS === 'ios') {
        read('reduceTransparency', () => AccessibilityInfo.isReduceTransparencyEnabled());
      } else {
        update('reduceTransparency', false);
      }
    };
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      revisions.reduceMotion++;
      update('reduceMotion', value);
    });
    const transparency = Platform.OS === 'ios'
      ? AccessibilityInfo.addEventListener('reduceTransparencyChanged', value => {
        revisions.reduceTransparency++;
        update('reduceTransparency', value);
      }) : undefined;
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    stopListening = () => {
      active = false;
      motion.remove();
      transparency?.remove();
      appState.remove();
      stopListening = undefined;
      accessibility = conservativeAccessibility;
    };
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) stopListening?.();
  };
}

export function useNativeAccessibility() {
  return useSyncExternalStore(subscribeAccessibility, () => accessibility, () => conservativeAccessibility);
}

export function nativeMaterialKind({
  platform, reduceTransparency, fallback = false, nested = false, sheet = false, glassAvailable = false,
}: {
  platform: string;
  reduceTransparency: boolean;
  fallback?: boolean;
  nested?: boolean;
  sheet?: boolean;
  glassAvailable?: boolean;
}): 'opaque' | 'blur' | 'glass' {
  if (reduceTransparency || fallback || nested || sheet || platform !== 'ios') return 'opaque';
  return glassAvailable ? 'glass' : 'blur';
}

export function nativeControlColumns(width: number, requested: number, count: number, fontScale: number, gap: number) {
  const desired = Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : 1;
  const fitting = Math.max(1, Math.floor((width + gap) / (questLayout.controlMinHeight * 2 * Math.max(1, fontScale) + gap)));
  return Math.max(1, Math.min(desired, count, fitting));
}

const defaultFoundation = getNativeFoundation(getQuestTheme('cleanFocus'));
export const nativeLayout = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: defaultFoundation.layout.gutter, paddingVertical: defaultFoundation.spacing.lg, gap: defaultFoundation.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: defaultFoundation.layout.gap },
  grow: { flex: 1, minWidth: 0 },
  action: { minWidth: defaultFoundation.layout.touch, minHeight: defaultFoundation.layout.touch, alignItems: 'center', justifyContent: 'center', paddingHorizontal: defaultFoundation.layout.gap },
  label: defaultFoundation.type.body,
});
