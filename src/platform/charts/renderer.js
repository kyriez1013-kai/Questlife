/* Local, network-free renderer. Receives only materialized chart values. */
(function () {
  let chart, main, layers = [], started = performance.now();
  const send = (event) => window.ReactNativeWebView?.postMessage(JSON.stringify(event));
  const host = document.getElementById('chart');
  const draw = (m) => {
    if (chart) chart.remove();
    const L = LightweightCharts;
    chart = L.createChart(host, { autoSize: true, layout: { background: { color:m.colors.background }, textColor:m.colors.text, attributionLogo:true }, grid:{vertLines:{visible:false},horzLines:{color:m.colors.border}}, timeScale:{timeVisible:true,secondsVisible:false},handleScale:{pinch:true,axisPressedMouseMove:true,mouseWheel:true},handleScroll:{horzTouchDrag:true,vertTouchDrag:false,pressedMouseMove:true},crosshair:{mode:0} });
    const style = {color:m.colors.line,upColor:m.colors.line,downColor:m.colors.line,borderVisible:false,wickUpColor:m.colors.line,wickDownColor:m.colors.line,lineWidth:2,pointMarkersVisible:m.kind==='point',lineVisible:m.kind!=='point',lastValueVisible:true};
    main=chart.addSeries(m.kind==='candle'?L.CandlestickSeries:m.kind==='bar'?L.HistogramSeries:L.LineSeries,style);
    main.setData(m.kind==='candle'?m.candles:m.points);
    layers=m.layers.map(layer=>{const series=chart.addSeries(L.LineSeries,{color:layer.comparison?m.colors.comparison:m.colors.line,lineStyle:2,lineWidth:1,priceScaleId:layer.unit===m.unit?'right':layer.id,lastValueVisible:false});series.setData(layer.points);return series;});
    Object.entries(m.reference).forEach(([key,value])=>{if(value!=null)main.createPriceLine({price:value,color:m.colors.comparison,lineWidth:1,lineStyle:2,axisLabelVisible:true,title:key});});
    const markers=m.events.filter(e=>m.points.some(p=>p.time===e.time)).map(e=>({time:e.time,position:'aboveBar',shape:'circle',size:.5,color:m.colors.comparison}));
    if(markers.length)L.createSeriesMarkers(main,markers);
    chart.subscribeCrosshairMove(event=>{if(typeof event.time==='number'){const row=event.seriesData.get(main);send({type:'selection',time:event.time,value:row?.value??row?.close??null});}});
    chart.timeScale().fitContent();
    send({type:'ready',durationMs:performance.now()-started});
  };
  window.questlifeChart = (command) => {
    try {
      if(command.type==='model'){started=performance.now();draw(command.model);return;}
      if(!chart)return;
      const scale=chart.timeScale();
      if(command.type==='fit')scale.fitContent();
      else {const range=scale.getVisibleLogicalRange();if(range){const center=(range.from+range.to)/2;const span=(range.to-range.from)*(command.type==='zoomIn'?.7:1.4);scale.setVisibleLogicalRange({from:center-span/2,to:center+span/2});}}
    } catch {send({type:'error',code:'render_failed'});}
  };
})();
