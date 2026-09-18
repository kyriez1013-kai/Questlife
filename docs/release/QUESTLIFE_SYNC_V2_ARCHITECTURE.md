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
