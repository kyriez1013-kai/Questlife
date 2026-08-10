# QuestLife Stage 3.11 - Local Acceptance Record

Date: 2026-08-11

## Scope and stop point

Stage 3.11 remains isolated behind
`?questlife_v11_ui=stage3-personal-terminal`. This record covers local exported
web behavior only. Nothing was pushed or deployed, and no production, Preview,
or physical iPhone Safari result is claimed.

The unrelated untracked `docs/quant/` directory was not read, edited, or
staged.

## Product verdict

The Stage 3.10 screenshots were a technically credible but visually flat
approximately 5/10 terminal. Stage 3.11 is materially different:

- product-review series are seeded, non-periodic longitudinal histories rather
  than smooth waves;
- current reading, personal reference, deviation, range, and coverage form one
  analytical hierarchy;
- Day 1 has a useful immediate Analyst brief rather than an empty prompt;
- Day 90 visibly adds a supported observational Signal, traceable examples,
  evidence detail, and a richer Analyst context;
- passive-only users receive an instrument rail rather than empty Goal/Skill
  navigation;
- the historical-to-QuestLife-active transition, human event rail, personal
  reference band, and observational candles create QuestLife-specific chart
  semantics;
- the main chart has no visible TradingView branding.

Local screenshot review places the result at approximately 7.5/10 commercial
maturity. It is not recorded as 8/10 because physical Safari, Preview, and
production acceptance remain unverified.

## Observational candle contract

Registered `OBSERVATIONAL_SCALAR_OHLC` instruments:

- state overall, energy, focus, mood, physical, and stress;
- strength weight;
- sleep duration;
- HRV and resting heart rate;
- steps, walking/running distance, active minutes, and exercise minutes.

Sleep start/end and unsupported categorical or additive instruments do not
receive Candle capability.

Window and bucket policy:

| Display window | Candle bucket |
| --- | --- |
| 7D | unavailable; line remains primary |
| 30D | calendar week |
| 90D | calendar week |
| 1Y | calendar month |
| ALL <= 730 days | calendar month |
| ALL > 730 days | calendar quarter |

For each bucket with at least two ordered observations:

- open = first value;
- high = maximum value;
- low = minimum value;
- close = last value;
- average, exact source IDs, exact OHLC timestamps, observation count, and
  expected observation count remain attached.

Missing dates are represented by coverage. They are not interpolated and are
not replaced with zero. React renders the supplied artifact and does not
calculate OHLC.

## Validation results

App:

- `npx tsc --noEmit`: passed after the final build.
- `npm run build`: passed; output directory `dist`.
- JS bundle: `index-6f28c3cf89dee05dba9de3a5cbf2c499.js`.
- Stage 3.11 CSS bundle:
  `personal-terminal-68ad79ec9f8bc9d8be8ef516e87e8f5e.css`.
- `node --experimental-strip-types
  src/v11-insights/personal-terminal/quantV041Adapter.test.ts`: passed. Node
  emitted the existing module-type warning only.

Quant:

- Candle-focused suite: 5 tests passed.
- Full suite: 603 tests passed in 439.514 seconds.
- The exact reconstruction test verifies every complete Steps candle against
  its referenced raw source observations.
- The fixture test rejects repeated seven-day wave shapes and verifies missing
  coverage remains visible.

Responsive matrix:

- 320, 375, 393, 768, and 1280 widths: no document-level horizontal overflow.
- Chinese/English and dark/light render without page-level clipping.
- The 768px audit found and fixed a collapsed legacy rail that rendered labels
  one character per line.
- The mobile historical/active label was re-anchored inside the chart.
- All visible audited controls were at least 44px in both dimensions.
- Reduced motion reports `data-v11-motion="reduced"`; sampled control
  transition durations were `0s`.

Local Chromium performance, complete Stage 3.11 composition:

- 10 full render probes and 34 interaction probes;
- 3,082 sampled frames total;
- P50: 16.7ms;
- worst P95: 18.7ms;
- frames above 20ms: 0;
- covered line/candle, timeframe, scope, instrument, crosshair, pan/scale,
  zoom, Signal sheet, Analyst, and range selection;
- covered 375 dark, 393 light, 1280 dark, and reduced-motion states.

This is a local in-app Chromium measurement, not an iPhone Safari result.

Console:

- no runtime error was observed in a fresh tab across Steps Candle, no-data,
  and Day 90 states;
- the only warning was the existing Expo Notifications web-support warning.

## Screenshot matrix

Artifacts are in `artifacts/v11-stage3-11/`:

1. `01-steps-day1-line-30d-375-dark.png`
2. `02-steps-day1-candle-30d-375-dark.png`
3. `03-steps-candle-90d-375-dark.png`
4. `04-sleep-day1-375-dark.png`
5. `05-rich-passive-day1-375-dark.png`
6. `06-no-data-375-dark.png`
7. `07-day30-375-dark.png`
8. `08-day90-375-dark.png`
9. `09-day90-signal-sheet-375-dark.png`
10. `10-day90-analyst-375-dark.png`
11. `11-day180-375-dark.png`
12. `12-goal-375-dark.png`
13. `13-skill-375-dark.png`
14. `14-historical-active-marker-375-dark.png`
15. `15-steps-day1-1280-dark.png`
16. `16-steps-candle-90d-1280-dark.png`
17. `17-rich-passive-1280-dark.png`
18. `18-day90-workstation-1280-dark.png`
19. `19-day90-selected-signal-1280-dark.png`
20. `20-day90-analyst-1280-dark.png`
21. `21-goal-1280-dark.png`
22. `22-skill-1280-dark.png`
23. `23-range-selected-1280-dark.png`
24. `24-day1-375-light-en.png`
25. `25-day180-1280-light-en.png`
26. `26-debug-source-375-dark.png`
27. `27-settings-legal-375-dark.png`
28. `28-candle-inspector-375-dark.png`

## Attribution result

`lightweight-charts` 5.2.0 remains the renderer. The installed package contains
Apache License 2.0 text and no packaged `NOTICE` file. Official library guidance
requires a user-accessible TradingView creator attribution and link; it states
that the in-chart attribution logo may be disabled when that requirement is
already fulfilled elsewhere.

The isolated route therefore removes chart-adjacent branding and exposes the
creator, copyright, TradingView link, and v5.2.0 license link under Settings ->
About and legal information. See `QUESTLIFE_STAGE3_11_LICENSE_AUDIT.md`.

Building a custom chart engine remains unjustified. The current estimate is
12-18 engineer-weeks for a credible MVP and 28-45+ engineer-weeks for a
production renderer with mobile interaction, accessibility, cross-browser QA,
and ongoing maintenance.

## UNVERIFIED

- physical iPhone Safari pinch, pan, crosshair, candle selection, sheets, safe
  area, and frame pacing;
- Vercel Preview;
- production URL and production data;
- real Health data or real passive-data import;
- production API/schema integration, which was explicitly out of scope.

No real user data, real Health data, advanced Quant model, production schema,
or production API was added. Nothing was pushed or deployed.
