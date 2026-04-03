var APP_ID = 110143;
var WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=' + APP_ID;

var ws = null;
var wsReqId = 0;
var wsPending = {};
var wsTickCBs = {};
var wsTickSubs = {};
var wsEvCBs = {};
var wsOK = false;
var wsConnectPromise = null;

function wsConnect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return Promise.resolve();
    }

    if (wsConnectPromise) {
        return wsConnectPromise;
    }

    wsConnectPromise = new Promise(function (ok, no) {
        var settled = false;

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            wsConnectPromise = null;
            no(e);
            return;
        }

        ws.onopen = function () {
            wsOK = true;
            settled = true;
            wsConnectPromise = null;
            ok();
        };

        ws.onerror = function (e) {
            if (!settled) {
                settled = true;
                wsConnectPromise = null;
                no(e);
            }
        };

        ws.onclose = function () {
            wsOK = false;
            wsConnectPromise = null;

            for (var id in wsPending) {
                if (wsPending[id] && wsPending[id].no) {
                    wsPending[id].no(new Error('WebSocket closed'));
                }
            }
            wsPending = {};

            setTimeout(function () {
                if (!wsOK) {
                    wsConnect().catch(function () { });
                }
            }, 3000);
        };

        ws.onmessage = function (e) {
            try {
                wsHandle(JSON.parse(e.data));
            } catch (x) {
                console.error('Bad WS message:', x, e.data);
            }
        };
    });

    return wsConnectPromise;
}

function wsSend(d) {
    return wsConnect().then(function () {
        return new Promise(function (ok, no) {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                no(new Error('WS not open'));
                return;
            }

            wsReqId++;
            d.req_id = wsReqId;
            wsPending[wsReqId] = { ok: ok, no: no };

            ws.send(JSON.stringify(d));

            var r = wsReqId;
            setTimeout(function () {
                if (wsPending[r]) {
                    delete wsPending[r];
                    no(new Error('Timeout'));
                }
            }, 15000);
        });
    });
}

function wsRaw(d) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(d));
    }
}

function wsOn(name, cb) {
    if (!wsEvCBs[name]) wsEvCBs[name] = [];
    wsEvCBs[name].push(cb);
}

function wsFire(name, data) {
    if (wsEvCBs[name]) {
        wsEvCBs[name].forEach(function (cb) {
            cb(data);
        });
    }
}

function wsForgetAll(type) {
    wsRaw({ forget_all: type });
}

function wsHandle(d) {
    if (d.req_id && wsPending[d.req_id]) {
        var p = wsPending[d.req_id];
        delete wsPending[d.req_id];
        d.error ? p.no(d.error) : p.ok(d);
    }

    if (d.tick) {
        var s = d.tick.symbol;
        if (wsTickCBs[s]) {
            wsTickCBs[s].forEach(function (cb) {
                cb(d.tick);
            });
        }
    }

    if (d.ohlc) wsFire('ohlc', d.ohlc);
    if (d.proposal) wsFire('proposal', d.proposal);
    if (d.balance) wsFire('balance', d.balance);
    if (d.proposal_open_contract) wsFire('poc', d.proposal_open_contract);
}

function wsSubTick(sym, cb) {
    if (!wsTickCBs[sym]) wsTickCBs[sym] = [];
    wsTickCBs[sym].push(cb);

    if (!wsTickSubs[sym]) {
        wsTickSubs[sym] = true;
        wsRaw({ ticks: sym, subscribe: 1 });
    }
}