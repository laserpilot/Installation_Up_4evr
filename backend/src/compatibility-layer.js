/**
 * Compatibility Layer
 * Provides a bridge between legacy modules and new platform abstraction
 */

const PlatformManager = require('./core/platform-manager');

class CompatibilityLayer {
    constructor() {
        this.platformManager = null;
        this.legacyMode = true;
        this.initialized = false;
    }

    async initialize(usePlatformManager = true) {
        if (this.initialized) return;

        this.legacyMode = !usePlatformManager;

        if (!this.legacyMode) {
            try {
                console.log('[COMPATIBILITY] Initializing platform manager...');
                this.platformManager = new PlatformManager();
                await this.platformManager.initialize();
                console.log('[COMPATIBILITY] Platform manager ready');
            } catch (error) {
                console.warn('[COMPATIBILITY] Platform manager failed, falling back to legacy mode:', error.message);
                this.legacyMode = true;
                this.platformManager = null;
            }
        }

        this.initialized = true;
        console.log(`[COMPATIBILITY] Initialized in ${this.legacyMode ? 'legacy' : 'platform'} mode`);
    }

    isUsingPlatformManager() {
        return !this.legacyMode && !!this.platformManager;
    }

    // Wrapper for system preferences that can use either legacy or platform manager
    async getSystemPrefsSettings(legacySystemPrefs) {
        if (this.isUsingPlatformManager()) {
            const systemManager = this.platformManager.getSystemManager();
            return systemManager.getSettings();
        } else {
            return legacySystemPrefs.getSettings();
        }
    }

    async getSystemPrefsStatus(legacySystemPrefs) {
        if (this.isUsingPlatformManager()) {
            const result = await this.platformManager.handleAPIRequest('/system/settings/status', 'GET');
            return result.data;
        } else {
            return await legacySystemPrefs.checkAllSettingsStatus();
        }
    }

    async applySystemPrefsSettings(data, legacySystemPrefs) {
        if (this.isUsingPlatformManager()) {
            const result = await this.platformManager.handleAPIRequest('/system/settings/apply', 'POST', data);
            return result;
        } else {
            const { settings } = data;
            return await legacySystemPrefs.applySettings(settings);
        }
    }

    // Wrapper for monitoring that can use either legacy or platform manager
    async getMonitoringStatus(legacyMonitoring) {
        if (this.isUsingPlatformManager()) {
            const result = await this.platformManager.handleAPIRequest('/monitoring/status', 'GET');
            return result.data;
        } else {
            return legacyMonitoring.getSystemStatus();
        }
    }

    async getMonitoringApplications(legacyMonitoring) {
        if (this.isUsingPlatformManager()) {
            const result = await this.platformManager.handleAPIRequest('/monitoring/applications', 'GET');
            return result.data;
        } else {
            return legacyMonitoring.getApplicationStatus();
        }
    }

    // Start monitoring with appropriate system
    async startMonitoring(legacyMonitoring) {
        if (this.isUsingPlatformManager()) {
            await this.platformManager.startMonitoring();
        } else {
            await legacyMonitoring.startBasicMonitoring();
        }
    }

    // Health check that works with both systems
    async healthCheck() {
        if (this.isUsingPlatformManager()) {
            const result = await this.platformManager.handleAPIRequest('/health', 'GET');
            return result.data;
        } else {
            return {
                status: 'healthy',
                mode: 'legacy',
                timestamp: new Date().toISOString(),
                version: '0.9.0'
            };
        }
    }

    // Configuration management
    async getConfiguration() {
        if (this.isUsingPlatformManager()) {
            const config = this.platformManager.getConfig();
            return config.get();
        } else {
            return { message: 'Configuration management requires platform manager mode' };
        }
    }

    async updateConfiguration(path, value) {
        if (this.isUsingPlatformManager()) {
            const config = this.platformManager.getConfig();
            await config.update(path, value);
            return { success: true, message: 'Configuration updated' };
        } else {
            throw new Error('Configuration management requires platform manager mode');
        }
    }

    // Get platform information
    getPlatformInfo() {
        if (this.isUsingPlatformManager()) {
            return {
                mode: 'platform',
                platform: this.platformManager.platform,
                features: this.platformManager.getAvailableFeatures(),
                version: '1.0.0'
            };
        } else {
            return {
                mode: 'legacy',
                platform: process.platform,
                features: {
                    systemConfiguration: true,
                    monitoring: true,
                    launchAgents: true,
                    profiles: true,
                    notifications: true,
                    remoteControl: true
                },
                version: '0.9.0'
            };
        }
    }

    // Graceful shutdown
    async shutdown() {
        if (this.isUsingPlatformManager()) {
            await this.platformManager.shutdown();
        }
        console.log('[COMPATIBILITY] Shutdown complete');
    }

    // Express middleware for API route handling
    createAPIMiddleware() {
        return async (req, res, next) => {
            // Add compatibility info to request
            req.compatibility = {
                isUsingPlatformManager: this.isUsingPlatformManager(),
                mode: this.legacyMode ? 'legacy' : 'platform'
            };

            // Add platform manager to request if available
            if (this.isUsingPlatformManager()) {
                req.platformManager = this.platformManager;
            }

            next();
        };
    }

    // Helper to wrap legacy route handlers
    wrapLegacyRoute(legacyHandler) {
        return async (req, res, next) => {
            try {
                if (this.isUsingPlatformManager()) {
                    // Try to handle with platform manager first
                    const path = req.path.replace('/api', '');
                    const method = req.method;
                    const data = req.body;
                    
                    try {
                        const result = await this.platformManager.handleAPIRequest(path, method, data);
                        res.json(result);
                        return;
                    } catch (platformError) {
                        console.warn(`[COMPATIBILITY] Platform manager failed for ${method} ${path}, falling back to legacy:`, platformError.message);
                        // Fall through to legacy handler
                    }
                }

                // Use legacy handler
                await legacyHandler(req, res, next);
            } catch (error) {
                next(error);
            }
        };
    }
}

module.exports = CompatibilityLayer;