# QuestLife V11 Stage 2 Local QA

Status: local implementation and browser QA complete on
`design/questlife-product-v2`. Physical iPhone Safari approval is pending.
Nothing in Stage 2 has been pushed or deployed.

## Migration boundary

- V11 Today is available only through `?questlife_v11_ui=stage2`.
- The unflagged route still renders the legacy Today and the existing five-tab
  navigation.
- `todayCommand` remains the only executable action authority.
- No Store, API, schema, persistence, handler, or entity contract changed.
- HomeScreen retains one outer vertical `ScrollView`.
- Today Plan and Recent Execution render at most three rows each.

## Deterministic evidence-stage fields

The presentation adapter reads only existing fields:

- `StateCheckIn.date`, `timestamp`, and `overall`
- judgement `patternReferences[].pattern_id`, `status`, and `used_as`
- stored `PatternMemory.id`, `status`, `sampleN`, and `support`
- `PatternMemory.lastSeenAt` and `updatedAt` are provenance only

Rules:

- S0: no valid current-day `StateCheckIn`.
- S1: one valid current-day observation and no relevant comparable evidence.
- S2: at least two valid comparable state observations, or an explicit
  primary/supporting reference to a stored pattern.
- S3: the current judgement explicitly references the same stored pattern as
  primary/supporting evidence, both reference and stored pattern are
  `accepted`, `sampleN > 0`, and stored support is non-empty.
- Missing relationships or support lower the stage. No age or freshness cutoff
  is derived from timestamps.
- Manual stage/state simulation is gated by the existing Decision debug mode
  and is not persisted.

Pure-function checks cover S0, unrelated accepted patterns, S2 comparable
observations, missing support, valid S3, caution-only references, and mismatched
pattern IDs.

## Existing feature reachability

| Existing feature | V11 entry | Layer | Existing authority/handler |
| --- | --- | --- | --- |
| State assessment | adjacent 48px state control; S0 reading object | L1 | `openStateModal` |
| Detailed state check-in | state sheet | L3 | existing state save flow |
| Smart Capture | 48px floating Capture trigger | L1 | `HomeSmartCapture` |
| Pending capture confirmation | inside original Capture flow | L3 | existing capture handlers |
| Today judgement | reading, judgement, reason | L1 | existing Today presentation |
| Primary action | one material action | L1 | `runV11PrimaryCommand` -> `todayCommand` |
| Evidence | reading tap expands in place | L2 | presentation-only evidence |
| Decision details/feedback | Today decision details utility | L3 | existing details and feedback handlers |
| Instant Read/feedback | compact utility state | L2 | existing Instant Read handlers |
| Direct Log | `做完后记录` / `Log after done` | L2 | existing `openModal` |
| Start/Done | compact Today Plan row actions | L2 | existing start/one-tap handlers |
| Recent Execution/Delete | maximum three compact rows | L2 | existing delete confirmation |
| Activity History | original history entry inside Capture | L3 | existing history component |
| Body/sleep context | context utility | L3 | existing parser/save handlers |
| Schedule proposal | contextual utility when present | L2 -> Schedule | existing navigation/review |
| Apply/Undo | Schedule-owned review | L3/L4 | existing proposal handlers |
| Rescue | contextual utility when unfinished rescue exists | L2 | existing rescue handler |
| Active session finish | contextual utility when active | L2 | existing finish handler |

Capture, context, and decision details now snapshot and restore the one outer
scroll position. The local pointer test restored `430 -> 430`.

## Local validation

- `npx tsc --noEmit`: passed.
- Presentation adapter pure-function test: passed.
- `npm run build`: passed.
- Expo output: `dist`.
- Final local JavaScript bundle:
  `index-92a11e80c889a9af70dbfac57211f99c.js`.
- 375x667: body and outer ScrollView are both 375px wide; no horizontal
  overflow.
- 393x852: body and outer ScrollView are both 393px wide; no horizontal
  overflow.
- 375x667 touch geometry: primary action to Capture gap 14px; Capture to bottom
  navigation gap 17px; no overlap.
- 393x852 touch geometry: Capture to bottom navigation gap 17px; no overlap.
- Reduced-motion debug path resolves rolling-number animation to `0.001ms`,
  removes delay, and leaves the day cursor static.
- English + cleanFocus rendered at 1280px without horizontal overflow, then
  Chinese + deepWork was restored.
- All five navigation tabs selected successfully.
- The unflagged root rendered legacy Today with no V11 surface.
- Smart Capture, Decision details, body/sleep context, and direct Log opened
  their existing UI. Direct Log was cancelled without writing data.
- Closing Decision details and context restored the prior scroll position.
- Direct 1280 page console: no runtime error. The existing Expo Notifications
  web-support warning remains.

## Full Today performance

The Stage 2 page performed its own gated `requestAnimationFrame` measurement
with `debugDecision=1&debugPerformance=1`. This is a new measurement of the
complete S3 Today composition, with L2 expanded and repeated scrolling:

- frames: 240
- mean: 16.666ms
- p50: 16.7ms
- p95: 17.2ms
- p99: 17.5ms
- max: 17.6ms
- intervals over 20ms: 0
- intervals over 32ms: 0

This does not reuse the Stage 0 fixture result.

## Screenshot index

- `artifacts/v11-stage2/today-375-s0-l1-framed.png`
- `artifacts/v11-stage2/today-375-s1-l1-framed.png`
- `artifacts/v11-stage2/today-375-s1-l2-framed.png`
- `artifacts/v11-stage2/today-375-s2-l1-framed.png`
- `artifacts/v11-stage2/today-375-s2-l2-framed.png`
- `artifacts/v11-stage2/today-375-s3-l1-framed.png`
- `artifacts/v11-stage2/today-375-s3-l2-framed.png`
- `artifacts/v11-stage2/today-375-s3-reduced-framed.png`
- `artifacts/v11-stage2/today-393-s3-l1-framed.png`
- `artifacts/v11-stage2/today-1280-s3-deepWork.png`
- `artifacts/v11-stage2/today-1280-english-cleanFocus.png`

S0 has no L2 reading/evidence expansion until the user records a valid current
state, so an S0 L2 screenshot is intentionally absent.

## UNVERIFIED

- Physical iPhone Safari Stage 2 at 375x667 and 393x852.
- iOS soft-keyboard behavior while Capture is open.
- A real-time video recording; the available browser surface captures still
  images but does not expose video capture.
- Saving a new state and the resulting Instant Read/feedback cycle; local QA
  avoided creating additional persistent test data.
- Start/Finish, Done, deletion, pending-capture confirmation, schedule
  Apply/Undo, and Rescue writes. Existing handlers are connected, but these
  mutating or natural-state flows were not forced for local QA.
- Natural S3 from an accepted relevant PatternMemory in the current local
  account. S3 logic is covered by pure-function tests; the visual S3 fixture is
  debug-only.

