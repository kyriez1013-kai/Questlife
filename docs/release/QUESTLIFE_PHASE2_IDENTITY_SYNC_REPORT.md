# QuestLife Phase 2 - Identity & Sync Report

Date: 2026-09-18. Status: **LOCAL ENGINEERING VERIFIED; LIVE ACCEPTANCE BLOCKED**.
This is not a claim that Phase 2's real two-device definition of done is met.
No Phase 3 implementation, push, production deployment or owner cloud writes.

## Git

- Canonical checkout: `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`.
- Branch: `release/questlife-v1`.
- Start HEAD: `9cd832235d4057f4fb1918c4f6f8c617bc1a9574`.
- Preserved local tag: `v1-phase1-native-foundation` -> start HEAD.
- Final implementation HEAD: `e19ef83`; report/evidence commit follows it.
  The final documentation commit is reported in the task closeout (a document
  cannot contain its own commit hash).
- Main remains `c8c4387f302af5ef7dd05eaab2d177f6a000447b`.
- No historical branch deletion or force-push; only named paths staged.
- Working tree is checked again after the evidence commit.

| Commit | Scope |
|---|---|
| `6a8bec4` | V1 audit, architecture, Phase 1 boundary |
| `3fdbf35` | Auth, SecureStore, installation identity |
| `e538b15` | SQL schema, RPC, RLS tests |
| `11ff83f` | Durable outbox/pull/hydration/conflicts |
| `8395936` | Health partitions/checkpoints, source ownership |
| `6d5ece4` | Store lifecycle, remote projection, notifications |
| `460f060` | Account/Sync/consent/conflict UI |
| `0e65d83` | Health timestamp recovery, Calendar linkage |
| `05ee382` | Retry ordering, WAL, stale-edit and replica safeguards |
| `e19ef83` | Honest status and separate local-clear confirmation |

## Identity

**VERIFIED (implementation + isolated tests):** Supabase Email OTP through
AuthService, session restoration abstraction, expiry/sign-out invalidation,
fail-closed account binding. UI masks email. No token is returned to screens.

Native tokens use SecureStore with generation-addressed chunks, switched by a
manifest after writes. Web uses supported browser localStorage persistence, not
an HttpOnly cookie. Browser XSS can therefore read a session; no stronger security
claim is made. Device ID is a persistent random `platform:UUID`, not analytics ID.
Registration includes platform, version and last seen; display name is optional.

**BLOCKED:** actual OTP delivery, verification, refresh-token expiry and native
SecureStore session restoration against hosted Supabase. This checkout has no
authorized public project config or migration connection. A test project/email
was requested; none was provided during this run.

## Remote schema

New versioned migration, separate from untouched anonymous mirror tables:

- `questlife_sync_entities`: user/type/id identity; JSON payload, schema,
  revision, ordered change sequence, origin device and tombstone.
- `questlife_sync_cursors`: user-level sequence and transaction lock.
- `questlife_sync_receipts`: immutable mutation request/result for idempotence.
- `questlife_sync_devices`: per-user device registration.

RLS restricts own-row reads. Direct entity writes are not granted; the authenticated
RPC owns revision/sequence/receipt atomicity. Its owner is `auth.uid()`, never a
caller-supplied user ID. The per-user lock precedes sequence allocation and is held
until transaction commit. Delete is a revisioned, sequenced tombstone.

**VERIFIED:** 19 checks in actual PostgreSQL WASM/PGlite, including cross-user
select/update/delete denial, own-row RPC writes, stale revision conflict,
duplicate receipt, changed retry rejection, contamination and signed-out denial.
PGlite tests are NOT hosted Supabase, JWT validation or concurrent remote load tests.
**BLOCKED:** hosted migration/RLS/Realtime verification. No remote schema was changed.

## Sync

Durable AsyncStorage journal precedes projection; pending projections replay after
failure. Store applies remote changes without enqueuing them again. An observed
base revision protects edits queued during a remote write. Initial attach unions
disjoint IDs, dedupes identical records and preserves same-ID differences as
conflicts. Legacy repair is bypassed for authenticated partial projections so
missing intermediate relations do not create phantom entities.

Push: one head per entity, max 50 per batch, 500,000 UTF-8 byte budget; stable UUID
receipts; successors advance only after ACK. Rejected heads do not permit later
edits to overtake them. Pull: ordered cursor, pages of 200, payload validation,
quarantine for malformed records. Lost ACK followed by another device's edit does
not skip the newer remote row. Timeout 20s; exponential retry 1-120s with foreground
15s tick. Auth, launch, AppState, local debounce, web online, Realtime and manual
Sync Now are triggers. No browser API is needed by the core engine.

Health consent is separate from account sign-in. Sign-out keeps data and stops
sync. Confirmed local-clear is separate and guarded against unsynced edits/conflicts;
it emits NO cloud delete, stops Health reads, retains account binding and permits
rehydration by the same account. Migration recovery backups remain. This is neither
secure erasure nor an account-switch migration. A clean profile/install is required
to use a different account safely.

Legacy mirror remains available only via explicit opt-in environment configuration.
No silent old-table import, cleanup or ownership transfer was attempted.

## Conflict handling

Remote stays canonical; complete conflicting local mutation chain is retained.
Settings offers an inspector and explicit keep-remote / submit-local resolution.
Submitting local creates a new mutation against the current known revision; later
remote changes can conflict again. Logs with equal IDs/different payloads do not
get arbitrary field merges. Tests cover simultaneous edits, offline edits,
initial same-ID conflicts, ACK-loss races and resolution.

## Exact entity registry

`goals`, `categories`, `modules`, `moduleSkillLinks`, `skills`, `actions`,
`executionLogs`, `effortUnits`, `contributionLinks`, `rescueLogs`, `stateCheckIns`,
`contextLogs`, `decisionResults`, `patternMemory`, `scheduleBlocks`,
`rawCaptures`, `healthObservations`.

Raw captures require confirmed domain-record lineage. Settings, telemetry, draft
captures, UI/cached suggestions, OS notification IDs and external Calendar events
are excluded. Recursive provenance/fixture checks exist on both client and RPC.
Registry validates required transport/domain fields; optional domain semantic
validation remains less complete than a full schema for every entity field.

## Health

Eight unchanged normalized metrics: sleep, steps, heart rate, resting heart rate,
HRV, exercise, active energy and distance. Provenance includes external identity,
event/availability/import timestamps, source platform, app/device where available,
method and explicit limitations. Missing values do not become zero records.

Health is stored in 128 ID-hash partitions, not AppData. A single sample update
rewrites one partition. Phase 1 inline records have a backup before migration.
Old importedAt absence is recovered from stored first availableAt with an explicit
limitation, never from today's time. Initial/recovery OS read is seven days;
subsequent metric-specific checkpoints use one-day overlap. Partial/denied reads
do not advance failed metric checkpoints. Full-fidelity transfer is bounded to
100 new rows/cycle, max 200 Health rows queued; no invented aggregation/retention.

**VERIFIED, Android emulator:** OS Health Connect permission screen, grant,
native API reads for all eight metrics, honest empty result (0 imported), persisted
metric checkpoints and subsequent read after force-stop/cold-start. No samples
were inserted into Health Connect. Screenshot below. This does NOT verify actual
wearable samples, source devices, real permission revocation or physical devices.

**VERIFIED, isolated tests:** normalization, dedupe, partial/no permissions,
empty data, Health consent, remote hydration, 10k HR partition workload.
**UNVERIFIED:** physical HealthKit/Health Connect reads and hosted Health transfer.

## Calendar

External events are not canonical QuestLife cloud records. Permission, ownership
and explicit confirmation stay in the existing service. Missing availability is
`unknown`, not inferred busy. Stable provider IDs dedupe when actually available;
matching titles never imply equal identity. Expo's driver currently returns local
calendar/event IDs, so real cross-device provider identity is **UNVERIFIED**.

Explicit `createForBlock` preserves device-local ScheduleBlock linkage, updates an
already-linked owned event on repeated export, and requires confirmation. Linkage
survives refresh. It is a service path; no new Schedule export UI is added.
Remote Schedule hydration never invokes OS calendar creation. Cross-device global
Calendar duplicate avoidance cannot be claimed without provider IDs.

## Notifications

OS scheduled IDs remain device-local. Underlying ScheduleBlocks sync. Existing
device reconciliation cancels obsolete reminders and schedules changed intents.
**VERIFIED, tests:** remote move cancels prior notification/schedules new;
tombstone cancels. Physical delivery, time-zone transitions and OS background
restrictions remain **UNVERIFIED** in this phase.

## Validation

Final web bundle: `index-68da66016ed598bb8833fc3c4b5c4cbb.js` (21.8 MB), output
directory `dist`. Local review: `http://localhost:8089/?phase2=owner-review`;
open Settings. Account-unconfigured is intentional, not a fake signed-in state.

Added runtime dependencies: `@supabase/supabase-js ^2.116.0`,
`react-native-url-polyfill ^4.0.0`, Expo-compatible `expo-secure-store ~15.0.8`,
`expo-crypto ~15.0.9`. SQL test dependency: `@electric-sql/pglite ^0.5.8`.

| Gate | Result | Boundary |
|---|---|---|
| TypeScript | VERIFIED, zero errors | Final sequential run |
| Expo web export | VERIFIED | `dist`, not a deployment |
| Sync V2 tests | VERIFIED, 32/32 | Isolated clients, no owner storage |
| PostgreSQL/RLS/RPC | VERIFIED, 19/19 | PGlite, not hosted |
| Native source tests | VERIFIED, 59/59 | Adapter/driver fakes plus pure logic |
| Decision regressions | VERIFIED, 13 scripts | Existing domain regression |
| Insights regressions | VERIFIED | Four suites + feature selection |
| Persistence consistency/lock | VERIFIED | Existing standalone test files |
| V1 deletion outbox | VERIFIED, 15 assertions | Compatibility regression |
| Web UI | VERIFIED | Dedicated isolated Chromium profile |
| Android | VERIFIED | Compile, install, launch, API36 arm64 emulator |
| iOS compile | BLOCKED | `xcode-select` is CommandLineTools; no Xcode.app |
| iOS Simulator / physical iPhone | UNVERIFIED | No native build/device |
| Physical Android | UNVERIFIED | Only emulator attached |
| Hosted OTP + A/B devices | BLOCKED | Authorized test project/config absent |

Web checks at 375x667, 393x852 and 1280x900: Settings account-unconfigured notice,
zh/dark and en/light, no horizontal overflow; language/theme survive refresh;
five tabs load; Capture opens/cancels. No parsing API/owner operation was invoked.
Browser runtime errors were empty. Isolated browser observed 0 Supabase/V1 sync
requests and 0 StateCheckIns. Native logcat showed no JS/Android runtime error.
Only normal locally derived legacy fallback DecisionResults were queued in the
unsigned emulator; no raw state or execution observation was fabricated.

One intermediate TypeScript run overlapped export cleanup and reported missing
generated dist files. The final check runs AFTER export; do not count the
intermediate run as a source-code type failure or hide it as a first-run pass.
Node emitted existing MODULE_TYPELESS_PACKAGE_JSON warnings; Gradle emitted
deprecated-API warnings. Neither is represented as a warning-free build.

## Multi-device test boundary

**VERIFIED in deterministic harness:** A create -> B hydrate; B edit -> A pull;
A offline mutation -> process recreation -> reconnect; A delete -> B removes;
simultaneous/offline edits preserve conflict; immutable retries; local-clear
leaves cloud intact; account reassignment rejected.

**NOT VERIFIED on real hosted devices:** no test project login, no email sent,
no migration executed, no live Realtime event, no real cross-device transfer.
This is the principal remaining acceptance gate. A green mock cannot replace it.

## Performance

Single local run, deterministic in-memory transport/KV, milliseconds. No network,
native flash, browser rendering or smoothness SLA is included in these numbers.

| Entity count | Local apply | Initial hydrate | Push 100 | Incremental pull |
|---|---:|---:|---:|---:|
| 1,000 | 4.53 | 7.71 | 7.25 | 3.50 |
| 10,000 | 37.80 | 315.17 | 54.64 | 30.36 |

10,000 Health samples: initial partition write 24.58ms; one edit 42.92ms;
one rewritten partition 86,945 bytes versus 12,075,561 bytes for the full blob.
Reading/comparing still scans records and partitions. These results establish a
smaller write unit, not unlimited scalability. Phase 1 emulator smoothness did
not pass; no new real-device frame-time pass is claimed. Hosted bandwidth and
physical HR density remain to be measured.

## Security and remaining limitations

- Public-key guard rejects secret keys/service-role JWTs. No private key, OTP,
  raw Health log or owner dataset is in screenshots/tests/client config.
- Native tokens are in SecureStore, not AsyncStorage; native chunk crash may
  leave unreferenced old chunks, but does not switch to an incomplete session.
- Web session is readable to same-origin JS; E2E encryption is not implemented.
- RLS migration has local SQL proof only. Hosted provider/Auth/API access is not
  presumed configured. Realtime publication must be verified after migration.
- No remote V1 import, tombstone/receipt GC, CRDT, automatic account migration,
  schema-version upgrade, forced background service or multi-user shared profile.
- Remote malformed rows are quarantined; invalid local entities are excluded
  by registry. Optional nested domain validation needs further schema coverage.
- Signed-out local UI remains optimistic; persistence failures retain/replay the
  durable journal where written and surface sync error, not a guaranteed cloud save.
- Web without Web Locks requires single-tab use. Cross-tab storage recovery and
  native flash crash behavior need additional destructive test harnesses.
- OS Calendar global identity and explicit Schedule export UI are not complete
  cross-device Calendar editing. No background Calendar writes were introduced.
- Changing Health consent does not retract a request already committed remotely.
  Opt-out is not cloud erasure. Local-clear keeps recovery backups/owner binding.
- Dependency installation reported existing audit findings; no forced unrelated
  dependency upgrade or independent penetration test was performed in this phase.

## Human actions required

1. Choose an authorized independent Supabase test project and two test devices.
   Provide the public URL/publishable key or configure the example locally.
   Do not send service-role secrets or OTP codes in chat.
2. Authorize/apply the versioned migration through the project's normal migration
   connection; confirm RLS and Realtime publication. Configure Email OTP token
   template; owner types the test mailbox codes directly in Settings.
3. Run the real A/B create-edit-offline-restart-delete-conflict path. Enable Health
   cloud consent explicitly only on the isolated test account. Check remote/local
   readbacks and cleanup using normal deletion/tombstone semantics.
4. Install full Xcode and choose it with xcode-select; authorize native signing
   and connect a supported iPhone. Connect a physical Android for real source and
   notification validation. These are not replaced by emulator screenshots.
5. Measure native smoothness and actual Health sample volume before owner rollout.

## Remaining blockers for Phase 3

Hosted identity/RLS/two-device acceptance; physical Health provenance and permission
readback; native iOS compile/signing/device gate; unresolved real-device performance.
No Phase 3 work starts automatically.

## Evidence

- [Core sync tests](../../reports/sync-v2/core-tests.log)
- [SQL/RLS tests](../../reports/sync-v2/sql-tests.log)
- [Native tests](../../reports/sync-v2/native-tests.log)
- [Web build](../../reports/sync-v2/web-build.log)
- [Android build](../../reports/sync-v2/android-build.log)
- [375px dark Settings](../../reports/sync-v2/screenshots/web-settings-zh-dark-375.png)
- [375px light Settings](../../reports/sync-v2/screenshots/web-settings-en-light-375.png)
- [393px Settings](../../reports/sync-v2/screenshots/web-settings-en-light-393.png)
- [1280px Settings](../../reports/sync-v2/screenshots/web-settings-1280.png)
- [Native Health permission + empty read](../../reports/sync-v2/screenshots/android-health-empty-read.png)

READY FOR QUESTLIFE PHASE 2 OWNER REVIEW
