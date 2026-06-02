# QuestLife Project Status

Updated: 2026-05-25

## Current Version State

QuestLife now has the execution differentiation loop connected across:

Goal -> Module -> Skill Library -> Metric -> Schedule -> Today -> ExecutionLog -> Skill Progress -> Insights.

This pass intentionally did not add AI, onboarding, forecasting, auto-rescheduling, commerce, bottom-navigation changes, or Brain-Off Rescue Mode.

## Git / Commit Note

This repository currently has no initial commit on `main`, and the whole project is already staged/untracked as a baseline. To avoid mixing a full initial project snapshot into each feature commit, this file records each Part completion status instead of creating misleading partial commits.

## Completed Parts

### Part 0 - ExecutionLog schema cleanup

Status: Completed

Core files:
- `src/types.ts`
- `src/progress.ts`
- `src/storage.ts`
- `src/store.tsx`

Changes:
- Added `predictedDurationMinutes`, `predictedQualityRating`, predicted physical/emotional cost fields, and `predictionDelta`.
- Extended `source` with `timer` and `one_tap`.
- Added `calculatePredictionDelta`.
- Added fallback migration for old prediction-duration data that may have been stored in `predictedMentalCost`.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

### Part 7 - Data flow connection

Status: Completed

Core files:
- `src/store.tsx`
- `src/progress.ts`

Changes:
- `createExecutionLog` now normalizes log links, computes prediction delta, applies skill progress, marks schedule blocks completed, and recomputes touched module progress.
- `applyExecutionLogToSkillProgress` handles time, target value, frequency, checklist, performance, quality, state, money, binary, qualitative, and none.
- Duplicate apply is prevented via `appliedToProgress`.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

### Part 4 - Session timer and one-tap completion

Status: Completed

Core files:
- `src/screens/HomeScreen.tsx`
- `src/i18n.ts`

Changes:
- Added single active timer stored under `questlife_active_session`.
- Added timer bar in Today.
- Added `[▶]` timer and `[✓]` one-tap actions to Today schedule/skill rows.
- One-tap creates an ExecutionLog with default metric update and goes through `createExecutionLog`.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

### Part 1 - Prediction vs reality tracking

Status: Completed

Core files:
- `src/screens/HomeScreen.tsx`
- `src/progress.ts`
- `src/i18n.ts`

Changes:
- Log Progress modal now captures predicted duration and predicted quality.
- Saved logs include `predictionDelta`.
- After saving, the user sees prediction comparison feedback.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

### Part 2 - Self-knowledge accuracy insight

Status: Completed

Core files:
- `src/screens/StatsScreen.tsx`
- `src/i18n.ts`

Changes:
- Insights now computes duration and quality prediction error from logs with prediction fields.
- Shows placeholder until at least 3 prediction logs exist.
- Shows simple 8-week textual trend bars.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

### Part 6 - Instant insights cards

Status: Completed

Core files:
- `src/screens/StatsScreen.tsx`
- `src/i18n.ts`

Changes:
- Added Weekly Overview, Most Focused Skill, and Today Completion cards.
- Added first-insight progress encouragement bar.
- Cards render even with little/no data.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

### Part 5 - Today execution budget

Status: Completed

Core files:
- `src/screens/HomeScreen.tsx`
- `src/i18n.ts`

Changes:
- Added Today Execution Budget card.
- Uses a v1 default daily execution budget of 240 minutes.
- Shows allocated/remaining, per-skill/block estimates, completed state, and overage.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

### Part 3 - Metric-aware compound curve

Status: Completed

Core files:
- `src/screens/SkillDetailScreen.tsx`
- `src/i18n.ts`

Changes:
- Added metric-aware compound curve section to Skill Detail.
- Uses metric-specific values from ExecutionLogs instead of forcing all skills into time.
- Shows safe fallback when data is insufficient.

Validation:
- `npx tsc --noEmit`: passed after full implementation.
- `npm run build`: final validation pending below.

## Final Validation

- `npm run build`: passed. The sandbox blocked writing `dist/index.html` on the first run, then the approved build completed successfully.
- `npx tsc --noEmit`: passed.

## Known Issues

- Per-Part commits were not created because the repository has no initial commit and the entire app baseline is staged/untracked.
- Timer cancel currently keeps the active session, matching the v1 requirement to avoid losing data.
- Generated schedule blocks are projections; only persisted schedule blocks can be permanently marked completed in storage.
- Compound curve is v1 and uses available ExecutionLog values; old logs without metric data fall back safely.

## Suggested Next Steps

- Create an initial baseline git commit so future feature work can be committed per Part cleanly.
- Add a dedicated reusable ExecutionLogForm component to share Today and Schedule logging behavior.
- Add Brain-Off Rescue Mode as a separate feature later, as requested.

## Anonymous Analytics

Status: Completed

Core files:
- `supabase/analytics_events.sql`
- `api/track.ts`
- `src/utils/analytics.ts`
- `src/store.tsx`
- `App.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/StatsScreen.tsx`
- `docs/analytics_events.md`

Tracked events:
- `app_opened`
- `goal_created`
- `module_created`
- `skill_created`
- `skill_linked_to_module`
- `schedule_block_created`
- `timer_started`
- `timer_finished`
- `one_tap_completed`
- `execution_log_saved`
- `prediction_saved`
- `insights_opened`

Required environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Privacy and data minimization:
- Anonymous user id is generated locally and stored under `questlife_anonymous_user_id`.
- Session id is stored under `questlife_session_id`.
- Event properties are sanitized on both client and server.
- User-created goal names, skill names, module names, notes, visions, descriptions, and long-form text are not intentionally uploaded.
- Missing Supabase env returns a safe API error and does not crash the app.

Validation:
- `npm run build`: passed. The sandbox blocked writing `dist/index.html` on the first run, then the approved build completed successfully.
- `npx tsc --noEmit`: passed.

## Brain-Off Rescue Mode v1

Status: Completed

Core files:
- `src/types.ts`
- `src/storage.ts`
- `src/store.tsx`
- `src/i18n.ts`
- `src/screens/HomeScreen.tsx`
- `src/screens/StatsScreen.tsx`

New data structure:
- `RescueLog` lives in `AppData.rescueLogs`.
- Rescue logs are separate from `ExecutionLog`.
- Rescue logs do not update skill progress and do not mark schedule blocks completed.

Store actions:
- `createRescueLog`
- `updateRescueLog`
- `completeRescueStep`
- `completeActivationStep`
- `getRescueLogsByDate`
- `getRescueLogsThisWeek`
- `getActiveUnfinishedRescue`

Today entry:
- Added a visible `启动不了 / Can't Start` entry below Current State.
- Shows `今日最低启动 / Minimum Starts Today`.
- If a rescue is unfinished, tapping the card continues the flow.

Rescue Flow:
- Step 1: Stop analyzing.
- Step 2: 30-second body action.
- Step 3: 2-minute minimum activation action.
- Step 4: completion feedback.

Insights:
- Added a lightweight Rescue Starts section with weekly rescue count, completion rate, latest rescue time, and simple placeholder guidance.

Analytics events:
- `cant_start_clicked`
- `rescue_started`
- `rescue_body_action_completed`
- `rescue_activation_completed`
- `rescue_completed`

Known limitations:
- v1 does not use AI.
- v1 does not predict shutdown patterns.
- v1 does not update skill progress.
- v1 does not automatically complete schedule blocks.
- v1 only provides the minimum activation rescue loop.

Validation:
- `npx tsc --noEmit`: passed.

## End-to-End Product Flow Stabilisation v1

Status: Core data flow stabilised

Core flow integrity:
- Added `src/utils/coreFlow.ts`.
- `validateAppDataIntegrity(appData)` checks orphan module links, orphan logs, orphan effort units, orphan contribution links, missing progress models, invalid schedule links, and duplicate-risk template entities.
- `repairAppDataIntegrity(appData)` safely fills missing arrays/defaults and removes only clearly invalid derived/link data. It does not delete goals, modules, skills, execution logs, or user text.
- Store load now validates persisted data and applies safe repair once on startup when needed.

Domain template application:
- `applyDomainTemplateToGoal(goalId, templateId)` now returns created module ids, skill ids, link ids, and skipped existing entities.
- Template application remains supplement-only for existing goals: same-name modules/skills are skipped rather than duplicated or overwritten.
- Added `template_structure_applied` analytics with domain, created modules, created skills, and skipped counts.

Execution log chain:
- `createExecutionLog` now accepts standard aliases (`skillId`, `goalId`, `moduleId`, `scheduleBlockId`) and normalizes them to linked ids.
- If only a schedule block or skill is provided, the store attempts to infer the linked skill, goal, and module.
- All saved logs continue through the same chain: save ExecutionLog, derive EffortUnits, derive ContributionLinks, update skill/module/goal progress through existing logic, complete linked schedule blocks, and send safe analytics.
- Added `core_flow_log_created` analytics with source, linked-entity booleans, structured-data presence, effort-unit count, and contribution-link count.

Feedback surfaces:
- Goal Detail now includes `Efforts driving this goal`, showing weekly effort count, direct/indirect counts, and recent attributed efforts.
- Skill Detail now includes `Comparable Progress`, showing latest comparable effort, previous effort, and simple changes when history exists.
- Today logs now show a compact `Contributes to` hint with up to three linked skill/module/goal names when contribution links exist.

Schedule vs actual:
- Schedule Log Progress now saves with source `schedule_log`.
- Schedule blocks remain plans; the execution log remains the actual record and marks the linked block complete through the existing createExecutionLog chain.

Dev integrity panel:
- Settings now includes a dev-only Data Integrity panel.
- It shows goal/module/skill/log/effort/contribution counts.
- Actions: run integrity check, repair safe issues, and rebuild derived effort/contribution data from existing execution logs.
- Rebuild does not delete goals, modules, skills, or execution logs.

i18n:
- Added Chinese/English strings for core flow integrity, derived-data rebuild, goal efforts, comparable progress, contribution hints, schedule/actual terms, and skill unlink/delete semantics.

Known limitations:
- No LLM setup yet.
- No HealthKit / Apple Watch integration yet.
- No full workout planner yet.
- No cloud sync for full user data.
- Template rules remain v1 and rule-based.
- Derived rebuild is dev-only and must be triggered manually.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after escalated rerun so Expo could update existing `dist` files.

## Mobile Logging UX + Prediction Flow Refinement

Status: Implemented focused mobile logging refinements

Mobile readability:
- Added design token support for `surfaceMuted`, `disabledBg`, and `disabledText`.
- Updated `QuestButton` so disabled buttons use explicit readable colors instead of low opacity.
- Record-progress rating chips, schema chips, and modal sections now use active Quest theme surfaces and text colors instead of relying on legacy light styles.

Record Progress modal:
- `BottomSheetForm` now caps sheet height at 85% and supports a sticky footer.
- The record-progress save/cancel actions now live in the sticky footer so they stay above the mobile browser bottom area.
- Content scrolls independently with a smaller bottom padding when a sticky footer is present.
- Save disabled state now shows a readable reason when a skill is required.

Prediction flow:
- Prediction is optional and collapsed by default for direct logging.
- Timer-based non-strength logs can still open with lightweight session prediction.
- Strength/fitness no longer forces detailed weight / sets / reps prediction.
- Detailed strength prediction only appears after the user expands it.
- Prediction comparison only appears when a prediction was actually recorded.

Logging flow:
- Actual record is now the core section.
- Domain-template fields default to quick mode and can expand into advanced fields.
- Difficulty and cost ratings are advanced fields instead of always visible.
- Strength logging supports a simple single-exercise mode and a lightweight training-session mode with up to 5 exercise entries.
- Training-session entries are stored in `actualData.exercises`; EffortUnit derivation reads the first exercise for the primary effort and stores the exercise list in raw data.

Known limitations:
- No Apple Watch or HealthKit integration yet.
- No full workout planner yet.
- Training session log v1 is intentionally simple.
- Mobile visual QA still needs device/browser confirmation after the next build is served.

Validation:
- `npx tsc --noEmit`: passed during implementation.
- `npm run build`: passed after approved write access allowed Expo to clean `dist/favicon.ico`.

## Domain Template Engine v1

Status: Implemented v1 rule-based templates and data pipeline

Types:
- Added `DomainTemplate`, `DomainTemplateModule`, `DomainTemplateSkill`, `DomainRecordingField`, and `DomainTemplateOutcomeCriterion` in `src/types.ts`.
- Added template markers to generated data: `Category.domain`, `Category.domainTemplateId`, `QuestModule.createdFromTemplateId`, `QuestModule.moduleTemplateId`, `Skill.domainTemplateId`, `Skill.createdFromTemplateId`, `Skill.skillTemplateId`, `Skill.moduleTemplateId`, and `Skill.recordingFieldKeys`.
- Added `ExecutionLog.structuredData`, `ExecutionLog.domainTemplateId`, and `ExecutionLog.domain`.

Built-in templates:
- Added `src/domainTemplates.ts`.
- Includes rule-based templates for fitness strength, fitness physique, study course, exam prep, writing assignment, coding project, life maintenance, recovery health, and finance tracking.
- Each template defines default modules, skills, progress model, recording schema, effort mapping, and contribution hints.

Goal create/edit:
- `GoalForm` now recommends a domain template after goal type selection.
- Users can choose `Use Recommended Template` or `Create Empty Goal`.
- Existing goals use the template action as `Supplement Missing Template Structure`.
- Template preview shows module count, skill count, and default recording fields.

Store integration:
- Added `applyDomainTemplateToGoal(goalId, templateId)` in `src/store.tsx`.
- Applying a template creates missing modules, missing skills, and module-skill links without overwriting or deleting existing user data.
- Template-generated skills inherit task type, progress type, metric config, default duration, unit, and recording field keys.
- Duplicate module/skill/link creation is prevented by name and module-skill link checks.

Record Progress integration:
- Today's record progress modal now reads `Skill.recordingFieldKeys` and the skill's `domainTemplateId`.
- Template-backed skills render schema-based fields such as weight, sets, reps, RPE, topic, chapter, question count, word count, work type, amount, before state, and after state.
- Submitted schema values are stored in `ExecutionLog.structuredData`.
- Existing metric-aware logging remains as fallback for custom or non-template skills.

EffortUnit integration:
- `createEffortUnitsFromExecutionLog` now reads `ExecutionLog.structuredData`.
- Schema fields map into effort raw values where possible: weight, sets, reps, RPE, duration, question count, word count, output count, task count, score, amount, quality, difficulty, mental cost, and physical cost.

Analytics:
- Added `domain_template_selected`.
- Added `domain_template_applied`.
- Added `domain_schema_log_saved`.
- Events only upload domain, goal type, counts, booleans, effort type, metric family, and field count. User text fields are not uploaded.

Known limitations:
- v1 is rule-based and does not use LLM generation.
- Templates create practical defaults, not full plans.
- Custom domain still uses the existing fallback flow.
- Schema field rendering is intentionally simple and can be made more polished later.
- No automatic textbook import, program import, or full schedule generation yet.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after running with project-write permissions so Expo could clean `dist/favicon.ico`.
- `npm run build`: passed. The sandbox blocked writing `dist/index.html` on the first run, then the approved build completed successfully.

## Today Command Center Refactor

Status: Completed

Core files:
- `src/types.ts`
- `src/storage.ts`
- `src/store.tsx`
- `src/i18n.ts`
- `src/screens/HomeScreen.tsx`
- `PROJECT_STATUS.md`

Today page order:
- Header Summary with date, invested minutes, log count, latest state summary, and current time block.
- Now Focus with direct Start, Done, and Log Progress actions.
- Compact Today Plan showing up to 3 tasks by default, with expand/collapse.
- State Check-in for quick state time-series logging.
- Brain-Off Rescue as a lighter strip below State Check-in.
- Execution Strategy and Today Execution Budget below the main action layer.
- Skill Progress and Today Logs remain lower on the page.

Now Focus logic:
- Active timer session.
- Current unfinished schedule block.
- First unfinished schedule block today.
- Unlogged skill for today.
- First skill.
- Fallback Log Progress.

StateCheckIn:
- Added `StateCheckIn` and `AppData.stateCheckIns`.
- Latest state check-in becomes the current state summary.
- Old daily/current state remains as fallback only.

StateCheckIn actions:
- `createStateCheckIn`
- `updateStateCheckIn`
- `deleteStateCheckIn`
- `getStateCheckInsByDate`
- `getLatestStateCheckIn`
- `getStateCheckInsThisWeek`
- `getAverageStateByTimeBlock`

Analytics events:
- `state_checkin_saved`
- `today_now_focus_clicked`
- `today_plan_expanded`

Known limitations:
- State check-in v1 stores local time-series data only.
- Detailed state note remains local and is not uploaded to analytics.
- Now Focus is rule-based, not AI-based.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed. The sandbox blocked writing `dist/favicon.ico` on the first run, then the approved build completed successfully.

## QuestLife Design System v1

Status: Completed

Core files:
- `src/design/tokens.ts`
- `src/components/ui/QuestCard.tsx`
- `src/components/ui/QuestButton.tsx`
- `src/components/ui/QuestPill.tsx`
- `src/components/ui/QuestSection.tsx`
- `src/components/ui/QuestIcon.tsx`
- `src/components/ui/QuestProgressBar.tsx`
- `App.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/types.ts`
- `src/i18n.ts`

Theme tokens:
- Added `QuestTheme` tokens for colors, radius, spacing, and typography.
- Added five themes: Clean Focus, Deep Work, Forest Growth, Ocean Calm, Warm Recovery.
- Added `selectedThemeId` in local settings, defaulting to `cleanFocus`.

UI primitives:
- Added reusable card, button, pill, section, icon, and progress bar primitives.
- Added a local SVG icon system based on `react-native-svg`, avoiding Apple emoji as default system icons.

Visual updates:
- Bottom navigation now uses vector icons and theme-aware nav colors.
- Settings includes an Interface Theme switcher.
- Today now uses theme-aware background, command-center card styling, vector icons for primary actions, compact state dots, a lighter rescue strip, and theme-aware progress bars.

Analytics:
- Added `theme_changed` event when the user switches interface theme.

Known limitations:
- User-entered emoji icons for goals/skills are still preserved.
- The full app is not yet completely migrated to design-system primitives; this pass focuses on Today, bottom navigation, Settings, and core cards.

## UI System Phase 2 - Design System Coverage Expansion

Status: In progress / substantial coverage completed

Core files:
- `src/design/tokens.ts`
- `src/design/systemIcons.ts`
- `src/components/ui/QuestEntityIcon.tsx`
- `src/components/ui/QuestInput.tsx`
- `src/components/ui/QuestEmptyState.tsx`
- `src/components/BottomSheetForm.tsx`
- `src/components/EmojiPicker.tsx`
- `src/components/GoalForm.tsx`
- `src/components/SkillForm.tsx`
- `src/screens/GoalTreeScreen.tsx`
- `src/screens/GoalDetailScreen.tsx`
- `src/screens/SkillLibraryScreen.tsx`
- `src/screens/SkillDetailScreen.tsx`
- `src/screens/ScheduleScreen.tsx`
- `src/screens/StatsScreen.tsx`

UI audit coverage:
- Audited Today, Quest/Goal list, Goal Detail, Skill Library, Skill Detail, Schedule, Insights, Settings, bottom sheets, icon picker, and major form components.
- Remaining older UI pockets are mostly legacy/internal `SkillsScreen`, some chart internals, and a few low-level time/color picker details.

Design system expansion:
- Added a centralized `systemIcons` mapping for goals, task types, metrics, navigation, rescue, state, schedule, progress, and suggested modules.
- Added `QuestEntityIcon` so vector icons and legacy user emoji render inside a consistent theme-aware badge instead of floating naked in the UI.
- Added `QuestInput` and `QuestEmptyState` for consistent form fields and empty states.
- Updated bottom sheet containers to use selected theme surfaces, borders, and shadows.
- Updated emoji picker cells so preserved user emoji sit inside themed icon tiles.

Pages pulled into the unified visual system:
- Quest/Goal list uses `QuestCard`, `QuestButton`, `QuestEntityIcon`, and theme-aware empty states.
- Goal Detail uses themed header actions, entity icons, goal meta pills, Goal Loop card, outcome criteria cards, suggested module chips, recent execution rows, module cards, and module skill rows.
- Skill Library uses themed cards, entity icons, action buttons, and dark-friendly menus.
- Skill Detail uses themed header, entity icon, compound curve card, rule cards, linked-location cards, execution log cards, stat cards, milestone cards, and danger zone.
- Schedule main page uses themed background, view switcher, Now/Next hero card, compact timeline surface, schedule block cards, week cards, placeholders, and Add Block form fields.
- Insights top cards and core loop cards now use theme-aware surfaces and no longer show raw skill emoji in the Most Focused Skill card.
- Goal and Skill forms now use theme-aware pills/input/button patterns in their highest-visibility areas.

Emoji UI-ification:
- System-level goal, module, skill, schedule, progress, and list-leading icons now render through vector icons or `QuestEntityIcon` badges.
- Preserved user emoji in goals/skills/modules still work, but they are wrapped in themed icon tiles where updated.
- Goal/Skill linked chips and schedule selectors no longer prepend raw emoji to labels.

Dark theme fixes:
- Deep Work token contrast was raised for primary text, muted text, borders, inactive nav, surfaces, and elevated panels.
- Icon tiles, bottom sheets, module rows, schedule blocks, and major cards now separate better from the dark background.
- Secondary text remains subdued but more legible in updated screens.

Known limitations:
- Some old chart internals still use legacy `theme` constants and quality emoji markers.
- The legacy `SkillsScreen` remains visually older because Skill Library is now the primary skill surface.
- `ColorPicker` and `TimePickerInput` are only partially aligned and should be polished in a later pass.
- Insights lower sections are not fully converted to reusable card primitives yet, though the top and loop areas are aligned.

Validation:
- `npx tsc --noEmit`: passed during this pass.
- `npm run build`: passed. The sandbox blocked writing `dist/favicon.ico` on the first run, then the approved build completed successfully.
- Browser smoke check: `http://localhost:8085` loaded Today and Insights without white screen.

## Semantic Icons + Metric-Aware Logging v1

Status: Completed incremental repair pass

Core files:
- `src/design/entityIcons.ts`
- `src/components/ui/QuestEntityIcon.tsx`
- `src/utils/prediction.ts`
- `src/types.ts`
- `src/progress.ts`
- `src/store.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/GoalTreeScreen.tsx`
- `src/screens/GoalDetailScreen.tsx`
- `src/screens/SkillLibraryScreen.tsx`
- `src/screens/SkillDetailScreen.tsx`
- `src/screens/ScheduleScreen.tsx`
- `src/i18n.ts`

Dark/light theme repair:
- Bottom sheet surfaces now use the selected Quest theme elevated surface instead of the legacy app background.
- Today Log Progress modal now uses theme-aware inputs, prediction panels, rating controls, skill selector chips, and action buttons.
- Active chip text in touched Today modal areas now uses theme primary text instead of hardcoded black/white assumptions.

Semantic icons:
- Added `entityIcons` helper for goal, skill, and module semantic icon inference.
- `QuestEntityIcon` now prefers semantic vector icons by default and only shows legacy emoji when explicitly requested.
- Goal list, Goal Detail, Skill Library, Skill Detail, Schedule block rows, Today plan rows, Today logs, and skill progress rows now use semantic entity icon badges.
- New skills/goals no longer default to raw emoji values; preserved old emoji values remain compatible but are not the primary system icon.

Metric-aware prediction and recording:
- Added `getPredictionSchemaForSkill` to choose prediction/recording fields from `metricType`, `taskType`, and performance config.
- Today Log Progress no longer forces every task through a plain predicted minutes + quality flow.
- Time-based skills still support predicted duration.
- Target-value skills support predicted value and current-value update.
- Strength/performance skills show structured prediction and actual fields for working weight, reps, sets, and RPE.
- Execution logs can now store `predictionData` and `actualData` for structured records while preserving old log fields.

Strength training:
- Strength logs store structured `strengthSets` and total volume in `metricUpdate.performanceData`.
- Performance value falls back to top weight or volume depending on available data, so `performance_log` skill progress can update without forcing time as the main metric.
- Target-value strength skills can update `currentValue` from actual top weight when a separate current-value field is not entered.
- Log summaries display strength records like `75kg × 5 × 4 · RPE 8` instead of only `30 minutes`.

Analytics:
- Added `structured_log_saved` event with metric/task type and structured data flags.
- Expanded `prediction_saved` event metadata with metric/task type and prediction-kind flags.
- Added `prediction_started` tracking when the Today log flow opens.

i18n:
- Added Chinese/English keys for performance prediction, actual performance fields, optional quality, semantic icon labels, and metric-aware log labels.

Known limitations:
- Schedule’s separate Log Progress sheet still has a simpler metric form than Today’s main modal.
- Strength support is v1: it records top work set style data, not full multi-set workout history.
- Lower Insights sections still have some legacy chart internals from earlier UI phases.
- Icon picker still preserves the emoji-based selector, but system surfaces now prioritize semantic vector icons.

## Current Round Completion Cleanup

Status: Completed focused cleanup pass

Core files:
- `src/screens/ScheduleScreen.tsx`
- `src/screens/StatsScreen.tsx`
- `src/screens/GoalDetailScreen.tsx`
- `src/components/SkillForm.tsx`
- `PROJECT_STATUS.md`

Schedule log sheet alignment:
- Schedule block Log Progress now uses the same metric-aware update path as the rest of the execution system.
- Strength/performance schedule logs support working weight, reps, sets, RPE, performance unit, performance note, and structured `actualData`.
- Schedule-created strength logs write `metricUpdate.performanceData.strengthSets`, `totalVolume`, and `performanceValue`, so Today and Skill Detail can render summaries such as `75kg × 5 × 4 · RPE 8`.
- Target-value strength records can update current value from actual working weight when a separate current value is not entered.
- Schedule logs still call the existing `createExecutionLog`, so schedule block completion, skill progress, Today totals, and Insights aggregation stay on the existing data chain.

Insights legacy style cleanup:
- Insights rescue stats, weekly quality, pattern cards, skill/task/metric distribution cards, daily bar chart, and heatmap now use selected Quest theme surfaces, borders, text colors, muted text, and soft backgrounds.
- Deep Work/dark theme no longer relies on the old white card defaults in the touched Insights sections.
- Skill distribution rows now use `QuestEntityIcon` with semantic skill icons instead of raw icon text.

Semantic icon coverage confirmed:
- Today, Goal list, Goal detail, module rows, skill rows, Skill Library, Skill Detail, Schedule blocks, and Insights skill distribution now route visible entity icons through semantic vector icons or `QuestEntityIcon`.
- Legacy emoji values remain compatible as data fallback, but the main system surfaces prioritize semantic vector icons.

ExecutionLog summary display:
- Goal Detail recent execution now uses `formatMetricUpdateSummary` instead of rebuilding a minutes-only summary.
- Today Logs and Skill Detail Logs already use the shared formatter.
- Schedule-generated strength logs use the same `metricUpdate.performanceData` shape, so shared summaries stay consistent across Today, Skill Detail, and Goal Detail.

Dark theme regression:
- Schedule Log Progress sheet fields now use `QuestInput` and theme-aware text/buttons for money, qualitative, note, and final actions.
- Skill Form metric, schedule, and cost profile inputs were brought onto theme-aware input/background/border tokens in the touched areas.
- Remaining known limitation: the legacy `EmojiPicker`, `ColorPicker`, and old internal `SkillsScreen` are still not fully design-system-native, but primary Skill Library and current edit flows are readable and themed.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: pending final verification for this cleanup pass.

## Focused UI/UX Fixes

Status: Completed focused bugfix pass

Core files:
- `src/screens/HomeScreen.tsx`
- `src/components/GoalForm.tsx`
- `src/components/SkillForm.tsx`
- `src/i18n.ts`
- `PROJECT_STATUS.md`

Dark theme white-card / low-contrast cleanup:
- Today stat cards now receive selected theme `surface`, `border`, `textMuted`, and accent colors instead of relying on legacy static card colors.
- Today Skill Progress rows now use theme-aware surfaces, borders, text, muted text, and progress backgrounds.
- Today Logs empty state, no-skill CTA, grouped log rows, action titles, notes, and bottom tips now use selected theme tokens.
- The focused visible Today areas no longer depend on old static white-card defaults in deepWork/dark theme.

Rescue compact strip:
- The “启动不了？” / “Can’t start?” entry was reduced from a high-visual-weight card into a compact emergency strip.
- Height, padding, icon size, title size, and CTA size were lowered.
- The strip remains under the state check-in area, so state/mode controls stay primary and Rescue remains visible without stealing the main execution flow.
- Existing Rescue flow, rescue logs, and `cant_start_clicked` analytics behavior were preserved.

Auto semantic icon vs custom icon mode:
- Goal Form now defaults to automatic semantic icon preview based on `goalType`.
- Skill Form now defaults to automatic semantic icon preview based on `taskType` / `progressType`.
- Emoji picker is no longer shown by default in Goal/Skill creation.
- “Customize icon” opens the legacy emoji picker only when the user explicitly wants an override.
- “Use auto icon” clears the override and returns to semantic icon rendering.
- Existing saved emoji values remain compatible and are still rendered through `QuestEntityIcon`/badge surfaces in the main UI.

i18n:
- Added Chinese/English keys for compact Rescue copy and icon-mode controls:
  `customizeIcon`, `customIconEnabled`, `useAutoIcon`, `legacyEmoji`,
  `cantStartCompactTitle`, `cantStartCompactSubtitle`, `rescueStartAction`, `rescueTodayCount`.

Known limitations:
- The legacy `EmojiPicker` still uses emoji when explicitly opened as a custom/legacy override.
- This pass did not redesign `ColorPicker`, `TimePickerInput`, or legacy `SkillsScreen`.
- Build verification may still hit the sandbox `dist/favicon.ico` unlink permission issue from previous runs.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after approved dist write access; initial sandbox run hit `EPERM` on `dist/favicon.ico`.

## Dark Surface Cleanup Pass

Status: Completed focused dark-surface cleanup

Core files:
- `src/components/ui/QuestCard.tsx`
- `src/components/ColorPicker.tsx`
- `src/screens/GoalTreeScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/ScheduleScreen.tsx`
- `PROJECT_STATUS.md`

What changed:
- Fixed the shared `QuestCard` surface precedence so selected theme surfaces override legacy static `theme.card` backgrounds passed in old screen styles.
- GoalsList cards now inherit dark `surface` / `border` from `QuestCard`, and goal description text is explicitly bound to `questTheme.colors.textMuted`.
- GoalDetail business cards are covered through the shared `QuestCard` fix, including vision, goal loop, suggested modules, recent execution, criteria, and module cards.
- Schedule Day “Now / Next” and placeholder cards are covered through the shared `QuestCard` fix.
- Schedule create-block chip groups now use `questTheme` surfaces, borders, text, and primary text instead of the old static white card style.
- Insights summary, loop, self-knowledge, rescue, and locked cards are covered through the shared `QuestCard` fix plus existing inline theme overrides.
- Today’s schedule empty state in the Log Progress sheet now uses selected theme surface, border, and muted text.
- Color picker tiles now use selected theme border/shadow colors instead of a static white card border.

Manual dark-theme targets checked in code:
- GoalsList deepWork white cards: fixed through shared `QuestCard` and text override.
- GoalDetail deepWork white cards: fixed through shared `QuestCard`.
- Schedule current/next white card: fixed through shared `QuestCard`.
- Insights white cards: fixed through shared `QuestCard`.
- Today stat/log/skill rows: existing inline theme overrides retained; schedule empty state patched.
- Editor/icon picker dark tiles: ColorPicker patched; EmojiPicker was already theme-aware.

Known limitations:
- Some legacy StyleSheet entries still contain old static `theme.card` defaults for fallback, but the visible shared card path now applies selected theme surfaces after those defaults.
- Legacy internal screens not in the main navigation may still need a later full design-system pass.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: blocked by sandbox `EPERM` while Expo tried to unlink `dist/favicon.ico`; escalated rerun was rejected by the current environment policy.

## Dark Surface Source Fix

Status: Completed source-level dark surface fix

Root cause found:
- The visible white business cards were not mainly direct `#fff` literals in the screenshots; they came from old static `theme.card` styles flowing into shared card/list/stat components.
- The previous pass relied on React Native style-array ordering to let `QuestCard` override legacy `theme.card`; screenshots showed that was not robust enough across the current web surface path.
- Some picker/chip/empty-state paths still used old static card defaults outside the shared card component.

Source components / helpers fixed:
- Added `src/design/surfaces.ts` with `isDarkTheme`, `isLightSurfaceColor`, `resolveSurfaceColor`, `getSurfaceStyle`, and `sanitizeSurfaceStyle`.
- Updated `src/components/ui/QuestCard.tsx` to flatten incoming legacy styles, sanitize light surfaces in dark mode, and then apply resolved selected-theme card/elevated/row/soft surfaces as the final source of truth.
- Updated `src/components/ui/QuestPill.tsx` and `src/components/ui/QuestEmptyState.tsx` to resolve surfaces through the same helper.
- Updated `src/components/ui/QuestButton.tsx` ghost outline border path to use selected-theme outline surface semantics.
- Updated `src/screens/HomeScreen.tsx` shared `themedCard` source to use `getSurfaceStyle`.
- Updated `src/screens/ScheduleScreen.tsx` create-block chip groups to use selected theme surfaces/text instead of old static white chip defaults.
- Updated `src/components/ColorPicker.tsx` to use selected theme borders/shadows instead of static white card borders.
- Updated `src/screens/GoalTreeScreen.tsx` goal description text to use selected theme muted text.

Pages verified by source path:
- GoalsList: goal cards render through `QuestCard` and now receive sanitized row/card surface from `src/design/surfaces.ts`; title text already uses selected theme text.
- GoalDetail: vision, goal loop, suggested modules, criteria, recent execution, and module cards all render through `QuestCard`; module skill rows already have selected theme `surfaceSoft`.
- Insights/Stats: top summary cards, progress unlock card, system loop overview, self-knowledge card, and rescue card render through `QuestCard`; chart/share/empty sections also have inline selected-theme surfaces.
- Schedule: current/next card and placeholders render through `QuestCard`; timeline and week cards already have selected-theme inline surfaces; create-block chips are now theme-aware.
- Today: shared cards use selected-theme `getSurfaceStyle`; stat cards, skill rows, log empty states, action rows, and schedule empty states have selected-theme inline surfaces.

Remaining limitations:
- Static legacy `theme.card` defaults still exist in StyleSheet fallback definitions, but for the verified visible business-card paths they are now either sanitized by `QuestCard` or overridden by selected-theme inline styles.
- `npm run build` still cannot complete in this sandbox because Expo export is blocked from unlinking `dist/favicon.ico`.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: blocked by sandbox `EPERM` on `dist/favicon.ico`; escalated rerun was rejected by current environment policy.

## Dark Card Root Cause Debug

Status: Diagnosed and source-level fix retained

True rendered files from `App.tsx`:
- Today tab: `src/screens/HomeScreen.tsx`
- GoalsList route under Quest tab: `src/screens/GoalTreeScreen.tsx`
- GoalDetail route: `src/screens/GoalDetailScreen.tsx`
- Insights tab: `src/screens/StatsScreen.tsx`
- Schedule tab: `src/screens/ScheduleScreen.tsx`

Runtime diagnosis:
- `package.json` points to Expo via `index.ts`; `App.tsx` imports and registers the screens listed above.
- The in-browser page at `http://localhost:8084` did not match this current `App.tsx`: it showed the old emoji bottom navigation and old “今日打卡” Today UI.
- The correct project dev server attempted to start from `/Users/kyrie/Documents/Codex Questlife/QuestLife`, but the existing `8084` port was already owned by another Node process and the attempted correct Expo process crashed with `ERR_SOCKET_BAD_PORT`.
- Because the visible page was an old bundle/server, DEBUG markers added to the current true source files could not be visually validated there. The DEBUG markers were removed before finalizing.

White-card root causes in the true source files:
- GoalsList: `GoalTreeScreen.tsx` card style still carries legacy `backgroundColor: theme.card`; it is passed through `QuestCard`.
- GoalDetail: `GoalDetailScreen.tsx` vision, loop, suggested, criteria, recent, and module card styles still carry legacy `backgroundColor: theme.card`; they are passed through `QuestCard`.
- Insights: `StatsScreen.tsx` summary, unlock/progress, system loop, self-knowledge, and rescue cards still carry legacy `backgroundColor: theme.card`; they are passed through `QuestCard`.
- Schedule: `ScheduleScreen.tsx` now/next and placeholder card styles still carry legacy `backgroundColor: theme.card`; they are passed through `QuestCard`.
- Today: `HomeScreen.tsx` uses many legacy `theme.card` fallback styles, but the visible main cards use `themedCard` or inline selected-theme overrides.

Actual source fixes:
- `src/design/surfaces.ts` added a dark-theme safe surface resolver and light-surface sanitizer.
- `src/components/ui/QuestCard.tsx` now sanitizes incoming legacy card styles and applies selected theme surface as final source of truth.
- `src/components/ui/QuestPill.tsx`, `src/components/ui/QuestEmptyState.tsx`, and `src/components/ui/QuestButton.tsx` now use the surface helper for shared UI pieces.
- `src/screens/HomeScreen.tsx` shared card source now uses `getSurfaceStyle`.
- `src/screens/ScheduleScreen.tsx` create-block chip groups now use selected theme surfaces/text.
- `src/components/ColorPicker.tsx` now uses selected theme border/shadow tokens.
- `src/screens/GoalTreeScreen.tsx` description text now uses selected theme muted text.

DEBUG marker status:
- Added temporarily to GoalsList, GoalDetail module card, Insights summary card, and Schedule now/next card.
- Removed after diagnosis.
- Debug marker search in `src`: no remaining markers.

Build/typecheck:
- `npx tsc --noEmit`: passed.
- `npm run build`: blocked by sandbox `EPERM` on `dist/favicon.ico`; escalated rerun rejected by current environment policy.

Remaining limitation:
- A visual browser screenshot can only validate these fixes after the app is served from the current project bundle rather than the old process currently occupying `localhost:8084`.

## Dark Theme Hard Override / Surface Guard

Status: Implemented source and web guardrail

Root theme class / data attribute:
- Added in `App.tsx` around onboarding/loading/navigation root.
- Dark themes receive `className="questlife-root questlife-theme-dark"` and `data-theme="dark"`.
- Light themes receive `className="questlife-root questlife-theme-light"` and `data-theme` with the active theme id.
- Root CSS variables are set from the active Quest theme so web overrides use the selected theme colors.

CSS override:
- Added `src/styles/theme-overrides.css`.
- Imported from `App.tsx`.
- Dark override covers shared card/list/stat/empty/schedule/insight classes plus common legacy white utility classes such as `bg-white`, `bg-gray-50`, `bg-slate-50`, and `bg-zinc-50`.
- Added `ql-title`, `ql-muted`, and `ql-subtle` text hooks for future precise contrast overrides.

Inline surface guard:
- Added `src/design/darkSurfaceGuard.ts`.
- `QuestCard` now uses `guardDarkSurfaceStyle` before applying selected theme surfaces.
- The guard prevents dark themes from accepting legacy white/light business-surface backgrounds passed through React Native Web inline styles.

Pages wired:
- GoalsList: `GoalTreeScreen.tsx` goal cards now have `goal-card goal-row` web hooks.
- GoalDetail: vision, goal loop, criteria, suggested modules, recent execution, and module cards now have `goal-detail-card`, `goal-loop-card`, `suggested-modules-card`, or `module-card module-row` hooks.
- Insights: top summary, progress unlock, system loop, self-awareness, and rescue cards now have `summary-card`, `insight-card`, `system-loop-card`, `self-awareness-card`, or `rescue-summary-card` hooks.
- Schedule: now/next and placeholder cards now have `schedule-card current-next-card` or `schedule-card empty-state` hooks.
- Today: existing selected-theme inline card fixes are preserved; shared empty states also receive the `empty-state` hook through `QuestEmptyState`.

Remaining white surfaces:
- None known in the verified shared business-card paths.
- If a stale local dev server is still serving an older bundle, the browser may still show old white cards until the current project bundle is served.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: blocked by sandbox `EPERM` while Expo tried to unlink `dist/favicon.ico`; escalated rerun was rejected by the current environment policy.

Follow-up diagnosis from visible screenshots:
- The remaining white cards were still coming from the real page-level `StyleSheet` objects such as `styles.card`, `styles.moduleCard`, `styles.instantCard`, `styles.loopCard`, `styles.insightCard`, and `styles.nowNextCard`.
- These styles still include legacy `backgroundColor: theme.card` and were surviving into the rendered cards.
- The shared guardrail alone was not sufficient in the running web surface, so the visible `QuestCard` call sites now pass the active `questTheme` surface as the final page-level style override.

Follow-up page-level fixes:
- `GoalTreeScreen.tsx`: goal list cards now append active theme `surface` / `border`.
- `GoalDetailScreen.tsx`: vision, goal loop, criteria, suggested modules, recent execution, and module cards now append active theme `surface` or `surfaceElevated`.
- `StatsScreen.tsx`: top summary cards, unlock card, system loop card, self-awareness card, and rescue card now append active theme surfaces.
- `ScheduleScreen.tsx`: now/next card and placeholder card now append active theme surfaces.

Follow-up validation:
- `npx tsc --noEmit`: passed.

Second follow-up from user screenshots:
- The remaining unchanged upper cards indicated that React Native Web inline styles were still winning in some rendered DOM paths.
- Added a runtime DOM-level guard in `App.tsx` that applies `questlife-theme-dark` / `questlife-theme-light`, `data-theme`, and active theme CSS variables directly to both `document.documentElement` and `document.body`.
- Expanded `src/styles/theme-overrides.css` with dark-mode attribute selectors for inline React Native Web styles such as `background-color: rgb(255, 255, 255)`, `#fff`, `#ffffff`, `rgb(249, 250, 251)`, and related light surfaces.
- Added text-color override guards for legacy dark text (`#111827`, `#000`, `black`) and legacy muted gray text on dark surfaces.

Second follow-up validation:
- `npx tsc --noEmit`: passed.

## Quantified Effort Model v1 - Data Pipeline

Status: Data pipeline implemented

Core data:
- `src/types.ts` now includes `EffortUnit` and `ContributionLink`.
- `AppData` now includes `effortUnits: EffortUnit[]` and `contributionLinks: ContributionLink[]`.
- `DEFAULT_DATA` initializes both arrays as empty.

Helper:
- `src/utils/effort.ts` provides the Quantified Effort helper layer.
- `createEffortUnitsFromExecutionLog(log, context)` derives effort units from execution logs.
- `generateContributionLinks(effortUnit, context)` derives rule-based contribution links after effort units are created.
- Missing linked skill / goal / module safely falls back to qualitative effort without blocking execution log creation.

Store integration:
- `src/store.tsx:createExecutionLog` is the real execution log write path used by Today and Schedule.
- After a log is normalized and saved, the store derives effort units and contribution links in the same mutation.
- Duplicate derivation is prevented by checking existing `effortUnits` for the same `executionLogId`.
- If derivation fails, the store logs a warning and still saves the execution log.
- Existing skill progress, module progress, schedule block completion, and execution log analytics continue through the existing chain.

Compatibility:
- `src/storage.ts` defaults old persisted data without `effortUnits` or `contributionLinks` to empty arrays.
- Existing `executionLogs` are preserved and are not migrated destructively.
- Old data without effort units remains valid; new logs begin generating derived effort data.

Delete cleanup:
- `deleteExecutionLog` now removes effort units and contribution links whose `executionLogId` matches the deleted log.
- Skill progress is still not reverse-adjusted on delete, matching the existing safety rule.

Analytics:
- Added `effort_unit_created` with effort type, metric family, comparable-key presence, and derived-metric presence.
- Added `contribution_links_created` with count and direct / indirect / supporting booleans.
- Events do not upload goal names, skill names, note text, or exercise text.

Known limitations:
- v1 is rule-based, not AI.
- Contribution weights are simple defaults and can be tuned later.
- Old logs are not bulk-backfilled in this pass.
- UI sections for goal impact, comparable progress, Today contribution hints, and Insights effort structure are intentionally deferred to the next pass.

Validation:
- `npx tsc --noEmit`: passed.

## B-3 Stabilisation Bug Sweep

Status: Implemented focused bugfix pass; production UI validation is pending if Vercel remains SSO-protected.

Root causes found:
- Smart Capture confirmation used a real `TouchableOpacity` callback, not `Alert.alert`, so the confirm button itself was not the web no-op breakpoint.
- Parsed entries did not carry a stable source-capture link into saved logs, and the confirm button had no processing guard, so repeated confirm / refresh windows could duplicate logs.
- B-3 date handling always used today's date in the client, so natural language like `昨天 / yesterday` was saved under today.
- Semantic routing still had unsafe fallbacks that could put SQL/data entries into the first available goal, including fitness.
- Strength entries stored detailed set data inconsistently and could display as a single set even when the text said `3x5`.
- Strength/performance entries without explicit duration still risked default-looking duration display rather than a clear no-duration state.
- Several delete flows still relied directly on `Alert.alert`, which is a no-op in RN Web.

Fixes:
- Added `src/utils/confirm.ts` with `window.confirm` on web and `Alert.alert` on native.
- Smart Capture pending cards now default to showing only 1 capture, with the existing expand-more flow preserved.
- `HomeCapturePending` now parses `今天/today` and `昨天/yesterday` client-side for `ExecutionLog.date`.
- `HomeCapturePending` now writes deterministic log ids and `structuredData.sourceCaptureId/sourceCaptureEntryIndex` so the same capture entry is not converted twice.
- Added a processing guard to the confirm action and immediately marks entries dismissed after save.
- Added a minimal rule-based semantic router for SQL/Python/BI/data, chest/push movements, and back/pull movements.
- SQL/data entries avoid fitness goals and prefer data/study/coding goals/modules when available.
- Bench/incline/dip route toward chest/push modules; rows/pull-ups route toward back/pull modules.
- Strength set parsing now expands compact forms and stores a compact `{ weight, reps, sets }` summary plus detailed sets.
- Today logs now show `未记录时长 / Duration not recorded` instead of implying a fake duration when duration is 0.
- Goal delete, Skill Library delete, Skill Detail delete, Goal Detail module/remove-link actions, pending capture delete, Today execution-log delete, and derived-data rebuild confirmation now use the web-safe confirm helper.

Known limitations:
- Production UI validation requires an accessible deployed web URL. If Vercel SSO/protection returns 401, local UI can only be used as auxiliary validation and production remains pending.
- Deleting an ExecutionLog removes the log and derived effort/contribution rows, but existing skill progress is not reverse-adjusted, matching the current store safety rule.
- The semantic router is intentionally v1 rule-based and covers the current SQL/chest/back cases, not every possible exercise or study domain.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after approved rerun because the sandbox blocked unlinking `dist/index.html`.

## B-3.0.1 Data Consistency + Routing Fix

Status: Implemented focused data-consistency patch; production UI validation still requires user access to the deployed web page if Vercel protection blocks automated access.

Root causes addressed:
- New Smart Capture skills could still write `categoryId` from the older fallback category while the new routing helper resolved a better goal/module, causing records to appear detached or under the wrong goal.
- SQL/Python/data-like entries needed a stricter semantic route guard so they do not fall through to fitness/health/strength goals.
- Strength/performance captures without an explicit duration should not enter time-allocation statistics or appear as fake default-duration work.
- RawCapture deletion previously removed only the raw text, leaving generated execution logs and derived rows in place.
- ExecutionLog deletion removed direct contribution links but did not guard against links reachable through deleted effort unit ids.
- Multi-entry confirmation needed a bulk select/deselect control while keeping all detected entries active by default.
- Slug-like labels such as `bench_press` needed display normalization in Today and Insights allocation surfaces.

Files changed:
- `src/screens/HomeCapturePending.tsx`
- `src/screens/HomeSmartCapture.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/StatsScreen.tsx`
- `src/store.tsx`
- `src/utils/confirm.ts`
- `src/utils/displayName.ts`
- `src/i18n.ts`

Fixes:
- `HomeCapturePending` now resolves a single routing result per entry and uses `routing.linkedGoalId` / `routing.linkedModuleId` for new skill `categoryId`, module linking, and execution log links.
- Known semantic routes no longer fall back to unrelated goals; sibling-skill fallback must match the semantic route before it can be used.
- Saved logs include `routeConfidence`, `routeReason`, `needsUserChoice`, and raw parsed fields for easier diagnosis.
- Confirmation cards default to all entries active and now provide select-all / deselect-all controls.
- Strength captures keep parsed strength fields and zero-duration entries remain non-time logs unless the user text includes a real duration.
- Insights time distribution, heatmap, total hours, weekly hit days, and the insight engine now use only logs with `durationMinutes > 0`.
- Today and Insights normalize common slug-like display names through `displayEntityName`.
- `deleteRawCapture(id, { deleteLinkedExecutionLogs: true })` cascades to linked execution logs, effort units, and contribution links; deleting raw text only remains available.
- `deleteExecutionLog` now also removes contribution links tied to the deleted log's effort unit ids.
- Web/native confirm supports an optional cancel action so the raw-only delete path works on web as well as native.

Known limitations:
- ExecutionLog deletion still does not reverse previously applied skill progress, following the existing safety rule.
- Production end-to-end UI validation must be completed by a user with access if the deployed web app is protected by Vercel authentication.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after approved rerun because the sandbox blocked unlinking `dist/favicon.ico`.

## B-4 Post-save Progress Feedback v1

Status: Implemented lightweight post-save feedback for Smart Capture pending confirmations.

Files changed:
- `src/utils/progressFeedback.ts`
- `src/screens/HomeCapturePending.tsx`
- `src/i18n.ts`

What changed:
- Added a pure `buildPostSaveFeedback({ savedLogs, data, lang })` helper.
- The helper reads existing execution logs, skills, goals, and modules without changing stored data.
- Confirmation saves now collect the `ExecutionLog` objects returned by `createExecutionLog`.
- After successful save, the pending card is replaced by a lightweight success feedback card instead of immediately dismissing.
- Feedback shows what was saved, the selected goal/module path, record type, duration, quality, baseline/trend status, and a next action.
- Fitness/performance records compare volume or weight against the previous comparable record when available.
- Time-based records compare duration against the previous comparable record when available.
- If there is no previous comparable record, the feedback marks it as the first structured baseline rather than claiming progress.
- Multi-action saves show up to 3 feedback items and a compact overflow count.

Known limitations:
- v1 does not implement a full coaching model or HealthKit/Apple Watch integration.
- Different actions are not compared against each other.
- Production UI verification is required after GitHub push and Vercel deployment.

Validation:
- `npx tsc --noEmit`: passed.

## B-3.3 Completion Goal / Module Routing

Status: Implemented focused routing selector for Smart Capture completion cards.

Files changed:
- `src/screens/HomeCapturePending.tsx`
- `src/i18n.ts`

What changed:
- Completion cards now expose an editable routing section for each recordable entry.
- Users can select an existing goal, choose no goal, or create a new goal from the pending card.
- Users can select an existing module under the selected goal, choose no module, or create a new module.
- Save resolution now creates the goal first, then creates the module under that goal, then creates or links the skill and execution log with the resolved ids.
- New skills use the resolved goal id as `categoryId` instead of falling back to an unrelated default goal.
- Existing skills can be linked into the selected goal/module before writing the execution log.
- CompletionSchema matches are preferred over local fallback routing unless the user overrides them.

Remaining:
- This pass does not expand DeepSeek prompts, domain coverage, or B-4 feedback.
- Production UI verification is required after GitHub push and Vercel deployment.

Validation:
- `npx tsc --noEmit`: passed.

## B-3.0.2 Residual Data Cleanup

Status: Implemented focused residual-data cleanup for Smart Capture opening context.

Root cause:
- The Today opening line is rendered by `HomeSmartCapture` and generated from `/api/parse` in `mode: greeting`.
- Its local payload used recent `rawCaptures`, not Insights state. If a capture had already been confirmed and its generated execution logs were later deleted, the raw text could still be sent as greeting history and resurface deleted topics such as SQL.
- The Smart Capture parser history used the same raw capture source for cross-link context, so stale confirmed captures could also influence later parsing.

Files changed:
- `src/screens/HomeSmartCapture.tsx`

Fixes:
- Added a local live-context filter for Smart Capture history.
- Greeting history now excludes captures whose parsed entries were dismissed/confirmed and no longer have any live `ExecutionLog` with `structuredData.sourceCaptureId`.
- Parse cross-link history uses the same filtered capture list, so deleted confirmed captures stop influencing new parse results.
- Raw captures that are still pending/failed/unconfirmed can still appear in the capture list and parser context.
- Existing B-3.0.1 deletion behavior remains intact: deleting raw only preserves logs; deleting raw with linked logs cascades logs, effort units, and contribution links.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

Known limitations:
- Production UI validation still requires user access if the deployed web page is Vercel-protected.

## B-3.1 Guided Completion v1

Status: Implemented lightweight rule-based guided completion inside Smart Capture pending confirmation.

Files changed:
- `src/utils/captureCompletion.ts`
- `src/screens/HomeCapturePending.tsx`
- `src/screens/HomeSmartCapture.tsx`
- `src/i18n.ts`

What changed:
- Added a pure `assessCaptureCompletion(rawText, entry, context)` helper.
- Added fallback pending entries for incomplete raw captures when the parser returns no `entries`, covering fitness, learning/project, reading, state, and food/life-factor cases.
- Pending confirmation cards now show a compact "Complete this record" area when fields are missing.
- Duration, quality, RPE, and action/skill suggestions are chip-based and mobile-friendly.
- Fitness vague inputs such as chest/back training now ask the user to choose an action before logging instead of creating a vague skill automatically.
- Learning/data inputs such as SQL/Python avoid fitness routing and can be completed with duration/quality without forcing a target.
- Reading inputs can be held as simple reading progress with optional duration.
- State and food/life-factor inputs are recognized as not recordable execution logs in this pass, so they do not pollute skill progress.
- Completion merges back into the existing `createExecutionLog` chain; no second save path was added.
- Skipping duration preserves `durationMinutes` as undefined/0, so it stays out of time distribution.

Known limitations:
- Food/life-factor modelling remains explicitly deferred.
- State check-in integration is only recognized, not fully wired into the detailed StateCheckIn flow.
- Goal/module chooser is still lightweight; richer route selection can be expanded later.
- No HealthKit / Apple Watch integration.
- No full workout planner or multi-exercise workout builder.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.

## B-3.2 Smart Routing + Multi-Action Completion v1

Status: Implemented focused smart-routing and multi-action completion upgrade for Smart Capture pending cards.

Files changed:
- `src/utils/smartRouting.ts`
- `src/screens/HomeCapturePending.tsx`
- `src/i18n.ts`

What changed:
- Added a rule-based `getSmartRouteResult` helper that classifies captures as fitness, learning, reading, state, food, project, or unknown.
- Smart route results now provide goal, module, and skill candidates with confidence and safe create/unassigned options.
- Fitness routing recognises chest/push, back/pull, shoulder, and legs language and prefers existing fitness goals/modules when present.
- Learning/coding routing recognises SQL/Python/data/coding terms and avoids fitness goals.
- Food/life-factor and state-like captures remain non-execution contexts in this pass.
- Fitness pending cards now support multi-select exercises instead of single-action selection.
- Fitness pending cards support a custom exercise input.
- Each selected exercise can store lightweight details: weight, sets, reps, and RPE.
- Confirming a multi-action fitness capture writes one ExecutionLog per selected exercise through the existing `createExecutionLog` chain.
- Strength logs include `exerciseName`, `weight`, `sets`, `reps`, `rpe`, `sourceCaptureId`, and `sourceCaptureEntryIndex` in structured data.
- Missing duration remains zero/undefined and does not create fake 15-minute time.
- Learning pending cards now show scope chips and an optional study-content field, with duration/quality completion preserved.

Remaining:
- Richer auto goal/module creation is still deferred.
- B-4 visual feedback layer is not implemented in this pass.
- Sports/book/project domain-specific completion templates remain future work.
- Food/life factor modelling remains future work.
- HealthKit / Apple Watch integration remains future work.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after approved rerun because the sandbox blocked unlinking `dist/favicon.ico`.

## B-3.2 CompletionSchema Diagnostics

Status: Diagnostic instrumentation added only; no product behavior fix in this pass.

Files changed:
- `api/parse.ts`
- `src/screens/HomeSmartCapture.tsx`

What changed:
- Added gated server-side parse diagnostics behind `debugParse === true`.
- Server diagnostics report raw DeepSeek response preview, whether raw output contains `completionSchema`, `suggestedActions`, and `needsCompletion`, parsed object keys, top-level completion schema, entry-level completion schema if present, and final response shape.
- Removed the previous unconditional completionSchema server log.
- Added a safe client debug trigger through `?debugParse=1` / `?debugParse=true` or `localStorage.questlife_debug_parse = "true"`.
- Client diagnostics log the final parse result shape only when the debug flag is explicitly enabled.

Known limitations:
- This pass does not fix Smart Routing, completion fallback, pending-card UI, or save/write behavior.
- Production log collection still requires testing the deployed web UI with the explicit debug flag enabled.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after approved rerun because the sandbox blocked unlinking `dist/index.html`.

## B-3.2 Top-Level CompletionSchema Empty-Entries Flow

Status: Implemented focused frontend routing fix.

Files changed:
- `src/screens/HomeSmartCapture.tsx`
- `src/screens/HomeCapturePending.tsx`

Diagnostic finding carried forward:
- `/api/parse` final response already returns top-level `completionSchema`.
- Inputs such as `练肩`, `chest`, `back`, and `C++` can return `completionSchema.needsCompletion === true` with `entries.length === 0`.
- The previous frontend branch only opened the pending confirmation card when concrete entries existed, so top-level-only completion schema results fell through to the ordinary observation card.

What changed:
- `HomeSmartCapture` now opens `HomeCapturePending` when `parsed.completionSchema.needsCompletion === true`, even if `entries` is empty.
- `HomeCapturePending` now creates a temporary completion entry from the top-level schema when no parsed entries exist.
- Fitness schema-only captures use `performance_log` and show schema-provided action suggestions.
- Learning schema-only captures use `time_based` and show schema-provided learning/coding suggestions.
- Food/state schema-only captures remain non-execution contexts and are not written as ExecutionLogs.
- Existing `debugParse` gated diagnostics remain gated and are not expanded.

Remaining:
- Full route candidate richness remains future work.
- B-4 progress feedback remains future work.
- Food/life-factor modelling remains future work.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after approved rerun because the sandbox blocked unlinking `dist/favicon.ico`.

## B-3.2 Custom Action Completion Fix

Status: Implemented focused custom-action fix for pending completion cards.

Files changed:
- `src/screens/HomeCapturePending.tsx`
- `src/i18n.ts`

Root cause:
- The custom action input only stored transient text in `customExerciseName`.
- There was no explicit Add action that merged the text into selected actions/scopes, so the input felt like a dead field in production.

What changed:
- Added an explicit Add button next to the custom action input.
- Adding a custom fitness action merges it into `selectedExerciseNames`, clears the input, shows it as a selected chip, and allows deselection.
- Adding a custom learning/coding scope stores it as the selected scope/study note and uses it as the pending action name.
- Duplicate custom actions are not added again.
- Confirmed custom actions continue through the existing `createExecutionLog` chain and are marked in `structuredData` with `sourceActionType: "customAction"`, `source: "customAction"`, and `isCustomAction: true`.

Remaining:
- Domain expansion and B-4 progress feedback remain future work.

Validation:
- `npx tsc --noEmit`: passed.
- `npm run build`: passed after approved rerun because the sandbox blocked unlinking `dist/favicon.ico`.
