// ========================================
// Authentication Module
// ========================================
var authAccount = null;
var authAccounts = [];

function authLogin(token) {
    dbg('Authorizing...');
    return wsSend({ authorize: token }).then(function (r) {
        authAccount = r.authorize;
        dbg('OK: ' + authAccount.loginid + ' | ' + authAccount.balance + ' ' + authAccount.currency, 'success');
        return authAccount;
    });
}

function authCheckOAuth() {
    var p = new URLSearchParams(location.search);
    var arr = [];
    var i = 1;
    while (p.has('acct' + i)) {
        arr.push({
            id: p.get('acct' + i),
            token: p.get('token' + i),
            cur: p.get('cur' + i)
        });
        i++;
    }
    if (arr.length) {
        dbg('OAuth: ' + arr.length + ' accounts', 'success');
        authAccounts = arr;
        localStorage.setItem('deriv_token', arr[0].token);
        localStorage.setItem('deriv_accounts', JSON.stringify(arr));
        history.replaceState({}, '', location.pathname);
        return arr[0].token;
    }

    // Check saved accounts
    var saved = localStorage.getItem('deriv_accounts');
    if (saved) {
        try { authAccounts = JSON.parse(saved); } catch (e) { }
    }

    return null;
}

function authLogout() {
    localStorage.removeItem('deriv_token');
    localStorage.removeItem('deriv_accounts');
    authAccount = null;
    authAccounts = [];
    location.reload();
}

function authGetSavedToken() {
    return localStorage.getItem('deriv_token');
}

function authSaveToken(token) {
    localStorage.setItem('deriv_token', token);
}

function authStartOAuth() {
    dbg('OAuth redirect...');
    location.href = 'https://oauth.deriv.com/oauth2/authorize?app_id=' + APP_ID + '&l=EN&brand=deriv';
}