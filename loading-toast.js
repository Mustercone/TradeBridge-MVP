// Loading States and Toast Notifications System

class LoadingToast {
    constructor() {
        this.toastContainer = null;
        this.loadingOverlay = null;
        this.init();
    }

    init() {
        this.createToastContainer();
        this.createLoadingOverlay();
    }

    createToastContainer() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toast-container';
        this.toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(this.toastContainer);
    }

    createLoadingOverlay() {
        this.loadingOverlay = document.createElement('div');
        this.loadingOverlay.id = 'loading-overlay';
        this.loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3B82F6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        this.loadingOverlay.appendChild(spinner);
        document.body.appendChild(this.loadingOverlay);
    }

    showLoading(message = 'Loading...') {
        this.loadingOverlay.style.display = 'flex';
        if (message !== 'Loading...') {
            const messageEl = document.createElement('div');
            messageEl.textContent = message;
            messageEl.style.cssText = `
                color: white;
                margin-top: 20px;
                font-size: 16px;
                font-weight: 500;
            `;
            this.loadingOverlay.appendChild(messageEl);
        }
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
        // Remove any message elements
        const messages = this.loadingOverlay.querySelectorAll('div:not(:first-child)');
        messages.forEach(msg => msg.remove());
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        const colors = this.getColors(type);
        
        toast.style.cssText = `
            background: ${colors.background};
            color: ${colors.text};
            border: 1px solid ${colors.border};
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-size: 14px;
            font-weight: 500;
        `;
        
        toast.innerHTML = `
            <span style="font-size: 16px;">${icon}</span>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                margin-left: auto;
                font-size: 18px;
                opacity: 0.7;
            ">×</button>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    getColors(type) {
        const colors = {
            success: {
                background: '#F0FDF4',
                text: '#166534',
                border: '#BBF7D0'
            },
            error: {
                background: '#FEF2F2',
                text: '#DC2626',
                border: '#FECACA'
            },
            warning: {
                background: '#FFFBEB',
                text: '#D97706',
                border: '#FED7AA'
            },
            info: {
                background: '#EFF6FF',
                text: '#1D4ED8',
                border: '#BFDBFE'
            }
        };
        return colors[type] || colors.info;
    }

    // Convenience methods
    success(message, duration) {
        this.showToast(message, 'success', duration);
    }

    error(message, duration) {
        this.showToast(message, 'error', duration);
    }

    warning(message, duration) {
        this.showToast(message, 'warning', duration);
    }

    info(message, duration) {
        this.showToast(message, 'info', duration);
    }
}

// Global instance
window.loadingToast = new LoadingToast();

// Utility functions for easy use
window.showLoading = (message) => window.loadingToast.showLoading(message);
window.hideLoading = () => window.loadingToast.hideLoading();
window.showSuccess = (message, duration) => window.loadingToast.success(message, duration);
window.showError = (message, duration) => window.loadingToast.error(message, duration);
window.showWarning = (message, duration) => window.loadingToast.warning(message, duration);
window.showInfo = (message, duration) => window.loadingToast.info(message, duration);
