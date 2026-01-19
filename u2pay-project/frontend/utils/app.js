// ============================================
// U2PAY - Main Application Logic
// ============================================

class U2PAYApp {
    constructor() {
        this.currentMode = 'balance'; // balance or time
        this.isServiceActive = false;
        this.sessionStartTime = null;
        this.sessionStartTimestamp = Date.now();
        this.currentCurrency = 'INR';
        this.maxAmount = 0; // DEPRECATED: kept for backward compatibility
        this.amountSpent = 0;
        this.elapsedNanoseconds = 0n; // BigInt for nanosecond precision
        this.ratePerNanosecond = 0n;
        
        // FIXED: Two independent spending caps
        this.universalSpendingCap = 0; // Global lifetime limit (independent)
        this.sessionSpendingCap = 0; // Per-session limit (independent)
        
        // Spending tracking
        this.totalSpentSoFar = 0; // Cumulative spending across sessions (localStorage)
        this.previousSessionsSpent = 0; // Spending from PREVIOUS sessions (before current one)
        this.currentSessionSpent = 0; // Spending in current session (reset per session)
        this.globalCapReached = false; // Flag for global cap status
        this.sessionCapReached = false; // Flag for session cap status
        this.wallet = null;
        this.isConnected = false;
        
        // Service Cost Definition (MANDATORY)
        this.serviceCostDefined = false;
        this.serviceName = '';
        this.serviceCostValue = 0;
        this.serviceCostCurrency = 'INR';
        this.serviceCostTimeUnit = 'minute';
        this.costPerNanosecond = 0n; // BigInt: cost in fiat per nanosecond
        
        // Gmail Authentication (prototype level)
        this.gmailUsers = new Map(); // Store email → hashed password
        this.currentGmailUser = null; // Currently logged in Gmail user
        
        // Initialize managers
        this.fiatConverter = new FiatConversionManager();
        this.wsClient = new WebSocketClient();
        this.streamingEngine = new StreamingEngine();
        
        // Store interval IDs for cleanup
        this.activeIntervals = [];
        this.simulationInterval = null;
        this.deviceUptimeInterval = null;
        this.deviceDataInterval = null;
        
        // MetaMask detection flag
        this.metaMaskAvailable = false;
        this.metaMaskCheckComplete = false;
        
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.initializeTheme();
        this.loadGmailUsers();
        this.checkGmailSession();
        this.loadTotalSpentFromStorage(); // Load cumulative spending
        this.preCheckMetaMask(); // Pre-check MetaMask availability
        this.initializeWebSocket();
        this.startRateUpdates();
    }

    async initializeWebSocket() {
        try {
            await this.wsClient.connect();
            this.wsClient.on('rate_update', (data) => this.handleRateUpdate(data));
            this.wsClient.on('settlement_confirmed', (data) => this.handleSettlementConfirmed(data));
        } catch (error) {
            console.warn('WebSocket not available, running in offline mode');
        }
    }

    startRateUpdates() {
        setInterval(async () => {
            await this.fiatConverter.updateExchangeRates();
            await this.fiatConverter.updateCryptoPrices();
        }, 5000);
    }

    handleRateUpdate(data) {
        console.log('Rate update received:', data);
        if (data.exchangeRates) this.fiatConverter.exchangeRates = data.exchangeRates;
        if (data.cryptoPrices) this.fiatConverter.cryptoPrice = data.cryptoPrices;
    }

    handleSettlementConfirmed(data) {
        alert('Payment confirmed! Transaction: ' + (data.transactionHash || 'pending'));
    }

    attachEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Wallet buttons
        document.getElementById('connectMetaMask').addEventListener('click', () => this.connectMetaMask());
        document.getElementById('connectWalletConnect').addEventListener('click', () => this.connectWalletConnect());
        document.getElementById('connectGmail').addEventListener('click', () => this.showGmailAuthModal('login'));
        document.getElementById('connectGmailSignup').addEventListener('click', () => this.showGmailAuthModal('signup'));
        document.getElementById('addressSafetyScanner').addEventListener('click', () => window.location.href = 'pages/scanner.html');
        document.getElementById('disconnectWallet').addEventListener('click', () => this.disconnectWallet());

        // Gmail Auth Modal
        document.getElementById('authModalSubmit').addEventListener('click', () => this.handleGmailAuth());
        document.getElementById('authModalCancel').addEventListener('click', () => this.hideGmailAuthModal());

        // Service Cost Definition (MANDATORY - REQUIRED BEFORE ANY BILLING)
        document.getElementById('defineServiceCost').addEventListener('click', () => this.defineServiceCost());

        // Mode selection
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Balance mode
        document.getElementById('setMaxAmount').addEventListener('click', () => this.setSessionSpendingCap());
        document.getElementById('setUniversalCap')?.addEventListener('click', () => this.setUniversalSpendingCap());
        document.getElementById('resetUniversalCap')?.addEventListener('click', () => this.resetUniversalCap());

        // Time mode
        document.getElementById('setTimeRate').addEventListener('click', () => this.setTimeRate());

        // Service controls
        document.getElementById('startService').addEventListener('click', () => this.startService());
        document.getElementById('stopService').addEventListener('click', () => this.stopService());

        // Settings
        document.getElementById('settlePayment').addEventListener('click', () => this.settlePayment());
        document.getElementById('exportData').addEventListener('click', () => this.exportData());

        // IoT simulator
        document.getElementById('simulateDeviceStart').addEventListener('click', () => this.simulateDeviceStart());
        document.getElementById('simulateDeviceStop').addEventListener('click', () => this.simulateDeviceStop());

        // Currency selection
        document.getElementById('currencySelect').addEventListener('change', (e) => {
            this.currentCurrency = e.target.value;
        });

        document.getElementById('timeCurrencySelect').addEventListener('change', (e) => {
            this.currentCurrency = e.target.value;
        });
    }

    // ============================================
    // THEME MANAGEMENT
    // ============================================

    initializeTheme() {
        const savedTheme = localStorage.getItem('u2pay-theme') || 'dark-mode';
        document.body.className = savedTheme;
        document.documentElement.className = savedTheme;
        this.updateThemeButton();
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? 'light-mode' : 'dark-mode';
        document.body.className = newTheme;
        document.documentElement.className = newTheme;
        localStorage.setItem('u2pay-theme', newTheme);
        this.updateThemeButton();
    }

    updateThemeButton() {
        const isDark = document.body.classList.contains('dark-mode');
        document.getElementById('themeToggle').textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }

    // ============================================
    // METAMASK DETECTION & SETUP
    // ============================================

    preCheckMetaMask() {
        // Pre-check with longer timeout (5 seconds total)
        let retries = 0;
        const maxRetries = 20; // 20 × 250ms = 5 seconds
        const btn = document.getElementById('connectMetaMask');
        
        console.log('🔍 Starting MetaMask pre-check (5 second timeout)...');
        
        const checkInterval = setInterval(() => {
            if (window.ethereum?.isMetaMask) {
                clearInterval(checkInterval);
                this.metaMaskAvailable = true;
                this.metaMaskCheckComplete = true;
                if (btn) btn.textContent = '🔗 Connect MetaMask';
                console.log('✅ MetaMask detected at initialization');
                window.metaMaskDebug = { available: true, foundAt: `${retries * 250}ms` };
                return;
            }
            
            retries++;
            if (retries >= maxRetries) {
                clearInterval(checkInterval);
                this.metaMaskAvailable = false;
                this.metaMaskCheckComplete = true;
                if (btn) btn.textContent = '⚠️ MetaMask Not Detected';
                console.log('❌ MetaMask not detected after 5 seconds');
                window.metaMaskDebug = { available: false, checkedFor: '5 seconds' };
                
                // Additional debug info
                console.log('window.ethereum:', window.ethereum);
                console.log('window.ethereum?.isMetaMask:', window.ethereum?.isMetaMask);
                console.warn('Possible causes: Extension not installed, disabled, or blocked');
                return;
            }
        }, 250); // Check every 250ms for faster detection
    }

    setupMetaMaskDetection() {
        // Listen for MetaMask injection event
        if (window.ethereum) {
            // MetaMask already injected
            return;
        }

        // Listen for ethereum#initialized event (fired when MetaMask injects itself)
        document.addEventListener('ethereum#initialized', () => {
            console.log('MetaMask injected successfully');
            this.metaMaskAvailable = true;
            const btn = document.getElementById('connectMetaMask');
            if (btn) btn.textContent = '🔗 Connect MetaMask';
        }, { once: true });

        // Also listen for DOMContentLoaded in case we're added late
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (window.ethereum?.isMetaMask) {
                    console.log('MetaMask detected after DOM content loaded');
                    this.metaMaskAvailable = true;
                }
            });
        }
    }

    // ============================================
    // SERVICE COST DEFINITION (MANDATORY)
    // ============================================

    /**
     * Normalizes service cost to cost per nanosecond
     * Formula: cost_per_ns = (service_cost / time_in_seconds) / 1_000_000_000
     * @param {number} serviceCost - Cost in fiat currency
     * @param {string} timeUnit - 'minute', 'hour', or 'day'
     * @returns {BigInt} Cost per nanosecond (scaled for precision)
     */
    normalizeServiceCost(serviceCost, timeUnit) {
        // Convert time unit to seconds
        const timeInSeconds = {
            'minute': 60,
            'hour': 3600,
            'day': 86400
        }[timeUnit];

        if (!timeInSeconds) {
            throw new Error(`Invalid time unit: ${timeUnit}. Must be 'minute', 'hour', or 'day'.`);
        }

        // Calculate cost per second (as BigInt for precision)
        // We'll use a scaling factor to preserve decimals
        const SCALE = 10000000000n; // 10^10 for precision
        const costBigInt = BigInt(Math.floor(serviceCost * Number(SCALE)));
        const secondsBigInt = BigInt(timeInSeconds);
        const costPerSecond = costBigInt / secondsBigInt;
        
        // Convert to cost per nanosecond
        // 1 second = 1e9 nanoseconds
        const NS_PER_SECOND = 1000000000n;
        const costPerNanosecond = costPerSecond / NS_PER_SECOND;

        return costPerNanosecond;
    }

    /**
     * Define the service cost - MANDATORY before starting any billing
     * Validates all inputs and enables mode buttons after successful definition
     */
    defineServiceCost() {
        const statusDiv = document.getElementById('serviceCostStatus');
        
        // Get input values
        const serviceName = document.getElementById('serviceName').value.trim();
        const serviceCostValue = parseFloat(document.getElementById('serviceCostValue').value);
        const serviceCostCurrency = document.getElementById('serviceCostCurrency').value;
        const serviceCostTimeUnit = document.getElementById('serviceCostTimeUnit').value;

        // Validation
        if (!serviceName) {
            this.showStatus(statusDiv, 'error', '❌ Service name is required');
            return;
        }

        if (!serviceCostValue || serviceCostValue <= 0) {
            this.showStatus(statusDiv, 'error', '❌ Service cost must be a positive number');
            return;
        }

        if (!['INR', 'USD', 'EUR'].includes(serviceCostCurrency)) {
            this.showStatus(statusDiv, 'error', '❌ Currency must be INR, USD, or EUR');
            return;
        }

        if (!['minute', 'hour', 'day'].includes(serviceCostTimeUnit)) {
            this.showStatus(statusDiv, 'error', '❌ Time unit must be minute, hour, or day');
            return;
        }

        try {
            // Store service cost information
            this.serviceName = serviceName;
            this.serviceCostValue = serviceCostValue;
            this.serviceCostCurrency = serviceCostCurrency;
            this.serviceCostTimeUnit = serviceCostTimeUnit;

            // Calculate cost per nanosecond
            this.costPerNanosecond = this.normalizeServiceCost(serviceCostValue, serviceCostTimeUnit);

            // Mark service cost as defined
            this.serviceCostDefined = true;

            // Show success message
            const currencySymbols = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
            const symbol = currencySymbols[serviceCostCurrency];
            this.showStatus(
                statusDiv,
                'success',
                `✅ Service cost defined: ${symbol}${serviceCostValue}/${serviceCostTimeUnit}`
            );

            // Enable mode buttons
            this.enableModButtons();

        } catch (error) {
            console.error('Service cost definition error:', error);
            this.showStatus(statusDiv, 'error', `❌ Error: ${error.message}`);
        }
    }

    /**
     * Display status message in the status div
     */
    showStatus(statusDiv, type, message) {
        statusDiv.className = type; // 'success' or 'error'
        statusDiv.textContent = message;
    }

    /**
     * Enable mode buttons after service cost is defined
     */
    enableModButtons() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.disabled = false;
        });
    }

    // ============================================
    // WALLET MANAGEMENT
    // ============================================

    async connectMetaMask() {
        try {
            // Show loading message while checking
            const btn = document.getElementById('connectMetaMask');
            const originalText = btn.textContent;
            btn.textContent = '⏳ Checking MetaMask...';
            btn.disabled = true;
            
            console.log('📡 MetaMask connection attempt started');
            console.log('window.metaMaskInjected (from HEAD):', window.metaMaskInjected);
            console.log('window.ethereum at click time:', !!window.ethereum);

            // Wait for MetaMask to be injected with VERY aggressive retry mechanism
            let ethereum = window.ethereum;
            let retries = 0;
            const maxRetries = 80; // 80 × 100ms = 8 seconds total wait (was 6)
            
            // Additional: Wait for the HEAD polling to find it
            while (!ethereum && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Faster polling
                ethereum = window.ethereum;
                retries++;
                
                // Log every 10th attempt
                if (retries % 10 === 0) {
                    console.log(`⏳ Waiting for MetaMask injection... (${retries * 100}ms)`);
                }
            }

            // If still not found, do ONE more intensive wait
            if (!ethereum) {
                console.log('⏳ Final intensive wait for MetaMask...');
                for (let i = 0; i < 5; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    ethereum = window.ethereum;
                    if (ethereum) {
                        console.log('✅ MetaMask found during final wait (attempt', i + 1, ')');
                        break;
                    }
                }
            }

            console.log(`Checked ${retries} times, ethereum available: ${!!ethereum}`);
            console.log('window.metaMaskInjected flag:', window.metaMaskInjected);

            if (typeof ethereum === 'undefined' || !ethereum) {
                btn.textContent = originalText;
                btn.disabled = false;
                console.error('❌ MetaMask object is undefined after 8+ seconds of waiting');
                console.error('Detection timeline:');
                console.error('- Page load time:', window.metaMaskDetectionStartTime ? 'tracked' : 'not tracked');
                console.error('- Early detection result:', window.metaMaskInjected);
                
                alert('❌ MetaMask NOT Detected!\n\n' +
                    '⚠️ You have confirmed MetaMask is installed and enabled, but the connection is not working.\n\n' +
                    'Try these fixes:\n\n' +
                    '1. REFRESH THE PAGE completely:\n' +
                    '   - Press Ctrl+Shift+R (hard refresh, clears cache)\n\n' +
                    '2. CHECK MetaMask status:\n' +
                    '   - Click MetaMask extension icon\n' +
                    '   - Make sure it shows "Connected"\n' +
                    '   - Check if wallet is locked\n\n' +
                    '3. LOCK/UNLOCK MetaMask:\n' +
                    '   - Click MetaMask icon\n' +
                    '   - Look for settings menu (⋮)\n' +
                    '   - Lock the wallet\n' +
                    '   - Unlock with password\n\n' +
                    '4. DISABLE other wallet extensions:\n' +
                    '   - Chrome Extensions → Find Phantom, Coinbase, etc.\n' +
                    '   - Disable them (toggle OFF)\n' +
                    '   - Refresh this page\n\n' +
                    '5. FULL BROWSER RESTART:\n' +
                    '   - Close Chrome completely\n' +
                    '   - Wait 10 seconds\n' +
                    '   - Open Chrome again\n' +
                    '   - Come back to this page');
                return;
            }

            // Check if MetaMask is the active provider
            if (!ethereum.isMetaMask) {
                btn.textContent = originalText;
                btn.disabled = false;
                console.error('❌ ethereum.isMetaMask is false, provider:', ethereum);
                alert('⚠️ MetaMask not detected as active provider.\n\nPlease make sure:\n1. MetaMask extension is enabled\n2. No other wallet extension is interfering\n3. Refresh the page and try again');
                return;
            }
            
            console.log('✅ MetaMask provider confirmed');

            // Request accounts
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            
            if (!accounts || accounts.length === 0) {
                btn.textContent = originalText;
                btn.disabled = false;
                alert('❌ No accounts found. Please unlock MetaMask and try again.');
                return;
            }

            // Store wallet info
            this.wallet = {
                address: accounts[0],
                provider: 'MetaMask',
                connected: true
            };
            this.isConnected = true;
            
            // Setup event listeners for account changes
            ethereum.on('accountsChanged', (newAccounts) => {
                if (newAccounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.wallet.address = newAccounts[0];
                    this.fetchWalletBalance();
                    this.updateWalletUI();
                }
            });

            // Setup event listeners for network changes
            ethereum.on('chainChanged', () => {
                window.location.reload();
            });

            this.updateWalletUI();
            btn.disabled = false;
            this.fetchWalletBalance();
        } catch (error) {
            console.error('MetaMask connection error:', error);
            const btn = document.getElementById('connectMetaMask');
            btn.disabled = false;
            
            // Handle specific error codes
            if (error.code === 4001) {
                alert('❌ Connection rejected. You cancelled the connection request.');
            } else if (error.code === -32002) {
                alert('⚠️ MetaMask connection request already pending. Please check your MetaMask extension.');
            } else if (error.code === -32603) {
                alert('❌ Internal MetaMask error. Please try again or restart MetaMask.');
            } else {
                alert('❌ Failed to connect MetaMask: ' + (error.message || 'Unknown error'));
            }
        }
    }

    connectWalletConnect() {
        alert('WalletConnect integration coming soon!');
        // TODO: Implement WalletConnect
    }

    // ============================================
    // GMAIL AUTHENTICATION (PROTOTYPE LEVEL)
    // ============================================

    /**
     * Hash password using SHA-256 (frontend-only, prototype level)
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Load Gmail users from localStorage
     */
    loadGmailUsers() {
        try {
            const stored = localStorage.getItem('u2pay_gmail_users');
            if (stored) {
                const users = JSON.parse(stored);
                this.gmailUsers = new Map(Object.entries(users));
            }
        } catch (error) {
            console.warn('Error loading Gmail users:', error);
        }
    }

    /**
     * Save Gmail users to localStorage
     */
    saveGmailUsers() {
        try {
            const usersObj = Object.fromEntries(this.gmailUsers);
            localStorage.setItem('u2pay_gmail_users', JSON.stringify(usersObj));
        } catch (error) {
            console.error('Error saving Gmail users:', error);
        }
    }

    /**
     * Show Gmail authentication modal
     */
    showGmailAuthModal(mode) {
        const modal = document.getElementById('gmailAuthModal');
        const title = document.getElementById('authModalTitle');
        const submit = document.getElementById('authModalSubmit');
        const confirmGroup = document.getElementById('authModalConfirmPasswordGroup');
        
        // Clear previous inputs
        document.getElementById('authModalEmail').value = '';
        document.getElementById('authModalPassword').value = '';
        document.getElementById('authModalPasswordConfirm').value = '';
        document.getElementById('authModalError').textContent = '';
        
        if (mode === 'signup') {
            title.textContent = 'Gmail Sign-Up';
            submit.textContent = 'Create Account';
            confirmGroup.style.display = 'block';
            this.currentAuthMode = 'signup';
        } else {
            title.textContent = 'Gmail Login';
            submit.textContent = 'Log In';
            confirmGroup.style.display = 'none';
            document.getElementById('authModalPasswordConfirm').value = '';
            this.currentAuthMode = 'login';
        }
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    /**
     * Hide Gmail authentication modal
     */
    hideGmailAuthModal() {
        const modal = document.getElementById('gmailAuthModal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    /**
     * Handle Gmail sign-up or login
     */
    async handleGmailAuth() {
        const email = document.getElementById('authModalEmail').value.trim();
        const password = document.getElementById('authModalPassword').value;
        const passwordConfirm = document.getElementById('authModalPasswordConfirm').value;
        const errorDiv = document.getElementById('authModalError');
        
        // Load users from storage
        this.loadGmailUsers();
        
        if (!email || !password) {
            this.showAuthError('Email and password are required', errorDiv);
            return;
        }
        
        // Validate Gmail
        if (!email.toLowerCase().includes('@gmail.com')) {
            this.showAuthError('Please use a valid Gmail address', errorDiv);
            return;
        }
        
        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters', errorDiv);
            return;
        }
        
        if (this.currentAuthMode === 'signup') {
            // Sign-up flow
            if (password !== passwordConfirm) {
                this.showAuthError('Passwords do not match', errorDiv);
                return;
            }
            
            if (this.gmailUsers.has(email)) {
                this.showAuthError('Email already registered', errorDiv);
                return;
            }
            
            try {
                // Hash password
                const hashedPassword = await this.hashPassword(password);
                
                // Store user
                this.gmailUsers.set(email, hashedPassword);
                this.saveGmailUsers();
                
                // Show success
                this.showAuthSuccess(`Account created successfully. Please log in.`, errorDiv);
                
                // Reset modal after short delay
                setTimeout(() => {
                    this.hideGmailAuthModal();
                }, 1500);
            } catch (error) {
                console.error('Sign-up error:', error);
                this.showAuthError('Sign-up failed. Please try again.', errorDiv);
            }
        } else {
            // Login flow - requires email + password validation
            try {
                const hashedPassword = await this.hashPassword(password);
                
                // Check if email exists in localStorage
                if (!this.gmailUsers.has(email)) {
                    this.showAuthError('Account does not exist. Please sign up first.', errorDiv);
                    return;
                }
                
                // Compare passwords
                const storedHash = this.gmailUsers.get(email);
                if (storedHash !== hashedPassword) {
                    this.showAuthError('Incorrect password.', errorDiv);
                    return;
                }
                
                // Successful login - email + password match
                this.wallet = {
                    address: email,
                    provider: 'Gmail',
                    connected: true,
                    authenticatedAt: new Date().toISOString()
                };
                this.currentGmailUser = email;
                this.isConnected = true;
                
                // Save session flag to localStorage
                localStorage.setItem('u2pay_logged_in', 'true');
                localStorage.setItem('u2pay_gmail_session', JSON.stringify({
                    email: email,
                    timestamp: new Date().toISOString()
                }));
                
                this.showAuthSuccess('Logged in successfully.', errorDiv);
                this.updateWalletUI();
                
                // Close modal
                setTimeout(() => {
                    this.hideGmailAuthModal();
                }, 800);
            } catch (error) {
                console.error('Login error:', error);
                this.showAuthError('Login failed. Please try again.', errorDiv);
            }
        }
    }

    /**
     * Show authentication error message
     */
    showAuthError(message, errorDiv) {
        errorDiv.textContent = '❌ ' + message;
        errorDiv.style.color = '#ef4444';
        errorDiv.style.display = 'block';
    }

    /**
     * Show authentication success message
     */
    showAuthSuccess(message, errorDiv) {
        errorDiv.textContent = '✅ ' + message;
        errorDiv.style.color = '#10b981';
        errorDiv.style.display = 'block';
    }

    /**
     * Disconnect Gmail user (logout)
     */
    disconnectGmail() {
        this.currentGmailUser = null;
        this.wallet = null;
        this.isConnected = false;
        localStorage.removeItem('u2pay_gmail_session');
        this.updateWalletUI();
    }

    /**
     * Check for existing Gmail session on page load
     */
    checkGmailSession() {
        try {
            const session = localStorage.getItem('u2pay_gmail_session');
            if (session) {
                const sessionData = JSON.parse(session);
                this.currentGmailUser = sessionData.email;
                this.wallet = {
                    address: sessionData.email,
                    provider: 'Gmail',
                    connected: true,
                    authenticatedAt: sessionData.timestamp
                };
                this.isConnected = true;
                this.updateWalletUI();
            }
        } catch (error) {
            console.warn('Session check error:', error);
            localStorage.removeItem('u2pay_gmail_session');
        }
    }

    async fetchWalletBalance() {
        if (!this.wallet || !this.wallet.address) return;

        try {
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [this.wallet.address, 'latest']
            });
            const balanceInEth = parseInt(balance, 16) / 1e18;
            document.getElementById('walletBalance').textContent = balanceInEth.toFixed(4);
        } catch (error) {
            console.error('Error fetching balance:', error);
            document.getElementById('walletBalance').textContent = '0.0000';
            console.warn('Could not fetch balance. Wallet may be disconnected or network unavailable.');
        }
    }

    updateWalletUI() {
        const authSection = document.getElementById('authSection');
        const linkedWallet = document.getElementById('linkedWallet');

        authSection.classList.add('hidden');
        linkedWallet.classList.remove('hidden');

        const shortAddress = this.wallet.address.substring(0, 6) + '...' + this.wallet.address.substring(this.wallet.address.length - 4);
        document.getElementById('connectedAddress').textContent = shortAddress;

        document.getElementById('connectMetaMask').disabled = true;
        document.getElementById('connectWalletConnect').disabled = true;
        document.getElementById('connectGmail').disabled = true;
        document.getElementById('connectGmailSignup').disabled = true;
        document.getElementById('startService').disabled = false;
    }

    disconnectWallet() {
        if (this.wallet && this.wallet.provider === 'Gmail') {
            this.disconnectGmail();
        } else {
            this.wallet = null;
            this.isConnected = false;
        }
        this.stopService();

        document.getElementById('authSection').classList.remove('hidden');
        document.getElementById('linkedWallet').classList.add('hidden');

        // Reset all connect buttons to their original state
        const connectMetaMaskBtn = document.getElementById('connectMetaMask');
        connectMetaMaskBtn.textContent = '🔗 Connect MetaMask';
        connectMetaMaskBtn.disabled = false;
        
        document.getElementById('connectWalletConnect').disabled = false;
        document.getElementById('connectGmail').disabled = false;
        document.getElementById('connectGmailSignup').disabled = false;
        document.getElementById('startService').disabled = true;
    }

    // ============================================
    // MODE MANAGEMENT
    // ============================================

    switchMode(mode) {
        this.currentMode = mode;

        // Update buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update content visibility
        document.getElementById('modeBalance').classList.toggle('active', mode === 'balance');
        document.getElementById('modeTime').classList.toggle('active', mode === 'time');

        // Reset metrics
        this.resetMetrics();
    }

    resetMetrics() {
        this.amountSpent = 0;
        this.elapsedNanoseconds = 0n;
        document.getElementById('amountSpent').textContent = '₹0.00';
        document.getElementById('amountRemaining').textContent = '₹0.00';
        document.getElementById('usagePercent').textContent = '0%';
        document.getElementById('timeElapsed').textContent = '0h 0m 0s';
        document.getElementById('currentCost').textContent = '₹0.00';
    }

    // ============================================
    // BALANCE-BASED STREAMING
    // ============================================

    setSessionSpendingCap() {
        // MANDATORY: Service cost must be defined first
        if (!this.serviceCostDefined) {
            alert('❌ Service cost must be defined first! Please define the service cost in the section above.');
            return;
        }

        const amount = parseFloat(document.getElementById('maxAmount').value);
        if (amount <= 0) {
            alert('❌ Please enter a valid session limit amount');
            return;
        }

        // CRITICAL VALIDATION: Session cap cannot exceed universal cap
        if (this.universalSpendingCap > 0 && amount > this.universalSpendingCap) {
            const currencySymbols = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
            const symbol = currencySymbols[this.serviceCostCurrency];
            alert(`❌ INVALID SESSION LIMIT!\n\nSession cap cannot exceed the Universal Spending Cap.\n\nUniversal Cap: ${symbol}${this.universalSpendingCap}\nYour Input: ${symbol}${amount}\n\nPlease enter a smaller amount (≤ ${symbol}${this.universalSpendingCap})`);
            return;
        }

        // Set SESSION cap ONLY (NOT universal cap)
        this.maxAmount = amount; // For backward compatibility
        this.sessionSpendingCap = amount; // NEW: independent session cap
        document.getElementById('amountRemaining').textContent = this.formatCurrency(amount);
        
        // Calculate maximum nanoseconds allowed based on service cost
        const maxNanoseconds = (BigInt(Math.floor(amount * 10000000000)) / this.costPerNanosecond);
        const maxTimeDisplay = this.formatNanosecondsToTime(maxNanoseconds);
        
        const currencySymbols = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
        const symbol = currencySymbols[this.serviceCostCurrency];
        
        // Show appropriate message depending on whether universal cap is set
        let confirmMessage = `✅ Session limit set to ${symbol}${amount}\n(approximately ${maxTimeDisplay} of service)\n\n⏱️ This applies to THIS SESSION ONLY.`;
        
        if (this.universalSpendingCap > 0) {
            confirmMessage += `\n\nUniversal Cap: ${symbol}${this.universalSpendingCap}\nSession Cap: ${symbol}${amount}`;
        }
        
        alert(confirmMessage);
    }

    setUniversalSpendingCap() {
        // NEW: Set universal (lifetime) spending cap
        const amount = parseFloat(document.getElementById('universalCapInput')?.value || 0);
        if (amount <= 0) {
            alert('❌ Please enter a valid universal spending cap amount');
            return;
        }

        // Set UNIVERSAL cap independently
        this.universalSpendingCap = amount;
        localStorage.setItem('u2pay_universal_cap', amount.toString());
        
        // Show confirmation
        const currencySymbols = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
        const symbol = currencySymbols[this.serviceCostCurrency];
        
        alert(`✅ UNIVERSAL SPENDING CAP SET\n\nMax lifetime spending: ${symbol}${amount}\n\nThis limit applies across ALL sessions.\nNo services can run once this cap is reached.`);
        
        // Update display
        const displayEl = document.getElementById('universalCapDisplay');
        if (displayEl) {
            displayEl.textContent = `${symbol}${amount} (set)`;
            displayEl.style.fontWeight = 'bold';
            displayEl.style.color = '#10b981';
        }
        
        console.log('✅ Universal spending cap set to:', amount);
    }

    resetUniversalCap() {
        // Confirm action
        const confirmReset = confirm('⚠️ ARE YOU SURE?\n\nThis will RESET your Universal Spending Cap AND clear all spending history.\n\nYou will be able to set a new universal cap and start fresh.');
        
        if (!confirmReset) {
            return;
        }

        // Reset universal cap
        this.universalSpendingCap = 0;
        this.globalCapReached = false;
        this.totalSpentSoFar = 0;
        this.previousSessionsSpent = 0;
        
        // Clear from localStorage
        localStorage.removeItem('u2pay_universal_cap');
        localStorage.setItem('u2pay_total_spent', '0');
        
        // Clear input field
        const inputEl = document.getElementById('universalCapInput');
        if (inputEl) {
            inputEl.value = '';
        }
        
        // Update display
        const displayEl = document.getElementById('universalCapDisplay');
        if (displayEl) {
            displayEl.textContent = '⏳ Not set yet';
            displayEl.style.fontWeight = 'normal';
            displayEl.style.color = '#6b7280';
            displayEl.style.background = 'rgba(99, 102, 241, 0.1)';
        }
        
        // Update session status
        const statusEl = document.getElementById('sessionStatus');
        if (statusEl && statusEl.textContent === '🛑 UNIVERSAL SPENDING CAP REACHED') {
            statusEl.textContent = 'Stopped';
            statusEl.className = 'status-idle';
        }
        
        alert('✅ UNIVERSAL CAP RESET!\n\nYour spending history has been cleared.\nYou can now set a new universal spending cap or start fresh.');
        console.log('✅ Universal spending cap and spending history reset');
    }

    // ============================================
    // TIME-BASED PRECISION BILLING
    // ============================================

    setTimeRate() {
        // MANDATORY: Service cost must be defined first
        if (!this.serviceCostDefined) {
            alert('❌ Service cost must be defined first! Please define the service cost in the section above.');
            return;
        }

        // In time-based mode, we use the service cost already defined
        // The cost per nanosecond is already set from defineServiceCost()
        
        const currencySymbols = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
        const symbol = currencySymbols[this.serviceCostCurrency];
        
        alert(`✅ Time-based billing ready! Rate: ${symbol}${this.serviceCostValue}/${this.serviceCostTimeUnit}`);

    }

    // ============================================
    // SERVICE CONTROL
    // ============================================

    startService() {
        // MANDATORY: Service cost must be defined first
        if (!this.serviceCostDefined) {
            alert('❌ Service cost must be defined first! Please define the service cost in the section above.');
            return;
        }

        if (!this.isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        if (this.currentMode === 'balance' && this.sessionSpendingCap <= 0) {
            alert('❌ Session spending limit not set! Please set a per-session spending limit in Balance Mode.');
            return;
        }

        // CRITICAL VALIDATION: Session cap cannot exceed universal cap
        if (this.universalSpendingCap > 0 && this.sessionSpendingCap > this.universalSpendingCap) {
            const currencySymbols = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
            const symbol = currencySymbols[this.serviceCostCurrency];
            alert(`❌ INVALID CONFIGURATION!\n\n⚠️ Session cap (${symbol}${this.sessionSpendingCap}) exceeds Universal cap (${symbol}${this.universalSpendingCap}).\n\nPlease adjust your session limit to be ≤ ${symbol}${this.universalSpendingCap} before starting service.`);
            return;
        }

        // CHECK: Universal spending cap reached (lifetime limit)?
        if (this.universalSpendingCap > 0 && this.totalSpentSoFar >= this.universalSpendingCap) {
            alert('❌ UNIVERSAL SPENDING CAP REACHED!\n\nYour lifetime spending limit has been exhausted.\nNo new sessions allowed.');
            this.globalCapReached = true;
            return;
        }

        this.isServiceActive = true;
        this.sessionStartTime = new Date();
        this.sessionStartTimestamp = Date.now();
        this.elapsedNanoseconds = 0n;
        this.previousSessionsSpent = this.totalSpentSoFar; // Save previous total BEFORE resetting current session
        this.currentSessionSpent = 0; // Reset session spending for new session

        // Generate session ID
        const sessionId = 'U2PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        document.getElementById('sessionId').textContent = sessionId;
        document.getElementById('sessionStart').textContent = this.sessionStartTime.toLocaleString();
        document.getElementById('sessionStatus').textContent = 'Active';
        document.getElementById('sessionStatus').className = 'status-active';

        document.getElementById('startService').classList.add('hidden');
        document.getElementById('stopService').classList.remove('hidden');
        document.getElementById('startService').disabled = true;
        document.getElementById('stopService').disabled = false;

        // Start consumption simulation
        this.startConsumptionSimulation();
    }

    stopService() {
        this.isServiceActive = false;
        this.cleanupIntervals();
        
        // Persist cumulative spending to localStorage
        this.saveTotalSpentToStorage();
        
        document.getElementById('startService').classList.remove('hidden');
        document.getElementById('stopService').classList.add('hidden');
        document.getElementById('startService').disabled = false;
        document.getElementById('stopService').disabled = true;

        document.getElementById('sessionStatus').textContent = 'Stopped';
        document.getElementById('sessionStatus').className = 'status-idle';

        document.getElementById('settlePayment').disabled = false;
    }

    startConsumptionSimulation() {
        if (!this.isServiceActive) return;

        this.simulationInterval = setInterval(() => {
            if (!this.isServiceActive) {
                clearInterval(this.simulationInterval);
                this.simulationInterval = null;
                return;
            }

            this.elapsedNanoseconds += BigInt(1e8); // 100ms in nanoseconds

            if (this.currentMode === 'balance') {
                this.updateBalanceMode();
            } else {
                this.updateTimeMode();
            }

            this.checkSpendingLimit();
        }, 100);
        
        this.activeIntervals.push(this.simulationInterval);
    }

    updateBalanceMode() {
        // Calculate cost from elapsed nanoseconds using service cost
        // cost = elapsed_ns * cost_per_ns
        const costScaled = Number(this.elapsedNanoseconds * this.costPerNanosecond);
        this.amountSpent = costScaled / 10000000000; // Unscale the value
        
        const remaining = Math.max(0, this.maxAmount - this.amountSpent);
        const percentage = ((this.amountSpent / this.maxAmount) * 100).toFixed(1);

        document.getElementById('amountSpent').textContent = this.formatCurrency(this.amountSpent);
        document.getElementById('amountRemaining').textContent = this.formatCurrency(remaining);
        document.getElementById('usagePercent').textContent = percentage + '%';
        document.getElementById('totalUsed').textContent = this.formatCurrency(this.amountSpent);
    }

    updateTimeMode() {
        // Calculate cost from elapsed nanoseconds using service cost
        // cost = elapsed_ns * cost_per_ns
        const costScaled = Number(this.elapsedNanoseconds * this.costPerNanosecond);
        this.amountSpent = costScaled / 10000000000; // Unscale the value

        const timeDisplay = this.formatNanosecondsToTime(this.elapsedNanoseconds);
        document.getElementById('timeElapsed').textContent = timeDisplay;
        document.getElementById('currentCost').textContent = this.formatCurrency(this.amountSpent);
        document.getElementById('totalUsed').textContent = this.formatCurrency(this.amountSpent);
    }

    checkSpendingLimit() {
        // Calculate total spending: previous sessions + current session spending
        const totalWithCurrentSession = this.previousSessionsSpent + (this.amountSpent || 0);
        
        // INDEPENDENT CAP CHECK 1: SESSION SPENDING CAP (per-session limit)
        if (this.sessionSpendingCap > 0 && this.amountSpent >= this.sessionSpendingCap) {
            if (document.getElementById('sessionStatus').textContent !== 'Session Spending Limit Reached') {
                document.getElementById('sessionStatus').className = 'status-limited';
                document.getElementById('sessionStatus').textContent = '🛑 Session Spending Limit Reached';
                this.sessionCapReached = true;

                if (document.getElementById('enableNotification').checked) {
                    this.playLimitReachedSound();
                }

                if (document.getElementById('autoStopEnabled').checked) {
                    this.stopService();
                }
            }
            return true; // Session limit exceeded
        }
        
        // INDEPENDENT CAP CHECK 2: UNIVERSAL SPENDING CAP (lifetime limit - takes priority)
        // This checks if previous sessions + current session spending >= universal cap
        if (this.universalSpendingCap > 0 && totalWithCurrentSession >= this.universalSpendingCap) {
            // Update total for tracking
            this.totalSpentSoFar = totalWithCurrentSession;
            if (!this.globalCapReached) {
                this.globalCapReached = true;
                document.getElementById('sessionStatus').className = 'status-limited';
                document.getElementById('sessionStatus').textContent = '🛑 UNIVERSAL SPENDING CAP REACHED';

                if (document.getElementById('enableNotification').checked) {
                    this.playLimitReachedSound();
                }

                if (document.getElementById('autoStopEnabled').checked) {
                    this.stopService();
                }
                
                console.error('❌ UNIVERSAL SPENDING CAP EXHAUSTED');
            }
            return true; // Global limit exceeded
        }
        
        return false; // Within both limits
    }

    playLimitReachedSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    cleanupIntervals() {
        this.activeIntervals.forEach(interval => clearInterval(interval));
        if (this.simulationInterval) clearInterval(this.simulationInterval);
        if (this.deviceUptimeInterval) clearInterval(this.deviceUptimeInterval);
        if (this.deviceDataInterval) clearInterval(this.deviceDataInterval);
        this.activeIntervals = [];
    }

    startTimeTracking() {
        setInterval(() => {
            if (!this.isServiceActive) return;
            // Time tracking is handled in startConsumptionSimulation
        }, 1000);
    }

    // ============================================
    // SETTLEMENT
    // ============================================

    async settlePayment() {
        if (this.amountSpent === 0) {
            alert('No usage to settle');
            return;
        }

        if (!this.wallet) {
            alert('Please connect wallet first');
            return;
        }

        const settlementAmount = this.amountSpent;
        const confirmed = confirm(`Settle payment of ${this.formatCurrency(settlementAmount)}?\n\nWallet: ${this.wallet.address}`);
        
        if (confirmed) {
            try {
                if (this.wsClient.isConnected) {
                    this.wsClient.send('settlement_request', {
                        sessionId: document.getElementById('sessionId').textContent,
                        amount: settlementAmount,
                        currency: this.currentCurrency,
                        userWallet: this.wallet.address,
                        mode: this.currentMode
                    });
                    alert('Settlement request sent! Processing payment...');
                } else {
                    alert('Backend not available. Settlement can only be processed when connected to backend.');
                }
                
                document.getElementById('settlePayment').disabled = true;
            } catch (error) {
                console.error('Settlement error:', error);
                alert('Error processing settlement: ' + error.message);
            }
        }
    }

    // ============================================
    // IoT SIMULATOR
    // ============================================

    simulateDeviceStart() {
        if (this.deviceUptimeInterval) clearInterval(this.deviceUptimeInterval);
        if (this.deviceDataInterval) clearInterval(this.deviceDataInterval);
        
        document.getElementById('simulateDeviceStart').classList.add('hidden');
        document.getElementById('simulateDeviceStop').classList.remove('hidden');
        document.getElementById('deviceStatus').textContent = 'Status: Active';
        document.getElementById('deviceStatus').className = 'device-status-active';

        let uptime = 0;
        this.deviceUptimeInterval = setInterval(() => {
            if (document.getElementById('simulateDeviceStop').classList.contains('hidden')) {
                clearInterval(this.deviceUptimeInterval);
                this.deviceUptimeInterval = null;
                return;
            }
            uptime++;
            document.getElementById('deviceUptime').textContent = `Uptime: ${uptime}s`;
        }, 1000);

        this.deviceDataInterval = setInterval(() => {
            if (document.getElementById('simulateDeviceStop').classList.contains('hidden')) {
                clearInterval(this.deviceDataInterval);
                this.deviceDataInterval = null;
                return;
            }
            const power = (Math.random() * 100 + 50).toFixed(0);
            const data = (Math.random() * 50 + 10).toFixed(1);
            const usage = (Math.random() * 100).toFixed(0);

            document.getElementById('devicePower').textContent = power;
            document.getElementById('deviceData').textContent = data;
            document.getElementById('deviceUsage').textContent = usage;
        }, 500);
    }

    simulateDeviceStop() {
        if (this.deviceUptimeInterval) clearInterval(this.deviceUptimeInterval);
        if (this.deviceDataInterval) clearInterval(this.deviceDataInterval);
        this.deviceUptimeInterval = null;
        this.deviceDataInterval = null;
        
        document.getElementById('simulateDeviceStart').classList.remove('hidden');
        document.getElementById('simulateDeviceStop').classList.add('hidden');
        document.getElementById('deviceStatus').textContent = 'Status: Idle';
        document.getElementById('deviceStatus').className = 'device-status-idle';
        document.getElementById('deviceUptime').textContent = 'Uptime: 0s';
        document.getElementById('devicePower').textContent = '0';
        document.getElementById('deviceData').textContent = '0';
        document.getElementById('deviceUsage').textContent = '0';
    }

    // ============================================
    // UTILITIES
    // ============================================

    formatCurrency(amount) {
        const symbol = this.currentCurrency === 'USD' ? '$' : this.currentCurrency === 'EUR' ? '€' : '₹';
        return symbol + amount.toFixed(2);
    }

    /**
     * Format nanoseconds as HH:MM:SS (never show nanoseconds to user)
     * @param {BigInt} nanoseconds - Time in nanoseconds
     * @returns {string} Formatted time string HH:MM:SS
     */
    formatNanosecondsToTime(nanoseconds) {
        const NS_PER_SECOND = 1000000000n;
        const NS_PER_MINUTE = NS_PER_SECOND * 60n;
        const NS_PER_HOUR = NS_PER_MINUTE * 60n;
        
        const hours = Number(nanoseconds / NS_PER_HOUR);
        const remainingAfterHours = nanoseconds % NS_PER_HOUR;
        
        const minutes = Number(remainingAfterHours / NS_PER_MINUTE);
        const remainingAfterMinutes = remainingAfterHours % NS_PER_MINUTE;
        
        const seconds = Number(remainingAfterMinutes / NS_PER_SECOND);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    exportData() {
        const data = {
            sessionId: document.getElementById('sessionId').textContent,
            sessionStart: document.getElementById('sessionStart').textContent,
            totalUsed: document.getElementById('totalUsed').textContent,
            currency: this.currentCurrency,
            mode: this.currentMode,
            timestamp: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `u2pay-session-${Date.now()}.json`;
        a.click();
    }

    // ============================================
    // GLOBAL SPENDING CAP PERSISTENCE
    // ============================================

    /**
     * Load cumulative spending from localStorage
     * This is the GLOBAL spending cap tracking across multiple sessions
     */
    loadTotalSpentFromStorage() {
        try {
            const stored = localStorage.getItem('u2pay_total_spent');
            if (stored) {
                this.totalSpentSoFar = parseFloat(stored) || 0;
            } else {
                this.totalSpentSoFar = 0;
            }
        } catch (error) {
            console.warn('Error loading total spent:', error);
            this.totalSpentSoFar = 0;
        }
    }

    /**
     * Save cumulative spending to localStorage
     * Called when service stops to persist global spending
     */
    saveTotalSpentToStorage() {
        try {
            // Update total spent: previous sessions + current session amount
            this.totalSpentSoFar = this.previousSessionsSpent + (this.amountSpent || 0);
            localStorage.setItem('u2pay_total_spent', this.totalSpentSoFar.toString());
        } catch (error) {
            console.error('Error saving total spent:', error);
        }
    }

    /**
     * Reset global spending cap (for account reset/testing only)
     */
    resetGlobalSpendingCap() {
        this.totalSpentSoFar = 0;
        this.currentSessionSpent = 0;
        this.globalCapReached = false;
        localStorage.removeItem('u2pay_total_spent');
    }
}

// Initialize app
const app = new U2PAYApp();
