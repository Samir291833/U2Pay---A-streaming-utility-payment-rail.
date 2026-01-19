// ============================================
// U2PAY - Streaming & Real-time Balance Tracking
// ============================================

class StreamingEngine {
    constructor() {
        this.activeStreams = new Map();
        this.sessionData = {};
        this.updateInterval = 100; // ms
    }

    // Create new streaming session
    createSession(sessionId, config) {
        const session = {
            id: sessionId,
            startTime: Date.now(),
            startNanoseconds: this.getCurrentNanoseconds(),
            config: config,
            elapsedNanoseconds: 0n,
            totalCost: 0,
            active: true,
            consumptionHistory: []
        };

        this.activeStreams.set(sessionId, session);
        this.sessionData[sessionId] = session;
        return session;
    }

    // Get current nanosecond timestamp
    getCurrentNanoseconds() {
        const now = Date.now();
        const nanos = performance.now() % 1000;
        return BigInt(now) * BigInt(1e6) + BigInt(Math.floor(nanos * 1e6));
    }

    // Update streaming session
    updateSession(sessionId, consumptionAmount) {
        const session = this.activeStreams.get(sessionId);
        if (!session) return null;

        const currentNs = this.getCurrentNanoseconds();
        const elapsed = currentNs - session.startNanoseconds;
        session.elapsedNanoseconds = elapsed;

        session.totalCost += consumptionAmount;
        session.consumptionHistory.push({
            timestamp: currentNs,
            amount: consumptionAmount,
            totalCost: session.totalCost
        });

        return session;
    }

    // Check if session exceeded limit
    isLimitExceeded(sessionId, limit) {
        const session = this.activeStreams.get(sessionId);
        if (!session) return false;
        return session.totalCost >= limit;
    }

    // Format nanoseconds to time display (Hours, Minutes, Seconds only)
    formatNanosecondsToTime(nanos) {
        const totalSeconds = Number(nanos / BigInt(1e9));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        return {
            hours,
            minutes,
            seconds,
            formatted: `${hours}h ${minutes}m ${seconds}s`
        };
    }

    // Calculate cost from nanoseconds using rate
    calculateCost(nanoseconds, ratePerNanosecond) {
        // ratePerNanosecond should be in a format that preserves precision
        const cost = Number(nanoseconds * ratePerNanosecond) / 1e18;
        return cost;
    }

    // Get session summary
    getSessionSummary(sessionId) {
        const session = this.activeStreams.get(sessionId);
        if (!session) return null;

        return {
            sessionId: session.id,
            duration: this.formatNanosecondsToTime(session.elapsedNanoseconds),
            totalCost: session.totalCost,
            averageCostPerSecond: session.totalCost / (Number(session.elapsedNanoseconds) / 1e9),
            consumptionCount: session.consumptionHistory.length
        };
    }

    // End streaming session
    endSession(sessionId) {
        const session = this.activeStreams.get(sessionId);
        if (session) {
            session.active = false;
            const summary = this.getSessionSummary(sessionId);
            this.activeStreams.delete(sessionId);
            return summary;
        }
        return null;
    }

    // Convert time units to cost per nanosecond
    convertTimeRateToNanoseconds(ratePerHour, ratePerMinute) {
        // If ratePerHour provided
        if (ratePerHour > 0) {
            const ratePerSecond = ratePerHour / 3600;
            const ratePerNanosecond = ratePerSecond / 1e9;
            return BigInt(Math.floor(ratePerNanosecond * 1e18));
        }

        // If ratePerMinute provided
        if (ratePerMinute > 0) {
            const ratePerSecond = ratePerMinute / 60;
            const ratePerNanosecond = ratePerSecond / 1e9;
            return BigInt(Math.floor(ratePerNanosecond * 1e18));
        }

        return BigInt(0);
    }

    // Get active sessions count
    getActiveSessionsCount() {
        return Array.from(this.activeStreams.values()).filter(s => s.active).length;
    }
}

// Export for use
const streamingEngine = new StreamingEngine();
