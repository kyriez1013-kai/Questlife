import { useCallback, useReducer, useRef } from 'react';
import { Platform } from 'react-native';
import { captureReducer, initialCapture, canSave, type CaptureState, type CaptureBanner, type CaptureSource } from '../model/captureMachine';
import { parseLocal, type V2Entry } from '../model/localParse';
import { localDateKey } from '../model/todayModel';
import { useV2Actions, useV2Select } from '../storeBridge';
import { authenticatedAiPost } from '../../services/authenticatedAi';
import { aiPreferencesSnapshot } from '../../services/aiPreferences';
import { buildDataProvenance, EXECUTION_INSTRUMENT_VERSION } from '../../utils/dataProvenance';
import type { ParsedEntry, RawCapture } from '../../types';

/**
 * Capture controller.
 *  - the raw text is persisted (and ACKed) BEFORE parsing, so a parse/save failure never loses what was typed
 *  - success is dispatched only after waitForLocalWrites() resolves (the persistence ACK)
 *  - a retry after a failed save never creates the records twice
 */
export function isOnline(): boolean {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') return navigator.onLine !== false;
  return true;
}

function aiEntriesToV2(entries: ParsedEntry[]): V2Entry[] {
  const out: V2Entry[] = [];
  for (const e of entries) {
    const f = (e.fields ?? {}) as Record<string, any>;
    if (f.nonRecordable && /state/.test(e.skillName)) {
      continue; // state candidates are re-derived by the local state parser below
    }
    const sets = Array.isArray(f.sets) ? f.sets : [];
    const first = sets[0] as { weight?: number; reps?: number } | undefined;
    out.push({
      kind: 'action',
      title: e.skillName,
      skillId: e.matchedSkillId ?? null,
      durationMinutes: typeof f.durationMinutes === 'number' && f.durationMinutes > 0 ? f.durationMinutes : null,
      weightKg: typeof first?.weight === 'number' ? first.weight : null,
      sets: sets.length > 0 ? sets.length : null,
      reps: typeof first?.reps === 'number' ? first.reps : null,
    });
  }
  return out;
}

export function useCapture(opts: { onSaved: (count: number) => void; onRawSaved: () => void; onError: (message: string) => void }) {
  const actions = useV2Actions();
  const skills = useV2Select((s) => s.data.skills);
  const categories = useV2Select((s) => s.data.categories);
  const [state, dispatch] = useReducer(captureReducer, initialCapture as CaptureState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const created = useRef<{ rawId: string; ids: string[] } | null>(null);

  const ack = useCallback(async (): Promise<boolean> => {
    try { await actions.waitForLocalWrites(); return true; } catch { return false; }
  }, [actions]);

  const runParse = useCallback(async (text: string) => {
    const skillRefs = skills.map((s) => ({ id: s.id, name: s.name }));
    const local = () => parseLocal(text, skillRefs);
    const offline = !isOnline();
    const aiOn = aiPreferencesSnapshot().enabled;
    if (offline || !aiOn) {
      const banner: CaptureBanner = offline ? 'offline' : 'aiOff';
      dispatch({ type: 'PARSED', entries: local(), source: 'local', banner });
      return;
    }
    try {
      const result = await authenticatedAiPost('/api/parse', {
        text,
        history: [],
        skillsCatalog: skillRefs,
        goalsSnapshot: categories.map((c) => ({ id: c.id, name: c.name, progressPercent: 0, targetSummary: (c.vision ?? c.name).slice(0, 60) })),
        skillHistory: [],
      });
      if (!result?.ok) throw new Error('parse_not_ok');
      const ai = aiEntriesToV2(Array.isArray(result.entries) ? result.entries : []);
      // keep a state reading if the line has one (the local rule parser is deterministic and cheap)
      const localState = local().filter((e) => e.kind === 'state');
      const merged = [...ai, ...localState];
      dispatch({ type: 'PARSED', entries: merged.length > 0 ? merged : local(), source: 'ai', banner: null });
    } catch (error) {
      dispatch({ type: 'PARSE_FAILED', code: error instanceof Error ? error.message : 'service_unavailable' });
    }
  }, [skills, categories]);

  const submit = useCallback(async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || stateRef.current.phase !== 'idle') return false;
    dispatch({ type: 'SUBMIT', text: trimmed });
    let raw: RawCapture;
    try {
      raw = actions.addRawCapture(trimmed);
    } catch {
      dispatch({ type: 'RAW_FAILED' });
      opts.onError('没保存成功，文字还在输入框里。');
      return false;
    }
    if (!(await ack())) {
      dispatch({ type: 'RAW_FAILED' });
      opts.onError('没保存成功，文字还在输入框里。');
      return false;
    }
    created.current = null;
    dispatch({ type: 'RAW_SAVED', rawId: raw.id });
    opts.onRawSaved();
    await runParse(trimmed);
    return true;
  }, [actions, ack, runParse, opts]);

  /** Re-open the flow for a capture that is still pending/failed (todayCommand → finish_pending_capture). */
  const resume = useCallback(async (raw: RawCapture) => {
    if (stateRef.current.phase !== 'idle') return;
    dispatch({ type: 'SUBMIT', text: raw.text });
    dispatch({ type: 'RAW_SAVED', rawId: raw.id });
    created.current = null;
    await runParse(raw.text);
  }, [runParse]);

  const retryParse = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== 'parse_failed') return;
    dispatch({ type: 'RETRY_PARSE' });
    await runParse(s.text);
  }, [runParse]);

  const manual = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'parse_failed') return;
    const guess = parseLocal(s.text, skills.map((k) => ({ id: k.id, name: k.name })));
    dispatch({ type: 'MANUAL', entries: guess.filter((e) => e.kind !== 'note') });
  }, [skills]);

  type Snapshot = { text: string; rawId: string; entries: V2Entry[]; source: CaptureSource };

  /** Persist a snapshot. Takes the data explicitly so callers never depend on a not-yet-rendered stateRef. */
  const doSave = useCallback(async (s: Snapshot) => {
    dispatch({ type: 'SAVE' });
    const now = new Date();
    const date = localDateKey(now);
    const iso = now.toISOString();
    try {
      if (!created.current || created.current.rawId !== s.rawId) {
        const ids: string[] = [];
        s.entries.forEach((e, entryIndex) => {
          const provenance = buildDataProvenance({
            origin: s.source === 'ai' ? 'OWNER_CONFIRMED_AI_PARSE' : 'OWNER_OBSERVED',
            confirmation: s.source === 'manual' ? 'USER_ENTERED' : 'USER_CONFIRMED',
            captureMethod: 'smart_capture_text',
            recordedAt: iso,
            instrumentVersion: EXECUTION_INSTRUMENT_VERSION,
            protocolVersion: 'questlife-v2-capture-confirmation-v1',
            candidate: { rawCaptureId: s.rawId, entryIndex },
            limitations: ['EVENT_TIME_PRECISION_DAY_ONLY'],
          });
          if (e.kind === 'state') {
            const hour = now.getHours();
            const timeBlock = hour < 11 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night';
            const row = actions.createStateCheckIn({
              date, timestamp: iso, timeBlock, overall: e.overall, energy: e.overall,
              label: e.overall <= 1 ? 'very_low' : e.overall === 2 ? 'low' : e.overall === 3 ? 'normal' : e.overall === 4 ? 'good' : 'great',
            });
            ids.push(row.id);
            return;
          }
          const structured: Record<string, unknown> = { sourceCaptureId: s.rawId, capturedBy: 'v2' };
          if (e.kind === 'action') {
            if (e.weightKg != null) structured.weightKg = e.weightKg;
            if (e.sets != null) structured.sets = e.sets;
            if (e.reps != null) structured.reps = e.reps;
          } else {
            structured.note = true;
          }
          const log = actions.createExecutionLog({
            date,
            title: e.title.trim(),
            linkedSkillId: e.kind === 'action' ? e.skillId ?? undefined : undefined,
            // undefined (not 0) when the person did not give a duration: the store treats it as "unrecorded"
            durationMinutes: e.kind === 'action' ? e.durationMinutes ?? undefined : undefined,
            source: 'today_log',
            structuredData: structured,
            dataProvenance: provenance,
          });
          ids.push(log.id);
        });
        actions.updateRawCapture(s.rawId, {
          parseStatus: 'done',
          parsed: { type: 'misc', fields: {}, crossLinks: [], insight: { zh: '', en: '' }, entries: [], entriesDismissed: true },
        });
        created.current = { rawId: s.rawId, ids };
      } else {
        // a previous attempt already created the records: only re-attempt the durable write
        await actions.retryLocalWrites();
      }
    } catch {
      dispatch({ type: 'SAVE_FAIL', error: 'persist_failed' });
      return;
    }
    if (await ack()) {
      dispatch({ type: 'SAVE_OK', count: s.entries.length });
      opts.onSaved(s.entries.length);
    } else {
      dispatch({ type: 'SAVE_FAIL', error: 'persist_failed' });
    }
  }, [actions, ack, opts]);

  const save = useCallback(async () => {
    const s = stateRef.current;
    if ((s.phase !== 'confirm' && s.phase !== 'save_failed') || !canSave(s.entries)) return;
    await doSave(s);
  }, [doSave]);

  /** parse failed → keep exactly what was typed, as one note record. */
  const keepRawOnly = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== 'parse_failed') return;
    const entries: V2Entry[] = [{ kind: 'note', title: s.text }];
    dispatch({ type: 'MANUAL', entries });
    await doSave({ text: s.text, rawId: s.rawId, entries, source: 'manual' });
  }, [doSave]);

  const retrySave = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== 'save_failed') return;
    try { await actions.retryLocalWrites(); } catch { /* ack below decides */ }
    await save();
  }, [actions, save]);

  /** Cancel at confirm: the original text is kept, but it stops being "pending" for todayCommand. */
  const cancel = useCallback(() => {
    const s = stateRef.current;
    if (s.phase === 'confirm' || s.phase === 'parse_failed' || s.phase === 'save_failed') {
      if (!created.current || created.current.rawId !== s.rawId) {
        if (s.phase === 'confirm') {
          actions.updateRawCapture(s.rawId, {
            parseStatus: 'done',
            parsed: { type: 'misc', fields: {}, crossLinks: [], insight: { zh: '', en: '' }, entries: [], entriesDismissed: true },
          });
        }
        // parse_failed / save_failed: leave the capture pending so Today offers "完成待确认记录"
      }
    }
    dispatch({ type: 'RESET' });
  }, [actions]);

  const close = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, dispatch, submit, resume, retryParse, manual, keepRawOnly, save, retrySave, cancel, close };
}
