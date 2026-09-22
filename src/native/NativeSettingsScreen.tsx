import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { getLanguage, t } from '../i18n';
import { HEALTH_METRICS, type CalendarDraft, type DeviceCalendar, type ExternalCommitment, type HealthMetric, type PermissionState } from '../platform/contracts';
import { calendarSource, deviceRepository, healthSync, notifications } from '../platform/services';
import { useDeviceData } from '../platform/useDeviceData';
import { nativeCopy as c } from '../platform/nativeI18n';
import { NativeAction, NativeSection, useNativeTheme } from './NativeControls';
import NativeCalendarEditor from './NativeCalendarEditor';
import AccountSyncSection from '../sync-v2/AccountSyncSection';
import { syncCopy } from '../sync-v2/copy';
import { useQuestTheme } from '../design/useQuestTheme';
import { questLayout, themeOptions } from '../design/tokens';
import { normalizeAppearancePreference } from '../design/appearance';
import QuestSegmentedControl from '../components/ui/QuestSegmentedControl';
import QuestButton from '../components/ui/QuestButton';
import NativeNotificationPreferences from './NativeNotificationPreferences';
import { registerNativePushToken, syncDevicePushRegistration } from '../sync-v2/pushRegistry';
import { authService } from '../sync-v2/supabase';
import NativeRecordActions from './NativeRecordActions';
import RecordBackupActions from '../backup/RecordBackupActions';
import { workflowCopy } from './nativeWorkflowCopy';
import NativeSettingsRow from './NativeSettingsRow';
import NativeSettingsSheet from './NativeSettingsSheet';

type SettingsDetail = 'appearance' | 'sources' | 'health' | 'calendar' | 'notifications' | 'account' | 'records' | 'privacy' | 'about';

export default function NativeSettingsScreen({navigation}:{navigation:any}) {
  const {data,setSettings}=useStore();const lang=getLanguage(data.settings.language);const f=useNativeTheme();
  const q=useQuestTheme(data.settings.selectedThemeId);
  const device=useDeviceData();const state=device.data;
  const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState(false);
  const [metrics,setMetrics]=useState<HealthMetric[]>([...HEALTH_METRICS]);
  const [calendars,setCalendars]=useState<DeviceCalendar[]>([]); const [permission,setPermission]=useState<PermissionState>('not_requested');
  const [notificationPermission,setNotificationPermission]=useState<PermissionState>('not_requested');
  const [permissionsChecked,setPermissionsChecked]=useState(false);
  const [permissionReadFailed,setPermissionReadFailed]=useState(false);
  const [detail,setDetail]=useState<SettingsDetail|null>(null);
  const [calendarView,setCalendarView]=useState<'sources'|'events'|'queue'>('sources');
  const [editor,setEditor]=useState<{calendarId:string;record?:ExternalCommitment;initial:CalendarDraft}|null>(null);
  const running=useRef(false);
  const latestData=useRef(data);latestData.current=data;
  const run=async(key:string,job:()=>Promise<unknown>)=>{if(running.current)return;running.current=true;setBusy(key);setError(false);try{await job();}catch{setError(true);}finally{running.current=false;setBusy(null);}};
  const text=(value:string)=><Text style={{fontSize:q.typography.bodySize,lineHeight:q.typography.bodyLineHeight,color:f.text.secondary}}>{value}</Text>;
  const range=()=>{const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+7);return [start.toISOString(),end.toISOString()] as const;};
  const refreshCalendars=async()=>{const p=await calendarSource.requestPermission();setPermission(p);setCalendars(p==='granted'?await calendarSource.listCalendars():[]);};
  const refreshPermissions=useCallback(()=>{
    let active=true;
    void (async()=>{
      try{
        const p=await calendarSource.permission();
        const rows=p==='granted'?await calendarSource.listCalendars():[];
        const n=await notifications(lang).permission();
        if(active){setPermission(p);setCalendars(rows);setNotificationPermission(n);setPermissionReadFailed(false);}
      }catch{if(active)setPermissionReadFailed(true);}
      finally{if(active)setPermissionsChecked(true);}
    })();
    return ()=>{active=false;};
  },[lang]);
  useFocusEffect(refreshPermissions);
  useEffect(()=>{
    let cancel:undefined|(()=>void);
    const subscription=AppState.addEventListener('change',next=>{if(next==='active'){cancel?.();cancel=refreshPermissions();}});
    return ()=>{cancel?.();subscription.remove();};
  },[refreshPermissions]);
  const pendingOperations=(state.calendar.pendingOperations??[]).filter(op=>op.state!=='succeeded'&&op.state!=='cancelled');
  const permissionSummary=(value:PermissionState)=>c(lang,!permissionsChecked?'settingsChecking':permissionReadFailed?'settingsPermissionError':value);
  const healthSummary=`${c(lang,state.health.connected?'settingsConnected':'notConnected')} · ${c(lang,state.health.permission)}${state.health.error?` · ${c(lang,'settingsAttention')}`:''}`;
  const calendarSummary=`${permissionSummary(permission)}${state.calendar.connected?` · ${state.calendar.selectedIds.length} ${c(lang,'settingsCalendarSources')}`:''}${pendingOperations.length?` · ${pendingOperations.length} ${c(lang,'settingsCalendarQueue')}`:''}${state.calendar.error?` · ${c(lang,'settingsAttention')}`:''}`;
  const notificationSummary=`${c(lang,state.notificationsEnabled?'settingsEnabled':'settingsDisabled')} · ${permissionSummary(notificationPermission)}${state.notificationError?` · ${c(lang,'settingsAttention')}`:''}`;
  const appearance=themeOptions.find(option=>option.id===normalizeAppearancePreference(data.settings.selectedThemeId))!;
  return <SafeAreaView edges={['top','left','right']} style={{flex:1,backgroundColor:f.environment.canvas}}>
    <ScrollView contentContainerStyle={{paddingHorizontal:q.spacing.md,paddingBottom:q.spacing.lg,width:'100%',maxWidth:questLayout.contentMaxWidth,alignSelf:'center'}}>
      <Text accessibilityRole="header" style={[f.type.title,{color:f.text.primary,paddingTop:q.spacing.lg}]}>{t(lang,'settings')}</Text>
      <NativeSection title={c(lang,'preferences')}>
        <NativeSettingsRow icon="settings" label={c(lang,'appearanceLanguage')} summary={`${t(lang,appearance.i18nKey)} · ${t(lang,lang==='zh'?'languageChinese':'languageEnglish')}`} onPress={()=>setDetail('appearance')}/>
        <NativeSettingsRow icon="activity" label={c(lang,'notifications')} summary={notificationSummary} onPress={()=>setDetail('notifications')}/>
      </NativeSection>
      <View style={{paddingVertical:q.spacing.sm,borderBottomWidth:1,borderBottomColor:f.border.subtle}}>
        <NativeSettingsRow icon="heartPulse" label={c(lang,'settingsSources')} summary={`${c(lang,'health')}: ${healthSummary}\n${c(lang,'calendar')}: ${calendarSummary}`} onPress={()=>setDetail('sources')}/>
      </View>
      <NativeSection title={c(lang,'settingsAccount')}>
        <NativeSettingsRow icon="home" label={c(lang,'account')} summary={c(lang,'settingsAccountNote')} onPress={()=>setDetail('account')}/>
        <NativeSettingsRow icon="folder" label={c(lang,'settingsRecords')} summary={c(lang,'settingsRecordsNote')} onPress={()=>setDetail('records')}/>
        <NativeSettingsRow icon="lifeBuoy" label={c(lang,'privacy')} summary={c(lang,'settingsPrivacyNote')} onPress={()=>setDetail('privacy')}/>
      </NativeSection>
      <NativeSettingsRow icon="book" label={c(lang,'about')} summary={`QuestLife ${Constants.expoConfig?.version??''}`} onPress={()=>setDetail('about')}/>
      {device.error?<Text accessibilityRole="alert" style={{color:f.text.primary,paddingVertical:q.spacing.md}}>{c(lang,'syncError')}</Text>:null}
    </ScrollView>
    {detail?<NativeSettingsSheet lang={lang} canClose={()=>!running.current&&!editor} onClose={()=>{setDetail(null);setError(false);}}>
      {detail==='sources'?<NativeSection title={c(lang,'settingsSources')}>
        <NativeSettingsRow icon="heartPulse" label={c(lang,'health')} summary={healthSummary} onPress={()=>setDetail('health')}/>
        <NativeSettingsRow icon="calendar" label={c(lang,'calendar')} summary={calendarSummary} onPress={()=>setDetail('calendar')}/>
      </NativeSection>:null}
      {detail==='health'||detail==='calendar'?<NativeAction label={c(lang,'settingsBackSources')} disabled={!!busy||!!editor} onPress={()=>{if(!running.current&&!editor){setDetail('sources');setError(false);}}}/>:null}
      {detail==='account'?<AccountSyncSection/>:null}
      {detail==='health'?<NativeSection title={c(lang,'health')}>
        {text(c(lang,'healthPurpose'))}
        {text(c(lang,'settingsMetricNote'))}
        {text(`${c(lang,'permissions')}: ${c(lang,state.health.permission)} · ${c(lang,'imported')}: ${state.health.imported}`)}
        {state.health.lastSyncedAt?text(`${c(lang,'lastSync')}: ${new Date(state.health.lastSyncedAt).toLocaleString(lang)}`):null}
        {!state.health.connected?HEALTH_METRICS.map(metric=><View key={metric} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:questLayout.controlMinHeight,gap:q.spacing.sm}}>
          <Text style={{flex:1,color:f.text.primary,fontSize:q.typography.bodySize}}>{c(lang,metric)}</Text>
          <Switch accessibilityLabel={c(lang,metric)} disabled={!!busy} value={metrics.includes(metric)} onValueChange={enabled=>setMetrics(old=>enabled?[...old,metric]:old.filter(x=>x!==metric))}/>
        </View>):text(state.health.enabledMetrics.map(m=>c(lang,m)).join(' · '))}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:q.spacing.sm}}>
          <NativeAction busy={busy==='health'} disabled={!!busy||(!state.health.connected&&!metrics.length)} label={c(lang,state.health.connected?'sync':'connect')} onPress={()=>void run('health',async()=>{if(!state.health.connected)await healthSync.connect(metrics);await healthSync.sync();})}/>
          {state.health.connected?<><NativeAction label={c(lang,'resync')} disabled={!!busy} onPress={()=>void run('health',()=>healthSync.sync(true))}/><NativeAction label={c(lang,'disconnect')} disabled={!!busy} onPress={()=>void run('health',()=>healthSync.disconnect())}/></>:null}
        </View>
        {text(c(lang,'healthLimits'))}
        {state.health.error?text(c(lang,'syncError')):null}
      </NativeSection>:null}
      {detail==='calendar'?<NativeSection title={c(lang,'calendar')}>
        {text(c(lang,'calendarPurpose'))}
        {text(`${c(lang,'permissions')}: ${permissionSummary(permission)}`)}
        {text(c(lang,state.calendar.connected?'settingsConnected':'notConnected'))}
        {state.calendar.lastSyncedAt?text(`${c(lang,'lastSync')}: ${new Date(state.calendar.lastSyncedAt).toLocaleString(lang)}`):null}
        <QuestSegmentedControl questTheme={q} accessibilityLabel={c(lang,'calendar')} value={calendarView} onChange={setCalendarView} options={[
          {value:'sources',label:c(lang,'settingsCalendarSources')},
          {value:'events',label:`${c(lang,'settingsEventsTab')} (${state.calendar.events.length})`},
          {value:'queue',label:`${c(lang,'settingsQueueTab')} (${pendingOperations.length})`},
        ]}/>
        {calendarView==='sources'?<>
        <NativeAction label={c(lang,permission==='granted'?'refresh':'connect')} disabled={!!busy} busy={busy==='calendar'} onPress={()=>void run('calendar',refreshCalendars)}/>
        {permission==='denied'?<QuestButton questTheme={q} variant="ghost" icon="settings" label={c(lang,'permissions')} disabled={!!busy} onPress={()=>void run('calendar',()=>Linking.openSettings())}/>:null}
        {permission==='granted'&&!busy&&!calendars.length?text(c(lang,'noCalendars')):null}
        {calendars.map(row=><View key={row.id} style={{gap:q.spacing.sm}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:q.spacing.sm,minHeight:questLayout.controlMinHeight}}>
            <View style={{flex:1}}>{text(row.title)}{text(row.source)}</View>
            <Switch accessibilityLabel={row.title} value={state.calendar.connected&&state.calendar.selectedIds.includes(row.id)} disabled={!!busy} onValueChange={selected=>void run('calendar',()=>{const previous=state.calendar.connected?state.calendar.selectedIds:[];const ids=selected?[...new Set([...previous,row.id])]:previous.filter(id=>id!==row.id);return ids.length?calendarSource.sync(ids,...range()):calendarSource.disconnect();})}/>
          </View>
          {row.writable?<NativeAction label={`${c(lang,'createEvent')} · ${row.title}`} disabled={!!busy} onPress={()=>{const start=new Date();start.setSeconds(0,0);const end=new Date(start.getTime()+30*60000);setEditor({calendarId:row.id,initial:{title:'',startAt:start.toISOString(),endAt:end.toISOString()}});}}/>:text(c(lang,'externalEvent'))}
        </View>)}
        {state.calendar.connected?<View style={{flexDirection:'row',gap:q.spacing.sm,flexWrap:'wrap'}}><NativeAction label={c(lang,'sync')} disabled={!!busy||permission!=='granted'} onPress={()=>void run('calendar',()=>calendarSource.sync(state.calendar.selectedIds,...range()))}/><NativeAction label={c(lang,'disconnect')} disabled={!!busy} onPress={()=>void run('calendar',()=>calendarSource.disconnect())}/></View>:null}
        </>:null}
        {calendarView==='events'?<>
        {!state.calendar.events.length?text(c(lang,'settingsNoEvents')):null}
        {state.calendar.events.map(row=><View key={row.id} style={{gap:q.spacing.xs,paddingVertical:q.spacing.sm,borderBottomWidth:1,borderBottomColor:f.border.subtle}}>
          <Text style={{color:f.text.primary,fontSize:q.typography.bodySize}}>{row.title}</Text>{text(`${new Date(row.startAt).toLocaleString(lang)} - ${new Date(row.endAt).toLocaleString(lang)}`)}
          {text(`${c(lang,row.ownership==='questlife'?'ownedEvent':'externalEvent')} · ${new Date(row.lastSyncedAt).toLocaleString(lang)}`)}
          <View style={{flexDirection:'row',gap:q.spacing.sm,flexWrap:'wrap'}}><NativeAction label={c(lang,'open')} disabled={!!busy||permission!=='granted'} onPress={()=>void run('calendar',()=>calendarSource.open(row))}/>
            {row.ownership==='questlife'&&calendars.some(calendar=>calendar.id===row.calendarId&&calendar.writable)?<><NativeAction label={c(lang,'change')} disabled={!!busy} onPress={()=>setEditor({calendarId:row.calendarId,record:row,initial:row})}/><NativeAction label={c(lang,'remove')} disabled={!!busy} onPress={()=>Alert.alert(c(lang,'confirmDelete'),row.title,[{text:c(lang,'cancel'),style:'cancel'},{text:c(lang,'remove'),style:'destructive',onPress:()=>void run('calendar',()=>calendarSource.delete(row,{confirmed:true}))}])}/></>:null}
          </View>
        </View>)}
        </>:null}
        {calendarView==='queue'?<>
        {!pendingOperations.length?text(c(lang,'settingsNoQueue')):null}
        {pendingOperations.map(op=><View key={op.id} style={{gap:q.spacing.sm,paddingVertical:q.spacing.sm}}>
          {text(op.draft?.title??op.expected?.title??c(lang,'calendar'))}
          {text(workflowCopy(lang,op.state==='ambiguous'?'calendarAmbiguous':'calendarPending'))}
          <NativeAction label={workflowCopy(lang,op.kind==='delete'?'calendarRetryDelete':'calendarRetry')} disabled={!!busy||permission!=='granted'||op.state==='ambiguous'} onPress={()=>Alert.alert(c(lang,'calendar'),workflowCopy(lang,op.kind==='delete'?'calendarRetryDeleteConfirm':'calendarWriteConfirm'),[
            {text:c(lang,'cancel'),style:'cancel'},
            {text:workflowCopy(lang,'calendarRetry'),style:op.kind==='delete'?'destructive':'default',onPress:()=>void run('calendar',()=>calendarSource.retryOperation(op.id,{confirmed:true},latestData.current.scheduleBlocks.find(block=>block.id===op.linkedScheduleBlockId)))},
          ])}/>
          {op.expected?<NativeAction label={c(lang,'open')} disabled={!!busy||permission!=='granted'} onPress={()=>void run('calendar',()=>calendarSource.open(op.expected!))}/>:null}
        </View>)}
        </>:null}
        {state.calendar.error?text(c(lang,'syncError')):null}
      </NativeSection>:null}
      {detail==='notifications'?<NativeSection title={c(lang,'notifications')}>
        {text(c(lang,'reminderNote'))}
        {text(`${c(lang,'permissions')}: ${permissionSummary(notificationPermission)}`)}
        {notificationPermission==='denied'?<QuestButton questTheme={q} variant="ghost" icon="settings" label={c(lang,'permissions')} disabled={!!busy} onPress={()=>void run('notifications',()=>Linking.openSettings())}/>:null}
        {state.notificationError?text(c(lang,'syncError')):null}
        <View style={{flexDirection:'row',alignItems:'center',minHeight:questLayout.controlMinHeight,gap:q.spacing.sm}}><Text style={{flex:1,color:f.text.primary}}>{c(lang,'enableReminders')}</Text><Switch accessibilityLabel={c(lang,'enableReminders')} value={state.notificationsEnabled} disabled={!!busy} onValueChange={enabled=>void run('notifications',async()=>{
          const expectedUserId=await authService.getUserId();
          if(enabled){
            const p=await notifications(lang).requestPermission();setNotificationPermission(p);
            if(p!=='granted'||await authService.getUserId()!==expectedUserId)return;
          }
          await deviceRepository.update(d=>({...d,notificationsEnabled:enabled}));
          if(!enabled){
            const result=await syncDevicePushRegistration({expectedUserId,expoPushToken:null,notificationsEnabled:false,permissionGranted:false});
            if(result.status!=='disabled'&&result.status!=='auth_required')throw new Error('push_retirement_pending');
          }
        })}/></View>
        {(['accepted_block','decision_followup','morning_state','end_of_day'] as const).map(kind=><View key={kind} style={{minHeight:questLayout.controlMinHeight,flexDirection:'row',alignItems:'center',gap:q.spacing.sm}}><Text style={{flex:1,color:f.text.primary}}>{c(lang,kind)}</Text><Switch accessibilityLabel={c(lang,kind)} disabled={!!busy} value={!!state.reminderKinds?.[kind]} onValueChange={enabled=>void run('notifications',()=>deviceRepository.update(d=>({...d,reminderKinds:{...d.reminderKinds,[kind]:enabled}})))}/></View>)}
        <NativeNotificationPreferences registerPushToken={registerNativePushToken}/>
      </NativeSection>:null}
      {detail==='appearance'?<NativeSection title={c(lang,'appearanceLanguage')}>
        <QuestSegmentedControl questTheme={q} accessibilityLabel={t(lang,'appearance')} value={normalizeAppearancePreference(data.settings.selectedThemeId)} options={themeOptions.map(option=>({value:option.id,label:t(lang,option.i18nKey)}))} onChange={selectedThemeId=>setSettings({selectedThemeId})}/>
        {text(t(lang,'language'))}
        <QuestSegmentedControl questTheme={q} accessibilityLabel={t(lang,'language')} value={lang} options={(['zh','en'] as const).map(value=>({value,label:t(lang,value==='zh'?'languageChinese':'languageEnglish')}))} onChange={language=>setSettings({language})}/>
      </NativeSection>:null}
      {detail==='records'?<><NativeRecordActions onOpenAccount={()=>setDetail('account')}/><RecordBackupActions/></>:null}
      {detail==='privacy'?<NativeSection title={c(lang,'privacy')}>{text(syncCopy(lang,'privacy'))}{text(syncCopy(lang,'healthNote'))}{text(syncCopy(lang,'healthOff'))}</NativeSection>:null}
      {detail==='about'?<NativeSection title={c(lang,'about')}>{text(`QuestLife ${Constants.expoConfig?.version??''}`)}<NativeAction label={c(lang,'licenses')} onPress={()=>{setDetail(null);navigation.navigate('Licenses');}}/></NativeSection>:null}
      {error||device.error?<Text accessibilityRole="alert" style={{color:f.text.primary,paddingVertical:q.spacing.md}}>{c(lang,error?'settingsActionError':'syncError')}</Text>:null}
      {editor?<NativeCalendarEditor lang={lang} editing={!!editor.record} initial={editor.initial} onClose={()=>setEditor(null)} onSave={async value=>{if(editor.record)await calendarSource.update(editor.record,value,{confirmed:true});else await calendarSource.create(editor.calendarId,value,{confirmed:true});}}/>:null}
    </NativeSettingsSheet>:null}
  </SafeAreaView>;
}
