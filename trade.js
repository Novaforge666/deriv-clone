var tradeAmountBasis = 'stake';
var tradeDigit = 2;

var tradeDigitWindow = 60;
var tradeDigitStats = {};
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
var tradeAmountBasis = 'stake';
var tradeDigit = 2;
var tradeModeKey = 'rise_fall';
var tradeContracts = [];
var tradeHistory = [];
var tradeProposalCache = { A: null, B: null };
var tradeBound = false;
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
        modes: ['even_odd', 'over_under']
    }
};

var tradeCategoryKey = 'up_down';

var tradeAmountBasis = 'stake';
var tradeDigit = 2;

function tradeCurrency() {
    return authAccount && authAccount.currency ? authAccount.currency : 'USD';
}

function tradeErrText(e) {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    if (e.message) return e.message;
    if (e.error && e.error.message) return e.error.message;
    if (e.code) return e.code;
    try { return JSON.stringify(e); } catch (_) { return 'Unknown error'; }
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
        tabs.innerHTML =
            '<div class="contract-cats" id="contractCats"></div>' +
            '<div class="contract-types" id="contractTypes"></div>';
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

    tradeRenderClassifier();
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
            return tradeLastDigitFromQuote(q);
        });

        st.current = st.history.length ? st.history[st.history.length - 1] : null;

        if (sym === curSymbol) {
            tradeRenderDigitUI();
        }
    }).catch(function (err) {
        console.error('tradePrimeDigits failed:', err);
    });
}

function tradeDigitState(sym) {
    if (!tradeDigitStats[sym]) {
        tradeDigitStats[sym] = {
            history: [],
            current: null
        };
    }
    return tradeDigitStats[sym];
}

function tradeLastDigitFromQuote(quote) {
    var s = String(quote);
    for (var i = s.length - 1; i >= 0; i--) {
        var ch = s.charAt(i);
        if (ch >= '0' && ch <= '9') return +ch;
    }
    return 0;
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
            due: '-'
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

    return {
        counts: counts,
        total: total,
        current: st.current,
        most: most,
        least: least,
        due: least.length ? least[0] : '-'
    };
}

function tradeEnsureDigitOverlay() {
    var box = document.getElementById('chartBox');
    if (!box) return;

    if (!document.getElementById('digitOverlay')) {
        var el = document.createElement('div');
        el.id = 'digitOverlay';
        el.className = 'digit-overlay';
        el.innerHTML =
            '<div class="digit-insights" id="digitInsightsChart">' +
            '   <span class="digit-insight hot">Most: <strong id="digitMostChart">-</strong></span>' +
            '   <span class="digit-insight cold">Least: <strong id="digitLeastChart">-</strong></span>' +
            '   <span class="digit-insight due">Due: <strong id="digitDueChart">-</strong></span>' +
            '</div>' +
            '<div class="digit-strip" id="digitStrip"></div>';
        box.appendChild(el);
    }

    var wrap = document.getElementById('digitBoardWrap');
    if (wrap && !document.getElementById('digitInsightsPanel')) {
        var info = document.createElement('div');
        info.className = 'digit-insights panel-insights';
        info.id = 'digitInsightsPanel';
        info.innerHTML =
            '<span class="digit-insight hot">Most: <strong id="digitMostPanel">-</strong></span>' +
            '<span class="digit-insight cold">Least: <strong id="digitLeastPanel">-</strong></span>' +
            '<span class="digit-insight due">Due: <strong id="digitDuePanel">-</strong></span>';
        wrap.appendChild(info);
    }
}

function tradeRenderDigitUI() {
    tradeEnsureDigitOverlay();

    var snap = tradeDigitSnapshot(curSymbol);

    function pct(d) {
        return tradeDigitPct(snap.counts[d], snap.total);
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    setText('digitMostChart', snap.most.length ? snap.most.join(', ') : '-');
    setText('digitLeastChart', snap.least.length ? snap.least.join(', ') : '-');
    setText('digitDueChart', String(snap.due));

    setText('digitMostPanel', snap.most.length ? snap.most.join(', ') : '-');
    setText('digitLeastPanel', snap.least.length ? snap.least.join(', ') : '-');
    setText('digitDuePanel', String(snap.due));

    var strip = document.getElementById('digitStrip');
    if (strip) {
        strip.innerHTML = snap.counts.map(function (count, d) {
            var cls = ['digit-strip-item'];

            if (snap.current === d) cls.push('live');
            if (snap.most.indexOf(d) >= 0) cls.push('most');
            if (snap.least.indexOf(d) >= 0) cls.push('least');
            if (d % 2 === 0) cls.push('even');
            else cls.push('odd');

            return '' +
                '<div class="' + cls.join(' ') + '">' +
                '   <span class="digit-num">' + d + '</span>' +
                '   <span class="digit-pct">' + pct(d) + '</span>' +
                '</div>';
        }).join('');
    }

    var board = document.getElementById('digitBoard');
    if (board) {
        board.innerHTML = snap.counts.map(function (count, d) {
            var cls = ['digit-btn', 'circle-digit'];

            if (tradeModeKey === 'over_under' && tradeDigit === d) cls.push('active');
            if (snap.current === d) cls.push('live');
            if (snap.most.indexOf(d) >= 0) cls.push('most');
            if (snap.least.indexOf(d) >= 0) cls.push('least');
            if (d % 2 === 0) cls.push('even');
            else cls.push('odd');

            return '' +
                '<button class="' + cls.join(' ') + '" type="button" data-digit="' + d + '">' +
                '   <span class="digit-num">' + d + '</span>' +
                '   <span class="digit-pct">' + pct(d) + '</span>' +
                '</button>';
        }).join('');
    }
}

window.tradeOnDigitTick = function (sym, tick) {
    if (!tick) return;

    var st = tradeDigitState(sym);
    var digit = tradeLastDigitFromQuote(tick.quote);

    st.current = digit;
    st.history.push(digit);

    if (st.history.length > tradeDigitWindow) {
        st.history.shift();
    }

    if (sym === curSymbol) {
        tradeRenderDigitUI();
    }
};

function tradeDigitPct(count, total) {
    if (!total) return '--';
    return ((count / total) * 100).toFixed(1) + '%';
}

function tradeSetMode(key) {
    if (!tradeModes[key]) return;

    tradeModeKey = key;
    var mode = tradeGetMode();

    Object.keys(tradeCategories).forEach(function (catKey) {
        if (tradeCategories[catKey].modes.indexOf(key) >= 0) {
            tradeCategoryKey = catKey;
        }
    });

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

    var digitBoardWrap = document.getElementById('digitBoardWrap');
    var barrierWrap = document.getElementById('barrierWrap');

    if (barrierWrap) {
        barrierWrap.classList.add('hidden');
    }

    if (digitBoardWrap) {
        digitBoardWrap.classList.toggle('hidden', !(key === 'over_under' || key === 'even_odd'));
    }

    tradeRenderDigitUI();

    if (mode.forceDurType) {
        var durType = document.getElementById('durType');
        var durVal = document.getElementById('durVal');
        if (durType) durType.value = mode.forceDurType;
        if (durVal && (!durVal.value || +durVal.value < 1)) durVal.value = mode.defaultDur || 5;
    }

    tradeSubProposals();
    tradeRenderClassifier();
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
        }
    });

    var mktSearch = document.getElementById('mktSearch');
    if (mktSearch) mktSearch.addEventListener('input', mktApplySearchFilter);

    tradeSetMode('rise_fall');
    tradeRenderOpenContracts();
    tradeRenderHistory();
    tradeUpdateSummary();
}
document.addEventListener('click', function (e) {
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

    var digitBtn = e.target.closest('.digit-btn');
    if (digitBtn) {
        tradeDigit = +digitBtn.dataset.digit;

        document.querySelectorAll('.digit-btn').forEach(function (x) {
            x.classList.remove('active');
        });
        digitBtn.classList.add('active');

        tradeSubProposals();
    }
});

document.addEventListener('click', function (e) {
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