const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');

const filename = path.join(__dirname, '../../src/screens/HomeSmartCapture.tsx');
const parsed = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let renderSource, historySource;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === 'renderCapture') renderSource = node.initializer.getText(parsed);
  if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(parsed) === 'ActivityHistorySheet') {
    historySource = node.attributes.properties.find(prop => prop.name?.getText(parsed) === 'renderCapture').initializer.expression.getText(parsed);
  }
  ts.forEachChild(node, visit);
}
visit(parsed);
const load = file => {
  const exported = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: exported, require: specifier => load(path.resolve(path.dirname(file), `${specifier}.ts`)),
  });
  return exported;
};
const { buildFallbackEntriesFromRawText } = load(path.join(__dirname, '../../src/utils/captureCompletion.ts'));
function bind(source, context) {
  const js = ts.transpileModule(`const callback = ${source};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText;
  return new Function(...Object.keys(context), `${js}; return callback;`)(...Object.values(context));
}
function renderers(executionLogs) {
  const renderCapture = bind(renderSource, {
    React, View: 'View', CaptureCard: 'CaptureCard', HomeCapturePending: 'CaptureFeedback',
    data: { executionLogs }, lang: 'en', questTheme: {}, parseFailures: {}, buildFallbackEntriesFromRawText,
    onOpenState() {}, handleRetry() {}, handleDelete() {},
    recordCaptureFriction() { throw Error('read must not mutate friction'); },
    updateRawCapture() { throw Error('read must not mutate capture'); },
  });
  return { recent: capture => renderCapture(capture, true), history: bind(historySource, { renderCapture }) };
}
const capture = id => ({ id, text: 'SQL 24 minutes', parseStatus: 'failed', parsed: { entriesDismissed: true } });
const log = id => ({ id: `log-${id}`, structuredData: { sourceCaptureId: id, afterStateDelta: { energy: 'up', focus: 'down', mood: 'same', skipped: false } } });
function feedback(element) { return React.Children.toArray(element.props.children).find(child => child.type === 'CaptureFeedback'); }

for (const id of ['first', 'middle', 'last']) test(`history reopens completed ${id} feedback by its exact saved lineage, even after reorder`, () => {
  const captures = ['first', 'middle', 'last'].map(capture);
  const records = ['first', 'middle', 'last'].map(log);
  for (const order of [captures, [capture('new'), ...captures.slice().reverse()]]) {
    const target = order.find(item => item.id === id);
    const panel = feedback(renderers(records).history(target));
    assert.ok(panel, 'a completed result remains accessible from Activity History');
    assert.equal(panel.props.captureId, id);
  }
});

test('Done still collapses the recent prompt without suppressing history access', () => {
  const views = renderers([log('saved')]);
  assert.equal(feedback(views.recent(capture('saved'))), undefined);
  assert.equal(feedback(views.history(capture('saved')))?.props.captureId, 'saved');
});

test('ignored or deleted captures cannot borrow another execution or reopen a confirmation', () => {
  const views = renderers([log('other'), log('prefix-target-suffix')]);
  assert.equal(feedback(views.history(capture('target'))), undefined);
  assert.equal(feedback(renderers([]).history(capture('deleted'))), undefined);
});

test('ordinary unconfirmed capture remains confirmable and saved history survives parser retry', () => {
  const pending = { ...capture('new'), parsed: undefined };
  assert.equal(feedback(renderers([]).recent(pending))?.props.captureId, 'new');
  const retrying = { ...capture('saved'), parseStatus: 'pending' };
  assert.equal(feedback(renderers([log('saved')]).history(retrying))?.props.captureId, 'saved');
});
