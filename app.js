// ===================================================================
// CONFIGURATION - CHANGE THIS!
// ===================================================================
const APP_ID = 1089;  // ← PUT YOUR APP ID HERE
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`;

// Show current URL and App ID on login page
document.addEventListener('DOMContentLoaded', () => {
    const urlEl = document.getElementById('currentUrl');
    const appIdEl = document.getElementById('currentAppId');
    if (urlEl) urlEl.textContent = window.location.origin + window.location.pathname;
    if (appIdEl) appIdEl.textContent = APP_ID;
    init();
});

// ===================================================================
// DEBUG LOGGER
// ===================================================================
function debugLog(msg, type) {
    type = type || 'info';
    const panel = document.getElementById('debugPanel');
    if (panel) {
        const line = document.createElement('div');
        line.className = 'log-line log-' + type;
        line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        panel.prepend(line);
        // Keep max 50 lines
        while (panel.children.length > 50) {
            panel.removeChild(panel.lastChild);
        }
    }
    if (type === 'error') {
        console.error('[MyTrader]', msg);
    } else {
        console.log('[MyTrader]', msg);
    }
}

// ===================================================================
// TOAST NOTIFICATIONS
// ===================================================================
function toast(type, msg) {
    var wrap = document.getElementById('toastWrap');
    var icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML =
        '<i class="toast-icon fas ' + icons[type] + '"></i>' +
        '<span class="toast-msg">' + msg + '</span>' +
        '<button class="toast-x" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>';
    t.querySelector('.toast-x').addEventListener('click', function () { t.remove(); });
    wrap.appendChild(t);
    setTimeout(function () { if (t.parentElement) t.remove(); }, 6000);
}

function showError(msg) {
    var el = document.getElementById('errorMsg');
    el.textContent = msg;
    el.classList.add('show');
}

function hideError() {
    document.getElementById('errorMsg').classList.remove('show');
}

function showSuccess(msg) {
    var el = document.getElementById('successMsg');
    el.textContent = msg;
    el.classList.add('show');
}

function hideSuccess() {
    document.getElementById('successMsg').classList.remove('show');
}

// ===================================================================
// WEBSOCKET CONNECTION
// ===================================================================
var ws = null;
var reqId = 0;
var pending = {};
var tickCBs = {};
var eventCBs = {};
var wsReady = false;

function wsConnect() {
    return new Promise(function (resolve, reject) {
        debugLog('Connecting to: ' + WS_URL);
        updateWSStatus('connecting');

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            debugLog('Failed to create WebSocket: ' + e.message, 'error');
            updateWSStatus('error');
            reject(e);
            return;
        }

        ws.onopen = function () {
            debugLog('WebSocket OPEN', 'success');
            wsReady = true;
            updateWSStatus('connected');
            resolve();
        };

        ws.onerror = function (e) {
            debugLog('WebSocket ERROR event fired', 'error');
            updateWSStatus('error');
        };

        ws.onclose = function (event) {
            wsReady = false;
            debugLog('WebSocket CLOSED - code: ' + event.code + ', reason: ' + (event.reason || 'none'), 'error');
            updateWSStatus('disconnected');
            // Reconnect
            setTimeout(function () {
                debugLog('Auto-reconnecting...');
                wsConnect().catch(function () { });
            }, 3000);
        };

        ws.onmessage = function (event) {
            var data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                debugLog('Failed to parse message: ' + e.message, 'error');
                return;
            }
            handleWSMessage(data);
        };
    });
}

function updateWSStatus(status) {
    var dot = document.getElementById('wsDot');
    var text = document.getElementById('wsText');
    if (!dot || !text) return;

    dot.className = 'ws-dot';

    switch (status) {
        case 'connecting':
            dot.classList.add('connecting');
            text.textContent = 'Connecting to Deriv...';
            break;
        case 'connected':
            dot.classList.add('connected');
            text.textContent = 'Connected (App ID: ' + APP_ID + ')';
            break;
        case 'error':
            text.textContent = 'Connection error - check console';
            break;
        case 'disconnected':
            text.textContent = 'Disconnected - reconnecting...';
            break;
    }
}

function wsSend(data) {
    return new Promise(function (resolve, reject) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            var err = 'WebSocket not open (state: ' + (ws ? ws.readyState : 'null') + ')';
            debugLog(err, 'error');
            reject(new Error(err));
            return;
        }

        reqId++;
        data.req_id = reqId;

        var msgPreview = JSON.stringify(data);
        if (msgPreview.length > 120) msgPreview = msgPreview.substring(0, 120) + '...';
        debugLog('SEND [' + reqId + ']: ' + msgPreview);

        pending[reqId] = { resolve: resolve, reject: reject };
        ws.send(JSON.stringify(data));

        // Timeout
        var rid = reqId;
        setTimeout(function () {
            if (pending[rid]) {
                delete pending[rid];
                reject(new Error('Request #' + rid + ' timed out (15s)'));
            }
        }, 15000);
    });
}

function wsRaw(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function onEvent(name, cb) {
    if (!eventCBs[name]) eventCBs[name] = [];
    eventCBs[name].push(cb);
}

function emitEvent(name, data) {
    if (eventCBs[name]) {
        eventCBs[name].forEach(function (cb) { cb(data); });
    }
}

function handleWSMessage(data) {
    var msgType = data.msg_type || 'unknown';
    var hasError = !!data.error;

    // Log everything
    if (hasError) {
        debugLog('RECV [' + (data.req_id || '-') + '] ' + msgType + ' ERROR: ' + data.error.code + ' - ' + data.error.message, 'error');
    } else {
        debugLog('RECV [' + (data.req_id || '-') + '] ' + msgType + ' OK', 'success');
    }

    // Resolve pending
    if (data.req_id && pending[data.req_id]) {
        var p = pending[data.req_id];
        delete pending[data.req_id];
        if (data.error) {
            p.reject(data.error);
        } else {
            p.resolve(data);
        }
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
    debugLog('Subscribed to ticks: ' + symbol);
}

// ===================================================================
// AUTH
// ===================================================================
var currentAccount = null;

function authorize(token) {
    debugLog('Authorizing token: ' + token.substring(0, 10) + '...');
    return wsSend({ authorize: token }).then(function (res) {
        currentAccount = res.authorize;
        debugLog('AUTH SUCCESS: ' + currentAccount.loginid +
            ' | ' + currentAccount.balance + ' ' + currentAccount.currency +
            ' | Virtual: ' + currentAccount.is_virtual, 'success');
        return currentAccount;
    });
}

function handleOAuth() {
    var params = new URLSearchParams(window.location.search);
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
        debugLog('OAuth callback! Found ' + accounts.length + ' account(s)', 'success');
        debugLog('Accounts: ' + accounts.map(function (a) { return a.account; }).join(', '));
        localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        return accounts[0].token;
    }
    return null;
}

// ===================================================================
// CHART
// ===================================================================
var chart = null;
var candleSeries = null;
var currentSymbol = 'R_100';
var currentGranularity = 300;

function initChart() {
    var box = document.getElementById('chartBox');
    if (!box) return;
    box.innerHTML = '';

    chart = LightweightCharts.createChart(box, {
        width: box.clientWidth,
        height: box.clientHeight,
        layout: {
            background: { type: 'solid', color: '#0e0e0e' },
            textColor: '#6e7575',
            fontFamily: 'IBM Plex Sans',
        },
        grid: {
            vertLines: { color: '#1a1c1c' },
            horzLines: { color: '#1a1c1c' },
        },
        crosshair: {
            vertLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' },
            horzLine: { color: '#ff444f', width: 1, style: 2, labelBackgroundColor: '#ff444f' },
        },
        timeScale: { timeVisible: true, borderColor: '#2a2d2d' },
        rightPriceScale: { borderColor: '#2a2d2d' },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#0dc49a', downColor: '#ff444f',
        borderUpColor: '#0dc49a', borderDownColor: '#ff444f',
        wickUpColor: '#0dc49a', wickDownColor: '#ff444f',
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
    debugLog('Loading chart: ' + symbol + ' @ ' + gran + 's');

    wsSend({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 500,
        end: 'latest',
        granularity: gran,
        style: 'candles'
    }).then(function (res) {
        if (res.candles) {
            var data = res.candles.map(function (c) {
                return { time: c.epoch, open: +c.open, high: +c.high, low: +c.low, close: +c.close };
            });
            candleSeries.setData(data);
            chart.timeScale().fitContent();
            debugLog('Chart loaded: ' + data.length + ' candles', 'success');
        }

        wsRaw({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 1,
            end: 'latest',
            granularity: gran,
            style: 'candles',
            subscribe: 1
        });
    }).catch(function (err) {
        debugLog('Chart error: ' + (err.message || JSON.stringify(err)), 'error');
    });
}

onEvent('ohlc', function (ohlc) {
    if (ohlc.symbol === currentSymbol && candleSeries) {
        candleSeries.update({
            time: +ohlc.open_time,
            open: +ohlc.open, high: +ohlc.high,
            low: +ohlc.low, close: +ohlc.close,
        });
    }
});

// ===================================================================
// TRADING
// ===================================================================
var activeContracts = [];

function subscribeProposals() {
    wsRaw({ forget_all: 'proposal' });

    var amount = +document.getElementById('stakeVal').value;
    var duration = +document.getElementById('durVal').value;
    var durType = document.getElementById('durType').value;

    wsRaw({
        proposal: 1, amount: amount, basis: 'stake', contract_type: 'CALL',
        currency: 'USD', duration: duration, duration_unit: durType,
        symbol: currentSymbol, subscribe: 1
    });
    wsRaw({
        proposal: 1, amount: amount, basis: 'stake', contract_type: 'PUT',
        currency: 'USD', duration: duration, duration_unit: durType,
        symbol: currentSymbol, subscribe: 1
    });
}

onEvent('proposal', function (p) {
    var payout = (+p.payout).toFixed(2);
    var profit = (+p.payout - +p.ask_price).toFixed(2);

    if (p.contract_type === 'CALL') {
        document.getElementById('risePay').textContent = '$' + payout;
    } else {
        document.getElementById('fallPay').textContent = '$' + payout;
    }

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
        proposal: 1, amount: amount, basis: 'stake',
        contract_type: type, currency: 'USD',
        duration: duration, duration_unit: durType, symbol: currentSymbol
    }).then(function (pRes) {
        return wsSend({
            buy: pRes.proposal.id,
            price: pRes.proposal.ask_price
        });
    }).then(function (bRes) {
        toast('success', 'Trade opened! #' + bRes.buy.contract_id);
        activeContracts.push(bRes.buy);
        updateContractCount();

        wsRaw({
            proposal_open_contract: 1,
            contract_id: bRes.buy.contract_id,
            subscribe: 1
        });
    }).catch(function (err) {
        toast('error', 'Trade failed: ' + (err.message || err.code || 'Unknown'));
        debugLog('Buy error: ' + JSON.stringify(err), 'error');
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
        toast(isWin ? 'success' : 'error',
            'Contract #' + c.contract_id + ': ' + (isWin ? 'Won' : 'Lost') + ' $' + Math.abs(+pnl).toFixed(2));
        return;
    }

    var html =
        '<div class="contract-card ' + (isWin ? '' : 'loss') + '" id="cc-' + c.contract_id + '">' +
        '<div class="cc-top">' +
        '<span class="cc-type">' + (c.contract_type === 'CALL' ? '↑ Rise' : '↓ Fall') + '</span>' +
        '<span class="cc-pnl ' + (isWin ? 'green' : 'red') + '">' + (isWin ? '+' : '') + '$' + pnl + '</span>' +
        '</div>' +
        '<div class="cc-bottom">' +
        '<span>' + (c.display_name || currentSymbol) + '</span>' +
        '<span>Stake: $' + (+c.buy_price).toFixed(2) + '</span>' +
        '</div></div>';

    var existing = document.getElementById('cc-' + c.contract_id);
    if (existing) { existing.outerHTML = html; }
    else { list.insertAdjacentHTML('afterbegin', html); }
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
            subscribeProposals();
        }, 100);
    }
}

function updateBalanceUI(bal, cur) {
    var f = (+bal).toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('accBalance').textContent = f + ' ' + (cur || 'USD');
    document.getElementById('statBalance').textContent = '$' + f;
}

// ===================================================================
// STARTUP
// ===================================================================
function onAuthorized(acct) {
    hideLogin();
    hideError();
    updateBalanceUI(acct.balance, acct.currency);

    var typeEl = document.getElementById('accType');
    typeEl.textContent = acct.is_virtual ? 'Demo' : 'Real';
    typeEl.style.background = acct.is_virtual ? 'var(--green)' : 'var(--blue)';

    toast('success', 'Welcome, ' + (acct.fullname || acct.loginid) + '!');

    // Save token
    if (document.getElementById('rememberToken').checked) {
        var tokenVal = document.getElementById('loginToken').value || localStorage.getItem('deriv_token');
        if (tokenVal) localStorage.setItem('deriv_token', tokenVal);
    }

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
}

async function init() {
    debugLog('MyTrader v1.0 starting...');
    debugLog('Page URL: ' + window.location.href);
    debugLog('App ID: ' + APP_ID);

    // Debug toggle
    document.getElementById('showDebug').addEventListener('change', function (e) {
        document.getElementById('debugPanel').classList.toggle('show', e.target.checked);
    });

    // Connect
    try {
        await wsConnect();
        toast('info', 'Connected to Deriv (App ID: ' + APP_ID + ')');
    } catch (e) {
        showError('Cannot connect to Deriv. Check internet and try again.');
        return;
    }

    // OAuth check
    var oauthToken = handleOAuth();

    // Try token
    var token = oauthToken || localStorage.getItem('deriv_token');
    if (token) {
        debugLog('Using token: ' + token.substring(0, 10) + '...');
        try {
            var acct = await authorize(token);
            onAuthorized(acct);
            return; // Success - don't show login
        } catch (e) {
            var errMsg = e.message || e.code || JSON.stringify(e);
            debugLog('Token auth failed: ' + errMsg, 'error');
            showError('Saved token invalid: ' + errMsg);
            localStorage.removeItem('deriv_token');
        }
    }

    showLogin();
    setupEvents();
}

function setupEvents() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
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

        try {
            var acct = await authorize(token);
            showSuccess('Authenticated! Redirecting...');
            setTimeout(function () { onAuthorized(acct); }, 500);
        } catch (err) {
            var msg = err.message || err.code || JSON.stringify(err);
            showError('Login failed: ' + msg);
            toast('error', msg);
        }

        btn.disabled = false;
        btnText.textContent = 'Log in with Token';
        btnIcon.className = 'fas fa-sign-in-alt';
    });

    // OAuth
    document.getElementById('oauthBtn').addEventListener('click', function () {
        var redirect = window.location.origin + window.location.pathname;
        debugLog('OAuth redirect URL: ' + redirect);
        debugLog('Make sure this URL is registered in your Deriv app settings!');

        var oauthUrl = 'https://oauth.deriv.com/oauth2/authorize?app_id=' + APP_ID + '&l=EN&brand=deriv';
        debugLog('Navigating to: ' + oauthUrl);
        window.location.href = oauthUrl;
    });

    // Toggle pass
    document.getElementById('togglePass').addEventListener('click', function () {
        var inp = document.getElementById('loginToken');
        var icon = document.querySelector('#togglePass i');
        if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
        else { inp.type = 'text'; icon.className = 'fas fa-eye'; }
    });

    // Nav
    document.querySelectorAll('.nav-link').forEach(function (l) {
        l.addEventListener('click', function (e) { e.preventDefault(); navigateTo(l.dataset.page); });
    });

    document.getElementById('goTrade').addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo('trading');
    });

    // Dashboard markets
    document.querySelectorAll('.market-row').forEach(function (r) {
        r.addEventListener('click', function () {
            currentSymbol = r.dataset.symbol;
            document.getElementById('chartSymName').textContent = r.querySelector('.mkt-name').textContent;
            navigateTo('trading');
        });
    });

    // Sidebar items
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
        inp.value = +inp.value + 1;
        subscribeProposals();
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

    // Trade buttons
    document.getElementById('riseBtn').addEventListener('click', function () { buyContract('CALL'); });
    document.getElementById('fallBtn').addEventListener('click', function () { buyContract('PUT'); });

    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(function (t) {
        t.addEventListener('click', function () {
            document.querySelectorAll('.sidebar-tab').forEach(function (x) { x.classList.remove('active'); });
            t.classList.add('active');
        });
    });

    // Trade tabs
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
            var name = item.querySelector('.si-name').textContent.toLowerCase();
            item.style.display = name.indexOf(q) >= 0 ? 'flex' : 'none';
        });
    });
}