// Firebase Initialization - Shared across all pages
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebase-config.js';
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);
window.firebase = {
    app,
    db,
    auth,
    // Export commonly used functions for convenience
    async getAuthFunctions() {
        return await import('firebase/auth');
    },
    async getFirestoreFunctions() {
        return await import('firebase/firestore');
    }
};
// Log initialization status
console.log('🔥 Firebase initialized successfully');
console.log('📱 App:', app.name);
console.log('🔑 Auth instance ready');
console.log('🗄️ Firestore instance ready');
// Export for ES6 modules
export { app, db };
//# sourceMappingURL=firebase-init.js.map