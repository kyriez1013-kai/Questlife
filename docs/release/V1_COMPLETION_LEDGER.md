# QuestLife V1 End-to-End Completion Ledger

Updated: 2026-09-22. This is the single current completion checklist and resume
checkpoint for `QUESTLIFE_END_TO_END_COMPLETION.md`. Earlier phase reports are
historical evidence, not completion claims for this candidate.

## Baseline and Boundaries

- Canonical checkout: `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`.
- Branch: `release/questlife-v1`; verified starting HEAD `507d0a5`.
- Initial worktree clean; no post-HEAD edits were discarded.
- Quant checkout: `QuestLife-Quant`, `integration/multivariate-driver-v1`, clean.
- Main, historical worktrees, production owner data, and untracked `docs/quant/`
  are out of scope for destructive changes.
- Candidate deployment is authorized; replacing owner production requires
  acceptance. New fees and credentials/device consent still require the owner.

## Completion Checklist

Status vocabulary: IMPLEMENTED, VERIFIED_LOCAL, VERIFIED_REMOTE,
VERIFIED_DEVICE, AWAITING_OWNER, BLOCKED. Unchecked entries remain unfinished.

| Item | Current status | Evidence / next executable action |
| --- | --- | --- |
| Canonical worktree and branch | VERIFIED_LOCAL | Candidate source `2e1c496` on `release/questlife-v1`; checked 2026-09-22; later evidence-only commits do not change the packaged app |
| Vercel authorization | VERIFIED_REMOTE | CLI login valid; existing questlife-alpha project discovered |
| Isolated Supabase backend | VERIFIED_REMOTE | `gttcoocfkqwvsqfwxpyo` created; both reviewed migrations executed in SQL Editor; four RLS tables, six RPCs and Realtime publication verified. Existing production `gtlknzltzntfltgjvgxx` untouched |
| EAS / iOS signing | BLOCKED quota; AWAITING_OWNER signing | EAS authenticated; `cf86bef` simulator compilation FINISHED. Latest source submission rejected by Free iOS quota (reset 2026-10-01); no paid upgrade. Physical distribution needs Apple credentials and device registration |
| Physical devices | AWAITING_OWNER | Dedicated API36 arm64 emulator is connected; no physical device is connected and no physical acceptance is claimed |
| Auth and bidirectional sync | VERIFIED_REMOTE engine/HTTPS; UI/device acceptance pending | Ten hosted groups pass: real Auth/password sessions, restore, bidirectional replicas, Realtime, offline/ACK retry, deletion, isolation and authenticated Quant. Email OTP delivery and real two-device UI still pending |
| Commit-order concurrent sync | VERIFIED_LOCAL | PostgreSQL 18, separate backend connections: 10/10; delayed lower sequence, CAS, idempotent receipt/delete and RLS; no hosted claim |
| Legacy anonymous endpoint safety | IMPLEMENTED, VERIFIED_LOCAL | `/api/sync` fails closed (410); Quant verifies Supabase bearer UID; 17 backend scenario groups passed |
| Real Quant runtime | VERIFIED_REMOTE (isolated fixtures) | 9 hosted checks: authentication, subject/as-of rejection, 210-observation computation, correction hash, empty-after-removal, QA exclusion and cross-subject isolation; `reports/release/quant-hosted-verification.json`; no owner data/database writes |
| Native Today/materials/sheets | IMPLEMENTED, partial emulator verification | Standalone release opens Today S0 and State sheet; settled sheet shields background text and Cancel leaves state unrecorded. 31 component tests. Full keyboard, dark-theme and physical acceptance pending |
| Native Goals / Schedule / Settings | IMPLEMENTED, partial emulator verification | All three tabs opened in installed release; new-goal sheet opened/canceled, Day/Week visible, empty Week reads 0h. Source permissions truthfully unrequested and account validation error visible. Full mutation/device acceptance pending |
| Native Insights workspace | IMPLEMENTED, VERIFIED_LOCAL; installed retest pending | 28 tests in each of two timezones; real variable catalog and source/record/backup entrances remain available without observations. Six actual example loaders tested with native window. Duplicate bridge selections suppressed. Full installed chart acceptance remains open |
| Health / Calendar / Notifications | IMPLEMENTED, VERIFIED_LOCAL | Explicit provider deletion/correction, durable Calendar intents/reconciliation, push registration lifecycle and quiet hours; actual source samples, OS writes and delivery require device/provider gates |
| Shortcuts / deep links | IMPLEMENTED, VERIFIED_LOCAL | Open-only entries through existing handlers; 19 intent boundary assertions; Android Widget plugin passed 12 checks including native AAPT/Kotlin compilation; final installed-widget acceptance pending |
| Isolated example mode | IMPLEMENTED, VERIFIED_LOCAL; partial installed check | Native example gallery and isolation notice visible. Real loader regression found/fixed; final chart readback pending unlock. No example is written to Store/outbox/OS |
| Standalone Android release APK | VERIFIED_LOCAL build/install; latest UI UNVERIFIED | Clean `2e1c496` signed arm64 APK, 47,247,340 bytes, SHA256 `165d8774198edba877a19074f08d81f09a200dc16a1342bcca4b57fc0cee91bf`; installed hash matches, embedded JS/HTTPS, no Metro, unused permissions removed. UI readback blocked by Mac lock |
| Standalone iPhone installation | AWAITING_OWNER / BLOCKED quota | `cf86bef` simulator archive inspected, including Widget/Shortcut and backup support. Not a physical-iPhone package or final-source build. Apple signing/UDID and new build allowance remain required |
| Same-version Web candidate | VERIFIED_REMOTE deployment/API; latest UI UNVERIFIED | `https://questlife-v1-release.vercel.app`; `2e1c496` deployment `dpl_ELNRM9sQFwaRGnSnR6BG8YhA854L` READY. Bundle `index-67a4c3be12a39037b16210fc7bdc385d.js`. Eight fresh stateless API checks passed; current UI acceptance blocked by browser/Mac interaction gate. Owner production untouched |
| Record backup / restore | IMPLEMENTED, VERIFIED_LOCAL | Versioned exact-record backup, original account binding, structural validation and empty-replica WAL restore. First-launch and Settings entrances; 17 core and five file-action/entry groups; physical file-provider acceptance pending |
| Native recordings/performance | PARTIAL measurement, NOT_PASSED | CUA pointer input recovered after emulator restart. Cold launch/Insights sample on API36 host-GPU emulator: 307 frames, P50 22ms, P95 42ms, 214 histogram frames above 20ms, 43 janky. Not steady-state or physical acceptance. Mac lock now blocks final interaction/recording |

## Exact Resume Checkpoint

### Current installable source: `2e1c496` (2026-09-22)

- `release/questlife-v1` only. Latest source is pushed; owner Production is not
  promoted. The source preserves unknown actual duration/quality/strength sets,
  completes native Skill recording/library entries, and reduces duplicate native
  chart messages. No owner observation was fabricated.
- Full local regression at application-equivalent `4f40b67`: 26/26 PASS,
  including typecheck, Web export, source/account isolation and zero known
  dependency advisories. `2e1c496` only adds verification documentation/logs.
- Android `questlife-v1-2e1c496-arm64.apk` is signed and installed. Actual package
  manifest excludes broad storage/overlay permissions, excludes all 18 private
  backup/transfer domains, is non-debuggable and contains embedded Hermes JS.
  The installed APK SHA256 equals the downloadable file. LAN URL returns 200:
  `http://192.168.5.4:8096/questlife-v1-2e1c496-arm64.apk`.
- Hosted Sync: ten real HTTPS groups pass, both disposable users removed with
  zero remaining entities. No claim of email OTP or two-device UI acceptance.
- Same-source Web deployment `dpl_ELNRM9sQFwaRGnSnR6BG8YhA854L` is READY at
  `https://questlife-v1-release.vercel.app`. Actual public document returns 200
  with `index-67a4c3be12a39037b16210fc7bdc385d.js`. Eight latest API checks pass:
  live basketball/SQL40/bench82.5-5-3 input-matched parsing, retired anonymous
  endpoints and authenticated Quant/push rejection. No Store/database writes
  were made by this smoke test. Tag `v1-internal-candidate-20260922` points to the
  exact packaged source and is pushed; it does not imply owner acceptance.
- iOS final-source cloud compilation is BLOCKED by the provider Free-plan quota;
  physical signing/registration is separately AWAITING_OWNER. No new charges.
- The Mac was unlocked on 2026-09-22. Browser interaction resumed; the prior
  blanket lock blocker is superseded by the continuation evidence below.
  Native CUA screenshots work, but its pointer dispatch reports no available
  window even after emulator restart. This is an automation-control failure,
  not proof of an application failure. Alternate ADB UI control was requested
  for this isolated emulator only and has not yet been authorized.
- New-source native/screenshots/recordings/performance and Web interaction
  acceptance remain UNVERIFIED. Existing screenshots/performance below belong to
  older explicit sources and cannot be relabelled. Do not call this product
  complete or visually accepted.

### Unlocked continuation (2026-09-22)

- Candidate Web actual UI on `2e1c496`: deleted the exact SQL ExecutionLog from
  History (count became zero), then deleted its `QA SQL 学习了 40 分钟`
  RawCapture from Capture. Refreshed: no latest record, no activity returned.
  Deleted the QA-created unlinked SQL skill and the named
  `QA Release Backup Verification` goal. No owner dataset was used.
- A backup actually downloaded through Settings to
  `~/Downloads/questlife-backup-1790068949695.json`. It confirms ownerId=null;
  goals/modules/links/skills/actions/executionLogs/effortUnits/contributionLinks/
  stateCheckIns/contextLogs/rawCaptures/scheduleBlocks all zero. One structural
  category and eight system-generated daily DecisionResults remain; these are
  not claimed removed or mistaken for observations. This is local cleanup,
  not a new server-deletion test.
- The exported file was selected through the real file picker on a fresh
  `http://127.0.0.1:8097` origin. First-launch Backup opened without creating a
  goal; restore returned to Today and survived refresh. Settings shows the
  restored eight daily results plus two subsequently generated daily results.
  No state/execution observation was added. Re-export completed despite the
  control timeout: `~/Downloads/questlife-backup-1790069216073.json`. Comparison
  of all 16 record collections preserved every original record's exact JSON by
  ID, including the eight daily results and original ownerId=null. The only
  added records were two subsequently generated daily results. This is not
  claimed as a populated observation-backup test. This local build has the same application source but not candidate
  account configuration, so it is not a hosted auth/restore acceptance.
- Actual candidate Goal -> Module -> Skill creation succeeded using only a
  disposable structure: `QA Candidate Interaction` / `QA Workflow` /
  `QA Focus Review`. These were used for the verification below and subsequently
  removed using normal delete controls. No owner observations were fabricated.
- Found and fixed `a70cdcc`: an untracked module displayed 0% and its Skill
  repeated "No tracking". Presentation now uses the existing tracked/percent
  result; absent progress is not coerced to zero. Four platform/language tests
  also exercise qualitative, unconfigured time/quality/state/performance and
  a real 25% target. No progress algorithm or stored record changes.
- Found and fixed `8f56e02`: Web Goal "Record progress" led to Skill Detail
  without a recording action. Both platforms now expose the same exact-skill
  action; Web registers the existing in-app intent bus without OS notification
  services. Today still owns the actual form and save handler. Tests cover
  delayed mount, fresh callback, cleanup/account boundary and no direct writes.
- Current local regression on `8f56e02`: **26/26 suites PASS**, including
  TypeScript, Web export and dependency audit. Focused entity/intent tests:
  **35/35 PASS**. New-source candidate/installed acceptance is pending rebuild;
  do not relabel the preceding `2e1c496` artifact or screenshot as this source.
- Browser console captured no errors; existing unsupported Web push listener,
  Supabase lock deprecation and navigation-object deprecation warnings remain.
  The isolated emulator's `Test` Goal cleanup, actual native chart, performance,
  recording, physical Health/Calendar/notification and email OTP remain open.

### Actual mutation and cleanup continuation (2026-09-22)

- `cbc4585` Web candidate deployed READY as
  `dpl_A3eeZhFCHkKwvTLkmduzNqqVFWfu`, bundle
  `index-0dbc94b56fa3642dc6cb152b1259ab07.js`. The stable candidate alias remains
  `https://questlife-v1-release.vercel.app`; owner Production was not promoted.
  Eight fresh stateless API checks pass, including three live current-input
  matched parses (2.2-2.9 seconds). These are not Store-persistence tests.
- Same-source Android APK is `questlife-v1-cbc4585-arm64.apk`, 47,247,540 bytes,
  SHA256 `289c436a9e1eb10d2a59b7611b7c0cc708d37c03143ab3b2db33012a4f9ca5fa`.
  Installed APK hash matches; LAN download returns HTTP200. Native screenshot
  control works but pointer dispatch still fails with no available window.
  Installed interaction/recording/performance remains UNVERIFIED, not passed.
- Actual candidate Web Goal Detail no longer shows unsupported module 0% or
  duplicate tracking labels. Skill -> Record opens Today with the exact skill
  and goal context. Entered 1 actual minute, skipped prediction, left quality
  unknown, added `QA disposable direct-log verification saved`, then saved.
  Refresh retained the exact title, minute and note in History. This was a
  signed-out disposable candidate record, never an owner or synced observation.
  A transient input-focus control failure did not reproduce with full-text fill
  and sequential typing; no speculative handler rewrite was made.
- Schedule creation (19:00-19:25), edit (20:00-20:35) and refresh preserved the
  same QA block. The exact test ExecutionLog, ScheduleBlock, Skill, Module and
  Goal were then deleted through their normal controls. Refresh returned Today
  to no latest record/no schedule; History count was zero. A real Settings
  backup, `~/Downloads/questlife-backup-1790071996022.json`, confirms ownerId=null
  and zero goals/modules/moduleSkillLinks/skills/actions/executionLogs/
  effortUnits/contributionLinks/rescueLogs/stateCheckIns/contextLogs/
  patternMemory/scheduleBlocks/rawCaptures. The Uncategorized structural category
  and 12 system-generated daily DecisionResults remain. No claim that all local
  data or server records were deleted. Other local origins and the emulator's
  earlier `Test` Goal still require their own cleanup.
- Actual candidate screenshots checked: 375x667 Chinese/dark Today and State
  sheet; canceled without saving state. English/light Insights loaded its
  genuine zero-observation state; analyst row scrolls fully above navigation.
  English/light Today at 393x852 has no horizontal overflow. These are browser
  checks, not soft-keyboard or physical-device evidence.
- Found another real small-screen regression: Goals header buttons squeezed
  the count and hint into ellipses. `d6f05b9` stacks only that header below the
  existing 760px content breakpoint, preserving desktop layout and both actions.
  Local actual UI checked at 320px English/light, 375px Chinese/dark and
  1280x900 desktop; width equals scrollWidth. Focused entity tests **41/41 PASS**;
  TypeScript and Web export PASS. No Store/schema/handler changes. Latest
  source packaging and hosted readback follow this checkpoint.

### Active completeness correction (2026-09-22)

Continued from clean `839a3b8` on `release/questlife-v1`; preserved all later
work after the original `507d0a5`. The broad IMPLEMENTED labels above describe
code presence, NOT completed product acceptance. The following engineering work
is reopened under the original specification, not excluded as new scope:

| Spec | Missing / incomplete work | Current action |
| --- | --- | --- |
| 7-9 native product | Insights without a bundle hid workspace/source/record entrances | Implemented honest variable catalog, source/record/backup entrances; 27 tests in each timezone. New installed acceptance pending |
| 7-8 native forms | Goal/Skill actions buried; Goal Detail retained bordered stacking and an empty 0% | Implemented native disclosures, pinned actions, stable draft and durable-save retry; unframed Goal hierarchy, no unsupported empty progress, durable module/criterion sheets; Skill Detail opens the existing exact-skill recording flow; first-launch account recovery and virtualized searchable Skill Library accessible. 25 component tests. Final installed acceptance pending |
| 7-8 Settings | One long account/source/calendar/settings form | Implemented grouped index and focused existing components, permission/error distinctions, close guard during account/import work; 19 component tests. New installed acceptance pending |
| 8 Schedule | Native editing and time-axis needed correction | Implemented real-duration day geometry, empty time, overlap lanes, contextual actions, exact-operation retry and historical-time protection; 19 component tests. New installed acceptance pending |
| 8/10 Today persistence | Optimistic success was not proof of durable write; Capture confirmation unmounted before feedback | Serial local ACK/retry; raw input retained until durable, parser starts after raw ACK, confirmation/after-state/Instant Read wait for ACK, feedback reopens by capture ID. Unselected model quality and unrecorded duration/sets remain unknown, not copied from model/plan. 17 queue + 26 real Store/callback tests. WAL replay uses durable base and retains later optimistic edits/deletions |
| 11-15 external chains | Hosted/core checks passed only for their stated boundaries | Physical data, OS delivery, email OTP and two-device UI remain open, not replaced by mocks |
| 16-19 acceptance | Installed APK and tab-open checks are partial only | Rebuild same-source candidate, actual interactions/recordings/performance; visual acceptance remains owner's |

Mac is locked again as of the latest CUA readback. Dedicated emulator pointer and
on-screen keyboard taps previously worked through CUA. Installed `fc17469`: created one disposable `Test`
Goal through its actual form, opened Goal Detail, switched dark/English, opened
Schedule and used Jump to Now. This QA emulator is separate from owner data; the
temporary Goal must be removed after restart/update persistence verification.
No state observation has been fabricated. Screenshots from this build cannot be
used as proof of later `15932f8` / `b8f365f` changes.

Skill Detail correction: its primary native action now opens the existing Today
Direct Log handler with the exact Skill ID, rather than ending the Goal-to-Skill
flow on an analysis-only page. Three real recent rows lead to existing Activity
History; progress/configuration, milestones and permanent delete remain reachable
through compact disclosures. No new record writer or progress algorithm. Native
empty history does not render empty charts or achievement walls; SVGs fit their
parent and chart text uses the selected theme. Twenty-one entity/form component
tests pass, including navigation-only intent/no writes, recent-row bound,
Chinese/English, both themes and finite zero-duration chart geometry. First launch
now opens the existing AccountSyncSection in the same request-guarded Sheet,
without creating a Goal or forcing a trip through Settings. Both languages have
entry/open/close/no-write tests. These are component tests, not installed or OTP
delivery acceptance.

`9b7c3fc` Android installed successfully. iOS simulator build
`0c6e3033-2317-4c3e-bcae-42e3fa32d08f` FINISHED. Cold-launch Android sample only:
25 frames, P50 17ms, P95 48ms, six janky; too small and not steady-state, NOT a
performance pass. Rebuild after the Skill correction and finish full interactions.

Real candidate Web flow (`9b7c3fc`, signed-out isolated browser): entered
`QA SQL 学习了 40 分钟`, actual parse returned, confirmed once, B4 remained
visible, skipped after-state, refreshed, and opened the exact History detail.
This exposed an unselected model-proposed quality `4/5` being written as an
observation. Fixed confirmation to accept quality only from explicit selection;
unselected/cleared quality remains unknown. Two additional real Store/remount
tests pass (23 total); no historical owner values were rewritten. Delete was
requested for the disposable record, but the browser confirm became blocked
while Mac was locked. User was asked to resolve it. Cleanup is PENDING, not
claimed complete, and no fake state observation was created.

Actual-duration integrity correction: Direct Log and one-tap drafts no longer
prefill planned/default minutes. Selecting another schedule changes association,
not observed time. Only a finished timer prefills measured duration. Manual
required-duration forms show an inline validation state; the existing optional
strength duration can stay unknown. Store no longer substitutes linked plan
minutes when duration is omitted; its existing zero sentinel is excluded by
Quant ingestion and no prediction-time delta is computed for it. No schema or
historical data rewrite. Four pure rules/integration-boundary tests plus two
real Store/refresh/retry cases pass; local Store suite now has 25 tests.

Native Skill Library completion: replaced the native-only bordered entity-card
stack with a virtualized, searchable continuous list. Open, Edit and Delete have
separate touch regions; long names wrap, IDs remain stable across search, and
the existing create/edit/confirmed-delete flows are reused. Four component tests
cover Chinese/English and both themes (entity/form suite: 25). Web library and
Goal/Module/Skill semantics are unchanged. Installed visual/scroll acceptance is
still pending, not inferred from virtualization settings or component tests.

Recording consistency follow-up: Schedule now applies the same strict actual-time
rule as Today. Optional strength time is actually optional; required time is
labelled correctly and malformed/fractional input is rejected. Manual strength
forms no longer prefill three observed sets or replace unknown sets with one.
Partial weight/reps measurements keep their unknown set count and cannot invent
a best-volume value; an existing volume baseline is retained. Predictions keep
their distinct semantics. No historical records were rewritten. Targeted
Schedule/Store tests: 47/47; device rules: 135 in each of three timezones; types
pass. Complete 26-suite regression also passed at `5e67b53` after this correction;
forms/Settings/Schedule: 25/19/21, Store: 26, queue: 17. Rebuild the final
same-source candidate after committing these logs. The previous `2322526`
deployment and APK are intermediate artifacts, not this final correction.

Complete regression rerun at `6b8ec6d`: all 26 suites PASS, including typecheck,
Web export and dependency audit. The report identifies that exact source; these
results are local checks, not installed-device, email-delivery or visual passes.
The preceding `cf86bef` Web deployment is READY and its standalone Android APK
was signed and installed. Both will be superseded by the same-source build
including the chart bridge correction. No owner-production promotion occurred.

Final APK inspection found unused overlay and broad external-storage permissions
from Expo dependencies. The release config now blocks precisely these three;
record import uses the system document picker and export uses app cache plus the
share sheet. Calendar, Health, notifications and network permissions are retained.
Verify the merged packaged manifest after rebuilding, not only this config.
Implementation reference: Expo SDK54 `android.blockedPermissions`.
Official reference:
https://docs.expo.dev/versions/v54.0.0/config/app/#blockedpermissions

iOS cloud limit: the `3d9300f` submission was rejected because the current Free
plan's iOS build allowance is exhausted (provider reports reset on 2026-10-01).
No paid upgrade was performed. The preceding `cf86bef` simulator build
`b484aea4-4305-4748-84b5-9f58cf27dd47` FINISHED, but is not same-source final
acceptance or a signed physical-iPhone installer. Signing remains independently
blocked by owner Apple credentials/device registration.

Permission-hardening validation at `4f40b67`: complete 26/26 suites PASS.
Nineteen Settings and seventeen backup-core checks retain import/export and
source handlers; physical file-provider read/write remains unverified. Hosted
sync on `3d9300f` passed all ten groups, including both replica directions,
restart/ACK retry, deletion and isolation. Both temporary identities were
deleted and each had zero remaining synced entities. No additional owner or
signed-out browser observations were created during this validation.

The persistence correction keeps the existing whole-entity mutation semantics;
it does not silently introduce field-level conflict merging. Failed writes keep
their exact original ID/closure, later writes wait, and retry first recovers the
durable WAL. A local error is distinct from an already-durable offline outbox.
The in-memory pending overlay is presentation only, never a second data source.
No owner observations or backend records were created by these tests.

Native chart interaction cost: unchanged crosshair selections no longer cross
the WebView bridge repeatedly, and selection-only renders reuse the serialized
chart model. A 200-event same-reading test emits one selection; changed values,
returning to a reading, and redraw still deliver their correct messages. All 28
Insights tests pass in both timezones. This is a measured message-count reduction,
not a new device-frame-rate result. Final performance/recording remains blocked
by the locked Mac and physical-device access.

Current source commits: `1898cb4` ordered durability/recovery, `9d37a2b` entity
forms, `6d96e06` Settings/import request guards, `cdb6322` native Schedule,
`5dec822` Insights cold start, `15932f8` durable Today submissions, and `b8f365f`
native Goal Detail/module/criterion completion; `9342bc5` Skill recording entry,
`f8e846a` explicit-only Capture quality, `7974103` first-launch account recovery,
`b322fff` actual-time integrity, `46040cd` native Skill Library, and `2dfde01`
workflow harness coverage for virtualized rows. All 26 suites passed against
`2dfde01`, including TypeScript, Web build and dependency audit (zero known
findings). Local-mutation suite: 17 queue + 25 real Store/SyncEngine/callback
tests; forms, Settings and Schedule: 25 + 19 + 19; native workflows: 68.
Hosted Sync also passed all 10 groups against this source, with both disposable
accounts removed (`cleanup: [true,true]`). Evidence is in the tracked local
verification summary and hosted-sync report, not a claim of physical UI testing.
Installed testing must use the next build.
CUA soft-key taps now enter native text; direct desktop text injection still
does not reach the Android field. No draft was saved during that input check.

Current browser interaction gate: while Mac remained locked, Direct Log, State
and Goals navigation clicks in the second candidate tab all left the visible
page unchanged. No console error was captured. This does not isolate an app
regression and is not a passed interaction check. Resume after unlocking and
resolving the first tab's disposable-record delete confirmation. Do not create
additional test observations until this known record can be cleaned up.

Continue this checkout, not the historical Web branches. Do not repeat backend
setup. Hosted Sync verification was rerun against the isolated candidate:
10/10 groups passed and both disposable auth users were deleted (`cleanup:
[true,true]`). iOS simulator build `24f5b7a0-faa3-4171-9dd0-e9fb78c071d5`
FINISHED for `fc17469`; this is not a signed physical-iPhone build. After the
final source rebuild, finish native Capture/Record/keyboard, examples, widget and
steady-state performance checks using CUA. Keep Web/Android/iOS source aligned.
Historical entries below are evidence, not a queue to restart.

## Human Actions (Consolidated, Live)

0. Unlock the Mac to resume the currently blocked browser/emulator verification
   and exact disposable-record cleanup. This is not an app regression diagnosis.
1. Supabase creation is complete. Email OTP delivery still needs a real permitted
   recipient/provider configuration; the disposable password-auth test does not
   establish SMTP delivery. No email service or paid subscription was invented.
2. Complete Apple Developer sign-in and internal distribution/device registration
   when the internal iPhone build is resumed. No active waiting credential
   terminal is assumed; EAS login itself is already verified. New iOS cloud
   builds also need the free allowance reset (2026-10-01) or an explicitly
   owner-approved plan change; no purchase was made.
3. Physical iPhone/Android Health and notification permission and real-device
   visual/performance acceptance. These cannot be replaced by emulator results.
4. Native high-frame-rate recording is not exposed by the current CUA tool.
   Pointer input is working after emulator restart; text input is being retested
   on the rebuilt candidate. Alternative ADB/UIAutomator input and recording
   authorization remains unanswered; no alternate UI path was used. Screenshots
   or a screenshot sequence will not be called a continuous native recording.
5. Remote push requires a candidate Firebase application / FCM v1 credential
   and Apple APNs signing. EAS credentials inspection confirmed neither is
   configured; no provider credential or paid service has been fabricated.

## Current Provider / Reference Evidence

- Quant: commits `27690c1`, `ff1429f`; deployed candidate service is a new project,
  not the owner Web deployment. Production-owner data was not uploaded. The
  concrete Python handler discovery correction succeeded on the hosted builder.
- Quant hosted empty request: 1392 ms observed end-to-end for one request, not an
  SLA or populated-data performance measurement. No cache/persistence writes.
- Figma `J51kDHRfrtRg2m56guVDBz` node `21:3` is one RECTANGLE with IMAGE fill,
  no children. It is a screenshot reference, not editable screen components or a
  reusable design system. Existing native primitives remain implementation source.
- Full TypeScript check passed at 2026-09-20 intermediate integration point;
  rerun after remaining concurrent edits and dependency maintenance.

No owner fake observation has been created for this run.

## Integration Findings Being Closed

- Transport now pins its bearer to the server-verified dispatch owner before any
  server write: `6a9eab0`, 17 focused tests passed (including switch/timeout/retry).
- Explicit provider health deletions must enter Sync V2, not remain device-only.
- Device journal needs cross-context serialization; notification planning must
  re-evaluate current time rather than abort on an expired foreground reminder.
- Chart event markers between observations must retain their real timestamp.
- Web Settings must not claim legacy anonymous upload or display the old version.

These are not accepted residual limitations. Corrections and focused tests are
in progress before final release build. Local browser QA uses a fresh
`localhost:8095` origin with visibly QA-named goal/module/skill only, no state or
execution observations. Those temporary structures must be removed before closeout.

## Latest Executable Work

- Calendar: retain export mappings outside the read cache, persist explicitly
  confirmed device operations before OS calls, reconcile crash/retry using exact
  non-sensitive markers, and expose pending/review state. Never infer deletion
  from absent events or automatically apply an unconfirmed remote edit.
- Candidate hosting: isolated `questlife-v1-release` build in progress. A new
  `.vercelignore` excludes native build directories, private env, reports, and all
  docs (including the out-of-scope quant directory) from hosting uploads.
- Final integrated build must replace intermediate APK/simulator source snapshots.
- Dependency scan now reports zero known advisories after four scoped overrides.
  A full export exposed image-size v2 filename incompatibility missed by the
  initial buffer-only smoke probe; a version/callsite-guarded postinstall patch
  plus actual Metro filename-export tests resolve it. No Expo SDK major upgrade.

## Integrated Candidate Checkpoint (2026-09-20)

- Continued actual worktree at `19399f7`; all later edits retained. Narrow commits:
  `70cdb03` dependencies/export compatibility; `ed09a36` device services/push;
  `f89aadc` durable record ACK/provenance; `47e2419` native workflows/launch entries.
- Current local regression: all 20 suites PASS, including TypeScript, Web export,
  130 device-service tests in each of three timezones, 38 Sync V2 tests, 19 SQL
  checks, 10 real PostgreSQL concurrency groups, 12 PostgreSQL push groups,
  14 push integration groups plus 8 core groups, 6 Health-delete boundary groups,
  17 auth groups, 59 platform tests, 19 shortcut checks, 12 Android widget checks,
  21 native Insights tests in each of two timezones, 76 native workflow tests,
  31 material tests, adaptive decision/theme suites, five actual Metro asset
  tests and npm audit. Logs: `reports/release/local-verification/`.
- Record submit now waits for durable persistence before closing or clearing the
  timer; repeated submits/retries retain the original ID and fields. Failed
  writes retain their retry closure; a recovered WAL is checked before replay.
  Timer timestamps are actual start/end; one-tap plan completion opens a draft,
  not a fabricated observed duration/quality. Source changes clear hidden links.
- Deletion no longer resets manually entered skill progress to zero. Only known
  applied additive contributions are reversed. Historical non-invertible skill
  aggregates without a baseline receipt are retained, not falsely reconstructed;
  deleting a record does not prove these legacy aggregates can be reversed.
- Calendar mappings survive read-cache changes/disconnect. Explicit confirmed
  intents persist before OS writes and reconcile by exact operation marker;
  failed/unknown/remote-changed results are visible for review/retry. No automatic
  remote-to-device write or title-based matching.
- Native export now creates a real JSON file and invokes the OS share sheet,
  rather than sending a large JSON string. Old feature-owned cache files prune
  on a later export. Actual receiver delivery is not claimed.
- iOS Shortcuts and two open-only Widgets are generated through an idempotent
  config plugin. Two actual iOS prebuild runs preserve exactly one target/source
  each. New Swift source still needs cloud compilation and installed acceptance.
- Push coordinator now consumes `syncDevicePushRegistration` on lifecycle/token
  changes; driver checks `matchesCurrentPushRegistration` before test-push display
  or handling. Earlier worker reports saying this was missing are superseded.
- File import/restore gap is now implemented (see latest checkpoint below).
  Export is not a full device backup (no credentials, raw Health repository,
  permission state or sync journal). Physical file-provider acceptance remains.
- Local Web QA on isolated `localhost:8095` created one visibly QA-named goal,
  module and skill; skill was deleted. Goal/module deletion awaits the pending
  irreversible-delete confirmation. No fake state or execution observations.
- Need final same-source Android build, iOS cloud compile, candidate deployment
  and hosted stateless smoke rerun. Owner Production is not being promoted.

## Latest Remote / Database Checks

- Candidate `/api/parse`: three actual DeepSeek requests returned HTTP200: basketball
  with unknown duration, SQL with 40 minutes, bench with 82.5 kg / 5 reps / 3 sets.
  Responses correspond to their current raw input. Stateless disposable text only;
  no Store/database writes and no UI confirmation/persistence claim.
- Candidate retired `/api/sync`: HTTP410. Valid unauthenticated Quant and push
  request bodies: HTTP401. Invalid bodies reject separately with HTTP400.
- Native PostgreSQL18 push migration: 12/12 groups, disposable socket-only cluster,
  real RLS/RPC enforcement with fixture identity claims. Not hosted Supabase auth.
- Expo SDK54 dependency compatibility check passed. Static native portability:
  371 modules, 215 native reachable, zero classified blockers. This does not
  replace actual interaction testing.
- Known credential-pattern scan: 621 text files, zero hits; restricted quant docs
  excluded. This is not a comprehensive security audit.

## Hosted Backend and Backup Checkpoint (2026-09-20)

- Isolated database migrations `202609180001_sync_v2.sql` and
  `202609200002_device_push_boundary.sql` were actually applied through the
  authorized Supabase SQL Editor. CLI migration-history tracking was not used.
- `scripts/verify-hosted-sync.mjs`: ten groups PASS, using the real SyncEngine
  with HTTPS Supabase Auth and database/Realtime operations. Two disposable
  identities were deleted; remaining synced entities zero. Read-only SQL checks
  also confirmed no earlier-run users/entities/receipts/cursors/devices remained.
- Service-role SELECT was intentionally not widened for test cleanup. Exact
  disposable user JWTs verify own-row absence after admin account deletion.
  No credential is committed; public/admin config lives in private local files.
- Realtime needed a 30-second cold-event deadline; the first 15-second trial
  timed out. Two subsequent complete runs passed. Cursor pull also recovers a
  change made while the subscription is disconnected; no latency SLA claimed.
- Candidate authenticated Quant proxy returned a real subject-bound empty
  artifact and rejected another subject with 403. This is not a populated
  physical Health-to-Quant verification.
- iOS virtual Xcode group path `undefined` fixed without changing source folder
  layout. Eight Swift/localization resource paths validated after two prebuilds.
  Cloud build FINISHED; this supersedes the earlier uncompiled Swift limitation.
- Backup: exact typed envelope, no runtime code generation, no fake defaults,
  original account restriction, durable projection recovery, remote tombstone /
  newer-value protection. See `RECORD_BACKUP_CONTRACT.md`.
- Actual candidate UI disclosed a first-launch constraint: Today creates a
  decision record, so Settings alone is too late for empty-replica import. The
  same recovery component is now available before leaving onboarding. No
  automatic deletion or relaxed overwrite guard was introduced.
- Full regression passed 21 suites after the isolated Settings test harness was
  updated for the new native file-picker boundary. Final first-launch entry
  additionally passed all 66 native workflow checks; final export still follows.

## Email Link and Current Acceptance Checkpoint

- Backup and hosted verification committed as `050abae` and `301dfe8` and pushed
  only to `release/questlife-v1`. All three configured `301dfe8` builds completed.
- Actual Supabase candidate UI exposes a default Magic Link email template,
  while the earlier app accepted a numeric code only. Editing that template is
  restricted to custom SMTP/paid service/hook configuration. No paid plan was
  selected, no SMTP credentials invented, and no owner account was modified.
- Added the official SDK PKCE one-time-link exchange alongside numeric OTP.
  Exact callback matching, S256 native Expo-crypto bridge, duplicate-delivery
  protection, error-only callbacks, session events and listener disposal are
  covered by seven tests. API responses are mocked in these link tests; they do
  not prove SMTP delivery or installed-Hermes behavior.
- Candidate callback configuration still awaits the specific confirmation:
  Site URL `https://questlife-v1-release.vercel.app`, redirects restricted to
  that root and `questlife://auth/callback`. No wildcard/owner-production URL.
  Without provider configuration and a permitted recipient, real email-link
  delivery remains UNVERIFIED even when the SDK tests pass.
- Latest full local run: 22/22 suites PASS, including typecheck, Web export,
  known-advisory audit and the new link tests. New native host test doubles were
  added to the auth/push tests; Health runtime test stubs include the link
  lifecycle. These are environment adapters, not weakened product assertions.
- Hosted rerun first reproduced a Realtime timeout after channel join; that
  failure and its successful exact-account cleanup are retained in
  `reports/release/hosted-sync-channel-join-timeout.json`. The test now waits for
  `system.extension=postgres_changes, status=ok` before making the measured
  mutation, as distinguished from channel `SUBSCRIBED` by the official
  [Realtime protocol](https://supabase.com/docs/guides/realtime/protocol).
  All ten hosted groups then passed, with both disposable accounts deleted and
  zero remaining entities. Existing foreground/periodic cursor pulls remain
  the correctness path; Realtime remains a wake-up hint, not a data transport.
- Real Chrome candidate UI: first-launch Backup and restore entrance visible;
  Today/Goals/Settings navigated, one local `QA Candidate Backup Roundtrip` goal
  created, no state/execution observations. Backup confirmation opens, but the
  automation dialog accept timed out and no downloaded file was found. Actual
  file roundtrip is UNVERIFIED. This QA goal and earlier IAB QA structures still
  require explicit cleanup; no sign-in/cloud upload was performed.

## Device Backup Boundary Checkpoint

- Email-link implementation and hosted readiness verification are committed as
  `32f7d2d` and `5fd8d70`, pushed only to the release branch. All three `5fd8d70`
  intermediate builds completed: signed Android APK; iOS simulator build
  `f222b5d8-93ee-4388-a509-969f7885551f`; candidate Web deployment
  `dpl_CDqA2eYaxcigUToio7TMcbcZRmUC`. Android APK installation on the dedicated
  `QuestLife_V1_ReleaseQA` emulator succeeded. Installation is not a UI pass.
- Package inspection found Android's default automatic backup enabled. Device
  IDs, source journals and unacknowledged sync operations must not be cloned by
  OS restore. A scoped config plugin now disables automatic backup and excludes
  all private domains from Android 12+ cloud backup and device transfer. The
  SecureStore plugin delegates backup configuration to this single policy.
  Account sync and explicit record-only backup remain the supported recovery
  paths; no stored record, schema or user permission was changed.
- Three focused tests verify idempotent manifest configuration, preservation of
  activities/permissions, and all-domain exclusions for both transfer modes.
  Actual Expo Android prebuild generated the intended attributes and XML.
  Final APK resource compilation and installed flags still need verification.
- Installed iOS AsyncStorage source excludes its data directory from OS backup
  by default; the generated Info.plist has no opt-in override. This is source /
  build-configuration evidence, not a physical iCloud restore acceptance test.
- Full local regression after the backup change: 23/23 suites PASS, including
  TypeScript, Web export and dependency audit. Logs remain under
  `reports/release/local-verification/`; rerun on the committed code before
  building the final same-source artifacts.
- Candidate browser backup confirmation was retried through the supported UI
  tool and again failed at dialog handling. No file roundtrip pass is claimed.
  Pending callback-allowlist and dedicated-emulator control confirmations were
  grouped in one request; no unauthorized alternative UI path was used.

Next: commit this backup guard narrowly, record its clean-source regression,
build and inspect the matching Android/iOS/Web candidates, then continue actual
UI/file tests when input is available. Do not touch `docs/quant/` or Owner
Production.

## Web Startup Payload Correction

- Actual Web export measured a 22,307,402-byte entry bundle. The historical
  `V11InsightsScreen` statically brought all of its V0.4.x and interpretation
  fixtures into ordinary app startup, even when its debug route was unused.
- Reused the existing `React.lazy` / Suspense route pattern for that screen.
  No fixture, Quant calculation, Store behavior or navigation option was removed.
  Fresh export entry is 4,371,601 bytes (987,031 gzip), an 80.4% reduction before
  compression. The 17,935,908-byte historical workspace is a separate deferred
  chunk, not falsely described as deleted or optimized internally.
- A TypeScript-AST boundary test guards against reinstating the static import;
  all 24 local suites pass after this change. Clean-source rerun and final
  matching artifacts follow. Bundle size is not a device frame-rate measurement.
- Candidate `a041cac` remote sync rerun passed all ten hosted groups; both
  disposable identities were deleted and own-row counts are zero. Actual
  stateless capture parsing passed basketball, SQL 40 minutes and bench
  82.5 kg / 5 reps / 3 sets. This does not establish UI record persistence.
- EAS Android credential inspection for this candidate explicitly reports no
  credentials configured. Local APK signing is independent and verified, but
  FCM v1 / Android Firebase application configuration is absent; APNs still
  requires the Apple account gate. Remote notification delivery is not verified.
  No new paid service, provider credential or Google project was created.

## Actual UI Regression Found and Fixed

- Candidate mobile browser QA found Today rendering without its approved layout:
  `v11-stage2-rebaseline.styles.web.ts` imported its own `.styles` entry instead
  of the CSS file. This predates the lazy-load correction; it reproduced on the
  `a041cac` hosted bundle. Commit `8addd88` restores the CSS import without
  changing Today markup, handlers or native rendering.
- The boundary test now checks every Web style adapter loads an existing CSS
  file and its native counterpart remains CSS-free. All 24 local suites passed
  again on the fix. The actual exported HTML now links the rebaseline stylesheet.
- Real browser at 375x667: repaired Today layout, Capture entrance, current-state
  update and L2 remain usable; DOM width and scrollWidth are both 375. No state
  or execution was saved. The pre-fix hosted QA also opened all five tabs,
  goal detail and Insights custom range. Browser error logs contained no runtime
  errors, but did include existing web-notification and SDK/navigation
  deprecation warnings. Final hosted same-source visual confirmation follows.
- Fresh local Chrome origin onboarding was completed with no goal/state/action
  samples. Today can create its normal automatic DecisionResult; this is not
  evidence of user observation input or successful cloud sync.

## Sheet Readability and Final Regression

- `a00f1dc` raises the shared Web interaction-sheet surface to 98% of the
  existing elevated token in both themes, with an opaque CSS fallback. The
  directional edge/shadow, form layout and callbacks are unchanged. This fixes
  actual light-theme background Today text remaining legible through the form;
  it does not assert that portal backdrop blur works on every browser.
- Actual Chrome local export checks: Chinese/light at 393x852 and 375x667;
  English/dark at 375x667 and 1280x900. Record Progress opens, cancels and scrolls;
  at 375 the footer is y=582..659 and document width equals 375. At 1280 the
  footer is 640px wide and remains in viewport. No observation was submitted.
- English 1280x900 Insights loads its asynchronous workspace and exposes
  watchlist, Custom, Indicators and Analyze with zero observations and no
  fabricated baseline. Screenshots were inspected in the browser tool; no
  native recording or physical keyboard result is claimed.
- Full local regression on clean source `a00f1dc`: 24/24 suites PASS, including
  TypeScript, Web export and zero known dependency advisories. The Web boundary
  suite now includes three checks (lazy fixtures, platform CSS imports and
  theme-independent sheet shielding).
- Backup confirmation/file roundtrip, native installed interaction, device
  frame times, real permission/source samples and email delivery remain
  UNVERIFIED. Existing three QA-only browser structures remain local and
  signed out; their cleanup is not falsely reported as complete.

## Final Hosted Schedule Finding

- Actual empty Week view exposed `Total Planned 1h` while each day correctly
  showed zero blocks. The header used the plot's minimum 60-minute scale as its
  reported total. `be8e799` separates the existing displayed-date sum from the
  chart denominator; empty means 0h, and a 135-minute week displays 2.3h.
  No scheduling mutation, duration default or calendar write was changed.
- Two new rendered-component tests cover empty and populated weeks, exclusion
  of a block outside the displayed dates, and unchanged source records. The
  native workflow file passes 68 checks. These are mocked component checks;
  actual hosted 0h readback follows the final deployment.
- The preceding clean `ed2b7e9` candidate completed Android signing/install,
  Web deployment `dpl_8ibr9ifStyJQzYMLMpHpkF3UovRe`, and iOS simulator cloud
  build `177f7a4d-2428-41f7-afee-38a5483ad9e8` (FINISHED). This is an intermediate
  artifact after the newly found display fix, not the final iPhone installer.
- The same candidate passed ten hosted Sync V2 groups and eight API checks;
  both disposable identities were deleted with zero remaining synced entities.
  The display-only correction does not change these endpoints or Sync V2.

## Installed Android Findings and Same-Source Candidate

- Native CUA pointer control recovered after restarting the dedicated emulator.
  This supersedes the earlier blanket native-input blocker. Actual installed
  release screens inspected: Today S0, Goals, new-goal form, Schedule Day/Week,
  Insights, example gallery, Settings and the State sheet. The empty Week total
  is visibly 0h. State Cancel returns to an unrecorded Today. No fake owner
  observation was saved. Calendar/Health remain explicitly unrequested and
  disconnected, not reported as integrated real-device data.
- The first installed example load failed. `insightsV3Source.debugEnabled`
  assumed any global `window` had `location.search`; React Native has `window`
  without browser location. `2d4f365` checks the capability before optional Web
  diagnostics. Contract/provenance validation remains mandatory. A new test
  invokes all six actual example loaders under native window semantics; all
  22 Insights tests pass in both timezones. No copied answer/model was added.
- The corrected clean-source Android package is
  `reports/release/build-output/questlife-v1-2d4f365-arm64.apk`, 47,203,520 bytes.
  SHA256 `93dc9dd37251fa218fb017deeed8c0ba7cc665e8cba9ef2da12fa6b79b0cbf88`.
  It is installed as a non-development release with embedded Hermes code and
  HTTPS candidate configuration. Dedicated v2 signing, no automatic backup,
  no debuggable flag and 18 explicit cloud/device-transfer exclusions verified.
  LAN download returned HTTP200:
  `http://192.168.5.4:8096/questlife-v1-2d4f365-arm64.apk`.
  The Mac is needed for this LAN download only, not subsequent app operation.
- Full local regression on `2d4f365`: **24/24 suites PASS**, including full
  TypeScript, Web export, native loaders, sync, PostgreSQL, materials and
  dependency audit. No known advisories. Exact known-private-value scan covered
  1,079 tracked files (excluding restricted quant docs), zero matches; not a
  comprehensive security audit.
- After reinstall, Today launched and the example gallery opened again.
  The Mac locked before final chart readback; the corrected chart must not be
  called visually passed. Android text entry also remains unverified: the
  handwriting tutorial intercepted input and CUA clipboard access timed out.
  No Goal was submitted. The settled State sheet was readable and shielded
  background text; the first transitional screenshot is not its resting state.
- Android gfxinfo captured a cold-start/Insights-selection sample, not a
  controlled steady-state benchmark. Latest sample: 307 rendered frames,
  P50 22ms, P95 42ms, 214 histogram frames over 20ms and 43 janky frames.
  Earlier shorter capture was P95 65ms. Host builds were running concurrently.
  Performance is **NOT_PASSED**; full loaded-chart/scroll/sheet/dark-mode
  measurements and physical device results remain pending. See
  `reports/release/android-runtime-sample.json`.
- iOS `dce40c5` simulator build `40774dd7-aaed-43f7-a845-03900137d992` finished.
  Corrected `2d4f365` build `ee893fd4-b0e0-44c5-9138-ba374db228f3` also FINISHED
  with actual EAS preview account configuration. Downloaded archive is
  21,253,763 bytes; SHA256
  `2d121b9ba675b70c8c00e3b0144d2ebda6000c97e8c845ad23dd0113ab10989e`.
  Verified `iPhoneSimulator`, `com.kyrie.questlife` 1.0.0, embedded JS/HTTPS,
  compiled Widget extension and AppIntent metadata. See
  `reports/release/ios-artifact-verification.json`. This is not a physical-iPhone
  installer; owner Apple credentials/UDID remain required.
- Browser backup/restore roundtrip, installed
  example chart, native mutation/keyboard flow, widget interaction and native
  recordings remain **UNVERIFIED** until their actual UI results are obtained.
  Candidate/local signed-out QA structure cleanup is still pending the earlier
  irreversible-delete approval; no owner data was substituted or cleared.
- Corrected-source Web deployment is READY:
  `https://questlife-v1-release-dqxp3nfke-kyrie-z-s-projects.vercel.app`, deployment
  `dpl_5UmvnH2V9UMCrKH3dbFrm2wSvntC`, stable alias
  `https://questlife-v1-release.vercel.app`. Actual root returns HTTP200 and
  references `index-7fe15de824160f79433928f92672276d.js` plus the restored
  `v11-stage2-rebaseline-6c62154b66e1190f5df8eaabd014eae0.css`. Fresh eight-check
  API smoke passes, including three real current-input-matched DeepSeek parses
  (2.4-2.7s each in this run), retired anonymous writes and authenticated endpoint
  rejection. These were stateless requests, not native/UI persistence tests.
- Fresh hosted sync rerun on `2d4f365`: **10/10 PASS**. Exact disposable users
  `2e04d9d1-33f7-4916-9593-d42cbf38e53b` and
  `f7b0c4a1-77d7-49a8-a870-1688d9ee1940` deleted, each with zero remaining synced
  entities. Real Auth/password, session restore, both replica directions,
  Realtime, offline restart, lost ACK, tombstone conflict, RLS, push binding
  (not delivery) and subject-bound Quant checked. Email OTP and two-device UI
  are separate outstanding tests.
- Browser control remained available while native Mac UI was locked. Final
  hosted readback: all five tabs load; Week displays 0h; existing signed-out
  QA goal remains; Insights watchlist/Custom/Indicators/Analyze load with absent
  baseline and no invented data. At 375x667, width equals scrollWidth=375.
  English/dark Insights and Chinese/light Capture screenshots inspected.
  Capture text entered, cleared and canceled without parsing/saving. At
  1280x900, Record Progress opens with sticky footer and no horizontal overflow,
  then cancels. Browser viewport reset; candidate tab left available.
  Console errors: none captured. Existing web-push unsupported, Supabase lock
  deprecation and navigation-object deprecation warnings remain.
- Source is pinned by non-forced tag `v1-internal-candidate-20260920` at
  `2d4f365`; later documentation/report commits do not alter built application
  source. This tag is an internal candidate, not final acceptance or promotion.
