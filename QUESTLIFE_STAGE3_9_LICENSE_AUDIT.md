# QuestLife Stage 3.9 Chart Library and Attribution Audit

Checked: 2026-08-10

## Installed package

- Package: `lightweight-charts`
- Installed version: `5.2.0`
- Declared range: `^5.2.0`
- License metadata: `Apache-2.0`
- Author / upstream: TradingView, Inc.

## Attribution obligation

The upstream project distributes a `NOTICE` attribution and its documentation
requires an attribution notice plus a link to `https://www.tradingview.com/`
on a user-accessible page. The chart option `layout.attributionLogo` is one
permitted way to provide the link, but the official API documentation states
that it can be disabled when the requirement is fulfilled elsewhere.

QuestLife treatment:

1. `layout.attributionLogo` remains `false`, so third-party branding does not
   appear inside the primary QuestLife analytical canvas.
2. A quiet technology/legal footer outside the canvas retains:
   `TradingView Lightweight Charts(TM) - Copyright 2025 TradingView, Inc.`
3. The footer includes a user-accessible `https://www.tradingview.com/` link.
4. The footer is visually separated from QuestLife branding and cannot read as
   a QuestLife logo or product endorsement.

This preserves the installed library and avoids an unnecessary engine rewrite.
No alternative library is recommended in Stage 3.9 because the library allows
custom canvas styling, custom series, multiple panes, and external compliant
attribution. Reconsider only if a later implementation requires rendering that
the engine cannot express without branded visual constraints.

## Sources

- Installed `node_modules/lightweight-charts/package.json`
- Installed `node_modules/lightweight-charts/LICENSE`
- Installed `node_modules/lightweight-charts/NOTICE`
- https://github.com/tradingview/lightweight-charts
- https://github.com/tradingview/lightweight-charts/blob/master/NOTICE
- https://tradingview.github.io/lightweight-charts/docs/5.1/api/interfaces/LayoutOptions
- https://tradingview.github.io/lightweight-charts/docs/api

