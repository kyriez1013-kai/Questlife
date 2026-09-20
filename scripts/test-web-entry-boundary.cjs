const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const ts = require('typescript');

test('historical Insights fixtures are behind an asynchronous Web route boundary', () => {
  const source = ts.createSourceFile('App.web.tsx', readFileSync('App.web.tsx', 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const target = './src/v11-insights/V11InsightsScreen';
  const imports = source.statements.filter(ts.isImportDeclaration);
  assert.ok(imports.every(node => node.moduleSpecifier.text !== target));
  const loads = [];
  const walk = node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.getText(source) === 'React.lazy') {
      const argument = node.arguments[0];
      if (ts.isArrowFunction(argument) && ts.isCallExpression(argument.body)
        && argument.body.expression.kind === ts.SyntaxKind.ImportKeyword) {
        loads.push(argument.body.arguments[0].text);
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(source);
  assert.ok(loads.includes(target));
  assert.ok(loads.includes('./src/insights-v3/InsightsV3Screen'));
});
