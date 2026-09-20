import type { NotificationService } from '../contracts';
import type { DeviceRepository } from '../deviceRepository';
import { clearPendingNotificationIntent } from './intentBus';
import { syncNotificationPlan } from './planner';

/** Seeded from the existing sync owner on cold start; never persists identity. */
export class NotificationSessionBoundary {
  private owner: string | null | undefined;
  private revision = 0;
  get ready() { return this.owner !== undefined; }
  get generation() { return this.revision; }
  observe(owner: string | null): boolean {
    if (this.owner === owner) return false;
    const changed = this.owner !== undefined;
    this.owner = owner;
    if (changed) this.revision++;
    return changed;
  }
}
export async function invalidateNotificationSession(repo: DeviceRepository, service: NotificationService, clearOS: () => Promise<void>) {
  clearPendingNotificationIntent();
  const disabled = await repo.update(data => ({...data,notificationsEnabled:false,snoozedNotifications:[]}));
  await syncNotificationPlan(repo,service,[]);
  await clearOS();
  return disabled;
}
