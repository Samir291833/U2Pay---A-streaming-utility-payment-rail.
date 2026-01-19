// ============================================
// U2PAY - WebSocket Client (Real-time Updates)
// ============================================

class WebSocketClient {
    constructor(serverUrl = 'ws://localhost:8080') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.listeners = new Map();
        this.isConnected = false;
    }

    // Connect to WebSocket server
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.addEventListener('open', () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connected');
                    resolve();
                });

                this.ws.addEventListener('message', (event) => {
                    this.handleMessage(event.data);
                });

                this.ws.addEventListener('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                    reject(error);
                });

                this.ws.addEventListener('close', () => {
                    console.log('WebSocket closed');
                    this.isConnected = false;
                    this.emit('disconnected');
                    this.attemptReconnect();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Attempt to reconnect
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
            this.emit('reconnect_failed');
        }
    }

    // Handle incoming message
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const { type, payload } = message;

            if (this.listeners.has(type)) {
                const callbacks = this.listeners.get(type);
                callbacks.forEach(callback => callback(payload));
            }

            // Also emit generic 'message' event
            this.emit('message', message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    // Send message to server
    send(type, payload = {}) {
        if (!this.isConnected) {
            console.warn('WebSocket not connected');
            return false;
        }

        try {
            const message = JSON.stringify({ type, payload, timestamp: Date.now() });
            this.ws.send(message);
            return true;
        } catch (error) {
            console.error('Error sending WebSocket message:', error);
            return false;
        }
    }

    // Subscribe to message type
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    // Unsubscribe from message type
    off(type, callback) {
        if (this.listeners.has(type)) {
            const callbacks = this.listeners.get(type);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Emit internal event
    emit(event, data) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            callbacks.forEach(callback => callback(data));
        }
    }

    // Disconnect
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.isConnected = false;
        }
    }

    // Update streaming data
    updateStreamingData(sessionId, data) {
        return this.send('streaming_update', {
            sessionId,
            elapsedNanoseconds: data.elapsedNanoseconds,
            currentCost: data.currentCost,
            timestamp: Date.now()
        });
    }

    // Request settlement
    requestSettlement(sessionId, amount) {
        return this.send('request_settlement', {
            sessionId,
            amount,
            timestamp: Date.now()
        });
    }

    // Request rate update
    requestRateUpdate() {
        return this.send('request_rates');
    }

    // Send IoT device status
    sendDeviceStatus(deviceId, status) {
        return this.send('device_status', {
            deviceId,
            status,
            timestamp: Date.now()
        });
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            serverUrl: this.serverUrl
        };
    }
}

// Initialize WebSocket client (with fallback if server not available)
const wsClient = new WebSocketClient(
    window.location.protocol === 'https:' ? 'wss://localhost:8080' : 'ws://localhost:8080'
);

// Try to connect, but don't fail if server is unavailable
wsClient.connect().catch(error => {
    console.warn('Could not connect to WebSocket server (it may not be running)', error);
    // App will continue to work in offline mode
});

// Listen for rate updates
wsClient.on('rate_update', (data) => {
    if (window.fiatConverter) {
        window.fiatConverter.exchangeRates = data.rates;
        window.fiatConverter.cryptoPrice = data.cryptoPrices;
    }
});

// Listen for settlement confirmation
wsClient.on('settlement_confirmed', (data) => {
    if (window.uiUpdater) {
        window.uiUpdater.showNotification(
            `Settlement confirmed: ${data.transactionHash}`,
            'success'
        );
    }
});

// Listen for errors
wsClient.on('error', (error) => {
    if (window.uiUpdater) {
        window.uiUpdater.showNotification('Connection error. Working in offline mode.', 'error');
    }
});
