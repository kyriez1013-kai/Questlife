# QuestLife Stage 3.13 Market UX Research

## Scope

This review studies interaction patterns, not visual branding or financial
semantics. Sources were current public product documentation from TradingView,
Webull, and Koyfin. QuestLife remains a personal observation product: it does
not introduce trading actions, P&L language, a Life Score, or causal claims.

## What Professional Products Do Well

### Watchlists are working navigation

TradingView treats a watchlist as a persistent, customizable entry point: users
add and remove instruments, create sections, reorder items, choose compact row
or table presentation, and control which metrics are visible. Webull makes the
mobile edit path explicit and also supports hold-and-drag ordering. Koyfin lets
the same watchlist drive charts and other widgets, so choosing an item changes
the analytical context rather than opening an unrelated report.

QuestLife should adopt a compact `My Watchlist` made from real available
instruments: passive observations, state measures, Goals, and Skills. Each row
needs current value, reference-relative state, a small maturity cue, and a
bounded mini-series. Tap changes the main chart. Edit mode provides add, remove,
pin, and accessible reorder; long-press drag is an enhancement, not the only
path. The default list is capability-driven, while user order remains a
presentation preference.

### Range and interval are different controls

TradingView exposes favorites and custom chart intervals, and its chart model
separates the visible date range from how bars are aggregated. This distinction
is essential for QuestLife: `30D visible / 3D candle bucket` is meaningful,
while treating those as one control is not. Quick ranges should be short and
user-configurable; an adjacent compact sheet handles arbitrary last-N-day and
calendar ranges. Only ranges and candle buckets declared by the existing Quant
artifact can be selected.

### The chart owns direct manipulation

TradingView's mobile guidance assigns pan to direct drag, pinch to scale, and
long press to crosshair/tracking. It hides or relocates desktop-only widgets on
small screens instead of compressing all controls. Webull similarly places
indicators and chart tools in chart settings rather than in a long report.

QuestLife should keep a small chart command bar for View, Indicators, Compare,
Events, and More. Pan, pinch, long-press inspection, and marker tap happen in
the chart. Reset belongs in contextual overflow or a small in-chart action.
The page scroll and chart gestures need explicit ownership so vertical browsing
does not fight horizontal analysis.

### Workspaces preserve analytical context

TradingView can synchronize symbol, crosshair, interval, time, and date range
independently across a multi-chart layout. Koyfin and Webull use draggable,
resizable widgets and saved layouts; Koyfin groups linked widgets so a
watchlist selection can update several charts.

QuestLife should adapt this to independent personal instruments. Desktop can
offer 1/2/4/6 panes with bounded, lazily initialized series. Mobile should use
single view, two stacked panes, and a compact Market Board rather than tiny six
pane charts. Sync Time and Sync Crosshair are explicit and non-causal. Saved
workspaces are isolated presentation preferences such as Daily, Study,
Fitness, and Recovery.

### Density comes from alignment and disclosure

Koyfin's compact tables and reusable dashboard views show that density comes
from aligned rows, controlled columns, and reusable settings, not from many
large cards. Mobile products preserve the main chart and move deep tools into
menus or sheets.

QuestLife should keep the core instrument loop within roughly one mobile
viewport: compact header and reading, main chart, range/tools, one Analyst line,
one Signal line, and one Evidence status. Analyst expands from collapsed to
peek to Sheet. Evidence opens a dedicated Sheet. Advanced tools are available
without becoming permanent page height.

## What QuestLife Should Not Copy

- No BUY/SELL, bullish/bearish, P&L, portfolio value, or market-color morality.
- No price-oriented OHLC calculation in React; only render existing
  observational Quant artifacts.
- No dense desktop toolbar squeezed onto mobile.
- No unlimited indicators, comparison rainbows, or six tiny phone charts.
- No watchlist sorting that implies one personal domain is financially more
  valuable than another.
- No invented confidence percentage, readiness score, or single Life Score.
- No copied layouts, icons, chart styling, names, or copyrighted assets.

## Personal-Data Adaptation

The professional terminal object becomes a real personal instrument. `Current`
is the latest valid observation, `Reference` is the existing personal baseline,
and `Change` uses the artifact's supported comparison. Evidence reports
measurement coverage and provenance, never probability. Signals remain
observational and show support plus counterexamples. Goal and Skill instruments
must be first-class watchlist items, not buried after passive data.

The resulting model is:

`Watchlist -> Instrument -> Chart -> Analyst / Signal / Evidence -> Today`

It reduces willpower by making the important personal variables glanceable,
while preserving deeper professional controls through progressive disclosure.

## Public Sources

- [TradingView watchlists](https://www.tradingview.com/support/solutions/43000745825-mastering-the-tradingview-watchlists/)
- [TradingView custom intervals](https://www.tradingview.com/support/solutions/43000543883-custom-chart-intervals-personalizing-your-analysis/)
- [TradingView multi-chart synchronization](https://www.tradingview.com/support/solutions/43000629992-how-to-sync-the-charts-of-my-layout/)
- [TradingView mobile chart behavior](https://www.tradingview.com/charting-library-docs/latest/mobile_specifics/)
- [Webull mobile watchlist editing](https://www.webull.com/learn/courseware/5iG6Rz/Create-Your-Own-Watchlist)
- [Webull customizable desktop layouts](https://www.webull.com/trading-platforms/desktop-app)
- [Koyfin dashboards](https://www.koyfin.com/help/mydashboards-myd/amp/)
- [Koyfin linked dashboard groups](https://www.koyfin.com/help/my-dashboards-groups/)
