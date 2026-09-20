import type { QuickActionIntent } from '../contracts';

export const SHORTCUT_ROUTES = ['capture', 'state', 'history', 'decision', 'plan'] as const;
export type ShortcutRoute = typeof SHORTCUT_ROUTES[number];
const kinds = { capture: 'quick_capture', state: 'morning_state', history: 'end_of_day', decision: 'decision_followup', plan: 'current_plan' } as const;

/** External entry points only open an existing review UI; they never save or complete a record. */
export function shortcutIntent(value: unknown): QuickActionIntent | null {
  if (typeof value !== 'string' || !SHORTCUT_ROUTES.includes(value as ShortcutRoute)) return null;
  return { action: 'OPEN', kind: kinds[value as ShortcutRoute], notificationId: `shortcut:${value}` };
}

export function deepLinkIntent(value: string): QuickActionIntent | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'questlife:' || url.username || url.password || url.port || url.search || url.hash) return null;
    if (url.pathname && url.pathname !== '/') return null;
    return shortcutIntent(url.hostname);
  } catch { return null; }
}
