# QuestLife Information Architecture

Updated: 2026-07-24

QuestLife now uses four presentation layers instead of rendering every capability in one continuous feed. This document describes presentation only; data models, store actions, APIs, Decision AI, PatternMemory and schedule semantics remain unchanged.

## Navigation

### Primary tabs

| Tab | First-screen responsibility | Secondary access |
| --- | --- | --- |
| Today | Decide what matters now, capture work, start or log the next action, update state | Decision Brief evidence, record review, state sheet, rescue |
| Goals | Show active goals as compact working rows | Goal Detail, Skill Library, editors |
| Schedule | Show current/next timing and the selected day plan | Block editor, log sheet, proposal review through Decision Brief |
| Insights | Present one current judgement, then evidence, trends and patterns in separate layers | Overview, Trends, Patterns, Advanced |
| Settings | Preferences, data sources, data management and background systems | Context parser, debug/experimental tools, onboarding restart |

### Detail stack

`Goals -> Goal Detail -> Skill Library -> Skill Detail`

- Stack screens use compact 44-56px navigation bars and compact entity headers.
- Back behavior remains native to the existing React Navigation stack.
- Goal, module and skill editing remains in the existing sheets/forms.

## Presentation Layers

### Primary

- Today context and compact decision line
- Smart Capture composer
- Current action
- Current state
- Up to three current plan rows
- Compact active-goal rows
- Schedule current/next status
- Insights main judgement

### Secondary

- Today recent records
- Goal recent execution and attributed efforts
- Insights key evidence
- Trends and patterns
- Skill placement and comparable progress

### Detail

- Full Daily Decision Brief evidence and feedback
- Smart Capture completion review
- Goal/Module/Skill forms
- State, log-progress and schedule sheets
- Goal and Skill detail history
- Schedule proposal confirm/apply/undo

### Advanced

- Ability Map when evidence passes its existing threshold
- Growth, allocation, prediction and experimental analysis
- Pattern history and technical evidence

### Background

- Manual Objective Context input
- Sleep/body context source state
- Data health and integrity tooling
- Decision/Pattern debug surfaces
- Future Apple Health destination, without a fake connection control

## Primary Screen Structure

### Today

1. 48px context bar with date and compact decision
2. 56px idle Smart Capture composer
3. compact current-action module
4. compact current-state control
5. up to three plan rows
6. recent activity and rescue as secondary content

The full body-context card and detailed-data module no longer render in the primary Today dashboard. Their data and logic remain available to the Decision Brief and Settings data-source flow.

### Goals

1. compact context bar with goal/skill count
2. Skill Library and add actions
3. 78px goal rows with semantic icon, name, status and overflow action

### Schedule

1. compact date context and add action
2. compact period switcher
3. 82px current/next summary
4. dense 32px timeline slots or compact grouped rows

### Insights

1. Overview: one main judgement and four compact signal tiles
2. Trends: real time-series only; no chart when weekly data is empty
3. Patterns: state and behavior patterns, or one honest accumulation state
4. Advanced: deep analysis only; low-data state renders one compact explanation

Ability Map is never shown on Overview. A default/reference-only all-50 radar is not rendered.

### Settings

Settings begins directly with grouped controls. Manual sleep/body/context parsing is now under Data Sources. No Apple Health connection is presented because no working native integration exists.

## Removed From Primary Rendering

1. giant standalone page-title hero blocks
2. full Daily Brief evidence document
3. Body/Sleep Context card
4. detailed technical data card
5. persistent onboarding-success card after real usage starts
6. default/reference-only Ability Map chart
7. repeated insufficient-data evidence card
8. empty trend charts

These removals are presentation decisions, not data deletion.

## Moved To Detail Or Background

Eight module families moved out of primary feeds:

1. Daily Brief evidence and confidence
2. Objective Context input/import
3. body/sleep source context
4. data-health diagnostics
5. Ability Map
6. experimental/advanced analysis
7. PatternMemory and DecisionMemory diagnostics
8. technical metadata and integrity tooling

## Apple Health Boundary

Settings -> Data Sources is the future integration location. This reset adds no HealthKit module, permission, connected state or sync claim.

