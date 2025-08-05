// Debug Main Script - Compiled from TypeScript
// This handles the debug environment functionality

class DebugMainController {
    constructor() {
        this.logger = new Logger('DebugMainController');
        this.mockAuth = new MockAuth();
        this.currentState = 'anonymous';
        this.logger.info('Debug environment initialized');
        
        this.initialize();
    }

    initialize() {
        this.logger.debug('Setting up debug environment');
        
        // Setup debug controls
        this.setupDebugControls();
        
        // Setup console output
        this.setupConsoleOutput();
        
        // Initial render
        this.renderState(this.currentState);
        
        this.logger.info('Debug environment setup complete');
    }

    setupDebugControls() {
        // State buttons
        document.getElementById('debug-btn-anonymous')?.addEventListener('click', () => {
            this.changeState('anonymous');
        });
        
        document.getElementById('debug-btn-authenticated')?.addEventListener('click', () => {
            this.changeState('authenticated');
        });
        
        document.getElementById('debug-btn-error')?.addEventListener('click', () => {
            this.changeState('error');
        });
        
        document.getElementById('debug-btn-loading')?.addEventListener('click', () => {
            this.changeState('loading');
        });

        // Control buttons
        document.getElementById('toggle-auth')?.addEventListener('click', () => {
            this.toggleAuth();
        });
        
        document.getElementById('show-user-info')?.addEventListener('click', () => {
            this.showUserInfo();
        });
        
        document.getElementById('clear-auth')?.addEventListener('click', () => {
            this.clearAuth();
        });
        
        document.getElementById('load-mock-vocab')?.addEventListener('click', () => {
            this.loadMockVocabulary();
        });
        
        document.getElementById('simulate-search')?.addEventListener('click', () => {
            this.simulateSearch();
        });
        
        document.getElementById('add-random-word')?.addEventListener('click', () => {
            this.addRandomWord();
        });
        
        document.getElementById('network-error')?.addEventListener('click', () => {
            this.simulateNetworkError();
        });
        
        document.getElementById('auth-error')?.addEventListener('click', () => {
            this.simulateAuthError();
        });
        
        document.getElementById('permission-error')?.addEventListener('click', () => {
            this.simulatePermissionError();
        });
        
        document.getElementById('performance-test')?.addEventListener('click', () => {
            this.runPerformanceTest();
        });
        
        document.getElementById('memory-usage')?.addEventListener('click', () => {
            this.showMemoryUsage();
        });
        
        document.getElementById('large-dataset')?.addEventListener('click', () => {
            this.testLargeDataset();
        });
        
        document.getElementById('export-state')?.addEventListener('click', () => {
            this.exportState();
        });
        
        document.getElementById('clear-storage')?.addEventListener('click', () => {
            this.clearStorage();
        });
        
        document.getElementById('reload-page')?.addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('clear-console')?.addEventListener('click', () => {
            this.clearConsoleOutput();
        });
        
        document.getElementById('export-logs')?.addEventListener('click', () => {
            this.exportLogs();
        });
    }

    setupConsoleOutput() {
        // Override console methods to capture output
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;
        
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.addConsoleMessage('info', args.join(' '));
        };
        
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.addConsoleMessage('warn', args.join(' '));
        };
        
        console.error = (...args) => {
            originalError.apply(console, args);
            this.addConsoleMessage('error', args.join(' '));
        };
        
        console.info = (...args) => {
            originalInfo.apply(console, args);
            this.addConsoleMessage('info', args.join(' '));
        };
    }

    addConsoleMessage(level, message) {
        const consoleOutput = document.getElementById('console-output');
        if (!consoleOutput) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `console-message ${level}`;
        messageDiv.innerHTML = `
            <span class="timestamp">[${new Date().toISOString()}]</span>
            <span class="level">[${level.toUpperCase()}]</span>
            <span class="message">${message}</span>
        `;
        
        consoleOutput.appendChild(messageDiv);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        // Keep only last 100 messages
        const messages = consoleOutput.querySelectorAll('.console-message');
        if (messages.length > 100) {
            messages[0].remove();
        }
    }

    clearConsoleOutput() {
        const consoleOutput = document.getElementById('console-output');
        if (consoleOutput) {
            consoleOutput.innerHTML = `
                <div class="console-message info">
                    <span class="timestamp">[${new Date().toISOString()}]</span>
                    <span class="level">[INFO]</span>
                    <span class="message">Console cleared</span>
                </div>
            `;
        }
    }

    changeState(newState) {
        this.logger.info(`Changing state to: ${newState}`);
        this.currentState = newState;
        
        // Update active button
        document.querySelectorAll('.debug-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`debug-btn-${newState}`)?.classList.add('active');
        
        this.renderState(newState);
        this.updateDebugInfo();
    }

    renderState(state) {
        const authSection = document.getElementById('preview-auth-section');
        const mainContent = document.getElementById('preview-main-content');
        
        if (!authSection || !mainContent) return;
        
        switch (state) {
            case 'anonymous':
                this.renderAnonymousState(authSection, mainContent);
                break;
            case 'authenticated':
                this.renderAuthenticatedState(authSection, mainContent);
                break;
            case 'error':
                this.renderErrorState(authSection, mainContent);
                break;
            case 'loading':
                this.renderLoadingState(authSection, mainContent);
                break;
        }
    }

    renderAnonymousState(authSection, mainContent) {
        authSection.innerHTML = `
            <div class="auth-buttons">
                <button class="btn btn-secondary">Đăng nhập</button>
                <button class="btn btn-primary">Đăng ký</button>
            </div>
        `;
        
        mainContent.innerHTML = `
            <div class="welcome-section">
                <h1>Welcome to English Dictionary</h1>
                <p class="subtitle">Sign in to start building your vocabulary</p>
                <button class="btn btn-primary btn-large">Get Started</button>
            </div>
        `;
    }

    renderAuthenticatedState(authSection, mainContent) {
        const mockUser = MockData.getUser();
        
        authSection.innerHTML = `
            <div class="user-profile">
                <img src="${mockUser.photoURL}" alt="Avatar" class="user-avatar">
                <span class="user-name">${mockUser.displayName}</span>
                <button class="dropdown-toggle">▼</button>
            </div>
        `;
        
        const stats = MockData.getUserStats();
        mainContent.innerHTML = `
            <div class="dashboard">
                <h1>Welcome back, ${mockUser.displayName}!</h1>
                <div class="quick-stats">
                    <div class="stat-item">
                        <span class="stat-number">${stats.totalWords}</span>
                        <span class="stat-label">Total Words</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.learnedWords}</span>
                        <span class="stat-label">Learned</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number">${stats.favoriteWords}</span>
                        <span class="stat-label">Favorites</span>
                    </div>
                </div>
                <div class="quick-actions">
                    <button class="btn btn-primary">📝 Add New Word</button>
                    <button class="btn btn-secondary">📚 My Vocabulary</button>
                </div>
            </div>
        `;
    }

    renderErrorState(authSection, mainContent) {
        authSection.innerHTML = `
            <div class="error-state">
                <span class="error-icon">⚠️</span>
                <span>Auth Error</span>
            </div>
        `;
        
        mainContent.innerHTML = `
            <div class="error-content">
                <div class="error-icon">🚫</div>
                <h2>Something went wrong</h2>
                <p>Unable to load the application. Please try again.</p>
                <button class="btn btn-primary">Retry</button>
            </div>
        `;
    }

    renderLoadingState(authSection, mainContent) {
        authSection.innerHTML = `
            <div class="loading-spinner small"></div>
        `;
        
        mainContent.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>Loading your dictionary...</p>
            </div>
        `;
    }

    toggleAuth() {
        this.mockAuth.toggleAuthState();
        this.updateDebugInfo();
        this.logger.info('Authentication state toggled');
    }

    showUserInfo() {
        const debugInfo = this.mockAuth.getDebugInfo();
        this.displayDebugInfo(debugInfo);
    }

    clearAuth() {
        this.mockAuth.reset();
        this.updateDebugInfo();
        this.logger.info('Authentication cleared');
    }

    loadMockVocabulary() {
        const vocabulary = MockData.getVocabulary();
        this.displayDebugInfo({ vocabulary });
        this.logger.info('Mock vocabulary loaded', { count: vocabulary.length });
    }

    simulateSearch() {
        const query = 'hello';
        const results = MockData.getSearchResults(query);
        this.displayDebugInfo({ searchQuery: query, results });
        this.logger.info('Search simulated', { query, resultCount: results.length });
    }

    addRandomWord() {
        const randomWord = MockData.generateRandomWord();
        this.displayDebugInfo({ randomWord });
        this.logger.info('Random word generated', { word: randomWord.word });
    }

    simulateNetworkError() {
        const error = MockData.getErrorScenarios().networkError;
        this.logger.error('Simulated network error', error);
        this.displayDebugInfo({ error });
    }

    simulateAuthError() {
        const error = MockData.getErrorScenarios().authError;
        this.logger.error('Simulated auth error', error);
        this.displayDebugInfo({ error });
    }

    simulatePermissionError() {
        const error = MockData.getErrorScenarios().permissionError;
        this.logger.error('Simulated permission error', error);
        this.displayDebugInfo({ error });
    }

    async runPerformanceTest() {
        this.logger.info('Starting performance test');
        const startTime = performance.now();
        
        const largeDataset = MockData.getLargeDataset(1000);
        await MockData.simulateDelay(100);
        
        const endTime = performance.now();
        const results = {
            datasetSize: largeDataset.length,
            executionTime: `${(endTime - startTime).toFixed(2)}ms`,
            timestamp: new Date().toISOString()
        };
        
        this.displayDebugInfo({ performanceTest: results });
        this.logger.info('Performance test completed', results);
    }

    showMemoryUsage() {
        if (performance.memory) {
            const memory = {
                used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
            };
            this.displayDebugInfo({ memoryUsage: memory });
            this.logger.info('Memory usage displayed', memory);
        } else {
            this.displayDebugInfo({ memoryUsage: 'Not available in this browser' });
        }
    }

    testLargeDataset() {
        const largeDataset = MockData.getLargeDataset(5000);
        const stats = {
            size: largeDataset.length,
            sampleData: largeDataset.slice(0, 3),
            memoryEstimate: `~${(JSON.stringify(largeDataset).length / 1024).toFixed(2)}KB`
        };
        this.displayDebugInfo({ largeDatasetTest: stats });
        this.logger.info('Large dataset test completed', { size: stats.size });
    }

    exportState() {
        const state = {
            currentState: this.currentState,
            authState: this.mockAuth.getDebugInfo(),
            mockData: {
                user: MockData.getUser(),
                stats: MockData.getUserStats()
            },
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-state-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.logger.info('Debug state exported');
    }

    clearStorage() {
        localStorage.clear();
        sessionStorage.clear();
        this.logger.info('Storage cleared');
        alert('Storage cleared. Page will reload.');
        window.location.reload();
    }

    exportLogs() {
        const consoleOutput = document.getElementById('console-output');
        const logs = Array.from(consoleOutput.querySelectorAll('.console-message')).map(msg => {
            const timestamp = msg.querySelector('.timestamp').textContent;
            const level = msg.querySelector('.level').textContent;
            const message = msg.querySelector('.message').textContent;
            return { timestamp, level, message };
        });
        
        const exportData = {
            logs,
            exportTime: new Date().toISOString(),
            debugState: this.currentState
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.logger.info('Logs exported');
    }

    displayDebugInfo(info) {
        const debugInfoContent = document.getElementById('debug-info-content');
        if (debugInfoContent) {
            debugInfoContent.textContent = JSON.stringify(info, null, 2);
        }
    }

    updateDebugInfo() {
        const debugInfo = {
            currentState: this.currentState,
            authState: this.mockAuth.getDebugInfo(),
            timestamp: new Date().toISOString(),
            localStorage: Object.keys(localStorage).reduce((acc, key) => {
                acc[key] = localStorage.getItem(key);
                return acc;
            }, {})
        };
        this.displayDebugInfo(debugInfo);
    }
}

// Simple Logger class for debug environment
class Logger {
    constructor(className) {
        this.className = className;
    }

    debug(message, data) {
        console.log(`[DEBUG] [${this.className}] ${message}`, data || '');
    }

    info(message, data) {
        console.info(`[INFO] [${this.className}] ${message}`, data || '');
    }

    warn(message, data) {
        console.warn(`[WARN] [${this.className}] ${message}`, data || '');
    }

    error(message, data) {
        console.error(`[ERROR] [${this.className}] ${message}`, data || '');
    }
}

// Simple MockAuth class for debug environment
class MockAuth {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
    }

    toggleAuthState() {
        if (this.isAuthenticated) {
            this.signOut();
        } else {
            this.signIn();
        }
    }

    signIn() {
        this.isAuthenticated = true;
        this.currentUser = MockData.getUser();
    }

    signOut() {
        this.isAuthenticated = false;
        this.currentUser = null;
    }

    getDebugInfo() {
        return {
            isAuthenticated: this.isAuthenticated,
            currentUser: this.currentUser,
            mockMode: true
        };
    }

    reset() {
        this.isAuthenticated = false;
        this.currentUser = null;
    }
}

// Simple MockData class for debug environment
class MockData {
    static getUser() {
        return {
            uid: 'mock-user-123',
            displayName: 'Test User',
            email: 'test@example.com',
            photoURL: 'https://via.placeholder.com/40/007bff/white?text=TU'
        };
    }

    static getVocabulary() {
        return [
            { word: 'hello', meaning: 'xin chào', level: 'beginner', favorite: true },
            { word: 'goodbye', meaning: 'tạm biệt', level: 'beginner', favorite: false },
            { word: 'beautiful', meaning: 'đẹp', level: 'intermediate', favorite: true },
            { word: 'challenge', meaning: 'thử thách', level: 'advanced', favorite: false },
            { word: 'dictionary', meaning: 'từ điển', level: 'intermediate', favorite: true }
        ];
    }

    static getUserStats() {
        const vocabulary = this.getVocabulary();
        return {
            totalWords: vocabulary.length,
            learnedWords: vocabulary.filter(w => w.level !== 'beginner').length,
            favoriteWords: vocabulary.filter(w => w.favorite).length
        };
    }

    static getSearchResults(query) {
        const vocabulary = this.getVocabulary();
        return vocabulary.filter(word => 
            word.word.toLowerCase().includes(query.toLowerCase()) ||
            word.meaning.toLowerCase().includes(query.toLowerCase())
        );
    }

    static generateRandomWord() {
        const words = ['example', 'fantastic', 'sophisticated', 'progress', 'magnificent'];
        const meanings = ['ví dụ', 'tuyệt vời', 'tinh vi', 'tiến bộ', 'tráng lệ'];
        const levels = ['beginner', 'intermediate', 'advanced'];
        
        const index = Math.floor(Math.random() * words.length);
        return {
            word: words[index],
            meaning: meanings[index],
            level: levels[Math.floor(Math.random() * levels.length)],
            favorite: Math.random() > 0.5
        };
    }

    static getErrorScenarios() {
        return {
            networkError: { message: 'Network connection failed', code: 'NETWORK_ERROR' },
            authError: { message: 'Authentication failed', code: 'AUTH_ERROR' },
            permissionError: { message: 'Permission denied', code: 'PERMISSION_DENIED' }
        };
    }

    static getLargeDataset(size) {
        const baseWords = this.getVocabulary();
        const dataset = [];
        for (let i = 0; i < size; i++) {
            const base = baseWords[i % baseWords.length];
            dataset.push({
                ...base,
                word: `${base.word}-${i}`,
                id: `word-${i}`
            });
        }
        return dataset;
    }

    static async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DebugMainController();
});
