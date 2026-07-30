# QuestLife V11 Stage 0 - Technical Feasibility

Date: 2026-07-30

Status: Local technical fixture complete. Awaiting Stage 0 approval.

Branch: `design/questlife-product-v2`

Route flag:

```text
?questlife_v11_ui=stage0
```

The flag selects an isolated fixture before `StoreProvider` and the production
navigation tree are mounted. The default route continues to render the existing
QuestLife app and its Today / Goals / Schedule / Insights / Settings navigation.
No production screen, store value, API, schema, or persistence path is used by
the fixture.

## Implementation Path

### Directional gradient edge

Path: existing `react-native-svg` dependency.

- An absolute SVG `LinearGradient` runs from the stronger top-left highlight to
  the weaker bottom-right edge.
- The SVG is the outer 1.5px material edge.
- The actual glass or fallback surface is inset inside that edge.
- This avoids unsupported `border-image` and avoids a uniform grey border.

### Radial light orbs

Path: existing `react-native-svg` dependency plus Web CSS `filter`.

- Each orb is an SVG `RadialGradient` with a transparent outer stop.
- The primary wrapper uses `blur(120px)`.
- The supporting wrapper uses `blur(96px)`.
- S1 and S3 change opacity and saturation through deterministic presentation
  state only.
- The fixture renders two orbs total.

### Backdrop material

Path: a narrow Web-only material adapter inside the Expo / RN Web component.

Expo's CSS export removed `backdrop-filter` from the generated stylesheet.
Therefore the Web adapter renders only the glass surface as a native `div` and
sets these properties inline:

```text
backdrop-filter: blur(28px) saturate(160%)
-webkit-backdrop-filter: blur(28px) saturate(160%)
```

The surrounding layout, controls, text, SVG edge, and radial light remain Expo /
React Native Web components. Native-only code paths do not mount this Stage 0
route.

No third-party dependency was added. `react-native-svg` was already installed.

## Fallback

When backdrop filtering is unavailable, or when the fixture's forced fallback
control is selected:

- backdrop filtering is set to `none`;
- the surface becomes an opaque soft surface;
- the directional SVG edge remains;
- text keeps the active theme's primary and secondary contrast;
- no user-facing functionality changes.

The forced fallback is a visual simulation of the unsupported-browser path. It
is not evidence of an actual unsupported Safari engine.

## Local Verification

Build:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Expo Web output directory: `dist`.
- Release bundle: `index-b9ea0d0ac941c5e6a64e6166e4439507.js`.

Serving path:

- The exported `dist` directory was served locally on port 8085.
- Expo's local dev-server port scanner failed in this sandbox with
  `ERR_SOCKET_BAD_PORT` at port 65536, so the exported release output was used
  for browser verification.

Actual Chrome, 375x667:

- Standard `backdrop-filter` support: true.
- Computed glass material: `blur(28px) saturate(1.6)`.
- Radial light orbs: 2.
- Simultaneously blurred glass layers in the first fixture viewport: 2.
- P95 over 180 requestAnimationFrame intervals: 17.6ms.
- Intervals over 20ms: 0 / 180.
- Global horizontal overflow: none.
- Primary action height: 64px.
- Technical controls: 44px each.
- Forced fallback computed backdrop: `none`.
- Forced fallback computed background: opaque soft surface.
- Forced fallback primary-text contrast: 15.24:1.
- Forced fallback secondary-text contrast: 10.04:1.
- Forced reduced-motion animation and transition duration: 0.001ms.

In-app Chromium viewport checks:

- 375x667: no global horizontal overflow; internal vertical scrolling works.
- 393x852: no global horizontal overflow; internal vertical scrolling works.
- 375x667 frame observation: P95 17.4ms, 0 / 180 intervals over 20ms.
- 393x852 frame observation: P95 17.2ms, 0 / 180 intervals over 20ms.
- `cleanFocus` and `deepWork` both rendered with readable text and material
  separation.

Isolation:

- Opening the local URL without the flag rendered the existing Today surface.
- The five existing navigation tabs were present.
- No V11 Stage 0 marker was present on the default route.

## Platform Status

| Platform | Result |
| --- | --- |
| Expo Web release export | VERIFIED |
| Chrome desktop | VERIFIED |
| Chromium responsive viewport 375x667 | VERIFIED |
| Chromium responsive viewport 393x852 | VERIFIED |
| `prefers-reduced-motion` CSS path | VERIFIED by forced reduced-motion state |
| Physical iOS Safari | UNVERIFIED - no physical iOS Safari device was available |
| Mobile software keyboard | UNVERIFIED - the fixture contains no text input |
| Unsupported-browser automatic `@supports` path | UNVERIFIED on an actually unsupported engine; forced fallback was verified |

## Artifacts

- `artifacts/v11-stage0/375-chrome-full-material.png`
- `artifacts/v11-stage0/375-full-material.png`
- `artifacts/v11-stage0/375-forced-fallback.png`
- `artifacts/v11-stage0/375-light-material.png`
- `artifacts/v11-stage0/393-full-material.png`

## Stage Boundary

This fixture proves only the Web material paths and responsive feasibility.
It does not implement V11 Today, does not map production Today functions, and
does not begin the Stage 1 token layer. Stage 1 remains blocked until explicit
approval.
