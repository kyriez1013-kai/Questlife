import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, copyFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCandidateEnvironment, assertCandidateBundle } from './android-bundle-contract.mjs';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD');
if (git('status', '--porcelain', '--untracked-files=no')) throw new Error('Commit tracked candidate changes before the standalone build');
const apiOrigin = process.env.EXPO_PUBLIC_API_ORIGIN;
if (!apiOrigin || !/^https:\/\/[^/?#]+\/?$/.test(apiOrigin)) {
  throw new Error('Standalone candidates require EXPO_PUBLIC_API_ORIGIN pointing to the HTTPS candidate, not Metro or localhost');
}
const configuration = { apiOrigin, supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  publicKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY };
assertCandidateEnvironment(configuration);
const home = homedir();
const java = process.env.JAVA_HOME ?? join(home, 'Library/QuestLifeToolchain/jdk/Contents/Home');
const sdk = process.env.ANDROID_HOME ?? join(home, 'Library/Android/sdk');
const signingDir = join(home, 'Library/QuestLifeToolchain/signing');
const credentials = join(signingDir, 'questlife-canonical.json');
const keystore = join(signingDir, 'questlife-canonical.jks');
const certificateSha256 = '61b030724c7ef8ab94681eb42b7033631f8c2086c78a4a79166a654e93eec5da';
const config = JSON.parse(readFileSync(join(repo, 'app.json'), 'utf8')).expo;
const eas = JSON.parse(readFileSync(join(repo, 'eas.json'), 'utf8'));
if (config.android.package !== 'com.kyrie.questlife' || eas.cli.appVersionSource !== 'local') {
  throw new Error('Canonical builds require the pinned package and shared committed version source');
}
const output = join(repo, 'reports/release/build-output');
mkdirSync(signingDir, { recursive: true, mode: 0o700 });
mkdirSync(output, { recursive: true });
if (!existsSync(credentials) || !existsSync(keystore)) {
  throw new Error('Import the existing EAS GgK2fK6JvP key into private canonical storage; never generate a replacement signing key');
}
chmodSync(credentials, 0o600);
const key = JSON.parse(readFileSync(credentials, 'utf8'));
if (key.certificateSha256 !== certificateSha256 || !key.alias || !key.storePassword || !key.keyPassword) {
  throw new Error('Canonical signing credentials do not match the approved EAS certificate');
}
const env = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk,
  QUESTLIFE_RELEASE_KEYSTORE: keystore, QUESTLIFE_RELEASE_STORE_PASSWORD: key.storePassword,
  QUESTLIFE_RELEASE_KEY_ALIAS: key.alias, QUESTLIFE_RELEASE_KEY_PASSWORD: key.keyPassword };
function run(cmd, args, cwd = repo) {
  const result = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${cmd} failed (${result.status})`);
}
const certificate = execFileSync(join(java, 'bin/keytool'), ['-exportcert', '-keystore', keystore,
  '-alias', key.alias, '-storepass:env', 'QUESTLIFE_RELEASE_STORE_PASSWORD'], { env });
if (createHash('sha256').update(certificate).digest('hex') !== certificateSha256) {
  throw new Error('Keystore certificate mismatch; refusing an incompatible APK');
}
run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install']);
// Gradle does not fingerprint public environment values. Rebuild this asset
// even when the previous native assembly's Java/Kotlin inputs are unchanged.
run('./gradlew', [':app:createBundleReleaseJsAndAssets', '--rerun-tasks', '--console=plain', '--max-workers=4'], join(repo, 'android'));
run('./gradlew', [':app:assembleRelease', '-PreactNativeArchitectures=arm64-v8a', '--console=plain', '--max-workers=4'], join(repo, 'android'));
const apk = join(repo, 'android/app/build/outputs/apk/release/app-release.apk');
const bundle = execFileSync('unzip', ['-p', apk, 'assets/index.android.bundle'], { maxBuffer: 32 * 1024 * 1024 });
assertCandidateBundle(bundle, configuration);
if (git('rev-parse', 'HEAD') !== sourceCommit || git('status', '--porcelain', '--untracked-files=no')) {
  throw new Error('Candidate source changed during build; do not label this APK as the new commit');
}
const commit = sourceCommit.slice(0, 7);
const destination = join(output, `questlife-v1-${commit}-canonical-arm64.apk`);
copyFileSync(apk, destination);
const bytes = readFileSync(destination);
const metadata = { path: destination, sourceCommit, dirty: false,
  sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
  architecture: 'arm64-v8a', developmentClient: false, signing: 'canonical EAS GgK2fK6JvP',
  certificateSha256, applicationId: config.android.package, versionCode: config.android.versionCode,
  versionName: config.version, generatedAt: new Date().toISOString() };
metadata.apiOrigin = apiOrigin;
metadata.accountConfigured = true;
metadata.packagedConfigurationVerified = true;
metadata.hermesSha256 = createHash('sha256').update(bundle).digest('hex');
writeFileSync(join(output, 'android-candidate.json'), JSON.stringify(metadata, null, 2));
console.log(JSON.stringify(metadata, null, 2));
