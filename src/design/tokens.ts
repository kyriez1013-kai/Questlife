export type QuestThemeId = 'cleanFocus' | 'deepWork' | 'forestGrowth' | 'oceanCalm' | 'warmRecovery';

export type QuestTheme = {
  id: QuestThemeId;
  name: string;
  colors: {
    background: string;
    backgroundGradient?: string;
    surface: string;
    surfaceElevated: string;
    surfaceSoft: string;
    surfaceMuted: string;
    surfaceSubtle: string;
    primary: string;
    primarySoft: string;
    primaryText: string;
    accent: string;
    accentSoft: string;
    accentStrong: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    disabledBg: string;
    disabledText: string;
    border: string;
    borderStrong: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    navBackground: string;
    navActive: string;
    navInactive: string;
    cardShadow: string;
    // ── New card system tokens ──────────────────────────────────────────────
    cardBorder: string;         // subtle card border (theme-aware)
    cardSurface: string;        // glass-style card fill
    cardSurfaceHover: string;   // card hover / pressed state
    // ── New text hierarchy tokens ───────────────────────────────────────────
    textPrimary: string;        // core numbers and headings
    textSecondary: string;      // body copy
    textDisabled: string;       // disabled / placeholder
    // ── New control-state tokens ────────────────────────────────────────────
    chipBg: string;
    chipSelectedBg: string;
    chipBorder: string;
    inputBg: string;
    inputBorder: string;
    overlay: string;
    divider: string;
    // ── New semantic color tokens ───────────────────────────────────────────
    positive: string;           // growth, completion, on-target
    negative: string;           // decline, warning
    predicted: string;          // predicted / inferred values (purple)
    neutral: string;            // neutral data, in-progress
    info: string;
    infoSoft: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    pill: number;
  };
  spacing: {
    xxs: number;
    xs: number;
    tight: number;
    sm: number;
    md: number;
    lg: number;
    section: number;
    xl: number;
    xxl: number;
  };
  typography: {
    displaySize: number;
    displayLineHeight: number;
    screenTitleSize: number;
    screenTitleLineHeight: number;
    titleSize: number;
    titleLineHeight: number;
    sectionTitleSize: number;
    sectionTitleLineHeight: number;
    cardTitleSize: number;
    cardTitleLineHeight: number;
    bodySize: number;
    bodyLineHeight: number;
    compactBodySize: number;
    compactBodyLineHeight: number;
    captionSize: number;
    metaSize: number;
    metaLineHeight: number;
    helperSize: number;
    helperLineHeight: number;
    buttonSize: number;
    numericSize: number;
    weightRegular: '400';
    weightMedium: '600';
    weightBold: '800';
  };
};

// ── Global design scale (shared across all themes) ──────────────────────────

export const questLayout = {
  contentMaxWidth: 760,
  contentBottomInset: 82,
  controlMinHeight: 44,
  navWidthPercent: '100%',
  navMaxWidth: 760,
  navBottomInset: 0,
  navHeight: 58,
  navRadius: 0,
  navItemRadius: 10,
  dashboardGap: 12,
  editCardMinHeight: {
    small: 48,
    medium: 64,
    large: 80,
  },
} as const;

const baseScale = {
  radius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 },
  spacing: { xxs: 2, xs: 4, tight: 6, sm: 8, md: 14, lg: 16, section: 16, xl: 20, xxl: 28 },
  typography: {
    displaySize: 32,
    displayLineHeight: 38,
    screenTitleSize: 22,
    screenTitleLineHeight: 27,
    titleSize: 21,
    titleLineHeight: 26,
    sectionTitleSize: 16,
    sectionTitleLineHeight: 21,
    cardTitleSize: 15,
    cardTitleLineHeight: 20,
    bodySize: 14,
    bodyLineHeight: 20,
    compactBodySize: 13,
    compactBodyLineHeight: 18,
    captionSize: 12,
    metaSize: 11,
    metaLineHeight: 16,
    helperSize: 12,
    helperLineHeight: 17,
    buttonSize: 12,
    numericSize: 22,
    weightRegular: '400',
    weightMedium: '600',
    weightBold: '800',
  },
} as const;

/**
 * Global spacing scale — use for margin/padding values.
 * Prefer these over inline numbers so components stay consistent.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
} as const;

/**
 * Global font-size scale — covers the full visual hierarchy.
 *   display → core big numbers (3.5h, 90kg, +179%)
 *   title   → section/page titles
 *   body    → regular content
 *   label   → uppercase metadata labels
 *   micro   → smallest annotations
 */
export const fontSize = {
  display: 36,
  title:   24,
  body:    15,
  label:   11,
  micro:   10,
} as const;

// ── Theme definitions ────────────────────────────────────────────────────────

export const questThemes: Record<QuestThemeId, QuestTheme> = {
  cleanFocus: {
    id: 'cleanFocus',
    name: 'Clean Focus',
    colors: {
      background: '#F6F7FB',
      surface: '#FFFFFF',
      surfaceElevated: '#FCFCFD',
      surfaceSoft: '#EEF3F8',
      surfaceMuted: '#E6ECF4',
      surfaceSubtle: '#F9FAFC',
      primary: '#132238',
      primarySoft: '#E7EEF8',
      primaryText: '#FFFFFF',
      accent: '#2F80ED',
      accentSoft: '#DDEBFF',
      accentStrong: '#1D4ED8',
      text: '#111827',
      textMuted: '#667085',
      textSubtle: '#98A2B3',
      disabledBg: '#E4E7EC',
      disabledText: '#667085',
      border: '#DDE3EC',
      borderStrong: '#B8C3D4',
      success: '#16A34A',
      successSoft: '#DCFCE7',
      warning: '#D97706',
      warningSoft: '#FEF3C7',
      danger: '#DC2626',
      dangerSoft: '#FEE2E2',
      navBackground: 'rgba(255,255,255,0.96)',
      navActive: '#132238',
      navInactive: '#8A94A6',
      cardShadow: '#111827',
      // light theme → dark-overlay card tokens
      cardBorder: 'rgba(15,23,42,0.10)',
      cardSurface: 'rgba(15,23,42,0.035)',
      cardSurfaceHover: 'rgba(15,23,42,0.07)',
      textPrimary: '#111318',
      textSecondary: 'rgba(17,19,24,0.68)',
      textDisabled: 'rgba(17,19,24,0.42)',
      chipBg: '#EEF2F7',
      chipSelectedBg: '#E7EEF8',
      chipBorder: '#B8C3D4',
      inputBg: '#FFFFFF',
      inputBorder: '#B8C3D4',
      overlay: 'rgba(15,23,42,0.46)',
      divider: '#D8DEE8',
      positive: '#16A34A',
      negative: '#DC2626',
      predicted: '#7C3AED',
      neutral: '#2F80ED',
      info: '#2F80ED',
      infoSoft: '#DDEBFF',
    },
    ...baseScale,
  },
  deepWork: {
    id: 'deepWork',
    name: 'Deep Work',
    colors: {
      background: '#090E1A',
      surface: '#121B2B',
      surfaceElevated: '#172235',
      surfaceSoft: '#23314A',
      surfaceMuted: '#151F31',
      surfaceSubtle: '#0E1624',
      primary: '#5CC8FF',
      primarySoft: '#183D56',
      primaryText: '#07111F',
      accent: '#A78BFA',
      accentSoft: '#302654',
      accentStrong: '#C4B5FD',
      text: '#F8FAFC',
      textMuted: '#C4CEDD',
      textSubtle: '#93A2B8',
      disabledBg: '#1E293B',
      disabledText: '#94A3B8',
      border: '#33435F',
      borderStrong: '#64748B',
      success: '#22C55E',
      successSoft: '#123B2A',
      warning: '#F59E0B',
      warningSoft: '#3D2A10',
      danger: '#FB7185',
      dangerSoft: '#44202A',
      navBackground: 'rgba(17,24,39,0.96)',
      navActive: '#38BDF8',
      navInactive: '#9DABC0',
      cardShadow: '#000000',
      // dark theme → white-overlay card tokens
      cardBorder: 'rgba(203,213,225,0.14)',
      cardSurface: 'rgba(148,163,184,0.07)',
      cardSurfaceHover: 'rgba(148,163,184,0.12)',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(248,250,252,0.74)',
      textDisabled: 'rgba(248,250,252,0.42)',
      chipBg: '#172235',
      chipSelectedBg: '#183D56',
      chipBorder: '#526480',
      inputBg: '#101827',
      inputBorder: '#526480',
      overlay: 'rgba(3,7,18,0.68)',
      divider: '#2B3A55',
      positive: '#4ADE80',
      negative: '#F87171',
      predicted: '#A78BFA',
      neutral: '#5CC8FF',
      info: '#5CC8FF',
      infoSoft: '#183D56',
    },
    ...baseScale,
  },
  forestGrowth: {
    id: 'forestGrowth',
    name: 'Forest Growth',
    colors: {
      background: '#F1F7F0',
      surface: '#FFFFFF',
      surfaceElevated: '#FBFEFA',
      surfaceSoft: '#E3F0E4',
      surfaceMuted: '#D9E8DB',
      surfaceSubtle: '#F7FBF6',
      primary: '#1F5E3B',
      primarySoft: '#DCEFE3',
      primaryText: '#FFFFFF',
      accent: '#7A9E35',
      accentSoft: '#EEF6D8',
      accentStrong: '#4D7C0F',
      text: '#17251D',
      textMuted: '#64756B',
      textSubtle: '#91A196',
      disabledBg: '#D7E5D8',
      disabledText: '#64756B',
      border: '#D7E5D8',
      borderStrong: '#B7CEBA',
      success: '#168A43',
      successSoft: '#DDF4E6',
      warning: '#A16207',
      warningSoft: '#FEF3C7',
      danger: '#B42318',
      dangerSoft: '#FEE4E2',
      navBackground: 'rgba(251,254,250,0.96)',
      navActive: '#1F5E3B',
      navInactive: '#87968C',
      cardShadow: '#1F3D2B',
      // light theme → dark-overlay card tokens
      cardBorder: 'rgba(0,0,0,0.06)',
      cardSurface: 'rgba(0,0,0,0.02)',
      cardSurfaceHover: 'rgba(0,0,0,0.05)',
      textPrimary: '#17251D',
      textSecondary: 'rgba(23,37,29,0.6)',
      textDisabled: 'rgba(23,37,29,0.15)',
      chipBg: '#E3F0E4',
      chipSelectedBg: '#DCEFE3',
      chipBorder: '#B7CEBA',
      inputBg: '#FFFFFF',
      inputBorder: '#B7CEBA',
      overlay: 'rgba(23,37,29,0.42)',
      divider: '#D7E5D8',
      positive: '#168A43',
      negative: '#B42318',
      predicted: '#6D28D9',
      neutral: '#7A9E35',
      info: '#1F5E3B',
      infoSoft: '#DCEFE3',
    },
    ...baseScale,
  },
  oceanCalm: {
    id: 'oceanCalm',
    name: 'Ocean Calm',
    colors: {
      background: '#EEF8FB',
      surface: '#FFFFFF',
      surfaceElevated: '#F9FEFF',
      surfaceSoft: '#DDF2F7',
      surfaceMuted: '#D2EAF1',
      surfaceSubtle: '#F5FCFE',
      primary: '#0E7490',
      primarySoft: '#CFF4FC',
      primaryText: '#FFFFFF',
      accent: '#2563EB',
      accentSoft: '#DBEAFE',
      accentStrong: '#1D4ED8',
      text: '#102A36',
      textMuted: '#5D7280',
      textSubtle: '#92A5B0',
      disabledBg: '#CDE7EE',
      disabledText: '#5D7280',
      border: '#CDE7EE',
      borderStrong: '#A9CED8',
      success: '#059669',
      successSoft: '#D1FAE5',
      warning: '#D97706',
      warningSoft: '#FEF3C7',
      danger: '#E11D48',
      dangerSoft: '#FFE4E6',
      navBackground: 'rgba(249,254,255,0.96)',
      navActive: '#0E7490',
      navInactive: '#78919E',
      cardShadow: '#0E3B4A',
      // light theme → dark-overlay card tokens
      cardBorder: 'rgba(0,0,0,0.07)',
      cardSurface: 'rgba(0,0,0,0.02)',
      cardSurfaceHover: 'rgba(0,0,0,0.05)',
      textPrimary: '#102A36',
      textSecondary: 'rgba(16,42,54,0.6)',
      textDisabled: 'rgba(16,42,54,0.15)',
      chipBg: '#DDF2F7',
      chipSelectedBg: '#CFF4FC',
      chipBorder: '#A9CED8',
      inputBg: '#FFFFFF',
      inputBorder: '#A9CED8',
      overlay: 'rgba(14,59,74,0.42)',
      divider: '#CDE7EE',
      positive: '#059669',
      negative: '#E11D48',
      predicted: '#6D28D9',
      neutral: '#0E7490',
      info: '#0E7490',
      infoSoft: '#CFF4FC',
    },
    ...baseScale,
  },
  warmRecovery: {
    id: 'warmRecovery',
    name: 'Warm Recovery',
    colors: {
      background: '#FAF6F0',
      surface: '#FFFDFC',
      surfaceElevated: '#FFFFFF',
      surfaceSoft: '#F3E9DC',
      surfaceMuted: '#ECDDCB',
      surfaceSubtle: '#FFF8F2',
      primary: '#8A4B22',
      primarySoft: '#F6E2D0',
      primaryText: '#FFFFFF',
      accent: '#C77824',
      accentSoft: '#FBE7C8',
      accentStrong: '#9A3412',
      text: '#2E2118',
      textMuted: '#78685A',
      textSubtle: '#A69484',
      disabledBg: '#EADCCD',
      disabledText: '#78685A',
      border: '#EADCCD',
      borderStrong: '#D6C2AD',
      success: '#3F8F4A',
      successSoft: '#E3F4E5',
      warning: '#B86B00',
      warningSoft: '#FDECC8',
      danger: '#B42318',
      dangerSoft: '#FEE4E2',
      navBackground: 'rgba(255,253,252,0.96)',
      navActive: '#8A4B22',
      navInactive: '#9B8978',
      cardShadow: '#5B3C25',
      // light theme → dark-overlay card tokens
      cardBorder: 'rgba(0,0,0,0.07)',
      cardSurface: 'rgba(0,0,0,0.02)',
      cardSurfaceHover: 'rgba(0,0,0,0.05)',
      textPrimary: '#2E2118',
      textSecondary: 'rgba(46,33,24,0.6)',
      textDisabled: 'rgba(46,33,24,0.15)',
      chipBg: '#F3E9DC',
      chipSelectedBg: '#F6E2D0',
      chipBorder: '#D6C2AD',
      inputBg: '#FFFDFC',
      inputBorder: '#D6C2AD',
      overlay: 'rgba(91,60,37,0.42)',
      divider: '#EADCCD',
      positive: '#3F8F4A',
      negative: '#B42318',
      predicted: '#6D28D9',
      neutral: '#C77824',
      info: '#8A4B22',
      infoSoft: '#F6E2D0',
    },
    ...baseScale,
  },
};

export const defaultQuestThemeId: QuestThemeId = 'cleanFocus';

export const themeOptions: { id: QuestThemeId; name: string; i18nKey: string }[] = [
  { id: 'cleanFocus', name: 'Clean Focus', i18nKey: 'cleanFocus' },
  { id: 'deepWork', name: 'Deep Work', i18nKey: 'deepWork' },
  { id: 'forestGrowth', name: 'Forest Growth', i18nKey: 'forestGrowth' },
  { id: 'oceanCalm', name: 'Ocean Calm', i18nKey: 'oceanCalm' },
  { id: 'warmRecovery', name: 'Warm Recovery', i18nKey: 'warmRecovery' },
];

export function getQuestTheme(id?: string): QuestTheme {
  return questThemes[(id as QuestThemeId) || defaultQuestThemeId] ?? questThemes[defaultQuestThemeId];
}

export function getStateToneColor(value: number | undefined, questTheme: QuestTheme) {
  if (!value || value <= 1) return questTheme.colors.danger;
  if (value === 2) return questTheme.colors.warning;
  if (value === 3) return questTheme.colors.primary;
  if (value === 4) return questTheme.colors.success;
  return questTheme.colors.accent;
}
