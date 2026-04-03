var tradeModes = {
    rise_fall: {
        key: 'rise_fall',
        label: 'Rise/Fall',
        aType: 'CALL',
        bType: 'PUT',
        aLabel: 'Rise',
        bLabel: 'Fall',
        needsBarrier: false
    },
    higher_lower: {
        key: 'higher_lower',
        label: 'Higher/Lower',
        aType: 'CALL',
        bType: 'PUT',
        aLabel: 'Higher',
        bLabel: 'Lower',
        needsBarrier: false
    },
    even_odd: {
        key: 'even_odd',
        label: 'Even/Odd',
        aType: 'DIGITEVEN',
        bType: 'DIGITODD',
        aLabel: 'Even',
        bLabel: 'Odd',
        needsBarrier: false,
        forceDurType: 't',
        defaultDur: 5
    },
    over_under: {
        key: 'over_under',
        label: 'Over/Under',
        aType: 'DIGITOVER',
        bType: 'DIGITUNDER',
        aLabel: 'Over',
        bLabel: 'Under',
        needsBarrier: true,
        forceDurType: 't',
        defaultDur: 5
    }
};

var tradeModeKey = 'rise_fall';
var tradeContracts = [];
var tradeHistory = [];
var tradeProposalCache = { A: null, B: null };
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
    var p = (cur === 'USD' ? '$' : cur + ' ');
    return (n >= 0 ? '+' : '-') + p + Math.abs(n).toFixed(2);
}

function tradeGetMode() {
    return tradeModes[tradeModeKey] || tradeModes.rise_fall;
}

function tradeEnsureModeUI() {
    var tabs = document.querySelector('.tp-tabs');
    if (tabs && !tabs.dataset.enhanced) {
        tabs.dataset.enhanced = '1';
        tabs.innerHTML = Object.keys(tradeModes).map(function (k) {
            var m = tradeModes[k];
            return '<button class="tpt' + (k === tradeModeKey ? ' active' : '') + '" type="button" data-mode="' + k + '">' + m.label + '</button>';
        }).join('');
    }

    var form = document.querySelector('.tp-form');
    if (form && !document.getElementById('barrierWrap')) {
        var sec = document.createElement('div');
        sec.className = 'tpf-sec hidden';
        sec.id = 'barrierWrap';
        sec.innerHTML =
            '<label class="tpf-lbl"><i class="fas fa-hashtag"></i> Barrier / Digit</label>' +
            '<div class="stake-row">' +
            '   <span class="stk-c">DIGIT</span>' +
            '   <input type="number" id="barrierVal" value="5" min="0" max="9" aria-label="Barrier digit">' +
            '</div>';

        var poCard = form.querySelector('.po-card');
        if (poCard) form.insertBefore(sec, poCard);
        else form.appendChild(sec);
    }
}

function tradeSetMode(key) {
    if (!tradeModes[key]) return;

    tradeModeKey = key;
    var mode = tradeGetMode();

    document.querySelectorAll('.tpt').forEach(function (x) {
        x.classList.toggle('active', x.dataset.mode === key);
    });

    var riseLbl = document.querySelector('#riseBtn strong');
    var fallLbl = document.querySelector('#fallBtn strong');

    if (riseLbl) riseLbl.textContent = mode.aLabel;
    if (fallLbl) fallLbl.textContent = mode.bLabel;

    var barrierWrap = document.getElementById('barrierWrap');
    if (barrierWrap) {
        barrierWrap.classList.toggle('hidden', !mode.needsBarrier);
    }

    if (mode.forceDurType) {
        var durType = document.getElementById('durType');
        var durVal = document.getElementById('durVal');
        if (durType) durType.value = mode.forceDurType;
        if (durVal && (!durVal.value || +durVal.value < 1)) durVal.value = mode.defaultDur || 5;
    }

    tradeSubProposals();
}

function tradeCurrentBarrier(type) {
    var el = document.getElementById('barrierVal');
    var val = el ? Math.max(0, Math.min(9, +el.value || 0)) : 5;

    if (type === 'DIGITOVER' && val >= 9) val = 8;
    if (type === 'DIGITUNDER' && val <= 0) val = 1;

    if (el) el.value = val;
    return String(val);
}

function tradeLabelForType(type, fallbackMode) {
    var mode = fallbackMode || tradeGetMode();

    if (mode.aType === type) return mode.aLabel;
    if (mode.bType === type) return mode.bLabel;

    var map = {
        CALL: 'Rise/Higher',
        PUT: 'Fall/Lower',
        DIGITEVEN: 'Even',
        DIGITODD: 'Odd',
        DIGITOVER: 'Over',
        DIGITUNDER: 'Under'
    };

    return map[type] || type;
}

function tradeBuildProposalReq(type) {
    var amount = +document.getElementById('stakeVal').value;
    var dur = +document.getElementById('durVal').value;
    var dt = document.getElementById('durType').value;

    var req = {
        proposal: 1,
        amount: amount,
        basis: 'stake',
        contract_type: type,
        currency: tradeCurrency(),
        duration: dur,
        duration_unit: dt,
        symbol: curSymbol
    };

    if (type === 'DIGITOVER' || type === 'DIGITUNDER') {
        req.barrier = tradeCurrentBarrier(type);
    }

    return req;
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
    if (!amount || amount <= 0 || !dur || dur <= 0) {
        tradeResetProposalUI();
        return;
    }

    var mode = tradeGetMode();
    tradeProposalCache = { A: null, B: null };
    tradeResetProposalUI();

    wsForgetAll('proposal');
    wsRaw(Object.assign({ subscribe: 1 }, tradeBuildProposalReq(mode.aType)));
    wsRaw(Object.assign({ subscribe: 1 }, tradeBuildProposalReq(mode.bType)));
}

wsOn('proposal', function (p) {
    if (!p || !p.contract_type) return;

    var mode = tradeGetMode();
    var side = p.contract_type === mode.aType ? 'A' : (p.contract_type === mode.bType ? 'B' : null);
    if (!side) return;

    tradeProposalCache[side] = p;

    var payout = +p.payout || 0;
    var ask = +p.ask_price || 0;
    var profit = payout - ask;

    if (side === 'A') {
        var risePay = document.getElementById('risePay');
        if (risePay) risePay.textContent = tradeMoney(payout);
    } else {
        var fallPay = document.getElementById('fallPay');
        if (fallPay) fallPay.textContent = tradeMoney(payout);
    }

    var ref = tradeProposalCache.A || tradeProposalCache.B || p;

    var poVal = document.getElementById('poVal');
    if (poVal) poVal.textContent = tradeMoney(+ref.payout || 0);

    var prVal = document.getElementById('prVal');
    if (prVal) {
        var refProfit = (+ref.payout || 0) - (+ref.ask_price || 0);
        prVal.textContent = tradeSignedMoney(refProfit);
        prVal.style.color = refProfit >= 0 ? 'var(--gn)' : 'var(--red)';
    }
});

function tradeBuy(side) {
    var mode = tradeGetMode();
    return tradeBuyByType(side === 'A' ? mode.aType : mode.bType);
}

function tradeBuyByType(type) {
    if (!authAccount) {
        toast('e', 'Please log in first.');
        return Promise.reject(new Error('Not authorized'));
    }

    var mode = tradeGetMode();
    var btn = (type === mode.aType) ? document.getElementById('riseBtn') : document.getElementById('fallBtn');
    var orig = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:16px"></i>';
    }

    return wsSend(tradeBuildProposalReq(type))
        .then(function (r) {
            return wsSend({
                buy: r.proposal.id,
                price: r.proposal.ask_price
            });
        })
        .then(function (r) {
            var buy = r.buy;
            var label = tradeLabelForType(type, mode);

            tradeUpsertOpen({
                contract_id: buy.contract_id,
                contract_type: type,
                display_name: mktName(curSymbol),
                buy_price: +buy.buy_price || +document.getElementById('stakeVal').value || 0,
                profit: 0,
                ui_label: label
            });

            tradeRenderOpenContracts();
            tradeUpdateSummary();

            wsRaw({
                proposal_open_contract: 1,
                contract_id: buy.contract_id,
                subscribe: 1
            });

            toast('s', label + ' trade #' + buy.contract_id + ' opened!');
            return buy;
        })
        .catch(function (e) {
            console.error('tradeBuyByType failed:', e);
            toast('e', 'Failed: ' + (e.message || e.code || '?'));
            throw e;
        })
        .finally(function () {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
}

function tradeUpsertOpen(c) {
    var i = tradeContracts.findIndex(function (x) { return x.contract_id === c.contract_id; });
    if (i >= 0) tradeContracts[i] = Object.assign({}, tradeContracts[i], c);
    else tradeContracts.unshift(c);
}

function tradeRemoveOpen(id) {
    tradeContracts = tradeContracts.filter(function (x) {
        return x.contract_id !== id;
    });
}

function tradeOpenCardHtml(c) {
    var pnl = +c.profit || 0;
    var win = pnl >= 0;
    var label = c.ui_label || tradeLabelForType(c.contract_type);

    return '' +
        '<div class="cc ' + (win ? '' : 'loss') + '">' +
        '   <div class="cc-top">' +
        '       <span class="cc-type">' + label + '</span>' +
        '       <span class="cc-pnl" style="color:' + (win ? 'var(--gn)' : 'var(--red)') + '">' + tradeSignedMoney(pnl) + '</span>' +
        '   </div>' +
        '   <div class="cc-bot">' +
        '       <span>' + (c.display_name || curSymbol) + '</span>' +
        '       <span>' + tradeMoney(c.buy_price || 0) + '</span>' +
        '   </div>' +
        '</div>';
}

function tradeRenderOpenContracts() {
    var list = document.getElementById('cList');
    var dash = document.getElementById('dashPos');

    if (list) {
        list.innerHTML = tradeContracts.length ? tradeContracts.map(tradeOpenCardHtml).join('') : '';
    }

    if (dash) {
        dash.innerHTML = tradeContracts.length
            ? tradeContracts.map(tradeOpenCardHtml).join('')
            : '<div class="empty"><i class="fas fa-inbox"></i><p>No open positions</p></div>';
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
            var label = c.ui_label || tradeLabelForType(c.contract_type);

            return '' +
                '<div class="rpt-row">' +
                '   <div class="rpt-cell"><span class="rpt-type ' + (pnl >= 0 ? 'up' : 'dn') + '">' + label + '</span></div>' +
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

    var existing = tradeContracts.find(function (x) { return x.contract_id === c.contract_id; });
    var label = existing && existing.ui_label ? existing.ui_label : tradeLabelForType(c.contract_type);

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
            sold_at: +c.date_sold || +c.date_expiry || 0,
            ui_label: label
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
        profit: +c.profit || 0,
        ui_label: label
    });

    tradeRenderOpenContracts();
    tradeUpdateSummary();
});

function tradeBindAll() {
    if (tradeBound) return;
    tradeBound = true;

    tradeEnsureModeUI();

    var riseBtn = document.getElementById('riseBtn');
    if (riseBtn) riseBtn.addEventListener('click', function () { tradeBuy('A'); });

    var fallBtn = document.getElementById('fallBtn');
    if (fallBtn) fallBtn.addEventListener('click', function () { tradeBuy('B'); });

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
            document.querySelectorAll('.qk').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            document.getElementById('stakeVal').value = b.dataset.v;
            tradeSubProposals();
        });
    });

    ['stakeVal', 'durType', 'durVal'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', tradeSubProposals);
    });

    var barrierVal = document.getElementById('barrierVal');
    if (barrierVal) barrierVal.addEventListener('change', tradeSubProposals);

    document.addEventListener('click', function (e) {
        var t = e.target.closest('.tpt[data-mode]');
        if (!t) return;
        tradeSetMode(t.dataset.mode);
    });

    document.querySelectorAll('.tgb[data-g]').forEach(function (b) {
        b.addEventListener('click', function () {
            document.querySelectorAll('#tfGrp .tgb').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            curGranularity = +b.dataset.g;
            chartLoad(curSymbol, curGranularity);
        });
    });

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
    if (mktSearch) mktSearch.addEventListener('input', mktApplySearchFilter);

    tradeSetMode('rise_fall');
    tradeRenderOpenContracts();
    tradeRenderHistory();
    tradeUpdateSummary();
}