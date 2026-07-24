# QuestLife Product Surface Reset Regression Matrix

Updated: 2026-07-24

Status legend:

- `Local pass`: exercised in the local exported web build.
- `Source preserved`: presentation changed; the existing handler/data path remains unchanged.
- `Production pass`: exercised in the deployed web UI.
- `Production partial`: the visible path was checked, but a destructive or data-writing action was intentionally not repeated.

## Navigation And Responsive Shell

| Check | Local result | Production |
| --- | --- | --- |
| Today -> Goals -> Schedule -> Insights -> Settings, repeated 10 times | Local pass at 375x812, 390x844, 430x932 and 1280x900 | Production pass; 100-switch forward/reverse run on the deployed reset bundle and a final five-surface traversal after the detail follow-up |
| Reverse five-tab sequence, repeated 10 times | Local pass | Production pass |
| Inactive RN-Web screens cannot overlay active tab | Local pass; inactive surface boundary resolves to `display: none` | Production pass; no blank/overlaid scene during final navigation |
| Bottom navigation covers no primary control | Local pass; 58px nav with 82px content inset | Production pass at 390x844, 430x932 and 1280x900 |
| Hard refresh | Local pass | Production pass on bundle `index-b3b61e4ca6c44d19875f2576393b7a32.js` |
| Browser back from Goal/Skill stack | Local pass for Goal Detail route | Production pass for Goal Detail and Skill Library/Skill Detail |
| cleanFocus/deepWork theme switch | Local pass | Production pass; cleanFocus rendered and deepWork was restored |
| Horizontal overflow | None detected at four required viewports | None detected at 390x844, 430x932 and 1280x900 |

## Primary Surfaces

| Surface | Required behavior | Local result | Production |
| --- | --- | --- | --- |
| Today | compact context, capture, decision/action, state and plan in first flow | Local pass | Production pass |
| Smart Capture | 56px idle composer; parse/review/save handlers preserved | Render/input pass | Production partial; composer and persisted production capture/feedback rendered, but a new save was not added to the user's data during this visual pass |
| Goals | compact context actions and 78px rows | Local pass | Production pass |
| Goal Detail | compact entity header; edit, criteria, modules and skills retained | Source preserved | Production pass; empty states compact and redundant suggested-module panel absent |
| Skill Library | compact context bar; create/open/delete retained | Source preserved | Production pass for open/list/detail navigation; destructive delete not repeated |
| Skill Detail | compact entity header; logs/links retained | Source preserved | Production pass |
| Schedule | compact switcher and 82px current/next summary | Local pass | Production pass |
| Insights Overview | one judgement before four signal tiles | Local pass | Production pass |
| Insights Trends | no chart when no real weekly minutes exist | Local pass | Production pass; one compact accumulation state shown |
| Insights Patterns | distinct evidence layer and one low-data state | Local pass | Production pass |
| Insights Advanced | low-data state compact; Ability Map not default all-50 | Local pass | Production pass; baseline is text-only and no radar canvas rendered |
| Settings | no giant title; Data Sources parser/save available | Parse/save local pass | Production pass for parse preview; save was intentionally not repeated |

## Protected Product Flows

| Flow | Protection result | Production |
| --- | --- | --- |
| Smart Capture enter -> parse -> review -> route -> save -> feedback | Existing components and handlers preserved | Production partial; existing capture and B4 feedback rendered, no additional production record written |
| B4 post-save feedback | No logic changes | Production pass for existing persisted feedback rendering |
| State check-in and after-state | Existing store/actions/sheets preserved | Production partial; controls rendered, no new state record written |
| Decision Brief load/refresh/evidence/useful feedback | Existing logic preserved; summary presentation compacted | Production pass for brief load and evidence disclosure |
| Schedule proposal confirm/apply/undo | No semantic or handler changes | Production partial; no active proposal was available and no user schedule was mutated |
| Objective Context parse/preview/save | Moved to Settings Data Sources; local parse/save pass | Production pass for parse preview (`我昨晚睡了8小时` -> 1 context); save intentionally not repeated |
| PatternMemory candidate/accepted/rejected/archive | No state or weighting changes | Source preserved; debug mutation controls were not exercised |
| Goal/Module/Skill create/edit/link/unlink/delete | No semantic/store changes | Production partial; list/detail/link presentation verified, destructive mutations not repeated |
| Import/export/reset and confirmations | Existing settings handlers preserved | Source preserved; destructive reset intentionally not exercised |

## Exact Presentation Measurements

| Element | Implemented value |
| --- | --- |
| Mobile context/app bar | minimum 48px; detail navigation bars use 8px vertical padding |
| Smart Capture idle | 56px outer content height: 44px control + 6px top/bottom padding |
| Bottom navigation | 58px |
| Screen bottom content inset | 82px |
| Goal row | minimum 78px |
| Schedule current/next | minimum 82px |
| Empty timeline slot | minimum 32px |
| Insights Overview tiles | four tiles, minimum 62px each |
| Ability Map | 220px chart, only after non-baseline evidence |
| Content max width | 760px |
| Mobile horizontal padding | 14px |
| Main dashboard gap | 12px |

## Visual Evidence Checklist

After deployment capture Today, Goals, Schedule, Insights Overview, Insights Advanced and Settings at:

- 390x844
- 430x932
- 1280x900

Final production status must be recorded honestly after those checks.

Production evidence captured at all three required sizes for Today, Goals, Schedule, Insights Overview and Settings. Goal Detail, Skill Library and Skill Detail were additionally captured at 430x932. Insights Advanced was captured at 430x932; its renderer was unchanged by the final compact-empty-state follow-up.
