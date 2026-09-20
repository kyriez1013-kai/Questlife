# Backend / Quant Boundary Completion

Date: 2026-09-20

Status: IMPLEMENTED / VERIFIED_LOCAL. No deployment, live-service verification, commit, push, or real-user data access was performed.

## Checkout And Scope

- The supplied directory-plus-branch path does not exist as a directory. The verified checkout is `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`, branch `release/questlife-v1`, base HEAD `507d0a5`.
- Read the end-to-end completion handoff, `AGENTS.md`, and `EXECUTION_RULES.md`. The explicit no-commit/no-deploy task instructions override the repository's generic commit/push rules.
- Modified: `api/sync.ts`, `api/decision-quant.ts`, `src/adaptive-decision/ownerQuantRuntime.ts`, and its existing test.
- Added: `api/_lib/supabaseAuth.ts`, `scripts/test-backend-auth.mjs`, and this report.
- No edits by this task to the Quant engine/repository, Store, Sync runtime, shared schemas/contracts, configuration, lockfiles, migrations, screens, or the parent release ledger. Concurrent edits by other owners were left intact. No secrets files or untracked `docs/quant/` content were read.

## Implemented Boundary

### Legacy Sync

`/api/sync` now returns HTTP 410 with `legacy_sync_retired` for every method. It does not parse client collections, acknowledge deletions, contact Supabase, or use a service-role key. There is no anonymous-ID compatibility write path. Authenticated Sync V2 remains the supported path.

### Quant API

- Bearers are verified against the configured Supabase `/auth/v1/user`, using only `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Token claims are not decoded as proof of identity. Invalid/missing tokens fail closed; unavailable auth configuration/services return an explicit 503.
- `subject_id` forwarded to Quant comes only from the verified user ID. A submitted `subjectId` must match it or receives 403; omitting it still derives identity from authentication.
- Worker handoff: POST to the full configured `/api/decision_artifacts` endpoint with `X-QuestLife-Subject-Id` set from the verified UID, never a caller-supplied header. The body has exactly five keys: `mode: "owner"`, `subject_id`, `configured_timezone`, `as_of`, and `app_data`.
- No service-role key or database write is used by either owned endpoint.
- Both `QUESTLIFE_QUANT_RUNTIME_URL` and the existing server-only `QUESTLIFE_QUANT_RUNTIME_TOKEN` are required. Missing upstream configuration returns 503, never a successful empty-data result.
- Outbound requests reject redirects and use HTTPS, with HTTP allowed only for loopback development. URL credentials are rejected. The user bearer goes only to Supabase; Quant receives only its server runtime token.
- JSON payload limits count UTF-8 bytes, including parsed request bodies and the final forwarded worker body. The limit is 1,900,000 bytes. Worker timeout is 15 seconds after authentication; client timeout is 22 seconds, allowing the reported eight-second Python execution plus authentication/network time.
- Responses are private/no-store. Invalid upstream identity, as-of, counts, provenance flags, or analysis-to-product binding produce 502 without forwarding the artifacts or upstream error details.
- An additive `request_context` receipt binds the response to the verified subject, timezone, requested as-of, and SHA-256 of the exact serialized submitted snapshot. This receipt is separate from Quant's opaque `source_snapshot_hash` and the product's own materialization hash; it is not an attestation that the external runtime computed correctly.

### Client

- Normal `loadOwnerQuantArtifacts` and non-injected `requestOwnerQuantArtifacts` calls lazily reuse `src/sync-v2/supabase.ts` and its real Supabase session. No anonymous analytics identity, separate auth store, mock auth implementation, or new public environment names were introduced.
- Existing public names remain `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The existing backend URL helper remains unchanged.
- Uploads require the existing Sync journal's `ownerId` to match the current session. The journal is read through `readSyncState`; nothing is written or migrated.
- Cloud Health consent defaults to false and comes only from that account-bound journal on the real path. Without consent, imported Health/sensor rows and Health-derived provenance are excluded from every snapshot collection, including the existing `contextLogs` Health projection. Manual records remain eligible; raw captures and private text remain minimized. Local observations are not altered.
- Auth changes/sign-out clear the cache and abort pending requests. Account/consent state is rechecked before returning, including cached results. Late account or consent responses return no artifacts or observation counts.
- Cache keys include exact snapshot content, account, timezone, as-of, consent, and real/test transport separation; the old collision-prone 32-bit hash is gone. Cache entries expire after 60 seconds, are bounded to four, and are copied on storage/read to prevent caller mutation.
- Product subject/as-of and analysis base-bundle/as-of/provenance are checked. Missing or malformed counts are errors, not inferred zero observations. Service/auth errors stay `unavailable`, distinct from a validated `no_eligible_data` response.
- Existing injected-fetch tests remain directly runnable without eager native authentication imports. This explicit transport seam cannot share authenticated cache entries. The server still requires a verified bearer regardless of client behavior.

## Verification

| Check | Actual Result |
| --- | --- |
| `node scripts/test-backend-auth.mjs` | PASS: 17 scenario groups, including worker subject-header spoofing, exact five-key body and forwarded byte limit; strict compilation of the production boundary included |
| Owner Quant provider tests through `npm run test:adaptive-decision` | PASS: snapshot privacy/consent, forged subject, as-of, receipt, malformed counts, analysis binding, correction/deletion/account/timezone invalidation, cache bounds/expiry/mutation, timeout and invalidated in-flight responses |
| `node scripts/test-sync-v2.mjs` | PASS: 32/32 tests, deterministic in-memory transport |
| `node node_modules/typescript/bin/tsc --noEmit` | Earlier PASS with zero errors; latest rerun FAIL after a concurrent native preview was added: `src/native/insights/__tests__/preview.tsx:2` lacks declarations for `react-dom/client` (TS7016). No boundary file errors reported. |
| Scoped `git diff --check` | PASS |
| Full `npm run test:adaptive-decision` | FAIL outside this task: `src/adaptive-decision/decisionEngine.test.ts:235` dereferences missing `withMemory.candidateActions[0]`. Boundary tests and the preceding suites passed. No decision-engine/policy changes were made by this task. |

The backend runner compiles the production endpoint, helper, client wrapper and existing Supabase module. It runs the real installed Supabase SDK's session/auth-event lifecycle. Network replies, native session persistence, and Sync journal reads are controlled fixtures. It exercises no-auth, wrong/forged tokens, UID mismatch, missing config, auth outage, malformed upstream, missing runtime/token, UTF-8 exact limits, consent, logout and account-switch races. It never contacts a live service or accesses owner records. The SDK emits its existing `processLock` deprecation warning; auth configuration was not changed to suppress it.

`src/services/apiSync.test.ts` still describes the intentionally retired anonymous write/delete behavior. It is outside the assigned ownership and was not rewritten or claimed passing; the new backend runner tests the replacement HTTP 410 contract.

## Parent Handoff / Unverified

1. Deploy both endpoint and client changes together. The authenticated client requires the new request receipt; an older API fails closed. The legacy endpoint retirement is intentional, not a successful upload/deletion acknowledgement.
2. Configure the existing Supabase server/public environment names and server-only `QUESTLIFE_QUANT_RUNTIME_URL`/`QUESTLIFE_QUANT_RUNTIME_TOKEN`. The runtime URL is the full endpoint, including `/api/decision_artifacts`. Ensure the separately owned computation service enforces its runtime token and verified-subject header. This task cannot secure a public direct-runtime URL by changing its caller alone. Parent reports the worker implementation complete with deployment pending shortly, EAS login ready, and Supabase CLI awaiting its login code; none of those remote states were independently exercised by this task.
3. Run real OTP/session, Supabase verification, hosted API, runtime and account A/B tests on the candidate. Verify Health consent and logout/switch behavior on devices. Remote computation, native SHA-256 fallback, deployment routing, TLS/CORS and live UI behavior were not verified here.
4. The request receipt detects client/proxy response substitution and cache mix-ups; the parent still owns validating the upstream runtime's actual snapshot computation/cache behavior. No Quant scientific eligibility or engine behavior was changed.
5. Screen-owned artifacts already returned before logout are outside this module's control. The parent UI/session owner must clear retained screen results/references on account changes; late wrapper results and its internal cache are guarded here.
6. Resolve the separate decision-engine regression, native preview declaration error, and replace/remove obsolete legacy sync test expectations within their owners' scopes before claiming the full release suite is green.

## Rules Self-Check

- UI additions, visual tokens, i18n keys, mobile/theme checks: not applicable; no UI changes and zero new i18n keys.
- Store/data models/navigation/AsyncStorage writes or migrations: untouched.
- Timestamp rules: no local-hour conversion logic added; as-of compares instants with explicit offsets.
- TypeScript: owned boundary passes strict compilation; final repository-wide check is blocked by the separate native preview declaration error above. Deployed web/real-device end-to-end checks: not performed, explicitly not claimed.
- Commit/push/deploy: not performed, as explicitly requested. Deployment and backend services remain parent-owned.

References checked: [Expo SDK 54](https://docs.expo.dev/versions/v54.0.0/) and [Supabase getUser identity verification](https://supabase.com/docs/reference/javascript/auth-getuser).
