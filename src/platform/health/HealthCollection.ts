import type { HealthObservationV1, KeyValueStorage } from '../contracts';

const PREFIX = 'questlife.health.v1.bucket.';
const BUCKETS = 128;
function bucket(id: string) {
  let hash = 2166136261;
  for (let i=0;i<id.length;i++) hash = Math.imul(hash ^ id.charCodeAt(i),16777619);
  return (hash >>> 0) % BUCKETS;
}
/** Bounded partitions: a sample edit does not rewrite AppData or all Health. */
export class HealthCollection {
  constructor(private storage: KeyValueStorage) {}
  async read(): Promise<HealthObservationV1[]> {
    const rows: HealthObservationV1[] = [];
    for (let i=0;i<BUCKETS;i++) {
      const raw = await this.storage.getItem(PREFIX+i);
      if (raw) {
        const part = JSON.parse(raw);
        if (!Array.isArray(part)) throw new Error('health_partition_invalid');
        rows.push(...part);
      }
    }
    return rows.sort((a,b)=>a.eventStartAt.localeCompare(b.eventStartAt)||a.id.localeCompare(b.id));
  }
  async write(previous: HealthObservationV1[], next: HealthObservationV1[]) {
    const before = Array.from({length:BUCKETS},()=>[] as HealthObservationV1[]);
    const after = Array.from({length:BUCKETS},()=>[] as HealthObservationV1[]);
    previous.forEach(row=>before[bucket(row.id)].push(row));next.forEach(row=>after[bucket(row.id)].push(row));
    for(let i=0;i<BUCKETS;i++) {
      before[i].sort((a,b)=>a.id.localeCompare(b.id));after[i].sort((a,b)=>a.id.localeCompare(b.id));
      const serialized=JSON.stringify(after[i]);
      if(serialized!==JSON.stringify(before[i]))await this.storage.setItem(PREFIX+i,serialized);
    }
  }
}
