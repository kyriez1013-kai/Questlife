import { buildDataProvenance } from '../../utils/dataProvenance';
import type { ContextLog, AppData } from '../../types';
import type { HealthMetric, HealthObservationV1 } from '../contracts';

export type RawHealthSample = {
  metric: HealthMetric; value?: number; unit: string; startAt: string; endAt: string;
  availableAt: string; externalId: string; platform: HealthObservationV1['sourcePlatform'];
  app?: string; device?: string; method?: HealthObservationV1['recordingMethod'];
  timezoneOffset?: number; measurementMethod?: 'sdnn' | 'rmssd';
};
const units: Record<HealthMetric, HealthObservationV1['unit']> = { sleep:'min', steps:'count', heart_rate:'bpm', resting_heart_rate:'bpm', hrv:'ms', exercise:'min', active_energy:'kcal', distance:'m' };
function convert(metric: HealthMetric, value: number, unit: string): number | null {
  if (unit === units[metric]) return value;
  if ((metric === 'sleep' || metric === 'exercise') && unit === 's') return value / 60;
  if ((metric === 'sleep' || metric === 'exercise') && unit === 'h') return value * 60;
  if (metric === 'distance' && unit === 'km') return value * 1000;
  if (metric === 'active_energy' && unit === 'kJ') return value / 4.184;
  if (metric === 'hrv' && unit === 's') return value * 1000;
  return null;
}
export function normalizeHealthSample(raw: RawHealthSample): HealthObservationV1 | null {
  const times = [raw.startAt,raw.endAt,raw.availableAt].map(Date.parse);
  if (!raw.externalId || raw.value == null || !Number.isFinite(raw.value) || times.some(t => !Number.isFinite(t)) || times[1] < times[0] || times[2] < times[0]) return null;
  const value = convert(raw.metric, raw.value, raw.unit);
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  const id = `health:${raw.platform}:${encodeURIComponent(raw.externalId)}:${raw.metric}`;
  const limitations = [!raw.app && 'SOURCE_APP_UNAVAILABLE', !raw.device && 'SOURCE_DEVICE_UNAVAILABLE', !raw.timezoneOffset && raw.timezoneOffset !== 0 && 'EVENT_TIMEZONE_OFFSET_UNAVAILABLE', raw.metric === 'hrv' && `HRV_${raw.measurementMethod ?? 'METHOD_UNKNOWN'}_NOT_INTERCHANGEABLE`, 'READ_PERMISSION_MAY_BE_PARTIAL'].filter(Boolean) as string[];
  const eventStartAt = new Date(times[0]).toISOString();
  const eventEndAt = new Date(times[1]).toISOString();
  const availableAt = new Date(times[2]).toISOString();
  return { schemaVersion: 'questlife.health.observation.v1', id, metric: raw.metric, value, unit: units[raw.metric], eventStartAt, eventEndAt, availableAt, importedAt: availableAt, timezoneOffset: raw.timezoneOffset ?? null, sourcePlatform: raw.platform, sourceApp: raw.app, sourceDevice: raw.device, recordingMethod: raw.method ?? 'unknown', externalId: raw.externalId, measurementMethod: raw.measurementMethod, quality: 'recorded', limitations,
    provenance: buildDataProvenance({ origin: 'PASSIVE_IMPORTED', confirmation: 'NOT_REQUIRED', captureMethod: 'import', recordedAt: availableAt, availableAt, eventStartAt, eventEndAt, protocolVersion: 'questlife.health.v1', instrumentVersion: `${raw.platform}:${raw.metric}:${raw.measurementMethod ?? 'recorded'}`, sourceIds: [id,raw.externalId,...[raw.app,raw.device].filter((x):x is string => !!x)], limitations }) };
}
export function mergeHealthObservations(current: HealthObservationV1[], incoming: HealthObservationV1[]) {
  const merged = new Map(current.map(row => [row.id,row]));
  incoming.forEach(row => {
    const prior=merged.get(row.id);
    const same=prior && ['metric','value','unit','eventStartAt','eventEndAt','sourceApp','sourceDevice','recordingMethod','measurementMethod'].every(key=>prior[key as keyof HealthObservationV1]===row[key as keyof HealthObservationV1]);
    // Re-reading an unchanged source must not move its first available time forward.
    merged.set(row.id,same?prior:row);
  });
  return [...merged.values()].sort((a,b) => a.eventStartAt.localeCompare(b.eventStartAt) || a.id.localeCompare(b.id));
}
export function healthContextView(rows: HealthObservationV1[]): ContextLog[] {
  // Sleep rows are intervals, not nightly totals. Keep their unregistered label
  // until the ledger supports interval aggregation; do not invent a nightly sum.
  return rows.map(row => ({ id: row.id, date: row.eventStartAt.slice(0,10), createdAt: row.availableAt, type: row.metric === 'sleep' ? 'sleep' : 'body', label: row.metric === 'hrv' ? `hrv_${row.measurementMethod ?? 'unknown'}` : row.metric, value: row.value, unit: row.unit, source: row.sourcePlatform === 'healthkit' ? 'healthkit' : 'sensor', dataProvenance: row.provenance }));
}
export function withDeviceObservations(data: AppData, rows: HealthObservationV1[]): AppData {
  const context = new Map((data.contextLogs ?? []).map(row => [row.id,row]));
  healthContextView(rows).forEach(row => context.set(row.id,row));
  return { ...data, contextLogs: [...context.values()] };
}
