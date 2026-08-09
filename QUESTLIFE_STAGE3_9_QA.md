# QuestLife Stage 3.9 QA

## Scope and boundary

- Route: `?questlife_v11_ui=stage3-personal-terminal`
- Branch: `design/questlife-product-v2`
- Production `StatsScreen`, Today, Schedule, Store schema, APIs, Quant Engine, Observation Ledger, Decision Intelligence, and Calibration were not changed.
- Mature, forming, empty, historical, volatile, goal, and skill data used for visual review are isolated, non-persisted presentation fixtures.
- The route without `quantFixture` was also opened against real Store state. Missing data remained missing; no default score, baseline, trend, or signal was manufactured.
- Stage 4 was not started. Nothing was pushed or deployed.

## Delivered interaction model

- Person, Goal, and Skill share one chart engine, baseline language, event rail, evidence vocabulary, range inspector, signal inspector, and contextual analyst.
- Primary, reference, secondary, load, and real-life event data share one time axis.
- Compare is separate from timeframe selection. Mobile allows one primary and at most one comparison series; each series keeps its own unit and scale and is never normalized into a fake common score.
- Range selection opens a bounded analysis sheet with start, end, deviation, baseline difference, load change, observations, events, relevant signals, and missing days.
- Point, event, signal, evidence, composition, breadth map, similar-period fixture, and analyst details use the shared sheet system.
- The contextual analyst presents Observed, Related Changes, Known Signals, Limitations, and Next Question from the selected chart context. It does not call a new AI API.
- Goal composition is labelled as recent activity share, not causal contribution. Market breadth is only shown for Person scope. Goal and Skill views do not inherit unrelated global events or signals.
- Historical reference and QuestLife-confirmed provenance remain separate. `MISSING != ZERO`, `PLAN != EXECUTION`, `EMA != FORECAST`, and `CORRELATION != CAUSATION` remain explicit presentation boundaries.

## Product-copy audit

- Product-clean mode does not display QA, fixture, debug, maturity-code, or derived-test labels.
- Debug proof remains available only with the explicit debug parameter.
- Analyst limitations use the user-facing evidence boundary in product-clean fixture screenshots. Internal fixture provenance remains visible only in debug mode.
- TradingView Lightweight Charts attribution and the `tradingview.com` link remain visible. The library and attribution decision are documented in `QUESTLIFE_STAGE3_9_LICENSE_AUDIT.md`.

## Local verification

### Static and build

- `npx tsc --noEmit`: passed.
- `node --experimental-strip-types src/v11-insights/personal-terminal/personalTerminalPresentation.test.ts`: passed.
- The test command emits the existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning; it does not fail the test.
- `npm run build`: passed after running with permission to replace the generated `dist` files.
- Export output: `dist`.
- Main bundle: `_expo/static/js/web/index-7844c888c9db99bb202e8f17a584c34b.js`.
- Chart bundle: `_expo/static/js/web/lightweight-charts-ad86089eebce18b50604a8ed3e5655d9.js`.
- Stage 3.9 CSS: `_expo/static/css/personal-terminal-f3d0d33a59f23fe8f531b0b0d2e016d3.css`.

### Responsive and interaction checks

- `320x667`: no horizontal page overflow; compact controls remained readable.
- `375x667`: Person mature, forming, empty, Goal, Skill, compare, range, movement, event, signal, analyst, composition, breadth map, reduced motion, and sheet-safe-area states were checked.
- `393x852`: English/light state checked; no horizontal overflow.
- `768x900`: English/light state checked; `scrollWidth` equalled viewport width.
- `1280x900`: Person, Goal, Skill, multi-variable overlay, selected range + analyst, historical 1Y, volatile, dark, and light states checked.
- Range sheet used one internal scroll owner. At `375x667`, the sheet action area remained above the bottom navigation after scrolling to the end.
- Reduced-motion fixture reported `reduced`; transition duration was `0s` and scroll behaviour was `auto`.
- Real Store route at `375x667` rendered an honest empty state with no runtime error text and `scrollWidth === innerWidth === 375`.
- Product-clean Analyst snapshots were checked for `QA`, `fixture`, `debug`, `MATURE`, and `S0-S3` residue; none was present.

### Performance probe

The local probe sampled 145 animation frames per state in the in-app Chromium browser after the named interaction. These figures are local browser measurements, not physical-device or production measurements.

| State | Viewport | P50 | P95 | Frames above 20ms |
| --- | --- | ---: | ---: | ---: |
| Person, dark | 375x667 | 16.7ms | 17.3ms | 0 / 145 |
| Person, light | 393x852 | 16.7ms | 17.1ms | 0 / 145 |
| Workstation, dark | 1280x900 | 16.7ms | 17.3ms | 0 / 145 |
| Workstation, light | 1280x900 | 16.7ms | 17.0ms | 0 / 145 |
| Analyst open | 1280x900 | 16.7ms | 17.5ms | 0 / 145 |
| Event sheet open | 375x667 | 16.7ms | 17.5ms | 0 / 145 |

The measured composition included the chart, synchronized human variables, event rail, multi-series overlay where applicable, sheets, dark/light themes, and full product layout. It is not a reuse of the Stage 0 material fixture measurement.

## Screenshot matrix

All files are in `artifacts/v11-stage3-9/`.

### Mobile product-clean

1. `01-person-mature-375-dark.png` - Personal Market.
2. `08-synchronised-compare-375-dark.png` - Personal Market compare mode and synchronized human variables.
3. `05-goal-375-dark.png` - Goal Portfolio.
4. `07-skill-375-dark.png` - Skill Terminal.
5. `11-movement-inspector-375-dark.png` - selected movement.
6. `12-range-analysis-375-dark.png` - Range Analysis.
7. `21-signal-detail-375-dark.png` - Signal Detail.
8. `09-analyst-inspector-375-dark.png` - contextual Analyst.
9. `13-personal-breadth-map-375-dark.png` - Personal Market Map.

### Desktop product-clean

10. `14-workstation-1280-dark.png` - Personal Market Workstation.
11. `22-goal-workstation-1280-dark.png` - Goal Portfolio Workstation.
12. `23-skill-workstation-1280-dark.png` - Skill Workstation.
13. `24-range-analyst-1280-dark.png` - selected range + Analyst.
14. `15-workstation-multivariable-1280-dark.png` - multi-variable human timeline.
15. `16-workstation-1280-light-en.png` - representative light/English workstation.

### Additional evidence

- `02-person-forming-375-dark.png` - forming baseline.
- `03-person-empty-375-dark.png` - honest empty state.
- `04-person-mature-393-light-en.png` - mobile light/English.
- `06-goal-composition-sheet-375-dark.png` - Goal composition semantics.
- `10-event-detail-375-dark.png` - event provenance and scope.
- `17-historical-1y-1280-dark.png` - long-range historical state.
- `18-volatile-1280-dark.png` - volatile data without good/bad colour semantics.
- `19-debug-performance-375-dark.png` - explicit debug-only proof.
- `20-reduced-motion-375-dark.png` - reduced-motion state.
- `00-sheet-safe-area.png` - mobile sheet/navigation boundary.

## Five-second product checks

- Person: scope, current metric, personal baseline relationship, recent direction, and a relevant signal are visible without navigating across separate analysis pages.
- Skill: skill identity, current vs baseline, trajectory, activity, and relevant evidence use the same instrument grammar.
- Goal: goal identity, trajectory, recent activity composition, and the Skills driving visible activity are presented without claiming causal contribution.
- The synchronized screenshot shows state, execution load, recovery/context, and real-life events on one timeline. The differentiator is the human-system model, not a renamed finance chart.

## UNVERIFIED

- Physical iPhone Safari interaction, touch pan/pinch, and real soft-keyboard behaviour were not tested in this pass.
- Preview and production were not tested because the task explicitly prohibits push and deployment.
- Browser console collection is unverified: the available in-app browser runtime did not expose a reliable console-listener attachment path. Visible UI and DOM checks found no runtime error state.
- Real Store rich-data Person/Goal/Skill states are unverified locally because the available local Store contained no comparable personal history. The real-data empty state was verified; rich-state screenshots intentionally use isolated fixtures.
- End-user five-second comprehension requires a human reviewer; the visual information needed for that review is present in the screenshot matrix.

## Commits

1. `abeeabb` - component and license audits.
2. `ca7936c` - presentation contract and tests.
3. `9558750` - synchronized personal quant terminal.
4. `4634aeb` - responsive and sheet hardening.
5. `e56a900` - product-clean Analyst limitation copy.

