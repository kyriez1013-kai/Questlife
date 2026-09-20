# Push Boundary Interface For Noether And Chandrasekhar

Backend owner owns the migration, `api/push-test.ts`, and `src/sync-v2/pushRegistry*.ts`, plus auth/runtime integration. Noether retains NotificationDriver/NotificationCoordinator ownership. Do not register a token directly with Supabase or store tokens in DeviceData.

Implemented exports from `src/sync-v2/pushRegistry.ts`:

```ts
syncDevicePushRegistration(input: {
  expectedUserId: string | null;
  expoPushToken: string | null;
  notificationsEnabled: boolean;
  permissionGranted: boolean;
}): Promise<{ status: 'registered' | 'disabled' | 'auth_required' | 'account_mismatch' | 'retirement_pending' | 'unavailable' }>;

retryPendingPushRetirement(): Promise<void>;
matchesCurrentPushRegistration(registrationId: unknown): Promise<boolean>;
registerNativePushToken(token: string, expectedUserId: string): Promise<void>;
```

- Capture the current UID before awaiting OS token acquisition and pass it as `expectedUserId`. Call after the existing notification preference and OS permission are known, on foreground/session/preference changes, and token rotation. Never request permission silently. Disabled/denied/no-token calls retire the current registration.
- The helper independently checks the existing session, Sync journal ownership, and persisted notification preference. The token never appears in the return value or logs. Account switches or pending retirement fail closed.
- Repeated unchanged reconciliation is supported. Runtime handles durable retirement retries; `authService.signOut()` retires the current binding before calling SDK sign-out. Offline/failed retirement leaves sign-out pending rather than claiming success.
- Manual test pushes carry only `data: {source: 'questlife', kind: 'push_test', registrationId: '<opaque UUID>'}`, with generic QuestLife title/body, no UID, entity ID, health details, or private content. Before handling a test-push tap or foreground presentation, call `matchesCurrentPushRegistration(data.registrationId)` and ignore stale/unmatched responses. A valid test-push tap only opens the normal app, never completes a task or creates a record. OS-generated remote identifiers must not be assumed to start with `questlife:`.
- Server delivery is manual/test-only, one device owned by the authenticated caller, rate-limited and receipt-aware. No hosted cron or background push promise.

Settings integration is owned by this boundary follow-up at the user's explicit request. `NativeSettingsScreen` now passes the production `registerNativePushToken` callback. `NativeNotificationPreferences` captures the authenticated owner before permission/token acquisition, ignores stale responses, and reports registration only after remote ACK. The existing reminder master switch retires push registration when disabled. Quiet-hours, calendar, health and visual layout remain with their existing owners.

Coordination limitation: available task tools did not expose addressable Noether or Chandrasekhar tasks. This file is the shared-checkout interface handoff; no direct-message delivery is claimed. NotificationCoordinator/Driver remain untouched by this boundary worker.

## Explicit Health Deletion Follow-Up

The runtime now consumes the final persisted `DeviceData.healthDeletions` contract from Noether's `DEVICE_SERVICES_COMPLETION.md`: `{observationId,sourceRecordId,sourcePlatform,metric,deletedAt,reason:'source_delete'|'source_update'}`. It passes those exact records as the second argument to `SyncEngineV2.queueHealth`, under existing authenticated owner and Health-cloud-consent checks. No deletion is inferred from array absence. Formal delete mutations and exact-version dedupe signatures are saved together in the sync WAL; pending markers are retained through lost ACK/restart, then removed only after confirmed receipt/tombstone observation and an exact full-record comparison. Pending explicit deletes block remote live-row hydration unless the user explicitly resolves that matching conflict in favor of remote. Source-record IDs and modification timestamps are included in Health upload signatures. `scripts/test-health-delete-boundary.mjs` exercises the actual runtime against isolated PostgreSQL/RLS, not a hosted project. James's transport account-race implementation was not edited by this worker.
