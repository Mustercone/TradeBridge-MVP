// Mobile Optimization System
class MobileOptimization {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.touchStartY = 0;
        this.touchStartX = 0;
        this.init();
    }

    init() {
        this.detectDevice();
        this.setupTouchGestures();
        this.optimizeForMobile();
        this.setupResponsiveHandlers();
    }

    detectDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        this.isIOS = /iphone|ipad|ipod/.test(userAgent);
        this.isAndroid = /android/.test(userAgent);
        this.isMobileDevice = this.isIOS || this.isAndroid;
        
        // Add device classes to body
        document.body.classList.add(this.isMobile ? 'mobile' : 'desktop');
        if (this.isIOS) document.body.classList.add('ios');
        if (this.isAndroid) document.body.classList.add('android');
    }

    setupTouchGestures() {
        // Swipe gestures for sidebar
        document.addEventListener('touchstart', (e) => {
            this.touchStartY = e.touches[0].clientY;
            this.touchStartX = e.touches[0].clientX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.touchStartY || !this.touchStartX) return;

            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const deltaY = touchEndY - this.touchStartY;
            const deltaX = touchEndX - this.touchStartX;

            // Swipe right to open sidebar (mobile only)
            if (this.isMobile && deltaX > 50 && Math.abs(deltaY) < 100) {
                this.openSidebar();
            }

            // Swipe left to close sidebar (mobile only)
            if (this.isMobile && deltaX < -50 && Math.abs(deltaY) < 100) {
                this.closeSidebar();
            }

            this.touchStartY = 0;
            this.touchStartX = 0;
        }, { passive: true });

        // Double tap to zoom prevention
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    openSidebar() {
        const sidebar = document.querySelector('.dashboard-sidebar');
        if (sidebar) {
            sidebar.classList.add('mobile-open');
            this.createOverlay();
        }
    }

    closeSidebar() {
        const sidebar = document.querySelector('.dashboard-sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-open');
            this.removeOverlay();
        }
    }

    createOverlay() {
        if (document.getElementById('mobile-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'mobile-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 998;
            display: none;
        `;
        
        overlay.addEventListener('click', () => {
            this.closeSidebar();
        });

        document.body.appendChild(overlay);
        
        // Show overlay with animation
        setTimeout(() => {
            overlay.style.display = 'block';
        }, 10);
    }

    removeOverlay() {
        const overlay = document.getElementById('mobile-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        }
    }

    optimizeForMobile() {
        if (!this.isMobile) return;

        // Add mobile-specific styles
        this.addMobileStyles();
        
        // Optimize touch targets
        this.optimizeTouchTargets();
        
        // Add mobile navigation
        this.addMobileNavigation();
        
        // Optimize forms for mobile
        this.optimizeForms();
    }

    addMobileStyles() {
        const style = document.createElement('style');
        style.id = 'mobile-optimization-styles';
        style.textContent = `
            /* Mobile Optimization Styles */
            @media (max-width: 768px) {
                .dashboard-sidebar {
                    transform: translateX(-100%);
                    transition: transform 0.3s ease;
                    position: fixed;
                    top: 0;
                    left: 0;
                    height: 100vh;
                    z-index: 999;
                    width: 280px;
                }

                .dashboard-sidebar.mobile-open {
                    transform: translateX(0);
                }

                .dashboard-main {
                    margin-left: 0;
                    padding: 16px;
                }

                .dashboard-header {
                    padding: 12px 16px;
                }

                .header-content {
                    flex-direction: column;
                    gap: 12px;
                }

                .header-actions {
                    width: 100%;
                    justify-content: space-between;
                }

                /* Mobile-friendly cards */
                .card {
                    margin-bottom: 16px;
                    border-radius: 12px;
                }

                .card-header {
                    padding: 16px;
                }

                .card-content {
                    padding: 16px;
                }

                /* Mobile-friendly buttons */
                .btn {
                    min-height: 44px;
                    padding: 12px 16px;
                    font-size: 16px;
                }

                .btn-full {
                    width: 100%;
                }

                /* Mobile-friendly forms */
                .form-group input,
                .form-group select,
                .form-group textarea {
                    min-height: 44px;
                    font-size: 16px;
                    padding: 12px;
                }

                /* Mobile-friendly dropdowns */
                .dropdown-menu {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 90%;
                    max-width: 300px;
                    max-height: 70vh;
                    overflow-y: auto;
                }

                /* Mobile-friendly notifications */
                .notification-item {
                    padding: 16px;
                    margin-bottom: 12px;
                }

                .notification-content {
                    font-size: 14px;
                    line-height: 1.5;
                }

                /* Mobile-friendly metrics */
                .metrics-grid {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                .metric-card {
                    padding: 16px;
                }

                /* Mobile-friendly tables */
                .table-container {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }

                table {
                    min-width: 600px;
                }

                /* Mobile-friendly modals */
                .modal {
                    padding: 16px;
                }

                .modal-content {
                    width: 95%;
                    max-width: none;
                    margin: 20px auto;
                }

                /* Touch-friendly spacing */
                .nav-item {
                    min-height: 48px;
                    padding: 12px 16px;
                }

                .dropdown-item {
                    min-height: 44px;
                    padding: 12px 16px;
                }

                /* Mobile-specific utilities */
                .mobile-only {
                    display: block;
                }

                .desktop-only {
                    display: none;
                }

                /* Dark mode mobile adjustments */
                .dark-mode .dashboard-sidebar {
                    background: var(--bg-secondary);
                }

                .dark-mode #mobile-overlay {
                    background: rgba(0, 0, 0, 0.7);
                }
            }

            @media (min-width: 769px) {
                .mobile-only {
                    display: none;
                }

                .desktop-only {
                    display: block;
                }
            }

            /* iOS-specific adjustments */
            .ios .btn,
            .ios input,
            .ios select,
            .ios textarea {
                -webkit-appearance: none;
                border-radius: 8px;
            }

            /* Android-specific adjustments */
            .android .btn {
                text-transform: none;
            }
        `;
        document.head.appendChild(style);
    }

    optimizeTouchTargets() {
        // Ensure all interactive elements meet minimum touch target size
        const touchElements = document.querySelectorAll('button, .btn, .nav-item, .dropdown-item, input[type="checkbox"], input[type="radio"]');
        touchElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.height < 44 || rect.width < 44) {
                element.style.minHeight = '44px';
                element.style.minWidth = '44px';
            }
        });
    }

    addMobileNavigation() {
        // Add mobile menu button
        const header = document.querySelector('.dashboard-header');
        if (header && !document.getElementById('mobile-menu-btn')) {
            const menuBtn = document.createElement('button');
            menuBtn.id = 'mobile-menu-btn';
            menuBtn.className = 'mobile-menu-btn mobile-only';
            menuBtn.innerHTML = '☰';
            menuBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 24px;
                color: inherit;
                cursor: pointer;
                padding: 8px;
                margin-right: 12px;
            `;
            
            menuBtn.addEventListener('click', () => {
                this.openSidebar();
            });

            const headerContent = header.querySelector('.header-content');
            if (headerContent) {
                headerContent.insertBefore(menuBtn, headerContent.firstChild);
            }
        }
    }

    optimizeForms() {
        // Optimize form inputs for mobile
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Prevent zoom on focus (iOS)
            if (this.isIOS) {
                input.style.fontSize = '16px';
            }

            // Add mobile-friendly attributes
            if (input.type === 'email') {
                input.setAttribute('autocomplete', 'email');
            } else if (input.type === 'tel') {
                input.setAttribute('autocomplete', 'tel');
            }
        });
    }

    setupResponsiveHandlers() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            
            if (wasMobile !== this.isMobile) {
                // Device orientation or size changed
                this.optimizeForMobile();
            }
        });

        // Handle orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.optimizeForMobile();
            }, 100);
        });
    }
}

// Initialize mobile optimization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileOptimization = new MobileOptimization();
});

// Global functions for easy access
window.openMobileSidebar = () => window.mobileOptimization.openSidebar();
window.closeMobileSidebar = () => window.mobileOptimization.closeSidebar();
