# Adaptive Daily Decision Loop V1

## Product Wedge

QuestLife now supports one bounded decision workflow for moments when a user is
uncertain whether to continue, shorten, move, protect, or recover:

1. Open the decision action from the accepted Today judgement.
2. Choose training/recovery, cognitive adjustment, overloaded day, or enter a
   short custom question.
3. Assemble eligible current state, context, recent execution, schedule,
   direction, and supplied Quant artifacts automatically.
4. Ask at most two questions that can materially change the decision.
5. Show at most three materially different, deterministically ordered actions.
6. Expose facts, personal comparison, observational evidence, analogues,
   counterexamples, unknowns, and limitations.
7. Preview an explicit schedule patch without changing the plan.
8. Apply only after confirmation, then allow exact and idempotent undo.
9. Request the proposal-defined outcome when its follow-up becomes due.
10. Store the complete episode in the existing DecisionResult memory path.

This is a structured decision and execution loop, not a generic chat surface,
new dashboard, or automatic planner.

## Product Entry Points

- Owner path: the compact `Adjust today` action adjacent to the accepted Today
  judgement, enabled only when both the V11 owner Today and
  `adaptive_decision_loop=1` are active.
- Isolated review path: `?demo=adaptive-decision-loop` with deterministic
  training, cognitive, and overloaded-day fixtures.
- No flag: the existing Today remains unchanged.

The owner path uses real Store data and existing Store handlers. The demo route
renders before StoreProvider, uses sessionStorage only, never enters the owner
namespace, and exposes a reset action.

## Supported Decisions

### Training / Recovery

Uses current state, sleep when available, recent execution load, relevant
training blocks, fixed commitments, and eligible personal evidence. Depending
on the context it can preserve the workout, shorten it, move it, or leave it
unplaced for recovery. It never silently applies a change.

### Cognitive Task Adjustment

Prioritizes relevant deep-study, light-review, or creative-work blocks. It can
continue, shorten, or move the task while preserving fixed commitments.

### Overloaded Day

Protects fixed commitments and explicit high-rigidity priorities. Capacity is
released by shortening a non-priority block, moving the least disruptive
movable block, or making an unplaced item explicit. It does not force every
item into the day.

### Custom Question

Classifies a short question into the same bounded workflow. Safety-sensitive
wording is evaluated before ordinary ranking. Custom input does not become a
free-form chatbot and is not written to telemetry.

## Context Assembly

The deterministic assembler reads only data available at the episode `asOf`:

- latest eligible StateCheckIn;
- eligible ContextLog values, including sleep duration;
- eligible ExecutionLog records from the prior seven days;
- today's ScheduleBlocks, fixed/flexible constraints, and open windows;
- linked Goal and Skill direction;
- supplied, validated Quant product/analysis artifacts;
- previous completed Decision Episodes where applicable.

Owner mode excludes deleted records and `SYNTHETIC`, `QA_TEST`, and
`DEBUG_FIXTURE` origins. Future observations and records whose `availableAt`
is after the decision are excluded. Legacy or unknown provenance remains
visible as limited evidence. Missing values remain missing and are never
converted to zero or a neutral state.

The normal path asks no more than two material questions. Current state,
constraint flexibility, priority, or symptom severity are requested only when
their answer can alter safety, feasibility, or proposal selection.

## Evidence Boundary

`DecisionEvidencePacketV1` is a presentation-safe adapter over existing Quant
contracts. React validates and maps artifacts; it does not calculate baselines,
EWMA, regression, drivers, similar periods, recovery trajectories, or evidence
counts.

The UI orders evidence as:

1. direct fact;
2. personal comparison;
3. joint observational evidence;
4. historical analogues;
5. unknowns;
6. limitations.

When a multivariate artifact is eligible, observed deviation,
model-associated deviation, and unexplained residual are preserved together.
Research-only, invalid, wrong-version, future-dated, and ineligible artifacts
fail closed. Owner sparse-data mode remains useful through explicit
constraints, reversibility, and schedule feasibility without borrowing demo
evidence.

## Decision Policy

The V1 policy is deterministic constraint handling, not a hidden optimal-action
score. It evaluates safety, feasibility, explicit constraints, reversibility,
evidence relevance, goal alignment, and disruption cost. Stable input produces
stable proposal order. Candidate kinds are deduplicated and capped at three.

The conservative safety gate distinguishes ordinary tiredness/low focus from
symptom-sensitive wording. A blocked context produces an abstention action,
does not diagnose, does not issue a confident exercise prescription, and does
not mutate the plan.

## Apply, Undo, and Follow-up

Each action owns an explicit `DecisionPlanPatchV1` containing operations and
complete before/after snapshots. Fixed blocks cannot be changed. Preview is
pure. Apply checks that the current blocks still match the previewed `before`
state. Undo checks the applied `after` state and restores the exact snapshot.
Repeated apply/undo calls are idempotent where the expected state already
exists; conflicting external edits fail closed.

Follow-up horizons are two hours, end of day, or next morning. Each proposal
declares only the outcome fields it requires. Due follow-ups can record state,
fatigue, task result, usefulness, or carryover. Skipping is explicit. A single
outcome remains one observational episode and is never promoted automatically
to PatternMemory truth.

## Privacy and Isolation

- Telemetry is session-only and contains a runtime-whitelisted set of counts,
  enum-like labels, and durations.
- Raw questions, notes, private context, stable owner identity, API payloads,
  headers, and environment values are not recorded.
- DecisionLeverageReport is shown only for deterministic fixtures and is
  labelled fixture-only.
- Demo fixtures never use owner Store or Supabase sync.
- Consequential schedule changes require explicit owner confirmation.

## Current Runtime Limitation

The repository contains validated Quant product and interpretation contracts,
and the decision evidence adapter consumes them when supplied. The current App
does not yet expose a real owner runtime source for those materialized Quant
artifacts. Therefore the owner flow currently reports Quant evidence as
missing/limited instead of substituting fixture evidence or recalculating
statistics in React. Closing that runtime handoff is the narrow remaining
blocker to rich owner evidence; it is not required for Day 1 constraint-based
decision value.
