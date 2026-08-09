# QuestLife Stage 3.8 Branding and Attribution Audit

## Scope

This audit covers the chart rendered only by the isolated
`questlife_v11_ui=stage3-personal-terminal` surface. It does not change the
production `StatsScreen`, Store, APIs, schemas, Quant Engine, Today, or
Schedule.

## Finding

- Library: `lightweight-charts`
- Installed version: `5.2.0`
- Package license: Apache License 2.0
- Previous visible mark: the library's default `layout.attributionLogo`
- Classification: optional in-chart attribution UI, not a manually added asset
  and not an unavoidable demo watermark

The official API documents `attributionLogo` as a boolean which defaults to
`true`. It explicitly permits disabling the in-chart logo when the page already
provides the required attribution notice and TradingView link.

## Implemented compliance path

The personal terminal now uses:

1. `layout.attributionLogo: false`, keeping third-party branding out of the
   analytical canvas.
2. A compact attribution row outside the chart canvas containing:
   `TradingView Lightweight Charts(TM) - Copyright 2025 TradingView, Inc.`
3. A visible link to `https://www.tradingview.com/`.

This follows the library's documented alternative attribution path. The
attribution remains user-visible and is not hidden by the product-clean QA
mode.

## Sources

- Installed package: `node_modules/lightweight-charts/package.json`
- Installed license: `node_modules/lightweight-charts/LICENSE`
- Package README license section: `node_modules/lightweight-charts/README.md`
- Layout option: https://tradingview.github.io/lightweight-charts/docs/5.1/api/interfaces/LayoutOptions
- License and attribution: https://tradingview.github.io/lightweight-charts/docs/5.0
- Upstream notice: https://github.com/tradingview/lightweight-charts/blob/master/NOTICE

## Result

No TradingView logo is rendered inside the QuestLife product canvas. Required
attribution remains available in a compliant, non-confusing location below the
terminal.
