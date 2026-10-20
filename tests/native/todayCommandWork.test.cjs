// Isolated computation tests, not physical-device frame-rate measurements.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const commandFile = path.join(root, 'src/utils/todayCommand.ts');
const code = ts.transpileModule(fs.readFileSync(commandFile, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject }, { filename: commandFile });
const build = data => exportsObject.buildTodayCommand({
  data: { categories: [], skills: [], ...data }, now: new Date('2026-10-21T02:00:00Z'),
  scheduleBlocks: [], todayLogs: [],
});

function originalPending(data) {
  return (data.rawCaptures || []).some(capture => {
    if ((data.executionLogs || []).some(log =>
      log.structuredData?.sourceCaptureId === capture.id || log.id.startsWith(`capture-${capture.id}`)
    )) return false;
    if (capture.parsed?.entriesDismissed) return false;
    if (capture.parseStatus === 'pending' || capture.parseStatus === 'failed') return true;
    if (capture.parseStatus !== 'done') return false;
    return (capture.parsed?.entries?.length ?? 0) > 0 || capture.parsed?.completionSchema?.needsCompletion === true;
  });
}

test('pending-capture lookup preserves existing lineage and legacy prefix semantics', () => {
  const cases = [
    {},
    { rawCaptures: [{ id: 'a', parseStatus: 'pending' }] },
    { rawCaptures: [{ id: 'a', parseStatus: 'pending' }], executionLogs: [{ id: 'capture-ab-child' }] },
    { rawCaptures: [{ id: 'a-b', parseStatus: 'failed' }], executionLogs: [{ id: 'other', structuredData: { sourceCaptureId: 'a-b' } }] },
    { rawCaptures: [{ id: 'a', parseStatus: 'done', parsed: { entries: [{}] } }] },
    { rawCaptures: [{ id: 'a', parseStatus: 'done', parsed: { entriesDismissed: true, entries: [{}] } }] },
    { rawCaptures: [{ id: 'a', parseStatus: 'done', parsed: { completionSchema: { needsCompletion: true } } }] },
  ];
  for (let run = 0; run < 80; run++) {
    cases.push({
      rawCaptures: Array.from({ length: 30 }, (_, i) => ({
        id: `qa-${i}`, parseStatus: ['pending', 'failed', 'done', 'ignored'][(i + run) % 4],
        parsed: { entriesDismissed: (i + run) % 9 === 0, entries: (i + run) % 3 ? [{}] : [] },
      })),
      executionLogs: Array.from({ length: 26 }, (_, i) => ({
        id: (run + i) % 2 ? `capture-qa-${i}-entry` : `log-${i}`,
        structuredData: (run + i) % 3 ? { sourceCaptureId: `qa-${i}` } : undefined,
      })).reverse(),
    });
  }
  for (const data of cases) assert.equal(build(data).type === 'finish_pending_capture', originalPending(data));
});

test('confirmed history is not rescanned once per capture on each Today calculation', () => {
  const count = 1200;
  let inspected = 0;
  const data = {
    rawCaptures: Array.from({ length: count }, (_, i) => ({ id: `qa-${i}`, parseStatus: 'done', parsed: { entries: [{}] } })),
    executionLogs: Array.from({ length: count }, (_, i) => ({
      id: `log-${i}`,
      get structuredData() { inspected++; return { sourceCaptureId: `qa-${i}` }; },
    })),
  };
  assert.equal(build(data).type, 'empty_state');
  assert.ok(inspected <= count * 2, `read lineage ${inspected} times for ${count} records`);
});

const homeFile = path.join(root, 'src/screens/HomeScreen.tsx');
const home = ts.createSourceFile(homeFile, fs.readFileSync(homeFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const variables = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node)) variables.set(node.name.getText(home), node);
  ts.forEachChild(node, visit);
}
visit(home);
// Exercise the exact production selectors and React dependency equality rule.
function todaySelection() {
  let cached;
  return (data, todayStr) => {
    const useMemo = (fn, deps) => {
      if (!cached || deps.some((value, i) => !Object.is(value, cached.deps[i]))) cached = { deps, value: fn() };
      return cached.value;
    };
    return vm.runInNewContext(variables.get('todayLogs').initializer.getText(home), { useMemo, data, todayStr });
  };
}

test('editing an unsaved field reuses Today records rather than invalidating the decision chain', () => {
  const render = todaySelection();
  const data = { executionLogs: [{ id: 'qa-a', date: '2026-10-21' }, { id: 'qa-b', date: '2026-10-20' }] };
  const first = render(data, '2026-10-21');
  for (let keystroke = 0; keystroke < 40; keystroke++) assert.equal(render(data, '2026-10-21'), first);
});

test('real record changes, deletion and day changes invalidate Today selection', () => {
  const render = todaySelection();
  const a = { id: 'qa-a', date: '2026-10-21' };
  assert.deepEqual(Array.from(render({ executionLogs: [a] }, '2026-10-21')), [a]);
  const b = { id: 'qa-b', date: '2026-10-21' };
  assert.deepEqual(Array.from(render({ executionLogs: [a, b] }, '2026-10-21')), [a, b]);
  assert.deepEqual(Array.from(render({ executionLogs: [b] }, '2026-10-21')), [b]);
  assert.deepEqual(Array.from(render({ executionLogs: [b] }, '2026-10-22')), []);
});

if (process.env.TODAY_WORK_BENCHMARK === '1') {
  const data = {
    rawCaptures: Array.from({ length: 1200 }, (_, i) => ({ id: `qa-${i}`, parseStatus: 'done', parsed: { entries: [{}] } })),
    executionLogs: Array.from({ length: 1200 }, (_, i) => ({ id: `log-${i}`, structuredData: { sourceCaptureId: `qa-${i}` } })),
  };
  const durations = [];
  for (let i = 0; i < 25; i++) {
    const start = performance.now(); build(data); durations.push(performance.now() - start);
  }
  durations.sort((a, b) => a - b);
  console.log(JSON.stringify({ scope: 'Node computation only; synthetic 1200 capture/log pairs; NOT iPhone UI', samples: durations.length, p50Ms: durations[12], p95Ms: durations[23] }));
}
