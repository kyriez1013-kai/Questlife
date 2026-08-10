# QuestLife Stage 3.11 - Chart Engine Feasibility Audit

Checked: 2026-08-11

## Decision

Keep `lightweight-charts` 5.2.0 as the low-level renderer. There is no current
product justification for building a custom QuestLife chart engine.

## Capability estimate

| Capability | Current renderer | Custom production implementation estimate |
| --- | --- | ---: |
| Time and value scales | Available | 2-4 engineer-weeks |
| Pan, wheel zoom, and pinch zoom | Available | 3-5 engineer-weeks |
| Crosshair and touch inspection | Available | 2-4 engineer-weeks |
| Retina rendering and responsive resize | Available | 2-3 engineer-weeks |
| Line, bar, candle, and range rendering | Available | 4-7 engineer-weeks |
| Multi-pane layout and synchronized scales | Available | 4-7 engineer-weeks |
| Markers, event hit testing, and annotations | Available/customizable | 3-6 engineer-weeks |
| Missing intervals and time-axis labels | Available/customizable | 2-4 engineer-weeks |
| Mobile 60fps hardening | Mature baseline | 5-10 engineer-weeks |
| Keyboard and screen-reader accessibility | Requires QuestLife overlay work | 3-6 engineer-weeks |
| Regression matrix and long-term maintenance | Upstream-supported | 6-10 engineer-weeks initially, ongoing |

These workstreams overlap, but a credible custom MVP is approximately 12-18
engineer-weeks. A production renderer with mobile interaction, accessibility,
cross-browser behavior, and regression coverage is approximately 28-45+
engineer-weeks, followed by permanent maintenance cost.

## Product fit

QuestLife's identity lives above the renderer:

- personal reference bands
- historical-to-active provenance transition
- human event rails
- observational scalar candle semantics
- Signal and evidence inspection
- Goal and Skill scope
- contextual Analyst briefs

All are expressible with the current renderer plus QuestLife-owned overlays and
presentation. The library does not require visible in-chart branding when the
documented attribution is provided on another user-accessible app surface.

## Reconsider only if

- a required QuestLife visualization cannot be represented without falsifying
  data semantics;
- renderer constraints prevent measured mobile performance targets;
- accessibility cannot be met through semantic overlays;
- licensing terms materially change.

Branding preference alone is not sufficient justification for a chart-engine
rewrite.
