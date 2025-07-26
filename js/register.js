class RegisterApp {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.checkAuthState();
        
        console.log('🚀 Register App loaded');
    }

    initializeElements() {
        this.form = document.getElementById('registerForm');
        this.displayNameInput = document.getElementById('displayName');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.registerBtn = document.getElementById('registerBtn');
        this.googleSigninBtn = document.getElementById('googleSigninBtn');
        this.errorMessage = document.getElementById('errorMessage');
        this.successMessage = document.getElementById('successMessage');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.passwordStrength = document.getElementById('passwordStrength');
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleRegister(e));
        this.googleSigninBtn.addEventListener('click', () => this.handleGoogleSignIn());
        this.passwordInput.addEventListener('input', () => this.checkPasswordStrength());
        this.confirmPasswordInput.addEventListener('input', () => this.checkPasswordMatch());
    }

    checkPasswordStrength() {
        const password = this.passwordInput.value;
        const strength = this.calculatePasswordStrength(password);
        
        this.passwordStrength.textContent = strength.message;
        this.passwordStrength.className = `password-strength ${strength.class}`;
    }

    calculatePasswordStrength(password) {
        if (password.length === 0) {
            return { message: '', class: '' };
        }
        
        if (password.length < 6) {
            return { message: '❌ Quá ngắn (tối thiểu 6 ký tự)', class: 'strength-weak' };
        }
        
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score <= 1) {
            return { message: '⚠️ Yếu - Nên thêm chữ hoa, số hoặc ký tự đặc biệt', class: 'strength-weak' };
        } else if (score <= 2) {
            return { message: '✓ Trung bình', class: 'strength-medium' };
        } else {
            return { message: '✅ Mạnh', class: 'strength-strong' };
        }
    }

    checkPasswordMatch() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (confirmPassword.length > 0) {
            if (password !== confirmPassword) {
                this.confirmPasswordInput.style.borderColor = '#e74c3c';
            } else {
                this.confirmPasswordInput.style.borderColor = '#27ae60';
            }
        } else {
            this.confirmPasswordInput.style.borderColor = '#e9ecef';
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

    async handleRegister(e) {
        e.preventDefault();
        
        const displayName = this.displayNameInput.value.trim();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        // Validation
        if (!this.validateForm(displayName, email, password, confirmPassword)) {
            return;
        }

        this.setLoading(true);

        try {
            // Wait for Firebase Auth
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

            // Create user account
            const userCredential = await createUserWithEmailAndPassword(window.firebase.auth, email, password);
            const user = userCredential.user;

            // Update user profile
            await updateProfile(user, {
                displayName: displayName
            });

            // Create user document in Firestore
            await setDoc(doc(window.firebase.db, 'users', user.uid), {
                displayName: displayName,
                email: email,
                createdAt: new Date().toISOString(),
                savedWords: {},
                totalWords: 0,
                lastLogin: new Date().toISOString()
            });

            console.log('✅ User registered successfully:', user.uid);
            
            this.showMessage('success', `🎉 Tài khoản đã được tạo thành công! Chào mừng ${displayName}!`);
            
            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);

        } catch (error) {
            console.error('Registration error:', error);
            this.handleRegistrationError(error);
        } finally {
            this.setLoading(false);
        }
    }

    async handleGoogleSignIn() {
        this.setLoading(true);
        
        try {
            const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
            const { doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            console.log('🌐 Initiating Google Sign-Up...');
            const result = await signInWithPopup(window.firebase.auth, provider);
            const user = result.user;

            console.log('🌐 Google Sign-Up successful:', {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                providerData: user.providerData
            });

            // Check if user already exists
            const userDocRef = doc(window.firebase.db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                // User already exists, just sign them in
                this.showMessage('success', `🎉 Chào mừng trở lại ${user.displayName}! Đang chuyển hướng...`);
            } else {
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
                this.showMessage('success', `🎉 Tài khoản Google đã được tạo thành công! Chào mừng ${user.displayName}!`);
            }
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Google sign up error:', error);
            
            let message = '❌ Lỗi đăng ký Google';
            
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = '❌ Đăng ký bị hủy bởi người dùng';
                    break;
                case 'auth/popup-blocked':
                    message = '❌ Popup bị chặn. Vui lòng cho phép popup và thử lại.';
                    break;
                case 'auth/operation-not-allowed':
                    message = '❌ Google Sign-In chưa được kích hoạt. Vui lòng kích hoạt trong Firebase Console.';
                    break;
                case 'auth/account-exists-with-different-credential':
                    message = '❌ Tài khoản đã tồn tại với phương thức đăng nhập khác. Vui lòng thử đăng nhập.';
                    break;
                default:
                    message = `❌ Lỗi đăng ký Google: ${error.message}`;
            }
            
            this.showMessage('error', message);
        } finally {
            this.setLoading(false);
        }
    }

    validateForm(displayName, email, password, confirmPassword) {
        if (!displayName) {
            this.showMessage('error', '❌ Vui lòng nhập tên hiển thị');
            return false;
        }

        if (displayName.length < 2) {
            this.showMessage('error', '❌ Tên hiển thị phải có ít nhất 2 ký tự');
            return false;
        }

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

        if (password.length < 6) {
            this.showMessage('error', '❌ Mật khẩu phải có ít nhất 6 ký tự');
            return false;
        }

        if (password !== confirmPassword) {
            this.showMessage('error', '❌ Mật khẩu xác nhận không khớp');
            return false;
        }

        return true;
    }

    handleRegistrationError(error) {
        let message = 'Có lỗi xảy ra khi tạo tài khoản';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = '❌ Email này đã được sử dụng. Vui lòng thử email khác hoặc đăng nhập.';
                break;
            case 'auth/invalid-email':
                message = '❌ Địa chỉ email không hợp lệ';
                break;
            case 'auth/operation-not-allowed':
                message = '❌ Đăng ký email/mật khẩu chưa được kích hoạt. Vui lòng liên hệ admin để kích hoạt tính năng này trong Firebase Console.';
                break;
            case 'auth/weak-password':
                message = '❌ Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
                break;
            case 'auth/network-request-failed':
                message = '❌ Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
                break;
            case 'auth/too-many-requests':
                message = '❌ Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.';
                break;
            case 'auth/user-disabled':
                message = '❌ Tài khoản đã bị vô hiệu hóa.';
                break;
            default:
                message = `❌ Lỗi: ${error.message}`;
                console.error('Registration error details:', error);
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
            this.registerBtn.disabled = true;
            this.googleSigninBtn.disabled = true;
            this.registerBtn.textContent = 'Đang tạo tài khoản...';
        } else {
            this.loadingSpinner.style.display = 'none';
            this.registerBtn.disabled = false;
            this.googleSigninBtn.disabled = false;
            this.registerBtn.textContent = '✨ Tạo Tài Khoản';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RegisterApp();
});
