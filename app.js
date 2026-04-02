document.addEventListener('DOMContentLoaded', function () {
    // Landing page buttons
    ['landLogin', 'heroLogin', 'ctaLogin'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', function () { authStartOAuth(); });
    });
    ['landSignup', 'heroSignup', 'ctaSignup'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', function () { authStartSignup(); });
    });

    boot();
});

function boot() {
    // Connect WS
    wsConnect().then(function () {
        // Check OAuth callback
        var oauthToken = authCheckOAuth();
        var token = oauthToken || localStorage.getItem('deriv_token');

        if (token) {
            authLogin(token).then(function (acct) {
                onLoggedIn(acct);
            }).catch(function () {
                localStorage.removeItem('deriv_token');
                uiShowLanding();
            });
        } else {
            uiShowLanding();
        }
    }).catch(function () {
        uiShowLanding();
    });
}

function onLoggedIn(acct) {
    uiOnAuth(acct);
    toast('s', 'Welcome, ' + (acct.fullname || acct.loginid) + '!');

    // Balance
    wsForgetAll('balance');
    wsRaw({ balance: 1, subscribe: 1 });
    wsOn('balance', function (b) {
        uiUpdateBal(b.balance, b.currency);
    });

    try {
        // Build UI
        mktBuildDashboard();
        mktBuildSidebar('synthetic');
        mktSubscribe();
        tradeBindAll();
        bindAppNav();

        // Open trading page immediately so chart is visible
        uiGoPage('trading');
    } catch (err) {
        console.error('App init failed:', err);
        toast('e', 'App failed to initialize. Check console.');
    }
    
} function bindAppNav() {
    // Desktop nav
    document.querySelectorAll('.anav').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); uiGoPage(a.dataset.page); });
    });

    // Logo
    document.getElementById('appLogo').addEventListener('click', function (e) { e.preventDefault(); uiGoPage('dashboard'); });

    // Dashboard trade button
    document.getElementById('dashTrade').addEventListener('click', function () { uiGoPage('trading'); });

    // Dashboard market rows
    document.getElementById('mwBody').addEventListener('click', function (e) {
        var row = e.target.closest('.mw-row'); if (!row) return;
        curSymbol = row.dataset.symbol;
        document.getElementById('chartName').textContent = mktName(curSymbol);
        uiGoPage('trading');
    });

    // Mobile menu
    document.getElementById('appMobBtn').addEventListener('click', function () { document.getElementById('mobOverlay').classList.add('open'); });
    document.getElementById('mobClose').addEventListener('click', function () { document.getElementById('mobOverlay').classList.remove('open'); });
    document.querySelectorAll('.mnav[data-page]').forEach(function (a) {
        a.addEventListener('click', function () { uiGoPage(a.dataset.page); });
    });

    // Logout
    document.getElementById('appLogout').addEventListener('click', authLogout);
    document.getElementById('mobLogout').addEventListener('click', authLogout);

    // Landing mobile menu (simple toggle for now)
    document.getElementById('landMobBtn').addEventListener('click', function () { authStartOAuth(); });
}