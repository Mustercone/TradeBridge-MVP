// TradeBridge API Client
class TradeBridgeAPI {
    constructor(baseURL = 'http://localhost:5000/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('tradebridge_token');
        this.refreshToken = localStorage.getItem('tradebridge_refresh_token');
    }

    // Set authentication token
    setToken(token, refreshToken = null) {
        this.token = token;
        if (refreshToken) {
            this.refreshToken = refreshToken;
            localStorage.setItem('tradebridge_refresh_token', refreshToken);
        }
        localStorage.setItem('tradebridge_token', token);
    }

    // Clear authentication tokens
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('tradebridge_token');
        localStorage.removeItem('tradebridge_refresh_token');
    }

    // Make HTTP request with authentication
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication header
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            
            // Handle token expiration
            if (response.status === 401 && this.refreshToken) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    // Retry the original request with new token
                    config.headers.Authorization = `Bearer ${this.token}`;
                    return await fetch(url, config);
                }
            }

            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) return false;

        try {
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setToken(data.token, data.refreshToken);
                return true;
            } else {
                this.clearTokens();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearTokens();
            return false;
        }
    }

    // Authentication endpoints
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (response.ok) {
            const data = await response.json();
            this.setToken(data.token, data.refreshToken);
            return data;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });

        if (response.ok) {
            const data = await response.json();
            this.setToken(data.token, data.refreshToken);
            return data;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
    }

    async demoLogin(email) {
        const response = await this.request('/auth/demo-login', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            const data = await response.json();
            this.setToken(data.token, data.refreshToken);
            return data;
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Demo login failed');
        }
    }

    async logout() {
        try {
            await this.request('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearTokens();
        }
    }

    // User endpoints
    async getUserProfile() {
        const response = await this.request('/users/profile');
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get profile');
        }
    }

    async updateUserProfile(profileData) {
        const response = await this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update profile');
        }
    }

    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await this.request('/users/avatar', {
            method: 'POST',
            headers: {}, // Remove Content-Type header for FormData
            body: formData
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload avatar');
        }
    }

    async changePassword(passwordData) {
        const response = await this.request('/users/password', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to change password');
        }
    }

    async getUserStats() {
        const response = await this.request('/users/stats');
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get user stats');
        }
    }

    // Trade Agreement endpoints
    async createTradeAgreement(agreementData) {
        const response = await this.request('/trade-agreements', {
            method: 'POST',
            body: JSON.stringify(agreementData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create trade agreement');
        }
    }

    async getTradeAgreements(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = queryParams ? `/trade-agreements?${queryParams}` : '/trade-agreements';
        
        const response = await this.request(endpoint);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get trade agreements');
        }
    }

    async getTradeAgreement(id) {
        const response = await this.request(`/trade-agreements/${id}`);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get trade agreement');
        }
    }

    async updateTradeAgreement(id, updateData) {
        const response = await this.request(`/trade-agreements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update trade agreement');
        }
    }

    async deleteTradeAgreement(id) {
        const response = await this.request(`/trade-agreements/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete trade agreement');
        }
    }

    // Shipment endpoints
    async createShipment(shipmentData) {
        const response = await this.request('/shipments', {
            method: 'POST',
            body: JSON.stringify(shipmentData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create shipment');
        }
    }

    async getShipments(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = queryParams ? `/shipments?${queryParams}` : '/shipments';
        
        const response = await this.request(endpoint);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get shipments');
        }
    }

    async getShipment(id) {
        const response = await this.request(`/shipments/${id}`);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get shipment');
        }
    }

    async updateShipment(id, updateData) {
        const response = await this.request(`/shipments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update shipment');
        }
    }

    async trackShipment(trackingNumber) {
        const response = await this.request(`/shipments/track/${trackingNumber}`);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to track shipment');
        }
    }

    // Wallet endpoints
    async getWalletBalance() {
        const response = await this.request('/wallet/balance');
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get wallet balance');
        }
    }

    async getTransactions(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = queryParams ? `/wallet/transactions?${queryParams}` : '/wallet/transactions';
        
        const response = await this.request(endpoint);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get transactions');
        }
    }

    async createTransaction(transactionData) {
        const response = await this.request('/wallet/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create transaction');
        }
    }

    async transferFunds(transferData) {
        const response = await this.request('/wallet/transfer', {
            method: 'POST',
            body: JSON.stringify(transferData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to transfer funds');
        }
    }

    async getWalletStats() {
        const response = await this.request('/wallet/stats');
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get wallet stats');
        }
    }

    // Invoice endpoints
    async uploadInvoice(file) {
        const formData = new FormData();
        formData.append('invoice', file);

        const response = await this.request('/invoices/upload', {
            method: 'POST',
            headers: {}, // Remove Content-Type header for FormData
            body: formData
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to upload invoice');
        }
    }

    async createInvoice(invoiceData) {
        const response = await this.request('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create invoice');
        }
    }

    async getInvoices(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = queryParams ? `/invoices?${queryParams}` : '/invoices';
        
        const response = await this.request(endpoint);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get invoices');
        }
    }

    async getInvoice(id) {
        const response = await this.request(`/invoices/${id}`);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get invoice');
        }
    }

    async generateSmartContract(invoiceId) {
        const response = await this.request(`/invoices/${invoiceId}/generate-smart-contract`, {
            method: 'POST'
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate smart contract');
        }
    }

    // Notification endpoints
    async getNotifications(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = queryParams ? `/notifications?${queryParams}` : '/notifications';
        
        const response = await this.request(endpoint);
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get notifications');
        }
    }

    async markNotificationAsRead(id) {
        const response = await this.request(`/notifications/${id}/read`, {
            method: 'PUT'
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to mark notification as read');
        }
    }

    async markAllNotificationsAsRead() {
        const response = await this.request('/notifications/read-all', {
            method: 'PUT'
        });

        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to mark all notifications as read');
        }
    }

    async getNotificationStats() {
        const response = await this.request('/notifications/stats');
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get notification stats');
        }
    }

    // Utility methods
    isAuthenticated() {
        return !!this.token;
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}

// Create global API instance
window.tradeBridgeAPI = new TradeBridgeAPI();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradeBridgeAPI;
}
