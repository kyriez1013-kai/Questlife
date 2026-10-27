import { Platform } from 'react-native';

/**
 * v2 UI flag. Web only (URL query). Never touches `questlife_v11_ui`.
 *   ?questlife_v2_ui=1 | a   → v2, direction A (default)
 *   ?questlife_v2_ui=b       → v2, direction B (kept for comparison)
 * Debug-only params (ignored unless v2 is on):
 *   v2_theme=light|dark, v2_lang=zh|en, v2_force=firstuse|sample, v2_view=today|schedule|insights|me
 */
import { parseV2Flag } from './flagParse';
import type { V2Direction, V2Mode } from './flagParse';
export type { V2Direction, V2Mode } from './flagParse';
export { parseV2Flag } from './flagParse';
export type V2Force = 'firstuse' | 'sample' | null;
export type V2View = 'today' | 'schedule' | 'insights' | 'me';

function query(): URLSearchParams | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search);
}

export function isV2UiEnabled(): boolean {
  return parseV2Flag(query()?.get('questlife_v2_ui')).enabled;
}

export function v2Direction(): V2Direction {
  return parseV2Flag(query()?.get('questlife_v2_ui')).direction;
}

export function v2DebugMode(): V2Mode | null {
  const v = query()?.get('v2_theme');
  return v === 'light' || v === 'dark' ? v : null;
}

export function v2DebugLang(): 'zh' | 'en' | null {
  const v = query()?.get('v2_lang');
  return v === 'zh' || v === 'en' ? v : null;
}

export function v2Force(): V2Force {
  const v = query()?.get('v2_force');
  return v === 'firstuse' || v === 'sample' ? v : null;
}

export function v2InitialView(): V2View {
  const v = query()?.get('v2_view');
  return v === 'schedule' || v === 'insights' || v === 'me' ? v : 'today';
}
