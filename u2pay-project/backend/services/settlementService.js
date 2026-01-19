// ============================================
// U2PAY - Settlement Service (Payment Processing)
// ============================================

const nanosecondEngine = require('./nanosecondEngine');
const rateService = require('./rateService');

class SettlementService {
    constructor() {
        this.settlements = new Map();
        this.transactionHistory = [];
    }

    // Initiate settlement
    async initiateSettlement(sessionId, amount, userWallet, fiatCurrency = 'USD') {
        try {
            // Get session billing info
            const billing = nanosecondEngine.getBillingBreakdown(sessionId);
            if (!billing) {
                throw new Error('Session not found');
            }

            // Ensure amount doesn't exceed actual usage
            if (amount > billing.totalCost) {
                console.warn(`Requested amount ${amount} exceeds actual cost ${billing.totalCost}`);
                amount = billing.totalCost;
            }

            // Convert fiat to crypto
            const cryptoConversion = rateService.convertFiatToCrypto(amount, fiatCurrency, 'ETH');

            const settlement = {
                id: 'SETTLE-' + Date.now(),
                sessionId,
                status: 'pending',
                amount,
                fiatCurrency,
                cryptoAmount: cryptoConversion.cryptoAmount,
                cryptoType: 'ETH',
                userWallet,
                exchangeRate: cryptoConversion.rateUsed,
                timestamp: Date.now(),
                billing: billing,
                transactionHash: null
            };

            this.settlements.set(settlement.id, settlement);
            return settlement;
        } catch (error) {
            console.error('Settlement initiation error:', error);
            throw error;
        }
    }

    // Process payment (call smart contract)
    async settlePayment(sessionId, amount) {
        try {
            const settlement = await this.initiateSettlement(sessionId, amount, 'user-wallet');

            // In production, this would call the smart contract
            // For now, simulate successful transaction
            settlement.status = 'confirmed';
            settlement.transactionHash = '0x' + this.generateHash();

            this.transactionHistory.push({
                settlementId: settlement.id,
                sessionId,
                amount,
                cryptoAmount: settlement.cryptoAmount,
                timestamp: Date.now(),
                status: 'confirmed'
            });

            console.log(`Settlement confirmed: ${settlement.transactionHash}`);
            return settlement;
        } catch (error) {
            console.error('Payment settlement error:', error);
            throw error;
        }
    }

    // Check settlement status
    getSettlementStatus(settlementId) {
        return this.settlements.get(settlementId) || null;
    }

    // Get transaction history
    getTransactionHistory(limit = 20) {
        return this.transactionHistory.slice(-limit);
    }

    // Calculate final amount (with no overpayment guarantee)
    calculateFinalAmount(sessionId, maxAmount) {
        const billing = nanosecondEngine.getBillingBreakdown(sessionId);
        if (!billing) return null;

        // User never overpays - only pays what they used, capped by maxAmount
        const finalAmount = Math.min(billing.totalCost, maxAmount);

        return {
            totalUsed: billing.totalCost,
            maxAllowed: maxAmount,
            finalAmount: finalAmount,
            surplus: Math.max(0, maxAmount - finalAmount),
            currency: billing.currency
        };
    }

    // Refund unused balance
    async refundUnused(settlementId) {
        const settlement = this.settlements.get(settlementId);
        if (!settlement) {
            throw new Error('Settlement not found');
        }

        const actualCost = settlement.billing.totalCost;
        const paidAmount = settlement.amount;

        if (paidAmount > actualCost) {
            const refund = paidAmount - actualCost;
            
            // In production, process refund to wallet
            console.log(`Processing refund: ${refund}`);

            return {
                refundAmount: refund,
                originalAmount: paidAmount,
                actualCost: actualCost,
                timestamp: Date.now()
            };
        }

        return null;
    }

    // Validate payment amount against usage
    validatePaymentAmount(sessionId, paymentAmount) {
        const billing = nanosecondEngine.getBillingBreakdown(sessionId);
        if (!billing) {
            return { valid: false, error: 'Session not found' };
        }

        if (paymentAmount > billing.totalCost) {
            return {
                valid: true,
                warning: 'Payment exceeds actual usage. Excess will be refunded.',
                actualCost: billing.totalCost,
                excessAmount: paymentAmount - billing.totalCost
            };
        }

        return { valid: true };
    }

    // Generate transaction hash
    generateHash() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Get settlement summary
    getSettlementSummary() {
        const totalSettlements = this.settlements.size;
        const totalAmount = Array.from(this.settlements.values())
            .reduce((sum, s) => sum + s.amount, 0);

        return {
            totalSettlements,
            totalAmount,
            confirmedCount: Array.from(this.settlements.values())
                .filter(s => s.status === 'confirmed').length,
            pendingCount: Array.from(this.settlements.values())
                .filter(s => s.status === 'pending').length
        };
    }
}

module.exports = new SettlementService();
