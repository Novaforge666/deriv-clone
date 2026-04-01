// js/auth.js

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('deriv_token') || null;
        this.account = null;
        this.isAuthorized = false;
    }

    async authorize(token) {
        try {
            const response = await derivWS.send({
                authorize: token
            });

            if (response.authorize) {
                this.token = token;
                this.account = response.authorize;
                this.isAuthorized = true;
                localStorage.setItem('deriv_token', token);
                return this.account;
            }
        } catch (error) {
            console.error('Authorization failed:', error);
            throw error;
        }
    }

    // OAuth login via Deriv
    loginWithDeriv() {
        const APP_ID = derivWS.APP_ID;
        const redirectUrl = encodeURIComponent(window.location.origin + window.location.pathname);
        window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&l=EN&brand=deriv`;
    }

    // Handle OAuth callback
    handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const accounts = [];

        let i = 1;
        while (params.has(`acct${i}`)) {
            accounts.push({
                account: params.get(`acct${i}`),
                token: params.get(`token${i}`),
                currency: params.get(`cur${i}`)
            });
            i++;
        }

        if (accounts.length > 0) {
            // Store all accounts
            localStorage.setItem('deriv_accounts', JSON.stringify(accounts));
            // Use first account by default
            this.token = accounts[0].token;
            localStorage.setItem('deriv_token', this.token);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return accounts;
        }

        return null;
    }

    async getBalance() {
        try {
            const response = await derivWS.send({
                balance: 1,
                subscribe: 1
            });
            return response.balance;
        } catch (error) {
            console.error('Failed to get balance:', error);
        }
    }

    logout() {
        this.token = null;
        this.account = null;
        this.isAuthorized = false;
        localStorage.removeItem('deriv_token');
        localStorage.removeItem('deriv_accounts');
        window.location.reload();
    }

    isLoggedIn() {
        return this.isAuthorized;
    }
}

const auth = new AuthManager();