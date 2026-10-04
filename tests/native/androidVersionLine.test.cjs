const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '../..');
const read = file => readFileSync(resolve(root, file), 'utf8');

test('cloud and local releases use the same committed package and version', () => {
  const app = JSON.parse(read('app.json')).expo;
  const eas = JSON.parse(read('eas.json'));
  assert.equal(app.android.package, 'com.kyrie.questlife');
  assert.equal(app.android.versionCode, 2);
  assert.equal(app.version, '1.0.1');
  assert.equal(eas.cli.appVersionSource, 'local');
  for (const profile of ['preview', 'production']) {
    assert.equal(eas.build[profile].credentialsSource, 'remote');
    assert.equal(eas.build[profile].autoIncrement, false);
  }
});

test('local release fails closed without the existing cloud certificate', () => {
  const script = read('scripts/build-android-candidate.mjs');
  assert.match(script, /questlife-canonical\.jks/);
  assert.match(script, /61b030724c7ef8ab94681eb42b7033631f8c2086c78a4a79166a654e93eec5da/);
  assert.match(script, /-exportcert/);
  assert.match(script, /Keystore certificate mismatch/);
  assert.doesNotMatch(script, /-genkeypair|randomBytes|questlife-internal\.jks/);
});

test('credential downloads cannot enter source control or EAS uploads', () => {
  for (const file of ['.gitignore', '.easignore']) {
    assert.match(read(file), /^\/credentials\.json$/m);
    assert.match(read(file), /^\/credentials\/$/m);
  }
});
