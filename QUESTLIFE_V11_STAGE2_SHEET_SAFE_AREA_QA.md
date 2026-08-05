# QuestLife V11 Stage 2 Sheet Content-Safe-Area QA

Status: local implementation and browser geometry checks passed; physical
iPhone Safari verification is pending.

Branch: `design/questlife-product-v2`

The implementation remains behind `questlife_v11_ui=stage2`. The legacy Today
and legacy sheets remain available when the flag is absent. No Store, API,
schema, persistence, handler, or business-logic changes were made.

## Actual root cause

The defect was shared layout drift rather than a copy-specific string problem:

1. The production V11 sheet applied separate `20px` horizontal padding values
   to the header, scroll body, and footer. There was no single element that
   owned the readable left and right boundary.
2. The Smart Capture confirmation action row escaped its parent body boundary
   with `margin: 12px -20px -20px` and a negative sticky offset.
3. The isolated Stage 2 decision, record, history, capture, and compact state
   sheets still rendered a second direct `V11GlassSheet` path instead of the
   shared production sheet shell.
4. The header used a flexible title and close button, but had no fixed shared
   close-action track or explicit content-safe frame contract.
5. The modal portal did not set a stable Safari text-size-adjust value.

The audit found no absolute-positioned user copy, `100vw` content wrapper,
horizontal text transform, or SVG width affecting the sheet's readable
boundary. Remaining `left: 0` and absolute positioning in the V11 stylesheet
belong to background, scrim, navigation shield, decorative, or debug layers.

## Shared hierarchy

All V11 sheet paths now use:

`Viewport -> outer material -> sheet-content-safe -> header / scroll body / footer -> rows`

The outer material owns viewport inset, rounded clipping, shadow, and height.
The content-safe frame owns all horizontal readable space. The frame uses
border-box sizing, `width/max-width: 100%`, `min-width: 0`, and logical
`padding-inline`.

Header layout is:

`minmax(0, 1fr) title track + 44px non-shrinking close track`

Rows keep leading/trailing controls fixed and allow the middle text track to
shrink and wrap. Footer content shares the exact same horizontal frame as the
header and body.

## Tokens

`v11SheetLayout` now defines:

- viewport inline inset: `12px` plus the device safe area;
- viewport top inset: `12px`;
- content inline padding: `20px`;
- content inline padding at `<=340px`: `18px`;
- content top padding: `8px`;
- content bottom padding: `20px`;
- header action slot: `44px`;
- header gap: `12px`;
- footer gap: `12px`;
- minimum mobile material-to-content clearance: `18px`.

## Geometry guard

Add `debugSheetSafeArea=1` to any V11 sheet URL. This mode:

- draws the content-safe rectangle;
- scans every visible element that directly carries user-facing text plus all
  buttons, text boxes, selects, and explicitly designated geometry nodes;
- checks both edges with a `1px` subpixel tolerance;
- reports component, node text/role, measured edges, and safe edges;
- stores `pass` or `fail` in
  `document.documentElement.dataset.v11SheetGeometryStatus`;
- exposes `window.__questlifeV11AssertSheetGeometry()` for an explicit QA
  assertion without continuous production measurement.

The check runs once after the sheet transition and re-runs only when debug
content changes. It is not a continuous production observer.

## Local responsive matrix

| Case | Outer left/right | Safe left/right | Minimum clearance | Overflow | Geometry |
|---|---:|---:|---:|---|---|
| Decision, 320x667, zh, dark | 12 / 308 | 30 / 290 | 18px | none | pass |
| Record, 375x667, zh, dark | 12 / 363 | 32 / 343 | 20px | none | pass |
| Detailed state, 393x852, zh, light | 12 / 381 | 32 / 361 | 20px | none | pass |
| Capture, 768x900, en, dark | 44 / 724 | 64 / 704 | 20px | none | pass |
| History, 1280x900, en, light | 300 / 980 | 320 / 960 | 20px | none | pass |

Additional checks:

- 320px English decision evidence at simulated 125% text scale: no horizontal
  overflow, no geometry violations, minimum clearance `18px`;
- 393x430 reduced-height Capture with focused multiline input: no horizontal
  overflow or geometry violation. This is a viewport/keyboard simulation, not
  physical iOS keyboard proof;
- integrated V11 Record Progress at 375x667: outer `12..363`, safe
  `32..343`, footer `32..343`, minimum clearance `20px`, zero issues;
- integrated Smart Capture plus Activity History at 375x667: both stacked
  sheets reported zero issues. The history sheet included long pending
  confirmation content and the widest capture row remained `32..343`;
- no new runtime errors. The existing Expo notifications web warning remains.

## Local screenshots

Before evidence already present from the prior correction pass:

- `/private/tmp/questlife-state-detail-before-dark-393.png`
- `/private/tmp/questlife-v11-record-sheet-375.png`

After:

- `/private/tmp/questlife-sheet-safe-decision-after-320.png`
- `/private/tmp/questlife-sheet-safe-integrated-record-after-375.png`
- `/private/tmp/questlife-sheet-safe-state-detail-393-zh-light.png`
- `/private/tmp/questlife-sheet-safe-activity-history-debug-375.png`
- `/private/tmp/questlife-sheet-safe-integrated-record-debug-final-375.png`
- `/private/tmp/questlife-sheet-safe-long-en-125-320.png`
- `/private/tmp/questlife-sheet-safe-keyboard-simulated-393.png`

The dashed rectangle appears only when `debugSheetSafeArea=1`.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- exported web bundle: `index-45333b247420225f3605fa2e41a15c4f.js`.
- no push or deployment performed.

## UNVERIFIED

- Physical iPhone Safari after-fix screenshots for `执行记录` and
  `查看判断依据`.
- Real iOS software-keyboard resize and footer clearance.
- Safari browser chrome expanded/collapsed transitions.
- Physical-device 125% text-size/accessibility setting.

These items require the user's physical iPhone Safari pass. Stage 2 must remain
pending until that pass is explicitly reported.

