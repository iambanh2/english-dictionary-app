import Logger from '../common/logger.js';
import MockData from './mock-data.js';
/**
 * MockAuth class simulates Firebase Auth for debugging purposes
 */
class MockAuth {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authStateListeners = [];
        this.logger = new Logger('MockAuth');
        this.logger.info('MockAuth initialized');
    }
    /**
     * Simulate sign in with Google
     */
    async signInWithGoogle() {
        this.logger.info('Mock: Attempting to sign in with Google');
        try {
            // Simulate network delay
            await MockData.simulateDelay(1500);
            // Simulate random failure (10% chance)
            if (Math.random() < 0.1) {
                this.logger.warn('Mock: Sign in failed (simulated)');
                return {
                    success: false,
                    error: 'Simulated sign-in failure for testing'
                };
            }
            else {
                this.isAuthenticated = true;
                this.currentUser = MockData.getUser();
                this.logger.info('Mock: Sign in successful', {
                    uid: this.currentUser.uid
                });
                // Notify listeners
                this.notifyAuthStateListeners(this.currentUser);
                return {
                    success: true,
                    user: this.currentUser
                };
            }
        }
        catch (error) {
            this.logger.error('Mock: Sign in error', { error: error.message });
            return {
                success: false,
                error: 'Mock sign-in error'
            };
        }
    }
    /**
     * Simulate sign out
     */
    async signOut() {
        this.logger.info('Mock: Attempting to sign out');
        try {
            // Simulate network delay
            await MockData.simulateDelay(500);
            this.isAuthenticated = false;
            const previousUser = this.currentUser;
            this.currentUser = null;
            this.logger.info('Mock: Sign out successful', {
                previousUid: previousUser?.uid
            });
            // Notify listeners
            this.notifyAuthStateListeners(null);
            return { success: true };
        }
        catch (error) {
            this.logger.error('Mock: Sign out error', { error: error.message });
            return {
                success: false,
                error: 'Mock sign-out error'
            };
        }
    }
    /**
     * Get current authenticated user
     */
    getCurrentUser() {
        if (this.currentUser) {
            this.logger.debug('Mock: Current user found', {
                uid: this.currentUser.uid
            });
        }
        else {
            this.logger.debug('Mock: No current user found');
        }
        return this.currentUser;
    }
    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        const isAuth = this.isAuthenticated && this.currentUser !== null;
        if (isAuth) {
            this.logger.debug('Mock: User is authenticated', { uid: this.currentUser.uid });
        }
        else {
            this.logger.debug('Mock: User is not authenticated');
        }
        return isAuth;
    }
    /**
     * Listen for authentication state changes
     */
    onAuthStateChanged(callback) {
        this.logger.info('Mock: Setting up auth state listener');
        this.authStateListeners.push(callback);
        // Immediately call with current state
        callback(this.currentUser);
        // Return unsubscribe function
        return () => {
            const index = this.authStateListeners.indexOf(callback);
            if (index > -1) {
                this.authStateListeners.splice(index, 1);
                this.logger.debug('Mock: Auth state listener removed');
            }
        };
    }
    /**
     * Notify all auth state listeners
     */
    notifyAuthStateListeners(user) {
        this.logger.debug('Mock: Notifying auth state listeners', {
            listenerCount: this.authStateListeners.length,
            user: user ? user.uid : 'none'
        });
        this.authStateListeners.forEach(listener => {
            try {
                listener(user);
            }
            catch (error) {
                this.logger.error('Mock: Error in auth state listener', {
                    error: error.message
                });
            }
        });
    }
    /**
     * Wait for auth state to be determined
     */
    async waitForAuthState() {
        this.logger.debug('Mock: Waiting for auth state to be determined');
        return new Promise((resolve) => {
            const unsubscribe = this.onAuthStateChanged((user) => {
                this.logger.debug('Mock: Auth state determined', {
                    user: user ? user.uid : 'none'
                });
                unsubscribe();
                resolve(user);
            });
        });
    }
    /**
     * Simulate authentication error scenarios
     */
    async simulateAuthError(errorType) {
        this.logger.warn('Mock: Simulating auth error', { errorType });
        const errors = MockData.getErrorScenarios();
        let error;
        switch (errorType) {
            case 'network':
                error = errors.networkError;
                break;
            case 'permission':
                error = errors.permissionError;
                break;
            default:
                error = errors.authError;
        }
        throw new Error(`${error.code}: ${error.message}`);
    }
    /**
     * Toggle authentication state for testing
     */
    toggleAuthState() {
        this.logger.info('Mock: Toggling auth state');
        if (this.isAuthenticated) {
            this.signOut();
        }
        else {
            // Quick sign in without delay for testing
            this.isAuthenticated = true;
            this.currentUser = MockData.getUser();
            this.notifyAuthStateListeners(this.currentUser);
        }
    }
    /**
     * Reset to initial state
     */
    reset() {
        this.logger.info('Mock: Resetting auth state');
        this.isAuthenticated = false;
        this.currentUser = null;
        this.authStateListeners = [];
    }
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            isAuthenticated: this.isAuthenticated,
            currentUser: this.currentUser,
            listenerCount: this.authStateListeners.length,
            mockMode: true
        };
    }
}
export default MockAuth;
//# sourceMappingURL=test-auth.js.map