import type { ExternalCommitment, HealthDeletion, HealthObservationV1, KeyValueStorage, SourceSyncStatus } from './contracts';
import { HealthCollection } from './health/HealthCollection';
import { restoreHealthImportTime } from './health/normalization';

export const DEVICE_DATA_KEY = 'questlife_device_sources_v1';
export const DEVICE_PENDING_KEY = `${DEVICE_DATA_KEY}.pending-v1`;
type PendingWrite = { version: 1; writes: {key: string; value: string}[] };
const queues = new WeakMap<KeyValueStorage, Promise<unknown>>();
export type DeviceData = {
  version: 1; observations: HealthObservationV1[];
  observationsPartitioned?: boolean;
  healthDeletions?: HealthDeletion[];
  health: SourceSyncStatus;
  calendar: { connected: boolean; connectionRevision?: number; lastSyncedAt?: string; selectedIds: string[]; events: ExternalCommitment[]; ownedIds: string[]; error?: string;
    exportMappings?: import('./contracts').CalendarExportMapping[];
    pendingOperations?: import('./contracts').CalendarPendingOperation[];
  };
  notificationsEnabled: boolean;
  reminderKinds?: Partial<Record<import('./contracts').NotificationKind, boolean>>;
  scheduledNotificationIds?: string[];
  snoozedNotifications?: import('./contracts').NotificationRequest[];
  notificationError?: string;
  notificationQuietHours?: { startMinute: number; endMinute: number };
};
export function emptyDeviceData(): DeviceData {
  return { version: 1, observations: [], health: { connected: false, permission: 'not_requested', imported: 0, enabledMetrics: [] }, calendar: { connected: false, selectedIds: [], events: [], ownedIds: [] }, notificationsEnabled: false };
}
// Source records are persisted separately; app/Quant views are derived, never cached.
export class DeviceRepository {
  private listeners = new Set<(origin: 'local' | 'remote_sync') => void>();
  constructor(private storage: KeyValueStorage) {}
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const job=(queues.get(this.storage)??Promise.resolve()).then(async():Promise<T>=>{
      const locks=typeof navigator!=='undefined'?navigator.locks:undefined;
      // The lock encloses recovery AND the latest read, not just the final write.
      // Its fixed name is shared by every tab/worker on this origin.
      if (locks?.request) return await locks.request(DEVICE_PENDING_KEY,{mode:'exclusive'},operation);
      const browser=typeof document!=='undefined' || typeof location!=='undefined';
      if (browser) throw new Error('device_cross_context_lock_unavailable');
      return operation();
    });
    queues.set(this.storage,job.catch(()=>undefined));
    return job;
  }
  private async recover() {
    const raw=await this.storage.getItem(DEVICE_PENDING_KEY);
    if (!raw || raw === 'null') return;
    const pending=JSON.parse(raw) as PendingWrite;
    if (pending.version!==1 || !Array.isArray(pending.writes) || !pending.writes.length || pending.writes.at(-1)?.key!==DEVICE_DATA_KEY || pending.writes.some(w=>typeof w.value!=='string' || (w.key!==DEVICE_DATA_KEY && !/^questlife\.health\.v1\.bucket\.(?:[0-9]|[1-9][0-9]|1[01][0-9]|12[0-7])$/.test(w.key)))) throw new Error('device_pending_invalid');
    if (new Set(pending.writes.map(w=>w.key)).size!==pending.writes.length) throw new Error('device_pending_invalid');
    for (const write of pending.writes) {
      const value=JSON.parse(write.value);
      if (write.key===DEVICE_DATA_KEY ? !value || value.version!==1 || !Array.isArray(value.observations) || !value.health || !value.calendar : !Array.isArray(value) || value.some(row=>!row || typeof row.id!=='string' || typeof row.eventStartAt!=='string')) throw new Error('device_pending_invalid');
    }
    for (const write of pending.writes) await this.storage.setItem(write.key,write.value);
    await this.storage.setItem(DEVICE_PENDING_KEY,'null');
  }
  subscribe(listener: (origin: 'local' | 'remote_sync') => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  read(): Promise<DeviceData> {
    return this.exclusive(async()=>{await this.recover();return this.readCurrent();});
  }
  private async readCurrent(): Promise<DeviceData> {
    const value = await this.storage.getItem(DEVICE_DATA_KEY);
    if (!value) return emptyDeviceData();
    const parsed = JSON.parse(value) as DeviceData;
    if (parsed.version !== 1 || !Array.isArray(parsed.observations) || !parsed.health || !parsed.calendar) throw new Error('device_data_invalid');
    if (parsed.observationsPartitioned) parsed.observations = await new HealthCollection(this.storage).read();
    parsed.observations = parsed.observations.map(restoreHealthImportTime);
    return parsed;
  }
  update(fn: (current: DeviceData) => DeviceData | Promise<DeviceData>, origin: 'local' | 'remote_sync' = 'local'): Promise<DeviceData> {
    return this.exclusive(async () => {
      await this.recover();
      const previous = await this.readCurrent();
      const next = await fn(previous);
      if (next === previous) return previous;
      if (!previous.observationsPartitioned) {
        const raw = await this.storage.getItem(DEVICE_DATA_KEY);
        if (raw && !await this.storage.getItem(`${DEVICE_DATA_KEY}.pre-sync-v2-backup`)) await this.storage.setItem(`${DEVICE_DATA_KEY}.pre-sync-v2-backup`,raw);
      }
      const writes=new HealthCollection(this.storage).writes(previous.observationsPartitioned ? previous.observations : [],next.observations);
      writes.push({key:DEVICE_DATA_KEY,value:JSON.stringify({...next,observations:[],observationsPartitioned:true})});
      // A durable journal precedes every partition change. Reads replay it before
      // exposing data, so a cursor never becomes visible without its source changes.
      await this.storage.setItem(DEVICE_PENDING_KEY,JSON.stringify({version:1,writes} satisfies PendingWrite));
      await this.recover();
      this.listeners.forEach(listener => listener(origin));
      return next;
    });
  }
}
