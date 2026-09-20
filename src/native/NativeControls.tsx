import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useStore } from '../store';
import { useQuestTheme } from '../design/useQuestTheme';
import { getNativeFoundation } from '../design/nativeFoundation';

export function useNativeTheme() {
  const { data } = useStore();
  const theme = useQuestTheme(data.settings.selectedThemeId);
  return useMemo(() => getNativeFoundation(theme), [theme]);
}
export function NativeAction({label,onPress,disabled,busy,selected}:{label:string;onPress:()=>void;disabled?:boolean;busy?:boolean;selected?:boolean}) {
  const f=useNativeTheme();
  const inactive = !!disabled || !!busy;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:inactive,selected:!!selected,busy:!!busy}} disabled={inactive} onPress={onPress} style={({pressed})=>({
    minHeight:f.layout.touch,minWidth:f.layout.touch,paddingHorizontal:f.layout.gap,paddingVertical:f.spacing.sm,
    flexDirection:'row',gap:f.spacing.sm,flexShrink:1,alignItems:'center',justifyContent:'center',borderRadius:f.layout.radius,
    borderWidth:1,borderColor:selected?f.border.strong:f.border.subtle,
    backgroundColor:inactive?f.interaction.disabledSurface:selected?f.interaction.selected:pressed?f.material.muted:f.material.base,
  })}>
    {busy?<ActivityIndicator color={f.interaction.disabledText}/>:null}
    <Text style={[f.type.body,{color:inactive?f.interaction.disabledText:f.text.primary,flexShrink:1,textAlign:'center'}]}>{label}</Text>
  </Pressable>;
}
export function NativeSection({title,children}:{title:string;children:React.ReactNode}) {
  const f=useNativeTheme();
  return <View style={{gap:f.layout.gap,paddingVertical:f.spacing.lg,borderBottomWidth:1,borderBottomColor:f.border.subtle}}><Text accessibilityRole="header" style={[f.type.body,{fontWeight:'600',color:f.text.primary}]}>{title}</Text>{children}</View>;
}
