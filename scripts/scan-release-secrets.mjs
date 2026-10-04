import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const privateRoot = join(homedir(), 'Library/QuestLifeToolchain');
const prohibited = path => path === 'QUESTLIFE_QUANT_UI_CONTRACT.md' || path.startsWith('docs/quant/');
const values = new Map();
function secret(label, value) {
  if (typeof value === 'string' && value.length >= 8) values.set(label, Buffer.from(value));
}
const admin = JSON.parse(readFileSync(join(privateRoot, 'secrets/supabase-candidate-admin.json'), 'utf8'));
assert.equal(admin.url, 'https://gttcoocfkqwvsqfwxpyo.supabase.co');
secret('candidate_server_key', admin.key);
const signing = JSON.parse(readFileSync(join(privateRoot, 'signing/questlife-canonical.json'), 'utf8'));
for (const [name, value] of Object.entries(signing)) if (/password/i.test(name)) secret(`signing_${name}`, value);
for (const file of ['app-preview.env', 'candidate-native.env', 'candidate-deployment.env']) {
  const path = join(privateRoot, 'secrets', file);
  if (!existsSync(path)) continue;
  const env = require('dotenv').parse(readFileSync(path));
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('EXPO_PUBLIC_') && /KEY|SECRET|TOKEN|PASSWORD/.test(name) && !/ANON|PUBLISHABLE/.test(name)) secret(`${file}:${name}`, value);
  }
}
secret('quant_service_token', readFileSync(join(privateRoot, 'secrets/quant-v1-token'), 'utf8').trim());
const failures = [], counts = { trackedFiles: 0, historyBytes: 0, webFiles: 0, apkEntries: 0, iosFiles: 0 };
function inspect(label, bytes) {
  for (const [name, value] of values) if (bytes.includes(value)) failures.push({ location: label, credentialClass: name });
}
const tracked = execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter(path => path && !prohibited(path));
for (const path of tracked) {
  if (!existsSync(path)) continue;
  inspect(path, readFileSync(path)); counts.trackedFiles++;
  if (/\.(?:jks|keystore|p12|mobileprovision)$|(?:^|\/)\.env(?:\.|$)/i.test(path) && !/example|sample|template/i.test(path)) {
    failures.push({ location: path, credentialClass: 'tracked_credential_file' });
  }
}
const history = execFileSync('git', ['log', '--all', '-p', '--format=commit:%H', '--', '.',
  ':(exclude)docs/quant/**', ':(exclude)QUESTLIFE_QUANT_UI_CONTRACT.md'], { maxBuffer: 200 * 1024 * 1024 });
inspect('all_reachable_history_excluding_restricted_documents', history); counts.historyBytes = history.length;
function directory(path, count) {
  if (!existsSync(path)) return;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) directory(file, count);
    else if (entry.isFile()) { inspect(file, readFileSync(file)); counts[count]++; }
  }
}
directory('dist', 'webFiles');
const apk = process.argv[2];
if (apk) {
  assert.ok(apk.startsWith('reports/release/build-output/questlife-v1-'));
  const entries = execFileSync('unzip', ['-Z1', apk]).toString().trim().split('\n');
  for (const entry of entries) if (/^(assets\/|classes.*\.dex$|AndroidManifest.xml$|res\/raw\/)/.test(entry)) {
    inspect(`${apk}!${entry}`, execFileSync('unzip', ['-p', apk, entry], { maxBuffer: 100 * 1024 * 1024 })); counts.apkEntries++;
  }
}
directory('reports/release/build-output/ios-simulator-ecf37b9/QuestLife.app', 'iosFiles');
mkdirSync('reports/release', { recursive: true });
const report = {
  checkedAt: new Date().toISOString(), sourceCommit: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
  scope: 'Exact locally authorized private credential values, tracked sensitive file names, reachable history, current Web and specified existing native artifacts. Restricted quant docs never read. Not a full penetration test or unknown-secret detection.',
  counts, privateCredentialClassesChecked: values.size, failures,
};
writeFileSync('reports/release/client-secret-exposure.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
