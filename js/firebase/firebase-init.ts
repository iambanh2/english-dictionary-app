// Firebase Initialization - Shared across all pages
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Define a global Firebase object type
interface FirebaseGlobal {
    app: FirebaseApp;
    db: Firestore;
    auth: Auth;
    getAuthFunctions: () => Promise<typeof import('firebase/auth')>;
    getFirestoreFunctions: () => Promise<typeof import('firebase/firestore')>;
}

// Make Firebase available globally
declare global {
    interface Window {
        firebase: FirebaseGlobal;
    }
}

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
