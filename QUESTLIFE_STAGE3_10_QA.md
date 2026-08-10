# QuestLife Stage 3.10 Local QA

Date: 2026-08-10  
Route: `questlife_v11_ui=stage3-personal-terminal`  
Data: deterministic QuestLife-Quant V0.4.1 synthetic presentation artifacts only  
Deployment status: local only; not pushed or deployed

## Build And Contract

- TypeScript presentation adapter validates and maps the versioned Quant
  artifact. It does not calculate baseline, EMA, maturity, Signal eligibility,
  trend, instrument legality, or candle legality.
- Fixture metadata preserves schema version, Quant commit, canonical artifact
  hash, and source artifact. It is visible only with `debugQuantSource=1`.
- App checks passed: adapter test, `npx tsc --noEmit`, and `npm run build`.
- Build output: `dist`.
- Bundle: `index-eec2d6ea051eddc819285ef12eff61f8.js`.

## Scenario Acceptance

| Scenario | Local result |
| --- | --- |
| No data | Same Terminal shell, no fake chart/score, one valid next action |
| Steps-only Day 1 | Current Steps, personal reference, direction, 355 observed days, date axis, and 1Y/ALL available |
| Sleep-only Day 1 | Real sleep-timing reading and time-formatted value axis; no readiness/recovery score |
| Rich passive Day 1 | Multi-instrument Person scope; no empty Goal/Skill scope |
| Day 30 | Active Focus default, baseline-forming language, bounded timeframes |
| Day 90 | Active Focus default, baseline and evidence visible; no Signal invented |
| Day 180 | Person, Goal, and Skill scopes available in one canvas |
| Goal | Real recent-activity-share semantics retained; no causal contribution label |
| Skill | Same chart/baseline/evidence/Analyst language as Person and Goal |

Normal scenario text contains none of: `QA`, `fixture`, `debug`, `V0.4`,
`synthetic`, or `QUESTLIFE QUANT`. The debug provenance screenshot is the sole
intentional exception.

## Interaction Regression

Verified locally with the built web artifact:

- metric switching and capability-driven timeframe switching;
- Person to Goal to Skill and back;
- historical point inspection and active QuestLife point inspection;
- two-point range selection and range analysis;
- compare selection with independent scale;
- Analyst and evidence/provenance sheets;
- zoom in, zoom out, reset, and chart pan;
- selected scope, metric, and timeframe remain coherent after interactions;
- daily cumulative Steps never exposes a Candle control;
- no browser console errors were observed in the tested flows.

The V0.4.1 lifecycle artifacts contain no displayable Signal. Signal-sheet
interaction and a visible historical-to-active transition marker are therefore
**UNVERIFIED** rather than simulated. The UI branches exist, but no synthetic
artifact was altered merely to force these states.

## Responsive And Runtime QA

Checked at 320x667, 375x667, 393x852, 768x900, and 1280x900 in Chinese and
English, dark and light themes, plus `debugReducedMotion=1`.

- no horizontal overflow;
- chart width remains inside the viewport;
- all tested interactive controls have at least a 44px minimum touch size;
- no chart, axis, sheet, or bottom-navigation clipping was observed;
- reduced-motion state is propagated to the Terminal and chart kinetic motion;
- mobile core Terminal uses about 1.49-1.56 viewports for populated states;
- no-data uses one viewport.

The full interaction sample covered timeframe, metric, scope, chart range,
crosshair, compare, Analyst, zoom, and pan operations at mobile and desktop
sizes. Normal repeated samples held at P50 16.7ms and P95 17.3-17.7ms. A clean
three-switch metric retest recorded P50 16.7ms, P95 17.6ms, and 3 frames above
20ms out of 144. One earlier automated metric-switch sample produced an
isolated 894.9ms P95 scheduling stall; it did not repeat, so it remains recorded
as an outlier rather than removed or represented as a stable result. One
desktop scope switch reached P95 32.8ms with 3 frames above 20ms.

These are local Chrome observations, not physical-device or production claims.

## Chart Attribution

Installed `lightweight-charts` is version 5.2.0 under Apache-2.0. Its installed
README requires TradingView attribution and a `tradingview.com` link on a page
available to users. The installed npm package does not include the README's
referenced `NOTICE`; the installed `LICENSE` states `Copyright 2023 TradingView,
Inc.` QuestLife therefore retains a visible, quiet attribution and link outside
the analytical canvas. `layout.attributionLogo` remains disabled so the
third-party logo is not presented as QuestLife branding.

## Screenshots

All files are in `artifacts/v11-stage3-10/`:

1. `no-data-375-dark.png`
2. `steps-only-375-dark.png`
3. `sleep-only-375-dark.png`
4. `rich-passive-375-dark.png`
5. `day30-375-dark.png`
6. `day90-375-dark.png`
7. `day180-375-dark.png`
8. `goal-375-dark.png`
9. `skill-375-dark.png`
10. `steps-only-1280-dark.png`
11. `rich-passive-1280-dark.png`
12. `day90-1280-dark.png`
13. `goal-1280-dark.png`
14. `skill-1280-dark.png`
15. `steps-only-375-light.png`
16. `day180-1280-light.png`
17. `steps-only-1280-debug-source.png`

## Boundaries

- No production API, Store, schema, persistence, or Quant runtime integration
  was added.
- No real user data or real Health data was read or included.
- No advanced statistical model was started.
- Physical iPhone Safari, Vercel Preview, and production remain **UNVERIFIED**.
- The terminal presentation payload is still approximately 447KB in the Quant
  benchmark. Product transport and lazy-loading design remain future work.
