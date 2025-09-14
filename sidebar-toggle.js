// Sidebar Toggle System
class SidebarToggle {
    constructor() {
        this.isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        this.init();
    }

    init() {
        this.createToggleButton();
        this.setupEventListeners();
        this.applyInitialState();
    }

    createToggleButton() {
        // Create toggle button
        const toggleButton = document.createElement('button');
        toggleButton.id = 'sidebar-toggle';
        toggleButton.className = 'sidebar-toggle-btn';
        toggleButton.innerHTML = this.isCollapsed ? '▶' : '◀';
        toggleButton.title = this.isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
        
        toggleButton.style.cssText = `
            position: fixed;
            top: 50%;
            left: ${this.isCollapsed ? '10px' : '210px'};
            transform: translateY(-50%);
            z-index: 1000;
            background: #3B82F6;
            color: white;
            border: none;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
            transition: all 0.3s ease;
            opacity: 0.9;
        `;

        // Add hover effects
        toggleButton.addEventListener('mouseenter', () => {
            toggleButton.style.opacity = '1';
            toggleButton.style.transform = 'translateY(-50%) scale(1.15)';
            toggleButton.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
        });

        toggleButton.addEventListener('mouseleave', () => {
            toggleButton.style.opacity = '0.9';
            toggleButton.style.transform = 'translateY(-50%) scale(1)';
            toggleButton.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
        });

        document.body.appendChild(toggleButton);
        this.toggleButton = toggleButton;
    }

    setupEventListeners() {
        this.toggleButton.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Add keyboard shortcut (Ctrl+Shift+S)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }

    applyInitialState() {
        if (this.isCollapsed) {
            this.collapseSidebar();
        } else {
            this.expandSidebar();
        }
    }

    toggleSidebar() {
        if (this.isCollapsed) {
            this.expandSidebar();
        } else {
            this.collapseSidebar();
        }
        
        // Save state
        localStorage.setItem('sidebarCollapsed', this.isCollapsed);
        
        // Show feedback
        if (window.showSuccess) {
            window.showSuccess(`Sidebar ${this.isCollapsed ? 'collapsed' : 'expanded'}`, 1500);
        }
    }

    collapseSidebar() {
        this.isCollapsed = true;
        
        // Collapse sidebar completely
        const sidebar = document.querySelector('.dashboard-sidebar');
        if (sidebar) {
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.style.width = '0px';
            sidebar.style.overflow = 'hidden';
        }

        // Expand main content to full width
        const mainContent = document.querySelector('.dashboard-main');
        if (mainContent) {
            mainContent.style.marginLeft = '0px';
            mainContent.style.width = '100%';
            mainContent.style.maxWidth = 'none';
        }

        // Update toggle button position
        this.toggleButton.innerHTML = '▶';
        this.toggleButton.title = 'Expand Sidebar';
        this.toggleButton.style.left = '10px';

        // Hide nav text (keep icons only)
        this.hideNavText();
    }

    expandSidebar() {
        this.isCollapsed = false;
        
        // Expand sidebar
        const sidebar = document.querySelector('.dashboard-sidebar');
        if (sidebar) {
            sidebar.style.transform = 'translateX(0)';
            sidebar.style.width = '220px';
            sidebar.style.overflow = 'visible';
        }

        // Adjust main content
        const mainContent = document.querySelector('.dashboard-main');
        if (mainContent) {
            mainContent.style.marginLeft = '220px';
            mainContent.style.width = 'calc(100% - 220px)';
            mainContent.style.maxWidth = 'none';
        }

        // Update toggle button position
        this.toggleButton.innerHTML = '◀';
        this.toggleButton.title = 'Collapse Sidebar';
        this.toggleButton.style.left = '210px';

        // Show nav text
        this.showNavText();
    }

    hideNavText() {
        const navItems = document.querySelectorAll('.nav-item span');
        navItems.forEach(span => {
            span.style.opacity = '0';
            span.style.width = '0';
            span.style.overflow = 'hidden';
        });

        // Adjust nav item padding
        const navItemsContainer = document.querySelectorAll('.nav-item');
        navItemsContainer.forEach(item => {
            item.style.padding = '12px 16px';
            item.style.justifyContent = 'center';
        });
    }

    showNavText() {
        const navItems = document.querySelectorAll('.nav-item span');
        navItems.forEach(span => {
            span.style.opacity = '1';
            span.style.width = 'auto';
            span.style.overflow = 'visible';
        });

        // Restore nav item padding
        const navItemsContainer = document.querySelectorAll('.nav-item');
        navItemsContainer.forEach(item => {
            item.style.padding = '12px 24px';
            item.style.justifyContent = 'flex-start';
        });
    }

    // Public methods for external control
    expand() {
        if (this.isCollapsed) {
            this.toggleSidebar();
        }
    }

    collapse() {
        if (!this.isCollapsed) {
            this.toggleSidebar();
        }
    }

    isExpanded() {
        return !this.isCollapsed;
    }
}

// Initialize sidebar toggle when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sidebarToggle = new SidebarToggle();
});

// Global functions for easy access
window.toggleSidebar = () => window.sidebarToggle.toggleSidebar();
window.expandSidebar = () => window.sidebarToggle.expand();
window.collapseSidebar = () => window.sidebarToggle.collapse();
window.isSidebarExpanded = () => window.sidebarToggle.isExpanded();
