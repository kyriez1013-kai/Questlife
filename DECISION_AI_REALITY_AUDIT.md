# Decision AI Reality Audit before v1.3

Status: Diagnostic layer added. Production verification required before v1.3 integration.

## Current Visible Behavior

- Normal Today still does not expose the Decision AI Lab.
- Instant Read uses `createDecisionService()`:
  - `questlife_decision_ai_enabled === "true"` routes to `/api/brief`.
  - Otherwise it uses `LegacyDecisionService`.
  - If the AI call fails, Instant Read falls back to the legacy brief.
- In debug mode, Instant Read now labels the visible source as AI, legacy fallback, or AI failed then fallback.

## AI Path Status

- `/api/brief` calls DeepSeek only on the server.
- The endpoint validates compact payload shape and returns normalized Decision Brief JSON.
- The endpoint still never returns API keys, headers, environment values, or `reasoning_content`.
- The endpoint now returns non-sensitive metadata: model and finish reason.
- The client stores only the latest service metadata for debug display.

## Payload Richness Status

The debug Decision AI Lab now reports summarized counts only:

- mode and trigger
- latest state included yes/no
- context count and context categories
- 7-day history row count and execution sample count
- 28-day aggregate availability
- active goal/module/skill counts
- after-state delta count
- schedule block count
- confirmed pattern count
- estimated payload size
- whether there is enough evidence for a personalized judgement

Raw private text is not printed by default in the payload audit.

## Main Missing Data / Weaknesses

- If AI is not enabled in localStorage, the visible output is intentionally the legacy fallback.
- Some users may have sparse context logs, few after-state deltas, or no confirmed patterns.
- Payload includes compact summaries, not full user text, so the model can only personalize from available structured evidence.
- Generic-looking output can still happen when evidence is sparse or when the first step is structurally valid but not tied to a concrete skill/goal.
- Quality evaluation now includes a specificity check, but it remains rule-based.

## Generic Output Diagnosis

Decision AI Lab now includes `genericDiagnosis`:

- whether the headline mentions real data
- whether the first step references a goal/skill
- whether the output uses latest state, context, recent execution, after-state or patterns
- whether the result is only a generic low-friction action
- failed quality checks
- likely causes such as fallback path, sparse payload, missing context/execution/state/patterns, or weak specificity/evidence

## v1.3 Readiness

Do not integrate `daily_brief` into Today as the primary operating judgement until these blockers are fixed or accepted:

- Debug verification confirms whether the visible result is AI or fallback for real user sessions.
- Payload audit shows enough current state/context/execution/pattern evidence for personalization.
- Generic diagnosis no longer flags the common production outputs as fallback-only or evidence-sparse.
- Quality checks reliably fail generic framework-style output before it becomes prominent UI.

## Required Fixes Before v1.3

- Decide whether AI visible path is enabled by default or remains debug/localStorage gated.
- Strengthen payload coverage for after-state deltas, confirmed patterns, and objective context when available.
- Calibrate quality thresholds against real production examples.
- Keep schedule changes proposal-only until a confirm/apply UX exists.
- Keep all Decision AI output cautious: no medical diagnosis, no causality overclaim, no schedule auto-apply.
