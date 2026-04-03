var lwChart = null;
var lwSeries = null;
var chartType = 'candle';
var chartRO = null;

function chartInit() {
    var box = document.getElementById('chartBox');
    if (!box || !window.LightweightCharts) return;

    if (lwChart) {
        lwChart.remove();
        lwChart = null;
        lwSeries = null;
    }

    if (chartRO) {
        chartRO.disconnect();
        chartRO = null;
    }

    box.innerHTML = '';

    lwChart = LightweightCharts.createChart(box, {
        width: Math.max(box.clientWidth || 0, 320),
        height: Math.max(box.clientHeight || 0, 360),
        layout: {
            background: { type: 'solid', color: '#0e0e0e' },
            textColor: '#6e7575',
            fontFamily: 'IBM Plex Sans',
            fontSize: 11
        },
        grid: {
            vertLines: { color: '#1a1c1c' },
            horzLines: { color: '#1a1c1c' }
        },
        crosshair: {
            vertLine: {
                color: '#ff444f',
                width: 1,
                style: 2,
                labelBackgroundColor: '#ff444f'
            },
            horzLine: {
                color: '#ff444f',
                width: 1,
                style: 2,
                labelBackgroundColor: '#ff444f'
            }
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: '#2a2d2d'
        },
        rightPriceScale: {
            borderColor: '#2a2d2d'
        }
    });

    chartAddSeries();

    if (window.ResizeObserver) {
        chartRO = new ResizeObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!lwChart) return;
                lwChart.applyOptions({
                    width: Math.max(entry.contentRect.width, 320),
                    height: Math.max(entry.contentRect.height, 360)
                });
            });
        });

        chartRO.observe(box);
    }
}

function chartAddSeries() {
    if (!lwChart) return;

    if (lwSeries) {
        lwChart.removeSeries(lwSeries);
        lwSeries = null;
    }

    if (chartType === 'candle') {
        lwSeries = lwChart.addCandlestickSeries({
            upColor: '#0dc49a',
            downColor: '#ff444f',
            borderUpColor: '#0dc49a',
            borderDownColor: '#ff444f',
            wickUpColor: '#0dc49a',
            wickDownColor: '#ff444f'
        });
    } else if (chartType === 'line') {
        lwSeries = lwChart.addLineSeries({
            color: '#377cfc',
            lineWidth: 2
        });
    } else {
        lwSeries = lwChart.addAreaSeries({
            topColor: 'rgba(55,124,252,.3)',
            bottomColor: 'rgba(55,124,252,0)',
            lineColor: '#377cfc',
            lineWidth: 2
        });
    }
}

function chartSetData(candles) {
    if (!lwSeries || !candles || !candles.length) return;

    if (chartType === 'candle') {
        lwSeries.setData(
            candles.map(function (c) {
                return {
                    time: +c.epoch,
                    open: +c.open,
                    high: +c.high,
                    low: +c.low,
                    close: +c.close
                };
            })
        );
    } else {
        lwSeries.setData(
            candles.map(function (c) {
                return {
                    time: +c.epoch,
                    value: +c.close
                };
            })
        );
    }

    if (lwChart) {
        lwChart.timeScale().fitContent();
    }
}

function chartLoad(sym, gran) {
    curSymbol = sym;
    curGranularity = gran;

    var nameEl = document.getElementById('chartName');
    if (nameEl) nameEl.textContent = mktName(sym);

    wsForgetAll('candles');

    wsSend({
        ticks_history: sym,
        adjust_start_time: 1,
        count: 500,
        end: 'latest',
        granularity: gran,
        style: 'candles'
    })
        .then(function (r) {
            if (r.candles && r.candles.length) {
                chartSetData(r.candles);
            }

            wsRaw({
                ticks_history: sym,
                adjust_start_time: 1,
                count: 1,
                end: 'latest',
                granularity: gran,
                style: 'candles',
                subscribe: 1
            });
        })
        .catch(function (err) {
            console.error('chartLoad failed:', err);
        });
}

function chartSetType(t) {
    chartType = t;
    chartAddSeries();
    chartLoad(curSymbol, curGranularity);
}

wsOn('ohlc', function (o) {
    if (!lwSeries) return;
    if (o.symbol && o.symbol !== curSymbol) return;

    if (chartType === 'candle') {
        lwSeries.update({
            time: +o.open_time,
            open: +o.open,
            high: +o.high,
            low: +o.low,
            close: +o.close
        });
    } else {
        lwSeries.update({
            time: +o.open_time,
            value: +o.close
        });
    }
});