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

## Verified candidate changes, 05:02 Sydney

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
  Typecheck and web export pass. This commit is LOCAL ONLY, not yet in Preview.

Other targeted regressions passed: 22 Today/History/brain-dump tests; 74 existing
Store durability/Schedule UI tests (in-memory Store and SyncEngine, NOT devices);
157 state-layer checks; existing adaptive-decision and Insights V3 suites.
Initial test-runtime environment error and browser locator errors remain in logs;
they were corrected in the QA harness, not by weakening application assertions.

## Exact next work

1. Continue Capture activity-domain validation (basketball duration vs bench
   weight/reps/sets), history/detail/delete, and more first-use paths. Reuse existing
   evidence; isolate data in disposable browser contexts. Latest local Capture
   provenance fix needs inclusion in the next meaningful Preview batch.
2. Continue normal Capture confirmation/failure and Insights examples/real-service
   unavailable navigation checks. Preserve example isolation. Evaluate the five
   main workspaces and document concrete user-visible gaps, not just screenshots.
3. No physical iPhone, hosted account or model-provider checks were performed.

## Preview access update

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
- Latest local export: main `index-723da4f40275ad9c7d835aca8858e2d8.js`, Insights chunk
  `V11InsightsScreen-78ee7fef00772910fadd3cd5c5241676.js`.
- `browser-workspaces-results.json`, `browser-plan-375-light-results.json`,
  `browser-plan-1280-dark-results.json`, `browser-brain-dump-results.json`, and
  `browser-offline-results.json` contain current isolated browser evidence.
- No tests used saved browser profiles, Owner records, credentials or health data.
- Main checkout still has its original five tracked modifications; source checkout
  `/Users/kyrie/dev/questlife-frontend-v2` remains clean. No push or production
  deployment; only the explicitly isolated Preview above was created.

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
