var botReady = false;

function botInit() {
    botEnsurePage();
    botReady = true;
}

function botEnsurePage() {
    var page = document.getElementById('pgBot');
    if (!page) return;

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
                        <div class="bbs-summary-empty">
                            Bot builder shell ready.<br>
                            Next step is wiring the block logic.
                        </div>

                        <div class="bbs-metrics">
                            <div><span>Total stake</span><strong>0.00 USD</strong></div>
                            <div><span>Total payout</span><strong>0.00 USD</strong></div>
                            <div><span>No. of runs</span><strong>0</strong></div>
                            <div><span>Contracts lost</span><strong>0</strong></div>
                            <div><span>Contracts won</span><strong>0</strong></div>
                            <div><span>Total profit/loss</span><strong>0.00 USD</strong></div>
                        </div>

                        <button class="bbs-reset" type="button">Reset</button>
                    </div>
                </aside>
            </div>
        </div>
    `;
}