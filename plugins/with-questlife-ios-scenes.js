const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const marker = '// QuestLife: single-window scene lifecycle';
const legacyWindow = `    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
`;

function migrateAppDelegate(source) {
  if (source.includes(marker)) return source;
  if (!source.includes(legacyWindow) || !source.includes('  var window: UIWindow?')) {
    throw new Error('QuestLife scene migration requires the reviewed Expo SDK 54 AppDelegate template.');
  }
  return source
    .replace('  var window: UIWindow?', '  var window: UIWindow?\n  var sceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?')
    .replace(legacyWindow, `    ${marker}\n    sceneLaunchOptions = launchOptions\n`)
    + '\n' + fs.readFileSync(path.join(__dirname, 'questlife-ios/QuestLifeSceneDelegate.swift'), 'utf8');
}

module.exports = function withQuestLifeIOSScenes(config) {
  config = withInfoPlist(config, mod => {
    const manifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'QuestLife',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).QuestLifeSceneDelegate',
        }],
      },
    };
    const existing = mod.modResults.UIApplicationSceneManifest;
    if (existing && JSON.stringify(existing) !== JSON.stringify(manifest)) {
      throw new Error('QuestLife will not replace an unreviewed scene manifest.');
    }
    mod.modResults.UIApplicationSceneManifest = manifest;
    return mod;
  });
  return withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw new Error('QuestLife scenes require Swift AppDelegate.');
    mod.modResults.contents = migrateAppDelegate(mod.modResults.contents);
    return mod;
  });
};
module.exports.migrateAppDelegate = migrateAppDelegate;
