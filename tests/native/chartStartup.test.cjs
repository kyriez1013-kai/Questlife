const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { insertStartup } = require('../../plugins/with-chart-webview-startup');
const source = 'override fun onCreate() {\n super.onCreate()\n ApplicationLifecycleDispatcher.onApplicationCreate(this)\n}';

test('prewarm uses the installed AndroidX asynchronous API without UI tasks or a hidden WebView', () => {
  const result = insertStartup(source);
  assert.match(result, /startUpWebView/);
  assert.match(result, /setShouldRunUiThreadStartUpTasks\(false\)/);
  assert.match(result, /Thread.MIN_PRIORITY/);
  assert.match(result, /chartExecutor.shutdown\(\)/);
  assert.doesNotMatch(result, /loadUrl|new WebView|CookieManager|https?:/);
});
test('prebuild is repeatable and does not duplicate startup', () => {
  const result = insertStartup(source);
  assert.equal(insertStartup(result), result);
  assert.throws(() => insertStartup('unexpected'), /Unsupported/);
});
test('startup is wired into the actual app config', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  assert.ok(app.plugins.includes('./plugins/with-chart-webview-startup'));
});
