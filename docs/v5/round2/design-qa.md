# V5 Round 2 Design QA

## Source and actual delivery

- Selected reference: exact `docs/v5/prototype/` HTML, final computed CSS including `refine.css`.
- Actual candidate: https://questlife-v1-release.vercel.app/
- Runtime source commit: `c8bfdb48b075f8e12350599240f6e07850809d4a`.
- No fixture injection or Owner data used for deployed screenshots.

## Measured corrections

- Five default tabs use V5. Explicit `v5_ui=0` retains the legacy entry.
- Today/Goals 17px horizontal margins; Schedule/Analysis/Personal 14px.
- Source glass fill, shadow, blur, icon tiles and navigation geometry are reused.
- Deployed comparison prompted correction of Goals width, Analysis header/segments, Schedule timeline note and Personal header dimensions.
- Source fake 44px OS status bar is not duplicated on the website. Original full frame remains visible in comparisons.
- Source empty Today card is intentionally compacted under the explicit rejection request.

## Evidence

See `deployed-browser-evidence.json` for actual version, screenshots, bounds, page text, overflow and runtime messages. `pair-*` is reference on the left and actual deployed capture on the right. `overlay-*` is 50% original-size blending. `before-*` is the previous deployment, not a substitute for the reference.

## Open failures / limitations

- No dedicated persisted candidate demo account is available; five populated pages, suggested Today and populated dark Today are not verified. Local interaction records do not satisfy this requirement.
- Returning-user QA contamination is traced to a previous local QA goal in the existing ledger, but its present stable ID and ownership were not available. No guessed deletion or hidden name filter was implemented.
- Health/Shortcut text and some legacy secondary forms do not exactly match the static prototype.
- No original dark frame exists, so no claimed dark pixel match.
- No physical iPhone, keyboard, cloud-data, remote parsing or full workflow acceptance in this pass.
- Current gate: pending Claude screenshot review. Not approved by the implementer.
