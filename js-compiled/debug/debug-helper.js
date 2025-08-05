import Logger from '../common/logger.js';
import MockData from './mock-data.js';
import MockAuth from './test-auth.js';
/**
 * DebugHelper provides utilities for debugging and testing the application
 */
class DebugHelper {
    /**
     * Initialize debug mode
     */
    static initialize() {
        this.logger.info('Initializing debug helper');
        // Enable debug mode in logger
        Logger.enableDebugMode();
        // Add debug controls to page if not already present
        this.addDebugControls();
        // Setup global debug functions
        this.setupGlobalDebugFunctions();
        this.logger.info('Debug helper initialized');
    }
    /**
     * Add debug controls to the page
     */
    static addDebugControls() {
        if (document.getElementById('debug-controls')) {
            this.logger.debug('Debug controls already exist');
            return;
        }
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-controls';
        debugPanel.innerHTML = `
            <div class="debug-panel">
                <div class="debug-header">
                    <h3>🛠️ Debug Controls</h3>
                    <button id="debug-toggle" class="debug-btn">Hide</button>
                </div>
                <div class="debug-content" id="debug-content">
                    <div class="debug-section">
                        <h4>Authentication</h4>
                        <button id="debug-auth-toggle" class="debug-btn">Toggle Auth State</button>
                        <button id="debug-auth-info" class="debug-btn">Show Auth Info</button>
                        <button id="debug-clear-storage" class="debug-btn">Clear Storage</button>
                    </div>
                    
                    <div class="debug-section">
                        <h4>Data</h4>
                        <button id="debug-show-mock-data" class="debug-btn">Show Mock Data</button>
                        <button id="debug-simulate-error" class="debug-btn">Simulate Error</button>
                        <button id="debug-performance-test" class="debug-btn">Performance Test</button>
                    </div>
                    
                    <div class="debug-section">
                        <h4>Logs</h4>
                        <button id="debug-export-logs" class="debug-btn">Export Logs</button>
                        <button id="debug-clear-console" class="debug-btn">Clear Console</button>
                    </div>
                    
                    <div class="debug-info" id="debug-info">
                        <h4>Debug Info</h4>
                        <pre id="debug-info-content">Click "Show Auth Info" to see current state</pre>
                    </div>
                </div>
            </div>
        `;
        // Add styles
        debugPanel.innerHTML += `
            <style>
                .debug-panel {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    border: 1px solid #333;
                    border-radius: 8px;
                    padding: 10px;
                    font-family: monospace;
                    font-size: 12px;
                    z-index: 10000;
                    max-width: 300px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                }
                .debug-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #333;
                    padding-bottom: 5px;
                }
                .debug-header h3 {
                    margin: 0;
                    font-size: 14px;
                }
                .debug-section {
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #333;
                }
                .debug-section:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                .debug-section h4 {
                    margin: 0 0 5px 0;
                    font-size: 12px;
                    color: #4CAF50;
                }
                .debug-btn {
                    background: #333;
                    color: white;
                    border: 1px solid #555;
                    border-radius: 4px;
                    padding: 4px 8px;
                    margin: 2px;
                    cursor: pointer;
                    font-size: 10px;
                    font-family: monospace;
                }
                .debug-btn:hover {
                    background: #555;
                }
                .debug-info {
                    max-height: 200px;
                    overflow-y: auto;
                }
                .debug-info pre {
                    margin: 0;
                    white-space: pre-wrap;
                    font-size: 10px;
                    background: #222;
                    padding: 5px;
                    border-radius: 4px;
                }
                .debug-content.hidden {
                    display: none;
                }
            </style>
        `;
        document.body.appendChild(debugPanel);
        // Setup event listeners
        this.setupDebugEventListeners();
        this.logger.debug('Debug controls added to page');
    }
    /**
     * Setup event listeners for debug controls
     */
    static setupDebugEventListeners() {
        // Toggle debug panel visibility
        const toggleBtn = document.getElementById('debug-toggle');
        const content = document.getElementById('debug-content');
        if (toggleBtn && content) {
            toggleBtn.addEventListener('click', () => {
                content.classList.toggle('hidden');
                toggleBtn.textContent = content.classList.contains('hidden') ? 'Show' : 'Hide';
            });
        }
        // Auth toggle
        const authToggleBtn = document.getElementById('debug-auth-toggle');
        if (authToggleBtn) {
            authToggleBtn.addEventListener('click', () => {
                this.toggleAuthState();
            });
        }
        // Show auth info
        const authInfoBtn = document.getElementById('debug-auth-info');
        if (authInfoBtn) {
            authInfoBtn.addEventListener('click', () => {
                this.showAuthInfo();
            });
        }
        // Clear storage
        const clearStorageBtn = document.getElementById('debug-clear-storage');
        if (clearStorageBtn) {
            clearStorageBtn.addEventListener('click', () => {
                this.clearStorage();
            });
        }
        // Show mock data
        const mockDataBtn = document.getElementById('debug-show-mock-data');
        if (mockDataBtn) {
            mockDataBtn.addEventListener('click', () => {
                this.showMockData();
            });
        }
        // Simulate error
        const errorBtn = document.getElementById('debug-simulate-error');
        if (errorBtn) {
            errorBtn.addEventListener('click', () => {
                this.simulateError();
            });
        }
        // Performance test
        const perfBtn = document.getElementById('debug-performance-test');
        if (perfBtn) {
            perfBtn.addEventListener('click', () => {
                this.performanceTest();
            });
        }
        // Export logs
        const exportBtn = document.getElementById('debug-export-logs');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportLogs();
            });
        }
        // Clear console
        const clearBtn = document.getElementById('debug-clear-console');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                console.clear();
                this.logger.info('Console cleared');
            });
        }
    }
    /**
     * Setup global debug functions
     */
    static setupGlobalDebugFunctions() {
        // Make debug functions available globally
        window.debug = {
            toggleAuth: () => this.toggleAuthState(),
            showAuthInfo: () => this.showAuthInfo(),
            showMockData: () => this.showMockData(),
            simulateError: () => this.simulateError(),
            exportLogs: () => this.exportLogs(),
            clearStorage: () => this.clearStorage(),
            performanceTest: () => this.performanceTest(),
            mockData: MockData,
            logger: this.logger
        };
        this.logger.debug('Global debug functions setup complete');
        console.log('🛠️ Debug functions available via window.debug');
    }
    /**
     * Toggle authentication state
     */
    static toggleAuthState() {
        this.logger.info('Debug: Toggling auth state');
        if (!this.mockAuth) {
            this.mockAuth = new MockAuth();
        }
        this.mockAuth.toggleAuthState();
        this.showAuthInfo();
    }
    /**
     * Show authentication info
     */
    static showAuthInfo() {
        const infoElement = document.getElementById('debug-info-content');
        if (!infoElement)
            return;
        const authInfo = {
            timestamp: new Date().toISOString(),
            mockAuth: this.mockAuth?.getDebugInfo() || 'Not initialized',
            localStorage: {
                debugMode: localStorage.getItem('debug-mode'),
                userPreferences: localStorage.getItem('user-preferences'),
                vocabularyCache: localStorage.getItem('vocabulary-cache')
            },
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            userAgent: navigator.userAgent.substring(0, 50) + '...'
        };
        infoElement.textContent = JSON.stringify(authInfo, null, 2);
        this.logger.debug('Auth info displayed');
    }
    /**
     * Show mock data
     */
    static showMockData() {
        const mockData = {
            user: MockData.getUser(),
            vocabulary: MockData.getVocabulary(),
            stats: MockData.getUserStats(),
            recentActivity: MockData.getRecentActivity()
        };
        console.group('🎭 Mock Data');
        console.log('User:', mockData.user);
        console.log('Vocabulary:', mockData.vocabulary);
        console.log('Stats:', mockData.stats);
        console.log('Recent Activity:', mockData.recentActivity);
        console.groupEnd();
        this.logger.info('Mock data displayed in console');
    }
    /**
     * Simulate error scenarios
     */
    static simulateError() {
        const errors = MockData.getErrorScenarios();
        const errorTypes = Object.keys(errors);
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        const error = errors[randomError];
        this.logger.error('Simulated error', { error, type: randomError });
        // Show error in UI if error display exists
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = `Simulated Error: ${error.message}`;
            errorElement.style.display = 'block';
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 3000);
        }
    }
    /**
     * Performance test with large dataset
     */
    static performanceTest() {
        this.logger.info('Starting performance test');
        const startTime = performance.now();
        const largeDataset = MockData.getLargeDataset(5000);
        const endTime = performance.now();
        const results = {
            datasetSize: largeDataset.length,
            generationTime: `${(endTime - startTime).toFixed(2)}ms`,
            memoryUsage: performance.memory ? {
                used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
                total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
            } : 'Not available'
        };
        console.group('⚡ Performance Test Results');
        console.log(results);
        console.groupEnd();
        this.logger.info('Performance test completed', results);
    }
    /**
     * Export logs (placeholder for future implementation)
     */
    static exportLogs() {
        this.logger.info('Exporting logs (placeholder)');
        const logs = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            localStorage: { ...localStorage },
            mockData: MockData.getUser(),
            note: 'This is a placeholder. Real log export would be implemented here.'
        };
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.logger.info('Debug logs exported');
    }
    /**
     * Clear all storage
     */
    static clearStorage() {
        this.logger.info('Clearing all storage');
        localStorage.clear();
        sessionStorage.clear();
        // Clear any app-specific caches
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        this.logger.info('Storage cleared');
        alert('All storage cleared. Page will reload.');
        window.location.reload();
    }
    /**
     * Get debug status
     */
    static getDebugStatus() {
        return {
            isEnabled: localStorage.getItem('debug-mode') === 'true',
            controlsVisible: !!document.getElementById('debug-controls'),
            mockAuthInitialized: !!this.mockAuth
        };
    }
}
DebugHelper.logger = new Logger('DebugHelper');
DebugHelper.mockAuth = null;
export default DebugHelper;
//# sourceMappingURL=debug-helper.js.map