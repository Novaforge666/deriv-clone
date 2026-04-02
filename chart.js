// ========================================
// Chart Module
// ========================================
var lwChart = null;
var lwSeries = null;
var chartType = 'candle'; // candle, line, area

function chartInit() {
    var box = document.getElementById('chartBox');
    if (!box) return;
    box.innerHTML = '';

    lwChart = LightweightCharts.createChart(box, {
        width: box.clientWidth,
        height: box.clientHeight,
        layout: {
            background: { type: 'solid', color: '#0e0e0e' },
            textColor: '#6e7575',
            fontFamily: 'IBM Plex Sans',
            fontSize: 12
        },
        grid: {
            vertLines: { color: '#1a1c1c' },
            horzLines: { color: '#1a1c1c' }
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
            vertLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' },
            horzLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' }
        },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#2a2d2d' },
        rightPriceScale: { borderColor: '#2a2d2d' }
    });

    chartAddSeries();

    new ResizeObserver(function (entries) {
        entries.forEach(function (e) {
            lwChart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
        });
    }).observe(box);
}

function chartAddSeries() {
    if (!lwChart) return;

    // Remove old series
    if (lwSeries) {
        lwChart.removeSeries(lwSeries);
        lwSeries = null;
    }

    if (chartType === 'candle') {
        lwSeries = lwChart.addCandlestickSeries({
            upColor: '#0dc49a', downColor: '#ff444f',
            borderUpColor: '#0dc49a', borderDownColor: '#ff444f',
            wickUpColor: '#0dc49a', wickDownColor: '#ff444f'
        });
    } else if (chartType === 'line') {
        lwSeries = lwChart.addLineSeries({
            color: '#377cfc', lineWidth: 2
        });
    } else if (chartType === 'area') {
        lwSeries = lwChart.addAreaSeries({
            topColor: 'rgba(55, 124, 252, 0.3)',
            bottomColor: 'rgba(55, 124, 252, 0.0)',
            lineColor: '#377cfc', lineWidth: 2
        });
    }
}

function chartLoad(sym, gran) {
    curSymbol = sym;
    curGranularity = gran;

    var isCandle = (chartType === 'candle');

    wsSend({
        ticks_history: sym, adjust_start_time: 1, count: 500,
        end: 'latest', granularity: gran, style: isCandle ? 'candles' : 'ticks'
    }).then(function (r) {
        if (isCandle && r.candles) {
            lwSeries.setData(r.candles.map(function (c) {
                return { time: c.epoch, open: +c.open, high: +c.high, low: +c.low, close: +c.close };
            }));
        } else if (!isCandle && r.history) {
            lwSeries.setData(r.history.times.map(function (t, i) {
                return { time: +t, value: +r.history.prices[i] };
            }));
        }
        lwChart.timeScale().fitContent();

        // Subscribe live
        if (isCandle) {
            wsRaw({
                ticks_history: sym, adjust_start_time: 1, count: 1,
                end: 'latest', granularity: gran, style: 'candles', subscribe: 1
            });
        }
    }).catch(function (e) {
        dbg('Chart error: ' + (e.message || ''), 'error');
    });
}

function chartSetType(type) {
    chartType = type;
    chartAddSeries();
    wsForgetAll('candles');
    wsForgetAll('ticks');
    chartLoad(curSymbol, curGranularity);
}

// Live candle updates
wsOn('ohlc', function (o) {
    if (o.symbol === curSymbol && lwSeries && chartType === 'candle') {
        lwSeries.update({
            time: +o.open_time, open: +o.open,
            high: +o.high, low: +o.low, close: +o.close
        });
    }
});