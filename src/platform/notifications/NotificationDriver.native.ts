import * as N from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationDriver } from './NotificationService';
import { parseNotificationIntent } from './NotificationService';
import { nativeCopy } from '../nativeI18n';
const seenResponses = new Set<string>();
const seenPushResponses = new Set<string>();
let pushResponseEpoch = 0;
const pushTest = (data: Record<string, unknown>) => data.source === 'questlife' && data.kind === 'push_test';
const validPushTest = (data: Record<string, unknown>) => pushTest(data)
  && Object.keys(data).length === 3 && typeof data.registrationId === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.registrationId);
const responseKey = (response: N.NotificationResponse) => `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
const ownedNotification = (notification: N.Notification) => notification.request.identifier.startsWith('questlife:')
  || pushTest(notification.request.content.data);

export function invalidatePushResponseGuards() { pushResponseEpoch++; }
async function currentPushTest(data: Record<string, unknown>): Promise<boolean> {
  if (!validPushTest(data)) return false;
  const { matchesCurrentPushRegistration } = await import('../../sync-v2/pushRegistry');
  return matchesCurrentPushRegistration(data.registrationId);
}
export function subscribePushTokenChanges(listener: () => void): () => void {
  // Expo's event contains an APNs/FCM token, not an Expo token. Reacquire through the service.
  const subscription = N.addPushTokenListener(() => { invalidatePushResponseGuards(); listener(); });
  return () => subscription.remove();
}
export function subscribePushTestResponses(open: () => void): () => void {
  let active = true;
  const checking = new Set<string>();
  const handle = async (response: N.NotificationResponse) => {
    const data = response.notification.request.content.data;
    if (!active || !pushTest(data)) return;
    const key = responseKey(response), epoch = pushResponseEpoch;
    if (seenPushResponses.has(key) || checking.has(key)) return;
    checking.add(key);
    try {
      if (response.actionIdentifier === N.DEFAULT_ACTION_IDENTIFIER && await currentPushTest(data)
        && active && epoch === pushResponseEpoch && !seenPushResponses.has(key)) {
        seenPushResponses.add(key);
        if (seenPushResponses.size > 256) seenPushResponses.delete(seenPushResponses.values().next().value!);
        open();
      }
      const last = await N.getLastNotificationResponseAsync();
      if (active && last && responseKey(last) === key) await N.clearLastNotificationResponseAsync();
    } catch { /* Unavailable identity/registry is not permission to open an account-bound response. */ }
    finally { checking.delete(key); }
  };
  const subscription = N.addNotificationResponseReceivedListener(response => { void handle(response); });
  void N.getLastNotificationResponseAsync().then(response => { if (response) void handle(response); }).catch(() => undefined);
  return () => { active = false; subscription.remove(); };
}

export async function clearOwnedNotificationResponses() {
  invalidatePushResponseGuards();
  await reconcileOwnedNotifications([]);
  const last = await N.getLastNotificationResponseAsync();
  if (last && ownedNotification(last.notification)) await N.clearLastNotificationResponseAsync();
  const delivered = await N.getPresentedNotificationsAsync();
  for (const notification of delivered) if (ownedNotification(notification)) await N.dismissNotificationAsync(notification.request.identifier);
}
export async function reconcileOwnedNotifications(expectedIds: readonly string[]) {
  const desired = new Set(expectedIds);
  for (const request of await N.getAllScheduledNotificationsAsync()) {
    if (request.identifier.startsWith('questlife:') && !desired.has(request.identifier)) await N.cancelScheduledNotificationAsync(request.identifier);
  }
}

N.setNotificationHandler({handleNotification:async notification=>{
  let show = true;
  if (notification.request.content.data.kind === 'push_test') {
    const epoch = pushResponseEpoch;
    try { show = await currentPushTest(notification.request.content.data) && epoch === pushResponseEpoch; }
    catch { show = false; }
  }
  return {shouldShowBanner:show,shouldShowList:show,shouldPlaySound:false,shouldSetBadge:false};
}});

export function createNotificationDriver(lang: 'zh'|'en'):NotificationDriver {
  return {
    permission: async request=>{
      if(request && Platform.OS === 'android') await N.setNotificationChannelAsync('questlife',{name:'QuestLife',importance:N.AndroidImportance.DEFAULT});
      const p = request ? await N.requestPermissionsAsync() : await N.getPermissionsAsync();
      if(request && p.granted) await N.setNotificationCategoryAsync('questlife-block',[
        {identifier:'START',buttonTitle:nativeCopy(lang,'start'),options:{opensAppToForeground:true}},
        {identifier:'DONE',buttonTitle:nativeCopy(lang,'done'),options:{opensAppToForeground:true}},
        {identifier:'SNOOZE',buttonTitle:nativeCopy(lang,'snooze'),options:{opensAppToForeground:true}},
        {identifier:'SKIP',buttonTitle:nativeCopy(lang,'skip'),options:{opensAppToForeground:true}},
      ]);
      return p.granted ? 'granted' : p.status === 'undetermined' ? 'not_requested' : 'denied';
    },
    schedule: r=>N.scheduleNotificationAsync({identifier:r.id,content:{title:'QuestLife',body:nativeCopy(lang,'open'),categoryIdentifier:r.kind === 'accepted_block' ? 'questlife-block' : undefined,data:{source:'questlife',kind:r.kind,entityId:r.entityId}},trigger:r.daily?{type:N.SchedulableTriggerInputTypes.DAILY,hour:r.daily.hour,minute:r.daily.minute,channelId:'questlife'}:{type:N.SchedulableTriggerInputTypes.DATE,date:new Date(r.at),channelId:'questlife'}}),
    cancel:async id=>{await N.cancelScheduledNotificationAsync(id);await N.dismissNotificationAsync(id);},
    subscribe:listener=>{
      let active = true;
      const handle = (response:N.NotificationResponse)=>{
        if (response.notification.request.content.data.kind === 'push_test') return;
        const key=`${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
        if(!active || seenResponses.has(key))return;
        seenResponses.add(key);
        if (seenResponses.size > 256) seenResponses.delete(seenResponses.values().next().value!);
        const intent=parseNotificationIntent(response.notification.request.content.data,response.actionIdentifier === N.DEFAULT_ACTION_IDENTIFIER ? 'OPEN' : response.actionIdentifier,response.notification.request.identifier);
        if(intent){listener(intent);void N.clearLastNotificationResponseAsync().catch(()=>undefined);}
      };
      const subscription=N.addNotificationResponseReceivedListener(handle);
      void N.getLastNotificationResponseAsync().then(r=>{if(r)handle(r);}).catch(()=>undefined);
      return ()=>{active=false;subscription.remove();};
    },
    token:async id=>{if((await N.getPermissionsAsync()).granted)return (await N.getExpoPushTokenAsync({projectId:id})).data;return null;},
  };
}
