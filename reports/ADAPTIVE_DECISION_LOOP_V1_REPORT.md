# Adaptive Daily Decision Loop V1 - Implementation Report

## Scope Delivered

This branch implements the complete bounded loop:

```text
Today entry
-> eligible context assembly
-> 0-2 material questions
-> safety gate
-> up to 3 deterministic proposals
-> evidence / counterexamples / unknowns
-> explicit plan patch preview
-> confirm and apply
-> exact undo
-> due follow-up
-> outcome
-> Decision Memory
```

The accepted Today composition is preserved. The owner entry is a compact
one-tap action and remains behind `adaptive_decision_loop=1`. No flag retains
the previous Today. The review demo is isolated at
`?demo=adaptive-decision-loop` and never reads or mutates owner Store data.

## Git

- App branch: `product/adaptive-decision-loop-v1`
- Base: `2c2349d reconstruct insights presentation`
- Quant branch: `integration/multivariate-driver-v1`
- Quant HEAD: `39f5fbe materialize analysis lifecycle sidecars`
- Production: not modified

App implementation commits before this report:

1. `3ddeb3c` add decision episode contract
2. `548f65d` assemble adaptive decision context
3. `0235d75` map quant evidence into decisions
4. `b8811c9` add explicit decision plan patches
5. `dc0d79c` add deterministic decision policy
6. `f65896e` complete decision follow-up memory loop
7. `c57f2af` add adaptive decision demo scenarios
8. `82457c5` add adaptive decision product flow
9. `6f1d909` prefer relevant decision schedule targets
10. `9be9295` add owner adaptive decision sheet
11. `1254875` connect adaptive decisions to Today
12. `3571509` expose adaptive decision entry on Today
13. `e942084` harden adaptive decision telemetry
14. `d97380a` protect explicit priorities in overloaded decisions
15. `a8dc930` translate adaptive evidence boundaries
16. `bb560f9` localize adaptive decision evidence units

## Product and Data Boundaries

- Decision Episode is versioned as `questlife.decision.episode.v1`.
- It is stored in existing DecisionResult records, not a second store.
- Store remains the owner of real schedule and DecisionResult mutations.
- React does not calculate Quant statistics.
- Fixed schedule blocks cannot be changed by a decision patch.
- Preview does not mutate; apply requires confirmation; undo restores the exact
  pre-decision snapshot and is idempotent.
- Safety-sensitive input abstains without diagnosis or an exercise
  prescription.
- Demo state is deterministic, session-only, resettable, and fixture-labelled.
- Telemetry uses an explicit privacy-safe whitelist and contains no raw text.

## Local Functional Verification

### Owner sparse-data path

- Opened the one-tap `Adjust today` action from accepted Today.
- Selected training/recovery.
- Answered exactly two material questions because current state and target
  flexibility were unavailable.
- Received one honest no-change proposal when no relevant schedule block
  existed.
- Saw missing sleep/recent-execution limitations rather than substituted data.
- Previewed a zero-operation plan, applied it, saw the receipt and real due
  time, undid it, reapplied it, refreshed, and resumed the same receipt without
  duplication.
- Verified no fixture text or fixture evidence entered the owner path.

### Scenario A - Training / Recovery

- Six context facts were assembled with no repeated questions.
- Three materially distinct proposals were produced.
- Evidence showed support, counterexamples, missingness, limitations, and the
  unexplained residual.
- Selected shortening: workout changed from 60 to 30 minutes while the fixed
  commitment remained unchanged.
- Undo restored the exact 60-minute snapshot.
- Follow-up was made due, required outcome fields were recorded, and Decision
  Memory displayed the completed episode.

### Scenario B - Cognitive Adjustment

- The policy targeted the reading/deep-work block rather than the fitness
  block.
- Continue, shorten, and move alternatives remained materially distinct.
- Fixed later commitment stayed protected.

### Scenario C - Overloaded Day

- The explicit high-rigidity priority remained unchanged.
- Capacity release shortened the non-priority 120-minute training block to 60
  minutes.
- The lowest-rigidity block could be moved or left unplaced rather than forcing
  all work into the day.

### Safety

Custom input describing chest symptoms and breathing difficulty entered
`ABSTAINED`, showed the safety boundary, made no diagnosis, offered no ordinary
training prescription, and produced no schedule mutation.

### Rollback and presentation

- Removing the feature flag restored the legacy Today with no adaptive entry.
- Owner path was checked in Chinese/dark and English/light.
- Demo screenshots A-J were captured at 390 x 844.
- Desktop English/light was captured at 1280 x 900.
- No owner data or Supabase write was used for demo verification.

## Product Leverage - Fixture Only

Training fixture report:

- Context items auto-assembled: 6
- Questions avoided: 5
- Questions asked: 0
- Recorded user taps: 6
- Plan operations applied: 1
- Follow-up completed: yes
- Outcome available: yes
- Session telemetry events: 10
- Engine proposal generation: 10.40 ms
- Plan apply: 0.20 ms
- Follow-up transition: 0.00 ms

These are deterministic fixture measurements, not claims about real-user time
savings.

Observed local browser interaction wall times at 390 px, including the product's
320 ms transition cadence and browser roundtrip:

- entry open: 364 ms
- context/evidence/proposals: 294 ms
- plan preview: 295 ms
- apply: 288 ms
- undo: 301 ms
- follow-up load: 313 ms
- outcome to Decision Memory: 299 ms

## Tests

### App targeted suite

`npm run test:adaptive-decision` covers:

- valid and invalid state transitions;
- context completeness, missingness, provenance, deletion, fixture exclusion,
  and future leakage;
- Quant contract mapping and research firewall;
- proposed/apply/undo patch semantics;
- safety gate and deterministic proposal ordering;
- follow-up and Decision Memory;
- telemetry privacy;
- full deterministic E2E scenarios A, B, and C.

Status: passed locally before report finalization.

### Quant

- Targeted product/analysis/ledger/real-data set: 73 passed.
- Full suite: 761 passed in 204.388 seconds.

### Final App gates

- `npm run test:adaptive-decision`: passed all eight targeted suites.
- `npx tsc --noEmit`: passed with zero errors.
- `npm run build`: passed; Expo exported `dist`.
- Main Web bundle: `index-d2e58195c4da03928f32c6960f035808.js`.

## Review Evidence

- [A - Today decision entry](./adaptive-decision-loop-v1/screenshots/A-today-decision-entry.png)
- [B - Context assembled](./adaptive-decision-loop-v1/screenshots/B-context-assembled.png)
- [C - Training proposals](./adaptive-decision-loop-v1/screenshots/C-training-proposals.png)
- [D - Evidence and unknowns](./adaptive-decision-loop-v1/screenshots/D-evidence-unknowns.png)
- [E - Plan patch preview](./adaptive-decision-loop-v1/screenshots/E-plan-patch-preview.png)
- [F - Decision receipt](./adaptive-decision-loop-v1/screenshots/F-decision-receipt.png)
- [G - Follow-up](./adaptive-decision-loop-v1/screenshots/G-follow-up.png)
- [H - Decision Memory](./adaptive-decision-loop-v1/screenshots/H-decision-memory.png)
- [I - Reading/deep-work](./adaptive-decision-loop-v1/screenshots/I-reading-deep-work.png)
- [J - Overloaded day](./adaptive-decision-loop-v1/screenshots/J-overloaded-day.png)
- [K - Desktop English/light](./adaptive-decision-loop-v1/screenshots/K-desktop-english-light.png)

## Preview Verification

Verified on the isolated Vercel Preview; Production was not promoted.

- Deployment: `dpl_2i4xv8o4peVHgmx4G7oW2a8PziB1`
- Preview URL:
  `https://questlife-alpha-91nj5bxx8-kyrie-z-s-projects.vercel.app`
- Preview Web bundle: `index-a842cf72603a0339d24fcb879f619d52.js`

### Scenario A - live Preview clicks

1. Opened the training fixture at 390 x 844.
2. Clicked `Assemble context`; the page entered `PROPOSED`, used six known
   facts, and rendered three materially distinct actions.
3. Expanded evidence; direct fact, personal comparison, joint observational
   evidence, unexplained residual, unknowns, and non-causal limitations were
   visible.
4. Selected the shorter-training action. The preview showed 60 to 30 minutes
   while the current plan remained at 60 before confirmation.
5. Clicked confirm/apply. The receipt appeared and only the intended workout
   changed to 30 minutes; the fixed commitment remained unchanged.
6. Clicked exact undo. Status returned to `PROPOSED` and the workout returned
   to 60 minutes.
7. Reapplied, opened the due follow-up, recorded all required outcome fields,
   and reached `OUTCOME_RECORDED` with Decision Memory.
8. Refreshed. The same outcome, Decision Memory, and session plan snapshot
   remained present without duplication.

### Scenario B - live Preview clicks

The cognitive flow entered `PROPOSED` and targeted `Read research article`,
offering continue, 60 to 30 minute shorten, and move-to-tomorrow actions. It did
not target the training block and retained the fixed meeting.

### Scenario C - live Preview clicks

The overloaded flow asked one material priority question. After selecting
`Protect the first item`, it produced three actions: shorten the non-priority
120-minute training block to 60, move the low-rigidity admin block, or leave the
admin block explicitly unplaced. The SQL priority and both fixed commitments
remained protected.

### Safety and isolation

The synthetic custom question containing chest symptoms and breathing
difficulty entered `ABSTAINED`, displayed a safety boundary, showed no ordinary
apply control, made no diagnosis, and left the 60-minute plan unchanged.

The no-flag root route contained no demo fixture and no adaptive-decision
entry. On the fresh Preview origin it correctly opened the existing onboarding
screen. This confirms route isolation without creating QA data in an owner
namespace.

### Responsive and runtime checks

- 390 x 844: document and body width both 390; no horizontal overflow.
- 1280 x 900 English/light: document and body width both 1280; no horizontal
  overflow.
- Browser console: no runtime errors. The only warning was the pre-existing
  Expo Notifications message that push-token listeners have no effect on web.
- Physical iPhone Safari: `UNVERIFIED` for this Preview; no device was attached
  during this run.

## Remaining Concrete Gap

The owner App path currently has no runtime provider for materialized owner
Quant product/analysis artifacts. The adapter and Quant contracts are complete,
but owner mode deliberately reports those evidence layers as unavailable rather
than injecting demo evidence or recalculating statistics in React. Day 1
constraint assembly, proposal choice, plan apply/undo, follow-up, and memory
remain available.
