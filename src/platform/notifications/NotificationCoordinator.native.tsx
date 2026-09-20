import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import Constants from 'expo-constants';
import {useStore} from '../../store';
import {getLanguage} from '../../i18n';
import {emptyDeviceData} from '../deviceRepository';
import {deviceRepository,notifications} from '../services';
import {notificationTargetEnabled,planLocalNotifications,syncNotificationPlan} from './planner';
import {clearPendingNotificationIntent,deliverNotificationIntent} from './intentBus';
import {invalidateNotificationSession,NotificationSessionBoundary} from './sessionBoundary';
import {clearOwnedNotificationResponses,invalidatePushResponseGuards,reconcileOwnedNotifications,subscribePushTestResponses,subscribePushTokenChanges} from './NotificationDriver.native';
import {authService} from '../../sync-v2/supabase';
import {readSyncState} from '../../sync-v2/runtime';
import {nativeCopy as c} from '../nativeI18n';
import {syncDevicePushRegistration} from '../../sync-v2/pushRegistry';

export default function NotificationCoordinator({navigateToday}:{navigateToday:()=>void}) {
  const {data}=useStore();const [device,setDevice]=useState(emptyDeviceData);const [deviceReady,setDeviceReady]=useState(false);const lang=getLanguage(data.settings.language);const service=useMemo(()=>notifications(lang),[lang]);
  const [,setNow]=useState(()=>new Date());const queue=useRef(Promise.resolve());
  const boundary=useRef(new NotificationSessionBoundary());
  const invalidating=useRef(false);
  const [identityRevision,setIdentityRevision]=useState(0);
  const [pushRevision,setPushRevision]=useState(0);
  const projectId=Constants.easConfig?.projectId??Constants.expoConfig?.extra?.eas?.projectId;
  const current=useRef({data,device});current.current={data,device};
  const signatureRevision=useRef('');
  const signature=JSON.stringify(planLocalNotifications(data,device,new Date(),lang));
  signatureRevision.current=signature;
  useEffect(()=>{
    let active=true;let revision=0;
    const refresh=()=>{
      const version=++revision;
      void deviceRepository.read().then(value=>{if(active && version===revision){setDevice(value);setDeviceReady(true);}}).catch(()=>{if(active)setDeviceReady(false);});
    };
    const stop=deviceRepository.subscribe(refresh);refresh();
    return()=>{active=false;stop();};
  },[]);
  useEffect(()=>{
    let active=true;let observed=false;let initialized=false;let latestOwner:string|null=null;
    const observe=(owner:string|null)=>{
      if(!active)return;
      observed=true;
      latestOwner=owner;
      if(!initialized)return;
      setPushRevision(v=>v+1);
      const wasReady=boundary.current.ready;
      const changed=boundary.current.observe(owner);
      if(changed){
        invalidatePushResponseGuards();
        invalidating.current=true;
        clearPendingNotificationIntent();
        queue.current=queue.current.catch(()=>undefined).then(async()=>{
          const disabled=await invalidateNotificationSession(deviceRepository,service,clearOwnedNotificationResponses);
          current.current={...current.current,device:disabled};
          invalidating.current=false;
          if(active)setIdentityRevision(v=>v+1);
        }).catch(async()=>{await deviceRepository.update(d=>({...d,notificationError:'notification_schedule_failed'})).catch(()=>undefined);});
      }
      if(changed || !wasReady)setIdentityRevision(v=>v+1);
    };
    const stop=authService.subscribe(session=>observe(session?.userId??null));
    void (async()=>{
      const persisted=await readSyncState();
      const session=await authService.getSession();
      if(!active)return;
      if(!boundary.current.ready && persisted.ownerId) boundary.current.observe(persisted.ownerId);
      initialized=true;
      observe(observed?latestOwner:session?.userId??null);
      setIdentityRevision(v=>v+1);
    })().catch(async()=>{await deviceRepository.update(d=>({...d,notificationError:'notification_schedule_failed'})).catch(()=>undefined);});
    return()=>{active=false;stop();};
  },[service]);
  useEffect(()=>{
    const sub=AppState.addEventListener('change',v=>{if(v==='active'){setNow(new Date());setPushRevision(r=>r+1);}});
    const timer=setInterval(()=>{if(AppState.currentState==='active')setNow(new Date());},60000);
    return()=>{sub.remove();clearInterval(timer);};
  },[]);
  useEffect(()=>{
    const stop=subscribePushTokenChanges(()=>setPushRevision(v=>v+1));
    const renewal=setInterval(()=>{if(AppState.currentState==='active')setPushRevision(v=>v+1);},60*60*1000);
    return()=>{stop();clearInterval(renewal);};
  },[]);
  useEffect(()=>{
    if(!boundary.current.ready || !deviceReady || invalidating.current)return;
    let active=true;
    const generation=boundary.current.generation;
    const enabled=device.notificationsEnabled;
    const isCurrent=()=>active && !invalidating.current && boundary.current.generation===generation
      && current.current.device.notificationsEnabled===enabled;
    void (async()=>{
      const expectedUserId=await authService.getUserId();
      if(!isCurrent())return;
      if(!expectedUserId || !enabled || !projectId){
        await syncDevicePushRegistration({expectedUserId,expoPushToken:null,notificationsEnabled:enabled,permissionGranted:false});
        return;
      }
      // Background reconciliation reads permission; only the explicit Settings action may request it.
      const permission=await service.permission();
      if(!isCurrent() || await authService.getUserId()!==expectedUserId)return;
      const token=permission==='granted'?await service.getPushToken(projectId):null;
      if(!isCurrent() || await authService.getUserId()!==expectedUserId)return;
      await syncDevicePushRegistration({expectedUserId,expoPushToken:token,notificationsEnabled:enabled,permissionGranted:permission==='granted'});
    })().catch(()=>undefined);
    return()=>{active=false;};
  },[service,projectId,device.notificationsEnabled,deviceReady,identityRevision,pushRevision]);
  useEffect(()=>{
    if(!boundary.current.ready || !deviceReady || invalidating.current)return;
    const generation=boundary.current.generation;
    return subscribePushTestResponses(()=>{
      if(!invalidating.current && boundary.current.generation===generation && current.current.device.notificationsEnabled)navigateToday();
    });
  },[navigateToday,identityRevision,deviceReady]);
  useEffect(()=>{
    if(!boundary.current.ready || !deviceReady)return;
    const generation=boundary.current.generation;
    const requests=JSON.parse(signature);
    let active=true;
    const isCurrent=()=>active && !invalidating.current && boundary.current.generation===generation && signatureRevision.current===signature && (requests.length===0 || current.current.device.notificationsEnabled);
    queue.current=queue.current.then(async()=>{
      if(invalidating.current){
        const disabled=await invalidateNotificationSession(deviceRepository,service,clearOwnedNotificationResponses);
        current.current={...current.current,device:disabled};
        invalidating.current=false;
        if(active)setIdentityRevision(v=>v+1);
        return;
      }
      if(!isCurrent())return;
      const freshRequests=planLocalNotifications(current.current.data,current.current.device,new Date(),lang);
      await reconcileOwnedNotifications(freshRequests.map(r=>r.id));
      await syncNotificationPlan(deviceRepository,service,freshRequests,isCurrent);
    }).catch(async()=>{await deviceRepository.update(d=>({...d,notificationError:'notification_schedule_failed'})).catch(()=>undefined);});
    return()=>{active=false;};
  },[signature,service,identityRevision,deviceReady]);
  useEffect(()=>{
    if(!boundary.current.ready || !deviceReady || invalidating.current)return;
    return service.subscribe(intent=>{
    if(!boundary.current.ready || invalidating.current)return;
    if(intent.kind==='quick_capture' || intent.kind==='current_plan'){navigateToday();deliverNotificationIntent(intent);return;}
    if(!notificationTargetEnabled(current.current.data,current.current.device,intent))return;
    if(intent.action==='SNOOZE'){
      const request={id:`questlife:snooze:${intent.entityId??intent.kind}`,kind:intent.kind,entityId:intent.entityId,at:new Date(Date.now()+10*60000).toISOString(),title:'QuestLife',body:c(lang,'open')};
      const generation=boundary.current.generation;
      void deviceRepository.update(d=>boundary.current.generation===generation && !invalidating.current && notificationTargetEnabled(current.current.data,d,intent)?({...d,snoozedNotifications:[...(d.snoozedNotifications??[]).filter(r=>r.id!==request.id),request]}):d).catch(()=>undefined);
      return;
    }
    navigateToday();deliverNotificationIntent(intent);
    });
  },[service,navigateToday,lang,identityRevision,deviceReady]);
  return null;
}
