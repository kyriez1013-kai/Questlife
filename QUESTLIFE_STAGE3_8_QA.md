# QuestLife Stage 3.8 Local QA

## Boundary

- Branch: `design/questlife-product-v2`
- Route: `questlife_v11_ui=stage3-personal-terminal`
- Deployment: not performed
- Store/schema/API/Quant Engine changes: none
- `docs/quant/`: user-owned and untouched

## Presentation result

- QuestLife quantitative language now uses Personal Market, Goal Portfolio,
  Skill Asset, Baseline, Trajectory, Stability, Load, Signal, Event, Evidence,
  Research, and Analyst.
- The product-clean Personal Market starts with the real State instrument. The
  QA derived reference index is only available under `debugQuantFixture=1`.
- Goal Portfolio labels its composition as recent confirmed execution-time
  share. It does not call the value causal contribution.
- Personal Breadth and Market Map are isolated, non-persisted mature-fixture
  concepts. Tile area represents the stated recent activity share only.
- Signals show support, counterexamples, observation window, status, missingness,
  alternatives, and limits without causal language.
- Evidence detail reports observations, active days, missingness, provenance,
  and latest date. It explicitly states that coverage is not confidence.
- Analyst remains a context-bound interaction shell and calls no new AI API.

## Interaction verification

Verified locally through the real web UI:

- scope switch: Person -> Goal -> Skill and back
- metric switch within the same chart
- chart type: candle disabled for unsupported Skill series and enabled for the
  fixture State series with real OHLC construction
- timeframe switch preserves scope and metric
- indicator toggle preserves analytical context
- event list -> exact event detail
- crosshair and visible-range changes
- zoom in/out/reset controls
- two-point range selection -> range inspector
- Goal activity share -> exact Skill terminal
- Signal, Evidence, Analyst, Market Overview, Instrument, Indicator, Event, and
  Chart Type sheets open and close through the shared inspector
- real Store route shows no QA badge, no fake personal index, and no fabricated
  baseline
- forming fixture shows no established baseline or supported signal
- explicit debug fixture mode visibly identifies itself
- reduced-motion route reports `data-v11-motion="reduced"`

## Responsive verification

| Viewport | document width | horizontal overflow | result |
| --- | ---: | ---: | --- |
| 375x667 | 375 | 0 | passed |
| 393x852 | 393 | 0 | passed |
| 1280x900 | 1280 | 0 | passed |

The terminal owns one internal vertical scroll surface on mobile. At 375x667 it
reported a 667px client height and 946px scroll height, with bottom content
padding above the navigation.

## Interaction frame sampling

Each interaction uses a debug-only 48-frame sampling window. The `duration`
field is the sampling-window duration, not input latency. All final-bundle
samples recorded zero frames above 20ms.

Final export bundle: `index-1f430d70477c6d31f40b2adea170caef.js`.
The full-surface 145-frame probe on that bundle reported:

- 375x667: P50 16.7ms, P95 17.5ms, 0/145 frames above 20ms
- 393x852: P50 16.7ms, P95 17.1ms, 0/145 frames above 20ms
- 1280x900: P50 16.7ms, P95 17.1ms, 0/145 frames above 20ms

| Interaction | 375 P50/P95 | 393 P50/P95 | 1280 P50/P95 | >20ms |
| --- | --- | --- | --- | --- |
| pan / visible range | 16.7 / 17.3 | 16.7 / 17.4 | 16.7 / 17.6 | 0/48 |
| zoom | 16.7 / 16.9 | 16.7 / 17.4 | 16.7 / 17.1 | 0/48 |
| crosshair | 16.7 / 17.4 | 16.7 / 17.6 | 16.7 / 17.4 | 0/48 |
| metric switch | 16.7 / 17.0 | 16.7 / 16.9 | 16.7 / 17.4 | 0/48 |
| scope switch | 16.7 / 17.3 | 16.7 / 17.1 | 16.7 / 17.6 | 0/48 |
| indicator toggle | 16.7 / 17.2 | 16.7 / 16.8 | 16.7 / 16.9 | 0/48 |
| range selection | 16.7 / 17.0 | 16.7 / 17.5 | 16.7 / 16.8 | 0/48 |
| analyst open | 16.7 / 17.3 | 16.7 / 17.1 | 16.7 / 17.1 | 0/48 |
| event sheet | 16.6 / 17.5 | 16.7 / 16.9 | 16.7 / 17.5 | 0/48 |

Device/browser for these numbers: local Codex in-app Chromium browser on macOS.
Physical iPhone Safari, Vercel Preview, and Production remain unverified for
Stage 3.8.

## Static validation

- `node --experimental-strip-types src/v11-insights/personal-terminal/personalTerminalPresentation.test.ts`: passed
- `npx tsc --noEmit`: passed
- `npm run build`: passed

## Screenshots

Before/after screenshots are stored in:

- `artifacts/v11-stage3-8/before`
- `artifacts/v11-stage3-8/after`

Stage 3.7 had no directly reachable Evidence Detail or Market Map surfaces, so
there are no honest before screenshots for those two newly exposed presentation
objects. The after set includes both, plus one explicit debug-fixture proof and
one real-Store proof.

## Remaining limitations

- No new AI analyst API exists; the Analyst is intentionally an interaction
  shell.
- Personal Breadth and Market Map are mature QA fixture concepts, not production
  analytical results.
- Real data with insufficient evidence intentionally contracts instead of
  filling the terminal with default values.
- Physical iPhone Safari, Preview, and Production verification are pending.
- Stage 4 has not started.
