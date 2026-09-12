import React from 'react';
import {ScrollView,Text} from 'react-native';
import {chartLicense} from '../platform/charts/localChartAsset';
import {useNativeTheme} from './NativeControls';
export default function NativeLicensesScreen(){const f=useNativeTheme();return <ScrollView style={{backgroundColor:f.environment.canvas}} contentContainerStyle={{padding:20,gap:16}}><Text style={{fontSize:16,color:f.text.primary}}>Lightweight Charts by TradingView</Text><Text selectable style={{fontSize:13,lineHeight:20,color:f.text.secondary}}>{chartLicense}</Text></ScrollView>;}
