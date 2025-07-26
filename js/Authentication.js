// Authentication Class - Manages user authentication and UI
class Authentication {
    constructor() {
        this.version = '1.0.0';
        console.log(`🔐 Authentication class v${this.version} initialized`);
    }

    // Helper function to create user display with avatar
    createUserDisplay(user) {
        const displayName = user.displayName || user.email || 'User';
        
        if (user.photoURL) {
            // Try to load the actual photo
            return `
                <img src="${user.photoURL}" 
                     alt="Avatar" 
                     class="user-avatar"
                     onerror="this.onerror=null; this.outerHTML=window.createFallbackAvatar('${displayName.replace(/'/g, '\\\'')}')"
                     loading="lazy">
                <span style="vertical-align: middle; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
            `;
        } else {
            // Create fallback avatar with initial
            const initial = displayName.charAt(0).toUpperCase();
            return `
                <div class="user-avatar-fallback" title="${displayName}">${initial}</div>
                <span style="vertical-align: middle; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
            `;
        }
    }

    // Helper function to create fallback avatar
    createFallbackAvatar(displayName) {
        const initial = displayName.charAt(0).toUpperCase();
        return `<div class="user-avatar-fallback" title="${displayName}">${initial}</div>`;
    }

    // Common auth state handler
    handleAuthStateChange(user, userSection, authSection, userDisplayName, savedWordsPanel) {
        if (user) {
            // User is signed in
            userSection.style.display = 'block';
            authSection.style.display = 'none';
            if (savedWordsPanel) savedWordsPanel.style.display = 'block';
            
            // Debug user info
            console.log('👤 User info:', {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                providerData: user.providerData.map(p => ({
                    providerId: p.providerId,
                    photoURL: p.photoURL
                }))
            });
            
            // Use helper function to create user display
            userDisplayName.innerHTML = this.createUserDisplay(user);
            
            console.log('🔥 User authenticated:', user.uid);
        } else {
            // User is signed out
            userSection.style.display = 'none';
            authSection.style.display = 'block';
            if (savedWordsPanel) savedWordsPanel.style.display = 'none';
            console.log('🔐 No user signed in - showing auth options');
        }
    }

    // Common logout handler
    async handleLogout(auth) {
        try {
            const { signOut } = await window.firebase.getAuthFunctions();
            await signOut(auth);
            console.log('🚪 User signed out');
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            alert('Lỗi khi đăng xuất: ' + error.message);
            return false;
        }
    }

    // Setup authentication UI for a page
    setupAuthUI(userSection, authSection, userDisplayName, logoutBtn, auth) {
        const { onAuthStateChanged } = window.firebase.getAuthFunctions?.() || {};
        
        if (onAuthStateChanged) {
            // Auth state listener
            onAuthStateChanged(auth, (user) => {
                this.handleAuthStateChange(user, userSection, authSection, userDisplayName);
            });

            // Logout functionality
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    await this.handleLogout(auth);
                });
            }
        }
    }

    // Initialize global fallback avatar function
    initializeGlobalHelpers() {
        // Make fallback avatar globally available
        window.createFallbackAvatar = this.createFallbackAvatar.bind(this);
    }
}

// Export for ES6 modules
export { Authentication };

// Also make available globally for non-module scripts
window.Authentication = Authentication;
