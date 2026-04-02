// ========================================
// Markets Module
// ========================================
var MARKETS = {
    synthetic: [
        { sym: 'R_100', name: 'Volatility 100 Index', dp: 2 },
        { sym: 'R_75', name: 'Volatility 75 Index', dp: 4 },
        { sym: 'R_50', name: 'Volatility 50 Index', dp: 4 },
        { sym: 'R_25', name: 'Volatility 25 Index', dp: 4 },
        { sym: 'R_10', name: 'Volatility 10 Index', dp: 3 },
        { sym: '1HZ100V', name: 'Volatility 100 (1s)', dp: 2 },
        { sym: '1HZ75V', name: 'Volatility 75 (1s)', dp: 4 },
        { sym: '1HZ50V', name: 'Volatility 50 (1s)', dp: 4 },
        { sym: '1HZ25V', name: 'Volatility 25 (1s)', dp: 4 },
        { sym: '1HZ10V', name: 'Volatility 10 (1s)', dp: 3 }
    ],
    forex: [
        { sym: 'frxEURUSD', name: 'EUR/USD', dp: 5 },
        { sym: 'frxGBPUSD', name: 'GBP/USD', dp: 5 },
        { sym: 'frxUSDJPY', name: 'USD/JPY', dp: 3 },
        { sym: 'frxAUDUSD', name: 'AUD/USD', dp: 5 },
        { sym: 'frxUSDCAD', name: 'USD/CAD', dp: 5 }
    ],
    commodities: [
        { sym: 'frxXAUUSD', name: 'Gold/USD', dp: 2 },
        { sym: 'frxXAGUSD', name: 'Silver/USD', dp: 4 }
    ]
};

var curSymbol = 'R_100';
var curGranularity = 300;
var prevPrices = {};

function mktGetDP(sym) {
    for (var cat in MARKETS) {
        for (var i = 0; i < MARKETS[cat].length; i++) {
            if (MARKETS[cat][i].sym === sym) return MARKETS[cat][i].dp;
        }
    }
    return 2;
}

function mktGetName(sym) {
    for (var cat in MARKETS) {
        for (var i = 0; i < MARKETS[cat].length; i++) {
            if (MARKETS[cat][i].sym === sym) return MARKETS[cat][i].name;
        }
    }
    return sym;
}

function mktPopulateSidebar(category) {
    var list = document.getElementById('tsList');
    if (!list) return;
    var items = MARKETS[category] || MARKETS.synthetic;

    list.innerHTML = items.map(function (m) {
        return '<div class="ts-item' + (m.sym === curSymbol ? ' active' : '') + '" data-symbol="' + m.sym + '">' +
            '<div class="tsi-left"><span class="tsi-name">' + m.name + '</span></div>' +
            '<div class="tsi-right"><span class="tsi-price" id="tp_' + m.sym + '">--</span>' +
            '<span class="tsi-change" id="tc_' + m.sym + '"></span></div></div>';
    }).join('');
}

function mktSubscribeDashboard() {
    var watchSymbols = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10', '1HZ100V'];

    watchSymbols.forEach(function (sym) {
        var dp = mktGetDP(sym);
        wsSubTick(sym, function (tick) {
            var q = (+tick.quote).toFixed(dp);
            var prev = prevPrices[sym];
            prevPrices[sym] = +tick.quote;

            // Dashboard market watch
            var mwEl = document.getElementById('mw_' + sym);
            if (mwEl) {
                mwEl.textContent = q;
                mwEl.classList.remove('flash-up', 'flash-dn');
                if (prev !== undefined) {
                    mwEl.classList.add(+tick.quote >= prev ? 'flash-up' : 'flash-dn');
                    setTimeout(function () { mwEl.classList.remove('flash-up', 'flash-dn'); }, 400);
                }
            }

            // Change indicator
            var mcEl = document.getElementById('mc_' + sym);
            if (mcEl && prev !== undefined) {
                var diff = +tick.quote - prev;
                var pct = prev !== 0 ? ((diff / prev) * 100).toFixed(2) : '0.00';
                mcEl.textContent = (diff >= 0 ? '+' : '') + pct + '%';
                mcEl.className = 'mw-change ' + (diff >= 0 ? 'up' : 'dn');
            }

            // Sidebar prices
            var tpEl = document.getElementById('tp_' + sym);
            if (tpEl) tpEl.textContent = q;

            // Chart header
            if (sym === curSymbol) {
                var cp = document.getElementById('chartPrice');
                if (cp) cp.textContent = q;
            }
        });
    });
}