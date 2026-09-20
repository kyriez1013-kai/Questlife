# Native Calendar Sheet Interface Handoff

Date: 2026-09-20. UI owner: NativeScheduleCalendarSheet / nativeWorkflowCopy / nativeWorkflows tests. Service and contracts owner: Noether.

## Coordination Checkpoint

The UI owner inspected the current public surface before editing the sheet. At this checkpoint `CalendarService.createForBlock(calendarId, block, { confirmed: true })` is the only Schedule export method; the durable mapping/status/retry surface has not landed. Available task tools do not expose an addressable Noether task, so this shared-checkout file is the coordination handoff, not a claim of direct-message delivery or an agreed API.

## UI Requirements For The Service-Owned API

- Read-only status per local calendar and current Schedule block: never exported, current, app plan changed since the confirmed export, queued/pending, failed/retryable, and stale/missing binding when applicable. Exact names and types remain with the service owner; the sheet will consume the implemented contract rather than duplicate queue logic.
- Distinguish the current app plan from the last explicitly confirmed device write. Account sync acknowledgment is a separate state and must not be inferred from a device-calendar mapping or a current AppData record.
- Surface the last successful write timestamp only when returned evidence supports it, plus explicit pending/failure/stale status. A cached event match alone must not claim device convergence while a queued operation or stale binding exists.
- Keep the existing explicit export action or its documented replacement. Merely opening the sheet, refreshing status, resuming, or receiving remote Schedule updates must not enqueue/write an unconfirmed plan to the OS calendar.
- Explicit retry should act only on a durable user-confirmed intent. Document whether retry needs an operation ID and whether a changed current block requires a fresh export confirmation instead of retrying an obsolete snapshot.
- Define a safe recovery action for stale/missing bindings. The UI must not silently re-create a potentially existing event or retarget a stale OS identifier.
- Calendar IDs, mappings and write intents stay device-local. The UI reads state through the existing service/repository boundary and makes no direct repository writes.

## Planned UI Regression Coverage

Current plan display, current successful binding, queued/pending operation, retryable failure, stale binding, explicit user-triggered retry, changed remote/app plan without an automatic write, account/device status separation, and prevention of duplicate submission. Existing Goals/Skills/Schedule/Settings tests remain in the targeted run.

Please record the implemented method signatures/types and changed-plan retry policy here or in DEVICE_SERVICES_COMPLETION.md before the sheet integration. The UI owner will update this handoff to verified names after readback and tests.

## Contract Readback

The service owner has now added the following public declarations in `src/platform/contracts.ts`:

```ts
getBlockExportStatus(calendarId: string, blockId: string, currentBlock: ScheduleBlock | undefined): Promise<CalendarExportStatus>;
getPendingOperations(): Promise<CalendarPendingOperation[]>;
retryOperation(operationId: string, consent: { confirmed: true }, currentBlock?: ScheduleBlock): Promise<ExternalCommitment | undefined>;
```

`CalendarExportStatus.state` is `not_exported | synced | needs_review | pending | retry | ambiguous | inactive | deleted`, with `permission`, optional `mapping`, and optional `operation`. The sheet will use these public types, display app-plan values independently, and never infer remote account acknowledgment. `createForBlock` remains the explicit export method. At this readback the service implementation is still in progress; the sheet edit waits for the retry/stale-operation semantics to be readable. The intermediate TypeScript failure is the service missing these three declared methods, not a requested UI-side workaround.
