const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const { mkdir, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

// Device identity, source permissions and the WAL must not be cloned by OS
// backup. Recovery is through account sync or the explicit record-only backup.
const domains = ['root', 'file', 'database', 'sharedpref', 'external',
  'device_root', 'device_file', 'device_database', 'device_sharedpref'];
const exclusions = domains.map(domain => `    <exclude domain="${domain}" path="." />`).join('\n');
const rules = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
${exclusions}
  </cloud-backup>
  <device-transfer>
${exclusions}
  </device-transfer>
</data-extraction-rules>
`;

module.exports = function withPrivateDeviceBackup(config) {
  config = withAndroidManifest(config, current => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(current.modResults);
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = 'false';
    app.$['android:dataExtractionRules'] = '@xml/questlife_private_data_rules';
    return current;
  });
  return withDangerousMod(config, ['android', async current => {
    const directory = join(current.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'questlife_private_data_rules.xml'), rules);
    return current;
  }]);
};
