import Logger from './logger.js';
/**
 * HTTP Client for making requests to external APIs
 * Using native fetch API with improved error handling and features
 */
class HttpClient {
    constructor(config = {}) {
        this.logger = new Logger('HttpClient');
        // Default configuration
        this.defaultConfig = {
            timeout: config.timeout || 30000, // 30 seconds timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
                // Remove problematic headers that cause CORS issues
                // 'Accept-Encoding': 'gzip, deflate, br',
                // 'Connection': 'keep-alive',
                // 'Upgrade-Insecure-Requests': '1',
                // 'Cache-Control': 'no-cache',
                // 'Pragma': 'no-cache',
                ...config.headers
            },
            withCredentials: config.withCredentials || false,
            ...config
        };
        this.logger.info('HttpClient initialized with fetch API');
    }
    /**
     * Make HTTP request with timeout and error handling
     */
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.defaultConfig.timeout);
        // If options.headers is provided, use only those headers (don't merge with defaults)
        const useOnlyProvidedHeaders = options.headers !== undefined;
        const config = {
            ...options,
            headers: useOnlyProvidedHeaders ? options.headers : {
                ...this.defaultConfig.headers,
                ...options.headers
            },
            mode: 'cors', // Explicitly set CORS mode
            credentials: this.defaultConfig.withCredentials ? 'include' : 'omit',
            signal: controller.signal
        };
        try {
            this.logger.info('Making HTTP request', {
                method: config.method || 'GET',
                url,
                mode: config.mode,
                headers: config.headers,
                useOnlyProvidedHeaders
            });
            const response = await fetch(url, config);
            clearTimeout(timeoutId);
            this.logger.info('HTTP response received', {
                status: response.status,
                url,
                contentType: response.headers.get('content-type')
            });
            // Parse response data based on content type
            let data;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json();
            }
            else {
                data = await response.text();
            }
            const httpResponse = {
                data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                config: { ...config, url }
            };
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return httpResponse;
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                this.logger.error('Request timeout', { url, timeout: this.defaultConfig.timeout });
                throw new Error(`Request timeout after ${this.defaultConfig.timeout}ms`);
            }
            this.logger.error('HTTP request failed', {
                url,
                message: error.message,
                name: error.name,
                isCORSError: this.isCORSError(error)
            });
            throw error;
        }
    }
    /**
     * Make a GET request
     */
    async get(url, config) {
        return this.request(url, { ...config, method: 'GET' });
    }
    /**
     * Make a POST request
     */
    async post(url, data, config) {
        const body = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined;
        const headers = data && typeof data !== 'string' ? { 'Content-Type': 'application/json' } : {};
        return this.request(url, {
            ...config,
            method: 'POST',
            body,
            headers: { ...headers, ...(config?.headers || {}) }
        });
    }
    /**
     * Make a PUT request
     */
    async put(url, data, config) {
        const body = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined;
        const headers = data && typeof data !== 'string' ? { 'Content-Type': 'application/json' } : {};
        return this.request(url, {
            ...config,
            method: 'PUT',
            body,
            headers: { ...headers, ...(config?.headers || {}) }
        });
    }
    /**
     * Make a DELETE request
     */
    async delete(url, config) {
        return this.request(url, { ...config, method: 'DELETE' });
    }
    /**
     * Get HTML content from URL (for scraping)
     */
    async getHtml(url) {
        try {
            const response = await this.get(url, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('Failed to fetch HTML', { url, error: error.message });
            throw new Error(`Failed to fetch HTML from ${url}: ${error.message}`);
        }
    }
    /**
     * Get HTML content with CORS proxy fallback
     */
    async getHtmlWithProxy(url) {
        // Try direct access first
        try {
            this.logger.info('Trying direct access first', { url });
            return await this.getHtml(url);
        }
        catch (error) {
            this.logger.error('Direct access failed', {
                url,
                error: error.message,
                errorName: error.name,
                isCORSError: this.isCORSError(error)
            });
            if (this.isCORSError(error)) {
                this.logger.warn('Direct access blocked by CORS, trying proxy', { url });
                // Updated proxy list with more reliable services
                const proxies = [
                    {
                        url: 'https://api.allorigins.win/get?url=',
                        jsonResponse: true // This proxy returns JSON with content field
                    },
                    {
                        url: 'https://thingproxy.freeboard.io/fetch/',
                        jsonResponse: false // Direct HTML response
                    },
                    {
                        url: 'https://proxy.cors.sh/',
                        jsonResponse: false // Direct HTML response
                    }
                ];
                for (const proxy of proxies) {
                    try {
                        const proxyUrl = proxy.url + encodeURIComponent(url);
                        this.logger.info('Trying CORS proxy', { proxy: proxy.url, proxyUrl });
                        // Use only safe headers to avoid CORS issues
                        const response = await this.request(proxyUrl, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json, text/html, */*'
                                // Explicitly exclude problematic headers
                            }
                        });
                        let htmlContent;
                        if (proxy.jsonResponse) {
                            // allorigins.win returns { contents: "...", status: {...} }
                            htmlContent = response.data.contents || response.data;
                        }
                        else {
                            htmlContent = response.data;
                        }
                        this.logger.info('CORS proxy success', { proxy: proxy.url });
                        return htmlContent;
                    }
                    catch (proxyError) {
                        this.logger.warn('CORS proxy failed', { proxy: proxy.url, error: proxyError.message });
                        continue;
                    }
                }
                throw new Error(`All CORS proxies failed for ${url}`);
            }
            else {
                this.logger.error('Non-CORS error, not trying proxy', { url, error: error.message });
                throw error;
            }
        }
    }
    /**
     * Check if error is a CORS error
     */
    isCORSError(error) {
        // Check for various CORS error patterns
        const message = error.message || '';
        const name = error.name || '';
        return message.includes('CORS') ||
            message.includes('cors') ||
            message.includes('Network Error') ||
            message.includes('Failed to fetch') ||
            message.includes('TypeError: NetworkError') ||
            message.includes('Access to fetch') ||
            message.includes('blocked by CORS policy') ||
            message.includes('preflight request') ||
            message.includes('Access-Control-Allow-Origin') ||
            (name === 'TypeError' && message.includes('fetch')) ||
            error.code === 'ERR_NETWORK';
    }
    /**
     * Check if URL is accessible (for CORS testing)
     */
    async testCORS(url) {
        try {
            await this.get(url, {
                headers: { 'Accept': 'text/html' }
            });
            return true;
        }
        catch (error) {
            if (this.isCORSError(error)) {
                this.logger.warn('CORS blocked for URL', { url });
                return false;
            }
            // Other errors might still mean the URL is accessible but returned error
            return true;
        }
    }
    /**
     * Update default headers
     */
    setHeaders(headers) {
        Object.assign(this.defaultConfig.headers, headers);
    }
    /**
     * Set timeout for requests
     */
    setTimeout(timeout) {
        this.defaultConfig.timeout = timeout;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.defaultConfig };
    }
}
export default HttpClient;
//# sourceMappingURL=http-client.js.map