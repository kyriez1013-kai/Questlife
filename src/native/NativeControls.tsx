import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getNativeFoundation } from '../design/nativeFoundation';

export function useNativeTheme() { const {data}=useStore(); return getNativeFoundation(useQuestTheme(data.settings.selectedThemeId)); }
export function NativeAction({label,onPress,disabled,busy,selected}:{label:string;onPress:()=>void;disabled?:boolean;busy?:boolean;selected?:boolean}) {
  const f=useNativeTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!!disabled||!!busy,selected:!!selected,busy:!!busy}} disabled={disabled||busy} onPress={onPress} style={({pressed})=>({minHeight:44,minWidth:44,paddingHorizontal:12,paddingVertical:10,justifyContent:'center',borderRadius:8,backgroundColor:selected?f.interaction.selected:f.material.base,opacity:disabled?.45:pressed?.65:1})}>
    {busy?<ActivityIndicator color={f.text.primary}/>:<Text style={{fontSize:14,color:f.text.primary}}>{label}</Text>}
  </Pressable>;
}
export function NativeSection({title,children}:{title:string;children:React.ReactNode}) {
  const f=useNativeTheme();
  return <View style={{gap:10,paddingVertical:16,borderBottomWidth:1,borderBottomColor:f.border.subtle}}><Text accessibilityRole="header" style={{fontSize:18,color:f.text.primary}}>{title}</Text>{children}</View>;
}
