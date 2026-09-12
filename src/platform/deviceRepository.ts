import type { ExternalCommitment, HealthObservationV1, KeyValueStorage, SourceSyncStatus } from './contracts';

export const DEVICE_DATA_KEY = 'questlife_device_sources_v1';
export type DeviceData = {
  version: 1; observations: HealthObservationV1[];
  health: SourceSyncStatus;
  calendar: { connected: boolean; lastSyncedAt?: string; selectedIds: string[]; events: ExternalCommitment[]; ownedIds: string[]; error?: string };
  notificationsEnabled: boolean;
  reminderKinds?: Partial<Record<import('./contracts').NotificationKind, boolean>>;
  scheduledNotificationIds?: string[];
  snoozedNotifications?: import('./contracts').NotificationRequest[];
  notificationError?: string;
};
export function emptyDeviceData(): DeviceData {
  return { version: 1, observations: [], health: { connected: false, permission: 'not_requested', imported: 0, enabledMetrics: [] }, calendar: { connected: false, selectedIds: [], events: [], ownedIds: [] }, notificationsEnabled: false };
}
// Source records are persisted separately; app/Quant views are derived, never cached.
export class DeviceRepository {
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(private storage: KeyValueStorage) {}
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  async read(): Promise<DeviceData> {
    const value = await this.storage.getItem(DEVICE_DATA_KEY);
    if (!value) return emptyDeviceData();
    const parsed = JSON.parse(value) as DeviceData;
    if (parsed.version !== 1 || !Array.isArray(parsed.observations) || !parsed.health || !parsed.calendar) throw new Error('device_data_invalid');
    return parsed;
  }
  update(fn: (current: DeviceData) => DeviceData | Promise<DeviceData>): Promise<DeviceData> {
    const job = this.queue.then(async () => {
      const next = await fn(await this.read());
      await this.storage.setItem(DEVICE_DATA_KEY, JSON.stringify(next));
      this.listeners.forEach(listener => listener());
      return next;
    });
    this.queue = job.catch(() => undefined);
    return job;
  }
}
