# QuestLife V11 Stage 3 - Insights Visual Primitive Contract

Date: 2026-08-07

These primitives format existing results only. They do not calculate new analytics, change thresholds, persist values, or imply causality.

| Primitive | Real input | Semantic meaning | S0 fallback | S1 fallback | Missing-data behaviour | Accessibility alternative |
| --- | --- | --- | --- | --- | --- | --- |
| Evidence stage marker | presentation `S0`-`S3` | strength of evidence for the current view | muted first tick only | one observed stage | lower stage wins when support is absent | image role with localized stage label |
| Trend canvas | seven dated `V11TrendPoint` rows | recorded duration cadence over the existing seven-day window | dated hollow marks | real points only, without trend claim | hollow point = missing; short line = untimed execution; line segments break across missing dates | image label explains marks; every date is a 44px inspect button and opens a textual Sheet |
| Baseline marker | real mean of observed minutes after the existing 3-log / 3-active-day gate | descriptive reference for the displayed range | hidden | hidden | never synthesized | textual provenance and limitation remain adjacent |
| Distribution bars | real grouped duration, counts, or recorded error values | relative distribution within one existing output | hidden when no rows | renders only recorded rows | no placeholder row; zero remains zero where the source genuinely reports zero | image role plus visible labels and exact text values |
| Range list | existing available Ability/Tomorrow outputs | bounded position for an already-supported output | unavailable model explanation | unavailable model explanation | baseline/reference dimensions render an em dash rather than a personal score | visible label/value pairs and localized image label |
| Before/after pair | two real monthly aggregates | descriptive recorded-period comparison | hidden | hidden | requires two months; otherwise model remains unavailable | visible month/value pairs and localized image label |
| Pattern row | stored PatternMemory or existing runtime association | status, evidence count, statement, provenance | one empty-state action | tentative wording only | absent confidence/date is not fabricated | 44px button opens a textual Pattern detail Sheet |
| Evidence Sheet | selected evidence, point, pattern, or current advanced output | L3 provenance, sample, confidence, timestamp, limitation | unavailable | available for the one real observation | omitted fields remain omitted or em dash | dialog semantics, close label, selectable text, shared V11 safe-area shell |

## Honesty Rules

- Sample count, confidence provenance, and record count remain metadata; none becomes a hero score.
- Candidate and runtime associations always use non-causal wording.
- Generic helper baselines are suppressed as personal output.
- The seven-day trend gate remains exactly 3 positive-duration logs across 3 active days.
- Missing dates are not converted to zero and are not connected by a line.
- Unsupported arbitrary range, variable comparison, calibration, intervention, Bayesian, ML, and Quant Engine controls are not rendered.
