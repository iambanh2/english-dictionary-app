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
            }
            // Setup Email/Password Sign In Form
            const signinForm = document.getElementById('signin-form');
            if (signinForm) {
                signinForm.addEventListener('submit', (e) => this.handleEmailSignIn(e));
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
            }
            this.logger.debug('Sign-in form setup complete');
        }
        catch (error) {
            this.logger.error('Failed to setup sign-in form', { error: error.message });
            this.showError('Failed to setup sign-in form');
        }
    }
    addEventListener() { }
}
() => this.handleGoogleSignIn();
;
this.logger.debug('Google sign-in button event listener added');
{
    this.logger.warn('Google sign-in button not found in DOM');
}
// Add loading state management
this.hideLoading();
this.hideError();
try { }
catch (error) {
    this.logger.error('Failed to setup sign-in form', { error: error.message });
}
async;
handleGoogleSignIn();
Promise < void  > {
    this: .logger.info('Google sign-in button clicked'),
    try: {
        this: .showLoading(),
        this: .hideError(),
        const: result = await this.authManager.signInWithGoogle(),
        if(result) { }, : .success && result.user
    }
};
{
    this.logger.info('Sign-in successful, redirecting to main page', {
        uid: result.user.uid
    });
    this.hideLoading();
    this.redirectToMain();
}
{
    this.logger.warn('Sign-in failed', { error: result.error });
    this.hideLoading();
    this.showError(result.error || 'Sign-in failed');
}
try { }
catch (error) {
    this.logger.error('Unexpected error during sign-in', { error: error.message });
    this.hideLoading();
    this.showError('An unexpected error occurred');
}
showLoading();
void {
    this: .logger.debug('Showing loading state'),
    const: loadingElement = document.getElementById('loading'),
    const: signInBtn = document.getElementById('google-signin-btn'),
    if(loadingElement) {
        loadingElement.style.display = 'block';
    }, else: {
        this: .logger.warn('Loading element not found')
    },
    if(signInBtn) {
        signInBtn.disabled = true;
        signInBtn.textContent = 'Signing in...';
    }, else: {
        this: .logger.warn('Sign-in button not found for loading state')
    }
};
hideLoading();
void {
    this: .logger.debug('Hiding loading state'),
    const: loadingElement = document.getElementById('loading'),
    const: signInBtn = document.getElementById('google-signin-btn'),
    if(loadingElement) {
        loadingElement.style.display = 'none';
    }, else: {
        this: .logger.debug('Loading element not found (may be expected)')
    },
    if(signInBtn) {
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign in with Google';
    }, else: {
        this: .logger.warn('Sign-in button not found for hiding loading state')
    }
};
showError(message, string);
void {
    this: .logger.debug('Showing error message', { message }),
    const: errorElement = document.getElementById('error-message'),
    if(errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }, else: {
        this: .logger.warn('Error message element not found, using alert', { message })
    } `);
        }
    }

    /**
     * Hide error message
     */
    private hideError(): void {
        this.logger.debug('Hiding error message');
        
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }

    /**
     * Redirect to main page
     */
    private redirectToMain(): void {
        this.logger.info('Redirecting to main page');
        
        try {
            window.location.href = '../html/index.html';
        } catch (error: any) {
            this.logger.error('Failed to redirect to main page', { error: error.message });
            // Fallback
            window.location.reload();
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const signIn = new SignIn();
    signIn.initialize();
});

export default SignIn;
};
//# sourceMappingURL=signin-broken.js.map