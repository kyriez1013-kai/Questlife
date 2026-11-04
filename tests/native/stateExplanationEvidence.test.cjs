const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const { classifyState } = require('../../src/state-layer/classifyState.ts');
const { reasonLine, baselineLine } = require('../../src/state-layer/explain.ts');
for (const lang of ['zh', 'en']) test(`${lang}: first state cannot claim a personal normal range`, () => {
  const signals = { timeBlock: 'afternoon', missing: ['sleep', 'resting_hr', 'hrv', 'training', 'schedule_load'] };
  const classification = classifyState({ energy: 3, tension: 2, signals, history: [] });
  assert.equal(classification.baseline, 'scale_midpoint');
  assert.equal(classification.ruleId, 'unclear.in_range');
  const text = reasonLine({ energy: 3, tension: 2, signals, classification }, lang);
  assert.doesNotMatch(text, /你的常态|your usual range/);
  assert.match(text, /说不准|unclear/);
  assert.match(baselineLine(classification, lang), /还没有你的基线|No baseline of yours yet/);
});
test('measured sleep with a supported personal baseline still exposes its comparison', () => {
  const signals = { timeBlock: 'afternoon', missing: [], sleep: { recentAvgMin: 460, nights: 2, low: false, basis: 'personal', baselineMedianMin: 480 } };
  const classification = classifyState({ energy: 3, tension: 2, signals, history: [] });
  assert.match(reasonLine({ energy: 3, tension: 2, signals, classification }, 'zh'), /7.7 小时，在你的常态范围内/);
});
