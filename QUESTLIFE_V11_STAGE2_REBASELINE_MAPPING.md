# QuestLife V11 Stage 2 Rebaseline Mapping

## Boundary

The rebaseline is an isolated presentation prototype at:

`?questlife_v11_ui=stage2-rebaseline`

It does not render through `HomeScreen`, does not write Store or persistence,
and does not replace the existing production Today. The rejected Stage 2
surface remains isolated at `?questlife_v11_ui=stage2`; the unflagged route
continues to render the legacy production Today.

The fixture controller is intentionally non-persistent. The handlers named
below are the existing production handlers that must be passed through during
an approved integration phase. This prototype does not duplicate them.

## Production hierarchy to rebaseline hierarchy

| Current production element | Rebased V11 element | Same information? | Same production handler? | Same discoverability? | Intentional visual change |
| --- | --- | --- | --- | --- | --- |
| Date and daily context | Compact context line at the top | Yes | Display-only; no handler | Yes, first item | Removes the large page title while retaining date, daypart, and evidence-stage copy |
| Smart Capture input | Full-width compact capture entry | Yes | `HomeSmartCapture` remains the production owner of parse, confirmation, cancel, pending capture, delete, and history | Yes, immediately visible and named | Uses restrained glass depth; it is not reduced to an unexplained `+` |
| Latest record preview | One low-emphasis summary row attached to Smart Capture | Yes | Existing `HomeSmartCapture` record detail/delete flow and Activity History entry | Yes, always present directly below Capture | No container, coloured rail, chevron, or inline expansion; empty data reads `还没有记录` |
| Unified decision judgement | One judgement block | Yes | Existing `todayDecisionPresentation` and `runTodayCommand` | Yes, highest textual emphasis | No readiness score, raw field name, or technical Evidence row is exposed |
| Primary `todayCommand` | One glass action pill | Yes | Existing `runTodayCommand(todayCommand.primaryAction)` | Yes, single dominant action | Visual material changes only; authority remains `todayCommand` |
| Direct Log | Small contextual action directly below the current command and contextual actions on plan rows | Yes | Existing `openModal(...)` | Yes, but no longer a standalone shortcut chip | Demoted to contextual secondary action |
| Decision evidence | `查看依据` entry in compact evidence summary and L3 sheet | Yes | Existing `setTodayDecisionDetailsOpen(true)` / details-sheet flow | Yes | No raw evidence records in L2 |
| Body / sleep context | Passive evidence inside Decision Details only | Yes | Existing context parser and Settings Data Sources flow remain unchanged | Available through Decision Details and Settings | Removed as a Today shortcut/module |
| Current state assessment | Compact state summary plus adjacent labelled `更新 / Update` control | Yes | Existing `openStateModal`, quick `saveStateCheckIn`, and `saveStateAssessment` | Yes, visible without a separate module | Quick choices retain `很差 / 较差 / 一般 / 不错 / 极佳`; `记录更多状态信息` maps to the existing detailed state handler |
| Instant Read | Collapsible L2 section after a state exists | Yes | Existing `generateInstantDecisionBrief`, `setInstantReadExpanded`, and `markInstantDecisionFeedback` | Yes after state submission; saved summary remains visible | The expanded body no longer competes with the primary decision |
| Instant feedback | Separate `有用 / Useful` and `无用 / Not useful` selected states | Yes | Existing `updateDecisionResultFeedback(id, 'useful' \| 'not_useful')` through `markInstantDecisionFeedback` | Yes when Instant Read is reopened | No generic acknowledged state; the selected persisted value remains named |
| Today Plan | One compact L1 preview plus maximum three L2 time rows | Yes | Existing `startSession` and `oneTapComplete` | Yes in both L1 and L2 when a real plan exists | L1 names item count and the next real block; L2 removes large task cards while retaining title and duration |
| Recent Execution | Removed as a duplicate inline Today section | Yes, through the single history route | Existing record-detail entry and `confirmDeleteTodayLog` remain inside Activity History | Yes through the latest-record row | Intentional product decision: Today does not render both a latest summary and a second Recent Execution section |
| Activity History | Latest-record summary opens an L3 Activity History sheet | Yes | Existing `ActivityHistorySheet` pagination/lazy rendering, record detail, and delete handlers | Yes, directly under Smart Capture | Full history scrolls internally and never increases Today page height |
| Schedule Proposal | Conditional contextual row inside Today Plan | Yes when a proposal exists | Existing `openScheduleProposalReview`; Schedule remains review/apply/undo owner | Yes when present | Not exposed as global Today navigation |
| Apply / Undo | Schedule proposal review sheet only | Yes | Existing proposal apply/undo handlers and safety checks | Same conditional reachability | No duplicate authority in Today |
| Rescue | Replaces or supports the current action only when the existing unfinished-rescue condition is true | Yes when present | Existing `openRescueFlow` and rescue handlers | Same conditional reachability | No permanent rescue module |
| Active Start / Finish | Current action/plan contextual state | Yes when present | Existing `startSession` / `finishSession` | Same conditional reachability | No standalone utility shortcut |
| Record detail and deletion | L3 record sheet, with delete retained at integration | Yes | Existing `confirmDeleteTodayLog` | Reached from Activity History | Destructive action is not promoted in L1/L2 |

## Progressive disclosure contract

### L1

- Date and daypart.
- Smart Capture.
- One latest-record row attached to Smart Capture; the empty row remains in
  place to prevent layout shift.
- Decision judgement.
- One real `todayCommand`.
- Current state summary and labelled update control.
- One compact real-plan preview when a plan exists.

### L2

- Collapsible Instant Read.
- Today Plan, maximum three rows.
- One compact evidence summary.
- A visible collapse action at the plan-preview location and again after the
  final L2 item.

### L3

- Smart Capture flow.
- State assessment and detailed state check-in.
- Decision Details.
- Record Detail.
- Activity History.

Every L3 surface uses the same layer order: application background, full-screen
scrim, sheet, and sheet-local controls. While a sheet is open, the application
layer scales to `0.96`, blurs by `10px`, reduces brightness/opacity, and becomes
non-interactive. The scrim covers the fixed five-tab navigation. The short State
sheet remains content-driven; the approximately 70% internal-scroll treatment
is reserved for Activity History.

No raw evidence record, internal field name, or debug identifier is product
copy in L1 or L2.

## Deterministic Evidence Stage

The prototype reuses `buildV11TodayPresentation` and
`deriveV11EvidenceStage`; it does not define a second stage model.

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

- S0: no valid state observation for the current day.
- S1: one valid current-day observation with no comparable evidence and no
  relevant supported pattern reference.
- S2: comparable valid state observations, or an explicit relevant pattern
  reference that does not satisfy every S3 requirement.
- S3: the current judgement explicitly uses the PatternMemory ID as primary or
  supporting evidence, both reference and stored pattern are `accepted`, and
  stored `sampleN` plus non-empty support exist.

`lastSeenAt` and `updatedAt` remain provenance metadata. They are not converted
into a freshness threshold. Missing relationship or support lowers the stage.
No stage value is written to Store or persistence.

The QA query can select fixture scenarios only when `debugDecision=1`. It is
non-persistent and has no user-facing stage switch unless
`debugControls=1` is also present.

## Scroll and volume contract

- The isolated prototype owns one vertical `ScrollView`.
- Approved production integration must continue using the existing
  `HomeScreen` outer `ScrollView` as the only vertical owner.
- Today Plan is capped at three rows.
- Recent Execution is not duplicated inline.
- The latest-record row is the only Today entry to Activity History.
- Activity History remains an internally scrollable sheet and keeps the
  production `HISTORY_PAGE_SIZE` / load-more behavior at integration.
- L2 increases page height but does not render unlimited records.
- Sheets cover the page without replacing or mutating data.
- Mobile scroll content reserves fixed navigation height, safe-area inset, and
  additional visual clearance. Closing a sheet does not remount the outer
  scroll owner, so its position remains unchanged.

## Today-specific primary hierarchy

Today is a decision surface. When a useful current judgement exists, that
judgement and the single `todayCommand` action remain the primary visual
message. This is an explicit Today-only exception to the V10 rule that a state
reading must always be the hero object.

- S0 shows no false state number and makes state recording the main entry.
- S1-S3 keep the current real state visible and directly updateable in the
  default viewport.
- Judgement language remains bounded by the deterministically derived Evidence
  Stage.
- Metadata such as observation count never becomes a hero number.

## Instant Read feedback semantics

Production integration must continue to use the existing
`DecisionResult.userFeedback.rating` source of truth:

- `useful` and `not_useful` remain distinct values.
- Each value has a distinct selected state.
- `updateDecisionResultFeedback` updates the existing DecisionResult.
- Reopening reads the latest persisted selection.
- The collapsed summary names the saved selection.
- Decision Memory semantics and schema remain unchanged.

The isolated prototype renders both selected states but does not write
production data. Persistence verification is therefore deferred to an approved
integration phase.

The prototype also displays `saving` and `saved` interaction states and retains
the selected value while Instant Read is collapsed and reopened. It does not
create a second DecisionResult or persistence path.
