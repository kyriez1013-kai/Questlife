import type { ExternalCommitmentV1 } from "../contracts";
export function externalCommitmentIdentity(row: ExternalCommitmentV1): string {
  // Native local event IDs are NOT globally portable. Never guess equality from
  // title/time. Use provider identifiers only when the adapter really supplies them.
  if (row.provider && row.providerCalendarId && row.providerEventId)
    return JSON.stringify([
      row.provider,
      row.providerCalendarId,
      row.providerEventId,
      row.startAt,
    ]);
  return JSON.stringify([
    row.platform ?? "device_local",
    row.calendarId,
    row.externalEventId,
    row.startAt,
  ]);
}
export function uniqueCommitments(rows: ExternalCommitmentV1[]) {
  return [
    ...new Map(
      rows.map((row) => [externalCommitmentIdentity(row), row]),
    ).values(),
  ];
}
