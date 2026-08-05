# QuestLife V11 Stage 2 Capture Composer and History Routing QA

Date: 2026-08-06

Scope: isolated `questlife_v11_ui=stage2-rebaseline` route only.

## Root cause

The previous capture sheet did not render a composer row. The multiline input and send action were separate vertical children. The input inherited the sheet content width, while the pill-based send action also filled the sheet width. The shared sheet button intentionally keeps `width: 100%` for footers, so changing that default would have regressed State and Record Progress actions.

The correction adds an explicit compact composer action and a dedicated grid:

- input column: `minmax(0, 1fr)`
- action column: `50px`
- gap: `10px`
- input: `min-width: 0`, grows from `92px` to `156px`, then scrolls internally
- action: fixed `50 x 50px`, never flex grows

No negative margin, absolute positioning, Store change, API change, schema change, persistence change, or production capture handler change was introduced.

## Routing decision

The rebaseline Today surface has one history route:

`latest-record summary -> Activity History`

There is no collapse, hide, record-count selector, or intermediate history menu in this route. Activity History displays its real fixture count and keeps record detail navigation.

The `history=0|1|3` query is non-persisted QA fixture control only.

## Before and after geometry

At 375px viewport width:

| Measurement | Before | After |
| --- | ---: | ---: |
| Sheet content / composer width | 311px | 311px |
| Input width | 311px | 251px |
| Send action width | 311px full row | 50px fixed |
| Input/action gap | separate stacked rows | 10px |
| Text/action overlap | 0px, but no visible composer row | 0px |
| Horizontal overflow | 0px | 0px |

Final browser measurements:

| Viewport | Composer | Input | Action | Gap | Overlap | Overflow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 320 x 667 | 260px | 200px | 50px | 10px | 0px | 0px |
| 375 x 667 | 311px | 251px | 50px | 10px | 0px | 0px |
| 393 x 852 | 329px | 269px | 50px | 10px | 0px | 0px |
| 1280 x 900 | 640px | 580px | 50px | 10px | 0px | 0px |

## Local browser verification

Passed locally:

- empty composer: input visible; send disabled
- short Chinese input
- three-line Chinese input
- long English input in light theme
- loading-disabled send state
- parse failure retains original text
- retry reaches pending confirmation
- pending confirmation stays in the same Sheet with sticky actions
- confirm updates the non-persisted latest-record fixture and history count once
- latest summary opens Activity History directly
- Activity History fixtures with 0, 1, and 3 records
- no intermediate history-choice labels
- no console errors
- dark and light fixture states
- 320, 375 x 667, 393 x 852, and 1280 x 900

The simulated 393 x 430 viewport confirms the composer remains inside the visible content-safe region. A physical soft keyboard was not created by browser automation.

## Screenshot artifacts

- `/private/tmp/questlife-v11-capture-empty-375.png`
- `/private/tmp/questlife-v11-capture-short-zh-375.png`
- `/private/tmp/questlife-v11-capture-multiline-zh-375.png`
- `/private/tmp/questlife-v11-capture-long-en-light-393.png`
- `/private/tmp/questlife-v11-capture-keyboard-simulated-393.png`
- `/private/tmp/questlife-v11-capture-loading-375.png`
- `/private/tmp/questlife-v11-capture-error-375.png`
- `/private/tmp/questlife-v11-capture-pending-375.png`
- `/private/tmp/questlife-v11-latest-summary-393.png`
- `/private/tmp/questlife-v11-history-0-375.png`
- `/private/tmp/questlife-v11-history-1-375.png`
- `/private/tmp/questlife-v11-history-3-393.png`
- `/private/tmp/questlife-v11-capture-empty-320.png`
- `/private/tmp/questlife-v11-capture-desktop-1280.png`

## Verification boundary

- Physical iPhone Safari keyboard and Visual Viewport behaviour: **UNVERIFIED**
- Real Store-backed parse, confirm, deletion, and refresh persistence: unchanged and **UNVERIFIED in this isolated fixture pass**
- Production: not deployed or tested by task constraint
- Real HomeScreen integration: not started
- Stage 3: not started

