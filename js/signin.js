class SignInApp {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.checkAuthState();
        
        console.log('🔐 Sign In App loaded');
    }

    initializeElements() {
        this.form = document.getElementById('signinForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.rememberMeCheckbox = document.getElementById('rememberMe');
        this.signinBtn = document.getElementById('signinBtn');
        this.googleSigninBtn = document.getElementById('googleSigninBtn');
        this.forgotPasswordLink = document.getElementById('forgotPasswordLink');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        this.loadingSpinner = document.getElementById('loadingSpinner');
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSignIn(e));
        this.googleSigninBtn.addEventListener('click', () => this.handleGoogleSignIn());
        this.forgotPasswordLink.addEventListener('click', (e) => this.handleForgotPassword(e));
        
        // Load remembered email
        this.loadRememberedEmail();
    }

    loadRememberedEmail() {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            this.emailInput.value = rememberedEmail;
            this.rememberMeCheckbox.checked = true;
        }
    }

    async checkAuthState() {
        // Wait for Firebase to initialize
        let attempts = 0;
        while (!window.firebase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.firebase && window.firebase.auth) {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
            
            onAuthStateChanged(window.firebase.auth, (user) => {
                if (user) {
                    console.log('User already logged in, redirecting...');
                    this.showMessage('success', '✅ Bạn đã đăng nhập! Đang chuyển hướng...');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            });
        }
    }

    async handleSignIn(e) {
        e.preventDefault();
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;

        // Validation
        if (!this.validateForm(email, password)) {
            return;
        }

        this.setLoading(true);

        try {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
            const { doc, updateDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

            // Sign in user
            const userCredential = await signInWithEmailAndPassword(window.firebase.auth, email, password);
            const user = userCredential.user;

            // Remember email if checkbox is checked
            if (this.rememberMeCheckbox.checked) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // Update last login time in Firestore
            try {
                const userDocRef = doc(window.firebase.db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    await updateDoc(userDocRef, {
                        lastLogin: new Date().toISOString()
                    });
                } else {
                    // Create user document if it doesn't exist (for legacy users)
                    await setDoc(userDocRef, {
                        displayName: user.displayName || 'User',
                        email: user.email,
                        createdAt: new Date().toISOString(),
                        savedWords: {},
                        totalWords: 0,
                        lastLogin: new Date().toISOString()
                    });
                }
            } catch (firestoreError) {
                console.warn('Could not update user document:', firestoreError);
                // Don't fail the login for this
            }

            console.log('✅ User signed in successfully:', user.uid);
            
            this.showMessage('success', `🎉 Đăng nhập thành công! Xin chào ${user.displayName || user.email}!`);
            
            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Sign in error:', error);
            this.handleSignInError(error);
        } finally {
            this.setLoading(false);
        }
    }

    async handleGoogleSignIn() {
        this.setLoading(true);
        
        try {
            const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
            const { doc, setDoc, getDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

            const provider = new GoogleAuthProvider();
            
            // Add additional scopes if needed
            provider.addScope('email');
            provider.addScope('profile');
            
            // Set custom parameters for better UX
            provider.setCustomParameters({
                prompt: 'select_account' // Always show account selection
            });

            console.log('🌐 Initiating Google Sign-In...');
            const result = await signInWithPopup(window.firebase.auth, provider);
            const user = result.user;

            console.log('🌐 Google Sign-In successful:', {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                providerData: user.providerData
            });

            // Create or update user document in Firestore
            const userDocRef = doc(window.firebase.db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (!userDoc.exists()) {
                // Create new user document
                await setDoc(userDocRef, {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    createdAt: new Date().toISOString(),
                    savedWords: {},
                    totalWords: 0,
                    lastLogin: new Date().toISOString(),
                    provider: 'google',
                    emailVerified: user.emailVerified
                });
                console.log('📝 Created new Google user document');
            } else {
                // Update existing user document
                await updateDoc(userDocRef, {
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    lastLogin: new Date().toISOString(),
                    emailVerified: user.emailVerified
                });
                console.log('📝 Updated existing Google user document');
            }

            this.showMessage('success', `🎉 Đăng nhập Google thành công! Xin chào ${user.displayName}!`);
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Google sign in error:', error);
            
            let message = '❌ Lỗi đăng nhập Google';
            
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = '❌ Đăng nhập bị hủy bởi người dùng';
                    break;
                case 'auth/popup-blocked':
                    message = '❌ Popup bị chặn. Vui lòng cho phép popup và thử lại.';
                    break;
                case 'auth/cancelled-popup-request':
                    message = '❌ Yêu cầu đăng nhập bị hủy';
                    break;
                case 'auth/operation-not-allowed':
                    message = '❌ Google Sign-In chưa được kích hoạt. Vui lòng kích hoạt trong Firebase Console.';
                    break;
                case 'auth/invalid-api-key':
                    message = '❌ API key không hợp lệ';
                    break;
                case 'auth/network-request-failed':
                    message = '❌ Lỗi kết nối mạng. Vui lòng thử lại.';
                    break;
                case 'auth/too-many-requests':
                    message = '❌ Quá nhiều yêu cầu. Vui lòng thử lại sau.';
                    break;
                default:
                    message = `❌ Lỗi đăng nhập Google: ${error.message}`;
            }
            
            this.showMessage('error', message);
        } finally {
            this.setLoading(false);
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = this.emailInput.value.trim();
        if (!email) {
            this.showMessage('error', '❌ Vui lòng nhập email trước khi reset mật khẩu');
            return;
        }

        try {
            const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
            
            await sendPasswordResetEmail(window.firebase.auth, email);
            
            this.showMessage('success', `📧 Email reset mật khẩu đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư!`);
            
        } catch (error) {
            console.error('Password reset error:', error);
            
            if (error.code === 'auth/user-not-found') {
                this.showMessage('error', '❌ Không tìm thấy tài khoản với email này');
            } else if (error.code === 'auth/invalid-email') {
                this.showMessage('error', '❌ Email không hợp lệ');
            } else {
                this.showMessage('error', `❌ Lỗi reset mật khẩu: ${error.message}`);
            }
        }
    }

    validateForm(email, password) {
        if (!email) {
            this.showMessage('error', '❌ Vui lòng nhập email');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showMessage('error', '❌ Email không hợp lệ');
            return false;
        }

        if (!password) {
            this.showMessage('error', '❌ Vui lòng nhập mật khẩu');
            return false;
        }

        return true;
    }

    handleSignInError(error) {
        let message = 'Có lỗi xảy ra khi đăng nhập';
        
        switch (error.code) {
            case 'auth/user-not-found':
                message = '❌ Không tìm thấy tài khoản với email này. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.';
                break;
            case 'auth/wrong-password':
                message = '❌ Mật khẩu không đúng. Vui lòng thử lại hoặc reset mật khẩu.';
                break;
            case 'auth/invalid-email':
                message = '❌ Địa chỉ email không hợp lệ';
                break;
            case 'auth/user-disabled':
                message = '❌ Tài khoản này đã bị vô hiệu hóa';
                break;
            case 'auth/too-many-requests':
                message = '❌ Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau vài phút.';
                break;
            case 'auth/network-request-failed':
                message = '❌ Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
                break;
            case 'auth/operation-not-allowed':
                message = '❌ Đăng nhập email/mật khẩu chưa được kích hoạt. Vui lòng liên hệ admin.';
                break;
            case 'auth/invalid-credential':
                message = '❌ Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra email và mật khẩu.';
                break;
            default:
                message = `❌ Lỗi: ${error.message}`;
                console.error('Sign in error details:', error);
        }
        
        this.showMessage('error', message);
    }

    showMessage(type, message) {
        this.hideMessages();
        
        if (type === 'error') {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
        } else if (type === 'success') {
            this.successMessage.textContent = message;
            this.successMessage.style.display = 'block';
        }
    }

    hideMessages() {
        this.errorMessage.style.display = 'none';
        this.successMessage.style.display = 'none';
    }

    setLoading(loading) {
        if (loading) {
            this.loadingSpinner.style.display = 'block';
            this.signinBtn.disabled = true;
            this.googleSigninBtn.disabled = true;
        } else {
            this.loadingSpinner.style.display = 'none';
            this.signinBtn.disabled = false;
            this.googleSigninBtn.disabled = false;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SignInApp();
});
