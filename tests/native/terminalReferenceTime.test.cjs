// Evaluate the actual screen memo, then the existing range projection, using synthetic observations.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const workspace = require('../../src/v11-insights/personal-terminal/personalTerminalWorkspace.ts');
function reference(screen, model) {
  const file = path.join(__dirname, '../../src/v11-insights/personal-terminal', screen + '.tsx');
  const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'now' && node.initializer?.getText(ast).startsWith('useMemo(')) expression = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.ok(expression, 'actual screen reference-time memo exists');
  const js = ts.transpileModule(`const result = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function('useMemo', 'model', 'resolvePersonalTerminalReferenceTime', `${js}\nreturn result;`)(fn => fn(), model, workspace.resolvePersonalTerminalReferenceTime);
}
const text = value => ({ kind: 'text', text: value });
function makeSeries(timestamp) {
  return { id: 'qa-state', entityId: 'market', label: text('State'), unit: text('/5'), stage: 'S1', semantic: 'ordinal_state', valueChangeMode: 'none', supportsCandle: false,
    observations: [{ id: 'qa-one', timestamp, value: 3, provenance: 'questlife_confirmed', sourceIds: ['qa-one'] }], load: [], events: [],
    baseline: { status: 'forming', value: null, low: null, high: null, referenceKind: 'none' }, limitation: text('single observation') };
}
for (const zone of ['Australia/Sydney', 'America/Los_Angeles']) {
  for (const timestamp of ['2026-11-04T17:41:00.000Z', '2026-11-05T03:41:00.000Z']) {
    test(`${zone}: date-only model range retains the latest same-day observation at ${timestamp}`, () => {
      const previous = process.env.TZ; process.env.TZ = zone;
      try {
        const series = makeSeries(timestamp);
        const model = { range: { start: timestamp.slice(0, 10), end: timestamp.slice(0, 10) }, series: [series] };
        const now = reference('PersonalTerminalWorkspaceSurface', model);
        const view = workspace.buildPersonalTerminalRangeViewData(series, { kind: 'preset', preset: '1D' }, now, null);
        assert.equal(view.observations.length, 1, 'the chart must not lose a state that the watchlist already displays');
        assert.equal(view.line[0].value, 3); assert.deepEqual(view.line[0].sourceIds, ['qa-one']);
        assert.equal(series.baseline.value, null, 'showing one observation must not create a baseline');
      } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
    });
  }
}
for (const screen of ['PersonalTerminalWorkspaceSurface', 'V11PersonalTerminal']) test(`${screen}: precise artifact timestamp is never extended or reparsed as a date label`, () => {
  const exact = '2026-11-05T03:41:00.000Z'; const series = makeSeries('2026-11-05T04:41:00.000Z');
  const now = reference(screen, { range: { start: exact, end: exact }, series: [series] });
  assert.equal(now.toISOString(), exact);
});
