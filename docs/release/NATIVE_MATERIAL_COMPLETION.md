# Native Material Completion

Date: 2026-09-20. Checkout: `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`.
Branch: `release/questlife-v1`. Starting HEAD: `507d0a5`.

## Status and Ownership

Material, controls and the shared Sheet entrance are implemented in the existing
native resolution paths. The production Sheet and generic form entrance now use
`V11NativeSheet`; their existing consumers and Web implementations are unchanged.
This is source/bundle completion, not complete native visual/device acceptance.
The parent's in-progress release installation must not be treated as containing
these later changes: rebuild and reinstall from the updated checkout first.

Changed production files:

- `src/design/nativeFoundation.ts`
- `src/v11/components/V11Material.native.tsx`
- `src/v11/components/V11SheetControls.native.tsx`
- `src/native/NativeControls.tsx`
- `src/v11-stage2-rebaseline/V11Stage2ProductionSheet.native.tsx`

New files:

- `src/v11/components/V11NativeSheet.native.tsx`
- `src/components/BottomSheetForm.native.tsx`
- `tests/native/material.test.cjs`
- This report.

No HomeScreen, Store, navigation, NativeInsights, backend, global i18n,
dependency manifest or lockfile edits were made by this worker. Other workers'
concurrent changes were retained. No commits, push, deployment or owner-data
writes were performed. The user's explicit no-commit/no-deploy boundary takes
precedence over the older repository execution rule.

## SDK 54 Decisions

Official versioned documentation was read before implementation:

- [Expo GlassEffect, SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/glass-effect/)
- [Expo BlurView, SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/blur-view/)
- [Expo LinearGradient, SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/linear-gradient/)
- [Expo safe-area-context, SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/)
- [React Native 0.81 AccessibilityInfo](https://reactnative.dev/docs/0.81/accessibilityinfo)
- [React Native 0.81 KeyboardAvoidingView](https://reactnative.dev/docs/0.81/keyboardavoidingview)
- [React Native 0.81 ScrollView](https://reactnative.dev/docs/0.81/scrollview)

The parent installed `expo-glass-effect@0.1.10`, matching the local Expo 54
bundled-module recommendation. The installed API was checked, including its
`colorScheme` prop and native availability functions.

Liquid Glass is loaded lazily only on iOS 26+, after checking that the native
module is registered. Both `isGlassEffectAPIAvailable()` and
`isLiquidGlassAvailable()` must succeed; exceptions or missing registration use
the designed fallback. This protects an older installed binary as well as older
iOS and Android. A native rebuild is still needed to add Glass to a binary.

The Glass host is keyed by interactive/static mode because SDK 54 documents
`isInteractive` as mount-only. Press feedback does not lower opacity on Glass
or its ancestors. The app-selected light/dark scheme is supplied explicitly.

## Material and Controls

| Context | Material | Backdrop sampling |
| --- | --- | --- |
| Supported iOS primary pill | Regular Glass, subtle theme gradient, edge | One Glass host |
| Older/unavailable iOS primary pill | System Blur, frosted gradient, edge | One Blur host |
| Android | Opaque theme gradient, edge, restrained elevation | None |
| Reduced transparency / explicit fallback | Opaque theme gradient and edge | None |
| Evidence sheets / nested material | Opaque theme gradient | None |
| Rows, fields and buttons | Theme surfaces and interaction states | None |

The previous opaque content fill hiding iOS Blur is removed. No experimental
Android Blur is enabled. A material-depth context prevents nested sampling;
ordinary data controls do not create Blur/Glass layers. Shadows and borders do
not require SVG measurement or animation. No global frame-rate claim is made.

The shared accessibility subscription starts conservatively, handles live
motion/transparency changes, refreshes on foreground, rejects stale asynchronous
preference results, and removes listeners when the final consumer unmounts.

Control props and callbacks are retained. Fixes include categorical checkbox vs
radio vs button semantics, editability, selected/disabled/busy states, neutral
vs default tone, status/focus borders, and caller placeholder colors. Busy
buttons retain their labels. Minimum hit geometry is allocated at 44 points,
without overlapping hitSlop. Columns honor the supplied count and available
width, reducing at large Dynamic Type sizes; footer actions stack when needed.
Text remains scalable and wrapping. No new i18n keys or user-facing copy: 0.

## Shared Sheet Integration

The user explicitly continued shared-entrance integration. The named
`src/components/ui/QuestSheet.tsx` does not exist in this checkout. This path
mismatch and the necessary actual entry paths were raised in task updates before
editing. No unused QuestSheet wrapper was created. The minimum equivalent native
integration is:

- `src/v11-stage2-rebaseline/V11Stage2ProductionSheet.native.tsx` now re-exports
  the reusable native Sheet, replacing the legacy native container.
- `src/components/BottomSheetForm.native.tsx` adapts the existing generic form
  props to the same Sheet through Metro native resolution. It reads the existing
  language/theme settings; it does not write state or add product logic.

The production native entrance is only:

```tsx
export { default } from '../v11/components/V11NativeSheet.native';
```

Both adapters preserve children, footer, visibility and close callbacks. The
production contract retains title, close label, minimum height, theme and reduced
motion. Generic forms keep their existing child headings without an invented
second title. Their fallback close label reuses existing `closeDetails` bilingual
copy, instead of the old missing `close` key; caller overrides are preserved.
No HomeScreen/Today composition, data or consumer callbacks changed. The Sheet
provides:

- Modal safe-area insets including landscape sides and Android edge-to-edge.
- iOS keyboard padding without a second ScrollView keyboard inset. Android
  relies on the already-configured `adjustResize`, avoiding double compensation.
- Keyboard-aware bottom clearance and handled taps on form controls.
- Focused-input scrolling based on the measured body viewport, accounting for
  pinned footers. It does not move an already visible input, respects reduced
  motion and clears stale focus/scroll offsets when dismissed.
- Sticky header/footer in normal space; a fully scrollable layout when header,
  footer and a usable body cannot fit in a short/large-text viewport.
- The body remains mounted in the same position when the keyboard switches that
  layout, preserving live input state and existing save/cancel callbacks.
- A real 44-point close button, Back/escape/scrim dismissal and keyboard dismissal.
- Initial accessibility heading focus, or the close control for untitled forms;
  the decorative scrim is not announced.
- Modal accessibility isolation and system/app reduced-motion handling.
- Opaque evidence background under the scrim; no overlapping readable text.

The entry point is now connected in source and verified in both native production
bundles. A previously built/installed release is not proof of these behaviors.

## Verification

| Check | Actual result |
| --- | --- |
| Native material/control/Sheet component tests | 31/31 passed |
| TypeScript owned-file/dependency check | Isolated config extending the repository config, exit 0 |
| TypeScript whole-checkout check | Latest integration run passed, exit 0 |
| Existing native platform/chart suite | 59/59 passed |
| Existing appearance/theme suite | 9 appearance cases + static foundation audit passed |
| Expo production export | Web, iOS Hermes and Android Hermes export passed |
| Production bundle entry inspection | Both native source maps include the new Sheet and both native entrances; Web keeps original entrances |
| Owned-file whitespace check | `git diff --check`, passed |

Earlier whole-checkout checks encountered concurrent notification/shortcut,
Insights preview and decision-engine errors outside this worker's files. Those
were not fixed by this worker; the latest whole-checkout check passed after the
concurrent work changed. This is a point-in-time result for a shared checkout.

The scoped typecheck used
`/tmp/questlife-native-material-tests.EdXZ7s/tsconfig.native-material.json`,
extending the repository config with the five owned production files as roots;
their transitive dependencies are included. It does not hide diagnostics inside
those files and does not change the repository's shared TypeScript configuration.

Final export output: `/tmp/questlife-native-sheet-export`. This is local bundle
verification, not a signed build, installation, deployment, or native screenshot.
Source maps confirm that Android and iOS contain `V11NativeSheet.native.tsx`,
`V11Stage2ProductionSheet.native.tsx` and `BottomSheetForm.native.tsx`, not the Web
implementations of those entrances. The Web maps contain the original
`V11Stage2ProductionSheet.tsx` and `BottomSheetForm.tsx`, with no native Sheet.

The new tests mount real React 19.1 components using an isolated
`react-test-renderer@19.1.0` runtime (MIT), with native hosts and platform APIs
mocked. They verify capability failure paths, Android/old-iOS safety, light/dark
tokens, reduced settings, Glass remount, nested sampling limits, event cleanup,
stale preference races, control semantics, layout policy, keyboard/safe-area
props, focused-input geometry, dismissal/reopen cleanup, short-sheet fallback,
draft preservation, the existing Insights consumer's production entrance, both
generic-form locales/themes, and actual shared button callback wiring.
They are not Yoga/pixel layout,
screen-reader, native compositor, native keyboard or frame-time tests. React
prints the expected test-renderer deprecation warning; no app dependency was
added for these tests.

Reproduce without editing app dependencies:

```sh
TEST_RUNTIME=$(mktemp -d /tmp/questlife-material-tests.XXXXXX)
npm install --prefix "$TEST_RUNTIME" --ignore-scripts --no-audit --no-fund --package-lock=false react@19.1.0 react-test-renderer@19.1.0
NATIVE_MATERIAL_TEST_RUNTIME="$TEST_RUNTIME" node --test tests/native/material.test.cjs
npx tsc --noEmit
node scripts/test-native-platform.mjs
npm run test:theme
CI=1 npx expo export --platform all --output-dir /tmp/questlife-native-sheet-export --source-maps --max-workers 2
```

## Remaining Acceptance

- Parent native rebuild/reinstall after this shared-entrance integration. Source
  integration itself is complete; the current release-install run is not this
  worker's acceptance evidence.
- iOS 26 device/build rendering of Glass, older-iOS Blur, and toggling Reduce
  Motion/Reduce Transparency with the primary pill visible. Full Xcode was not
  installed on this host when checked; no iPhone run was performed here.
- Android native screenshots at roughly 390 points, short keyboard viewports,
  large system fonts, and both themes. An emulator was started by concurrent
  integration work; this worker did not take over its state or claim its results.
- VoiceOver/TalkBack focus traversal, dismiss/restore behavior and hardware
  keyboard navigation on native builds.
- Release-build native frame/input measurements. No sustained performance or
  subjective visual approval is claimed from tests or exports.
- No deployed Web UI flow was run: no Web production UI code was changed, and
  this task explicitly prohibits deployment. Web export compatibility passed.

The 44-point guarantee covers the shared controls and Sheet chrome changed here,
not an audit of every unchanged consumer's internal control. Real keyboard,
scroll bounds, Dynamic Type, screen-reader behavior and compositor performance
still require the native acceptance above. No physical-device run is claimed.
