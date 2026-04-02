// ========================================
// App Controller - Entry Point
// ========================================

document.addEventListener('DOMContentLoaded', function () {
    // Show debug info
    var a1 = document.getElementById('showAID');
    var a2 = document.getElementById('showURL');
    if (a1) a1.textContent = APP_ID;
    if (a2) a2.textContent = location.origin;

    boot();
});

function boot() {
    dbg('MyTrader v2.0');
    dbg('URL: ' + location.href);
    dbg('App ID: ' + APP_ID);

    // Bind login events
    bindLoginEvents();

    // Bind common UI
    uiBindCommon();

    // Connect WebSocket
    wsConnect().then(function () {
        toast('i', 'Connected');

        // Check OAuth
        var oauthToken = authCheckOAuth();
        var token = oauthToken || authGetSavedToken();

        if (token) {
            dbg('Token found, authenticating...');
            authLogin(token).then(function (acct) {
                onLoggedIn(acct);
            }).catch(function (e) {
                dbg('Auth failed: ' + (e.message || e.code), 'error');
                localStorage.removeItem('deriv_token');
                uiShowLogin();
            });
        } else {
            uiShowLogin();
        }
    }).catch(function () {
        showAlert('alertErr', 'Cannot connect to Deriv.');
    });
}

function onLoggedIn(acct) {
    uiOnAuth(acct);
    toast('s', 'Welcome, ' + (acct.fullname || acct.loginid) + '!');

    // Subscribe to balance
    wsRaw({ balance: 1, subscribe: 1 });
    wsOn('balance', function (b) {
        uiUpdateBalance(b.balance, b.currency);
    });

    // Populate sidebar
    mktPopulateSidebar('synthetic');

    // Subscribe dashboard ticks
    mktSubscribeDashboard();

    // Bind trading events
    tradeBindEvents();
}

function bindLoginEvents() {
    // OAuth
    document.getElementById('oauthBtn').addEventListener('click', function () {
        toast('i', 'Redirecting...');
        setTimeout(authStartOAuth, 300);
    });

    // Token login
    document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        hideAlert('alertErr');
        hideAlert('alertOk');

        var token = document.getElementById('loginToken').value.trim();
        if (!token) { showAlert('alertErr', 'Paste your API token.'); return; }

        var btn = document.getElementById('loginBtn');
        var ico = document.getElementById('loginIco');
        var txt = document.getElementById('loginTxt');
        btn.disabled = true;
        txt.textContent = 'Connecting...';
        ico.className = 'fas fa-spinner fa-spin';

        authLogin(token).then(function (acct) {
            showAlert('alertOk', 'Success!');
            authSaveToken(token);
            setTimeout(function () { onLoggedIn(acct); }, 300);
        }).catch(function (e) {
            showAlert('alertErr', 'Failed: ' + (e.message || e.code || '?'));
            toast('e', e.message || 'Auth failed');
        }).finally(function () {
            btn.disabled = false;
            txt.textContent = 'Log in with Token';
            ico.className = 'fas fa-sign-in-alt';
        });
    });
}