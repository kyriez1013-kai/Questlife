# Native foundation visual evidence

Date: 2026-09-12. These are development QA captures, not production/device
acceptance. Android is an API 36 Pixel 7 emulator (1080x2400, density 420,
software GPU). Web is Chromium at 393x852, **not physical iPhone Safari**.

## Android application

| Screenshot | Verified scope |
| --- | --- |
| [Today](screenshots/android-today.png) | Shared Today hierarchy, real empty local Store, five native tabs |
| [Capture with keyboard](screenshots/android-capture-keyboard.png) | Text input, send and close above actual Android IME; input cancelled, not saved |
| [Direct Log](screenshots/android-direct-log.png) | Existing source, prediction and actual-result fields, sticky footer |
| [Direct Log keyboard](screenshots/android-direct-log-keyboard.png) | Notes and Save remain above keyboard |
| [Saved QA record](screenshots/android-log-saved.png) | One-minute explicitly named isolated test record |
| [Record after restart](screenshots/android-log-restarted.png) | Same record survives full native app restart |
| [Deleted and restarted](screenshots/android-log-deleted-restarted.png) | Latest record empty; persisted record and derived-row counts zero |
| [Connected Sources](screenshots/android-settings-sources.png) | Real disconnected states and contextual permission controls |
| [Calendar OS permission](screenshots/android-calendar-permission.png) | Actual emulator OS Calendar permission prompt |
| [Notification OS permission](screenshots/android-notification-permission.png) | Actual emulator OS notification permission prompt |
| [Notification enabled](screenshots/android-notifications-enabled.png) | Temporary morning reminder enabled; subsequently cancelled and all toggles off |
| [Schedule](screenshots/android-schedule.png) | Existing day timeline and navigation; no invented events |
| [Goals](screenshots/android-goals.png) | Existing Goals screen empty state |
| [Insights](screenshots/android-insights.png) | Owner-mode empty artifact consumer; no configured API, no fake series |

## Native chart, explicitly synthetic

The following are from the separate `__DEV__` renderer fixture. They do not prove
live ingestion or owner Quant results. Existing materialized fixture artifacts
were rendered in the real native WebView without Store or network access.

| Screenshot | Scope |
| --- | --- |
| [Line](screenshots/android-chart-line.png) | Local line renderer, baseline references, current marker |
| [Candle and crosshair](screenshots/android-chart-candle-crosshair.png) | Existing observational candle values and long-press selected readout |
| [Bar, light theme](screenshots/android-chart-bar-light.png) | Light chart, readable status bar, no stale selection after model change |

## Web regression, Chromium viewport only

| Screenshot | Scope |
| --- | --- |
| [Today](screenshots/web-today-393.png) | Ordinary route, accepted web presentation retained |
| [Capture](screenshots/web-capture-393.png) | Web sheet still opens |
| [Goals](screenshots/web-goals-393.png) | Goal destination |
| [Schedule](screenshots/web-schedule-393.png) | Schedule destination |
| [Insights](screenshots/web-insights-393.png) | Insights destination |
| [Settings](screenshots/web-settings-393.png) | Settings destination |

Native iPhone screenshots, physical keyboard/safe-area checks and full dark/light
native-screen parity remain UNVERIFIED. No browser screenshot is relabelled as
native iOS. OS alert styling and retained Goal/Schedule presentation differences
are owner-review items, not a new approved visual direction.
