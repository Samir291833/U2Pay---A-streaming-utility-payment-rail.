// ============================================
// U2PAY - IoT Device Simulator
// Simulates EV charger, WiFi AP, or toll gate
// ============================================

const mqtt = require('mqtt');
const fs = require('fs');

class SimulatedDevice {
    constructor(config) {
        this.deviceId = config.deviceId || 'device-' + Math.random().toString(36).substr(2, 9);
        this.deviceType = config.deviceType || 'charger'; // charger, wifi, gate
        this.mqttBroker = config.mqttBroker || 'mqtt://localhost';
        this.client = null;
        this.isRunning = false;
        this.sessionId = null;
        
        // Device metrics
        this.consumption = 0;
        this.consumptionRate = config.consumptionRate || 0.5; // units per second
        this.spendingLimit = config.spendingLimit || 100;
        this.spent = 0;
        
        // Status
        this.status = 'idle';
        this.power = 0;
        this.uptime = 0;
    }

    // Connect to MQTT broker
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.client = mqtt.connect(this.mqttBroker);

                this.client.on('connect', () => {
                    console.log(`[${this.deviceId}] Connected to MQTT broker`);
                    
                    // Subscribe to commands
                    this.client.subscribe(`u2pay/devices/${this.deviceId}/commands`, (error) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });

                this.client.on('message', (topic, message) => {
                    this.handleCommand(JSON.parse(message.toString()));
                });

                this.client.on('error', (error) => {
                    console.error(`[${this.deviceId}] MQTT error:`, error);
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Publish device status
    publishStatus() {
        if (!this.client) return;

        const status = {
            deviceId: this.deviceId,
            type: this.deviceType,
            status: this.status,
            consumption: this.consumption,
            spent: this.spent,
            spendingLimit: this.spendingLimit,
            power: this.power,
            uptime: this.uptime,
            timestamp: Date.now()
        };

        this.client.publish(
            `u2pay/devices/${this.deviceId}/status`,
            JSON.stringify(status)
        );
    }

    // Publish usage data
    publishUsage() {
        if (!this.client || !this.isRunning) return;

        const usage = {
            deviceId: this.deviceId,
            sessionId: this.sessionId,
            consumption: this.consumptionRate,
            unit: this.deviceType === 'charger' ? 'kWh' : this.deviceType === 'wifi' ? 'GB' : 'transactions',
            timestamp: Date.now()
        };

        this.client.publish(
            `u2pay/devices/${this.deviceId}/usage`,
            JSON.stringify(usage)
        );

        // Update local metrics
        this.consumption += this.consumptionRate;
        this.spent += this.consumptionRate * 0.5; // Simulate cost
    }

    // Handle commands from server
    handleCommand(command) {
        console.log(`[${this.deviceId}] Command received:`, command.command);

        switch (command.command) {
            case 'start_billing':
                this.startBilling(command.sessionId, command.rate);
                break;

            case 'stop_billing':
                this.stopBilling();
                break;

            case 'set_spending_limit':
                this.setSpendingLimit(command.maxAmount);
                break;

            case 'get_status':
                this.publishStatus();
                break;

            case 'emergency_stop':
                this.emergencyStop();
                break;

            default:
                console.log(`[${this.deviceId}] Unknown command: ${command.command}`);
        }
    }

    // Start billing session
    startBilling(sessionId, rate) {
        this.sessionId = sessionId;
        this.isRunning = true;
        this.status = 'active';
        this.consumption = 0;
        this.spent = 0;
        this.uptime = 0;

        console.log(`[${this.deviceId}] Billing started: ${sessionId}`);
        this.publishStatus();

        // Start consumption simulation
        this.startConsumption();
    }

    // Stop billing session
    stopBilling() {
        this.isRunning = false;
        this.status = 'idle';
        this.power = 0;

        console.log(`[${this.deviceId}] Billing stopped`);
        this.publishStatus();
    }

    // Set spending limit
    setSpendingLimit(maxAmount) {
        this.spendingLimit = maxAmount;
        console.log(`[${this.deviceId}] Spending limit set: ${maxAmount}`);
    }

    // Start consumption simulation
    startConsumption() {
        if (!this.isRunning) return;

        const interval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(interval);
                return;
            }

            // Simulate power usage
            this.power = Math.random() * 100 + 50; // 50-150 W
            this.uptime++;

            // Check spending limit
            if (this.spent >= this.spendingLimit) {
                console.log(`[${this.deviceId}] ⚠️ Spending limit reached!`);
                this.emergencyStop();
                clearInterval(interval);
                return;
            }

            // Publish usage every second
            this.publishUsage();
        }, 1000);
    }

    // Emergency stop
    emergencyStop() {
        this.isRunning = false;
        this.status = 'stopped';
        this.power = 0;

        console.log(`[${this.deviceId}] 🛑 Emergency stop triggered`);
        this.publishStatus();
    }

    // Simulate device startup
    async startup() {
        console.log(`[${this.deviceId}] Starting device simulation...`);
        await this.connect();
        this.status = 'ready';
        this.publishStatus();
        console.log(`[${this.deviceId}] ✓ Device ready`);
    }

    // Simulate device shutdown
    shutdown() {
        if (this.isRunning) {
            this.stopBilling();
        }
        if (this.client) {
            this.client.end();
        }
        console.log(`[${this.deviceId}] Device shutdown`);
    }

    // Get device stats
    getStats() {
        return {
            deviceId: this.deviceId,
            deviceType: this.deviceType,
            status: this.status,
            consumption: this.consumption,
            spent: this.spent,
            spendingLimit: this.spendingLimit,
            remainingBudget: this.spendingLimit - this.spent,
            uptime: this.uptime,
            power: this.power.toFixed(2),
            isRunning: this.isRunning
        };
    }
}

// ============================================
// DEVICE FLEET MANAGER
// ============================================

class DeviceFleetManager {
    constructor() {
        this.devices = new Map();
    }

    addDevice(config) {
        const device = new SimulatedDevice(config);
        this.devices.set(device.deviceId, device);
        return device;
    }

    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }

    async startAllDevices() {
        const promises = Array.from(this.devices.values()).map(device => device.startup());
        await Promise.all(promises);
    }

    shutdownAllDevices() {
        this.devices.forEach(device => device.shutdown());
    }

    getFleetStats() {
        const stats = {
            totalDevices: this.devices.size,
            activeDevices: 0,
            totalConsumption: 0,
            totalSpent: 0,
            devices: []
        };

        this.devices.forEach(device => {
            const deviceStats = device.getStats();
            stats.devices.push(deviceStats);
            
            if (device.isRunning) {
                stats.activeDevices++;
            }
            stats.totalConsumption += device.consumption;
            stats.totalSpent += device.spent;
        });

        return stats;
    }

    printFleetStatus() {
        const stats = this.getFleetStats();
        console.log('\n' + '='.repeat(60));
        console.log('DEVICE FLEET STATUS');
        console.log('='.repeat(60));
        console.log(`Total Devices: ${stats.totalDevices}`);
        console.log(`Active Devices: ${stats.activeDevices}`);
        console.log(`Total Consumption: ${stats.totalConsumption.toFixed(2)}`);
        console.log(`Total Spent: ${stats.totalSpent.toFixed(2)}`);
        console.log('-'.repeat(60));
        
        stats.devices.forEach(device => {
            console.log(`[${device.deviceId}]`);
            console.log(`  Type: ${device.deviceType}`);
            console.log(`  Status: ${device.status}`);
            console.log(`  Power: ${device.power} W`);
            console.log(`  Uptime: ${device.uptime}s`);
            console.log(`  Spent: ${device.spent.toFixed(2)} / ${device.spendingLimit.toFixed(2)}`);
        });
        console.log('='.repeat(60) + '\n');
    }
}

// ============================================
// CLI INTERFACE (if running directly)
// ============================================

if (require.main === module) {
    const manager = new DeviceFleetManager();

    // Create sample devices
    manager.addDevice({
        deviceId: 'charger-001',
        deviceType: 'charger',
        spendingLimit: 500
    });

    manager.addDevice({
        deviceId: 'wifi-001',
        deviceType: 'wifi',
        spendingLimit: 200
    });

    manager.addDevice({
        deviceId: 'gate-001',
        deviceType: 'gate',
        spendingLimit: 100
    });

    // Start all devices
    manager.startAllDevices().then(() => {
        console.log('\n✓ All devices started\n');

        // Print status every 10 seconds
        setInterval(() => {
            manager.printFleetStatus();
        }, 10000);

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nShutting down devices...');
            manager.shutdownAllDevices();
            process.exit(0);
        });
    }).catch(error => {
        console.error('Error starting devices:', error);
        process.exit(1);
    });
}

module.exports = { SimulatedDevice, DeviceFleetManager };
