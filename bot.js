var botReady = false;
var botBound = false;
var botTrackedContracts = {};

var botState = {
    running: false,
    strategy: 'momentum_3',
    cooldownMs: 20000,
    maxOpen: 1,
    lastActionAt: 0,
    lastTicks: [],
    trades: 0,
    wins: 0,
    losses: 0,
    lastSignal: '-'
};

function botInit() {
    botInjectNav();
    botInjectPage();
    botBind();
    botReady = true;
    botRefreshUI();
}

function botInjectNav() {
    var appNav = document.getElementById('appNav');
    if (appNav && !appNav.querySelector('[data-page="bot"]')) {
        var reports = appNav.querySelector('[data-page="reports"]');
        var link = document.createElement('a');
        link.className = 'anav';
        link.dataset.page = 'bot';
        link.innerHTML = '<i class="fas fa-robot"></i> Bot';
        if (reports) appNav.insertBefore(link, reports);
        else appNav.appendChild(link);
    }

    var mobPanel = document.querySelector('.mob-panel');
    if (mobPanel && !mobPanel.querySelector('.mnav[data-page="bot"]')) {
        var reportsMob = mobPanel.querySelector('.mnav[data-page="reports"]');
        var m = document.createElement('a');
        m.className = 'mnav';
        m.dataset.page = 'bot';
        m.innerHTML = '<i class="fas fa-robot"></i> Bot';
        if (reportsMob) mobPanel.insertBefore(m, reportsMob);
        else mobPanel.appendChild(m);
    }
}

function botInjectPage() {
    if (document.getElementById('pgBot')) return;

    var appBody = document.querySelector('.app-body');
    if (!appBody) return;

    var options = mktAll().map(function (m) {
        return '<option value="' + m.s + '">' + m.n + '</option>';
    }).join('');

    var html =
        '<div class="pg" id="pgBot">' +
        '   <div class="pg-head">' +
        '       <h1>Bot Trader</h1>' +
        '       <p>Demo-safe automation panel</p>' +
        '   </div>' +
        '   <div class="bot-grid">' +
        '       <div class="card">' +
        '           <div class="card-h"><h3><i class="fas fa-sliders-h"></i> Controls</h3></div>' +
        '           <div class="bot-form">' +
        '               <div class="bot-row">' +
        '                   <label>Symbol</label>' +
        '                   <select id="botSymbol">' + options + '</select>' +
        '               </div>' +
        '               <div class="bot-row bot-check">' +
        '                   <label><input type="checkbox" id="botFollowCurrent" checked> Follow current chart symbol</label>' +
        '               </div>' +
        '               <div class="bot-row">' +
        '                   <label>Strategy</label>' +
        '                   <select id="botStrategy">' +
        '                       <option value="momentum_3">Momentum (3 ticks)</option>' +
        '                       <option value="reversal_3">Reversal (3 ticks)</option>' +
        '                       <option value="momentum_4">Momentum (4 ticks)</option>' +
        '                   </select>' +
        '               </div>' +
        '               <div class="bot-split">' +
        '                   <div class="bot-row">' +
        '                       <label>Stake</label>' +
        '                       <input type="number" id="botStake" value="1" min="0.35" step="0.01">' +
        '                   </div>' +
        '                   <div class="bot-row">' +
        '                       <label>Duration</label>' +
        '                       <input type="number" id="botDur" value="5" min="1">' +
        '                   </div>' +
        '               </div>' +
        '               <div class="bot-split">' +
        '                   <div class="bot-row">' +
        '                       <label>Duration Unit</label>' +
        '                       <select id="botDurType">' +
        '                           <option value="t">Ticks</option>' +
        '                           <option value="s">Seconds</option>' +
        '                           <option value="m" selected>Minutes</option>' +
        '                       </select>' +
        '                   </div>' +
        '                   <div class="bot-row">' +
        '                       <label>Cooldown (sec)</label>' +
        '                       <input type="number" id="botCooldown" value="20" min="3">' +
        '                   </div>' +
        '               </div>' +
        '               <div class="bot-split">' +
        '                   <div class="bot-row">' +
        '                       <label>Max Open Trades</label>' +
        '                       <input type="number" id="botMaxOpen" value="1" min="1" max="10">' +
        '                   </div>' +
        '                   <div class="bot-row">' +
        '                       <label>Mode</label>' +
        '                       <div class="bot-badge" id="botModeBadge">Demo only</div>' +
        '                   </div>' +
        '               </div>' +
        '               <div class="bot-actions">' +
        '                   <button class="btn-hero-primary" id="botStartBtn" type="button"><i class="fas fa-play"></i> Start bot</button>' +
        '                   <button class="btn-hero-outline" id="botStopBtn" type="button"><i class="fas fa-stop"></i> Stop bot</button>' +
        '               </div>' +
        '           </div>' +
        '       </div>' +

        '       <div class="card">' +
        '           <div class="card-h"><h3><i class="fas fa-chart-area"></i> Stats</h3></div>' +
        '           <div class="bot-stat-grid">' +
        '               <div class="bot-stat"><span>Status</span><strong id="botStatus">Stopped</strong></div>' +
        '               <div class="bot-stat"><span>Signal</span><strong id="botLastSignal">-</strong></div>' +
        '               <div class="bot-stat"><span>Trades</span><strong id="botTrades">0</strong></div>' +
        '               <div class="bot-stat"><span>Wins</span><strong id="botWins">0</strong></div>' +
        '               <div class="bot-stat"><span>Losses</span><strong id="botLosses">0</strong></div>' +
        '               <div class="bot-stat"><span>Watching</span><strong id="botWatch">' + mktName(curSymbol) + '</strong></div>' +
        '           </div>' +
        '       </div>' +

        '       <div class="card bot-log-card">' +
        '           <div class="card-h"><h3><i class="fas fa-terminal"></i> Bot Log</h3></div>' +
        '           <div class="bot-log" id="botLog"></div>' +
        '       </div>' +
        '   </div>' +
        '</div>';

    appBody.insertAdjacentHTML('beforeend', html);
}

function botBind() {
    if (botBound) return;
    botBound = true;

    document.addEventListener('click', function (e) {
        if (e.target.closest('#botStartBtn')) botStart();
        if (e.target.closest('#botStopBtn')) botStop('Stopped manually');
    });

    document.addEventListener('change', function (e) {
        if (e.target.id === 'botFollowCurrent') botRefreshUI();
        if (e.target.id === 'botSymbol') botRefreshUI();
    });

    wsOn('poc', function (c) {
        if (!c || !c.contract_id || !c.is_sold || !botTrackedContracts[c.contract_id]) return;

        var pnl = +c.profit || 0;
        delete botTrackedContracts[c.contract_id];

        if (pnl >= 0) botState.wins++;
        else botState.losses++;

        botLog('Closed #' + c.contract_id + ' → ' + (pnl >= 0 ? 'WIN ' : 'LOSS ') + tradeSignedMoney(pnl), pnl >= 0 ? 'win' : 'loss');
        botRefreshUI();
    });
}

function botReadConfig() {
    var cooldownEl = document.getElementById('botCooldown');
    var maxOpenEl = document.getElementById('botMaxOpen');
    var strategyEl = document.getElementById('botStrategy');

    botState.strategy = strategyEl ? strategyEl.value : 'momentum_3';
    botState.cooldownMs = ((+cooldownEl.value || 20) * 1000);
    botState.maxOpen = Math.max(1, +maxOpenEl.value || 1);
}

function botTargetSymbol() {
    var follow = document.getElementById('botFollowCurrent');
    if (follow && follow.checked) return curSymbol;

    var sym = document.getElementById('botSymbol');
    return sym ? sym.value : curSymbol;
}

function botSyncTradePanel() {
    var stake = document.getElementById('botStake');
    var dur = document.getElementById('botDur');
    var durType = document.getElementById('botDurType');

    tradeSetMode('rise_fall');

    if (stake) document.getElementById('stakeVal').value = stake.value;
    if (dur) document.getElementById('durVal').value = dur.value;
    if (durType) document.getElementById('durType').value = durType.value;
}

function botStart() {
    if (!authAccount) {
        toast('e', 'Log in first.');
        return;
    }

    if (!authAccount.is_virtual) {
        toast('i', 'Bot is locked to demo accounts by default.');
        return;
    }

    botReadConfig();
    botState.running = true;
    botState.lastActionAt = 0;
    botState.lastTicks = [];
    botState.lastSignal = '-';

    botLog('Bot started on ' + mktName(botTargetSymbol()), 'info');
    botRefreshUI();
}

function botStop(msg) {
    if (!botState.running && !msg) return;
    botState.running = false;
    botState.lastTicks = [];
    if (msg) botLog(msg, 'info');
    botRefreshUI();
}

function botGetSignal() {
    var arr = botState.lastTicks;
    var s = botState.strategy;

    if (s === 'momentum_3' && arr.length >= 4) {
        var a = arr.slice(-4);
        if (a[0] < a[1] && a[1] < a[2] && a[2] < a[3]) return 'CALL';
        if (a[0] > a[1] && a[1] > a[2] && a[2] > a[3]) return 'PUT';
    }

    if (s === 'reversal_3' && arr.length >= 4) {
        var b = arr.slice(-4);
        if (b[0] < b[1] && b[1] < b[2] && b[2] < b[3]) return 'PUT';
        if (b[0] > b[1] && b[1] > b[2] && b[2] > b[3]) return 'CALL';
    }

    if (s === 'momentum_4' && arr.length >= 5) {
        var c = arr.slice(-5);
        if (c[0] < c[1] && c[1] < c[2] && c[2] < c[3] && c[3] < c[4]) return 'CALL';
        if (c[0] > c[1] && c[1] > c[2] && c[2] > c[3] && c[3] > c[4]) return 'PUT';
    }

    return null;
}

function botFire(type) {
    if (!botState.running) return;
    if (!authAccount || !authAccount.is_virtual) {
        botStop('Bot stopped: demo account required');
        return;
    }

    if (tradeContracts.length >= botState.maxOpen) return;
    if (Date.now() - botState.lastActionAt < botState.cooldownMs) return;

    var target = botTargetSymbol();
    botSyncTradePanel();

    if (curSymbol !== target) {
        mktSelectSymbol(target, { rebuildSidebar: true });
    }

    tradeSubProposals();

    botState.lastSignal = type === 'CALL' ? 'Rise' : 'Fall';
    botState.lastActionAt = Date.now();

    botLog('Signal ' + botState.lastSignal + ' on ' + mktName(target), 'info');

    tradeBuyByType(type)
        .then(function (buy) {
            botTrackedContracts[buy.contract_id] = true;
            botState.trades++;
            botLog('Opened #' + buy.contract_id + ' on ' + mktName(target), 'info');
            botRefreshUI();
        })
        .catch(function (err) {
            botLog('Bot trade failed: ' + (err.message || err.code || '?'), 'loss');
        });
}

window.botOnMarketTick = function (sym, tick) {
    if (!botState.running) return;
    if (sym !== botTargetSymbol()) return;

    botReadConfig();
    botState.lastTicks.push(+tick.quote);
    if (botState.lastTicks.length > 8) botState.lastTicks.shift();

    var signal = botGetSignal();
    if (!signal) {
        botRefreshUI();
        return;
    }

    botFire(signal);
    botRefreshUI();
};

function botLog(msg, kind) {
    var log = document.getElementById('botLog');
    if (!log) return;

    var el = document.createElement('div');
    el.className = 'bot-line ' + (kind || 'info');
    el.innerHTML =
        '<span class="bot-time">' + new Date().toLocaleTimeString() + '</span>' +
        '<span class="bot-msg">' + msg + '</span>';

    log.prepend(el);
}

function botRefreshUI() {
    var badge = document.getElementById('botModeBadge');
    if (badge) badge.textContent = authAccount && authAccount.is_virtual ? 'Demo only' : 'Real locked';

    var status = document.getElementById('botStatus');
    if (status) status.textContent = botState.running ? 'Running' : 'Stopped';

    var sig = document.getElementById('botLastSignal');
    if (sig) sig.textContent = botState.lastSignal;

    var t = document.getElementById('botTrades');
    if (t) t.textContent = botState.trades;

    var w = document.getElementById('botWins');
    if (w) w.textContent = botState.wins;

    var l = document.getElementById('botLosses');
    if (l) l.textContent = botState.losses;

    var watch = document.getElementById('botWatch');
    if (watch) watch.textContent = mktName(botTargetSymbol());

    var sym = document.getElementById('botSymbol');
    if (sym && botTargetSymbol()) sym.value = botTargetSymbol();
}