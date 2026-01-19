// ============================================
// U2PAY - Fiat ↔ Crypto Conversion (Hidden from User)
// ============================================

class FiatConversionManager {
    constructor() {
        this.exchangeRates = {
            'USD': 1.0,
            'EUR': 0.92,
            'INR': 83.5
        };
        this.cryptoPrice = {
            'ETH': 2500, // USD per ETH
            'USDC': 1
        };
        this.selectedCrypto = 'ETH';
        this.selectedFiat = 'USD';
        this.conversionHistory = [];
    }

    // Update exchange rates (simulate real-time API call)
    async updateExchangeRates() {
        try {
            // In production, call actual exchange rate API
            // For now, add small random variance
            Object.keys(this.exchangeRates).forEach(currency => {
                const variance = (Math.random() - 0.5) * 0.02; // ±1% variance
                this.exchangeRates[currency] *= (1 + variance);
            });
            return this.exchangeRates;
        } catch (error) {
            console.error('Error updating exchange rates:', error);
            return this.exchangeRates;
        }
    }

    // Update crypto prices
    async updateCryptoPrices() {
        try {
            // In production, call CoinGecko or similar
            Object.keys(this.cryptoPrice).forEach(crypto => {
                const variance = (Math.random() - 0.5) * 0.05; // ±2.5% variance
                this.cryptoPrice[crypto] *= (1 + variance);
            });
            return this.cryptoPrice;
        } catch (error) {
            console.error('Error updating crypto prices:', error);
            return this.cryptoPrice;
        }
    }

    // Convert fiat to crypto (user pays in fiat, system converts internally)
    convertFiatToCrypto(fiatAmount, fiatCurrency = 'USD', cryptoType = 'ETH') {
        // Step 1: Convert fiat to USD
        const amountInUSD = fiatAmount / this.exchangeRates[fiatCurrency];

        // Step 2: Convert USD to crypto
        const cryptoAmount = amountInUSD / this.cryptoPrice[cryptoType];

        // Log conversion for transparency
        this.conversionHistory.push({
            timestamp: Date.now(),
            fiatAmount,
            fiatCurrency,
            cryptoAmount,
            cryptoType,
            rateUsed: this.cryptoPrice[cryptoType]
        });

        return cryptoAmount;
    }

    // Convert crypto to fiat (for display purposes only)
    convertCryptoToFiat(cryptoAmount, cryptoType = 'ETH', fiatCurrency = 'USD') {
        // Step 1: Convert crypto to USD
        const amountInUSD = cryptoAmount * this.cryptoPrice[cryptoType];

        // Step 2: Convert USD to fiat
        const fiatAmount = amountInUSD * this.exchangeRates[fiatCurrency];

        return fiatAmount;
    }

    // Get conversion rate for display (if needed)
    getExchangeRate(fromFiat, toFiat) {
        return this.exchangeRates[fromFiat] / this.exchangeRates[toFiat];
    }

    // Get crypto price
    getCryptoPrice(cryptoType = 'ETH', fiatCurrency = 'USD') {
        const priceInUSD = this.cryptoPrice[cryptoType];
        return priceInUSD * this.exchangeRates[fiatCurrency];
    }

    // Set selected crypto
    setSelectedCrypto(crypto) {
        this.selectedCrypto = crypto;
    }

    // Set selected fiat
    setSelectedFiat(fiat) {
        this.selectedFiat = fiat;
    }

    // Get conversion history (for audit/transparency)
    getConversionHistory(limit = 10) {
        return this.conversionHistory.slice(-limit);
    }

    // Calculate slippage (difference between expected and actual)
    calculateSlippage(expectedAmount, actualAmount) {
        const difference = Math.abs(expectedAmount - actualAmount);
        const slippage = (difference / expectedAmount) * 100;
        return slippage.toFixed(4);
    }

    // Format currency for display
    formatFiatAmount(amount, currency = 'USD') {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'INR': '₹'
        };
        return symbols[currency] + amount.toFixed(2);
    }

    // Format crypto amount
    formatCryptoAmount(amount, crypto = 'ETH') {
        return amount.toFixed(8) + ' ' + crypto;
    }
}

// Export for use
const fiatConverter = new FiatConversionManager();

// Start periodic updates
setInterval(() => {
    fiatConverter.updateExchangeRates();
    fiatConverter.updateCryptoPrices();
}, 5000); // Update every 5 seconds
