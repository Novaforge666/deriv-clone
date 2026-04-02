// ========================================
// UI Module
// ========================================

// Debug logger
function dbg(msg, type) {
    type = type || 'info';
    var box = document.getElementById('dbgBox');
    if (box) {
        var d = document.createElement('div');
        d.className = 'dl dl-' + (type === 'success' ? 'ok' : type === 'error' ? 'err' : 'info');
        d.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
        box.prepend(d);
        while (box.children.length > 80) box.removeChild(box.lastChild);
    }
    console.log('[' + type + ']', msg);
}

// Toasts
function toast(type, msg) {
    var w = document.getElementById('toastWrap');
    if (!w) return;
    var icons = { s: 'fa-check-circle', e: 'fa-exclamation-circle', i: 'fa-info-circle', w: 'fa-exclamation-triangle' };
    var el = document.createElement('div');
    el.className = 'toast t-' + type;
    el.innerHTML = '<i class="t-icon fas ' + (icons[type] || icons.i) + '"></i><span class="t-msg">' + msg + '</span><button class="t-x" aria-label="Close" title="Close"><i class="fas fa-times"></i></button>';
    el.querySelector('.t-x').onclick = function () { el.remove(); };
    w.appendChild(el);
    setTimeout(function () { if (el.parentElement) el.remove(); }, 5000);
}

// Alerts on login
function showAlert(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add('show'); }
}

function hideAlert(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

// Navigation
function uiShowLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.remove('visible');
}

function uiHideLogin() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.add('visible');
}

function uiGoPage(page) {
    // Desktop nav
    document.querySelectorAll('.nav-a').forEach(function (l) { l.classList.remove('active'); });
    var nl = document.querySelector('.nav-a[data-page="' + page + '"]');
    if (nl) nl.classList.add('active');

    // Mobile nav
    document.querySelectorAll('.mob-link').forEach(function (l) { l.classList.remove('active'); });
    var ml = document.querySelector('.mob-link[data-page="' + page + '"]');
    if (ml) ml.classList.add('active');
    document.getElementById('mobNav').classList.remove('open');

    // Pages
    document.querySelectorAll('.page').forEach(function (p) {
        p.classList.remove('active');
        p.style.display = 'none';
    });

    var pe = document.getElementById(page + 'Page');
    if (pe) {
        pe.classList.add('active');
        pe.style.display = (page === 'trading') ? 'flex' : 'block';
    }

    if (page === 'trading') {
        setTimeout(function () {
            chartInit();
            chartLoad(curSymbol, curGranularity);
            if (authAccount) tradeSubProposals();
        }, 100);
    }

    if (page === 'cashier') {
        uiUpdateCashier();
    }
}

// Update balance display
function uiUpdateBalance(bal, cur) {
    var f = (+bal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var el1 = document.getElementById('accBal');
    var el2 = document.getElementById('dBal');
    var el3 = document.getElementById('cashBal');
    if (el1) el1.textContent = f + ' ' + (cur || 'USD');
    if (el2) el2.textContent = '$' + f;
    if (el3) el3.textContent = '$' + f;
}

// Update account UI after login
function uiOnAuth(acct) {
    uiHideLogin();
    hideAlert('alertErr');
    uiUpdateBalance(acct.balance, acct.currency);

    // Account tag
    var tag = document.getElementById('accTag');
    if (tag) {
        tag.textContent = acct.is_virtual ? 'Demo' : 'Real';
        tag.className = 'acc-tag' + (acct.is_virtual ? '' : ' real');
    }

    // User menu
    var init = document.getElementById('userInitial');
    if (init) init.textContent = (acct.fullname || acct.loginid || '?')[0].toUpperCase();

    var udName = document.getElementById('udName');
    if (udName) udName.textContent = acct.fullname || acct.loginid;

    var udEmail = document.getElementById('udEmail');
    if (udEmail) udEmail.textContent = acct.email || acct.loginid;

    // Cashier
    var cashType = document.getElementById('cashType');
    if (cashType) cashType.textContent = acct.is_virtual ? 'Demo Account' : 'Real Account';

    // Account list dropdown
    uiUpdateAccountList();
}

function uiUpdateAccountList() {
    var list = document.getElementById('accList');
    if (!list) return;

    if (authAccounts.length > 0) {
        list.innerHTML = authAccounts.map(function (a) {
            var isActive = authAccount && authAccount.loginid === a.id;
            return '<div class="acc-drop-item' + (isActive ? ' active' : '') + '" data-token="' + a.token + '">' +
                '<span class="adi-id">' + a.id + '</span>' +
                '<span class="adi-cur">' + (a.cur || 'USD') + '</span>' +
                (isActive ? '<i class="fas fa-check"></i>' : '') +
                '</div>';
        }).join('');
    } else if (authAccount) {
        list.innerHTML = '<div class="acc-drop-item active">' +
            '<span class="adi-id">' + authAccount.loginid + '</span>' +
            '<span class="adi-cur">' + authAccount.currency + '</span>' +
            '<i class="fas fa-check"></i></div>';
    }
}

function uiUpdateCashier() {
    if (authAccount) {
        uiUpdateBalance(authAccount.balance, authAccount.currency);
    }
}

// Bind common UI events (called once)
function uiBindCommon() {
    // Desktop nav
    document.querySelectorAll('.nav-a').forEach(function (l) {
        l.addEventListener('click', function (e) { e.preventDefault(); uiGoPage(l.dataset.page); });
    });

    // Mobile menu
    var mobMenu = document.getElementById('mobMenu');
    var mobNav = document.getElementById('mobNav');
    var mobClose = document.getElementById('mobClose');
    if (mobMenu) mobMenu.addEventListener('click', function () { mobNav.classList.add('open'); });
    if (mobClose) mobClose.addEventListener('click', function () { mobNav.classList.remove('open'); });

    // Mobile nav links
    document.querySelectorAll('.mob-link[data-page]').forEach(function (l) {
        l.addEventListener('click', function () { uiGoPage(l.dataset.page); });
    });

    // Logo -> dashboard
    var logo = document.getElementById('logoHome');
    if (logo) logo.addEventListener('click', function (e) { e.preventDefault(); uiGoPage('dashboard'); });

    // Go trade button
    var goTrade = document.getElementById('goTradeBtn');
    if (goTrade) goTrade.addEventListener('click', function () { uiGoPage('trading'); });

    // User dropdown
    var userMenu = document.getElementById('userMenu');
    var userDrop = document.getElementById('userDrop');
    if (userMenu) {
        userMenu.querySelector('.h-avatar').addEventListener('click', function (e) {
            e.stopPropagation();
            userDrop.classList.toggle('open');
        });
    }

    // Account dropdown
    var accSwitch = document.getElementById('accSwitch');
    var accDrop = document.getElementById('accDrop');
    if (accSwitch) {
        document.getElementById('accCurrent').addEventListener('click', function (e) {
            e.stopPropagation();
            accDrop.classList.toggle('open');
        });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', function () {
        if (userDrop) userDrop.classList.remove('open');
        if (accDrop) accDrop.classList.remove('open');
    });

    // Account switching
    if (document.getElementById('accList')) {
        document.getElementById('accList').addEventListener('click', function (e) {
            var item = e.target.closest('.acc-drop-item');
            if (!item || item.classList.contains('active')) return;
            var token = item.dataset.token;
            if (token) {
                localStorage.setItem('deriv_token', token);
                location.reload();
            }
        });
    }

    // Logout buttons
    var logoutBtn = document.getElementById('logoutBtn');
    var mobLogout = document.getElementById('mobLogout');
    if (logoutBtn) logoutBtn.addEventListener('click', authLogout);
    if (mobLogout) mobLogout.addEventListener('click', authLogout);

    // Debug toggle
    var showDbg = document.getElementById('showDbg');
    if (showDbg) {
        showDbg.addEventListener('change', function (e) {
            document.getElementById('dbgBox').classList.toggle('show', e.target.checked);
        });
    }
}