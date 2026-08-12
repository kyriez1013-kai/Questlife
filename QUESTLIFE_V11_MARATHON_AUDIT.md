# QuestLife V11 Marathon Completion Audit

Date: 2026-08-12
Branch: `design/questlife-product-v2`
Baseline: Stage 3.15 local interpretation workspace

This is an implementation map, not a product redesign. `docs/quant/` remains
outside this pass. Quant Engine calculations, Store, schemas, APIs, persistence,
and production routes remain unchanged.

| Surface | Current state | Concrete completion work |
| --- | --- | --- |
| Global V11 route | PARTIAL | Stage 2 enables V11 Today while Stage 3 enables V11 Quant only. Add one deterministic product-level flag so the complete local V11 route uses both, while no flag remains the legacy rollback. |
| Navigation | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Five destinations work. Align theme selection, safe bottom inset, focus state, and route context under the V11 flag. |
| Onboarding | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Language, positioning, domain, goal, and template flows exist. Replace legacy card styling, hardcoded optional placeholders, web-no-op error alert, and missing accessible mode roles. Add the already-supported skip path without changing data semantics. |
| Cold start | PARTIAL | First goal creation works. Unify no-data, QuestLife-only, passive fixture, and mixed entry copy without fabricating connected sources or Quant conclusions. |
| Today | FUNCTIONALLY COMPLETE | Stage 2 V11 surface, Capture, state, Instant Read, history, and record sheets exist. Enable it on the complete V11 route and regression-check real handlers; do not redesign it. |
| Smart Capture | FUNCTIONALLY COMPLETE | V11 sheet and real parse/confirm path exist. Retest current-input/current-result binding, keyboard, error, cancellation, history, and deletion. |
| Decision | FUNCTIONALLY COMPLETE | `todayCommand` remains authority. Retest details, useful/not-useful persistence, fallback/error, and schedule proposal handoff. |
| Goal list | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Create, open, delete, and Skill Library access exist. Replace isolated oversized cards with a V11 compact hierarchy and mature/empty states. |
| Goal detail | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Goal, criteria, Modules, Skills, recent execution, and attribution exist. Preserve handlers while reducing nested legacy surfaces and clarifying Goal to Module to Skill. |
| Module | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Create, rename, delete, link/unlink Skill work. Make membership and actions compact and accessible. |
| Skill | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Edit, history, progression, relation, and delete exist. Consolidate stacked cards and add the existing Quant deep-link where route context supports it. |
| Schedule | PARTIAL / LEGACY | Day/week/month/year and proposal review exist. Day timeline is legacy; edit/delete handlers are not exposed although Store actions exist. Complete agenda/timeline presentation and existing create/edit/delete/log/proposal loops without changing scheduling semantics. |
| Settings | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Preferences, manual context, AI status, data health, debug gating, backup-related semantics, and legal attribution exist. Apply stable V11 grouping and honest source states. |
| Data Sources | PARTIAL | Manual context is real; external sources are honestly disconnected. Improve connected/available/unavailable presentation only; do not fake HealthKit, QuestFit, or Calendar. |
| Personal Quant | FUNCTIONALLY COMPLETE | Stage 3.15 is the baseline. Preserve Watchlist, chart, Analyst, interpretation, and materialized paths. |
| Custom Range | PARTIAL | Last-N days, calendar, last-N observations, and quick-range preference contracts exist. Finish compact validation and direct chart access. |
| Fit / Zoom Out | PARTIAL | Chart ref implements reset and zoom-out, but common controls are not directly adjacent to Custom. Restore both without resetting instrument, chart type, indicators, or Compare. |
| Shared sheets | FUNCTIONALLY COMPLETE / VISUALLY ROUGH | Today V11 sheet system is mature; legacy Goal/Schedule forms still use the old shell. Consolidate presentation where safe without moving business state. |
| Localization | PARTIAL | Broad zh/en coverage exists. Sweep hardcoded onboarding placeholders, units, control labels, and normal-route debug residue. |
| Dark / light | PARTIAL | Both token sets exist, but Stage 3 debug theme does not consistently reach non-Insights screens. Align flagged-route theme consumption. |
| Responsive / accessibility | PARTIAL | Core Today and Quant have prior local coverage. Recheck 320/375/393/768/1280 across all five routes, forms, sheets, keyboard, focus, and 44px targets. |

## Blocked or explicitly out of scope

- Real Health / HealthKit connection: unavailable and must remain labelled as such.
- Production API/schema integration for Quant fixtures: not part of this UI pass.
- Record Detail editing: no existing handler; do not invent one.
- New Quant models, scores, forecasts, causal claims, or ingestion: prohibited.
- Physical iPhone Safari, Vercel Preview, production, and real-user data: remain
  `UNVERIFIED` in this local-only marathon.

## Implementation order

1. Product-level V11 flag and shared route/theme foundation.
2. Onboarding and cold-start.
3. Today regression closure.
4. Goal / Module / Skill hierarchy.
5. Schedule completion.
6. Settings / Data Sources / Legal.
7. Quant Custom Range + Fit + Zoom Out.
8. Shared sheet, localization, theme, responsive, accessibility, and final QA.
