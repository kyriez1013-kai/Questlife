# Dependency Security Triage

## Decision

Recommend the four **caller-scoped overrides below**, followed by the parent's lockfile refresh, clean install, audit and final builds. They address every advisory family in the supplied audit without changing Expo 54, React Native, Metro or native module versions. These are narrowly tested compatibility recommendations, not a claim that the canonical checkout is already remediated or that a complete release build has passed with them.

```json
{
  "overrides": {
    "@expo/metro-config@54.0.17": {
      "postcss": "8.5.23"
    },
    "metro@0.83.3": {
      "image-size": "2.0.4"
    },
    "xcode@3.0.1": {
      "uuid": "11.1.1"
    },
    "@expo/ngrok@^4.1.3": {
      "uuid": "11.1.1"
    }
  }
}
```

Merge with any existing overrides; do not replace unrelated parent changes. No dependency swap, fork, root-wide UUID replacement, `npm audit fix --force`, Expo 57 upgrade or Health Connect downgrade is recommended.

## Scope and Evidence

Read-only triage of `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1` at observed HEAD `7a671ed`, plus isolated candidate packages in `/tmp/questlife-security-triage.X2dSoO`. The only repository file written by this task is this report. Canonical `package.json`, `package-lock.json`, `node_modules`, build configuration and application code were not modified. No commit, push or deployment.

Input: `/tmp/questlife-v1-audit-current.json`, audit schema 2, **23 affected-package reports: 9 high and 14 moderate**. This is **7 distinct advisories in 3 underlying packages**, not 23 independent exploit paths. npm marks most of this tree as production dependencies because Expo and its tooling are under `dependencies`; `--omit=dev` alone does not classify actual runtime reachability.

Observed hashes before any parent remediation:

| File | SHA-256 |
| --- | --- |
| Supplied audit | `02e07a2979f214ff92f54d15ad2f951b78de27bdc473de72baf36cdc8c66dec2` |
| `package.json` | `09f98beed3c8d1e5f3d9ad415949b1d3c2d6abf41159abebc8f8017421fc7558` |
| `package-lock.json` | `1eda4f14e448226201984448e43622011b3091f95ef4c7b3095f8a81220a5094` |

Installed versions confirmed with `npm ls ... --all` and installed manifests: Expo `54.0.37`, React Native `0.81.5`, `@expo/cli` `54.0.27`, `@expo/metro` `54.2.0`, `@expo/metro-config` `54.0.17`, Metro `0.83.3`, `image-size` `1.2.1`, PostCSS `8.4.49`, xcode `3.0.1` with UUID `7.0.3`, and `@expo/ngrok` `4.1.3` with UUID `3.4.0`.

Registry queries confirmed Expo `54.0.37` and `@expo/metro` `54.2.0` are the latest published non-canary versions within their respective 54 lines at triage time. `@expo/metro@54.2.0` pins the Metro family to `0.83.3`. A routine same-range update cannot resolve the pinned leaf versions.

## Exposure Classification

| Underlying package | Installed dependency path | Actual surface in this repository | Release classification |
| --- | --- | --- | --- |
| `image-size@1.2.1` | Expo -> `@expo/metro@54.2.0` -> `metro@0.83.3` -> `image-size` | Metro's Node-side `src/Assets.js` reads bundled image buffers and extracts dimensions. Malformed images can hang build/dev-server processing. The extension allowlist is not a sufficient defense because detection examines content. | High build/dev-server availability risk with attacker-controlled assets; no observed production app/API path accepting user images into this parser. Patch before final build. |
| `postcss@8.4.49` | Expo -> `@expo/metro-config@54.0.17` -> `postcss` | Node-side CSS transformation; malicious CSS source-map annotations can disclose build-machine files/maps if processed and exposed. The XSS advisory requires CSS to enter an HTML style context. | Build/output-contamination risk, not an observed on-device data-processing route. Current Expo worker defaults `map: false`, and no project PostCSS config was found, reducing current reachability but not removing the vulnerable dependency. Patch before final build. |
| `uuid@7.0.3`, `uuid@3.4.0` | Expo config plugins -> `xcode@3.0.1`; direct `@expo/ngrok@4.1.3` | Xcode project generation and dev-tunnel naming, both calling only `uuid.v4()` with no supplied output buffer. | Moderate package finding, but the advisory's v3/v5/v6 buffer-write condition is not reached by the inspected callers. Low demonstrated exploitability here; caller-scoped updates are still available. |

Static import inspection found no `postcss`, `image-size`, `xcode`, `@expo/ngrok` or UUID package imports in application `src` or backend `api` code. Project config plugins import Expo config plugins at build time. This supports the exposure classification; it is not a source-map inventory or independent attestation of the final deployed/native artifact. `@expo/metro-runtime` is a different package from the affected Node-side `@expo/metro` tooling.

All inherited report entries accounted for:

- **9 high:** `image-size`, `postcss`, `metro`, `metro-config`, `metro-transform-worker`, `@expo/metro`, `@expo/metro-config`, `@expo/cli`, `expo`.
- **14 moderate:** `uuid`, `xcode`, `@expo/ngrok`, `@expo/config-plugins`, `@expo/config`, `@expo/prebuild-config`, `expo-asset`, `expo-constants`, `expo-dev-client`, `expo-dev-launcher`, `expo-manifests`, `expo-linking`, `expo-notifications`, `react-native-health-connect`.

The native runtime packages in the second group are reported through their config/build dependency chain, not through separate advisories against their notification, linking or health APIs. This is not grounds to disable those features or accept an incompatible version downgrade.

## Exact Versions and Compatibility

### PostCSS 8.5.23

Official advisories identify fixes at [8.5.10 for style-context XSS](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), [8.5.12 for arbitrary-file source-map loading](https://github.com/advisories/GHSA-6g55-p6wh-862q), [8.5.18 for map path traversal](https://github.com/advisories/GHSA-r28c-9q8g-f849), and [8.5.23 for the no-`from` bypass](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp). **8.5.23 is the minimum version clearing all four reported ranges.** Do not stop at 8.5.10, 8.5.12, 8.5.18 or 8.5.22.

`npm view postcss@8.5.23 ... --json` confirms CommonJS `require` and ESM exports, the `default` processor function, and Node `^10 || ^12 || >=14`, matching the installed major-8 API/engine requirements. Dependencies are `nanoid ^3.3.16`, `picocolors ^1.1.1`, `source-map-js ^1.2.1`. This is a same-major minor update but exceeds Expo's `~8.4.32` pin, hence the explicit scoped override.

Actual installed Expo worker `build/transform-worker/postcss.js` was loaded in memory with only its `postcss` dependency redirected to the candidate. Config loading, plugin application, `postcss.default(plugins).process(...)` and `result.content` passed. A synthetic external source-map sentinel was not leaked when `from` was unset. No project files were written by the test.

### image-size 2.0.4

The reviewed [ICNS infinite-loop advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [JXL/HEIF infinite-loop advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) list affected versions `<=2.0.2`. Their pages still say no patched version, so the advisory pages alone are insufficient evidence for a fix. npm metadata lists `2.0.3` and `2.0.4`, published on 2026-09-14; **no patched 1.x release is published**. The package's repository has moved to Codeberg; the release page was inaccessible through the web reader during triage.

The exact npm `2.0.4` package was inspected: it exports both the CommonJS-compatible `default` and named `imageSize`, accepts the Buffer used by Metro, and requires Node `>=18`, below Metro's existing `>=20.19.4` requirement. Its ICNS parser rejects entries below the header size, JXL rejects undersized partial boxes, HEIF enforces box/progress bounds, and `findBox` advances on invalid short boxes.

This **is a leaf major-version override**, not a generally interchangeable 1.x upgrade: v2 moves filename/file-I/O APIs to `image-size/fromFile`. Correction from the full export: Metro's `getAssetSize` accepts buffers, but its separate `getAssetData` export path passes a filename. The original narrow compatibility probe missed that second call site; its buffer result did not establish export compatibility. Three malformed ICNS/JXL/HEIF inputs terminated with errors inside a two-second isolated-process timeout.

The release now applies `scripts/patch-metro-image-input.cjs` during postinstall. It checks the exact Metro 0.83.3 version and single approved call site, converts filename inputs to file bytes, preserves existing byte inputs, and refuses unknown source changes. `scripts/test-metro-assets.cjs` exercises the actual filename exporter on all four application PNG assets plus patch idempotence. The full Web export passed after this correction. No application image, reading, Expo/RN/Metro version or runtime import was changed by the compatibility patch.

A full release/export rebuild remains mandatory, especially because 2.0.4 is recent. If the parent rejects a leaf major override, record the remaining high build-tool risk and restrict assets/build inputs; there is no evidenced same-major fixed package to recommend instead.

### UUID 11.1.1 Under xcode and ngrok Only

The [official UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) identifies `11.1.1` as a fixed release. The defect concerns v3/v5/v6 **functions**, not package major versions; these paths mishandle caller-supplied output buffers. Both current callers use only zero-argument `v4()`.

Registry metadata for `uuid@11.1.1` confirms `node.require -> ./dist/cjs/index.js`, with no dependency additions. Its named `v4` export matches both `require('uuid').v4()` callers. These are **leaf major-version overrides** across the callers' declared ranges, justified by the exact API usage and tests, not by semver alone. Do not replace all UUID instances globally or substitute an arbitrary newer ESM-oriented major.

Actual `xcode@3.0.1/lib/pbxProject.js` parsed the existing Xcode project, generated 100 unique correctly formatted project IDs and serialized the project in memory with UUID 11.1.1. No project file was written. Actual `@expo/ngrok@4.1.3/index.js` generated a valid v4 tunnel name with process/network boundaries mocked; **no tunnel was opened**. The patched v5 output-buffer bounds rejection was also checked.

## Verification and Provenance

Test runtime: Node `v24.14.1`, npm `11.11.0`. Candidate install used `--prefix /tmp/questlife-security-triage.X2dSoO --ignore-scripts --no-save --package-lock=false --no-audit --no-fund`; canonical dependencies were not touched.

**11/11 compatibility/security smoke checks passed.** Reproducible temporary script:

```sh
node /tmp/questlife-security-triage.X2dSoO/compatibility.cjs
```

These are focused caller tests, not full native/web build or live-tunnel evidence. The PostCSS no-`from` test emits an expected warning about missing source context; assertions passed.

Exact npm registry metadata commands used included:

```sh
npm view postcss@8.5.23 version engines dependencies exports dist.integrity dist.tarball --json
npm view image-size@2.0.4 version engines main exports dist.tarball dist.integrity --json
npm view uuid@11.1.1 version engines exports dependencies dist.integrity dist.tarball --json
npm view @expo/metro-config@54.0.17 version dependencies.postcss --json
npm view xcode@3.0.1 version dependencies.uuid --json
npm view @expo/ngrok@4.1.3 version dependencies.uuid --json
npm view expo@54 version --json
npm view @expo/metro@54 version dependencies.metro --json
```

Exact package integrity from registry metadata:

| Candidate | SHA-512 SRI |
| --- | --- |
| PostCSS 8.5.23 | `sha512-g50586zr4bZmwFiTlflMu8E0bDTb5I5gertgwAKmsdUlTQIhZtunzUlD1WSzwcVWPoAVpsrA6vlfCD7oXvRwgg==` |
| image-size 2.0.4 | `sha512-QRUkFFsRV/6fuESxb9Vkq+a0LkSrgKXuc2NEqfikiXxxN/G3tjWt5EVUlMaImRBZRZK/jRBEbYvpPYZL8t08Zw==` |
| UUID 11.1.1 | `sha512-vIYxrBCC/N/K+Js3qSN88go7kIfNPssr/hHCesKCQNAjmgvYS2oqr69kIufEG+O4+PfezOH4EbIeHCfFov8ZgQ==` |

A fresh POST to npm's official `https://registry.npmjs.org/-/npm/v1/security/advisories/bulk` with only `{"postcss":["8.5.23"],"uuid":["11.1.1"],"image-size":["2.0.4"]}` returned HTTP 200 and `{}`. This confirms **no advisory entries for those exact versions at query time**, not zero vulnerabilities in the whole project. Clearing all 23 supplied inherited findings is the expected outcome, pending a fresh full audit after the parent applies the overrides.

Metro `0.83.8` was also checked in npm metadata; it would replace additional Metro, Babel, parser, MIME and accept-header dependencies and diverge from Expo 54's exact Metro pins. It is unnecessary for these leaf fixes and is not the recommended bounded-release path.

## Parent Release Gate

1. Merge the four overrides into the parent-owned manifest, regenerate the lockfile through npm, and review that the intended leaves changed while Expo/RN/Metro/native versions stayed fixed. Do not edit lock entries manually.
2. Verify the resolved tree with `npm ls image-size postcss uuid metro @expo/metro --all`. Expected: image-size `2.0.4`, PostCSS `8.5.23`, both UUID paths `11.1.1`, Metro `0.83.3`, Expo Metro `54.2.0`.
3. Run a fresh `npm audit --json`, retain its evidence, and investigate any remaining or newly reported advisories. The original 23-report file must not be reused as post-fix evidence.
4. Run the parent clean-install, TypeScript/tests, Expo compatibility check, web export, iOS/Android exports and final candidate native build. Recheck real icons/splash and CSS output. The smoke tests here do not replace these gates.
5. Keep Metro/dev tunnels off public release infrastructure; build only reviewed assets/CSS and avoid exposing CI secrets to untrusted builds. Confirm release-profile settings separately from development-client testing.

Until those gates pass, status is **fixes identified and caller compatibility evidenced; remediation not yet applied by this task**. No known production app/API exploit path for these specific advisories was found, but build-machine and output integrity remain material release concerns.

## Follow-Up: Actual Installed Tree

The parent applied the four scoped overrides and completed installation. The direct ngrok override selector is `@expo/ngrok@^4.1.3`, matching the direct dependency's declared spec; the installed caller remains exactly `4.1.3`. The JSON recommendation above now reflects that selector. This task did not change either package file or install additional checkout dependencies.

`npm ls image-size postcss uuid metro @expo/metro xcode @expo/ngrok --all` exited 0, with no invalid dependencies, and confirmed:

- Metro `0.83.3` resolves image-size `2.0.4`.
- Expo Metro config `54.0.17` resolves PostCSS `8.5.23`.
- xcode `3.0.1` and ngrok `4.1.3` both resolve UUID `11.1.1`.
- Expo `54.0.37`, Expo Metro `54.2.0`, Metro `0.83.3` and React Native `0.81.5` remain unchanged.

**11/11 checks passed against the actual installed tree** with:

```sh
node /tmp/questlife-security-triage.X2dSoO/compatibility.cjs --installed
```

This mode loads Metro, the Expo PostCSS worker and xcode directly from the canonical checkout, without substituting scratch candidate dependencies. PNG dimensions are checked against the actual PNG headers. Malformed-image checks use the package resolved from the installed Metro caller. The ngrok caller resolves its installed UUID normally; only process/network boundaries remain mocked, so no tunnel is opened. The PostCSS source-map probe and UUID bounds rejection also passed.

Installed manifest/lock hashes at this checkpoint:

- `package.json`: `6db3700c8c9c9e249a58afe099c212f2090433c7f71c3b3d10c9425c71a8e9d6`
- `package-lock.json`: `87a7d9779f56f7c113a80f91af08e74b1606b6f25da22dd7784f4ae2190cfaf4`

Current handoff status: **parent-applied dependency resolution verified; installed-caller compatibility passed**. Parent owns the full fresh audit, clean-install/build gates, exports and native candidate build. This follow-up does not claim those checks passed and made no broader dependency patches.
