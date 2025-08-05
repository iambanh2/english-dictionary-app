import Logger from '../common/logger.js';
import { auth } from '../firebase/firebase-init.js';
/**
 * AuthManager handles authentication operations using Firebase Auth
 */
class AuthManager {
    constructor() {
        this.logger = new Logger('AuthManager');
        this.logger.info('AuthManager initialized');
    }
    /**
     * Sign in with Google using Firebase Auth
     */
    async signInWithGoogle() {
        this.logger.info('Attempting to sign in with Google');
        try {
            const { GoogleAuthProvider, signInWithPopup } = await window.firebase.getAuthFunctions();
            const provider = new GoogleAuthProvider();
            // Add additional scopes if needed
            provider.addScope('profile');
            provider.addScope('email');
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
                this.logger.info('Sign in successful', {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName
                });
                return {
                    success: true,
                    user: {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: result.user.displayName,
                        photoURL: result.user.photoURL
                    }
                };
            }
            else {
                this.logger.warn('Sign in returned no user');
                return {
                    success: false,
                    error: 'No user returned from sign in'
                };
            }
        }
        catch (error) {
            this.logger.error('Sign in failed', { error: error.message, code: error.code });
            // Handle specific error codes
            let errorMessage = 'An error occurred during sign in';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Sign in was cancelled';
            }
            else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Pop-up was blocked by browser';
            }
            else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection';
            }
            else {
                errorMessage = error.message || errorMessage;
            }
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    /**
     * Sign in with email and password using Firebase Auth
     */
    async signInWithEmailAndPassword(email, password) {
        this.logger.info('Attempting to sign in with email and password', { email });
        try {
            const { signInWithEmailAndPassword } = await window.firebase.getAuthFunctions();
            const result = await signInWithEmailAndPassword(auth, email, password);
            if (result.user) {
                this.logger.info('Email sign in successful', {
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName
                });
                return {
                    success: true,
                    user: {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: result.user.displayName,
                        photoURL: result.user.photoURL
                    }
                };
            }
            else {
                this.logger.warn('Email sign in returned no user');
                return {
                    success: false,
                    error: 'No user returned from sign in'
                };
            }
        }
        catch (error) {
            this.logger.error('Email sign in failed', { error: error.message, code: error.code });
            // Handle specific error codes
            let errorMessage = 'An error occurred during sign in';
            if (error.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address';
            }
            else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password';
            }
            else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address';
            }
            else if (error.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled';
            }
            else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection';
            }
            else {
                errorMessage = error.message || errorMessage;
            }
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    /**
     * Sign out current user
     */
    async signOut() {
        this.logger.info('Attempting to sign out');
        try {
            const { signOut } = await window.firebase.getAuthFunctions();
            await signOut(auth);
            this.logger.info('Sign out successful');
            return { success: true };
        }
        catch (error) {
            this.logger.error('Sign out failed', { error: error.message });
            return {
                success: false,
                error: error.message || 'Failed to sign out'
            };
        }
    }
    /**
     * Get current authenticated user
     */
    getCurrentUser() {
        const user = auth.currentUser;
        if (user) {
            this.logger.debug('Current user found', {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            });
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified
            };
        }
        else {
            this.logger.debug('No current user found');
            return null;
        }
    }
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const user = this.getCurrentUser();
        const isAuth = user !== null;
        if (isAuth) {
            this.logger.debug('User is authenticated', { uid: user.uid });
        }
        else {
            this.logger.debug('User is not authenticated');
        }
        return isAuth;
    }
    /**
     * Listen for authentication state changes
     */
    onAuthStateChanged(callback) {
        this.logger.info('Setting up auth state listener');
        // Use Firebase's onAuthStateChanged
        return auth.onAuthStateChanged((user) => {
            if (user) {
                this.logger.info('Auth state changed: User signed in', {
                    uid: user.uid,
                    email: user.email
                });
                callback({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified
                });
            }
            else {
                this.logger.info('Auth state changed: User signed out');
                callback(null);
            }
        });
    }
    /**
     * Wait for auth state to be determined (useful for app initialization)
     */
    async waitForAuthState() {
        this.logger.debug('Waiting for auth state to be determined');
        return new Promise((resolve) => {
            const unsubscribe = this.onAuthStateChanged((user) => {
                this.logger.debug('Auth state determined', { user: user ? user.uid : 'none' });
                unsubscribe();
                resolve(user);
            });
        });
    }
}
export default AuthManager;
