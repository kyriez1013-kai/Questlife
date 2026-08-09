# QuestLife Stage 3.9 Component Audit

Scope: isolated `questlife_v11_ui=stage3-personal-terminal` prototype only.

## Product boundary

- Preserve the accepted `Person -> Goal -> Skill` resolution model.
- Preserve the chart-first workstation, real Store adapter, QA fixture boundary,
  evidence semantics, and contextual analyst entry.
- Do not change `StatsScreen`, Store, APIs, schemas, persistence, Quant Engine,
  Today, or Schedule.
- This pass changes presentation and fixture-only demonstration data. It does
  not create production analysis results.

## Current visual-language classification

### A. Useful analytical conventions to keep

- Shared time axis, pan, zoom, crosshair, timeframe selection, baseline,
  current value, event selection, and range selection.
- Separate Person, Goal, and Skill resolution with one chart engine.
- Explicit unit, provenance, evidence count, missingness, and limitation copy.
- A central canvas with a desktop scope rail and contextual inspector.

### B. Generic financial conventions to refine

- Dotted full-canvas grid and finance-like price-axis presentation.
- Flat ticker-style instrument header and compact terminal-status labels.
- Toolbar labels and geometry that resemble a market chart utility bar.
- Histogram load pane without a human-system label or shared-time explanation.
- Optional candlestick presentation as a prominent chart identity.

### C. Recognisable third-party language to remove or isolate

- No TradingView logo is rendered inside the analytical canvas.
- The required Lightweight Charts notice and link remain outside the canvas.
- Default library colours, logo, toolbar assets, and branded geometry are not
  used as QuestLife product identity.
- The library remains an implementation engine, not the visual design source.

### D. QuestLife-specific language to strengthen

- Personal Baseline Band, Current Mark, Trajectory, Stability Range, Load Rail,
  Event Rail, Signal Link, Evidence Trace, and Data Maturity.
- A synchronized human timeline that aligns state, execution, recovery, and
  real-life events to one x-axis.
- Movement inspection: select a point/range, inspect what moved nearby, then
  choose an analytical operation without receiving a causal claim.
- Personal Breadth and Market Map, with size restricted to legitimate activity
  share and direction evaluated within each metric's own reference.

## Component decision

| Component | Decision | Stage 3.9 responsibility |
| --- | --- | --- |
| `personalTerminalPresentation.ts` | REFINE | Add deterministic compare and synchronized-series presentation types without Store or schema changes. |
| `personalTerminalFixtures.ts` | REFINE | Demonstrate supported multi-variable, long-range, event, signal, and provenance states in non-persisted QA fixtures. |
| `PersonalTerminalChart.tsx` | REFINE | Keep the engine wrapper; replace finance skin with QuestLife baseline, current mark, synchronized rails, comparison, and selected-period emphasis. |
| `V11PersonalTerminal.tsx` | REFINE | Preserve IA; add compare, movement inspector, contextual analyst, Goal trajectory, Skill depth, and responsive workstation composition. |
| `PersonalTerminalSheet.tsx` | KEEP | Shared V11 interaction layer. Content and role-specific styling may be refined. |
| `PersonalTerminalIcon.tsx` | KEEP | One QuestLife icon family; extend only when a new analytical operation needs a distinct icon. |
| `personal-terminal.css` | REFINE | Replace generic terminal boxing with QuestLife canvas depth, aligned rails, precise type, and mobile-specific composition. |
| `personalTerminalPresentation.test.ts` | REFINE | Cover compare compatibility, missing-data honesty, and fixture-only data boundaries. |

## Replace or remove inside the isolated surface

- REPLACE `Compare` meaning `range selection` with a real secondary-series
  comparison control. Range selection remains a separate operation.
- REPLACE finance-like dotted grids with a restrained temporal calibration
  plane and QuestLife rails.
- REPLACE generic analyst modal copy with structured `Observed / Related changes
  / Known signals / Limitations / Next question` sections.
- REMOVE normal-product `QA`, `fixture`, `MATURE`, `S2`, and debug copy. Explicit
  debug mode retains one clearly separated fixture proof label.
- REMOVE decorative event markers that do not expose category, time, source,
  scope, and selected-range relevance.

## Older isolated prototypes

The following remain rollback/reference code and are not composed into the
Stage 3.9 route:

- `V11InsightsScreen.tsx` and its evidence/advanced helpers
- `V11QuantIntelligenceSurface.tsx`
- `quant-terminal/*`

They are redundant for the accepted Personal Terminal IA, but this pass does
not delete them because rollback deletion is outside the approved scope.

