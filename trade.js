var tradeContracts = [];

function tradeSubProposals() {
    wsForgetAll('proposal');
    var a = +document.getElementById('stakeVal').value, dur = +document.getElementById('durVal').value, dt = document.getElementById('durType').value;
    var cur = authAccount ? authAccount.currency : 'USD';
    wsRaw({ proposal: 1, amount: a, basis: 'stake', contract_type: 'CALL', currency: cur, duration: dur, duration_unit: dt, symbol: curSymbol, subscribe: 1 });
    wsRaw({ proposal: 1, amount: a, basis: 'stake', contract_type: 'PUT', currency: cur, duration: dur, duration_unit: dt, symbol: curSymbol, subscribe: 1 });
}

wsOn('proposal', function (p) {
    var po = (+p.payout).toFixed(2), pr = (+p.payout - +p.ask_price).toFixed(2);
    if (p.contract_type === 'CALL') document.getElementById('risePay').textContent = '$' + po;
    else document.getElementById('fallPay').textContent = '$' + po;
    document.getElementById('poVal').textContent = '$' + po;
    document.getElementById('prVal').textContent = '+$' + pr;
});

function tradeBuy(type) {
    var btn = type === 'CALL' ? document.getElementById('riseBtn') : document.getElementById('fallBtn');
    var orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:16px"></i>';
    var a = +document.getElementById('stakeVal').value, dur = +document.getElementById('durVal').value, dt = document.getElementById('durType').value;
    wsSend({ proposal: 1, amount: a, basis: 'stake', contract_type: type, currency: authAccount ? authAccount.currency : 'USD', duration: dur, duration_unit: dt, symbol: curSymbol })
        .then(function (r) { return wsSend({ buy: r.proposal.id, price: r.proposal.ask_price }); })
        .then(function (r) { toast('s', 'Trade #' + r.buy.contract_id + ' opened!'); tradeContracts.push(r.buy); tradeUpdCount(); wsRaw({ proposal_open_contract: 1, contract_id: r.buy.contract_id, subscribe: 1 }); })
        .catch(function (e) { toast('e', 'Failed: ' + (e.message || e.code || '?')); })
        .finally(function () { btn.disabled = false; btn.innerHTML = orig; });
}

wsOn('poc', function (c) {
    var pnl = (+c.profit || 0).toFixed(2), win = +pnl >= 0, list = document.getElementById('cList');
    if (c.is_sold) { var el = document.getElementById('cc-' + c.contract_id); if (el) el.remove(); tradeContracts = tradeContracts.filter(function (x) { return x.contract_id !== c.contract_id; }); tradeUpdCount(); toast(win ? 's' : 'e', '#' + c.contract_id + ': ' + (win ? 'Won' : 'Lost') + ' $' + Math.abs(+pnl).toFixed(2)); return; }
    var h = '<div class="cc ' + (win ? '' : 'loss') + '" id="cc-' + c.contract_id + '"><div class="cc-top"><span class="cc-type">' + (c.contract_type === 'CALL' ? '↑Rise' : '↓Fall') + '</span><span class="cc-pnl" style="color:' + (win ? 'var(--gn)' : 'var(--red)') + '">' + (win ? '+' : '') + '$' + pnl + '</span></div><div class="cc-bot"><span>' + (c.display_name || curSymbol) + '</span><span>$' + (+c.buy_price).toFixed(2) + '</span></div></div>';
    var ex = document.getElementById('cc-' + c.contract_id); if (ex) ex.outerHTML = h; else list.insertAdjacentHTML('afterbegin', h);
});

function tradeUpdCount() { var e = document.getElementById('cCount'); if (e) e.textContent = tradeContracts.length; var d = document.getElementById('dOpen'); if (d) d.textContent = tradeContracts.length; }

function tradeBindAll() {
    document.getElementById('riseBtn').addEventListener('click', function () { tradeBuy('CALL'); });
    document.getElementById('fallBtn').addEventListener('click', function () { tradeBuy('PUT'); });
    document.getElementById('durDn').addEventListener('click', function () { var i = document.getElementById('durVal'); if (+i.value > 1) { i.value = +i.value - 1; tradeSubProposals(); } });
    document.getElementById('durUp').addEventListener('click', function () { var i = document.getElementById('durVal'); i.value = +i.value + 1; tradeSubProposals(); });
    document.querySelectorAll('.qk').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('.qk').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); document.getElementById('stakeVal').value = b.dataset.v; tradeSubProposals(); }); });
    document.getElementById('stakeVal').addEventListener('change', tradeSubProposals);
    document.getElementById('durType').addEventListener('change', tradeSubProposals);
    document.getElementById('durVal').addEventListener('change', tradeSubProposals);
    document.querySelectorAll('.tpt').forEach(function (t) { t.addEventListener('click', function () { document.querySelectorAll('.tpt').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); }); });
    document.querySelectorAll('.tgb[data-g]').forEach(function (b) { b.addEventListener('click', function () { document.querySelectorAll('#tfGrp .tgb').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); curGranularity = +b.dataset.g; wsForgetAll('candles'); chartLoad(curSymbol, curGranularity); }); });
    document.getElementById('chCandle').addEventListener('click', function () { setChartBtn(this); chartSetType('candle'); });
    document.getElementById('chLine').addEventListener('click', function () { setChartBtn(this); chartSetType('line'); });
    document.getElementById('chArea').addEventListener('click', function () { setChartBtn(this); chartSetType('area'); });

    document.getElementById('tsBody').addEventListener('click', function (e) {
        var it = e.target.closest('.ts-item'); if (!it) return;
        document.querySelectorAll('.ts-item').forEach(function (x) { x.classList.remove('active'); });
        it.classList.add('active'); curSymbol = it.dataset.symbol;
        document.getElementById('chartName').textContent = mktName(curSymbol);
        wsForgetAll('candles'); chartLoad(curSymbol, curGranularity);
        wsForgetAll('proposal'); tradeSubProposals();
        wsSubTick(curSymbol, function (t) { document.getElementById('chartPrice').textContent = (+t.quote).toFixed(mktDP(curSymbol)); });
    });

    document.querySelectorAll('.tstab').forEach(function (t) { t.addEventListener('click', function () { document.querySelectorAll('.tstab').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); mktBuildSidebar(t.dataset.cat); }); });
    document.getElementById('mktSearch').addEventListener('input', function (e) { var q = e.target.value.toLowerCase(); document.querySelectorAll('.ts-item').forEach(function (x) { x.style.display = x.querySelector('.tsi-n').textContent.toLowerCase().indexOf(q) >= 0 ? 'flex' : 'none'; }); });
}

function setChartBtn(el) { document.querySelectorAll('#chCandle,#chLine,#chArea').forEach(function (x) { x.classList.remove('active'); }); el.classList.add('active'); }