// ============================================
// U2PAY - Usage Routes (Metering & Settlement)
// ============================================

const express = require('express');
const router = express.Router();
const nanosecondEngine = require('../services/nanosecondEngine');
const settlementService = require('../services/settlementService');

// Log usage event
router.post('/log', (req, res) => {
    try {
        const { sessionId, description, metadata } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        nanosecondEngine.logConsumption(sessionId, description, metadata);

        res.json({
            success: true,
            message: 'Usage logged'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get usage statistics
router.get('/:sessionId/stats', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const billing = nanosecondEngine.getBillingBreakdown(sessionId);
        if (!billing) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const consumptionLog = nanosecondEngine.getConsumptionLog(sessionId);

        res.json({
            sessionId,
            billing,
            eventCount: consumptionLog.length,
            events: consumptionLog
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Request settlement
router.post('/:sessionId/settle', (req, res) => {
    try {
        const { sessionId } = req.params;
        const { amount, userWallet, fiatCurrency = 'USD' } = req.body;

        if (!amount || !userWallet) {
            return res.status(400).json({ error: 'Amount and wallet address required' });
        }

        // Validate amount
        const validation = settlementService.validatePaymentAmount(sessionId, amount);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        // Process settlement
        const settlement = settlementService.initiateSettlement(sessionId, amount, userWallet, fiatCurrency);

        res.json({
            success: true,
            settlement: {
                settlementId: settlement.id,
                sessionId: settlement.sessionId,
                amount: settlement.amount,
                cryptoAmount: settlement.cryptoAmount,
                status: settlement.status,
                timestamp: settlement.timestamp
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get settlement status
router.get('/:sessionId/settlement-status/:settlementId', (req, res) => {
    try {
        const { settlementId } = req.params;
        const settlement = settlementService.getSettlementStatus(settlementId);

        if (!settlement) {
            return res.status(404).json({ error: 'Settlement not found' });
        }

        res.json({
            settlementId: settlement.id,
            status: settlement.status,
            transactionHash: settlement.transactionHash,
            amount: settlement.amount,
            cryptoAmount: settlement.cryptoAmount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transaction history
router.get('/history/transactions', (req, res) => {
    try {
        const history = settlementService.getTransactionHistory();
        
        res.json({
            totalTransactions: history.length,
            transactions: history
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
