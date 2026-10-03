const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(platform, failure = false) {
  const calls = [];
  const exports = {};
  const file = 'src/platform/health/openHealthPermissions.native.ts';
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react-native') return { Platform: { OS: platform }, Linking: { openSettings: async () => {
      calls.push('app-settings'); if (failure) throw Error('settings-unavailable');
    } } };
    assert.equal(name, 'react-native-health-connect');
    return { openHealthConnectSettings() { calls.push('health-connect'); if (failure) throw Error('settings-unavailable'); } };
  } }, { filename: file });
  return { ...exports, calls };
}

test('Android opens Health Connect rather than unrelated app settings', async () => {
  const module = load('android'); await module.openHealthPermissions();
  assert.deepEqual(module.calls, ['health-connect']);
});
test('iOS opens app settings without loading Android SDK or requesting HealthKit access', async () => {
  const module = load('ios'); await module.openHealthPermissions();
  assert.deepEqual(module.calls, ['app-settings']);
});
test('unavailable platform rejects without opening any settings', async () => {
  const module = load('web'); await assert.rejects(module.openHealthPermissions(), /health_settings_unavailable/);
  assert.deepEqual(module.calls, []);
});
test('native settings failures propagate to the existing retry UI', async () => {
  for (const platform of ['android', 'ios']) await assert.rejects(load(platform, true).openHealthPermissions(), /settings-unavailable/);
});
