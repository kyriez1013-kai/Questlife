import type { QuestTheme } from './tokens';

export type QuestVisualFoundation = ReturnType<typeof getQuestVisualFoundation>;

/**
 * Authoritative semantic role map for product UI. Quant/chart palettes and
 * entity colours remain separate because they encode data rather than chrome.
 */
export function getQuestVisualFoundation(theme: QuestTheme) {
  return {
    environment: {
      canvas: theme.colors.background,
      canvasNear: theme.colors.surfaceSubtle,
      navigation: theme.colors.navBackground,
    },
    material: {
      base: theme.colors.surface,
      elevated: theme.colors.surfaceElevated,
      soft: theme.colors.surfaceSoft,
      muted: theme.colors.surfaceMuted,
      translucent: theme.colors.cardSurface,
      translucentPressed: theme.colors.cardSurfaceHover,
      overlay: theme.colors.overlay,
      shadow: theme.colors.cardShadow,
    },
    text: {
      primary: theme.colors.textPrimary,
      secondary: theme.colors.textSecondary,
      metadata: theme.colors.textSubtle,
      disabled: theme.colors.textDisabled,
      onPrimary: theme.colors.primaryText,
    },
    border: {
      subtle: theme.colors.cardBorder,
      standard: theme.colors.border,
      strong: theme.colors.borderStrong,
      divider: theme.colors.divider,
      input: theme.colors.inputBorder,
    },
    interaction: {
      primary: theme.colors.primary,
      primarySoft: theme.colors.primarySoft,
      accent: theme.colors.accent,
      accentSoft: theme.colors.accentSoft,
      focus: theme.colors.accentStrong,
      selected: theme.colors.chipSelectedBg,
      pressed: theme.colors.cardSurfaceHover,
      disabledSurface: theme.colors.disabledBg,
      disabledText: theme.colors.disabledText,
      navigationActive: theme.colors.navActive,
      navigationInactive: theme.colors.navInactive,
    },
    data: {
      observed: theme.colors.primary,
      comparison: theme.colors.accent,
      predicted: theme.colors.predicted,
      neutral: theme.colors.neutral,
    },
    semantic: {
      positive: theme.colors.positive,
      positiveSoft: theme.colors.successSoft,
      warning: theme.colors.warning,
      warningSoft: theme.colors.warningSoft,
      negative: theme.colors.negative,
      negativeSoft: theme.colors.dangerSoft,
      info: theme.colors.info,
      infoSoft: theme.colors.infoSoft,
    },
  } as const;
}
