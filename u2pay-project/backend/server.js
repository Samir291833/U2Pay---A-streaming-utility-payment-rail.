// ============================================
// U2PAY - Node.js Backend Server
// ============================================

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const WebSocketServer = require('ws').Server;

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Import routes and services
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const usageRoutes = require('./routes/usage');
const rateService = require('./services/rateService');
const nanosecondEngine = require('./services/nanosecondEngine');
const settlementService = require('./services/settlementService');
const iotBridge = require('./utils/iotBridge');

// ============================================
// ROUTE HANDLING
// ============================================

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/usage', usageRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================
// WEBSOCKET HANDLING
// ============================================

const connectedClients = new Set();

wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    connectedClients.add(ws);

    // Send initial rates to client
    ws.send(JSON.stringify({
        type: 'initial_rates',
        payload: {
            rates: rateService.getRates(),
            cryptoPrices: rateService.getCryptoPrices()
        }
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleWebSocketMessage(ws, message);
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Invalid message format' }
            }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// WebSocket message handler
function handleWebSocketMessage(ws, message) {
    const { type, payload } = message;

    switch (type) {
        case 'streaming_update':
            handleStreamingUpdate(ws, payload);
            break;

        case 'request_settlement':
            handleSettlementRequest(ws, payload);
            break;

        case 'request_rates':
            sendRateUpdate(ws);
            break;

        case 'device_status':
            handleDeviceStatus(payload);
            break;

        case 'ping':
            ws.send(JSON.stringify({ type: 'pong', payload: { timestamp: Date.now() } }));
            break;

        default:
            console.warn('Unknown message type:', type);
    }
}

// ============================================
// STREAMING UPDATE HANDLER
// ============================================

function handleStreamingUpdate(ws, payload) {
    const { sessionId, elapsedNanoseconds, currentCost } = payload;

    // Log streaming data
    console.log(`Session ${sessionId}: ${elapsedNanoseconds}ns elapsed, ${currentCost} cost`);

    // Broadcast to all connected clients (optional)
    // broadcastToClients({
    //     type: 'streaming_update',
    //     payload: { sessionId, elapsedNanoseconds, currentCost }
    // });
}

// ============================================
// SETTLEMENT HANDLER
// ============================================

async function handleSettlementRequest(ws, payload) {
    const { sessionId, amount } = payload;

    try {
        // Call settlement service
        const settlementResult = await settlementService.settlePayment(sessionId, amount);

        ws.send(JSON.stringify({
            type: 'settlement_confirmed',
            payload: {
                sessionId,
                amount,
                transactionHash: settlementResult.hash,
                timestamp: Date.now()
            }
        }));

        console.log(`Payment settled for session ${sessionId}: ${amount}`);
    } catch (error) {
        console.error('Settlement error:', error);
        ws.send(JSON.stringify({
            type: 'settlement_error',
            payload: { sessionId, message: error.message }
        }));
    }
}

// ============================================
// RATE UPDATE SENDER
// ============================================

function sendRateUpdate(ws) {
    ws.send(JSON.stringify({
        type: 'rate_update',
        payload: {
            rates: rateService.getRates(),
            cryptoPrices: rateService.getCryptoPrices(),
            timestamp: Date.now()
        }
    }));
}

// Broadcast to all clients
function broadcastToClients(message) {
    const data = JSON.stringify(message);
    connectedClients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(data);
        }
    });
}

// ============================================
// DEVICE STATUS HANDLER
// ============================================

function handleDeviceStatus(payload) {
    const { deviceId, status } = payload;
    console.log(`Device ${deviceId} status update:`, status);

    // Broadcast to other clients
    broadcastToClients({
        type: 'device_status_update',
        payload: { deviceId, status }
    });
}

// ============================================
// PERIODIC UPDATES
// ============================================

// Update rates every 5 seconds
setInterval(() => {
    rateService.updateRates();
    rateService.updateCryptoPrices();

    broadcastToClients({
        type: 'rate_update',
        payload: {
            rates: rateService.getRates(),
            cryptoPrices: rateService.getCryptoPrices(),
            timestamp: Date.now()
        }
    });
}, 5000);

// ============================================
// ERROR HANDLING
// ============================================

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(error.status || 500).json({
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║       U2PAY Backend Server Started        ║
    ╚═══════════════════════════════════════════╝
    
    API Server:       http://${HOST}:${PORT}
    WebSocket Server: ws://${HOST}:8080
    Health Check:     http://${HOST}:${PORT}/api/health
    
    Environment:      ${process.env.NODE_ENV || 'development'}
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, wss, broadcastToClients };
