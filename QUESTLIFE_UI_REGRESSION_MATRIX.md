# QuestLife Product Surface Reset Regression Matrix

Updated: 2026-07-24

Status legend:

- `Local pass`: exercised in the local exported web build.
- `Source preserved`: presentation changed; the existing handler/data path remains unchanged.
- `Production pending`: must be repeated after GitHub/Vercel deployment.

## Navigation And Responsive Shell

| Check | Local result | Production |
| --- | --- | --- |
| Today -> Goals -> Schedule -> Insights -> Settings, repeated 10 times | Local pass at 375x812, 390x844, 430x932 and 1280x900 | Pending |
| Reverse five-tab sequence, repeated 10 times | Local pass | Pending |
| Inactive RN-Web screens cannot overlay active tab | Local pass; inactive surface boundary resolves to `display: none` | Pending |
| Bottom navigation covers no primary control | Local pass; 58px nav with 82px content inset | Pending |
| Hard refresh | Local pass | Pending |
| Browser back from Goal/Skill stack | Local pass for Goal Detail route | Pending |
| cleanFocus/deepWork theme switch | Local pass | Pending |
| Horizontal overflow | None detected at four required viewports | Pending |

## Primary Surfaces

| Surface | Required behavior | Local result | Production |
| --- | --- | --- | --- |
| Today | compact context, capture, decision/action, state and plan in first flow | Local pass | Pending |
| Smart Capture | 56px idle composer; parse/review/save handlers preserved | Render/input pass; production API chain pending | Pending |
| Goals | compact context actions and 78px rows | Local pass | Pending |
| Goal Detail | compact entity header; edit, criteria, modules and skills retained | Source preserved | Pending |
| Skill Library | compact context bar; create/open/delete retained | Source preserved | Pending |
| Skill Detail | compact entity header; no empty compound card; logs/links retained | Source preserved | Pending |
| Schedule | compact switcher and 82px current/next summary | Local pass | Pending |
| Insights Overview | one judgement before four signal tiles | Local pass | Pending |
| Insights Trends | no chart when no real weekly minutes exist | Local pass | Pending |
| Insights Patterns | distinct evidence layer and one low-data state | Local pass | Pending |
| Insights Advanced | low-data state compact; Ability Map not default all-50 | Local pass | Pending |
| Settings | no giant title; Data Sources parser/save available | Parse/save local pass | Pending |

## Protected Product Flows

| Flow | Protection result | Production |
| --- | --- | --- |
| Smart Capture enter -> parse -> review -> route -> save -> feedback | Existing components and handlers preserved | Pending |
| B4 post-save feedback | No logic changes | Pending |
| State check-in and after-state | Existing store/actions/sheets preserved | Pending |
| Decision Brief load/refresh/evidence/useful feedback | Existing logic preserved; summary presentation compacted | Pending |
| Schedule proposal confirm/apply/undo | No semantic or handler changes | Pending |
| Objective Context parse/preview/save | Moved to Settings Data Sources; local parse/save pass | Pending |
| PatternMemory candidate/accepted/rejected/archive | No state or weighting changes | Pending |
| Goal/Module/Skill create/edit/link/unlink/delete | No semantic/store changes | Pending |
| Import/export/reset and confirmations | Existing settings handlers preserved | Pending |

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

