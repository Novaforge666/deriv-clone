var appBootstrapped = false;
var appNavBound = false;

document.addEventListener('DOMContentLoaded', function () {
    bindLandingActions();
    boot();
});

function bindLandingActions() {
    ['landLogin', 'heroLogin', 'ctaLogin', 'landMobBtn'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', function () {
                authStartOAuth();
            });
        }
    });

    ['landSignup', 'heroSignup', 'ctaSignup'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', function () {
                authStartSignup();
            });
        }
    });
}

function boot() {
    wsConnect()
        .then(function () {
            var oauthToken = authCheckOAuth();
            var token = oauthToken || localStorage.getItem('deriv_token');

            if (!token) {
                uiShowLanding();
                return;
            }

            authLogin(token)
                .then(function (acct) {
                    onLoggedIn(acct);
                })
                .catch(function (err) {
                    console.error('Authorize failed:', err);
                    localStorage.removeItem('deriv_token');
                    localStorage.removeItem('deriv_accounts');
                    uiShowLanding();
                    toast('e', 'Login failed. Please try again.');
                });
        })
        .catch(function (err) {
            console.error('WS connect failed:', err);
            uiShowLanding();
            toast('e', 'Could not connect to Deriv API.');
        });
}

function onLoggedIn(acct) {
    authAccount = acct;
    uiOnAuth(acct);
    toast('s', 'Welcome, ' + (acct.fullname || acct.loginid) + '!');

    if (!appBootstrapped) {
        wsOn('balance', function (b) {
            if (!b) return;

            uiUpdateBal(b.balance, b.currency);

            if (authAccount) {
                authAccount.balance = b.balance;
                authAccount.currency = b.currency;
            }
        });

        mktBuildDashboard();
        mktBuildSidebar('synthetic');
        mktSubscribe();
        tradeBindAll();
        bindAppNav();

        appBootstrapped = true;
    }

    wsForgetAll('balance');
    wsRaw({ balance: 1, subscribe: 1 });

    uiGoPage('trading');
}

if (!appBootstrapped) {
    wsOn('balance', function (b) {
        if (!b) return;

        uiUpdateBal(b.balance, b.currency);

        if (authAccount) {
            authAccount.balance = b.balance;
            authAccount.currency = b.currency;
        }
    });

    mktBuildDashboard();
    mktBuildSidebar('synthetic');
    mktSubscribe();
    tradeBindAll();
    botInit();
    bindAppNav();

    appBootstrapped = true;
}

function bindAppNav() {
    if (appNavBound) return;
    appNavBound = true;

    document.querySelectorAll('.anav').forEach(function (a) {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            uiGoPage(a.dataset.page);
        });
    });

    var appLogo = document.getElementById('appLogo');
    if (appLogo) {
        appLogo.addEventListener('click', function (e) {
            e.preventDefault();
            uiGoPage('dashboard');
        });
    }

    var dashTrade = document.getElementById('dashTrade');
    if (dashTrade) {
        dashTrade.addEventListener('click', function () {
            uiGoPage('trading');
        });
    }

    var mwBody = document.getElementById('mwBody');
    if (mwBody) {
        mwBody.addEventListener('click', function (e) {
            var row = e.target.closest('.mw-row');
            if (!row) return;
            mktSelectSymbol(row.dataset.symbol, { goTrading: true });
        });
    }

    var appMobBtn = document.getElementById('appMobBtn');
    if (appMobBtn) {
        appMobBtn.addEventListener('click', function () {
            uiCloseAccDD();
            var mobOverlay = document.getElementById('mobOverlay');
            if (mobOverlay) mobOverlay.classList.add('open');
            uiSetBodyLock(true);
        });
    }

    var mobClose = document.getElementById('mobClose');
    if (mobClose) {
        mobClose.addEventListener('click', function () {
            uiCloseMob();
        });
    }

    document.querySelectorAll('.mnav[data-page]').forEach(function (a) {
        a.addEventListener('click', function () {
            uiGoPage(a.dataset.page);
        });
    });

    var appLogout = document.getElementById('appLogout');
    if (appLogout) {
        appLogout.addEventListener('click', function () {
            uiCloseMob();
            uiCloseAccDD();
            authLogout();
        });
    }

    var mobLogout = document.getElementById('mobLogout');
    if (mobLogout) {
        mobLogout.addEventListener('click', function () {
            uiCloseMob();
            authLogout();
        });
    }
}