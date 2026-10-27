import assert from 'node:assert/strict';
import { canSave, captureReducer, initialCapture, type CaptureState } from './captureMachine';
import type { V2Entry } from './localParse';

const act = (title = '卧推'): V2Entry => ({ kind: 'action', title, skillId: null, durationMinutes: null, weightKg: null, sets: null, reps: null });
const run = (s: CaptureState, ...evs: Parameters<typeof captureReducer>[1][]) => evs.reduce(captureReducer, s);

// happy path
let s = run(initialCapture, { type: 'SUBMIT', text: ' 卧推 ' }, { type: 'RAW_SAVED', rawId: 'rc-1' });
assert.equal(s.phase, 'parsing');
s = run(s, { type: 'PARSED', entries: [act()], source: 'local', banner: 'aiOff' });
assert.equal(s.phase, 'confirm');
s = run(s, { type: 'SAVE' });
assert.equal(s.phase, 'saving');
assert.notEqual(s.phase, 'saved', 'saving is not saved: success only after ACK');
s = run(s, { type: 'SAVE_OK', count: 1 });
assert.equal(s.phase, 'saved');

// SAVE_OK is ignored unless we were saving (no early success)
assert.equal(run(initialCapture, { type: 'SAVE_OK', count: 1 }).phase, 'idle');
const confirm = run(initialCapture, { type: 'SUBMIT', text: 'x' }, { type: 'RAW_SAVED', rawId: 'r' }, { type: 'PARSED', entries: [act()], source: 'ai', banner: null });
assert.equal(captureReducer(confirm, { type: 'SAVE_OK', count: 1 }).phase, 'confirm');

// empty submit is ignored; double submit ignored
assert.equal(run(initialCapture, { type: 'SUBMIT', text: '   ' }).phase, 'idle');
assert.equal(run(confirm, { type: 'SUBMIT', text: 'again' }).phase, 'confirm');

// save failure keeps content and can retry
let f = run(confirm, { type: 'SAVE' }, { type: 'SAVE_FAIL', error: 'persist_failed' });
assert.equal(f.phase, 'save_failed');
assert.equal(f.phase === 'save_failed' && f.entries.length, 1, 'entries survive a failed save');
assert.equal(f.phase === 'save_failed' && f.text, 'x', 'raw text survives a failed save');
f = run(f, { type: 'SAVE' });
assert.equal(f.phase, 'saving');

// parse failure: raw text is durable, can go manual or retry
const pf = run(initialCapture, { type: 'SUBMIT', text: '随便写' }, { type: 'RAW_SAVED', rawId: 'rc-2' }, { type: 'PARSE_FAILED', code: 'network' });
assert.equal(pf.phase, 'parse_failed');
assert.equal(run(pf, { type: 'RETRY_PARSE' }).phase, 'parsing');
const manual = run(pf, { type: 'MANUAL' });
assert.equal(manual.phase, 'confirm');
assert.equal(manual.phase === 'confirm' && manual.source, 'manual');
assert.equal(manual.phase === 'confirm' && canSave(manual.entries), false, 'blank manual entry is not saveable until named');
assert.equal(run(manual, { type: 'SAVE' }).phase, 'confirm', 'SAVE blocked while invalid');
assert.equal(run(manual, { type: 'EDIT', index: 0, patch: { title: '散步' } as never }, { type: 'SAVE' }).phase, 'saving');
// "only keep the original text" = manual with a note entry, saveable in one go
const keep = run(pf, { type: 'MANUAL', entries: [{ kind: 'note', title: '随便写' }] }, { type: 'SAVE' });
assert.equal(keep.phase, 'saving');
assert.equal(keep.phase === 'saving' && keep.entries[0].kind, 'note');

// edit / remove / add
let e = run(confirm, { type: 'ADD_ACTION' });
assert.equal(e.phase === 'confirm' && e.entries.length, 2);
e = run(e, { type: 'REMOVE', index: 1 });
assert.equal(e.phase === 'confirm' && e.entries.length, 1);
assert.equal(canSave([]), false, 'nothing to save');
assert.equal(captureReducer(e, { type: 'RESET' }).phase, 'idle');
console.log('captureMachine ok');
