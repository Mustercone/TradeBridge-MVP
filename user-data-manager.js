// User Data Manager - Handles user profile data across the webapp
class UserDataManager {
    constructor() {
        this.storageKey = 'tradebridge_user_data';
        this.userData = this.loadUserData();
    }

    // Load user data from localStorage
    loadUserData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : this.getDefaultUserData();
        } catch (error) {
            console.error('Error loading user data:', error);
            return this.getDefaultUserData();
        }
    }

    // Save user data to localStorage
    saveUserData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.userData));
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            return false;
        }
    }

    // Get default user data structure
    getDefaultUserData() {
        return {
            personalInfo: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                company: '',
                fullName: '',
                initials: ''
            },
            documents: {
                cacCertificate: null,
                cacMemorandum: null,
                cacDirectors: null,
                bankStatement: null,
                tinDocument: null,
                bvnNumber: ''
            },
            verification: {
                status: 'pending',
                documentsUploaded: 0,
                bvnVerified: false,
                accountCreated: false
            },
            profile: {
                avatar: null,
                lastLogin: null,
                accountCreated: null
            }
        };
    }

    // Update personal information from sign-up form
    updatePersonalInfo(formData) {
        this.userData.personalInfo = {
            firstName: formData.firstName || '',
            lastName: formData.lastName || '',
            email: formData.email || '',
            phone: formData.phone || '',
            company: formData.company || '',
            fullName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
            initials: this.generateInitials(formData.firstName, formData.lastName)
        };
        this.saveUserData();
    }

    // Update document information
    updateDocuments(documentData) {
        this.userData.documents = {
            ...this.userData.documents,
            ...documentData
        };
        
        // Count uploaded documents
        const documentCount = Object.values(this.userData.documents).filter(doc => 
            doc && typeof doc === 'object' && doc.name
        ).length;
        
        this.userData.verification.documentsUploaded = documentCount;
        this.saveUserData();
    }

    // Update verification status
    updateVerificationStatus(status) {
        this.userData.verification = {
            ...this.userData.verification,
            ...status
        };
        this.saveUserData();
    }

    // Generate user initials
    generateInitials(firstName, lastName) {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return first + last;
    }

    // Get user display name
    getUserDisplayName() {
        return this.userData.personalInfo.fullName || 'User';
    }

    // Get user initials
    getUserInitials() {
        return this.userData.personalInfo.initials || 'U';
    }

    // Get user email
    getUserEmail() {
        return this.userData.personalInfo.email || '';
    }

    // Get user company
    getUserCompany() {
        return this.userData.personalInfo.company || '';
    }

    // Get user phone
    getUserPhone() {
        return this.userData.personalInfo.phone || '';
    }

    // Check if user is verified
    isUserVerified() {
        return this.userData.verification.status === 'verified';
    }

    // Get verification status
    getVerificationStatus() {
        return this.userData.verification.status;
    }

    // Get documents count
    getDocumentsCount() {
        return this.userData.verification.documentsUploaded;
    }

    // Check if BVN is verified
    isBVNVerified() {
        return this.userData.verification.bvnVerified;
    }

    // Update profile avatar
    updateAvatar(avatarData) {
        this.userData.profile.avatar = avatarData;
        this.saveUserData();
    }

    // Get profile avatar
    getAvatar() {
        return this.userData.profile.avatar;
    }

    // Update last login
    updateLastLogin() {
        this.userData.profile.lastLogin = new Date().toISOString();
        this.saveUserData();
    }

    // Get last login
    getLastLogin() {
        return this.userData.profile.lastLogin;
    }

    // Set account created date
    setAccountCreated() {
        this.userData.profile.accountCreated = new Date().toISOString();
        this.userData.verification.accountCreated = true;
        this.saveUserData();
    }

    // Get account created date
    getAccountCreated() {
        return this.userData.profile.accountCreated;
    }

    // Clear all user data (for logout)
    clearUserData() {
        localStorage.removeItem(this.storageKey);
        this.userData = this.getDefaultUserData();
    }

    // Get all user data
    getAllUserData() {
        return this.userData;
    }

    // Check if user has completed signup
    hasCompletedSignup() {
        return this.userData.verification.accountCreated && 
               this.userData.personalInfo.firstName && 
               this.userData.personalInfo.lastName && 
               this.userData.personalInfo.email;
    }
}

// Global instance
window.userDataManager = new UserDataManager();

// Profile Update Manager - Updates profile displays across all pages
class ProfileUpdateManager {
    constructor() {
        this.userDataManager = window.userDataManager;
    }

    // Update header profile information
    updateHeaderProfile() {
        const userDisplayName = this.userDataManager.getUserDisplayName();
        const userInitials = this.userDataManager.getUserInitials();
        const userEmail = this.userDataManager.getUserEmail();

        // Update user name in header
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            element.textContent = userDisplayName;
        });

        // Update user avatar initials
        const avatarElements = document.querySelectorAll('.user-avatar');
        avatarElements.forEach(element => {
            element.textContent = userInitials;
        });

        // Update profile email if element exists
        const profileEmailElement = document.getElementById('profileEmail');
        if (profileEmailElement) {
            profileEmailElement.textContent = userEmail;
        }
    }

    // Update profile page information
    updateProfilePage() {
        const userData = this.userDataManager.getAllUserData();
        
        // Update profile name
        const profileNameElement = document.getElementById('profileName');
        if (profileNameElement) {
            profileNameElement.textContent = userData.personalInfo.fullName;
        }

        // Update profile email
        const profileEmailElement = document.getElementById('profileEmail');
        if (profileEmailElement) {
            profileEmailElement.textContent = userData.personalInfo.email;
        }

        // Update profile phone
        const profilePhoneElement = document.getElementById('profilePhone');
        if (profilePhoneElement) {
            profilePhoneElement.textContent = userData.personalInfo.phone;
        }

        // Update profile company
        const profileCompanyElement = document.getElementById('profileCompany');
        if (profileCompanyElement) {
            profileCompanyElement.textContent = userData.personalInfo.company;
        }

        // Update profile location (if available)
        const profileLocationElement = document.getElementById('profileLocation');
        if (profileLocationElement) {
            profileLocationElement.textContent = 'Lagos, Nigeria'; // Default location
        }

        // Update verification status
        this.updateVerificationStatus();
    }

    // Update verification status display
    updateVerificationStatus() {
        const verificationStatus = this.userDataManager.getVerificationStatus();
        const documentsCount = this.userDataManager.getDocumentsCount();
        const bvnVerified = this.userDataManager.isBVNVerified();

        // Update verification status elements
        const statusElements = document.querySelectorAll('.verification-status');
        statusElements.forEach(element => {
            element.textContent = verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1);
            element.className = `verification-status ${verificationStatus}`;
        });

        // Update documents count
        const documentsCountElements = document.querySelectorAll('.documents-count');
        documentsCountElements.forEach(element => {
            element.textContent = `${documentsCount} documents uploaded`;
        });

        // Update BVN status
        const bvnStatusElements = document.querySelectorAll('.bvn-status');
        bvnStatusElements.forEach(element => {
            element.textContent = bvnVerified ? 'Verified' : 'Pending';
            element.className = `bvn-status ${bvnVerified ? 'verified' : 'pending'}`;
        });
    }

    // Update settings page form
    updateSettingsForm() {
        const userData = this.userDataManager.getAllUserData();
        
        // Update form fields
        const firstNameInput = document.getElementById('firstName');
        if (firstNameInput) {
            firstNameInput.value = userData.personalInfo.firstName;
        }

        const lastNameInput = document.getElementById('lastName');
        if (lastNameInput) {
            lastNameInput.value = userData.personalInfo.lastName;
        }

        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = userData.personalInfo.email;
        }

        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.value = userData.personalInfo.phone;
        }

        const companyInput = document.getElementById('company');
        if (companyInput) {
            companyInput.value = userData.personalInfo.company;
        }
    }

    // Update all pages
    updateAllPages() {
        this.updateHeaderProfile();
        this.updateProfilePage();
        this.updateVerificationStatus();
        this.updateSettingsForm();
    }
}

// Global instance
window.profileUpdateManager = new ProfileUpdateManager();

// Initialize profile updates when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.profileUpdateManager) {
        window.profileUpdateManager.updateAllPages();
    }
});
