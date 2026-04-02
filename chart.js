var lwChart = null, lwSeries = null, chartType = 'candle';

function chartInit() {
    var box = document.getElementById('chartBox'); if (!box) return;
    box.innerHTML = '';
    lwChart = LightweightCharts.createChart(box, {
        width: box.clientWidth, height: box.clientHeight,
        layout: { background: { type: 'solid', color: '#0e0e0e' }, textColor: '#6e7575', fontFamily: 'IBM Plex Sans', fontSize: 11 },
        grid: { vertLines: { color: '#1a1c1c' }, horzLines: { color: '#1a1c1c' } },
        crosshair: { vertLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' }, horzLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2a2d2d' },
        rightPriceScale: { borderColor: '#2a2d2d' }
    });
    chartAddSeries();
    new ResizeObserver(function (e) { e.forEach(function (x) { lwChart.applyOptions({ width: x.contentRect.width, height: x.contentRect.height }); }); }).observe(box);
}

function chartAddSeries() {
    if (!lwChart) return;
    if (lwSeries) { lwChart.removeSeries(lwSeries); lwSeries = null; }
    if (chartType === 'candle') lwSeries = lwChart.addCandlestickSeries({ upColor: '#0dc49a', downColor: '#ff444f', borderUpColor: '#0dc49a', borderDownColor: '#ff444f', wickUpColor: '#0dc49a', wickDownColor: '#ff444f' });
    else if (chartType === 'line') lwSeries = lwChart.addLineSeries({ color: '#377cfc', lineWidth: 2 });
    else lwSeries = lwChart.addAreaSeries({ topColor: 'rgba(55,124,252,.3)', bottomColor: 'rgba(55,124,252,0)', lineColor: '#377cfc', lineWidth: 2 });
}

function chartLoad(sym, gran) {
    curSymbol = sym; curGranularity = gran;
    wsSend({ ticks_history: sym, adjust_start_time: 1, count: 500, end: 'latest', granularity: gran, style: 'candles' })
        .then(function (r) {
            if (r.candles) {
                lwSeries.setData(r.candles.map(function (c) { return { time: c.epoch, open: +c.open, high: +c.high, low: +c.low, close: +c.close }; }));
                lwChart.timeScale().fitContent();
            }
            wsRaw({ ticks_history: sym, adjust_start_time: 1, count: 1, end: 'latest', granularity: gran, style: 'candles', subscribe: 1 });
        }).catch(function () { });
}

function chartSetType(t) { chartType = t; chartAddSeries(); wsForgetAll('candles'); chartLoad(curSymbol, curGranularity); }

wsOn('ohlc', function (o) {
    if (o.symbol === curSymbol && lwSeries && chartType === 'candle')
        lwSeries.update({ time: +o.open_time, open: +o.open, high: +o.high, low: +o.low, close: +o.close });
});