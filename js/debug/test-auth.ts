import Logger from '../common/logger.js';
import MockData from './mock-data.js';

/**
 * MockAuth class simulates Firebase Auth for debugging purposes
 */
class MockAuth {
    private logger: Logger;
    private isAuthenticated: boolean = false;
    private currentUser: any | null = null;
    private authStateListeners: ((user: any | null) => void)[] = [];

    constructor() {
        this.logger = new Logger('MockAuth');
        this.logger.info('MockAuth initialized');
    }

    /**
     * Simulate sign in with Google
     */
    async signInWithGoogle(): Promise<{ success: boolean; user?: any; error?: string }> {
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
            } else {
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
        } catch (error: any) {
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
    async signOut(): Promise<{ success: boolean; error?: string }> {
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
        } catch (error: any) {
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
    getCurrentUser(): any | null {
        if (this.currentUser) {
            this.logger.debug('Mock: Current user found', {
                uid: this.currentUser.uid
            });
        } else {
            this.logger.debug('Mock: No current user found');
        }
        
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isUserAuthenticated(): boolean {
        const isAuth = this.isAuthenticated && this.currentUser !== null;
        
        if (isAuth) {
            this.logger.debug('Mock: User is authenticated', { uid: this.currentUser.uid });
        } else {
            this.logger.debug('Mock: User is not authenticated');
        }
        
        return isAuth;
    }

    /**
     * Listen for authentication state changes
     */
    onAuthStateChanged(callback: (user: any | null) => void): () => void {
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
    private notifyAuthStateListeners(user: any | null): void {
        this.logger.debug('Mock: Notifying auth state listeners', {
            listenerCount: this.authStateListeners.length,
            user: user ? user.uid : 'none'
        });
        
        this.authStateListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error: any) {
                this.logger.error('Mock: Error in auth state listener', {
                    error: error.message
                });
            }
        });
    }

    /**
     * Wait for auth state to be determined
     */
    async waitForAuthState(): Promise<any | null> {
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
    async simulateAuthError(errorType: string): Promise<void> {
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
    toggleAuthState(): void {
        this.logger.info('Mock: Toggling auth state');
        
        if (this.isAuthenticated) {
            this.signOut();
        } else {
            // Quick sign in without delay for testing
            this.isAuthenticated = true;
            this.currentUser = MockData.getUser();
            this.notifyAuthStateListeners(this.currentUser);
        }
    }

    /**
     * Reset to initial state
     */
    reset(): void {
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
