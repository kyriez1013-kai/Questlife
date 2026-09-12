import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {useStore} from '../../store';
import {getLanguage} from '../../i18n';
import {useDeviceData} from '../useDeviceData';
import {deviceRepository,notifications} from '../services';
import {planLocalNotifications,syncNotificationPlan} from './planner';
import {deliverNotificationIntent} from './intentBus';
import {nativeCopy as c} from '../nativeI18n';

export default function NotificationCoordinator({navigateToday}:{navigateToday:()=>void}) {
  const {data}=useStore();const {data:device}=useDeviceData();const lang=getLanguage(data.settings.language);const service=useMemo(()=>notifications(lang),[lang]);
  const [now,setNow]=useState(()=>new Date());const queue=useRef(Promise.resolve());
  const signature=JSON.stringify(planLocalNotifications(data,device,now,lang));
  useEffect(()=>{const sub=AppState.addEventListener('change',v=>{if(v==='active')setNow(new Date());});return()=>sub.remove();},[]);
  useEffect(()=>{queue.current=queue.current.then(()=>syncNotificationPlan(deviceRepository,service,JSON.parse(signature))).catch(async()=>{await deviceRepository.update(d=>({...d,notificationError:'notification_schedule_failed'})).catch(()=>undefined);});},[signature,service]);
  useEffect(()=>service.subscribe(intent=>{
    if(intent.action==='SNOOZE'){
      const request={id:`questlife:snooze:${intent.entityId??intent.kind}`,kind:intent.kind,entityId:intent.entityId,at:new Date(Date.now()+10*60000).toISOString(),title:'QuestLife',body:c(lang,'open')};
      void deviceRepository.update(d=>({...d,snoozedNotifications:[...(d.snoozedNotifications??[]).filter(r=>r.id!==request.id),request]}));
      return;
    }
    navigateToday();deliverNotificationIntent(intent);
  }),[service,navigateToday,lang]);
  return null;
}
