const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const source = ts.createSourceFile('HomeScreen.tsx', fs.readFileSync(path.join(root, 'src/screens/HomeScreen.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const variables = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node)) variables.set(node.name.getText(source), node.initializer?.getText(source));
  ts.forEachChild(node, visit);
}
visit(source);
function load(relative) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports });
  return exports;
}
const { buildTodayCommand } = load('src/utils/todayCommand.ts');
const { nativeFormCopy } = load('src/native/nativeFormCopy.ts');
const { t } = load('src/i18n.ts');
const { LocalMutationPersistence } = load('src/utils/localMutationPersistence.ts');
const now = new Date().toISOString();
const execution = { id: 'isolated-execution', createdAt: now, durationMinutes: 24 };
function context(localPersistence, lang = 'en') {
  return {
    localPersistence, latestTodayLog: execution, lang,
    recentExecutionItems: [{ id: execution.id, title: 'SQL', meta: '24 minutes', detail: 'SQL practice' }],
    data: { executionLogs: [execution], rawCaptures: [] },
    useMemo: fn => fn(), nativeFormCopy, t: (_lang, key) => key,
    openV11ActivityHistory() {}, openV11Capture() {}, confirmDeleteTodayLog() {},
  };
}
function value(name, ctx) {
  const js = ts.transpileModule(`(${variables.get(name)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return vm.runInNewContext(js, ctx);
}
function command(ctx) {
  const feedback = value('latestFeedbackLog', ctx);
  return buildTodayCommand({ data: ctx.data, now: new Date(now), scheduleBlocks: [], todayLogs: [execution], latestFeedback: feedback && { executionLogId: feedback.id } });
}

test('Today does not offer saved feedback while the actual local ACK is pending, failed, or retrying', async () => {
  const queue = new LocalMutationPersistence();
  let rejectWrite;
  let resolveRetry;
  let attempts = 0;
  queue.register('execution:isolated-execution', () => new Promise((resolve, reject) => {
    attempts++;
    if (attempts === 1) rejectWrite = reject;
    else resolveRetry = resolve;
  }));
  await Promise.resolve();
  assert.notEqual(command(context(queue.getSnapshot())).primaryAction, 'review_feedback', 'an optimistic execution is not saved feedback');
  const failedAck = queue.waitAll();
  rejectWrite(new Error('isolated disk failure'));
  await assert.rejects(failedAck);
  assert.equal(queue.getSnapshot().failed, true);
  assert.notEqual(command(context(queue.getSnapshot())).primaryAction, 'review_feedback');
  queue.retry();
  await Promise.resolve();
  assert.notEqual(command(context(queue.getSnapshot())).primaryAction, 'review_feedback');
  const ack = queue.waitAll();
  resolveRetry();
  await ack;
  assert.equal(command(context(queue.getSnapshot())).primaryAction, 'review_feedback');
  assert.equal(attempts, 2);
});

for (const lang of ['zh', 'en']) test(`latest record exposes pending and failed durability instead of progress metadata (${lang})`, () => {
  for (const snapshot of [{ pending: 1, failed: false }, { pending: 2, failed: true }]) {
    const ctx = context(snapshot, lang);
    const latest = value('v11LatestRecord', ctx);
    assert.equal(latest.title, 'SQL');
    assert.equal(latest.metadata, nativeFormCopy(lang, snapshot.failed ? 'failed' : 'pending'));
    assert.ok(latest.accessibilityLabel.includes(latest.metadata), 'screen readers receive the same unsaved warning');
    assert.equal(latest.onPress, ctx.openV11ActivityHistory, 'record remains reachable while a write is unresolved');
  }
});

test('acknowledged offline records retain feedback and progress metadata; cloud delivery is not required', () => {
  const ctx = context({ pending: 0, failed: false });
  assert.equal(command(ctx).primaryAction, 'review_feedback');
  assert.equal(value('v11LatestRecord', ctx).metadata, '24 minutes · SQL practice');
});

test('a raw capture also exposes its unresolved local write without inventing an execution', () => {
  const ctx = context({ pending: 1, failed: true });
  ctx.recentExecutionItems = [];
  ctx.data = { executionLogs: [], rawCaptures: [{ id: 'isolated-raw', text: 'uncertain observation', createdAt: now }] };
  const latest = value('v11LatestRecord', ctx);
  assert.equal(latest.metadata, 'Device changes are not saved yet');
  assert.equal(latest.onPress, ctx.openV11Capture);
  assert.equal(value('v11LatestRecord', { ...ctx, data: { executionLogs: [], rawCaptures: [] } }), undefined);
});

for (const lang of ['zh', 'en']) test(`unconfirmed capture advice does not claim a saved result or feedback (${lang})`, () => {
  const advice = buildTodayCommand({
    data: { executionLogs: [], rawCaptures: [{ id: 'isolated-pending', parseStatus: 'failed' }] },
    now: new Date(now), scheduleBlocks: [], todayLogs: [],
  });
  assert.equal(advice.primaryAction, 'finish_pending_capture');
  assert.doesNotMatch(t(lang, advice.reasonKey), /saved|feedback|保存|反馈/i);
  assert.match(t(lang, advice.reasonKey), /confirm|确认/i);
});
