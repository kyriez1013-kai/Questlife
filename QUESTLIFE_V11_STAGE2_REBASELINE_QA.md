# QuestLife V11 Stage 2 Rebaseline QA

## Status and boundary

Status: isolated local prototype complete; physical iPhone Safari and product
approval pending.

The prototype is available only at:

`?questlife_v11_ui=stage2-rebaseline`

It does not render through `HomeScreen`, does not connect to Store writes, and
does not replace the existing production Today. The unflagged route remains the
legacy production UI and the rejected Stage 2 surface remains isolated at
`?questlife_v11_ui=stage2`.

Nothing in this rebaseline has been pushed or deployed.

## Information architecture

The rebaseline preserves the current production Today order:

1. Date and daily context.
2. Smart Capture.
3. One latest-record preview when present.
4. One Today judgement.
5. One `todayCommand` action.
6. Current state summary with a separate 44px update control.
7. L2 Instant Read, Today Plan, Recent Execution, and compact evidence.
8. L3 Capture, State, Decision, Record, and History sheets.

The full production-element-to-handler mapping is documented in
`QUESTLIFE_V11_STAGE2_REBASELINE_MAPPING.md`.

The rejected raw evidence strings, internal field names, unexplained
micro-instruments, focus rectangle, ambiguous floating shortcuts, and
body/sleep Today shortcut are absent. Direct Log remains contextual to the
current action. Decision evidence opens through a named evidence entry.

## Deterministic Evidence Stage

The prototype reuses `buildV11TodayPresentation` and
`deriveV11EvidenceStage`. It does not persist an Evidence Stage.

Existing fields used:

- `StateCheckIn.date`
- `StateCheckIn.overall`
- `StateCheckIn.timestamp`
- `TodayDecisionPatternReference.pattern_id`
- `TodayDecisionPatternReference.status`
- `TodayDecisionPatternReference.used_as`
- `PatternMemory.id`
- `PatternMemory.status`
- `PatternMemory.sampleN`
- `PatternMemory.support`

Rules:

- S0: no valid current-day state observation.
- S1: one valid current-day state observation without comparable evidence or a
  relevant supported accepted pattern.
- S2: comparable valid state observations, or an explicit relevant pattern
  reference that does not satisfy all S3 requirements.
- S3: the current judgement explicitly cites the stored PatternMemory ID as
  primary or supporting evidence, reference and stored pattern are accepted,
  and stored sample/support evidence exists.

`lastSeenAt` and `updatedAt` remain provenance only. No age cutoff was added.
Missing relevance, relationship, status, sample, or support lowers the stage.
An unrelated accepted PatternMemory does not promote the current judgement.

Fixture scenario selection is available only with `debugDecision=1`, remains
non-persistent, and has no visible switch unless `debugControls=1` is also
present.

## Responsive visual checks

### 375x667

- Body/document width remained exactly 375px in S0, S1, S3, L1, L2, Capture,
  State, and scrolled Plan/Recent states.
- No global horizontal overflow was measured.
- Smart Capture, judgement, primary command, state reading, and state update
  remain reachable before L2 content.
- Plan and Recent Execution render a maximum of three rows each.
- Scrolling to the final evidence row leaves bottom-navigation clearance.
- Capture and State sheets hide the bottom navigation and keep their controls
  inside the viewport.

### 393x852

- Body/document width remained exactly 393px.
- S3 L2 and English/light Capture states rendered without horizontal overflow
  or clipped text.

### 1280x900

- Body/document width remained exactly 1280px.
- Navigation moves to an identifiable left-side rail and does not overlap
  judgement, evidence, Capture, Plan, or Recent Execution.
- L1 distributes the decision/action group through the middle of the canvas
  rather than ending all content at the top.
- L2 uses a two-column Plan/Recent layout while Instant Read and evidence span
  both columns.
- Capture uses a centered sheet and no floating control overlaps its text.
- No unexplained line, marker, or decorative micro-instrument remains.

## Instant Read feedback semantics

Static repository inspection confirms the existing production path keeps two
distinct values:

- `useful`
- `not_useful`

`markInstantDecisionFeedback` passes the selected value to
`updateDecisionResultFeedback`. The Store maps over the existing
`DecisionResult` ID and replaces `userFeedback`, so changing feedback does not
append a duplicate DecisionResult. The existing collapsed production summary
names the saved value.

The isolated prototype renders distinct selected states and keeps the selected
value when Instant Read is collapsed and reopened in the same fixture session.
It intentionally does not write Store or persistence.

UNVERIFIED: refresh persistence through the rebased UI. That requires approved
production integration using the existing handler; the prototype must not
create a second persistence path.

## Full-composition performance

Build:

`index-174c03029bce31c75d82d4ca811d347f.js`

Environment:

- Codex in-app browser on macOS.
- Exact browser engine/version is not exposed by the test surface.
- Each run sampled 300 consecutive `requestAnimationFrame` intervals.

| Scenario | Viewport | P50 | P95 | Frames >20ms | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dark L1 | 375x667 | 16.7ms | 17.6ms | 1 / 300 | 100.0ms |
| Dark L2 with down/up scroll | 375x667 | 16.7ms | 17.6ms | 0 / 300 | 17.7ms |
| Capture open, close, reopen, close | 375x667 | 16.7ms | 17.6ms | 0 / 300 | 17.7ms |
| Light L2 with scroll | 375x667 | 16.7ms | 17.6ms | 0 / 300 | 17.7ms |
| Reduced-motion L2 with scroll | 375x667 | 16.7ms | 17.7ms | 0 / 300 | 17.8ms |
| Dark L2 with scroll | 1280x900 | 16.7ms | 17.7ms | 0 / 300 | 17.8ms |

The Dark L1 run contains one 100ms initial-navigation interval. It is reported
as observed rather than removed.

This is a new Stage 2 measurement. It includes the complete rebaseline Today
hierarchy, colour field, two glow objects, all material/blur layers,
navigation, L1, L2, Plan, Recent Execution, evidence, scrolling, Capture sheet,
dark/light themes, and reduced motion. It does not reuse the Stage 0 fixture
P95. Compared with the Stage 0 fixture observation of 17.2ms P95, the full
composition measured 17.6-17.7ms P95 in this local browser.

No visible flicker, material disappearance, hard glow clipping, or horizontal
layout jump was observed during these local browser runs.

## Console

No rebaseline runtime error was observed. The only local warning was the
existing Expo Notifications message that push-token change listeners are not
fully supported on web.

## Artifacts

Artifacts are stored in:

`artifacts/v11-stage2-rebaseline/`

They include:

- current production Today at 375 and 1280
- S0/S1/S3 L1
- S1/S3 L2
- Instant Read `not_useful`
- Capture and State sheets
- Plan/Recent/Evidence scrolled state
- 393 light/English coverage
- 1280 L1/L2/Capture/light coverage
- mobile and desktop side-by-side comparisons
- raw performance JSON

## Physical iPhone URLs

LAN address at the end of local QA:

`192.168.71.69`

The server was bound to `0.0.0.0:8085`; localhost and LAN URLs both returned
HTTP 200.

- Base S1:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s1`
- S0:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s0`
- S3 L2:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s3&layer=l2&instant=open`
- Capture:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s3&sheet=capture`
- State:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s1&sheet=state`
- Light:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s3&layer=l2&theme=light`
- Reduced motion:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s3&layer=l2&reducedMotion=1`

## UNVERIFIED

- Physical iPhone Safari Stage 2 rebaseline approval.
- iOS soft-keyboard behavior in Capture.
- Physical-device flicker, material loss, glow banding, and frame pacing.
- Persisted Instant Read selection after refresh through the rebased UI.
- Production Store handlers, because this stage deliberately stops before
  `HomeScreen` integration.
- Natural Schedule Proposal Apply/Undo and Rescue states.
- Deployment and production V11 verification. Nothing was pushed or deployed.

