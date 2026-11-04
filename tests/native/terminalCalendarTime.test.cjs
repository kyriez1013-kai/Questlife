const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const { buildPersonalTerminalViewData } = require('../../src/v11-insights/personal-terminal/personalTerminalPresentation.ts');
const chartFile = path.join(__dirname, '../../src/v11-insights/personal-terminal/PersonalTerminalChart.tsx');
const ast = ts.createSourceFile(chartFile, fs.readFileSync(chartFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['chartTime', 'timeLabel', 'dateFromChartTime', 'axisLabel'];
const source = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(ast)).join('\n');
const chart = new Function(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText + '\nreturn { chartTime, axisLabel };')();
function series(timestamps) {
  return { observations: timestamps.map((timestamp, index) => ({ id: `qa-${index}`, timestamp, value: index + 2, sourceIds: [`qa-${index}`], provenance: 'questlife_confirmed' })), load: [] };
}
function inZone(zone, fn) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try { fn(); } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
}
for (const [zone, timestamp, day] of [
  ['Australia/Sydney', '2026-11-04T17:41:00.000Z', '2026-11-05'],
  ['America/Los_Angeles', '2026-11-05T03:41:00.000Z', '2026-11-04'],
]) {
  test(`${zone}: daily observation belongs to its local calendar day`, () => inZone(zone, () => {
    const input = series([timestamp]);
    const view = buildPersonalTerminalViewData(input, '1M', new Date(timestamp));
    assert.equal(view.line[0].time, day);
    assert.equal(chart.axisLabel('en', '1M', chart.chartTime(view.line[0].time)), new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(timestamp)));
    assert.equal(input.observations[0].timestamp, timestamp, 'source evidence is not rewritten');
    assert.deepEqual(view.line[0].sourceIds, ['qa-0']);
  }));
  test(`${zone}: intraday bucketing retains absolute time, not an unzoned UTC wall clock`, () => inZone(zone, () => {
    const view = buildPersonalTerminalViewData(series([timestamp]), '1D', new Date(timestamp));
    const expected = new Date(timestamp); expected.setUTCMinutes(0, 0, 0);
    assert.equal(new Date(view.line[0].time).getTime(), expected.getTime());
  }));
  test(`${zone}: date-only axis labels do not shift to the previous day`, () => inZone(zone, () => {
    assert.equal(chart.axisLabel('en', '1M', chart.chartTime('2026-11-05')), '5 Nov');
  }));
}
test('precomputed artifact timestamps and candles remain unchanged', () => {
  const input = { ...series(['2026-11-04T17:41:00.000Z']), precomputedViews: { '1M': { startIndex: 0, endIndex: 1 } }, precomputedCandles: { '1M': [{ time: '2026-11-04T00:00:00.000Z', open: 2, high: 2, low: 2, close: 2 }] } };
  const view = buildPersonalTerminalViewData(input, '1M', new Date('2026-11-05T00:00:00Z'));
  assert.equal(view.line[0].time, input.observations[0].timestamp);
  assert.strictEqual(view.candles, input.precomputedCandles['1M']);
});
test('DST fall-back keeps the two repeated clock hours distinct', () => inZone('America/Los_Angeles', () => {
  const view = buildPersonalTerminalViewData(series(['2026-11-01T08:30:00Z', '2026-11-01T09:30:00Z']), '1D', new Date('2026-11-01T10:00:00Z'));
  assert.equal(view.line.length, 2);
  assert.equal(new Date(view.line[1].time) - new Date(view.line[0].time), 3600000);
}));
