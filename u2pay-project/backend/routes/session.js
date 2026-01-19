// ============================================
// U2PAY - Session Routes
// ============================================

const express = require('express');
const router = express.Router();
const nanosecondEngine = require('../services/nanosecondEngine');

// Create new session
router.post('/create', (req, res) => {
    try {
        const { ratePerHour, fiatCurrency = 'USD', paymentMode = 'time' } = req.body;

        if (!ratePerHour && paymentMode === 'time') {
            return res.status(400).json({ error: 'Rate per hour required for time-based mode' });
        }

        const sessionId = 'U2PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const session = nanosecondEngine.createSession(sessionId, ratePerHour || 0, fiatCurrency);

        res.json({
            success: true,
            session: {
                sessionId: session.id,
                createdAt: new Date(),
                mode: paymentMode,
                currency: fiatCurrency,
                ratePerHour: session.ratePerHour
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get session details
router.get('/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = nanosecondEngine.sessions.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const billing = nanosecondEngine.getBillingBreakdown(sessionId);

        res.json({
            sessionId: session.id,
            active: session.active,
            billing,
            createdAt: session.startTime.toString(),
            currentTime: nanosecondEngine.getCurrentNanoseconds().toString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update session (keep alive)
router.put('/:sessionId/update', (req, res) => {
    try {
        const { sessionId } = req.params;
        nanosecondEngine.updateElapsedTime(sessionId);

        const billing = nanosecondEngine.getBillingBreakdown(sessionId);

        res.json({
            success: true,
            billing
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// End session
router.post('/:sessionId/end', (req, res) => {
    try {
        const { sessionId } = req.params;
        const billing = nanosecondEngine.endSession(sessionId);

        if (!billing) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            success: true,
            finalBilling: billing
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
