import type { HealthSource, HealthMetric, HealthChangeCursor } from '../contracts';
import { DeviceRepository, type DeviceData } from '../deviceRepository';
import { mergeHealthObservations } from './normalization';
import { applyHealthChanges, validHealthChangeBatch } from './changes';

export class HealthSync {
  private inFlight: Promise<number> | null = null;
  constructor(private source: HealthSource, private repo: DeviceRepository, private now = () => new Date()) {}
  async connect(metrics: readonly HealthMetric[]) {
    if (!await this.source.isAvailable()) throw new Error('health_unavailable');
    const permission = await this.source.requestPermissions(metrics);
    const enabledMetrics = [...new Set(permission.metrics.filter(metric => metrics.includes(metric)))];
    await this.repo.update(data => ({ ...data, health: { ...data.health, connectionRevision:(data.health.connectionRevision??0)+1, permission: permission.state, connected: ['granted','partial','read_access_unknown'].includes(permission.state) && enabledMetrics.length > 0, enabledMetrics, error: undefined } }));
    return permission;
  }
  sync(resyncSevenDays = false): Promise<number> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.run(resyncSevenDays).finally(() => { this.inFlight = null; });
    return this.inFlight;
  }
  private async run(resyncSevenDays: boolean) {
    const before = await this.repo.read();
    if (!before.health.connected) return 0;
    const end = this.now().toISOString();
    if (this.source.readChanges) return this.runChanges(before,end,resyncSevenDays);
    // One day overlap catches late writes without rereading all historical data.
    const days = 86400000;
    try {
      const batch = { observations: [] as import('../contracts').HealthObservationV1[], completedMetrics: [] as HealthMetric[], limitations: [] as string[] };
      for (const metric of new Set(before.health.enabledMetrics)) {
        const checkpoint = before.health.metricCheckpoints?.[metric];
        const checkpointTime = Date.parse(checkpoint ?? '');
        const start = new Date(!resyncSevenDays && Number.isFinite(checkpointTime) && checkpointTime <= Date.parse(end) ? checkpointTime - days : Date.parse(end) - 7 * days).toISOString();
        const result = await this.source.readSince(start,end,[metric]);
        // A failed page must not commit a partial replacement or advance a cursor.
        if (result.completedMetrics.includes(metric) && result.observations.every(row => row.metric === metric)) {
          batch.observations.push(...result.observations); batch.completedMetrics.push(metric);
        }
        batch.limitations.push(...result.limitations);
      }
      let imported = 0;
      await this.repo.update(current => {
        if (!current.health.connected || current.health.connectionRevision!==before.health.connectionRevision) return current;
        const observations = mergeHealthObservations(current.observations, batch.observations);
        imported = observations.length - current.observations.length;
        const complete = before.health.enabledMetrics.every(metric => batch.completedMetrics.includes(metric));
        const metricCheckpoints = { ...current.health.metricCheckpoints };
        batch.completedMetrics.forEach(metric => { metricCheckpoints[metric] = end; });
        return { ...current, observations, health: { ...current.health, metricCheckpoints, imported: observations.length, lastSyncedAt: complete ? end : current.health.lastSyncedAt, permission: complete ? current.health.permission : 'partial', error: complete ? undefined : 'health_partial_read_retry_required' } };
      });
      return imported;
    } catch {
      await this.repo.update(data => data.health.connectionRevision!==before.health.connectionRevision ? data : ({ ...data, health: { ...data.health, error: 'health_sync_failed' } }));
      throw new Error('health_sync_failed');
    }
  }
  private async runChanges(before: DeviceData, end: string, resync: boolean) {
    let imported=0;let complete=true;let more=false;let historyGap=false;
    const connected=(data:DeviceData)=>data.health.connected && data.health.connectionRevision===before.health.connectionRevision;
    try {
      for (const metric of new Set(before.health.enabledMetrics)) {
        let cursor=before.health.changeCursors?.[metric];
        let start=new Date(Date.parse(end)-7*86400000).toISOString();
        for (const row of before.observations) if (row.metric===metric && (!this.source.platform || row.sourcePlatform===this.source.platform) && Date.parse(row.eventStartAt)<Date.parse(start)) start=row.eventStartAt;
        if (resync && cursor) {
          const snapshot=await this.source.readSince(new Date(Date.parse(end)-7*86400000).toISOString(),end,[metric]);
          const valid=snapshot.changes
            ? snapshot.changes.every(change=>change.kind==='upsert') && validHealthChangeBatch({...snapshot,nextCursor:cursor},metric,this.source.platform)
            : snapshot.completedMetrics.includes(metric) && snapshot.observations.every(row=>row.metric===metric && row.sourcePlatform===cursor!.sourcePlatform);
          if (valid) {
            let accepted=false;
            await this.repo.update(current=>{
              if (!connected(current) || !this.sameCursor(current.health.changeCursors?.[metric],cursor)) return current;
              const next=snapshot.changes?applyHealthChanges(current.observations,current.healthDeletions??[],snapshot.changes,end):{observations:mergeHealthObservations(current.observations,snapshot.observations)};
              const oldIds=new Set(current.observations.map(row=>row.id));
              imported+=next.observations.filter(row=>!oldIds.has(row.id)).length;
              accepted=true;
              return {...current,...next,health:{...current.health,imported:next.observations.length}};
            });
            if (!accepted) return imported;
          } else complete=false;
        }
        const seen=new Set<string>();if(cursor)seen.add(cursor.token);
        let finished=false;
        for (let page=0;page<20;page++) {
          const result=await this.source.readChanges!(metric,cursor,start,end);
          if (!validHealthChangeBatch(result,metric,this.source.platform)) {complete=false;break;}
          const nextCursor=result.nextCursor!;
          if (seen.has(nextCursor.token) && (result.hasMoreChanges || result.changes!.length>0)) {complete=false;break;}
          let accepted=false;
          await this.repo.update(current=>{
            if (!connected(current) || !this.sameCursor(current.health.changeCursors?.[metric],cursor)) return current;
            const next=applyHealthChanges(current.observations,current.healthDeletions??[],result.changes!,end);
            const oldIds=new Set(current.observations.map(row=>row.id));
            imported+=next.observations.filter(row=>!oldIds.has(row.id)).length;
            accepted=true;
            return {...current,...next,health:{...current.health,imported:next.observations.length,changeCursors:{...current.health.changeCursors,[metric]:nextCursor},metricCheckpoints:result.hasMoreChanges?current.health.metricCheckpoints:{...current.health.metricCheckpoints,[metric]:end}}};
          });
          if (!accepted) return imported;
          cursor=nextCursor;seen.add(cursor.token);historyGap ||= !!cursor.historyGap;
          if (!result.hasMoreChanges) {finished=true;break;}
          if (page===19) more=true;
        }
        if (!finished) complete=false;
      }
      await this.repo.update(current=>!connected(current)?current:({...current,health:{...current.health,lastSyncedAt:complete?end:current.health.lastSyncedAt,permission:complete?current.health.permission:'partial',error:!complete?(more?'health_more_changes_pending':'health_partial_read_retry_required'):historyGap?'health_change_history_gap':undefined}}));
      return imported;
    } catch {
      await this.repo.update(current=>!connected(current)?current:({...current,health:{...current.health,error:'health_sync_failed'}}));
      throw new Error('health_sync_failed');
    }
  }
  private sameCursor(a:HealthChangeCursor|undefined,b:HealthChangeCursor|undefined) {
    return a?.token===b?.token && a?.sourcePlatform===b?.sourcePlatform && a?.since===b?.since;
  }
  async disconnect() {
    await this.repo.update(data => ({ ...data, health: { ...data.health, connectionRevision:(data.health.connectionRevision??0)+1, connected: false } }));
  }
}
