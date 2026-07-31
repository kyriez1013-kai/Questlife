# QuestLife V11 Stage 2 Rebaseline Revision QA

## Status and boundary

Status: isolated local revision and browser QA complete; physical iPhone
Safari and product/visual approval pending.

The revision is available only at:

`?questlife_v11_ui=stage2-rebaseline`

It does not render through `HomeScreen`, connect to Store writes, or replace
the existing production Today. The unflagged route remains the legacy Today,
and the rejected Stage 2 surface remains isolated at
`?questlife_v11_ui=stage2`.

Nothing in this revision was pushed or deployed.

## Corrected hierarchy

The revised Today order is:

1. Date and daily context.
2. Smart Capture.
3. One permanent latest-record summary row attached to Smart Capture.
4. One Today judgement.
5. One `todayCommand` action.
6. Current state summary with a distinct 44px update control.
7. One compact L1 plan preview when a real plan exists.
8. L2 Instant Read, maximum three plan rows, compact evidence, and a visible
   end collapse control.
9. L3 Capture, State, State Detail, Decision, Record, and Activity History
   sheets.

Recent Execution is intentionally absent as a second inline Today section.
The single history route is:

`latest-record summary -> Activity History sheet -> Record Detail`

The complete production-element-to-handler mapping is documented in
`QUESTLIFE_V11_STAGE2_REBASELINE_MAPPING.md`.

## Layering and sheets

All six L3 fixture surfaces use the same order:

1. Application background layer.
2. Full-screen scrim.
3. Sheet material.
4. Sheet-local controls.

Measured while each sheet was open at 375x667:

- Background transform: `scale(0.96)`.
- Background filter: `blur(10px) brightness(0.58)`.
- Background opacity: `0.38`.
- Background pointer events: `none`.
- Overlay and scrim: `375x667`, including the fixed five-tab navigation.
- Global horizontal overflow: `0px`.

Sheet geometry:

| Sheet | Height | Treatment |
| --- | ---: | --- |
| State | 286px | Content-driven |
| Capture | 350px | Content-driven |
| Decision | 434px | Content-driven |
| Activity History | 466.9px | Approximately 70%; internal scrolling |
| Record | 390px | Content-driven |
| State Detail | 380.5px | Content-driven with internal overflow only when needed |

Opening and closing Decision Details with a physical-coordinate browser click
preserved the outer Today scroll position at `520px`. The sheet did not remount
or reset the outer scroll owner.

## Navigation clearance and touch targets

At 375x667, the fixed navigation occupies `y=595..659`.

- L1 plan preview ends at `y=563`, leaving 32px clearance.
- At the absolute L2 scroll bottom, the final collapse action ends at `y=475`.
- The final evidence row ends at `y=407`.
- No L2 text or control is rendered under the navigation shield.
- The Today outer ScrollView is the only page-level vertical scroll owner.
- Activity History owns only its sheet-local internal scroll.

At 393x852, all visible interactive controls measured at least 44px after the
Instant Read header touch target was corrected from 40px to 44px.

## State input

The compact State sheet contains five semantic choices:

- `1 很差`
- `2 较差`
- `3 一般`
- `4 不错`
- `5 极佳`

Each choice measures 66px high at 375px width. Local fixture interactions
verified selected, saving, saved, and error states. The error fixture kept
`2 较差` selected and displayed a user-facing retry message. The secondary
`记录更多状态信息` action opens the isolated State Detail sheet.

The S0 fixture displays `当前状态尚未记录`; no `x / 5` value is manufactured.

## Latest record and Activity History

- Smart Capture and latest record use an 8px internal gap.
- The latest row is 44px high, has no independent surface, border, rail, or
  chevron, and remains present in the no-data fixture.
- Capture/latest group to judgement spacing is 35px at 375px.
- Tapping the latest row opens Activity History without changing Today height.
- Activity History renders action, result, time, and feedback metadata in its
  internally scrollable sheet.
- No duplicate inline Recent Execution rows exist in L1 or L2.

UNVERIFIED: real production pagination, deletion, latest-summary refresh, and
Store-backed record detail. This isolated fixture does not duplicate those
production handlers.

## Instant Read feedback semantics

The isolated fixture retains two independent values:

- `useful`
- `not_useful`

Local interaction verified:

- Selecting `not_useful` selects only the `没用` control.
- Collapsing Instant Read keeps `反馈已保存 · 没用` visible.
- Reopening restores the `not_useful` selected state.
- Changing to `useful` deselects `not_useful` and selects only `有用`.

The approved production mapping continues to use the existing
`updateDecisionResultFeedback` update path and existing DecisionResult ID.

UNVERIFIED: refresh persistence through this rebased UI. That requires the
later approved integration to pass the existing production handler into the
surface; no second persistence path was added here.

## Deterministic Evidence Stage

The revision reuses `buildV11TodayPresentation` and
`deriveV11EvidenceStage`. No Evidence Stage is stored.

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

S3 requires an explicit current-judgement reference to the same accepted
PatternMemory ID, `primary` or `supporting` use, and stored sample/support
evidence. Missing relationships lower the stage. `lastSeenAt` and `updatedAt`
remain provenance only; no age cutoff was invented. Manual S0/S1/S3 selection
is available only under the explicit non-persistent debug fixture route.

## Directional border geometry

The approved inset geometry remains unchanged. Local DOM measurements:

### 64px pill

- Host and border overlay: `343x64`.
- SVG viewBox: `0 0 343 64`.
- Stroke width: `1.5`.
- Rect: `x/y=0.75`, `width=341.5`, `height=62.5`.
- Pill radius: `31.25 = (64 - 1.5) / 2`.

### Activity History sheet

- Host and border overlay: `375x466.898`.
- Rect: `x/y=0.75`, `width=373.5`, `height=465.398`.
- Rounded-rectangle radius: `25.25`.

Both dark and light variants use matching host/SVG dimensions. Rounded line
caps/joins and the non-zero final directional stop remove the visible
lower-right break while preserving the fading edge.

UNVERIFIED: physical iPhone Safari border seam inspection for this Stage 2
revision.

## Responsive checks

### 375x667

- S0, S1, L1, L2, Capture, State, History, and bottom-scrolled L2 have no
  horizontal overflow.
- The state value, judgement, primary action, update control, plan preview,
  and fixed navigation remain reachable.
- Capture accepted real text input in the local browser.
- L2 renders three plan rows and zero duplicate Recent Execution rows.

### 393x852

- English/light S3 L2 has no horizontal overflow or clipped text.
- Reduced-motion mode resolves all relevant animation and transition durations
  to the immediate fallback.
- All visible controls meet the 44px target.

### 1280x900

- Working content width is `1040px`, not a centred mobile column.
- Navigation is an identifiable `72px` left rail.
- L1 uses the full working width and keeps Capture/latest attached.
- L2 uses a two-column Plan/evidence workspace under the full-width Instant
  Read section.
- State sheet is `620px` wide; Capture is `680px`; History is `760x630px`.
- No floating control overlaps text or evidence.
- No unexplained line, marker, or micro-instrument remains.

## Build and automated validation

- `npx tsc --noEmit`: passed.
- `node --experimental-strip-types src/v11/todayPresentation.test.ts`: passed.
- `npm run build`: passed.
- Expo web output: `dist`.
- JS bundle: `index-b60e17974c002e9c297ad75f54c02ba4.js`.
- Rebaseline CSS bundle:
  `v11-stage2-rebaseline-470fefdf03918548c6ea8659b51f3c95.css`.

## Full-composition performance

Environment:

- Codex in-app browser on macOS (Chromium-based; exact engine version is not
  exposed by the browser tool).
- 300 consecutive `requestAnimationFrame` intervals per scenario.
- Complete rebaseline composition: colour field, two glow objects, material
  and blur layers, fixed navigation, real fixture density, L1/L2, sheets,
  scrolling, light/dark, and reduced motion.

| Scenario | Viewport | P50 | P95 | Frames >20ms | Max |
| --- | ---: | ---: | ---: | ---: | ---: |
| Dark L1 | 375x667 | 16.7ms | 17.6ms | 0 / 300 | 17.8ms |
| Dark L2 with scroll | 375x667 | 16.7ms | 17.6ms | 0 / 300 | 17.8ms |
| State sheet | 375x667 | 16.7ms | 17.6ms | 0 / 300 | 17.8ms |
| Capture sheet | 375x667 | 16.7ms | 17.7ms | 0 / 300 | 17.8ms |
| Decision sheet | 375x667 | 16.7ms | 17.6ms | 0 / 300 | 17.8ms |
| Activity History with internal scroll | 375x667 | 16.7ms | 18.3ms | 0 / 300 | 18.7ms |
| Record sheet | 375x667 | 16.7ms | 18.6ms | 0 / 300 | 18.8ms |
| State Detail sheet | 375x667 | 16.7ms | 18.2ms | 0 / 300 | 18.7ms |
| Capture open/close twice | 375x667 | 16.7ms | 18.2ms | 0 / 300 | 18.7ms |
| Light L2 with scroll | 393x852 | 16.7ms | 18.3ms | 0 / 300 | 18.7ms |
| Reduced-motion L2 with scroll | 393x852 | 16.7ms | 18.2ms | 0 / 300 | 18.6ms |
| Dark L2 with scroll | 1280x900 | 16.7ms | 18.2ms | 0 / 300 | 18.7ms |

This is a fresh Stage 2 measurement. It does not reuse the Stage 0 fixture
result. Compared with the Stage 0 fixture P95 of 17.2ms, the corrected full
composition measured 17.6-18.6ms P95 in the local Chromium-based browser.

No visible flicker, material disappearance, hard glow clipping, or horizontal
layout jump was observed locally.

## Console

No rebaseline runtime error was observed. The only local warning is the
existing Expo Notifications warning that push-token change listeners are not
fully supported on web.

## Artifacts

Final screenshots are stored in:

`artifacts/v11-stage2-rebaseline-revision/`

The directory includes:

- 375px S0 L1, populated L1, L2, L2 bottom, State, History, and Capture.
- 393px English/light L2 and reduced-motion L2.
- 1280px L1, L2, State, History, and Capture.

## Physical iPhone URLs

LAN address during final local QA:

`192.168.71.69`

- S1 L1:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s1`
- S0:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s0`
- S3 L2:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s3&layer=l2&instant=open`
- Capture:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s1&sheet=capture`
- State:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s1&sheet=state`
- History:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s1&sheet=history`
- Light:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s3&layer=l2&theme=light&lang=en`
- Reduced motion:
  `http://192.168.71.69:8085/?questlife_v11_ui=stage2-rebaseline&debugDecision=1&fixture=s3&layer=l2&reducedMotion=1`

## UNVERIFIED

- Physical iPhone Safari Stage 2 revision approval.
- iOS soft-keyboard movement and safe-area behavior in Capture.
- Physical-device flicker, material loss, glow banding, frame pacing, and
  lower-right border seam.
- Persisted Instant Read value after refresh through the rebased UI.
- Real Store-backed state save/Instant Read generation.
- Production Activity History pagination, record deletion, and latest-summary
  refresh.
- Production handlers and feature-flag integration, because `HomeScreen` was
  intentionally not modified.
- Natural Schedule Proposal Apply/Undo and Rescue states.
- Deployment and production V11 verification. Nothing was pushed or deployed.
