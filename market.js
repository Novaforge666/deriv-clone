var MARKETS = {
    synthetic: [
        { s: 'R_100', n: 'Volatility 100 Index', d: 2 },
        { s: 'R_75', n: 'Volatility 75 Index', d: 4 },
        { s: 'R_50', n: 'Volatility 50 Index', d: 4 },
        { s: 'R_25', n: 'Volatility 25 Index', d: 4 },
        { s: 'R_10', n: 'Volatility 10 Index', d: 3 },
        { s: '1HZ100V', n: 'Volatility 100 (1s)', d: 2 },
        { s: '1HZ50V', n: 'Volatility 50 (1s)', d: 4 },
        { s: '1HZ10V', n: 'Volatility 10 (1s)', d: 3 }
    ],
    forex: [
        { s: 'frxEURUSD', n: 'EUR/USD', d: 5 },
        { s: 'frxGBPUSD', n: 'GBP/USD', d: 5 },
        { s: 'frxUSDJPY', n: 'USD/JPY', d: 3 },
        { s: 'frxAUDUSD', n: 'AUD/USD', d: 5 }
    ],
    commodities: [
        { s: 'frxXAUUSD', n: 'Gold/USD', d: 2 },
        { s: 'frxXAGUSD', n: 'Silver/USD', d: 4 }
    ]
};

var curSymbol = 'R_100';
var curGranularity = 300;
var prevPrices = {};

function mktDP(sym) { for (var c in MARKETS) for (var i = 0; i < MARKETS[c].length; i++) if (MARKETS[c][i].s === sym) return MARKETS[c][i].d; return 2; }
function mktName(sym) { for (var c in MARKETS) for (var i = 0; i < MARKETS[c].length; i++) if (MARKETS[c][i].s === sym) return MARKETS[c][i].n; return sym; }

function mktBuildSidebar(cat) {
    var list = document.getElementById('tsBody'); if (!list) return;
    var items = MARKETS[cat] || MARKETS.synthetic;
    list.innerHTML = items.map(function (m) {
        return '<div class="ts-item' + (m.s === curSymbol ? ' active' : '') + '" data-symbol="' + m.s + '"><span class="tsi-n">' + m.n + '</span><span class="tsi-p" id="tp_' + m.s + '">--</span></div>';
    }).join('');
}

function mktBuildDashboard() {
    var body = document.getElementById('mwBody'); if (!body) return;
    var syms = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10', '1HZ100V'];
    body.innerHTML = syms.map(function (s) {
        return '<div class="mw-row" data-symbol="' + s + '"><span class="mw-name">' + mktName(s) + '</span><span class="mw-price" id="mw_' + s + '">--</span><span class="mw-chg up" id="mc_' + s + '">--</span></div>';
    }).join('');
}

function mktSubscribe() {
    var syms = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10', '1HZ100V'];
    syms.forEach(function (sym) {
        var dp = mktDP(sym);
        wsSubTick(sym, function (tick) {
            var q = (+tick.quote).toFixed(dp);
            var prev = prevPrices[sym];
            prevPrices[sym] = +tick.quote;

            var mw = document.getElementById('mw_' + sym);
            if (mw) {
                mw.textContent = q;
                mw.classList.remove('flash-up', 'flash-dn');
                if (prev !== undefined) {
                    mw.classList.add(+tick.quote >= prev ? 'flash-up' : 'flash-dn');
                    setTimeout(function () { mw.classList.remove('flash-up', 'flash-dn'); }, 300);
                }
            }

            var mc = document.getElementById('mc_' + sym);
            if (mc && prev !== undefined) {
                var diff = +tick.quote - prev;
                mc.textContent = (diff >= 0 ? '+' : '') + (prev ? ((diff / prev) * 100).toFixed(2) : '0.00') + '%';
                mc.className = 'mw-chg ' + (diff >= 0 ? 'up' : 'dn');
            }

            var tp = document.getElementById('tp_' + sym);
            if (tp) tp.textContent = q;

            if (sym === curSymbol) {
                var cp = document.getElementById('chartPrice');
                if (cp) cp.textContent = q;
            }
        });
    });
}