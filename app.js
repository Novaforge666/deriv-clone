// ===================================================================
// ★★★ CHANGE THIS TO YOUR APP ID FROM api.deriv.com/dashboard ★★★
// ===================================================================
var APP_ID = 110143;  // ← YOUR APP ID HERE

var WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=' + APP_ID;
var ORIGIN = window.location.origin;
var REDIRECT = window.location.origin + window.location.pathname;

// State
var ws = null;
var reqId = 0;
var pending = {};
var tickCBs = {};
var eventCBs = {};
var wsReady = false;
var currentAccount = null;
var chart = null;
var candleSeries = null;
var currentSymbol = 'R_100';
var currentGranularity = 300;
var activeContracts = [];

// ===================================================================
// DOM READY
// ===================================================================
document.addEventListener('DOMContentLoaded', function () {
    // Show debug info
    var showAppId = document.getElementById('showAppId');
    var showOrigin = document.getElementById('showOrigin');
    if (showAppId) showAppId.textContent = APP_ID;
    if (showOrigin) showOrigin.textContent = REDIRECT;

    init();
});

// ===================================================================
// HELPERS
// ===================================================================
function debugLog(msg, type) {
    type = type || 'info';
    var panel = document.getElementById('debugPanel');
    if (panel) {
        var line = document.createElement('div');
        line.className = 'log-line log-' + type;
        line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        panel.prepend(line);
        while (panel.children.length > 100) panel.removeChild(panel.lastChild);
    }
    console.log('[' + type.toUpperCase() + ']', msg);
}

function toast(type, msg) {
    var wrap = document.getElementById('toastWrap');
    if (!wrap) return;
    var icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<i class="toast-icon fas ' + icons[type] + '"></i><span class="toast-msg">' + msg + '</span><button class="toast-x" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>';
    t.querySelector('.toast-x').addEventListener('click', function () { t.remove(); });
    wrap.appendChild(t);
    setTimeout(function () { if (t.parentElement) t.remove(); }, 6000);
}

function showError(msg) {
    var el = document.getElementById('errorMsg');
    if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideError() {
    var el = document.getElementById('errorMsg');
    if (el) el.classList.remove('show');
}
function showSuccess(msg) {
    var el = document.getElementById('successMsg');
    if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideSuccess() {
    var el = document.getElementById('successMsg');
    if (el) el.classList.remove('show');
}

// ===================================================================
// WEBSOCKET
// ===================================================================
function wsConnect() {
    return new Promise(function (resolve, reject) {
        debugLog('Connecting: ' + WS_URL);
        updateWSStatus('connecting');

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            debugLog('WebSocket create error: ' + e.message, 'error');
            updateWSStatus('error');
            reject(e);
            return;
        }

        ws.onopen = function () {
            debugLog('WebSocket OPEN!', 'success');
            wsReady = true;
            updateWSStatus('connected');
            resolve();
        };

        ws.onerror = function () {
            debugLog('WebSocket error event', 'error');
            updateWSStatus('error');
        };

        ws.onclose = function (ev) {
            wsReady = false;
            debugLog('WebSocket closed (code: ' + ev.code + ')', 'error');
            updateWSStatus('disconnected');
            setTimeout(function () {
                debugLog('Reconnecting...');
                wsConnect().catch(function () { });
            }, 3000);
        };

        ws.onmessage = function (ev) {
            try {
                handleWSMessage(JSON.parse(ev.data));
            } catch (e) {
                debugLog('Parse error: ' + e.message, 'error');
            }
        };
    });
}

function updateWSStatus(status) {
    var dot = document.getElementById('wsDot');
    var text = document.getElementById('wsText');
    if (!dot || !text) return;

    dot.className = 'ws-dot';
    if (status === 'connecting') { dot.classList.add('connecting'); text.textContent = 'Connecting to Deriv...'; }
    else if (status === 'connected') { dot.classList.add('connected'); text.textContent = 'Connected (App ID: ' + APP_ID + ')'; }
    else if (status === 'error') { text.textContent = 'Connection error'; }
    else if (status === 'disconnected') { text.textContent = 'Disconnected - reconnecting...'; }
}

function wsSend(data) {
    return new Promise(function (resolve, reject) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket not open'));
            return;
        }
        reqId++;
        data.req_id = reqId;
        debugLog('→ [' + reqId + '] ' + (data.authorize ? 'authorize' : data.proposal ? 'proposal' : data.buy ? 'buy' : data.ticks_history ? 'ticks_history' : JSON.stringify(data).substring(0, 80)));
        pending[reqId] = { resolve: resolve, reject: reject };
        ws.send(JSON.stringify(data));

        var rid = reqId;
        setTimeout(function () {
            if (pending[rid]) {
                delete pending[rid];
                reject(new Error('Request #' + rid + ' timed out'));
            }
        }, 15000);
    });
}

function wsRaw(data) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

function onEvent(name, cb) {
    if (!eventCBs[name]) eventCBs[name] = [];
    eventCBs[name].push(cb);
}

function emitEvent(name, data) {
    if (eventCBs[name]) eventCBs[name].forEach(function (cb) { cb(data); });
}

function handleWSMessage(data) {
    var mt = data.msg_type || '?';

    if (data.error) {
        debugLog('← [' + (data.req_id || '-') + '] ' + mt + ' ERROR: ' + data.error.code + ' - ' + data.error.message, 'error');
    } else {
        debugLog('← [' + (data.req_id || '-') + '] ' + mt + ' OK', 'success');
    }

    // Resolve pending
    if (data.req_id && pending[data.req_id]) {
        var p = pending[data.req_id];
        delete pending[data.req_id];
        if (data.error) p.reject(data.error);
        else p.resolve(data);
    }

    // Events
    if (data.tick) {
        var sym = data.tick.symbol;
        if (tickCBs[sym]) tickCBs[sym].forEach(function (cb) { cb(data.tick); });
    }
    if (data.ohlc) emitEvent('ohlc', data.ohlc);
    if (data.proposal) emitEvent('proposal', data.proposal);
    if (data.balance) emitEvent('balance', data.balance);
    if (data.proposal_open_contract) emitEvent('open_contract', data.proposal_open_contract);
}

function subscribeTick(symbol, cb) {
    if (!tickCBs[symbol]) tickCBs[symbol] = [];
    tickCBs[symbol].push(cb);
    wsRaw({ ticks: symbol, subscribe: 1 });
}

// ===================================================================
// AUTH
// ===================================================================
function authorize(token) {
    debugLog('Authorizing: ' + token.substring(0, 10) + '...');
    return wsSend({ authorize: token }).then(function (res) {
        currentAccount = res.authorize;
        debugLog('AUTH OK: ' + currentAccount.loginid + ' | ' + currentAccount.balance + ' ' + currentAccount.currency + ' | virtual=' + currentAccount.is_virtual, 'success');
        return currentAccount;
    });
}

function handleOAuth() {
    var hash = window.location.search;
    var params = new URLSearchParams(hash);
    var accounts = [];
    var i = 1;
    while (params.has('acct' + i)) {
        accounts.push({
            account: params.get('acct' + i),
            token: params.get('token' + i),
            currency: params.get('cur' + i)
        });
        i++;
    }

    if (accounts.length > 0) {
        debugLog('OAuth callback detected! ' + accounts.length + ' account(s)', 'success');
        accounts.forEach(function (a) {
            debugLog('  Account: ' + a.account + ' (' + a.currency + ')');
        });
        localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
        localStorage.setItem('deriv_token', accounts[0].token);
        window.history.replaceState({}, '', window.location.pathname);
        return accounts[0].token;
    }

    return null;
}

// ===================================================================
// CHART
// ===================================================================
function initChart() {
    var box = document.getElementById('chartBox');
    if (!box) return;
    box.innerHTML = '';

    chart = LightweightCharts.createChart(box, {
        width: box.clientWidth, height: box.clientHeight,
        layout: { background: { type: 'solid', color: '#0e0e0e' }, textColor: '#6e7575', fontFamily: 'IBM Plex Sans' },
        grid: { vertLines: { color: '#1a1c1c' }, horzLines: { color: '#1a1c1c' } },
        crosshair: {
            vertLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' },
            horzLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' }
        },
        timeScale: { timeVisible: true, borderColor: '#2a2d2d' },
        rightPriceScale: { borderColor: '#2a2d2d' }
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#0dc49a', downColor: '#ff444f',
        borderUpColor: '#0dc49a', borderDownColor: '#ff444f',
        wickUpColor: '#0dc49a', wickDownColor: '#ff444f'
    });

    new ResizeObserver(function (entries) {
        entries.forEach(function (e) {
            chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
        });
    }).observe(box);

    debugLog('Chart initialized');
}

function loadChart(symbol, gran) {
    currentSymbol = symbol;
    currentGranularity = gran;

    wsSend({
        ticks_history: symbol, adjust_start_time: 1, count: 500,
        end: 'latest', granularity: gran, style: 'candles'
    }).then(function (res) {
        if (res.candles) {
            var data = res.candles.map(function (c) {
                return { time: c.epoch, open: +c.open, high: +c.high, low: +c.low, close: +c.close };
            });
            candleSeries.setData(data);
            chart.timeScale().fitContent();
            debugLog('Chart: ' + data.length + ' candles loaded', 'success');
        }
        wsRaw({
            ticks_history: symbol, adjust_start_time: 1, count: 1,
            end: 'latest', granularity: gran, style: 'candles', subscribe: 1
        });
    }).catch(function (err) {
        debugLog('Chart error: ' + (err.message || JSON.stringify(err)), 'error');
    });
}

onEvent('ohlc', function (ohlc) {
    if (ohlc.symbol === currentSymbol && candleSeries) {
        candleSeries.update({
            time: +ohlc.open_time, open: +ohlc.open,
            high: +ohlc.high, low: +ohlc.low, close: +ohlc.close
        });
    }
});

// ===================================================================
// TRADING
// ===================================================================
function subscribeProposals() {
    wsRaw({ forget_all: 'proposal' });
    var amount = +document.getElementById('stakeVal').value;
    var duration = +document.getElementById('durVal').value;
    var durType = document.getElementById('durType').value;

    wsRaw({ proposal: 1, amount: amount, basis: 'stake', contract_type: 'CALL', currency: 'USD', duration: duration, duration_unit: durType, symbol: currentSymbol, subscribe: 1 });
    wsRaw({ proposal: 1, amount: amount, basis: 'stake', contract_type: 'PUT', currency: 'USD', duration: duration, duration_unit: durType, symbol: currentSymbol, subscribe: 1 });
}

onEvent('proposal', function (p) {
    var payout = (+p.payout).toFixed(2);
    var profit = (+p.payout - +p.ask_price).toFixed(2);
    if (p.contract_type === 'CALL') document.getElementById('risePay').textContent = '$' + payout;
    else document.getElementById('fallPay').textContent = '$' + payout;
    document.getElementById('payoutVal').textContent = '$' + payout;
    document.getElementById('profitVal').textContent = '+$' + profit;
});

function buyContract(type) {
    var btn = type === 'CALL' ? document.getElementById('riseBtn') : document.getElementById('fallBtn');
    var origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:20px;color:#fff;"></i>';

    var amount = +document.getElementById('stakeVal').value;
    var duration = +document.getElementById('durVal').value;
    var durType = document.getElementById('durType').value;

    wsSend({
        proposal: 1, amount: amount, basis: 'stake', contract_type: type,
        currency: 'USD', duration: duration, duration_unit: durType, symbol: currentSymbol
    }).then(function (pRes) {
        return wsSend({ buy: pRes.proposal.id, price: pRes.proposal.ask_price });
    }).then(function (bRes) {
        toast('success', 'Trade opened! #' + bRes.buy.contract_id);
        activeContracts.push(bRes.buy);
        updateContractCount();
        wsRaw({ proposal_open_contract: 1, contract_id: bRes.buy.contract_id, subscribe: 1 });
    }).catch(function (err) {
        toast('error', 'Trade failed: ' + (err.message || err.code || 'Unknown'));
    }).finally(function () {
        btn.disabled = false;
        btn.innerHTML = origHTML;
    });
}

onEvent('open_contract', function (c) {
    var pnl = (+c.profit || 0).toFixed(2);
    var isWin = +pnl >= 0;
    var list = document.getElementById('contractsList');

    if (c.is_sold) {
        var el = document.getElementById('cc-' + c.contract_id);
        if (el) el.remove();
        activeContracts = activeContracts.filter(function (x) { return x.contract_id !== c.contract_id; });
        updateContractCount();
        toast(isWin ? 'success' : 'error', '#' + c.contract_id + ': ' + (isWin ? 'Won' : 'Lost') + ' $' + Math.abs(+pnl).toFixed(2));
        return;
    }

    var html = '<div class="contract-card ' + (isWin ? '' : 'loss') + '" id="cc-' + c.contract_id + '">' +
        '<div class="cc-top"><span class="cc-type">' + (c.contract_type === 'CALL' ? '↑ Rise' : '↓ Fall') + '</span>' +
        '<span class="cc-pnl ' + (isWin ? 'green' : 'red') + '">' + (isWin ? '+' : '') + '$' + pnl + '</span></div>' +
        '<div class="cc-bottom"><span>' + (c.display_name || currentSymbol) + '</span>' +
        '<span>Stake: $' + (+c.buy_price).toFixed(2) + '</span></div></div>';

    var existing = document.getElementById('cc-' + c.contract_id);
    if (existing) existing.outerHTML = html;
    else list.insertAdjacentHTML('afterbegin', html);
});

function updateContractCount() {
    document.getElementById('cCount').textContent = activeContracts.length;
    document.getElementById('statOpen').textContent = activeContracts.length;
}

// ===================================================================
// UI
// ===================================================================
function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.remove('visible');
}

function hideLogin() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('visible');
}

function navigateTo(page) {
    document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
    var navEl = document.querySelector('.nav-link[data-page="' + page + '"]');
    if (navEl) navEl.classList.add('active');

    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); p.style.display = 'none'; });
    var pageEl = document.getElementById(page + 'Page');
    if (pageEl) {
        pageEl.classList.add('active');
        pageEl.style.display = (page === 'trading') ? 'flex' : 'block';
    }

    if (page === 'trading') {
        setTimeout(function () {
            initChart();
            loadChart(currentSymbol, currentGranularity);
            if (currentAccount) subscribeProposals();
        }, 100);
    }
}

function updateBalanceUI(bal, cur) {
    var f = (+bal).toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('accBalance').textContent = f + ' ' + (cur || 'USD');
    document.getElementById('statBalance').textContent = '$' + f;
}

// ===================================================================
// ON AUTHORIZED
// ===================================================================
function onAuthorized(acct) {
    hideLogin();
    hideError();
    updateBalanceUI(acct.balance, acct.currency);

    var typeEl = document.getElementById('accType');
    typeEl.textContent = acct.is_virtual ? 'Demo' : 'Real';
    typeEl.style.background = acct.is_virtual ? 'var(--green)' : 'var(--blue)';

    toast('success', 'Welcome, ' + (acct.fullname || acct.loginid) + '!');

    // Balance subscription
    wsRaw({ balance: 1, subscribe: 1 });
    onEvent('balance', function (b) { updateBalanceUI(b.balance, b.currency); });

    // Dashboard ticks
    ['R_100', 'R_50', 'R_75', 'R_10'].forEach(function (sym) {
        subscribeTick(sym, function (tick) {
            var q = (+tick.quote).toFixed(2);
            var dp = document.getElementById('dp_' + sym);
            var sp = document.getElementById('sp_' + sym);
            if (dp) dp.textContent = q;
            if (sp) sp.textContent = q;
            if (sym === currentSymbol) {
                var cp = document.getElementById('chartLivePrice');
                if (cp) cp.textContent = q;
            }
        });
    });

    setupAppEvents();
}

// ===================================================================
// INIT
// ===================================================================
function init() {
    debugLog('MyTrader v1.0');
    debugLog('Origin: ' + ORIGIN);
    debugLog('App ID: ' + APP_ID);

    // Debug toggle
    document.getElementById('showDebug').addEventListener('change', function (e) {
        document.getElementById('debugPanel').classList.toggle('show', e.target.checked);
    });

    // Setup login events immediately
    setupLoginEvents();

    // Connect WS
    wsConnect().then(function () {
        toast('info', 'Connected (App ID: ' + APP_ID + ')');

        // Check OAuth callback FIRST
        var oauthToken = handleOAuth();
        if (oauthToken) {
            debugLog('Using OAuth token...');
            return authorize(oauthToken).then(function (acct) {
                onAuthorized(acct);
            }).catch(function (err) {
                showError('OAuth login failed: ' + (err.message || err.code));
                showLogin();
            });
        }

        // Check saved token
        var savedToken = localStorage.getItem('deriv_token');
        if (savedToken) {
            debugLog('Using saved token...');
            return authorize(savedToken).then(function (acct) {
                onAuthorized(acct);
            }).catch(function (err) {
                debugLog('Saved token failed: ' + (err.message || err.code), 'error');
                localStorage.removeItem('deriv_token');
                showLogin();
            });
        }

        // No token - show login
        showLogin();

    }).catch(function (e) {
        showError('Cannot connect to Deriv servers. Please try again.');
    });
}

// ===================================================================
// LOGIN EVENTS
// ===================================================================
function setupLoginEvents() {
    // OAuth button
    document.getElementById('oauthBtn').addEventListener('click', function () {
        debugLog('Starting OAuth...');
        debugLog('Redirect URL: ' + REDIRECT);

        var oauthUrl = 'https://oauth.deriv.com/oauth2/authorize?app_id=' + APP_ID + '&l=EN&brand=deriv';
        debugLog('OAuth URL: ' + oauthUrl);

        toast('info', 'Redirecting to Deriv...');

        // Small delay so user sees the toast
        setTimeout(function () {
            window.location.href = oauthUrl;
        }, 500);
    });

    // Token login form
    document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        hideError();
        hideSuccess();

        var token = document.getElementById('loginToken').value.trim();
        if (!token) {
            showError('Please paste your API token.');
            return;
        }

        var btn = document.getElementById('loginBtn');
        var btnText = document.getElementById('loginBtnText');
        var btnIcon = document.getElementById('loginIcon');
        btn.disabled = true;
        btnText.textContent = 'Connecting...';
        btnIcon.className = 'fas fa-spinner fa-spin';

        authorize(token).then(function (acct) {
            showSuccess('Authenticated! Loading...');
            localStorage.setItem('deriv_token', token);
            setTimeout(function () { onAuthorized(acct); }, 300);
        }).catch(function (err) {
            var msg = err.message || err.code || JSON.stringify(err);
            showError('Login failed: ' + msg);
            toast('error', msg);
        }).finally(function () {
            btn.disabled = false;
            btnText.textContent = 'Log in with Token';
            btnIcon.className = 'fas fa-sign-in-alt';
        });
    });

    // Toggle password
    document.getElementById('togglePass').addEventListener('click', function () {
        var inp = document.getElementById('loginToken');
        var icon = document.querySelector('#togglePass i');
        inp.type = inp.type === 'password' ? 'text' : 'password';
        icon.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
}

// ===================================================================
// APP EVENTS (after login)
// ===================================================================
function setupAppEvents() {
    // Nav
    document.querySelectorAll('.nav-link').forEach(function (l) {
        l.addEventListener('click', function (e) { e.preventDefault(); navigateTo(l.dataset.page); });
    });

    // Go trade
    var goTrade = document.getElementById('goTrade');
    if (goTrade) goTrade.addEventListener('click', function (e) { e.preventDefault(); navigateTo('trading'); });

    // Dashboard markets
    document.querySelectorAll('.market-row').forEach(function (r) {
        r.addEventListener('click', function () {
            currentSymbol = r.dataset.symbol;
            document.getElementById('chartSymName').textContent = r.querySelector('.mkt-name').textContent;
            navigateTo('trading');
        });
    });

    // Sidebar
    document.getElementById('sidebarList').addEventListener('click', function (e) {
        var item = e.target.closest('.sidebar-item');
        if (!item) return;
        document.querySelectorAll('.sidebar-item').forEach(function (i) { i.classList.remove('active'); });
        item.classList.add('active');
        currentSymbol = item.dataset.symbol;
        document.getElementById('chartSymName').textContent = item.querySelector('.si-name').textContent;

        wsRaw({ forget_all: 'candles' });
        loadChart(currentSymbol, currentGranularity);
        wsRaw({ forget_all: 'proposal' });
        subscribeProposals();

        subscribeTick(currentSymbol, function (tick) {
            document.getElementById('chartLivePrice').textContent = (+tick.quote).toFixed(2);
        });
    });

    // Timeframe
    document.querySelectorAll('.tf-btn').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.tf-btn').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            currentGranularity = +b.dataset.g;
            wsRaw({ forget_all: 'candles' });
            loadChart(currentSymbol, currentGranularity);
        });
    });

    // Duration
    document.getElementById('durDown').addEventListener('click', function () {
        var inp = document.getElementById('durVal');
        if (+inp.value > 1) { inp.value = +inp.value - 1; subscribeProposals(); }
    });
    document.getElementById('durUp').addEventListener('click', function () {
        var inp = document.getElementById('durVal');
        inp.value = +inp.value + 1; subscribeProposals();
    });

    // Quick amounts
    document.querySelectorAll('.quick-amt').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.quick-amt').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            document.getElementById('stakeVal').value = b.dataset.v;
            subscribeProposals();
        });
    });

    document.getElementById('stakeVal').addEventListener('change', subscribeProposals);
    document.getElementById('durType').addEventListener('change', subscribeProposals);
    document.getElementById('durVal').addEventListener('change', subscribeProposals);

    // Trade
    document.getElementById('riseBtn').addEventListener('click', function () { buyContract('CALL'); });
    document.getElementById('fallBtn').addEventListener('click', function () { buyContract('PUT'); });

    // Tabs
    document.querySelectorAll('.sidebar-tab').forEach(function (t) {
        t.addEventListener('click', function () {
            document.querySelectorAll('.sidebar-tab').forEach(function (x) { x.classList.remove('active'); });
            t.classList.add('active');
        });
    });
    document.querySelectorAll('.tp-tab').forEach(function (t) {
        t.addEventListener('click', function () {
            document.querySelectorAll('.tp-tab').forEach(function (x) { x.classList.remove('active'); });
            t.classList.add('active');
        });
    });

    // Search
    document.getElementById('mktSearch').addEventListener('input', function (e) {
        var q = e.target.value.toLowerCase();
        document.querySelectorAll('.sidebar-item').forEach(function (item) {
            item.style.display = item.querySelector('.si-name').textContent.toLowerCase().indexOf(q) >= 0 ? 'flex' : 'none';
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', function () {
        localStorage.removeItem('deriv_token');
        localStorage.removeItem('deriv_accounts');
        window.location.reload();
    });
}