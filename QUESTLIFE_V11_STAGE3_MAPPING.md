# QuestLife V11 Stage 3 - Current to V11 Mapping

Date: 2026-08-07

## Core Model

`QUESTION -> RANGE -> CURRENT BASELINE -> CHANGE -> EVIDENCE -> POSSIBLE EXPLANATION -> LIMITATION -> NEXT ACTION`

The mapping is presentation-only. Existing helpers remain the calculation authority.

| Existing capability | V11 entry | Depth | Existing authority | Interaction |
| --- | --- | --- | --- | --- |
| Main judgement | Insight canvas | L1 | `buildMetacognitionSummary` / existing fallback order | expand evidence |
| Supporting evidence | Evidence rail | L2 | state trend, state patterns, context brief, behaviour links | select evidence row |
| Evidence provenance | Evidence Sheet | L3 | existing source IDs, timestamps, sample fields | close Sheet |
| 7-day duration | Trend canvas | L1/L2 | existing 7-day aggregation and 3-log/3-day gate | inspect a point |
| Skill allocation | Trend supporting region | L2 | existing recorded-time grouping | read-only |
| PatternMemory groups | Pattern workspace | L1/L2 | stored statuses and fields | select status and pattern |
| Pattern detail | Pattern Sheet | L3 | stored PatternMemory/support/caution | close Sheet |
| Ability, monthly, growth, prediction, anomaly, combination, self-knowledge | Analyse workspace | L4 | existing `insightsEngine` outputs | one mode at a time |
| Continue recording | next action | L1 | existing Today navigation | navigate to Today |
| Product loop health | Analyse mode only | L4 | `getAppCoreLoopStatus` | read-only |

## View Architecture

- `INSIGHT`: one primary observation, up to three evidence rows, one limitation, one existing next action.
- `TREND`: fixed real 7-day range, temporal marks, point inspection, provenance and recorded-time allocation.
- `PATTERN`: compact Candidate / Accepted / Archived mode, scalable rows, no causal wording.
- `ANALYSE`: one existing analysis mode at a time; unavailable modes explain the missing evidence.

## Evidence Stages

The Stage 3 adapter does not persist an evidence stage and does not add thresholds.

- S0: no live ExecutionLog, valid StateCheckIn, usable ContextLog, or stored PatternMemory.
- S1: at least one direct observation exists, but no existing comparable helper or stored pattern supports a stronger state.
- S2: an existing helper already reports comparable/emerging evidence, or a stored Candidate pattern exists.
- S3: at least one stored Accepted PatternMemory has non-zero `sampleN` and stored support evidence.

When requirements are missing, the lower state wins. Feature availability is displayed separately from evidence strength.

## Unsupported Future Product Requirements

- Arbitrary date-range recomputation beyond the existing fixed windows
- User-selected variable correlation not already computed by current helpers
- Causal explanation or intervention experiments
- Calibration System
- Quant Engine
- Bayesian or ML confidence
- Automatic schedule changes
- New PatternMemory status or lifecycle semantics

These are not implemented as fake controls. They may be documented as future proposals only.

## Component Plan

- `src/v11-insights/insightsPresentation.ts`: pure deterministic selection/formatting of existing results.
- `src/v11-insights/V11InsightsScreen.tsx`: isolated real-Store workspace.
- `src/v11-insights/V11InsightsVisuals.tsx`: real-data temporal marks, ranges, evidence intensity, and before/after visual primitives.
- `src/v11-insights/V11InsightsEvidenceSheet.tsx`: L3 detail using the existing shared V11 production Sheet shell.
- `src/v11-insights/v11-insights.css`: responsive composition and V11 material behaviour.
- `src/v11-insights/insightsFixtures.ts`: explicit local QA-only, non-persisted states for visual coverage; never used by the ordinary route.

## Isolation Contract

- Default `StatsScreen` remains untouched.
- Only `?questlife_v11_ui=stage3-insights` selects the isolated Insights surface.
- The screen reads the existing Store through `useStore()` and performs no writes.
- A separate explicit QA query may substitute non-persisted fixture input and must visibly label it as fixture data.
- Removing the flag immediately returns the current production Insights.
