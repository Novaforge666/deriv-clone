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

        if (typeof mktBuildDashboard === 'function') mktBuildDashboard();
        if (typeof mktBuildSidebar === 'function') mktBuildSidebar('synthetic');
        if (typeof mktSubscribe === 'function') mktSubscribe();
        if (typeof tradeBindAll === 'function') tradeBindAll();
        if (typeof botInit === 'function') botInit();

        bindAppNav();

        appBootstrapped = true;
    }

    if (typeof tradePrimeDigits === 'function') {
        tradePrimeDigits(curSymbol);
    }

    wsForgetAll('balance');
    wsRaw({ balance: 1, subscribe: 1 });

    uiGoPage('trading');
}

function bindAppNav() {
    if (appNavBound) return;
    appNavBound = true;

    document.addEventListener('click', function (e) {
        var navLink = e.target.closest('.anav[data-page], .mnav[data-page]');
        if (navLink) {
            e.preventDefault();
            uiGoPage(navLink.dataset.page);
            return;
        }

        if (e.target.closest('#appLogo')) {
            e.preventDefault();
            uiGoPage('dashboard');
            return;
        }

        if (e.target.closest('#dashTrade')) {
            uiGoPage('trading');
            return;
        }

        var row = e.target.closest('#mwBody .mw-row');
        if (row && typeof mktSelectSymbol === 'function') {
            mktSelectSymbol(row.dataset.symbol, { goTrading: true });
            return;
        }

        if (e.target.closest('#appMobBtn')) {
            var mobOverlay = document.getElementById('mobOverlay');
            if (mobOverlay) mobOverlay.classList.add('open');
            uiSetBodyLock(true);
            return;
        }

        if (e.target.closest('#mobClose')) {
            uiCloseMob();
            return;
        }

        if (e.target.closest('#appLogout')) {
            authLogout();
            return;
        }

        if (e.target.closest('#mobLogout')) {
            authLogout();
        }
    });
}