import type { HealthSource, HealthMetric } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import { mergeHealthObservations } from './normalization';

export class HealthSync {
  private inFlight: Promise<number> | null = null;
  constructor(private source: HealthSource, private repo: DeviceRepository, private now = () => new Date()) {}
  async connect(metrics: readonly HealthMetric[]) {
    if (!await this.source.isAvailable()) throw new Error('health_unavailable');
    const permission = await this.source.requestPermissions(metrics);
    await this.repo.update(data => ({ ...data, health: { ...data.health, connectionRevision:(data.health.connectionRevision??0)+1, permission: permission.state, connected: permission.state !== 'denied' && permission.state !== 'unavailable', enabledMetrics: permission.metrics, error: undefined } }));
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
    // One day overlap catches late writes without rereading all historical data.
    const days = 86400000;
    try {
      const batch = { observations: [] as import('../contracts').HealthObservationV1[], completedMetrics: [] as HealthMetric[], limitations: [] as string[] };
      for (const metric of before.health.enabledMetrics) {
        const checkpoint = before.health.metricCheckpoints?.[metric];
        const start = new Date(!resyncSevenDays && checkpoint ? Date.parse(checkpoint) - days : Date.parse(end) - 7 * days).toISOString();
        const result = await this.source.readSince(start,end,[metric]);
        batch.observations.push(...result.observations); batch.completedMetrics.push(...result.completedMetrics);
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
  async disconnect() {
    await this.repo.update(data => ({ ...data, health: { ...data.health, connectionRevision:(data.health.connectionRevision??0)+1, connected: false } }));
  }
}
