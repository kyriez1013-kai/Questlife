# QuestLife V11 Stage 2 HomeScreen Integration QA

Status: local feature-flag integration complete; physical iPhone Safari and
production verification remain pending. Nothing in this pass was pushed or
deployed.

## Scope and rollback

- Branch: `design/questlife-product-v2`.
- Entry: `?questlife_v11_ui=stage2`.
- Without that query value, the complete legacy Today still renders.
- The V11 surface reads the existing Store and invokes existing handlers. It
  does not add schemas, persistence, APIs, or a second action authority.
- `todayCommand` remains the sole primary-action authority.
- Evidence Stage is a deterministic, non-persisted presentation result. The
  approved adapter is still the only production mapping; URL stage simulation
  is debug-only.

## Local real-Store verification

| Flow | Result |
| --- | --- |
| Natural S0 | Passed before a current-day state check-in existed. |
| State save | Passed; the existing detailed check-in saved and the display moved to S1. |
| Natural S1 | Passed with the saved `3 / 5` current-day observation. |
| Natural S2 / S3 | UNVERIFIED: the local account had no relevant comparable evidence or accepted PatternMemory relationship. |
| Capture open / cancel | Passed through the real `HomeSmartCapture` sheet. |
| Capture parse / confirm | Passed through the existing local fallback for `SQL 20 minutes`; one 20-minute ExecutionLog was created with its real goal/module links. Live API parsing is unavailable from the static export server. |
| Latest record | Passed; the new record appeared directly below Capture. |
| Activity History | Passed; the existing L3 history surface opened with the real capture. |
| Deletion | UNVERIFIED: the in-app browser exposed the existing web confirm, but its automation dialog controller could not accept it. |
| Instant Read fallback | Passed after state save. AI success and terminal error states are UNVERIFIED on the static server. |
| Instant feedback | Passed for distinct `useful` and `not_useful` values. After refresh, `not_useful` remained selected. The handler updates the existing DecisionResult ID. |
| Direct Log | Passed to the existing Record Progress sheet; no extra test log was saved. |
| Finish | Passed to the existing Record Progress sheet for the already-active local session. |
| Start / one-tap Done | Reachable, but mutation was not repeated because an active session and a temporary SQL record already existed. |
| Plan | Passed with a maximum of three visible rows and existing Start/Done handlers. |
| Decision Details | Passed through the existing details sheet. |
| Schedule Proposal / Rescue | UNVERIFIED: neither natural state existed locally. |
| Rollback | Passed; removing `questlife_v11_ui=stage2` rendered legacy Today with no V11 production root. |

The existing capture UI continued to show the saved fallback confirmation
after the execution was created. This behavior exists in the reused capture
flow and was not changed in the V11 presentation integration.

## Responsive and interaction QA

- Verified at `375x667`, `393x852`, and `1280x900` in the local exported web
  build.
- Verified Chinese/English and `cleanFocus`/`deepWork`.
- Verified normal and debug reduced-motion modes.
- Document width equalled viewport width in all three viewports.
- The flagged desktop outer working width is `1180px`; V11 content is `1040px`.
  Legacy Today keeps the original `contentMaxWidth`.
- At the absolute 375px L2 bottom, the final collapse control ended at 541px
  and navigation began at 614px.
- At the absolute 1280px L2 bottom, the final collapse control ended at 748px
  and navigation began at 847px.
- Capture, State, Activity History, Decision Details, and Record sheets opened
  above the background layer. Capture/Detail close returned to the recorded
  outer-scroll position in the exercised paths.
- Physical iOS soft-keyboard behavior and integrated iPhone frame pacing are
  UNVERIFIED.

## Full-composition performance

Measured in the in-app Chromium browser using 300 animation-frame intervals
per state. The composition used real local Store density, two glow orbs, the
complete V11 field/material layers, and real sheets.

| State | P50 | P95 | Frames >20ms | Max |
| --- | ---: | ---: | ---: | ---: |
| Dark L1 | 16.7ms | 18.0ms | 0 / 300 | 18.7ms |
| Dark L2 | 16.7ms | 18.1ms | 0 / 300 | 18.7ms |
| Capture open | 16.7ms | 18.1ms | 0 / 300 | 18.7ms |
| State open | 16.7ms | 18.3ms | 0 / 300 | 18.7ms |
| Decision Details open | 16.7ms | 18.0ms | 0 / 300 | 18.6ms |
| Record open | 16.7ms | 18.3ms | 0 / 300 | 18.7ms |
| Light L2 steady sample | 16.7ms | 18.0ms | 0 / 300 | 18.6ms |
| Reduced-motion L1 | 16.7ms | 18.1ms | 0 / 300 | 18.6ms |

One light-theme transition sample contained one 82.8ms interval while the
theme changed. The following steady light L2 sample recorded 0 / 300 frames
over 20ms. No visible flicker or material disappearance was observed in local
scrolling and sheet open/close checks.

These measurements do not replace physical iPhone Safari testing and do not
reuse the Stage 0 fixture P95.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Local export bundle: `index-ddd9dc230f3f4bb137f80638ca958d3f.js`.
- Browser console: no V11 runtime error. The existing Expo Notifications web
  support warning remains.

