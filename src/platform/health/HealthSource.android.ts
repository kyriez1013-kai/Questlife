import * as HC from 'react-native-health-connect';
import type { HealthMetric, HealthObservationV1, HealthReadResult, HealthSource } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import { normalizeHealthSample, type RawHealthSample } from './normalization';

const records = {sleep:'SleepSession',steps:'Steps',heart_rate:'HeartRate',resting_heart_rate:'RestingHeartRate',hrv:'HeartRateVariabilityRmssd',exercise:'ExerciseSession',active_energy:'ActiveCaloriesBurned',distance:'Distance'} as const;
type SelectedRecord = Extract<HC.HealthConnectRecordResult, {recordType: (typeof records)[HealthMetric]}>;
export function createHealthSource(repo: DeviceRepository): HealthSource {
  return {
    isAvailable: async () => (await HC.getSdkStatus()) === HC.SdkAvailabilityStatus.SDK_AVAILABLE && await HC.initialize(),
    requestPermissions: async metrics => {
      if(!await HC.initialize()) return {state:'unavailable',metrics:[]};
      const granted = await HC.requestPermission(metrics.map(metric=>({accessType:'read',recordType:records[metric]})));
      const enabled = metrics.filter(metric=>granted.some(p=>'recordType' in p && p.recordType === records[metric] && p.accessType === 'read'));
      return {state:enabled.length === 0 ? 'denied' : enabled.length === metrics.length ? 'granted' : 'partial',metrics:[...enabled]};
    },
    getSyncStatus: async ()=>(await repo.read()).health,
    readSince: async (start,end,metrics):Promise<HealthReadResult> => {
      if(!await HC.initialize()) throw new Error('health_connect_unavailable');
      const granted = await HC.getGrantedPermissions();
      const observations:HealthObservationV1[] = []; const completedMetrics:HealthMetric[] = []; const limitations = ['HISTORY_RESTRICTED_BY_OS_PERMISSION','FOREGROUND_ONLY'];
      for(const metric of metrics) {
        if(!granted.some(p=>'recordType' in p && p.recordType === records[metric] && p.accessType === 'read')) continue;
        try {
          let pageToken:string|undefined;
          do {
            const result = await HC.readRecords(records[metric],{timeRangeFilter:{operator:'between',startTime:start,endTime:end},pageSize:1000,pageToken});
            for(const raw of result.records) {
              // The bridge strips recordType. Reattach the type used in this exact query.
              const record = { ...raw, recordType: records[metric] } as SelectedRecord;
              const id = record.metadata?.id; if(!id) continue;
              const startAt = 'startTime' in record ? record.startTime : record.time;
              const endAt = 'endTime' in record ? record.endTime : startAt;
              const zone='startZoneOffset' in record?record.startZoneOffset:'zoneOffset' in record?record.zoneOffset:undefined;
              const base: Omit<RawHealthSample,'unit'> = {metric,externalId:id,startAt,endAt,availableAt:new Date().toISOString(),platform:'health_connect',app:record.metadata?.dataOrigin,device:record.metadata?.device?.model,method:record.metadata?.recordingMethod === 2 ? 'automatic' : record.metadata?.recordingMethod === 3 ? 'manual' : 'unknown',timezoneOffset:zone?.totalSeconds==null?undefined:zone.totalSeconds/60,measurementMethod:metric === 'hrv' ? 'rmssd' : undefined};
              const add = (value:number|undefined,unit:string,extra:Partial<RawHealthSample>={}) => { const row=normalizeHealthSample({...base,value,unit,...extra}); if(row)observations.push(row); };
              switch(record.recordType) {
                case 'Steps': add(record.count,'count'); break;
                case 'HeartRate': record.samples.forEach(s=>add(s.beatsPerMinute,'bpm',{externalId:`${id}:${s.time}`,startAt:s.time,endAt:s.time})); break;
                case 'RestingHeartRate': add(record.beatsPerMinute,'bpm'); break;
                case 'HeartRateVariabilityRmssd': add(record.heartRateVariabilityMillis,'ms'); break;
                case 'ExerciseSession': add((Date.parse(endAt)-Date.parse(startAt))/60000,'min'); break;
                case 'SleepSession':
                  // Session bounds can include awake periods. Keep only explicit asleep stages.
                  record.stages?.filter(s=>[2,4,5,6].includes(s.stage)).forEach(s=>add((Date.parse(s.endTime)-Date.parse(s.startTime))/60000,'min',{externalId:`${id}:${s.startTime}`,startAt:s.startTime,endAt:s.endTime})); break;
                case 'Distance': add(record.distance.inMeters,'m'); break;
                case 'ActiveCaloriesBurned': add(record.energy.inKilocalories,'kcal'); break;
              }
            }
            pageToken = result.pageToken;
          } while(pageToken);
          completedMetrics.push(metric);
        } catch { limitations.push(`READ_FAILED_${metric}`); }
      }
      return {observations,completedMetrics,limitations};
    },
  };
}
