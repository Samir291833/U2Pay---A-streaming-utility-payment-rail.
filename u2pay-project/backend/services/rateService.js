// ============================================
// U2PAY - Rate Service (Exchange & Crypto Prices)
// ============================================

class RateService {
    constructor() {
        this.exchangeRates = {
            'USD': 1.0,
            'EUR': 0.92,
            'INR': 83.5
        };
        this.cryptoPrices = {
            'ETH': 2500,
            'USDC': 1,
            'MATIC': 0.8
        };
        this.lastUpdate = Date.now();
        this.updateHistory = [];
    }

    // Get current exchange rates
    getRates() {
        return { ...this.exchangeRates };
    }

    // Get current crypto prices
    getCryptoPrices() {
        return { ...this.cryptoPrices };
    }

    // Update exchange rates (simulate API call)
    updateRates() {
        try {
            // In production, call real exchange rate API (e.g., Coinbase, Kraken)
            Object.keys(this.exchangeRates).forEach(currency => {
                const variance = (Math.random() - 0.5) * 0.02; // ±1%
                this.exchangeRates[currency] *= (1 + variance);
            });

            this.recordUpdate('rates');
            console.log('Exchange rates updated:', this.exchangeRates);
        } catch (error) {
            console.error('Error updating exchange rates:', error);
        }
    }

    // Update crypto prices (simulate API call)
    updateCryptoPrices() {
        try {
            // In production, call real crypto API (e.g., CoinGecko, Binance)
            Object.keys(this.cryptoPrices).forEach(crypto => {
                const variance = (Math.random() - 0.5) * 0.05; // ±2.5%
                this.cryptoPrices[crypto] *= (1 + variance);
            });

            this.recordUpdate('crypto');
            console.log('Crypto prices updated:', this.cryptoPrices);
        } catch (error) {
            console.error('Error updating crypto prices:', error);
        }
    }

    // Convert fiat to crypto
    convertFiatToCrypto(fiatAmount, fiatCurrency = 'USD', cryptoType = 'ETH') {
        // Convert to USD first
        const amountInUSD = fiatAmount / this.exchangeRates[fiatCurrency];

        // Convert USD to crypto
        const cryptoAmount = amountInUSD / this.cryptoPrices[cryptoType];

        return {
            fiatAmount,
            fiatCurrency,
            cryptoAmount,
            cryptoType,
            rateUsed: this.cryptoPrices[cryptoType],
            timestamp: Date.now()
        };
    }

    // Convert crypto to fiat
    convertCryptoToFiat(cryptoAmount, cryptoType = 'ETH', fiatCurrency = 'USD') {
        const amountInUSD = cryptoAmount * this.cryptoPrices[cryptoType];
        const fiatAmount = amountInUSD * this.exchangeRates[fiatCurrency];

        return {
            cryptoAmount,
            cryptoType,
            fiatAmount,
            fiatCurrency,
            rateUsed: this.cryptoPrices[cryptoType],
            timestamp: Date.now()
        };
    }

    // Get exchange rate between two fiat currencies
    getExchangeRate(fromFiat, toFiat) {
        return this.exchangeRates[fromFiat] / this.exchangeRates[toFiat];
    }

    // Get crypto price in specific fiat
    getCryptoPriceInFiat(cryptoType = 'ETH', fiatCurrency = 'USD') {
        const priceInUSD = this.cryptoPrices[cryptoType];
        return priceInUSD * this.exchangeRates[fiatCurrency];
    }

    // Record update for history
    recordUpdate(type) {
        this.updateHistory.push({
            type,
            timestamp: Date.now(),
            rates: { ...this.exchangeRates },
            cryptoPrices: { ...this.cryptoPrices }
        });

        // Keep only last 100 updates
        if (this.updateHistory.length > 100) {
            this.updateHistory.shift();
        }
    }

    // Get update history
    getUpdateHistory(limit = 10) {
        return this.updateHistory.slice(-limit);
    }

    // Calculate slippage
    calculateSlippage(expectedAmount, actualAmount) {
        const difference = Math.abs(expectedAmount - actualAmount);
        return (difference / expectedAmount) * 100;
    }
}

module.exports = new RateService();
