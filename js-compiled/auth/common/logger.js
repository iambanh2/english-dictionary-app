/**
 * Logger class for debugging and monitoring application flow
 * Supports multiple log levels: debug, info, warn, error
 */
class Logger {
    constructor(className) {
        this.className = className;
        this.isDebugMode = this.getDebugMode();
    }
    /**
     * Check if debug mode is enabled
     */
    getDebugMode() {
        // Check for debug flag in localStorage or URL parameters
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const debugParam = urlParams.get('debug');
            const debugStorage = localStorage.getItem('debug-mode');
            if (debugParam === 'true' || debugStorage === 'true') {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    /**
     * Format log message with timestamp and class name
     */
    formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.className}] ${message}`;
        if (data) {
            return `${baseMessage} | Data: ${JSON.stringify(data)}`;
        }
        else {
            return baseMessage;
        }
    }
    /**
     * Debug level logging - only shown in debug mode
     */
    debug(message, data) {
        if (this.isDebugMode) {
            const formattedMessage = this.formatMessage('debug', message, data);
            console.log(`%c${formattedMessage}`, 'color: #6c757d; font-style: italic;');
        }
        else {
            // Always log in console for development
            console.log(this.formatMessage('debug', message, data));
        }
    }
    /**
     * Info level logging
     */
    info(message, data) {
        const formattedMessage = this.formatMessage('info', message, data);
        if (this.isDebugMode) {
            console.info(`%c${formattedMessage}`, 'color: #0dcaf0;');
        }
        else {
            console.info(formattedMessage);
        }
    }
    /**
     * Warning level logging
     */
    warn(message, data) {
        const formattedMessage = this.formatMessage('warn', message, data);
        if (this.isDebugMode) {
            console.warn(`%c${formattedMessage}`, 'color: #ffc107; font-weight: bold;');
        }
        else {
            console.warn(formattedMessage);
        }
    }
    /**
     * Error level logging
     */
    error(message, data) {
        const formattedMessage = this.formatMessage('error', message, data);
        if (this.isDebugMode) {
            console.error(`%c${formattedMessage}`, 'color: #dc3545; font-weight: bold;');
        }
        else {
            console.error(formattedMessage);
        }
        // Optionally send to error tracking service in production
        this.sendToErrorTracking(message, data);
    }
    /**
     * Send error to tracking service (placeholder for future implementation)
     */
    sendToErrorTracking(message, data) {
        // TODO: Implement error tracking service integration
        // Example: Sentry, LogRocket, etc.
        if (!this.isDebugMode) {
            // Only send to tracking in production
            console.log('Error sent to tracking service:', { message, data });
        }
    }
    /**
     * Enable debug mode
     */
    static enableDebugMode() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('debug-mode', 'true');
            console.log('Debug mode enabled');
        }
    }
    /**
     * Disable debug mode
     */
    static disableDebugMode() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('debug-mode');
            console.log('Debug mode disabled');
        }
    }
}
export default Logger;
