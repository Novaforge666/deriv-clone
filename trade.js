// ========================================
// Trading Module
// ========================================
var tradeContracts = [];
var tradeBasis = 'stake';

function tradeSubProposals() {
    wsForgetAll('proposal');

    var amount = +document.getElementById('stakeVal').value;
    var dur = +document.getElementById('durVal').value;
    var dType = document.getElementById('durType').value;

    wsRaw({
        proposal: 1, amount: amount, basis: tradeBasis,
        contract_type: 'CALL', currency: authAccount ? authAccount.currency : 'USD',
        duration: dur, duration_unit: dType, symbol: curSymbol, subscribe: 1
    });
    wsRaw({
        proposal: 1, amount: amount, basis: tradeBasis,
        contract_type: 'PUT', currency: authAccount ? authAccount.currency : 'USD',
        duration: dur, duration_unit: dType, symbol: curSymbol, subscribe: 1
    });
}

// Update proposal UI
wsOn('proposal', function (p) {
    var po = (+p.payout).toFixed(2);
    var pr = (+p.payout - +p.ask_price).toFixed(2);

    if (p.contract_type === 'CALL') {
        document.getElementById('risePay').textContent = '$' + po;
    } else {
        document.getElementById('fallPay').textContent = '$' + po;
    }
    document.getElementById('poVal').textContent = '$' + po;
    document.getElementById('prVal').textContent = '+$' + pr;
});

function tradeBuy(type) {
    var btn = type === 'CALL' ? document.getElementById('riseBtn') : document.getElementById('fallBtn');
    var origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:18px"></i>';

    var amount = +document.getElementById('stakeVal').value;
    var dur = +document.getElementById('durVal').value;
    var dType = document.getElementById('durType').value;

    wsSend({
        proposal: 1, amount: amount, basis: tradeBasis,
        contract_type: type, currency: authAccount ? authAccount.currency : 'USD',
        duration: dur, duration_unit: dType, symbol: curSymbol
    }).then(function (r) {
        return wsSend({ buy: r.proposal.id, price: r.proposal.ask_price });
    }).then(function (r) {
        toast('s', 'Trade #' + r.buy.contract_id + ' opened!');
        tradeContracts.push(r.buy);
        tradeUpdateCount();
        wsRaw({ proposal_open_contract: 1, contract_id: r.buy.contract_id, subscribe: 1 });
    }).catch(function (e) {
        toast('e', 'Failed: ' + (e.message || e.code || '?'));
    }).finally(function () {
        btn.disabled = false;
        btn.innerHTML = origHTML;
    });
}

// Contract updates
wsOn('poc', function (c) {
    var pnl = (+c.profit || 0).toFixed(2);
    var win = +pnl >= 0;
    var list = document.getElementById('cList');

    if (c.is_sold) {
        var el = document.getElementById('cc-' + c.contract_id);
        if (el) el.remove();
        tradeContracts = tradeContracts.filter(function (x) { return x.contract_id !== c.contract_id; });
        tradeUpdateCount();
        toast(win ? 's' : 'e', '#' + c.contract_id + ': ' + (win ? 'Won' : 'Lost') + ' $' + Math.abs(+pnl).toFixed(2));
        return;
    }

    var h = '<div class="cc-card ' + (win ? '' : 'loss') + '" id="cc-' + c.contract_id + '">' +
        '<div class="cc-top"><span class="cc-type">' + (c.contract_type === 'CALL' ? '↑ Rise' : '↓ Fall') + '</span>' +
        '<span class="cc-pnl" style="color:' + (win ? 'var(--gn)' : 'var(--red)') + '">' + (win ? '+' : '') + '$' + pnl + '</span></div>' +
        '<div class="cc-mid"><span>' + (c.display_name || curSymbol) + '</span></div>' +
        '<div class="cc-bot"><span>Stake: $' + (+c.buy_price).toFixed(2) + '</span>' +
        '<span>Payout: $' + (+c.payout || 0).toFixed(2) + '</span></div></div>';

    var existing = document.getElementById('cc-' + c.contract_id);
    if (existing) existing.outerHTML = h;
    else list.insertAdjacentHTML('afterbegin', h);
});

function tradeUpdateCount() {
    var el = document.getElementById('cCount');
    if (el) el.textContent = tradeContracts.length;
    var dOpen = document.getElementById('dOpen');
    if (dOpen) dOpen.textContent = tradeContracts.length;
}

function tradeBindEvents() {
    // Rise / Fall
    document.getElementById('riseBtn').addEventListener('click', function () { tradeBuy('CALL'); });
    document.getElementById('fallBtn').addEventListener('click', function () { tradeBuy('PUT'); });

    // Duration
    document.getElementById('durDn').addEventListener('click', function () {
        var i = document.getElementById('durVal');
        if (+i.value > 1) { i.value = +i.value - 1; tradeSubProposals(); }
    });
    document.getElementById('durUp').addEventListener('click', function () {
        var i = document.getElementById('durVal');
        i.value = +i.value + 1;
        tradeSubProposals();
    });

    // Quick amounts
    document.querySelectorAll('.qk').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.qk').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            document.getElementById('stakeVal').value = b.dataset.v;
            tradeSubProposals();
        });
    });

    // Basis toggle
    document.querySelectorAll('.basis-btn').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.basis-btn').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            tradeBasis = b.dataset.basis;
            tradeSubProposals();
        });
    });

    // Change events
    document.getElementById('stakeVal').addEventListener('change', tradeSubProposals);
    document.getElementById('durType').addEventListener('change', tradeSubProposals);
    document.getElementById('durVal').addEventListener('change', tradeSubProposals);

    // Trade type tabs
    document.querySelectorAll('.tp-tab').forEach(function (t) {
        t.addEventListener('click', function () {
            document.querySelectorAll('.tp-tab').forEach(function (x) { x.classList.remove('active'); });
            t.classList.add('active');
        });
    });

    // Timeframes
    document.querySelectorAll('.tcg-btn[data-g]').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('#tfGroup .tcg-btn').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            curGranularity = +b.dataset.g;
            wsForgetAll('candles');
            chartLoad(curSymbol, curGranularity);
        });
    });

    // Chart types
    document.getElementById('chartCandle').addEventListener('click', function () {
        document.querySelectorAll('#chartCandle,#chartLine,#chartArea').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
        chartSetType('candle');
    });
    document.getElementById('chartLine').addEventListener('click', function () {
        document.querySelectorAll('#chartCandle,#chartLine,#chartArea').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
        chartSetType('line');
    });
    document.getElementById('chartArea').addEventListener('click', function () {
        document.querySelectorAll('#chartCandle,#chartLine,#chartArea').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
        chartSetType('area');
    });

    // Sidebar market selection
    document.getElementById('tsList').addEventListener('click', function (e) {
        var item = e.target.closest('.ts-item');
        if (!item) return;
        document.querySelectorAll('.ts-item').forEach(function (x) { x.classList.remove('active'); });
        item.classList.add('active');
        curSymbol = item.dataset.symbol;
        document.getElementById('chartName').textContent = mktGetName(curSymbol);

        wsForgetAll('candles');
        chartLoad(curSymbol, curGranularity);
        wsForgetAll('proposal');
        tradeSubProposals();

        wsSubTick(curSymbol, function (tick) {
            var dp = mktGetDP(curSymbol);
            document.getElementById('chartPrice').textContent = (+tick.quote).toFixed(dp);
        });
    });

    // Sidebar categories
    document.querySelectorAll('.ts-cat').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.ts-cat').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            mktPopulateSidebar(b.dataset.cat);
        });
    });

    // Market search
    document.getElementById('mktSearch').addEventListener('input', function (e) {
        var q = e.target.value.toLowerCase();
        document.querySelectorAll('.ts-item').forEach(function (item) {
            var name = item.querySelector('.tsi-name').textContent.toLowerCase();
            item.style.display = name.indexOf(q) >= 0 ? 'flex' : 'none';
        });
    });

    // Dashboard market rows
    document.querySelectorAll('.mw-row').forEach(function (r) {
        r.addEventListener('click', function () {
            curSymbol = r.dataset.symbol;
            document.getElementById('chartName').textContent = mktGetName(curSymbol);
            uiGoPage('trading');
        });
    });
}