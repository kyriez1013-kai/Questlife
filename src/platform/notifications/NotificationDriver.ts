import type { NotificationDriver } from './NotificationService';
export function createNotificationDriver(_lang:'zh'|'en'):NotificationDriver {
  return {permission:async()=>'unavailable',schedule:async()=>{throw new Error('native_notifications_required');},cancel:async()=>{},subscribe:()=>()=>{},token:async()=>null};
}
