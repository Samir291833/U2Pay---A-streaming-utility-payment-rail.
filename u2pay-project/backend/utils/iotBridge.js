// ============================================
// U2PAY - IoT Bridge (MQTT ↔ Payment Rail)
// ============================================

const mqtt = require('mqtt');

class IoTBridge {
    constructor(mqttUrl = process.env.MQTT_URL || 'mqtt://localhost') {
        this.mqttUrl = mqttUrl;
        this.client = null;
        this.sessions = new Map();
        this.devices = new Map();
    }

    // Connect to MQTT broker
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.client = mqtt.connect(this.mqttUrl);

                this.client.on('connect', () => {
                    console.log('Connected to MQTT broker');
                    
                    // Subscribe to device topics
                    this.client.subscribe('u2pay/devices/+/status');
                    this.client.subscribe('u2pay/devices/+/usage');
                    this.client.subscribe('u2pay/devices/+/commands');

                    resolve();
                });

                this.client.on('message', (topic, message) => {
                    this.handleMessage(topic, message);
                });

                this.client.on('error', (error) => {
                    console.error('MQTT error:', error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Handle incoming MQTT message
    handleMessage(topic, message) {
        try {
            const data = JSON.parse(message.toString());
            const topicParts = topic.split('/');

            if (topicParts[2] === 'devices') {
                const deviceId = topicParts[3];
                const messageType = topicParts[4];

                if (messageType === 'status') {
                    this.handleDeviceStatus(deviceId, data);
                } else if (messageType === 'usage') {
                    this.handleDeviceUsage(deviceId, data);
                }
            }
        } catch (error) {
            console.error('Error handling MQTT message:', error);
        }
    }

    // Handle device status update
    handleDeviceStatus(deviceId, data) {
        const device = {
            id: deviceId,
            status: data.status, // 'active', 'idle', 'offline'
            lastSeen: Date.now(),
            location: data.location,
            metadata: data.metadata || {}
        };

        this.devices.set(deviceId, device);
        console.log(`Device ${deviceId} status: ${data.status}`);

        // If device turned off, stop session
        if (data.status === 'offline' || data.status === 'idle') {
            const session = this.sessions.get(deviceId);
            if (session && session.active) {
                this.stopSession(deviceId);
            }
        }
    }

    // Handle device usage update
    handleDeviceUsage(deviceId, data) {
        const { sessionId, consumption, unit } = data;

        if (!sessionId) return;

        // Track consumption
        const usage = {
            deviceId,
            sessionId,
            consumption,
            unit, // 'kWh', 'GB', 'requests', etc.
            timestamp: Date.now()
        };

        // Log to payment system
        console.log(`Device ${deviceId} consumption: ${consumption}${unit}`);
    }

    // Start billing session for device
    startSession(deviceId, sessionId, ratePerHour) {
        const session = {
            deviceId,
            sessionId,
            ratePerHour,
            startedAt: Date.now(),
            active: true,
            totalConsumption: 0
        };

        this.sessions.set(deviceId, session);

        // Notify device
        this.publishCommand(deviceId, {
            command: 'start_billing',
            sessionId,
            rate: ratePerHour
        });

        console.log(`Billing session started for device ${deviceId}`);
    }

    // Stop billing session for device
    stopSession(deviceId) {
        const session = this.sessions.get(deviceId);
        if (!session) return;

        session.active = false;
        const duration = Date.now() - session.startedAt;

        // Notify device
        this.publishCommand(deviceId, {
            command: 'stop_billing',
            sessionId: session.sessionId,
            duration
        });

        console.log(`Billing session stopped for device ${deviceId}`);
    }

    // Publish command to device
    publishCommand(deviceId, command) {
        if (!this.client) return;

        const topic = `u2pay/devices/${deviceId}/commands`;
        const message = JSON.stringify({
            ...command,
            timestamp: Date.now()
        });

        this.client.publish(topic, message, (error) => {
            if (error) {
                console.error(`Error publishing to ${topic}:`, error);
            }
        });
    }

    // Set spending limit for device
    setSpendingLimit(deviceId, maxAmount, fiatCurrency = 'USD') {
        this.publishCommand(deviceId, {
            command: 'set_spending_limit',
            maxAmount,
            currency: fiatCurrency
        });
    }

    // Get device status
    getDeviceStatus(deviceId) {
        return this.devices.get(deviceId) || null;
    }

    // Get active sessions
    getActiveSessions() {
        const active = [];
        this.sessions.forEach(session => {
            if (session.active) {
                active.push(session);
            }
        });
        return active;
    }

    // Disconnect from MQTT
    disconnect() {
        if (this.client) {
            this.client.end();
            console.log('Disconnected from MQTT broker');
        }
    }
}

// Export singleton
let iotBridge = null;

async function getIoTBridge() {
    if (!iotBridge) {
        iotBridge = new IoTBridge();
        try {
            await iotBridge.connect();
        } catch (error) {
            console.warn('Could not connect to MQTT broker:', error.message);
        }
    }
    return iotBridge;
}

module.exports = { IoTBridge, getIoTBridge };
