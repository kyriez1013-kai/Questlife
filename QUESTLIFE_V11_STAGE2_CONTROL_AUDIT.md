# QuestLife V11 Stage 2 Sheet Control Audit

## Scope

This pass audits controls mounted inside the feature-flagged V11 Today sheets. It does not change Store ownership, API calls, schemas, persistence, validation, or handler order. The no-flag legacy Today remains the rollback path.

## Root Cause

The white controls were not browser defaults. The Detailed State sheet mounted legacy descendants inside the V11 shell:

- `HomeScreen.tsx` used `styles.chip` for categorical values.
- `styles.chip` imported the static legacy `theme.card` value from `src/theme.ts`; that value is `#FFFFFF`.
- Cancel and Save used legacy `QuestButton` variants.
- The note field used legacy `QuestInput`.
- Record Progress and Capture Pending repeated the same mixed-control pattern.

The V11 shell and its backdrop were correct. The visual break came from legacy child controls overriding the shell's semantic material tokens.

## Detailed State Control Audit

| Visible control | React component | Source file | Styling source | Token source | V11 migrated | Hardcoded colour | Browser default | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Numeric calibration rail | `V11DiscreteNumericRail` | `src/v11/components/V11SheetControls.tsx` | `v11-stage2-rebaseline.css` | `V11ThemeTokens.control` | Yes | No | No | Shared primitive |
| Body-condition options | `V11CategoricalChip` | `src/v11/components/V11SheetControls.tsx` | `v11-stage2-rebaseline.css` | `V11ThemeTokens.control` | Yes | No | No | Shared primitive |
| Sleep quality | `V11DiscreteNumericRail` | `src/v11/components/V11SheetControls.tsx` | `v11-stage2-rebaseline.css` | `V11ThemeTokens.control` | Yes | No | No | Shared primitive |
| Event/context options | `V11CategoricalChip` | `src/v11/components/V11SheetControls.tsx` | `v11-stage2-rebaseline.css` | `V11ThemeTokens.control` | Yes | No | No | Shared primitive |
| Notes | `V11TextField` | `src/v11/components/V11SheetControls.tsx` | component + shared CSS | `V11ThemeTokens.control` | Yes | No | No | Shared primitive |
| Cancel | `V11SheetButton` through `V11StickySheetFooter` | `src/v11/components/V11SheetControls.tsx` | `v11-stage2-rebaseline.css` | secondary action tokens | Yes | No | No | Shared primitive |
| Save | `V11SheetButton` through `V11StickySheetFooter` | `src/v11/components/V11SheetControls.tsx` | `v11-stage2-rebaseline.css` | primary action tokens | Yes | No | No | Shared primitive |
| Sticky footer | `V11StickySheetFooter` | `src/v11/components/V11SheetControls.tsx` | shared Sheet footer CSS | semantic surface/action tokens | Yes | No | No | Shared primitive |
| Selected state | shared numeric/chip/segment/button selectors | shared V11 files | `data-v11-selected` selectors | selected surface/text/border | Yes | No | No | Shared state |
| Unselected state | shared numeric/chip/segment/button selectors | shared V11 files | base selectors | surface/text/border | Yes | No | No | Shared state |
| Disabled state | shared control selectors | shared V11 files | `data-v11-disabled` selectors | disabled surface/text | Yes | No | No | Shared state |
| Loading state | `V11SheetButton` | shared V11 files | activity indicator + disabled state | semantic action tokens | Yes | No | No | Shared state |
| Error state | text field/footer/button status | shared V11 files | `data-v11-status=error` | semantic error token | Yes | No | No | Shared state |

## Shared Primitive Inventory

- `V11DiscreteNumericRail`
- `V11CategoricalChip`
- `V11CheckboxControl`
- `V11SegmentedSelector`
- `V11TextField`
- `V11SheetButton`
- `V11InlineButton`
- `V11SelectionRow`
- `V11StickySheetFooter`
- `V11StatusChip` for non-interactive status metadata

All feature-level V11 branches pass state and callbacks into these primitives. Feature components do not select raw control colours.

## Descendant Audit

| Surface | Shell | V11 controls in mounted V11 path | Result |
| --- | --- | --- | --- |
| Detailed State | `V11Stage2ProductionSheet` | rails, categorical chips, text field, sticky footer | Migrated |
| Record Progress / Direct Log / Finish | `V11Stage2ProductionSheet` | segmented source/prediction, searchable selection rows, rails, fields, disclosure, footer | Migrated |
| Capture Pending | Capture V11 sheet workspace | checkbox, chips, text fields, disclosure, primary/secondary actions | Migrated |
| Activity History | `V11Stage2ProductionSheet` | load more, capture delete/retry, pending descendants | Migrated |
| Record Detail | Activity History capture renderer | delete/retry and pending descendants | Migrated |
| Decision Details | `V11Stage2ProductionSheet` | semantic evidence rows, status chips, feedback chips, footer | Migrated |
| Instant Read details | V11 Today L2, not a Sheet | V11-specific section controls | Audited; not a legacy Sheet descendant |
| Rescue | Legacy full-screen `Modal`, not a V11 Sheet | legacy rescue buttons | Remaining legacy surface; not converted in this Sheet-control pass |

Legacy `QuestButton`, `QuestInput`, `QuestPill`, and legacy Touchable controls remain in the no-flag rollback branches by design. They are not mounted in the V11 Sheet path.

## Development-only Regression Check

Use:

`?questlife_v11_ui=stage2&debugV11Controls=1`

In a development build, the audit watches dynamic Sheet descendants and reports:

- legacy Quest control classes
- hardcoded white control styles
- browser/native controls without an approved V11 ancestor
- interactive descendants without an approved V11 primitive

Results are written to `window.__questlifeV11SheetControlIssues` and the document status dataset. It does not inspect user text and is not active in production builds.

## Local QA Evidence

Screenshots:

- `/private/tmp/questlife-legacy-state-sheet-375.png`
- `/private/tmp/questlife-legacy-record-sheet-375.png`
- `/private/tmp/questlife-legacy-capture-pending-375.png`
- `/private/tmp/questlife-state-detail-before-dark-393.png`
- `/private/tmp/questlife-v11-state-dark-final-393.png`
- `/private/tmp/questlife-v11-state-light-393.png`
- `/private/tmp/questlife-v11-record-progress-dark-final-393.png`
- `/private/tmp/questlife-v11-capture-pending-dark-final-393.png`
- `/private/tmp/questlife-v11-controls-fixture-final-320.png`

Local mounted-Sheet DOM checks at 393px:

- Detailed State: 57 approved V11 controls, 0 legacy Quest controls, 0 unapproved interactive descendants, 0 dark pure-white controls.
- Record Progress: 21 approved V11 controls, 0 legacy Quest controls, 0 unapproved interactive descendants, 0 dark pure-white controls.
- Capture Pending in Activity History: 27 approved V11 controls after expansion, 0 legacy Quest controls, 0 unapproved interactive descendants, 0 dark pure-white controls.
- Shared fixture at 320px: no horizontal overflow and no clipped control labels in the checked states.

## Verification Boundary

- Local web checks: recorded in this document.
- Physical iPhone Safari: **UNVERIFIED** for this control-purge pass; requires user verification from the LAN build.
- Production: not deployed or tested. This task explicitly forbids push and deployment.
