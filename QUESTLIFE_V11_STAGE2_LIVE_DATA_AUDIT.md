# QuestLife V11 Stage 2 Capture and Record Data Audit

Date: 2026-08-06

Route under test: `?questlife_v11_ui=stage2-rebaseline`

## Scope Result

The rebaseline route is an explicit, non-persisted QA fixture. It does not call the real parse API, read execution history from Store, or write records or feedback to persistence. The route now displays `QA FIXTURE · no live API / non-persisted data` so its states cannot be mistaken for live AI or Store validation.

The existing production path remains unchanged and was audited separately in source. Real HomeScreen integration is outside this pass.

## Data-Binding Table

| UI surface | Selected ID | Store/API source | Fixture or live | Persisted | Verification |
| --- | --- | --- | --- | --- | --- |
| Rebaseline Smart Capture input | current local draft | `V11Stage2RebaselineSheet` local state | fixture | No | Local web UI verified |
| Rebaseline parse result | current request token, generated fixture request ID | 640 ms local fixture timer; endpoint is `null` | fixture | No | Local web UI verified; live parsing UNVERIFIED |
| Rebaseline pending confirmation | current draft paired to current request token | local component state | fixture | No | Local web UI verified |
| Rebaseline Activity History | `RebaselineExecutionRow.id` | `buildRebaselineFixture().recent` plus a local saved-draft row | fixture | No | Local web UI verified |
| Rebaseline Record Detail | exact clicked `RebaselineExecutionRow.id` | selected row resolved from current visible fixture rows | fixture | No | Local web UI verified, including reordered list |
| Rebaseline execution feedback | exact selected fixture record ID | per-record local map; only records with `feedbackTextKey` expose controls | fixture | No | Local web UI verified; refresh persistence UNVERIFIED |
| Production Smart Capture input | new RawCapture ID | `addRawCapture(text)` from Store | live path | Yes | Source audited; end-to-end UNVERIFIED in this pass |
| Production parse result | RawCapture ID | `POST /api/parse`, then `updateRawCapture` | live path | Yes | Source audited; local endpoint unavailable |
| Production pending confirmation | RawCapture ID and parsed entries | `HomeCapturePending` | live path | Yes | Source audited; end-to-end UNVERIFIED in this pass |
| Production saved execution | ExecutionLog ID derived from capture ID and entry index | `createExecutionLog` | live path | Yes | Source audited; end-to-end UNVERIFIED in this pass |
| Production execution delete | ExecutionLog ID | `deleteExecutionLog` removes the log and derived effort/contribution data | live path | Yes | Source audited; real delete/refresh UNVERIFIED in this pass |
| Production record edit | ExecutionLog ID | Store exposes `updateExecutionLog`, but no existing Record Detail edit handler/UI contract exists | live path | Yes | `UNSUPPORTED PRODUCT GAP — no existing Record Detail edit handler` |
| Production Instant Read feedback | DecisionResult ID | `updateDecisionResultFeedback(id, useful/not_useful)` | live path | Yes | Source audited; separate from fixture record feedback |

## Capture Chains

### Isolated Rebaseline Fixture

`raw text` -> local submit -> no HTTP request -> fixture request token and timer -> local pending state -> local confirm -> local saved-draft row -> fixture Activity History

- A new submission invalidates the previous request token.
- Editing the current draft invalidates an in-flight request and clears stale pending/error state.
- Closing Capture cancels the timer and invalidates the request.
- A parse failure keeps the current raw text and exposes Retry; it never renders the previous successful result.
- Saving updates one local row with the current raw text; it does not create a RawCapture or ExecutionLog.

### Existing Production Path, Unchanged

`HomeSmartCapture.handleSend` -> `addRawCapture(text)` -> `triggerParse(capture.id, text)` -> `POST /api/parse` -> `updateRawCapture(captureId, parsed result)` -> `HomeCapturePending` -> `createExecutionLog(...)` -> Store persistence and derived data

The client sends text, recent capture history, skill catalogue, goal snapshot and skill history to `/api/parse`. A failed request updates that RawCapture to `parseStatus: failed`.

## Local API Availability

The local port used for visual QA is a static Python HTTP server serving Expo's `dist` output. A generic `POST /api/parse` probe, with no user content, returned:

`HTTP/1.0 501 Unsupported method ('POST')`

Therefore:

- Live parse success: **UNVERIFIED**
- AI parse correctness: **UNVERIFIED**
- RawCapture persistence: **UNVERIFIED**
- ExecutionLog persistence after confirmation: **UNVERIFIED**
- Real delete followed by refresh: **UNVERIFIED**
- Feedback persistence after refresh: **UNVERIFIED**

The exact dependency is a server-capable environment that serves `/api/parse`; the static local server cannot execute the Vercel API route.

## QA Diagnostics

The fixture emits diagnostic logs only when `?debugCapture=1` is present. Each log contains:

- request timestamp
- submitted raw text
- endpoint: `null`
- HTTP status: `null`
- fixture response identifier
- fallback used: `false`
- fixture mode: `true`
- current status

No API key, environment value, header or persisted user data is logged.

## Local Web Verification

Verified against local web bundle `index-bcefac3268cc2734938154cb88d8de14.js`:

- `打了篮球`, `SQL 学习了 40 分钟`, and `卧推 82.5 kg，5 次，3 组` each remained paired with its own current raw text.
- No previous bench summary leaked into any of those pending confirmations.
- Leaving Capture during loading cancels the pending fixture response.
- Composer starts at 68 px, grows to 156 px, then scrolls internally; send action remains 50 px.
- First, middle and last fixture rows resolve by stable record ID.
- Reversing the list with the debug-only `historyOrder=reverse` parameter does not change the selected object.
- SQL opens SQL and exposes no usefulness controls because it has no matching feedback text.
- Bench and report-edit open their own feedback text and maintain independent selected values in the current fixture session.
- Fixture delete closes the selected detail, updates history count and latest-record summary, and is restored on refresh as expected for explicitly non-persisted fixture data.
- Decision/Instant Read feedback remains in its separate state path.
- Empty and short Capture composer height measured 68 px; the three-line case grows within the 156 px cap.
- Document width equalled viewport width at 320×667, 375×667, 393×852 and 1280×900 in dark/light checks.
- Browser console contained no runtime errors. The only warning was Expo Notifications' existing web limitation for push-token listeners.

Representative local screenshots:

- `/private/tmp/questlife-v11-capture-empty-375-final.png`
- `/private/tmp/questlife-v11-capture-loading-320.png`
- `/private/tmp/questlife-v11-capture-pending-320.png`
- `/private/tmp/questlife-v11-history-375.png`
- `/private/tmp/questlife-v11-bench-feedback-375.png`
- `/private/tmp/questlife-v11-sql-detail-light-393-compact.png`
- `/private/tmp/questlife-v11-history-1280.png`
- `/private/tmp/questlife-v11-capture-en-light-320-loaded.png`

## Unsupported and Unverified Items

- `UNSUPPORTED PRODUCT GAP — no existing Record Detail edit handler`
- Physical iPhone Safari keyboard and touch QA: **UNVERIFIED** in this pass.
- Production API, Store write, persisted feedback and persisted delete: **UNVERIFIED** because this task explicitly forbids HomeScreen integration, push and deploy.
- Fixture screenshots prove presentation and local request isolation only. They do not prove AI parsing or persistence.
