// js/websocket.js

class DerivWebSocket {
    constructor() {
        this.APP_ID = 1089; // Default demo app_id - REPLACE with yours
        this.WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${this.APP_ID}`;
        this.ws = null;
        this.reqId = 0;
        this.subscribers = new Map();
        this.pendingRequests = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.tickSubscriptions = new Map();
    }

    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.WS_URL);

                this.ws.onopen = () => {
                    console.log('✅ WebSocket Connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                };

                this.ws.onclose = (event) => {
                    console.log('❌ WebSocket Disconnected', event.code);
                    this.isConnected = false;
                    this.attemptReconnect();
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket Error:', error);
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    handleMessage(data) {
        // Handle subscription responses
        if (data.tick) {
            const symbol = data.tick.symbol;
            if (this.tickSubscriptions.has(symbol)) {
                this.tickSubscriptions.get(symbol).forEach(cb => cb(data.tick));
            }
        }

        if (data.ohlc) {
            const symbol = data.ohlc.symbol;
            const key = `ohlc_${symbol}`;
            if (this.subscribers.has(key)) {
                this.subscribers.get(key).forEach(cb => cb(data.ohlc));
            }
        }

        if (data.proposal) {
            if (this.subscribers.has('proposal')) {
                this.subscribers.get('proposal').forEach(cb => cb(data.proposal));
            }
        }

        if (data.proposal_open_contract) {
            if (this.subscribers.has('proposal_open_contract')) {
                this.subscribers.get('proposal_open_contract').forEach(cb => cb(data.proposal_open_contract));
            }
        }

        // Handle pending request responses
        if (data.req_id && this.pendingRequests.has(data.req_id)) {
            const { resolve, reject } = this.pendingRequests.get(data.req_id);
            this.pendingRequests.delete(data.req_id);

            if (data.error) {
                reject(data.error);
            } else {
                resolve(data);
            }
        }

        // Handle balance updates
        if (data.balance) {
            if (this.subscribers.has('balance')) {
                this.subscribers.get('balance').forEach(cb => cb(data.balance));
            }
        }

        // Handle transaction updates
        if (data.transaction) {
            if (this.subscribers.has('transaction')) {
                this.subscribers.get('transaction').forEach(cb => cb(data.transaction));
            }
        }
    }

    send(request) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            this.reqId++;
            request.req_id = this.reqId;

            this.pendingRequests.set(this.reqId, { resolve, reject });

            this.ws.send(JSON.stringify(request));

            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(request.req_id)) {
                    this.pendingRequests.delete(request.req_id);
                    reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    sendRaw(request) {
        if (this.isConnected) {
            this.ws.send(JSON.stringify(request));
        }
    }

    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    }

    subscribeTick(symbol, callback) {
        if (!this.tickSubscriptions.has(symbol)) {
            this.tickSubscriptions.set(symbol, []);
        }
        this.tickSubscriptions.get(symbol).push(callback);

        // Send tick subscription request
        this.sendRaw({
            ticks: symbol,
            subscribe: 1
        });
    }

    unsubscribeTicks(symbol) {
        this.tickSubscriptions.delete(symbol);
        this.sendRaw({
            forget_all: 'ticks'
        });
    }

    subscribeCandles(symbol, granularity = 60) {
        this.sendRaw({
            ticks_history: symbol,
            adjust_start_time: 1,
            count: 100,
            end: 'latest',
            granularity: granularity,
            style: 'candles',
            subscribe: 1
        });
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
            setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Create global instance
const derivWS = new DerivWebSocket();