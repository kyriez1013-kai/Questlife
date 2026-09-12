# QuestLife Native Foundation Report

Date: 2026-09-12. Scope: completion marathon Phase 0 + Phase 1 only.

**Overall gate: NOT COMPLETE.** Android native compilation and emulator execution
passed. iOS native compilation is BLOCKED by missing full Xcode. An iOS Hermes
export is not an iOS compile. Neither physical-device acceptance nor release
performance is claimed. No push, main merge, Production deployment or next phase.

## Canonical branch

- Repository: original QuestLife Git repository, not a new native repository.
- Worktree: `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`.
- Base: `9caf720`, accepted core integration lineage.
- Branch: `release/questlife-v1`.
- Tested code HEAD: `6511d0599bc4c908ead5c5ae765dd6aab0f73d32`.
- This report and QA inventory are in the final narrow documentation commit after
  that code HEAD; `git log -1` identifies the final handoff commit.
- `main` remains `c8c4387f302af5ef7dd05eaab2d177f6a000447b`.
- Original checkout remains `2c2349d`; its pre-existing untracked `docs/quant/`
  remains untouched. Other worktrees and research branches were not modified.
- The canonical worktree is committed and checked clean at handoff.

| Commit | Change |
| --- | --- |
| `4d6ff6b` | Canonical lineage and integration map |
| `8e66323` | Native identities and development-build profiles |
| `cffbda2` | Web CSS isolation and native navigation |
| `75b5e21` | Canonical Today and Capture native presentation |
| `acb385b` | Private source contracts and Health adapters |
| `0bab710` | Owned Calendar operations and foreground ingestion |
| `1b89d6d` | Deterministic quick-capture suggestions |
| `aaf3c5e` | Local native chart and artifact consumer |
| `2488b4f` | Source Settings and actionable reminders |
| `396881b` | Health permissions routing and Android compile constraints |
| `be49352` | Native runtime, keyboard and chart-selection regressions |
| `6511d05` | Native source and chart safety tests |

## Integrated assets

The [integration map](QUESTLIFE_V1_INTEGRATION_MAP.md) records exact source
branches/commits and KEEP/PORT/REJECT/RESEARCH_ONLY/DEPRECATED classifications.
The base already contains the durable assets, so blanket cherry-picks were not
necessary.

- Today: accepted `v11-today-approved` lineage; current HomeScreen handlers and
  Today command authority retained. Native material/geometry only.
- Capture: shared Universal Capture parser, structured confirmation and recording
  contracts. Native fields, keyboard and sheet adapters.
- Store: existing entity schemas, serialized local persistence and explicit
  deletion outbox retained. Only the web cross-tab listener gains a native
  capability guard. No hydrate or bidirectional sync.
- Schedule: existing compiler/domain logic with read-only external constraints.
- Quant: existing Product contracts, materialized series and runtime eligibility.
- Decision: core policy, episode, evidence, patch/apply/undo and safety retained.
- Insights: Quant artifact consumption with platform chart rendering; no new math.

## Explicitly excluded rejected UI

- `product/decision-surface-v3`: later `aa2735d` / `8169824` compact
  AdaptiveDecisionWorkspace/CSS revisions were not integrated.
- `product/insights-v5-canonical-shell`: rejected giant chart/navigation shell.
- `product/schedule-v3`: redesigned Schedule presentation; compiler assets only.
- `product/adaptive-decision-surface-v2`: demo as a normal product destination.
- `demo/interview-20260825`: synthetic demo as owner data.
- `product/installable-mobile-shell-v1`: PWA is not treated as native installation.
- Historical fixture/review infrastructure remains explicit and isolated; normal
  five-tab native navigation requires no URL parameters.

## Native and web builds

| Gate | Actual result |
| --- | --- |
| TypeScript | `npx tsc --noEmit` exit 0, latest check after final code commit |
| Web | `npm run build` exit 0; actual output `dist` |
| Android | Gradle `:app:assembleDebug`, arm64-v8a, BUILD SUCCESSFUL; 479 tasks, 1m14s |
| Android install | `adb install` succeeded on fresh API 36 emulator; native development client launched |
| iOS native compile | BLOCKED: `CI=1 npx expo run:ios --no-install` exits 1, full Xcode missing |
| iOS JavaScript | Hermes export succeeded; explicitly not native compilation |
| EAS cloud | Configuration prepared; `eas whoami` returned Not logged in; no cloud build submitted |

Web bundle: `index-743030b663af2c5cf3960fbc8ce09b30.js` (21.5 MB export artifact).
iOS Hermes artifact: `index-545af531e1e3916cad604f096dc472a0.hbc` (5.78 MB).
Android debug APK:
`android/app/build/outputs/apk/debug/app-debug.apk`.

The APK requires the development server. It is not an offline distribution or a
signed Play Store/TestFlight build. Native directories are generated and ignored;
config plugins reproduce the Health Connect delegate and minimum API 26 changes.
Both platforms use `com.kyrie.questlife`, version 1.0.0, initial build 1; EAS remote
versioning and production auto-increment are configured without invented IDs.

Local SDK/JDK were installed outside the repository:
`~/Library/Android/sdk` and `~/Library/QuestLifeToolchain/jdk/Contents/Home`.
Build used JDK 17, Android SDK 36, NDK 27.1.12297006 and CMake 3.22.1.
No shell startup files or owner production configuration were changed.

## Physical devices

| Target | Status |
| --- | --- |
| Physical iPhone native | BLOCKED: no full Xcode/signing/connected device |
| iOS simulator | BLOCKED: no full Xcode simulator toolchain |
| Physical Android | UNVERIFIED: no physical device connected |
| Android emulator | VERIFIED subset below; Pixel 7 profile, API 36 arm64, 1080x2400, density 420 |
| Web 393x852 | VERIFIED Chromium viewport; not an iPhone screenshot |

### HUMAN ACTION REQUIRED

1. Install and launch full Xcode on this Mac, finish its components/license, and
   select `/Applications/Xcode.app/Contents/Developer` as the developer directory.
2. Sign in to the owner Expo account and link this existing repository to the
   correct EAS project before any cloud build.
3. For physical iPhone: connect/unlock it, trust this Mac, enable Developer Mode,
   and choose the owner signing team with HealthKit capability.
4. For physical Android: connect a supported phone and approve USB debugging.
5. On each test phone, explicitly grant the chosen Health, Calendar and
   Notifications permissions from Settings; use a disposable Calendar for writes.
6. Select an authorized isolated HTTPS API origin for native live parse/runtime
   testing. No owner Production origin was silently assumed for this QA.

After the toolchain is installed, the repository commands are
`npm run ios -- --device` and `npm run android -- --device`. EAS profiles cover
development devices, development simulator, preview/internal APK and production.
These commands are documented, not represented as already successful on iPhone.

## Architecture and services

See [Native foundation architecture](NATIVE_FOUNDATION_ARCHITECTURE.md) for module
selection, full contract/ownership rules, dependency versions and primary sources.

- Shared: entities, Store, parser, decision/schedule domain, Quant contracts,
  navigation intent, visualFoundation semantics.
- Web: `App.web.tsx`, CSS sidecars, existing web chart/renderers and same-origin API.
- Native: React Navigation five-tab shell, safe-area sheets/controls/materials,
  typed device services and a local-only WebView chart renderer.
- Semantic token adapter: Environment / Material / Text / Border / Interaction /
  Semantic / Data. No independent screen palette or restored user color picker.
- Static audit: 318 modules, 168 reachable native modules, 0 classified CSS
  blockers. Guard/adapter classifications still require runtime QA; this is not
  proof that every historical screen or dynamic path is portable.

### Calendar

Contextual OS permissions, read/list, explicit create/update/delete/open, stable
calendar/event identifiers and persisted QuestLife ownership checks are
implemented. External events become read-only fixed Schedule constraints. The
compiler bridge does not silently mutate the system calendar or add a new
recompilation workflow. Automated permission/CRUD/dedupe/ownership tests passed.

Android emulator permission dialog was granted; readable-calendar listing
returned no calendars because no Calendar account exists on this fresh emulator.
The empty-account explanation is visible. Real event CRUD and device read timing
remain UNVERIFIED; no fake calendar was installed to claim success.

### Notifications

Local scheduling, cancel/reschedule, response actions and future push-token
interface implemented. Configurable accepted-block, actual decision follow-up,
morning-state, end-of-day and existing enabled skill reminders; global default off.
START/DONE/SKIP/OPEN use existing in-app handlers; DONE opens confirmation, never a
fabricated completed observation. SNOOZE schedules ten minutes later.

Actual Android permission prompt passed. Enabling morning reminder produced
`questlife:morning_state` in both source ownership storage and Expo's native
`SharedPreferencesNotificationsStore`. Disabling reminders removed the native
request (`<map />`) and emptied scheduled IDs. Morning preference was then turned
off. Scheduled delivery, background tap/actions and iOS categories remain
UNVERIFIED. Remote push backend deliberately not implemented.

### Health

iOS: HealthKit 15.1.0 with Nitro bindings. Android: Health Connect 4.1.3; Kotlin
bridge and permission routing compiled. Read-only normalized eight-metric
contract: sleep, steps, heart rate, resting heart rate, HRV, exercise, active
energy, distance. Source/external identity/event time/available time/recording
method/provenance are preserved; missing remains missing. SDNN and RMSSD are not
silently treated as equivalent. No medical records or Health writes.

Incremental foreground sync, bounded initial window, per-source checkpoint,
idempotent external-ID upsert, permission/partial/failure state and stale-read
disconnect guards are implemented. Local source repository and derived Context
view retain Real Data Foundation eligibility; unsupported constructs are excluded
from Quant instead of renamed. No automatic raw-health telemetry or Supabase
mirror. Real HealthKit/Health Connect smoke remains UNVERIFIED until physical
supported devices are available.

### Quick capture and charts

At most three deterministic suggestions based on real schedule, recurrence,
time-of-day, active goal and recent capture/execution. Stable ties; no LLM or
invented duration/quality. Tap enters existing structured confirmation.

One chart contract transports already-materialized line/candle/bar series,
references, indicators and comparisons. Native WebView bundles the installed
chart library locally with a typed bridge and network-blocking CSP. No Quant
statistics or OHLC reconstruction. Synthetic renderer fixture is explicit
`__DEV__` plus environment opt-in, never Store or normal navigation.

## Verification results

| Check | Result and boundary |
| --- | --- |
| Targeted native tests | 59/59 passed; Health/Calendar/Notifications/suggestions/chart contract |
| Decision regressions | 13 existing test scripts passed, including exact Apply/Undo and safety |
| Insights regressions | 4 contract/presentation suites plus feature-selection check passed |
| Five native destinations | Today, Goals, Schedule, Insights shell, Settings opened in emulator without query flags |
| Capture | Open, text entry, keyboard, close/cancel passed; no parse API configured, live parse/confirm UNVERIFIED |
| Direct Log | Custom source, editable duration, notes, skip prediction, keyboard-safe Save passed in isolated emulator |
| Persistence | QA record survived full app restart with the same ID and value |
| Deletion | Existing confirmation/delete handler removed record and derived rows; restart remained empty |
| Native chart | Line/candle/bar, long-press crosshair, pan, zoom controls, Fit and appearance exercised with synthetic artifact |
| Chart limits | Multitouch pinch, compare/indicator interaction and physical rendering UNVERIFIED; contract tests are not device evidence |
| Native state/finish | Full detailed state, active-session Finish, populated Goal/Skill operations and full pending capture flow UNVERIFIED |
| Web | Five tabs and Capture at 393x852; no horizontal overflow or browser application errors in observed paths |
| Runtime | Current app PID 7777 warning/error log empty; separate UiAutomator helper collision logged, not an app crash |

### Isolated QA cleanup

Only one test ExecutionLog was submitted through the actual native Direct Log:
`mtyjvpqfaeujl2`, note/title `QA native isolated delete`, duration 1 minute,
source `manual`. Quality and StateCheckIn were not supplied. It used a new local
emulator identity, unset API origin, sync disabled and analytics disabled.

Readback from the emulator's real AsyncStorage SQLite database verified the ID
after save/restart. Application Delete removed it. After a second restart:
ExecutionLogs 0, effortUnits 0, contributionLinks 0, StateCheckIns 0, RawCaptures 0.
Source observations/events/owned calendar IDs remain empty. Notification master
and morning reminder are off, scheduled IDs empty and native request store empty.
No owner production dataset, Supabase record or external calendar event was touched.
An existing local deletion outbox entry may remain because QA sync is disabled;
it is not a live observation and was not falsely acknowledged as a server delete.

## Performance

Environment: Android API 36 emulator, development client, Metro, software
`swiftshader_indirect` GPU on this Mac. Not release-build or physical performance.

| Measurement | Actual value / limitation |
| --- | --- |
| Cold activity launch | 4310 ms TotalTime / 4360 ms WaitTime, `am start -W`; includes dev-client startup, not complete Today paint |
| Warm foreground return | 774 ms WaitTime; Android reports UNKNOWN task foreground, not a measured React render |
| Chart model application | First fixture line 370.1 ms; fresh relaunch line 75.3 ms; candle 19.4 ms; final light bar 9.5 ms |
| Chart scope | Existing renderer onReady measures model application, not native WebView creation/compositor presentation |
| Settings scroll/permission sample | 94 frames; P50 200 ms, P95 400 ms; 93/94 >20 ms; 93 janky frames |
| Today render / Capture open latency | UNVERIFIED as isolated timings; functional UI checked, instrumentation not conflated with activity startup |
| Health foreground sync | UNVERIFIED: no physical Health source/read consent |
| Calendar event read | UNVERIFIED: no real Calendar account/events |

The emulator visibly stutters and these frame values do **not** pass a smoothness
gate. No attribution to app code versus software GPU is established. Re-measure
on release/dev builds with hardware acceleration and physical devices before
performance acceptance; no Stage 0 browser fixture numbers are reused.

## Screenshots and evidence

All evidence lives in `reports/native/`; [screenshot index](../../reports/native/SCREENSHOTS.md).
Android images are actual emulator captures, not browser mockups. Web 393 images
are Chromium viewport screenshots, not native iPhone or Safari evidence.
Build/test logs, machine-readable QA, static portability audit and npm audit are
included. Private source payloads or an owner database are not included.

## Remaining limitations

- iOS native compile/device installation, real native Health permissions/readback,
  Calendar CRUD, notification delivery/actions, physical keyboard/safe-area and
  iOS stack gestures remain open gates.
- Chart comparison/indicators are wired and contract-tested, but not visually
  verified on physical devices. No production performance acceptance.
- Goals/Schedule retain the existing RN presentation; platform-native material,
  native OS Alert appearance and density differ from web and need owner review.
- Health source corrections by identical ID are supported; source deletions,
  HealthKit anchors, Health Connect change tokens, cross-source physiological
  dedupe, nightly sleep aggregation and historical/background ingestion are not.
- Device source storage is local AsyncStorage, not encrypted/source-export backup
  or cross-device sync. Existing owner mirror remains one-way.
- Calendar reads are a bounded forward window and do not constitute full
  bidirectional calendar synchronization.
- The web export remains large at 21.5 MB. The npm audit reports 36 findings:
  0 critical, 14 high, 21 moderate, 1 low. One critical transitive dependency was
  resolved; remaining ecosystem updates need scoped compatibility review.
- Native API origin and EAS owner project are intentionally unconfigured. No
  live parser/Quant backend or distribution success is claimed.

## Next phase, not started

First close this phase's iOS compile, physical-device and performance gates.
Only then: Identity/Sync contracts and authenticated source consent; deep device
data integration (Health change/delete protocols, source reconciliation,
Calendar ownership/writeback QA and real notification delivery). No new product
redesign, models, widgets or commercialization work was started.
