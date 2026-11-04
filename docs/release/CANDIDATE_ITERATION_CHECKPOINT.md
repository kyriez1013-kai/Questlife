# Candidate iteration checkpoint

Updated: 2026-11-05, Australia/Sydney. Autonomous candidate improvement requested;
commercial readiness is the goal, not an acceptance claim.

## Isolation and source

- Work here only: `/Users/kyrie/.codex/worktrees/questlife-candidate-hardening/questlife-frontend-v2`.
- Branch: `candidate/commercial-readiness-20261105`; source `ce2deaa460ddd4ebeccea4141368e6bdd77c1e11`.
- Newer source is the Nov 4 state-layer/approved Today refinement in
  `/Users/kyrie/dev/questlife-frontend-v2`; do not modify that checkout.
- Do not modify `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1` or its five
  dirty tracked files. Do not read `QUESTLIFE_QUANT_UI_CONTRACT.md` or `docs/quant/`.
- No new fees, phone installs, Owner data operations, main/release pushes, or
  production deployments. New local branch commits are allowed.
- Do not restore Android tooling or replace the approved Today visual system.

## Deployment boundary, read-only verification

Authenticated Vercel team: `team_gzSW9d2JQQ2apxZFPg92CFbM`.
Project: `questlife-alpha`, `prj_d6GHMLCs8rR2pUDENVlqS6GDa3xJ`.

- Protected production aliases `questlife-alpha-orpin.vercel.app`, `ky11ai.com`
  point to `dpl_8ccd7PRNezzkAwHJiKUrkAJGJPzq`.
- `questlife-v1-candidate.vercel.app` points to older `dpl_91FCmwp8gN4hktZjaAYCukLQa6uS`.
- Release branch preview alias points to `dpl_GZ8McEkq5ewHamKnp4hGf1tx2nLW`,
  commit `b74072a`, not this new source.
- A later explicit CLI alias lookup resolved `questlife-v1-release.vercel.app`
  to `dpl_v5PKqGiwTphijQbeEJjtsYaPRJDk` in the release project. It was not changed.
- No aliases or deployment settings changed. Do not publish until candidate
  data isolation and deployment configuration have been established.

## Product context reused

Read Obsidian `项目入口/QuestLife.md`, `AI交接包/QuestLife.md` and relevant
`Questlife_V3` conversation. Principles: action before analysis; ordinary users
need a conclusion and its evidence, expert controls are progressive; saved
must mean durable; failures must not masquerade as absence of data. Prior
reports are not present-day acceptance. Respect uncertain evidence and source
units. Do not add scores, fake patterns, medical advice or inferred causality.

Source handoffs: `docs/frontend-v2/CODEX_HANDOFF.md`,
`docs/state-layer/CODEX_HANDOFF.md`; full earlier status remains in
`docs/release/V1_COMPLETION_LEDGER.md`.

## Current batch

1. Reproduce offline cache corruption/namespace cleanup risks in `public/sw.js`.
2. Verify latest state-layer submission retry/close behavior against the existing
   durable submission helper; repair actual failures without new persistence.
3. Check normal first-use, Capture, state and plan flows in isolated browser
   contexts at 375/393/1280, both languages/themes where affected.
4. Continue into normal Insights evidence reachability and existing Health
   preview gaps; never substitute examples for personal data.

## Verified candidate changes, 06:16 Sydney

- `526c9ec`: PWA preserves the last usable HTML shell on network/503/non-HTML
  failures; does not delete other applications' caches. Before: 4/6 tests failed;
  after: 6/6 passed. Isolated Chromium reload/503/offline path passed.
- `2029b86`: Brain dump retains a failed draft and its retry, prevents close/back
  from losing a queued submission, and guards repeated taps. Before: 2/4 failed;
  after: 4/4 passed. Normal UI plus local-storage failure/retry/refresh produced
  exactly one context record at 375x667. No backend was called.
- `c6318bc`: State-layer Apply/Undo use the existing DurableSubmission helper;
  failed ACK retries the original operation. Reorder preview stays visible after
  optimistic Store changes. Before: 4/5 failed; after: 7/7 including intervening
  edit/execution protections. Normal create-two-blocks -> check-in -> preview ->
  failed Apply -> retry -> failed Undo -> retry -> reload passed at 375x667,
  393x852 and 1280x900. Schedule restored and one DecisionResult ID retained.
- `fb5febf`: actionable empty chart + honest absence
  wording; fix date-only range reference which previously excluded all readings
  after midnight. Empty-chart tests 2 failed -> 3 passed; real screen reference
  memo tests 5 failed -> 6 passed, including Sydney/Los Angeles and exact artifact
  timestamp preservation. Normal zero-records -> chart action -> state save ->
  return to Insights now displays the one recorded value and evidence count.
  No baseline is invented. Local day buckets and chart axis no longer shift
  Sydney/Los Angeles records to a different calendar day; intraday absolute
  timestamps and precomputed artifacts are retained. Calendar tests 5 failed ->
  8 passed; the three Insights regressions total 17 passed.
- `a672eeb`: unclear state explanation no longer claims a personal normal range
  on the first check-in. Two failing language tests now pass; a supported sleep
  baseline comparison remains intact. State-layer 157 checks still pass.
- Normal first-use -> five workspaces -> empty chart action -> state save ->
  Insights -> English/reload passed at 375x667 dark, 393x852 light, 1280x900 light.
  One local state is retained; no horizontal overflow/page errors. Latest
  typecheck, existing Insights V3 tests and web export passed. No hosted service
  or device acceptance is implied.
- `230564a`: local fallback Capture now records rule provenance instead of falsely
  claiming model-originated fields. Both exercise and ordinary confirmation paths
  are covered; 2 failing tests -> 5 passed, existing activity-kind tests 6 passed,
  existing provenance 19 assertions passed. Normal local UI SQL 40-minute capture
  -> explicit confirmation -> reload retains exactly one log, 40 minutes, raw ID
  lineage and `questlife-local` parser metadata. No historical records migrated.
  Typecheck and web export pass. Included in the newer 7da5969 Preview below.
- `1702ce3`: local Capture fallback preserves activity identity and explicit
  measurements. Reproduced through the normal UI: basketball had no confirmation
  path; bench 82.5 kg / 5 reps / 3 sets opened three empty fields. Seven initial
  regression tests failed before changes. The existing exercise alias catalog and
  local duration/strength parsers are reused, not a second parser or schema.
  Basketball now opens an editable duration confirmation with no invented time
  or unrelated chest-exercise suggestions; bench retains the explicit units and
  quantities. Compound hours/minutes are summed; metres and zero are not silently
  converted to positive minutes. Unknown weight is not inferred from pounds.
  Nine new cases plus existing activity/provenance tests total 20 passing;
  existing History/Today-history tests 13 passing; V2 suite, typecheck, and web
  export pass. Intermediate type-shape, array-compatibility, compact-unit and test
  harness failures were retained in the logs and corrected before committing.
- Normal isolated browser flow at 375x667 light, 393x852 dark and 1280x900 dark:
  create basketball -> enter custom 42 min -> confirm -> refresh; bench
  82.5 kg / 5 reps / 3 sets -> confirm -> refresh; SQL 40 min -> confirm -> refresh.
  Each produces exactly one local execution with its own raw-capture ID. Bench
  retains 1237.5 kg-repetitions total volume and no fabricated duration; basketball
  is time-based/cardio, not strength. All are locally confirmed rule/owner
  provenance, NOT a successful live AI parse. No execution is created before
  explicit confirmation.
  History first/middle/last rows retain their corresponding contents. Explicitly
  deleting the middle bench capture AND its linked log removes those two IDs;
  the other two logs remain byte-equivalent after refresh. English reopen,
  horizontal bounds, reachable inputs above the sticky footer (375/1280), and
  browser runtime errors were checked. All disposable browser contexts closed.
  No cloud writes or remote delete acceptance is implied. Included in the newer
  7da5969 Preview; the domain/delete checks above were local browser verification.
- `8b89e35`: completing Capture no longer hides its saved execution/state feedback
  from Activity History. Reproduced after waiting for `entriesDismissed` to persist
  and then refreshing: the existing history callback omitted the saved-result
  component. Five of six new render-path tests failed before the fix; all six now
  pass. History uses exact `structuredData.sourceCaptureId` lineage to reopen the
  existing saved-result UI. Recent Capture still collapses after Done. Ignored,
  deleted and unrelated records do not acquire another record's feedback. History
  uses its existing close control, not a nonfunctional duplicate Done action.
  No Store, schema, parser, Quant or persistence semantics changed.
- In the same batch, existing confirmation and after-state ACK handling were
  verified through normal UI with isolated storage failures: failed confirmation
  produces retry and no durable execution; retry saves exactly one log with the
  same capture lineage. Failed after-state save keeps persisted feedback absent;
  retry stores energy up / focus down / mood same on the same execution ID. Done
  -> refresh -> History -> close/reopen retains it without another execution.
  These ACK behaviors already existed; do not describe them as new fixes.
  Passed in Chromium at 375x667 light, 393x852 dark and 1280x900 dark. English
  reload/history/close and unchanged saved record additionally passed at 375x667.
  The final screenshots wait for sheet animation completion and scroll the saved
  state marker into view; initial screenshots captured the transition too early.
  No horizontal overflow or page errors observed in these local scenarios.
  Targeted Capture/History/Today-history regression: 39/39 passed; typecheck and
  web export passed. Included in the newer 7da5969 Preview; the history checks
  above were local browser verification.
- `7da5969`: Today now distinguishes optimistic records from acknowledged local
  writes. Reproduced in the normal Capture flow with injected disk failure: the
  confirmation said not saved, but the underlying Today command still offered
  saved feedback and the summary showed progress without a durability warning.
  Four new tests failed before the fix. HomeScreen now consumes the existing
  `localPersistence` snapshot: saved-feedback selection waits for no pending or
  failed writes, and the latest-record metadata/accessibility label shows the
  existing pending/failed copy. Retry remains the existing shared retry action.
  The conservative barrier is global, not a new per-record receipt system; a
  different unresolved local mutation can temporarily suppress the feedback CTA.
  A durable offline record remains usable without waiting for cloud delivery.
  No Store, Sync, Quant, schema, command priority or layout rewrite.
  Two more failing language cases reproduced pending Capture wrongly saying
  "latest saved record and feedback"; its reason now asks for confirmation.
- Final targeted tests: 31 passed, including the real local-write queue lifecycle,
  seven new presentation cases, Today cache/reference/expiry and History cases.
  Typecheck and web export passed. Existing react-test-renderer deprecation and
  Metro color-environment warnings remain; no lint script exists, so lint was
  not claimed. The initial harness forgot to transpile a generic and then used
  an old JS target for Map/Set iteration. Its stuck test was terminated after
  34 seconds and corrected to ES2022; the failure log is preserved.
  Browser reproduction failed before the fix; after it, normal pending Capture
  -> confirmation -> failed write -> close sheet -> visible unsaved summary ->
  shared retry -> one acknowledged log -> refresh passes locally and on the new
  Preview. Preview matrix: 375x667 light/zh, 393x852 dark/zh, 1280x900 dark/en.
  Theme/language were actually selected and persisted in Settings, not only URL
  overrides. No horizontal overflow or page errors in this flow. A prior English
  locator error and debug-vs-stored-language mismatch are retained as QA harness
  failures, not product failures. Screenshots cover pending, failed and saved.

Other targeted regressions passed: 22 Today/History/brain-dump tests; 74 existing
Store durability/Schedule UI tests (in-memory Store and SyncEngine, NOT devices);
157 state-layer checks; existing adaptive-decision and Insights V3 suites.
Initial test-runtime environment error and browser locator errors remain in logs;
they were corrected in the QA harness, not by weakening application assertions.

## Exact next work

1. Normal Capture confirmation/after-state write failure and retry, refresh, and
   saved feedback reopening are now covered. Do not rerun the same scenarios
   without a relevant change. The local provenance/domain/history fixes are
   now included in Preview 7da5969 below. Before any further publication, recheck
   target metadata and isolation. Do not re-run these unchanged paths merely to
   increase test counts.
2. Check Insights examples/real-service unavailable navigation and remaining
   first-use paths. Preserve example isolation. Evaluate concrete normal-entry
   gaps, not a new whole-product audit. History currently still displays the
   raw parse-failure/retry message next to a successfully manually saved result;
   assess this wording/state interaction without masking the service failure.
   A first-record result also says "Progress signal created"; audit its exact
   evidence claim in that narrow flow, not the Quant system. The Today summary and
   feedback-selection contradiction is now fixed in 7da5969, but this is not proof
   that all app surfaces or analytics exclude every optimistic mutation. Preserve
   that narrower boundary; do not claim app-wide atomicity or hosted persistence.
3. No physical iPhone, hosted account or model-provider checks were performed.

## Preview access update

- Latest isolated Preview, code commit `7da5969e9743d7432ae5abac6cc0a23dd8e7903c`:
  `https://questlife-v1-release-anzhevk50-kyrie-z-s-projects.vercel.app`.
  Deployment `dpl_6RNRMF5SseJAuPKwtr2mCwmMPqJw`, target preview, READY. Created
  with an explicit project/scope/preview target, no Git push. It includes all
  earlier local Capture fixes. Main bundle served and verified in browsers:
  `index-1ccc4a400c4e4ac401fcc5be662e53e2.js`. Build/export is NOT acceptance.
  Target was re-inspected, and env metadata (names/targets only) again showed
  production-only variables. No environment values copied/read or settings
  changed. Isolated manual Capture is usable, but `/api/parse` still returns
  503 `not_configured`; no live AI/account/remote-save claim is made.
  A deployment-only 23-hour share link is in external
  `/Users/kyrie/dev/questlife-review-20261105/preview-access-durability.json`;
  expires 2026-11-06 05:12:28 Sydney (2026-11-05 18:12:28 UTC). Project-wide
  protection stays enabled. Old preview/access evidence below is retained.
  After deployment, protected release alias still resolves to
  `dpl_v5PKqGiwTphijQbeEJjtsYaPRJDk`; ky11ai.com and alpha aliases still resolve to
  `dpl_8ccd7PRNezzkAwHJiKUrkAJGJPzq`. No formal aliases changed.
- Vercel MCP env metadata request returns 403; do not retry it unchanged.
- Authorized Vercel CLI `whoami` works. Safe CLI metadata fallback succeeded,
  printing names/targets only, never values. In `questlife-alpha` it lists only
  `QUESTLIFE_QUANT_RUNTIME_URL` and token scoped to `release/questlife-v1` preview,
  and a provider key scoped to preview/production. There is no Supabase public
  config in that project metadata response. This is NOT proof another candidate
  project is absent. Check the CLI project inventory before selecting any hosted
  target; never copy production secrets or change formal aliases.
- CLI inventory resolved existing `questlife-v1-release`, project
  `prj_fVGFV7DzxfkLqbBpSo8P7NH9oqxX`. Explicit project inspect matched. All its
  environment metadata targets are production-only; no preview secrets/config
  were copied or read. A unique preview in this project cannot be described as
  live AI/account acceptance. Preserve all current production aliases.
- Unique Preview deployed via authorized CLI from `6d64725`, without pushing Git:
  `https://questlife-v1-release-oo0be1vsj-kyrie-z-s-projects.vercel.app`.
  ID `dpl_4q5yHsK2qpCDgn9bEihJkddJAUJB`, READY, NOT production.
  This is a local-data interaction candidate, not a configured cloud deployment.
- Normal isolated Chromium first-use, all five tabs, state-save -> chart -> English
  -> refresh passed remotely at 393x852 light and 375x667 dark. No page errors or
  horizontal overflow. Screenshots prefixed `preview-` in the external QA folder.
  Latest browser harness waits for the lazy Insights screen before screenshot.
- Direct unauthenticated probes: parse 503 `not_configured`; retired sync 410
  `legacy_sync_retired`; malformed Quant request 400 `invalid_request`. These are
  exact fail-closed responses, NOT proof of configured auth/RLS/provider execution.
  Initial harness incorrectly expected 401 for every endpoint; failure retained.
- MCP share tool was denied by its connection scopes. Authorized CLI's equivalent
  endpoint created a deployment-only 23-hour share link; global protection remains
  enabled. Access URL is in external `preview-access.json` (not committed).
- Post-deployment alias verification: `ky11ai.com` and
  `questlife-alpha-orpin.vercel.app` still point to
  `dpl_8ccd7PRNezzkAwHJiKUrkAJGJPzq`; the release stable alias still points to
  `dpl_v5PKqGiwTphijQbeEJjtsYaPRJDk`. Neither was switched to this preview.

## Local review entry

- `http://127.0.0.1:8141/` serves this worktree's exported `dist`, not Metro.
- Detached server PID at creation: 9124; script is external `serve.mjs` in QA dir.
- All `/api/*` requests deliberately return 503 locally. Settings correctly says
  account service is unconfigured. This is a LOCAL review, not a hosted/live-AI
  or cross-client sync acceptance.
- Latest local export: main `index-815546ef230a4d481450d1852f0967f3.js`, Insights chunk
  `V11InsightsScreen-2ac4481636545a129cc1866d0780bfc3.js`.
- `browser-workspaces-results.json`, `browser-plan-375-light-results.json`,
  `browser-plan-1280-dark-results.json`, `browser-brain-dump-results.json`, and
  `browser-offline-results.json` contain current isolated browser evidence.
- New Capture evidence: `browser-capture-confirmations-{375-light,393-dark,1280-dark}.json`,
  `375-capture-basketball-before.png`, `375-capture-bench-before.png`, and
  `{375,393,1280}-capture-*-confirmation-*.png`, `*-capture-history-after-delete-*.png`.
  Full commands/status/output are the timestamped `capture-*` logs. The browser
  harness initially expected owner_entered instead of existing owner_corrected
  for a newly supplied duration, and used a legacy delete label; the assertions
  were aligned to actual existing semantics/controls, not product logic changed
  to satisfy them. History renderer tests require the already installed external
  `QUESTLIFE_UI_TEST_RUNTIME`; the first omitted-runtime failure is retained.
- New history/ACK evidence: `browser-capture-feedback-{375-light,393-dark,1280-dark}-after.json`
  and `{375,393,1280}-capture-feedback-after-history-reopen-*.png`;
  `375-capture-feedback-after-history-english-light.png`.
  Before reproduction: `2026-11-04T18-36-24-660Z-capture-feedback-before-settled.log`;
  failing render tests: `2026-11-04T18-38-02-373Z-capture-history-feedback-red.log`;
  green tests: `2026-11-04T18-38-56-643Z-capture-history-feedback-green.log`;
  39-test regression: `2026-11-04T18-39-45-747Z-capture-feedback-regression.log`;
  typecheck/build: timestamped `capture-feedback-types` / `capture-feedback-build`;
  visual checks: `capture-feedback-after-visible-{375,393,1280}` and
  `capture-feedback-english-375` logs. Initial QA guessed labels/control roles
  and once refreshed before Done was persisted; those harness errors were
  corrected, retained, and not counted as product failures. JSON trace files are
  supplemental; the log exit status is the acceptance result.
- Latest durability evidence: `browser-today-durability-after-*-*.json` (local),
  `preview-7da5969-browser-today-durability-after-*-*.json` (remote), and matching
  `*-today-durability-after-{pending-confirmation,failed,acknowledged}-*.png`.
  Exact pre-fix browser log: `2026-11-04T19-05-45-176Z-today-durability-browser-red.log`.
  Pre-fix selectors: `2026-11-04T19-04-57-297Z-today-durability-red-transpiled.log`;
  pending-copy red: `2026-11-04T19-08-45-457Z-today-pending-copy-red.log`;
  final 31 tests: `2026-11-04T19-09-00-559Z-today-durability-final-regression.log`.
  Typecheck/build use `today-durability-final-types` / `today-durability-final-build`.
  Preview checks use `today-durability-preview-{375,393,1280}` logs; protected
  aliases use `protected-release-after` / `protected-owner-after`. Installed CLI
  rejects `--project` on inspect/env commands; the retained failed attempts were
  followed by documented positional inspect and existing safe metadata helper.
- No tests used saved browser profiles, Owner records, credentials or health data.
- Main checkout still has its original five tracked modifications; source checkout
  `/Users/kyrie/dev/questlife-frontend-v2` remains clean. No push or production
  deployment; only the explicitly isolated Previews above were created.

## Runtime and evidence

- Reuse same-lock source dependencies through a temporary `node_modules` link
  to `/Users/kyrie/dev/questlife-frontend-v2/node_modules`; do not edit dependencies.
  The created symlink is removed at the end of a run to keep Git status clean;
  recreate only that link when needed. Never remove its source directory.
- Isolated Playwright runtime exists at `/Users/kyrie/dev/pw/node_modules`.
- Logs/probes/screenshots: `/Users/kyrie/dev/questlife-review-20261105/`.
- Run bounded commands with that directory's `run.mjs`. It disables dotenv and
  removes inherited secret/token and EXPO_PUBLIC configuration for local QA.
- Test data must be synthetic and local-only. Do not launch an Owner browser
  profile, load health contents or reuse a logged-in Owner storage state.
- Heartbeat `questlife`: finite ten follow-ups, every 30 minutes, attached to
  this chat. At completion summarize actual usable outputs; no false completion.

## Open gates

- Device performance/HealthKit and expired Personal Team installation require
  coordinated owner action; no unattended device updates.
- Durable schedule/episode atomicity and external Calendar conflict behavior
  remain explicit risks until reproduced and tested. Do not claim them fixed
  from UI-only tests.
- Installed signing, end-to-end hosted persistence and visual acceptance are
  NOT established by typecheck, browser fixtures or a successful export.
