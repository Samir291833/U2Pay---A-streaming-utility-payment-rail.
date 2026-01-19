// ============================================
// U2PAY - Wallet Management (MetaMask, WalletConnect)
// ============================================

class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.currentAccount = null;
        this.networkId = null;
        this.isConnected = false;
    }

    // Check if wallet is available
    isMetaMaskAvailable() {
        return typeof window.ethereum !== 'undefined';
    }

    // Get current provider
    getProvider() {
        if (!this.isMetaMaskAvailable()) {
            throw new Error('MetaMask is not installed');
        }
        return window.ethereum;
    }

    // Request accounts
    async requestAccounts() {
        try {
            const provider = this.getProvider();
            const accounts = await provider.request({ method: 'eth_requestAccounts' });
            this.currentAccount = accounts[0];
            this.isConnected = true;
            return accounts;
        } catch (error) {
            console.error('Error requesting accounts:', error);
            throw error;
        }
    }

    // Get current account
    async getCurrentAccount() {
        try {
            const provider = this.getProvider();
            const accounts = await provider.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.isConnected = true;
                return accounts[0];
            }
            return null;
        } catch (error) {
            console.error('Error getting current account:', error);
            return null;
        }
    }

    // Get balance
    async getBalance(address) {
        try {
            const provider = this.getProvider();
            const balance = await provider.request({
                method: 'eth_getBalance',
                params: [address || this.currentAccount, 'latest']
            });
            return BigInt(balance);
        } catch (error) {
            console.error('Error getting balance:', error);
            return BigInt(0);
        }
    }

    // Get network ID
    async getNetworkId() {
        try {
            const provider = this.getProvider();
            const chainId = await provider.request({ method: 'eth_chainId' });
            this.networkId = parseInt(chainId, 16);
            return this.networkId;
        } catch (error) {
            console.error('Error getting network ID:', error);
            return null;
        }
    }

    // Switch network
    async switchNetwork(chainId) {
        try {
            const provider = this.getProvider();
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x' + chainId.toString(16) }]
            });
            return true;
        } catch (error) {
            console.error('Error switching network:', error);
            return false;
        }
    }

    // Listen for account changes
    onAccountsChanged(callback) {
        const provider = this.getProvider();
        provider.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                this.isConnected = false;
                this.currentAccount = null;
            } else {
                this.currentAccount = accounts[0];
            }
            callback(accounts);
        });
    }

    // Listen for chain changes
    onChainChanged(callback) {
        const provider = this.getProvider();
        provider.on('chainChanged', (chainId) => {
            this.networkId = parseInt(chainId, 16);
            callback(chainId);
        });
    }

    // Listen for disconnect
    onDisconnect(callback) {
        const provider = this.getProvider();
        provider.on('disconnect', (error) => {
            this.isConnected = false;
            this.currentAccount = null;
            callback(error);
        });
    }

    // Disconnect
    disconnect() {
        this.isConnected = false;
        this.currentAccount = null;
        this.provider = null;
        this.signer = null;
    }
}

// Export for use in app.js
const walletManager = new WalletManager();
