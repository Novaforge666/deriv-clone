var tradeModes = {
    rise_fall: {
        key: 'rise_fall',
        label: 'Rise/Fall',
        aType: 'CALL',
        bType: 'PUT',
        aLabel: 'Rise',
        bLabel: 'Fall'
    },
    higher_lower: {
        key: 'higher_lower',
        label: 'Higher/Lower',
        aType: 'CALL',
        bType: 'PUT',
        aLabel: 'Higher',
        bLabel: 'Lower'
    },
    even_odd: {
        key: 'even_odd',
        label: 'Even/Odd',
        aType: 'DIGITEVEN',
        bType: 'DIGITODD',
        aLabel: 'Even',
        bLabel: 'Odd',
        forceDurType: 't',
        defaultDur: 5
    },
    matches_differs: {
        key: 'matches_differs',
        label: 'Matches/Differs',
        aType: 'DIGITMATCH',
        bType: 'DIGITDIFF',
        aLabel: 'Matches',
        bLabel: 'Differs',
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
        forceDurType: 't',
        defaultDur: 5
    }
};

var tradeCategories = {
    up_down: {
        label: 'Up/Down',
        modes: ['rise_fall']
    },
    high_low: {
        label: 'High/Low',
        modes: ['higher_lower']
    },
    digits: {
        label: 'Digits',
        modes: ['even_odd', 'matches_differs', 'over_under']
    }
};

var tradeCategoryKey = 'up_down';
var tradeModeKey = 'rise_fall';
var tradeAmountBasis = 'stake';
var tradeDigit = 2;

var tradeContracts = [];
var tradeHistory = [];
var tradeProposalCache = { A: null, B: null };
var tradeBound = false;

var tradeDigitWindow = 60;
var tradeDigitStats = {};

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

function tradeErrText(e) {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    if (e.message) return e.message;
    if (e.error && e.error.message) return e.error.message;
    if (e.code) return e.code;
    try { return JSON.stringify(e); } catch (_) { return 'Unknown error'; }
}

function tradeGetMode() {
    return tradeModes[tradeModeKey] || tradeModes.rise_fall;
}

function tradeEnsureModeUI() {
    var tabs = document.querySelector('.tp-tabs');

    if (tabs && !tabs.dataset.enhanced) {
        tabs.dataset.enhanced = '1';
        tabs.innerHTML =
            '<div class="contract-cats" id="contractCats"></div>' +
            '<div class="contract-types" id="contractTypes"></div>';
    }

    var form = document.querySelector('.tp-form');
    var poCard = form ? form.querySelector('.po-card') : null;

    if (form && !document.getElementById('digitBoardWrap')) {
        var digitWrap = document.createElement('div');
        digitWrap.className = 'digit-board-wrap hidden';
        digitWrap.id = 'digitBoardWrap';
        digitWrap.innerHTML =
            '<label class="tpf-lbl"><i class="fas fa-hashtag"></i> Last digit prediction</label>' +
            '<div class="digit-board" id="digitBoard"></div>';

        if (poCard) form.insertBefore(digitWrap, poCard);
        else form.appendChild(digitWrap);
    }

    if (form && !document.getElementById('amtBasisTabs')) {
        var basis = document.createElement('div');
        basis.className = 'basis-switch';
        basis.id = 'amtBasisTabs';
        basis.innerHTML =
            '<button class="basis-tab active" type="button" data-basis="stake">Stake</button>' +
            '<button class="basis-tab" type="button" data-basis="payout">Payout</button>';

        if (poCard) form.insertBefore(basis, poCard);
        else form.appendChild(basis);
    }

    if (form && !document.getElementById('barrierWrap')) {
        var barrier = document.createElement('div');
        barrier.className = 'tpf-sec hidden';
        barrier.id = 'barrierWrap';
        barrier.innerHTML =
            '<label class="tpf-lbl"><i class="fas fa-hashtag"></i> Barrier / Digit</label>' +
            '<div class="stake-row">' +
            '   <span class="stk-c">DIGIT</span>' +
            '   <input type="number" id="barrierVal" value="5" min="0" max="9" aria-label="Barrier digit">' +
            '</div>';

        if (poCard) form.insertBefore(barrier, poCard);
        else form.appendChild(barrier);
    }

    tradeRenderClassifier();
    tradeEnsureDigitOverlay();
    tradeRenderDigitUI();
}

function tradeRenderClassifier() {
    var catsEl = document.getElementById('contractCats');
    var typesEl = document.getElementById('contractTypes');
    if (!catsEl || !typesEl) return;

    catsEl.innerHTML = Object.keys(tradeCategories).map(function (key) {
        var c = tradeCategories[key];
        return '<button class="contract-cat' + (key === tradeCategoryKey ? ' active' : '') + '" type="button" data-cat="' + key + '">' + c.label + '</button>';
    }).join('');

    var modes = tradeCategories[tradeCategoryKey].modes;

    typesEl.innerHTML = modes.map(function (modeKey) {
        var mode = tradeModes[modeKey];
        return '<button class="contract-type' + (modeKey === tradeModeKey ? ' active' : '') + '" type="button" data-mode="' + modeKey + '">' + mode.label + '</button>';
    }).join('');
}

function tradeSetMode(key) {
    if (!tradeModes[key]) return;

    Object.keys(tradeCategories).forEach(function (catKey) {
        if (tradeCategories[catKey].modes.indexOf(key) >= 0) {
            tradeCategoryKey = catKey;
        }
    });

    tradeModeKey = key;
    var mode = tradeGetMode();

    var riseLbl = document.querySelector('#riseBtn strong');
    var fallLbl = document.querySelector('#fallBtn strong');

    if (riseLbl) riseLbl.textContent = mode.aLabel;
    if (fallLbl) fallLbl.textContent = mode.bLabel;

    if (mode.forceDurType) {
        var durType = document.getElementById('durType');
        var durVal = document.getElementById('durVal');
        if (durType) durType.value = mode.forceDurType;
        if (durVal) durVal.value = mode.defaultDur || 5;
    }

    var digitBoardWrap = document.getElementById('digitBoardWrap');
    if (digitBoardWrap) {
        digitBoardWrap.classList.toggle('hidden', !(key === 'over_under' || key === 'even_odd' || key === 'matches_differs'));
    }

    tradeRenderClassifier();

    if (key === 'over_under' || key === 'even_odd' || key === 'matches_differs') {
        if (typeof tradePrimeDigits === 'function') {
            tradePrimeDigits(curSymbol);
        }
    }

    tradeRenderDigitUI();
    tradeSubProposals();
}

function tradeCurrentBarrier(type) {
    var val = tradeDigit;

    if (type === 'DIGITOVER' && val >= 9) val = 8;
    if (type === 'DIGITUNDER' && val <= 0) val = 1;

    tradeDigit = val;
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
        basis: tradeAmountBasis,
        contract_type: type,
        currency: tradeCurrency(),
        duration: dur,
        duration_unit: dt,
        symbol: curSymbol
    };

    if (
        type === 'DIGITOVER' ||
        type === 'DIGITUNDER' ||
        type === 'DIGITMATCH' ||
        type === 'DIGITDIFF'
    ) {
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

    if (side === 'A') {
        var risePay = document.getElementById('risePay');
        if (risePay) risePay.textContent = tradeMoney(payout);
    } else {
        var fallPay = document.getElementById('fallPay');
        if (fallPay) fallPay.textContent = tradeMoney(payout);
    }

    var ref = tradeProposalCache.A || tradeProposalCache.B || p;
    var profit = (+ref.payout || 0) - (+ref.ask_price || 0);

    var poVal = document.getElementById('poVal');
    if (poVal) poVal.textContent = tradeMoney(+ref.payout || 0);

    var prVal = document.getElementById('prVal');
    if (prVal) {
        prVal.textContent = tradeSignedMoney(profit);
        prVal.style.color = profit >= 0 ? 'var(--gn)' : 'var(--red)';
    }
});

function tradeBuy(side) {
    var mode = tradeGetMode();
    return tradeBuyByType(side === 'A' ? mode.aType : mode.bType);
}

function tradeBuyByType(type) {
    if (!authAccount) {
        toast('e', 'Please log in first.');
        return Promise.resolve(null);
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
            toast('e', tradeErrText(e));
            return null;
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

function tradeEnsureSideOpenContracts() {
    var side = document.getElementById('trdSide');
    if (!side) return;

    if (!document.getElementById('sideOpenWrap')) {
        var wrap = document.createElement('div');
        wrap.className = 'side-open-wrap';
        wrap.id = 'sideOpenWrap';
        wrap.innerHTML =
            '<div class="side-open-head">' +
            '   <span>Open positions</span>' +
            '   <span id="sideOpenCount">0</span>' +
            '</div>' +
            '<div class="side-open-body" id="sideOpenList">' +
            '   <div class="empty side-empty"><p>No open positions</p></div>' +
            '</div>';
        side.appendChild(wrap);
    }
}

function tradeEnsureSideOpenContracts() {
    var side = document.getElementById('trdSide');
    if (!side) return;

    if (!document.getElementById('sideOpenWrap')) {
        var wrap = document.createElement('div');
        wrap.className = 'side-open-wrap';
        wrap.id = 'sideOpenWrap';
        wrap.innerHTML =
            '<div class="side-open-head">' +
            '   <span>Open positions</span>' +
            '   <span id="sideOpenCount">0</span>' +
            '</div>' +
            '<div class="side-open-body" id="sideOpenList">' +
            '   <div class="empty side-empty"><p>No open positions</p></div>' +
            '</div>';
        side.appendChild(wrap);
    }
}
function tradeRenderOpenContracts() {
    tradeEnsureSideOpenContracts();

    var dash = document.getElementById('dashPos');
    var sideList = document.getElementById('sideOpenList');
    var sideCount = document.getElementById('sideOpenCount');

    if (dash) {
        dash.innerHTML = tradeContracts.length
            ? tradeContracts.map(tradeOpenCardHtml).join('')
            : '<div class="empty"><i class="fas fa-inbox"></i><p>No open positions</p></div>';
    }

    if (sideList) {
        sideList.innerHTML = tradeContracts.length
            ? tradeContracts.map(tradeOpenCardHtml).join('')
            : '<div class="empty side-empty"><p>No open positions</p></div>';
    }

    if (sideCount) {
        sideCount.textContent = tradeContracts.length;
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

function tradeDigitState(sym) {
    if (!tradeDigitStats[sym]) {
        tradeDigitStats[sym] = {
            history: [],
            current: null
        };
    }
    return tradeDigitStats[sym];
}

function tradeLastDigitFromQuote(sym, quote) {
    var dp = typeof mktDP === 'function' ? mktDP(sym) : 2;
    var fixed = Number(quote).toFixed(dp);
    var digits = fixed.replace(/\D/g, '');
    return digits ? +digits.charAt(digits.length - 1) : 0;
}

function tradeDigitSnapshot(sym) {
    var st = tradeDigitState(sym);
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    st.history.forEach(function (d) {
        counts[d]++;
    });

    var total = st.history.length;

    if (!total) {
        return {
            counts: counts,
            total: 0,
            current: st.current,
            most: [],
            least: [],
            due: '-',
            evenCount: 0,
            oddCount: 0,
            overCount: 0,
            underCount: 0,
            equalCount: 0,
            stream: []
        };
    }

    var max = Math.max.apply(null, counts);
    var min = Math.min.apply(null, counts);

    var most = [];
    var least = [];

    counts.forEach(function (count, digit) {
        if (count === max) most.push(digit);
        if (count === min) least.push(digit);
    });

    var evenCount = 0;
    var oddCount = 0;
    var overCount = 0;
    var underCount = 0;
    var equalCount = counts[tradeDigit] || 0;

    st.history.forEach(function (d) {
        if (d % 2 === 0) evenCount++;
        else oddCount++;

        if (d > tradeDigit) overCount++;
        else if (d < tradeDigit) underCount++;
    });

    return {
        counts: counts,
        total: total,
        current: st.current,
        most: most,
        least: least,
        due: least.length ? least[0] : '-',
        evenCount: evenCount,
        oddCount: oddCount,
        overCount: overCount,
        underCount: underCount,
        equalCount: equalCount,
        stream: st.history.slice(-20)
    };
}

function tradeDigitPct(count, total) {
    if (!total) return '--';
    return ((count / total) * 100).toFixed(1) + '%';
}

function tradeDigitPctNum(count, total) {
    if (!total) return 0;
    return +((count / total) * 100).toFixed(1);
}

function tradePctFromValue(value, total) {
    if (!total) return 0;
    return +((value / total) * 100).toFixed(1);
}

function tradeClampPct(v) {
    return Math.max(0, Math.min(100, +v || 0));
}

function tradeDigitCircleHTML(d, count, snap, isBoard) {
    var pctText = tradeDigitPct(count, snap.total);
    var pctNum = tradeDigitPctNum(count, snap.total);

    var cls = [isBoard ? 'digit-btn' : 'digit-strip-item', 'circle-digit-pro'];

    if (snap.current === d) cls.push('live');
    if (snap.most.indexOf(d) >= 0) cls.push('most');
    if (snap.least.indexOf(d) >= 0) cls.push('least');
    if (d % 2 === 0) cls.push('even');
    else cls.push('odd');

    if (isBoard && tradeModeKey === 'over_under' && tradeDigit === d) {
        cls.push('active');
    }

    var tagOpen = isBoard
        ? '<button class="' + cls.join(' ') + '" type="button" data-digit="' + d + '">'
        : '<div class="' + cls.join(' ') + '">';

    var tagClose = isBoard ? '</button>' : '</div>';

    return '' +
        tagOpen +
        '   <svg class="digit-ring-svg" viewBox="0 0 44 44" aria-hidden="true">' +
        '       <circle class="digit-ring-bg" cx="22" cy="22" r="18"></circle>' +
        '       <circle class="digit-ring-fill" cx="22" cy="22" r="18" pathLength="100" style="stroke-dasharray:' + pctNum + ' 100"></circle>' +
        '   </svg>' +
        '   <span class="digit-core">' +
        '       <span class="digit-num">' + d + '</span>' +
        '       <span class="digit-pct">' + pctText + '</span>' +
        '   </span>' +
        tagClose;
}

function tradeDigitHeatHTML(label, pct, cls) {
    return '' +
        '<div class="digit-heat ' + cls + '">' +
        '   <div class="digit-heat-top">' +
        '       <span>' + label + '</span>' +
        '       <strong>' + pct.toFixed(1) + '%</strong>' +
        '   </div>' +
        '   <div class="digit-heat-track">' +
        '       <span class="digit-heat-fill" style="width:' + tradeClampPct(pct) + '%"></span>' +
        '   </div>' +
        '</div>';
}

function tradeModeHeatHTML(snap) {
    var html = '';

    if (tradeModeKey === 'even_odd') {
        html += tradeDigitHeatHTML('Even', tradePctFromValue(snap.evenCount, snap.total), 'even');
        html += tradeDigitHeatHTML('Odd', tradePctFromValue(snap.oddCount, snap.total), 'odd');
    } else if (tradeModeKey === 'over_under') {
        html += tradeDigitHeatHTML('Over ' + tradeDigit, tradePctFromValue(snap.overCount, snap.total), 'over');
        html += tradeDigitHeatHTML('Under ' + tradeDigit, tradePctFromValue(snap.underCount, snap.total), 'under');
    }

    return html;
}

function tradePositionLiveCursorPanel() {
    var cursor = document.getElementById('digitLiveCursorPanel');
    var container = document.getElementById('digitBoard');

    if (!cursor || !container) return;

    var live = container.querySelector('.circle-digit-pro.live');
    if (!live) {
        cursor.classList.remove('show');
        return;
    }

    var crect = container.getBoundingClientRect();
    var lrect = live.getBoundingClientRect();
    var left = (lrect.left - crect.left) + (lrect.width / 2);

    cursor.style.left = left + 'px';
    cursor.classList.add('show');
}

function tradeSyncDigitCursors() {
    tradePositionLiveCursorPanel();
}

window.addEventListener('resize', function () {
    if (typeof tradeSyncDigitCursors === 'function') {
        tradeSyncDigitCursors();
    }
});

function tradePositionLiveCursor(cursorId, containerId) {
    var cursor = document.getElementById(cursorId);
    var container = document.getElementById(containerId);
    if (!cursor || !container) return;

    var active = container.querySelector('.live');
    if (!active) {
        cursor.classList.remove('show');
        return;
    }

    var crect = container.getBoundingClientRect();
    var arect = active.getBoundingClientRect();
    var left = (arect.left - crect.left) + (arect.width / 2);

    cursor.style.left = left + 'px';
    cursor.classList.add('show');
}

function tradeSyncDigitCursors() {
    tradePositionLiveCursor('digitLiveCursorChart', 'digitStrip');
    tradePositionLiveCursor('digitLiveCursorPanel', 'digitBoard');
}

window.addEventListener('resize', function () {
    if (typeof tradeSyncDigitCursors === 'function') {
        tradeSyncDigitCursors();
    }
});

function tradeEnsureDigitOverlay() {
    var chartOverlay = document.getElementById('digitOverlay');
    if (chartOverlay) chartOverlay.remove();

    var wrap = document.getElementById('digitBoardWrap');
    if (!wrap) return;

    if (!document.getElementById('digitInsightsPanel')) {
        var info = document.createElement('div');
        info.className = 'digit-insights panel-insights';
        info.id = 'digitInsightsPanel';
        info.innerHTML =
            '<span class="digit-insight hot">Most: <strong id="digitMostPanel">-</strong></span>' +
            '<span class="digit-insight cold">Least: <strong id="digitLeastPanel">-</strong></span>' +
            '<span class="digit-insight due">Due: <strong id="digitDuePanel">-</strong></span>';
        wrap.appendChild(info);
    }

    if (!document.getElementById('digitHeatbarsPanel')) {
        var heat = document.createElement('div');
        heat.className = 'digit-heatbars panel-heatbars';
        heat.id = 'digitHeatbarsPanel';
        wrap.appendChild(heat);
    }

    var board = document.getElementById('digitBoard');
    if (board && !document.getElementById('digitBoardWrapInner')) {
        var boardWrap = document.createElement('div');
        boardWrap.className = 'digit-board-wrap-inner';
        boardWrap.id = 'digitBoardWrapInner';
        boardWrap.innerHTML = '<div class="digit-live-cursor panel-cursor" id="digitLiveCursorPanel">LIVE</div>';
        board.parentNode.insertBefore(boardWrap, board);
        boardWrap.appendChild(board);
    }

    if (!document.getElementById('digitStreamPanel')) {
        var stream = document.createElement('div');
        stream.className = 'digit-stream panel-stream';
        stream.id = 'digitStreamPanel';
        wrap.appendChild(stream);
    }
}

function tradeModeHeatHTML(snap) {
    var html = '';

    if (tradeModeKey === 'even_odd') {
        html += tradeDigitHeatHTML('Even', tradePctFromValue(snap.evenCount, snap.total), 'even');
        html += tradeDigitHeatHTML('Odd', tradePctFromValue(snap.oddCount, snap.total), 'odd');
    } else if (tradeModeKey === 'matches_differs') {
        var matchesPct = tradeDigitPctNum(snap.counts[tradeDigit] || 0, snap.total);
        var differsPct = snap.total ? +(100 - matchesPct).toFixed(1) : 0;
        html += tradeDigitHeatHTML('Matches ' + tradeDigit, matchesPct, 'over');
        html += tradeDigitHeatHTML('Differs ' + tradeDigit, differsPct, 'under');
    } else if (tradeModeKey === 'over_under') {
        html += tradeDigitHeatHTML('Over ' + tradeDigit, tradePctFromValue(snap.overCount, snap.total), 'over');
        html += tradeDigitHeatHTML('Under ' + tradeDigit, tradePctFromValue(snap.underCount, snap.total), 'under');
    }

    return html;
}

function tradePositionLiveCursorPanel() {
    var cursor = document.getElementById('digitLiveCursorPanel');
    var container = document.getElementById('digitBoard');
    if (!cursor || !container) return;

    var live = container.querySelector('.circle-digit-pro.live');
    if (!live) {
        cursor.classList.remove('show');
        return;
    }

    var crect = container.getBoundingClientRect();
    var lrect = live.getBoundingClientRect();
    var left = (lrect.left - crect.left) + (lrect.width / 2);

    cursor.style.left = left + 'px';
    cursor.classList.add('show');
}

function tradeSyncDigitCursors() {
    tradePositionLiveCursorPanel();
}

window.addEventListener('resize', function () {
    tradeSyncDigitCursors();
});

function tradeRenderDigitUI() {
    tradeEnsureDigitOverlay();

    var snap = tradeDigitSnapshot(curSymbol);
    var showDigits = (tradeModeKey === 'over_under' || tradeModeKey === 'even_odd' || tradeModeKey === 'matches_differs');
    var wrap = document.getElementById('digitBoardWrap');

    if (wrap) wrap.classList.toggle('hidden', !showDigits);
    if (!showDigits) return;

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    setText('digitMostPanel', snap.most.length ? snap.most.join(', ') : '-');
    setText('digitLeastPanel', snap.least.length ? snap.least.join(', ') : '-');
    setText('digitDuePanel', String(snap.due));

    var board = document.getElementById('digitBoard');
    if (board) {
        board.innerHTML = snap.counts.map(function (count, d) {
            return tradeDigitCircleHTML(d, count, snap, true);
        }).join('');
    }

    var heatPanel = document.getElementById('digitHeatbarsPanel');
    if (heatPanel) {
        heatPanel.innerHTML = tradeModeHeatHTML(snap);
    }

    var streamPanel = document.getElementById('digitStreamPanel');
    if (streamPanel) {
        streamPanel.innerHTML = snap.stream.map(function (d, idx) {
            var isLast = idx === snap.stream.length - 1;
            var cls = ['digit-stream-item'];

            if (d === snap.current && isLast) cls.push('live');
            if (d % 2 === 0) cls.push('even');
            else cls.push('odd');

            return '<span class="' + cls.join(' ') + '">' + d + '</span>';
        }).join('');
    }

    tradeSyncDigitCursors();
}
function tradePrimeDigits(sym) {
    return wsSend({
        ticks_history: sym,
        count: tradeDigitWindow,
        end: 'latest',
        style: 'ticks'
    }).then(function (r) {
        var st = tradeDigitState(sym);
        var prices = (r.history && r.history.prices) ? r.history.prices : [];

        st.history = prices.map(function (q) {
            return tradeLastDigitFromQuote(sym, q);
        });

        st.current = st.history.length ? st.history[st.history.length - 1] : null;

        if (sym === curSymbol) {
            tradeRenderDigitUI();
        }
    }).catch(function (err) {
        console.error('tradePrimeDigits failed:', err);
    });
}
function tradeBindAll() {
    if (tradeBound) return;
    tradeBound = true;

    tradeEnsureModeUI();
    tradeEnsureSideOpenContracts();

    var riseBtn = document.getElementById('riseBtn');
    if (riseBtn) {
        riseBtn.addEventListener('click', function () {
            tradeBuy('A');
        });
    }

    var fallBtn = document.getElementById('fallBtn');
    if (fallBtn) {
        fallBtn.addEventListener('click', function () {
            tradeBuy('B');
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

    ['stakeVal', 'durType', 'durVal'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', tradeSubProposals);
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

    document.addEventListener('click', function (e) {
        var catBtn = e.target.closest('.contract-cat');
        if (catBtn) {
            tradeCategoryKey = catBtn.dataset.cat;
            tradeRenderClassifier();

            var firstMode = tradeCategories[tradeCategoryKey].modes[0];
            if (firstMode) tradeSetMode(firstMode);
            return;
        }

        var typeBtn = e.target.closest('.contract-type');
        if (typeBtn) {
            tradeSetMode(typeBtn.dataset.mode);
            return;
        }

        var basisBtn = e.target.closest('.basis-tab');
        if (basisBtn) {
            tradeAmountBasis = basisBtn.dataset.basis || 'stake';

            document.querySelectorAll('.basis-tab').forEach(function (x) {
                x.classList.remove('active');
            });
            basisBtn.classList.add('active');

            tradeSubProposals();
            return;
        }

        var digitBtn = e.target.closest('.digit-btn[data-digit]');
        if (digitBtn) {
            if (tradeModeKey !== 'over_under') return;

            tradeDigit = +digitBtn.dataset.digit;

            document.querySelectorAll('.digit-btn').forEach(function (x) {
                x.classList.remove('active');
            });
            digitBtn.classList.add('active');

            tradeSubProposals();
            tradeRenderDigitUI();
        }
    });

    tradeSetMode('rise_fall');
    tradeRenderOpenContracts();
    tradeRenderHistory();
    tradeUpdateSummary();
    tradeRenderDigitUI();
}

function setChartBtn(el) {
    document.querySelectorAll('#chCandle,#chLine,#chArea,#chBar,#chBase').forEach(function (x) {
        x.classList.remove('active');
    });
    if (el) el.classList.add('active');
}