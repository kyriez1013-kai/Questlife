const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');

const root = path.resolve(__dirname, '../..');
const translations = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/i18n.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: translations });
const { t } = translations;
const source = ts.createSourceFile('HomeSmartCapture.tsx', fs.readFileSync(path.join(root, 'src/screens/HomeSmartCapture.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const card = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'CaptureCard');
const js = ts.transpileModule(card.getText(source), {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;
function render(lang, failure, v11 = true) {
  const retried = [];
  const context = {
    React, View: 'View', Text: 'Text', WebView: 'View', TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator', QuestCard: 'Card', V11InlineButton: 'Button',
    styles: {}, isV11TodayEnabled: () => v11, getV11ThemeTokens: () => ({}),
    insightBorderColor: () => '', t,
  };
  const component = new Function(...Object.keys(context), `${js}; return CaptureCard;`)(...Object.values(context));
  return { retried, element: component({
    lang, failure, expanded: true,
    capture: { id: 'isolated-confirmed', createdAt: '2026-11-05T03:00:00Z', text: 'SQL 24 minutes', parseStatus: 'failed', parsed: { entriesDismissed: true } },
    questTheme: { id: 'deepWork', colors: {}, typography: {}, spacing: {} },
    onDelete() {}, onRetry: id => retried.push(id),
  }) };
}
function all(element) {
  if (!React.isValidElement(element)) return [];
  return [element, ...React.Children.toArray(element.props.children).flatMap(all)];
}
function text(element) {
  return React.Children.toArray(element.props?.children).map(child => React.isValidElement(child) ? text(child) : String(child)).join(' ');
}

for (const lang of ['zh', 'en']) {
  test(`saved result confirms recording without claiming a new progress signal (${lang})`, () => {
    assert.doesNotMatch(t(lang, 'savedFeedbackTitle'), /progress|signal|进步|线索/i);
    assert.match(t(lang, 'savedFeedbackTitle'), /saved|保存/i);
  });
  for (const failure of ['service_unavailable', 'ai_disabled', 'ai_rate_limited']) {
    test(`confirmed result does not invite duplicate manual confirmation after ${failure} (${lang})`, () => {
      const rendered = render(lang, failure);
      const content = text(rendered.element);
      assert.doesNotMatch(content, /confirm a manual record|确认手动记录/i);
      assert.match(content, /AI/);
    });
  }
  for (const v11 of [true, false]) test(`parse retry is distinguishable from save retry and keeps the exact callback (${lang}, V11=${v11})`, () => {
    const rendered = render(lang, 'service_unavailable', v11);
    const button = all(rendered.element).find(node => v11 ? node.type === 'Button' && /重试|Retry/.test(node.props.label) : node.type === 'TouchableOpacity' && /重试|Retry/.test(text(node)));
    assert.ok(button);
    assert.match(v11 ? button.props.label : text(button), /解析|parsing/i);
    button.props.onPress();
    assert.deepEqual(rendered.retried, ['isolated-confirmed']);
  });
  test(`authorization and input failure reasons remain distinct (${lang})`, () => {
    assert.match(text(render(lang, 'authentication_required').element), /sign in|登录/i);
    assert.match(text(render(lang, 'account_changed').element), /account|账号/i);
    assert.match(text(render(lang, 'request_too_large').element), /limit|上限/i);
  });
}
