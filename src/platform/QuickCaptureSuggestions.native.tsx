import React, {useMemo} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useStore} from '../store';
import {useQuestTheme} from '../design/useQuestTheme';
import {getNativeFoundation} from '../design/nativeFoundation';
import {QuickCaptureSuggestionEngineV1,type QuickCaptureSuggestion} from './quickCapture';
export default function QuickCaptureSuggestions({onSelect}:{onSelect:(suggestion:QuickCaptureSuggestion)=>void}) {
  const {data}=useStore(); const f=getNativeFoundation(useQuestTheme(data.settings.selectedThemeId));
  const suggestions=useMemo(()=>QuickCaptureSuggestionEngineV1({data,now:new Date()}),[data]);
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{suggestions.map(s=><Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.label} onPress={()=>onSelect(s)} style={({pressed})=>({minHeight:44,padding:12,borderRadius:8,backgroundColor:pressed?f.interaction.pressed:f.material.soft})}><Text style={{color:f.text.primary,fontSize:14}}>{s.label}</Text></Pressable>)}</View>;
}
