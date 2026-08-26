import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const readText = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(readText(relativePath));

function pngDimensions(relativePath) {
  const buffer = fs.readFileSync(path.join(projectRoot, relativePath));
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${relativePath} must be PNG`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const manifest = readJson('dist/manifest.webmanifest');
assert.equal(manifest.name, 'QuestLife');
assert.equal(manifest.short_name, 'QuestLife');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.prefer_related_applications, false);

const requiredIcons = [
  ['dist/icons/questlife-192.png', 192],
  ['dist/icons/questlife-512.png', 512],
  ['dist/icons/questlife-maskable-512.png', 512],
  ['dist/icons/apple-touch-icon.png', 180],
  ['dist/icons/favicon-32.png', 32],
];
for (const [relativePath, size] of requiredIcons) {
  assert.deepEqual(pngDimensions(relativePath), { width: size, height: size }, `${relativePath} dimensions`);
}

const maskable = manifest.icons.find((icon) => icon.purpose === 'maskable');
assert.equal(maskable?.src, '/icons/questlife-maskable-512.png');
assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192' && icon.purpose === 'any'));
assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any'));

const html = readText('dist/index.html');
assert.match(html, /name="viewport" content="[^"]*viewport-fit=cover/);
assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
assert.match(html, /name="apple-mobile-web-app-title" content="QuestLife"/);
assert.match(html, /rel="apple-touch-icon" sizes="180x180"/);
assert.match(html, /\/_expo\/static\/js\/web\/index-[a-f0-9]+\.js/);

const appConfig = readJson('app.json').expo;
assert.equal(appConfig.web.output, 'single');
assert.equal(appConfig.web.display, 'standalone');
assert.equal(appConfig.web.startUrl, '/');
assert.equal(appConfig.web.scope, '/');

const vercel = readJson('vercel.json');
assert.ok(vercel.rewrites.some((rewrite) => rewrite.source === '/(.*)' && rewrite.destination === '/index.html'));
assert.ok(vercel.headers.some((header) => header.source === '/manifest.webmanifest'));

console.log(`Mobile shell validation passed: manifest, ${requiredIcons.length} icons, iOS metadata, viewport, Expo SPA, and Vercel fallback`);
