# QuestLife Core V1 Integration Map

## Safe App base

`product/questlife-core-v1` starts at `e440d4a` (`product/adaptive-decision-surface-v2`).

This base already contains the required accepted product lineage:

| Capability | Confirmed source |
| --- | --- |
| Approved V11 Today | `145e92c` plus canonical capture polish `8fa3f3e` / `19a5f4a` |
| Global Visual Foundation | `6a4a891` (lineage tip `b5d8754`) |
| Quant Product consumer contracts | `c83b903` lineage |
| Real Data Foundation and provenance | `46aaedb` lineage |
| Adaptive Decision Loop backend | `548f65d`, `82457c5`, `9be9295`, `1254875`, `3571509` (lineage tip `8718123`) |
| Adaptive Decision Surface V2 presentation | `aab506f`, `edf1e82`, `2480021`, `9a9bec1`, `e440d4a` |

The functional deterministic Schedule compiler is isolated in `cb0f7c3`. Only
that compiler commit is eligible for integration. The later Schedule V3
presentation commits are rejected and remain excluded.

## Quant source

`product/questlife-core-v1-runtime` starts at Quant commit `39f5fbe`.

The runtime reuses, rather than ports, these Python-owned layers:

1. AppData field registry and conservative adapter.
2. Real Data quality/provenance firewall in `NORMAL_OWNER` mode.
3. Observation Ledger materialization with `as_of` filtering.
4. V0.4.2 materialized personal-market artifacts.
5. Product Bundle V1 validation/materialization.
6. Analysis Extension V1 for eligible EWMA and joint observational analysis.

No Quant statistic is calculated in React or TypeScript.

## Runtime boundary

```text
real local AppData (structured fields only)
  -> App privacy-minimising snapshot adapter
  -> same-origin App API proxy
  -> versioned Quant runtime endpoint
  -> AppData quality/provenance firewall
  -> eligible Observation Ledger events at request as_of
  -> validated Product Bundle V1 + Analysis Extension V1
  -> App Zod contracts
  -> DecisionEvidencePacket
  -> existing Decision Policy
```

The App snapshot excludes RawCapture text, notes, labels and UI settings. The
normal owner runtime rejects `SYNTHETIC`, `QA_TEST`, `DEBUG_FIXTURE`, deleted and
future-unavailable records. Legacy unknown provenance remains limited or
excluded according to the existing Quant quality policy; it is never silently
promoted.

Quant failure, timeout, sparse history or an invalid artifact does not block
the Decision Loop. The owner workflow falls back to current facts and explicit
constraints.

## Evidence ladder

| Level | Required existing evidence |
| --- | --- |
| A | current state/facts, fixed commitments, open windows, explicit priority, reversibility and safety |
| B | eligible Product Bundle personal reference and/or EWMA |
| C | eligible registered observational Signal/Driver evidence with support and counterexamples |
| D | eligible Analysis Extension joint model, lag/stability and residual |
| E | comparable persisted owner Decision Episodes with recorded outcomes |

The highest supported level is derived deterministically. Missing lineage or
support lowers the level. No aggregate confidence score is introduced.

## Today integration

The existing compact `decisionAction` slot in approved Today is retained as the
single entry. One tap opens the shared Decision Surface directly and begins
context assembly immediately. There is no scenario selector, landing page or
manual context-assembly step.

The existing authorities remain unchanged:

- `todayCommand` remains Today's executable action authority.
- Decision Policy creates a proposal and exact `DecisionPlanPatchV1`.
- Store owns DecisionResult persistence and schedule mutation.
- `applyDecisionSchedulePatch` and `undoDecisionSchedulePatch` retain exact
  snapshot/conflict semantics.
- Follow-up outcomes persist on the same Decision Episode.

The legacy Today remains available when `questlife_core_v1` is absent. Demo
scenarios remain isolated behind the existing demo route and use the same
contracts/presentation without entering owner data.

## Explicit exclusions

- rejected Schedule and Insights presentation shells
- new Goal, Schedule or Insights design work
- Apple Health / HealthKit
- bidirectional sync or a new account system
- frontend statistics
- fixture fallback in owner mode
- automatic plan mutation
- Production deployment
