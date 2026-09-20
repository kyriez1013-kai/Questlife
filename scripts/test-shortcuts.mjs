import assert from 'node:assert/strict';
import { deepLinkIntent, shortcutIntent, SHORTCUT_ROUTES } from '../src/platform/shortcuts/intent.ts';
for (const route of SHORTCUT_ROUTES) {
  assert.equal(shortcutIntent(route)?.action, 'OPEN');
  assert.deepEqual(deepLinkIntent(`questlife://${route}`), shortcutIntent(route));
}
for (const value of ['https://capture', 'questlife://capture?save=true', 'questlife://capture/other', 'questlife://user@capture', 'questlife://capture#save', 'questlife://delete', 'not a url']) {
  assert.equal(deepLinkIntent(value), null);
}
assert.equal(shortcutIntent(null), null);
assert.equal(shortcutIntent('DONE'), null);
console.log(`Shortcut intent boundary: ${SHORTCUT_ROUTES.length * 2 + 9} assertions passed; all entries review-only.`);
