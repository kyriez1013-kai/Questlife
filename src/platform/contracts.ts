import type { DataRecordProvenance } from '../types';

export type PermissionState = 'unavailable' | 'not_requested' | 'denied' | 'partial' | 'granted' | 'read_access_unknown';
export type HealthMetric = 'sleep' | 'steps' | 'heart_rate' | 'resting_heart_rate' | 'hrv' | 'exercise' | 'active_energy' | 'distance';
export const HEALTH_METRICS: readonly HealthMetric[] = ['sleep','steps','heart_rate','resting_heart_rate','hrv','exercise','active_energy','distance'];
export type HealthObservationV1 = {
  schemaVersion: 'questlife.health.observation.v1';
  id: string; metric: HealthMetric; value: number; unit: 'min' | 'count' | 'bpm' | 'ms' | 'kcal' | 'm';
  eventStartAt: string; eventEndAt: string; availableAt: string; importedAt: string; timezoneOffset: number | null;
  sourcePlatform: 'healthkit' | 'health_connect'; sourceApp?: string; sourceDevice?: string;
  recordingMethod: 'automatic' | 'manual' | 'unknown'; externalId: string;
  measurementMethod?: 'sdnn' | 'rmssd'; provenance: DataRecordProvenance;
  quality: 'recorded'; limitations: string[];
};
export type SourceSyncStatus = {
  connected: boolean; permission: PermissionState; lastSyncedAt?: string;
  imported: number; enabledMetrics: HealthMetric[]; error?: string;
  connectionRevision?: number;
  metricCheckpoints?: Partial<Record<HealthMetric, string>>;
};
export type HealthReadResult = { observations: HealthObservationV1[]; completedMetrics: HealthMetric[]; limitations: string[] };
export interface HealthSource {
  isAvailable(): Promise<boolean>;
  requestPermissions(metrics: readonly HealthMetric[]): Promise<{ state: PermissionState; metrics: HealthMetric[] }>;
  readSince(start: string, end: string, metrics: readonly HealthMetric[]): Promise<HealthReadResult>;
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
};
export type ExternalCommitmentV1 = ExternalCommitment;
export type CalendarDraft = { title: string; startAt: string; endAt: string; allDay?: boolean };
export interface CalendarSource {
  isAvailable(): Promise<boolean>; permission(): Promise<PermissionState>; requestPermission(): Promise<PermissionState>;
  listCalendars(): Promise<DeviceCalendar[]>;
  readEvents(calendarIds: string[], start: string, end: string): Promise<ExternalCommitment[]>;
  create(calendarId: string, draft: CalendarDraft, consent: { confirmed: true }): Promise<ExternalCommitment>;
  update(record: ExternalCommitment, draft: CalendarDraft, consent: { confirmed: true }): Promise<ExternalCommitment>;
  delete(record: ExternalCommitment, consent: { confirmed: true }): Promise<void>;
  open(record: ExternalCommitment): Promise<void>;
}
export type QuickAction = 'START' | 'DONE' | 'SNOOZE' | 'SKIP' | 'OPEN';
export type NotificationKind = 'accepted_block' | 'decision_followup' | 'morning_state' | 'end_of_day' | 'skill_reminder';
export type NotificationRequest = { id: string; kind: NotificationKind; at: string; title: string; body: string; entityId?: string; daily?: {hour: number; minute: number} };
export type QuickActionIntent = { action: QuickAction; kind: NotificationKind; entityId?: string; notificationId: string };
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
