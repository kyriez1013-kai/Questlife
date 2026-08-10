# QuestLife Stage 3.11 - Lightweight Charts License and Attribution Audit

Checked: 2026-08-11

## Installed package

- Package: `lightweight-charts`
- Installed version: `5.2.0`
- Declared dependency: `^5.2.0`
- License: Apache License 2.0
- Creator and copyright holder identified by the installed package:
  TradingView, Inc.; Copyright 2023 TradingView, Inc.

## Evidence inspected

- `node_modules/lightweight-charts/LICENSE`
- `node_modules/lightweight-charts/README.md`
- `node_modules/lightweight-charts/package.json`
- Official Lightweight Charts repository and API documentation

The installed npm package contains `LICENSE` but no `NOTICE` file. Its README
requires the product to identify TradingView as the creator and provide a link
to `https://www.tradingview.com/` on a page available to users. The README says
the chart's optional `attributionLogo` can satisfy the link requirement; it
does not say that the logo itself or chart-adjacent attribution is mandatory.

## Apache 2.0 obligations relevant to QuestLife

QuestLife must retain the applicable copyright and license notice, make the
Apache 2.0 license available with the distributed product, identify material
modifications if the library itself is modified, and preserve applicable
notices supplied with the work. QuestLife does not modify the library source.

The installed package's additional creator-attribution instruction is met by a
user-accessible Settings surface containing:

- `Lightweight Charts(TM) 5.2.0, created by TradingView`
- `Copyright 2023 TradingView, Inc.`
- a link to `https://www.tradingview.com/`
- a link to the v5.2.0 Apache 2.0 license text

## Product treatment

- `layout.attributionLogo` remains disabled.
- The chart-adjacent TradingView footer is removed from the isolated Personal
  Quant Terminal.
- Required attribution is available under Settings -> About and legal -> Open
  source and third-party notices while the isolated terminal feature flag is
  active.
- QuestLife does not present TradingView branding as its own branding or imply
  endorsement.

## Conclusion

The installed package materials permit a clean chart surface when creator
attribution and the TradingView link remain available elsewhere in the app.
No chart-adjacent logo requirement was found. This is an engineering license
audit, not legal advice.

## Primary sources

- https://github.com/tradingview/lightweight-charts
- https://github.com/tradingview/lightweight-charts/blob/v5.2.0/LICENSE
- https://tradingview.github.io/lightweight-charts/docs/5.1/api/interfaces/LayoutOptions
