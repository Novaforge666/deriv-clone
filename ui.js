var uiChromeBound = false;
var traderFoundationBound = false;

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

    el.querySelector('.t-x').onclick = function () {
        el.remove();
    };

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
                .catch(function (err) {
                    console.error('Account switch failed:', err);
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

            if (e.target.closest('#tradeFocusBtn')) {
                var panel = document.getElementById('trdPanel');
                if (panel) {
                    panel.classList.toggle('strategy-focused');

                    var icon = document.querySelector('#tradeFocusBtn i');
                    if (icon) {
                        icon.className = panel.classList.contains('strategy-focused')
                            ? 'fas fa-expand-alt'
                            : 'fas fa-compress-alt';
                    }
                }
                return;
            }

            var tpHead = e.target.closest('.foundation-panel .tp-head');
            if (tpHead && window.innerWidth <= 900 && !e.target.closest('button')) {
                var panel2 = document.getElementById('trdPanel');
                var backdrop = document.getElementById('tradeBackdrop');

                if (panel2) {
                    panel2.classList.toggle('open');
                    if (backdrop) backdrop.classList.toggle('open', panel2.classList.contains('open'));
                    uiSetBodyLock(panel2.classList.contains('open'));
                }
            }

        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            uiCloseAccDD();
            uiCloseMob();
            uiCloseTraderPanels();
        }
    });
}

function uiEnsureTraderFoundationControls() {
    var sideTop = document.querySelector('.trd-side .side-top');
    if (sideTop && !document.getElementById('mktToggleBtn')) {
        var btn = document.createElement('button');
        btn.className = 'side-close panel-toggle-btn';
        btn.id = 'mktToggleBtn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Toggle markets');
        btn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        sideTop.appendChild(btn);
    }

    var tradeTop = document.querySelector('.foundation-panel .tp-head');
    if (tradeTop && !document.getElementById('tradeToggleBtn')) {
        var btn2 = document.createElement('button');
        btn2.className = 'side-close panel-toggle-btn';
        btn2.id = 'tradeToggleBtn';
        btn2.type = 'button';
        btn2.setAttribute('aria-label', 'Toggle trade panel');
        btn2.innerHTML = '<i class="fas fa-chevron-right"></i>';
        tradeTop.appendChild(btn2);
    }

    if (tradeTop && !document.getElementById('tradeFocusBtn')) {
        var btn3 = document.createElement('button');
        btn3.className = 'trade-strategy-toggle';
        btn3.id = 'tradeFocusBtn';
        btn3.type = 'button';
        btn3.setAttribute('aria-label', 'Focus strategy');
        btn3.innerHTML = '<i class="fas fa-compress-alt"></i>';
        tradeTop.insertBefore(btn3, tradeTop.firstChild);
    }

    var chartShell = document.querySelector('.chart-shell');
    if (chartShell && !document.getElementById('mktExpandBtn')) {
        var left = document.createElement('button');
        left.className = 'edge-toggle left hidden';
        left.id = 'mktExpandBtn';
        left.type = 'button';
        left.setAttribute('aria-label', 'Expand markets');
        left.innerHTML = '<i class="fas fa-chevron-right"></i>';
        chartShell.appendChild(left);
    }

    if (chartShell && !document.getElementById('tradeExpandBtn')) {
        var right = document.createElement('button');
        right.className = 'edge-toggle right hidden';
        right.id = 'tradeExpandBtn';
        right.type = 'button';
        right.setAttribute('aria-label', 'Expand trade panel');
        right.innerHTML = '<i class="fas fa-chevron-left"></i>';
        chartShell.appendChild(right);
    }
}

function uiOpenTraderPanel(which) {
    var side = document.getElementById('trdSide');
    var panel = document.getElementById('trdPanel');
    var backdrop = document.getElementById('tradeBackdrop');

    if (which === 'markets' && side) {
        side.classList.add('open');
    }

    if (which === 'trade' && panel) {
        panel.classList.add('open');

        if (typeof tradeEnsureModeUI === 'function') tradeEnsureModeUI();
        if (typeof tradeRenderClassifier === 'function') tradeRenderClassifier();
        if (typeof tradeRenderDigitUI === 'function') tradeRenderDigitUI();

        panel.scrollTop = 0;
        var form = panel.querySelector('.tp-form');
        if (form) form.scrollTop = 0;
    }

    if (backdrop) backdrop.classList.add('open');
    uiSetBodyLock(true);
}

function uiCloseTraderPanels() {
    var side = document.getElementById('trdSide');
    var panel = document.getElementById('trdPanel');
    var backdrop = document.getElementById('tradeBackdrop');

    if (side) side.classList.remove('open');
    if (panel) panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');

    if (!document.getElementById('mobOverlay') || !document.getElementById('mobOverlay').classList.contains('open')) {
        uiSetBodyLock(false);
    }
}

function uiSyncTraderCollapseUI() {
    var root = document.querySelector('.trader-foundation');
    if (!root) return;

    var marketsCollapsed = root.classList.contains('markets-collapsed');
    var tradeCollapsed = root.classList.contains('trade-collapsed');

    var mktExpandBtn = document.getElementById('mktExpandBtn');
    var tradeExpandBtn = document.getElementById('tradeExpandBtn');
    var mktToggleBtn = document.getElementById('mktToggleBtn');
    var tradeToggleBtn = document.getElementById('tradeToggleBtn');

    if (mktExpandBtn) {
        mktExpandBtn.classList.toggle('hidden', !marketsCollapsed);
    }

    if (tradeExpandBtn) {
        tradeExpandBtn.classList.toggle('hidden', !tradeCollapsed);
    }

    if (mktToggleBtn) {
        mktToggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    }

    if (tradeToggleBtn) {
        tradeToggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    }
}

function uiToggleDesktopPanel(which, forceOpen) {
    var root = document.querySelector('.trader-foundation');
    if (!root) return;

    if (window.innerWidth <= 900) {
        if (which === 'markets') uiOpenTraderPanel('markets');
        if (which === 'trade') uiOpenTraderPanel('trade');
        return;
    }

    if (which === 'markets') {
        var willCollapse = typeof forceOpen === 'boolean'
            ? !forceOpen
            : !root.classList.contains('markets-collapsed');

        root.classList.toggle('markets-collapsed', willCollapse);
    }

    if (which === 'trade') {
        var willCollapseTrade = typeof forceOpen === 'boolean'
            ? !forceOpen
            : !root.classList.contains('trade-collapsed');

        root.classList.toggle('trade-collapsed', willCollapseTrade);
    }

    uiSyncTraderCollapseUI();

    if (typeof chartInit === 'function') {
        requestAnimationFrame(function () {
            chartInit();
            chartLoad(curSymbol, curGranularity);
            if (typeof tradeRenderDigitUI === 'function') tradeRenderDigitUI();
        });
    }
}

function uiBindTraderFoundation() {
    if (traderFoundationBound) return;
    traderFoundationBound = true;

    uiEnsureTraderFoundationControls();

    document.addEventListener('click', function (e) {
        if (e.target.closest('#openMarketsBtn')) {
            uiOpenTraderPanel('markets');
        }

        if (e.target.closest('#tradeStrategyToggleBtn')) {
            var panel = document.getElementById('trdPanel');
            if (panel) {
                panel.classList.toggle('strategy-collapsed');

                var icon = document.querySelector('#tradeStrategyToggleBtn i');
                if (icon) {
                    icon.className = panel.classList.contains('strategy-collapsed')
                        ? 'fas fa-chevron-down'
                        : 'fas fa-chevron-up';
                }
            }
            return;
        }

        var tpHead = e.target.closest('.foundation-panel .tp-head');
        if (tpHead && window.innerWidth <= 900 && !e.target.closest('button')) {
            var panel2 = document.getElementById('trdPanel');
            var backdrop = document.getElementById('tradeBackdrop');

            if (panel2) {
                panel2.classList.toggle('open');
                if (backdrop) backdrop.classList.toggle('open', panel2.classList.contains('open'));
                uiSetBodyLock(panel2.classList.contains('open'));
            }
        }

        if (e.target.closest('#openTradeBtn')) {
            uiOpenTraderPanel('trade');
        }

        if (e.target.closest('#mktCloseBtn') || e.target.closest('#tradeCloseBtn') || e.target.closest('#tradeBackdrop')) {
            uiCloseTraderPanels();
        }

        if (e.target.closest('#mktToggleBtn')) {
            if (window.innerWidth <= 900) uiCloseTraderPanels();
            else uiToggleDesktopPanel('markets');
        }

        if (e.target.closest('#tradeToggleBtn')) {
            if (window.innerWidth <= 900) uiCloseTraderPanels();
            else uiToggleDesktopPanel('trade');
        }

        if (e.target.closest('#mktExpandBtn')) {
            uiToggleDesktopPanel('markets', true);
        }

        if (e.target.closest('#tradeExpandBtn')) {
            uiToggleDesktopPanel('trade', true);
        }
    });

    uiSyncTraderCollapseUI();
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
    uiCloseTraderPanels();

    if (landing) landing.classList.remove('hidden');
    if (app) app.classList.add('hidden');
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
    uiCloseTraderPanels();

    document.querySelectorAll('.pg').forEach(function (p) {
        p.classList.remove('active');
        p.style.display = '';
    });

    var map = {
        dashboard: 'pgDashboard',
        trading: 'pgTrading',
        bot: 'pgBot',
        reports: 'pgReports',
        cashier: 'pgCashier'
    };

    if (pg === 'bot') {
        if (typeof botInit === 'function') botInit();
        if (typeof botEnsurePage === 'function') botEnsurePage();
    }

    var el = document.getElementById(map[pg]);
    if (el) el.classList.add('active');

    if (pg === 'trading') {
        var activeItem = document.querySelector('.ts-item[data-symbol="' + curSymbol + '"]');
        document.querySelectorAll('.ts-item').forEach(function (x) {
            x.classList.remove('active');
        });
        if (activeItem) activeItem.classList.add('active');

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                chartInit();
                chartLoad(curSymbol, curGranularity);

                if (typeof tradeEnsureModeUI === 'function') tradeEnsureModeUI();
                if (authAccount && typeof tradeSubProposals === 'function') tradeSubProposals();
                if (typeof tradeRenderDigitUI === 'function') tradeRenderDigitUI();
                if (typeof uiSyncTraderCollapseUI === 'function') uiSyncTraderCollapseUI();

                if (window.innerWidth <= 900) {
                    var panel = document.getElementById('trdPanel');
                    if (panel) panel.classList.remove('open');
                }
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
    uiBindTraderFoundation();
    uiUpdateBal(acct.balance, acct.currency);

    var tag = document.getElementById('apTag');
    if (tag) {
        tag.textContent = acct.is_virtual ? 'Demo' : 'Real';
        tag.className = 'ap-tag' + (acct.is_virtual ? '' : ' real');
    }

    var ct = document.getElementById('cashType');
    if (ct) {
        ct.textContent = acct.is_virtual ? 'Demo Account' : 'Real Account';
    }

    var stkCur = document.getElementById('stkCur');
    if (stkCur) stkCur.textContent = acct.currency || 'USD';

    uiBuildAccountDropdown();
}

function uiUpdateCashier() {
    if (authAccount) {
        uiUpdateBal(authAccount.balance, authAccount.currency);
    }
}