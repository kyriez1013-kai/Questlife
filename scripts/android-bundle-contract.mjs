export const candidateOrigin = 'https://questlife-v1-release.vercel.app';
export const candidateSupabaseUrl = 'https://gttcoocfkqwvsqfwxpyo.supabase.co';

export function assertCandidateEnvironment({ apiOrigin, supabaseUrl, publicKey }) {
  if (apiOrigin !== candidateOrigin || supabaseUrl !== candidateSupabaseUrl || !publicKey) {
    throw new Error('Standalone V1 must use the configured candidate services');
  }
  if (!publicKey.startsWith('sb_publishable_')) {
    try {
      const role = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString('utf8')).role;
      if (role !== 'anon') throw new Error('invalid public role');
    } catch {
      throw new Error('Android bundles accept only a public Supabase key');
    }
  }
}

export function assertCandidateBundle(bundle, configuration) {
  assertCandidateEnvironment(configuration);
  // Hermes can store strings as UTF-8 or UTF-16; inspect the actual APK asset.
  const contains = value => ['utf8', 'utf16le'].some(encoding =>
    bundle.includes(Buffer.from(value, encoding)));
  for (const value of [configuration.apiOrigin, configuration.supabaseUrl, configuration.publicKey]) {
    if (!contains(value)) throw new Error('Packaged Android configuration is missing or stale');
  }
  if (contains('gtlknzltzntfltgjvgxx')) throw new Error('Owner backend found in candidate APK');
}
