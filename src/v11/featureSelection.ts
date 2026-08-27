export type V11ProductMode =
  | 'owner_beta'
  | 'legacy'
  | 'stage2'
  | 'stage3_insights'
  | 'stage3_quant_terminal'
  | 'stage3_personal_terminal'
  | 'insights_v3';

export function resolveV11ProductMode(route: string | null): V11ProductMode {
  switch (route) {
    case 'legacy':
      return 'legacy';
    case 'stage2':
      return 'stage2';
    case 'stage3-insights':
      return 'stage3_insights';
    case 'stage3-quant-terminal':
      return 'stage3_quant_terminal';
    case 'stage3-personal-terminal':
      return 'stage3_personal_terminal';
    case 'insights-v3':
    case 'insights-v5':
      return 'insights_v3';
    default:
      return 'owner_beta';
  }
}

export function isV11ProductMode(mode: V11ProductMode): boolean {
  return mode !== 'legacy';
}

export function isV11TodayMode(mode: V11ProductMode): boolean {
  return mode === 'owner_beta'
    || mode === 'stage2'
    || mode === 'stage3_personal_terminal';
}

export function isV11InsightsMode(mode: V11ProductMode): boolean {
  return mode === 'owner_beta'
    || mode === 'stage3_insights'
    || mode === 'stage3_quant_terminal'
    || mode === 'stage3_personal_terminal'
    || mode === 'insights_v3';
}

export function isV11PersonalTerminalMode(mode: V11ProductMode): boolean {
  return mode === 'owner_beta' || mode === 'stage3_personal_terminal';
}
