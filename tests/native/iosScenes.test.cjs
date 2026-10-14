const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const withScenes = require('../../plugins/with-questlife-ios-scenes');

const legacy = `import Expo
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?
  func start() {
    bindReactNativeFactory(factory)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}`;

test('scene migration retains Expo factory/subscribers and moves only window startup', () => {
  const result = withScenes.migrateAppDelegate(legacy);
  assert.match(result, /bindReactNativeFactory\(factory\)/);
  assert.match(result, /return super.application\(application, didFinishLaunchingWithOptions: launchOptions\)/);
  assert.doesNotMatch(result, /UIWindow\(frame: UIScreen/);
  assert.match(result, /UIWindow\(windowScene: windowScene\)/);
  assert.equal((result.match(/factory.startReactNative/g) || []).length, 1);
  assert.equal(withScenes.migrateAppDelegate(result), result);
  assert.throws(() => withScenes.migrateAppDelegate('custom template'), /reviewed Expo SDK 54/);
});

test('scene manifest is single window and rejects unrelated existing configuration', async () => {
  const config = withScenes({ name: 'QuestLife', slug: 'questlife' });
  const run = modResults => config.mods.ios.infoPlist({ ...config, modResults,
    modRequest: { introspect: true, platform: 'ios', projectRoot: path.resolve(__dirname, '../..') } });
  const first = await run({ retained: true });
  assert.equal(first.modResults.retained, true);
  const manifest = first.modResults.UIApplicationSceneManifest;
  assert.equal(manifest.UIApplicationSupportsMultipleScenes, false);
  assert.equal(manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName,
    '$(PRODUCT_MODULE_NAME).QuestLifeSceneDelegate');
  assert.deepEqual((await run(first.modResults)).modResults, first.modResults);
  await assert.rejects(run({ UIApplicationSceneManifest: { custom: true } }), /unreviewed scene/);
});

test('cold and warm links use the existing RN and Expo delivery paths once', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../plugins/questlife-ios/QuestLifeSceneDelegate.swift'), 'utf8');
  assert.match(source, /options\[.url\] = context.url/);
  assert.match(source, /UIApplicationLaunchOptionsUserActivityKey/);
  assert.match(source, /appDelegate\?\.application\(UIApplication.shared, open: context.url, options: options\)/);
  assert.match(source, /continue: userActivity, restorationHandler/);
  assert.doesNotMatch(source, /RCTLinkingManager\.application/);
  assert.match(source, /if let existing = app.window/);
  assert.match(source, /app.sceneLaunchOptions = nil/);
  assert.doesNotMatch(source, /NotificationCenter.default.post/);
});

test('native candidate build does not inherit server credentials', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../scripts/run-ios-candidate.mjs'), 'utf8');
  assert.doesNotMatch(source, /\.\.\.process\.env/);
  assert.match(source, /const env = \{ \.\.\.hostEnv, \.\.\.config/);
  assert.match(source, /Object.keys\(config\).some\(key => !allowed.includes\(key\)\)/);
});
