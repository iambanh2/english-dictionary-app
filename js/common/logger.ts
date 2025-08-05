/**
 * Logger class for debugging and monitoring application flow
 * Supports multiple log levels: debug, info, warn, error
 */
class Logger {
    private className: string;
    private isDebugMode: boolean;

    constructor(className: string) {
        this.className = className;
        this.isDebugMode = this.getDebugMode();
    }

    /**
     * Check if debug mode is enabled
     */
    private getDebugMode(): boolean {
        // Check for debug flag in localStorage or URL parameters
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const debugParam = urlParams.get('debug');
            const debugStorage = localStorage.getItem('debug-mode');
            
            if (debugParam === 'true' || debugStorage === 'true') {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * Get caller information (file, line, function) from stack trace
     */
    private getCallerInfo(): string {
        try {
            const stack = new Error().stack;
            if (!stack) return '';
            
            const lines = stack.split('\n');
            // Skip the first 4 lines: Error, getCallerInfo, formatMessage, and the logging method
            const callerLine = lines[4];
            
            if (callerLine) {
                // Extract file path, line number, and function name
                const match = callerLine.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/);
                if (match) {
                    const [, functionName, filePath, lineNumber] = match;
                    const fileName = filePath.split('/').pop() || filePath;
                    return `${fileName}:${lineNumber} ${functionName}()`;
                }
                
                // Alternative format for anonymous functions
                const altMatch = callerLine.match(/at\s+(.+):(\d+):(\d+)/);
                if (altMatch) {
                    const [, filePath, lineNumber] = altMatch;
                    const fileName = filePath.split('/').pop() || filePath;
                    return `${fileName}:${lineNumber}`;
                }
            }
        } catch (error) {
            // Fallback if stack trace parsing fails
        }
        return '';
    }

    /**
     * Format log message with timestamp, caller info, and class name
     */
    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const callerInfo = this.getCallerInfo();
        const location = callerInfo ? ` @ ${callerInfo}` : '';
        const baseMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.className}] ${message}${location}`;
        
        if (data) {
            return `${baseMessage} | Data: ${JSON.stringify(data)}`;
        } else {
            return baseMessage;
        }
    }

    /**
     * Debug level logging - only shown in debug mode
     */
    debug(message: string, data?: any): void {
        if (this.isDebugMode) {
            const formattedMessage = this.formatMessage('debug', message, data);
            console.log(`%c${formattedMessage}`, 'color: #6c757d; font-style: italic;');
        } else {
            // Always log in console for development
            console.log(this.formatMessage('debug', message, data));
        }
    }

    /**
     * Info level logging
     */
    info(message: string, data?: any): void {
        const formattedMessage = this.formatMessage('info', message, data);
        if (this.isDebugMode) {
            console.info(`%c${formattedMessage}`, 'color: #0dcaf0;');
        } else {
            console.info(formattedMessage);
        }
    }

    /**
     * Warning level logging
     */
    warn(message: string, data?: any): void {
        const formattedMessage = this.formatMessage('warn', message, data);
        if (this.isDebugMode) {
            console.warn(`%c${formattedMessage}`, 'color: #ffc107; font-weight: bold;');
        } else {
            console.warn(formattedMessage);
        }
    }

    /**
     * Error level logging
     */
    error(message: string, data?: any): void {
        const formattedMessage = this.formatMessage('error', message, data);
        if (this.isDebugMode) {
            console.error(`%c${formattedMessage}`, 'color: #dc3545; font-weight: bold;');
        } else {
            console.error(formattedMessage);
        }
        
        // Optionally send to error tracking service in production
        this.sendToErrorTracking(message, data);
    }

    /**
     * Send error to tracking service (placeholder for future implementation)
     */
    private sendToErrorTracking(message: string, data?: any): void {
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
    static enableDebugMode(): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('debug-mode', 'true');
            console.log('Debug mode enabled');
        }
    }

    /**
     * Disable debug mode
     */
    static disableDebugMode(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('debug-mode');
            console.log('Debug mode disabled');
        }
    }
}

export default Logger;
