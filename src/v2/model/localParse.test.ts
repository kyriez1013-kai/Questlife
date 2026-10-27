import assert from 'node:assert/strict';
import { parseDurationMinutes, parseLocal, parseState, parseStrength } from './localParse';

const skills = [{ id: 'sk-bench', name: '卧推' }, { id: 'sk-sql', name: 'SQL' }];

// duration
assert.equal(parseDurationMinutes('跑了 45 分钟'), 45);
assert.equal(parseDurationMinutes('学了1.5小时'), 90);
assert.equal(parseDurationMinutes('读了半小时'), 30);
assert.equal(parseDurationMinutes('学了一小时20分钟'), 80);
assert.equal(parseDurationMinutes('感觉不错'), null, 'no duration → null, never 0');

// strength
assert.deepEqual(parseStrength('卧推 60kg 5x5'), { weightKg: 60, sets: 5, reps: 5 });
assert.deepEqual(parseStrength('深蹲 100公斤 3组8次'), { weightKg: 100, sets: 3, reps: 8 });
assert.deepEqual(parseStrength('今天没练'), { weightKg: null, sets: null, reps: null });

// state
assert.equal(parseState('状态 4/5'), 4);
assert.equal(parseState('今天状态不太好'), 2);
assert.equal(parseState('感觉不错，状态还行'), 4, 'first-written word wins');
assert.equal(parseState('很累'), 1);
assert.equal(parseState('卧推 60kg'), null, 'no state cue → null');

// whole lines
const a = parseLocal('卧推 60kg 5x5 感觉不错', skills);
assert.equal(a.length, 2);
assert.deepEqual(a[0], { kind: 'action', title: '卧推', skillId: 'sk-bench', durationMinutes: null, weightKg: 60, sets: 5, reps: 5 });
assert.deepEqual(a[1], { kind: 'state', overall: 4 });

const b = parseLocal('学 SQL 40 分钟', skills);
assert.equal(b[0].kind === 'action' && b[0].skillId, 'sk-sql');
assert.equal(b[0].kind === 'action' && b[0].durationMinutes, 40);

const c = parseLocal('跑步 30 分钟', []);
assert.equal(c[0].kind === 'action' && c[0].skillId, null, 'unmatched exercise has no skill id');
assert.equal(c[0].kind === 'action' && c[0].title, '跑步');

const d = parseLocal('今天开了个会', skills);
assert.deepEqual(d, [{ kind: 'note', title: '今天开了个会' }], 'unrecognised → a note, nothing invented');

assert.deepEqual(parseLocal('   ', skills), []);
console.log('localParse ok');
