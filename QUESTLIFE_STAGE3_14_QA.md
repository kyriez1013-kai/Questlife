# QuestLife Stage 3.14 - Exploratory Personal Quant Terminal QA

## Scope and boundary

Stage 3.14 is an isolated presentation and interaction pass behind:

`?questlife_v11_ui=stage3-personal-terminal`

It does not modify the Quant Engine, Observation Ledger, baseline or Signal
algorithms, artifacts, schemas, Store, APIs, Today, Schedule, Decision
Intelligence, or Calibration. No real user or Health data was added.

## Product changes

- Added a bounded pinned market strip for rapid instrument switching and a
  full user-controlled Watchlist for add, remove, pin, reorder, Goal, and Skill.
- Replaced scattered chart actions with compact View, Compare, Indicators,
  Analyze, and More controls.
- Kept the chart central while moving Evidence, Signal, Events, Analyst,
  ranges, indicators, and workspaces into context-preserving inspectors.
- Added deterministic Analyst modules that operate existing chart state:
  comparison series, event markers, Signal windows, and previous-period view.
- Added exact Event and Signal highlight windows from existing timestamps and
  source IDs. No relationship, score, trend, or causal claim is generated.
- Preserved one, two, four, and six-pane workspaces plus a compact Market Board.
- Added exact last-N-day, calendar, and last-N-observation controls and retained
  the separation between visible range and Quant-supplied candle interval.

## Scroll and exploration diagnosis

### A. Technical scroll bug

The existing React Native Web ScrollView remains the only vertical owner. The
chart previously captured wheel/touch intent without an explicit mobile
contract. Stage 3.14 applies `pan-y pinch-zoom` to the chart host and disables
mouse-wheel chart capture on coarse/mobile input, allowing vertical page scroll
while preserving chart gestures.

### B. Intentional non-scroll design

The main mobile surface remains approximately 1-1.25 viewports. Analytical
depth opens in bounded Sheets instead of restoring a long report page.

### C. Product exploration deficiency

Stage 3.13 hid useful depth behind generic controls. Stage 3.14 makes Watchlist,
Compare, Indicators, Analyst, Events, Signal, Evidence, ranges, and workspace
transitions visible near the chart without permanently consuming page height.

## Interaction verification

Locally verified in the browser fixture:

- Watchlist instant switch, pointer/long-press drag reorder, explicit move,
  refresh persistence, and restoration of the original fixture order.
- Custom 4-day range, calendar range, last 12 observations, quick-range
  customization persistence, and restoration of default shortcuts.
- Capability-driven line/bar/candle presentation and Quant-supplied candle
  interval controls where the selected artifact supports them.
- Compare, indicator toggle, event selection, Analyst-to-chart highlight,
  Signal-to-chart highlight, Evidence open/close, and Sheet context return.
- One, two, and four-chart mobile/tablet states, desktop one/two/four-pane
  workspaces, Market Board, Goal and Skill instruments, and synchronized
  crosshair controls.
- Vertical scroll over the chart, bottom-navigation inset, dark/light themes,
  Chinese/English UI, and no document-level horizontal overflow.

The browser console recorded no Stage 3.14 runtime errors. The existing Expo
Notifications unsupported-on-web warning remains unrelated.

## Responsive QA

| Viewport | Result |
| --- | --- |
| 375x667 | No horizontal overflow; chart/page vertical scroll conflict resolved; bottom navigation does not cover the final content. |
| 393x852 | Dark and light terminal, instrument, and Sheet states remain readable without overflow. |
| 768x900 | Single/two-chart tablet layouts and Watchlist inspector remain bounded. |
| 1280x900 | Left Watchlist, centre chart workspace, and right Analyst inspector remain intentional at one/two/four panes. |

## Performance

Measurements use the terminal's local requestAnimationFrame interaction probe
in Codex in-app Chromium on macOS. Each retained sample contains 39 frames.

| Viewport | Latest sampled frames | P50 | Worst P95 | Frames >20ms |
| --- | ---: | ---: | ---: | ---: |
| 375x667 | 390 | 16.6-16.7ms | 17.7ms | 0 |
| 393x852 | 390 | 16.7ms | 17.5ms | 0 |
| 768x900 | 351 | 16.7ms | 17.6ms | 0 |
| 1280x900 | 312 | 16.7ms | 17.5ms | 0 |

Operations sampled include instrument and range switches, custom range,
chart representation, Watchlist reorder, Analyst, Signal, Evidence, Compare,
one/two/four-pane changes, pan, and crosshair interaction. No visible flicker
or material loss was observed. Browser Navigation Timing and physical pinch
performance are not available in this harness.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- Bundle: `index-3c7a9433d0c0d6deb6378f6113df9121.js`.
- Exploration adapter pure-function test: passed.
- Workspace pure-function test: passed after CommonJS compilation; direct
  Node ESM execution remains incompatible with the existing extensionless
  imports, while project typecheck and build pass.
- Required screenshot set: 35 PNG files in
  `artifacts/v11-stage3-14-exploration/`.

## Remaining weaknesses

- Pinned mobile instruments are intentionally bounded to three plus Manage;
  the full Watchlist remains one tap away.
- Analyst remains a deterministic inspector over existing Quant artifacts, not
  an open-ended conversational or predictive model.
- Multi-pane mobile views prioritize compact comparison over detailed axes.
- There is no new Quant capability when a fixture or real artifact lacks one;
  the UI suppresses unavailable tools rather than synthesizing output.

## UNVERIFIED

- Physical iPhone Safari, including pinch zoom and long-press drag feel.
- Vercel Preview and production.
- Real Health/passive data and production API/schema integration.
- Real-user lifecycle and preference behaviour outside deterministic fixtures.
- Initial Navigation Timing in the current browser-control harness.

No push or deployment was performed. Stage 4 was not started.
