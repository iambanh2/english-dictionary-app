import { auth } from '/js/firebase-init.js';
import { Authentication } from '/js/Authentication.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';

export class Business {
    constructor() {
        this.authManager = new Authentication();
        this.authManager.initializeGlobalHelpers();

        this.userSection = document.getElementById('userSection');
        this.authSection = document.getElementById('authSection');
        this.userDisplayName = document.getElementById('userDisplayName');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.savedWordsPanel = document.getElementById('savedWordsPanel');

        this.setupEventListeners();
    }

    setupEventListeners() {
        onAuthStateChanged(auth, (user) => {
            this.authManager.handleAuthStateChange(user, this.userSection, this.authSection, this.userDisplayName, this.savedWordsPanel);
        });

        this.logoutBtn.addEventListener('click', async () => {
            await this.authManager.handleLogout(auth);
        });
    }
}

// Initialize the Business class to run the application
new Business();
