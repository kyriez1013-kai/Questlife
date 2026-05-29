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
    primary: string;
    primarySoft: string;
    primaryText: string;
    accent: string;
    accentSoft: string;
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
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  typography: {
    titleSize: number;
    sectionTitleSize: number;
    bodySize: number;
    captionSize: number;
    weightRegular: '400';
    weightMedium: '600';
    weightBold: '800';
  };
};

const baseScale = {
  radius: { sm: 8, md: 12, lg: 16, xl: 22, xxl: 28, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  typography: {
    titleSize: 32,
    sectionTitleSize: 18,
    bodySize: 14,
    captionSize: 12,
    weightRegular: '400',
    weightMedium: '600',
    weightBold: '800',
  },
} as const;

export const questThemes: Record<QuestThemeId, QuestTheme> = {
  cleanFocus: {
    id: 'cleanFocus',
    name: 'Clean Focus',
    colors: {
      background: '#F6F7FB',
      surface: '#FFFFFF',
      surfaceElevated: '#FFFFFF',
      surfaceSoft: '#EEF2F7',
      surfaceMuted: '#E7ECF3',
      primary: '#132238',
      primarySoft: '#E7EEF8',
      primaryText: '#FFFFFF',
      accent: '#2F80ED',
      accentSoft: '#DDEBFF',
      text: '#111827',
      textMuted: '#667085',
      textSubtle: '#98A2B3',
      disabledBg: '#E4E7EC',
      disabledText: '#667085',
      border: '#E4E7EC',
      borderStrong: '#CBD5E1',
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
    },
    ...baseScale,
  },
  deepWork: {
    id: 'deepWork',
    name: 'Deep Work',
    colors: {
      background: '#090E1A',
      surface: '#121B2B',
      surfaceElevated: '#18253A',
      surfaceSoft: '#23324C',
      surfaceMuted: '#1B2940',
      primary: '#5CC8FF',
      primarySoft: '#183D56',
      primaryText: '#07111F',
      accent: '#A78BFA',
      accentSoft: '#302654',
      text: '#F8FAFC',
      textMuted: '#C4CEDD',
      textSubtle: '#93A2B8',
      disabledBg: '#1E293B',
      disabledText: '#94A3B8',
      border: '#33435F',
      borderStrong: '#526480',
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
      primary: '#1F5E3B',
      primarySoft: '#DCEFE3',
      primaryText: '#FFFFFF',
      accent: '#7A9E35',
      accentSoft: '#EEF6D8',
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
      primary: '#0E7490',
      primarySoft: '#CFF4FC',
      primaryText: '#FFFFFF',
      accent: '#2563EB',
      accentSoft: '#DBEAFE',
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
      primary: '#8A4B22',
      primarySoft: '#F6E2D0',
      primaryText: '#FFFFFF',
      accent: '#C77824',
      accentSoft: '#FBE7C8',
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
