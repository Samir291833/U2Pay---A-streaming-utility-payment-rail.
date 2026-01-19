// ============================================
// U2PAY - Nanosecond Precision Engine
// ============================================

class NanosecondEngine {
    constructor() {
        this.sessions = new Map();
        this.precision = {
            nanosecond: 1,
            microsecond: 1000,
            millisecond: 1000000,
            second: 1000000000,
            minute: 60000000000n,
            hour: 3600000000000n
        };
    }

    // Create billing session
    createSession(sessionId, ratePerHour, fiatCurrency = 'USD') {
        const session = {
            id: sessionId,
            startTime: BigInt(Date.now() * 1000000), // Convert to nanoseconds
            ratePerHour,
            fiatCurrency,
            elapsedNanoseconds: BigInt(0),
            totalCost: 0,
            active: true,
            consumptionLog: []
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    // Get current nanosecond timestamp
    getCurrentNanoseconds() {
        // Use Date.now() with additional precision from performance.now()
        const dateNs = BigInt(Date.now() * 1000000);
        const perfNs = BigInt(Math.floor(performance.now() * 1000000));
        return dateNs + (perfNs % BigInt(1000000000));
    }

    // Update elapsed time (internally in nanoseconds)
    updateElapsedTime(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const currentNs = this.getCurrentNanoseconds();
        const elapsed = currentNs - session.startTime;
        session.elapsedNanoseconds = elapsed;

        return session;
    }

    // Calculate cost from nanoseconds
    calculateCost(nanoseconds, ratePerHour) {
        // Convert nanoseconds to hours
        const hours = Number(nanoseconds) / Number(this.precision.hour);
        const cost = hours * ratePerHour;
        return cost;
    }

    // Convert nanoseconds to time display (Hours, Minutes, Seconds only)
    formatTimeDisplay(nanoseconds) {
        const ns = typeof nanoseconds === 'bigint' ? Number(nanoseconds) : nanoseconds;
        
        const totalSeconds = Math.floor(ns / this.precision.second);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return {
            hours,
            minutes,
            seconds,
            formatted: `${hours}h ${minutes}m ${seconds}s`,
            totalSeconds
        };
    }

    // Get billing breakdown
    getBillingBreakdown(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const timeDisplay = this.formatTimeDisplay(session.elapsedNanoseconds);
        const cost = this.calculateCost(session.elapsedNanoseconds, session.ratePerHour);

        return {
            sessionId: session.id,
            duration: timeDisplay,
            rate: session.ratePerHour,
            totalCost: cost,
            currency: session.fiatCurrency,
            costPerSecond: cost / timeDisplay.totalSeconds,
            costPerMinute: cost / (timeDisplay.totalSeconds / 60),
            costPerHour: session.ratePerHour,
            nanoseconds: session.elapsedNanoseconds.toString()
        };
    }

    // Check if time limit reached
    hasTimeExceeded(sessionId, maxNanoseconds) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        return session.elapsedNanoseconds >= BigInt(maxNanoseconds);
    }

    // Check if cost limit reached
    hasCostExceeded(sessionId, maxCost) {
        const breakdown = this.getBillingBreakdown(sessionId);
        if (!breakdown) return false;

        return breakdown.totalCost >= maxCost;
    }

    // Convert time units to nanoseconds
    convertToNanoseconds(value, unit) {
        const units = {
            'ns': BigInt(1),
            'us': BigInt(1000),
            'ms': BigInt(1000000),
            's': BigInt(1000000000),
            'm': BigInt(60000000000),
            'h': BigInt(3600000000000),
            'd': BigInt(86400000000000)
        };

        return BigInt(value) * units[unit];
    }

    // End session and get final bill
    endSession(sessionId) {
        this.updateElapsedTime(sessionId);
        const breakdown = this.getBillingBreakdown(sessionId);
        
        const session = this.sessions.get(sessionId);
        if (session) {
            session.active = false;
        }

        return breakdown;
    }

    // Get all active sessions
    getActiveSessions() {
        const active = [];
        this.sessions.forEach(session => {
            if (session.active) {
                active.push(session);
            }
        });
        return active;
    }

    // Log consumption for audit trail
    logConsumption(sessionId, description, metadata = {}) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.consumptionLog.push({
                timestamp: this.getCurrentNanoseconds().toString(),
                description,
                metadata
            });
        }
    }

    // Get consumption audit log
    getConsumptionLog(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? session.consumptionLog : [];
    }
}

module.exports = new NanosecondEngine();
