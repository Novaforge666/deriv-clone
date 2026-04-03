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
var mktSubscribed = {};
var mktCurrentCat = 'synthetic';

function mktAll() {
    var out = [];
    Object.keys(MARKETS).forEach(function (cat) {
        MARKETS[cat].forEach(function (m) {
            out.push({
                s: m.s,
                n: m.n,
                d: m.d,
                cat: cat
            });
        });
    });
    return out;
}

function mktFind(sym) {
    var all = mktAll();
    for (var i = 0; i < all.length; i++) {
        if (all[i].s === sym) return all[i];
    }
    return null;
}

function mktDP(sym) {
    var m = mktFind(sym);
    return m ? m.d : 2;
}

function mktName(sym) {
    var m = mktFind(sym);
    return m ? m.n : sym;
}

function mktCategoryOf(sym) {
    var m = mktFind(sym);
    return m ? m.cat : 'synthetic';
}

function mktBuildSidebar(cat) {
    mktCurrentCat = cat || mktCurrentCat || 'synthetic';

    var list = document.getElementById('tsBody');
    if (!list) return;

    var items = MARKETS[mktCurrentCat] || MARKETS.synthetic;

    list.innerHTML = items.map(function (m) {
        return '' +
            '<div class="ts-item' + (m.s === curSymbol ? ' active' : '') + '" data-symbol="' + m.s + '">' +
            '   <span class="tsi-n">' + m.n + '</span>' +
            '   <span class="tsi-p" id="tp_' + m.s + '">--</span>' +
            '</div>';
    }).join('');

    mktSetActiveSidebarItem(curSymbol);
    mktApplySearchFilter();
}

function mktSetActiveSidebarItem(sym) {
    document.querySelectorAll('.ts-item').forEach(function (x) {
        x.classList.remove('active');
    });

    var active = document.querySelector('.ts-item[data-symbol="' + sym + '"]');
    if (active) active.classList.add('active');
}

function mktSetActiveTab(cat) {
    document.querySelectorAll('.tstab').forEach(function (x) {
        x.classList.remove('active');
    });

    var tab = document.querySelector('.tstab[data-cat="' + cat + '"]');
    if (tab) tab.classList.add('active');
}

function mktApplySearchFilter() {
    var input = document.getElementById('mktSearch');
    if (!input) return;

    var q = (input.value || '').trim().toLowerCase();

    document.querySelectorAll('.ts-item').forEach(function (x) {
        var txt = x.querySelector('.tsi-n').textContent.toLowerCase();
        x.style.display = txt.indexOf(q) >= 0 ? 'flex' : 'none';
    });
}

function mktBuildDashboard() {
    var body = document.getElementById('mwBody');
    if (!body) return;

    var syms = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10', '1HZ100V'];

    body.innerHTML = syms.map(function (s) {
        return '' +
            '<div class="mw-row" data-symbol="' + s + '">' +
            '   <span class="mw-name">' + mktName(s) + '</span>' +
            '   <span class="mw-price" id="mw_' + s + '">--</span>' +
            '   <span class="mw-chg up" id="mc_' + s + '">--</span>' +
            '</div>';
    }).join('');
}

function mktSubscribe() {
    mktAll().forEach(function (m) {
        if (mktSubscribed[m.s]) return;

        mktSubscribed[m.s] = true;

        wsSubTick(m.s, function (tick) {
            mktOnTick(m.s, tick);
        });
    });
}

function mktOnTick(sym, tick) {
    var quote = +tick.quote;
    var dp = mktDP(sym);
    var q = quote.toFixed(dp);
    var prev = prevPrices[sym];
    var diff = prev === undefined ? 0 : quote - prev;
    var pct = prev ? ((diff / prev) * 100) : 0;

    prevPrices[sym] = quote;

    var mw = document.getElementById('mw_' + sym);
    if (mw) {
        mw.textContent = q;
        mw.classList.remove('flash-up', 'flash-dn');

        if (prev !== undefined) {
            mw.classList.add(diff >= 0 ? 'flash-up' : 'flash-dn');
            setTimeout(function () {
                mw.classList.remove('flash-up', 'flash-dn');
            }, 300);
        }
    }

    var mc = document.getElementById('mc_' + sym);
    if (mc) {
        mc.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        mc.className = 'mw-chg ' + (pct >= 0 ? 'up' : 'dn');
    }

    var tp = document.getElementById('tp_' + sym);
    if (tp) {
        tp.textContent = q;
    }

    if (sym === curSymbol) {
        var cp = document.getElementById('chartPrice');
        if (cp) cp.textContent = q;

        var pctEl = document.getElementById('chartPct');
        if (pctEl) {
            pctEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
            pctEl.className = 'tc-pct ' + (pct >= 0 ? 'up' : 'dn');
        }
    }
}

function mktSelectSymbol(sym, opts) {
    opts = opts || {};

    curSymbol = sym;

    var cat = mktCategoryOf(sym);
    var nameEl = document.getElementById('chartName');
    if (nameEl) nameEl.textContent = mktName(sym);

    var cp = document.getElementById('chartPrice');
    if (cp && prevPrices[sym] !== undefined) {
        cp.textContent = prevPrices[sym].toFixed(mktDP(sym));
    }

    if (opts.rebuildSidebar === false) {
        mktSetActiveSidebarItem(sym);
    } else {
        mktSetActiveTab(cat);
        mktBuildSidebar(cat);
    }

    if (opts.goTrading) {
        uiGoPage('trading');
        return;
    }

    var tradingPage = document.getElementById('pgTrading');
    if (tradingPage && tradingPage.classList.contains('active')) {
        chartLoad(curSymbol, curGranularity);
        if (authAccount) tradeSubProposals();
    }
}