# QuestLife V11 Stage 0 - Technical Feasibility

Date: 2026-07-30

Status: Approved after physical iPhone Safari owner verification.

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
- The stroke path is inset by 0.75px on every side, so the centered SVG stroke
  remains fully inside the material bounds.
- Pill radius is derived from the inset path:
  `(height - strokeWidth) / 2`.
- The shared edge wrapper measures its exact Web bounding box, including
  fractional widths, and gives the SVG and `viewBox` those identical
  dimensions.
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

### Three-layer material correction

The shared fixture material now separates geometry and depth into three
independent layers:

1. The outer wrapper uses `overflow: visible` and owns the restrained external
   shadow plus the subtle field bloom beyond the material bounds.
2. The inner glass clip uses `overflow: hidden`, owns the translucent fill,
   backdrop blur, WebKit backdrop blur, saturation, and an independent 1px
   upper internal highlight.
3. The directional SVG overlay remains pointer-inert and exactly matches the
   outer dimensions. Its 1.5px stroke keeps the accepted 0.75px inset geometry
   and falls from 68% upper-left opacity to 1% lower-right opacity.

The light-field variation is a separate layer behind the inner glass. It is not
painted onto the pill surface. True glass can therefore refract that field,
while the fallback surface intentionally occludes it with an opaque fill.

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

The material comparison is fixed as two independent samples:

- left: requested live backdrop material;
- right: fixed opaque fallback material.

The global forced-fallback control affects the primary action surface, not the
comparison samples.

## Local Verification

Build:

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Expo Web output directory: `dist`.
- Release JavaScript bundle: `index-9c2122b209ce1ad32bc64aead810e224.js`.
- Release Stage 0 stylesheet:
  `v11-stage0-596d22bb56d0bb71d360000c9ffca011.css`.

Serving path:

- The exported `dist` directory was served locally on port 8085.
- The owner-test server is explicitly bound to `0.0.0.0` for same-network
  iPhone Safari access.
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
- Shared pill edge geometry: parent / edge layer / SVG all `294x64`; path
  `x=0.75`, `y=0.75`, `width=292.5`, `height=62.5`, `rx=31.25`.
- Fractional-width material samples: parent / edge layer / SVG all
  `166.5x132`; path `x=0.75`, `y=0.75`, `width=165`,
  `height=130.5`.
- Outer action wrapper: `overflow: visible`, external shadow present.
- Inner glass clip: `overflow: hidden`, computed background alpha 42%,
  computed backdrop `blur(28px) saturate(1.6)`.
- Directional SVG overlay: `pointer-events: none`, `overflow: visible`, with
  the stroke fully inside its measured bounds.
- Revised 375x667 fixture observation: P95 17.2ms; 0 / 180 intervals over
  20ms.
- Dark and light true-glass samples visibly retain the rear light-field
  variation; their fallback counterparts remain intentionally opaque.

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
| Physical iOS Safari | VERIFIED manually by owner |
| Mobile software keyboard | UNVERIFIED - the fixture contains no text input |
| Unsupported-browser automatic `@supports` path | UNVERIFIED on an actually unsupported engine; forced fallback was verified |

The Stage 0 P95 observations apply only to this two-orb, two-blur-layer fixture.
They must not be reused as a Stage 2 Today performance conclusion. Stage 2 must
repeat frame, scroll, flicker, and layer-count measurements against the complete
Today composition.

Physical iPhone Safari owner verification passed:

- true-glass blur and refraction;
- intentionally opaque fallback material;
- inset directional edge without protruding pill ends;
- repeated S1 / S3 scrolling without visible flicker or disappearing material;
- no unacceptable hard glow edge, rectangular clipping, or banding;
- `2 / 5 state` baseline;
- dark and light material depth.

The exact `standard=` and `-webkit=` values remain pending transcription from
the owner's device readout. They are not inferred in this document.

## Artifacts

- `artifacts/v11-stage0/375-chrome-full-material.png`
- `artifacts/v11-stage0/375-full-material.png`
- `artifacts/v11-stage0/375-forced-fallback.png`
- `artifacts/v11-stage0/375-light-material.png`
- `artifacts/v11-stage0/393-full-material.png`
- `artifacts/v11-stage0/375-reading-baseline-fixed.png`
- `artifacts/v11-stage0/375-material-comparison-fixed.png`
- `artifacts/v11-stage0/375-directional-edge-fixed.png`
- `artifacts/v11-stage0/375-glass-three-layer-dark.png`
- `artifacts/v11-stage0/375-glass-comparison-dark.png`
- `artifacts/v11-stage0/375-glass-three-layer-light.png`
- `artifacts/v11-stage0/375-glass-comparison-light.png`

Owner test:

- `QUESTLIFE_V11_STAGE0_IOS_SAFARI_CHECKLIST.md`

## Stage Boundary

This fixture proves only the Web material paths and responsive feasibility.
It does not implement V11 Today, does not map production Today functions, and
does not map any production data. Stage 0 is approved; Stage 1 may proceed
behind its own isolated fixture route.
