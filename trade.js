var tradeContracts = [];
var tradeHistory = [];
var tradeProposalCache = { CALL: null, PUT: null };
var tradeBound = false;

function tradeCurrency() {
    return authAccount && authAccount.currency ? authAccount.currency : 'USD';
}

function tradeMoney(v) {
    var n = +v || 0;
    var cur = tradeCurrency();
    return (cur === 'USD' ? '$' : cur + ' ') + n.toFixed(2);
}

function tradeSignedMoney(v) {
    var n = +v || 0;
    var cur = tradeCurrency();
    var prefix = (cur === 'USD' ? '$' : cur + ' ');
    return (n >= 0 ? '+' : '-') + prefix + Math.abs(n).toFixed(2);
}

function tradeResetProposalUI() {
    var risePay = document.getElementById('risePay');
    var fallPay = document.getElementById('fallPay');
    var poVal = document.getElementById('poVal');
    var prVal = document.getElementById('prVal');

    if (risePay) risePay.textContent = '--';
    if (fallPay) fallPay.textContent = '--';
    if (poVal) poVal.textContent = '--';
    if (prVal) {
        prVal.textContent = '--';
        prVal.style.color = '';
    }
}

function tradeSubProposals() {
    if (!authAccount) return;

    var amount = +document.getElementById('stakeVal').value;
    var dur = +document.getElementById('durVal').value;
    var dt = document.getElementById('durType').value;
    var cur = tradeCurrency();

    if (!amount || amount <= 0 || !dur || dur <= 0) {
        tradeResetProposalUI();
        return;
    }

    tradeProposalCache = { CALL: null, PUT: null };
    tradeResetProposalUI();
    wsForgetAll('proposal');

    ['CALL', 'PUT'].forEach(function (type) {
        wsRaw({
            proposal: 1,
            amount: amount,
            basis: 'stake',
            contract_type: type,
            currency: cur,
            duration: dur,
            duration_unit: dt,
            symbol: curSymbol,
            subscribe: 1
        });
    });
}

wsOn('proposal', function (p) {
    if (!p || !p.contract_type) return;

    tradeProposalCache[p.contract_type] = p;

    var payout = +p.payout || 0;

    if (p.contract_type === 'CALL') {
        var risePay = document.getElementById('risePay');
        if (risePay) risePay.textContent = tradeMoney(payout);
    } else if (p.contract_type === 'PUT') {
        var fallPay = document.getElementById('fallPay');
        if (fallPay) fallPay.textContent = tradeMoney(payout);
    }

    var ref = tradeProposalCache.CALL || tradeProposalCache.PUT || p;
    var refPayout = +ref.payout || 0;
    var ask = +ref.ask_price || 0;
    var profit = refPayout - ask;

    var poVal = document.getElementById('poVal');
    if (poVal) poVal.textContent = tradeMoney(refPayout);

    var prVal = document.getElementById('prVal');
    if (prVal) {
        prVal.textContent = tradeSignedMoney(profit);
        prVal.style.color = profit >= 0 ? 'var(--gn)' : 'var(--red)';
    }
});

function tradeBuy(type) {
    if (!authAccount) {
        toast('e', 'Please log in first.');
        return;
    }

    var btn = type === 'CALL'
        ? document.getElementById('riseBtn')
        : document.getElementById('fallBtn');

    if (!btn) return;

    var amount = +document.getElementById('stakeVal').value;
    var dur = +document.getElementById('durVal').value;
    var dt = document.getElementById('durType').value;

    if (!amount || amount <= 0 || !dur || dur <= 0) {
        toast('e', 'Enter a valid stake and duration.');
        return;
    }

    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:16px"></i>';

    wsSend({
        proposal: 1,
        amount: amount,
        basis: 'stake',
        contract_type: type,
        currency: tradeCurrency(),
        duration: dur,
        duration_unit: dt,
        symbol: curSymbol
    })
        .then(function (r) {
            return wsSend({
                buy: r.proposal.id,
                price: r.proposal.ask_price
            });
        })
        .then(function (r) {
            var buy = r.buy;

            tradeUpsertOpen({
                contract_id: buy.contract_id,
                contract_type: type,
                display_name: mktName(curSymbol),
                buy_price: +buy.buy_price || amount,
                profit: 0
            });

            tradeRenderOpenContracts();
            tradeUpdateSummary();

            wsRaw({
                proposal_open_contract: 1,
                contract_id: buy.contract_id,
                subscribe: 1
            });

            toast('s', 'Trade #' + buy.contract_id + ' opened!');
        })
        .catch(function (e) {
            console.error('tradeBuy failed:', e);
            toast('e', 'Failed: ' + (e.message || e.code || '?'));
        })
        .finally(function () {
            btn.disabled = false;
            btn.innerHTML = orig;
        });
}

function tradeUpsertOpen(c) {
    var i = -1;

    for (var x = 0; x < tradeContracts.length; x++) {
        if (tradeContracts[x].contract_id === c.contract_id) {
            i = x;
            break;
        }
    }

    if (i >= 0) {
        tradeContracts[i] = Object.assign({}, tradeContracts[i], c);
    } else {
        tradeContracts.unshift(c);
    }
}

function tradeRemoveOpen(id) {
    tradeContracts = tradeContracts.filter(function (x) {
        return x.contract_id !== id;
    });
}

function tradeOpenCardHtml(c) {
    var pnl = +c.profit || 0;
    var win = pnl >= 0;

    return '' +
        '<div class="cc ' + (win ? '' : 'loss') + '">' +
        '   <div class="cc-top">' +
        '       <span class="cc-type">' + (c.contract_type === 'CALL' ? '↑ Rise' : '↓ Fall') + '</span>' +
        '       <span class="cc-pnl" style="color:' + (win ? 'var(--gn)' : 'var(--red)') + '">' + tradeSignedMoney(pnl) + '</span>' +
        '   </div>' +
        '   <div class="cc-bot">' +
        '       <span>' + (c.display_name || curSymbol) + '</span>' +
        '       <span>' + tradeMoney(c.buy_price || 0) + '</span>' +
        '   </div>' +
        '</div>';
}

function tradeHistoryCardHtml(c) {
    var pnl = +c.profit || 0;
    var win = pnl >= 0;
    var when = c.sold_at
        ? new Date(c.sold_at * 1000).toLocaleString()
        : '';

    return '' +
        '<div class="cc ' + (win ? '' : 'loss') + '">' +
        '   <div class="cc-top">' +
        '       <span class="cc-type">#' + c.contract_id + ' · ' + (c.contract_type === 'CALL' ? '↑ Rise' : '↓ Fall') + '</span>' +
        '       <span class="cc-pnl" style="color:' + (win ? 'var(--gn)' : 'var(--red)') + '">' + tradeSignedMoney(pnl) + '</span>' +
        '   </div>' +
        '   <div class="cc-bot">' +
        '       <span>' + (c.display_name || curSymbol) + '</span>' +
        '       <span>' + when + '</span>' +
        '   </div>' +
        '</div>';
}

function tradeRenderOpenContracts() {
    var list = document.getElementById('cList');
    var dash = document.getElementById('dashPos');

    if (list) {
        list.innerHTML = tradeContracts.length
            ? tradeContracts.map(tradeOpenCardHtml).join('')
            : '';
    }

    if (dash) {
        if (!tradeContracts.length) {
            dash.innerHTML = '<div class="empty"><i class="fas fa-inbox"></i><p>No open positions</p></div>';
        } else {
            dash.innerHTML = tradeContracts.map(tradeOpenCardHtml).join('');
        }
    }
}

function tradeRenderHistory() {
    var body = document.getElementById('rptBody');
    if (!body) return;

    if (!tradeHistory.length) {
        body.innerHTML =
            '<div class="empty">' +
            '   <i class="fas fa-chart-pie"></i>' +
            '   <p>No trade history yet</p>' +
            '   <span>Complete some trades to see your history</span>' +
            '</div>';
        return;
    }

    body.innerHTML =
        '<div class="rpt-table-wrap">' +
        '   <div class="rpt-table">' +
        '       <div class="rpt-row rpt-head">' +
        '           <div class="rpt-cell">Contract</div>' +
        '           <div class="rpt-cell">Market</div>' +
        '           <div class="rpt-cell">Buy</div>' +
        '           <div class="rpt-cell">Sell</div>' +
        '           <div class="rpt-cell">Profit/Loss</div>' +
        '           <div class="rpt-cell">Time</div>' +
        '       </div>' +
        tradeHistory.map(function (c) {
            var pnl = +c.profit || 0;
            var sold = +c.sell_price || 0;
            var when = c.sold_at ? new Date(c.sold_at * 1000).toLocaleString() : '-';

            return '' +
                '<div class="rpt-row">' +
                '   <div class="rpt-cell"><span class="rpt-type ' + (c.contract_type === 'CALL' ? 'up' : 'dn') + '">' + (c.contract_type === 'CALL' ? '↑ Rise' : '↓ Fall') + '</span></div>' +
                '   <div class="rpt-cell">' + (c.display_name || curSymbol) + '</div>' +
                '   <div class="rpt-cell">' + tradeMoney(c.buy_price || 0) + '</div>' +
                '   <div class="rpt-cell">' + tradeMoney(sold) + '</div>' +
                '   <div class="rpt-cell"><span class="' + (pnl >= 0 ? 'gn' : 'loss-red') + '">' + tradeSignedMoney(pnl) + '</span></div>' +
                '   <div class="rpt-cell rpt-time">' + when + '</div>' +
                '</div>';
        }).join('') +
        '   </div>' +
        '</div>';
}

function tradeUpdateSummary() {
    var cCount = document.getElementById('cCount');
    if (cCount) cCount.textContent = tradeContracts.length;

    var dOpen = document.getElementById('dOpen');
    if (dOpen) dOpen.textContent = tradeContracts.length;

    var dTrades = document.getElementById('dTrades');
    if (dTrades) dTrades.textContent = tradeHistory.length;

    var totalPnl = 0;
    tradeHistory.forEach(function (t) {
        totalPnl += (+t.profit || 0);
    });

    var dPnl = document.getElementById('dPnl');
    if (dPnl) {
        dPnl.textContent = tradeSignedMoney(totalPnl);
        dPnl.style.color = totalPnl >= 0 ? 'var(--gn)' : 'var(--red)';
    }
}

wsOn('poc', function (c) {
    if (!c || !c.contract_id) return;

    if (c.is_sold) {
        var pnl = +c.profit || 0;

        tradeRemoveOpen(c.contract_id);

        tradeHistory.unshift({
            contract_id: c.contract_id,
            contract_type: c.contract_type,
            display_name: c.display_name || mktName(curSymbol),
            buy_price: +c.buy_price || 0,
            sell_price: +c.sell_price || 0,
            profit: pnl,
            sold_at: +c.date_sold || +c.date_expiry || 0
        });

        tradeRenderOpenContracts();
        tradeRenderHistory();
        tradeUpdateSummary();

        toast(pnl >= 0 ? 's' : 'e', '#' + c.contract_id + ': ' + (pnl >= 0 ? 'Won ' : 'Lost ') + tradeMoney(Math.abs(pnl)));
        return;
    }

    tradeUpsertOpen({
        contract_id: c.contract_id,
        contract_type: c.contract_type,
        display_name: c.display_name || mktName(curSymbol),
        buy_price: +c.buy_price || 0,
        profit: +c.profit || 0
    });

    tradeRenderOpenContracts();
    tradeUpdateSummary();
});

function tradeBindAll() {
    if (tradeBound) return;
    tradeBound = true;

    var riseBtn = document.getElementById('riseBtn');
    if (riseBtn) {
        riseBtn.addEventListener('click', function () {
            tradeBuy('CALL');
        });
    }

    var fallBtn = document.getElementById('fallBtn');
    if (fallBtn) {
        fallBtn.addEventListener('click', function () {
            tradeBuy('PUT');
        });
    }

    var durDn = document.getElementById('durDn');
    if (durDn) {
        durDn.addEventListener('click', function () {
            var i = document.getElementById('durVal');
            if (+i.value > 1) {
                i.value = +i.value - 1;
                tradeSubProposals();
            }
        });
    }

    var durUp = document.getElementById('durUp');
    if (durUp) {
        durUp.addEventListener('click', function () {
            var i = document.getElementById('durVal');
            i.value = +i.value + 1;
            tradeSubProposals();
        });
    }

    document.querySelectorAll('.qk').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('.qk').forEach(function (x) {
                x.classList.remove('active');
            });
            b.classList.add('active');
            document.getElementById('stakeVal').value = b.dataset.v;
            tradeSubProposals();
        });
    });

    var stakeVal = document.getElementById('stakeVal');
    if (stakeVal) stakeVal.addEventListener('change', tradeSubProposals);

    var durType = document.getElementById('durType');
    if (durType) durType.addEventListener('change', tradeSubProposals);

    var durVal = document.getElementById('durVal');
    if (durVal) durVal.addEventListener('change', tradeSubProposals);

    document.querySelectorAll('.tpt').forEach(function (t) {
        t.addEventListener('click', function () {
            document.querySelectorAll('.tpt').forEach(function (x) {
                x.classList.remove('active');
            });
            t.classList.add('active');
        });
    });

    document.querySelectorAll('.tgb[data-g]').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('#tfGrp .tgb').forEach(function (x) {
                x.classList.remove('active');
            });
            b.classList.add('active');
            curGranularity = +b.dataset.g;
            chartLoad(curSymbol, curGranularity);
        });
    });

    var chCandle = document.getElementById('chCandle');
    if (chCandle) {
        chCandle.addEventListener('click', function () {
            setChartBtn(this);
            chartSetType('candle');
        });
    }

    var chLine = document.getElementById('chLine');
    if (chLine) {
        chLine.addEventListener('click', function () {
            setChartBtn(this);
            chartSetType('line');
        });
    }

    var chArea = document.getElementById('chArea');
    if (chArea) {
        chArea.addEventListener('click', function () {
            setChartBtn(this);
            chartSetType('area');
        });
    }

    var tsBody = document.getElementById('tsBody');
    if (tsBody) {
        tsBody.addEventListener('click', function (e) {
            var it = e.target.closest('.ts-item');
            if (!it) return;

            mktSelectSymbol(it.dataset.symbol, { rebuildSidebar: false });
        });
    }

    document.querySelectorAll('.tstab').forEach(function (t) {
        t.addEventListener('click', function () {
            mktSetActiveTab(t.dataset.cat);
            mktBuildSidebar(t.dataset.cat);
        });
    });

    var mktSearch = document.getElementById('mktSearch');
    if (mktSearch) {
        mktSearch.addEventListener('input', mktApplySearchFilter);
    }

    tradeRenderOpenContracts();
    tradeRenderHistory();
    tradeUpdateSummary();
}

function setChartBtn(el) {
    document.querySelectorAll('#chCandle,#chLine,#chArea').forEach(function (x) {
        x.classList.remove('active');
    });
    el.classList.add('active');
}