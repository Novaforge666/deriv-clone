function toast(type, msg) {
    var w = document.getElementById('toastWrap'); if (!w) return;
    var ic = { s: 'fa-check-circle', e: 'fa-exclamation-circle', i: 'fa-info-circle' };
    var el = document.createElement('div');
    el.className = 'toast t-' + type;
    el.innerHTML = '<i class="t-ico fas ' + (ic[type] || ic.i) + '"></i><span class="t-msg">' + msg + '</span><button class="t-x" aria-label="Close"><i class="fas fa-times"></i></button>';
    el.querySelector('.t-x').onclick = function () { el.remove(); };
    w.appendChild(el);
    setTimeout(function () { if (el.parentElement) el.remove(); }, 5000);
}

function uiShowApp() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
}

function uiShowLanding() {
    document.getElementById('landingPage').classList.remove('hidden');
    document.getElementById('appShell').classList.add('hidden');
}

function uiGoPage(pg) {
    document.querySelectorAll('.anav').forEach(function (a) { a.classList.remove('active'); });
    var na = document.querySelector('.anav[data-page="' + pg + '"]'); if (na) na.classList.add('active');
    document.querySelectorAll('.mnav[data-page]').forEach(function (a) { a.classList.remove('active'); });
    var ma = document.querySelector('.mnav[data-page="' + pg + '"]'); if (ma) ma.classList.add('active');
    document.getElementById('mobOverlay').classList.remove('open');

    document.querySelectorAll('.pg').forEach(function (p) { p.classList.remove('active'); p.style.display = 'none'; });
    var map = { dashboard: 'pgDashboard', trading: 'pgTrading', reports: 'pgReports', cashier: 'pgCashier' };
    var el = document.getElementById(map[pg]);
    if (el) { el.classList.add('active'); el.style.display = (pg === 'trading') ? 'flex' : 'block'; }

    if (pg === 'trading') {
        setTimeout(function () { chartInit(); chartLoad(curSymbol, curGranularity); if (authAccount) tradeSubProposals(); }, 100);
    }
    if (pg === 'cashier') uiUpdateCashier();
}

function uiUpdateBal(bal, cur) {
    var f = (+bal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    var e1 = document.getElementById('apBal'); if (e1) e1.textContent = f + ' ' + (cur || 'USD');
    var e2 = document.getElementById('dBal'); if (e2) e2.textContent = '$' + f;
    var e3 = document.getElementById('cashBal'); if (e3) e3.textContent = '$' + f;
}

function uiOnAuth(acct) {
    uiShowApp();
    uiUpdateBal(acct.balance, acct.currency);
    var tag = document.getElementById('apTag');
    if (tag) { tag.textContent = acct.is_virtual ? 'Demo' : 'Real'; tag.className = 'ap-tag' + (acct.is_virtual ? '' : ' real'); }
    var ct = document.getElementById('cashType');
    if (ct) ct.textContent = acct.is_virtual ? 'Demo Account' : 'Real Account';
}

function uiUpdateCashier() {
    if (authAccount) uiUpdateBal(authAccount.balance, authAccount.currency);
}