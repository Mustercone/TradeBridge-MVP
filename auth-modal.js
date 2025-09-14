/**
 * Authentication Modal System for TradeBridge
 * Handles login, signup, and social authentication with local storage
 */

class AuthModal {
    constructor() {
        this.isOpen = false;
        this.currentMode = 'login'; // 'login' or 'signup'
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
        this.loadStoredUser();
    }

    createModal() {
        const modalHTML = `
            <div id="authModal" class="auth-modal" style="display: none;">
                <div class="auth-modal-overlay" onclick="authModal.close()"></div>
                <div class="auth-modal-content">
                    <div class="auth-modal-header">
                        <h2 id="authModalTitle">Sign In to TradeBridge</h2>
                        <button class="auth-modal-close" onclick="authModal.close()">×</button>
                    </div>
                    
                    <div class="auth-modal-body">
                        <!-- Social Login Buttons -->
                        <div class="social-login-section">
                            <button class="social-btn google-btn" onclick="authModal.handleGoogleLogin()">
                                <img src="assets/icons/google.svg" alt="Google" width="20" height="20">
                                Continue with Google
                            </button>
                            <button class="social-btn microsoft-btn" onclick="authModal.handleMicrosoftLogin()">
                                <img src="assets/icons/microsoft.svg" alt="Microsoft" width="20" height="20">
                                Continue with Microsoft
                            </button>
                        </div>
                        
                        <div class="auth-divider">
                            <span>or</span>
                        </div>
                        
                        <!-- Login Form -->
                        <form id="authForm" class="auth-form">
                            <div id="signupFields" class="signup-fields" style="display: none;">
                                <div class="form-group">
                                    <label for="firstName">First Name</label>
                                    <input type="text" id="firstName" name="firstName" required>
                                </div>
                                <div class="form-group">
                                    <label for="lastName">Last Name</label>
                                    <input type="text" id="lastName" name="lastName" required>
                                </div>
                                <div class="form-group">
                                    <label for="company">Company (Optional)</label>
                                    <input type="text" id="company" name="company">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="email">Email Address</label>
                                <input type="email" id="email" name="email" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="password">Password</label>
                                <input type="password" id="password" name="password" required>
                            </div>
                            
                            <div id="confirmPasswordField" class="form-group" style="display: none;">
                                <label for="confirmPassword">Confirm Password</label>
                                <input type="password" id="confirmPassword" name="confirmPassword">
                            </div>
                            
                            <div class="form-options">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="rememberMe">
                                    <span class="checkmark"></span>
                                    Remember me
                                </label>
                                <a href="#" class="forgot-password" onclick="authModal.showForgotPassword()">Forgot Password?</a>
                            </div>
                            
                            <button type="submit" class="auth-submit-btn" id="authSubmitBtn">
                                Sign In
                            </button>
                        </form>
                        
                        <div class="auth-switch">
                            <span id="authSwitchText">Don't have an account?</span>
                            <button type="button" class="auth-switch-btn" onclick="authModal.switchMode()">
                                Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    bindEvents() {
        const form = document.getElementById('authForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    open(mode = 'login') {
        this.currentMode = mode;
        this.updateModalContent();
        this.showModal();
    }

    close() {
        this.hideModal();
        this.resetForm();
    }

    showModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            this.isOpen = true;
            
            // Focus on email field
            setTimeout(() => {
                const emailField = document.getElementById('email');
                if (emailField) emailField.focus();
            }, 100);
        }
    }

    hideModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this.isOpen = false;
        }
    }

    updateModalContent() {
        const title = document.getElementById('authModalTitle');
        const submitBtn = document.getElementById('authSubmitBtn');
        const switchText = document.getElementById('authSwitchText');
        const switchBtn = document.querySelector('.auth-switch-btn');
        const signupFields = document.getElementById('signupFields');
        const confirmPasswordField = document.getElementById('confirmPasswordField');

        if (this.currentMode === 'login') {
            title.textContent = 'Sign In to TradeBridge';
            submitBtn.textContent = 'Sign In';
            switchText.textContent = "Don't have an account?";
            switchBtn.textContent = 'Sign Up';
            signupFields.style.display = 'none';
            confirmPasswordField.style.display = 'none';
        } else {
            title.textContent = 'Create Your TradeBridge Account';
            submitBtn.textContent = 'Sign Up';
            switchText.textContent = 'Already have an account?';
            switchBtn.textContent = 'Sign In';
            signupFields.style.display = 'block';
            confirmPasswordField.style.display = 'block';
        }
    }

    switchMode() {
        this.currentMode = this.currentMode === 'login' ? 'signup' : 'login';
        this.updateModalContent();
        this.resetForm();
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        if (this.currentMode === 'login') {
            this.handleLogin(data);
        } else {
            this.handleSignup(data);
        }
    }

    handleLogin(data) {
        const result = userAuthStorage.loginUser(data.email, data.password);
        
        if (result.success) {
            this.showSuccess('Login successful! Redirecting...');
            setTimeout(() => {
                this.close();
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            this.showError(result.message);
        }
    }

    handleSignup(data) {
        // Validate password confirmation
        if (data.password !== data.confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }

        const result = userAuthStorage.registerUser(data);
        
        if (result.success) {
            this.showSuccess('Account created successfully! Please sign in.');
            this.switchMode();
        } else {
            this.showError(result.message);
        }
    }

    handleGoogleLogin() {
        // Mock Google login with sample data
        const googleData = {
            email: 'john.doe@gmail.com',
            firstName: 'John',
            lastName: 'Doe',
            company: 'Google Inc',
            position: 'Software Engineer',
            country: 'United States',
            timezone: 'America/New_York',
            language: 'en',
            profilePhoto: null
        };

        const result = userAuthStorage.socialLogin('google', googleData);
        
        if (result.success) {
            this.showSuccess('Google login successful! Redirecting...');
            setTimeout(() => {
                this.close();
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            this.showError(result.message);
        }
    }

    handleMicrosoftLogin() {
        // Mock Microsoft login with sample data
        const microsoftData = {
            email: 'jane.smith@outlook.com',
            firstName: 'Jane',
            lastName: 'Smith',
            company: 'Microsoft Corp',
            position: 'Business Analyst',
            country: 'United States',
            timezone: 'America/Los_Angeles',
            language: 'en',
            profilePhoto: null
        };

        const result = userAuthStorage.socialLogin('microsoft', microsoftData);
        
        if (result.success) {
            this.showSuccess('Microsoft login successful! Redirecting...');
            setTimeout(() => {
                this.close();
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            this.showError(result.message);
        }
    }

    showForgotPassword() {
        this.showError('Password reset functionality will be implemented in the next version.');
    }

    resetForm() {
        const form = document.getElementById('authForm');
        if (form) {
            form.reset();
        }
    }

    loadStoredUser() {
        const currentUser = userAuthStorage.getCurrentUser();
        if (currentUser) {
            // User is already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        // Remove existing toast
        const existingToast = document.querySelector('.auth-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `auth-toast auth-toast-${type}`;
        toast.textContent = message;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            ${type === 'success' ? 'background: #10B981;' : 'background: #EF4444;'}
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the auth modal
const authModal = new AuthModal();

// Global functions for button clicks
function openLoginModal() {
    authModal.open('login');
}

function openSignupModal() {
    authModal.open('signup');
}
