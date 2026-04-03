var botReady = false;

function botInit() {
    if (botReady) return;
    botInjectNav();
    botEnsurePage();
    botBindBuilder();
    botReady = true;
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

function botEnsurePage() {
    var appBody = document.querySelector('.app-body');
    if (!appBody) return;

    var page = document.getElementById('pgBot');
    if (!page) {
        page = document.createElement('div');
        page.className = 'pg';
        page.id = 'pgBot';
        appBody.appendChild(page);
    }

    page.innerHTML = `
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
                            <button class="bbs-menu-item">Sell conditions (optional)</button>
                            <button class="bbs-menu-item">Restart trading conditions</button>
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
                            When you're ready to trade, hit Run.<br>
                            You'll be able to track your bot's performance here.
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

function botBindBuilder() {
    document.addEventListener('click', function (e) {
        if (e.target.closest('#bbsRunBtn')) {
            var fill = document.getElementById('bbsStatusFill');
            var runs = document.getElementById('bbsRuns');
            var txt = document.getElementById('bbsSummaryText');

            if (fill) fill.style.width = '100%';
            if (runs) runs.textContent = String((+runs.textContent || 0) + 1);
            if (txt) txt.innerHTML = 'Bot builder shell is active.<br>Next step is wiring the block logic.';
            if (typeof toast === 'function') {
                toast('i', 'Bot builder shell ready. Logic wiring is next.');
            }
        }

        if (e.target.closest('#bbsResetBtn')) {
            var fill2 = document.getElementById('bbsStatusFill');
            var runs2 = document.getElementById('bbsRuns');
            var txt2 = document.getElementById('bbsSummaryText');

            if (fill2) fill2.style.width = '0%';
            if (runs2) runs2.textContent = '0';
            if (txt2) {
                txt2.innerHTML = "When you're ready to trade, hit Run.<br>You'll be able to track your bot's performance here.";
            }
        }
    });
}