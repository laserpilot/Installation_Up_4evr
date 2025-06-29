/**
 * Configuration Profiles Manager
 * Handles saving, loading, and managing configuration profiles
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ConfigurationProfiles {
    constructor(configManager) {
        this.config = configManager;
        this.profilesDir = path.join(configManager.configDir, 'profiles');
        this.builtInProfiles = this.getBuiltInProfiles();
    }

    async initialize() {
        try {
            await fs.mkdir(this.profilesDir, { recursive: true });
            console.log('[CONFIG-PROFILES] Profiles directory initialized');
        } catch (error) {
            console.warn('[CONFIG-PROFILES] Failed to initialize profiles directory:', error.message);
        }
    }

    getBuiltInProfiles() {
        return {
            'gallery-installation': {
                id: 'gallery-installation',
                name: 'Gallery Installation',
                description: 'Optimized settings for gallery and museum installations with extended uptime requirements',
                category: 'installation',
                version: '1.0.0',
                builtIn: true,
                settings: {
                    systemPreferences: {
                        screensaver: 'never',
                        displaySleep: 'never',
                        computerSleep: 'never',
                        autoRestart: 'weekly',
                        autoUpdates: 'disabled',
                        gatekeeper: 'disabled',
                        spotlight: 'minimal'
                    },
                    monitoring: {
                        thresholds: {
                            cpu: { warning: 80, critical: 95 },
                            memory: { warning: 85, critical: 95 },
                            disk: { warning: 90, critical: 98 },
                            temperature: { warning: 70, critical: 80 }
                        },
                        interval: 60000,
                        applications: []
                    },
                    notifications: {
                        enabled: true,
                        channels: {
                            slack: { enabled: false },
                            discord: { enabled: false }
                        },
                        alertLevels: ['critical']
                    }
                }
            },
            'interactive-kiosk': {
                id: 'interactive-kiosk',
                name: 'Interactive Kiosk',
                description: 'Settings for public interactive installations with security and stability focus',
                category: 'kiosk',
                version: '1.0.0',
                builtIn: true,
                settings: {
                    systemPreferences: {
                        screensaver: '30min',
                        displaySleep: 'never',
                        computerSleep: 'never',
                        autoRestart: 'daily',
                        autoUpdates: 'security-only',
                        gatekeeper: 'enabled',
                        spotlight: 'disabled'
                    },
                    monitoring: {
                        thresholds: {
                            cpu: { warning: 70, critical: 90 },
                            memory: { warning: 80, critical: 90 },
                            disk: { warning: 85, critical: 95 },
                            temperature: { warning: 75, critical: 85 }
                        },
                        interval: 30000,
                        applications: []
                    },
                    userPreferences: {
                        confirmActions: false,
                        showTooltips: false
                    }
                }
            },
            'performance-critical': {
                id: 'performance-critical',
                name: 'Performance Critical',
                description: 'Maximum performance settings for real-time interactive installations',
                category: 'performance',
                version: '1.0.0',
                builtIn: true,
                settings: {
                    systemPreferences: {
                        screensaver: 'never',
                        displaySleep: 'never',
                        computerSleep: 'never',
                        autoRestart: 'monthly',
                        autoUpdates: 'disabled',
                        gatekeeper: 'disabled',
                        spotlight: 'disabled'
                    },
                    monitoring: {
                        thresholds: {
                            cpu: { warning: 60, critical: 80 },
                            memory: { warning: 70, critical: 85 },
                            disk: { warning: 80, critical: 90 },
                            temperature: { warning: 65, critical: 75 }
                        },
                        interval: 15000,
                        applications: []
                    },
                    dashboard: {
                        autoRefresh: true,
                        refreshInterval: 5000,
                        showAdvancedMetrics: true
                    }
                }
            },
            'development-testing': {
                id: 'development-testing',
                name: 'Development & Testing',
                description: 'Flexible settings for development and testing environments',
                category: 'development',
                version: '1.0.0',
                builtIn: true,
                settings: {
                    systemPreferences: {
                        screensaver: '10min',
                        displaySleep: '30min',
                        computerSleep: 'never',
                        autoRestart: 'never',
                        autoUpdates: 'enabled',
                        gatekeeper: 'enabled',
                        spotlight: 'enabled'
                    },
                    monitoring: {
                        thresholds: {
                            cpu: { warning: 85, critical: 95 },
                            memory: { warning: 90, critical: 95 },
                            disk: { warning: 95, critical: 98 },
                            temperature: { warning: 80, critical: 90 }
                        },
                        interval: 60000,
                        applications: []
                    },
                    userPreferences: {
                        showTooltips: true,
                        confirmActions: true
                    }
                }
            }
        };
    }

    async listProfiles() {
        const profiles = [];
        
        // Add built-in profiles
        Object.values(this.builtInProfiles).forEach(profile => {
            profiles.push({
                id: profile.id,
                name: profile.name,
                description: profile.description,
                category: profile.category,
                builtIn: true,
                version: profile.version,
                created: null,
                modified: null
            });
        });

        // Add user profiles
        try {
            const files = await fs.readdir(this.profilesDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const profilePath = path.join(this.profilesDir, file);
                        const stats = await fs.stat(profilePath);
                        const content = await fs.readFile(profilePath, 'utf8');
                        const profile = JSON.parse(content);
                        
                        profiles.push({
                            id: profile.id,
                            name: profile.name,
                            description: profile.description,
                            category: profile.category || 'custom',
                            builtIn: false,
                            version: profile.version || '1.0.0',
                            created: stats.birthtime,
                            modified: stats.mtime
                        });
                    } catch (error) {
                        console.warn(`[CONFIG-PROFILES] Failed to load profile ${file}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.warn('[CONFIG-PROFILES] Failed to read profiles directory:', error.message);
        }

        return profiles.sort((a, b) => {
            if (a.builtIn && !b.builtIn) return -1;
            if (!a.builtIn && b.builtIn) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    async getProfile(profileId) {
        // Check built-in profiles first
        if (this.builtInProfiles[profileId]) {
            return this.builtInProfiles[profileId];
        }

        // Check user profiles
        try {
            const profilePath = path.join(this.profilesDir, `${profileId}.json`);
            const content = await fs.readFile(profilePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Profile not found: ${profileId}`);
        }
    }

    async saveProfile(name, description, settings, options = {}) {
        const profileId = options.id || this.generateProfileId(name);
        const profile = {
            id: profileId,
            name,
            description,
            category: options.category || 'custom',
            version: options.version || '1.0.0',
            builtIn: false,
            created: options.created || new Date().toISOString(),
            modified: new Date().toISOString(),
            settings: this.sanitizeSettings(settings)
        };

        const profilePath = path.join(this.profilesDir, `${profileId}.json`);
        await fs.writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf8');
        
        console.log(`[CONFIG-PROFILES] Profile saved: ${name} (${profileId})`);
        return { profileId, path: profilePath };
    }

    async loadProfile(profileId, options = {}) {
        const profile = await this.getProfile(profileId);
        const applySettings = options.apply !== false;

        if (applySettings) {
            await this.applyProfileSettings(profile.settings);
        }

        return {
            profile,
            applied: applySettings,
            message: `Profile "${profile.name}" ${applySettings ? 'loaded and applied' : 'loaded'}`
        };
    }

    async deleteProfile(profileId) {
        if (this.builtInProfiles[profileId]) {
            throw new Error('Cannot delete built-in profiles');
        }

        const profilePath = path.join(this.profilesDir, `${profileId}.json`);
        await fs.unlink(profilePath);
        
        console.log(`[CONFIG-PROFILES] Profile deleted: ${profileId}`);
        return { message: 'Profile deleted successfully' };
    }

    async exportProfile(profileId, exportPath = null) {
        const profile = await this.getProfile(profileId);
        const filename = `${profile.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-profile.json`;
        const targetPath = exportPath || path.join(process.cwd(), filename);
        
        await fs.writeFile(targetPath, JSON.stringify(profile, null, 2), 'utf8');
        
        console.log(`[CONFIG-PROFILES] Profile exported: ${profile.name} -> ${targetPath}`);
        return { exportPath: targetPath, filename };
    }

    async importProfile(importPath) {
        const content = await fs.readFile(importPath, 'utf8');
        const profile = JSON.parse(content);
        
        // Validate profile structure
        if (!profile.name || !profile.settings) {
            throw new Error('Invalid profile format - missing name or settings');
        }

        // Generate new ID to avoid conflicts
        const profileId = this.generateProfileId(profile.name);
        profile.id = profileId;
        profile.builtIn = false;
        profile.imported = new Date().toISOString();
        profile.modified = new Date().toISOString();

        const result = await this.saveProfile(
            profile.name,
            profile.description || 'Imported profile',
            profile.settings,
            { 
                id: profileId,
                category: profile.category,
                version: profile.version,
                created: profile.created
            }
        );

        console.log(`[CONFIG-PROFILES] Profile imported: ${profile.name} (${profileId})`);
        return { profileId, imported: true, ...result };
    }

    async applyProfileSettings(settings) {
        const updates = [];

        // Apply monitoring settings
        if (settings.monitoring) {
            await this.config.update('monitoring', {
                ...this.config.get('monitoring'),
                ...settings.monitoring
            });
            updates.push('monitoring');
        }

        // Apply notification settings
        if (settings.notifications) {
            await this.config.update('notifications', {
                ...this.config.get('notifications'),
                ...settings.notifications
            });
            updates.push('notifications');
        }

        // Apply dashboard settings
        if (settings.dashboard) {
            await this.config.update('dashboard', {
                ...this.config.get('dashboard'),
                ...settings.dashboard
            });
            updates.push('dashboard');
        }

        // Apply user preferences
        if (settings.userPreferences) {
            await this.config.update('userPreferences', {
                ...this.config.get('userPreferences'),
                ...settings.userPreferences
            });
            updates.push('userPreferences');
        }

        // Apply platform settings
        if (settings.platformSettings) {
            await this.config.update('platformSettings', {
                ...this.config.get('platformSettings'),
                ...settings.platformSettings
            });
            updates.push('platformSettings');
        }

        console.log(`[CONFIG-PROFILES] Applied settings for: ${updates.join(', ')}`);
        return { updates, message: 'Profile settings applied successfully' };
    }

    async createProfileFromCurrentConfig(name, description, options = {}) {
        const currentConfig = this.config.get();
        
        // Extract relevant settings (exclude runtime data)
        const settings = {
            monitoring: currentConfig.monitoring,
            notifications: currentConfig.notifications,
            dashboard: currentConfig.dashboard,
            userPreferences: currentConfig.userPreferences,
            platformSettings: currentConfig.platformSettings
        };

        // Remove system-specific or runtime data
        if (settings.monitoring?.applications) {
            settings.monitoring.applications = settings.monitoring.applications.filter(
                app => !app.systemGenerated
            );
        }

        return await this.saveProfile(name, description, settings, options);
    }

    generateProfileId(name) {
        const timestamp = Date.now();
        const hash = crypto.createHash('md5')
            .update(`${name}-${timestamp}`)
            .digest('hex')
            .substring(0, 8);
        return `profile-${hash}`;
    }

    sanitizeSettings(settings) {
        // Deep clone to avoid modifying original
        const sanitized = JSON.parse(JSON.stringify(settings));
        
        // Remove any sensitive data or system-specific paths
        if (sanitized.notifications?.channels) {
            Object.keys(sanitized.notifications.channels).forEach(channel => {
                if (sanitized.notifications.channels[channel].webhook) {
                    // Keep structure but remove actual webhook URLs for security
                    sanitized.notifications.channels[channel].webhook = '[REDACTED]';
                }
            });
        }

        return sanitized;
    }

    validateProfileSettings(settings) {
        const errors = [];

        // Validate monitoring thresholds
        if (settings.monitoring?.thresholds) {
            Object.keys(settings.monitoring.thresholds).forEach(metric => {
                const thresholds = settings.monitoring.thresholds[metric];
                if (thresholds.warning && thresholds.critical) {
                    if (thresholds.warning >= thresholds.critical) {
                        errors.push(`${metric}: Warning threshold must be less than critical threshold`);
                    }
                }
            });
        }

        // Validate notification settings
        if (settings.notifications?.alertLevels) {
            const validLevels = ['warning', 'critical', 'info'];
            settings.notifications.alertLevels.forEach(level => {
                if (!validLevels.includes(level)) {
                    errors.push(`Invalid alert level: ${level}`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    async getProfileStats() {
        const profiles = await this.listProfiles();
        const builtInCount = profiles.filter(p => p.builtIn).length;
        const customCount = profiles.filter(p => !p.builtIn).length;
        
        const categories = {};
        profiles.forEach(profile => {
            categories[profile.category] = (categories[profile.category] || 0) + 1;
        });

        return {
            total: profiles.length,
            builtIn: builtInCount,
            custom: customCount,
            categories
        };
    }
}

module.exports = ConfigurationProfiles;