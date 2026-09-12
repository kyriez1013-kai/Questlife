import React,{forwardRef,useEffect,useImperativeHandle,useMemo,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {WebView} from 'react-native-webview';
import {chartHtml} from './localChartAsset';
import {chartWireModel,parseChartEvent,type ChartCommand,type QuestLifeChartModelV1} from './contract';
import type {InsightsV3ChartHandle} from '../../insights-v3/InsightsV3Chart';
import {nativeCopy} from '../nativeI18n';

export default forwardRef<InsightsV3ChartHandle,{model:QuestLifeChartModelV1}>(({model},ref)=>{
  const view=useRef<WebView>(null);const [loaded,setLoaded]=useState(false);const [error,setError]=useState(false);const [selection,setSelection]=useState<string|null>(null);
  const wire=useMemo(()=>chartWireModel(model),[model]);
  const send=(command:ChartCommand)=>view.current?.injectJavaScript(`window.questlifeChart(${JSON.stringify(command).replace(/</g,'\\u003c')});true;`);
  useEffect(()=>{if(loaded){setError(false);send({type:'model',model:wire});}},[loaded,wire]);
  useImperativeHandle(ref,()=>({fit:()=>send({type:'fit'}),zoomIn:()=>send({type:'zoomIn'}),zoomOut:()=>send({type:'zoomOut'})}));
  return <View style={{height:344}}>
    <WebView ref={view} source={{html:chartHtml,baseUrl:'about:blank'}} originWhitelist={['about:*']} javaScriptEnabled domStorageEnabled={false} allowFileAccess={false} mixedContentMode="never" scrollEnabled={false} onShouldStartLoadWithRequest={r=>r.url==='about:blank'} onLoadEnd={()=>setLoaded(true)} onError={()=>setError(true)} onMessage={event=>{const msg=parseChartEvent(event.nativeEvent.data);if(msg?.type==='ready')model.presentation.onReady?.(msg.durationMs);if(msg?.type==='error')setError(true);if(msg?.type==='selection')setSelection(`${new Date(msg.time*1000).toLocaleString(model.presentation.lang)} · ${msg.value??'—'} ${wire.unit}`);}} style={{backgroundColor:wire.colors.background}}/>
    <Text style={{minHeight:24,fontSize:12,color:wire.colors.text}}>{error?nativeCopy(model.presentation.lang,'runtimeUnavailable'):selection}</Text>
  </View>;
});
