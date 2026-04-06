(function () {
    var BOT_PAGE_ID = 'pgBot';
    var BOT_ROUTE = 'bot';
    var booted = false;

    function qs(sel, root) {
        return (root || document).querySelector(sel);
    }

    function qsa(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    function ensureBotStyles() {
        if (document.getElementById('bot-inline-style')) return;

        var style = document.createElement('style');
        style.id = 'bot-inline-style';
        style.textContent = `
            /* ===== BOT BUILDER SELF-CONTAINED ===== */
            #${BOT_PAGE_ID} {
                height: 100%;
                min-height: 0;
            }

            #${BOT_PAGE_ID}.active {
                display: block;
            }

            .botbuilder-shell {
                height: 100%;
                min-height: 520px;
                display: flex;
                flex-direction: column;
                background: #101112;
                color: #fff;
            }

            .botbuilder-top {
                height: 44px;
                border-bottom: 1px solid #2a2d2d;
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
                padding: 0 14px;
                border: 0;
                border-radius: 6px;
                background: #18bca0;
                color: #fff;
                font-size: 12px;
                font-weight: 700;
                font-family: inherit;
                cursor: pointer;
            }

            .bbs-run:hover {
                filter: brightness(1.06);
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
                grid-template-columns: 190px minmax(0, 1fr) 280px;
            }

            .bbs-left {
                border-right: 1px solid #2a2d2d;
                padding: 12px;
                background: #0f1011;
            }

            .bbs-quick {
                width: 100%;
                height: 30px;
                border: 0;
                border-radius: 4px;
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
                background: #0e0f10;
            }

            .bbs-toolbar {
                height: 40px;
                border-bottom: 1px solid #2a2d2d;
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

            .bbs-tool:hover {
                background: #232628;
                color: #fff;
            }

            .bbs-workspace {
                flex: 1;
                min-height: 520px;
                overflow: auto;
                padding: 18px;
                position: relative;
            }

            .bbs-block {
                background: #0f5d86;
                border-radius: 4px;
                padding: 10px;
                color: #fff;
                width: 320px;
                margin-bottom: 14px;
                box-shadow: 0 8px 24px rgba(0,0,0,.18);
            }

            .bbs-block.small {
                width: 260px;
            }

            .bbs-block.right {
                margin-left: 380px;
            }

            .bbs-block.wide {
                width: 520px;
            }

            .bbs-block-title {
                font-size: 12px;
                font-weight: 700;
                margin-bottom: 10px;
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
                height: 26px;
                border: 0;
                border-radius: 999px;
                background: #fff;
                color: #111;
                padding: 0 10px;
                font-size: 12px;
                font-family: inherit;
            }

            .bbs-right {
                border-left: 1px solid #2a2d2d;
                background: #141617;
                display: flex;
                flex-direction: column;
            }

            .bbs-right-tabs {
                height: 44px;
                border-bottom: 1px solid #2a2d2d;
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
                cursor: pointer;
                font-family: inherit;
            }

            .bbs-rtab.active {
                color: #fff;
                border-bottom: 2px solid #ff444f;
                padding-bottom: 8px;
            }

            .bbs-summary-box {
                flex: 1;
                padding: 14px;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }

            .bbs-summary-empty {
                flex: 1;
                min-height: 240px;
                border: 1px solid #2a2d2d;
                background: #111214;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #c2c7c7;
                font-size: 13px;
                line-height: 1.6;
                padding: 16px;
            }

            .bbs-metrics {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 12px;
                margin-bottom: 12px;
            }

            .bbs-metrics span {
                display: block;
                font-size: 10px;
                color: #6e7575;
                margin-bottom: 4px;
            }

            .bbs-metrics strong {
                font-size: 12px;
                color: #fff;
            }

            .bbs-reset {
                height: 34px;
                border: 1px solid #2a2d2d;
                background: transparent;
                color: #fff;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
            }

            @media (max-width: 1100px) {
                .botbuilder-body {
                    grid-template-columns: 180px minmax(0, 1fr);
                }

                .bbs-right {
                    display: none;
                }
            }

            @media (max-width: 700px) {
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
                    width: 100%;
                    margin-left: 0;
                }

                .bbs-block.right {
                    margin-left: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function botShellHTML() {
        return `
            <div class="botbuilder-shell">
                <div class="botbuilder-top">
                    <div class="botbuilder-subnav">
                        <button class="bbs-tab">Dashboard</button>
                        <button class="bbs-tab active">Bot Builder</button>
                        <button class="bbs-tab">Charts</button>
                        <button class="bbs-tab">Tutorials</button>
                    </div>

                    <div class="bbs-runbar">
                        <button class="bbs-run" id="bbsRunBtn" type="button">
                            <i class="fas fa-play"></i> Run
                        </button>
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
                        <button class="bbs-quick">Quick strategy</button>

                        <div class="bbs-menu-box">
                            <div class="bbs-menu-head">
                                <span>Blocks menu</span>
                                <i class="fas fa-chevron-up"></i>
                            </div>

                            <div class="bbs-search">
                                <i class="fas fa-search"></i>
                                <input type="text" placeholder="Search">
                            </div>

                            <div class="bbs-menu-list">
                                <button class="bbs-menu-item active">Trade parameters</button>
                                <button class="bbs-menu-item">Purchase conditions</button>
                                <button class="bbs-menu-item">Sell conditions</button>
                                <button class="bbs-menu-item">Restart conditions</button>
                                <button class="bbs-menu-item">Analysis</button>
                                <button class="bbs-menu-item">Utility</button>
                            </div>
                        </div>
                    </aside>

                    <main class="bbs-center">
                        <div class="bbs-toolbar">
                            <button class="bbs-tool"><i class="fas fa-sync"></i></button>
                            <button class="bbs-tool"><i class="far fa-folder-open"></i></button>
                            <button class="bbs-tool"><i class="far fa-save"></i></button>
                            <button class="bbs-tool"><i class="fas fa-flag"></i></button>
                            <button class="bbs-tool"><i class="fas fa-chart-line"></i></button>
                            <button class="bbs-tool"><i class="fas fa-undo"></i></button>
                            <button class="bbs-tool"><i class="fas fa-redo"></i></button>
                            <button class="bbs-tool"><i class="fas fa-search-plus"></i></button>
                            <button class="bbs-tool"><i class="fas fa-search-minus"></i></button>
                        </div>

                        <div class="bbs-workspace">
                            <div class="bbs-block bbs-block-blue">
                                <div class="bbs-block-title">1. Trade parameters</div>
                                <div class="bbs-row-grid">
                                    <select><option>Deriv</option></select>
                                    <select><option>Continuous Indices</option></select>
                                    <select><option>Volatility 10 (1s) Index</option></select>
                                </div>
                                <div class="bbs-row-grid">
                                    <select><option>Digits</option></select>
                                    <select><option>Over/Under</option></select>
                                </div>
                                <div class="bbs-row-grid">
                                    <select><option>Under</option></select>
                                    <select><option>1 minute</option></select>
                                </div>
                            </div>

                            <div class="bbs-block bbs-block-blue small">
                                <div class="bbs-block-title">2. Purchase conditions</div>
                                <div class="bbs-inline">
                                    <span>Purchase</span>
                                    <select><option>Under</option></select>
                                </div>
                            </div>

                            <div class="bbs-block bbs-block-blue small right">
                                <div class="bbs-block-title">3. Sell conditions</div>
                                <div class="bbs-inline">
                                    <span>If sell is available then</span>
                                </div>
                            </div>

                            <div class="bbs-block bbs-block-blue small right">
                                <div class="bbs-block-title">4. Restart trading conditions</div>
                                <div class="bbs-inline">
                                    <span>Trade again</span>
                                </div>
                            </div>

                            <div class="bbs-block bbs-block-blue wide">
                                <div class="bbs-block-title">Trade options</div>
                                <div class="bbs-inline-wrap">
                                    <span>Duration</span>
                                    <select><option>Ticks</option></select>
                                    <input type="number" value="1">
                                    <span>Stake</span>
                                    <input type="number" value="0.35">
                                    <span>Prediction</span>
                                    <input type="number" value="5">
                                </div>
                            </div>
                        </div>
                    </main>

                    <aside class="bbs-right">
                        <div class="bbs-right-tabs">
                            <button class="bbs-rtab active">Summary</button>
                            <button class="bbs-rtab">Transactions</button>
                            <button class="bbs-rtab">Journal</button>
                        </div>

                        <div class="bbs-summary-box">
                            <div class="bbs-summary-empty" id="bbsSummaryText">
                                Bot builder shell ready.<br>
                                Next step is wiring the block logic.
                            </div>

                            <div class="bbs-metrics">
                                <div><span>Total stake</span><strong>0.00 USD</strong></div>
                                <div><span>Total payout</span><strong>0.00 USD</strong></div>
                                <div><span>No. of runs</span><strong id="bbsRuns">0</strong></div>
                                <div><span>Contracts lost</span><strong>0</strong></div>
                                <div><span>Contracts won</span><strong>0</strong></div>
                                <div><span>Total profit/loss</span><strong>0.00 USD</strong></div>
                            </div>

                            <button class="bbs-reset" id="bbsResetBtn" type="button">Reset</button>
                        </div>
                    </aside>
                </div>
            </div>
        `;
    }

    function ensureBotPage() {
        var appBody = qs('.app-body');
        if (!appBody) return null;

        var page = document.getElementById(BOT_PAGE_ID);
        if (!page) {
            page = document.createElement('div');
            page.className = 'pg';
            page.id = BOT_PAGE_ID;
            appBody.appendChild(page);
        }

        if (!page.dataset.botReady) {
            page.innerHTML = botShellHTML();
            page.dataset.botReady = '1';
        }

        return page;
    }

    function setNavActive() {
        qsa('.anav').forEach(function (a) { a.classList.remove('active'); });
        qsa('.mnav[data-page]').forEach(function (a) { a.classList.remove('active'); });

        var d = qs('.anav[data-page="' + BOT_ROUTE + '"]');
        if (d) d.classList.add('active');

        var m = qs('.mnav[data-page="' + BOT_ROUTE + '"]');
        if (m) m.classList.add('active');
    }

    function showBotPage() {
        ensureBotStyles();
        var page = ensureBotPage();
        if (!page) return;

        if (typeof uiCloseMob === 'function') uiCloseMob();
        if (typeof uiCloseAccDD === 'function') uiCloseAccDD();
        if (typeof uiCloseTraderPanels === 'function') uiCloseTraderPanels();

        qsa('.pg').forEach(function (p) {
            p.classList.remove('active');
            p.style.display = '';
        });

        page.classList.add('active');
        setNavActive();
    }

    function ensureNavLinks() {
        var appNav = qs('#appNav');
        if (appNav && !qs('.anav[data-page="' + BOT_ROUTE + '"]', appNav)) {
            var reports = qs('.anav[data-page="reports"]', appNav);
            var link = document.createElement('a');
            link.className = 'anav';
            link.dataset.page = BOT_ROUTE;
            link.innerHTML = '<i class="fas fa-robot"></i> Bot';
            if (reports) appNav.insertBefore(link, reports);
            else appNav.appendChild(link);
        }

        var mobPanel = qs('.mob-panel');
        if (mobPanel && !qs('.mnav[data-page="' + BOT_ROUTE + '"]', mobPanel)) {
            var reportsMob = qs('.mnav[data-page="reports"]', mobPanel);
            var m = document.createElement('a');
            m.className = 'mnav';
            m.dataset.page = BOT_ROUTE;
            m.innerHTML = '<i class="fas fa-robot"></i> Bot';
            if (reportsMob) mobPanel.insertBefore(m, reportsMob);
            else mobPanel.appendChild(m);
        }
    }

    function patchRouting() {
        if (typeof window.uiGoPage === 'function' && !window.uiGoPage.__botPatched) {
            var original = window.uiGoPage;

            var wrapped = function (pg) {
                if (pg === BOT_ROUTE) {
                    showBotPage();
                    return;
                }
                return original(pg);
            };

            wrapped.__botPatched = true;
            window.uiGoPage = wrapped;
        }
    }

    function bindClicks() {
        if (document.body.dataset.botClicksBound) return;
        document.body.dataset.botClicksBound = '1';

        document.addEventListener('click', function (e) {
            var botNav = e.target.closest('.anav[data-page="' + BOT_ROUTE + '"], .mnav[data-page="' + BOT_ROUTE + '"]');
            if (botNav) {
                e.preventDefault();
                showBotPage();
                return;
            }

            if (e.target.closest('#bbsRunBtn')) {
                var fill = document.getElementById('bbsStatusFill');
                var runs = document.getElementById('bbsRuns');
                var txt = document.getElementById('bbsSummaryText');

                if (fill) fill.style.width = '100%';
                if (runs) runs.textContent = String((+runs.textContent || 0) + 1);
                if (txt) txt.innerHTML = 'Bot builder shell is active.<br>Logic layer is the next step.';
                return;
            }

            if (e.target.closest('#bbsResetBtn')) {
                var fill2 = document.getElementById('bbsStatusFill');
                var runs2 = document.getElementById('bbsRuns');
                var txt2 = document.getElementById('bbsSummaryText');

                if (fill2) fill2.style.width = '0%';
                if (runs2) runs2.textContent = '0';
                if (txt2) {
                    txt2.innerHTML = 'Bot builder shell ready.<br>Next step is wiring the block logic.';
                }
            }
        });
    }

    function bootBot() {
        ensureBotStyles();
        ensureNavLinks();
        ensureBotPage();
        patchRouting();
        bindClicks();
        booted = true;
    }

    window.botInit = function () {
        bootBot();
    };

    window.botShowPage = showBotPage;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootBot);
    } else {
        bootBot();
    }
})();