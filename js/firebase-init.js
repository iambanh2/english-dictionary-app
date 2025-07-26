// Firebase Initialization - Shared across all pages
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Make Firebase available globally
window.firebase = { 
    app, 
    db, 
    auth,
    // Export commonly used functions for convenience
    async getAuthFunctions() {
        const authModule = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js');
        return authModule;
    },
    async getFirestoreFunctions() {
        const firestoreModule = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        return firestoreModule;
    }
};

// Log initialization status
console.log('🔥 Firebase initialized successfully');
console.log('📱 App:', app.name);
console.log('🔑 Auth instance ready');
console.log('🗄️ Firestore instance ready');

// Export for ES6 modules
export { app, db, auth };
