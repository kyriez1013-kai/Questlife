# QuestLife Stage 3.13 - Personal Quant Terminal UX Rewrite QA

## Scope And Boundaries

Stage 3.13 is an isolated presentation rewrite behind:

`?questlife_v11_ui=stage3-personal-terminal`

The unflagged Insights route remains the rollback. The work stays on
`design/questlife-product-v2` and has not been pushed or deployed.

Unchanged:

- Quant Engine, Observation Ledger, artifact generation, and calculations
- candle and Signal semantics
- schemas, Store, APIs, persistence, and production data pipeline
- real Health integration and production user data

No Life Score, finance action semantics, frontend OHLC calculation, causal
claim, fabricated baseline, or new model was added.

## Product Research Applied

The focused research is recorded in
`QUESTLIFE_STAGE3_13_MARKET_UX_RESEARCH.md`.

Stage 3.13 adopts the interaction architecture of professional market tools:

- compact editable watchlists
- chart-centred instrument analysis
- range controls close to the chart
- progressive inspectors for Evidence, Signal, and Analyst output
- independent multi-pane workspaces with optional time/crosshair sync
- local workspace preferences and fast instrument switching

It rejects stock-trading semantics, price-language metaphors, buy/sell states,
profit/loss framing, and a universal personal score.

## Implemented Presentation Architecture

### Watchlist

- Compact mobile pinned strip and desktop watchlist rail
- Add/search, remove, pin, reorder, and accessible move controls
- Mini-series, current reading, reference-relative state, and evidence cue
- Goal and Skill instruments participate in the same watchlist
- Debug-fixture preferences are isolated per lifecycle scenario
- Real-data preference storage retains the existing real namespace

### Time Ranges

- Capability-filtered quick ranges: 1D, 2D, 3D, 5D, 7D, 14D, 1M, 3M,
  6M, 1Y, and ALL where supported
- Exact last-N-days input, including 4D and 9D
- Calendar range and last-N-observations controls
- User-configurable quick-range set
- Display range remains separate from Quant-provided candle buckets
- Candle selection only exposes Quant artifacts that already exist

### Chart And Inspectors

- Chart is the primary analytical object
- Compact View, Indicators, Compare, and Reset commands
- Line, bar, and Quant-provided candle views are capability-driven
- Compare is limited to a readable second series
- Analyst supports collapsed, peek, and full-Sheet states
- Evidence and Signal use compact rows with focused Sheets
- No chart-library or implementation copy appears in the terminal

### Multi-Chart

- Single, two, four, and six-pane workspace layouts
- Mobile two-pane stack and compact four-pane market board
- Tablet two-pane layout
- Independent instrument, range, view, and indicator state per pane
- Optional synchronized visible time and crosshair contracts
- Daily, Study, Fitness, Recovery, and local custom workspace preferences

## Lifecycle Verification

All checks below used existing deterministic V0.4.2 fixtures.

| State | Local result |
| --- | --- |
| no data | Honest empty state; no score, baseline, or trend fabricated |
| passive day 1 | Available passive instruments appear immediately |
| steps only | Current, reference, line/candle capability, Evidence, and Analyst render |
| rich passive | Multiple passive instruments and watchlist navigation render |
| QuestLife only | Execution and state instruments render without passive-data claims |
| mixed mature | Dense market, Signals, Evidence, and multi-pane workspaces render |
| Focus 1 observation | `4 / 5`, one real point, and first-observation language render |
| Focus 2 observations | Current/previous comparison renders without baseline language |
| Focus 3 observations | Short-window line and Quant-approved micro representation render |
| Goal | Goal scope remains visible and selectable |
| Skill | Skill scope remains visible and selectable |

The first-observation QA exposed a presentation bug: a bucket timestamp could
fall before the source observation timestamp and be filtered out. The fix uses
existing source IDs to retain selected real observations without recalculating
Quant values. A pure-function regression test covers the boundary.

## Responsive And Language Verification

Local exported web was checked at:

- `375x667`
- `393x852`
- `768x900`
- `1280x900`

Verified locally:

- no document-level horizontal overflow in the reviewed states
- 375px chart, compact Analyst, Sheets, two-pane, and market-board layouts
- 393px mature instrument layout
- 768px instrument, watchlist/chart, and two-pane layouts
- 1280px one, two, four, and six-pane workstation layouts
- Chinese and English copy on the reviewed routes
- dark and light themes
- bottom navigation remains distinct from terminal controls
- focused Sheets return to the prior scroll position
- unflagged route continues to render legacy Insights
- no runtime error in the final local console pass; the existing Expo
  Notifications web-support warning remains

## Interaction Verification

Locally verified through the actual exported UI:

- watchlist open/close
- instrument select
- add/search, pin, remove, and accessible reorder
- preference isolation across fixture lifecycle routes
- quick range and custom 4D/9D range
- custom range Sheet
- line/candle selector using available Quant artifacts
- indicator selection
- compare selector and Steps/Sleep comparison
- Analyst collapsed, peek, and expanded states
- Evidence and Signal Sheets
- one, two, four, and six-pane layouts
- Goal and Skill pane selection
- workspace sync controls

The visual crosshair cursor, touch long-press drag animation, physical pinch
zoom, and physical one-finger pan remain unverified. Browser automation could
verify controls and callback wiring, but not those physical gestures.

## Performance

Measurements used the complete Stage 3.13 exported-web composition with the
debug performance gate enabled.

| Viewport | P50 | Worst P95 | Frames over 20ms | Notes |
| --- | --- | --- | --- | --- |
| 375x667 | 16.7ms | 17.6ms | 0/39 per sampled operation | watchlist open/reorder, ranges, view, Analyst, Evidence, Compare, workspaces, chart callbacks |
| 393x852 | 16.7ms | 17.4ms | 0/39 per sampled operation | instrument, range, indicators, Sheet, chart callbacks |
| 768x900 | 16.7ms | 17.5ms | 0/39 per sampled operation | watchlist, Evidence, Sheet, chart callbacks |
| 1280x900 | 16.6-16.7ms | 17.7ms | one 1/38 anomaly | anomaly occurred while opening custom range; other sampled operations were 0 |

The `chart-pan-zoom` debug label also fires from chart change callbacks. It is
not evidence of physical pan or pinch behaviour. Initial mount was not captured
as a separately named interaction sample.

## Automated Validation

- `npx tsc --noEmit`: passed
- `npm run build`: passed
- exported web output: `dist`
- JS bundle: `index-48bcfe7afefd092c52e4eb154878456e.js`
- Personal Terminal workspace pure-function test: passed
- `git diff --check`: passed before documentation closeout

Known legacy test-runner constraints were not introduced by Stage 3.13:

- the raw Node V0.4.2 adapter test needs extension-aware module execution
- the older presentation test still expects frontend OHLC behaviour that the
  approved Quant boundary forbids

## Screenshot Evidence

The 37 required views plus two additional comparison states are stored in:

`artifacts/v11-stage3-13-market-ux/`

Coverage:

- `01`-`24`: 375/393 mobile dark/light, watchlist, ranges, Focus lifecycle,
  Analyst, Evidence, Signal, Compare, indicators, multi-chart, Goal, and Skill
- `25`-`34`: 1280 desktop workstation, 2/4/6 panes, sync controls, custom
  range, Goal/Skill workspace, market board, watchlist edit, and light theme
- `35`-`37`: 768 tablet terminal, two-pane, and watchlist/chart layouts
- `00`: pre-rewrite comparison
- `30b`: applied 9-day custom range

## Review URL

`http://localhost:8085/?questlife_v11_ui=stage3-personal-terminal&quantLifecycle=market_mixed_mature&debugLanguage=zh&debugTheme=dark`

## UNVERIFIED

- physical iPhone Safari materials, touch gestures, and frame pacing
- Vercel Preview and production
- real Health/passive data
- production API/schema integration
- real-user Day 1 -> Day 90 lifecycle behaviour
- touch long-press drag animation, physical pinch/pan, and visible synchronized
  crosshair cursor

No push, deployment, Store/schema/API change, advanced Quant model, real data,
or Stage 4 work was performed.
