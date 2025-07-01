/**
 * Platform Manager
 * Main orchestrator for the platform abstraction layer
 */

const { PlatformFactory } = require('./interfaces');
const MonitoringCore = require('./monitoring/monitoring-core');
const ConfigManager = require('./config-manager');
const { APIManager, APIResponse, DataTransformer } = require('./api-manager');
const ConfigurationProfiles = require('./config-profiles');
const HealthScoringEngine = require('./health-scoring');
const ValidationWorkflow = require('./validation-workflow');

class PlatformManager {
    constructor() {
        this.platform = PlatformFactory.getPlatform();
        this.config = new ConfigManager();
        this.api = new APIManager();
        this.profiles = null;
        this.healthScoring = new HealthScoringEngine();
        this.validation = null;
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

            // Initialize configuration profiles
            this.profiles = new ConfigurationProfiles(this.config);
            await this.profiles.initialize();

            // Initialize platform-specific managers
            this.systemManager = PlatformFactory.createSystemManager();
            this.processManager = PlatformFactory.createProcessManager();

            // Initialize monitoring
            this.monitoring = new MonitoringCore();

            // Initialize validation workflow
            this.validation = new ValidationWorkflow(this.config, this.monitoring, this.systemManager);

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

        // SIP status route (macOS specific)
        this.api.registerRoute('/system/sip-status', 'GET', async () => {
            if (this.platform !== 'macos') {
                return APIResponse.error({ message: 'SIP status only available on macOS' });
            }
            const sipStatus = await this.systemManager.checkSIPStatus();
            return APIResponse.success(sipStatus);
        });

        // Legacy route for compatibility
        this.api.registerRoute('/system-prefs/sip-status', 'GET', async () => {
            if (this.platform !== 'macos') {
                return APIResponse.error({ message: 'SIP status only available on macOS' });
            }
            const sipStatus = await this.systemManager.checkSIPStatus();
            return APIResponse.success(sipStatus);
        });

        // Launch Agents routes (macOS specific)
        this.api.registerRoute('/launch-agents/list', 'GET', async () => {
            if (this.platform !== 'macos') {
                return APIResponse.error({ message: 'Launch agents only available on macOS' });
            }
            const agents = await this.processManager.getAutoStartEntries();
            return APIResponse.success(agents);
        });

        this.api.registerRoute('/launch-agents/status', 'GET', async () => {
            if (this.platform !== 'macos') {
                return APIResponse.error({ message: 'Launch agents only available on macOS' });
            }
            const agents = await this.processManager.getAutoStartEntries();
            const statusList = [];
            for (const agent of agents) {
                statusList.push({
                    name: agent.name,
                    label: agent.label,
                    loaded: agent.loaded,
                    status: agent.loaded ? 'running' : 'stopped'
                });
            }
            return APIResponse.success(statusList);
        });

        this.api.registerRoute('/launch-agents/create', 'POST', async (data) => {
            if (this.platform !== 'macos') {
                return APIResponse.error({ message: 'Launch agents only available on macOS' });
            }
            const { appPath, name, description, options = {} } = data;
            if (!appPath || !name) {
                throw new Error('App path and name are required');
            }
            const result = await this.processManager.createAutoStartEntry(appPath, name, description, options);
            return result.success ? 
                APIResponse.success(result) : 
                APIResponse.error(result);
        });

        this.api.registerRoute('/launch-agents/install', 'POST', async (data) => {
            if (this.platform !== 'macos') {
                return APIResponse.error({ message: 'Launch agents only available on macOS' });
            }
            const { appPath, name, description, options = {} } = data;
            if (!appPath || !name) {
                throw new Error('App path and name are required');
            }
            const result = await this.processManager.createAutoStartEntry(appPath, name, description, options);
            return result.success ? 
                APIResponse.success(result) : 
                APIResponse.error(result);
        });

        this.api.registerRoute('/launch-agents/remove', 'POST', async (data) => {
            if (this.platform !== 'macos') {
                return APIResponse.error({ message: 'Launch agents only available on macOS' });
            }
            const { name } = data;
            if (!name) {
                throw new Error('Name is required');
            }
            const result = await this.processManager.removeAutoStartEntry(name);
            return result.success ? 
                APIResponse.success(result) : 
                APIResponse.error(result);
        });

        this.api.registerRoute('/launch-agents/app-info', 'POST', async (data) => {
            // This endpoint is for getting app info - we can return basic info
            const { appPath } = data;
            if (!appPath) {
                throw new Error('App path is required');
            }
            const path = require('path');
            const appName = path.basename(appPath, '.app');
            return APIResponse.success({
                name: appName,
                path: appPath,
                type: appPath.endsWith('.app') ? 'macOS App' : 'Executable'
            });
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

        // User preferences routes for first-run detection
        this.api.registerRoute('/config/user-preferences', 'GET', async () => {
            const preferences = this.config.get('userPreferences') || {};
            return APIResponse.success(preferences);
        });

        this.api.registerRoute('/config/user-preferences', 'POST', async (data) => {
            const currentPrefs = this.config.get('userPreferences') || {};
            const updatedPrefs = { ...currentPrefs, ...data };
            await this.config.update('userPreferences', updatedPrefs);
            return APIResponse.success(updatedPrefs, 'User preferences updated');
        });

        // Configuration Profiles routes  
        this.api.registerRoute('/config-profiles', 'GET', async () => {
            const profiles = await this.profiles.listProfiles();
            return APIResponse.success(profiles);
        });

        this.api.registerRoute('/config-profiles/:id', 'GET', async (data, context) => {
            const profileId = context?.params?.id || data.id;
            if (!profileId) throw new Error('Profile ID is required');
            const profile = await this.profiles.getProfile(profileId);
            return APIResponse.success(profile);
        });

        this.api.registerRoute('/config-profiles', 'POST', async (data) => {
            const { name, description, settings, options = {} } = data;
            if (!name || !settings) {
                throw new Error('Name and settings are required');
            }
            const result = await this.profiles.saveProfile(name, description, settings, options);
            return APIResponse.success(result, 'Profile saved successfully');
        });

        this.api.registerRoute('/config-profiles/:id/load', 'POST', async (data, context) => {
            const profileId = context?.params?.id || data.id;
            if (!profileId) throw new Error('Profile ID is required');
            const result = await this.profiles.loadProfile(profileId, data.options);
            return APIResponse.success(result);
        });

        this.api.registerRoute('/config-profiles/:id', 'DELETE', async (data, context) => {
            const profileId = context?.params?.id || data.id;
            if (!profileId) throw new Error('Profile ID is required');
            const result = await this.profiles.deleteProfile(profileId);
            return APIResponse.success(result);
        });

        this.api.registerRoute('/config-profiles/:id/export', 'POST', async (data, context) => {
            const profileId = context?.params?.id || data.id;
            if (!profileId) throw new Error('Profile ID is required');
            const result = await this.profiles.exportProfile(profileId, data.exportPath);
            return APIResponse.success(result);
        });

        this.api.registerRoute('/config-profiles/import', 'POST', async (data) => {
            const { importPath } = data;
            if (!importPath) throw new Error('Import path is required');
            const result = await this.profiles.importProfile(importPath);
            return APIResponse.success(result, 'Profile imported successfully');
        });

        this.api.registerRoute('/config-profiles/current', 'POST', async (data) => {
            const { name, description, options = {} } = data;
            if (!name) throw new Error('Profile name is required');
            const result = await this.profiles.createProfileFromCurrentConfig(name, description, options);
            return APIResponse.success(result, 'Profile created from current configuration');
        });

        this.api.registerRoute('/config-profiles/stats', 'GET', async () => {
            const stats = await this.profiles.getProfileStats();
            return APIResponse.success(stats);
        });

        // Health Scoring routes
        this.api.registerRoute('/health/score', 'GET', async () => {
            const systemData = this.monitoring.getCurrentData();
            const configData = this.config.get();
            const healthReport = this.healthScoring.generateHealthReport(systemData, configData);
            return APIResponse.success(healthReport);
        });

        this.api.registerRoute('/health/recommendations', 'GET', async () => {
            const systemData = this.monitoring.getCurrentData();
            const configData = this.config.get();
            const healthScore = this.healthScoring.calculateHealthScore(systemData, configData);
            return APIResponse.success({
                recommendations: healthScore.recommendations,
                score: healthScore.overall,
                rating: healthScore.rating
            });
        });

        this.api.registerRoute('/health/breakdown', 'GET', async () => {
            const systemData = this.monitoring.getCurrentData();
            const configData = this.config.get();
            const healthScore = this.healthScoring.calculateHealthScore(systemData, configData);
            return APIResponse.success({
                breakdown: healthScore.breakdown,
                overall: healthScore.overall,
                rating: healthScore.rating
            });
        });

        // Service Control routes
        this.api.registerRoute('/service/status', 'GET', async () => {
            const status = this.getServiceStatus();
            return APIResponse.success(status);
        });

        this.api.registerRoute('/service/start', 'POST', async () => {
            // Note: This is mostly for UI feedback - service is already running if this endpoint is hit
            return APIResponse.success({ 
                message: 'Service is already running',
                status: 'running',
                pid: process.pid
            });
        });

        this.api.registerRoute('/service/stop', 'POST', async () => {
            // Graceful shutdown with delay to allow response
            setTimeout(() => {
                console.log('[SERVICE] Graceful shutdown requested');
                process.exit(0);
            }, 1000);
            
            return APIResponse.success({ 
                message: 'Shutdown initiated',
                status: 'stopping' 
            });
        });

        this.api.registerRoute('/service/restart', 'POST', async () => {
            // Note: In production, this would typically use PM2 or similar process manager
            setTimeout(() => {
                console.log('[SERVICE] Restart requested');
                process.exit(0); // Let process manager restart
            }, 1000);
            
            return APIResponse.success({ 
                message: 'Restart initiated',
                status: 'restarting' 
            });
        });

        this.api.registerRoute('/service/install', 'POST', async () => {
            // This would implement service installation logic for the platform
            // For now, return a placeholder response
            return APIResponse.success({ 
                message: 'Service installation not yet implemented',
                status: 'manual_required',
                instructions: 'Please use PM2 or similar process manager for production deployment'
            });
        });

        this.api.registerRoute('/service/logs', 'GET', async () => {
            const logs = this.getServiceLogs();
            return APIResponse.success({ logs });
        });

        // Validation Workflow routes
        this.api.registerRoute('/validation/tests', 'GET', async () => {
            const tests = this.validation.getAvailableTests();
            return APIResponse.success(tests);
        });

        this.api.registerRoute('/validation/run', 'POST', async (data) => {
            const options = data || {};
            const result = await this.validation.runFullValidation(options);
            return APIResponse.success(result);
        });

        this.api.registerRoute('/validation/results', 'GET', async () => {
            const summary = this.validation.generateValidationSummary();
            const recommendations = this.validation.getRecommendations();
            return APIResponse.success({
                summary,
                recommendations,
                results: this.validation.testResults
            });
        });

        this.api.registerRoute('/validation/test/:id', 'GET', async (data, context) => {
            const testId = context?.params?.id || data.id;
            if (!testId) throw new Error('Test ID is required');
            const result = this.validation.getTestResult(testId);
            if (!result) throw new Error('Test result not found');
            return APIResponse.success(result);
        });

        this.api.registerRoute('/validation/recommendations', 'GET', async () => {
            const recommendations = this.validation.getRecommendations();
            return APIResponse.success(recommendations);
        });

        // Health check
        this.api.registerRoute('/health', 'GET', async () => {
            return this.api.healthCheck();
        });

        // Platform information
        this.api.registerRoute('/platform', 'GET', async () => {
            return APIResponse.success({
                platform: this.platform,
                mode: 'platform',
                version: '1.0.0-alpha.1',
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

    getServiceStatus() {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        
        return {
            status: 'running',
            uptime: Math.floor(uptime),
            uptimeFormatted: this.formatServiceUptime(uptime),
            pid: process.pid,
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memoryUsage.external / 1024 / 1024) // MB
            },
            platform: process.platform,
            nodeVersion: process.version,
            architecture: process.arch,
            installationId: this.monitoring?.installationId || 'unknown',
            lastRestart: new Date().toISOString() // Would be actual restart time in production
        };
    }

    getServiceLogs() {
        // In a production environment, this would read from actual log files
        // For now, return some mock logs and any console output if captured
        const recentLogs = [
            {
                timestamp: new Date(Date.now() - 300000).toISOString(),
                level: 'INFO',
                message: 'Platform manager initialized successfully'
            },
            {
                timestamp: new Date(Date.now() - 240000).toISOString(),
                level: 'INFO', 
                message: 'Monitoring system started'
            },
            {
                timestamp: new Date(Date.now() - 180000).toISOString(),
                level: 'INFO',
                message: 'API routes registered successfully'
            },
            {
                timestamp: new Date(Date.now() - 120000).toISOString(),
                level: 'INFO',
                message: 'Configuration profiles loaded'
            },
            {
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: 'INFO',
                message: 'Health scoring engine active'
            },
            {
                timestamp: new Date().toISOString(),
                level: 'INFO',
                message: 'Service running normally'
            }
        ];

        return recentLogs;
    }

    formatServiceUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
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