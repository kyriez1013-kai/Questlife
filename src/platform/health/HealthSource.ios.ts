import * as HK from '@kingstinct/react-native-healthkit';
import type { HealthMetric, HealthReadResult, HealthSource, HealthSourceChange } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import { normalizeHealthSample } from './normalization';

const quantities = {
  steps: ['HKQuantityTypeIdentifierStepCount','count'],
  heart_rate: ['HKQuantityTypeIdentifierHeartRate','count/min'],
  resting_heart_rate: ['HKQuantityTypeIdentifierRestingHeartRate','count/min'],
  hrv: ['HKQuantityTypeIdentifierHeartRateVariabilitySDNN','ms'],
  active_energy: ['HKQuantityTypeIdentifierActiveEnergyBurned','kcal'],
  distance: ['HKQuantityTypeIdentifierDistanceWalkingRunning','m'],
} as const;
type Sample = {uuid:string;startDate:Date;endDate:Date;sourceRevision?:{source:{bundleIdentifier:string};productType?:string}};
function upsert(sample: Sample, metric: HealthMetric, value?: number, unit='min'): HealthSourceChange {
  if (!sample.uuid) throw new Error('health_source_id_missing');
  const observations=[];
  if (value!==undefined) {
    const row=normalizeHealthSample({metric,value,unit,externalId:sample.uuid,sourceRecordId:sample.uuid,startAt:sample.startDate.toISOString(),endAt:sample.endDate.toISOString(),availableAt:new Date().toISOString(),platform:'healthkit',app:sample.sourceRevision?.source.bundleIdentifier,device:sample.sourceRevision?.productType,method:'unknown',measurementMethod:metric==='hrv'?'sdnn':undefined});
    if (!row) throw new Error('health_sample_invalid');
    observations.push(row);
  }
  return {kind:'upsert',sourcePlatform:'healthkit',metric,sourceRecordId:sample.uuid,observations};
}
export function createHealthSource(repo: DeviceRepository): HealthSource {
  return {
    platform:'healthkit',
    isAvailable:async()=>HK.isHealthDataAvailable(),
    requestPermissions:async metrics=>{
      await HK.requestAuthorization({toRead:metrics.map(metric=>metric==='sleep'?'HKCategoryTypeIdentifierSleepAnalysis':metric==='exercise'?'HKWorkoutTypeIdentifier':quantities[metric][0]),toShare:[]});
      return {state:'read_access_unknown',metrics:[...metrics]};
    },
    getSyncStatus:async()=>(await repo.read()).health,
    readSince:async(start,end,metrics):Promise<HealthReadResult>=>{
      const changes:HealthSourceChange[]=[];const completedMetrics:HealthMetric[]=[];
      const limitations=['HEALTHKIT_READ_ACCESS_UNDISCLOSED'];
      const options={limit:0,ascending:true,filter:{date:{startDate:new Date(start),endDate:new Date(end)}}};
      for (const metric of metrics) {
        const batchStart=changes.length;
        try {
          if (metric==='sleep') {
            for (const row of await HK.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis',options)) changes.push(upsert(row,metric,[1,3,4,5].includes(row.value)?(row.endDate.getTime()-row.startDate.getTime())/60000:undefined));
          } else if (metric==='exercise') {
            for (const row of await HK.queryWorkoutSamples(options)) changes.push(upsert(row,metric,row.duration.quantity,row.duration.unit));
          } else {
            const [identifier,unit]=quantities[metric];
            for (const row of await HK.queryQuantitySamples(identifier,{...options,unit})) changes.push(upsert(row,metric,row.quantity,unit==='count/min'?'bpm':unit));
          }
          completedMetrics.push(metric);
        } catch { changes.splice(batchStart);limitations.push('READ_FAILED_'+metric); }
      }
      return {observations:changes.flatMap(row=>row.kind==='upsert'?row.observations:[]),changes,completedMetrics,limitations};
    },
    readChanges:async(metric,cursor,start):Promise<HealthReadResult>=>{
      try {
        if (cursor && cursor.sourcePlatform!=='healthkit') throw new Error('health_cursor_platform_invalid');
        const since=cursor?.since??start;
        // The predicate is fixed for the life of an anchor. No moving end date:
        // later corrections/deletions must remain in the same query scope.
        const options={limit:500,anchor:cursor?.token,filter:{date:{startDate:new Date(since)}}};
        const changes:HealthSourceChange[]=[];
        let deletedSamples:readonly {uuid:string}[];let newAnchor:string;let count:number;
        if (metric==='sleep') {
          const result=await HK.queryCategorySamplesWithAnchor('HKCategoryTypeIdentifierSleepAnalysis',options);
          for (const row of result.samples) changes.push(upsert(row,metric,[1,3,4,5].includes(row.value)?(row.endDate.getTime()-row.startDate.getTime())/60000:undefined));
          ({deletedSamples,newAnchor}=result);count=result.samples.length;
        } else if (metric==='exercise') {
          const result=await HK.queryWorkoutSamplesWithAnchor(options);
          for (const row of result.workouts) changes.push(upsert(row,metric,row.duration.quantity,row.duration.unit));
          ({deletedSamples,newAnchor}=result);count=result.workouts.length;
        } else {
          const [identifier,unit]=quantities[metric];
          const result=await HK.queryQuantitySamplesWithAnchor(identifier,{...options,unit});
          for (const row of result.samples) changes.push(upsert(row,metric,row.quantity,unit==='count/min'?'bpm':unit));
          ({deletedSamples,newAnchor}=result);count=result.samples.length;
        }
        if (!newAnchor) throw new Error('health_anchor_missing');
        for (const row of deletedSamples) {
          if (!row.uuid || changes.some(change=>change.sourceRecordId===row.uuid)) throw new Error('health_ambiguous_source_change');
          changes.push({kind:'delete',sourcePlatform:'healthkit',metric,sourceRecordId:row.uuid});
        }
        return {observations:changes.flatMap(row=>row.kind==='upsert'?row.observations:[]),changes,completedMetrics:[metric],limitations:['HEALTHKIT_READ_ACCESS_UNDISCLOSED'],nextCursor:{sourcePlatform:'healthkit',token:newAnchor,since,historyGap:cursor?.historyGap},hasMoreChanges:count+deletedSamples.length>=500};
      } catch {
        // An unreadable/invalid anchor is not permission evidence or a deletion.
        return {observations:[],completedMetrics:[],limitations:['READ_FAILED_'+metric]};
      }
    },
  };
}
