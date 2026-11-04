const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename);
  const result = {};
  cache.set(filename, result);
  const source = fs.readFileSync(filename, 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: result,
    require: specifier => load(path.resolve(path.dirname(filename), `${specifier}.ts`)),
  }, { filename });
  return result;
}
const { buildFallbackEntriesFromRawText: fallback, assessCaptureCompletion } = load(path.join(__dirname, '../../src/utils/captureCompletion.ts'));
const { compactStrengthValues, isStrengthExercise } = load(path.join(__dirname, '../../src/utils/universalCapture.ts'));
const plain = value => JSON.parse(JSON.stringify(value));
const context = { goals: [], modules: [], skills: [], lang: 'zh' };

test('basketball without a duration has a confirmable activity, not a dead-end or invented time', () => {
  const entries = fallback('打了篮球');
  assert.equal(entries.length, 1);
  const entry = entries[0];
  assert.equal(entry.skillName, '篮球');
  assert.equal(entry.goalType, 'fitness');
  assert.equal(entry.progressType, 'time_based');
  assert.equal(entry.fields.durationMinutes, undefined);
  assert.equal(isStrengthExercise(entry), false);
  const assessment = assessCaptureCompletion('打了篮球', entry, context);
  assert.equal(assessment.domain, 'fitness');
  assert.ok(assessment.missingFields.includes('duration'));
  assert.ok(!assessment.missingFields.includes('weight'));
});

test('sports keep the explicit custom duration, with no strength measurements', () => {
  for (const raw of ['打了篮球 42 分钟', 'basketball for 42 minutes', '游泳 42 分钟', 'cycling 42 min']) {
    const [entry] = fallback(raw);
    assert.ok(entry, raw);
    assert.equal(entry.progressType, 'time_based', raw);
    assert.equal(entry.fields.durationMinutes, 42, raw);
    assert.equal(isStrengthExercise(entry), false, raw);
    assert.deepEqual(plain(compactStrengthValues(entry)), {}, raw);
  }
});

test('bench explicit kilograms, repetitions and sets survive local fallback in either order', () => {
  for (const raw of ['卧推 82.5 kg，5 次，3 组', '卧推 82.5公斤 3组5次', '卧推82.5kg3组5次', 'bench press 82.5 kg, 5 reps, 3 sets', 'bench press 82.5 KG 3x5']) {
    const [entry] = fallback(raw);
    assert.equal(entry.progressType, 'performance_log', raw);
    assert.deepEqual(plain(compactStrengthValues(entry)), { weight: 82.5, sets: 3, reps: 5 }, raw);
    assert.equal(entry.fields.durationMinutes, undefined, raw);
    const assessment = assessCaptureCompletion(raw, entry, context);
    for (const field of ['weight', 'sets', 'reps']) assert.ok(!assessment.missingFields.includes(field), `${raw}: ${field}`);
  }
});

test('missing strength fields remain absent and pounds never become kilograms', () => {
  assert.deepEqual(plain(compactStrengthValues(fallback('卧推 82.5kg')[0])), { weight: 82.5 });
  assert.deepEqual(plain(compactStrengthValues(fallback('bench press 180 lb 3 sets 5 reps')[0])), { sets: 3, reps: 5 });
  assert.deepEqual(plain(compactStrengthValues(fallback('卧推')[0])), {});
});

test('known actions are not relabelled as chest training; longest exercise alias wins', () => {
  for (const [raw, name] of [['深蹲 80kg 3x5', '深蹲'], ['上斜卧推 50kg 3x8', '上斜卧推'], ['romanian deadlift 60kg 3x5', 'Romanian deadlift'], ['workout', 'Workout']]) {
    assert.equal(fallback(raw)[0]?.skillName, name, raw);
  }
  assert.equal(fallback('brunch at home').length, 0);
});

test('compound durations use the existing local parser and do not confuse metres or zero with time', () => {
  for (const raw of ['SQL 学习 1 小时 30 分钟', 'SQL 1 hour 30 minutes']) assert.equal(fallback(raw)[0].fields.durationMinutes, 90, raw);
  assert.equal(fallback('跑步 500m')[0]?.fields.durationMinutes, undefined);
  assert.equal(fallback('SQL 学习 0 分钟')[0].fields.durationMinutes, undefined);
  assert.equal(fallback('阅读半小时')[0].fields.durationMinutes, 30);
});

test('fallback remains proposed data, without entity binding, a score or invented quality', () => {
  for (const raw of ['SQL 学习了 40 分钟', '卧推 82.5kg 3x5', '打了篮球']) {
    const [entry] = fallback(raw);
    assert.ok(entry, raw);
    assert.equal(entry.matchedSkillId, null);
    assert.equal(entry.qualityRating, undefined);
    assert.equal(entry.fields.readiness, undefined);
  }
});

test('completion preserves existing per-set arrays with different weights and repetitions', () => {
  const entry = { skillName: '卧推', goalType: 'fitness', progressType: 'performance_log', fields: {
    sets: [{ weight: 60, reps: 8 }, { weight: 70, reps: 5 }],
  } };
  const assessment = assessCaptureCompletion('卧推', entry, context);
  for (const field of ['weight', 'sets', 'reps']) assert.ok(!assessment.missingFields.includes(field), field);
});

test('a known sport does not acquire unrelated chest exercises as proposed actions', () => {
  const [entry] = fallback('打了篮球');
  const assessment = assessCaptureCompletion('打了篮球', entry, context);
  assert.equal(assessment.suggestedActions.filter(action => action.kind === 'exercise').length, 0);
});
