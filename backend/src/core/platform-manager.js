/**
 * Platform Manager
 * Main orchestrator for the platform abstraction layer
 */

const { PlatformFactory } = require('./interfaces');
const MonitoringCore = require('./monitoring/monitoring-core');
const ConfigManager = require('./config-manager');
const { APIManager, APIResponse, DataTransformer } = require('./api-manager');

class PlatformManager {
    constructor() {
        this.platform = PlatformFactory.getPlatform();
        this.config = new ConfigManager();
        this.api = new APIManager();
        this.monitoring = null;
        this.systemManager = null;
        this.processManager = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log(`[PLATFORM] Initializing for ${this.platform}...`);

            // Initialize configuration
            await this.config.initialize();

            // Initialize platform-specific managers
            this.systemManager = PlatformFactory.createSystemManager();
            this.processManager = PlatformFactory.createProcessManager();

            // Initialize monitoring
            this.monitoring = new MonitoringCore();

            // Setup API routes
            this.setupAPIRoutes();

            // Setup monitoring event handlers
            this.setupMonitoringHandlers();

            this.initialized = true;
            console.log(`[PLATFORM] Successfully initialized for ${this.platform}`);

        } catch (error) {
            console.error('[PLATFORM] Initialization failed:', error);
            throw error;
        }
    }

    setupAPIRoutes() {
        // System information routes
        this.api.registerRoute('/system/info', 'GET', async () => {
            const info = await this.systemManager.getSystemInfo();
            return APIResponse.success(DataTransformer.sanitizeSystemInfo(info));
        });

        // System preferences routes
        this.api.registerRoute('/system/settings', 'GET', async () => {
            const settings = this.systemManager.getSettings();
            return APIResponse.success(settings);
        });

        this.api.registerRoute('/system/settings/status', 'GET', async () => {
            const status = await this.systemManager.verifySettings();
            return APIResponse.success(status);
        });

        this.api.registerRoute('/system/settings/apply', 'POST', async (data) => {
            const { settings } = data;
            if (!Array.isArray(settings)) {
                throw new Error('Settings must be an array');
            }
            const result = await this.systemManager.applySettings(settings);
            return result.success ? 
                APIResponse.success(result) : 
                APIResponse.partial(result, { message: 'Some settings failed to apply' });
        });

        this.api.registerRoute('/system/settings/revert', 'POST', async (data) => {
            const { settings } = data;
            if (!Array.isArray(settings)) {
                throw new Error('Settings must be an array');
            }
            const result = await this.systemManager.revertSettings(settings);
            return result.success ? 
                APIResponse.success(result) : 
                APIResponse.partial(result, { message: 'Some settings failed to revert' });
        });

        // Monitoring routes
        this.api.registerRoute('/monitoring/status', 'GET', async () => {
            const data = this.monitoring.getCurrentData();
            return APIResponse.success(DataTransformer.sanitizeMonitoringData(data));
        });

        this.api.registerRoute('/monitoring/start', 'POST', async (data) => {
            const { interval = 30000 } = data;
            await this.monitoring.startMonitoring(interval);
            return APIResponse.success({ status: 'started', interval });
        });

        this.api.registerRoute('/monitoring/stop', 'POST', async () => {
            this.monitoring.stopMonitoring();
            return APIResponse.success({ status: 'stopped' });
        });

        this.api.registerRoute('/monitoring/applications', 'GET', async () => {
            const data = this.monitoring.getCurrentData();
            return APIResponse.success(DataTransformer.sanitizeApplicationList(data.applications));
        });

        this.api.registerRoute('/monitoring/applications/add', 'POST', async (data) => {
            const { name, path, options = {} } = data;
            if (!name || !path) {
                throw new Error('Name and path are required');
            }
            this.monitoring.addApplication(name, path, options);
            return APIResponse.success({ message: `Application ${name} added to monitoring` });
        });

        this.api.registerRoute('/monitoring/thresholds', 'GET', async () => {
            const thresholds = this.monitoring.alertThresholds;
            return APIResponse.success(thresholds);
        });

        this.api.registerRoute('/monitoring/thresholds', 'PUT', async (data) => {
            this.monitoring.updateThresholds(data);
            await this.config.updateMonitoringThresholds(data);
            return APIResponse.success({ message: 'Thresholds updated' });
        });

        // Configuration routes
        this.api.registerRoute('/config', 'GET', async () => {
            const config = this.config.get();
            return APIResponse.success(config);
        });

        this.api.registerRoute('/config', 'PUT', async (data) => {
            const { path, value } = data;
            if (!path) {
                throw new Error('Configuration path is required');
            }
            await this.config.update(path, value);
            return APIResponse.success({ message: 'Configuration updated' });
        });

        this.api.registerRoute('/config/export', 'POST', async (data) => {
            const { filePath } = data;
            const exportPath = await this.config.exportConfig(filePath);
            return APIResponse.success({ exportPath });
        });

        this.api.registerRoute('/config/import', 'POST', async (data) => {
            const { filePath } = data;
            if (!filePath) {
                throw new Error('File path is required');
            }
            await this.config.importConfig(filePath);
            return APIResponse.success({ message: 'Configuration imported' });
        });

        // Health check
        this.api.registerRoute('/health', 'GET', async () => {
            return this.api.healthCheck();
        });

        // Platform information
        this.api.registerRoute('/platform', 'GET', async () => {
            return APIResponse.success({
                platform: this.platform,
                initialized: this.initialized,
                features: this.getAvailableFeatures()
            });
        });
    }

    setupMonitoringHandlers() {
        if (!this.monitoring) return;

        this.monitoring.on('dataCollected', (data) => {
            // Could emit to external systems, logging, etc.
            console.log('[MONITORING] Data collected:', {
                timestamp: data.timestamp,
                cpu: data.system.cpu?.usage,
                memory: data.system.memory?.usage,
                apps: data.applications?.length
            });
        });

        this.monitoring.on('alerts', (alerts) => {
            console.log('[MONITORING] Alerts generated:', alerts.length);
            alerts.forEach(alert => {
                console.warn(`[ALERT] ${alert.level}: ${alert.message}`);
            });
            // Could trigger notifications here
        });

        this.monitoring.on('heartbeat', (heartbeat) => {
            console.log('[MONITORING] Heartbeat:', heartbeat.installationId, heartbeat.status);
        });

        this.monitoring.on('monitoringError', (error) => {
            console.error('[MONITORING] Error:', error);
        });
    }

    getAvailableFeatures() {
        const features = {
            systemConfiguration: !!this.systemManager,
            processManagement: !!this.processManager,
            monitoring: !!this.monitoring,
            configuration: !!this.config
        };

        // Platform-specific features
        if (this.platform === 'macos') {
            features.macosSpecific = {
                systemPreferences: true,
                launchAgents: true,
                sipStatus: true,
                pmsetCommands: true
            };
        }

        return features;
    }

    async handleAPIRequest(path, method, data = null, context = {}) {
        if (!this.initialized) {
            throw new Error('Platform manager not initialized');
        }

        return this.api.handleRequest(path, method, data, context);
    }

    async startMonitoring(interval = null) {
        if (!this.monitoring) {
            throw new Error('Monitoring not available');
        }

        const monitoringConfig = this.config.getMonitoringConfig();
        const actualInterval = interval || monitoringConfig.interval || 30000;

        // Add configured applications to monitoring
        const watchedApps = monitoringConfig.applications || [];
        watchedApps.forEach(app => {
            this.monitoring.addApplication(app.name, app.path || app.name, app);
        });

        // Update thresholds from config
        if (monitoringConfig.thresholds) {
            const thresholds = {};
            for (const [metric, levels] of Object.entries(monitoringConfig.thresholds)) {
                if (levels.warning) thresholds[`${metric}Usage`] = levels.warning;
            }
            this.monitoring.updateThresholds(thresholds);
        }

        await this.monitoring.startMonitoring(actualInterval);
    }

    async stopMonitoring() {
        if (this.monitoring) {
            this.monitoring.stopMonitoring();
        }
    }

    getSystemManager() {
        return this.systemManager;
    }

    getProcessManager() {
        return this.processManager;
    }

    getMonitoring() {
        return this.monitoring;
    }

    getConfig() {
        return this.config;
    }

    getAPI() {
        return this.api;
    }

    async shutdown() {
        console.log('[PLATFORM] Shutting down...');
        
        if (this.monitoring) {
            this.monitoring.stopMonitoring();
        }

        if (this.config) {
            await this.config.saveConfig();
        }

        this.initialized = false;
        console.log('[PLATFORM] Shutdown complete');
    }
}

module.exports = PlatformManager;