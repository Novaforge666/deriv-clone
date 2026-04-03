var lwChart = null;
var lwSeries = null;
var chartType = 'candle';
var chartRO = null;
var chartControlsBound = false;

var drawTool = 'cursor';
var drawItems = [];
var drawStart = null;
var drawPreview = null;

function chartEnsureToolbar() {
    var toolbar = document.querySelector('.tc-toolbar');
    if (!toolbar) return;

    var right = toolbar.querySelector('.tc-right');
    if (!right) return;

    var groups = right.querySelectorAll('.tc-grp');
    var typeGroup = groups[1] || right;

    var chCandle = document.getElementById('chCandle');
    var chLine = document.getElementById('chLine');
    var chArea = document.getElementById('chArea');

    if (chCandle) chCandle.dataset.chartType = 'candle';
    if (chLine) chLine.dataset.chartType = 'line';
    if (chArea) chArea.dataset.chartType = 'area';

    if (!document.getElementById('chBar')) {
        typeGroup.insertAdjacentHTML('beforeend',
            '<button class="tgb" id="chBar" data-chart-type="bar" type="button" title="Bars"><i class="fas fa-chart-column"></i></button>' +
            '<button class="tgb" id="chBase" data-chart-type="baseline" type="button" title="Baseline"><i class="fas fa-wave-square"></i></button>'
        );
    }

    if (!document.getElementById('drawTools')) {
        var drawHtml =
            '<div class="draw-tools" id="drawTools">' +
            '   <button class="draw-btn active" type="button" data-tool="cursor"><i class="fas fa-mouse-pointer"></i></button>' +
            '   <button class="draw-btn" type="button" data-tool="hline"><i class="fas fa-minus"></i></button>' +
            '   <button class="draw-btn" type="button" data-tool="vline"><i class="fas fa-grip-lines-vertical"></i></button>' +
            '   <button class="draw-btn" type="button" data-tool="trend"><i class="fas fa-slash"></i></button>' +
            '   <button class="draw-btn" type="button" data-tool="rect"><i class="far fa-square"></i></button>' +
            '   <button class="draw-btn" type="button" id="drawClear"><i class="fas fa-trash"></i></button>' +
            '</div>';
        toolbar.insertAdjacentHTML('beforeend', drawHtml);
    }

    if (chartControlsBound) return;
    chartControlsBound = true;

    document.addEventListener('click', function (e) {
        var typeBtn = e.target.closest('[data-chart-type]');
        if (typeBtn) {
            document.querySelectorAll('[data-chart-type]').forEach(function (x) {
                x.classList.remove('active');
            });
            typeBtn.classList.add('active');
            chartSetType(typeBtn.dataset.chartType);
            return;
        }

        var drawBtn = e.target.closest('.draw-btn[data-tool]');
        if (drawBtn) {
            chartSetDrawTool(drawBtn.dataset.tool);
            return;
        }

        if (e.target.closest('#drawClear')) {
            drawItems = [];
            drawPreview = null;
            drawStart = null;
            chartRenderDrawings();
        }
    });
}

function chartInit() {
    chartEnsureToolbar();

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
    box.style.position = 'relative';

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
    chartEnsureDrawLayer(box);

    if (typeof tradeEnsureDigitOverlay === 'function') {
        tradeEnsureDigitOverlay();
    }
    if (typeof tradeRenderDigitUI === 'function') {
        tradeRenderDigitUI();
    }

    if (typeof tradeSyncDigitCursors === 'function') {
        tradeSyncDigitCursors();
    }

    if (typeof tradeEnsureDigitOverlay === 'function') {
        tradeEnsureDigitOverlay();
    }
    if (typeof tradeRenderDigitUI === 'function') {
        tradeRenderDigitUI();
    }

    if (typeof tradeSyncDigitCursors === 'function') {
        tradeSyncDigitCursors();
    }

    if (window.ResizeObserver) {
        chartRO = new ResizeObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!lwChart) return;
                lwChart.applyOptions({
                    width: Math.max(entry.contentRect.width, 320),
                    height: Math.max(entry.contentRect.height, 360)
                });
                chartRenderDrawings();
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
    } else if (chartType === 'area') {
        lwSeries = lwChart.addAreaSeries({
            topColor: 'rgba(55,124,252,.3)',
            bottomColor: 'rgba(55,124,252,0)',
            lineColor: '#377cfc',
            lineWidth: 2
        });
    } else if (chartType === 'bar') {
        lwSeries = lwChart.addBarSeries({
            upColor: '#0dc49a',
            downColor: '#ff444f',
            thinBars: false
        });
    } else {
        lwSeries = lwChart.addBaselineSeries({
            topLineColor: '#0dc49a',
            topFillColor1: 'rgba(13,196,154,.25)',
            topFillColor2: 'rgba(13,196,154,0)',
            bottomLineColor: '#ff444f',
            bottomFillColor1: 'rgba(255,68,79,.15)',
            bottomFillColor2: 'rgba(255,68,79,0)',
            lineWidth: 2
        });
    }
}

function chartSetData(candles) {
    if (!lwSeries || !candles || !candles.length) return;

    if (chartType === 'candle' || chartType === 'bar') {
        lwSeries.setData(candles.map(function (c) {
            return {
                time: +c.epoch,
                open: +c.open,
                high: +c.high,
                low: +c.low,
                close: +c.close
            };
        }));
    } else {
        lwSeries.setData(candles.map(function (c) {
            return {
                time: +c.epoch,
                value: +c.close
            };
        }));

        if (chartType === 'baseline' && lwSeries.applyOptions) {
            lwSeries.applyOptions({
                baseValue: {
                    type: 'price',
                    price: +candles[0].close
                }
            });
        }
    }

    if (lwChart) lwChart.timeScale().fitContent();
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
    }).then(function (r) {
        if (r.candles && r.candles.length) chartSetData(r.candles);

        wsRaw({
            ticks_history: sym,
            adjust_start_time: 1,
            count: 1,
            end: 'latest',
            granularity: gran,
            style: 'candles',
            subscribe: 1
        });
    }).catch(function (err) {
        console.error('chartLoad failed:', err);
    });
}

function chartSetType(t) {
    chartType = t;
    chartAddSeries();
    chartLoad(curSymbol, curGranularity);
}

function chartSetDrawTool(tool) {
    drawTool = tool || 'cursor';
    drawStart = null;
    drawPreview = null;

    document.querySelectorAll('.draw-btn[data-tool]').forEach(function (x) {
        x.classList.toggle('active', x.dataset.tool === drawTool);
    });
}

function chartEnsureDrawLayer(box) {
    var svg = box.querySelector('#drawLayer');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'drawLayer');
        svg.classList.add('draw-layer');
        box.appendChild(svg);
    }

    if (!box.dataset.drawBound) {
        box.dataset.drawBound = '1';

        box.addEventListener('click', chartHandleDrawClick);
        box.addEventListener('mousemove', chartHandleDrawMove);
        box.addEventListener('mouseleave', function () {
            if (drawTool === 'trend' || drawTool === 'rect') {
                drawPreview = null;
                chartRenderDrawings();
            }
        });
    }

    chartRenderDrawings();
}

function chartPointFromEvent(e) {
    var box = document.getElementById('chartBox');
    var rect = box.getBoundingClientRect();
    return {
        x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, e.clientY - rect.top))
    };
}

function chartHandleDrawClick(e) {
    if (drawTool === 'cursor') return;

    var p = chartPointFromEvent(e);
    var box = document.getElementById('chartBox');
    if (!box) return;

    if (drawTool === 'hline') {
        drawItems.push({ type: 'hline', y: p.y });
        chartRenderDrawings();
        return;
    }

    if (drawTool === 'vline') {
        drawItems.push({ type: 'vline', x: p.x });
        chartRenderDrawings();
        return;
    }

    if (drawTool === 'trend' || drawTool === 'rect') {
        if (!drawStart) {
            drawStart = p;
            drawPreview = null;
        } else {
            drawItems.push({
                type: drawTool,
                x1: drawStart.x,
                y1: drawStart.y,
                x2: p.x,
                y2: p.y
            });
            drawStart = null;
            drawPreview = null;
            chartRenderDrawings();
        }
    }
}

function chartHandleDrawMove(e) {
    if (!drawStart) return;
    if (drawTool !== 'trend' && drawTool !== 'rect') return;

    var p = chartPointFromEvent(e);
    drawPreview = {
        type: drawTool,
        x1: drawStart.x,
        y1: drawStart.y,
        x2: p.x,
        y2: p.y
    };
    chartRenderDrawings();
}

function chartRenderDrawings() {
    var box = document.getElementById('chartBox');
    var svg = document.getElementById('drawLayer');
    if (!box || !svg) return;

    var w = box.clientWidth || 320;
    var h = box.clientHeight || 360;

    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.innerHTML = '';

    function line(x1, y1, x2, y2, dash) {
        return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#ff444f" stroke-width="1.5" ' + (dash ? 'stroke-dasharray="5 5"' : '') + ' />';
    }

    function rect(x1, y1, x2, y2, dash) {
        var x = Math.min(x1, x2);
        var y = Math.min(y1, y2);
        var rw = Math.abs(x2 - x1);
        var rh = Math.abs(y2 - y1);
        return '<rect x="' + x + '" y="' + y + '" width="' + rw + '" height="' + rh + '" fill="rgba(255,68,79,.08)" stroke="#ff444f" stroke-width="1.5" ' + (dash ? 'stroke-dasharray="5 5"' : '') + ' />';
    }

    var html = '';

    drawItems.forEach(function (d) {
        if (d.type === 'hline') html += line(0, d.y, w, d.y);
        if (d.type === 'vline') html += line(d.x, 0, d.x, h);
        if (d.type === 'trend') html += line(d.x1, d.y1, d.x2, d.y2);
        if (d.type === 'rect') html += rect(d.x1, d.y1, d.x2, d.y2);
    });

    if (drawPreview) {
        if (drawPreview.type === 'trend') html += line(drawPreview.x1, drawPreview.y1, drawPreview.x2, drawPreview.y2, true);
        if (drawPreview.type === 'rect') html += rect(drawPreview.x1, drawPreview.y1, drawPreview.x2, drawPreview.y2, true);
    }

    svg.innerHTML = html;
}

wsOn('ohlc', function (o) {
    if (!lwSeries) return;
    if (o.symbol && o.symbol !== curSymbol) return;

    if (chartType === 'candle' || chartType === 'bar') {
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