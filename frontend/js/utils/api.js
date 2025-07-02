/**
 * @file api.js
 * @description Centralized API communication for Installation Up 4evr.
 */

/**
 * Performs an API call to the backend server.
 * @param {string} endpoint - The API endpoint to call (e.g., '/api/health').
 * @param {object} [options={}] - Optional fetch options (method, body, etc.).
 * @returns {Promise<any>} - The JSON response from the server.
 * @throws {Error} - Throws an error if the API call fails.
 */
export async function apiCall(endpoint, options = {}) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const method = options.method || 'GET';
    const hasBody = !!options.body;
    const isAuthCall = endpoint.includes('/auth/');

    console.log(`[API] ${method} ${endpoint}`);

    try {
        const startTime = Date.now();
        const response = await fetch(url, { ...defaultOptions, ...options });
        const duration = Date.now() - startTime;

        console.log(`[API] Response status: ${response.status} (${duration}ms)`);

        if (!response.ok) {
            console.error(`[API] HTTP Error: ${response.status}: ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        if (isAuthCall) {
            console.log(`[API] Response data: [REDACTED - AUTH CALL]`);
        } else {
            console.log(`[API] Response data:`, responseData);
        }

        return responseData;
    } catch (error) {
        console.error(`[API] Call failed for ${method} ${endpoint}:`, error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            // This is likely a network error, handled in ui.js
            throw new Error('Cannot connect to server. Is it running?');
        }
        
        throw error;
    }
}
