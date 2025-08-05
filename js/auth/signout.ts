import Logger from '../common/logger.js';
import AuthManager from './auth-manager.js';

/**
 * SignOut class handles sign-out functionality
 */
class SignOut {
    private logger: Logger;
    private authManager: AuthManager;

    constructor() {
        this.logger = new Logger('SignOut');
        this.authManager = new AuthManager();
        this.logger.info('SignOut initialized');
    }

    /**
     * Perform sign-out operation
     */
    async signOut(): Promise<{ success: boolean; error?: string }> {
        this.logger.info('Starting sign-out process');
        
        try {
            // Check if user is authenticated before signing out
            const currentUser = this.authManager.getCurrentUser();
            if (!currentUser) {
                this.logger.warn('No authenticated user found to sign out');
                return {
                    success: false,
                    error: 'No user is currently signed in'
                };
            } else {
                this.logger.debug('Signing out user', { uid: currentUser.uid });
                
                const result = await this.authManager.signOut();
                
                if (result.success) {
                    this.logger.info('Sign-out successful');
                    return { success: true };
                } else {
                    this.logger.error('Sign-out failed', { error: result.error });
                    return {
                        success: false,
                        error: result.error
                    };
                }
            }
        } catch (error: any) {
            this.logger.error('Unexpected error during sign-out', { error: error.message });
            return {
                success: false,
                error: 'An unexpected error occurred during sign-out'
            };
        }
    }

    /**
     * Sign out and redirect to sign-in page
     */
    async signOutAndRedirect(): Promise<void> {
        this.logger.info('Sign-out with redirect requested');
        
        try {
            const result = await this.signOut();
            
            if (result.success) {
                this.logger.info('Sign-out successful, redirecting to sign-in page');
                this.redirectToSignIn();
            } else {
                this.logger.warn('Sign-out failed, showing error', { error: result.error });
                this.showError(result.error || 'Failed to sign out');
            }
        } catch (error: any) {
            this.logger.error('Error in signOutAndRedirect', { error: error.message });
            this.showError('An error occurred while signing out');
        }
    }

    /**
     * Show error message (can be customized based on UI)
     */
    private showError(message: string): void {
        this.logger.debug('Showing error message', { message });
        
        // Try to find error display element
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            // Fallback to alert if no error element
            this.logger.warn('Error element not found, using alert', { message });
            alert(`Error: ${message}`);
        }
    }

    /**
     * Redirect to sign-in page
     */
    private redirectToSignIn(): void {
        this.logger.info('Redirecting to sign-in page');
        
        try {
            // Clear any cached data before redirect
            this.clearCachedData();
            
            window.location.href = '../html/signin.html';
        } catch (error: any) {
            this.logger.error('Failed to redirect to sign-in page', { error: error.message });
            // Fallback - reload current page
            window.location.reload();
        }
    }

    /**
     * Clear any cached user data from localStorage
     */
    private clearCachedData(): void {
        this.logger.debug('Clearing cached data');
        
        try {
            // Clear any app-specific cached data
            const keysToRemove = [
                'user-preferences',
                'vocabulary-cache',
                'recent-searches'
            ];
            
            keysToRemove.forEach(key => {
                if (localStorage.getItem(key)) {
                    localStorage.removeItem(key);
                    this.logger.debug('Removed cached data', { key });
                }
            });
        } catch (error: any) {
            this.logger.warn('Failed to clear some cached data', { error: error.message });
        }
    }

    /**
     * Setup sign-out button event listener
     */
    setupSignOutButton(buttonId: string): void {
        this.logger.debug('Setting up sign-out button', { buttonId });
        
        try {
            const signOutBtn = document.getElementById(buttonId);
            if (signOutBtn) {
                signOutBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.signOutAndRedirect();
                });
                this.logger.debug('Sign-out button event listener added', { buttonId });
            } else {
                this.logger.warn('Sign-out button not found', { buttonId });
            }
        } catch (error: any) {
            this.logger.error('Failed to setup sign-out button', { 
                buttonId, 
                error: error.message 
            });
        }
    }

    /**
     * Confirm sign-out with user (optional feature)
     */
    async confirmAndSignOut(): Promise<void> {
        this.logger.debug('Confirming sign-out with user');
        
        try {
            const confirmed = confirm('Are you sure you want to sign out?');
            if (confirmed) {
                this.logger.info('User confirmed sign-out');
                await this.signOutAndRedirect();
            } else {
                this.logger.info('User cancelled sign-out');
            }
        } catch (error: any) {
            this.logger.error('Error in confirmAndSignOut', { error: error.message });
        }
    }
}

export default SignOut;
