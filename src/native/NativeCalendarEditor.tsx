import React, { useState } from 'react';
import { Modal, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CalendarDraft } from '../platform/contracts';
import { nativeCopy as c } from '../platform/nativeI18n';
import { NativeAction, useNativeTheme } from './NativeControls';

export default function NativeCalendarEditor({initial,lang,onSave,onClose}:{initial:CalendarDraft;lang:'zh'|'en';onSave:(value:CalendarDraft)=>Promise<void>;onClose:()=>void}) {
  const f=useNativeTheme(); const [title,setTitle]=useState(initial.title);
  const [start,setStart]=useState(new Date(initial.startAt)); const [end,setEnd]=useState(new Date(initial.endAt));
  const [picker,setPicker]=useState<{field:'start'|'end';mode:'date'|'time'}|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(false);
  const save=async()=>{setBusy(true);setError(false);try{await onSave({title,startAt:start.toISOString(),endAt:end.toISOString(),allDay:initial.allDay});onClose();}catch{setError(true);}finally{setBusy(false);}};
  return <Modal animationType="none" onRequestClose={onClose}>
    <SafeAreaView style={{flex:1,backgroundColor:f.environment.canvas}}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:16}}>
          <Text accessibilityRole="header" style={{fontSize:22,color:f.text.primary}}>{c(lang,'createEvent')}</Text>
          <TextInput accessibilityLabel={c(lang,'title')} placeholder={c(lang,'title')} placeholderTextColor={f.text.metadata} value={title} onChangeText={setTitle} style={{minHeight:48,color:f.text.primary,backgroundColor:f.material.elevated,padding:12,borderRadius:8,fontSize:16}}/>
          {(['start','end'] as const).map(field=><View key={field} style={{gap:8}}>
            <NativeAction label={`${c(lang,field==='start'?'startDate':'endDate')} · ${(field==='start'?start:end).toLocaleDateString(lang)}`} onPress={()=>setPicker({field,mode:'date'})}/>
            <NativeAction label={`${c(lang,field==='start'?'startTime':'endTime')} · ${(field==='start'?start:end).toLocaleTimeString(lang,{hour:'2-digit',minute:'2-digit'})}`} onPress={()=>setPicker({field,mode:'time'})}/>
          </View>)}
          {picker?<DateTimePicker value={picker.field==='start'?start:end} mode={picker.mode} display={Platform.OS==='ios'?'spinner':'default'} onChange={(_,value)=>{if(value)(picker.field==='start'?setStart:setEnd)(value);if(Platform.OS!=='ios')setPicker(null);}}/>:null}
          {error?<Text accessibilityRole="alert" style={{color:f.text.primary}}>{c(lang,'eventError')}</Text>:null}
        </ScrollView>
        <View style={{flexDirection:'row',gap:12,padding:16,backgroundColor:f.material.elevated}}>
          <NativeAction label={c(lang,'cancel')} onPress={onClose} disabled={busy}/>
          <NativeAction label={c(lang,'save')} onPress={()=>void save()} busy={busy}/>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
