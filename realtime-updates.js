// Real-time Updates System
class RealTimeUpdates {
    constructor() {
        this.updateInterval = null;
        this.isActive = false;
        this.lastUpdateTime = Date.now();
        this.init();
    }

    init() {
        this.createStatusIndicator();
        this.setupEventListeners();
        this.startUpdates();
    }

    createStatusIndicator() {
        // Create real-time status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'realtime-status';
        statusIndicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #10B981;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
        `;
        
        statusIndicator.innerHTML = `
            <div class="status-dot" style="
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
                animation: pulse 2s infinite;
            "></div>
            <span>Live Updates</span>
        `;

        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(statusIndicator);
        this.statusIndicator = statusIndicator;
    }

    setupEventListeners() {
        // Add click handler to status indicator
        this.statusIndicator.addEventListener('click', () => {
            this.toggleUpdates();
        });

        // Add hover effects
        this.statusIndicator.addEventListener('mouseenter', () => {
            this.statusIndicator.style.transform = 'scale(1.05)';
        });

        this.statusIndicator.addEventListener('mouseleave', () => {
            this.statusIndicator.style.transform = 'scale(1)';
        });
    }

    startUpdates() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.updateInterval = setInterval(() => {
            this.performUpdate();
        }, 30000); // Update every 30 seconds

        this.updateStatusIndicator(true);
    }

    stopUpdates() {
        if (!this.isActive) return;
        
        this.isActive = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.updateStatusIndicator(false);
    }

    toggleUpdates() {
        if (this.isActive) {
            this.stopUpdates();
            if (window.showInfo) {
                window.showInfo('Real-time updates paused', 2000);
            }
        } else {
            this.startUpdates();
            if (window.showSuccess) {
                window.showSuccess('Real-time updates resumed', 2000);
            }
        }
    }

    updateStatusIndicator(isActive) {
        if (isActive) {
            this.statusIndicator.style.background = '#10B981';
            this.statusIndicator.querySelector('span').textContent = 'Live Updates';
            this.statusIndicator.title = 'Click to pause real-time updates';
        } else {
            this.statusIndicator.style.background = '#6B7280';
            this.statusIndicator.querySelector('span').textContent = 'Updates Paused';
            this.statusIndicator.title = 'Click to resume real-time updates';
        }
    }

    performUpdate() {
        const currentPage = this.getCurrentPage();
        
        switch (currentPage) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'notifications':
                this.updateNotifications();
                break;
            case 'wallet':
                this.updateWallet();
                break;
            case 'trade-agreement':
                this.updateTradeAgreement();
                break;
        }

        this.lastUpdateTime = Date.now();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('notifications')) return 'notifications';
        if (path.includes('wallet')) return 'wallet';
        if (path.includes('trade-agreement')) return 'trade-agreement';
        return 'dashboard';
    }

    updateDashboard() {
        // Simulate real-time metric updates
        const metrics = document.querySelectorAll('.metric-value');
        metrics.forEach(metric => {
            const currentValue = metric.textContent;
            const newValue = this.generateNewMetricValue(currentValue);
            
            if (newValue !== currentValue) {
                this.animateValueChange(metric, currentValue, newValue);
            }
        });

        // Simulate new activity
        this.addRandomActivity();
    }

    updateNotifications() {
        // Simulate new notifications
        const shouldAddNotification = Math.random() < 0.3; // 30% chance
        
        if (shouldAddNotification) {
            this.addRandomNotification();
        }
    }

    updateWallet() {
        // Simulate wallet balance changes
        const balanceElement = document.querySelector('.balance-amount');
        if (balanceElement) {
            const currentBalance = balanceElement.textContent;
            const newBalance = this.generateNewBalance(currentBalance);
            
            if (newBalance !== currentBalance) {
                this.animateValueChange(balanceElement, currentBalance, newBalance);
            }
        }

        // Simulate new transactions
        this.addRandomTransaction();
    }

    updateTradeAgreement() {
        // Simulate agreement status updates
        const statusElements = document.querySelectorAll('.status-badge');
        statusElements.forEach(status => {
            if (Math.random() < 0.1) { // 10% chance
                this.updateAgreementStatus(status);
            }
        });
    }

    generateNewMetricValue(currentValue) {
        // Extract number from current value
        const number = parseFloat(currentValue.replace(/[^\d.-]/g, ''));
        if (isNaN(number)) return currentValue;

        // Generate small random change (±5%)
        const change = (Math.random() - 0.5) * 0.1 * number;
        const newNumber = number + change;
        
        // Format back to original format
        if (currentValue.includes('$')) {
            return `$${newNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (currentValue.includes('%')) {
            return `${newNumber.toFixed(1)}%`;
        } else {
            return newNumber.toLocaleString();
        }
    }

    generateNewBalance(currentBalance) {
        const number = parseFloat(currentBalance.replace(/[^\d.-]/g, ''));
        if (isNaN(number)) return currentBalance;

        const change = (Math.random() - 0.5) * 0.05 * number; // ±2.5% change
        const newNumber = number + change;
        
        return `$${newNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    animateValueChange(element, oldValue, newValue) {
        // Add subtle animation to show value changed
        element.style.transform = 'scale(1.05)';
        element.style.color = '#10B981';
        
        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 200);
    }

    addRandomActivity() {
        const activitiesContainer = document.querySelector('.activities-list');
        if (!activitiesContainer) return;

        const activities = [
            'New trade agreement created',
            'Payment received from ACME Corp',
            'Shipment status updated',
            'Invoice approved',
            'Settlement completed',
            'Document uploaded',
            'Agreement signed',
            'Payment sent to supplier'
        ];

        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const timeAgo = this.getRandomTimeAgo();

        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.style.cssText = `
            padding: 12px 16px;
            border-bottom: 1px solid #F1F5F9;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.3s ease;
        `;

        activityItem.innerHTML = `
            <div style="width: 8px; height: 8px; background: #10B981; border-radius: 50%;"></div>
            <div style="flex: 1;">
                <div style="font-weight: 500; color: #1E293B;">${randomActivity}</div>
                <div style="font-size: 12px; color: #64748B;">${timeAgo}</div>
            </div>
        `;

        // Add slide-in animation
        const slideInStyle = document.createElement('style');
        slideInStyle.textContent = `
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(slideInStyle);

        activitiesContainer.insertBefore(activityItem, activitiesContainer.firstChild);

        // Remove oldest activity if too many
        const activities = activitiesContainer.querySelectorAll('.activity-item');
        if (activities.length > 10) {
            activities[activities.length - 1].remove();
        }
    }

    addRandomNotification() {
        const notificationsContainer = document.querySelector('.notifications-list');
        if (!notificationsContainer) return;

        const notifications = [
            { title: 'Payment Received', content: 'Payment of $5,000 received from ACME Corporation', type: 'success' },
            { title: 'Shipment Update', content: 'Your shipment #SH12345 has been delivered', type: 'info' },
            { title: 'Agreement Signed', content: 'Trade agreement #TA789 has been signed by all parties', type: 'success' },
            { title: 'Invoice Due', content: 'Invoice #IN456 is due in 3 days', type: 'warning' },
            { title: 'Document Uploaded', content: 'New document uploaded to agreement #TA789', type: 'info' }
        ];

        const randomNotification = notifications[Math.floor(Math.random() * notifications.length)];
        const timeAgo = this.getRandomTimeAgo();

        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item unread';
        notificationItem.style.cssText = `
            padding: 16px;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            margin-bottom: 12px;
            background: white;
            animation: slideIn 0.3s ease;
            border-left: 4px solid #3B82F6;
        `;

        notificationItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 20px;">${this.getNotificationIcon(randomNotification.type)}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1E293B; margin-bottom: 4px;">${randomNotification.title}</div>
                    <div style="font-size: 14px; color: #64748B; margin-bottom: 8px;">${randomNotification.content}</div>
                    <div style="font-size: 12px; color: #94A3B8;">${timeAgo}</div>
                </div>
                <div style="width: 8px; height: 8px; background: #3B82F6; border-radius: 50%;"></div>
            </div>
        `;

        notificationsContainer.insertBefore(notificationItem, notificationsContainer.firstChild);

        // Update notification count
        this.updateNotificationCount();
    }

    addRandomTransaction() {
        const transactionsContainer = document.querySelector('.transactions-list');
        if (!transactionsContainer) return;

        const transactions = [
            { description: 'Payment to Supplier ABC', amount: '-$2,500.00', type: 'outgoing' },
            { description: 'Payment from Customer XYZ', amount: '+$5,000.00', type: 'incoming' },
            { description: 'Service Fee', amount: '-$25.00', type: 'fee' },
            { description: 'Refund Processed', amount: '+$1,200.00', type: 'refund' }
        ];

        const randomTransaction = transactions[Math.floor(Math.random() * transactions.length)];
        const timeAgo = this.getRandomTimeAgo();

        const transactionItem = document.createElement('div');
        transactionItem.className = 'transaction-item';
        transactionItem.style.cssText = `
            padding: 12px 16px;
            border-bottom: 1px solid #F1F5F9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            animation: slideIn 0.3s ease;
        `;

        transactionItem.innerHTML = `
            <div>
                <div style="font-weight: 500; color: #1E293B;">${randomTransaction.description}</div>
                <div style="font-size: 12px; color: #64748B;">${timeAgo}</div>
            </div>
            <div style="font-weight: 600; color: ${randomTransaction.type === 'incoming' || randomTransaction.type === 'refund' ? '#10B981' : '#EF4444'};">
                ${randomTransaction.amount}
            </div>
        `;

        transactionsContainer.insertBefore(transactionItem, transactionsContainer.firstChild);

        // Remove oldest transaction if too many
        const transactions = transactionsContainer.querySelectorAll('.transaction-item');
        if (transactions.length > 15) {
            transactions[transactions.length - 1].remove();
        }
    }

    updateAgreementStatus(statusElement) {
        const statuses = ['Draft', 'Pending', 'Approved', 'Signed', 'Completed'];
        const currentStatus = statusElement.textContent;
        const availableStatuses = statuses.filter(s => s !== currentStatus);
        
        if (availableStatuses.length > 0) {
            const newStatus = availableStatuses[Math.floor(Math.random() * availableStatuses.length)];
            statusElement.textContent = newStatus;
            
            // Update status color
            const colors = {
                'Draft': '#6B7280',
                'Pending': '#F59E0B',
                'Approved': '#10B981',
                'Signed': '#3B82F6',
                'Completed': '#8B5CF6'
            };
            
            statusElement.style.background = colors[newStatus] || '#6B7280';
        }
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️',
            error: '❌'
        };
        return icons[type] || 'ℹ️';
    }

    updateNotificationCount() {
        const badge = document.querySelector('.nav-badge-text');
        if (badge) {
            const currentCount = parseInt(badge.textContent.match(/\d+/)?.[0] || '0');
            badge.textContent = `(${currentCount + 1})`;
        }
    }

    getRandomTimeAgo() {
        const times = ['Just now', '1 minute ago', '2 minutes ago', '5 minutes ago', '10 minutes ago'];
        return times[Math.floor(Math.random() * times.length)];
    }
}

// Initialize real-time updates when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.realTimeUpdates = new RealTimeUpdates();
});

// Global functions for easy access
window.startRealTimeUpdates = () => window.realTimeUpdates.startUpdates();
window.stopRealTimeUpdates = () => window.realTimeUpdates.stopUpdates();
window.toggleRealTimeUpdates = () => window.realTimeUpdates.toggleUpdates();
