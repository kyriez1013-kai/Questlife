# Native Goals / Schedule / Settings UI Slice

Date: 2026-09-20. Baseline: `507d0a5`, branch `release/questlife-v1`.
Actual checkout: `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`.

## Scope And Status

**IMPLEMENTED; VERIFIED_LOCAL for the checks below. Not VERIFIED_DEVICE or VERIFIED_REMOTE.**
This is the bounded native UI contribution, not a claim that the owner's full end-to-end release is complete.

Read `AGENTS.md`, `EXECUTION_RULES.md`, and the owner's `QUESTLIFE_END_TO_END_COMPLETION.md`.
The explicit task overrides the old commit/push/deploy instructions. No commits, pushes, deployments, production data edits, storage migrations, navigation edits, API edits, schema edits, or lockfile edits were made by this worker. The later user-authorized Web Settings follow-up changes only Settings copy keys in shared i18n, the existing Settings screen, and its regression tests.
Other workers' concurrent changes were retained.

## Implemented

### Goals, Modules, Skills

- Preserved existing Goal list -> Goal detail -> module -> Skill detail/library navigation and canonical GoalForm/SkillForm store actions.
- Native skill-library search, empty/search-result states, explicit edit/delete controls, propagation-safe nested actions, and a 44-point Back target.
- Search existing skills when linking a module; linking still uses `addExistingSkillToModule`, and removal still removes a reference rather than deleting the skill.
- Module create/edit/delete entries retained. Native module editor now exposes Up/Down reorder, normalizing only the existing `order` fields through `updateModule`; IDs, goal membership and skill links are preserved.
- Follow-up semantics review found no existing cross-goal module move entry or requirement. The owner brief's move requirement belongs to Schedule, not Goals. No new store action, context method, or cross-goal feature was added. Module links remain owned by their original goal, and unlinking still preserves the library skill.
- No mastery, contribution, or capability scores were invented.

### Schedule

- Native date navigation and OS date/time controls for create/edit; Web retains its existing text controls.
- NativeDateTimeField display now uses explicit `Intl.DateTimeFormat` with `zh-CN` / `en-AU` and mode-specific date/time options, avoiding Date's locale shortcuts after the reported Android Hermes mismatch. Stored values, picker behavior and explicit `24:00` labels are unchanged. This is a display-only fix; current Android release confirmation remains with the device run.
- Real local-calendar date validation, bounded HH:mm values, positive duration validation, and legal `24:00` end support.
- Native midnight end selection is converted from the OS clock's `00:00` to the canonical same-day `24:00` boundary. Start selection remains `00:00`; Web entry is unchanged.
- Inline overlap warning and explicit conflict confirmation before saving. The editor includes its target date when requesting generated/external constraints, including dates outside the visible week.
- Existing completion status and source survive native edits. A changed/deleted record while the editor is open is not silently overwritten.
- Manual block create/edit/delete remain canonical store actions, with destructive confirmation. Editing a plan does not create execution evidence.
- Imported system-calendar constraints do not expose the native execution-log action.
- Persisted blocks have an explicit System Calendar action: choose a writable calendar, then call the existing `createForBlock` service with explicit consent. Read-only calendars cannot receive writes.
- Calendar "Saved" is only shown for an owned event whose linked block, title and timestamps match, with the event's last successful timestamp. It is not account sync, background completion, or a cloud-write acknowledgment.
- The UI explicitly states that plan changes/deletion do not automatically change/delete system-calendar events. External events remain individually managed in Settings.

### Settings And Calendar Editor

- Appearance and language controls now call the existing `setSettings` action directly in native Settings. They no longer require the legacy Preferences page. The later Web Settings follow-up also corrected that page's source availability/privacy text and guards browser-only claims by platform.
- Calendar and notification permission state is read on focus and return to foreground. A cached `connected` flag no longer implies current OS permission.
- System-settings recovery for denied permissions, calendar selection switches, source/title/read timestamps, writable-only edit/delete, operation locking, and busy states.
- Calendar editor uses theme-aware native date/time fields, keyboard-safe layout, existing visual tokens, explicit edit/create headings, title/time validation, disabled invalid saves, retained drafts after failure, and a synchronous duplicate-submit/dismissal guard.
- Existing CalendarDraft metadata, including the schedule link and all-day flag, survives an edit.
- Existing AccountSyncSection remains the account/device/sync/health-consent/local-clear entry. Removed the outdated native privacy claim that cross-device restoration is unavailable; reused current Sync V2 privacy copy.
- Version is read from the Expo build configuration instead of a hard-coded version string.

### Quiet Hours And Push

- Uses Noether's optional `DeviceData.notificationQuietHours` `{ startMinute, endMinute }` through the existing `deviceRepository.update` method. No repository/schema implementation was changed by this worker.
- Native quiet-hours toggle and start/end clock fields; midnight-spanning intervals preserved. Matching minutes disables the setting. Failed updates surface an error.
- Requests permission and a real Expo push token through the existing notification service and actual EAS project ID. Missing project, denied permission, null/malformed token and rejected registration never display success. Raw tokens are not rendered or logged.
- Dewey's concurrent boundary integration now wires the production `registerNativePushToken(token, expectedUserId): Promise<void>` callback in Settings and as the notification component's default. Only its successful remote acknowledgment displays registration confirmation; the UI still explicitly says delivery has not been verified.
- That integration captures the authenticated owner before permission/token acquisition, rejects stale account responses, requires reminders to be enabled, and retires registration when reminders are disabled or OS permission is denied. The UI harness mocks these external auth/registry boundaries, not their business outcomes. No navigation change is needed.
- Stable interface and ownership contract: `docs/release/PUSH_BOUNDARY_INTERFACE.md`. The available task tools did not expose addressable Dewey/Noether tasks, so this shared-checkout contract was used; no direct-message coordination is claimed. Concurrent harness fixes were already present when re-read and were preserved rather than overwritten.

### Web Settings Truthfulness And Export Follow-Up

- Replaced hard-coded `QuestLife v0.2` with Expo's configured version, with an honest unavailable fallback. The locally exported build renders `QuestLife 1.0.0`.
- Corrected English/Chinese Health and Calendar text: Web cannot directly access these device sources; native import needs OS permission, Health upload needs separate account consent, and calendar writes are not account sync. Native Preferences points to the actual native source-status entry instead of falsely reporting native sources unavailable.
- Corrected storage copy: local-first records; configured account service and sign-in required for cloud sync; no automatic upload while unconfigured or signed out; device permissions, calendar selection and device notification preferences remain local. Turning off Health consent does not claim to delete earlier uploads, and sign-out does not clear local records.
- Exposed the existing `downloadPersistenceSnapshot` helper through a Web-only, hydration-guarded Settings action with a plaintext/privacy confirmation. Cancellation, download failure and requested-download states are distinct. Export does not mutate records, upload, reset data or sign out.
- This JSON is current AppData, not a full device backup: credentials, sync queue, device permissions and the raw device-source repository are excluded. The existing debug export helper was reused without modifying storage or inventing a restore contract.
- **Actual gap:** neither Web Settings nor NativeSettings has a JSON file import/restore handler. Account pull, internal migration backups, repository recovery and sync-engine recovery are not user file-restore flows. Settings now explicitly states this limitation instead of presenting a fake recovery control.

### Native Export / Recovery / Clear Scope Follow-Up

- Added `NativeRecordActions` to NativeSettings. It uses the installed React Native `Share` API with an explicit privacy confirmation to export current AppData as JSON **text**, not a file. It does not use `window`, `document`, Blob URLs or the browser downloader. Both cancellation and errors preserve records; a synchronous operation guard prevents duplicate shares; hydration and unsupported platforms disable the action.
- The confirmation warns that private/Health context is unencrypted and the user-selected receiving app may upload it. The result only reports that the OS share sheet returned, never that a file was saved or another app received it. Android cannot reliably distinguish share-sheet dismissal through this API, so it gets no false success claim. No real owner data was shared during testing.
- Native JSON **file** export remains unavailable: the project does not declare a native file-sharing/document-picker integration. Large JSON-text shares can be rejected by the OS/receiving app and surface the explicit failure. No new package, lockfile, storage write or dependency workaround was introduced.
- Native recovery/clear explanations are now visible beside export. JSON import/restore remains absent on both platforms; there is no existing validated, account-aware restore handler to expose. This is a product-code gap, not a successful recovery claim.
- Audited the existing `AccountSyncSection` and `clearLocalReplica`: native uses `Alert.alert`, Web uses `window.confirm` in its Web branch. Clear is available only with configured account services, signed-out state and an existing account binding; pending changes/unresolved conflicts disable it. The runtime independently rejects signed-in/unconfirmed/unsynced clears. It evicts local record and Health copies without queuing cloud deletion, stops Health reads and retains account binding/migration backups. System Calendar and Health source data are not deleted. Unconfigured/unbound local-data clear is not exposed.
- This follow-up does not call or expose storage's debug `clearAll`, auto-sign out, delete accounts, change destructive behavior, or edit the shared account/runtime service. Seven isolated tests exercise the actual account UI's native/Web confirmations, cancellation, failure and blocked states with a mocked clear handler, never real deletion.

## Verification

- `npx tsc --noEmit`: latest follow-up check passed. An intermediate check caught a concurrent `deviceRepository.ts` generic Promise error; that owner's error was absent on the final check, with no service edit by this worker.
- Native workflow suite: **48/48 passed** with the production default-registry wiring and auth imports mocked at their external boundaries, four date/time locale regressions, two shared time-picker adapter regressions and five native export regressions. This resolves the reported 25/30 harness result. It renders production screens/form handlers with React 19.1; native hosts, canonical store actions and platform services are mocked. Tests never open production storage or make OS/calendar/network writes.
- Coverage: Goal create/edit/delete entry; real GoalForm submit; real SkillForm create/link/edit; module CRUD/link/reorder; skill search; Calendar invalid/racing/failed save; Android picker cancellation and iOS theme selection; Schedule create/conflict/edit/delete/stale edit; Web text-control preservation; Settings preferences; quiet-hours save/disable; push token/registration/failure distinctions.
- Additional follow-up coverage: native midnight selection; Schedule moving to a future date with a target-day conflict and preserved identity; module reorder scoped to one goal with shared links unchanged; Skill detail navigation and confirmed unlink without library deletion.
- Push wiring coverage: captured owner and real default callback, missing auth/disabled reminders, account changes during token acquisition, late acknowledgment after logout, denied-permission retirement, reminder-disable retirement and retirement failures. Registry mocks require explicit test acknowledgment; token acquisition alone cannot pass a success assertion.
- Date/time display coverage: Chinese/English in both modes uses the specified Intl locale, rejects Date locale shortcut calls, preserves the input timestamp without emitting changes, and retains explicit `24:00` display overrides. Node Intl tests do not substitute for Android Hermes runtime acceptance.
- The parent's `TimePickerInput.native.tsx` adapter is exercised without edits: original hour/minute callbacks, fixed `HH:mm` display, localized reminder label, store language and cleanFocus/deepWork picker theme all pass. The former hard-coded dark/Chinese styling gap is resolved by the parent.
- Web Settings suite: **8/8 passed**, for both languages, actual/missing build version, cancelled export, confirmed export through the real download helper, failure state, hydration guard and native-platform boundaries. Account Settings boundary suite: **7/7 passed**. Combined UI result at this checkpoint: **63/63 passed**. Host/services use isolated mocks and test fixtures, never user storage.
- Existing `node scripts/test-native-platform.mjs`: **59/59 passed** against the shared working tree. These service tests use test repositories/drivers, not live Health, Calendar or push delivery.
- Earlier native-slice Expo Web export and Android/iOS Hermes exports passed at `/tmp/questlife-native-workflows-final`. The latest Settings follow-up Web export also passed at `/tmp/questlife-settings-truthfulness-web`; Android/iOS exports were not rerun for this Web follow-up.
- Actual local Web browser check passed against that exported build in a fresh isolated Chrome context: onboarding -> Settings -> English/Chinese and light/dark, unconfigured-account state, cancellation, confirmation and a real captured JSON download. Downloaded AppData exactly matched the pre-export session records; browser storage was unchanged. No non-local requests were permitted, no real user data was read or seeded, no page errors occurred, and document width remained 390px at a 390x844 viewport.
- Four screenshots were visually inspected: `/tmp/questlife-settings-export-en-light-390.png`, `/tmp/questlife-settings-export-en-dark-390.png`, `/tmp/questlife-settings-export-zh-light-390.png`, `/tmp/questlife-settings-export-zh-dark-390.png`. New export/storage/recovery text and controls fit without horizontal overflow. These are local Web evidence, not native/device, deployed-site or design approval evidence.
- `git diff --check`: passed.
- Scoped DOM-leak scan found no direct `window`, `document`, `localStorage`, HTML element creation, or CSS imports in the owned screens/new native controls. The Web-only time input already has a Metro `.native.tsx` sibling. Successful native exports additionally exercised platform resolution.

Reproduce the UI suite without changing application dependencies/locks:

```sh
npm install --prefix /tmp/questlife-native-workflows-test-runtime --no-save --package-lock=false --ignore-scripts react@19.1.0 react-test-renderer@19.1.0
QUESTLIFE_UI_TEST_RUNTIME=/tmp/questlife-native-workflows-test-runtime/node_modules node --test src/native/nativeWorkflows.test.cjs src/native/accountSettingsBoundary.test.cjs src/screens/settingsTruthfulness.test.cjs
```

React test renderer prints its upstream deprecation warning. This temporary compatibility harness is not an app dependency, native screenshot test, or proof of platform behavior.

## Remaining Integration / Acceptance

1. **Cross-goal module movement is not an acceptance gap for the existing product.** Current GoalDetail forms, store context, relevant history, and owner brief expose no such flow. Calling generic `updateModule({goalId})` would not move its links atomically, so it must not be exposed as a shortcut. A future feature would require a separate domain decision; this task adds none.
2. The authenticated push-registration callback is now wired by the boundary owner. No real device token request, remote registration, notification delivery, or cold-launch delivery was exercised by this worker; mocked UI acknowledgment is not live delivery proof.
3. System Calendar writes require device validation with an explicitly chosen writable test calendar. No live-calendar success is claimed. External constraints are limited to records actually read/cached by the source service; an arbitrary future day is not guaranteed to have complete OS-calendar coverage.
4. No physical-device or current emulator visual/keyboard acceptance was performed by this worker. The four 390px light/dark screenshots above cover only local Web Settings. Native integration still needs cleanFocus/deepWork, large type, Chinese/English, keyboard-open sheets, denied permissions, background/foreground, and restart persistence.
5. The parent replaced shared `TimePickerInput.native.tsx` with the theme-aware adapter. Regression coverage passes; actual device picker rendering remains part of device acceptance.
6. Web AppData file export is accessible and locally browser-tested; native JSON-text sharing is implemented with OS calls mocked in tests. JSON import/restore and native JSON file export remain unimplemented. Remote account deletion, full quiet-hour delivery enforcement, cross-device scheduling and OS notification reconciliation remain parent/platform work. Existing account-local clear behavior was retained, not broadened or represented as cloud deletion.
7. No deployed Web click/save/reload acceptance was run. Web handler regression and bundle success are not substituted for the online requirement in EXECUTION_RULES.

## Figma Candidate Sidecar: Blocked, Not Complete

Loaded `figma-use` and `figma-generate-library`, inspected the file and its existing Foundations page, and searched for the existing native material/token assets. No matching local assets were found. The library search server accepted only the first query in a multi-query batch; the remaining component-family searches are still pending.

- Existing Foundations destination: [page 4:9](https://www.figma.com/design/J51kDHRfrtRg2m56guVDBz/QuestLife?node-id=4-9).
- Immutable source: [image 21:3](https://www.figma.com/design/J51kDHRfrtRg2m56guVDBz/QuestLife?node-id=21-3). Confirmed RECTANGLE with IMAGE fill, not editable source components. This worker did not modify it or any existing canvas node.
- Preserved all three pages: `0:1`, `4:6`, `4:9`. No new page, product screen, or board was created.
- Source snapshot: `src/design/nativeFoundation.ts`, `visualFoundation.ts`, `tokens.ts`, `src/native/NativeControls.tsx`, `src/v11/tokens.ts`, and the native Material/SheetControls/NativeSheet implementations. The intended board is explicitly CANDIDATE, with no approval claim.
- Planned specimens: exact light/dark semantic roles; title 21/26, body 15/20, secondary 13/18, metadata 12/17 with zero tracking; gutter 20, gap 12, minimum touch 44, control radius 8, sheet radius 24/max width 760; material gradient roles and native eligibility; default pill height 64/radius 32; controls and keyboard-safe sheets. Native OS glass is a runtime behavior, not a Figma-effect fidelity claim. SF Pro and Roboto availability were verified.
- Four candidate-only variable collections were created successfully: `Candidate / Native / Primitives` (`VariableCollectionId:118:2`), `Light` (`118:3`), `Dark` (`118:4`), and `Metrics` (`118:5`). They use separate single modes to retain both themes without requiring multi-mode plan support.
- The first variable population attempt failed on a primitive name. The corrected retry was rejected with **"You've reached the Figma MCP tool call limit on the Starter plan."** Some variables may remain from the failed attempt; their IDs were not returned. Read back and reconcile before retrying. No successful component creation, board screenshot, binding audit, or visual validation is claimed.
- Resume ledger and extracted token values: `/tmp/design-system-state-questlife-native-20260920.json`. It records returned collection IDs, source snapshot, bounded scope, pending work, and the quota error. No candidate board node URL exists yet; the links above are existing reference/destination nodes only.

The Figma phase cannot continue until tool quota is available. No billing or plan change was made, and this limitation does not replace the parent's five-flow native/device acceptance work.

## Changed Files

Modified owned files: `src/native/NativeSettingsScreen.tsx`, `src/native/NativeCalendarEditor.tsx`.

Minimal native-safe changes: `src/screens/GoalDetailScreen.tsx`, `src/screens/SkillLibraryScreen.tsx`, `src/screens/ScheduleScreen.tsx`. GoalTreeScreen and SkillDetailScreen were audited/tested but not edited.

New native UI/helpers: `NativeDateTimeField.tsx`, `NativeScheduleFields.tsx`, `NativeScheduleCalendarSheet.tsx`, `NativeNotificationPreferences.tsx`, `NativeRecordActions.tsx`, `nativeWorkflowValidation.ts`, `nativeWorkflowCopy.ts`, `nativeWorkflows.test.cjs`, `accountSettingsBoundary.test.cjs`, all under `src/native/`.

Later authorized Web follow-up: `src/screens/SettingsScreen.tsx`, Settings copy in `src/i18n.ts`, and new `src/screens/settingsTruthfulness.test.cjs`.

Shared i18n keys added: initially **0**, then **8 bilingual Settings keys** and **4 existing Settings keys corrected** in the authorized Web follow-up. Task-authorized local native copy: initially **11 bilingual keys**, then **7 native export/clear-scope keys**, in `nativeWorkflowCopy.ts`. Existing text elsewhere continues using shared translated keys.

SDK prerequisite reference: https://docs.expo.dev/versions/v54.0.0/ was read before implementation. No Expo/React Native version upgrade was introduced by this worker.
