const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('Metro security compatibility patch is idempotent', () => {
  const file = path.join(path.dirname(require.resolve('metro/package.json')), 'src/Assets.js');
  execFileSync(process.execPath, ['scripts/patch-metro-image-input.cjs']);
  const patched = fs.readFileSync(file, 'utf8');
  execFileSync(process.execPath, ['scripts/patch-metro-image-input.cjs']);
  assert.equal(fs.readFileSync(file, 'utf8'), patched);
});

for (const asset of ['icon.png', 'adaptive-icon.png', 'favicon.png', 'splash-icon.png']) {
  test(`real Metro filename exporter preserves ${asset} dimensions`, async () => {
    const absolute = path.resolve('assets', asset);
    const bytes = fs.readFileSync(absolute);
    const assetsModule = path.join(path.dirname(require.resolve('metro/package.json')), 'src/Assets.js');
    const result = await require(assetsModule).getAssetData(absolute, `assets/${asset}`, [], null, '/assets');
    assert.equal(result.width, bytes.readUInt32BE(16));
    assert.equal(result.height, bytes.readUInt32BE(20));
    assert.ok(result.hash);
  });
}
