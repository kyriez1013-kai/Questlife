import type { V2Direction, V2Mode } from './flagParse';

/**
 * QuestLife v2 design tokens.
 * Rules (see docs/frontend-v2/04_设计系统.md):
 *  - color carries meaning only (state, evidence level, sample data, sync); no decorative gradients
 *  - 4 type levels: display / title / body / caption
 *  - one hero per screen
 * Direction A = "Paper" (flat, hairlines, monochrome primary). Direction B = "Instrument" (cards, soft shadow, blue accent).
 */

export type V2TypeStyle = { size: number; line: number; weight: '400' | '500' | '600' | '700'; tracking: number };

export type V2Tokens = {
  direction: V2Direction;
  mode: V2Mode;
  color: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    ink: string;
    inkMuted: string;
    inkFaint: string;
    hairline: string;
    primary: string;
    onPrimary: string;
    primarySoft: string;
    danger: string;
    dangerSoft: string;
    success: string;
    successSoft: string;
    overlay: string;
    /** state scale 1..5 — always paired with a text label and a position, never color alone */
    state: [string, string, string, string, string];
    /** evidence levels */
    evidence: { e0: string; e1: string; e2: string; e3: string; prior: string };
    sample: string;
    sampleSoft: string;
  };
  type: { display: V2TypeStyle; title: V2TypeStyle; body: V2TypeStyle; caption: V2TypeStyle };
  space: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; huge: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  /** surface treatment: 'flat' = hairline border; 'card' = soft shadow */
  surfaceStyle: 'flat' | 'card';
  shadow: { shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number } | null;
  motion: { fast: number; base: number; slow: number; easing: [number, number, number, number] };
  layout: { maxWidth: number; tabHeight: number; hit: number };
};

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48 };
const motion = { fast: 120, base: 200, slow: 320, easing: [0.2, 0, 0, 1] as [number, number, number, number] };
const layout = { maxWidth: 560, tabHeight: 56, hit: 44 };

const type: V2Tokens['type'] = {
  display: { size: 32, line: 38, weight: '700', tracking: -0.4 },
  title: { size: 20, line: 26, weight: '600', tracking: -0.1 },
  body: { size: 16, line: 24, weight: '400', tracking: 0 },
  caption: { size: 13, line: 18, weight: '500', tracking: 0.1 },
};

const evidenceLight = { e0: '#8A8A84', e1: '#5B7790', e2: '#B7791F', e3: '#2F7D5B', prior: '#8A8A84' };
const evidenceDark = { e0: '#9A9A94', e1: '#8FB0CC', e2: '#E0A94A', e3: '#5FC49A', prior: '#9A9A94' };

export function v2Tokens(direction: V2Direction, mode: V2Mode): V2Tokens {
  const dark = mode === 'dark';
  if (direction === 'A') {
    return {
      direction, mode, space, motion, layout, type,
      surfaceStyle: 'flat',
      shadow: null,
      radius: { sm: 10, md: 14, lg: 20, pill: 999 },
      color: dark ? {
        bg: '#121211', surface: '#1A1A18', surfaceAlt: '#232321',
        ink: '#F3F2ED', inkMuted: '#A9A8A0', inkFaint: '#6F6E68', hairline: '#2D2D2A',
        primary: '#F3F2ED', onPrimary: '#121211', primarySoft: '#2A2A27',
        danger: '#F0836B', dangerSoft: '#3A2420', success: '#5FC49A', successSoft: '#17302A',
        overlay: 'rgba(0,0,0,0.55)',
        state: ['#E8806A', '#E5A35C', '#A9A8A0', '#6BC29F', '#4FD1A1'],
        evidence: evidenceDark, sample: '#B39DFF', sampleSoft: '#272238',
      } : {
        bg: '#F7F6F3', surface: '#FFFFFF', surfaceAlt: '#F0EEE9',
        ink: '#1B1B18', inkMuted: '#6B6A63', inkFaint: '#9C9B93', hairline: '#E4E1DA',
        primary: '#1B1B18', onPrimary: '#FFFFFF', primarySoft: '#ECE9E2',
        danger: '#C0442C', dangerSoft: '#FBE9E4', success: '#2F7D5B', successSoft: '#E4F2EB',
        overlay: 'rgba(20,20,18,0.40)',
        state: ['#C4553B', '#D08A3A', '#8C8C86', '#4E9F7E', '#2F8F6B'],
        evidence: evidenceLight, sample: '#5A3FE0', sampleSoft: '#EFEBFF',
      },
    };
  }
  return {
    direction, mode, space, motion, layout, type,
    surfaceStyle: 'card',
    shadow: dark
      ? null
      : { shadowColor: '#0B1B33', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
    radius: { sm: 12, md: 18, lg: 26, pill: 999 },
    color: dark ? {
      bg: '#0B0D10', surface: '#151A20', surfaceAlt: '#1D242C',
      ink: '#F1F4F8', inkMuted: '#A3ADB9', inkFaint: '#68727E', hairline: '#232B34',
      primary: '#5B9BFF', onPrimary: '#06101F', primarySoft: '#14243D',
      danger: '#FF8A75', dangerSoft: '#3A211D', success: '#5FD0A5', successSoft: '#143026',
      overlay: 'rgba(0,0,0,0.6)',
      state: ['#FF8A75', '#F2A957', '#A3ADB9', '#5FD0A5', '#3FE0AE'],
      evidence: evidenceDark, sample: '#B39DFF', sampleSoft: '#241F38',
    } : {
      bg: '#F2F4F7', surface: '#FFFFFF', surfaceAlt: '#EBEEF3',
      ink: '#0E1621', inkMuted: '#5D6A7A', inkFaint: '#94A0AE', hairline: '#E1E6ED',
      primary: '#1F6FEB', onPrimary: '#FFFFFF', primarySoft: '#E5EEFD',
      danger: '#CF3F27', dangerSoft: '#FCE8E4', success: '#1E8A5F', successSoft: '#E1F4EC',
      overlay: 'rgba(11,27,51,0.42)',
      state: ['#D0482F', '#D98A2B', '#7C8794', '#2F9E75', '#128A62'],
      evidence: evidenceLight, sample: '#5A3FE0', sampleSoft: '#EFEBFF',
    },
  };
}

/** WCAG relative luminance contrast ratio — used by tests to keep text/background pairs ≥ 4.5:1 */
export function contrastRatio(fg: string, bg: string): number {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
