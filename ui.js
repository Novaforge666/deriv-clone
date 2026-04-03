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

    list.sort(function (a, b) {
        if (a.token === currentToken) return -1;
        if (b.token === currentToken) return 1;
        return 0;
    });

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

    var map = {
        dashboard: 'pgDashboard',
        trading: 'pgTrading',
        bot: 'pgBot',
        reports: 'pgReports',
        cashier: 'pgCashier'
    };

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
                if (authAccount) tradeSubProposals();
            });
        });
    }

    if (pg === 'bot' && typeof botRefreshUI === 'function') {
        botRefreshUI();
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