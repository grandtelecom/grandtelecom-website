/**
 * API Client for handling all backend communications
 * @class ApiClient
 */
class ApiClient {
    constructor(baseUrl = 'http://localhost:3001') {
        // Ensure base URL ends with /api
        if (!baseUrl.endsWith('/api')) {
            baseUrl = baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
        }
        
        // Development üçün CORS credentials
        this.credentials = 'include'; // cookies ilə işləmək üçün
        // Store the original base URL
        this.originalBaseUrl = baseUrl;
        
        // Clean up the base URL (remove trailing slashes)
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        
        // Derive a safe list of fallback base URLs that always include /api
        const candidates = [];
        const push = (u) => { if (typeof u === 'string' && u) candidates.push(u.replace(/\/+$/, '')); };
        
        // Primary configured base
        push(this.baseUrl);
        
        // Add same-origin if available
        try {
            if (typeof window !== 'undefined' && window.location && window.location.origin) {
                push(window.location.origin.replace(/\/+$/, '') + '/api');
            }
        } catch (_) {}
        
        // Common localhost variants — yalnız local development üçün
        const isLocal = typeof window !== 'undefined' &&
            ['localhost','127.0.0.1','0.0.0.0','::1'].includes(window.location.hostname);
        if (isLocal) {
            push('http://localhost:3001/api');
            push('http://127.0.0.1:3001/api');
            push('http://localhost:3002/api');
            push('http://127.0.0.1:3002/api');
            push('http://localhost:3000/api');
        }
        
        // Keep only unique values and only those ending with /api
        this.fallbackUrls = Array.from(new Set(candidates)).filter(u => /\/api$/.test(u));
        
        // Current URL index being used
        this.currentUrlIndex = 0;
    }

    /**
     * Get authentication token from storage
     * @returns {string} The authentication token or empty string if not found
     */
    getAuthToken() {
        try {
            // Prefer centralized auth if available
            const central = (typeof window !== 'undefined' && window.auth && typeof window.auth.getToken === 'function') ? window.auth.getToken() : '';
            if (central) return central;
            // Support both snake_case and camelCase keys for compatibility
            return (
                localStorage.getItem('auth_token') ||
                localStorage.getItem('authToken') ||
                sessionStorage.getItem('auth_token') ||
                sessionStorage.getItem('authToken') ||
                ''
            );
        } catch (error) {
            console.error('Error accessing storage:', error);
            return '';
        }
    }
    
    /**
     * Safely parse a response that may already be JSON or a Response object
     * @param {any} res
     * @returns {Promise<any>} Parsed JSON or original object
     */
    async parseResponse(res) {
        if (!res) return res;
        // If it's a Fetch Response, it should have a json() function
        if (typeof res.json === 'function') {
            try {
                return await res.json();
            } catch (_) {
                return {};
            }
        }
        // Already parsed object
        return res;
    }

    /**
     * Build request headers with authentication
     * @param {Object} [customHeaders] - Additional headers to include
     * @returns {Object} Headers object with authentication
     */
    buildHeaders(customHeaders = {}) {
        // Default headers
        const headers = new Headers();
        
        // Add default headers
        headers.append('Accept', 'application/json');
        headers.append('Content-Type', 'application/json');
        headers.append('X-Requested-With', 'XMLHttpRequest');
        
        // Add auth token if exists
        const token = this.getAuthToken();
        if (token) {
            headers.append('Authorization', `Bearer ${token}`);
        }
        
        // Add custom headers, overriding any defaults if needed
        Object.entries(customHeaders).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                headers.set(key, value);
            }
        });
        
        return headers;
    }

    /**
     * Execute a fetch request with timeout and retry logic
     * @param {Object} options - Fetch options
     * @param {number} retries - Number of retry attempts
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithRetry(url, options = {}, retries = 2) {
        // Don't retry if we're out of retries
        if (retries < 0) {
            throw new Error('Maximum retry attempts reached');
        }
        
        const controller = new AbortController();
        // Determine timeout from config with safe fallbacks
        let timeoutMs = 10000;
        try {
            if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API && typeof window.CONFIG.API.TIMEOUT_MS === 'number') {
                timeoutMs = window.CONFIG.API.TIMEOUT_MS;
            } else if (typeof CONFIG !== 'undefined' && CONFIG.API && typeof CONFIG.API.TIMEOUT_MS === 'number') {
                timeoutMs = CONFIG.API.TIMEOUT_MS;
            }
        } catch (_) { /* ignore */ }
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            // Create a new options object to avoid modifying the original
            const fetchOptions = { ...options };
            
            // Ensure we have a signal
            if (!fetchOptions.signal) {
                fetchOptions.signal = controller.signal;
            }
            
            // Ensure we have credentials and mode set
            fetchOptions.credentials = 'include'; // httpOnly cookie göndərmək üçün
            fetchOptions.mode = 'cors';
            
            // Make sure headers is a Headers object
            if (!(fetchOptions.headers instanceof Headers)) {
                fetchOptions.headers = new Headers(fetchOptions.headers || {});
            }
            
            // Add auth token if not already present
            const token = this.getAuthToken();
            if (token && !fetchOptions.headers.has('Authorization')) {
                fetchOptions.headers.set('Authorization', `Bearer ${token}`);
            }
            
            // Ensure we have the right content type for JSON
            if ((fetchOptions.method === 'POST' || fetchOptions.method === 'PUT' || fetchOptions.method === 'PATCH') &&
                !fetchOptions.headers.has('Content-Type') &&
                (typeof fetchOptions.body === 'object' || typeof fetchOptions.body === 'string')) {
                fetchOptions.headers.set('Content-Type', 'application/json');
                
                // Stringify body if it's an object and not already a string
                if (fetchOptions.body && typeof fetchOptions.body === 'object' && 
                    !(fetchOptions.body instanceof FormData) && 
                    !(fetchOptions.body instanceof URLSearchParams) &&
                    !(fetchOptions.body instanceof Blob) &&
                    !(fetchOptions.body instanceof ArrayBuffer)) {
                    fetchOptions.body = JSON.stringify(fetchOptions.body);
                }
            }
            
            // Make the request
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeout);
            
            // If unauthorized, try to refresh token
            if (response.status === 401 && retries > 0) {
                console.log('Received 401, attempting to refresh token...');
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    console.log('Token refreshed, retrying request...');
                    // Update headers with new token and retry
                    const newToken = this.getAuthToken();
                    if (newToken) {
                        const newHeaders = new Headers(fetchOptions.headers);
                        newHeaders.set('Authorization', `Bearer ${newToken}`);
                        return this.fetchWithRetry(url, {
                            ...fetchOptions,
                            headers: newHeaders
                        }, retries - 1);
                    }
                }
                
                // If we couldn't refresh the token, clear it and throw
                console.warn('Token refresh failed, clearing auth data');
                localStorage.removeItem('auth_token');
                sessionStorage.removeItem('auth_token');
                throw new Error('Session expired. Please log in again.');
            }
            
            // If we get a 429 Too Many Requests, wait and retry
            if (response.status === 429 && retries > 0) {
                const retryAfter = response.headers.get('Retry-After') || '5';
                const delay = parseInt(retryAfter, 10) * 1000 || 5000;
                
                console.warn(`Rate limited, retrying after ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, fetchOptions, retries - 1);
            }
            
            // If we get a 5xx error, retry
            if (response.status >= 500 && response.status < 600 && retries > 0) {
                console.warn(`Server error (${response.status}), retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.fetchWithRetry(url, fetchOptions, retries - 1);
            }
            
            return response;
            
        } catch (error) {
            clearTimeout(timeout);
            
            // If network error or timeout, try next URL
            if ((error.name === 'AbortError' || error.name === 'TypeError') && retries > 0) {
                console.warn(`Network error (${error.name}), trying next URL...`);
                return this.tryNextUrl(url, options, retries);
            }
            
            // If we have retries left, try again after a delay
            if (retries > 0) {
                const delay = Math.min(1000 * Math.pow(2, 3 - retries), 5000);
                console.warn(`Request failed (${error.message}), retrying in ${delay}ms... (${retries} attempts left)`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retries - 1);
            }
            
            // If we're out of retries, throw the error
            console.error('API request failed after all retries:', error);
            throw error;
        }
    }
    
    /**
     * Try the next available URL in case of failure
     * @private
     */
    async tryNextUrl(originalUrl, options, retries) {
        this.currentUrlIndex = (this.currentUrlIndex + 1) % this.fallbackUrls.length;
        if (this.currentUrlIndex === 0) {
            throw new Error('All server endpoints failed');
        }
        
        const newBase = this.fallbackUrls[this.currentUrlIndex];
        const newUrl = originalUrl.replace(new RegExp(`^${this.baseUrl}`), newBase);
        
        console.warn(`Trying fallback URL: ${newUrl}`);
        return this.fetchWithRetry(newUrl, options, retries);
    }

    /**
     * Refresh authentication token
     * @private
     * @returns {Promise<boolean>} Whether the token was successfully refreshed
     */
    async refreshToken() {
        // Don't attempt to refresh if we're already in the process of refreshing
        if (this._isRefreshing) {
            return new Promise((resolve) => {
                const startTime = Date.now();
                const WAIT_TIMEOUT_MS = 10000;
                const checkRefresh = () => {
                    if (!this._isRefreshing) {
                        resolve(!!this.getAuthToken());
                    } else if (Date.now() - startTime > WAIT_TIMEOUT_MS) {
                        console.warn('Token refresh wait timed out');
                        resolve(false);
                    } else {
                        setTimeout(checkRefresh, 100);
                    }
                };
                checkRefresh();
            });
        }
        
        try {
            this._isRefreshing = true;
            
            const currentToken = this.getAuthToken();
            const hasCookie = document.cookie.includes('auth_token=');
            if (!currentToken && !hasCookie) {
                console.warn('No auth token available for refresh');
                return false;
            }

            console.log('Attempting to refresh token (Authorization-based)...');

            // Use a separate fetch call to avoid infinite loops
            const response = await fetch(`${this.getBaseUrl()}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                credentials: 'include', // httpOnly cookie də göndərilsin
                mode: 'cors'
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Failed to refresh token:', response.status, errorData);
                
                // If we get a 401 or 403, the token is invalid/expired
                if (response.status === 401 || response.status === 403) {
                    console.warn('Auth token is invalid or expired during refresh');
                }
                
                return false;
            }
            
            const data = await response.json();
            
            if (!data.token) {
                console.error('No token in refresh response');
                return false;
            }
            
            console.log('Token refreshed successfully');
            
            // Store the new token in the same storage as the original token
            const storage = localStorage.getItem('auth_token') || localStorage.getItem('authToken') ? localStorage : sessionStorage;
            storage.setItem('auth_token', data.token);
            storage.setItem('authToken', data.token);
            
            // Update the refresh token if a new one was provided
            if (data.refresh_token) {
                storage.setItem('refresh_token', data.refresh_token);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error refreshing token:', error);
            return false;
        
        } finally {
            this._isRefreshing = false;
        }
    }
    
    /**
     * Get the current base URL
     * @returns {string} The current base URL
     */
    getBaseUrl() {
        return this.fallbackUrls[this.currentUrlIndex] || this.baseUrl;
    }
    
    /**
     * Clear all authentication data
     * @private
     */
    clearAuthData() {
        // Clear from both storage locations to be safe
        ['localStorage', 'sessionStorage'].forEach(storageType => {
            try {
                const storage = window[storageType];
                if (storage) {
                    storage.removeItem('auth_token');
                    storage.removeItem('authToken');
                    storage.removeItem('refresh_token');
                    storage.removeItem('auth_user');
                }
            } catch (e) {
                console.warn(`Could not clear ${storageType}:`, e);
            }
        });
        
        // Notify any listeners that we've logged out
        if (typeof document !== 'undefined') {
            document.dispatchEvent(new Event('auth:logout'));
        }
    }
    
    /**
     * Make an API request with automatic retry and fallback
     * @param {string} path - API endpoint path
     * @param {Object} options - Fetch options
     * @returns {Promise<Response|Object>} API response or parsed JSON
     */
    async request(endpoint, options = {}) {
        // Ensure endpoint starts with /
        if (!endpoint.startsWith('/')) {
            endpoint = `/${endpoint}`;
        }
        
        // Set default headers
        const headers = {
            'Content-Type': 'application/json',
            'x-requested-with': 'XMLHttpRequest', // CORS üçün
            ...options.headers
        };
        
        // Add auth token if exists
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Merge with user options
        options = {
            ...options,
            headers,
            credentials: this.credentials,
            mode: 'cors' // CORS üçün aşkar şəkildə təyin edirik
        };
        
        try {
            // Build the full URL with query parameters if they exist in options
            let fullUrl = `${this.getBaseUrl()}${endpoint}`;
            
            // Handle query parameters
            if (options.params) {
                const urlObj = fullUrl.startsWith('http')
                ? new URL(fullUrl)
                : new URL(fullUrl, window.location.origin);
                Object.entries(options.params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        if (Array.isArray(value)) {
                            // Handle array parameters (e.g., ?ids=1&ids=2)
                            value.forEach(v => urlObj.searchParams.append(key, v));
                        } else if (typeof value === 'object') {
                            // Handle nested objects (stringify them)
                            urlObj.searchParams.append(key, JSON.stringify(value));
                        } else {
                            // Handle primitive values
                            urlObj.searchParams.append(key, value);
                        }
                    }
                });
                fullUrl = urlObj.toString();
                // Remove params from options to avoid duplicate in fetchWithRetry
                delete options.params;
            }
            
            // Get headers from options or use default
            const headers = this.buildHeaders(options.headers || {});
            
            // Remove headers from options to avoid duplicates
            delete options.headers;
            
            // Make the request
            const response = await this.fetchWithRetry(fullUrl, {
                ...options,
                headers,
                // httpOnly cookie göndərmək üçün credentials: 'include' lazımdır
                credentials: 'include',
                mode: 'cors'
            });
            
            // Handle successful response
            if (response.ok) {
                // For 204 No Content, return empty object
                if (response.status === 204) {
                    return {};
                }
                
                // Try to parse JSON, but don't fail if it's not JSON
                try {
                    const data = await response.json();
                    return data;
                } catch (e) {
                    return response;
                }
            }
            
            // Handle specific error statuses
            let errorMessage = 'An unknown error occurred';
            let errorData = {};
            
            try {
                errorData = await response.json().catch(() => ({}));
                errorMessage = errorData.message || `HTTP error ${response.status}`;
            } catch (e) {
                errorMessage = `HTTP error ${response.status} - ${response.statusText}`;
            }
            
            switch (response.status) {
                case 400:
                    throw new Error(errorData.message || 'Bad request');
                case 401:
                    // If we get a 401, the token might be invalid, so clear it
                    localStorage.removeItem('auth_token');
                    sessionStorage.removeItem('auth_token');
                    throw new Error('Your session has expired. Please log in again.');
                case 403:
                    throw new Error(errorData.message || 'You do not have permission to access this resource');
                case 404:
                    throw new Error(errorData.message || 'The requested resource was not found');
                case 422:
                    // Handle validation errors
                    if (errorData.errors) {
                        const errorMessages = Object.entries(errorData.errors)
                            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                            .join('; ');
                        throw new Error(`Validation failed: ${errorMessages}`);
                    }
                    throw new Error(errorData.message || 'Validation failed');
                case 429:
                    throw new Error('Too many requests. Please try again later.');
                case 500:
                    throw new Error('A server error occurred. Please try again later.');
                case 502:
                case 503:
                case 504:
                    throw new Error('The server is currently unavailable. Please try again later.');
                default:
                    throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
    
    /**
     * Make a GET request
     * @param {string} path - API endpoint path
     * @param {Object} [params] - Query parameters
     * @param {Object} [options] - Additional options
     * @returns {Promise<any>} JSON response
     */
    async get(path, params = {}, options = {}) {
        // Make sure path starts with a slash
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        
        // Build URL with query parameters
        const rawUrl548 = this.getBaseUrl() + cleanPath;
        const url = rawUrl548.startsWith('http')
            ? new URL(rawUrl548)
            : new URL(rawUrl548, window.location.origin);
        
        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    // Handle array parameters (e.g., ?ids=1&ids=2)
                    value.forEach(v => url.searchParams.append(key, v));
                } else if (typeof value === 'object') {
                    // Handle nested objects (stringify them)
                    url.searchParams.append(key, JSON.stringify(value));
                } else {
                    // Handle primitive values
                    url.searchParams.append(key, value);
                }
            }
        });
        
        // Build request options
        const requestOptions = {
            method: 'GET',
            headers: this.buildHeaders(options.headers || {}),
            credentials: 'include', // httpOnly cookie göndərmək üçün
            mode: 'cors',
            ...options
        };
        
        // Remove headers from options to avoid duplicates
        delete requestOptions.headers;
        
        // Make the request using the request method to handle retries and errors
        const response = await this.request(cleanPath, {
            ...requestOptions,
            method: 'GET',
            params: params
        });
        // Parse safely regardless of type
        return this.parseResponse(response);
    }
    
    /**
     * Make a POST request
     * @param {string} path - API endpoint path
     * @param {Object} data - Request body
     * @returns {Promise<any>} JSON response
     */
    async post(path, data = {}) {
        const response = await this.request(path, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return this.parseResponse(response);
    }
    
    /**
     * Make a PUT request
     * @param {string} path - API endpoint path
     * @param {Object} data - Request body
     * @returns {Promise<any>} JSON response
     */
    async put(path, data = {}) {
        const response = await this.request(path, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return this.parseResponse(response);
    }
    
    /**
     * Make a PATCH request
     * @param {string} path - API endpoint path
     * @param {Object} data - Request body
     * @returns {Promise<any>} JSON response
     */
    async patch(path, data = {}) {
        const response = await this.request(path, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
        return this.parseResponse(response);
    }

    /**
     * Make a DELETE request
     * @param {string} path - API endpoint path
     * @returns {Promise<any>} JSON response
     */
    async delete(path) {
        const response = await this.request(path, { method: 'DELETE' });
        return this.parseResponse(response);
    }
}

// Export as ES module
export default ApiClient;

// In browser, add to window if not using modules
if (typeof window !== 'undefined') {
    window.ApiClient = ApiClient;
}
