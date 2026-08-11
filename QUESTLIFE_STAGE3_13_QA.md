# QuestLife Stage 3.13 - Personal Quant Terminal Redesign QA

## Scope

Stage 3.13 changes only the isolated V11 Personal Quant Terminal presentation
behind `?questlife_v11_ui=stage3-personal-terminal`.

Unchanged:

- Quant Engine and Observation Ledger
- Quant artifacts, calculations, candle semantics, and signal contracts
- schemas, Store, APIs, persistence, and production data pipeline
- the unflagged Insights route and immediate rollback

## Information Architecture

The terminal now uses this order:

1. Personal Market context and capability-driven domain navigation
2. selected entity, instrument, and evidence state
3. current reading, personal reference, deviation, evidence, and coverage
4. the primary line/candle analysis canvas
5. supported tools and one eligible signal
6. structured Analyst output
7. collapsed evidence, methodology, events, and advanced tools
8. one next observation

The Analyst panel separates observation, evidence, interpretation, and
limitation. Coverage is explicitly labelled as measurement reach, not
probability or conclusion confidence. No Life Score, readiness score, default
personal score, frontend OHLC, causal claim, or fabricated baseline was added.

## Local Lifecycle Verification

Verified against existing deterministic fixture artifacts:

| State | Result |
| --- | --- |
| no data | Honest calibration state; no chart, score, baseline, or trend fabricated |
| steps only | Steps chart, personal reference, evidence, and coverage rendered |
| sleep only | Sleep instruments and local-time readings rendered |
| mixed passive | Movement, recovery, and sleep domains rendered |
| mixed mature | Full available domain and instrument navigation rendered |
| Goal | Artifact opens in Goal scope and keeps its default entity/series |
| Skill | Artifact opens in Skill scope and keeps its default entity/series |
| Day 1 | Current observation rendered; baseline/deviation stay unavailable |
| Day 7 | Early observation state rendered without established-pattern language |
| Day 30 | Capability-driven 30-day terminal rendered |
| Day 90 | Mature timeline and eligible evidence rendered |

The no-data and Day-1 checks found no fake trend, baseline, score, or default
personal result. User-facing terminal text contains no TradingView, chart
library, copyright, fixture, or implementation detail. The existing legal
notices remain in Settings -> About and legal information.

## Responsive and Interaction Verification

Local exported web was checked at:

- `375x667`
- `393x852`
- `768x900`
- `1280x900`

Verified:

- no document or terminal-level horizontal overflow
- mobile chart-first order followed by current metrics and supporting analysis
- 768px horizontal domain/instrument navigation without narrow clipped labels
- 1280px three-column workstation with navigation, chart, and Analyst
- English and Chinese
- dark and light themes
- reduced-motion route state
- capability-driven timeframe controls
- domain navigation to Recovery and Goal
- details expand/collapse
- Evidence Sheet open state and bottom-navigation clearance
- unflagged route renders legacy Insights, not the Stage 3.13 terminal
- browser console contained no runtime error during the final interaction pass

## Performance

Complete local exported-web composition, not an isolated chart fixture:

- 375x667, dark, mixed mature: `P50 16.7ms`, `P95 16.7ms`, `0/145` frames over 20ms
- 1280x900, light, mixed mature: `P50 16.7ms`, `P95 17.4ms`, `0/145` frames over 20ms

These are local Chromium measurements and are not physical-device results.

## Automated Validation

- `npx tsc --noEmit`: passed
- `npm run build`: passed
- exported web output: `dist`
- JS bundle: `index-237af9d66203914513da0ba2244807ef.js`
- targeted Personal Terminal presentation/value/V0.4.1/V0.4.2 adapter tests: passed

## Review URL

Local desktop:

`http://localhost:8085/?questlife_v11_ui=stage3-personal-terminal&quantLifecycle=market_mixed_mature&debugLanguage=zh&debugTheme=dark`

## UNVERIFIED

- physical iPhone Safari material, touch, and frame pacing
- Vercel Preview
- production web UI
- real Health/passive data
- production API/schema integration
- real-user Day 1 -> Day 90 lifecycle behaviour

No push, deployment, Store write, schema change, or production-data mutation was
performed for Stage 3.13.
