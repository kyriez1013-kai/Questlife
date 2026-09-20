# Native Insights Completion

## Scope and Handoff

Implemented directly in `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`, branch `release/questlife-v1`, starting HEAD `507d0a59637f0677a100ac4fa76515accc2af709`. This is a bounded native Insights implementation, not a release or live-service certification. No commit, push, deployment, account configuration, or backend-origin edit was performed.

Read `AGENTS.md`, `EXECUTION_RULES.md`, and `/Users/kyrie/Downloads/QUESTLIFE_END_TO_END_COMPLETION.md`. Before editing, read the exact [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/), [SDK 54 WebView reference](https://docs.expo.dev/versions/v54.0.0/sdk/webview/), and [SDK 54 DateTimePicker reference](https://docs.expo.dev/versions/v54.0.0/sdk/datetimepicker/). Used installed dependencies only.

Other agents changed shared files during this work. Those changes were observed and left intact. This slice did not modify Store, shared types, navigation, `i18n.ts`, package/lock files, other screens, `docs/quant`, or the completion ledger.

## Changed Files

- `src/native/NativeInsightsScreen.tsx`: delegates the native screen to the complete Insights experience.
- `src/native/insights/NativeInsightsExperience.tsx`: real owner/runtime integration, explicit load and refresh, account/data invalidation, isolated validated examples.
- `src/native/insights/NativeInsightsWorkspace.tsx`: watchlist, capabilities, ranges, comparison, layers, analysis entries, independent empty/error/account states.
- `src/native/insights/InsightsControls.tsx`: themed accessible controls and opaque native sheets.
- `src/native/insights/InsightsRangeEditor.tsx`: days, observation-count and calendar selection with validation.
- `src/native/insights/NativeDateField.native.tsx` and `NativeDateField.tsx`: native system date picker and web-preview date field.
- `src/native/insights/InsightsDetails.tsx`: records, evidence, provenance, events, drivers, similar periods, historical follow-up, scenarios and joint analysis.
- `src/native/insights/NativeInsightsChart.native.tsx` and `NativeInsightsChart.tsx`: local native WebView and matching local preview chart, selection readout, watchdog and retry.
- `src/native/insights/nativeInsightsChartModel.ts`: faithful chart projection and validated bridge messages.
- `src/native/insights/nativeInsightsChartRuntime.ts`: local mature chart renderer and bounded zoom commands.
- `src/native/insights/nativeInsightsPresentation.ts`: presentation-only range, capability, comparison, provenance and failure-state guards.
- `src/native/insights/nativeInsightsStrings.ts`: **76 local zh/en label pairs**. Parent may later migrate these into shared localization; shared `i18n.ts` remains untouched.
- `src/native/insights/__tests__/nativeInsights.test.ts` and `run-tests.mjs`: pure targeted regression tests.
- `src/native/insights/__tests__/preview.tsx` and `serve-preview.mjs`: isolated synthetic local preview, no Store or live Quant requests.
- `docs/release/NATIVE_INSIGHTS_COMPLETION.md`: this report.

## Implemented Behavior

Reuses `useStore`, `useDeviceData`, `withDeviceObservations`, `loadOwnerQuantArtifacts`, the existing Quant product/analysis contracts and adapters, Insights V3 presentation/fixture loaders, existing watchlist helpers, chart wire model and bundled `chartHtml`. All metrics, references, OHLC, EWMA, evidence and analyses come from these existing sources. There are no new statistical algorithms, invented scores, fabricated candles, interpolation, normalization or coarse chart fallback.

- Capability-driven line, point, bar and candle views. Candles require actual supplied OHLC for the selected contract range. Custom ranges never manufacture candles.
- Contract quick ranges plus custom days, last-N observations and calendar dates. Month/quarter/half-year/year labels are handled when supplied. Internal custom-range capability keys are excluded from quick presets.
- Explicit zoom in, zoom out and reset-visible-range controls; original observations and timestamp/value selection remain available outside the canvas.
- Up to three comparison variables, only with matching units and scales; HRV methods are additionally guarded. Comparisons use the selected primary observation interval. Different dimensions are visibly disabled, never silently put on a common axis.
- Source-provided reference/range, EWMA and event layers; exact provenance and measurement details, missingness, limitation codes, reference eligibility and interpretation constraints remain visible.
- Working original-record, evidence, event, drivers, similar-history, recovery, scenario and joint-analysis sheets. Similar-period jump applies the source dates. Analysis for another target offers a working switch to that target.
- Select, hide, pin and reorder watchlist items. These are presentation-only and in memory, without Store/storage mutations.
- Separate idle, loading, no eligible observations, empty selected interval, sample-load failure, chart failure, stale result and runtime service failure states. A runtime transport failure can retain the last successful snapshot with an explicit warning; auth/context failures clear it.
- `QUANT_AUTH_NOT_CONFIGURED` is account configuration, `QUANT_AUTH_REQUIRED`/HTTP 401 is sign-in required, auth/context/account/consent failures are account attention, and ordinary service failure is not interpreted as insufficient data. Account identity changes and changed record snapshots invalidate prior results; stale async responses are discarded.
- Read-only examples are explicitly labelled and isolated from the owner account, sync queue and notifications. Real records are only sent via the existing service after the explicit load/refresh action; the service remains responsible for authentication and health consent.

The WebView receives the existing locally bundled chart library and a literal renderer script. It does not load a CDN, remote page or asset. Literal source avoids Hermes `Function.toString()` bytecode limitations. Navigation is restricted to the local blank document, external file access/DOM storage/mixed content are disabled, and messages are validated. Library attribution is retained. Retry remounts a failed WebView; observations remain available when rendering fails.

## Verification

Passed after the final UI changes:

```sh
node src/native/insights/__tests__/run-tests.mjs
./node_modules/.bin/tsc --noEmit --strict --module esnext --target es2022 --moduleResolution bundler --jsx react-jsx --resolveJsonModule --esModuleInterop --skipLibCheck src/native/NativeInsightsScreen.tsx src/native/insights/NativeInsightsChart.native.tsx src/native/insights/NativeDateField.native.tsx src/native/insights/__tests__/preview.tsx
```

- **18/18 tests in Asia/Shanghai and 18/18 in America/Los_Angeles**. Includes date overflow/leap-day/local-day handling; unit/scale/HRV safety; exact last-N comparison interval; no fake OHLC; owner/example analysis identity; auth vs runtime vs no-data state; retained snapshots; bridge validation; preservation of zero; bilingual coverage; literal renderer and bounded zoom.
- Focused strict TypeScript check: passed, including native-only chart/date-picker files and synthetic preview. The test compiler was aligned with repository strict mode after a concurrent shared Zod type exposed the earlier runner's missing strict flag.
- Repository-wide `tsc --noEmit`: passed during final handoff checks; concurrent parent work remains independent.
- Existing `node scripts/test-native-platform.mjs`: **59/59 passed** at the intermediate integration checkpoint.
- Owned-path whitespace check passed.

Earlier synthetic browser verification recorded **26 passing checks** at 390px light/dark, Chinese dark and 1280px dark, including actual canvas pixels, selection, zoom, candle/bar views, unit-safe compare, layers, range validation, watchlist actions, analysis details, single-point data and chart retry. No page errors or external requests were observed. This was performed before the user's explicit CUA-only reminder. The direct browser harness was removed from the handoff; **all later browser interactions used `cua_repl` only**. Final CUA verification confirmed the updated Chinese dark quick-range labels, opening the custom editor, calendar fields and count, closing the sheet and the rendered layout. It was an isolated local preview, not a live account or native-device test.

Synthetic evidence directory:

`/var/folders/95/tb247_tj4wzbw6lw6c4gqq4m0000gn/T/questlife-native-insights-evidence`

Files: `results.json`, `light-390-top.png`, `light-390-chart.png`, `compare-390.png`, `evidence-390.png`, `single-390.png`, `dark-390-chart.png`, `dark-1280.png`, `zh-dark-390.png`. These are temporary local evidence, not production screenshots or checked-in artifacts.

Intermediate Expo exports also completed:

```sh
CI=1 ./node_modules/.bin/expo export --platform ios --output-dir /tmp/questlife-native-insights-ios-export
CI=1 ./node_modules/.bin/expo export --platform android --output-dir /tmp/questlife-native-insights-android-export
```

Both bundled Hermes successfully (iOS approximately 8.22 MB, Android approximately 8.18 MB). These exports preceded final palette/tick/account-copy changes. They are **not signed-build, installation or device interaction evidence**. Parent owns the final release rebuild with the selected backend origin.

## Remaining UI and Integration Gaps

- Physical iOS/Android touch, native date-picker interaction, WebView lifecycle, VoiceOver/TalkBack and large Dynamic Type remain unverified. Parent reported device input blocked through CUA and requested ADB permission; this slice did not bypass that boundary.
- No authenticated live owner Quant request was performed by this slice. The deployed HTTPS runtime, Supabase account configuration/password step and final backend-origin build remain parent/owner responsibilities. An unconfigured or signed-out account is not reported as no data.
- A zero-eligible owner response has no supplied variable catalogue; the screen remains usable with explicit next steps and isolated examples, but does not fabricate owner variables or results.
- Comparison across incompatible dimensions is intentionally disabled. Dual axes and normalization are not introduced.
- Watchlist preferences last only for the mounted workspace; persistent preferences would require storage/shared ownership approval.
- Current source products expose one series per instrument; this UI selects the first supplied series, matching current contracts in use. A future product exposing multiple distinct series needs an explicit series picker.
- Recording, connecting and sign-in remain in existing Today/Settings navigation. This slice did not change routes or add dead navigation actions.
- No deployment/online acceptance, causality, clinical validity or final release readiness is claimed by these checks.

The temporary preview can be recreated using an available esbuild runtime, without adding dependencies, then inspected only through CUA:

```sh
ESBUILD_RUNTIME=/Users/kyrie/.npm/_npx/fd45a72a545557e9/node_modules/esbuild node src/native/insights/__tests__/serve-preview.mjs
```

The script reports its free local port. Append `/?fixture=mature&lang=zh&theme=dark` or use the visible example picker. The preview is synthetic and never an authenticated owner-flow substitute.

## Peer Review Follow-Up: Event Anchors

Uncommitted follow-up on parent commit `2084950`, limited to `nativeInsightsChartRuntime.ts`, `__tests__/nativeInsights.test.ts`, and this report. No parent-owned edits, new labels, dependencies, commits or deployment.

The renderer previously discarded event annotations unless their timestamp exactly matched a plotted reading. It now anchors eligible annotations to the nearest existing primary X position (earlier on equal distance), using candle X positions for candles. Marker output is time-sorted. Events outside the first/last plotted X bounds, nonfinite timestamps, and empty-series events are excluded before anchoring; future events are never clamped onto the last reading. No readings, OHLC values or source event timestamps are added or changed.

Three focused literal-renderer VM regressions cover between-reading events, boundary/empty/single-reading behavior, and candle anchoring. Before the fix, the between-reading and candle tests failed with missing markers. After the fix, **21/21 tests passed in both Asia/Shanghai and America/Los_Angeles**, running the JavaScript emitted by the targeted compiler. The emitted test used for that run was `/var/folders/95/tb247_tj4wzbw6lw6c4gqq4m0000gn/T/questlife-native-insights-test-HwlpR0/native/insights/__tests__/nativeInsights.test.js`.

Strict renderer-only typecheck passed:

```sh
./node_modules/.bin/tsc --noEmit --strict --target es2022 --skipLibCheck --moduleResolution bundler --module esnext src/native/insights/nativeInsightsChartRuntime.ts
```

Both the normal targeted runner's compile stage and repository-wide `tsc --noEmit` are currently blocked by the concurrent, out-of-scope `src/platform/deviceRepository.ts:30:66` TS2345 error (`Promise<T> | Promise<Promise<T>>` callback incompatibility). The targeted compiler emitted the test files despite that unrelated diagnostic, so the runtime results above are valid but **do not constitute a clean full typecheck**. The parent must resolve that shared error and rerun the normal runner. Owned-path whitespace validation passed. This follow-up used pure tests only; no new browser, native-device or deployment verification is claimed.
