# QuestLife Product Surface Inventory

Audit scope: current production-facing presentation layer and every secondary surface reachable from it. Data semantics, store actions, API contracts, Decision AI, memories, schedule proposals, and persisted schemas remain protected.

## Navigation map

| Route / surface | Current component | Purpose and unique actions | Primary data source | Current priority | New classification | Primary navigation | Drill-down | Duplicate / overlap note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Today | `src/screens/HomeScreen.tsx` | Capture, current command, state update, plan, records, Decision Brief feedback, rescue | `useStore`, `/api/brief`, capture helpers | Primary but overloaded | Primary | Yes | Brief, context and detailed evidence move out | Brief, context, state, plan and records currently compete in one feed |
| Smart Capture composer | `src/screens/HomeSmartCapture.tsx` | Enter text, parse, review history, retry | `/api/parse`, raw captures | Primary | Primary | Inside Today | Review opens inline | Helper copy and nested shells duplicate the composer purpose |
| Smart Capture review | `src/screens/HomeCapturePending.tsx` | Complete missing fields, select routing, save structured logs, custom actions | raw capture, goals, modules, skills | Primary workflow | Detail | No | Inline/detail review | Must remain reachable; not a dashboard card |
| Daily Decision Brief summary | `src/screens/HomeScreen.tsx` | Read current recommendation, refresh, useful/not useful | `/api/brief`, decision payload | Over-prominent | Primary summary | Inside Today | Yes | Full evidence document duplicates Today command/context |
| Daily Decision Brief detail | `src/screens/HomeScreen.tsx` | Full rationale, evidence, confidence, schedule proposal review/apply/undo | Decision brief, schedule blocks | Mixed into primary feed | Detail | No | Yes | Should not occupy first viewport |
| Current action / Today command | `src/screens/HomeScreen.tsx` | Start, log, continue active session, rescue | today command, schedule, skills | Primary | Primary | Inside Today | Action flow | Duplicated by plan and brief recommendations |
| Current state | `src/screens/HomeScreen.tsx` | Quick state update, detailed state check-in, Instant Read | state check-ins | Primary but oversized | Secondary | Inside Today | State sheet | Explanatory content duplicates status |
| Today plan | `src/screens/HomeScreen.tsx` | Start/log/done skills and schedule items | skills, modules, goals, schedule blocks | Primary | Primary | Inside Today | Skill/schedule detail | Some rows repeat current action |
| Today records | `src/screens/HomeScreen.tsx` | Inspect feedback, contributions and delete a record | execution logs, effort units, contribution links | Secondary | Secondary | Inside Today | Record/feedback detail | Recent feedback appears elsewhere |
| Rescue | `src/screens/HomeScreen.tsx` | Minimum-start flow | rescue logs, state | Secondary | Secondary | Inside Today | Rescue modal | Keep compact; no hero treatment |
| Objective Context input | `src/screens/HomeScreen.tsx` | Paste, parse, preview and save sleep/body/context text | context logs, context parser | Background shown as primary | Background | Move to Settings | Data Sources detail | Body brief duplicates Daily Brief evidence |
| Body / cognition summary | `src/screens/HomeScreen.tsx` | View interpreted context evidence | context logs, objective brief | Background shown as primary | Detail | No | Brief/Recovery detail | Duplicates Insights context evidence |
| State check-in sheet | `src/screens/HomeScreen.tsx` + `BottomSheetForm` | Before/after state, energy, stress, confidence and note | state check-ins | Detail | Detail | No | Sheet | Unique action; retain |
| Record progress sheet | `src/screens/HomeScreen.tsx` + `BottomSheetForm` | Quick/advanced metric-aware logging | skills, templates, execution log action | Detail | Detail | No | Sheet | Unique action; retain |
| Rescue modal | `src/screens/HomeScreen.tsx` | Choose and complete minimum action | rescue logs | Detail | Detail | No | Modal | Unique action; retain |
| Goals list | `src/screens/GoalTreeScreen.tsx` | Create/open/delete goals, enter Skill Library | categories, skills | Primary but sparse | Primary | Yes | Goal Detail | Large title/actions consume most of first viewport |
| Goal create/edit | `src/components/GoalForm.tsx` | Create/edit goal and apply template setup | goals, domain templates | Detail | Detail | No | Sheet | Unique action; retain |
| Goal Detail | `src/screens/GoalDetailScreen.tsx` | Edit goal, criteria, modules, skills, recent execution, impact | goals, modules, skills, logs, effort links | Detail and overloaded | Detail | No | Stack screen | Recent execution and effort impact partly duplicate |
| Module create/edit | `src/screens/GoalDetailScreen.tsx` + `BottomSheetForm` | Add/edit module | modules | Detail | Detail | No | Sheet | Unique action; retain |
| Skill linking | `src/screens/GoalDetailScreen.tsx` | Add existing skill, create new skill, unlink from module | module-skill links, skills | Detail | Detail | No | Sheet/row actions | Unique relationship actions |
| Skill Library | `src/screens/SkillLibraryScreen.tsx` | Create/edit/delete global skills, inspect links | skills, module-skill links | Secondary | Secondary | Goal stack | Skill Detail | Large title duplicates navigation context |
| Skill create/edit | `src/components/SkillForm.tsx` | Configure metric/task/progress/template fields | skills, templates | Detail | Detail | No | Sheet | Unique action; retain |
| Skill Detail | `src/screens/SkillDetailScreen.tsx` | Summary, placement, comparable progress, logs, milestones, delete | skills, logs, effort units, links | Detail and report-heavy | Detail | No | Stack screen | Several analytics cards overlap Insights |
| Schedule | `src/screens/ScheduleScreen.tsx` | Navigate dates/views, add blocks, log progress | schedule blocks, generated blocks, skills | Primary but calendar-heavy | Primary | Yes | Block sheet | Current/next card duplicates Today current action |
| Schedule add/edit sheet | `src/screens/ScheduleScreen.tsx` | Create/update a block | schedule blocks | Detail | Detail | No | Sheet | Unique action; retain |
| Schedule log sheet | `src/screens/ScheduleScreen.tsx` | Record actual work and complete linked block | execution logs, schedule blocks | Detail | Detail | No | Sheet | Must share save chain |
| Schedule proposal review | `src/screens/HomeScreen.tsx` | Review, apply and undo move/shorten/protect proposals | Decision Brief, schedule blocks | Detail | Detail | No | Brief detail | Must remain explicit and never auto-apply |
| Insights | `src/screens/StatsScreen.tsx` | Main judgement, evidence, trends, patterns, allocations, advanced analysis | live execution logs, state, context, memories | Primary and severely overloaded | Primary | Yes | Internal Overview/Trends/Patterns/Advanced layers | Many panels repeat insufficient-data states |
| Insights main judgement | `src/screens/StatsScreen.tsx` | Strongest current interpretation | meta-cognition, live logs, context | Primary | Primary | Insights Overview | Evidence detail | Retain as first item |
| Key evidence | `src/screens/StatsScreen.tsx` | State, context, recent execution evidence | state/context/logs | Primary | Secondary | Insights Overview | Evidence detail | Body/context also appears on Today |
| Trends and allocations | `src/screens/StatsScreen.tsx`, `StatsScreenInsights.tsx` | State/execution/task/metric/history comparisons | live logs, actions, state | Mixed | Secondary | Insights Trends | Focused detail | Too many visuals currently share one page |
| Pattern Memory | `src/screens/StatsScreen.tsx`, `src/screens/SettingsScreen.tsx` | View accepted/candidate patterns, accept/reject/archive | pattern memories | Mixed | Secondary / Advanced | Insights Patterns | Pattern detail/actions | Debug and user-facing states are mixed |
| Ability Map | `src/screens/StatsScreenInsights.tsx` | Multi-dimension evidence view | derived metrics | Over-prominent with weak/default evidence | Advanced | Insights Advanced | Metric detail | Default reference values must not present as measured ability |
| Advanced / experimental analysis | `src/screens/StatsScreen.tsx`, `StatsScreenInsights.tsx` | Prediction, growth, monthly, anomaly, signal grid | derived analytics | Competes with primary | Advanced | Insights Advanced | Focused detail | Repeated low-confidence and insufficient-data output |
| Settings | `src/screens/SettingsScreen.tsx` | Language, themes, AI/debug, onboarding, import/export/reset | settings, local app data | Primary but technical | Primary | Yes | Grouped subsections | Giant title and debug density obscure normal preferences |
| Data Sources | Existing context controls in `HomeScreen`; destination in `SettingsScreen` | Manual Objective Context input, source status and future integrations | context logs | Missing destination | Background | Settings group | Inline detail | Move existing controls only; no fake integration |
| Decision / Pattern debug | `src/screens/SettingsScreen.tsx` | Inspect payload quality, memories and diagnostics | decision/pattern memory, flags | Background | Background | Settings debug group | Expandable detail | Must not dominate normal settings |
| Data integrity / import / export / reset | `src/screens/SettingsScreen.tsx` | Validate, repair, rebuild derived data, import/export/reset | full app data | Background | Background | Settings data management | Destructive actions retain web confirmation |
| Onboarding | `src/screens/OnboardingScreen.tsx` | Language, positioning, template selection, first system | settings, templates, goal actions | First-use primary | Primary for new users only | Conditional root | Multi-step | Welcome card must disappear from Today after setup |
| Bottom sheet shell | `src/components/BottomSheetForm.tsx` | Shared modal form layout and sticky footer | UI state | Detail infrastructure | Detail | No | N/A | Must receive consistent mobile safe area |
| Dashboard editing components | `src/components/dashboard/*`, `DashboardLayoutControls.tsx` | Legacy configurable card layout | dashboard preferences | Hidden/frozen product experiment | Retire from primary | No | Debug/future only | Conflicts with the deliberate fixed IA |

## Primary product surfaces after reset

- Today: compact context, Smart Capture, current action, state summary, plan/recent activity.
- Goals: compact goal working list with Skill Library and add actions.
- Schedule: date navigation and grouped plan rows.
- Insights: internal Overview, Trends, Patterns and Advanced layers.
- Settings: preference, data source, AI/decision, data management, debug and about groups.

## Retired from primary rendering

- Giant standalone page-title hero blocks.
- Persistent onboarding success cards after real use begins.
- Full Daily Brief evidence document on Today.
- Objective Context import and body/source diagnostics on Today.
- Default/reference-only Ability Map on Insights Overview.
- Dashboard layout editing controls on normal product surfaces.
- Duplicate recent records, repeated helper copy and repeated insufficient-data cards without a unique action.

No retired surface implies deleting its stored data or business logic.

## Reset implementation status

- Primary tab navigation now uses an explicit focused web surface; inactive RN-Web tab trees cannot overlay the active screen.
- Today, Goals and Schedule use compact context bars and working rows.
- Insights is split into Overview, Trends, Patterns and Advanced.
- Settings owns the existing manual Objective Context input under Data Sources.
- Goal Detail, Skill Library and Skill Detail use the compact detail scale.
- Full Decision Brief evidence, body/source context, Ability Map and technical diagnostics no longer compete in the primary Today/Insights feed.
- Eight module families moved to detail/background presentation; eight redundant/default primary surfaces were retired from rendering.
