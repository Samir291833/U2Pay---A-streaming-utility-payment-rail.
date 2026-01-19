// ============================================
// U2PAY - Authentication Routes
// ============================================

const express = require('express');
const router = express.Router();

// Connect wallet
router.post('/connect-wallet', (req, res) => {
    try {
        const { address, provider } = req.body;

        if (!address || !provider) {
            return res.status(400).json({ error: 'Address and provider required' });
        }

        // In production, verify signature
        const session = {
            address,
            provider,
            connectedAt: new Date(),
            sessionId: 'SESSION-' + Date.now()
        };

        res.json({
            success: true,
            session,
            message: 'Wallet connected successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify signature
router.post('/verify-signature', (req, res) => {
    try {
        const { address, signature, message } = req.body;

        // In production, verify signature with ethers or web3.js
        const isValid = true; // Placeholder

        res.json({
            valid: isValid,
            address,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login with Gmail
router.post('/gmail-login', (req, res) => {
    try {
        const { email, idToken } = req.body;

        // In production, verify Google ID token
        const session = {
            email,
            provider: 'Gmail',
            loginAt: new Date(),
            sessionId: 'SESSION-' + Date.now(),
            requiresWalletLink: true
        };

        res.json({
            success: true,
            session,
            message: 'Gmail login successful. Please link wallet.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
