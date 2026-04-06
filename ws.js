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

    wsConnectPromise = new Promise(function (resolve, reject) {
        var settled = false;

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            wsConnectPromise = null;
            reject(e);
            return;
        }

        ws.onopen = function () {
            wsOK = true;
            settled = true;
            wsConnectPromise = null;
            resolve();
        };

        ws.onerror = function (e) {
            if (!settled) {
                settled = true;
                wsConnectPromise = null;
                reject(e);
            }
        };

        ws.onclose = function () {
            wsOK = false;
            wsConnectPromise = null;

            Object.keys(wsPending).forEach(function (id) {
                if (wsPending[id] && wsPending[id].reject) {
                    wsPending[id].reject(new Error('WebSocket closed'));
                }
            });

            wsPending = {};
        };

        ws.onmessage = function (e) {
            try {
                wsHandle(JSON.parse(e.data));
            } catch (err) {
                console.error('Bad WS message:', err, e.data);
            }
        };
    });

    return wsConnectPromise;
}

function wsSend(data) {
    return wsConnect().then(function () {
        return new Promise(function (resolve, reject) {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                reject(new Error('WS not open'));
                return;
            }

            wsReqId += 1;
            data.req_id = wsReqId;

            wsPending[wsReqId] = {
                resolve: resolve,
                reject: reject
            };

            ws.send(JSON.stringify(data));

            var currentId = wsReqId;
            setTimeout(function () {
                if (wsPending[currentId]) {
                    delete wsPending[currentId];
                    reject(new Error('Timeout'));
                }
            }, 15000);
        });
    });
}

function wsRaw(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

function wsOn(name, cb) {
    if (!wsEvCBs[name]) wsEvCBs[name] = [];
    wsEvCBs[name].push(cb);
}

function wsFire(name, data) {
    if (!wsEvCBs[name]) return;
    wsEvCBs[name].forEach(function (cb) {
        cb(data);
    });
}

function wsForgetAll(type) {
    wsRaw({ forget_all: type });
}

function wsHandle(data) {
    if (data.req_id && wsPending[data.req_id]) {
        var pending = wsPending[data.req_id];
        delete wsPending[data.req_id];

        if (data.error) pending.reject(data.error);
        else pending.resolve(data);
    }

    if (data.tick) {
        var sym = data.tick.symbol;
        if (wsTickCBs[sym]) {
            wsTickCBs[sym].forEach(function (cb) {
                cb(data.tick);
            });
        }
    }

    if (data.ohlc) wsFire('ohlc', data.ohlc);
    if (data.proposal) wsFire('proposal', data.proposal);
    if (data.balance) wsFire('balance', data.balance);
    if (data.proposal_open_contract) wsFire('poc', data.proposal_open_contract);
}

function wsSubTick(sym, cb) {
    if (!wsTickCBs[sym]) wsTickCBs[sym] = [];
    wsTickCBs[sym].push(cb);

    if (!wsTickSubs[sym]) {
        wsTickSubs[sym] = true;
        wsRaw({ ticks: sym, subscribe: 1 });
    }
}