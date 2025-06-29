/**
 * Platform-Agnostic Configuration Manager
 * Manages application configuration across different platforms
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ConfigManager {
    constructor() {
        this.configDir = path.join(os.homedir(), '.installation-up-4evr');
        this.configFile = path.join(this.configDir, 'config.json');
        this.defaultConfig = this.getDefaultConfig();
        this.config = null;
    }

    getDefaultConfig() {
        return {
            version: '1.0.0',
            platform: process.platform,
            created: new Date().toISOString(),
            
            // Monitoring configuration
            monitoring: {
                enabled: true,
                interval: 30000,
                thresholds: {
                    cpu: { warning: 70, critical: 90 },
                    memory: { warning: 70, critical: 90 },
                    disk: { warning: 80, critical: 95 },
                    temperature: { warning: 75, critical: 85 }
                },
                applications: []
            },
            
            // Notification configuration
            notifications: {
                enabled: true,
                channels: {
                    slack: { enabled: false, webhook: null },
                    discord: { enabled: false, webhook: null },
                    email: { enabled: false, smtp: null },
                    webhook: { enabled: false, urls: [] }
                },
                alertLevels: ['warning', 'critical']
            },
            
            // Dashboard configuration
            dashboard: {
                autoRefresh: true,
                refreshInterval: 10000,
                showAdvancedMetrics: false,
                theme: 'light'
            },
            
            // Installation settings
            installation: {
                name: 'Installation Up 4evr',
                description: 'Automated installation management',
                location: null,
                contact: null,
                autoStart: [],
                profiles: []
            },
            
            // Platform-specific settings
            platformSettings: {},
            
            // User preferences
            userPreferences: {
                skipWizard: false,
                defaultView: 'dashboard',
                showTooltips: true,
                confirmActions: true
            }
        };
    }

    async initialize() {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
            await this.loadConfig();
        } catch (error) {
            console.warn('Failed to initialize config manager:', error.message);
            this.config = this.defaultConfig;
        }
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile(this.configFile, 'utf8');
            const loadedConfig = JSON.parse(configData);
            
            // Merge with defaults to ensure all keys exist
            this.config = this.mergeConfig(this.defaultConfig, loadedConfig);
            
            console.log('[INFO] Configuration loaded from:', this.configFile);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Config file doesn't exist, create it
                this.config = this.defaultConfig;
                await this.saveConfig();
                console.log('[INFO] Created new configuration file:', this.configFile);
            } else {
                console.error('Failed to load config:', error.message);
                this.config = this.defaultConfig;
            }
        }
    }

    async saveConfig() {
        try {
            const configData = JSON.stringify(this.config, null, 2);
            await fs.writeFile(this.configFile, configData, 'utf8');
            console.log('[INFO] Configuration saved to:', this.configFile);
        } catch (error) {
            console.error('Failed to save config:', error.message);
            throw error;
        }
    }

    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
                merged[key] = this.mergeConfig(defaultConfig[key] || {}, userConfig[key]);
            } else {
                merged[key] = userConfig[key];
            }
        }
        
        return merged;
    }

    get(path = null) {
        if (!path) return this.config;
        
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    async update(path, value) {
        this.set(path, value);
        await this.saveConfig();
    }

    // Monitoring configuration helpers
    getMonitoringConfig() {
        return this.get('monitoring');
    }

    async updateMonitoringThresholds(thresholds) {
        await this.update('monitoring.thresholds', {
            ...this.get('monitoring.thresholds'),
            ...thresholds
        });
    }

    async addWatchedApplication(name, config) {
        const apps = this.get('monitoring.applications') || [];
        const existingIndex = apps.findIndex(app => app.name === name);
        
        if (existingIndex >= 0) {
            apps[existingIndex] = { name, ...config };
        } else {
            apps.push({ name, ...config });
        }
        
        await this.update('monitoring.applications', apps);
    }

    async removeWatchedApplication(name) {
        const apps = this.get('monitoring.applications') || [];
        const filtered = apps.filter(app => app.name !== name);
        await this.update('monitoring.applications', filtered);
    }

    // Notification configuration helpers
    getNotificationConfig() {
        return this.get('notifications');
    }

    async updateNotificationChannel(channel, config) {
        await this.update(`notifications.channels.${channel}`, {
            ...this.get(`notifications.channels.${channel}`),
            ...config
        });
    }

    // Dashboard configuration helpers
    getDashboardConfig() {
        return this.get('dashboard');
    }

    async updateDashboardConfig(config) {
        await this.update('dashboard', {
            ...this.get('dashboard'),
            ...config
        });
    }

    // Installation configuration helpers
    getInstallationConfig() {
        return this.get('installation');
    }

    async updateInstallationInfo(info) {
        await this.update('installation', {
            ...this.get('installation'),
            ...info
        });
    }

    // Platform-specific configuration
    getPlatformConfig() {
        return this.get('platformSettings');
    }

    async updatePlatformConfig(config) {
        await this.update('platformSettings', {
            ...this.get('platformSettings'),
            ...config
        });
    }

    // User preferences
    getUserPreferences() {
        return this.get('userPreferences');
    }

    async updateUserPreference(key, value) {
        await this.update(`userPreferences.${key}`, value);
    }

    // Export/Import configuration
    async exportConfig(filePath = null) {
        const exportPath = filePath || path.join(this.configDir, `config-backup-${Date.now()}.json`);
        const configData = JSON.stringify(this.config, null, 2);
        await fs.writeFile(exportPath, configData, 'utf8');
        return exportPath;
    }

    async importConfig(filePath) {
        const configData = await fs.readFile(filePath, 'utf8');
        const importedConfig = JSON.parse(configData);
        
        // Validate imported config
        if (!importedConfig.version) {
            throw new Error('Invalid configuration file - missing version');
        }
        
        this.config = this.mergeConfig(this.defaultConfig, importedConfig);
        await this.saveConfig();
    }

    // Reset configuration
    async resetConfig() {
        this.config = this.defaultConfig;
        await this.saveConfig();
    }

    // Validation
    validateConfig() {
        const errors = [];
        
        if (!this.config.version) {
            errors.push('Missing version');
        }
        
        if (!this.config.monitoring) {
            errors.push('Missing monitoring configuration');
        }
        
        if (!this.config.notifications) {
            errors.push('Missing notifications configuration');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = ConfigManager;