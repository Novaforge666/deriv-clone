var APP_ID = 110143;
var WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=' + APP_ID;
var ws, wsReqId = 0, wsPending = {}, wsTickCBs = {}, wsEvCBs = {}, wsOK = false;

function wsConnect() {
    return new Promise(function (ok, no) {
        var settled = false;

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            no(e);
            return;
        }

        ws.onopen = function () {
            wsOK = true;
            settled = true;
            ok();
        };

        ws.onerror = function (e) {
            if (!settled) {
                settled = true;
                no(e);
            }
        };

        ws.onclose = function () {
            wsOK = false;
            setTimeout(function () {
                wsConnect().catch(function () { });
            }, 3000);
        };

        ws.onmessage = function (e) {
            try {
                wsHandle(JSON.parse(e.data));
            } catch (x) {
                console.error('Bad WS message:', x);
            }
        };
    });
}

function wsRaw(d) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(d)); }
function wsOn(n, cb) { if (!wsEvCBs[n]) wsEvCBs[n] = []; wsEvCBs[n].push(cb); }
function wsFire(n, d) { if (wsEvCBs[n]) wsEvCBs[n].forEach(function (c) { c(d); }); }
function wsForgetAll(t) { wsRaw({ forget_all: t }); }

function wsHandle(d) {
    if (d.req_id && wsPending[d.req_id]) {
        var p = wsPending[d.req_id]; delete wsPending[d.req_id];
        d.error ? p.no(d.error) : p.ok(d);
    }
    if (d.tick) { var s = d.tick.symbol; if (wsTickCBs[s]) wsTickCBs[s].forEach(function (c) { c(d.tick); }); }
    if (d.ohlc) wsFire('ohlc', d.ohlc);
    if (d.proposal) wsFire('proposal', d.proposal);
    if (d.balance) wsFire('balance', d.balance);
    if (d.proposal_open_contract) wsFire('poc', d.proposal_open_contract);
}

function wsSubTick(sym, cb) {
    if (!wsTickCBs[sym]) wsTickCBs[sym] = [];
    wsTickCBs[sym].push(cb);
    wsRaw({ ticks: sym, subscribe: 1 });
}