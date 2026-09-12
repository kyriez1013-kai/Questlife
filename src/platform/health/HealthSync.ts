import type { HealthSource, HealthMetric } from '../contracts';
import { DeviceRepository } from '../deviceRepository';
import { mergeHealthObservations } from './normalization';

export class HealthSync {
  private inFlight: Promise<number> | null = null;
  constructor(private source: HealthSource, private repo: DeviceRepository, private now = () => new Date()) {}
  async connect(metrics: readonly HealthMetric[]) {
    if (!await this.source.isAvailable()) throw new Error('health_unavailable');
    const permission = await this.source.requestPermissions(metrics);
    await this.repo.update(data => ({ ...data, health: { ...data.health, permission: permission.state, connected: permission.state !== 'denied' && permission.state !== 'unavailable', enabledMetrics: permission.metrics, error: undefined } }));
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
    const start = new Date(!resyncSevenDays && before.health.lastSyncedAt ? Date.parse(before.health.lastSyncedAt) - days : Date.parse(end) - 7 * days).toISOString();
    try {
      const batch = await this.source.readSince(start,end,before.health.enabledMetrics);
      let imported = 0;
      await this.repo.update(current => {
        if (!current.health.connected) return current;
        const observations = mergeHealthObservations(current.observations, batch.observations);
        imported = observations.length - current.observations.length;
        const complete = before.health.enabledMetrics.every(metric => batch.completedMetrics.includes(metric));
        return { ...current, observations, health: { ...current.health, imported: observations.length, lastSyncedAt: complete ? end : current.health.lastSyncedAt, permission: complete ? current.health.permission : 'partial', error: complete ? undefined : 'health_partial_read_retry_required' } };
      });
      return imported;
    } catch {
      await this.repo.update(data => ({ ...data, health: { ...data.health, error: 'health_sync_failed' } }));
      throw new Error('health_sync_failed');
    }
  }
  async disconnect() {
    await this.repo.update(data => ({ ...data, health: { ...data.health, connected: false } }));
  }
}
