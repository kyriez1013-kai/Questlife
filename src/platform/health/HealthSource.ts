import type { HealthSource } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
export function createHealthSource(repo: DeviceRepository): HealthSource {
  return { isAvailable: async()=>false, requestPermissions: async()=>({state:'unavailable',metrics:[]}), readSince: async()=>({observations:[],completedMetrics:[],limitations:['NATIVE_REQUIRED']}), getSyncStatus: async()=>(await repo.read()).health };
}
