/**
 * User Authentication Storage System for TradeBridge
 * Handles local storage of user sign up/login information
 */

class UserAuthStorage {
    constructor() {
        this.storageKey = 'tradebridge_users';
        this.currentUserKey = 'tradebridge_current_user';
        this.init();
    }

    init() {
        // Initialize storage if it doesn't exist
        if (!this.getUsers()) {
            this.initializeDefaultUsers();
        }
    }

    initializeDefaultUsers() {
        const defaultUsers = [
            {
                id: 'user_001',
                email: 'john.doe@tradebridge.com',
                password: 'password123', // In production, this would be hashed
                firstName: 'John',
                lastName: 'Doe',
                company: 'TradeBridge Corp',
                position: 'Senior Trade Manager',
                phone: '+1 (555) 123-4567',
                address: '123 Business St, New York, NY 10001',
                country: 'United States',
                timezone: 'America/New_York',
                language: 'en',
                isVerified: true,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                profilePhoto: null
            },
            {
                id: 'user_002',
                email: 'jane.smith@tradebridge.com',
                password: 'password123',
                firstName: 'Jane',
                lastName: 'Smith',
                company: 'Global Trade Inc',
                position: 'Trade Analyst',
                phone: '+1 (555) 987-6543',
                address: '456 Commerce Ave, Los Angeles, CA 90210',
                country: 'United States',
                timezone: 'America/Los_Angeles',
                language: 'en',
                isVerified: true,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                profilePhoto: null
            }
        ];

        this.saveUsers(defaultUsers);
    }

    // User Registration
    registerUser(userData) {
        const users = this.getUsers();
        
        // Check if user already exists
        if (this.getUserByEmail(userData.email)) {
            return {
                success: false,
                message: 'User with this email already exists'
            };
        }

        // Validate required fields
        const validation = this.validateUserData(userData);
        if (!validation.isValid) {
            return {
                success: false,
                message: validation.message
            };
        }

        // Create new user
        const newUser = {
            id: this.generateUserId(),
            email: userData.email.toLowerCase(),
            password: userData.password, // In production, hash this
            firstName: userData.firstName,
            lastName: userData.lastName,
            company: userData.company || '',
            position: userData.position || '',
            phone: userData.phone || '',
            address: userData.address || '',
            country: userData.country || '',
            timezone: userData.timezone || 'UTC',
            language: userData.language || 'en',
            isVerified: false,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            profilePhoto: null
        };

        users.push(newUser);
        this.saveUsers(users);

        return {
            success: true,
            message: 'User registered successfully',
            user: this.sanitizeUserData(newUser)
        };
    }

    // User Login
    loginUser(email, password) {
        const user = this.getUserByEmail(email);
        
        if (!user) {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        if (user.password !== password) {
            return {
                success: false,
                message: 'Invalid email or password'
            };
        }

        // Update last login
        user.lastLogin = new Date().toISOString();
        this.updateUser(user);

        // Set current user
        this.setCurrentUser(user);

        return {
            success: true,
            message: 'Login successful',
            user: this.sanitizeUserData(user)
        };
    }

    // Social Login (Google, Microsoft)
    socialLogin(provider, socialData) {
        const users = this.getUsers();
        let user = this.getUserByEmail(socialData.email);

        if (!user) {
            // Create new user from social data
            user = {
                id: this.generateUserId(),
                email: socialData.email.toLowerCase(),
                password: null, // No password for social login
                firstName: socialData.firstName,
                lastName: socialData.lastName,
                company: socialData.company || '',
                position: socialData.position || '',
                phone: socialData.phone || '',
                address: socialData.address || '',
                country: socialData.country || '',
                timezone: socialData.timezone || 'UTC',
                language: socialData.language || 'en',
                isVerified: true, // Social accounts are considered verified
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                profilePhoto: socialData.profilePhoto || null,
                socialProvider: provider
            };

            users.push(user);
            this.saveUsers(users);
        } else {
            // Update existing user
            user.lastLogin = new Date().toISOString();
            user.socialProvider = provider;
            this.updateUser(user);
        }

        this.setCurrentUser(user);

        return {
            success: true,
            message: 'Social login successful',
            user: this.sanitizeUserData(user)
        };
    }

    // Update user profile
    updateUserProfile(userId, updateData) {
        const user = this.getUserById(userId);
        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        // Update allowed fields
        const allowedFields = ['firstName', 'lastName', 'company', 'position', 'phone', 'address', 'country', 'timezone', 'language'];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                user[field] = updateData[field];
            }
        });

        this.updateUser(user);
        this.setCurrentUser(user);

        return {
            success: true,
            message: 'Profile updated successfully',
            user: this.sanitizeUserData(user)
        };
    }

    // Change password
    changePassword(userId, currentPassword, newPassword) {
        const user = this.getUserById(userId);
        if (!user) {
            return {
                success: false,
                message: 'User not found'
            };
        }

        if (user.password !== currentPassword) {
            return {
                success: false,
                message: 'Current password is incorrect'
            };
        }

        user.password = newPassword;
        this.updateUser(user);

        return {
            success: true,
            message: 'Password changed successfully'
        };
    }

    // Logout
    logout() {
        localStorage.removeItem(this.currentUserKey);
        return {
            success: true,
            message: 'Logged out successfully'
        };
    }

    // Get current user
    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.currentUserKey);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    // Helper methods
    getUsers() {
        try {
            const users = localStorage.getItem(this.storageKey);
            return users ? JSON.parse(users) : [];
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    saveUsers(users) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(users));
        } catch (error) {
            console.error('Error saving users:', error);
        }
    }

    getUserByEmail(email) {
        const users = this.getUsers();
        return users.find(user => user.email === email.toLowerCase());
    }

    getUserById(id) {
        const users = this.getUsers();
        return users.find(user => user.id === id);
    }

    updateUser(updatedUser) {
        const users = this.getUsers();
        const index = users.findIndex(user => user.id === updatedUser.id);
        if (index !== -1) {
            users[index] = updatedUser;
            this.saveUsers(users);
        }
    }

    setCurrentUser(user) {
        try {
            localStorage.setItem(this.currentUserKey, JSON.stringify(user));
        } catch (error) {
            console.error('Error setting current user:', error);
        }
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    validateUserData(userData) {
        const requiredFields = ['email', 'password', 'firstName', 'lastName'];
        
        for (const field of requiredFields) {
            if (!userData[field] || userData[field].trim() === '') {
                return {
                    isValid: false,
                    message: `${field} is required`
                };
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            return {
                isValid: false,
                message: 'Please enter a valid email address'
            };
        }

        // Password validation
        if (userData.password.length < 6) {
            return {
                isValid: false,
                message: 'Password must be at least 6 characters long'
            };
        }

        return { isValid: true };
    }

    sanitizeUserData(user) {
        // Remove sensitive data before returning
        const sanitized = { ...user };
        delete sanitized.password;
        return sanitized;
    }

    // Export user data (for backup)
    exportUserData(userId) {
        const user = this.getUserById(userId);
        if (!user) {
            return null;
        }

        const exportData = {
            ...this.sanitizeUserData(user),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        return JSON.stringify(exportData, null, 2);
    }

    // Import user data (for restore)
    importUserData(jsonData) {
        try {
            const userData = JSON.parse(jsonData);
            const result = this.registerUser(userData);
            return result;
        } catch (error) {
            return {
                success: false,
                message: 'Invalid data format'
            };
        }
    }
}

// Initialize the storage system
const userAuthStorage = new UserAuthStorage();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserAuthStorage;
}
