// js/chart.js

class ChartManager {
    constructor() {
        this.chart = null;
        this.candleSeries = null;
        this.lineSeries = null;
        this.currentType = 'candles';
        this.currentSymbol = 'R_100';
        this.currentGranularity = 300;
        this.data = [];
    }

    init(containerId) {
        const container = document.getElementById(containerId);

        if (!container) return;

        // Clear previous chart
        container.innerHTML = '';

        this.chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: {
                    type: 'solid',
                    color: document.body.classList.contains('light-theme') ? '#ffffff' : '#0e0e0e'
                },
                textColor: document.body.classList.contains('light-theme') ? '#333' : '#c2c7c7',
                fontFamily: 'IBM Plex Sans',
            },
            grid: {
                vertLines: {
                    color: document.body.classList.contains('light-theme') ? '#f0f0f0' : '#1d1f1f'
                },
                horzLines: {
                    color: document.body.classList.contains('light-theme') ? '#f0f0f0' : '#1d1f1f'
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    color: '#ff444f',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#ff444f',
                },
                horzLine: {
                    color: '#ff444f',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#ff444f',
                },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: document.body.classList.contains('light-theme') ? '#e0e3e3' : '#2a2d2d',
            },
            rightPriceScale: {
                borderColor: document.body.classList.contains('light-theme') ? '#e0e3e3' : '#2a2d2d',
            },
        });

        this.candleSeries = this.chart.addCandlestickSeries({
            upColor: '#0dc49a',
            downColor: '#ff444f',
            borderDownColor: '#ff444f',
            borderUpColor: '#0dc49a',
            wickDownColor: '#ff444f',
            wickUpColor: '#0dc49a',
        });

        // Handle resize
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                this.chart.applyOptions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });
        resizeObserver.observe(container);
    }

    async loadHistory(symbol, granularity) {
        this.currentSymbol = symbol;
        this.currentGranularity = granularity;

        try {
            const response = await derivWS.send({
                ticks_history: symbol,
                adjust_start_time: 1,
                count: 500,
                end: 'latest',
                granularity: granularity,
                style: 'candles'
            });

            if (response.candles) {
                this.data = response.candles.map(c => ({
                    time: c.epoch,
                    open: parseFloat(c.open),
                    high: parseFloat(c.high),
                    low: parseFloat(c.low),
                    close: parseFloat(c.close),
                }));

                this.candleSeries.setData(this.data);
                this.chart.timeScale().fitContent();
            }

            // Subscribe to live updates
            this.subscribeToCandles(symbol, granularity);

        } catch (error) {
            console.error('Failed to load chart history:', error);
        }
    }

    subscribeToCandles(symbol, granularity) {
        // Subscribe to OHLC stream
        derivWS.sendRaw({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 1,
            end: 'latest',
            granularity: granularity,
            style: 'candles',
            subscribe: 1
        });

        derivWS.subscribe(`ohlc_${symbol}`, (ohlc) => {
            if (ohlc.symbol === this.currentSymbol) {
                const candle = {
                    time: parseInt(ohlc.open_time),
                    open: parseFloat(ohlc.open),
                    high: parseFloat(ohlc.high),
                    low: parseFloat(ohlc.low),
                    close: parseFloat(ohlc.close),
                };
                this.candleSeries.update(candle);
            }
        });
    }

    updateCandle(candle) {
        if (this.candleSeries) {
            this.candleSeries.update(candle);
        }
    }

    changeTimeframe(granularity) {
        this.currentGranularity = granularity;
        derivWS.sendRaw({ forget_all: 'candles' });
        this.loadHistory(this.currentSymbol, granularity);
    }

    changeSymbol(symbol) {
        derivWS.sendRaw({ forget_all: 'candles' });
        this.loadHistory(symbol, this.currentGranularity);
    }

    updateTheme(isDark) {
        if (this.chart) {
            this.chart.applyOptions({
                layout: {
                    background: {
                        type: 'solid',
                        color: isDark ? '#0e0e0e' : '#ffffff'
                    },
                    textColor: isDark ? '#c2c7c7' : '#333',
                },
                grid: {
                    vertLines: { color: isDark ? '#1d1f1f' : '#f0f0f0' },
                    horzLines: { color: isDark ? '#1d1f1f' : '#f0f0f0' },
                },
            });
        }
    }
}

const chartManager = new ChartManager();