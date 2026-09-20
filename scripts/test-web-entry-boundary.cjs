const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync, existsSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
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

test('platform style adapters load their CSS instead of recursively importing themselves', () => {
  const adapters = readdirSync('src', { recursive: true })
    .filter(path => path.endsWith('.styles.web.ts'));
  assert.ok(adapters.length > 0);
  for (const path of adapters) {
    const file = resolve('src', path);
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const imports = source.statements.filter(ts.isImportDeclaration);
    assert.equal(imports.length, 1, file);
    const target = imports[0].moduleSpecifier.text;
    assert.ok(target.endsWith('.css'), `${file} must load CSS`);
    assert.ok(existsSync(resolve(dirname(file), target)), `${file} CSS must exist`);
    const native = file.replace('.styles.web.ts', '.styles.ts');
    const nativeSource = ts.createSourceFile(native, readFileSync(native, 'utf8'), ts.ScriptTarget.Latest, true);
    assert.equal(nativeSource.statements.filter(ts.isImportDeclaration).length, 0,
      `${native} must remain CSS-free`);
  }
});

test('interaction sheets shield background text in both themes without relying on blur', () => {
  const css = readFileSync('src/v11-stage2-rebaseline/v11-stage2-rebaseline.css', 'utf8');
  const rule = css.match(/\[data-v11-rebaseline-role="overlay"\]\s+\[data-v11-component="material-clip"\]\[data-v11-material="glass"\]\s*\{([^}]+)\}/);
  assert.ok(rule, 'shared shield must not be limited to the light theme');
  assert.match(rule[1], /background:\s*var\(--v11-rebaseline-elevated\);/,
    'opaque fallback for browsers without color-mix');
  assert.match(rule[1], /var\(--v11-rebaseline-elevated\) 98%/);
});
