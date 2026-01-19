// ============================================
// U2PAY - UI Updater (Live Display Management)
// ============================================

class UIUpdater {
    constructor() {
        this.updateInterval = 100; // ms
        this.isUpdating = false;
    }

    // Initialize UI updates
    startLiveUpdates() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        setInterval(() => {
            this.updateMetrics();
            this.updateBalanceDisplay();
            this.updateProgressBar();
        }, this.updateInterval);
    }

    stopLiveUpdates() {
        this.isUpdating = false;
    }

    // Update live metrics
    updateMetrics() {
        // This is called every 100ms
        // Specific updates handled by main app.js
    }

    // Update balance display
    updateBalanceDisplay() {
        const walletAddress = document.getElementById('connectedAddress');
        const balance = document.getElementById('walletBalance');

        if (walletAddress && balance) {
            // Balance already updated by wallet manager
        }
    }

    // Update progress bar based on usage
    updateProgressBar() {
        const usagePercent = document.getElementById('usagePercent');
        if (usagePercent) {
            const percentage = parseInt(usagePercent.textContent);
            
            // Change color based on usage
            if (percentage >= 80) {
                usagePercent.parentElement.style.borderColor = '#ef4444'; // Red
            } else if (percentage >= 50) {
                usagePercent.parentElement.style.borderColor = '#f59e0b'; // Amber
            } else {
                usagePercent.parentElement.style.borderColor = '#10b981'; // Green
            }
        }
    }

    // Format time for display (hours, minutes, seconds only)
    formatTimeDisplay(nanoseconds) {
        const totalSeconds = Number(nanoseconds / BigInt(1e9));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        return {
            display: `${hours}h ${minutes}m ${seconds}s`,
            hours,
            minutes,
            seconds
        };
    }

    // Update wallet status indicator
    updateWalletStatus(isConnected, address) {
        const walletStatus = document.getElementById('walletStatus');
        if (walletStatus) {
            if (isConnected) {
                walletStatus.style.color = '#10b981'; // Green
                const shortAddress = address.substring(0, 6) + '...' + address.substring(address.length - 4);
                walletStatus.textContent = '✓ ' + shortAddress;
            } else {
                walletStatus.style.color = '#ef4444'; // Red
                walletStatus.textContent = 'Not Connected';
            }
        }
    }

    // Update session status
    updateSessionStatus(status) {
        const statusElement = document.getElementById('sessionStatus');
        if (statusElement) {
            statusElement.textContent = status;
            
            switch (status.toLowerCase()) {
                case 'active':
                    statusElement.className = 'status-active';
                    break;
                case 'spending limit reached':
                    statusElement.className = 'status-limited';
                    break;
                default:
                    statusElement.className = 'status-idle';
            }
        }
    }

    // Show notification toast
    showNotification(message, type = 'info', duration = 3000) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Update metric card value
    updateMetricValue(metricId, value) {
        const element = document.getElementById(metricId);
        if (element) {
            element.textContent = value;
            element.parentElement.classList.add('slideIn');
            setTimeout(() => {
                element.parentElement.classList.remove('slideIn');
            }, 300);
        }
    }

    // Disable/Enable buttons
    disableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.5';
        }
    }

    enableButton(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = false;
            button.style.opacity = '1';
        }
    }

    // Toggle button visibility
    toggleButton(buttonId, show) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (show) {
                button.classList.remove('hidden');
            } else {
                button.classList.add('hidden');
            }
        }
    }

    // Update tab/mode display
    switchTab(tabId) {
        // Hide all tabs
        document.querySelectorAll('.mode-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
    }

    // Show loading indicator
    showLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('pulse');
        }
    }

    // Hide loading indicator
    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('pulse');
        }
    }

    // Update element with animation
    animateValueChange(elementId, oldValue, newValue) {
        const element = document.getElementById(elementId);
        if (element) {
            // Add pulse animation
            element.classList.add('pulse');
            element.textContent = newValue;
            
            setTimeout(() => {
                element.classList.remove('pulse');
            }, 500);
        }
    }
}

// Export for use
const uiUpdater = new UIUpdater();
uiUpdater.startLiveUpdates();
