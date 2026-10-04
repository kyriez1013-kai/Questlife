import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertCandidateBundle, assertCandidateEnvironment, candidateOrigin, candidateSupabaseUrl } from '../../scripts/android-bundle-contract.mjs';

const configuration = { apiOrigin: candidateOrigin, supabaseUrl: candidateSupabaseUrl, publicKey: 'sb_publishable_disposable_test' };
const asset = encoding => Buffer.from(Object.values(configuration).join('\0'), encoding);
test('actual asset supports UTF-8 and Hermes UTF-16 configuration strings', () => {
  assert.doesNotThrow(() => assertCandidateBundle(asset('utf8'), configuration));
  assert.doesNotThrow(() => assertCandidateBundle(asset('utf16le'), configuration));
});
test('unconfigured or stale bundle is rejected despite valid process environment', () => {
  for (const missing of ['apiOrigin', 'supabaseUrl', 'publicKey']) {
    const stale = Buffer.from(Object.entries(configuration).filter(([key]) => key !== missing).map(([, value]) => value).join('\0'));
    assert.throws(() => assertCandidateBundle(stale, configuration), /missing or stale/);
  }
});
test('Owner project and nonpublic keys cannot be delivered as a candidate', () => {
  assert.throws(() => assertCandidateEnvironment({ ...configuration, supabaseUrl: 'https://gtlknzltzntfltgjvgxx.supabase.co' }));
  assert.throws(() => assertCandidateEnvironment({ ...configuration, publicKey: `a.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.b` }));
  assert.throws(() => assertCandidateBundle(Buffer.concat([asset('utf8'), Buffer.from('gtlknzltzntfltgjvgxx')]), configuration));
});
test('bundle is regenerated and checked before publishing its APK', () => {
  const source = readFileSync(new URL('../../scripts/build-android-candidate.mjs', import.meta.url), 'utf8');
  assert.match(source, /createBundleReleaseJsAndAssets.*--rerun-tasks/);
  assert.ok(source.indexOf('assertCandidateBundle(bundle, configuration)') < source.indexOf('copyFileSync(apk, destination)'));
  assert.match(source, /packagedConfigurationVerified = true/);
});
