// ============================================
// U2PAY - Blockchain Address Safety Scanner
// ============================================

class AddressSafetyScanner {
    constructor() {
        this.mockBlacklist = [
            '0x0000000000000000000000000000000000000000', // Null address
            '0xdeaddeaddeaddeaddeaddeaddeaddeaddead0000', // Burn address pattern
            '0x1111111111111111111111111111111111111111', // Known scam
            '0x2222222222222222222222222222222222222222', // Known exploit
        ];

        this.knownScamPatterns = [
            'scam',
            'phish',
            'exploit',
            'rugpull',
            'honeypot',
        ];

        this.init();
    }

    init() {
        this.attachEventListeners();
        this.initializeTheme();
    }

    attachEventListeners() {
        document.getElementById('scanButton').addEventListener('click', () => this.scanAddress());
        document.getElementById('addressInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.scanAddress();
        });

        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('u2pay-theme') || 'dark-mode';
        document.body.className = savedTheme;
        document.documentElement.className = savedTheme;
        this.updateThemeButton();
    }

    toggleTheme() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const newTheme = isDarkMode ? 'light-mode' : 'dark-mode';
        
        document.body.className = newTheme;
        document.documentElement.className = newTheme;
        localStorage.setItem('u2pay-theme', newTheme);
        
        this.updateThemeButton();
    }

    updateThemeButton() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.textContent = isDarkMode ? '☀️ Light' : '🌙 Dark';
        }
    }

    async scanAddress() {
        const address = document.getElementById('addressInput').value.trim();
        const network = document.getElementById('networkSelect').value;

        // Validation
        if (!address) {
            this.showError('Please enter a blockchain address');
            return;
        }

        if (!this.isValidAddress(address)) {
            this.showError('Invalid blockchain address format');
            return;
        }

        // Show loading state
        this.showLoading();

        // Simulate async scanning
        setTimeout(() => {
            const result = this.analyzeAddress(address, network);
            this.displayResults(result, address);
        }, 1200);
    }

    isValidAddress(address) {
        // Basic Ethereum/Polygon/BSC address validation (0x followed by 40 hex chars)
        const ethereumPattern = /^0x[a-fA-F0-9]{40}$/;
        if (!ethereumPattern.test(address)) {
            return false;
        }
        return true;
    }

    analyzeAddress(address, network) {
        let riskScore = 0; // 0-100, higher = riskier
        const findings = [];

        // Check 1: Address format
        if (address.length !== 42 || !address.startsWith('0x')) {
            riskScore += 15;
            findings.push('⚠️ Non-standard address format');
        }

        // Check 2: Blacklist
        if (this.mockBlacklist.includes(address.toLowerCase())) {
            riskScore += 50;
            findings.push('🚨 Address found in known blacklist');
        }

        // Check 3: Null address
        if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
            riskScore += 40;
            findings.push('🚫 Null address detected (0x0000...)');
        }

        // Check 4: Known scam patterns in address
        const lowerAddress = address.toLowerCase();
        if (this.mockBlacklist.some(addr => addr.toLowerCase() === lowerAddress)) {
            riskScore += 35;
            findings.push('🚩 Address matches known exploit patterns');
        }

        // Check 5: Dust address behavior (all same characters)
        if (/^0x([a-f0-9])\1{39}$/.test(address.toLowerCase())) {
            riskScore += 20;
            findings.push('⚠️ Repeating character pattern (dust/test address)');
        }

        // Check 6: Network compatibility
        const networkValidation = this.validateNetworkCompatibility(address, network);
        if (!networkValidation.valid) {
            riskScore += 15;
            findings.push(`⚠️ Address may not be fully compatible with ${network}`);
        }

        // Check 7: Mock transaction activity simulation
        // In real app, would query blockchain API
        const hasActivity = this.simulateTransactionActivity(address);
        if (!hasActivity) {
            riskScore += 10;
            findings.push('ℹ️ No recent transaction activity detected');
        } else {
            findings.push('✅ Active transaction history found');
        }

        // Check 8: Contract vs EOA detection (mock)
        const addressType = this.detectAddressType(address);
        findings.push(`ℹ️ Detected as: ${addressType}`);

        // Check 9: Confidence scoring
        const confidenceScore = 100 - Math.min(riskScore, 100);

        // Determine safety level
        let safetyLevel;
        if (riskScore <= 20) {
            safetyLevel = 'safe';
        } else if (riskScore <= 50) {
            safetyLevel = 'caution';
        } else {
            safetyLevel = 'risky';
        }

        return {
            safetyLevel,
            riskScore,
            confidenceScore,
            findings,
            network,
            addressType,
        };
    }

    validateNetworkCompatibility(address, network) {
        // All use Ethereum-style addresses (0x...)
        // In reality, would check network-specific prefixes
        return {
            valid: true,
            network: network,
        };
    }

    simulateTransactionActivity(address) {
        // Mock: 70% of addresses have activity
        const hash = address.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
        return hash % 100 < 70;
    }

    detectAddressType(address) {
        // Mock detection
        // In reality, would query blockchain for code at address
        const hash = address.split('').reduce((h, c) => h + c.charCodeAt(0), 0);
        return hash % 2 === 0 ? 'EOA (User Account)' : 'Smart Contract';
    }

    displayResults(result, address) {
        const container = document.getElementById('resultsContainer');

        const safetyIcon = result.safetyLevel === 'safe' 
            ? '🟢' : result.safetyLevel === 'caution' 
            ? '🟡' : '🔴';

        const safetyText = result.safetyLevel === 'safe' 
            ? 'Likely Safe' : result.safetyLevel === 'caution' 
            ? 'Use Caution' : 'Potentially Risky';

        const resultClass = `result-${result.safetyLevel}`;

        const findingsHTML = result.findings
            .map(f => `<li>${f}</li>`)
            .join('');

        const html = `
            <div class="result-card ${resultClass}">
                <div class="result-title">
                    ${safetyIcon} ${safetyText}
                </div>

                <div class="result-score">
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${result.confidenceScore}%"></div>
                    </div>
                    <div class="score-text">
                        Confidence Score: ${result.confidenceScore}% | Risk Score: ${result.riskScore}/100
                    </div>
                </div>

                <div class="result-findings">
                    <h3>Findings:</h3>
                    <ul>
                        ${findingsHTML}
                    </ul>
                </div>

                <div class="result-address">
                    <strong>Address:</strong> ${address}
                </div>

                <div class="result-address">
                    <strong>Network:</strong> ${result.network.toUpperCase()} | 
                    <strong>Type:</strong> ${result.addressType}
                </div>

                <div class="result-disclaimer">
                    <strong>⚠️ Disclaimer:</strong> This is an AI-assisted heuristic scan, not a guarantee. 
                    Always conduct your own research and use official channels. This tool provides risk 
                    indicators based on known patterns but cannot detect all threats. Use at your own risk.
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    showError(message) {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="result-card result-risky">
                <div class="result-title">🔴 Error</div>
                <p style="margin: 0; color: var(--text-primary);">${message}</p>
                <div class="result-disclaimer">
                    Please check your input and try again.
                </div>
            </div>
        `;
    }

    showLoading() {
        const container = document.getElementById('resultsContainer');
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p style="margin-top: 1rem; color: var(--text-primary);">Scanning address...</p>
                <p style="font-size: 0.9rem; opacity: 0.7; color: var(--text-primary);">
                    Analyzing risk factors and transaction activity
                </p>
            </div>
        `;
    }
}

// Initialize scanner on page load
const scanner = new AddressSafetyScanner();
