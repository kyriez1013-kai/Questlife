const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, file);
const provenance = require('../../src/utils/dataProvenance.ts');
const filename = path.join(__dirname, '../../src/screens/HomeCapturePending.tsx');
const ast = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const parserExpressions = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'captureLogProvenance') {
    parserExpressions.push(node.arguments[0].properties.find(item => item.name?.getText(ast) === 'parser').initializer.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(parserExpressions.length, 2, 'both exercise and ordinary record confirmation are covered');
function confirm(expression, capture, corrections = []) {
  const parser = new Function('capture', 'captureConfirmationParser', 'entries', `return ${expression}`)(capture, provenance.captureConfirmationParser, [{ fields: {} }]);
  return provenance.buildConfirmedCaptureProvenance({ rawCaptureId: capture.id, entryIndex: 0, parser, corrections,
    fieldOrigins: { title: 'model_proposed_owner_confirmed', durationMinutes: 'model_proposed_owner_confirmed', qualityRating: 'owner_entered', 'structuredData.weight': 'owner_corrected' },
    recordedAt: '2026-11-05T00:00:00Z' });
}
test('top-level model completion without fallback entries retains its actual parser', () => {
  const parserMeta = { provider: 'deepseek', version: 'qa-completion' };
  assert.deepEqual(provenance.captureConfirmationParser({ parsed: { completionSchema: { needsCompletion: true }, parserMeta } }, false), parserMeta);
});
for (const [index, expression] of parserExpressions.entries()) {
  test(`confirmation ${index}: local fallback does not claim AI provenance`, () => {
    const result = confirm(expression, { id: 'qa-local', text: 'SQL 学习了 40 分钟', parseStatus: 'failed' });
    assert.equal(result.origin, 'OWNER_OBSERVED');
    assert.equal(result.confirmation, 'USER_CONFIRMED');
    assert.equal(result.fieldOrigins.title, 'rule_derived');
    assert.equal(result.fieldOrigins.durationMinutes, 'rule_derived');
    assert.equal(result.fieldOrigins.qualityRating, 'owner_entered');
    assert.equal(result.fieldOrigins['structuredData.weight'], 'owner_corrected');
    assert.equal(result.parser.provider, 'questlife-local');
    assert.equal(result.candidate.rawCaptureId, 'qa-local');
  });
  test(`confirmation ${index}: real parsed response retains parser and correction provenance`, () => {
    const parserMeta = { provider: 'deepseek', version: 'qa-parser' };
    const result = confirm(expression, { id: 'qa-model', parseStatus: 'done', parsed: { entries: [{ fields: {} }], parserMeta } }, [{ field: 'title', proposed: 'a', confirmed: 'b' }]);
    assert.equal(result.origin, 'OWNER_CONFIRMED_AI_PARSE');
    assert.equal(result.confirmation, 'USER_CORRECTED');
    assert.deepEqual(result.parser, parserMeta);
    assert.equal(result.fieldOrigins.durationMinutes, 'model_proposed_owner_confirmed');
  });
}
