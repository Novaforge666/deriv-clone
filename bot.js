(function () {
    var BOT_PAGE_ID = 'pgBot';

    var botState = {
        booted: false,
        running: false,
        activePanel: 'summary',
        leftCollapsed: false,
        drag: null,
        logs: [],
        transactions: [],
        metrics: {
            runs: 0,
            totalStake: 0,
            totalPayout: 0,
            won: 0,
            lost: 0,
            profit: 0
        },
        activeContracts: {},
        subscribedSymbols: {},
        wsBound: false,
        lastActionAt: 0,
        tickBuffer: []
    };

    function $(sel, root) {
        return (root || document).querySelector(sel);
    }

    function $all(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    function fmtMoney(v) {
        var cur = (window.authAccount && authAccount.currency) ? authAccount.currency : 'USD';
        return (+v || 0).toFixed(2) + ' ' + cur;
    }

    function logTime() {
        return new Date().toLocaleTimeString();
    }

    function ensureStyles() {
        if (document.getElementById('bot-builder-style')) return;

        var style = document.createElement('style');
        style.id = 'bot-builder-style';
        style.textContent = `
            #${BOT_PAGE_ID} {
                height: 100%;
                min-height: 0;
            }

            #${BOT_PAGE_ID}.active {
                display: block !important;
            }

            .botbuilder-shell {
                height: 100%;
                min-height: 560px;
                display: flex;
                flex-direction: column;
                background: #0f1011;
                color: #fff;
            }

            .botbuilder-top {
                height: 46px;
                border-bottom: 1px solid #262a2c;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 12px;
                background: #17191a;
                flex-shrink: 0;
            }

            .botbuilder-subnav {
                display: flex;
                gap: 8px;
            }

            .bbs-tab {
                height: 32px;
                padding: 0 12px;
                border: 0;
                background: transparent;
                color: #c2c7c7;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
                cursor: default;
            }

            .bbs-tab.active {
                background: #232628;
                color: #fff;
            }

            .bbs-runbar {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .bbs-run {
                height: 32px;
                min-width: 92px;
                padding: 0 14px;
                border: 0;
                border-radius: 6px;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
                background: #18bca0;
            }

            .bbs-run.stop {
                background: #ff444f;
            }

            .bbs-reset {
                height: 32px;
                padding: 0 14px;
                border: 1px solid #2a2d2d;
                border-radius: 6px;
                background: transparent;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
            }

            .bbs-status {
                min-width: 180px;
            }

            .bbs-status-label {
                display: block;
                font-size: 10px;
                color: #6e7575;
                margin-bottom: 4px;
            }

            .bbs-status-track {
                height: 4px;
                background: #2a2d2d;
                border-radius: 999px;
                overflow: hidden;
            }

            .bbs-status-fill {
                width: 0%;
                height: 100%;
                background: #18bca0;
                transition: width .2s ease;
            }

            .botbuilder-body {
                flex: 1;
                min-height: 0;
                display: grid;
                grid-template-columns: 190px minmax(0, 1fr) 300px;
            }

            .botbuilder-body.left-collapsed {
                grid-template-columns: 46px minmax(0, 1fr) 300px;
            }

            .bbs-left {
                border-right: 1px solid #262a2c;
                padding: 12px;
                background: #101214;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .botbuilder-body.left-collapsed .bbs-left {
                padding: 8px 6px;
            }

            .bbs-left-top {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
            }

            .bbs-side-toggle {
                width: 30px;
                height: 30px;
                border: 1px solid #2a2d2d;
                border-radius: 8px;
                background: #17191b;
                color: #c2c7c7;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                flex-shrink: 0;
            }

            .bbs-quick {
                flex: 1;
                height: 32px;
                border: 0;
                border-radius: 6px;
                background: #ff444f;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                font-family: inherit;
            }

            .botbuilder-body.left-collapsed .bbs-quick,
            .botbuilder-body.left-collapsed .bbs-menu-box {
                display: none;
            }

            .bbs-side-collapsed-label {
                display: none;
                writing-mode: vertical-rl;
                transform: rotate(180deg);
                color: #c2c7c7;
                font-size: 11px;
                font-weight: 700;
                margin: 10px auto 0;
                letter-spacing: .3px;
            }

            .botbuilder-body.left-collapsed .bbs-side-collapsed-label {
                display: block;
            }

            .bbs-menu-box {
                border: 1px solid #2a2d2d;
                background: #121416;
                border-radius: 8px;
                overflow: hidden;
                min-height: 0;
                display: flex;
                flex-direction: column;
            }

            .bbs-menu-head {
                height: 38px;
                padding: 0 12px;
                border-bottom: 1px solid #2a2d2d;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 12px;
                font-weight: 700;
            }

            .bbs-search {
                height: 40px;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 12px;
                border-bottom: 1px solid #2a2d2d;
                color: #6e7575;
            }

            .bbs-search input {
                flex: 1;
                border: 0;
                outline: 0;
                background: transparent;
                color: #fff;
                font-family: inherit;
                font-size: 12px;
            }

            .bbs-menu-list {
                display: flex;
                flex-direction: column;
                overflow: auto;
            }

            .bbs-menu-item {
                border: 0;
                border-top: 1px solid #2a2d2d;
                background: transparent;
                color: #c2c7c7;
                text-align: left;
                padding: 10px 12px;
                font-family: inherit;
                font-size: 12px;
                cursor: pointer;
            }

            .bbs-menu-item.active,
            .bbs-menu-item:hover {
                background: #1a1d1f;
                color: #fff;
            }

            .bbs-center {
                min-width: 0;
                display: flex;
                flex-direction: column;
                background: #0d0f10;
            }

            .bbs-toolbar {
                height: 42px;
                border-bottom: 1px solid #262a2c;
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 0 10px;
                background: #131516;
                flex-shrink: 0;
            }

            .bbs-tool {
                width: 28px;
                height: 28px;
                border: 1px solid #2a2d2d;
                background: #17191b;
                color: #c2c7c7;
                border-radius: 4px;
                cursor: pointer;
            }

            .bbs-workspace {
                flex: 1;
                min-height: 740px;
                overflow: auto;
                padding: 18px;
                position: relative;
                background:
                    linear-gradient(0deg, rgba(255,255,255,.018) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
                background-size: 24px 24px;
            }

            .bbs-block {
                position: absolute;
                width: 330px;
                background: #0d67a1;
                border-radius: 6px;
                box-shadow: 0 10px 26px rgba(0,0,0,.28);
                overflow: hidden;
                user-select: none;
            }

            .bbs-block.small {
                width: 260px;
            }

            .bbs-block.wide {
                width: 520px;
            }

            .bbs-block.collapsed .bbs-block-body {
                display: none;
            }

            .bbs-block-head {
                height: 36px;
                background: rgba(0,0,0,.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 10px;
                cursor: move;
                font-size: 12px;
                font-weight: 700;
            }

            .bbs-block-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .bbs-block-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .bbs-block-btn {
                width: 22px;
                height: 22px;
                border: 0;
                border-radius: 4px;
                background: rgba(255,255,255,.12);
                color: #fff;
                cursor: pointer;
            }

            .bbs-block-body {
                padding: 12px;
            }

            .bbs-row-grid {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                margin-bottom: 12px;
            }

            .bbs-inline-wrap {
                display: flex;
                align-items: center;
                gap: 10px;
                flex-wrap: wrap;
            }

            .bbs-field {
                flex: 1;
                min-width: 130px;
            }

            .bbs-field.full {
                min-width: 100%;
            }

            .bbs-field label {
                display: block;
                font-size: 11px;
                font-weight: 700;
                margin-bottom: 6px;
                opacity: .95;
            }

            .bbs-block select,
            .bbs-block input {
                width: 100%;
                height: 30px;
                border: 0;
                border-radius: 999px;
                background: #fff;
                color: #111;
                padding: 0 12px;
                font-size: 12px;
                font-family: inherit;
                outline: none;
            }

            .bbs-inline-wrap span {
                font-size: 12px;
                font-weight: 700;
            }

            .bbs-inline-wrap input,
            .bbs-inline-wrap select {
                width: auto;
                min-width: 90px;
            }

            .bbs-right {
                border-left: 1px solid #262a2c;
                background: #141617;
                display: flex;
                flex-direction: column;
            }

            .bbs-right-tabs {
                height: 44px;
                border-bottom: 1px solid #262a2c;
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 0 14px;
                flex-shrink: 0;
            }

            .bbs-rtab {
                border: 0;
                background: transparent;
                color: #c2c7c7;
                font-size: 12px;
                font-family: inherit;
                cursor: pointer;
            }

            .bbs-rtab.active {
                color: #fff;
                border-bottom: 2px solid #ff444f;
                padding-bottom: 8px;
            }

            .bbs-right-body {
                flex: 1;
                min-height: 0;
                display: flex;
                flex-direction: column;
            }

            .bbs-panel {
                display: none;
                flex: 1;
                min-height: 0;
                padding: 14px;
            }

            .bbs-panel.active {
                display: flex;
                flex-direction: column;
            }

            .bbs-summary-card {
                border: 1px solid #2a2d2d;
                background: #111214;
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 12px;
            }

            .bbs-summary-title {
                font-size: 11px;
                font-weight: 700;
                color: #6e7575;
                text-transform: uppercase;
                margin-bottom: 10px;
            }

            .bbs-builder-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }

            .bbs-chip {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px;
                border: 1px solid #2a2d2d;
                border-radius: 999px;
                font-size: 10px;
                color: #c2c7c7;
                background: #151719;
            }

            .bbs-status-live {
                color: #18bca0;
            }

            .bbs-status-stop {
                color: #ff444f;
            }

            .bbs-summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }

            .bbs-metric span {
                display: block;
                font-size: 10px;
                color: #6e7575;
                margin-bottom: 4px;
            }

            .bbs-metric strong {
                font-size: 13px;
                color: #fff;
            }

            .bbs-log-wrap {
                flex: 1;
                min-height: 220px;
                border: 1px solid #2a2d2d;
                background: #111214;
                border-radius: 10px;
                padding: 12px;
                overflow: auto;
            }

            .bbs-log {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .bbs-log-line {
                padding: 8px 10px;
                border-radius: 8px;
                background: #171a1c;
                font-size: 12px;
                line-height: 1.45;
                border-left: 3px solid #377cfc;
            }

            .bbs-log-line.ok {
                border-left-color: #18bca0;
            }

            .bbs-log-line.err {
                border-left-color: #ff444f;
            }

            .bbs-log-line.muted {
                border-left-color: #6e7575;
            }

            @media (max-width: 1100px) {
                .botbuilder-body {
                    grid-template-columns: 180px minmax(0, 1fr);
                }

                .bbs-right {
                    display: none;
                }
            }

            @media (max-width: 800px) {
                .botbuilder-top {
                    height: auto;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                    padding: 10px;
                }

                .botbuilder-body {
                    grid-template-columns: 1fr;
                }

                .bbs-left {
                    display: none;
                }

                .bbs-block,
                .bbs-block.small,
                .bbs-block.wide {
                    width: calc(100% - 20px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    function getMarketsByGroup(group) {
        if (typeof MARKETS === 'undefined') {
            return [{ s: 'R_100', n: 'Volatility 100 Index' }];
        }
        return MARKETS[group] || [];
    }

    function fillSelect(el, items, valueKey, textKey, selected) {
        if (!el) return;
        el.innerHTML = items.map(function (item) {
            var value = item[valueKey];
            var text = item[textKey];
            var sel = value === selected ? ' selected' : '';
            return '<option value="' + value + '"' + sel + '>' + text + '</option>';
        }).join('');
    }

    function families() {
        return [
            { v: 'updown', t: 'Up/Down' },
            { v: 'digits', t: 'Digits' }
        ];
    }

    function contracts(family) {
        if (family === 'digits') {
            return [
                { v: 'even_odd', t: 'Even/Odd' },
                { v: 'matches_differs', t: 'Matches/Differs' },
                { v: 'over_under', t: 'Over/Under' }
            ];
        }

        return [
            { v: 'rise_fall', t: 'Rise/Fall' },
            { v: 'higher_lower', t: 'Higher/Lower' }
        ];
    }

    function directions(contract) {
        if (contract === 'rise_fall') {
            return [{ v: 'CALL', t: 'Rise' }, { v: 'PUT', t: 'Fall' }];
        }
        if (contract === 'higher_lower') {
            return [{ v: 'CALL', t: 'Higher' }, { v: 'PUT', t: 'Lower' }];
        }
        if (contract === 'even_odd') {
            return [{ v: 'DIGITEVEN', t: 'Even' }, { v: 'DIGITODD', t: 'Odd' }];
        }
        if (contract === 'matches_differs') {
            return [{ v: 'DIGITMATCH', t: 'Matches' }, { v: 'DIGITDIFF', t: 'Differs' }];
        }
        return [{ v: 'DIGITOVER', t: 'Over' }, { v: 'DIGITUNDER', t: 'Under' }];
    }

    function strategies(contract) {
        if (contract === 'rise_fall' || contract === 'higher_lower') {
            return [
                { v: 'every_5_ticks', t: 'Every 5 ticks' },
                { v: 'momentum_3', t: 'Momentum (3 ticks)' },
                { v: 'reversal_3', t: 'Reversal (3 ticks)' }
            ];
        }

        return [
            { v: 'every_5_ticks', t: 'Every 5 ticks' },
            { v: 'digit_equals_prediction', t: 'Digit equals prediction' },
            { v: 'digit_not_prediction', t: 'Digit differs from prediction' }
        ];
    }

    function contractNeedsPrediction(contract) {
        return contract === 'matches_differs' || contract === 'over_under';
    }

    function renderTabs() {
        $all('.bbs-rtab').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.panel === botState.activePanel);
        });

        $all('.bbs-panel').forEach(function (panel) {
            panel.classList.toggle('active', panel.dataset.panelBody === botState.activePanel);
        });
    }

    function pushLog(msg, kind) {
        botState.logs.unshift({
            text: '[' + logTime() + '] ' + msg,
            kind: kind || 'muted'
        });
        botState.logs = botState.logs.slice(0, 100);
        renderLogs();
    }

    function pushTransaction(msg, kind) {
        botState.transactions.unshift({
            text: '[' + logTime() + '] ' + msg,
            kind: kind || 'muted'
        });
        botState.transactions = botState.transactions.slice(0, 100);
        renderTransactions();
    }

    function renderLogs() {
        var log = $('#bbsLog');
        if (!log) return;

        log.innerHTML = botState.logs.length
            ? botState.logs.map(function (l) {
                return '<div class="bbs-log-line ' + l.kind + '">' + l.text + '</div>';
            }).join('')
            : '<div class="bbs-log-line muted">No journal entries yet.</div>';
    }

    function renderTransactions() {
        var log = $('#bbsTransactions');
        if (!log) return;

        log.innerHTML = botState.transactions.length
            ? botState.transactions.map(function (l) {
                return '<div class="bbs-log-line ' + l.kind + '">' + l.text + '</div>';
            }).join('')
            : '<div class="bbs-log-line muted">No transactions yet.</div>';
    }

    function readConfig() {
        return {
            marketGroup: $('#botMarketGroup') ? $('#botMarketGroup').value : 'synthetic',
            symbol: $('#botSymbol') ? $('#botSymbol').value : 'R_100',
            family: $('#botTradeFamily') ? $('#botTradeFamily').value : 'digits',
            contract: $('#botContract') ? $('#botContract').value : 'over_under',
            direction: $('#botDirection') ? $('#botDirection').value : 'DIGITUNDER',
            strategy: $('#botStrategy') ? $('#botStrategy').value : 'every_5_ticks',
            prediction: $('#botPrediction') ? (+$('#botPrediction').value || 5) : 5,
            durationUnit: $('#botDurationUnit') ? $('#botDurationUnit').value : 't',
            duration: $('#botDuration') ? (+$('#botDuration').value || 1) : 1,
            stake: $('#botStake') ? (+$('#botStake').value || 1) : 1,
            currency: $('#botCurrency') ? $('#botCurrency').value : ((window.authAccount && authAccount.currency) ? authAccount.currency : 'USD'),
            cooldown: ($('#botCooldown') ? (+$('#botCooldown').value || 5) : 5) * 1000,
            maxOpen: $('#botMaxOpen') ? (+$('#botMaxOpen').value || 3) : 3,
            restart: $('#botRestart') ? $('#botRestart').value : 'yes',
            bulkPurchase: $('#botBulkPurchase') ? $('#botBulkPurchase').value : 'no',
            numTrades: $('#botNumTrades') ? (+$('#botNumTrades').value || 1) : 1
        };
    }

    function updateSummary() {
        var c = readConfig();

        var fill = $('#bbsStatusFill');
        if (fill) fill.style.width = botState.running ? '100%' : '0%';

        var statusText = $('#bbsStatusText');
        if (statusText) {
            statusText.textContent = botState.running ? 'Running' : 'Stopped';
            statusText.className = botState.running ? 'bbs-status-live' : 'bbs-status-stop';
        }

        var symbolText = $('#bbsSymbolText');
        if (symbolText) symbolText.textContent = c.symbol;

        var typeText = $('#bbsTypeText');
        if (typeText) typeText.textContent = c.contract;

        var runs = $('#bbsRuns');
        if (runs) runs.textContent = String(botState.metrics.runs);

        var stakeTotal = $('#bbsStakeTotal');
        if (stakeTotal) stakeTotal.textContent = botState.metrics.totalStake.toFixed(2);

        var payoutTotal = $('#bbsPayoutTotal');
        if (payoutTotal) payoutTotal.textContent = botState.metrics.totalPayout.toFixed(2);

        var won = $('#bbsWon');
        if (won) won.textContent = String(botState.metrics.won);

        var lost = $('#bbsLost');
        if (lost) lost.textContent = String(botState.metrics.lost);

        var profit = $('#bbsProfitTotal');
        if (profit) profit.textContent = botState.metrics.profit.toFixed(2);

        var runBtn = $('#bbsRunBtn');
        if (runBtn) {
            runBtn.textContent = botState.running ? 'Stop' : 'Run';
            runBtn.classList.toggle('stop', botState.running);
        }
    }

    function renderAll() {
        renderTabs();
        renderLogs();
        renderTransactions();
        updateSummary();
    }

    function fillControls() {
        var group = $('#botMarketGroup');
        var symbol = $('#botSymbol');
        var family = $('#botTradeFamily');
        var contract = $('#botContract');
        var direction = $('#botDirection');
        var strategy = $('#botStrategy');
        var prediction = $('#botPrediction');
        var currency = $('#botCurrency');

        fillSelect(group, [
            { v: 'synthetic', t: 'Synthetic' },
            { v: 'forex', t: 'Forex' },
            { v: 'commodities', t: 'Commodities' }
        ], 'v', 't', group && group.value ? group.value : 'synthetic');

        fillSelect(family, families(), 'v', 't', family && family.value ? family.value : 'digits');

        var contractItems = contracts(family ? family.value : 'digits');
        fillSelect(contract, contractItems, 'v', 't', contract && contract.value ? contract.value : contractItems[0].v);

        var directionItems = directions(contract ? contract.value : contractItems[0].v);
        fillSelect(direction, directionItems, 'v', 't', direction && direction.value ? direction.value : directionItems[0].v);

        var stratItems = strategies(contract ? contract.value : contractItems[0].v);
        fillSelect(strategy, stratItems, 'v', 't', strategy && strategy.value ? strategy.value : stratItems[0].v);

        var symbols = getMarketsByGroup(group ? group.value : 'synthetic');
        fillSelect(symbol, symbols.map(function (m) {
            return { v: m.s, t: m.n };
        }), 'v', 't', symbol && symbol.value ? symbol.value : (symbols[0] ? symbols[0].s : 'R_100'));

        if (prediction) {
            prediction.parentElement.style.display = contractNeedsPrediction(contract.value) ? '' : 'none';
        }

        if (currency) {
            currency.value = (window.authAccount && authAccount.currency) ? authAccount.currency : 'USD';
        }

        updateSummary();
    }

    function placeBlocks() {
        $all('.bbs-block').forEach(function (block) {
            block.style.left = (+block.dataset.x || 0) + 'px';
            block.style.top = (+block.dataset.y || 0) + 'px';
            block.style.zIndex = '1';
        });
    }

    function bindTabs() {
        $all('.bbs-rtab').forEach(function (btn) {
            btn.onclick = function () {
                botState.activePanel = btn.dataset.panel;
                renderTabs();
            };
        });
    }

    function bindDrag() {
        if (document.body.dataset.botDragBound === '1') return;
        document.body.dataset.botDragBound = '1';

        document.addEventListener('pointerdown', function (e) {
            var head = e.target.closest('.bbs-block-head');
            if (!head) return;

            var block = head.closest('.bbs-block');
            var workspace = $('#bbsWorkspace');
            if (!block || !workspace) return;

            var rect = block.getBoundingClientRect();
            var wrect = workspace.getBoundingClientRect();

            botState.drag = {
                block: block,
                startX: e.clientX,
                startY: e.clientY,
                origLeft: rect.left - wrect.left + workspace.scrollLeft,
                origTop: rect.top - wrect.top + workspace.scrollTop
            };

            block.style.zIndex = '99';
        });

        document.addEventListener('pointermove', function (e) {
            if (!botState.drag) return;

            var d = botState.drag;
            var dx = e.clientX - d.startX;
            var dy = e.clientY - d.startY;

            d.block.style.left = (d.origLeft + dx) + 'px';
            d.block.style.top = (d.origTop + dy) + 'px';
        });

        document.addEventListener('pointerup', function () {
            if (!botState.drag) return;
            botState.drag.block.style.zIndex = '1';
            botState.drag = null;
        });
    }

    function getLastDigit(symbol, quote) {
        var dp = 2;
        if (typeof mktDP === 'function') dp = mktDP(symbol);
        var fixed = Number(quote).toFixed(dp);
        var digits = fixed.replace(/\D/g, '');
        return digits ? +digits.charAt(digits.length - 1) : 0;
    }

    function shouldTrigger(conf, quote) {
        botState.tickBuffer.push(+quote);
        if (botState.tickBuffer.length > 10) botState.tickBuffer.shift();

        if (conf.strategy === 'every_5_ticks') {
            return botState.tickBuffer.length % 5 === 0;
        }

        if (conf.strategy === 'momentum_3' && botState.tickBuffer.length >= 4) {
            var a = botState.tickBuffer.slice(-4);
            return (a[0] < a[1] && a[1] < a[2] && a[2] < a[3]) ||
                (a[0] > a[1] && a[1] > a[2] && a[2] > a[3]);
        }

        if (conf.strategy === 'reversal_3' && botState.tickBuffer.length >= 4) {
            var b = botState.tickBuffer.slice(-4);
            return (b[0] < b[1] && b[1] < b[2] && b[2] < b[3]) ||
                (b[0] > b[1] && b[1] > b[2] && b[2] > b[3]);
        }

        var digit = getLastDigit(conf.symbol, quote);

        if (conf.strategy === 'digit_equals_prediction') {
            return digit === conf.prediction;
        }

        if (conf.strategy === 'digit_not_prediction') {
            return digit !== conf.prediction;
        }

        return false;
    }

    function buildProposalReq(conf, contractType) {
        var req = {
            proposal: 1,
            amount: conf.stake,
            basis: 'stake',
            contract_type: contractType,
            currency: conf.currency,
            duration: conf.duration,
            duration_unit: conf.durationUnit,
            symbol: conf.symbol
        };

        if (
            contractType === 'DIGITMATCH' ||
            contractType === 'DIGITDIFF' ||
            contractType === 'DIGITOVER' ||
            contractType === 'DIGITUNDER'
        ) {
            req.barrier = String(conf.prediction);
        }

        return req;
    }

    function canTrade(conf) {
        if (!window.authAccount) {
            pushLog('Please log in first.', 'err');
            return false;
        }

        if (!window.wsSend) {
            pushLog('WebSocket API unavailable.', 'err');
            return false;
        }

        if (Object.keys(botState.activeContracts).length >= conf.maxOpen) return false;
        if (Date.now() - botState.lastActionAt < conf.cooldown) return false;
        return true;
    }

    function executeTrade(conf) {
        if (!canTrade(conf)) return;

        var tradesToOpen = (conf.bulkPurchase === 'yes') ? Math.max(1, conf.numTrades) : 1;
        var allowed = Math.max(0, conf.maxOpen - Object.keys(botState.activeContracts).length);
        tradesToOpen = Math.min(tradesToOpen, allowed);
        if (!tradesToOpen) return;

        botState.lastActionAt = Date.now();

        var seq = Promise.resolve();

        for (var i = 0; i < tradesToOpen; i++) {
            seq = seq.then(function () {
                return wsSend(buildProposalReq(conf, conf.direction))
                    .then(function (res) {
                        return wsSend({
                            buy: res.proposal.id,
                            price: res.proposal.ask_price
                        }).then(function (buyRes) {
                            return {
                                proposal: res.proposal,
                                buy: buyRes.buy
                            };
                        });
                    })
                    .then(function (res) {
                        if (!res || !res.buy) return;

                        var id = res.buy.contract_id;
                        botState.activeContracts[id] = {
                            symbol: conf.symbol,
                            direction: conf.direction,
                            buy_price: +res.buy.buy_price || conf.stake
                        };

                        botState.metrics.runs += 1;
                        botState.metrics.totalStake += (+res.buy.buy_price || conf.stake || 0);
                        botState.metrics.totalPayout += (+res.proposal.payout || 0);

                        if (window.wsRaw) {
                            wsRaw({
                                proposal_open_contract: 1,
                                contract_id: id,
                                subscribe: 1
                            });
                        }

                        pushTransaction('Opened #' + id + ' on ' + conf.symbol + ' (' + conf.direction + ')', 'ok');
                        pushLog('Opened #' + id + ' on ' + conf.symbol, 'ok');
                        updateSummary();
                    })
                    .catch(function (err) {
                        pushLog('Trade failed: ' + (err && (err.message || err.code) ? (err.message || err.code) : 'Unknown'), 'err');
                    });
            });
        }
    }

    function ensureSymbolSubscription(symbol) {
        if (!window.wsSubTick) return;
        if (botState.subscribedSymbols[symbol]) return;

        botState.subscribedSymbols[symbol] = true;

        wsSubTick(symbol, function (tick) {
            if (!botState.running) return;

            var conf = readConfig();
            if (tick.symbol !== conf.symbol) return;

            if (shouldTrigger(conf, tick.quote)) {
                executeTrade(conf);
            }
        });
    }

    function bindTradeEvents() {
        if (botState.wsBound) return;
        botState.wsBound = true;

        if (window.wsOn) {
            wsOn('poc', function (c) {
                if (!c || !c.contract_id) return;
                if (!botState.activeContracts[c.contract_id]) return;
                if (!c.is_sold) return;

                var pnl = +c.profit || 0;
                delete botState.activeContracts[c.contract_id];

                botState.metrics.profit += pnl;
                if (pnl >= 0) botState.metrics.won += 1;
                else botState.metrics.lost += 1;

                pushTransaction(
                    '#' + c.contract_id + ' closed: ' + (pnl >= 0 ? 'WIN ' : 'LOSS ') + fmtMoney(Math.abs(pnl)),
                    pnl >= 0 ? 'ok' : 'err'
                );

                pushLog(
                    '#' + c.contract_id + ' closed: ' + (pnl >= 0 ? 'WIN ' : 'LOSS ') + fmtMoney(Math.abs(pnl)),
                    pnl >= 0 ? 'ok' : 'err'
                );

                updateSummary();

                var conf = readConfig();
                if (conf.restart === 'no') {
                    stopBot();
                }
            });
        }
    }

    function startBot() {
        var conf = readConfig();

        if (!window.authAccount) {
            pushLog('Login first before starting the bot.', 'err');
            return;
        }

        botState.running = true;
        botState.tickBuffer = [];
        botState.lastActionAt = 0;

        ensureSymbolSubscription(conf.symbol);
        updateSummary();
        pushLog('Bot started on ' + conf.symbol + ' with ' + conf.contract + ' / ' + conf.direction, 'ok');
    }

    function stopBot() {
        botState.running = false;
        updateSummary();
        pushLog('Bot stopped.', 'muted');
    }

    function resetBot() {
        botState.running = false;
        botState.activePanel = 'summary';
        botState.leftCollapsed = false;
        botState.drag = null;
        botState.logs = [];
        botState.transactions = [];
        botState.metrics = {
            runs: 0,
            totalStake: 0,
            totalPayout: 0,
            won: 0,
            lost: 0,
            profit: 0
        };
        botState.activeContracts = {};
        botState.tickBuffer = [];
        botState.lastActionAt = 0;
        renderAll();
        pushLog('Bot reset.', 'muted');
    }

    function bindControls() {
        var body = $('#bbsBody');
        if (!body) return;

        var sideToggle = $('#bbsSideToggle');
        if (sideToggle && !sideToggle.dataset.bound) {
            sideToggle.dataset.bound = '1';
            sideToggle.addEventListener('click', function () {
                botState.leftCollapsed = !botState.leftCollapsed;
                body.classList.toggle('left-collapsed', botState.leftCollapsed);
                var icon = sideToggle.querySelector('i');
                if (icon) icon.className = botState.leftCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            });
        }

        var quickBtn = $('#bbsQuickBtn');
        if (quickBtn && !quickBtn.dataset.bound) {
            quickBtn.dataset.bound = '1';
            quickBtn.addEventListener('click', function () {
                var fam = $('#botTradeFamily');
                var contract = $('#botContract');
                var direction = $('#botDirection');
                var strat = $('#botStrategy');
                var pred = $('#botPrediction');
                var durUnit = $('#botDurationUnit');
                var dur = $('#botDuration');
                var stake = $('#botStake');
                var bulk = $('#botBulkPurchase');
                var trades = $('#botNumTrades');

                if (fam) fam.value = 'digits';
                fillControls();
                if (contract) contract.value = 'over_under';
                fillControls();
                if (direction) direction.value = 'DIGITUNDER';
                if (strat) strat.value = 'every_5_ticks';
                if (pred) pred.value = '5';
                if (durUnit) durUnit.value = 't';
                if (dur) dur.value = '1';
                if (stake) stake.value = '100';
                if (bulk) bulk.value = 'yes';
                if (trades) trades.value = '3';

                fillControls();
                updateSummary();
                pushLog('Quick strategy applied.', 'muted');
            });
        }

        $all('[data-collapse]').forEach(function (btn) {
            if (btn.dataset.bound) return;
            btn.dataset.bound = '1';

            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var block = btn.closest('.bbs-block');
                if (!block) return;
                block.classList.toggle('collapsed');
                btn.textContent = block.classList.contains('collapsed') ? '+' : '−';
            });
        });

        ['botMarketGroup', 'botTradeFamily', 'botContract', 'botDirection', 'botStrategy', 'botPrediction', 'botDurationUnit', 'botDuration', 'botStake', 'botCooldown', 'botMaxOpen', 'botRestart', 'botBulkPurchase', 'botNumTrades', 'botSymbol'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el || el.dataset.bound) return;
            el.dataset.bound = '1';

            el.addEventListener('change', function () {
                fillControls();
                updateSummary();

                if (id === 'botSymbol' && botState.running) {
                    ensureSymbolSubscription(readConfig().symbol);
                }
            });
        });

        var runBtn = $('#bbsRunBtn');
        if (runBtn && !runBtn.dataset.bound) {
            runBtn.dataset.bound = '1';
            runBtn.addEventListener('click', function () {
                if (botState.running) stopBot();
                else startBot();
            });
        }

        var resetBtn = $('#bbsResetBtn');
        if (resetBtn && !resetBtn.dataset.bound) {
            resetBtn.dataset.bound = '1';
            resetBtn.addEventListener('click', function () {
                resetBot();
            });
        }
    }

    function activatePage() {
        var page = document.getElementById(BOT_PAGE_ID);
        if (!page) return;

        page.innerHTML = `
            <div class="botbuilder-shell">
                <div class="botbuilder-top">
                    <div class="botbuilder-subnav">
                        <button class="bbs-tab" type="button">Dashboard</button>
                        <button class="bbs-tab active" type="button">Bot Builder</button>
                        <button class="bbs-tab" type="button">Charts</button>
                        <button class="bbs-tab" type="button">Tutorials</button>
                    </div>

                    <div class="bbs-runbar">
                        <button class="bbs-run" id="bbsRunBtn" type="button">Run</button>
                        <button class="bbs-reset" id="bbsResetBtn" type="button">Reset</button>

                        <div class="bbs-status">
                            <span class="bbs-status-label">Bot status</span>
                            <div class="bbs-status-track">
                                <div class="bbs-status-fill" id="bbsStatusFill"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="botbuilder-body" id="bbsBody">
                    <aside class="bbs-left">
                        <div class="bbs-left-top">
                            <button class="bbs-side-toggle" id="bbsSideToggle" type="button" title="Collapse sidebar">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="bbs-quick" id="bbsQuickBtn" type="button">Quick strategy</button>
                        </div>

                        <div class="bbs-menu-box">
                            <div class="bbs-menu-head">
                                <span>Blocks menu</span>
                                <i class="fas fa-chevron-up"></i>
                            </div>

                            <div class="bbs-search">
                                <i class="fas fa-search"></i>
                                <input type="text" placeholder="Search" aria-label="Search blocks">
                            </div>

                            <div class="bbs-menu-list">
                                <button class="bbs-menu-item active" type="button">Logics 🔥</button>
                                <button class="bbs-menu-item" type="button">Trade parameters</button>
                                <button class="bbs-menu-item" type="button">Purchase conditions</button>
                                <button class="bbs-menu-item" type="button">Sell conditions (optional)</button>
                                <button class="bbs-menu-item" type="button">Restart trading conditions</button>
                                <button class="bbs-menu-item" type="button">Analysis</button>
                                <button class="bbs-menu-item" type="button">Utility</button>
                            </div>
                        </div>

                        <div class="bbs-side-collapsed-label">Blocks menu</div>
                    </aside>

                    <main class="bbs-center">
                        <div class="bbs-toolbar">
                            <button class="bbs-tool" type="button" title="Refresh"><i class="fas fa-sync"></i></button>
                            <button class="bbs-tool" type="button" title="Open"><i class="far fa-folder-open"></i></button>
                            <button class="bbs-tool" type="button" title="Save"><i class="far fa-save"></i></button>
                            <button class="bbs-tool" type="button" title="Flag"><i class="fas fa-flag"></i></button>
                            <button class="bbs-tool" type="button" title="Chart"><i class="fas fa-chart-line"></i></button>
                            <button class="bbs-tool" type="button" title="Undo"><i class="fas fa-undo"></i></button>
                            <button class="bbs-tool" type="button" title="Redo"><i class="fas fa-redo"></i></button>
                            <button class="bbs-tool" type="button" title="Zoom in"><i class="fas fa-search-plus"></i></button>
                            <button class="bbs-tool" type="button" title="Zoom out"><i class="fas fa-search-minus"></i></button>
                        </div>

                        <div class="bbs-workspace" id="bbsWorkspace">
                            <div class="bbs-block" data-x="20" data-y="20">
                                <div class="bbs-block-head">
                                    <div class="bbs-block-title">1. Trade parameters</div>
                                    <div class="bbs-block-actions">
                                        <button class="bbs-block-btn" type="button" data-collapse title="Collapse">−</button>
                                    </div>
                                </div>
                                <div class="bbs-block-body">
                                    <div class="bbs-row-grid">
                                        <div class="bbs-field">
                                            <label>Market group</label>
                                            <select id="botMarketGroup" aria-label="Market group"></select>
                                        </div>
                                        <div class="bbs-field">
                                            <label>Symbol</label>
                                            <select id="botSymbol" aria-label="Symbol"></select>
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field">
                                            <label>Trade family</label>
                                            <select id="botTradeFamily" aria-label="Trade family"></select>
                                        </div>
                                        <div class="bbs-field">
                                            <label>Contract</label>
                                            <select id="botContract" aria-label="Contract"></select>
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field">
                                            <label>Direction</label>
                                            <select id="botDirection" aria-label="Direction"></select>
                                        </div>
                                        <div class="bbs-field">
                                            <label>Default candle interval</label>
                                            <select id="botCandle" aria-label="Default candle interval">
                                                <option>1 minute</option>
                                                <option>5 minutes</option>
                                                <option>15 minutes</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field">
                                            <label>Strategy</label>
                                            <select id="botStrategy" aria-label="Strategy"></select>
                                        </div>
                                        <div class="bbs-field">
                                            <label>Prediction</label>
                                            <input id="botPrediction" type="number" min="0" max="9" value="5" aria-label="Prediction">
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Trade options</label>
                                            <div class="bbs-inline-wrap">
                                                <span>Duration</span>
                                                <select id="botDurationUnit" aria-label="Duration unit">
                                                    <option value="t">Ticks</option>
                                                    <option value="s">Seconds</option>
                                                    <option value="m" selected>Minutes</option>
                                                </select>

                                                <input id="botDuration" type="number" min="1" value="1" aria-label="Duration">

                                                <span>Stake</span>
                                                <input id="botStake" type="number" min="0.35" step="0.01" value="100" aria-label="Stake">

                                                <span>Currency</span>
                                                <input id="botCurrency" type="text" value="USD" readonly aria-label="Currency">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bbs-block small" data-x="40" data-y="350">
                                <div class="bbs-block-head">
                                    <div class="bbs-block-title">2. Purchase conditions</div>
                                    <div class="bbs-block-actions">
                                        <button class="bbs-block-btn" type="button" data-collapse title="Collapse">−</button>
                                    </div>
                                </div>
                                <div class="bbs-block-body">
                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Cooldown (seconds)</label>
                                            <input id="botCooldown" type="number" min="1" value="2" aria-label="Cooldown seconds">
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Allow bulk purchase</label>
                                            <select id="botBulkPurchase" aria-label="Allow bulk purchase">
                                                <option value="yes" selected>Yes</option>
                                                <option value="no">No</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>No. of trades</label>
                                            <input id="botNumTrades" type="number" min="1" value="1" aria-label="Number of trades">
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Max open bot trades</label>
                                            <input id="botMaxOpen" type="number" min="1" value="10" aria-label="Max open bot trades">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bbs-block small" data-x="460" data-y="40">
                                <div class="bbs-block-head">
                                    <div class="bbs-block-title">3. Sell conditions</div>
                                    <div class="bbs-block-actions">
                                        <button class="bbs-block-btn" type="button" data-collapse title="Collapse">−</button>
                                    </div>
                                </div>
                                <div class="bbs-block-body">
                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>If</label>
                                            <input type="text" value="Sell is available then" readonly aria-label="Sell condition">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bbs-block small" data-x="460" data-y="250">
                                <div class="bbs-block-head">
                                    <div class="bbs-block-title">4. Restart trading conditions</div>
                                    <div class="bbs-block-actions">
                                        <button class="bbs-block-btn" type="button" data-collapse title="Collapse">−</button>
                                    </div>
                                </div>
                                <div class="bbs-block-body">
                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Restart after sell</label>
                                            <select id="botRestart" aria-label="Restart after sell">
                                                <option value="yes">Trade again</option>
                                                <option value="no">Stop after sell</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <aside class="bbs-right">
                        <div class="bbs-right-tabs">
                            <button class="bbs-rtab active" type="button" data-panel="summary">Summary</button>
                            <button class="bbs-rtab" type="button" data-panel="transactions">Transactions</button>
                            <button class="bbs-rtab" type="button" data-panel="journal">Journal</button>
                        </div>

                        <div class="bbs-right-body">
                            <div class="bbs-panel active" data-panel-body="summary">
                                <div class="bbs-summary-card">
                                    <div class="bbs-summary-title">Bot status</div>
                                    <div class="bbs-builder-actions">
                                        <span class="bbs-chip">Mode: <strong id="bbsStatusText" class="bbs-status-stop">Stopped</strong></span>
                                        <span class="bbs-chip">Symbol: <strong id="bbsSymbolText">-</strong></span>
                                        <span class="bbs-chip">Type: <strong id="bbsTypeText">-</strong></span>
                                    </div>
                                </div>

                                <div class="bbs-summary-card">
                                    <div class="bbs-summary-title">Performance</div>
                                    <div class="bbs-summary-grid">
                                        <div class="bbs-metric"><span>Runs</span><strong id="bbsRuns">0</strong></div>
                                        <div class="bbs-metric"><span>Total stake</span><strong id="bbsStakeTotal">0.00</strong></div>
                                        <div class="bbs-metric"><span>Total payout</span><strong id="bbsPayoutTotal">0.00</strong></div>
                                        <div class="bbs-metric"><span>Won</span><strong id="bbsWon">0</strong></div>
                                        <div class="bbs-metric"><span>Lost</span><strong id="bbsLost">0</strong></div>
                                        <div class="bbs-metric"><span>P/L</span><strong id="bbsProfitTotal">0.00</strong></div>
                                    </div>
                                </div>
                            </div>

                            <div class="bbs-panel" data-panel-body="transactions">
                                <div class="bbs-log-wrap">
                                    <div class="bbs-summary-title">Transactions</div>
                                    <div class="bbs-log" id="bbsTransactions"></div>
                                </div>
                            </div>

                            <div class="bbs-panel" data-panel-body="journal">
                                <div class="bbs-log-wrap">
                                    <div class="bbs-summary-title">Journal</div>
                                    <div class="bbs-log" id="bbsLog"></div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        `;
    }

    function renderIntoPage() {
        var page = document.getElementById(BOT_PAGE_ID);
        if (!page) return;
        page.innerHTML = botMarkup();
    }

    function placeBlocks() {
        $all('.bbs-block').forEach(function (block) {
            block.style.left = (+block.dataset.x || 0) + 'px';
            block.style.top = (+block.dataset.y || 0) + 'px';
            block.style.zIndex = '1';
        });
    }

    function fillControls() {
        var group = $('#botMarketGroup');
        var symbol = $('#botSymbol');
        var family = $('#botTradeFamily');
        var contract = $('#botContract');
        var direction = $('#botDirection');
        var strategy = $('#botStrategy');
        var prediction = $('#botPrediction');
        var currency = $('#botCurrency');

        fillSelect(group, [
            { v: 'synthetic', t: 'Synthetic' },
            { v: 'forex', t: 'Forex' },
            { v: 'commodities', t: 'Commodities' }
        ], 'v', 't', group && group.value ? group.value : 'synthetic');

        fillSelect(family, families(), 'v', 't', family && family.value ? family.value : 'digits');

        var contractItems = contracts(family ? family.value : 'digits');
        fillSelect(contract, contractItems, 'v', 't', contract && contract.value ? contract.value : contractItems[0].v);

        var directionItems = directions(contract ? contract.value : contractItems[0].v);
        fillSelect(direction, directionItems, 'v', 't', direction && direction.value ? direction.value : directionItems[0].v);

        var stratItems = strategies(contract ? contract.value : contractItems[0].v);
        fillSelect(strategy, stratItems, 'v', 't', strategy && strategy.value ? strategy.value : stratItems[0].v);

        var symbols = getMarketsByGroup(group ? group.value : 'synthetic');
        fillSelect(symbol, symbols.map(function (m) {
            return { v: m.s, t: m.n };
        }), 'v', 't', symbol && symbol.value ? symbol.value : (symbols[0] ? symbols[0].s : 'R_100'));

        if (prediction) {
            prediction.parentElement.style.display = contractNeedsPrediction(contract.value) ? '' : 'none';
        }

        if (currency) {
            currency.value = (window.authAccount && authAccount.currency) ? authAccount.currency : 'USD';
        }

        updateSummary();
    }

    function bindTabs() {
        $all('.bbs-rtab').forEach(function (btn) {
            btn.onclick = function () {
                botState.activePanel = btn.dataset.panel;
                renderTabs();
            };
        });
    }

    function bindLocalControls() {
        var body = $('#bbsBody');
        if (!body) return;

        var sideToggle = $('#bbsSideToggle');
        if (sideToggle) {
            sideToggle.onclick = function () {
                botState.leftCollapsed = !botState.leftCollapsed;
                body.classList.toggle('left-collapsed', botState.leftCollapsed);
                var icon = sideToggle.querySelector('i');
                if (icon) icon.className = botState.leftCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            };
        }

        var quickBtn = $('#bbsQuickBtn');
        if (quickBtn) {
            quickBtn.onclick = function () {
                var fam = $('#botTradeFamily');
                var contract = $('#botContract');
                var direction = $('#botDirection');
                var strat = $('#botStrategy');
                var pred = $('#botPrediction');
                var durUnit = $('#botDurationUnit');
                var dur = $('#botDuration');
                var stake = $('#botStake');
                var bulk = $('#botBulkPurchase');
                var trades = $('#botNumTrades');

                if (fam) fam.value = 'digits';
                fillControls();
                if (contract) contract.value = 'over_under';
                fillControls();
                if (direction) direction.value = 'DIGITUNDER';
                if (strat) strat.value = 'every_5_ticks';
                if (pred) pred.value = '5';
                if (durUnit) durUnit.value = 't';
                if (dur) dur.value = '1';
                if (stake) stake.value = '100';
                if (bulk) bulk.value = 'yes';
                if (trades) trades.value = '3';

                fillControls();
                updateSummary();
                pushLog('Quick strategy applied.', 'muted');
            };
        }

        $all('[data-collapse]').forEach(function (btn) {
            btn.onclick = function (e) {
                e.stopPropagation();
                var block = btn.closest('.bbs-block');
                if (!block) return;
                block.classList.toggle('collapsed');
                btn.textContent = block.classList.contains('collapsed') ? '+' : '−';
            };
        });

        ['botMarketGroup', 'botTradeFamily', 'botContract', 'botDirection', 'botStrategy', 'botPrediction', 'botDurationUnit', 'botDuration', 'botStake', 'botCooldown', 'botMaxOpen', 'botRestart', 'botBulkPurchase', 'botNumTrades', 'botSymbol'].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;

            el.onchange = function () {
                fillControls();
                updateSummary();

                if (id === 'botSymbol' && botState.running) {
                    ensureSymbolSubscription(readConfig().symbol);
                }
            };
        });

        var runBtn = $('#bbsRunBtn');
        if (runBtn) {
            runBtn.onclick = function () {
                if (botState.running) stopBot();
                else startBot();
            };
        }

        var resetBtn = $('#bbsResetBtn');
        if (resetBtn) {
            resetBtn.onclick = function () {
                resetBot();
            };
        }
    }

    function bindDrag() {
        if (document.body.dataset.botDragBound === '1') return;
        document.body.dataset.botDragBound = '1';

        document.addEventListener('pointerdown', function (e) {
            var head = e.target.closest('.bbs-block-head');
            if (!head) return;

            var block = head.closest('.bbs-block');
            var workspace = $('#bbsWorkspace');
            if (!block || !workspace) return;

            var rect = block.getBoundingClientRect();
            var wrect = workspace.getBoundingClientRect();

            botState.drag = {
                block: block,
                startX: e.clientX,
                startY: e.clientY,
                origLeft: rect.left - wrect.left + workspace.scrollLeft,
                origTop: rect.top - wrect.top + workspace.scrollTop
            };

            block.style.zIndex = '99';
        });

        document.addEventListener('pointermove', function (e) {
            if (!botState.drag) return;

            var d = botState.drag;
            var dx = e.clientX - d.startX;
            var dy = e.clientY - d.startY;

            d.block.style.left = (d.origLeft + dx) + 'px';
            d.block.style.top = (d.origTop + dy) + 'px';
        });

        document.addEventListener('pointerup', function () {
            if (!botState.drag) return;
            botState.drag.block.style.zIndex = '1';
            botState.drag = null;
        });
    }

    function readConfig() {
        return {
            marketGroup: $('#botMarketGroup') ? $('#botMarketGroup').value : 'synthetic',
            symbol: $('#botSymbol') ? $('#botSymbol').value : 'R_100',
            family: $('#botTradeFamily') ? $('#botTradeFamily').value : 'digits',
            contract: $('#botContract') ? $('#botContract').value : 'over_under',
            direction: $('#botDirection') ? $('#botDirection').value : 'DIGITUNDER',
            strategy: $('#botStrategy') ? $('#botStrategy').value : 'every_5_ticks',
            prediction: $('#botPrediction') ? (+$('#botPrediction').value || 5) : 5,
            durationUnit: $('#botDurationUnit') ? $('#botDurationUnit').value : 't',
            duration: $('#botDuration') ? (+$('#botDuration').value || 1) : 1,
            stake: $('#botStake') ? (+$('#botStake').value || 1) : 1,
            currency: $('#botCurrency') ? $('#botCurrency').value : ((window.authAccount && authAccount.currency) ? authAccount.currency : 'USD'),
            cooldown: ($('#botCooldown') ? (+$('#botCooldown').value || 5) : 5) * 1000,
            maxOpen: $('#botMaxOpen') ? (+$('#botMaxOpen').value || 3) : 3,
            restart: $('#botRestart') ? $('#botRestart').value : 'yes',
            bulkPurchase: $('#botBulkPurchase') ? $('#botBulkPurchase').value : 'yes',
            numTrades: $('#botNumTrades') ? (+$('#botNumTrades').value || 1) : 1
        };
    }

    function getLastDigit(symbol, quote) {
        var dp = 2;
        if (typeof mktDP === 'function') dp = mktDP(symbol);
        var fixed = Number(quote).toFixed(dp);
        var digits = fixed.replace(/\D/g, '');
        return digits ? +digits.charAt(digits.length - 1) : 0;
    }

    function shouldTrigger(conf, quote) {
        botState.tickBuffer.push(+quote);
        if (botState.tickBuffer.length > 10) botState.tickBuffer.shift();

        if (conf.strategy === 'every_5_ticks') {
            return botState.tickBuffer.length % 5 === 0;
        }

        if (conf.strategy === 'momentum_3' && botState.tickBuffer.length >= 4) {
            var a = botState.tickBuffer.slice(-4);
            return (a[0] < a[1] && a[1] < a[2] && a[2] < a[3]) ||
                (a[0] > a[1] && a[1] > a[2] && a[2] > a[3]);
        }

        if (conf.strategy === 'reversal_3' && botState.tickBuffer.length >= 4) {
            var b = botState.tickBuffer.slice(-4);
            return (b[0] < b[1] && b[1] < b[2] && b[2] < b[3]) ||
                (b[0] > b[1] && b[1] > b[2] && b[2] > b[3]);
        }

        var digit = getLastDigit(conf.symbol, quote);

        if (conf.strategy === 'digit_equals_prediction') {
            return digit === conf.prediction;
        }

        if (conf.strategy === 'digit_not_prediction') {
            return digit !== conf.prediction;
        }

        return false;
    }

    function buildProposalReq(conf, contractType) {
        var req = {
            proposal: 1,
            amount: conf.stake,
            basis: 'stake',
            contract_type: contractType,
            currency: conf.currency,
            duration: conf.duration,
            duration_unit: conf.durationUnit,
            symbol: conf.symbol
        };

        if (
            contractType === 'DIGITMATCH' ||
            contractType === 'DIGITDIFF' ||
            contractType === 'DIGITOVER' ||
            contractType === 'DIGITUNDER'
        ) {
            req.barrier = String(conf.prediction);
        }

        return req;
    }

    function canTrade(conf) {
        if (!window.authAccount) {
            pushLog('Please log in first.', 'err');
            return false;
        }

        if (!window.wsSend) {
            pushLog('WebSocket API unavailable.', 'err');
            return false;
        }

        if (Object.keys(botState.activeContracts).length >= conf.maxOpen) return false;
        if (Date.now() - botState.lastActionAt < conf.cooldown) return false;
        return true;
    }

    function executeTrade(conf) {
        if (!canTrade(conf)) return;

        var tradesToOpen = (conf.bulkPurchase === 'yes') ? Math.max(1, conf.numTrades) : 1;
        var allowed = Math.max(0, conf.maxOpen - Object.keys(botState.activeContracts).length);
        tradesToOpen = Math.min(tradesToOpen, allowed);
        if (!tradesToOpen) return;

        botState.lastActionAt = Date.now();

        var seq = Promise.resolve();

        for (var i = 0; i < tradesToOpen; i++) {
            seq = seq.then(function () {
                return wsSend(buildProposalReq(conf, conf.direction))
                    .then(function (res) {
                        return wsSend({
                            buy: res.proposal.id,
                            price: res.proposal.ask_price
                        }).then(function (buyRes) {
                            return {
                                proposal: res.proposal,
                                buy: buyRes.buy
                            };
                        });
                    })
                    .then(function (res) {
                        if (!res || !res.buy) return;

                        var id = res.buy.contract_id;
                        botState.activeContracts[id] = {
                            symbol: conf.symbol,
                            direction: conf.direction,
                            buy_price: +res.buy.buy_price || conf.stake
                        };

                        botState.metrics.runs += 1;
                        botState.metrics.totalStake += (+res.buy.buy_price || conf.stake || 0);
                        botState.metrics.totalPayout += (+res.proposal.payout || 0);

                        if (window.wsRaw) {
                            wsRaw({
                                proposal_open_contract: 1,
                                contract_id: id,
                                subscribe: 1
                            });
                        }

                        pushTransaction('Opened #' + id + ' on ' + conf.symbol + ' (' + conf.direction + ')', 'ok');
                        pushLog('Opened #' + id + ' on ' + conf.symbol, 'ok');
                        updateSummary();
                    })
                    .catch(function (err) {
                        pushLog('Trade failed: ' + (err && (err.message || err.code) ? (err.message || err.code) : 'Unknown'), 'err');
                    });
            });
        }
    }

    function ensureSymbolSubscription(symbol) {
        if (!window.wsSubTick) return;
        if (botState.subscribedSymbols[symbol]) return;

        botState.subscribedSymbols[symbol] = true;

        wsSubTick(symbol, function (tick) {
            if (!botState.running) return;

            var conf = readConfig();
            if (tick.symbol !== conf.symbol) return;

            if (shouldTrigger(conf, tick.quote)) {
                executeTrade(conf);
            }
        });
    }

    function bindTradeEvents() {
        if (botState.wsBound) return;
        botState.wsBound = true;

        if (window.wsOn) {
            wsOn('poc', function (c) {
                if (!c || !c.contract_id) return;
                if (!botState.activeContracts[c.contract_id]) return;
                if (!c.is_sold) return;

                var pnl = +c.profit || 0;
                delete botState.activeContracts[c.contract_id];

                botState.metrics.profit += pnl;
                if (pnl >= 0) botState.metrics.won += 1;
                else botState.metrics.lost += 1;

                pushTransaction(
                    '#' + c.contract_id + ' closed: ' + (pnl >= 0 ? 'WIN ' : 'LOSS ') + fmtMoney(Math.abs(pnl)),
                    pnl >= 0 ? 'ok' : 'err'
                );

                pushLog(
                    '#' + c.contract_id + ' closed: ' + (pnl >= 0 ? 'WIN ' : 'LOSS ') + fmtMoney(Math.abs(pnl)),
                    pnl >= 0 ? 'ok' : 'err'
                );

                updateSummary();

                var conf = readConfig();
                if (conf.restart === 'no') {
                    stopBot();
                }
            });
        }
    }

    function startBot() {
        var conf = readConfig();

        if (!window.authAccount) {
            pushLog('Login first before starting the bot.', 'err');
            return;
        }

        botState.running = true;
        botState.tickBuffer = [];
        botState.lastActionAt = 0;

        ensureSymbolSubscription(conf.symbol);
        updateSummary();
        pushLog('Bot started on ' + conf.symbol + ' with ' + conf.contract + ' / ' + conf.direction, 'ok');
    }

    function stopBot() {
        botState.running = false;
        updateSummary();
        pushLog('Bot stopped.', 'muted');
    }

    function resetBot() {
        botState.running = false;
        botState.activePanel = 'summary';
        botState.logs = [];
        botState.transactions = [];
        botState.metrics = {
            runs: 0,
            totalStake: 0,
            totalPayout: 0,
            won: 0,
            lost: 0,
            profit: 0
        };
        botState.activeContracts = {};
        botState.tickBuffer = [];
        botState.lastActionAt = 0;
        renderAll();
        pushLog('Bot reset.', 'muted');
    }

    function renderAll() {
        renderTabs();
        renderLogs();
        renderTransactions();
        updateSummary();
    }

    function activatePage() {
        var page = document.getElementById(BOT_PAGE_ID);
        if (!page) return;

        page.innerHTML = '';
        page.insertAdjacentHTML('afterbegin', botMarkup());

        $all('.pg').forEach(function (p) {
            p.classList.remove('active');
            p.style.display = '';
        });
        page.classList.add('active');

        $all('.anav').forEach(function (a) { a.classList.remove('active'); });
        $all('.mnav[data-page]').forEach(function (a) { a.classList.remove('active'); });

        var d = $('.anav[data-page="bot"]');
        if (d) d.classList.add('active');
        var m = $('.mnav[data-page="bot"]');
        if (m) m.classList.add('active');

        fillControls();
        bindTabs();
        bindLocalControls();
        bindTradeEvents();
        placeBlocks();
        renderAll();
        pushLog('Bot builder ready.', 'muted');
    }

    function bootstrap() {
        if (botState.booted) return;
        botState.booted = true;
        ensureStyles();
        bindDrag();
    }

    window.botInit = function () {
        bootstrap();
        activatePage();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();