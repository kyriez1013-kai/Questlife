import React from 'react';
import {ScrollView,Text,View} from 'react-native';
import {chartLicense} from '../platform/charts/localChartAsset';
import {useNativeTheme} from './NativeControls';
import {nativeDependencyNotices} from './nativeDependencyNotices';
export default function NativeLicensesScreen(){
  const f=useNativeTheme();
  const notices=[{name:'Lightweight Charts by TradingView',text:chartLicense},...nativeDependencyNotices];
  return <ScrollView style={{backgroundColor:f.environment.canvas}} contentContainerStyle={{padding:20,paddingBottom:40,gap:24}}>
    {notices.map(notice=><View key={notice.name} style={{gap:12}}>
      <Text accessibilityRole="header" style={{fontSize:16,color:f.text.primary}}>{notice.name}</Text>
      <Text selectable style={{fontSize:13,lineHeight:20,color:f.text.secondary}}>{notice.text}</Text>
    </View>)}
  </ScrollView>;
}
