const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../../src/utils/universalCapture.ts'), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exportsObject });
const { isStrengthExercise, isConcreteExercise, compactStrengthValues, uniqueLocalizedActions } = exportsObject;
const entry = (skillName, fields = {}) => ({ skillName, goalType: 'fitness', progressType: 'performance_log', fields });

test('a concrete sport is selectable without becoming a strength measurement', () => {
  for (const name of ['篮球', 'basketball', '跑步', 'running', '游泳', 'swimming', 'cycling']) {
    assert.equal(isConcreteExercise(entry(name), name), true);
    assert.equal(isStrengthExercise(entry(name)), false);
    assert.equal(isStrengthExercise(entry(name, { durationMinutes: 40, value: 5, unit: 'km', rpe: 7 })), false);
  }
});

test('known strength actions and explicit strength fields retain the weight-set workflow', () => {
  for (const name of ['卧推', 'Bench press', '深蹲', 'Pull-up', '罗马尼亚硬拉']) assert.equal(isStrengthExercise(entry(name)), true);
  assert.equal(isStrengthExercise(entry('Custom lift', { weight: 82.5, reps: 5, sets: 3 })), true);
  assert.equal(isStrengthExercise(entry('Custom lift', { value: 82.5, unit: 'kg' })), true);
  assert.equal(isStrengthExercise(entry('Custom lift', { sets: [{ weight: 82.5, reps: 5 }] })), true);
  assert.deepEqual(JSON.parse(JSON.stringify(compactStrengthValues(entry('卧推', { weight: 82.5, reps: 5, sets: 3 })))), { weight: 82.5, sets: 3, reps: 5 });
  assert.deepEqual(JSON.parse(JSON.stringify(compactStrengthValues(entry('卧推', { weightKg: 82.5, reps: 5, sets: 3 })))), { weight: 82.5, sets: 3, reps: 5 });
  assert.deepEqual(JSON.parse(JSON.stringify(compactStrengthValues(entry('Custom activity', { weight: null, rpe: null })))), {});
});

test('strength provenance handles scalar and array parser contracts without calling array methods on numbers', () => {
  const filename = path.join(__dirname, '../../src/screens/HomeCapturePending.tsx');
  const parsed = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = parsed.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === 'proposedStrengthValue');
  const js = ts.transpileModule(declaration.getText(parsed), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const proposed = new Function('compactStrengthValues', `${js}; return proposedStrengthValue;`)(compactStrengthValues);
  for (const fields of [{ weightKg: 82.5, reps: 5, sets: 3 }, { sets: [{ weight: 82.5, reps: 5, count: 3 }] }]) {
    for (const [field, value] of [['weight', 82.5], ['reps', 5], ['sets', 3]]) assert.equal(proposed(entry('Bench press', fields), field), value);
  }
});

test('unknown or incomplete exercise data does not manufacture strength values', () => {
  for (const fields of [{}, { weight: null, reps: '', sets: 0 }, { sets: 'unknown' }, { value: 5, unit: 'km' }]) {
    assert.equal(isStrengthExercise(entry('Custom activity', fields)), false);
  }
  assert.equal(isStrengthExercise(entry('Basketball', { weight: 82.5, reps: 5, sets: 3 })), false);
});

test('known activity labels localize and deduplicate without renaming custom entries', () => {
  const actions = uniqueLocalizedActions(['篮球', 'basketball', '跑步', 'My custom activity'], 'en');
  assert.deepEqual(Array.from(actions, item => item.label), ['Basketball', 'Running', 'My custom activity']);
});

test('confirmation writes the existing duration kind for activities and strength kind for lifts', () => {
  const filename = path.join(__dirname, '../../src/screens/HomeCapturePending.tsx');
  const parsed = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = {};
  let createLog;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ['strengthExercise', 'actionProgressType', 'actionTaskType'].includes(node.name.getText(parsed))) declarations[node.name.getText(parsed)] = node.initializer.getText(parsed);
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'createExecutionLog' && node.arguments[0]?.getText(parsed).includes('taskType: actionTaskType')) createLog = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(createLog);
  const property = name => createLog.properties.find(item => item.name?.getText(parsed) === name).initializer.getText(parsed);
  for (const [exerciseName, strength] of [['Basketball', false], ['Bench press', true]]) {
    const context = { isStrengthExercise, completedEntry: entry(exerciseName), exerciseName, perActionDuration: 40,
      weight: 82.5, sets: 3, reps: 5, rpe: undefined, totalVolume: 1237.5, strengthSet: { weight: 82.5, sets: 3, reps: 5 }, captureId: 'TEST_ONLY' };
    for (const name of ['strengthExercise', 'actionProgressType', 'actionTaskType']) context[name] = vm.runInNewContext(declarations[name], context);
    assert.equal(context.strengthExercise, strength);
    assert.equal(context.actionProgressType, strength ? 'performance_log' : 'time_based');
    assert.equal(vm.runInNewContext(property('taskType'), context), strength ? 'strength_training' : 'cardio_recovery');
    const actual = vm.runInNewContext(`(${property('actualData')})`, context);
    const metric = vm.runInNewContext(`(${property('metricUpdate')})`, context);
    assert.equal(actual?.kind, strength ? 'strength_training' : undefined);
    assert.equal(metric.metricType, strength ? 'performance_log' : 'time_based');
    assert.equal(metric.minutesAdded, strength ? undefined : 40);
  }
});
