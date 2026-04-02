// ========================================
// WebSocket Connection Module
// ========================================
var APP_ID = 110143; // ★ YOUR APP ID
var WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=' + APP_ID;

var ws = null;
var wsReqId = 0;
var wsPending = {};
var wsTickCBs = {};
var wsEvCBs = {};
var wsConnected = false;

function wsConnect() {
    return new Promise(function (resolve, reject) {
        dbg('Connecting: ' + WS_URL);
        wsStatus('wait');

        try { ws = new WebSocket(WS_URL); }
        catch (e) { dbg('WS create fail: ' + e.message, 'error'); wsStatus('err'); reject(e); return; }

        ws.onopen = function () {
            dbg('WS OPEN', 'success');
            wsConnected = true;
            wsStatus('ok');
            resolve();
        };

        ws.onerror = function () {
            dbg('WS error event', 'error');
            wsStatus('err');
        };

        ws.onclose = function (e) {
            wsConnected = false;
            dbg('WS closed (code: ' + e.code + ')', 'error');
            wsStatus('off');
            setTimeout(function () { wsConnect().catch(function () { }); }, 3000);
        };

        ws.onmessage = function (e) {
            try { wsHandle(JSON.parse(e.data)); }
            catch (x) { dbg('Parse error', 'error'); }
        };
    });
}

function wsStatus(s) {
    var dot = document.getElementById('wsDot');
    var txt = document.getElementById('wsText');
    if (!dot || !txt) return;
    dot.className = 'ws-dot';
    if (s === 'wait') { dot.classList.add('wait'); txt.textContent = 'Connecting...'; }
    else if (s === 'ok') { dot.classList.add('ok'); txt.textContent = 'Connected (App: ' + APP_ID + ')'; }
    else if (s === 'err') { txt.textContent = 'Error'; }
    else { txt.textContent = 'Reconnecting...'; }
}

function wsSend(data) {
    return new Promise(function (resolve, reject) {
        if (!ws || ws.readyState !== 1) { reject(new Error('WS not open')); return; }
        wsReqId++;
        data.req_id = wsReqId;
        wsPending[wsReqId] = { resolve: resolve, reject: reject };
        ws.send(JSON.stringify(data));
        var rid = wsReqId;
        setTimeout(function () {
            if (wsPending[rid]) { delete wsPending[rid]; reject(new Error('Timeout')); }
        }, 15000);
    });
}

function wsRaw(data) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
}

function wsOn(name, cb) {
    if (!wsEvCBs[name]) wsEvCBs[name] = [];
    wsEvCBs[name].push(cb);
}

function wsFire(name, data) {
    if (wsEvCBs[name]) wsEvCBs[name].forEach(function (cb) { cb(data); });
}

function wsHandle(data) {
    var mt = data.msg_type || '?';
    if (data.error) dbg('← ' + mt + ' ERR: ' + data.error.message, 'error');
    else dbg('← ' + mt + ' OK', 'success');

    if (data.req_id && wsPending[data.req_id]) {
        var p = wsPending[data.req_id];
        delete wsPending[data.req_id];
        data.error ? p.reject(data.error) : p.resolve(data);
    }

    if (data.tick) {
        var sym = data.tick.symbol;
        if (wsTickCBs[sym]) wsTickCBs[sym].forEach(function (cb) { cb(data.tick); });
    }

    if (data.ohlc) wsFire('ohlc', data.ohlc);
    if (data.proposal) wsFire('proposal', data.proposal);
    if (data.balance) wsFire('balance', data.balance);
    if (data.proposal_open_contract) wsFire('poc', data.proposal_open_contract);
    if (data.profit_table) wsFire('profit_table', data.profit_table);
    if (data.statement) wsFire('statement', data.statement);
    if (data.transaction) wsFire('transaction', data.transaction);
}

function wsSubTick(symbol, cb) {
    if (!wsTickCBs[symbol]) wsTickCBs[symbol] = [];
    wsTickCBs[symbol].push(cb);
    wsRaw({ ticks: symbol, subscribe: 1 });
}

function wsForgetAll(type) {
    wsRaw({ forget_all: type });
}