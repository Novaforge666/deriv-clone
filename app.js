// ★★★ YOUR APP ID - Change this! ★★★
var APP_ID = 110143;
var WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=' + APP_ID;

var ws, reqId = 0, pending = {}, tickCBs = {}, evCBs = {}, wsOK = false;
var account = null, chart = null, cSeries = null;
var curSym = 'R_100', curGran = 300, contracts = [];

document.addEventListener('DOMContentLoaded', function () {
    var e1 = document.getElementById('showAppId');
    var e2 = document.getElementById('showOrigin');
    if (e1) e1.textContent = APP_ID;
    if (e2) e2.textContent = location.origin + location.pathname;
    boot();
});

function dlog(m, t) {
    t = t || 'info';
    var b = document.getElementById('debugBox');
    if (b) {
        var d = document.createElement('div');
        d.className = 'dl dl-' + (t === 'success' ? 'ok' : t === 'error' ? 'err' : 'info');
        d.textContent = '[' + new Date().toLocaleTimeString() + '] ' + m;
        b.prepend(d);
        while (b.children.length > 80) b.removeChild(b.lastChild);
    }
    console.log('[' + t + ']', m);
}

function notify(t, m) {
    var w = document.getElementById('toastWrap'); if (!w) return;
    var ic = { s: 'fa-check-circle', e: 'fa-exclamation-circle', i: 'fa-info-circle' };
    var el = document.createElement('div');
    el.className = 'toast ' + t;
    el.innerHTML = '<i class="ti fas ' + ic[t] + '"></i><span class="tm">' + m + '</span><button class="tx" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>';
    el.querySelector('.tx').onclick = function () { el.remove(); };
    w.appendChild(el);
    setTimeout(function () { if (el.parentElement) el.remove(); }, 5000);
}

function showAlert(id, m) { var e = document.getElementById(id); if (e) { e.textContent = m; e.classList.add('show'); } }
function hideAlert(id) { var e = document.getElementById(id); if (e) e.classList.remove('show'); }

// WS
function wsInit() {
    return new Promise(function (ok, no) {
        dlog('Connecting: ' + WS_URL);
        wsStat('wait');
        try { ws = new WebSocket(WS_URL); } catch (e) { dlog('WS create fail: ' + e.message, 'error'); wsStat('err'); no(e); return; }
        ws.onopen = function () { dlog('WS OPEN', 'success'); wsOK = true; wsStat('ok'); ok(); };
        ws.onerror = function () { dlog('WS error', 'error'); wsStat('err'); };
        ws.onclose = function (e) { wsOK = false; dlog('WS closed (' + e.code + ')', 'error'); wsStat('off'); setTimeout(function () { wsInit().catch(function () { }); }, 3000); };
        ws.onmessage = function (e) { try { wsMsg(JSON.parse(e.data)); } catch (x) { } };
    });
}

function wsStat(s) {
    var d = document.getElementById('wsDot'), t = document.getElementById('wsText');
    if (!d || !t) return;
    d.className = 'ws-dot';
    if (s === 'wait') { d.classList.add('wait'); t.textContent = 'Connecting...'; }
    else if (s === 'ok') { d.classList.add('ok'); t.textContent = 'Connected (App ID: ' + APP_ID + ')'; }
    else if (s === 'err') { t.textContent = 'Connection error'; }
    else { t.textContent = 'Disconnected...'; }
}

function wsSend(d) {
    return new Promise(function (ok, no) {
        if (!ws || ws.readyState !== 1) { no(new Error('WS not open')); return; }
        reqId++; d.req_id = reqId;
        dlog('→ [' + reqId + '] ' + (d.authorize ? 'authorize' : d.proposal ? 'proposal' : d.buy ? 'buy' : d.ticks_history ? 'history' : d.balance ? 'balance' : '?'));
        pending[reqId] = { ok: ok, no: no };
        ws.send(JSON.stringify(d));
        var r = reqId;
        setTimeout(function () { if (pending[r]) { delete pending[r]; no(new Error('Timeout')); } }, 15000);
    });
}

function wsOut(d) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(d)); }

function onEv(n, cb) { if (!evCBs[n]) evCBs[n] = []; evCBs[n].push(cb); }
function fireEv(n, d) { if (evCBs[n]) evCBs[n].forEach(function (c) { c(d); }); }

function wsMsg(d) {
    var mt = d.msg_type || '?';
    if (d.error) dlog('← [' + (d.req_id || '-') + '] ' + mt + ' ERR: ' + d.error.code + ' ' + d.error.message, 'error');
    else dlog('← [' + (d.req_id || '-') + '] ' + mt + ' OK', 'success');

    if (d.req_id && pending[d.req_id]) {
        var p = pending[d.req_id]; delete pending[d.req_id];
        d.error ? p.no(d.error) : p.ok(d);
    }
    if (d.tick) { var s = d.tick.symbol; if (tickCBs[s]) tickCBs[s].forEach(function (c) { c(d.tick); }); }
    if (d.ohlc) fireEv('ohlc', d.ohlc);
    if (d.proposal) fireEv('proposal', d.proposal);
    if (d.balance) fireEv('balance', d.balance);
    if (d.proposal_open_contract) fireEv('poc', d.proposal_open_contract);
}

function subTick(sym, cb) {
    if (!tickCBs[sym]) tickCBs[sym] = [];
    tickCBs[sym].push(cb);
    wsOut({ ticks: sym, subscribe: 1 });
}

// AUTH
function auth(token) {
    dlog('Auth: ' + token.substring(0, 10) + '...');
    return wsSend({ authorize: token }).then(function (r) {
        account = r.authorize;
        dlog('OK: ' + account.loginid + ' ' + account.balance + ' ' + account.currency, 'success');
        return account;
    });
}

function checkOAuth() {
    var p = new URLSearchParams(location.search), arr = [], i = 1;
    while (p.has('acct' + i)) {
        arr.push({ acc: p.get('acct' + i), tok: p.get('token' + i), cur: p.get('cur' + i) });
        i++;
    }
    if (arr.length) {
        dlog('OAuth: ' + arr.length + ' accounts', 'success');
        localStorage.setItem('deriv_token', arr[0].tok);
        history.replaceState({}, '', location.pathname);
        return arr[0].tok;
    }
    return null;
}

// CHART
function mkChart() {
    var b = document.getElementById('chartBox'); if (!b) return;
    b.innerHTML = '';
    chart = LightweightCharts.createChart(b, {
        width: b.clientWidth, height: b.clientHeight,
        layout: { background: { type: 'solid', color: '#0e0e0e' }, textColor: '#6e7575', fontFamily: 'IBM Plex Sans' },
        grid: { vertLines: { color: '#1a1c1c' }, horzLines: { color: '#1a1c1c' } },
        crosshair: { vertLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' }, horzLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' } },
        timeScale: { timeVisible: true, borderColor: '#2a2d2d' }, rightPriceScale: { borderColor: '#2a2d2d' }
    });
    cSeries = chart.addCandlestickSeries({ upColor: '#0dc49a', downColor: '#ff444f', borderUpColor: '#0dc49a', borderDownColor: '#ff444f', wickUpColor: '#0dc49a', wickDownColor: '#ff444f' });
    new ResizeObserver(function (e) { e.forEach(function (x) { chart.applyOptions({ width: x.contentRect.width, height: x.contentRect.height }); }); }).observe(b);
}

function loadCandles(sym, g) {
    curSym = sym; curGran = g;
    wsSend({ ticks_history: sym, adjust_start_time: 1, count: 500, end: 'latest', granularity: g, style: 'candles' })
        .then(function (r) {
            if (r.candles) {
                cSeries.setData(r.candles.map(function (c) { return { time: c.epoch, open: +c.open, high: +c.high, low: +c.low, close: +c.close }; }));
                chart.timeScale().fitContent();
            }
            wsOut({ ticks_history: sym, adjust_start_time: 1, count: 1, end: 'latest', granularity: g, style: 'candles', subscribe: 1 });
        }).catch(function (e) { dlog('Chart err: ' + (e.message || ''), 'error'); });
}

onEv('ohlc', function (o) {
    if (o.symbol === curSym && cSeries) cSeries.update({ time: +o.open_time, open: +o.open, high: +o.high, low: +o.low, close: +o.close });
});

// TRADING
function subProposals() {
    wsOut({ forget_all: 'proposal' });
    var a = +document.getElementById('stakeVal').value, dur = +document.getElementById('durVal').value, dt = document.getElementById('durType').value;
    wsOut({ proposal: 1, amount: a, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: dur, duration_unit: dt, symbol: curSym, subscribe: 1 });
    wsOut({ proposal: 1, amount: a, basis: 'stake', contract_type: 'PUT', currency: 'USD', duration: dur, duration_unit: dt, symbol: curSym, subscribe: 1 });
}

onEv('proposal', function (p) {
    var po = (+p.payout).toFixed(2), pr = (+p.payout - +p.ask_price).toFixed(2);
    if (p.contract_type === 'CALL') document.getElementById('risePay').textContent = '$' + po;
    else document.getElementById('fallPay').textContent = '$' + po;
    document.getElementById('payoutVal').textContent = '$' + po;
    document.getElementById('profitVal').textContent = '+$' + pr;
});

function buy(type) {
    var btn = type === 'CALL' ? document.getElementById('riseBtn') : document.getElementById('fallBtn');
    var orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:18px;color:#fff"></i>';
    var a = +document.getElementById('stakeVal').value, dur = +document.getElementById('durVal').value, dt = document.getElementById('durType').value;
    wsSend({ proposal: 1, amount: a, basis: 'stake', contract_type: type, currency: 'USD', duration: dur, duration_unit: dt, symbol: curSym })
        .then(function (r) { return wsSend({ buy: r.proposal.id, price: r.proposal.ask_price }); })
        .then(function (r) {
            notify('s', 'Trade #' + r.buy.contract_id + ' opened!');
            contracts.push(r.buy); updCC();
            wsOut({ proposal_open_contract: 1, contract_id: r.buy.contract_id, subscribe: 1 });
        })
        .catch(function (e) { notify('e', 'Failed: ' + (e.message || e.code || '?')); })
        .finally(function () { btn.disabled = false; btn.innerHTML = orig; });
}

onEv('poc', function (c) {
    var pnl = (+c.profit || 0).toFixed(2), win = +pnl >= 0, list = document.getElementById('contractsList');
    if (c.is_sold) {
        var el = document.getElementById('cc-' + c.contract_id);
        if (el) el.remove();
        contracts = contracts.filter(function (x) { return x.contract_id !== c.contract_id; });
        updCC();
        notify(win ? 's' : 'e', '#' + c.contract_id + ': ' + (win ? 'Won' : 'Lost') + ' $' + Math.abs(+pnl).toFixed(2));
        return;
    }
    var h = '<div class="cc ' + (win ? '' : 'loss') + '" id="cc-' + c.contract_id + '"><div class="cc-top"><span class="cc-type">' + (c.contract_type === 'CALL' ? '↑Rise' : '↓Fall') + '</span><span class="cc-pnl ' + (win ? 'gn' : '') + '" style="color:' + (win ? 'var(--gn)' : 'var(--red)') + '">' + (win ? '+' : '') + '$' + pnl + '</span></div><div class="cc-bottom"><span>' + (c.display_name || curSym) + '</span><span>$' + (+c.buy_price).toFixed(2) + '</span></div></div>';
    var ex = document.getElementById('cc-' + c.contract_id);
    if (ex) ex.outerHTML = h; else list.insertAdjacentHTML('afterbegin', h);
});

function updCC() {
    document.getElementById('cCount').textContent = contracts.length;
    document.getElementById('statOpen').textContent = contracts.length;
}

// UI
function showLogin() { document.getElementById('loginScreen').classList.remove('hidden'); document.getElementById('mainApp').classList.remove('visible'); }
function hideLogin() { document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('mainApp').classList.add('visible'); }

function goPage(pg) {
    document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
    var nl = document.querySelector('.nav-link[data-page="' + pg + '"]'); if (nl) nl.classList.add('active');
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); p.style.display = 'none'; });
    var pe = document.getElementById(pg + 'Page');
    if (pe) { pe.classList.add('active'); pe.style.display = pg === 'trading' ? 'flex' : 'block'; }
    if (pg === 'trading') setTimeout(function () { mkChart(); loadCandles(curSym, curGran); if (account) subProposals(); }, 100);
}

function updBal(b, c) {
    var f = (+b).toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('accBalance').textContent = f + ' ' + (c || 'USD');
    document.getElementById('statBalance').textContent = '$' + f;
}

// AUTHORIZED
function onAuth(a) {
    hideLogin(); hideAlert('alertError');
    updBal(a.balance, a.currency);
    var t = document.getElementById('accType');
    t.textContent = a.is_virtual ? 'Demo' : 'Real';
    t.style.background = a.is_virtual ? 'var(--gn)' : 'var(--bl)';
    notify('s', 'Welcome, ' + (a.fullname || a.loginid) + '!');
    wsOut({ balance: 1, subscribe: 1 });
    onEv('balance', function (b) { updBal(b.balance, b.currency); });
    ['R_100', 'R_50', 'R_75', 'R_10'].forEach(function (s) {
        subTick(s, function (tk) {
            var q = (+tk.quote).toFixed(2);
            var dp = document.getElementById('dp_' + s); if (dp) dp.textContent = q;
            var sp = document.getElementById('sp_' + s); if (sp) sp.textContent = q;
            if (s === curSym) { var cp = document.getElementById('chartLivePrice'); if (cp) cp.textContent = q; }
        });
    });
    bindApp();
}

// BOOT
function boot() {
    dlog('MyTrader v1.0');
    dlog('URL: ' + location.href);
    dlog('App ID: ' + APP_ID);

    document.getElementById('showDebug').addEventListener('change', function (e) {
        document.getElementById('debugBox').classList.toggle('show', e.target.checked);
    });

    bindLogin();

    wsInit().then(function () {
        notify('i', 'Connected (App: ' + APP_ID + ')');
        var ot = checkOAuth();
        var tk = ot || localStorage.getItem('deriv_token');
        if (tk) {
            dlog('Token found, authenticating...');
            auth(tk).then(onAuth).catch(function (e) {
                dlog('Auth failed: ' + (e.message || e.code), 'error');
                localStorage.removeItem('deriv_token');
                showLogin();
            });
        } else {
            showLogin();
        }
    }).catch(function () {
        showAlert('alertError', 'Cannot connect to Deriv.');
    });
}

function bindLogin() {
    document.getElementById('oauthBtn').addEventListener('click', function () {
        dlog('OAuth redirect...');
        notify('i', 'Redirecting to Deriv...');
        setTimeout(function () {
            location.href = 'https://oauth.deriv.com/oauth2/authorize?app_id=' + APP_ID + '&l=EN&brand=deriv';
        }, 300);
    });

    document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault(); hideAlert('alertError'); hideAlert('alertSuccess');
        var tk = document.getElementById('loginToken').value.trim();
        if (!tk) { showAlert('alertError', 'Paste your API token.'); return; }
        var btn = document.getElementById('loginBtn'), btxt = document.getElementById('loginBtnText'), bic = document.getElementById('loginIcon');
        btn.disabled = true; btxt.textContent = 'Connecting...'; bic.className = 'fas fa-spinner fa-spin';
        auth(tk).then(function (a) {
            showAlert('alertSuccess', 'Success! Loading...');
            localStorage.setItem('deriv_token', tk);
            setTimeout(function () { onAuth(a); }, 300);
        }).catch(function (e) {
            showAlert('alertError', 'Failed: ' + (e.message || e.code || JSON.stringify(e)));
            notify('e', e.message || e.code || 'Auth failed');
        }).finally(function () {
            btn.disabled = false; btxt.textContent = 'Log in with Token'; bic.className = 'fas fa-sign-in-alt';
        });
    });
}

function bindApp() {
    document.querySelectorAll('.nav-link').forEach(function (l) { l.addEventListener('click', function (e) { e.preventDefault(); goPage(l.dataset.page); }); });
    var gt = document.getElementById('goTrade'); if (gt) gt.addEventListener('click', function (e) { e.preventDefault(); goPage('trading'); });

    document.querySelectorAll('.mkt-row').forEach(function (r) {
        r.addEventListener('click', function () { curSym = r.dataset.symbol; document.getElementById('chartSymName').textContent = r.querySelector('.mkt-n').textContent; goPage('trading'); });
    });

    document.getElementById('sidebarList').addEventListener('click', function (e) {
        var it = e.target.closest('.sp-item'); if (!it) return;
        document.querySelectorAll('.sp-item').forEach(function (x) { x.classList.remove('active'); });
        it.classList.add('active');
        curSym = it.dataset.symbol;
        document.getElementById('chartSymName').textContent = it.querySelector('.sp-name').textContent;
        wsOut({ forget_all: 'candles' }); loadCandles(curSym, curGran);
        wsOut({ forget_all: 'proposal' }); subProposals();
        subTick(curSym, function (tk) { document.getElementById('chartLivePrice').textContent = (+tk.quote).toFixed(2); });
    });

    document.querySelectorAll('.gb').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.gb').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active'); curGran = +b.dataset.g;
            wsOut({ forget_all: 'candles' }); loadCandles(curSym, curGran);
        });
    });

    document.getElementById('durDown').addEventListener('click', function () { var i = document.getElementById('durVal'); if (+i.value > 1) { i.value = +i.value - 1; subProposals(); } });
    document.getElementById('durUp').addEventListener('click', function () { var i = document.getElementById('durVal'); i.value = +i.value + 1; subProposals(); });

    document.querySelectorAll('.qk').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.qk').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active'); document.getElementById('stakeVal').value = b.dataset.v; subProposals();
        });
    });

    document.getElementById('stakeVal').addEventListener('change', subProposals);
    document.getElementById('durType').addEventListener('change', subProposals);
    document.getElementById('durVal').addEventListener('change', subProposals);

    document.getElementById('riseBtn').addEventListener('click', function () { buy('CALL'); });
    document.getElementById('fallBtn').addEventListener('click', function () { buy('PUT'); });

    document.querySelectorAll('.sp-tab').forEach(function (t) { t.addEventListener('click', function () { document.querySelectorAll('.sp-tab').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); }); });
    document.querySelectorAll('.tr-tab').forEach(function (t) { t.addEventListener('click', function () { document.querySelectorAll('.tr-tab').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); }); });

    document.getElementById('mktSearch').addEventListener('input', function (e) {
        var q = e.target.value.toLowerCase();
        document.querySelectorAll('.sp-item').forEach(function (x) { x.style.display = x.querySelector('.sp-name').textContent.toLowerCase().indexOf(q) >= 0 ? 'flex' : 'none'; });
    });

    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('deriv_token');
        localStorage.removeItem('deriv_accounts');
        location.reload();
    });
}