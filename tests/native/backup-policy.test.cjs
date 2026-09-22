const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp, rm, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { parseXMLAsync } = require('@expo/config-plugins/build/utils/XML');
const plugin = require('../../plugins/with-private-device-backup');
const appConfig = require('../../app.json').expo;

test('app opts out of automatic backup and delegates explicit rules to one plugin', () => {
  assert.equal(appConfig.android.allowBackup, false);
  assert.deepEqual(appConfig.plugins.find(p => Array.isArray(p) && p[0] === 'expo-secure-store'),
    ['expo-secure-store', { configureAndroidBackup: false }]);
  assert.equal(appConfig.plugins.filter(p => p === './plugins/with-private-device-backup').length, 1);
});

test('release blocks unused overlay and broad storage access without blocking sources', () => {
  const blocked = appConfig.android.blockedPermissions;
  assert.deepEqual(blocked, [
    'android.permission.SYSTEM_ALERT_WINDOW',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
  ]);
  for (const permission of appConfig.android.permissions) {
    assert.ok(!blocked.includes(permission), `${permission} must remain requestable`);
  }
  assert.ok(!blocked.includes('android.permission.POST_NOTIFICATIONS'));
});

test('manifest backup guard is idempotent without changing activities or permissions', async () => {
  const config = plugin({ name:'QuestLife', slug:'QuestLife' });
  const manifest = {manifest:{$:{'xmlns:android':'http://schemas.android.com/apk/res/android'},
    'uses-permission':[{$:{'android:name':'android.permission.INTERNET'}}],
    application:[{$:{'android:name':'.MainApplication','android:allowBackup':'true'},activity:[{$:{'android:name':'.MainActivity'}}]}]}};
  const request = { platform:'android', projectRoot:tmpdir(), platformProjectRoot:tmpdir() };
  const apply = value => config.mods.android.manifest({...config,modResults:value,modRequest:request});
  const once = (await apply(structuredClone(manifest))).modResults;
  const twice = (await apply(structuredClone(once))).modResults;
  assert.deepEqual(once, twice);
  const attributes = twice.manifest.application[0].$;
  assert.equal(attributes['android:allowBackup'],'false');
  assert.equal(attributes['android:fullBackupContent'],'false');
  assert.equal(attributes['android:dataExtractionRules'],'@xml/questlife_private_data_rules');
  assert.deepEqual(twice.manifest.application[0].activity,manifest.manifest.application[0].activity);
  assert.deepEqual(twice.manifest['uses-permission'],manifest.manifest['uses-permission']);
});

test('generated Android 12 rules exclude every private domain for cloud and device transfer', async () => {
  const root = await mkdtemp(join(tmpdir(),'questlife-private-backup-'));
  try {
    const config = plugin({name:'QuestLife',slug:'QuestLife'});
    const run = () => config.mods.android.dangerous({...config,modResults:{},modRequest:{platform:'android',projectRoot:root,platformProjectRoot:root}});
    await run();
    const path = join(root,'app/src/main/res/xml/questlife_private_data_rules.xml');
    const first = await readFile(path,'utf8'); await run(); assert.equal(await readFile(path,'utf8'),first);
    const parsed = await parseXMLAsync(first);
    for(const type of ['cloud-backup','device-transfer']) {
      const group = parsed['data-extraction-rules'][type][0];
      assert.equal(group.include,undefined);
      assert.deepEqual(group.exclude.map(e=>e.$.domain).sort(),['root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref'].sort());
      assert.ok(group.exclude.every(e=>e.$.path==='.'));
    }
  } finally { await rm(root,{recursive:true,force:true}); }
});
