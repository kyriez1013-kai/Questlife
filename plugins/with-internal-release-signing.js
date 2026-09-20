const { withAppBuildGradle } = require('@expo/config-plugins');

const marker = '// QuestLife internal candidate signing';
module.exports = function withInternalReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes(marker)) return mod;
    if (mod.modResults.language !== 'groovy') throw new Error('Unsupported Android build file');
    // Generated native folders remain disposable. No keystore or password enters source control.
    mod.modResults.contents += `
${marker}
if (System.getenv("QUESTLIFE_RELEASE_KEYSTORE")) {
    android.signingConfigs.create("questlifeInternal") {
        storeFile file(System.getenv("QUESTLIFE_RELEASE_KEYSTORE"))
        storePassword System.getenv("QUESTLIFE_RELEASE_STORE_PASSWORD")
        keyAlias System.getenv("QUESTLIFE_RELEASE_KEY_ALIAS")
        keyPassword System.getenv("QUESTLIFE_RELEASE_KEY_PASSWORD")
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.questlifeInternal
}
`;
    return mod;
  });
};
