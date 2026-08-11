# QuestLife Stage 3.13 Component Audit

## Boundary

The rewrite stays inside `?questlife_v11_ui=stage3-personal-terminal`.
`V11InsightsScreen` continues to own Store reads, fixture selection, theme,
language, and the isolated-route boundary. Quant adapters and artifacts remain
the only authority for candle capability, baseline, evidence, Signal, and
Analyst output.

## Keep

- `personalTerminalPresentation.ts`: current terminal model, observation
  provenance, capability flags, precomputed views, and Quant-owned candles.
- `quantV041Adapter.ts` / `quantV042Adapter.ts`: artifact-to-presentation
  adapters without new analytical calculations.
- `PersonalTerminalChart.tsx`: `lightweight-charts` rendering, pan, pinch,
  crosshair, event markers, comparison series, and imperative reset.
- `PersonalTerminalSheet.tsx`: shared V11 Sheet material and safe-area shell.
- `PersonalTerminalIcon.tsx`: one terminal icon family.
- Existing lifecycle fixtures and presentation/value tests.
- `V11InsightsScreen.tsx`: Store orchestration, feature flag, rollback, and
  local performance probe.

## Refactor

- `V11PersonalTerminal.tsx`: keep state orchestration and the legacy
  implementation, but route the default isolated experience into a dedicated
  Stage 3.13 workspace component. The legacy surface remains available with a
  non-persisted debug query for immediate comparison.
- `V11PersonalMarketOverview.tsx`: its real mini-series renderer and compact
  reading logic become the basis of an editable Watchlist and Market Board.
- Range selection: replace the fixed visible-range row with a presentation
  contract that separates display range from candle bucket.
- Analyst, Signal, Evidence, Events, Compare, Indicators, and chart type:
  retain content and handlers, but move them to compact chart-adjacent strips
  and progressive Sheets.
- CSS: add one owned Stage 3.13 workspace layer rather than another set of
  overrides against the Stage 3.11 selectors.

## Deprecate From The New Default Surface

- Fixed Overview / Activity / Recovery / Sleep / Focus / Goal / Skill rail.
- Permanent horizontal metric strip and long list of every available metric.
- User-facing `RECENT` range label.
- Permanent line/candle segmented row and separate zoom +/-/reset toolbar.
- Full-height static Analyst side block on mobile.
- Evidence, provenance, methodology, and long-range grids in the main scroll.
- A single large report flow that separates chart from interpretation.

These remain inside the legacy rendering path until Stage 3.13 is accepted.

## New Presentation Ownership

- `personalTerminalWorkspace.ts`: pure watchlist/range/workspace preference
  contracts, normalization, capability filtering, and widget payload mapping.
- `PersonalTerminalWatchlist.tsx`: dense Watchlist, mini-series, browser,
  edit/reorder, pin, add, and remove interactions.
- `PersonalTerminalRangeControl.tsx`: localized quick ranges, arbitrary
  last-N/calendar ranges, and quick-range customization.
- `PersonalTerminalWorkspace.tsx`: mobile-first single instrument terminal,
  Market Board, compact Analyst/Signal/Evidence context, and responsive
  desktop/tablet workstation.
- `PersonalTerminalMultiChart.tsx`: bounded 1/2/4/6-pane presentation with
  independent pane state and optional time/crosshair synchronization.

## Data Safety

- Preferences use a versioned, V11-route-only localStorage key.
- No Store field, migration, API, Quant schema, or artifact is modified.
- Preference failures fall back to normalized defaults and never block the
  terminal.
- Custom display ranges filter existing observations only.
- Candle selection remains limited to existing Quant-provided candle artifacts;
  React never derives OHLC.
- Missing data is never replaced with zero or interpolation.
