import { getQuestTheme, QuestTheme } from '../design/tokens';

export type V11ThemeMode = 'dark' | 'light';
export type V11EvidenceStage = 'S0' | 'S1' | 'S2' | 'S3';

export const v11Motion = {
  duration: {
    instant: 120,
    standard: 320,
    deliberate: 640,
    reduced: 0.001,
  },
  easing: {
    instant: 'cubic-bezier(0.32, 0.72, 0, 1)',
    standard: 'cubic-bezier(0.22, 0.68, 0, 1)',
    deliberate: 'cubic-bezier(0.16, 0.84, 0.06, 1)',
  },
} as const;

export const v11Typography = {
  reading: {
    fontSize: 94,
    lineHeight: 102,
    fontWeight: '300' as const,
    letterSpacing: -6,
  },
  judgement: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
  },
  metadata: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '400' as const,
    letterSpacing: 0.6,
  },
} as const;

export const v11Spacing = {
  hairline: 1,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  section: 36,
  readingGap: 48,
  actionGap: 96,
  fieldGap: 120,
} as const;

export const v11SheetLayout = {
  viewportInsetInline: 12,
  viewportInsetTop: 12,
  contentPaddingInline: 20,
  contentPaddingInlineNarrow: 18,
  contentPaddingTop: 8,
  contentPaddingBottom: 20,
  headerActionSlot: 44,
  headerGap: 12,
  footerGap: 12,
  minimumMobileClearance: 18,
} as const;

export const v11Radius = {
  control: 16,
  panel: 20,
  sheet: 26,
  pill: 999,
} as const;

export const v11DirectionalBorder = {
  strokeWidth: 1.5,
  stops: [
    { offset: '0%', opacity: 0.68 },
    { offset: '26%', opacity: 0.28 },
    { offset: '58%', opacity: 0.08 },
    { offset: '100%', opacity: 0.045 },
  ],
} as const;

export const v11EvidenceVisual: Record<V11EvidenceStage, {
  glowOpacity: number;
  glowSaturation: number;
  glowScale: number;
  edgeStrength: number;
}> = {
  S0: {
    glowOpacity: 0,
    glowSaturation: 0,
    glowScale: 0.86,
    edgeStrength: 0.42,
  },
  S1: {
    glowOpacity: 0.24,
    glowSaturation: 0.25,
    glowScale: 0.92,
    edgeStrength: 0.58,
  },
  S2: {
    glowOpacity: 0.44,
    glowSaturation: 0.55,
    glowScale: 0.97,
    edgeStrength: 0.78,
  },
  S3: {
    glowOpacity: 0.64,
    glowSaturation: 0.95,
    glowScale: 1,
    edgeStrength: 1,
  },
};

export type V11ThemeTokens = {
  mode: V11ThemeMode;
  questTheme: QuestTheme;
  field: {
    background: string;
    near: string;
    middle: string;
    far: string;
    grid: string;
    directionDegrees: number;
  };
  text: {
    primary: string;
    secondary: string;
    metadata: string;
    disabled: string;
  };
  glow: {
    primary: string;
    supporting: string;
    primaryBlur: number;
    supportingBlur: number;
    primaryDiameter: number;
    supportingDiameter: number;
  };
  material: {
    glassBase: string;
    fallback: string;
    highlight: string;
    shadow: string;
    blur: number;
    saturation: number;
    upperHighlightOpacity: number;
    outerShadowOpacity: number;
  };
};

function buildThemeTokens(mode: V11ThemeMode): V11ThemeTokens {
  const questTheme = getQuestTheme(mode === 'dark' ? 'deepWork' : 'cleanFocus');

  return {
    mode,
    questTheme,
    field: {
      background: questTheme.colors.background,
      near: questTheme.colors.surfaceSoft,
      middle: questTheme.colors.background,
      far: questTheme.colors.surfaceSubtle,
      grid: questTheme.colors.textSubtle,
      directionDegrees: 145,
    },
    text: {
      primary: mode === 'light'
        ? questTheme.colors.textPrimary
        : questTheme.colors.text,
      secondary: mode === 'light'
        ? questTheme.colors.textSecondary
        : questTheme.colors.textMuted,
      metadata: mode === 'light'
        ? questTheme.colors.textMuted
        : questTheme.colors.textSubtle,
      disabled: questTheme.colors.disabledText,
    },
    glow: {
      primary: questTheme.colors.primary,
      supporting: questTheme.colors.accent,
      primaryBlur: 120,
      supportingBlur: 96,
      primaryDiameter: 280,
      supportingDiameter: 230,
    },
    material: {
      glassBase: questTheme.colors.surface,
      fallback: questTheme.colors.surfaceElevated,
      highlight: mode === 'light'
        ? questTheme.colors.surface
        : questTheme.colors.text,
      shadow: questTheme.colors.cardShadow,
      blur: 28,
      saturation: 1.6,
      upperHighlightOpacity: mode === 'light' ? 0.82 : 0.74,
      outerShadowOpacity: mode === 'light' ? 0.24 : 0.28,
    },
  };
}

export const v11ThemeTokens: Record<V11ThemeMode, V11ThemeTokens> = {
  dark: buildThemeTokens('dark'),
  light: buildThemeTokens('light'),
};

export function getV11ThemeTokens(mode: V11ThemeMode): V11ThemeTokens {
  return v11ThemeTokens[mode];
}
