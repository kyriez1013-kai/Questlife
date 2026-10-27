import assert from 'node:assert/strict';
import { buildFirstSuggestion, remainingAnswers, sleepToValue, stateToOverall } from './firstStart';

assert.equal(remainingAnswers({}), 3);
assert.equal(remainingAnswers({ sleep: 'ok', focus: 'work' }), 1);
assert.equal(buildFirstSuggestion({ sleep: 'bad', state: 'low', focus: 'training' }).intensity, 'light');
assert.equal(buildFirstSuggestion({ sleep: 'good', state: 'high', focus: 'study' }).intensity, 'focus');
assert.equal(buildFirstSuggestion({ sleep: 'ok', state: 'mid', focus: 'work' }).intensity, 'normal');
assert.equal(buildFirstSuggestion({ sleep: 'bad', state: 'high', focus: 'work' }).intensity, 'normal', 'bad sleep + high state is not "focus"');
assert.equal(buildFirstSuggestion({ sleep: 'good', state: 'low', focus: 'work' }).basis, 'prior', 'always general advice');
// low state yields a 2-minute start, matching what todayCommand's low-state rule will say on Today
assert.equal(buildFirstSuggestion({ sleep: 'ok', state: 'low', focus: 'chores' }).minutes, 2);
// every (sleep,state,focus) combination has zh+en text
for (const sleep of ['bad', 'ok', 'good'] as const) for (const state of ['low', 'mid', 'high'] as const) for (const focus of ['training', 'study', 'work', 'chores', 'recover', 'other'] as const) for (const lang of ['zh', 'en'] as const) {
  const s = buildFirstSuggestion({ sleep, state, focus }, lang);
  assert.ok(s.title.length > 0 && s.body.length > 0);
}
assert.equal(stateToOverall('low'), 2);
assert.equal(sleepToValue('good'), 3);
console.log('firstStart ok');
