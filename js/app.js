// js/app.js

class App {
    constructor() {
        this.currentPage = 'dashboard';
        this.isDarkTheme = true;
        this.markets = [];
    }

    async init() {
        console.log('🚀 Initializing MyTrader...');

        // Check for OAuth callback
        const accounts = auth.handleOAuthCallback();

        // Connect to WebSocket
        try {
            await derivWS.connect();
            showToast('info', 'Connected to trading server');
        } catch (error) {
            showToast('error', 'Failed to connect to server');
            return;
        }

        // Check for saved token
        const savedToken = localStorage.getItem('deriv_token');
        if (savedToken) {
            try {
                await auth.authorize(savedToken);
                this.onLoginSuccess();
            } catch (error) {
                console.log('Saved token invalid, showing login');
                this.showLogin();
            }
        } else {
            this.showLogin();
        }

        this.setupEventListeners();
    }

    showLogin() {
        document.getElementById('loginOverlay').classList.remove('hidden');
        document.getElementById('mainContent').style.display = 'none';
    }

    hideLogin() {
        document.getElementById('loginOverlay').classList.add('hidden');
        document.getElementById('mainContent').style.display = 'block';
    }

    async onLoginSuccess() {
        this.hideLogin();

        // Update UI with account info
        if (auth.account) {
            const balanceDisplay = document.getElementById('balanceDisplay');
            if (balanceDisplay) {
                balanceDisplay.textContent = `${parseFloat(auth.account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${auth.account.currency}`;
            }

            const totalBalance = document.getElementById('totalBalance');
            if (totalBalance) {
                totalBalance.textContent = `$${parseFloat(auth.account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
            }

            // Check if demo
            const accountType = document.querySelector('.account-type');
            if (accountType) {
                accountType.textContent = auth.account.is_virtual ? 'Demo' : 'Real';
                accountType.style.background = auth.account.is_virtual ? 'var(--green)' : 'var(--blue)';
            }
        }

        // Subscribe to balance updates
        auth.getBalance();
        derivWS.subscribe('balance', (balance) => {
            const balanceDisplay = document.getElementById('balanceDisplay');
            if (balanceDisplay) {
                balanceDisplay.textContent = `${parseFloat(balance.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${balance.currency}`;
            }
        });

        // Load markets
        await this.loadMarkets();

        // Initialize chart
        chartManager.init('chartContainer');
        chartManager.loadHistory('R_100', 300);

        // Subscribe to tick prices for dashboard
        this.subscribeDashboardPrices();

        // Initial proposal subscription
        trading.subscribeProposals(10, 5, 'm');

        showToast('success', `Welcome back, ${auth.account?.fullname || 'Trader'}!`);
    }

    async loadMarkets() {
        const symbols = await trading.getActiveSymbols();
        this.markets = symbols;

        const marketList = document.getElementById('marketList');
        if (!marketList) return;

        // Group by market
        const syntheticMarkets = symbols.filter(s =>
            s.market === 'synthetic_index' || s.symbol.startsWith('R_')
        ).slice(0, 15);

        marketList.innerHTML = syntheticMarkets.map(market => `
            <div class="market-list-item ${market.symbol === 'R_100' ? 'active' : ''}" 
                 data-symbol="${market.symbol}">
                <span class="ml-name">${market.display_name}</span>
                <span class="ml-price" id="ml_${market.symbol}">--</span>
            </div>
        `).join('');

        // Add click listeners
        marketList.querySelectorAll('.market-list-item').forEach(item => {
            item.addEventListener('click', () => {
                marketList.querySelectorAll('.market-list-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const symbol = item.dataset.symbol;
                const name = item.querySelector('.ml-name').textContent;

                // Update chart
                chartManager.changeSymbol(symbol);

                // Update trading
                trading.setSymbol(symbol);

                // Update header
                document.getElementById('chartMarketName').textContent = name;
            });
        });
    }

    subscribeDashboardPrices() {
        const dashboardSymbols = ['R_100', 'R_50', 'R_75', 'frxEURUSD'];

        dashboardSymbols.forEach(symbol => {
            derivWS.subscribeTick(symbol, (tick) => {
                // Update dashboard prices
                const priceEl = document.getElementById(`price_${symbol}`);
                if (priceEl) {
                    priceEl.textContent = parseFloat(tick.quote).toFixed(
                        symbol.startsWith('frx') ? 5 : 2
                    );
                }

                // Update market list prices
                const mlPrice = document.getElementById(`ml_${symbol}`);
                if (mlPrice) {
                    mlPrice.textContent = parseFloat(tick.quote).toFixed(
                        symbol.startsWith('frx') ? 5 : 2
                    );
                }

                // Update chart price display
                if (symbol === trading.currentSymbol) {
                    const chartPrice = document.getElementById('chartPrice');
                    if (chartPrice) {
                        chartPrice.textContent = parseFloat(tick.quote).toFixed(
                            symbol.startsWith('frx') ? 5 : 2
                        );
                    }
                }
            });
        });
    }

    setupEventListeners() {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                // For API token login
                const email = document.getElementById('loginEmail').value;
                const password = document.getElementById('loginPassword').value;

                // Note: Deriv API uses tokens, not email/password directly
                // For demo, we'll use the token as the password field
                showToast('info', 'Use "Log in with Deriv" for secure OAuth login, or paste your API token in the password field');

                if (password.length > 20) {
                    // Treat as API token
                    try {
                        await auth.authorize(password);
                        this.onLoginSuccess();
                    } catch (error) {
                        showToast('error', 'Invalid API token');
                    }
                }
            });
        }

        // Deriv OAuth Login
        const oauthBtn = document.getElementById('derivOAuthBtn');
        if (oauthBtn) {
            oauthBtn.addEventListener('click', () => {
                auth.loginWithDeriv();
            });
        }

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });

        // Account Switcher
        const accountSwitcher = document.getElementById('accountSwitcher');
        if (accountSwitcher) {
            accountSwitcher.addEventListener('click', () => {
                document.getElementById('accountDropdown').classList.toggle('show');
            });
        }

        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Trade Buttons
        const riseBtn = document.getElementById('riseBtn');
        const fallBtn = document.getElementById('fallBtn');

        if (riseBtn) {
            riseBtn.addEventListener('click', async () => {
                riseBtn.disabled = true;
                riseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                try {
                    await trading.quickBuy('CALL');
                } catch (e) {
                    console.error(e);
                }
                riseBtn.disabled = false;
                riseBtn.innerHTML = `
                    <div class="trade-btn-content">
                        <i class="fas fa-arrow-up"></i>
                        <span class="btn-label">Rise</span>
                        <span class="btn-payout" id="risePayout">--</span>
                    </div>
                `;
            });
        }

        if (fallBtn) {
            fallBtn.addEventListener('click', async () => {
                fallBtn.disabled = true;
                fallBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                try {
                    await trading.quickBuy('PUT');
                } catch (e) {
                    console.error(e);
                }
                fallBtn.disabled = false;
                fallBtn.innerHTML = `
                    <div class="trade-btn-content">
                        <i class="fas fa-arrow-down"></i>
                        <span class="btn-label">Fall</span>
                        <span class="btn-payout" id="fallPayout">--</span>
                    </div>
                `;
            });
        }

        // Duration controls
        const durMinus = document.getElementById('durMinus');
        const durPlus = document.getElementById('durPlus');
        const durationValue = document.getElementById('durationValue');

        if (durMinus) {
            durMinus.addEventListener('click', () => {
                const current = parseInt(durationValue.value);
                if (current > 1) {
                    durationValue.value = current - 1;
                    this.updateProposals();
                }
            });
        }

        if (durPlus) {
            durPlus.addEventListener('click', () => {
                const current = parseInt(durationValue.value);
                durationValue.value = current + 1;
                this.updateProposals();
            });
        }

        // Stake amount changes
        const stakeAmount = document.getElementById('stakeAmount');
        if (stakeAmount) {
            stakeAmount.addEventListener('change', () => {
                this.updateProposals();
            });
        }

        // Quick stakes
        document.querySelectorAll('.quick-stake').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.quick-stake').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const amount = btn.dataset.amount;
                document.getElementById('stakeAmount').value = amount;
                this.updateProposals();
            });
        });

        // Timeframe buttons
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tf = parseInt(btn.dataset.tf);
                chartManager.changeTimeframe(tf);
            });
        });

        // Trade tabs
        document.querySelectorAll('.trade-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });

        // Market categories
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterMarkets(btn.dataset.category);
            });
        });

        // Password toggle
        document.querySelectorAll('.toggle-pass').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                const icon = btn.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.account-switcher')) {
                document.getElementById('accountDropdown')?.classList.remove('show');
            }
        });

        // Market items on dashboard
        document.querySelectorAll('.market-item').forEach(item => {
            item.addEventListener('click', () => {
                const symbol = item.dataset.symbol;
                trading.setSymbol(symbol);
                chartManager.changeSymbol(symbol);
                this.navigateTo('trading');

                const name = item.querySelector('.market-name').textContent;
                document.getElementById('chartMarketName').textContent = name;
            });
        });

        // Market search
        const marketSearch = document.getElementById('marketSearch');
        if (marketSearch) {
            marketSearch.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                document.querySelectorAll('.market-list-item').forEach(item => {
                    const name = item.querySelector('.ml-name').textContent.toLowerCase();
                    item.style.display = name.includes(query) ? 'flex' : 'none';
                });
            });
        }
    }

    updateProposals() {
        const amount = parseFloat(document.getElementById('stakeAmount').value);
        const duration = parseInt(document.getElementById('durationValue').value);
        const durationUnit = document.getElementById('durationType').value;

        trading.subscribeProposals(amount, duration, durationUnit);
    }

    filterMarkets(category) {
        const marketList = document.getElementById('marketList');
        if (!marketList || !this.markets.length) return;

        let filtered;
        switch (category) {
            case 'synthetic':
                filtered = this.markets.filter(s => s.market === 'synthetic_index');
                break;
            case 'forex':
                filtered = this.markets.filter(s => s.market === 'forex');
                break;
            case 'commodities':
                filtered = this.markets.filter(s => s.market === 'commodities');
                break;
            case 'crypto':
                filtered = this.markets.filter(s => s.market === 'cryptocurrency');
                break;
            default:
                filtered = this.markets;
        }

        filtered = filtered.slice(0, 20);

        marketList.innerHTML = filtered.map(market => `
            <div class="market-list-item" data-symbol="${market.symbol}">
                <span class="ml-name">${market.display_name}</span>
                <span class="ml-price" id="ml_${market.symbol}">--</span>
            </div>
        `).join('');

        // Re-attach listeners
        marketList.querySelectorAll('.market-list-item').forEach(item => {
            item.addEventListener('click', () => {
                marketList.querySelectorAll('.market-list-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const symbol = item.dataset.symbol;
                const name = item.querySelector('.ml-name').textContent;

                chartManager.changeSymbol(symbol);
                trading.setSymbol(symbol);
                document.getElementById('chartMarketName').textContent = name;

                // Subscribe to ticks for this symbol
                derivWS.subscribeTick(symbol, (tick) => {
                    const mlPrice = document.getElementById(`ml_${symbol}`);
                    if (mlPrice) mlPrice.textContent = parseFloat(tick.quote).toFixed(2);

                    const chartPrice = document.getElementById('chartPrice');
                    if (chartPrice && symbol === trading.currentSymbol) {
                        chartPrice.textContent = parseFloat(tick.quote).toFixed(2);
                    }
                });
            });
        });
    }

    navigateTo(page) {
        // Update nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Update pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageEl = document.getElementById(`${page}Page`);
        if (pageEl) {
            pageEl.classList.add('active');
        }

        this.currentPage = page;

        // Re-init chart if going to trading page
        if (page === 'trading') {
            setTimeout(() => {
                chartManager.init('chartContainer');
                chartManager.loadHistory(trading.currentSymbol, chartManager.currentGranularity);
            }, 100);
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.body.classList.toggle('dark-theme', this.isDarkTheme);
        document.body.classList.toggle('light-theme', !this.isDarkTheme);

        const icon = document.querySelector('#themeToggle i');
        icon.className = this.isDarkTheme ? 'fas fa-moon' : 'fas fa-sun';

        chartManager.updateTheme(this.isDarkTheme);
    }
}

// Toast notification helper
function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="toast-icon ${icons[type]}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// Initialize app when DOM is ready
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});