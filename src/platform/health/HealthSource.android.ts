import * as HC from 'react-native-health-connect';
import type { HealthMetric, HealthObservationV1, HealthReadResult, HealthSource, HealthSourceChange } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import { normalizeHealthSample, type RawHealthSample } from './normalization';

const records = {sleep:'SleepSession',steps:'Steps',heart_rate:'HeartRate',resting_heart_rate:'RestingHeartRate',hrv:'HeartRateVariabilityRmssd',exercise:'ExerciseSession',active_energy:'ActiveCaloriesBurned',distance:'Distance'} as const;
type SelectedRecord = Extract<HC.HealthConnectRecordResult, {recordType: (typeof records)[HealthMetric]}>;

function sourceRecord(raw: object, metric: HealthMetric): HealthSourceChange & {kind:'upsert'} {
  if ('recordType' in raw && raw.recordType!==records[metric]) throw new Error('health_record_type_mismatch');
  const record={...raw,recordType:records[metric]} as SelectedRecord;
  const id=record.metadata?.id;
  if (!id) throw new Error('health_source_id_missing');
  const startAt='startTime' in record?record.startTime:record.time;
  const endAt='endTime' in record?record.endTime:startAt;
  if (!Number.isFinite(Date.parse(startAt)) || !Number.isFinite(Date.parse(endAt)) || Date.parse(endAt)<Date.parse(startAt)) throw new Error('health_source_interval_invalid');
  const sourceModifiedAt=record.metadata?.lastModifiedTime;
  if (sourceModifiedAt && !Number.isFinite(Date.parse(sourceModifiedAt))) throw new Error('health_source_revision_invalid');
  const zone='startZoneOffset' in record?record.startZoneOffset:'zoneOffset' in record?record.zoneOffset:undefined;
  const base: Omit<RawHealthSample,'unit'>={metric,externalId:id,sourceRecordId:id,sourceModifiedAt,startAt,endAt,availableAt:new Date().toISOString(),platform:'health_connect',app:record.metadata?.dataOrigin,device:record.metadata?.device?.model,method:record.metadata?.recordingMethod===2?'automatic':record.metadata?.recordingMethod===3?'manual':'unknown',timezoneOffset:zone?.totalSeconds==null?undefined:zone.totalSeconds/60,measurementMethod:metric==='hrv'?'rmssd':undefined};
  const observations: HealthObservationV1[]=[];
  const add=(value:number|undefined,unit:string,extra:Partial<RawHealthSample>={})=>{
    const row=normalizeHealthSample({...base,value,unit,...extra});
    if (!row) throw new Error('health_sample_invalid');
    observations.push(row);
  };
  switch(record.recordType) {
    case 'Steps': add(record.count,'count');break;
    case 'HeartRate': record.samples.forEach(s=>add(s.beatsPerMinute,'bpm',{externalId:id+':'+s.time,startAt:s.time,endAt:s.time}));break;
    case 'RestingHeartRate': add(record.beatsPerMinute,'bpm');break;
    case 'HeartRateVariabilityRmssd': add(record.heartRateVariabilityMillis,'ms');break;
    case 'ExerciseSession': add((Date.parse(endAt)-Date.parse(startAt))/60000,'min');break;
    case 'SleepSession':
      record.stages?.filter(s=>[2,4,5,6].includes(s.stage)).sort((a,b)=>Date.parse(a.endTime)-Date.parse(b.endTime)).forEach(s=>{
        if (Date.parse(s.startTime)<Date.parse(startAt) || Date.parse(s.endTime)>Date.parse(endAt)) throw new Error('health_sleep_stage_outside_session');
        add((Date.parse(s.endTime)-Date.parse(s.startTime))/60000,'min',{externalId:id+':'+s.startTime,startAt:s.startTime,endAt:s.endTime});
      });break;
    case 'Distance': add(record.distance.inMeters,'m');break;
    case 'ActiveCaloriesBurned': add(record.energy.inKilocalories,'kcal');break;
  }
  return {kind:'upsert',sourcePlatform:'health_connect',metric,sourceRecordId:id,sourceModifiedAt,observations};
}
function changePage(result: HC.GetChangesResults, metric: HealthMetric): HealthSourceChange[] {
  if (!result.nextChangesToken || result.changesTokenExpired) throw new Error('health_change_token_invalid');
  const changes:HealthSourceChange[]=result.upsertionChanges.map(row=>sourceRecord(row.record,metric));
  for (const deletion of result.deletionChanges) {
    if (!deletion.recordId || changes.some(row=>row.sourceRecordId===deletion.recordId)) throw new Error('health_ambiguous_source_change');
    changes.push({kind:'delete',sourcePlatform:'health_connect',metric,sourceRecordId:deletion.recordId});
  }
  return changes;
}
export function createHealthSource(repo: DeviceRepository): HealthSource {
  const source:HealthSource={
    platform:'health_connect',
    isAvailable:async()=> (await HC.getSdkStatus())===HC.SdkAvailabilityStatus.SDK_AVAILABLE && await HC.initialize(),
    requestPermissions:async metrics=>{
      if (!await HC.initialize()) return {state:'unavailable',metrics:[]};
      const granted=await HC.requestPermission(metrics.map(metric=>({accessType:'read',recordType:records[metric]})));
      const enabled=metrics.filter(metric=>granted.some(p=>'recordType' in p && p.recordType===records[metric] && p.accessType==='read'));
      return {state:enabled.length===0?'denied':enabled.length===metrics.length?'granted':'partial',metrics:enabled};
    },
    getSyncStatus:async()=> (await repo.read()).health,
    readSince:async(start,end,metrics):Promise<HealthReadResult>=>{
      if (!await HC.initialize()) throw new Error('health_connect_unavailable');
      const granted=await HC.getGrantedPermissions();
      const changes:HealthSourceChange[]=[];const completedMetrics:HealthMetric[]=[];
      const limitations=['HISTORY_RESTRICTED_BY_OS_PERMISSION','FOREGROUND_ONLY'];
      for (const metric of metrics) {
        if (!granted.some(p=>'recordType' in p && p.recordType===records[metric] && p.accessType==='read')) continue;
        const batchStart=changes.length;
        try {
          let pageToken:string|undefined;const seen=new Set<string>();
          do {
            const result=await HC.readRecords(records[metric],{timeRangeFilter:{operator:'between',startTime:start,endTime:end},pageSize:1000,pageToken});
            for (const raw of result.records) changes.push(sourceRecord(raw,metric));
            pageToken=result.pageToken;
            if (pageToken && seen.has(pageToken)) throw new Error('health_page_token_repeated');
            if (pageToken) seen.add(pageToken);
          } while(pageToken);
          completedMetrics.push(metric);
        } catch { changes.splice(batchStart);limitations.push('READ_FAILED_'+metric); }
      }
      return {observations:changes.flatMap(row=>row.kind==='upsert'?row.observations:[]),changes,completedMetrics,limitations};
    },
    readChanges:async(metric,cursor,start,end):Promise<HealthReadResult>=>{
      const failed=():HealthReadResult=>({observations:[],completedMetrics:[],limitations:['READ_FAILED_'+metric]});
      try {
        if (!await HC.initialize()) return failed();
        const granted=await HC.getGrantedPermissions();
        if (!granted.some(p=>'recordType' in p && p.recordType===records[metric] && p.accessType==='read')) return failed();
        if (cursor && cursor.sourcePlatform!=='health_connect') return failed();
        let result=await HC.getChanges(cursor?{changesToken:cursor.token}:{recordTypes:[records[metric]]});
        let bootstrap=!cursor;let historyGap=cursor?.historyGap;
        if (result.changesTokenExpired) {
          result=await HC.getChanges({recordTypes:[records[metric]]});bootstrap=true;historyGap=true;
        }
        const changes=changePage(result,metric);
        const since=cursor?.since??start;
        if (bootstrap) {
          // Reserve the feed before the snapshot. The mandatory follow-up consumes
          // all changes made while snapshot pages were being read.
          const snapshot=await source.readSince(since,end,[metric]);
          if (!snapshot.completedMetrics.includes(metric)) return failed();
          changes.unshift(...snapshot.changes??[]);
        }
        return {observations:changes.flatMap(row=>row.kind==='upsert'?row.observations:[]),changes,completedMetrics:[metric],limitations:historyGap?['HEALTH_CHANGE_HISTORY_GAP']:[],nextCursor:{sourcePlatform:'health_connect',token:result.nextChangesToken,since,historyGap},hasMoreChanges:bootstrap||result.hasMore};
      } catch { return failed(); }
    },
  };
  return source;
}
