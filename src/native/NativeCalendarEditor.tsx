import React, { useRef, useState } from 'react';
import { Modal, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CalendarDraft } from '../platform/contracts';
import { nativeCopy as c } from '../platform/nativeI18n';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import QuestInput from '../components/ui/QuestInput';
import QuestButton from '../components/ui/QuestButton';
import NativeDateTimeField from './NativeDateTimeField';
import { validCalendarDraft } from './nativeWorkflowValidation';

export default function NativeCalendarEditor({initial,lang,onSave,onClose,editing=false}:{initial:CalendarDraft;lang:'zh'|'en';onSave:(value:CalendarDraft)=>Promise<void>;onClose:()=>void;editing?:boolean}) {
  const {data}=useStore(); const q=useQuestTheme(data.settings.selectedThemeId); const [title,setTitle]=useState(initial.title);
  const [start,setStart]=useState(new Date(initial.startAt)); const [end,setEnd]=useState(new Date(initial.endAt));
  const [busy,setBusy]=useState(false); const [error,setError]=useState(false);
  const saving=useRef(false);
  const valid=!!title.trim() && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end>start;
  const save=async()=>{
    if(saving.current||!valid)return;
    const draft={...initial,title:title.trim(),startAt:start.toISOString(),endAt:end.toISOString()};
    if(!validCalendarDraft(draft))return;
    saving.current=true;setBusy(true);setError(false);
    try{await onSave(draft);onClose();}catch{setError(true);}finally{saving.current=false;setBusy(false);}
  };
  const close=()=>{if(!saving.current)onClose();};
  return <Modal animationType="none" onRequestClose={close}>
    <SafeAreaView style={{flex:1,backgroundColor:q.colors.background}}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{padding:q.spacing.md,gap:q.spacing.md}}>
          <Text accessibilityRole="header" style={{fontSize:q.typography.sectionTitleSize,color:q.colors.text}}>{c(lang,editing?'change':'createEvent')}</Text>
          <QuestInput questTheme={q} accessibilityLabel={c(lang,'title')} placeholder={c(lang,'title')} value={title} onChangeText={setTitle} editable={!busy} returnKeyType="done"/>
          {(['start','end'] as const).map(field=><View key={field} style={{gap:q.spacing.sm}}>
            <NativeDateTimeField theme={q} lang={lang} disabled={busy} mode="date" label={c(lang,field==='start'?'startDate':'endDate')} value={field==='start'?start:end} onChange={field==='start'?setStart:setEnd}/>
            {!initial.allDay?<NativeDateTimeField theme={q} lang={lang} disabled={busy} mode="time" label={c(lang,field==='start'?'startTime':'endTime')} value={field==='start'?start:end} onChange={field==='start'?setStart:setEnd}/>:null}
          </View>)}
          {error||!valid?<Text accessibilityRole="alert" style={{color:q.colors.text,fontSize:q.typography.bodySize}}>{c(lang,'eventError')}</Text>:null}
        </ScrollView>
        <View style={{flexDirection:'row',gap:q.spacing.sm,padding:q.spacing.md,backgroundColor:q.colors.surfaceElevated}}>
          <QuestButton questTheme={q} variant="ghost" label={c(lang,'cancel')} onPress={close} disabled={busy} style={{flex:1}}/>
          <QuestButton questTheme={q} label={c(lang,'save')} onPress={()=>void save()} loading={busy} disabled={!valid} style={{flex:1}}/>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
