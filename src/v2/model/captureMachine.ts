import type { V2Entry } from './localParse';

/**
 * Capture flow as a pure reducer so every state — especially failures — is testable.
 *
 *   idle → saving_raw → parsing → confirm → saving → saved
 *                         │          │         └→ save_failed ─(retry)→ saving
 *                         └→ parse_failed ─(manual)→ confirm   (raw text is already durable)
 *
 * "saved" is reachable ONLY through SAVE_OK, which the UI dispatches after the persistence ACK.
 */
export type CaptureSource = 'ai' | 'local' | 'manual';
export type CaptureBanner = 'offline' | 'aiOff' | null;

export type CaptureState =
  | { phase: 'idle' }
  | { phase: 'saving_raw'; text: string }
  | { phase: 'parsing'; text: string; rawId: string }
  | { phase: 'parse_failed'; text: string; rawId: string; code: string }
  | { phase: 'confirm'; text: string; rawId: string; entries: V2Entry[]; source: CaptureSource; banner: CaptureBanner }
  | { phase: 'saving'; text: string; rawId: string; entries: V2Entry[]; source: CaptureSource; banner: CaptureBanner }
  | { phase: 'save_failed'; text: string; rawId: string; entries: V2Entry[]; source: CaptureSource; banner: CaptureBanner; error: string }
  | { phase: 'saved'; text: string; rawId: string; count: number };

export type CaptureEvent =
  | { type: 'SUBMIT'; text: string }
  | { type: 'RAW_SAVED'; rawId: string }
  | { type: 'RAW_FAILED' }
  | { type: 'PARSED'; entries: V2Entry[]; source: CaptureSource; banner: CaptureBanner }
  | { type: 'PARSE_FAILED'; code: string }
  | { type: 'MANUAL'; entries?: V2Entry[] }
  | { type: 'RETRY_PARSE' }
  | { type: 'EDIT'; index: number; patch: Partial<V2Entry> }
  | { type: 'REMOVE'; index: number }
  | { type: 'ADD_ACTION' }
  | { type: 'SAVE' }
  | { type: 'SAVE_OK'; count: number }
  | { type: 'SAVE_FAIL'; error: string }
  | { type: 'RESET' };

export const initialCapture: CaptureState = { phase: 'idle' };

export function captureReducer(state: CaptureState, ev: CaptureEvent): CaptureState {
  switch (ev.type) {
    case 'SUBMIT': {
      const text = ev.text.trim();
      if (!text) return state;
      if (state.phase !== 'idle') return state;
      return { phase: 'saving_raw', text };
    }
    case 'RAW_SAVED':
      return state.phase === 'saving_raw' ? { phase: 'parsing', text: state.text, rawId: ev.rawId } : state;
    case 'RAW_FAILED':
      // Could not even persist the text: go back to idle so the composer keeps the text; the UI shows the save error.
      return state.phase === 'saving_raw' ? { phase: 'idle' } : state;
    case 'PARSED':
      return state.phase === 'parsing'
        ? { phase: 'confirm', text: state.text, rawId: state.rawId, entries: ev.entries, source: ev.source, banner: ev.banner }
        : state;
    case 'PARSE_FAILED':
      return state.phase === 'parsing' ? { phase: 'parse_failed', text: state.text, rawId: state.rawId, code: ev.code } : state;
    case 'MANUAL':
      return state.phase === 'parse_failed'
        ? {
            phase: 'confirm', text: state.text, rawId: state.rawId, source: 'manual', banner: null,
            entries: ev.entries && ev.entries.length > 0
              ? ev.entries
              : [{ kind: 'action', title: '', skillId: null, durationMinutes: null, weightKg: null, sets: null, reps: null }],
          }
        : state;
    case 'RETRY_PARSE':
      return state.phase === 'parse_failed' ? { phase: 'parsing', text: state.text, rawId: state.rawId } : state;
    case 'EDIT':
      if (state.phase !== 'confirm' && state.phase !== 'save_failed') return state;
      return { ...state, phase: 'confirm', entries: state.entries.map((e, i) => (i === ev.index ? ({ ...e, ...ev.patch } as V2Entry) : e)) } as CaptureState;
    case 'REMOVE':
      if (state.phase !== 'confirm' && state.phase !== 'save_failed') return state;
      return { ...state, phase: 'confirm', entries: state.entries.filter((_, i) => i !== ev.index) } as CaptureState;
    case 'ADD_ACTION':
      if (state.phase !== 'confirm' && state.phase !== 'save_failed') return state;
      return {
        ...state, phase: 'confirm',
        entries: [...state.entries, { kind: 'action', title: '', skillId: null, durationMinutes: null, weightKg: null, sets: null, reps: null }],
      } as CaptureState;
    case 'SAVE':
      if (state.phase !== 'confirm' && state.phase !== 'save_failed') return state;
      if (!canSave(state.entries)) return state;
      return { phase: 'saving', text: state.text, rawId: state.rawId, entries: state.entries, source: state.source, banner: state.banner };
    case 'SAVE_OK':
      return state.phase === 'saving' ? { phase: 'saved', text: state.text, rawId: state.rawId, count: ev.count } : state;
    case 'SAVE_FAIL':
      return state.phase === 'saving'
        ? { phase: 'save_failed', text: state.text, rawId: state.rawId, entries: state.entries, source: state.source, banner: state.banner, error: ev.error }
        : state;
    case 'RESET':
      return initialCapture;
    default:
      return state;
  }
}

/** An entry is saveable when it carries something real: an action needs a name; a note needs text. */
export function entryIsValid(e: V2Entry): boolean {
  if (e.kind === 'action') return e.title.trim().length > 0;
  if (e.kind === 'note') return e.title.trim().length > 0;
  return e.overall >= 1 && e.overall <= 5;
}

export function canSave(entries: V2Entry[]): boolean {
  return entries.length > 0 && entries.every(entryIsValid);
}
