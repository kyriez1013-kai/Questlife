# QuestLife Sync V2 architecture

Phase 2, 2026-09-18. Starting HEAD `9cd8322`, local milestone
`v1-phase1-native-foundation`. Implementation and validation status are recorded
separately in the Phase 2 report; this document is not a claim of live acceptance.

## Repository truth

- V1 POSTs at most 400 recent executionLogs/contextLogs/stateCheckIns/
  decisionResults/patternMemory to `/api/sync`. No pull or hydration exists.
- Explicit deletion outbox retries exact anonymous-user/type/id deletes. It is
  not a change history and cannot inform another device of deletion.
- Five legacy Supabase tables use `(anonymous_user_id,id)` and RLS with no client
  policies. The server uses a service-role credential. Anonymous IDs are not
  authenticated ownership. Native only uploads when an API origin is configured.
- Existing AppData writes use serialized persistence and web cross-tab rebasing.
  Health/Calendar/notification materialization is device-local in a separate key.
- No live database access or public Auth configuration is present in this checkout.
  SQL in the repository proves intended schema, not deployed RLS.
- Full Xcode is still absent; Android tools from Phase 1 are available to recheck.

## Boundaries

V2 uses Supabase Email OTP, authenticated user ownership, a separate canonical
entity table, mutation receipts, per-user ordered change cursors and tombstones.
Legacy tables remain untouched. No automatic legacy import, production writes,
owner test observations or account reassignment are authorized by this phase.
V1 automatic mirroring is opt-in compatibility only once V2 is integrated.

Supabase public URL/key are client configuration; no service-role credentials
enter the client. Native session storage uses SecureStore. Web uses supported
browser persistence. Auth and sync are separate from product screens.

## Protocol

- Registry whitelists domain collections. UI settings, caches, notification IDs,
  external Calendar events, pending capture drafts and debug artifacts are not
  canonical cloud records. Confirmed captures and normalized Health are eligible.
- Local edits are journaled durably before reporting sync-safe completion.
  Removal is an explicit operation, never inferred during hydration or repair.
- Mutation IDs are stable across retries. Base revision mismatch preserves the
  local attempted payload as a conflict; remote remains canonical.
- Server RPC serializes writes per user *before* allocating `change_seq` so a
  late commit cannot appear behind an already-consumed cursor. Client writes
  cannot bypass the RPC to forge revisions or sequences.
- Pull is ascending by sequence. Realtime only requests a pull; launch,
  foreground, retry and manual refresh recover missed events.
- Durable projection journal makes replay after process failure idempotent.
  ACK only removes the exact mutation ID. New edits during network requests
  remain queued. Per-entity successors inherit the acknowledged revision.
- Initial reconciliation unions disjoint IDs, dedupes identical payloads and
  preserves differing same-ID data as conflicts. Account binding is durable;
  switching accounts cannot upload the previous account's local data.

## Device data and privacy

Health remains normalized Phase 1 `HealthObservationV1`, with importedAt and
per-metric read checkpoints. Cloud transfer requires authentication and explicit
Health consent. External source IDs and limitations are preserved. No aggregation
or inference is introduced to reduce payload size. Measurements determine bounded
batching/storage policy. OS notification identifiers and Calendar ownership stay
local; remotely changed ScheduleBlocks trigger the existing reconciler.

## Release gates

Tests distinguish deterministic local clients, real PostgreSQL/RLS, real hosted
Supabase, browser, emulator and physical devices. Mock success is not hosted
acceptance. OTP email template must send the token, not only a magic link.
Remote schema installation and real account/device acceptance need authorized
project access; no dashboard-only edits or fabricated statuses.

Primary references: [Expo SDK 54 SecureStore](https://docs.expo.dev/versions/v54.0.0/sdk/securestore/),
[Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native),
[Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Implemented protocol details

`src/sync-v2/engine.ts` is the platform-neutral state machine; `runtime.ts`
owns Auth/AppState/online/Realtime lifecycle and Store projection. UI does not
own authentication tokens. The versioned migration is
`supabase/migrations/202609180001_sync_v2.sql`; it has NOT been applied remotely.

Exact AppData registry: goals, categories, modules, moduleSkillLinks, skills,
actions, executionLogs, effortUnits, contributionLinks, rescueLogs,
stateCheckIns, contextLogs, decisionResults, patternMemory, scheduleBlocks,
rawCaptures. `healthObservations` is the seventeenth type, stored independently.
Confirmed raw captures must be done/dismissed and have an ExecutionLog,
ContextLog or StateCheckIn provenance reference. Unconfirmed drafts stay local.

- Journal: `questlife.sync.v2.journal` in AsyncStorage, including owner binding,
  revisions, cursor, outbox, pending projections, conflicts and quarantine.
- Write-ahead projection replay handles interrupted local writes and remote
  hydration. Remote apply never queues the incoming records again.
- Each push contains at most 50 entity heads / 500,000 UTF-8 bytes; RPC accepts
  at most 100 mutations / 1 MiB; each payload is bounded to 128 KiB. A rejected
  head blocks successors for that entity, not unrelated entities.
- Pull reads 200 rows at a time. A sent mutation awaiting its immutable receipt
  blocks cursor advancement past that entity. This prevents missing a newer
  remote edit after an ACK was lost.
- Per-entity edits preserve the revision seen before queueing. Remote apply
  cannot silently give a stale local edit a newer base revision.
- Transport timeout is 20 seconds. Retry delay grows from 1 to 120 seconds;
  foreground runtime ticks every 15 seconds. Explicit Sync Now retries directly.
- Realtime is invalidation only. No background-execution entitlement is added.
- Web journal transactions use Web Locks when available; native is single
  runtime/serialized. Older browsers without Web Locks need single-tab use.
- Sign-out stops sync and keeps local data. Separate confirmed local eviction
  rejects pending edits/conflicts, never produces cloud tombstones, preserves
  account binding, and resets cursor for rehydration by the original account.
  It stops Health reads. It is NOT secure erasure: migration backups remain.
- Different-account attachment is deliberately blocked. Local eviction is not
  an account-switch migration tool. Use a clean installation/profile for another
  account; do not reassign existing records.

## Health and device policy

128 deterministic ID-hash partitions hold Health records. One changed sample
rewrites its partition, not AppData or all Health records. Metadata remains in
`questlife_device_sources_v1`; read/compare still scans the collection. The
10,000-record benchmark is therefore not proof of unbounded storage scalability.

Full-fidelity samples are retained; no invented aggregate or destructive
retention cutoff is added. Initial/recovery OS read is seven days. Subsequent
reads use a separate metric checkpoint with one-day overlap. Cloud queue adds
at most 100 Health rows per cycle with 200 outstanding; remaining samples stay
local for future cycles. This bounds transfer, not total lifetime retention.
Unlimited historic backfill is not exposed. Raw HR storage cost, native flash
latency and physical sample density require the real-device gate.

Health consent defaults off and requires Auth before upload. Imported timestamps
come from first OS read. Phase 1 records lacking importedAt recover it from their
stored availableAt, explicitly marked `LEGACY_IMPORT_TIME_FROM_FIRST_AVAILABLE_AT`;
they are not assigned the current date. Source app/device limitations remain.
Health records are not copied into AppData ContextLogs; Quant views derive them
through the existing adapter. Missing samples never become zero observations.

Calendar records remain device-local/external. Stable provider/calendar/event
IDs dedupe when supplied. Expo's current driver exposes installation-local IDs,
not a verified globally stable provider ID; cross-device provider matching is
not claimed. Explicit `createForBlock` preserves device-local Schedule linkage
and updates the same owned event on retry. Pulling Schedule does not export to
Calendar. A remote Schedule change reconciles device-local notification effects.
Full Calendar recurrence/time-zone synchronization is not implemented.

## Configuration and activation

The checked-in `.env.sync-v2.example` contains placeholders only. Configure the
authorized project URL and public/publishable key. Public-key validation rejects
secret keys and service-role JWTs. Native API origin must be HTTPS and is separate
from the direct Supabase connection. V1 anonymous mirroring is off unless
`EXPO_PUBLIC_LEGACY_MIRROR_ENABLED=true`; leave this off during V2 acceptance.

Apply the versioned SQL in an authorized test project. Configure an email OTP
template containing `{{ .Token }}`. Never provide OTPs/service-role credentials
in chat or EXPO_PUBLIC configuration. Owner enters codes directly in Settings.
The migration adds the entities table to Supabase Realtime only if its publication
exists; hosted publication status must be checked during live acceptance.

Known transport limits: no remote V1 import, no tombstone/receipt GC, no CRDT,
no automatic account reassignment, no forced background task, no E2E encryption,
no arbitrary-shape payload support. Registry validates core fields/provenance;
it is not a complete semantic schema of every optional domain field.
