import type { DataRecordProvenance, ScheduleBlock } from '../types';

export type PermissionState = 'unavailable' | 'not_requested' | 'denied' | 'partial' | 'granted' | 'read_access_unknown';
export type HealthMetric = 'sleep' | 'steps' | 'heart_rate' | 'resting_heart_rate' | 'hrv' | 'exercise' | 'active_energy' | 'distance';
export const HEALTH_METRICS: readonly HealthMetric[] = ['sleep','steps','heart_rate','resting_heart_rate','hrv','exercise','active_energy','distance'];
export type HealthObservationV1 = {
  schemaVersion: 'questlife.health.observation.v1';
  id: string; metric: HealthMetric; value: number; unit: 'min' | 'count' | 'bpm' | 'ms' | 'kcal' | 'm';
  eventStartAt: string; eventEndAt: string; availableAt: string; importedAt: string; timezoneOffset: number | null;
  sourcePlatform: 'healthkit' | 'health_connect'; sourceApp?: string; sourceDevice?: string;
  recordingMethod: 'automatic' | 'manual' | 'unknown'; externalId: string;
  sourceRecordId?: string;
  sourceModifiedAt?: string;
  measurementMethod?: 'sdnn' | 'rmssd'; provenance: DataRecordProvenance;
  quality: 'recorded'; limitations: string[];
};
export type SourceSyncStatus = {
  connected: boolean; permission: PermissionState; lastSyncedAt?: string;
  imported: number; enabledMetrics: HealthMetric[]; error?: string;
  connectionRevision?: number;
  metricCheckpoints?: Partial<Record<HealthMetric, string>>;
  changeCursors?: Partial<Record<HealthMetric, HealthChangeCursor>>;
};
export type HealthChangeCursor = {
  sourcePlatform: HealthObservationV1['sourcePlatform']; token: string;
  since: string; historyGap?: boolean;
};
export type HealthSourceChange = {
  kind: 'upsert'; sourcePlatform: HealthObservationV1['sourcePlatform']; metric: HealthMetric;
  sourceRecordId: string; observations: HealthObservationV1[]; sourceModifiedAt?: string;
} | {
  kind: 'delete'; sourcePlatform: HealthObservationV1['sourcePlatform']; metric: HealthMetric;
  sourceRecordId: string;
};
export type HealthDeletion = {
  observationId: string; sourceRecordId: string; sourcePlatform: HealthObservationV1['sourcePlatform'];
  metric: HealthMetric; deletedAt: string; reason: 'source_delete' | 'source_update';
};
export type HealthReadResult = {
  observations: HealthObservationV1[]; completedMetrics: HealthMetric[]; limitations: string[];
  changes?: HealthSourceChange[]; nextCursor?: HealthChangeCursor; hasMoreChanges?: boolean;
};
export interface HealthSource {
  readonly platform?: HealthObservationV1['sourcePlatform'];
  isAvailable(): Promise<boolean>;
  requestPermissions(metrics: readonly HealthMetric[]): Promise<{ state: PermissionState; metrics: HealthMetric[] }>;
  readSince(start: string, end: string, metrics: readonly HealthMetric[]): Promise<HealthReadResult>;
  readChanges?(metric: HealthMetric, cursor: HealthChangeCursor | undefined, start: string, end: string): Promise<HealthReadResult>;
  getSyncStatus(): Promise<SourceSyncStatus>;
}
export type DeviceCalendar = { id: string; title: string; writable: boolean; source: string };
export type ExternalCommitment = {
  id: string; externalEventId: string; calendarId: string; source: 'system_calendar';
  title: string; startAt: string; endAt: string; allDay: boolean;
  ownership: 'external' | 'questlife'; lastSyncedAt: string;
  provider?: string; platform?: string; availability?: 'busy' | 'free' | 'unknown';
  lastObservedAt?: string; providerEventId?: string; providerCalendarId?: string;
  linkedScheduleBlockId?: string;
  operationMarker?: string;
};
export type ExternalCommitmentV1 = ExternalCommitment;
export type CalendarDraft = { title: string; startAt: string; endAt: string; allDay?: boolean; linkedScheduleBlockId?: string };
export type CalendarExportMapping = {
  id: string; calendarId: string; linkedScheduleBlockId?: string;
  record: ExternalCommitment; active: boolean; deleted?: boolean;
  blockFingerprint?: string; lastOperationId?: string;
};
export type CalendarPendingOperation = {
  id: string; marker: string; mappingId: string; calendarId: string;
  kind: 'create' | 'update' | 'delete';
  state: 'pending' | 'retry' | 'ambiguous' | 'succeeded' | 'cancelled';
  phase: 'prepared' | 'write_started' | 'delete_started';
  confirmedAt: string; completedAt?: string; attempts: number; error?: string;
  linkedScheduleBlockId?: string; blockFingerprint?: string;
  draft?: CalendarDraft; expected?: ExternalCommitment; resultEventId?: string;
  executionRevision?: number;
};
export type CalendarExportStatus = {
  state: 'not_exported' | 'synced' | 'needs_review' | 'pending' | 'retry' | 'ambiguous' | 'inactive' | 'deleted';
  permission: PermissionState;
  mapping?: CalendarExportMapping; operation?: CalendarPendingOperation;
};
export interface CalendarSource {
  isAvailable(): Promise<boolean>; permission(): Promise<PermissionState>; requestPermission(): Promise<PermissionState>;
  listCalendars(): Promise<DeviceCalendar[]>;
  readEvents(calendarIds: string[], start: string, end: string): Promise<ExternalCommitment[]>;
  create(calendarId: string, draft: CalendarDraft, consent: { confirmed: true }): Promise<ExternalCommitment>;
  update(record: ExternalCommitment, draft: CalendarDraft, consent: { confirmed: true }): Promise<ExternalCommitment>;
  delete(record: ExternalCommitment, consent: { confirmed: true }): Promise<void>;
  open(record: ExternalCommitment): Promise<void>;
  createForBlock(calendarId: string, block: ScheduleBlock, consent: { confirmed: true }): Promise<ExternalCommitment>;
  getBlockExportStatus(calendarId: string, blockId: string, currentBlock: ScheduleBlock | undefined): Promise<CalendarExportStatus>;
  getPendingOperations(): Promise<CalendarPendingOperation[]>;
  retryOperation(operationId: string, consent: { confirmed: true }, currentBlock?: ScheduleBlock): Promise<ExternalCommitment | undefined>;
}
export type QuickAction = 'START' | 'DONE' | 'SNOOZE' | 'SKIP' | 'OPEN';
export type NotificationKind = 'accepted_block' | 'decision_followup' | 'morning_state' | 'end_of_day' | 'skill_reminder';
export type NotificationRequest = { id: string; kind: NotificationKind; at: string; title: string; body: string; entityId?: string; daily?: {hour: number; minute: number} };
export type QuickActionIntent = { action: QuickAction; kind: NotificationKind; entityId?: string; notificationId: string }
  | { action: 'OPEN'; kind: 'quick_capture'; entityId?: undefined; notificationId: string }
  | { action: 'OPEN'; kind: 'current_plan'; entityId?: undefined; notificationId: string };
export interface NotificationService {
  permission(): Promise<PermissionState>; requestPermission(): Promise<PermissionState>;
  schedule(request: NotificationRequest): Promise<string>; cancel(id: string): Promise<void>;
  reschedule(request: NotificationRequest): Promise<string>;
  subscribe(listener: (intent: QuickActionIntent) => void): () => void;
  getPushToken(projectId: string): Promise<string | null>;
}
export interface QuickActionService {
  dispatch(intent: QuickActionIntent): Promise<void>;
}
export interface KeyValueStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; }
