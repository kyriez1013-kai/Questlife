import type { NotificationRequest, NotificationService, PermissionState, QuickActionIntent, QuickActionService } from '../contracts';

export interface NotificationDriver {
  permission(request: boolean): Promise<PermissionState>;
  schedule(request: NotificationRequest): Promise<string>; cancel(id: string): Promise<void>;
  subscribe(listener: (intent: QuickActionIntent) => void): () => void;
  token(projectId: string): Promise<string | null>;
}
export function createNotificationService(driver: NotificationDriver, now = () => Date.now()): NotificationService {
  const validate = async (request: NotificationRequest) => {
    if (!request.id.startsWith('questlife:') || Date.parse(request.at) <= now() || !Number.isFinite(Date.parse(request.at))) throw new Error('notification_invalid_request');
    if (request.daily && (!Number.isInteger(request.daily.hour) || request.daily.hour < 0 || request.daily.hour > 23 || !Number.isInteger(request.daily.minute) || request.daily.minute < 0 || request.daily.minute > 59)) throw new Error('notification_invalid_request');
    if(await driver.permission(false) !== 'granted') throw new Error('notification_permission_required');
  };
  const schedule = async(request:NotificationRequest)=>{await validate(request);return driver.schedule(request);};
  const cancel = async (id: string) => { if(!id.startsWith('questlife:')) throw new Error('notification_not_owned'); await driver.cancel(id); };
  return {permission:()=>driver.permission(false),requestPermission:()=>driver.permission(true),schedule,cancel,reschedule:async request=>{ await validate(request); await cancel(request.id); return driver.schedule(request); },subscribe:listener=>driver.subscribe(listener),getPushToken:id=>driver.token(id)};
}
export function parseNotificationIntent(data: Record<string,unknown>, action: string, notificationId: string): QuickActionIntent | null {
  if(data.source !== 'questlife' || !notificationId.startsWith('questlife:')) return null;
  if(!['accepted_block','decision_followup','morning_state','end_of_day','skill_reminder'].includes(String(data.kind))) return null;
  if(!['START','DONE','SNOOZE','SKIP','OPEN'].includes(action)) return null;
  return {action:action as QuickActionIntent['action'],kind:data.kind as QuickActionIntent['kind'],entityId:typeof data.entityId === 'string' ? data.entityId : undefined,notificationId};
}
export function createQuickActionService(handlers: Record<QuickActionIntent['action'],(intent:QuickActionIntent)=>Promise<void>>): QuickActionService {
  return { dispatch: async intent => { if(!intent.notificationId.startsWith('questlife:')) throw new Error('notification_not_owned'); await handlers[intent.action](intent); } };
}
