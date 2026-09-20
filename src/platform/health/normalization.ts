import { buildDataProvenance } from '../../utils/dataProvenance';
import type { ContextLog, AppData } from '../../types';
import type { HealthMetric, HealthObservationV1 } from '../contracts';

export type RawHealthSample = {
  metric: HealthMetric; value?: number; unit: string; startAt: string; endAt: string;
  availableAt: string; externalId: string; platform: HealthObservationV1['sourcePlatform'];
  app?: string; device?: string; method?: HealthObservationV1['recordingMethod'];
  timezoneOffset?: number; measurementMethod?: 'sdnn' | 'rmssd';
  sourceRecordId?: string; sourceModifiedAt?: string;
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
  if (raw.timezoneOffset != null && (!Number.isFinite(raw.timezoneOffset) || Math.abs(raw.timezoneOffset) > 14 * 60)) return null;
  if (raw.metric === 'sleep' && times[1] <= times[0]) return null;
  if (raw.sourceModifiedAt && !Number.isFinite(Date.parse(raw.sourceModifiedAt))) return null;
  const id = `health:${raw.platform}:${encodeURIComponent(raw.externalId)}:${raw.metric}${raw.metric === 'hrv' ? `:${raw.measurementMethod ?? 'unknown'}` : ''}`;
  const limitations = [!raw.app && 'SOURCE_APP_UNAVAILABLE', !raw.device && 'SOURCE_DEVICE_UNAVAILABLE', !raw.timezoneOffset && raw.timezoneOffset !== 0 && 'EVENT_TIMEZONE_OFFSET_UNAVAILABLE', raw.metric === 'hrv' && `HRV_${raw.measurementMethod ?? 'METHOD_UNKNOWN'}_NOT_INTERCHANGEABLE`, 'READ_PERMISSION_MAY_BE_PARTIAL'].filter(Boolean) as string[];
  const eventStartAt = new Date(times[0]).toISOString();
  const eventEndAt = new Date(times[1]).toISOString();
  const availableAt = new Date(times[2]).toISOString();
  return { schemaVersion: 'questlife.health.observation.v1', id, metric: raw.metric, value, unit: units[raw.metric], eventStartAt, eventEndAt, availableAt, importedAt: availableAt, timezoneOffset: raw.timezoneOffset ?? null, sourcePlatform: raw.platform, sourceApp: raw.app, sourceDevice: raw.device, recordingMethod: raw.method ?? 'unknown', externalId: raw.externalId, sourceRecordId:raw.sourceRecordId,sourceModifiedAt:raw.sourceModifiedAt,measurementMethod: raw.measurementMethod, quality: 'recorded', limitations,
    provenance: {...buildDataProvenance({ origin: 'PASSIVE_IMPORTED', confirmation: 'NOT_REQUIRED', captureMethod: 'import', recordedAt: availableAt, availableAt, eventStartAt, eventEndAt, protocolVersion: 'questlife.health.v1', instrumentVersion: `${raw.platform}:${raw.metric}:${raw.measurementMethod ?? 'recorded'}`, sourceIds: [id,raw.externalId,...[raw.app,raw.device].filter((x):x is string => !!x)], limitations }),timezone:undefined} };
}
export const healthObservationKey = (row: HealthObservationV1) => row.metric === 'hrv'
  ? JSON.stringify([row.sourcePlatform, row.externalId, row.metric, row.measurementMethod ?? 'unknown']) : row.id;
export function mergeHealthObservations(current: HealthObservationV1[], incoming: HealthObservationV1[]) {
  const key = healthObservationKey;
  const merged = new Map(current.map(row => [key(row),row]));
  incoming.forEach(row => {
    const prior=merged.get(key(row));
    if (prior?.sourceModifiedAt && row.sourceModifiedAt && Date.parse(row.sourceModifiedAt) < Date.parse(prior.sourceModifiedAt)) return;
    if (prior && Date.parse(row.availableAt) < Date.parse(prior.availableAt)) return;
    const same=prior && ['metric','value','unit','eventStartAt','eventEndAt','sourceApp','sourceDevice','recordingMethod','measurementMethod','timezoneOffset','sourceRecordId','sourceModifiedAt'].every(key=>prior[key as keyof HealthObservationV1]===row[key as keyof HealthObservationV1]) && JSON.stringify(prior.limitations) === JSON.stringify(row.limitations);
    // Re-reading an unchanged source must not move its first available time forward.
    // Keep legacy IDs and first import time when correcting an existing source.
    merged.set(key(row),same?prior:prior ? {...row,id:prior.id,importedAt:prior.importedAt ?? prior.availableAt,provenance:{...row.provenance,sourceIds:row.provenance.sourceIds?.map(id=>id===row.id?prior.id:id)}} : row);
  });
  return [...merged.values()].sort((a,b) => a.eventStartAt.localeCompare(b.eventStartAt) || a.id.localeCompare(b.id));
}
/** Phase 1 stored first-read availability, but did not name it importedAt. */
export function restoreHealthImportTime(row: HealthObservationV1): HealthObservationV1 {
  if (row.importedAt || !Number.isFinite(Date.parse(row.availableAt))) return row;
  return { ...row, importedAt: row.availableAt, limitations: [...new Set([...row.limitations, 'LEGACY_IMPORT_TIME_FROM_FIRST_AVAILABLE_AT'])] };
}
export function healthContextView(rows: HealthObservationV1[]): ContextLog[] {
  const date = (row: HealthObservationV1) => {
    if (row.timezoneOffset != null) return new Date(Date.parse(row.eventStartAt) + row.timezoneOffset * 60000).toISOString().slice(0,10);
    const d = new Date(row.eventStartAt);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const context = (row: HealthObservationV1): ContextLog => ({ id: row.id, date: date(row), createdAt: row.availableAt, type: row.metric === 'sleep' ? 'sleep' : 'body', label: row.metric === 'hrv' ? `hrv_${row.measurementMethod ?? 'unknown'}` : row.metric, value: row.value, unit: row.unit, source: row.sourcePlatform === 'healthkit' ? 'healthkit' : 'sensor', dataProvenance: row.provenance });
  const result = rows.filter(row => row.metric !== 'sleep').map(context);
  const sleep = rows.filter(row => row.metric === 'sleep' && Date.parse(row.eventEndAt) > Date.parse(row.eventStartAt))
    .sort((a,b) => a.eventStartAt.localeCompare(b.eventStartAt) || a.id.localeCompare(b.id));
  // Union explicit asleep intervals across stages and sources, not summed durations.
  // Raw observations stay intact; this projection never claims a nightly total.
  for (let i = 0; i < sleep.length;) {
    const first = sleep[i++]; const group = [first]; let end = first.eventEndAt;
    while (i < sleep.length && Date.parse(sleep[i].eventStartAt) <= Date.parse(end)) {
      const row = sleep[i++]; group.push(row);
      if (Date.parse(row.eventEndAt) > Date.parse(end)) end = row.eventEndAt;
    }
    const view = context(first);
    const value = (Date.parse(end) - Date.parse(first.eventStartAt)) / 60000;
    if (group.length === 1 && value === first.value) { result.push(view); continue; }
    const availableAt = group.map(row => row.availableAt).sort().at(-1)!;
    result.push({...view,id:`health:sleep-union:${first.eventStartAt}:${end}`,value,createdAt:availableAt,
      dataProvenance: {...buildDataProvenance({origin:'DERIVED',confirmation:'NOT_REQUIRED',captureMethod:'import',recordedAt:availableAt,availableAt,eventStartAt:first.eventStartAt,eventEndAt:end,protocolVersion:'questlife.sleep.interval-union.v1',instrumentVersion:'explicit-asleep-interval-union',fieldOrigins:{value:'derived'},sourceIds:group.map(row=>row.id),limitations:[...new Set(group.flatMap(row=>row.limitations)),'INTERVAL_UNION_NOT_NIGHTLY_TOTAL','OVERLAPPING_SOURCES_NOT_ADDITIVE']}),timezone:undefined}});
  }
  return result;
}
export function withDeviceObservations(data: AppData, rows: HealthObservationV1[]): AppData {
  const context = new Map((data.contextLogs ?? []).map(row => [row.id,row]));
  healthContextView(rows).forEach(row => context.set(row.id,row));
  return { ...data, contextLogs: [...context.values()] };
}
