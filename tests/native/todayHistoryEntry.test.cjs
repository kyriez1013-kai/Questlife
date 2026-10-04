const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.join(__dirname, '../../src/screens/HomeScreen.tsx');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'v11UtilityActions') initializer = node.initializer;
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(initializer, 'HomeScreen must retain its utility-action orchestration');

function actions(overrides = {}) {
  const opened = [];
  const context = {
    data: { executionLogs: [] },
    lang: 'en',
    t: (_, key) => key,
    openV11ActivityHistory: () => opened.push('history'),
    activeSession: null,
    dailyDecisionScheduleProposals: [],
    unfinishedRescue: null,
    todayCommand: { primaryAction: 'log' },
    timerNow: 0,
    formatTimer: value => String(value),
    finishV11Session: () => opened.push('finish'),
    openScheduleProposalReview: () => opened.push('proposal'),
    openRescueFlow: id => opened.push(id),
    ...overrides,
  };
  return { items: vm.runInNewContext(`(${initializer.getText(source)})`, context), opened };
}

test('cross-day records keep the existing history handler reachable without a Today record', () => {
  const { items, opened } = actions({ data: { executionLogs: [{ id: 'previous-day', createdAt: '2026-10-03T12:00:00Z' }] } });
  const history = items.find(item => item.id === 'activity-history');
  assert.equal(history.label, 'activityHistory');
  history.onPress();
  assert.deepEqual(opened, ['history']);
});

test('empty or removed history does not leave an orphaned history action', () => {
  for (const data of [{}, { executionLogs: [] }]) {
    assert.equal(actions({ data }).items.some(item => item.id === 'activity-history'), false);
  }
});

test('history does not replace existing finish, proposal or rescue actions', () => {
  const { items, opened } = actions({
    data: { executionLogs: [{ id: 'old' }] },
    activeSession: { title: 'Session', startedAt: '2026-10-03T12:00:00Z' },
    dailyDecisionScheduleProposals: [{ id: 'proposal' }],
    unfinishedRescue: { id: 'rescue-id' },
  });
  assert.deepEqual(Array.from(items, item => item.id), ['activity-history', 'finish-session', 'schedule-proposal', 'rescue']);
  items.forEach(item => item.onPress());
  assert.deepEqual(opened, ['history', 'finish', 'proposal', 'rescue-id']);
});

test('both Today platform surfaces render the same utility-action callbacks', () => {
  for (const name of ['V11IntegratedTodaySurface.tsx', 'V11IntegratedTodaySurface.native.tsx']) {
    const content = fs.readFileSync(path.join(__dirname, '../../src/v11-stage2-rebaseline', name), 'utf8');
    assert.match(content, /utilityActions\.map\(/);
    assert.match(content, /(?:action|a)\.onPress/);
  }
});

test('Web feedback buttons expose the persisted distinct choice as pressed', () => {
  const filename = path.join(__dirname, '../../src/v11-stage2-rebaseline/V11IntegratedTodaySurface.tsx');
  const parsed = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let pressed;
  function inspect(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(parsed) === 'aria-pressed') {
      pressed = node.initializer.expression;
    }
    ts.forEachChild(node, inspect);
  }
  inspect(parsed);
  assert.ok(pressed);
  for (const feedback of [null, 'useful', 'not_useful']) {
    for (const value of ['useful', 'not_useful']) {
      assert.equal(vm.runInNewContext(pressed.getText(parsed), { instantRead: { feedback }, value }), feedback === value);
    }
  }
});
