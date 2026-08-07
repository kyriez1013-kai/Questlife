# QuestLife V11 Stage 3 - Current Insights Capability Audit

Date: 2026-08-07

Scope: read-only audit of the current `StatsScreen` and its existing helpers before the isolated V11 Insights prototype. This document records current behaviour; it does not approve new calculations, thresholds, schemas, Store writes, or persistence.

## Source Boundary

- UI: `src/screens/StatsScreen.tsx`, `src/screens/StatsScreenInsights.tsx`
- Live-log filter: `getLiveExecutionLogs` in `src/utils/metacognition.ts`
- Existing analytical engine: `src/utils/insightsEngine.ts`
- Existing metacognition: `buildMetacognitionSummary` in `src/utils/metacognition.ts`
- Existing context interpretation: `buildObjectiveContextBrief` in `src/utils/objectiveContextBrief.ts`
- Existing product-loop status: `getAppCoreLoopStatus` in `src/utils/coreLoop.ts`
- Stored pattern semantics: `PatternMemory` in `src/types.ts`

All duration-based allocations exclude records with `durationMinutes <= 0`. Live logs also exclude deleted records, invalid records, and records linked to a missing Skill.

## Overview

| Current UI element | Actual source / calculation | Minimum evidence | Current low-data behaviour | User action | Mode | User-facing reliability |
| --- | --- | --- | --- | --- | --- | --- |
| Context row: last 7 days | all live ExecutionLogs plus distinct active dates | none | always shows counts, including zero | none | read-only | reliable as metadata, not a personal insight |
| Data-health badge | `logs >= 20 && activeDays >= 7` = high; `logs >= 7 || activeDays >= 3` = medium; otherwise low | none | low | none | read-only | derived coverage label; not analytical confidence |
| Primary judgement | first available: `metacognition.currentPattern`, derived state pattern, objective context brief, recent execution fallback, accumulation fallback | varies by selected source | conservative fallback | none | read-only | reliable only with its displayed provenance and limitation |
| State-trend evidence | delta between first and latest StateCheckIn in the existing 7-day metacognition window | 2 StateCheckIns | omitted | none | read-only | directly derived; not causal |
| State-pattern evidence | repeated after-state deltas grouped by Skill/action | 2 eligible after-state logs; group also needs 2 | omitted | none | read-only | candidate association only |
| Body/context evidence | `buildObjectiveContextBrief(contextLogs)` | 1 recent ContextLog can produce low-confidence output | omitted only when no context exists | none | read-only | cautious derived guidance; explicitly non-medical |
| Behaviour evidence | after-state links first, then quality/duration associations | 2 linked records per group; confidence rises at 3/5 | omitted | none | read-only | observed association, not causality |
| Next action text | key from the selected existing judgement | same as judgement | fallback asks for another observation | no handler in current screen | read-only | wording is useful, but current UI does not execute it |

## Trends

| Current UI element | Actual source / calculation | Minimum evidence | Current low-data behaviour | User action | Mode | User-facing reliability |
| --- | --- | --- | --- | --- | --- | --- |
| Comparable-trend gate | live positive-duration logs in the last 7 days | at least 3 logs and 3 active days | one compact accumulation explanation | none | read-only | honest availability gate; not a statistical trend test |
| 7-day duration bars | daily sum of positive `durationMinutes`; quality label is daily average when present | comparable-trend gate | entire chart hidden | none | read-only | directly derived; missing day currently looks like a zero placeholder |
| Skill allocation | last-7-day positive duration grouped by existing linked Skill | positive duration plus comparable-trend gate | omitted | none | read-only | reliable allocation of recorded time only |
| Range/provenance text | first and last day of the fixed 7-day window, sample count, active days | none | still displayed | none | read-only | reliable metadata |

## Patterns

| Current UI element | Actual source / calculation | Minimum evidence | Current low-data behaviour | User action | Mode | User-facing reliability |
| --- | --- | --- | --- | --- | --- | --- |
| Accepted patterns | stored `PatternMemory.status === accepted` | stored record | section omitted when empty | none | read-only | accepted user state, but not proven causal |
| Candidate patterns | stored `PatternMemory.status === candidate` | stored record | section omitted when empty | none | read-only | candidate only; must remain tentative |
| Archived patterns | stored `PatternMemory.status === archived` | stored record | section omitted when empty | none | read-only | historical reference only |
| Pattern status counts | counts of accepted/candidate/archived PatternMemory | none | shows zero | none | read-only | reliable metadata |
| Stored pattern details | label, description, numeric confidence, `sampleN`, support basis, last seen/updated, caution | stored fields | missing date becomes insufficient-data copy | none | read-only | reliable provenance; confidence is stored, not recomputed here |
| Derived state patterns | `buildStatePatterns` from after-state deltas | 2 total eligible logs and 2 in a group | omitted | none | read-only | candidate association; capped at 3 |
| Behaviour links | after-state association or quality/duration summary grouped by action | 2 records in a group | omitted | none | read-only | association only; capped at 3 |

`PatternMemory.status === rejected` is part of the stored schema but the current Patterns screen does not render a rejected group.

## Advanced

| Current UI element | Actual source / calculation | Minimum evidence | Current low-data behaviour | User action | Mode | User-facing reliability |
| --- | --- | --- | --- | --- | --- | --- |
| Ability Map | `computeAbilityRadar`, last 30 days | 5 logs; dimension-specific baselines remain possible | hidden by current Advanced gate | expand explanation | derived | mixed reliability: execution/consistency are recorded; quality/self-awareness/resilience may contain baseline values |
| Tomorrow prediction | mean of latest 7 StateCheckIns, rounded to 1-5 | 5 StateCheckIns | hidden; helper returns 3/3 baseline but UI does not show it | expand explanation | inferred | experimental; not a measured tomorrow state |
| Monthly comparison | up to 3 recorded months; compares current and previous | 2 months | hidden | expand explanation | derived | descriptive comparison of recorded data only |
| Growth curve | 8 weekly duration totals | 3 non-empty weeks | hidden | expand explanation | derived | descriptive; missing weeks remain zero in the helper |
| Anomaly signal | quality drop, long gap, or consecutive 90-minute days | 5 logs; rule-specific requirements | hidden when none/insufficient | none | inferred rule flag | rule-based alert, not diagnosis |
| Combination effect | quality grouped by high/low energy and focus snapshots | 8 rated logs and 2 populated buckets | hidden | expand explanation | derived association | association only; no causal support |
| Self-knowledge accuracy | absolute duration/quality prediction error | 3 predicted-duration logs | hidden | none | derived | reliable error summary for recorded predictions |
| Weekly average quality | mean quality in fixed last 7 days | 3 rated logs | hidden | none | derived | descriptive only |
| Rescue summary | weekly RescueLogs count/completion/latest/trigger | 1 RescueLog | hidden | none | derived | reliable for recorded rescue events only |
| Weekly duration statistics | recorded weekly minutes, all-time hours, active days, streak, target-hit days | comparable-trend gate | hidden | none | derived | descriptive; coverage-limited |
| Best recorded day / daily average | largest duration day and total seven-day minutes divided by 7 | 3 active days | hidden | none | derived | descriptive; current label can overstate it as a “pattern” |
| Skill/task/metric allocations | positive-duration logs grouped by Skill/task/metric | comparable-trend gate | hidden | none | derived | recorded-time allocation only |
| 8-week heatmap | daily positive duration | comparable-trend gate | hidden | none | derived | activity density, not performance |
| System loop overview | Goal/Skill/Schedule/Execution coverage via `getAppCoreLoopStatus` | none | always shown once Advanced has any evidence | none | read-only | product-system health, not personal performance |

The current Advanced screen displays all available models in one vertical stack. Its only interactions are per-card “why” disclosures; there is no one-model-at-a-time selector.

## Existing Engine Outputs Not Currently Exposed as Dedicated Advanced Cards

The engine also computes state-quality correlation, best time of day, weekly pattern, consistency, prediction accuracy, cognitive fatigue, recovery pattern, and hourly time patterns. They are present in `InsightsSummaryResult`, but the current `InsightCardsBlock` does not render them as separate user-facing cards. V11 must not present them as current capabilities unless their existing outputs are deliberately mapped and their limitations remain visible.

## Output Classification

### Directly observed

- ExecutionLog date, duration, quality, prediction fields, linked Skill and state snapshot
- StateCheckIn values and timestamps
- ContextLog values and timestamps
- RescueLog events
- stored PatternMemory fields and support references

### Derived

- duration/quality daily aggregates
- active days, streak, target-hit days
- skill/task/metric time allocation
- prediction error
- state deltas
- monthly/weekly comparisons
- heatmap and product-loop coverage

### Inferred or rule-interpreted

- metacognition primary judgement
- state-pattern labels
- behaviour-link direction
- objective-context guidance
- tomorrow prediction
- anomaly flags
- ability dimensions

### Generic/reference values

- insufficient Ability Map baseline values
- insufficient tomorrow prediction 3/3 and 0.3 confidence
- insufficient cognitive-fatigue 60-minute reference
- insufficient recovery 2-day/3-day reference
- default best-time/time-pattern values returned by helpers

These values must not be rendered as personalised results in V11.

### Pattern status semantics

- Candidate: stored `PatternMemory.status === candidate`, plus runtime state/behaviour associations that have not been accepted
- Accepted: only stored `PatternMemory.status === accepted`
- Archived: stored `PatternMemory.status === archived`
- Rejected: stored but currently not rendered in Insights

## Legacy Internal UI Audit

| Surface | V11 outer shell | V11 inner controls | Legacy component | Real data source | Migration required |
| --- | --- | --- | --- | --- | --- |
| Overview | no | no | QuestCard/DashboardCardShell | yes | yes |
| Trends | no | no | grouped surfaces + fixed bar chart | yes | yes |
| Pattern list | no | no | grouped cards/rows | yes | yes |
| Pattern detail | absent | absent | no detail layer | stored PatternMemory | yes |
| Advanced selector | no | no | absent; all models stack | yes | yes |
| Advanced cards | no | legacy per-card why toggle | `StatsScreenInsights` cards | yes | yes |
| Evidence detail Sheet | absent | absent | no shared sheet | evidence IDs exist for some sources | yes |
| Empty states | no | no | repeated grouped surfaces | yes | yes |

## Audit Conclusion

The current repository already has useful observational, descriptive, association, and rule-based outputs. The Stage 3 rebuild therefore needs a presentation adapter and progressive analysis workspace, not a new analytics engine. Generic baselines must be suppressed, candidate outputs must remain tentative, and the existing thresholds remain unchanged.
