# QuestLife V1 Integration Map

## Canonical lineage

Base: `9caf720` (`product/questlife-core-v1`, recorded core Preview acceptance).
Branch: `release/questlife-v1`. Main remains `c8c4387`. All existing branches
and worktrees are preserved. The original checkout's untracked `docs/quant/`
is not part of this integration. No production deployment is authorized.

The base already contains the durable assets below. No blanket merge is needed.
Historical preview success is not native/device verification or visual approval.

| Asset | Exact source | Treatment |
| --- | --- | --- |
| Canonical Today | tag `v11-today-approved`, recovery `06243c9`; current `HomeScreen`, `V11IntegratedTodaySurface` | KEEP structure and handlers; native presentation adapter only |
| Visual foundation | `6a4a891`, `design/global-theme-cleanup` | KEEP semantic tokens |
| Universal Capture | inherited `src/utils/universalCapture.ts`, `HomeSmartCapture`, `UniversalCaptureComposer`; capture polish `8fa3f3e` | KEEP parser/contracts/Store orchestration |
| Store and sync | `758abff` deletion protocol; `5cc73b3` serialized persistence; `46aaedb` provenance | KEEP, native transport adaptation only; no hydrate/bidirectional sync |
| Quant contracts | `c83b903`, `e277333`, `src/quant-product` | KEEP; no frontend statistics |
| Runtime client | `488b3cf`, `ownerQuantRuntime.ts`, `api/quant-runtime.ts` | KEEP fail-closed structured-data boundary |
| Schedule compiler | `601bc75`, compiler-only source `cb0f7c3` | KEEP domain only, exclude Schedule V3 redesign |
| Decision backend | `3ddeb3c` through `d1ca526`, core policy/patch/memory | KEEP; exact apply/undo authority |
| Insights function | `e277333`, `8ce6ec5`, Quant consumer and chart capabilities | PORT renderer, not rejected shell |

## Branch disposition

| Branch | Classification / scope |
| --- | --- |
| main | DEPRECATED as integration base; immutable production/history reference |
| design/questlife-product-v2 | KEEP canonical Today/capture assets already inherited |
| design/global-theme-cleanup | KEEP foundation already inherited |
| data/real-data-foundation-v1 | KEEP provenance/quality already inherited |
| integration/quant-product-layer-v1 | KEEP contracts already inherited |
| product/questlife-core-v1 | KEEP release base and shared backend |
| product/decision-surface-v3 | RESEARCH_ONLY visual candidate; do not import its later workspace/CSS changes |
| product/adaptive-decision-loop-v1 | KEEP domain; RESEARCH_ONLY explicit demo route |
| product/adaptive-decision-surface-v2 | KEEP inherited domain; REJECT demo/workflow as normal native destination |
| product/schedule-v3 | PORT compiler already inherited; REJECT later Schedule UI |
| product/insights-v3 | PORT quantitative consumer; preserve historical UI only as explicit web review |
| product/insights-v3-personal-layer | PORT factual presentation helpers; no blind shell merge |
| product/insights-final-lock | RESEARCH_ONLY visual candidate |
| product/insights-quant-terminal-v4 | PORT chart/model functionality already inherited |
| product/insights-v5-canonical-shell | REJECT shell, giant chart/navigation experiment |
| product/insights-presentation-reconstruction | KEEP inherited functionality; web reference, not native design authority |
| product/installable-mobile-shell-v1 | RESEARCH_ONLY PWA; not native installation evidence |
| demo/interview-20260825 | RESEARCH_ONLY; never owner data or primary navigation |

## Single destination ownership

Web retains its current product destination, not a newly selected rejected UI.
Native resolves `App.native.tsx`: Today = existing `HomeScreen` orchestration
with native V11 adapters; Goals = existing Goal stack; Schedule = existing
Schedule screen plus separately owned external commitments; Insights = native
Quant artifact consumer and platform chart; Settings = existing controls with
native source settings. All five destinations work without URL parameters.
Explicit development fixtures remain outside primary navigation.

## Today lock

`docs/design/TODAY_APPROVED_SOURCE.md` and Figma node `21:3` remain authoritative.
No new Today composition, scoring, or business logic is authorized. Native
changes preserve date/context -> capture/latest -> judgement/command -> state
-> compact plan; one outer vertical scroll owner. Platform screenshots are
parity evidence only and require owner review, never autonomous acceptance.
