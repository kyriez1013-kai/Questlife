import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { QuestTheme } from '../../design/tokens';
import type { InsightsV3ChartHandle } from '../../insights-v3/InsightsV3Chart';
import { chartHtml } from '../../platform/charts/localChartAsset';
import { nativeInsightsRendererScript } from './nativeInsightsChartRuntime';
import { parseNativeChartEvent, selectionText, type NativeChartModel } from './nativeInsightsChartModel';
import { InsightButton, insightsStyles } from './InsightsControls';
import { ni } from './nativeInsightsStrings';

export type NativeInsightsChartProps = { model: NativeChartModel; q: QuestTheme; onReadyChange: (ready: boolean) => void };

/** Web review of the same local document and native UI; native resolves the .native sibling. */
export default forwardRef<InsightsV3ChartHandle, NativeInsightsChartProps>(function NativeInsightsChart({ model, q, onReadyChange }, ref) {
  const frame = useRef<HTMLIFrameElement>(null); const [loaded, setLoaded] = useState(false); const [error, setError] = useState(false); const [reload, setReload] = useState(0); const [selection, setSelection] = useState('');
  const signature = JSON.stringify(model); const s = insightsStyles(q);
  const send = (command: object) => (frame.current?.contentWindow as unknown as { questlifeChart?: (command: object) => void } | null)?.questlifeChart?.(command);
  useImperativeHandle(ref, () => ({ fit: () => send({ type: 'fit' }), zoomIn: () => send({ type: 'zoomIn' }), zoomOut: () => send({ type: 'zoomOut' }) }));
  useEffect(() => {
    onReadyChange(false); setError(false); setSelection('');
    let timer: ReturnType<typeof setTimeout>;
    const handler = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = parseNativeChartEvent(event.data);
      if (message?.type === 'ready') { clearTimeout(timer); onReadyChange(true); }
      else if (message?.type === 'error') { clearTimeout(timer); setError(true); onReadyChange(false); }
      else if (message?.type === 'selection') setSelection(selectionText(JSON.parse(signature), message));
    };
    window.addEventListener('message', handler);
    if (loaded) send({ type: 'model', model: JSON.parse(signature) });
    timer = setTimeout(() => { setError(true); onReadyChange(false); }, 10000);
    return () => { clearTimeout(timer); window.removeEventListener('message', handler); };
  }, [loaded, signature, reload, onReadyChange]);
  return <View style={{ gap: q.spacing.sm }}>
    <iframe key={reload} ref={frame} title={model.label} srcDoc={`${chartHtml}<script>${nativeInsightsRendererScript}</script>`} onLoad={() => setLoaded(true)} style={{ width: '100%', height: q.spacing.xxl * 10, border: 0 }} />
    {error ? <><Text role="alert" style={s.body}>{ni(model.lang, 'chartError')}</Text><InsightButton q={q} label={ni(model.lang, 'retryChart')} icon="reset" onPress={() => { setLoaded(false); setReload(value => value + 1); }} /></> : null}
    {selection ? <Text selectable style={s.meta}>{selection}</Text> : null}
  </View>;
});
