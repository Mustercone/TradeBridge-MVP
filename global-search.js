// Global Search System
class GlobalSearch {
    constructor() {
        this.searchData = [];
        this.searchResults = [];
        this.currentQuery = '';
        this.init();
    }

    init() {
        this.createSearchInterface();
        this.loadSearchData();
        this.setupEventListeners();
    }

    createSearchInterface() {
        // Create search overlay
        const searchOverlay = document.createElement('div');
        searchOverlay.id = 'search-overlay';
        searchOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
            justify-content: center;
            align-items: flex-start;
            padding-top: 10vh;
        `;

        // Create search container
        const searchContainer = document.createElement('div');
        searchContainer.id = 'search-container';
        searchContainer.style.cssText = `
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;

        // Create search header
        const searchHeader = document.createElement('div');
        searchHeader.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #E2E8F0;
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        const searchInput = document.createElement('input');
        searchInput.id = 'global-search-input';
        searchInput.type = 'text';
        searchInput.placeholder = 'Search agreements, notifications, settings...';
        searchInput.style.cssText = `
            flex: 1;
            border: none;
            outline: none;
            font-size: 16px;
            padding: 8px 0;
            background: transparent;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            padding: 4px;
            color: #64748B;
        `;

        searchHeader.appendChild(searchInput);
        searchHeader.appendChild(closeBtn);

        // Create search results container
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'search-results';
        resultsContainer.style.cssText = `
            max-height: 60vh;
            overflow-y: auto;
            padding: 0;
        `;

        // Create empty state
        const emptyState = document.createElement('div');
        emptyState.id = 'search-empty-state';
        emptyState.style.cssText = `
            padding: 40px 20px;
            text-align: center;
            color: #64748B;
        `;
        emptyState.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
            <h3 style="margin: 0 0 8px 0; color: #1E293B;">Search TradeBridge</h3>
            <p style="margin: 0; font-size: 14px;">Type to search across agreements, notifications, and settings</p>
        `;

        resultsContainer.appendChild(emptyState);

        // Assemble components
        searchContainer.appendChild(searchHeader);
        searchContainer.appendChild(resultsContainer);
        searchOverlay.appendChild(searchContainer);
        document.body.appendChild(searchOverlay);

        // Store references
        this.searchOverlay = searchOverlay;
        this.searchContainer = searchContainer;
        this.searchInput = searchInput;
        this.resultsContainer = resultsContainer;
        this.emptyState = emptyState;
    }

    setupEventListeners() {
        // Close search
        this.searchOverlay.addEventListener('click', (e) => {
            if (e.target === this.searchOverlay) {
                this.closeSearch();
            }
        });

        // Close button
        this.searchOverlay.querySelector('button').addEventListener('click', () => {
            this.closeSearch();
        });

        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearch();
            }
            
            // Escape to close search
            if (e.key === 'Escape' && this.isOpen()) {
                this.closeSearch();
            }
        });

        // Add search button to header
        this.addSearchButton();
    }

    addSearchButton() {
        const headers = document.querySelectorAll('.dashboard-header, .page-header-simple');
        headers.forEach(header => {
            if (!header.querySelector('.search-btn')) {
                const searchBtn = document.createElement('button');
                searchBtn.className = 'search-btn';
                searchBtn.innerHTML = '🔍';
                searchBtn.title = 'Search (Ctrl+K)';
                searchBtn.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    transition: background 0.2s ease;
                `;

                searchBtn.addEventListener('click', () => {
                    this.openSearch();
                });

                searchBtn.addEventListener('mouseenter', () => {
                    searchBtn.style.background = '#F1F5F9';
                });

                searchBtn.addEventListener('mouseleave', () => {
                    searchBtn.style.background = 'transparent';
                });

                const headerActions = header.querySelector('.header-actions');
                if (headerActions) {
                    headerActions.insertBefore(searchBtn, headerActions.firstChild);
                }
            }
        });
    }

    loadSearchData() {
        // Load searchable data from the current page
        this.searchData = [];

        // Add page-specific data
        const currentPage = this.getCurrentPage();
        
        switch (currentPage) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'trade-agreement':
                this.loadTradeAgreementData();
                break;
            case 'notifications':
                this.loadNotificationsData();
                break;
            case 'wallet':
                this.loadWalletData();
                break;
            case 'settings':
                this.loadSettingsData();
                break;
        }
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('trade-agreement')) return 'trade-agreement';
        if (path.includes('notifications')) return 'notifications';
        if (path.includes('wallet')) return 'wallet';
        if (path.includes('settings')) return 'settings';
        return 'dashboard';
    }

    loadDashboardData() {
        // Add dashboard metrics and widgets
        const metrics = document.querySelectorAll('.metric-card');
        metrics.forEach(metric => {
            const title = metric.querySelector('h3')?.textContent;
            const value = metric.querySelector('.metric-value')?.textContent;
            if (title && value) {
                this.searchData.push({
                    type: 'metric',
                    title: title,
                    content: value,
                    category: 'Dashboard',
                    url: 'dashboard.html'
                });
            }
        });

        // Add recent activities
        const activities = document.querySelectorAll('.activity-item');
        activities.forEach(activity => {
            const text = activity.textContent.trim();
            if (text) {
                this.searchData.push({
                    type: 'activity',
                    title: text.substring(0, 50) + '...',
                    content: text,
                    category: 'Recent Activity',
                    url: 'dashboard.html'
                });
            }
        });
    }

    loadTradeAgreementData() {
        // Add form fields and their values
        const form = document.getElementById('agreementForm');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.value) {
                    this.searchData.push({
                        type: 'form-field',
                        title: input.placeholder || input.name || 'Form Field',
                        content: input.value,
                        category: 'Trade Agreement',
                        url: 'trade-agreement.html'
                    });
                }
            });
        }
    }

    loadNotificationsData() {
        // Add notifications
        const notifications = document.querySelectorAll('.notification-item');
        notifications.forEach(notification => {
            const title = notification.querySelector('.notification-title')?.textContent;
            const content = notification.querySelector('.notification-content')?.textContent;
            if (title && content) {
                this.searchData.push({
                    type: 'notification',
                    title: title,
                    content: content,
                    category: 'Notifications',
                    url: 'notifications.html'
                });
            }
        });
    }

    loadWalletData() {
        // Add wallet transactions
        const transactions = document.querySelectorAll('.transaction-item');
        transactions.forEach(transaction => {
            const text = transaction.textContent.trim();
            if (text) {
                this.searchData.push({
                    type: 'transaction',
                    title: text.substring(0, 50) + '...',
                    content: text,
                    category: 'Wallet',
                    url: 'wallet.html'
                });
            }
        });
    }

    loadSettingsData() {
        // Add settings options
        const settings = document.querySelectorAll('.setting-item, .tab-button');
        settings.forEach(setting => {
            const text = setting.textContent.trim();
            if (text) {
                this.searchData.push({
                    type: 'setting',
                    title: text,
                    content: text,
                    category: 'Settings',
                    url: 'settings.html'
                });
            }
        });
    }

    performSearch(query) {
        this.currentQuery = query.toLowerCase().trim();
        
        if (!this.currentQuery) {
            this.showEmptyState();
            return;
        }

        this.searchResults = this.searchData.filter(item => 
            item.title.toLowerCase().includes(this.currentQuery) ||
            item.content.toLowerCase().includes(this.currentQuery) ||
            item.category.toLowerCase().includes(this.currentQuery)
        );

        this.displayResults();
    }

    displayResults() {
        this.resultsContainer.innerHTML = '';

        if (this.searchResults.length === 0) {
            this.showNoResults();
            return;
        }

        // Group results by category
        const groupedResults = this.groupResultsByCategory();

        Object.entries(groupedResults).forEach(([category, results]) => {
            const categoryHeader = document.createElement('div');
            categoryHeader.style.cssText = `
                padding: 12px 20px 8px 20px;
                background: #F8FAFC;
                font-weight: 600;
                font-size: 14px;
                color: #475569;
                border-bottom: 1px solid #E2E8F0;
            `;
            categoryHeader.textContent = category;
            this.resultsContainer.appendChild(categoryHeader);

            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.style.cssText = `
                    padding: 16px 20px;
                    border-bottom: 1px solid #F1F5F9;
                    cursor: pointer;
                    transition: background 0.2s ease;
                `;

                resultItem.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="font-size: 20px;">${this.getTypeIcon(result.type)}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: #1E293B; margin-bottom: 4px;">${this.highlightQuery(result.title)}</div>
                            <div style="font-size: 14px; color: #64748B;">${this.highlightQuery(result.content.substring(0, 100))}...</div>
                        </div>
                    </div>
                `;

                resultItem.addEventListener('click', () => {
                    this.navigateToResult(result);
                });

                resultItem.addEventListener('mouseenter', () => {
                    resultItem.style.background = '#F8FAFC';
                });

                resultItem.addEventListener('mouseleave', () => {
                    resultItem.style.background = 'transparent';
                });

                this.resultsContainer.appendChild(resultItem);
            });
        });
    }

    groupResultsByCategory() {
        const grouped = {};
        this.searchResults.forEach(result => {
            if (!grouped[result.category]) {
                grouped[result.category] = [];
            }
            grouped[result.category].push(result);
        });
        return grouped;
    }

    getTypeIcon(type) {
        const icons = {
            metric: '📊',
            activity: '📈',
            form-field: '📝',
            notification: '🔔',
            transaction: '💰',
            setting: '⚙️'
        };
        return icons[type] || '📄';
    }

    highlightQuery(text) {
        if (!this.currentQuery) return text;
        const regex = new RegExp(`(${this.currentQuery})`, 'gi');
        return text.replace(regex, '<mark style="background: #FEF3C7; padding: 2px 4px; border-radius: 4px;">$1</mark>');
    }

    navigateToResult(result) {
        this.closeSearch();
        
        // Navigate to the result's page
        if (result.url && result.url !== window.location.pathname) {
            window.location.href = result.url;
        }
        
        // Show success message
        if (window.showSuccess) {
            window.showSuccess(`Found: ${result.title}`, 2000);
        }
    }

    showEmptyState() {
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(this.emptyState);
    }

    showNoResults() {
        this.resultsContainer.innerHTML = `
            <div style="padding: 40px 20px; text-align: center; color: #64748B;">
                <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
                <h3 style="margin: 0 0 8px 0; color: #1E293B;">No results found</h3>
                <p style="margin: 0; font-size: 14px;">Try different keywords or check your spelling</p>
            </div>
        `;
    }

    openSearch() {
        this.searchOverlay.style.display = 'flex';
        setTimeout(() => {
            this.searchContainer.style.transform = 'scale(1)';
            this.searchInput.focus();
        }, 10);
    }

    closeSearch() {
        this.searchContainer.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.searchOverlay.style.display = 'none';
            this.searchInput.value = '';
            this.showEmptyState();
        }, 300);
    }

    isOpen() {
        return this.searchOverlay.style.display === 'flex';
    }
}

// Initialize global search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.globalSearch = new GlobalSearch();
});

// Global functions for easy access
window.openGlobalSearch = () => window.globalSearch.openSearch();
window.closeGlobalSearch = () => window.globalSearch.closeSearch();
