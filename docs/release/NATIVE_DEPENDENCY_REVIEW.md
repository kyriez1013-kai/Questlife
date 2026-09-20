# Candidate Dependency Review

2026-09-20. No unrelated Expo SDK major upgrade.

| Added dependency | Pinned compatible line | License | Purpose |
| --- | --- | --- | --- |
| expo-glass-effect | SDK 54, 0.1.10 | MIT, Expo | OS-capability checked iOS glass, intentional fallback elsewhere |
| expo-quick-actions | 6.0.0 | MIT, Evan Bacon | Launcher shortcuts routed through existing review-only handlers |

Both resolved versions are locked in package-lock.json. Native notices are
included in Settings / Third-party licenses. Quick Actions is an external Expo
ecosystem package, not an official Expo SDK module. No new chart/animation
framework or native-only replacement navigation was added.

Sources inspected: installed manifests, Quick Actions LICENSE/README, SDK54
GlassEffect documentation, and https://github.com/expo/expo/blob/sdk-54/LICENSE.
Package installation came from npm, not a downloaded shell installer.

Compatible `npm audit fix --ignore-scripts` reduced reported vulnerabilities
from 32 to 23 (14 moderate, 9 high). This is not a clean security audit.
Remaining transitive paths include Expo build tooling; the suggested forced
SDK57 upgrade was not applied. Final candidate validation must rerun native
build, Expo compatibility checks, typecheck and Web build on the updated lock.
