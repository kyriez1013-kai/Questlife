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

## Record Backup Completion (2026-09-20)

- Expo DocumentPicker 14.0.8 (MIT, official SDK54) reuses the native document UI;
  no iCloud entitlement or provider account was added. `copyToCacheDirectory`
  supports immediate native FileSystem reads; Web reads the selected File.
- Build-only ts-json-schema-generator 2.9.0 (MIT) derives structural validation
  from the existing AppData types. Build-only Ajv 8.20.0 (MIT) emits a checked-in
  standalone validator, with no eval/code generation in Hermes or the browser.
  Regeneration drift is part of the backup tests. Installed LICENSE files were
  inspected; Ajv notice is included in the native license surface.
- Final serial dependency installation reports zero known npm audit findings.
  This supersedes the earlier intermediate 23-advisory count, not an independent
  security audit. Native compilation and real file selection remain separate gates.

References: https://docs.expo.dev/versions/v54.0.0/sdk/document-picker/ and
https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/.
