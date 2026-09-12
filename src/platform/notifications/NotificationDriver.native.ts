import * as N from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationDriver } from './NotificationService';
import { parseNotificationIntent } from './NotificationService';
import { nativeCopy } from '../nativeI18n';

N.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});

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
    schedule: r=>N.scheduleNotificationAsync({identifier:r.id,content:{title:r.title,body:r.body,categoryIdentifier:r.kind === 'accepted_block' ? 'questlife-block' : undefined,data:{source:'questlife',kind:r.kind,entityId:r.entityId}},trigger:r.daily?{type:N.SchedulableTriggerInputTypes.DAILY,hour:r.daily.hour,minute:r.daily.minute,channelId:'questlife'}:{type:N.SchedulableTriggerInputTypes.DATE,date:new Date(r.at),channelId:'questlife'}}),
    cancel:id=>N.cancelScheduledNotificationAsync(id),
    subscribe:listener=>{
      const seen = new Set<string>();
      const handle = (response:N.NotificationResponse)=>{
        const key=`${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
        if(seen.has(key))return;
        seen.add(key);
        const intent=parseNotificationIntent(response.notification.request.content.data,response.actionIdentifier === N.DEFAULT_ACTION_IDENTIFIER ? 'OPEN' : response.actionIdentifier,response.notification.request.identifier);
        if(intent){listener(intent);void N.clearLastNotificationResponseAsync();}
      };
      const subscription=N.addNotificationResponseReceivedListener(handle);
      void N.getLastNotificationResponseAsync().then(r=>{if(r)handle(r);});
      return ()=>subscription.remove();
    },
    token:async id=>{if((await N.getPermissionsAsync()).granted)return (await N.getExpoPushTokenAsync({projectId:id})).data;return null;},
  };
}
