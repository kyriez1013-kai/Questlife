import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { chartHtml } from '../../platform/charts/localChartAsset';
import type { InsightsV3ChartHandle } from '../../insights-v3/InsightsV3Chart';
import { nativeInsightsRendererScript } from './nativeInsightsChartRuntime';
import { parseNativeChartEvent, selectionText } from './nativeInsightsChartModel';
import { InsightButton, insightsStyles } from './InsightsControls';
import { ni } from './nativeInsightsStrings';
import type { NativeInsightsChartProps } from './NativeInsightsChart';

export default forwardRef<InsightsV3ChartHandle, NativeInsightsChartProps>(function NativeInsightsChart({ model, q, onReadyChange }, ref) {
  const view = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false); const [ready, setReady] = useState(false); const [error, setError] = useState(false);
  const [reload, setReload] = useState(0); const [selection, setSelection] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const signature = useMemo(() => JSON.stringify(model), [model]); const s = insightsStyles(q);
  const send = (command: object) => view.current?.injectJavaScript(`window.questlifeChart(${JSON.stringify(command).replace(/</g, '\\u003c')});true;`);
  useImperativeHandle(ref, () => ({ fit: () => send({ type: 'fit' }), zoomIn: () => send({ type: 'zoomIn' }), zoomOut: () => send({ type: 'zoomOut' }) }));
  useEffect(() => {
    setReady(false); setError(false); setSelection('');
    if (loaded) send({ type: 'model', model: JSON.parse(signature) });
    timer.current = setTimeout(() => setError(true), 10000);
    return () => clearTimeout(timer.current);
  }, [loaded, signature, reload]);
  useEffect(() => { onReadyChange(ready && !error); }, [ready, error, onReadyChange]);
  const retry = () => { setLoaded(false); setReady(false); setError(false); setReload(value => value + 1); };
  return <View style={{ gap: q.spacing.sm }}>
    <View style={{ height: q.spacing.xxl * 10, minWidth: 0, overflow: 'hidden' }}>
      <WebView key={reload} ref={view} source={{ html: chartHtml, baseUrl: 'about:blank' }} injectedJavaScript={nativeInsightsRendererScript}
        originWhitelist={['about:*']} javaScriptEnabled domStorageEnabled={false} allowFileAccess={false} mixedContentMode="never" scrollEnabled={false}
        onShouldStartLoadWithRequest={request => request.url === 'about:blank'} onLoadEnd={() => setLoaded(true)} onError={() => setError(true)}
        onContentProcessDidTerminate={() => setError(true)} onRenderProcessGone={() => { setError(true); }}
        onMessage={event => { const message = parseNativeChartEvent(event.nativeEvent.data); if (message?.type === 'ready') { clearTimeout(timer.current); setReady(true); setError(false); } else if (message?.type === 'error') { clearTimeout(timer.current); setError(true); } else if (message?.type === 'selection') setSelection(selectionText(model, message)); }}
        style={{ backgroundColor: model.colors.background }} />
    </View>
    {!ready && !error ? <ActivityIndicator accessibilityLabel={ni(model.lang, 'chartLoading')} color={q.colors.primary} /> : null}
    {error ? <><Text accessibilityRole="alert" style={s.body}>{ni(model.lang, 'chartError')}</Text><InsightButton q={q} label={ni(model.lang, 'retryChart')} icon="reset" onPress={retry} /></> : null}
    {selection ? <Text selectable style={s.meta}>{selection}</Text> : null}
  </View>;
});
