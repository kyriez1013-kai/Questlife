# QuestLife Quant Interpretation Layer v0.1 QA

Date: 2026-08-12

Status: local isolated implementation validated with deterministic synthetic
fixtures. Physical iPhone Safari, Vercel Preview, production, real Health data,
and real-user data remain unverified.

## Scope And Boundaries

- App branch: `design/questlife-product-v2`
- Quant branch: `research/v0.4.1-materialized-terminal`
- Isolated route: `questlife_v11_ui=stage3-personal-terminal`
- Fixture selector: `quantInterpretation=<scenario>`
- No Store, API, production schema, persistence, Observation Ledger, or real
  user-data path was changed.
- No push or deployment was performed.
- All release fixtures declare `syntheticOnly: true` and
  `containsRealUserData: false`.

## Interpretation Contract

The Quant repository now materializes these versioned typed artifacts:

- `DriverAnalysisArtifact`
- `SimilarPeriodsArtifact`
- `RecoveryTrajectoryArtifact`
- `ScenarioComparisonArtifact`
- `InterpretationBrief`
- `DecisionSupportArtifact`
- `InterpretationBundle`

Every artifact preserves subject, as-of time, selected target, analysis window,
evidence references, missingness, data availability, method/version,
limitations, and derivation lineage.

Scientific safeguards are structural rather than copy-only:

- candidates are limited to registered eligible drivers;
- future observations cannot alter an as-of artifact;
- the current window cannot match itself as a historical analogue;
- historical analogue semantics cannot emit forecast styling;
- scenario branches are observational and never labeled causal;
- non-uncertainty Analyst claims require evidence references;
- Quant returns candidate actions only; `todayCommand` remains the executable
  authority.

## Deterministic Review Scenarios

Six 120-day synthetic scenarios cover the required distinctions:

1. `accumulated_load`: elevated recent load with roughly normal sleep.
2. `sleep_disruption`: sleep deviation is the strongest candidate.
3. `conflicting`: sleep and load both fit; the artifact retains competition.
4. `exercise_branch`: comparable periods include a meaningful-exercise branch.
5. `rest_branch`: lower-load/recovery is the leading reversible candidate.
6. `insufficient`: current state is low while current-window inputs are
   missing; the output asks for sleep duration rather than inventing a driver.

## Terminal Integration

The isolated Personal Quant Terminal adds:

- a mobile `Drivers / Similar / Recovery / Decision` strip;
- a persistent desktop Interpretation panel;
- driver support/counterevidence inspectors;
- chart comparison and selected-window highlighting from driver findings;
- explainable Similar Period rows and jump-to-period behavior;
- a Recovery Map with individual historical paths, a reference path, range,
  and current marker;
- an explicitly labeled historical analogue envelope to the right of now;
- exercise/rest observational branch comparison;
- structured Analyst sections for observed movement, candidate drivers,
  counterevidence, similar periods, what followed, uncertainty, and next step;
- Decision Support handoff back to Today without automatic execution;
- a first-class next useful observation.

The UI adapter validates the fixture contract with Zod and rejects payloads
that contain real user data or present an analogue as a forecast.

## Local Visual And Interaction QA

Verified in local Chromium exported web:

- widths: 375px and 1280px;
- languages: Chinese and English;
- themes: dark and light;
- reduced-motion debug path;
- no document-level horizontal overflow;
- driver click selects the matching comparison series and highlights the
  current interpretation window;
- Similar Period click changes the existing chart range to the exact analogue;
- Recovery opens the historical analogue overlay;
- Decision Support exposes four candidates and a Today handoff;
- low-data rows do not display historical counts as current-window fit;
- no untranslated `quantInterpretation*` keys were visible;
- no browser runtime errors were captured.

The existing Expo Notifications web-support warning remains and is unrelated
to this layer.

## Performance

Quant benchmark, seven synthetic runs:

| Operation | Cold P50 | Cold P95 |
| --- | ---: | ---: |
| Driver Analysis | 26.603ms | 27.053ms |
| Similar Periods | 101.725ms | 102.514ms |
| Recovery Trajectory | 25.360ms | 26.547ms |
| Scenario Comparison | 25.687ms | 25.919ms |
| Interpretation Brief | 25.605ms | 25.763ms |
| Full Interpretation Artifact | 320.552ms | 322.800ms |

Materialized payload warm read measured P50 `0.000ms`, P95 `0.001ms`;
serialization measured P50 `12.136ms`, P95 `12.268ms`. Payload size was
`286,641` bytes for the conflicting synthetic scenario.

Local 375px Chromium inspector rendering:

| Interaction | P50 | P95 | Frames >20ms |
| --- | ---: | ---: | ---: |
| Analyst | 16.7ms | 18.7ms | 0/39 |
| Drivers | 16.7ms | 18.4ms | 0/39 |
| Similar Periods | 16.7ms | 18.6ms | 0/39 |
| Recovery Map | 16.7ms | 18.6ms | 0/39 |
| Decision Support | 16.7ms | 18.7ms | 0/39 |

These are local synthetic-fixture measurements, not a mobile-device or
production SLA.

## Automated Validation

- App `npx tsc --noEmit`: passed.
- App `npm run build`: passed.
- App bundle: `index-0dae772eee92db854a43bd2dcb988e5a.js`.
- App strict fixture adapter test: passed.
- Quant focused Interpretation/release tests: 17 passed.
- Quant full regression: 633 passed in 443.447 seconds.
- App and Quant diff whitespace checks: passed.

## Screenshot Set

`artifacts/quant-interpretation-v0.1/` contains:

- mobile dark: selected range, compact/expanded drivers, sleep overlay,
  Similar Periods, analogue jump, Recovery Map, scenario comparison,
  insufficient evidence, next observation, Analyst, and analogue envelope;
- desktop dark: workstation, drivers/chart, Similar Periods/chart, Recovery
  Map, scenario comparison, and Analyst/Decision Support;
- representative mobile and desktop light states;
- representative mobile and desktop English states.

## Unverified

- physical iPhone Safari rendering and gesture feel;
- Vercel Preview and production;
- production API/schema integration;
- real Health/passive data;
- real user longitudinal interpretation quality;
- a validated forecast model or forecast overlay.

## Future Model Path

No advanced model was started. Later research may improve bounded parts of the
existing contract:

- State Space: latent-state smoothing and recovery dynamics;
- Bayesian: posterior uncertainty and partial pooling after a valid population
  dataset exists;
- Change Point: explicit regime and protocol transition detection;
- Deep Learning: representation learning for higher-dimensional analogue
  search only after leakage-safe longitudinal evaluation.

Those models must enrich the current artifacts, not bypass their provenance,
causality, uncertainty, or Today-authority boundaries.
