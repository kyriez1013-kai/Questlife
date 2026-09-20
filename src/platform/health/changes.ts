import type { HealthDeletion, HealthObservationV1, HealthReadResult, HealthSourceChange, HealthMetric } from '../contracts';
import { healthObservationKey, mergeHealthObservations } from './normalization';

export function belongsToHealthSource(row: HealthObservationV1, change: Pick<HealthSourceChange,'sourcePlatform'|'metric'|'sourceRecordId'>) {
  if (row.sourcePlatform!==change.sourcePlatform || row.metric!==change.metric) return false;
  if (row.sourceRecordId) return row.sourceRecordId===change.sourceRecordId;
  if (row.externalId===change.sourceRecordId) return true;
  // Legacy Android child identity was exactly parent UUID + ':' + ISO sample time.
  if (row.sourcePlatform!=='health_connect' || !['sleep','heart_rate'].includes(row.metric) || !row.externalId.startsWith(`${change.sourceRecordId}:`)) return false;
  const suffix=row.externalId.slice(change.sourceRecordId.length+1);
  return /^\d{4}-\d{2}-\d{2}T/.test(suffix) && Number.isFinite(Date.parse(suffix));
}

export function validHealthChangeBatch(result: HealthReadResult, metric: HealthMetric, platform?: HealthObservationV1['sourcePlatform']) {
  if (!result.completedMetrics.includes(metric) || result.observations.some(row=>row.metric!==metric || (platform && row.sourcePlatform!==platform))) return false;
  if (!result.nextCursor || !result.changes || !result.nextCursor.token || !Number.isFinite(Date.parse(result.nextCursor.since)) || (platform && result.nextCursor.sourcePlatform!==platform)) return false;
  return result.changes.every(change=>change.metric===metric && change.sourcePlatform===result.nextCursor!.sourcePlatform && !!change.sourceRecordId &&
    (change.kind==='delete' || (change.kind==='upsert' && (!change.sourceModifiedAt || Number.isFinite(Date.parse(change.sourceModifiedAt))) && change.observations.every(row=>belongsToHealthSource(row,change)))));
}

export function applyHealthChanges(current: HealthObservationV1[], pending: HealthDeletion[], changes: HealthSourceChange[], at: string) {
  let observations=current;
  const deletions=new Map(pending.map(row=>[row.observationId,row]));
  for (const change of changes) {
    const prior=observations.filter(row=>belongsToHealthSource(row,change));
    if (change.kind==='upsert' && change.sourceModifiedAt && prior.some(row=>row.sourceModifiedAt && Date.parse(row.sourceModifiedAt)>Date.parse(change.sourceModifiedAt!))) continue;
    const keys=new Set(change.kind==='upsert'?change.observations.map(healthObservationKey):[]);
    const replacement=change.kind==='upsert'?mergeHealthObservations(prior,change.observations).filter(row=>keys.has(healthObservationKey(row))):[];
    const keptIds=new Set(replacement.map(row=>row.id));
    for (const row of prior) if (!keptIds.has(row.id)) deletions.set(row.id,{observationId:row.id,sourceRecordId:change.sourceRecordId,sourcePlatform:change.sourcePlatform,metric:change.metric,deletedAt:at,reason:change.kind==='delete'?'source_delete':'source_update'});
    for (const row of replacement) deletions.delete(row.id);
    observations=mergeHealthObservations(observations.filter(row=>!belongsToHealthSource(row,change)),replacement);
  }
  return {observations,healthDeletions:[...deletions.values()]};
}
