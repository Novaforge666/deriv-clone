var uiChromeBound = false;

function toast(type, msg) {
    var w = document.getElementById('toastWrap');
    if (!w) return;

    var ic = {
        s: 'fa-check-circle',
        e: 'fa-exclamation-circle',
        i: 'fa-info-circle'
    };

    var el = document.createElement('div');
    el.className = 'toast t-' + type;
    el.innerHTML =
        '<i class="t-ico fas ' + (ic[type] || ic.i) + '"></i>' +
        '<span class="t-msg">' + msg + '</span>' +
        '<button class="t-x" aria-label="Close"><i class="fas fa-times"></i></button>';

    var closeBtn = el.querySelector('.t-x');
    if (closeBtn) {
        closeBtn.onclick = function () {
            el.remove();
        };
    }

    w.appendChild(el);

    setTimeout(function () {
        if (el.parentElement) el.remove();
    }, 5000);
}

function uiSetBodyLock(lock) {
    document.body.classList.toggle('no-scroll', !!lock);
}

function uiCloseMob() {
    var mobOverlay = document.getElementById('mobOverlay');
    if (mobOverlay) mobOverlay.classList.remove('open');
    uiSetBodyLock(false);
}

function uiCloseAccDD() {
    var dd = document.getElementById('accDD');
    var pill = document.getElementById('accPill');

    if (dd) dd.classList.remove('open');
    if (pill) {
        pill.classList.remove('open');
        pill.setAttribute('aria-expanded', 'false');
    }
}

function uiToggleAccDD(force) {
    var dd = document.getElementById('accDD');
    var pill = document.getElementById('accPill');
    if (!dd || !pill) return;

    var willOpen = typeof force === 'boolean'
        ? force
        : !dd.classList.contains('open');

    dd.classList.toggle('open', willOpen);
    pill.classList.toggle('open', willOpen);
    pill.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

function uiBuildAccountDropdown() {
    var wrap = document.getElementById('accDD');
    if (!wrap) return;

    var currentToken = localStorage.getItem('deriv_token') || '';
    var list = (authAccounts && authAccounts.length) ? authAccounts.slice() : [];

    if (!list.length && authAccount) {
        list = [{
            id: authAccount.loginid,
            token: currentToken,
            cur: authAccount.currency,
            is_virtual: !!authAccount.is_virtual
        }];
    }

    if (!list.length) {
        wrap.innerHTML = '<div class="acc-dd-empty">No accounts found</div>';
        return;
    }

    wrap.innerHTML =
        '<div class="acc-dd-h">Accounts</div>' +
        list.map(function (acc) {
            var isCurrent = acc.token === currentToken;
            var isVirtual = authIsVirtualEntry(acc);
            var currency = acc.cur || (authAccount && authAccount.currency) || 'USD';

            return '' +
                '<button class="acc-item' + (isCurrent ? ' is-current' : '') + '" type="button" data-token="' + acc.token + '">' +
                '   <div class="acc-item-l">' +
                '       <div class="acc-item-top">' +
                '           <span class="acc-item-id">' + (acc.id || 'Account') + '</span>' +
                '           <span class="acc-chip ' + (isVirtual ? 'demo' : 'real') + '">' + (isVirtual ? 'Demo' : 'Real') + '</span>' +
                '       </div>' +
                '       <div class="acc-item-sub">' + currency + ' account</div>' +
                '   </div>' +
                '   <i class="fas fa-check acc-check"></i>' +
                '</button>';
        }).join('');

    wrap.querySelectorAll('.acc-item[data-token]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var token = btn.dataset.token;
            if (!token) return;

            if (token === currentToken) {
                uiCloseAccDD();
                return;
            }

            btn.disabled = true;

            authSwitchAccount(token)
                .then(function (acct) {
                    uiCloseAccDD();
                    onLoggedIn(acct);
                })
                .catch(function () {
                    toast('e', 'Could not switch account.');
                })
                .finally(function () {
                    btn.disabled = false;
                });
        });
    });
}

function uiBindChrome() {
    if (uiChromeBound) return;
    uiChromeBound = true;

    var accPill = document.getElementById('accPill');
    if (accPill) {
        accPill.setAttribute('aria-expanded', 'false');
        accPill.addEventListener('click', function (e) {
            e.stopPropagation();
            uiToggleAccDD();
        });
    }

    var accDD = document.getElementById('accDD');
    if (accDD) {
        accDD.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    }

    var mobOverlay = document.getElementById('mobOverlay');
    if (mobOverlay) {
        mobOverlay.addEventListener('click', function (e) {
            if (e.target === mobOverlay) uiCloseMob();
        });
    }

    document.addEventListener('click', function (e) {
        var pill = document.getElementById('accPill');
        var dd = document.getElementById('accDD');

        if (dd && dd.classList.contains('open')) {
            if (!dd.contains(e.target) && !(pill && pill.contains(e.target))) {
                uiCloseAccDD();
            }
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            uiCloseAccDD();
            uiCloseMob();
        }
    });
}

function uiShowApp() {
    var landing = document.getElementById('landingPage');
    var app = document.getElementById('appShell');

    if (landing) landing.classList.add('hidden');
    if (app) app.classList.remove('hidden');
}

function uiShowLanding() {
    var landing = document.getElementById('landingPage');
    var app = document.getElementById('appShell');

    uiCloseMob();
    uiCloseAccDD();

    if (landing) landing.classList.remove('hidden');
    if (app) app.classList.add('hidden');
}

function uiBotMarkup() {
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
                    <button class="bbs-quick" type="button">Quick strategy</button>

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

                    <div class="bbs-workspace">
                        <div class="bbs-block bbs-block-blue">
                            <div class="bbs-block-title">1. Trade parameters</div>
                            <div class="bbs-row-grid">
                                <select aria-label="Provider"><option>Deriv</option></select>
                                <select aria-label="Market type"><option>Continuous Indices</option></select>
                                <select aria-label="Symbol"><option>Volatility 10 (1s) Index</option></select>
                            </div>
                            <div class="bbs-row-grid">
                                <select aria-label="Trade type"><option>Digits</option></select>
                                <select aria-label="Contract type"><option>Over/Under</option></select>
                            </div>
                            <div class="bbs-row-grid">
                                <select aria-label="Direction"><option>Under</option></select>
                                <select aria-label="Candle interval"><option>1 minute</option></select>
                            </div>
                        </div>

                        <div class="bbs-block bbs-block-blue small">
                            <div class="bbs-block-title">2. Purchase conditions</div>
                            <div class="bbs-inline">
                                <span>Purchase</span>
                                <select aria-label="Purchase option"><option>Under</option></select>
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
                                <select aria-label="Bot duration unit"><option>Ticks</option></select>
                                <input type="number" value="1" aria-label="Bot duration">
                                <span>Stake</span>
                                <input type="number" value="0.35" aria-label="Bot stake">
                                <span>Prediction</span>
                                <input type="number" value="5" aria-label="Bot prediction">
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

function uiEnsureBotPage(force) {
    var appBody = document.querySelector('.app-body');
    if (!appBody) return null;

    var botPage = document.getElementById('pgBot');
    if (!botPage) {
        botPage = document.createElement('div');
        botPage.className = 'pg';
        botPage.id = 'pgBot';
        appBody.appendChild(botPage);
    }

    if (force || !botPage.querySelector('.botbuilder-shell')) {
        botPage.innerHTML = uiBotMarkup();
    }

    return botPage;
}

function uiGoPage(pg) {
    document.querySelectorAll('.anav').forEach(function (a) {
        a.classList.remove('active');
    });

    var na = document.querySelector('.anav[data-page="' + pg + '"]');
    if (na) na.classList.add('active');

    document.querySelectorAll('.mnav[data-page]').forEach(function (a) {
        a.classList.remove('active');
    });

    var ma = document.querySelector('.mnav[data-page="' + pg + '"]');
    if (ma) ma.classList.add('active');

    uiCloseMob();
    uiCloseAccDD();

    document.querySelectorAll('.pg').forEach(function (p) {
        p.classList.remove('active');
        p.style.display = '';
    });

    if (pg === 'bot') {
        var botPage = uiEnsureBotPage(true);
        if (botPage) botPage.classList.add('active');
        if (typeof botInit === 'function') botInit();
        return;
    }

    var map = {
        dashboard: 'pgDashboard',
        trading: 'pgTrading',
        reports: 'pgReports',
        cashier: 'pgCashier'
    };

    var el = document.getElementById(map[pg]);
    if (el) el.classList.add('active');

    if (pg === 'trading') {
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (typeof chartInit === 'function') chartInit();
                if (typeof chartLoad === 'function') chartLoad(curSymbol, curGranularity);
                if (authAccount && typeof tradeSubProposals === 'function') tradeSubProposals();
            });
        });
    }

    if (pg === 'cashier') {
        uiUpdateCashier();
    }
}

function uiUpdateBal(bal, cur) {
    var f = (+bal || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    var e1 = document.getElementById('apBal');
    if (e1) e1.textContent = f + ' ' + (cur || 'USD');

    var e2 = document.getElementById('dBal');
    if (e2) e2.textContent = '$' + f;

    var e3 = document.getElementById('cashBal');
    if (e3) e3.textContent = '$' + f;

    var stkCur = document.getElementById('stkCur');
    if (stkCur) stkCur.textContent = cur || 'USD';
}

function uiOnAuth(acct) {
    uiShowApp();
    uiBindChrome();
    uiUpdateBal(acct.balance, acct.currency);

    var tag = document.getElementById('apTag');
    if (tag) {
        tag.textContent = acct.is_virtual ? 'Demo' : 'Real';
        tag.className = 'ap-tag' + (acct.is_virtual ? '' : ' real');
    }

    var ct = document.getElementById('cashType');
    if (ct) ct.textContent = acct.is_virtual ? 'Demo Account' : 'Real Account';

    var stkCur = document.getElementById('stkCur');
    if (stkCur) stkCur.textContent = acct.currency || 'USD';

    uiBuildAccountDropdown();
    uiEnsureBotPage(false);
}

function uiUpdateCashier() {
    if (authAccount) {
        uiUpdateBal(authAccount.balance, authAccount.currency);
    }
}