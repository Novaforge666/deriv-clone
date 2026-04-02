var authAccount = null;
var authAccounts = [];

function authLogin(token) {
    return wsSend({ authorize: token }).then(function (r) {
        authAccount = r.authorize;
        return authAccount;
    });
}

function authCheckOAuth() {
    var p = new URLSearchParams(location.search), arr = [], i = 1;
    while (p.has('acct' + i)) {
        arr.push({ id: p.get('acct' + i), token: p.get('token' + i), cur: p.get('cur' + i) });
        i++;
    }
    if (arr.length) {
        authAccounts = arr;
        localStorage.setItem('deriv_token', arr[0].token);
        localStorage.setItem('deriv_accounts', JSON.stringify(arr));
        history.replaceState({}, '', location.pathname);
        return arr[0].token;
    }
    var saved = localStorage.getItem('deriv_accounts');
    if (saved) try { authAccounts = JSON.parse(saved); } catch (e) { }
    return null;
}

function authLogout() {
    localStorage.removeItem('deriv_token');
    localStorage.removeItem('deriv_accounts');
    location.reload();
}

function authStartOAuth() {
    location.href = 'https://oauth.deriv.com/oauth2/authorize?app_id=' + APP_ID + '&l=EN&brand=deriv';
}

function authStartSignup() {
    window.open('https://deriv.com/signup/', '_blank');
}