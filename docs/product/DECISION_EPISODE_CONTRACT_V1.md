# Decision Episode Contract V1

## Identity

- Contract: `questlife.decision.episode.v1`
- Evidence: `questlife.decision.evidence.v1`
- Policy: `questlife.decision.policy.v1`
- Persistence: embedded in the existing `DecisionResult.decisionEpisode`
  field; no separate top-level AppData collection is introduced.

## State Machine

```text
DRAFT
  -> CONTEXT_ASSEMBLING
       -> NEEDS_INPUT -> CONTEXT_ASSEMBLING
       -> READY -> PROPOSED -> ACCEPTED -> APPLIED
       -> ABSTAINED

APPLIED
  -> FOLLOW_UP_DUE -> OUTCOME_RECORDED -> CLOSED
  -> PROPOSED (exact undo)
  -> CLOSED

ABSTAINED -> CLOSED
```

Allowed transitions are an explicit whitelist. Repeating the current state is
idempotent. Invalid jumps throw `DecisionEpisodeTransitionError`. In
particular, a proposal is not accepted, acceptance is not application, a plan
is not execution, and execution is not outcome.

## Required Episode Fields

### Identity and subject

- `id`
- `contractVersion`
- owner or demo subject kind
- optional subject id
- `methodVersion`
- `createdAt` and `updatedAt`

### Question and outcome

- question type: training/recovery, cognitive adjustment, overloaded day, or
  custom
- optional raw question text in the episode only, never in telemetry
- optional decision target
- target outcome horizon and required fields

### Time semantics

- `eventTime`
- `recordedTime`
- `availableAt`
- `asOf`
- timezone
- bounded observation window

The assembler excludes observations whose event or availability time crosses
the episode `asOf`. Reconstructing an earlier episode cannot use later data.

### Context and provenance

- immutable context snapshot for the episode
- at most two unresolved material questions
- source references with source type, source id, event/available time, origin,
  eligibility, and limitation codes
- explicit missingness and limitations
- excluded source ids are diagnostic only and do not enter evidence

Owner mode excludes deleted, synthetic, QA, debug, and future sources. Unknown
legacy provenance is limited, not silently upgraded or zero-filled.

### Evidence

The packet can carry:

- direct current fact;
- personal reference and observation/period support;
- absolute deviation and trend;
- short/long EWMA;
- joint model observed deviation, associated component, and residual;
- driver support and counterexamples;
- similar historical periods;
- historical recovery paths;
- scenario branches;
- missingness, limitations, eligibility, and source artifact ids.

Every Quant field is accepted only through a known, validated product contract.
The adapter never computes statistics.

### Candidate actions

Each candidate includes:

- a stable id and materially distinct action kind;
- concise title, description, exact effect, protected item, feasibility, and
  uncertainty presentation keys;
- reversibility;
- explicit outcome horizon and outcome fields;
- referenced evidence and constraints;
- deterministic policy trace;
- a complete proposed plan patch.

The proposal list is capped at three and stably ordered for equal inputs.

### Plan patch and undo

The patch records:

- typed add/update/remove operations;
- affected ScheduleBlock ids;
- exact before and after values;
- unplaced block ids;
- complete before/after snapshots;
- generated, confirmed, and applied timestamps.

Fixed ScheduleBlocks are immutable through this path. Apply fails on a stale
preview conflict. Undo reverses operations against the exact applied state and
records the restored snapshot hash. Repeated undo is safe.

### Follow-up and memory

The follow-up plan records its horizon, due time, required fields, and status.
An outcome may contain only the proposal-defined state, fatigue, task result,
usefulness, carryover, and optional note. Missing required fields are rejected.
Skipping is represented explicitly.

Completed episodes remain Decision Memory through the existing DecisionResult
record. Similar completed episodes may be retrieved by question type, but one
episode never creates or proves a PatternMemory.

## Safety Contract

Safety runs before ordinary proposal ranking:

- `normal`: ordinary deterministic proposals may be generated;
- `needs_clarification`: a material severity question is required;
- `blocked`: the episode abstains, returns a safety-first no-change action, and
  cannot automatically mutate a plan.

Safety output is conservative context, not diagnosis or medical advice.

## Provenance Contract

Episode provenance records:

- origin;
- source ids;
- whether the episode is synthetic-only;
- whether it contains real user data.

Demo episodes use `DEBUG_FIXTURE`, remain in the isolated demo session, and do
not write to owner Store. Owner episodes use existing Store persistence and
retain all source/limitation boundaries.

## Telemetry Contract

Allowed event fields are explicitly serialized:

- event name and timestamp;
- question type;
- context fact count;
- missing question count;
- proposal/operation count;
- elapsed time;
- usefulness enum;
- fixture-only marker.

Unknown fields are dropped. Raw text, notes, source labels, record ids, user ids,
payloads, headers, and environment values are prohibited.
