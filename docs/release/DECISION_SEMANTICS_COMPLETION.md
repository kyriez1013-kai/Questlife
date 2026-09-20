# Decision Semantics Completion

Date: 2026-09-20. Canonical checkout: `QuestLife-v1`, branch
`release/questlife-v1`. Bounded implementation of end-to-end spec section 14.
No commit, push, deployment, owner observation, Store/API/schema change, or
notification-planner edit was made by this work slice. Existing parallel changes
to context freshness, domain-specific training minutes and duration wording were
preserved.

## Implemented

### Execution-anchored follow-up

- An owner Apply no longer creates a follow-up clock. The plan adjustment is a
  software action, not an observed behavior. The isolated demo retains its
  explicit simulated follow-up clock and fixture provenance.
- `decisionExecutionAnchor(episode, executionLogs, now)` requires the exact
  `ExecutionLog.linkedScheduleBlockId` and date of each affected surviving block.
  No-change actions require an explicit `question.targetId`. Removal-only plans
  do not imply a performed replacement behavior.
- Required execution fields: owner-observed/owner-confirmed provenance, user
  confirmation, explicit offset-bearing `eventStartAt` and `eventEndAt`, known
  `recordedAt` and `availableAt`, not deleted, available by the evaluation time.
  `updatedAt`, when present, must also be available by that time. Start must be
  at/after the actual Apply instant; end must follow start and precede recording.
  Created time and duration never substitute for unknown actual endpoints.
- Each target needs exactly one qualifying execution. Several matching logs are
  ambiguous without an existing decision-specific link; the helper returns no
  anchor. Multiple changed blocks must all have execution; the latest actual end
  anchors their shared horizon.
- `markDecisionFollowUpDue(episode, now, executionLogs)` recomputes the pending/due
  plan from those endpoints. Deleted, corrected, ambiguous, unknown or future
  execution invalidates old Apply-timed due states. There is no migration or
  invented placeholder `dueAt`.
- Two hours means two elapsed hours after execution end. End-of-day and next
  morning use the episode's named timezone, including overnight DST changes.
  The existing late-night end-of-day fallback remains two hours after execution.
- `recordDecisionOutcome` and `skipDecisionFollowUp` revalidate at submission.
  Repeated outcome submission cannot create a second outcome. Confirmed execution
  IDs are preserved in the existing episode provenance `sourceIds` array.
- Both owner sheets pass current execution records on open/save/skip/undo. Today
  passes `data.executionLogs` to `dueOwnerDecisionEpisode`; its only edited line
  in this slice is that argument. The parent's quick-capture line is untouched.
- The due selector scans owner episodes instead of letting a newer draft hide
  an older real due follow-up. It does not write anything during render.

### Separate outcome semantics and bounded history matching

- State, fatigue, task result, usefulness and carryover remain their existing
  independent persisted fields. State/fatigue accept the existing integer 1-5
  input scale; enum values are validated. No aggregate success flag is produced.
- Historical evidence no longer ORs completion and helpfulness into support, or
  not-completed and not-helpful into a counterexample total. Dimension-specific
  counts remain separate; raw state/fatigue readings are not converted to an
  inferred improvement or deterioration.
- Matches require the same subject boundary, question type, actual chosen action
  kind/variant, skill identity (or exact block when no skill exists), goal links,
  task type, before/after duration, relative move-day offset, outcome fields and
  horizon. Same question type alone is insufficient.
- Owner historical outcomes additionally need linked real execution and a
  recorded outcome at/after its actual horizon and before the current as-of time.
  Future edits, future feedback, deleted executions, fixture provenance, missing
  linkage and mismatched outcome contracts do not become personal evidence.
- Evidence is attached only to matching candidate actions. It is added after
  deterministic proposal generation, so this history cannot falsely be credited
  with selecting or re-ranking a rule-derived proposal. A paired test proves the
  proposals and exact patches are unchanged with/without that history.
- Limits explicitly retain observational/non-causal semantics and distinguish
  action matching from equivalence of every life circumstance. No new similarity
  score, statistical cutoff, model update or learning claim was added.

### Atomic schedule feasibility and Undo

- `applyDecisionPlanPatch` and `undoDecisionPlanPatch` now validate the final
  transaction's actually changed placements against the complete passed schedule,
  including tomorrow and other affected days. Store already calls these helpers
  with its complete schedule; no Store modification was required.
- Conflicts between two operations, a newly inserted booking after preview, and
  an original slot occupied before Undo all fail before the caller receives a
  mutated schedule. Atomic swaps validate the final state, not intermediate slots.
- Touching endpoints are allowed; skipped blocks do not occupy time. Invalid or
  unresolved cross-midnight clocks are rejected, not silently moved.
- Existing exact-snapshot checks still protect concurrent changes and completion.
  Idempotent Apply/Undo retries and unrelated existing overlaps remain untouched.
- Owner Undo additionally rejects started/expired placements and linked execution.
  It only reverses future software planning, never behavior or physiological
  outcomes. Already-restored no-op Undo and repeated Apply preserve their original
  semantics and application timestamp.
- Candidate feasibility uses this same transaction validator rather than a
  separate preview-only per-operation check.

### Safety

Excluded context sources cannot contribute stale or fixture symptom text to the
current safety gate. Current eligible symptoms and explicit symptom wording still
block ordinary optimization. Existing thresholds and messages were not changed.

## Validation

- `npx tsc --noEmit`: PASS on the shared checkout.
- Full adaptive suite with `--strict` added to its compilation invocation:
  PASS, all 13 existing scripts plus 38 named follow-up cases imported by the
  owner integration script. Additional assertions cover action/target/horizon
  mismatch, independent outcome dimensions, future-data exclusion, exact Apply,
  Undo, next-day collision, swaps, idempotency and safety eligibility.
- The normal `npm run test:adaptive-decision` was executed, but the final run
  is BLOCKED by a concurrent, out-of-scope non-strict type-inference error:
  `src/sync-v2/pushRegistry.ts:34`, TS2322, inferred optional `binding` versus
  required `PushJournal.binding`. No source workaround was made here. The strict
  invocation uses the identical test list and passes. Parent must resolve/rerun
  the standard command before the final candidate gate.
- `git diff --check` for the owned changes: PASS.
- No owner observations, remote data, permanent fixture data or schedules were
  written for these tests. Fixtures exist only in pure-function test processes.
- Browser/native end-to-end follow-up interaction and physical-device behavior:
  UNVERIFIED in this bounded slice; parent owns complete release UI/device QA.

Reproduce the strict equivalent without changing package.json:

```sh
node -e "const {execSync}=require('node:child_process'); const p=require('./package.json'); execSync(p.scripts['test:adaptive-decision'].replace('tsc --module', 'tsc --strict --module'), {stdio:'inherit',shell:'/bin/zsh',env:{...process.env,PATH:process.cwd()+'/node_modules/.bin:'+process.env.PATH}});"
```

## Parent Integration Requirement: Notifications

The separately owned `src/platform/notifications/planner.ts` still reads stored
`episode.followUpPlan` directly. It must not schedule a legacy Apply-timed plan,
nor miss a newly observed execution because the owner has not reopened the sheet.
At scheduling and notification-target validation, use the pure result of:

```ts
markDecisionFollowUpDue(episode, now.toISOString(), data.executionLogs)
```

Only a revalidated owner pending/due plan is actionable. An undefined plan is
waiting for a known real execution endpoint; it is not permission to substitute
Apply time. This integration needs no new schema or persistence field. Existing
notification reconciliation must cancel previously scheduled invalid plans.
This file is outside the explicitly exclusive decision scope and was not edited.

## Deliberate Limits

- Older records lacking exact real endpoints, an exact schedule link, or having
  several possible executions do not receive a behavioral-effect follow-up.
  Nothing guesses which record was intended.
- Raw state/fatigue answers are preserved independently. No causal state change
  or fatigue-worsening claim is derived from unlike instruments or missing baselines.
- A schedule-independent recovery choice or a removed task has no observed
  replacement execution in the present contract. No effect endpoint is invented.
- The patch validator does not add a scheduling optimizer or change fixed-block,
  Store, API, persistence, Quant or entity contracts.

## Owned Files

- `src/adaptive-decision/followUp.ts`
- `src/adaptive-decision/followUp.test.ts`
- `src/adaptive-decision/decisionEngine.ts`
- `src/adaptive-decision/decisionEngine.test.ts`
- `src/adaptive-decision/planPatch.ts`
- `src/adaptive-decision/planPatch.test.ts`
- `src/adaptive-decision/safetyGate.ts`
- `src/adaptive-decision/ownerDecisionFlow.ts`
- `src/adaptive-decision/ownerDecisionFlow.test.ts`
- `src/adaptive-decision/ownerDecisionIntegration.test.ts`
- `src/adaptive-decision/QuestLifeCoreOwnerSheet.tsx` (existing call-site arguments)
- `src/adaptive-decision/AdaptiveDecisionLoopOwnerSheet.tsx` (existing call-site arguments)
- `src/screens/HomeScreen.tsx` (one due-selector argument)
- This report.
