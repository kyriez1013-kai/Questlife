import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apiOrigin = process.env.EXPO_PUBLIC_API_ORIGIN;
if (!apiOrigin || !/^https:\/\/[^/?#]+\/?$/.test(apiOrigin)) {
  throw new Error('Standalone candidates require EXPO_PUBLIC_API_ORIGIN pointing to the HTTPS candidate, not Metro or localhost');
}
const home = homedir();
const java = process.env.JAVA_HOME ?? join(home, 'Library/QuestLifeToolchain/jdk/Contents/Home');
const sdk = process.env.ANDROID_HOME ?? join(home, 'Library/Android/sdk');
const signingDir = join(home, 'Library/QuestLifeToolchain/signing');
const credentials = join(signingDir, 'questlife-internal.json');
const keystore = join(signingDir, 'questlife-internal.jks');
const output = join(repo, 'reports/release/build-output');
mkdirSync(signingDir, { recursive: true, mode: 0o700 });
mkdirSync(output, { recursive: true });
if (!existsSync(credentials)) {
  if (existsSync(keystore)) throw new Error('Existing keystore without credentials; do not overwrite');
  const password = randomBytes(32).toString('base64url');
  writeFileSync(credentials, JSON.stringify({ alias: 'questlife-internal', password }), { mode: 0o600, flag: 'wx' });
}
chmodSync(credentials, 0o600);
const key = JSON.parse(readFileSync(credentials, 'utf8'));
const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
  QUESTLIFE_RELEASE_KEYSTORE: keystore, QUESTLIFE_RELEASE_STORE_PASSWORD: key.password,
  QUESTLIFE_RELEASE_KEY_ALIAS: key.alias, QUESTLIFE_RELEASE_KEY_PASSWORD: key.password };
function run(cmd, args, cwd = repo) {
  const result = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${cmd} failed (${result.status})`);
}
if (!existsSync(keystore)) {
  run(join(java, 'bin/keytool'), ['-genkeypair', '-keystore', keystore, '-alias', key.alias,
    '-storepass:env', 'QUESTLIFE_RELEASE_STORE_PASSWORD', '-keypass:env', 'QUESTLIFE_RELEASE_KEY_PASSWORD',
    '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', 'CN=QuestLife Internal, O=QuestLife', '-noprompt']);
  chmodSync(keystore, 0o600);
}
run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install']);
run('./gradlew', [':app:assembleRelease', '-PreactNativeArchitectures=arm64-v8a', '--console=plain', '--max-workers=4'], join(repo, 'android'));
const apk = join(repo, 'android/app/build/outputs/apk/release/app-release.apk');
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const destination = join(output, `questlife-v1-${commit}-arm64.apk`);
copyFileSync(apk, destination);
const bytes = readFileSync(destination);
const metadata = { path: destination, sourceCommit: commit, dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).trim()),
  sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
  architecture: 'arm64-v8a', developmentClient: false, signing: 'dedicated local internal key', generatedAt: new Date().toISOString() };
metadata.apiOrigin = apiOrigin;
metadata.accountConfigured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
writeFileSync(join(output, 'android-candidate.json'), JSON.stringify(metadata, null, 2));
console.log(JSON.stringify(metadata, null, 2));
