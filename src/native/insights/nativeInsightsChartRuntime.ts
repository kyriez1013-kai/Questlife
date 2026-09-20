// A literal survives Hermes bytecode and does not depend on Metro/Babel helpers.
// Executed in the existing local Lightweight Charts document, never over a network.
export const nativeInsightsRendererScript = String.raw`
(function () {
  const hostWindow = window;
  const library = hostWindow.LightweightCharts;
  let chart;
  const send = (event) => {
    const payload = JSON.stringify(Object.assign({ channel: 'native-insights' }, event));
    if (hostWindow.ReactNativeWebView) hostWindow.ReactNativeWebView.postMessage(payload);
    else window.parent.postMessage(payload, '*');
  };
  const format = (value, unit, model) => {
    if (unit === 'minutes_from_local_noon') { const n = ((Math.round(value + 720) % 1440) + 1440) % 1440; return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); }
    if (unit === 'binary') return value > 0 ? model.binaryYes : model.binaryNo;
    return new Intl.NumberFormat(model.lang === 'zh' ? 'zh-CN' : 'en-AU', { maximumFractionDigits: 2 }).format(value);
  };
  const draw = (m) => {
    chart?.remove();
    chart = library.createChart(document.getElementById('chart'), {
      autoSize: true, layout: { background: { color: m.colors.background }, textColor: m.colors.text, fontSize: m.fontSize, attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: m.colors.border } },
      timeScale: { timeVisible: true, secondsVisible: false, tickMarkFormatter: (time, type, locale) => new Intl.DateTimeFormat(locale, type >= 3 ? { hour: '2-digit', minute: '2-digit' } : type === 0 ? { year: 'numeric' } : { month: 'short', day: 'numeric' }).format(new Date(time * 1000)) }, rightPriceScale: { borderVisible: false },
      handleScale: { pinch: true, axisPressedMouseMove: true, mouseWheel: true }, handleScroll: { horzTouchDrag: true, vertTouchDrag: false, pressedMouseMove: true }, crosshair: { mode: 0 },
      localization: { locale: m.lang === 'zh' ? 'zh-CN' : 'en-AU', timeFormatter: (time) => new Date(time * 1000).toLocaleString(m.lang === 'zh' ? 'zh-CN' : 'en-AU') },
    });
    const primary = chart.addSeries(m.kind === 'candle' ? library.CandlestickSeries : m.kind === 'bar' ? library.HistogramSeries : library.LineSeries, {
      color: m.colors.line, upColor: m.colors.line, downColor: m.colors.line, borderVisible: false, wickUpColor: m.colors.line, wickDownColor: m.colors.line,
      lineWidth: 2, pointMarkersVisible: m.kind === 'point' || m.points.length === 1, lineVisible: m.kind !== 'point' && m.points.length > 1,
      priceLineVisible: false, priceFormat: { type: 'custom', minMove: 0.01, formatter: (value) => format(value, m.unit, m) },
    });
    primary.setData(m.kind === 'candle' ? m.candles : m.points);
    const tracked = m.layers.filter(layer => layer.unit === m.unit).map(layer => {
      const api = chart.addSeries(library.LineSeries, { color: layer.color, lineStyle: layer.dashed ? 2 : 0, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, pointMarkersVisible: layer.points.length === 1 });
      api.setData(layer.points); return { api, id: layer.id };
    });
    Object.entries(m.reference).forEach(([key, value]) => { if (value != null) primary.createPriceLine({ price: value, color: m.referenceColor, lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: m.referenceLabels[key] }); });
    if (m.bands.length) ['low', 'high'].forEach(key => {
      const line = chart.addSeries(library.LineSeries, { color: m.referenceColor, lineStyle: 3, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      line.setData(m.bands.map(row => ({ time: row.time, value: row[key] })));
    });
    const times = new Set((m.kind === 'candle' ? m.candles : m.points).map(row => row.time));
    const markers = m.events.filter(row => times.has(row.time)).map(row => ({ time: row.time, position: row.label === 'PLAN' ? 'belowBar' : 'aboveBar', shape: row.label === 'PLAN' ? 'arrowUp' : 'circle', color: m.referenceColor }));
    if (markers.length) library.createSeriesMarkers(primary, markers);
    chart.subscribeCrosshairMove((event) => {
      if (typeof event.time !== 'number') return;
      const row = event.seriesData.get(primary);
      const candle = row && 'open' in row ? { open: row.open, high: row.high, low: row.low, close: row.close } : undefined;
      send({ type: 'selection', time: event.time, value: row?.value ?? row?.close ?? null, candle,
        rows: tracked.flatMap(layer => { const value = event.seriesData.get(layer.api)?.value; return typeof value === 'number' ? [{ id: layer.id, value }] : []; }),
      });
    });
    chart.timeScale().fitContent();
    send({ type: 'ready' });
  };
  hostWindow.questlifeChart = command => {
    try {
      if (command.type === 'model') { draw(command.model); return; }
      if (!chart) return;
      const scale = chart.timeScale();
      if (command.type === 'fit') scale.fitContent();
      else if (command.type === 'zoomIn' || command.type === 'zoomOut') {
        const range = scale.getVisibleLogicalRange();
        if (range) { const center = (range.from + range.to) / 2; const span = Math.max(1, Math.min(100000, (range.to - range.from) * (command.type === 'zoomIn' ? 0.7 : 1.4))); scale.setVisibleLogicalRange({ from: center - span / 2, to: center + span / 2 }); }
      }
    } catch { send({ type: 'error' }); }
  };
})();true;
`;
