const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { withPlugins } = require('@expo/config-plugins');
const withEntries = require('../../plugins/with-questlife-ios-entries');

const root = path.resolve(__dirname, '../..');
function configFor(options) {
  return withPlugins({
    name: 'QuestLife', slug: 'questlife', scheme: 'questlife',
    _internal: { projectRoot: root },
    ios: { bundleIdentifier: 'com.example.questlife' },
    extra: { retained: 'fixture' },
  }, [
    ['expo-notifications', { enableBackgroundRemoteNotifications: true }],
    ['@kingstinct/react-native-healthkit', {
      background: false, NSHealthUpdateUsageDescription: false,
      NSHealthShareUsageDescription: 'Read selected health observations.',
    }],
    ['expo-calendar', { calendarPermission: 'Read and edit selected calendar events.' }],
    [withEntries, options],
  ]);
}
async function runMod(config, mod, modResults) {
  return config.mods.ios[mod]({
    ...config, modResults,
    modRequest: { projectRoot: root, platformProjectRoot: path.join(root, 'ios'), platform: 'ios', introspect: true },
  });
}

test('Personal Team removes APNs added by the real Expo plugin but retains HealthKit', async () => {
  const config = configFor();
  const result = await runMod(config, 'entitlements', { 'aps-environment': 'production', retained: true });
  assert.equal(result.modResults['aps-environment'], undefined);
  assert.equal(result.modResults['com.apple.developer.healthkit'], true);
  assert.equal(result.modResults['com.apple.developer.healthkit.background-delivery'], undefined);
  assert.equal(result.modResults.retained, true);
  assert.deepEqual(result.ios.entitlements, result.modResults);
  assert.equal(result.extra.questlifeIOSRemoteNotificationsEnabled, false);
  assert.equal(result.extra.retained, 'fixture');
  assert.deepEqual(result.extra.eas.build.experimental.ios.appExtensions, [{
    targetName: 'QuestLifeWidgets', bundleIdentifier: 'com.example.questlife.widgets', entitlements: {},
  }]);
  const repeat = await runMod(configFor(), 'entitlements', result.modResults);
  assert.deepEqual(repeat.modResults, result.modResults);
});

test('local mode strips only remote background delivery and preserves calendar/health privacy keys', async () => {
  const result = await runMod(configFor(), 'infoPlist', { UIBackgroundModes: ['fetch', 'remote-notification'] });
  assert.deepEqual(result.modResults.UIBackgroundModes, ['fetch']);
  assert.equal(result.modResults.NSHealthShareUsageDescription, 'Read selected health observations.');
  assert.equal(result.modResults.NSHealthUpdateUsageDescription, undefined);
  for (const key of ['NSCalendarsUsageDescription', 'NSCalendarsFullAccessUsageDescription']) {
    assert.equal(result.modResults[key], 'Read and edit selected calendar events.');
  }
  assert.deepEqual(result.ios.infoPlist, result.modResults);
});

test('paid remote push remains an explicit opt-in, not a claim of signing eligibility', async () => {
  const config = configFor({ enableRemoteNotifications: true });
  const entitlements = await runMod(config, 'entitlements', {});
  assert.equal(entitlements.modResults['aps-environment'], 'development');
  assert.equal(entitlements.modResults['com.apple.developer.healthkit'], true);
  assert.equal(entitlements.extra.questlifeIOSRemoteNotificationsEnabled, true);
  const info = await runMod(config, 'infoPlist', {});
  assert.deepEqual(info.modResults.UIBackgroundModes, ['remote-notification']);
});

test('mistyped notification configuration fails closed', () => {
  assert.throws(() => configFor({ enableRemoteNotifications: 'false' }), /must be a boolean/);
});

test('Podfile aligns resource bundle deployment targets without lowering newer targets', async () => {
  const input = { language: 'ruby', contents: 'target do\n  post_install do |installer|\n    react_native_post_install(installer)\n  end\nend\n' };
  const result = await runMod(configFor(), 'podfile', input);
  assert.match(result.modResults.contents, /installer\.pods_project\.targets\.each/);
  assert.match(result.modResults.contents, /Gem::Version\.new\(current\.to_s\) < minimum_ios/);
  assert.match(result.modResults.contents, /ios.deploymentTarget.*15\.1/);
  const repeated = await runMod(configFor(), 'podfile', { ...result.modResults });
  assert.equal(repeated.modResults.contents, result.modResults.contents);
  await assert.rejects(runMod(configFor(), 'podfile', { language: 'ruby', contents: 'unknown template' }), /post_install hook/);
});

function loadDriver({ remote, granted = true, iosStatus = 2 } = {}) {
  const calls = [];
  const permission = { granted, status: granted ? 'granted' : 'undetermined', ios: { status: iosStatus } };
  const notifications = {
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
    setNotificationHandler() {},
    async getPermissionsAsync() { calls.push('read-permission'); return permission; },
    async requestPermissionsAsync() { calls.push('request-permission'); return permission; },
    async getExpoPushTokenAsync() { calls.push('remote-token'); return { data: 'test-token' }; },
    async setNotificationCategoryAsync(id, actions) { calls.push({ category: id, actions }); },
    async scheduleNotificationAsync(request) { calls.push(request); return request.identifier; },
  };
  const exports = {};
  const file = path.join(root, 'src/platform/notifications/NotificationDriver.native.ts');
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, { exports, require(name) {
    if (name === 'expo-notifications') return notifications;
    if (name === 'expo-constants') return { expoConfig: { extra: { questlifeIOSRemoteNotificationsEnabled: remote } } };
    if (name === 'react-native') return { Platform: { OS: 'ios' } };
    if (name === './NotificationService') return {};
    if (name === '../nativeI18n') return { nativeCopy: (_lang, key) => key };
    throw Error(`Unexpected dependency: ${name}`);
  } }, { filename: file });
  return { driver: exports.createNotificationDriver('en'), calls };
}

for (const remote of [false, undefined, 'true']) test(`iOS local mode (${remote}) never requests an APNs/Expo token`, async () => {
  const { driver, calls } = loadDriver({ remote });
  assert.equal(await driver.token('fixture-project'), null);
  assert.deepEqual(calls, []);
});

test('local reminders still request permission, register actions, and schedule without push registration', async () => {
  const { driver, calls } = loadDriver({ remote: false });
  assert.equal(await driver.permission(true), 'granted');
  assert.equal(await driver.schedule({
    id: 'questlife:fixture', kind: 'accepted_block', entityId: 'fixture', at: '2030-01-01T08:00:00Z',
  }), 'questlife:fixture');
  assert.equal(calls[0], 'request-permission');
  assert.equal(calls[1].category, 'questlife-block');
  assert.deepEqual(Array.from(calls[1].actions, item => item.identifier), ['START', 'DONE', 'SNOOZE', 'SKIP']);
  assert.equal(calls[2].content.categoryIdentifier, 'questlife-block');
  assert.equal(calls[2].trigger.date.toISOString(), '2030-01-01T08:00:00.000Z');
  assert.ok(!calls.includes('remote-token'));
});

test('iOS provisional permission allows quiet delivery without re-prompting', async () => {
  const { driver, calls } = loadDriver({ granted: false, iosStatus: 3 });
  assert.equal(await driver.permission(false), 'granted');
  assert.deepEqual(calls, ['read-permission']);
});

test('undetermined permission is not treated as authorization', async () => {
  const { driver } = loadDriver({ granted: false, iosStatus: 0 });
  assert.equal(await driver.permission(false), 'not_requested');
});

test('remote-enabled builds still require notification permission', async () => {
  const allowed = loadDriver({ remote: true });
  assert.equal(await allowed.driver.token('fixture-project'), 'test-token');
  assert.deepEqual(allowed.calls, ['read-permission', 'remote-token']);
  const denied = loadDriver({ remote: true, granted: false, iosStatus: 1 });
  assert.equal(await denied.driver.token('fixture-project'), null);
  assert.ok(!denied.calls.includes('remote-token'));
});
