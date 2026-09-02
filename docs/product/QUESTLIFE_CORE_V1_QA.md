# QuestLife Core V1 QA

Date: 2026-09-03

## Scope

QuestLife Core V1 connects the existing Adaptive Decision Loop to the accepted
Today product. It answers one bounded decision: continue, shorten, move, or
recover, using real Store context and eligible Quant artifacts. It does not add
a dashboard, a new model, HealthKit, or a second scheduling authority.

## Git and isolation

- App branch: `product/questlife-core-v1`
- App base merge-base: `610a12004b0327273aaf335cf823b9b77ab6c3c3`
- App implementation HEAD before this QA record: `5595ec70c2f4f0d7e8ff3783dd677ca454992b11`
- Quant branch: `product/questlife-core-v1-runtime`
- Quant HEAD: `3c16c20d9846f849088cdb46f484067537e2edb6`
- `main` was not modified or deployed.
- The owner workflow is gated by `questlife_core_v1=1`; removing the flag
  restores the existing Today immediately.

## Runtime architecture

```text
Owner AppData snapshot
-> client privacy minimizer
-> App /api/decision-quant boundary
-> isolated Python Decision Quant runtime
-> provenance/data-quality firewall
-> validated Product V1 + Analysis V1 artifacts
-> DecisionEvidencePacket A-E
-> existing Decision Loop policy
```

The normal owner path removes owner-authored names, notes, raw capture text, and
unregistered context labels before transmission. The Python runtime fails
closed for synthetic, QA, debug, deleted, future, and legacy-unknown evidence.
Quant failure degrades to constraint-only decisions rather than blocking the
surface.

## App Preview

- Deployment: `dpl_2mpywh2r1CuwahVsnBSn4bQmRqGd`
- Status: READY, target `preview`
- Bundle: `index-d92563bbceed579347b6ae0f0e796427.js`
- Owner-safe route:
  `https://questlife-alpha-dgyziu6y6-kyrie-z-s-projects.vercel.app/?questlife_core_v1=1&debugLanguage=zh&debugTheme=dark`
- Mature demo route:
  `https://questlife-alpha-dgyziu6y6-kyrie-z-s-projects.vercel.app/?demo=adaptive-decision-loop&scenario=training&lang=zh&theme=dark`
- Rollback route:
  `https://questlife-alpha-dgyziu6y6-kyrie-z-s-projects.vercel.app/`

This Preview was deployed with an intentionally invalid Supabase endpoint, so
the disposable browser identity could not write to the real owner dataset.
The deterministic mature demo remains fixture-only and uses the same shared
presentation and decision contracts as owner mode.

## Quant Preview

- Deployment: `dpl_Gd3uusHivJsWJqdkE8z1qi1YewbZ`
- Status: READY, target `preview`
- Runtime URL:
  `https://questlife-core-quant-preview-aqd9dev0x-kyrie-z-s-projects.vercel.app`
- Runtime version: `questlife.quant.decision-runtime.v1`
- Direct App Preview boundary test returned:
  - `ok: true`
  - 7 eligible owner observations
  - 0 excluded observations
  - `contains_real_user_data: true`
  - `synthetic_only: false`
  - validated Product V1 and Analysis V1 payloads
  - runtime materialization `elapsed_ms: 92.634`

The API test used a disposable privacy-minimized request containing only
explicit `OWNER_OBSERVED` provenance. It did not persist data.

## Preview-verified owner workflow

Using the final App Preview and real browser Store handlers:

1. Created an empty disposable goal, `建立力量基础`.
2. Created one real movable ScheduleBlock, `晚间力量训练`, 19:00-20:00.
3. Saved a non-neutral current state: overall/energy/focus/mood/physical 2,
   stress 4, sleep quality 2, body state `疲惫`.
4. Opened the Decision Surface from Today in one tap.
5. QuestLife automatically read state `2 / 5` and schedule `19:00-20:00`.
6. It asked zero questions and resolved honest Level A evidence.
7. It presented one primary proposal and exactly two materially different
   alternatives.
8. Selecting Shorten displayed the exact patch `60 -> 30 minutes`.
9. Apply changed the real Today plan to `19:00-19:30`.
10. Undo restored the exact prior `19:00-20:00` block.
11. Refresh preserved the state and restored schedule.
12. Removing `questlife_core_v1` removed the Core entry while preserving the
    existing Today and its data.
13. Smart Capture opened and cancelled through the existing handler without a
    write.

No fixture records appeared in owner mode. Full evidence displayed actual
facts, explicit unknowns, observational limitations, no-causality language,
and missing-data-not-zero handling.

## Local full-loop verification

The same production component and Store path were exercised locally through:

```text
Today -> decision -> real context -> proposal -> patch preview -> Apply
-> exact Undo -> Apply again -> due follow-up -> outcome -> Decision Memory
```

The follow-up due time was advanced locally in the generated build only to
avoid waiting two hours. No source file, Store schema, or committed code was
changed for this timing simulation. The outcome persisted distinct state,
fatigue, task result, and usefulness data, and one Episode remained an Episode
rather than being promoted to a proven pattern.

## Tests

- App adaptive-decision suite: 13 test programs passed.
- Theme migration/static suite: 9 cases plus static audit passed.
- Insights V3 regression suite passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.
- Quant targeted Decision runtime suite: 7/7 passed.
- Quant full suite: 768 tests passed in 200.741 seconds.
- Known browser console output: Expo Notifications web-support warning only;
  no Core runtime errors were observed.

Coverage includes owner mature/sparse/empty data, contamination rejection,
as-of cutoff, runtime failure, cache hit/invalidation, context assembly,
evidence downgrade A-E, shorten/move/preserve/impossible patches, exact Undo,
follow-up persistence, Decision Memory, and safety abstention with no mutation.

## Measured performance

- App Preview one-tap decision entry to visible proposal: 388 ms.
- Quant Preview materialization: 92.634 ms for the disposable seven-observation
  owner request.
- Local one-tap decision entry: 290-292 ms.
- Local visible plan mutation: 283 ms.
- App Preview bundle size: approximately 21.5 MB; this remains a known product
  performance limitation.

Browser automation overhead is excluded from pure runtime claims. The Preview
Apply click-to-inspection observation was 1267 ms and includes browser-control
round trips, so it is not reported as engine mutation latency.

## Screenshots

- A: `artifacts/questlife-core-v1/A-today-entry-375.png`
- B: `artifacts/questlife-core-v1/B-owner-sparse-375.png`
- C: `artifacts/questlife-core-v1/C-mature-evidence-demo-375.png`
- D: `artifacts/questlife-core-v1/D-evidence-detail-375.png`
- E: `artifacts/questlife-core-v1/E-plan-patch-preview-375.png`
- F: `artifacts/questlife-core-v1/F-applied-receipt-375.png`
- G: `artifacts/questlife-core-v1/G-follow-up-today-375.png`

All seven files are 375x667 and use the same production components exercised in
Preview. A, B, E, and F show the real Store-backed owner path in the isolated
local origin; the equivalent context, proposal, Apply, and Undo behaviors were
then verified separately in the final App Preview. C and D use the shared
mature-data product surface. G uses the real owner component with only the
local due-time test acceleration described above.

## UNVERIFIED

- Physical iPhone Safari on this final Preview.
- Natural two-hour follow-up arrival without local time acceleration.
- Longitudinal Level B-E owner behavior with enough genuine owner history.
- Real Supabase sync from this isolated Preview, intentionally disabled to
  protect the owner dataset.
- Production deployment. No Production deployment was performed.

## Remaining blockers

- Owner review of the two Preview routes and the A-G evidence set.
- Physical iPhone Safari acceptance if required before promotion.
- The Quant runtime branch currently has no configured Git remote; its code is
  available in the isolated READY Preview and local worktree but is not pushed
  to a remote repository.
- Production promotion remains an explicit later approval gate.
