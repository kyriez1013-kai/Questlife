import assert from 'node:assert/strict';
// @ts-expect-error Node strip-types execution requires the explicit extension.
import { detectInstallPlatform, detectStandaloneMode } from './installableShell.ts';

assert.equal(detectStandaloneMode({
  matchMedia: () => ({ matches: true }),
  navigator: {},
}), true);

assert.equal(detectStandaloneMode({
  matchMedia: () => ({ matches: false }),
  navigator: { standalone: true },
}), true);

assert.equal(detectStandaloneMode({
  matchMedia: () => ({ matches: false }),
  navigator: {},
}), false);

assert.equal(detectInstallPlatform({
  navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' },
}), 'ios');

assert.equal(detectInstallPlatform({
  navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', platform: 'MacIntel', maxTouchPoints: 5 },
}), 'ios');

assert.equal(detectInstallPlatform({
  navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)' },
}), 'android');

assert.equal(detectInstallPlatform({
  navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', platform: 'MacIntel', maxTouchPoints: 0 },
}), 'desktop');

console.log('Installable shell tests passed: 7');
