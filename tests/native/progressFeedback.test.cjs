const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { buildPostSaveFeedback } = require('../../src/utils/progressFeedback.ts');
const { t } = require('../../src/i18n.ts');
const log = (id, createdAt, fields = {}) => ({ id, createdAt, source: 'manual', title: 'Practice', ...fields });
const current = (fields = {}) => log('current', '2026-09-20T12:00:00Z', fields);
const feedback = (record, history = [], extra = {}) => buildPostSaveFeedback({
  savedLogs: [record], lang: 'en',
  data: { executionLogs: [record, ...history], skills: [], categories: [], modules: [], ...extra },
}).items[0];

for (const lang of ['zh', 'en']) test(`custom activity baseline names no nonexistent skill (${lang})`, () => {
  const result = feedback(current({ durationMinutes: 1 }));
  assert.equal(result.summaryKey, 'firstActivityRecordBaseline');
  assert.equal(result.trend, 'unknown');
  assert.equal(result.baselineStatus, 'first_record');
  const text = t(lang, result.summaryKey);
  assert.notEqual(text, result.summaryKey);
  assert.doesNotMatch(text, /skill|技能/);
});

test('existing linked skill preserves its baseline wording', () => {
  const result = feedback(current({ linkedSkillId: 'skill' }), [], { skills: [{ id: 'skill', name: 'Practice' }] });
  assert.equal(result.summaryKey, 'firstRecordBaseline');
  assert.equal(result.skillName, 'Practice');
});

test('backdated activity never compares against future or equal-time records', () => {
  const record = current({ durationMinutes: 10 });
  const result = feedback(record, [
    log('future', '2026-09-21T12:00:00Z', { durationMinutes: 40 }),
    log('same', record.createdAt, { durationMinutes: 30 }),
    log('invalid', 'invalid', { durationMinutes: 20 }),
  ]);
  assert.equal(result.baselineStatus, 'first_record');
  assert.equal(result.trend, 'unknown');
  assert.equal(result.comparison, undefined);
});

test('chooses the latest strictly earlier comparable record', () => {
  const result = feedback(current({ durationMinutes: 10 }), [
    log('future', '2026-09-21T12:00:00Z', { durationMinutes: 40 }),
    log('earliest', '2026-09-18T12:00:00Z', { durationMinutes: 2 }),
    log('earlier', '2026-09-19T12:00:00Z', { durationMinutes: 5 }),
    log('different', '2026-09-20T11:00:00Z', { title: 'Other activity', durationMinutes: 50 }),
  ]);
  assert.equal(result.trend, 'improved');
  assert.deepEqual(result.comparison, { currentLabel: '10 min', previousLabel: '5 min' });
});

for (const value of [null, undefined, '', ' ', false, NaN, Infinity]) test(`missing or invalid metric stays unknown (${String(value)})`, () => {
  const result = feedback(current({ durationMinutes: value, qualityRating: value, structuredData: { weight: value } }));
  assert.equal(result.durationMinutes, undefined);
  assert.equal(result.qualityRating, undefined);
  assert.equal(result.recordType, 'unknown');
});

test('numeric observations and existing strength comparison remain intact', () => {
  const result = feedback(current({ linkedSkillId: 'bench', actualData: { strength: { weight: 82.5, sets: 3, reps: 5 } } }), [
    log('bench-before', '2026-09-19T12:00:00Z', { linkedSkillId: 'bench', actualData: { strength: { weight: 80, sets: 3, reps: 5 } } }),
  ]);
  assert.equal(result.recordType, 'performance');
  assert.deepEqual(result.comparison, { currentLabel: '82.5kg × 5 × 3', previousLabel: '80kg × 5 × 3' });
  assert.equal(feedback(current({ durationMinutes: '12.5', qualityRating: 0 })).durationMinutes, 12.5);
  assert.equal(feedback(current({ qualityRating: 0 })).qualityRating, 0);
});
