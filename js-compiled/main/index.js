import Logger from '../common/logger.js';
import AuthManager from '../auth/auth-manager.js';
import SignOut from '../auth/signout.js';
/**
 * MainPageController handles the main page functionality
 * Displays different content based on authentication state
 */
class MainPageController {
    constructor() {
        this.authStateUnsubscribe = null;
        this.logger = new Logger('MainPageController');
        this.authManager = new AuthManager();
        this.signOut = new SignOut();
        this.logger.info('MainPageController initialized');
    }
    /**
     * Initialize the main page
     */
    async initialize() {
        this.logger.info('Initializing main page');
        try {
            // Setup auth state listener
            this.setupAuthStateListener();
            // Wait for initial auth state
            await this.authManager.waitForAuthState();
            this.logger.info('Main page initialization complete');
        }
        catch (error) {
            this.logger.error('Failed to initialize main page', { error: error.message });
            this.showError('Failed to initialize application');
        }
    }
    /**
     * Setup authentication state listener
     */
    setupAuthStateListener() {
        this.logger.debug('Setting up auth state listener');
        this.authStateUnsubscribe = this.authManager.onAuthStateChanged((user) => {
            if (user) {
                this.logger.info('User authenticated, rendering authenticated content', {
                    uid: user.uid
                });
                this.renderAuthenticatedContent(user);
            }
            else {
                this.logger.info('User not authenticated, rendering anonymous content');
                this.renderAnonymousContent();
            }
        });
    }
    /**
     * Render content for non-authenticated users
     */
    renderAnonymousContent() {
        this.logger.debug('Rendering anonymous content');
        try {
            // Update header only - keep existing main content
            this.renderAnonymousHeader();
            this.logger.debug('Anonymous content rendered successfully');
        }
        catch (error) {
            this.logger.error('Failed to render anonymous content', { error: error.message });
        }
    }
    /**
     * Render content for authenticated users
     */
    renderAuthenticatedContent(user) {
        this.logger.debug('Rendering authenticated content', { uid: user.uid });
        try {
            // Update header
            this.renderAuthenticatedHeader(user);
            // Update main content
            this.renderAuthenticatedMainContent(user);
            // Setup sign-out functionality
            this.signOut.setupSignOutButton('signout-btn');
            this.logger.debug('Authenticated content rendered successfully');
        }
        catch (error) {
            this.logger.error('Failed to render authenticated content', {
                error: error.message,
                uid: user.uid
            });
        }
    }
    /**
     * Render header for anonymous users
     */
    renderAnonymousHeader() {
        const authSection = document.getElementById('auth-section');
        if (authSection) {
            authSection.innerHTML = `
                <div class="auth-buttons">
                    <a href="/signin" class="auth-btn secondary">Đăng nhập</a>
                    <a href="/register" class="auth-btn primary">Đăng ký</a>
                </div>
            `;
            this.logger.debug('Anonymous header rendered');
        }
        else {
            this.logger.warn('Auth section element not found');
        }
    }
    /**
     * Render header for authenticated users
     */
    renderAuthenticatedHeader(user) {
        const authSection = document.getElementById('auth-section');
        if (authSection) {
            const displayName = user.displayName || user.email?.split('@')[0] || 'User';
            authSection.innerHTML = `
                <div class="user-profile">
                    <span class="user-name">👋 ${displayName}</span>
                    <button class="sign-out-btn" id="signout-btn">Sign Out</button>
                </div>
            `;
            // Setup sign out functionality
            this.signOut.setupSignOutButton('signout-btn');
            this.logger.debug('Authenticated header rendered', {
                displayName: user.displayName
            });
        }
        else {
            this.logger.warn('Auth section element not found');
        }
    }
    /**
     * Render main content for authenticated users
     */
    renderAuthenticatedMainContent(user) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            const displayName = user.displayName || user.email?.split('@')[0] || 'User';
            mainContent.innerHTML = `
                <div class="container">
                    <!-- Welcome Back Section -->
                    <section class="welcome-section">
                        <h1 class="welcome-title">Welcome back, ${displayName}! 👋</h1>
                        <p class="welcome-subtitle">Continue building your vocabulary and track your learning progress.</p>
                    </section>

                    <!-- Dashboard Stats -->
                    <section class="features-section">
                        <h2 class="features-title">Your Progress</h2>
                        <div class="features-grid">
                            <div class="feature-card">
                                <span class="feature-icon">📊</span>
                                <h3 class="feature-title">Total Words</h3>
                                <p class="feature-description">
                                    <span style="font-size: 2rem; font-weight: bold; color: var(--primary-color);" id="total-words">0</span><br>
                                    Words in your collection
                                </p>
                            </div>
                            
                            <div class="feature-card">
                                <span class="feature-icon">✅</span>
                                <h3 class="feature-title">Learned</h3>
                                <p class="feature-description">
                                    <span style="font-size: 2rem; font-weight: bold; color: var(--success-color);" id="learned-words">0</span><br>
                                    Words mastered
                                </p>
                            </div>
                            
                            <div class="feature-card">
                                <span class="feature-icon">⭐</span>
                                <h3 class="feature-title">Favorites</h3>
                                <p class="feature-description">
                                    <span style="font-size: 2rem; font-weight: bold; color: var(--warning-color);" id="favorite-words">0</span><br>
                                    Favorite words
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- Quick Actions -->
                    <section class="features-section">
                        <h2 class="features-title">Quick Actions</h2>
                        <div class="features-grid">
                            <div class="feature-card" style="cursor: pointer;" id="add-word-btn">
                                <span class="feature-icon">📝</span>
                                <h3 class="feature-title">Add New Word</h3>
                                <p class="feature-description">Add a new word to your personal dictionary with meaning and examples.</p>
                            </div>
                            
                            <div class="feature-card" style="cursor: pointer;" id="my-vocabulary-btn">
                                <span class="feature-icon">📚</span>
                                <h3 class="feature-title">My Vocabulary</h3>
                                <p class="feature-description">Browse and manage your personal word collection.</p>
                            </div>
                            
                            <div class="feature-card" style="cursor: pointer;" id="practice-btn">
                                <span class="feature-icon">🎯</span>
                                <h3 class="feature-title">Practice</h3>
                                <p class="feature-description">Test your knowledge with vocabulary exercises and quizzes.</p>
                            </div>
                        </div>
                    </section>

                    <!-- Search Section -->
                    <section class="features-section">
                        <h2 class="features-title">Search Dictionary</h2>
                        <div style="max-width: 600px; margin: 0 auto;">
                            <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                                <input type="text" 
                                       id="search-input" 
                                       placeholder="Search for a word or phrase..."
                                       style="flex: 1; padding: 1rem; border: 2px solid var(--gray-200); border-radius: var(--radius-lg); font-size: var(--font-size-lg); outline: none; transition: border-color 0.3s ease;"
                                       onFocus="this.style.borderColor='var(--primary-color)'"
                                       onBlur="this.style.borderColor='var(--gray-200)'">
                                <button class="cta-button" id="search-btn" style="white-space: nowrap;">Search</button>
                            </div>
                            <div id="search-results" style="background: white; border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-md); display: none;">
                                <!-- Search results will appear here -->
                            </div>
                        </div>
                    </section>
                </div>
            `;
            // Setup event listeners for interactive elements
            this.setupBasicInteractions();
            this.logger.debug('Authenticated main content rendered');
        }
        else {
            this.logger.warn('Main content element not found');
        }
    }
    /**
     * Setup basic interactions for dashboard elements
     */
    setupBasicInteractions() {
        // Add word button
        const addWordBtn = document.getElementById('add-word-btn');
        if (addWordBtn) {
            addWordBtn.addEventListener('click', () => {
                this.logger.info('Add word button clicked');
                // TODO: Implement add word functionality
                alert('Add word feature coming soon!');
            });
        }
        // My vocabulary button
        const myVocabBtn = document.getElementById('my-vocabulary-btn');
        if (myVocabBtn) {
            myVocabBtn.addEventListener('click', () => {
                this.logger.info('My vocabulary button clicked');
                // TODO: Implement vocabulary view
                alert('My vocabulary feature coming soon!');
            });
        }
        // Practice button
        const practiceBtn = document.getElementById('practice-btn');
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
                this.logger.info('Practice button clicked');
                // TODO: Implement practice mode
                alert('Practice feature coming soon!');
            });
        }
        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        if (searchBtn && searchInput) {
            const performSearch = () => {
                const query = searchInput.value.trim();
                if (query) {
                    this.logger.info('Search performed', { query });
                    // TODO: Implement search functionality
                    alert(`Searching for: "${query}" - Feature coming soon!`);
                }
            };
            searchBtn.addEventListener('click', performSearch);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
    }
    /**
     * Setup user dropdown functionality
     */
    setupUserDropdown() {
        const dropdownToggle = document.getElementById('user-menu');
        const dropdownMenu = document.getElementById('user-dropdown');
        if (dropdownToggle && dropdownMenu) {
            dropdownToggle.addEventListener('click', () => {
                dropdownMenu.classList.toggle('show');
            });
            // Close dropdown when clicking outside
            document.addEventListener('click', (event) => {
                if (!dropdownToggle.contains(event.target) &&
                    !dropdownMenu.contains(event.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
            this.logger.debug('User dropdown setup complete');
        }
        else {
            this.logger.warn('Dropdown elements not found');
        }
    }
    /**
     * Setup quick actions event listeners
     */
    setupQuickActions() {
        this.logger.debug('Setting up quick actions');
        // Add word button
        const addWordBtn = document.getElementById('add-word-btn');
        if (addWordBtn) {
            addWordBtn.addEventListener('click', () => {
                this.logger.info('Add word button clicked');
                // TODO: Implement add word functionality
                alert('Add word feature coming soon!');
            });
        }
        // My vocabulary button
        const myVocabBtn = document.getElementById('my-vocabulary-btn');
        if (myVocabBtn) {
            myVocabBtn.addEventListener('click', () => {
                this.logger.info('My vocabulary button clicked');
                // TODO: Implement vocabulary view
                alert('Vocabulary view coming soon!');
            });
        }
        // Search functionality
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('search-input');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.performSearch());
            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
    }
    /**
     * Perform search functionality
     */
    performSearch() {
        const searchInput = document.getElementById('search-input');
        const query = searchInput?.value.trim();
        if (query) {
            this.logger.info('Search performed', { query });
            // TODO: Implement search functionality
            alert(`Searching for: "${query}". Feature coming soon!`);
        }
        else {
            this.logger.warn('Empty search query');
            alert('Please enter a word to search for');
        }
    }
    /**
     * Load user statistics (placeholder for future implementation)
     */
    async loadUserStats(user) {
        this.logger.debug('Loading user stats', { uid: user.uid });
        try {
            // TODO: Implement actual data loading from Firestore
            // For now, use placeholder data
            const totalWordsEl = document.getElementById('total-words');
            const learnedWordsEl = document.getElementById('learned-words');
            const favoriteWordsEl = document.getElementById('favorite-words');
            if (totalWordsEl)
                totalWordsEl.textContent = '0';
            if (learnedWordsEl)
                learnedWordsEl.textContent = '0';
            if (favoriteWordsEl)
                favoriteWordsEl.textContent = '0';
            this.logger.debug('User stats loaded (placeholder data)');
        }
        catch (error) {
            this.logger.error('Failed to load user stats', { error: error.message });
        }
    }
    /**
     * Load recent activity (placeholder for future implementation)
     */
    async loadRecentActivity(user) {
        this.logger.debug('Loading recent activity', { uid: user.uid });
        try {
            // TODO: Implement actual data loading from Firestore
            this.logger.debug('Recent activity loaded (placeholder)');
        }
        catch (error) {
            this.logger.error('Failed to load recent activity', { error: error.message });
        }
    }
    /**
     * Show error message
     */
    showError(message) {
        this.logger.error('Showing error to user', { message });
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        // Auto-remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    /**
     * Cleanup when page is unloaded
     */
    cleanup() {
        this.logger.info('Cleaning up MainPageController');
        if (this.authStateUnsubscribe) {
            this.authStateUnsubscribe();
            this.authStateUnsubscribe = null;
            this.logger.debug('Auth state listener unsubscribed');
        }
    }
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const mainPage = new MainPageController();
    mainPage.initialize();
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        mainPage.cleanup();
    });
});
export default MainPageController;
//# sourceMappingURL=index.js.map