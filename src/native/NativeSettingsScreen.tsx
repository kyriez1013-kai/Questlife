import React, { useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { getLanguage } from '../i18n';
import { HEALTH_METRICS, type CalendarDraft, type DeviceCalendar, type ExternalCommitment, type HealthMetric, type NotificationKind, type PermissionState } from '../platform/contracts';
import { calendarSource, deviceRepository, healthSync, notifications } from '../platform/services';
import { useDeviceData } from '../platform/useDeviceData';
import { nativeCopy as c } from '../platform/nativeI18n';
import { NativeAction, NativeSection, useNativeTheme } from './NativeControls';
import NativeCalendarEditor from './NativeCalendarEditor';

export default function NativeSettingsScreen({navigation}:{navigation:any}) {
  const {data}=useStore();const lang=getLanguage(data.settings.language);const f=useNativeTheme();
  const device=useDeviceData();const state=device.data;
  const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState(false);
  const [metrics,setMetrics]=useState<HealthMetric[]>([...HEALTH_METRICS]);
  const [calendars,setCalendars]=useState<DeviceCalendar[]>([]); const [permission,setPermission]=useState<PermissionState>('not_requested');
  const [editor,setEditor]=useState<{calendarId:string;record?:ExternalCommitment;initial:CalendarDraft}|null>(null);
  const run=async(key:string,job:()=>Promise<unknown>)=>{if(busy)return;setBusy(key);setError(false);try{await job();}catch{setError(true);}finally{setBusy(null);}};
  const text=(value:string)=><Text style={{fontSize:14,lineHeight:21,color:f.text.secondary}}>{value}</Text>;
  const range=()=>{const start=new Date();start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+7);return [start.toISOString(),end.toISOString()] as const;};
  const refreshCalendars=async()=>{const p=await calendarSource.requestPermission();setPermission(p);if(p==='granted')setCalendars(await calendarSource.listCalendars());};
  return <SafeAreaView edges={['top','left','right']} style={{flex:1,backgroundColor:f.environment.canvas}}>
    <ScrollView contentContainerStyle={{paddingHorizontal:20,paddingBottom:24}} keyboardShouldPersistTaps="handled">
      <NativeSection title={c(lang,'account')}>{text(c(lang,'accountNote'))}</NativeSection>
      <NativeSection title={c(lang,'sources')}>
        {text(c(lang,'healthPurpose'))}
        <Text style={{fontSize:16,color:f.text.primary}}>{c(lang,'health')}</Text>
        {text(`${c(lang,'permissions')}: ${c(lang,state.health.permission)} · ${c(lang,'imported')}: ${state.health.imported}`)}
        {state.health.lastSyncedAt?text(`${c(lang,'lastSync')}: ${new Date(state.health.lastSyncedAt).toLocaleString(lang)}`):null}
        {!state.health.connected?HEALTH_METRICS.map(metric=><View key={metric} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:44}}>
          <Text style={{color:f.text.primary,fontSize:15}}>{c(lang,metric)}</Text>
          <Switch accessibilityLabel={c(lang,metric)} value={metrics.includes(metric)} onValueChange={enabled=>setMetrics(old=>enabled?[...old,metric]:old.filter(x=>x!==metric))}/>
        </View>):text(state.health.enabledMetrics.map(m=>c(lang,m)).join(' · '))}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          <NativeAction busy={busy==='health'} disabled={!!busy||(!state.health.connected&&!metrics.length)} label={c(lang,state.health.connected?'sync':'connect')} onPress={()=>void run('health',async()=>{if(!state.health.connected)await healthSync.connect(metrics);await healthSync.sync();})}/>
          {state.health.connected?<><NativeAction label={c(lang,'resync')} disabled={!!busy} onPress={()=>void run('health',()=>healthSync.sync(true))}/><NativeAction label={c(lang,'disconnect')} onPress={()=>void run('health',()=>healthSync.disconnect())}/></>:null}
        </View>
        {text(c(lang,'healthLimits'))}
        {state.health.error?text(c(lang,'syncError')):null}
      </NativeSection>
      <NativeSection title={c(lang,'calendar')}>
        {text(c(lang,'calendarPurpose'))}
        {text(c(lang,state.calendar.connected?'granted':permission))}
        <NativeAction label={c(lang,'connect')} busy={busy==='calendar'} onPress={()=>void run('calendar',refreshCalendars)}/>
        {permission==='granted'&&!busy&&!calendars.length?text(c(lang,'noCalendars')):null}
        {calendars.map(row=><View key={row.id} style={{gap:8}}>
          <NativeAction label={row.title} selected={state.calendar.selectedIds.includes(row.id)} disabled={!!busy} onPress={()=>void run('calendar',()=>{const ids=state.calendar.selectedIds.includes(row.id)?state.calendar.selectedIds.filter(id=>id!==row.id):[...state.calendar.selectedIds,row.id];return calendarSource.sync(ids,...range());})}/>
          {row.writable?<NativeAction label={`${c(lang,'createEvent')} · ${row.title}`} onPress={()=>{const start=new Date();const end=new Date(start.getTime()+30*60000);setEditor({calendarId:row.id,initial:{title:'',startAt:start.toISOString(),endAt:end.toISOString()}});}}/>:null}
        </View>)}
        {state.calendar.connected?<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><NativeAction label={c(lang,'sync')} disabled={!!busy} onPress={()=>void run('calendar',()=>calendarSource.sync(state.calendar.selectedIds,...range()))}/><NativeAction label={c(lang,'disconnect')} onPress={()=>void run('calendar',()=>calendarSource.disconnect())}/></View>:null}
        {state.calendar.events.map(row=><View key={row.id} style={{gap:4,paddingVertical:8,borderBottomWidth:1,borderBottomColor:f.border.subtle}}>
          <Text style={{color:f.text.primary,fontSize:15}}>{row.title}</Text>{text(`${new Date(row.startAt).toLocaleString(lang)} · ${c(lang,row.ownership==='questlife'?'ownedEvent':'externalEvent')}`)}
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><NativeAction label={c(lang,'open')} onPress={()=>void run('calendar',()=>calendarSource.open(row))}/>
            {row.ownership==='questlife'?<><NativeAction label={c(lang,'change')} onPress={()=>setEditor({calendarId:row.calendarId,record:row,initial:row})}/><NativeAction label={c(lang,'remove')} onPress={()=>Alert.alert(c(lang,'confirmDelete'),undefined,[{text:c(lang,'cancel'),style:'cancel'},{text:c(lang,'remove'),style:'destructive',onPress:()=>void run('calendar',()=>calendarSource.delete(row,{confirmed:true}))}])}/></>:null}
          </View>
        </View>)}
        {state.calendar.error?text(c(lang,'syncError')):null}
      </NativeSection>
      <NativeSection title={c(lang,'notifications')}>
        {text(c(lang,'reminderNote'))}
        {state.notificationError?text(c(lang,'syncError')):null}
        <View style={{flexDirection:'row',alignItems:'center',minHeight:44,gap:12}}><Text style={{flex:1,color:f.text.primary}}>{c(lang,'enableReminders')}</Text><Switch accessibilityLabel={c(lang,'enableReminders')} value={state.notificationsEnabled} disabled={!!busy} onValueChange={enabled=>void run('notifications',async()=>{if(enabled&&await notifications(lang).requestPermission()!=='granted')throw new Error('permission');await deviceRepository.update(d=>({...d,notificationsEnabled:enabled}));})}/></View>
        {(['accepted_block','decision_followup','morning_state','end_of_day'] as const).map(kind=><View key={kind} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,color:f.text.primary}}>{c(lang,kind)}</Text><Switch accessibilityLabel={c(lang,kind)} value={!!state.reminderKinds?.[kind]} onValueChange={enabled=>void run('notifications',()=>deviceRepository.update(d=>({...d,reminderKinds:{...d.reminderKinds,[kind]:enabled}})))}/></View>)}
      </NativeSection>
      <NativeSection title={c(lang,'appearance')}><NativeAction label={c(lang,'preferences')} onPress={()=>navigation.navigate('Preferences')}/></NativeSection>
      <NativeSection title={c(lang,'privacy')}>{text(c(lang,'privacyNote'))}<NativeAction label={c(lang,'privacy')} onPress={()=>navigation.navigate('Preferences')}/></NativeSection>
      <NativeSection title={c(lang,'about')}>{text('QuestLife 1.0.0')}<NativeAction label={c(lang,'licenses')} onPress={()=>navigation.navigate('Licenses')}/></NativeSection>
      {error||device.error?<Text accessibilityRole="alert" style={{color:f.text.primary,paddingVertical:16}}>{c(lang,'syncError')}</Text>:null}
    </ScrollView>
    {editor?<NativeCalendarEditor lang={lang} initial={editor.initial} onClose={()=>setEditor(null)} onSave={async value=>{if(editor.record)await calendarSource.update(editor.record,value,{confirmed:true});else await calendarSource.create(editor.calendarId,value,{confirmed:true});}}/>:null}
  </SafeAreaView>;
}
