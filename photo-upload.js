/**
 * Photo Upload Functionality for TradeBridge Profile
 * Handles profile photo upload, preview, and local storage
 */

class PhotoUpload {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        this.init();
    }

    init() {
        this.createUploadButton();
        this.loadStoredPhoto();
    }

    createUploadButton() {
        const avatarContainer = document.querySelector('.avatar-container');
        if (!avatarContainer) return;

        // Create upload button overlay
        const uploadOverlay = document.createElement('div');
        uploadOverlay.className = 'upload-overlay';
        uploadOverlay.innerHTML = `
            <div class="upload-icon">📷</div>
            <span class="upload-text">Upload Photo</span>
        `;

        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.id = 'photoUpload';

        // Add event listener
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Add click event to overlay
        uploadOverlay.addEventListener('click', () => fileInput.click());

        // Add hover effects
        avatarContainer.addEventListener('mouseenter', () => {
            uploadOverlay.style.opacity = '1';
        });

        avatarContainer.addEventListener('mouseleave', () => {
            uploadOverlay.style.opacity = '0';
        });

        avatarContainer.appendChild(uploadOverlay);
        avatarContainer.appendChild(fileInput);
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!this.validateFile(file)) return;

        // Show loading
        this.showLoading();

        // Process file
        this.processFile(file);
    }

    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showError('File size must be less than 5MB');
            return false;
        }

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            this.showError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
            return false;
        }

        return true;
    }

    processFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const imageData = e.target.result;
            this.updateProfilePhoto(imageData);
            this.savePhotoToStorage(imageData);
            this.hideLoading();
            this.showSuccess('Profile photo updated successfully!');
        };

        reader.onerror = () => {
            this.hideLoading();
            this.showError('Failed to read the image file');
        };

        reader.readAsDataURL(file);
    }

    updateProfilePhoto(imageData) {
        const avatar = document.querySelector('.avatar');
        const avatarFallback = document.querySelector('.avatar-fallback');
        
        if (avatar && avatarFallback) {
            // Create image element
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = 'Profile Photo';
            img.className = 'avatar-image';
            
            // Clear existing content and add image
            avatar.innerHTML = '';
            avatar.appendChild(img);
            
            // Update header avatar too
            this.updateHeaderAvatar(imageData);
        }
    }

    updateHeaderAvatar(imageData) {
        const headerAvatar = document.querySelector('.user-avatar');
        if (headerAvatar) {
            headerAvatar.innerHTML = '';
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = 'Profile Photo';
            img.className = 'header-avatar-image';
            headerAvatar.appendChild(img);
        }
    }

    savePhotoToStorage(imageData) {
        try {
            localStorage.setItem('tradebridge_profile_photo', imageData);
            localStorage.setItem('tradebridge_profile_photo_updated', new Date().toISOString());
        } catch (error) {
            console.error('Failed to save photo to localStorage:', error);
        }
    }

    loadStoredPhoto() {
        try {
            const storedPhoto = localStorage.getItem('tradebridge_profile_photo');
            if (storedPhoto) {
                this.updateProfilePhoto(storedPhoto);
            }
        } catch (error) {
            console.error('Failed to load stored photo:', error);
        }
    }

    showLoading() {
        const avatar = document.querySelector('.avatar');
        if (avatar) {
            avatar.style.opacity = '0.5';
            avatar.style.pointerEvents = 'none';
        }
    }

    hideLoading() {
        const avatar = document.querySelector('.avatar');
        if (avatar) {
            avatar.style.opacity = '1';
            avatar.style.pointerEvents = 'auto';
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            ${type === 'success' ? 'background: #10B981;' : 'background: #EF4444;'}
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Method to remove profile photo
    removeProfilePhoto() {
        const avatar = document.querySelector('.avatar');
        const avatarFallback = document.querySelector('.avatar-fallback');
        
        if (avatar && avatarFallback) {
            avatar.innerHTML = '';
            avatar.appendChild(avatarFallback);
            
            // Update header avatar
            const headerAvatar = document.querySelector('.user-avatar');
            if (headerAvatar) {
                headerAvatar.innerHTML = 'JD';
            }
            
            // Remove from storage
            localStorage.removeItem('tradebridge_profile_photo');
            localStorage.removeItem('tradebridge_profile_photo_updated');
            
            this.showSuccess('Profile photo removed successfully!');
        }
    }
}

// Initialize photo upload when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PhotoUpload();
});
