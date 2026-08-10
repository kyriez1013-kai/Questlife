# QuestLife Quant V0.4.1 Terminal Mapping

This mapping records the actual `questlife-terminal-presentation-v0.4.1` contract. The App consumes this presentation payload; it does not recreate Quant calculations.

| V0.4.1 field | Terminal concept | UI use | Fallback |
| --- | --- | --- | --- |
| `state` | Personal data availability | Chooses the normal terminal or the designed no-data shell | `no_data` renders no chart, axes, Goal, or Skill placeholders |
| `source` | Artifact identity and safety metadata | Debug-only provenance inspector | Invalid schema, real-user-data flag, or missing source metadata fails closed |
| `defaultScope`, `defaultEntityId`, `defaultSeriesId` | Initial analytical context | Selects Person, Goal, or Skill without guessing | Uses the first validated entity/series only when an optional default is absent |
| `goalAvailable`, `skillAvailable` | Navigation capability | Reveals Goal/Skill only when Quant emitted those entities | Hidden, never shown as disabled empty tabs |
| `entities[].seriesIds` | Scope-to-instrument relationship | Drives scope/entity/instrument navigation | Unknown series IDs are rejected by validation |
| `entities[].composition` + `compositionBasis` | Existing Goal/Skill composition | Compact composition inspector | Hidden when absent; `recent_activity_share` is never labelled causal contribution |
| `series[].constructKey`, `domain`, `labelKey`, `unit`, `semantic` | Instrument identity and formatting | Heading, value, unit, domain grouping, accessible chart description | Unknown keys receive neutral readable labels; meaning is not inferred |
| `latestValue`, `latestAt` | Latest recorded/derived reading | Primary current value and timestamp | Missing values display an unavailable reading, never zero |
| `baseline` | Quant-produced personal reference | Reference line/range and reference copy | `unavailable` hides the reference rather than fabricating one |
| `recentChange` | Quant-produced recent-vs-reference description | Direction, absolute/percent change, and analyst observation | Hidden when absent; `higher_is_better` is not inferred |
| `points[]` | Provenance-tagged observations | Line/bar data, crosshair detail, historical-to-active marker | Invalid/non-finite points are rejected; missing intervals remain missing |
| `views[timeframe]` | Precomputed bounded presentation window | Selects point indices and axis precision | Only listed, valid views are selectable |
| `availableTimeframes`, `defaultTimeframe` | Instrument-specific range capability | Range control | No universal finance-style timeframe list is generated |
| `chartCapabilities` | Instrument legality | Shows only line/bar/candle/percent-change controls Quant permits | Candle remains hidden unless explicitly `true` |
| `coverage` | History extent and source coverage | Compact evidence meter and source inspector | Coverage is described as coverage, not measurement quality |
| `stage`, `maturityLabel` | Per-instrument evidence state | Restrained maturity language and visual intensity | Raw `C0-C4` labels are never shown |
| `provenance`, `questlifeStartedAt` | Historical versus active evidence boundary | Source inspector and one timeline transition marker | Historical and QuestLife-active observations remain distinct |
| `analyst.items` | Deterministic Quant observations | Contextual Analyst: observed, evidence, limitation | Empty items produce a concise limitation, not generated analysis |
| `analyst.modelReadiness` | Research capability metadata | Debug/provenance only in this pass | Never presented as an active model or user score |
| `signals[]` | Registered relationship artifacts | Signal inspector only when emitted | Empty means no signal; eligibility metadata never manufactures one |
| `nextActionKey` | Product-valid next step | No-data or contextual action copy | Unknown keys route to a neutral inspection action |

## Contract boundary

The TypeScript adapter validates, maps, formats, and routes capabilities only. Baseline, recent change, maturity, evidence stage, coverage, signal eligibility, timeframe windows, and chart legality remain Quant outputs. Existing non-V0.4 App data continues through its current presentation path. The fixture bridge is reproducible, synthetic-only, hash-checked, and has no runtime dependency on `QuestLife-Quant`.
