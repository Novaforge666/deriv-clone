(function () {
    var BOT_PAGE_ID = 'pgBot';
    var BOT_ROUTE = 'bot';

    var botState = {
        booted: false,
        running: false,
        drag: null,
        activeContractIds: {},
        metrics: {
            runs: 0,
            total_stake: 0,
            total_payout: 0,
            won: 0,
            lost: 0,
            profit: 0
        },
        tickBuffer: [],
        lastActionAt: 0,
        cooldownMs: 8000
    };

    function $(sel, root) {
        return (root || document).querySelector(sel);
    }

    function $all(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
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

            .bbs-run,
            .bbs-stop,
            .bbs-reset {
                height: 32px;
                padding: 0 14px;
                border: 0;
                border-radius: 6px;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
            }

            .bbs-run {
                background: #18bca0;
            }

            .bbs-stop {
                background: #ff444f;
            }

            .bbs-reset {
                background: transparent;
                border: 1px solid #2a2d2d;
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

            .bbs-left {
                border-right: 1px solid #262a2c;
                padding: 12px;
                background: #101214;
            }

            .bbs-quick {
                width: 100%;
                height: 32px;
                border: 0;
                border-radius: 6px;
                background: #ff444f;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
                font-family: inherit;
                margin-bottom: 12px;
            }

            .bbs-menu-box {
                border: 1px solid #2a2d2d;
                background: #121416;
                border-radius: 8px;
                overflow: hidden;
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
                min-height: 700px;
                overflow: auto;
                padding: 18px;
                position: relative;
                background:
                    linear-gradient(0deg, rgba(255,255,255,.015) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,.015) 1px, transparent 1px);
                background-size: 24px 24px;
            }

            .bbs-block {
                position: absolute;
                width: 330px;
                background: #0f5d86;
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

            .bbs-block-head {
                height: 34px;
                background: rgba(0,0,0,.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 10px;
                cursor: move;
                font-size: 12px;
                font-weight: 700;
            }

            .bbs-block-body {
                padding: 10px;
            }

            .bbs-row-grid {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-bottom: 8px;
            }

            .bbs-inline,
            .bbs-inline-wrap {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }

            .bbs-block select,
            .bbs-block input {
                height: 28px;
                border: 0;
                border-radius: 999px;
                background: #fff;
                color: #111;
                padding: 0 10px;
                font-size: 12px;
                font-family: inherit;
                outline: none;
            }

            .bbs-block label {
                display: block;
                font-size: 11px;
                font-weight: 700;
                margin-bottom: 6px;
                opacity: .95;
            }

            .bbs-field {
                flex: 1;
                min-width: 140px;
            }

            .bbs-field.full {
                min-width: 100%;
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

            .bbs-summary-box {
                flex: 1;
                min-height: 0;
                padding: 14px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .bbs-summary-card {
                border: 1px solid #2a2d2d;
                background: #111214;
                border-radius: 10px;
                padding: 12px;
            }

            .bbs-summary-title {
                font-size: 11px;
                font-weight: 700;
                color: #6e7575;
                text-transform: uppercase;
                margin-bottom: 10px;
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

            .bbs-journal {
                flex: 1;
                min-height: 180px;
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

    function botMarkup() {
        return `
            <div class="botbuilder-shell">
                <div class="botbuilder-top">
                    <div class="botbuilder-subnav">
                        <button class="bbs-tab" type="button">Dashboard</button>
                        <button class="bbs-tab active" type="button">Bot Builder</button>
                        <button class="bbs-tab" type="button">Charts</button>
                        <button class="bbs-tab" type="button">Tutorials</button>
                    </div>

                    <div class="bbs-runbar">
                        <button class="bbs-run" id="bbsRunBtn" type="button">
                            <i class="fas fa-play"></i> Run
                        </button>
                        <button class="bbs-stop" id="bbsStopBtn" type="button">
                            <i class="fas fa-stop"></i> Stop
                        </button>
                        <button class="bbs-reset" id="bbsResetBtn" type="button">Reset</button>

                        <div class="bbs-status">
                            <span class="bbs-status-label">Bot status</span>
                            <div class="bbs-status-track">
                                <div class="bbs-status-fill" id="bbsStatusFill"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="botbuilder-body">
                    <aside class="bbs-left">
                        <button class="bbs-quick" id="bbsQuickBtn" type="button">Quick strategy</button>

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
                                <button class="bbs-menu-item active" type="button">Trade parameters</button>
                                <button class="bbs-menu-item" type="button">Purchase conditions</button>
                                <button class="bbs-menu-item" type="button">Sell conditions</button>
                                <button class="bbs-menu-item" type="button">Restart conditions</button>
                                <button class="bbs-menu-item" type="button">Analysis</button>
                                <button class="bbs-menu-item" type="button">Utility</button>
                            </div>
                        </div>
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
                            <div class="bbs-block" data-block="params" data-x="20" data-y="20">
                                <div class="bbs-block-head">1. Trade parameters <i class="fas fa-grip-lines"></i></div>
                                <div class="bbs-block-body">
                                    <div class="bbs-row-grid">
                                        <div class="bbs-field">
                                            <label>Market group</label>
                                            <select id="botMarketGroup" aria-label="Bot market group"></select>
                                        </div>
                                        <div class="bbs-field">
                                            <label>Symbol</label>
                                            <select id="botSymbol" aria-label="Bot symbol"></select>
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field">
                                            <label>Trade type</label>
                                            <select id="botTradeType" aria-label="Bot trade type"></select>
                                        </div>
                                        <div class="bbs-field">
                                            <label>Direction</label>
                                            <select id="botDirection" aria-label="Bot direction"></select>
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field">
                                            <label>Strategy</label>
                                            <select id="botStrategy" aria-label="Bot strategy"></select>
                                        </div>
                                        <div class="bbs-field" id="botPredictionWrap">
                                            <label>Prediction</label>
                                            <input id="botPrediction" type="number" min="0" max="9" value="5" aria-label="Prediction digit">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bbs-block small" data-block="purchase" data-x="40" data-y="260">
                                <div class="bbs-block-head">2. Purchase conditions <i class="fas fa-grip-lines"></i></div>
                                <div class="bbs-block-body">
                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Cooldown (seconds)</label>
                                            <input id="botCooldown" type="number" min="1" value="8" aria-label="Cooldown seconds">
                                        </div>
                                    </div>

                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Max open bot trades</label>
                                            <input id="botMaxOpen" type="number" min="1" value="1" aria-label="Max open bot trades">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bbs-block small" data-block="restart" data-x="420" data-y="80">
                                <div class="bbs-block-head">3. Restart trading conditions <i class="fas fa-grip-lines"></i></div>
                                <div class="bbs-block-body">
                                    <div class="bbs-row-grid">
                                        <div class="bbs-field full">
                                            <label>Restart after sell</label>
                                            <select id="botRestart" aria-label="Restart mode">
                                                <option value="yes">Trade again</option>
                                                <option value="no">Stop after sell</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bbs-block wide" data-block="options" data-x="240" data-y="340">
                                <div class="bbs-block-head">4. Trade options <i class="fas fa-grip-lines"></i></div>
                                <div class="bbs-block-body">
                                    <div class="bbs-inline-wrap">
                                        <span>Duration</span>
                                        <select id="botDurationUnit" aria-label="Duration unit">
                                            <option value="t">Ticks</option>
                                            <option value="s">Seconds</option>
                                            <option value="m" selected>Minutes</option>
                                        </select>

                                        <input id="botDuration" type="number" min="1" value="1" aria-label="Duration value">

                                        <span>Stake</span>
                                        <input id="botStake" type="number" min="0.35" step="0.01" value="1" aria-label="Stake">

                                        <span>Currency</span>
                                        <input id="botCurrency" type="text" value="USD" aria-label="Currency" readonly>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <aside class="bbs-right">
                        <div class="bbs-right-tabs">
                            <button class="bbs-rtab active" type="button">Summary</button>
                            <button class="bbs-rtab" type="button">Transactions</button>
                            <button class="bbs-rtab" type="button">Journal</button>
                        </div>

                        <div class="bbs-summary-box">
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

                            <div class="bbs-journal">
                                <div class="bbs-summary-title">Journal</div>
                                <div class="bbs-log" id="bbsLog"></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        `;
    }

    function ensureBotNav() {
        var appNav = $('#appNav');
        if (appNav && !$('.anav[data-page="' + BOT_ROUTE + '"]', appNav)) {
            var reports = $('.anav[data-page="reports"]', appNav);
            var link = document.createElement('a');
            link.className = 'anav';
            link.dataset.page = BOT_ROUTE;
            link.innerHTML = '<i class="fas fa-robot"></i> Bot';
            if (reports) appNav.insertBefore(link, reports);
            else appNav.appendChild(link);
        }

        var mobPanel = $('.mob-panel');
        if (mobPanel && !$('.mnav[data-page="' + BOT_ROUTE + '"]', mobPanel)) {
            var reportsMob = $('.mnav[data-page="reports"]', mobPanel);
            var m = document.createElement('a');
            m.className = 'mnav';
            m.dataset.page = BOT_ROUTE;
            m.innerHTML = '<i class="fas fa-robot"></i> Bot';
            if (reportsMob) mobPanel.insertBefore(m, reportsMob);
            else mobPanel.appendChild(m);
        }
    }

    function ensureBotPage() {
        var appBody = $('.app-body');
        if (!appBody) return null;

        var page = document.getElementById(BOT_PAGE_ID);
        if (!page) {
            page = document.createElement('div');
            page.className = 'pg';
            page.id = BOT_PAGE_ID;
            appBody.appendChild(page);
        }

        page.innerHTML = botMarkup();
        return page;
    }

    function setPageActive() {
        $all('.pg').forEach(function (p) {
            p.classList.remove('active');
            p.style.display = '';
        });

        var page = document.getElementById(BOT_PAGE_ID);
        if (page) page.classList.add('active');

        $all('.anav').forEach(function (a) { a.classList.remove('active'); });
        $all('.mnav[data-page]').forEach(function (a) { a.classList.remove('active'); });

        var d = $('.anav[data-page="' + BOT_ROUTE + '"]');
        if (d) d.classList.add('active');

        var m = $('.mnav[data-page="' + BOT_ROUTE + '"]');
        if (m) m.classList.add('active');
    }

    function getMarketsByGroup(group) {
        if (typeof MARKETS === 'undefined') {
            return [
                { s: 'R_100', n: 'Volatility 100 Index' }
            ];
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

    function getTradeTypeOptions() {
        return [
            { v: 'rise_fall', t: 'Rise/Fall' },
            { v: 'higher_lower', t: 'Higher/Lower' },
            { v: 'even_odd', t: 'Even/Odd' },
            { v: 'matches_differs', t: 'Matches/Differs' },
            { v: 'over_under', t: 'Over/Under' }
        ];
    }

    function getDirectionOptions(type) {
        if (type === 'rise_fall') return [
            { v: 'CALL', t: 'Rise' },
            { v: 'PUT', t: 'Fall' }
        ];
        if (type === 'higher_lower') return [
            { v: 'CALL', t: 'Higher' },
            { v: 'PUT', t: 'Lower' }
        ];
        if (type === 'even_odd') return [
            { v: 'DIGITEVEN', t: 'Even' },
            { v: 'DIGITODD', t: 'Odd' }
        ];
        if (type === 'matches_differs') return [
            { v: 'DIGITMATCH', t: 'Matches' },
            { v: 'DIGITDIFF', t: 'Differs' }
        ];
        return [
            { v: 'DIGITOVER', t: 'Over' },
            { v: 'DIGITUNDER', t: 'Under' }
        ];
    }

    function getStrategyOptions(type) {
        if (type === 'rise_fall' || type === 'higher_lower') {
            return [
                { v: 'momentum_3', t: 'Momentum (3 ticks)' },
                { v: 'reversal_3', t: 'Reversal (3 ticks)' },
                { v: 'every_5', t: 'Every 5 ticks' }
            ];
        }

        return [
            { v: 'every_5', t: 'Every 5 ticks' },
            { v: 'digit_match_signal', t: 'When current digit matches prediction' },
            { v: 'digit_diff_signal', t: 'When current digit differs from prediction' }
        ];
    }

    function botLog(msg, kind) {
        var log = $('#bbsLog');
        if (!log) return;

        var line = document.createElement('div');
        line.className = 'bbs-log-line ' + (kind || 'muted');
        line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        log.prepend(line);
    }

    function botConfig() {
        return {
            market_group: $('#botMarketGroup') ? $('#botMarketGroup').value : 'synthetic',
            symbol: $('#botSymbol') ? $('#botSymbol').value : 'R_100',
            trade_type: $('#botTradeType') ? $('#botTradeType').value : 'rise_fall',
            direction: $('#botDirection') ? $('#botDirection').value : 'CALL',
            strategy: $('#botStrategy') ? $('#botStrategy').value : 'momentum_3',
            prediction: $('#botPrediction') ? +$('#botPrediction').value || 5 : 5,
            duration_unit: $('#botDurationUnit') ? $('#botDurationUnit').value : 'm',
            duration: $('#botDuration') ? +$('#botDuration').value || 1 : 1,
            stake: $('#botStake') ? +$('#botStake').value || 1 : 1,
            currency: $('#botCurrency') ? $('#botCurrency').value : (window.authAccount ? authAccount.currency : 'USD'),
            cooldown: $('#botCooldown') ? (+$('#botCooldown').value || 8) * 1000 : 8000,
            max_open: $('#botMaxOpen') ? +$('#botMaxOpen').value || 1 : 1,
            restart: $('#botRestart') ? $('#botRestart').value : 'yes'
        };
    }

    function updateSummaryUI() {
        var cfg = botConfig();

        var statusText = $('#bbsStatusText');
        var symbolText = $('#bbsSymbolText');
        var typeText = $('#bbsTypeText');

        if (statusText) {
            statusText.textContent = botState.running ? 'Running' : 'Stopped';
            statusText.className = botState.running ? 'bbs-status-live' : 'bbs-status-stop';
        }

        if (symbolText) {
            symbolText.textContent = cfg.symbol;
        }

        if (typeText) {
            typeText.textContent = cfg.trade_type;
        }

        var stakeTotal = $('#bbsStakeTotal');
        if (stakeTotal) stakeTotal.textContent = botState.metrics.total_stake.toFixed(2);

        var payoutTotal = $('#bbsPayoutTotal');
        if (payoutTotal) payoutTotal.textContent = botState.metrics.total_payout.toFixed(2);

        var runs = $('#bbsRuns');
        if (runs) runs.textContent = String(botState.metrics.runs);

        var won = $('#bbsWon');
        if (won) won.textContent = String(botState.metrics.won);

        var lost = $('#bbsLost');
        if (lost) lost.textContent = String(botState.metrics.lost);

        var profit = $('#bbsProfitTotal');
        if (profit) profit.textContent = botState.metrics.profit.toFixed(2);

        var fill = $('#bbsStatusFill');
        if (fill) fill.style.width = botState.running ? '100%' : '0%';

        var cur = $('#botCurrency');
        if (cur && window.authAccount && authAccount.currency) {
            cur.value = authAccount.currency;
        }
    }

    function updateDependentControls() {
        var marketGroup = $('#botMarketGroup');
        var symbol = $('#botSymbol');
        var tradeType = $('#botTradeType');
        var direction = $('#botDirection');
        var strategy = $('#botStrategy');
        var predictionWrap = $('#botPredictionWrap');

        if (marketGroup && !marketGroup.dataset.filled) {
            fillSelect(marketGroup, [
                { v: 'synthetic', t: 'Synthetic' },
                { v: 'forex', t: 'Forex' },
                { v: 'commodities', t: 'Commodities' }
            ], 'v', 't', 'synthetic');
            marketGroup.dataset.filled = '1';
        }

        if (tradeType && !tradeType.dataset.filled) {
            fillSelect(tradeType, getTradeTypeOptions(), 'v', 't', 'rise_fall');
            tradeType.dataset.filled = '1';
        }

        if (marketGroup && symbol) {
            var items = getMarketsByGroup(marketGroup.value);
            var old = symbol.value;
            fillSelect(symbol, items.map(function (m) {
                return { v: m.s, t: m.n };
            }), 'v', 't', old || (items[0] ? items[0].s : 'R_100'));
        }

        if (tradeType && direction) {
            var dirs = getDirectionOptions(tradeType.value);
            var oldDir = direction.value;
            fillSelect(direction, dirs, 'v', 't', oldDir || dirs[0].v);
        }

        if (tradeType && strategy) {
            var strategies = getStrategyOptions(tradeType.value);
            var oldStrat = strategy.value;
            fillSelect(strategy, strategies, 'v', 't', oldStrat || strategies[0].v);
        }

        if (predictionWrap) {
            predictionWrap.style.display =
                (tradeType && (tradeType.value === 'matches_differs' || tradeType.value === 'over_under'))
                    ? ''
                    : 'none';
        }

        updateSummaryUI();
    }

    function buildProposalReq(cfg, contractType) {
        var req = {
            proposal: 1,
            amount: cfg.stake,
            basis: 'stake',
            contract_type: contractType,
            currency: cfg.currency,
            duration: cfg.duration,
            duration_unit: cfg.duration_unit,
            symbol: cfg.symbol
        };

        if (
            contractType === 'DIGITMATCH' ||
            contractType === 'DIGITDIFF' ||
            contractType === 'DIGITOVER' ||
            contractType === 'DIGITUNDER'
        ) {
            req.barrier = String(cfg.prediction);
        }

        return req;
    }

    function currentOpenBotTrades() {
        return Object.keys(botState.activeContractIds).length;
    }

    function botCanTrade(cfg) {
        if (!window.authAccount) {
            botLog('Not authorized. Login first.', 'err');
            return false;
        }

        if (!window.wsSend) {
            botLog('WebSocket API unavailable.', 'err');
            return false;
        }

        if (currentOpenBotTrades() >= cfg.max_open) return false;
        if (Date.now() - botState.lastActionAt < cfg.cooldown) return false;
        return true;
    }

    function pickSignal(cfg, quote) {
        botState.tickBuffer.push(+quote);
        if (botState.tickBuffer.length > 10) botState.tickBuffer.shift();

        if (cfg.strategy === 'every_5') {
            return botState.tickBuffer.length % 5 === 0;
        }

        if (cfg.strategy === 'momentum_3' && botState.tickBuffer.length >= 4) {
            var a = botState.tickBuffer.slice(-4);
            if (a[0] < a[1] && a[1] < a[2] && a[2] < a[3]) return true;
            if (a[0] > a[1] && a[1] > a[2] && a[2] > a[3]) return true;
        }

        if (cfg.strategy === 'reversal_3' && botState.tickBuffer.length >= 4) {
            var b = botState.tickBuffer.slice(-4);
            if (b[0] < b[1] && b[1] < b[2] && b[2] < b[3]) return true;
            if (b[0] > b[1] && b[1] > b[2] && b[2] > b[3]) return true;
        }

        if (cfg.strategy === 'digit_match_signal') {
            var last = getLastDigit(cfg.symbol, quote);
            return last === cfg.prediction;
        }

        if (cfg.strategy === 'digit_diff_signal') {
            var last2 = getLastDigit(cfg.symbol, quote);
            return last2 !== cfg.prediction;
        }

        return false;
    }

    function getLastDigit(symbol, quote) {
        var dp = 2;
        if (typeof mktDP === 'function') dp = mktDP(symbol);
        var fixed = Number(quote).toFixed(dp);
        var digits = fixed.replace(/\D/g, '');
        return digits ? +digits.charAt(digits.length - 1) : 0;
    }

    function openBotTrade(cfg) {
        if (!botCanTrade(cfg)) return;

        botState.lastActionAt = Date.now();

        wsSend(buildProposalReq(cfg, cfg.direction))
            .then(function (r) {
                return wsSend({
                    buy: r.proposal.id,
                    price: r.proposal.ask_price
                }).then(function (buyRes) {
                    return {
                        proposal: r.proposal,
                        buy: buyRes.buy
                    };
                });
            })
            .then(function (res) {
                if (!res || !res.buy) return;

                var id = res.buy.contract_id;
                botState.activeContractIds[id] = true;
                botState.metrics.runs += 1;
                botState.metrics.total_stake += (+res.buy.buy_price || +cfg.stake || 0);
                botState.metrics.total_payout += (+res.proposal.payout || 0);

                if (window.wsRaw) {
                    wsRaw({
                        proposal_open_contract: 1,
                        contract_id: id,
                        subscribe: 1
                    });
                }

                botLog('Opened contract #' + id + ' on ' + cfg.symbol + ' (' + cfg.direction + ')', 'ok');
                updateSummaryUI();
            })
            .catch(function (err) {
                botLog('Trade failed: ' + (err && (err.message || err.code) ? (err.message || err.code) : 'Unknown'), 'err');
            });
    }

    function startBot() {
        var cfg = botConfig();

        if (!window.authAccount) {
            botLog('Please log in first.', 'err');
            return;
        }

        botState.running = true;
        botState.tickBuffer = [];
        botState.lastActionAt = 0;
        botState.cooldownMs = cfg.cooldown;

        if (window.wsSubTick) {
            wsSubTick(cfg.symbol, function (tick) {
                if (!botState.running) return;

                var liveCfg = botConfig();
                if (tick.symbol !== liveCfg.symbol) return;

                if (pickSignal(liveCfg, tick.quote)) {
                    openBotTrade(liveCfg);
                }
            });
        }

        botLog('Bot started on ' + cfg.symbol + ' using ' + cfg.strategy, 'ok');
        updateSummaryUI();
    }

    function stopBot() {
        botState.running = false;
        botLog('Bot stopped.', 'muted');
        updateSummaryUI();
    }

    function resetBot() {
        botState.running = false;
        botState.activeContractIds = {};
        botState.tickBuffer = [];
        botState.lastActionAt = 0;
        botState.metrics = {
            runs: 0,
            total_stake: 0,
            total_payout: 0,
            won: 0,
            lost: 0,
            profit: 0
        };

        var log = $('#bbsLog');
        if (log) log.innerHTML = '';

        botLog('Bot reset.', 'muted');
        updateSummaryUI();
    }

    function bindSummaryUpdates() {
        if (window.wsOn && !document.body.dataset.botPocBound) {
            document.body.dataset.botPocBound = '1';

            wsOn('poc', function (c) {
                if (!c || !c.contract_id) return;
                if (!botState.activeContractIds[c.contract_id]) return;

                if (c.is_sold) {
                    delete botState.activeContractIds[c.contract_id];

                    var pnl = +c.profit || 0;
                    botState.metrics.profit += pnl;

                    if (pnl >= 0) botState.metrics.won += 1;
                    else botState.metrics.lost += 1;

                    botLog(
                        '#' + c.contract_id + ' closed: ' + (pnl >= 0 ? 'WIN ' : 'LOSS ') + pnl.toFixed(2),
                        pnl >= 0 ? 'ok' : 'err'
                    );

                    updateSummaryUI();

                    var restart = $('#botRestart');
                    if (restart && restart.value === 'no') {
                        botState.running = false;
                        updateSummaryUI();
                    }
                }
            });
        }
    }

    function bindControls() {
        if (document.body.dataset.botBuilderBound === '1') return;
        document.body.dataset.botBuilderBound = '1';

        document.addEventListener('change', function (e) {
            if (e.target.closest('#botMarketGroup, #botSymbol, #botTradeType, #botDirection, #botStrategy, #botPrediction, #botDurationUnit, #botDuration, #botStake, #botCooldown, #botMaxOpen, #botRestart')) {
                updateDependentControls();
            }
        });

        document.addEventListener('click', function (e) {
            if (e.target.closest('#bbsRunBtn')) {
                startBot();
                return;
            }

            if (e.target.closest('#bbsStopBtn')) {
                stopBot();
                return;
            }

            if (e.target.closest('#bbsResetBtn')) {
                resetBot();
                return;
            }

            if (e.target.closest('#bbsQuickBtn')) {
                var tradeType = $('#botTradeType');
                var strategy = $('#botStrategy');
                var direction = $('#botDirection');

                if (tradeType) tradeType.value = 'over_under';
                updateDependentControls();

                if (direction) direction.value = 'DIGITUNDER';
                if (strategy) strategy.value = 'digit_match_signal';
                updateDependentControls();

                botLog('Quick strategy applied.', 'muted');
                return;
            }
        });
    }

    function initDrag() {
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

            block.style.zIndex = '50';
            block.setPointerCapture && block.setPointerCapture(e.pointerId);
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

    function placeBlocks() {
        $all('.bbs-block').forEach(function (block) {
            var x = +(block.dataset.x || 0);
            var y = +(block.dataset.y || 0);
            block.style.left = x + 'px';
            block.style.top = y + 'px';
            block.style.zIndex = '1';
        });
    }

    function ensureNav() {
        var appNav = $('#appNav');
        if (appNav && !$('.anav[data-page="' + BOT_ROUTE + '"]', appNav)) {
            var reports = $('.anav[data-page="reports"]', appNav);
            var link = document.createElement('a');
            link.className = 'anav';
            link.dataset.page = BOT_ROUTE;
            link.innerHTML = '<i class="fas fa-robot"></i> Bot';
            if (reports) appNav.insertBefore(link, reports);
            else appNav.appendChild(link);
        }

        var mobPanel = $('.mob-panel');
        if (mobPanel && !$('.mnav[data-page="' + BOT_ROUTE + '"]', mobPanel)) {
            var reportsMob = $('.mnav[data-page="reports"]', mobPanel);
            var m = document.createElement('a');
            m.className = 'mnav';
            m.dataset.page = BOT_ROUTE;
            m.innerHTML = '<i class="fas fa-robot"></i> Bot';
            if (reportsMob) mobPanel.insertBefore(m, reportsMob);
            else mobPanel.appendChild(m);
        }
    }

    function activateBotPage() {
        var appBody = $('.app-body');
        if (!appBody) return;

        var page = document.getElementById(BOT_PAGE_ID);
        if (!page) {
            page = document.createElement('div');
            page.className = 'pg';
            page.id = BOT_PAGE_ID;
            appBody.appendChild(page);
        }

        page.innerHTML = botMarkup();

        $all('.pg').forEach(function (p) {
            p.classList.remove('active');
            p.style.display = '';
        });

        page.classList.add('active');

        $all('.anav').forEach(function (a) { a.classList.remove('active'); });
        $all('.mnav[data-page]').forEach(function (a) { a.classList.remove('active'); });

        var d = $('.anav[data-page="' + BOT_ROUTE + '"]');
        if (d) d.classList.add('active');

        var m = $('.mnav[data-page="' + BOT_ROUTE + '"]');
        if (m) m.classList.add('active');

        updateDependentControls();
        placeBlocks();
        bindSummaryUpdates();
        updateSummaryUI();
        botLog('Bot builder ready.', 'muted');
    }

    function initOptions() {
        fillSelect($('#botMarketGroup'), [
            { v: 'synthetic', t: 'Synthetic' },
            { v: 'forex', t: 'Forex' },
            { v: 'commodities', t: 'Commodities' }
        ], 'v', 't', 'synthetic');

        fillSelect($('#botTradeType'), getTradeTypeOptions(), 'v', 't', 'rise_fall');
        updateDependentControls();
    }

    function bootstrap() {
        if (botState.booted) return;
        botState.booted = true;

        ensureStyles();
        ensureNav();
        bindControls();
        initDrag();

        document.addEventListener('click', function (e) {
            var botLink = e.target.closest('.anav[data-page="bot"], .mnav[data-page="bot"]');
            if (!botLink) return;

            e.preventDefault();
            activateBotPage();
            initOptions();
        }, true);
    }

    window.botInit = function () {
        bootstrap();
        activateBotPage();
        initOptions();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }
})();