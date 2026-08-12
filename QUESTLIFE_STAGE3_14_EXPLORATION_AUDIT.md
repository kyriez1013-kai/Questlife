# QuestLife Stage 3.14 - Exploration Baseline Audit

## Scope

Stage 3.14 remains isolated behind:

`?questlife_v11_ui=stage3-personal-terminal`

The audit covers presentation and interaction architecture only. Quant Engine,
Observation Ledger, artifacts, calculations, schemas, Store, APIs, Today,
Schedule, Decision Intelligence, and Calibration remain unchanged.

## Stage 3.13 Baseline

The existing terminal already provides:

- a user-controlled Watchlist with pin, add, remove, reorder, Goal, and Skill;
- configurable quick and custom display ranges;
- capability-driven line, bar, and precomputed candle views;
- comparison and indicator controls;
- one, two, four, and six-pane workspaces;
- Evidence, Signal, Event, Observation, Analyst, and workspace Sheets;
- isolated presentation preferences and fixture namespaces.

The primary chart is already the dominant analytical object. Stage 3.14 should
not replace it or add a second analytical system.

## A. Technical Scroll Bugs

The application shell intentionally keeps `body` at viewport height with
`overflow: hidden`; the React Native Web `ScrollView` is the vertical owner.
At 375x667 the Stage 3.13 single-chart composition measured 754px of scroll
content inside a 667px scroll owner, so the page itself is scrollable.

The reproducible technical conflict is chart gesture ownership:

- wheel input over the chart is consumed by Lightweight Charts;
- the same wheel input over the page edge scrolls the outer `ScrollView`;
- chart hosts currently expose no explicit mobile `touch-action` contract;
- the chart config enables mouse-wheel handling at every viewport.

Stage 3.14 will preserve horizontal chart interaction while making vertical
page intent explicit on mobile and disabling chart wheel capture at mobile
widths. Physical pinch and pan remain device-QA items.

## B. Intentional Non-Scroll Design

Stage 3.13 deliberately keeps the single-instrument page close to one viewport.
Evidence, Signal, Analyst, range, view, compare, indicators, events, and
workspaces already open in Sheets rather than a four-screen report. That
progressive-disclosure boundary is correct and remains.

The main page may grow to approximately 1-1.25 viewports, but Stage 3.14 will
not restore an indefinitely long analytical feed.

## C. Product Exploration Deficiency

The closed feeling is primarily information architecture:

- the pinned strip is an endless horizontal row on mobile;
- chart actions are small unlabeled icons split from range controls;
- Evidence, Signal, and Analyst are presented as three equal status cells;
- Analyst Peek contains explanation but does not operate the chart;
- Event inspection exists only after discovering a chart marker;
- advanced workspace and Market Board capabilities are hidden in one generic
  workspace Sheet;
- no persistent near-chart affordance communicates Compare, Events, Signal,
  Evidence, or range-analysis depth.

## Stage 3.14 Presentation Ownership

Keep:

- `personalTerminalWorkspace.ts` for existing presentation preferences,
  ranges, Watchlist ordering, and pane layout;
- `PersonalTerminalChart.tsx` for existing chart artifacts and gestures;
- `PersonalTerminalSheet.tsx` for context-preserving progressive disclosure;
- `PersonalTerminalWatchlist.tsx` for daily Watchlist control;
- `PersonalTerminalWorkspaceSurface.tsx` as the isolated orchestrating surface.

Add only deterministic presentation mapping for:

- Analyst modules derived from current series, comparison candidates, Signals,
  Events, coverage, and limitations;
- chart-highlight windows sourced from existing Event or Signal timestamps;
- visible exploration tools based on existing capabilities.

No new claim, score, correlation, forecast, candle, or persistence field is
introduced.

