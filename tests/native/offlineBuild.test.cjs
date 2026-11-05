const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { prepareOfflineShell } = require('../../scripts/prepare-offline-shell.cjs');

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'questlife-offline-build-test-'));
  const asset = '/_expo/static/js/web/index-test.js';
  const css = '/_expo/static/css/screen-test.css';
  for (const name of [asset, css]) { fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true }); fs.writeFileSync(path.join(root, name), 'TEST'); }
  const html = `<html><link rel="stylesheet" href="${css}"><link rel="preload" href="${css}" as="style"><script src="${asset}" defer></script><script src="https://external.test/private.js"></script><link rel="stylesheet" href="/api/private.css"></html>`;
  fs.writeFileSync(path.join(root, 'index.html'), html);
  try { run({ root, asset, css, html }); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('export prepares only referenced public entry assets, deduplicated and versioned', () => fixture(({ root, asset, css, html }) => {
  const first = prepareOfflineShell(root), self = { addEventListener() {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), { self });
  assert.deepEqual([...self.__QUESTLIFE_ENTRY_ASSETS__], [css, asset]);
  assert.equal(self.__QUESTLIFE_CACHE_VERSION__, `questlife-shell-${first.version}`);
  assert.equal(prepareOfflineShell(root).version, first.version);
  fs.writeFileSync(path.join(root, 'index.html'), html.replace('index-test.js', 'index-next.js'));
  fs.writeFileSync(path.join(root, asset.replace('test', 'next')), 'NEXT TEST');
  assert.notEqual(prepareOfflineShell(root).version, first.version);
}));

test('missing entry assets and missing entry script fail the build rather than claim offline support', () => fixture(({ root, asset }) => {
  fs.unlinkSync(path.join(root, asset));
  assert.throws(() => prepareOfflineShell(root), /ENOENT/);
  fs.writeFileSync(path.join(root, 'index.html'), '<html>NO ENTRY</html>');
  assert.throws(() => prepareOfflineShell(root), /entry scripts not found/);
}));

test('precache generator rejects symlinks outside its export boundary', () => fixture(({ root, asset }) => {
  fs.unlinkSync(path.join(root, asset));
  fs.symlinkSync(__filename, path.join(root, asset));
  assert.throws(() => prepareOfflineShell(root), /inside the export directory/);
}));

test('local and Vercel builds both execute the offline preparation step', () => {
  assert.match(require('../../package.json').scripts.build, /prepare-offline-shell\.cjs/);
  assert.equal(require('../../vercel.json').buildCommand, 'npm run build');
});
