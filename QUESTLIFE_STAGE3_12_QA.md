# QuestLife Stage 3.12 - Local Acceptance Record

Date: 2026-08-11

## Scope and stop point

Stage 3.12 remains isolated behind
`?questlife_v11_ui=stage3-personal-terminal` on
`design/questlife-product-v2`. This record covers local exported-web and local
Quant fixture behavior only. Nothing was pushed or deployed, and no physical
iPhone Safari, Vercel Preview, production, or real Health-data result is
claimed.

The unrelated untracked `docs/quant/` directory was not read, edited, or
staged.

## A. Personal Market

The terminal now opens at a whole-person Personal Market when an overview is
available, then drills into the existing Instrument, Goal, and Skill terminal
without creating a second analytical product.

- The overview contains only instruments present in the artifact. Steps-only,
  passive-only, QuestLife-only, mixed, Goal, Skill, and zero-data states were
  exercised separately.
- Market Breadth is an exact categorical count of above-reference,
  near-reference, below-reference, and forming instruments. It is not an
  average or score.
- Position, direction, maturity, coverage, and interpretation remain separate.
  Above or below reference is never labelled good or bad.
- The synchronized market timeline uses independent mini-series and independent
  units; there is no combined line or shared synthetic y-axis.
- Top Moves uses transparent ranking bases: largest valid absolute
  reference-relative percentage, newly unlocked representation capability,
  and an existing eligible Signal.
- The structured Market Analyst reports available movement, forming
  instruments, Signals, and unknown coverage. It makes no causal claim and is
  not a chat-first surface.
- Desktop shows up to eight actual instruments in the center workspace. Mobile
  shows five by default and exposes the remainder through a compact expansion.
- Goal and Skill views preserve their native absolute units. They are not mixed
  mathematically with Steps, sleep, state, or other market instruments.
- The zero-data state renders acquisition actions without manufacturing empty
  market rows, a readiness value, or a Life Score.

## B. Early feedback lifecycle

| Evidence | Immediate product response | Intentionally unavailable |
| --- | --- | --- |
| 1 observation | current point, timestamp, source, first-observation Analyst copy | previous, baseline, trend, Signal, Candle |
| 2 observations | current, previous, absolute change, line | personal baseline, trend language, Candle |
| 3 observations | current, previous, short-window range, line by default, optional 3-observation micro Candle | stable trend/pattern claim |
| 5 observations | current, range, line by default, optional 5-observation micro Candle | unsupported pattern language |
| 10 observations | reference only when the canonical baseline is actually promoted; otherwise the forming state remains | invented fixed-day threshold |

Reference availability is artifact-driven. A baseline is not shown while its
existing status is `unavailable` or `forming`. Signal presentation remains
dependent on an existing registered Signal; observation count alone does not
invent one.

## C. Candle semantics

Stage 3.12 preserves the Stage 3.11 time-bucket Candles and adds explicit
observation-count micro Candles.

- `TIME`: calendar weekly, monthly, or quarterly windows supplied by Quant.
- `OBSERVATION_COUNT`: non-overlapping trailing groups of three or five ordered
  observations, used only for registered scalar constructs.
- A product-visible micro Candle requires at least three valid observations.
  One and two observations never produce a Candle.
- For each Candle, open is the first ordered source value, high and low are the
  extrema, and close is the last ordered source value.
- The artifact carries exact source IDs, OHLC timestamps, observation count,
  bucket type, bucket size, actual observation window, average, and
  completeness.
- Missing observations are not padded, interpolated, or replaced with zero.
- React renders Quant-supplied OHLC and does not calculate Candles.

The Focus three-observation fixture is `4, 3, 5`; its RECENT Candle is
`open=4`, `high=5`, `low=3`, `close=5`,
`bucketType=OBSERVATION_COUNT`, with all three source IDs attached.

## D. Mathematical and semantic audit

- Ratio/count percentage display uses
  `(current - reference) / abs(reference) * 100` when a non-zero reference and
  explicit percentage capability both exist.
- Ordinal state and timing instruments never show percentage change. They use
  absolute units or absolute deltas.
- Steps `11,400` against reference `7,571` resolves to approximately `+50.6%`;
  the unrelated recent-window percentage is not reused.
- Reference labels preserve kind and provenance: historical reference,
  QuestLife reference, or concise reference where space is constrained.
- Market position uses the reference band when low/high exist; otherwise it
  compares current to the reference value. This remains descriptive, not
  evaluative.
- The Stage 3.12 audit found a derived ordinal reference band whose high value
  exceeded the legal `1-5` recorded scale. Quant now bounds only the derived
  ordinal reference value/low/high to `1-5`; source observations are untouched.
  The Focus 10-observation fixture now reports reference `4`, low `1.0348`, and
  high `5`.

Presentation contract tests cover percentage legality, exact breadth counts,
compact/full summary equality, no zero-filled metrics, no composite score, and
the ordinal scale boundary.

## E. App validation

Branch: `design/questlife-product-v2`

Stage 3.12 commits after the accepted Stage 3.11 baseline:

- `a1ef132` - add personal market overview adapter
- `d1e375b` - add personal market overview shell
- `f93cd00` - add adaptive early observation presentation
- `d90478b` - sync bounded personal market fixtures
- `8fc8ba9` - refine adaptive personal market terminal
- `172bf2f` - refine personal market responsive labels

Checks:

- `npx tsc --noEmit`: passed after the final source change.
- `npm run build`: passed; output directory `dist`.
- JS bundle: `index-32d34d05afe32e51a8a796c116ee5170.js`.
- CSS bundle:
  `personal-terminal-7788f9232f5ffffa27aa06be1bd5ce1c.css`.
- `quantV042Adapter.test.ts`: passed.
- `quantV041Adapter.test.ts`: passed.
- `personalTerminalValueMath.test.ts`: passed.

Responsive and language matrix:

- 320, 375, 393, 768, and 1280 widths had zero document-level horizontal
  overflow in the audited market/instrument states.
- Chinese and English were checked in dark and light themes.
- Reduced motion exposed `data-v11-motion="reduced"` and retained the complete
  analytical structure.
- No visible audited mobile button was below `44x44`.
- The 375px English light header and 1280px reference labels were corrected and
  re-captured after the final responsive-label patch.
- Mobile bottom inset kept the terminal implication/action above the fixed
  navigation in the audited scroll-bottom state.

Local Chromium full-composition performance:

- 11 complete 145-frame probes across Market open, instrument drill-down,
  return to Market, micro-Candle switch, timeframe switch, Analyst open/close,
  Signal detail, dark/light, reduced motion, 375/393/1280;
- 1,595 sampled frames total;
- P50: `16.7ms`;
- worst complete-probe P95: `16.9ms`;
- frames above 20ms: `1 / 1,595`; the single frame occurred during Market to
  instrument drill-down;
- instrumented interaction samples additionally recorded worst P95 `17.4ms`
  and at most `1 / 48` frames above 20ms during chart pan/scale or Analyst
  opening;
- no visible flicker, material loss, or document overflow was observed locally.

Console:

- no runtime error was captured;
- existing warnings remain for RN Web `shadow*`/`pointerEvents` deprecations,
  Expo Notifications web support, and unavailable local sync.

## F. Quant validation and artifacts

Branch: `research/v0.4.1-materialized-terminal`

Stage 3.12 commits after the accepted Stage 3.11 baseline:

- `39746b5` - add adaptive personal market presentation
- `53c8654` - materialize personal market overview fixtures
- `e4743bf` - bound ordinal personal references

Targeted V0.4.2 tests passed: 13 tests in 13.423 seconds. They cover adaptive
feedback, micro-Candle reconstruction, bucket separation, breadth correctness,
percentage correctness, compact/full equivalence, materialized cache
invalidation, required lifecycle scenarios, and no fake composite.

The regenerated synthetic release at `/tmp/questlife-v042-e4743bf` contains:

- 17 full terminal payloads;
- 17 compact overview payloads;
- one manifest;
- `quantCommit=e4743bf`;
- `syntheticOnly=true`;
- `containsRealUserData=false`;
- `runtimeDependencyOnSiblingRepository=false`.

Canonical compact payload measurements from the manifest:

- Steps-only: full `171,212` bytes; overview `4,403` bytes (`2.57%`).
- Rich passive: full `1,093,177` bytes; overview `22,481` bytes (`2.06%`).
- Mature mixed: full `1,627,652` bytes; overview `22,778` bytes (`1.40%`).
- Day 30/90/180 mature overviews are `1.40%-1.88%` of their full terminal
  payloads.

The materialized V0.4.2 test verifies an overview cache hit, invalidation after
an affected new observation, and a refreshed observation count without
rebuilding unrelated history in the test contract.

Full Quant suite: 616 tests passed in 433.027 seconds.

A fresh generation of all 17 full payloads, 17 compact overviews, and the
manifest completed in 13.82 seconds locally (`user 12.11s`, `sys 1.21s`). This
is a synthetic release-generation measurement, not a production ingestion or
incremental-update benchmark.

## Screenshot matrix

Artifacts are in `artifacts/v11-stage3-12/`. Pixel dimensions were verified
from the files after the final responsive patch.

Mobile dark, `375x667`:

1. `01-personal-market-steps-only-375-dark.png`
2. `02-personal-market-rich-passive-375-dark.png`
3. `03-personal-market-questlife-only-375-dark.png`
4. `04-personal-market-mature-mixed-375-dark.png`
5. `05-focus-n1-375-dark.png`
6. `06-focus-n2-375-dark.png`
7. `07-focus-n3-line-375-dark.png`
8. `08-focus-n3-candle-375-dark.png`
9. `09-focus-n5-candle-375-dark.png`
10. `10-steps-30d-candle-375-dark.png`
11. `11-market-analyst-375-dark.png`
12. `12-day90-market-375-dark.png`
13. `13-goal-375-dark.png`
14. `14-skill-375-dark.png`
15. `15-no-data-375-dark.png`

Desktop dark, `1280x900`:

16. `16-personal-market-overview-1280-dark.png`
17. `17-rich-passive-overview-1280-dark.png`
18. `18-mature-mixed-overview-1280-dark.png`
19. `19-movement-selected-1280-dark.png`
20. `20-focus-selected-1280-dark.png`
21. `21-market-analyst-1280-dark.png`
22. `22-goal-1280-dark.png`
23. `23-skill-1280-dark.png`

Light and review comparison:

24. `24-personal-market-375-light-en.png` - `375x667`
25. `25-mature-workstation-1280-light-en.png` - `1280x900`
26. `26-focus-n3-line-vs-micro-candle-750x667.png` - `750x667`

## G. Commercial verdict

Stage 3.12 is a material product improvement over Stage 3.11 locally:

- Market synthesis now precedes instrument analysis;
- first, second, and third observations visibly change product capability;
- compact overview payloads make the whole-system surface credible without
  loading every canonical series on first paint;
- the interface distinguishes position, direction, maturity, evidence, and
  interpretation rather than collapsing them into an ambiguous trend;
- QuestLife-only and passive-only users both receive a coherent Personal
  Market;
- the visual language now has a recognizable breadth strip, synchronized
  personal timeline, reference provenance, Top Moves, and Analyst hierarchy.

An 8/10 commercial score is not claimed. Remaining weaknesses include high
fixture payload weight for the local review package, dense desktop reference
copy, absence of a real passive-data import, no physical Safari review, and no
deployed end-to-end validation.

## H. UNVERIFIED

- physical iPhone Safari rendering, touch, Sheet behavior, and frame pacing;
- Vercel Preview;
- production URL and production data;
- real Health/passive data import;
- production API/schema integration;
- real-user Day 1 -> Day 90 lifecycle behavior.

No real user data, real Health data, advanced Quant model, production schema,
or production API was added. Nothing was pushed or deployed. Stage 4 was not
started.
