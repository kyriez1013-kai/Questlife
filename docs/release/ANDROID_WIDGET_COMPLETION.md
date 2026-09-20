# Android Home-Screen Widget

Date: 2026-09-20. Checkout: `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`.
Scope: the bounded Android widget follow-up. No iOS WidgetKit/AppIntents work.

## Delivered

- `plugins/with-questlife-widget.js`: dependency-free Expo config plugin using the
  installed `@expo/config-plugins` and Android platform RemoteViews APIs.
- `tests/native/widget.test.cjs`: plugin, contract, resources and native compiler
  checks, generating files only in an isolated temporary directory.
- This report.

No app.json, native application/navigation, intent bus, shortcut contract, Store,
HomeScreen, dependency or live generated Android project edits by this worker.
No account/device data reads, writes, automatic record submission or plan change.
No commit, push, deployment, external service or dependency installation.

## Behavior and Boundaries

| Visible entry | Chinese | Fixed deep link | Shared contract |
| --- | --- | --- | --- |
| Record | 记录 | `questlife://capture` | `OPEN`, `quick_capture` |
| Current plan | 当前计划 | `questlife://plan` | `OPEN`, `current_plan` |

The native code does not reproduce business routing. It sends explicit immutable
activity PendingIntents to the existing singleTask MainActivity. The existing
Linking coordinator and `src/platform/shortcuts/intent.ts` remain authoritative.
Different URLs and widget IDs distinguish PendingIntents. No intent extras,
query parameters, broadcast/service launch trampoline or automatic `send()`.

The parent added `plan` to the shared contract during this task; both URLs now
pass tests against the actual `deepLinkIntent` and `shortcutIntent` functions.
The native plugin requires no new business bridge. At the last source inspection,
the parent's coordinator-to-Schedule navigation wiring was still in progress;
contract acceptance alone does not prove that the app opens the correct screen.

Two full-width native Buttons are stacked with an 8dp gap, each at least 48dp
high and wide. Padding/target dimensions mirror existing QuestTheme/layout
tokens, with an automated drift check. Android owns button typography, focus,
pressed state and light/dark colors; no custom fixed palette or animation.
The framework theme uses API-14-compatible light/dark parents, not the
API-29-only DeviceDefault.DayNight resource on older Android releases.

English fallback and Chinese Android string resources cover five localized
labels/descriptions. The brand remains QuestLife. These are isolated widget
resources, not additions to global JS i18n. Locale and appearance follow Android
resources, not an app-specific Store preference; no preference bridge is added.
The launcher can resize the widget above its 180dp by 176dp minimum. Text wraps
and retains system font scaling. Actual launcher/font-size layout is still an
APK acceptance item, not inferred from XML checks.

This is an entry widget, not a plan-data widget: no metrics, scores, counts,
streaks, cached user records, health data or invented empty-state content. The
receiver is non-exported; widget category is home_screen only. Updates occur on
widget creation/update/resize and locale/app replacement events, with periodic
updates disabled (`updatePeriodMillis=0`). No permission, background worker,
alarm, service, native storage or network client is introduced.

On API 35+ the activity PendingIntent uses the documented creator background
launch opt-in, guarded by the runtime API level. The intent remains immutable
and targets only the existing app activity; it is attached only to user-clicked
widget buttons. Android 36 emits a deprecation warning for the API-35-compatible
`MODE_BACKGROUND_ACTIVITY_START_ALLOWED` constant; compilation succeeds.

## Generated Files

After parent registration/prebuild, the plugin adds one receiver to the Android
manifest and writes only these owned files under `android/app/src/main`:

- `java/<android.package path>/widget/QuestLifeWidgetProvider.kt`
- `res/layout/questlife_widget.xml`
- `res/xml/questlife_widget_info.xml`
- `res/values/questlife_widget.xml`
- `res/values-night/questlife_widget.xml`
- `res/values-zh/questlife_widget.xml`

Manifest insertion is idempotent, including fully qualified receiver names.
Other receivers, permissions and activities are preserved. Generation overwrites
only the plugin's six files; unrelated resources remain unchanged. Missing
scheme, unsafe package names or an unexpected MainActivity launch mode fail
explicitly. Generated native folders remain disposable.

## Verification

| Check | Result |
| --- | --- |
| Plugin syntax | Passed |
| Plugin/contract/native checks | 12/12 passed, none skipped in the full run |
| Shared action contract | Both URLs resolve to the agreed OPEN kinds; mutation query parameters rejected |
| Existing shortcut boundary checks | 19 assertions passed |
| Generated XML | Parsed by Expo's installed structured XML parser |
| Native resources | Android 36 AAPT2 compile and link passed, min API 26 / target API 36 |
| Native Kotlin | Kotlin 2.1.20 compiler passed against Android 36 framework APIs and linked R resources |
| Whole-checkout TypeScript | Blocked in the latest check by concurrent `src/platform/deviceRepository.ts:30` TS2345, outside this worker's scope |
| Installed widget / final APK | Not run by this worker; parent-owned acceptance |

The Kotlin check stubs only the MainActivity class symbol with an empty Android
Activity. It does not compile React Native, exercise navigation, assemble/sign an
installable application, or validate a launcher/device. Native API calls and
generated R references are checked against the real SDK. All generated test
files are removed from their temporary directory afterward. The compiler and
SDK were already installed; these checks download nothing.

Run the portable plugin/contract checks:

```sh
node --check plugins/with-questlife-widget.js
node --test tests/native/widget.test.cjs
```

The native compiler check is explicitly skipped unless enabled. Full local run:

```sh
QUESTLIFE_WIDGET_COMPILE=1 \
ANDROID_HOME=/Users/kyrie/Library/Android/sdk \
JAVA_HOME=/Users/kyrie/Library/QuestLifeToolchain/jdk/Contents/Home \
node --test tests/native/widget.test.cjs
```

That check uses already-cached Kotlin 2.1.20 compiler artifacts from
`$GRADLE_USER_HOME/caches` (default `~/.gradle/caches`), plus AAPT2/Android 36.
Different build machines may need their existing toolchain paths supplied.

## Parent Integration and APK Acceptance

1. Register `"./plugins/with-questlife-widget"` in Expo plugins. This worker did
   not edit app.json or run prebuild against the live checkout.
2. Finish the agreed `current_plan` open-only navigation to existing Schedule,
   including cold-start readiness. Keep capture on the existing review UI and
   preserve account/onboarding checks. Do not map plan to a decision action.
3. Prebuild/regenerate Android, rebuild the signed release APK and reinstall.
   A previous APK cannot contain this newly generated provider/resources.
4. Add QuestLife from the launcher widget picker. Check both buttons after a
   cold process start and while the app is already open on another screen.
   Confirm Record only opens capture and Current plan only opens Schedule;
   neither tap creates a record, changes a plan or saves anything automatically.
5. Check repeated taps, two widget instances, resize, remove/re-add, and app
   replacement; verify the two destinations do not alias one another.
6. Check English/Chinese, light/dark system modes, larger fonts, TalkBack labels,
   and physical target/layout bounds on an older supported Android release and
   Android 15/16. Retain screenshots and real APK/device evidence in the parent
   ledger. No physical-device, sustained performance or launcher result is
   claimed in this report.

iOS AppIntents/Widget signing remains a separate parent work item. There is no
Android architectural blocker requiring a new native business bridge.

## Official References

Read before implementation:

- [Expo SDK 54 reference](https://docs.expo.dev/versions/v54.0.0/)
- [Expo config plugins](https://docs.expo.dev/config-plugins/plugins/)
- [Android RemoteViews widget components](https://developer.android.com/develop/ui/views/appwidgets)
- [Android widget themes and previews](https://developer.android.com/develop/ui/views/appwidgets/enhance)
- [Android PendingIntent](https://developer.android.com/reference/android/app/PendingIntent)
- [Android activity launch security](https://developer.android.com/guide/components/activities/secure-bal)
- [Framework theme availability](https://developer.android.com/reference/android/R.style)
