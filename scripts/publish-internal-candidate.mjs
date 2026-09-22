import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, resolve } from 'node:path';

// Draft-only storage for the existing signed APK. Never publishes a release.
const repo = 'kyriez1013-kai/Questlife';
const metadata = JSON.parse(readFileSync('reports/release/build-output/android-candidate.json', 'utf8'));
const sourceCommit = metadata.sourceCommit;
assert.match(sourceCommit, /^[a-f0-9]{40}$/);
assert.equal(metadata.dirty, false);
assert.equal(metadata.developmentClient, false);
assert.equal(metadata.apiOrigin, 'https://questlife-v1-release.vercel.app');
const name = `questlife-v1-${sourceCommit.slice(0, 7)}-arm64.apk`;
assert.equal(basename(metadata.path), name);
assert.equal(resolve(metadata.path), resolve('reports/release/build-output', name));
const bytes = readFileSync(metadata.path);
assert.equal(bytes.length, metadata.bytes);
assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256);

const credential = spawnSync('git', ['credential', 'fill'], {
  input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8',
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
});
if (credential.status !== 0) throw new Error('Existing authorized GitHub credential unavailable');
const fields = Object.fromEntries(credential.stdout.trim().split('\n').map(line => {
  const separator = line.indexOf('=');
  return [line.slice(0, separator), line.slice(separator + 1)];
}));
if (!fields.password) throw new Error('Existing GitHub credential has no token');
const headers = { Authorization: `Bearer ${fields.password}`, Accept: 'application/vnd.github+json' };
async function api(path, body) {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method: body ? 'POST' : 'GET', headers: { ...headers, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status} ${path}`);
  return response.json();
}
const tag = `v1-internal-${sourceCommit.slice(0, 7)}`;
const releases = await api('/releases?per_page=100');
let release = releases.find(item => item.tag_name === tag);
if (!release) release = await api('/releases', {
  tag_name: tag, target_commitish: sourceCommit, name: `QuestLife V1 internal candidate ${sourceCommit.slice(0, 7)}`,
  draft: true, prerelease: true,
  body: `Internal review only. Not owner production or final product acceptance.\n\nSource: ${sourceCommit}\nAndroid: signed arm64 release with embedded Hermes, no Metro.\nCandidate Web: https://questlife-v1-release.vercel.app\nAPK SHA256: ${metadata.sha256}\n\nPending: latest native UI, recording/performance, physical Health/Calendar/notifications, email OTP/two-device UI, Apple signing and iOS build allowance.`,
});
assert.equal(release.draft, true, 'Refuse to alter a published release');
assert.equal(release.prerelease, true);
assert.equal(release.target_commitish, sourceCommit);
let asset = release.assets.find(item => item.name === name);
if (!asset) {
  const upload = new URL(release.upload_url.split('{')[0]);
  assert.equal(upload.origin, 'https://uploads.github.com');
  assert.equal(upload.pathname, `/repos/${repo}/releases/${release.id}/assets`);
  upload.searchParams.set('name', name);
  const response = await fetch(upload, { method: 'POST', headers: { ...headers,
    'Content-Type': 'application/vnd.android.package-archive' }, body: bytes, signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`Draft APK upload failed: ${response.status}`);
  asset = await response.json();
}
assert.equal(asset.state, 'uploaded');
assert.equal(asset.size, metadata.bytes);
assert.equal(asset.digest, `sha256:${metadata.sha256}`, 'GitHub asset digest must match the signed local APK');
release = await api(`/releases/${release.id}`);
assert.equal(release.draft, true);
const report = { sourceCommit, verifiedAt: new Date().toISOString(), draft: true, prerelease: true,
  releaseId: release.id, releaseUrl: release.html_url, assetId: asset.id, assetName: name,
  bytes: asset.size, sha256: metadata.sha256, requiresRepositoryWriteAccess: true,
  scope: 'Draft release only. Uploaded asset digest verified; browser download and physical install not implied.' };
writeFileSync('reports/release/internal-candidate-release.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
