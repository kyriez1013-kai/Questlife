import * as HK from '@kingstinct/react-native-healthkit';
import type { HealthMetric, HealthReadResult, HealthSource, HealthObservationV1 } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import { normalizeHealthSample, type RawHealthSample } from './normalization';

const quantities = {
  steps: ['HKQuantityTypeIdentifierStepCount','count'],
  heart_rate: ['HKQuantityTypeIdentifierHeartRate','count/min'],
  resting_heart_rate: ['HKQuantityTypeIdentifierRestingHeartRate','count/min'],
  hrv: ['HKQuantityTypeIdentifierHeartRateVariabilitySDNN','ms'],
  active_energy: ['HKQuantityTypeIdentifierActiveEnergyBurned','kcal'],
  distance: ['HKQuantityTypeIdentifierDistanceWalkingRunning','m'],
} as const;
export function createHealthSource(repo: DeviceRepository): HealthSource {
  return {
    isAvailable: async () => HK.isHealthDataAvailable(),
    requestPermissions: async metrics => {
      await HK.requestAuthorization({ toRead: metrics.map(metric => metric === 'sleep' ? 'HKCategoryTypeIdentifierSleepAnalysis' : metric === 'exercise' ? 'HKWorkoutTypeIdentifier' : quantities[metric][0]), toShare: [] });
      // HealthKit intentionally does not reveal read denial. Never claim granted.
      return { state:'read_access_unknown',metrics:[...metrics] };
    },
    getSyncStatus: async () => (await repo.read()).health,
    readSince: async (start,end,metrics): Promise<HealthReadResult> => {
      const observations: HealthObservationV1[] = []; const completedMetrics: HealthMetric[] = []; const limitations: string[] = ['HEALTHKIT_READ_ACCESS_UNDISCLOSED'];
      const options = { limit:0, ascending:true, filter:{date:{startDate:new Date(start),endDate:new Date(end)}} };
      const add = (sample: {uuid:string; startDate:Date; endDate:Date; sourceRevision?:{source:{bundleIdentifier:string};productType?:string}}, metric: HealthMetric, value: number, unit: string) => {
        const raw: RawHealthSample = {metric,value,unit,externalId:sample.uuid,startAt:sample.startDate.toISOString(),endAt:sample.endDate.toISOString(),availableAt:end,platform:'healthkit',app:sample.sourceRevision?.source.bundleIdentifier,device:sample.sourceRevision?.productType,method:'unknown',measurementMethod:metric === 'hrv' ? 'sdnn' : undefined};
        const row = normalizeHealthSample(raw); if(row) observations.push(row);
      };
      for (const metric of metrics) {
        try {
          if(metric === 'sleep') {
            for(const row of await HK.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis',options)) {
              // Asleep/REM/core/deep only; in-bed and awake are not sleep duration.
              if([1,3,4,5].includes(row.value)) add(row,metric,(row.endDate.getTime()-row.startDate.getTime())/60000,'min');
            }
          } else if(metric === 'exercise') {
            for(const row of await HK.queryWorkoutSamples(options)) add(row,metric,row.duration.quantity,row.duration.unit);
          } else {
            const [identifier,unit] = quantities[metric];
            for(const row of await HK.queryQuantitySamples(identifier,{...options,unit})) add(row,metric,row.quantity,unit === 'count/min' ? 'bpm' : unit);
          }
          completedMetrics.push(metric);
        } catch { limitations.push(`READ_FAILED_${metric}`); }
      }
      return {observations,completedMetrics,limitations};
    },
  };
}
