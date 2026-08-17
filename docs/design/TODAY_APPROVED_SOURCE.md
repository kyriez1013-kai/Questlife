# Approved Today Source

Status: CANONICAL V11 TODAY

## Git identity

- Historical visual source: `806b441da475c7946581ec3ce1208e707b958a8c`
  (`defer V11 record feedback derivation`, 2026-08-06).
- Final pre-Stage-3 integration baseline: `5e51cf33f8268631843df0510755b8ec5271f07d`
  (`serialize cross-tab persistence writes`, 2026-08-07).
- Modern QuestLife baseline at recovery: `b29ad6b00a79392f2f27101c3ffd3377a2441f47`.
- Canonical recovery commit: `06243c9bbc10aa1cd7b24cf0333d94a0d2bdebfd`
  (`restore approved V11 Today`, 2026-08-17).
- Fixture-label cleanup commit: `97fd4f3` (`remove stage2 fixture banner`).
- Canonical tag: `v11-today-approved`, pointing to `06243c9`.

Git blob comparison confirmed that the approved Today presentation files at
`806b441` are byte-identical at the modern baseline. Recovery therefore does
not replace current Quant, Insights, interpretation, persistence, Goal,
Schedule, or Settings work.

## Canonical routes

- Isolated Today parity route: `?questlife_v11_ui=stage2`
- Current full-product route: `?questlife_v11_ui=v11-marathon`
- No flag: legacy Today rollback remains available.

## Principal files

- `src/screens/HomeScreen.tsx`
- `src/screens/HomeSmartCapture.tsx`
- `src/v11-stage2-rebaseline/V11IntegratedTodaySurface.tsx`
- `src/v11-stage2-rebaseline/V11Stage2ProductionSheet.tsx`
- `src/v11-stage2-rebaseline/v11-stage2-rebaseline.css`
- `src/components/today/V11ActivityHistorySheet.tsx`
- `src/components/today/V11RecordProgressForm.tsx`
- `src/v11/components/V11SheetControls.tsx`
- `src/v11/todayPresentation.ts`

## Accepted signature

The canonical Today contains date/context, Smart Capture, one latest-record
summary, one judgement, one executable `todayCommand`, 1-5 state calibration,
Instant Read, a compact Today Plan of up to three rows, Activity History through
the latest/history route, V11 sheets, and the five-tab navigation. It has no
permanent giant Recent Execution block and no synthetic preselected empty
state.

Historical QA and real renders were compared at 320x667, 375x667, 393x852,
and 1280x900. The primary Figma source uses 393x852 dark mode.

## Figma source

- File: `QuestLife — Product Design Lab V2`
- File key: `J51kDHRfrtRg2m56guVDBz`
- Page: `00 — APPROVED TODAY SOURCE`
- Canonical node name: `TODAY / APPROVED SOURCE OF TRUTH / 393 / DARK`
- Canonical node ID: `21:3`
- Canonical node URL:
  `https://www.figma.com/design/J51kDHRfrtRg2m56guVDBz/QuestLife-%E2%80%94-Product-Design-Lab-V2?node-id=21-3`
- External label: `IMMUTABLE — DO NOT REDRAW — DO NOT REPLACE` (node `21:5`)
- Source node state: locked in Figma.

The canonical node is a direct 393x852 dark-mode capture of the deployed web
implementation. It is not a redraw, generated mockup, fixture-data render, or
manual reconstruction.

## Deployment verification

- Vercel deployment: `dpl_8PyVX4nUjQWTVWJCDbUBX7ThFVcq`
- Preview alias:
  `https://questlife-alpha-git-design-questlife-05a1d8-kyrie-z-s-projects.vercel.app`
- Verified route:
  `/?questlife_v11_ui=v11-marathon&debugTheme=dark&debugLanguage=zh`
- Verified bundle: `index-e228c8f4bcd2214c53e048786912f745.js`

The deployed UI was checked with real Store data. The QA fixture banner is not
present, the compact three-item Today Plan remains present, all five tabs load,
and removing the V11 flag restores the complete legacy Today immediately.

## Future reference contract

The exact Figma node recorded in this document is the only valid visual source
for future QuestLife Today work. The following generated recreations are
rejected and must not be used as references:

- V11 Direction Lock Today
- V11 Direction Lock V2 Today
- Four-Screen Product Today
- other generated or manually redrawn Today mockups

Do not replace the canonical source unless the user explicitly approves a newer
Today and this document and tag are deliberately superseded.

## Known design-system debt

Some secondary controls may retain historical blue-token leakage. This is
documented debt, not permission to redesign the recovered baseline.
