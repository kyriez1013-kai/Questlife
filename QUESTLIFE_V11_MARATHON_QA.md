# QuestLife V11 UI Marathon - Local Acceptance

Date: 2026-08-12  
Branch: `design/questlife-product-v2`  
Scope: local V11 product completion only; no push, Preview, production, Store,
schema, API, persistence, or Quant Engine changes.

## Delivery boundary

- The complete V11 product is available only with
  `questlife_v11_ui=v11-marathon`.
- The no-flag route still renders the legacy Today and remains the immediate
  rollback path.
- `todayCommand` remains the executable authority.
- The pre-existing untracked `docs/quant/` directory was not staged or edited.
- No fixture record or Quant debug state is written to production data.

## Surface completion

| Surface | Result | Local evidence |
| --- | --- | --- |
| Onboarding / cold start | DONE, with fresh-storage scenario UNVERIFIED | Returning-user restart opens the V11 onboarding flow, can be dismissed without data loss, supports zh/en and dark/light, and keeps template/manual paths wired to existing handlers. A truly empty browser store was not manufactured. |
| Today | DONE | V11 route shows date/context, Capture, latest record, one judgement, one authoritative action, state entry, compact plan, and progressive Instant Read. Legacy no-flag Today remains unchanged. |
| Smart Capture / Record Progress / State / History | DONE visually; live parse UNVERIFIED | Shared V11 sheet shell, internal scroll, sticky footer, safe bounds, keyboard-ready composer, cancel paths, history detail, and existing handlers remain wired. `/api/parse` is not available from the static local export. |
| Goal / Module / Skill | DONE | Compact Goal hierarchy, populated and low-data states, Goal detail, Module membership, Skill rows, create/edit/link/unlink entry points, and existing Quant drill-down remain reachable. Create sheets were opened and cancelled without mutation. |
| Schedule | DONE visually and functionally; delete confirmation MANUAL PENDING | Day/week/month/year instruments render real blocks and preserve plan semantics. A temporary block was created, edited, and persisted after refresh. Browser automation could not accept the native confirmation dialog, so deletion confirmation remains manual and the local QA profile still contains `QA 临时日程已编辑`. |
| Settings / Data Sources / Data Health / Legal | DONE | Stable V11 groups, honest unavailable-source states, appearance/language, manual context, data boundaries, backup/import entry points, and third-party licensing are present. Normal copy no longer mentions Developer Tools. |
| Personal Quant | DONE | Stage 3.15 baseline preserved. Custom Range, Last N days, calendar range, Last N observations, quick presets, Fit, Zoom Out, chart type, Indicators, Compare, Analyst, Evidence, Signals, and interpretation inspectors remain available. |
| Shared navigation / sheets | DONE | Five-tab navigation, bottom inset, sheet scrim, content-safe body, sticky footer, close controls, and one-page scroll ownership were checked across representative routes. |

## Quant contracts checked

- Last 5 days updates the visible range label to `最近 5 天`.
- Last 10 observations updates the label to `最近 10 条观测`.
- End-before-start keeps the calendar Apply action disabled.
- Fit restores only the viewport framing.
- Zoom Out changes magnification without changing instrument, timeframe, chart
  type, Indicators, or Compare state.
- Chart timestamps are normalized to UTC timestamps before reaching Lightweight
  Charts.
- The presentation layer does not synthesize candles; candle values remain
  Quant-provided artifacts.

## Responsive, language, and theme QA

- 320: all five primary tabs remained within the document width; Today and
  Custom Range remained usable in light English.
- 375x667: Today and Record Progress were checked; the sheet body scrolled
  internally and its footer ended above the viewport edge.
- 393x852: Today, all major Today sheets, Goals, Goal detail, all four Schedule
  scales, Personal Quant, Custom Range, Settings, dark/light, and zh/en were
  checked without document-level horizontal overflow.
- 768: Personal Quant used the wider workspace without page overflow.
- 1280x900: Today, Goals, Goal detail, Schedule, Quant, Settings, and onboarding
  used intentional desktop widths without a phone-column fallback.
- Reduced-motion code paths remain connected to the existing V11 reduced-motion
  adapter; physical motion feel is UNVERIFIED.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Export output: `dist`.
- Web bundle: `index-3fcb3ae4bbc9d0dd8cb1dcf07eaa35a1.js`.
- Personal Quant presentation tests: 8 passed, 0 failed.
- Mature Quant at 393x852 in the local in-app Chromium probe:
  P50 `16.7ms`, P95 `18.2ms`, `0/145` frames above 20ms.
- No runtime error remained after the timestamp normalization fix.
- The only retained console warning is the known Expo Notifications web support
  warning.

## Representative screenshots

Local screenshots were captured under
`/private/tmp/questlife-v11-marathon/`, including Today, sheets, Goal detail,
Schedule day/week/month/year, Quant empty/mature/custom-range, Settings,
onboarding, zh/en, dark/light, 320, 375, 393, 768, and 1280 states.

## Remaining issues and honest limits

- `UNVERIFIED`: physical iPhone Safari for this marathon build.
- `UNVERIFIED`: Vercel Preview, production, real Health/passive data, and real
  user lifecycle data.
- `UNVERIFIED`: live `/api/parse` from the static local export.
- `UNVERIFIED`: natural Rescue and safe Schedule Proposal apply/undo states were
  not manufactured.
- `PARTIAL`: the existing detailed state form initializes six stored dimensions
  to neutral `3`. Removing that default requires an explicit state ownership and
  validation decision; this pass did not disguise missing input as a new schema.
- `MANUAL PENDING`: remove the local-only `QA 临时日程已编辑` block after accepting
  its browser confirmation dialog. It was never pushed or deployed.
- The main JS bundle is `20.9 MB`; route-level code splitting remains a genuine
  performance opportunity outside this presentation-completion pass.

## Commits

- `b5a27d6` audit remaining V11 product surfaces
- `0bd51de` unify V11 product feature route
- `0c24af8` finish V11 onboarding and cold start
- `6d219e1` finish V11 goal working hierarchy
- `f0f8d46` complete V11 schedule instruments
- `099388b` finish V11 settings and data sources
- `c275237` align schedule input contract
- `558eca7` complete Quant range viewport controls
- `aa549a1` harden V11 shared sheets and controls
- `9132404` align terminal candle contract tests
- `362d585` normalize terminal chart timestamps
- `0dac448` clean up V11 user-facing settings copy
