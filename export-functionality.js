// Export Functionality System
class ExportFunctionality {
    constructor() {
        this.init();
    }

    init() {
        this.createExportButtons();
        this.setupEventListeners();
    }

    createExportButtons() {
        // Add export buttons to relevant pages
        this.addExportToTradeAgreement();
        this.addExportToNotifications();
        this.addExportToWallet();
    }


    addExportToTradeAgreement() {
        const form = document.getElementById('agreementForm');
        if (form && !document.getElementById('agreement-export-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'agreement-export-btn';
            exportBtn.className = 'btn btn-outline export-btn';
            exportBtn.innerHTML = '📄 Export Agreement';
            exportBtn.style.cssText = `
                margin-top: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            exportBtn.addEventListener('click', () => {
                this.exportTradeAgreement();
            });

            const formContainer = form.parentElement;
            if (formContainer) {
                formContainer.appendChild(exportBtn);
            }
        }
    }

    addExportToNotifications() {
        const notificationsPage = document.querySelector('.notifications-container');
        if (notificationsPage && !document.getElementById('notifications-export-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'notifications-export-btn';
            exportBtn.className = 'btn btn-outline export-btn';
            exportBtn.innerHTML = '🔔 Export Notifications';
            exportBtn.style.cssText = `
                margin-left: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            exportBtn.addEventListener('click', () => {
                this.exportNotifications();
            });

            const pageActions = document.querySelector('.page-actions');
            if (pageActions) {
                pageActions.appendChild(exportBtn);
            }
        }
    }

    addExportToWallet() {
        const walletPage = document.querySelector('.wallet-container');
        if (walletPage && !document.getElementById('wallet-export-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'wallet-export-btn';
            exportBtn.className = 'btn btn-outline export-btn';
            exportBtn.innerHTML = '💰 Export Transactions';
            exportBtn.style.cssText = `
                margin-left: auto;
                display: flex;
                align-items: center;
                gap: 8px;
            `;

            exportBtn.addEventListener('click', () => {
                this.exportWalletTransactions();
            });

            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(exportBtn);
            }
        }
    }

    setupEventListeners() {
        // Add keyboard shortcut for export (Ctrl+E)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.showExportMenu();
            }
        });
    }

    showExportMenu() {
        const currentPage = this.getCurrentPage();
        const exportOptions = this.getExportOptions(currentPage);
        
        if (exportOptions.length === 0) {
            if (window.showInfo) {
                window.showInfo('No export options available on this page');
            }
            return;
        }

        // Create export menu
        const menu = document.createElement('div');
        menu.id = 'export-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            min-width: 300px;
        `;

        menu.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #1E293B;">Export Options</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${exportOptions.map(option => `
                    <button class="export-option-btn" data-type="${option.type}" data-format="${option.format}" style="
                        padding: 12px 16px;
                        border: 1px solid #E2E8F0;
                        border-radius: 8px;
                        background: white;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        transition: background 0.2s ease;
                    ">
                        <span style="font-size: 20px;">${option.icon}</span>
                        <div style="text-align: left;">
                            <div style="font-weight: 500; color: #1E293B;">${option.title}</div>
                            <div style="font-size: 12px; color: #64748B;">${option.description}</div>
                        </div>
                    </button>
                `).join('')}
            </div>
            <button id="close-export-menu" style="
                position: absolute;
                top: 12px;
                right: 12px;
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #64748B;
            ">✕</button>
        `;

        // Add event listeners
        menu.querySelectorAll('.export-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const format = btn.dataset.format;
                this.performExport(type, format);
                this.closeExportMenu();
            });

            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#F8FAFC';
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'white';
            });
        });

        menu.querySelector('#close-export-menu').addEventListener('click', () => {
            this.closeExportMenu();
        });

        document.body.appendChild(menu);
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('trade-agreement')) return 'trade-agreement';
        if (path.includes('notifications')) return 'notifications';
        if (path.includes('wallet')) return 'wallet';
        return 'dashboard';
    }

    getExportOptions(page) {
        const options = {
            'trade-agreement': [
                { type: 'agreement', format: 'pdf', icon: '📄', title: 'Agreement PDF', description: 'Export trade agreement as PDF document' },
                { type: 'agreement', format: 'docx', icon: '📝', title: 'Agreement Document', description: 'Export as Word document' },
                { type: 'agreement', format: 'json', icon: '🔧', title: 'Agreement Data', description: 'Export raw data as JSON' }
            ],
            notifications: [
                { type: 'notifications', format: 'pdf', icon: '🔔', title: 'Notifications Report', description: 'Export notifications as PDF' },
                { type: 'notifications', format: 'csv', icon: '📊', title: 'Notifications Data', description: 'Export as CSV spreadsheet' }
            ],
            wallet: [
                { type: 'transactions', format: 'pdf', icon: '💰', title: 'Transaction Report', description: 'Export transactions as PDF' },
                { type: 'transactions', format: 'excel', icon: '📈', title: 'Transaction Data', description: 'Export as Excel spreadsheet' }
            ]
        };

        return options[page] || [];
    }

    performExport(type, format) {
        if (window.showLoading) {
            window.showLoading(`Exporting ${type} as ${format.toUpperCase()}...`);
        }

        setTimeout(() => {
            if (window.hideLoading) {
                window.hideLoading();
            }

            switch (type) {
                case 'agreement':
                    this.exportTradeAgreement(format);
                    break;
                case 'notifications':
                    this.exportNotifications(format);
                    break;
                case 'transactions':
                    this.exportWalletTransactions(format);
                    break;
            }
        }, 1500);
    }


    exportTradeAgreement(format) {
        const agreementData = this.collectAgreementData();
        
        if (format === 'pdf') {
            this.generateAgreementPDF(agreementData);
        } else if (format === 'docx') {
            this.generateWordDocument(agreementData);
        } else if (format === 'json') {
            this.downloadJSON(agreementData, 'trade-agreement.json');
        }

        if (window.showSuccess) {
            window.showSuccess('Trade agreement exported successfully!', 3000);
        }
    }

    exportNotifications(format) {
        const notifications = this.collectNotifications();
        
        if (format === 'pdf') {
            this.generateNotificationsPDF(notifications);
        } else if (format === 'csv') {
            this.generateCSV(notifications, 'notifications.csv');
        }

        if (window.showSuccess) {
            window.showSuccess('Notifications exported successfully!', 3000);
        }
    }

    exportWalletTransactions(format) {
        const transactions = this.collectTransactions();
        
        if (format === 'pdf') {
            this.generateTransactionsPDF(transactions);
        } else if (format === 'excel') {
            this.generateExcel('Wallet Transactions', transactions);
        }

        if (window.showSuccess) {
            window.showSuccess('Wallet transactions exported successfully!', 3000);
        }
    }


    collectAgreementData() {
        const form = document.getElementById('agreementForm');
        const data = {};
        
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.name && input.value) {
                    data[input.name] = input.value;
                }
            });
        }
        
        return data;
    }

    collectNotifications() {
        const notifications = [];
        document.querySelectorAll('.notification-item').forEach(item => {
            const title = item.querySelector('.notification-title')?.textContent;
            const content = item.querySelector('.notification-content')?.textContent;
            const time = item.querySelector('.notification-time')?.textContent;
            
            if (title && content) {
                notifications.push({ title, content, time });
            }
        });
        return notifications;
    }

    collectTransactions() {
        const transactions = [];
        document.querySelectorAll('.transaction-item').forEach(item => {
            const text = item.textContent.trim();
            if (text) {
                transactions.push({ description: text });
            }
        });
        return transactions;
    }

    generatePDF(title, data) {
        // Simple PDF generation using browser print
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #1E293B; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #E2E8F0; padding: 12px; text-align: left; }
                        th { background: #F8FAFC; font-weight: 600; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(item => `
                                <tr>
                                    <td>${item.title || item.description || 'Item'}</td>
                                    <td>${item.value || item.content || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    generateExcel(title, data) {
        // Simple CSV generation (can be opened in Excel)
        const csvContent = [
            ['Item', 'Value'],
            ...data.map(item => [item.title || item.description || 'Item', item.value || item.content || 'N/A'])
        ].map(row => row.join(',')).join('\n');
        
        this.downloadCSV(csvContent, `${title.toLowerCase().replace(/\s+/g, '-')}.csv`);
    }

    generateCSV(data, filename) {
        const csvContent = [
            ['Title', 'Content', 'Time'],
            ...data.map(item => [item.title, item.content, item.time || 'N/A'])
        ].map(row => row.join(',')).join('\n');
        
        this.downloadCSV(csvContent, filename);
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    downloadJSON(data, filename) {
        const content = JSON.stringify(data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    closeExportMenu() {
        const menu = document.getElementById('export-menu');
        if (menu) {
            menu.remove();
        }
    }
}

// Initialize export functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.exportFunctionality = new ExportFunctionality();
});

// Global functions for easy access
window.showExportMenu = () => window.exportFunctionality.showExportMenu();
window.exportTradeAgreement = () => window.exportFunctionality.exportTradeAgreement();
