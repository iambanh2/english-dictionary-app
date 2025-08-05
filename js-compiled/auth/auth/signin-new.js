import Logger from '../common/logger.js';
import AuthManager from './auth-manager.js';
/**
 * SignIn class handles the sign-in page functionality
 */
class SignIn {
    constructor() {
        this.logger = new Logger('SignIn');
        this.authManager = new AuthManager();
        this.logger.info('SignIn page initialized');
    }
    /**
     * Initialize sign-in page
     */
    async initialize() {
        this.logger.info('Initializing sign-in page');
        try {
            // Check if user is already authenticated
            const currentUser = this.authManager.getCurrentUser();
            if (currentUser) {
                this.logger.info('User already authenticated, redirecting to main page', {
                    uid: currentUser.uid
                });
                this.redirectToMain();
                return;
            }
            else {
                this.logger.debug('No authenticated user, showing sign-in form');
                this.setupSignInForm();
            }
        }
        catch (error) {
            this.logger.error('Failed to initialize sign-in page', { error: error.message });
            this.showError('Failed to initialize sign-in page');
        }
    }
    /**
     * Setup sign-in form event listeners
     */
    setupSignInForm() {
        this.logger.debug('Setting up sign-in form');
        try {
            // Setup Google Sign In
            const googleSignInBtn = document.getElementById('google-signin-btn');
            if (googleSignInBtn) {
                googleSignInBtn.addEventListener('click', () => this.handleGoogleSignIn());
                this.logger.debug('Google sign-in button event listener added');
            }
            else {
                this.logger.warn('Google sign-in button not found in DOM');
            }
            // Setup Email/Password Sign In Form
            const signinForm = document.getElementById('signin-form');
            if (signinForm) {
                signinForm.addEventListener('submit', (e) => this.handleEmailSignIn(e));
                this.logger.debug('Email sign-in form event listener added');
            }
            else {
                this.logger.warn('Sign-in form not found in DOM');
            }
            // Setup password toggle
            const passwordToggle = document.getElementById('password-toggle');
            const passwordInput = document.getElementById('password');
            if (passwordToggle && passwordInput) {
                passwordToggle.addEventListener('click', () => {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    passwordToggle.textContent = type === 'password' ? '👁️' : '🙈';
                });
                this.logger.debug('Password toggle event listener added');
            }
            // Hide loading and error states
            this.hideLoading();
            this.hideError();
            this.logger.debug('Sign-in form setup complete');
        }
        catch (error) {
            this.logger.error('Failed to setup sign-in form', { error: error.message });
            this.showError('Failed to setup sign-in form');
        }
    }
    /**
     * Handle Google sign-in button click
     */
    async handleGoogleSignIn() {
        this.logger.info('Google sign-in button clicked');
        try {
            this.showLoading();
            this.hideError();
            this.setButtonLoading('google-signin-btn', true);
            const result = await this.authManager.signInWithGoogle();
            if (result.success && result.user) {
                this.logger.info('Google sign-in successful', {
                    uid: result.user.uid,
                    email: result.user.email
                });
                this.showSuccess('Sign-in successful! Redirecting...');
                // Small delay to show success message
                setTimeout(() => {
                    this.redirectToMain();
                }, 1500);
            }
            else {
                throw new Error(result.error || 'Sign-in failed');
            }
        }
        catch (error) {
            this.logger.error('Google sign-in failed', { error: error.message });
            this.showError(`Sign-in failed: ${error.message}`);
        }
        finally {
            this.hideLoading();
            this.setButtonLoading('google-signin-btn', false);
        }
    }
    /**
     * Handle email/password sign-in form submission
     */
    async handleEmailSignIn(event) {
        event.preventDefault();
        this.logger.info('Email sign-in form submitted');
        try {
            this.hideError();
            this.setButtonLoading('signin-button', true);
            // Get form values
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (!emailInput || !passwordInput) {
                throw new Error('Email or password input not found');
            }
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            // Validate inputs
            if (!email || !password) {
                throw new Error('Please fill in all fields');
            }
            if (!this.isValidEmail(email)) {
                throw new Error('Please enter a valid email address');
            }
            const result = await this.authManager.signInWithEmailAndPassword(email, password);
            if (result.success && result.user) {
                this.logger.info('Email sign-in successful', {
                    uid: result.user.uid,
                    email: result.user.email
                });
                this.showSuccess('Sign-in successful! Redirecting...');
                // Small delay to show success message
                setTimeout(() => {
                    this.redirectToMain();
                }, 1500);
            }
            else {
                throw new Error(result.error || 'Sign-in failed');
            }
        }
        catch (error) {
            this.logger.error('Email sign-in failed', { error: error.message });
            this.showError(`Sign-in failed: ${error.message}`);
        }
        finally {
            this.setButtonLoading('signin-button', false);
        }
    }
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = loading;
            if (loading) {
                button.classList.add('loading');
            }
            else {
                button.classList.remove('loading');
            }
        }
    }
    /**
     * Show loading overlay
     */
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'flex';
        }
    }
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    /**
     * Show error message
     */
    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        this.logger.debug('Error message displayed', { message });
    }
    /**
     * Hide error message
     */
    hideError() {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        const successElement = document.getElementById('success-message');
        if (successElement) {
            successElement.textContent = message;
            successElement.classList.add('show');
        }
        this.logger.debug('Success message displayed', { message });
    }
    /**
     * Hide success message
     */
    hideSuccess() {
        const successElement = document.getElementById('success-message');
        if (successElement) {
            successElement.classList.remove('show');
            successElement.textContent = '';
        }
    }
    /**
     * Redirect to main page
     */
    redirectToMain() {
        this.logger.info('Redirecting to main page');
        window.location.href = 'index.html';
    }
}
// Initialize sign-in page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const signIn = new SignIn();
    signIn.initialize().catch((error) => {
        console.error('Failed to initialize sign-in page:', error);
    });
});
export default SignIn;
