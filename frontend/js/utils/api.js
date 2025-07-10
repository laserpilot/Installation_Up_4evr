/**
 * @file api.js
 * @description Centralized API communication for Installation Up 4evr.
 */

/**
 * Logs user actions to the backend for audit trail
 */
async function logUserAction(method, endpoint, options, statusCode, duration) {
    try {
        const actionData = {
            method,
            endpoint,
            statusCode,
            duration,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            hasBody: !!options.body,
            bodySize: options.body ? JSON.stringify(options.body).length : 0
        };

        // Send to logging endpoint (but don't wait for response to avoid blocking)
        fetch(`${window.location.origin}/api/user-actions/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actionData)
        }).catch(() => {
            // Ignore logging errors to avoid infinite loops
        });
    } catch (error) {
        // Ignore logging errors
    }
}

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

        // Log user actions to backend for important endpoints
        if (method !== 'GET' && !endpoint.includes('/logs/') && !endpoint.includes('/monitoring/') && !endpoint.includes('/health')) {
            logUserAction(method, endpoint, options, response.status, duration);
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

// Master Configuration API Functions
export const MasterConfigAPI = {
    /**
     * Get current master profile
     */
    async getMasterProfile() {
        return await apiCall('/api/config/master');
    },

    /**
     * Create new master profile
     */
    async createMasterProfile(name, description, options = {}) {
        return await apiCall('/api/config/master', {
            method: 'POST',
            body: JSON.stringify({ name, description, ...options })
        });
    },

    /**
     * Update master profile
     */
    async updateMasterProfile(updates) {
        return await apiCall('/api/config/master', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    /**
     * Export master profile
     */
    async exportMasterProfile() {
        return await apiCall('/api/config/master/export');
    },

    /**
     * Import master profile
     */
    async importMasterProfile(filePath) {
        return await apiCall('/api/config/master/import', {
            method: 'POST',
            body: JSON.stringify({ filePath })
        });
    },

    /**
     * Get system preferences state
     */
    async getSystemPreferencesState() {
        return await apiCall('/api/config/system-preferences/state');
    },

    /**
     * Update system preferences state
     */
    async updateSystemPreferencesState(applied, currentState) {
        return await apiCall('/api/config/system-preferences/state', {
            method: 'POST',
            body: JSON.stringify({ applied, currentState })
        });
    },

    /**
     * Get launch agents from master config
     */
    async getPM2Processes() {
        return await apiCall('/api/config/pm2-processes');
    },

    /**
     * Add launch agent to master config
     */
    async addPM2Process(processInfo) {
        return await apiCall('/api/config/pm2-processes', {
            method: 'POST',
            body: JSON.stringify(agentInfo)
        });
    },

    /**
     * Remove launch agent from master config
     */
    async removePM2Process(processId) {
        return await apiCall(`/api/config/pm2-processes/${processId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Add web app to master config
     */
    async addWebApp(webAppInfo) {
        return await apiCall('/api/config/web-apps', {
            method: 'POST',
            body: JSON.stringify(webAppInfo)
        });
    }
};
