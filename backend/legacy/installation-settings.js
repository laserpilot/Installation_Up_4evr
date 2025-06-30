/**
 * Installation Settings Module
 * Manages installation-specific parameters and configurations
 */

const fs = require('fs').promises;
const path = require('path');

class InstallationSettingsManager {
    constructor() {
        this.configDir = '/tmp/installation-configs';
        this.profilesDir = path.join(__dirname, '../installation-profiles');
        this.defaultSettings = {
            cameraThreshold: 25,
            cameraTimeout: 30,
            cameraFps: 30,
            capacitiveThreshold: 50,
            capacitiveDebounce: 100,
            capacitivePins: [0, 1],
            audioThreshold: 40,
            audioSampleRate: 44100,
            customParams: []
        };
        
        // Ensure directories exist
        this.ensureDirectories();
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.configDir, { recursive: true });
            await fs.mkdir(this.profilesDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create configuration directories:', error.message);
        }
    }

    /**
     * Get current installation settings
     */
    async getSettings() {
        try {
            const settings = { ...this.defaultSettings };

            // Load camera settings
            try {
                const cameraConfig = await this.loadConfigFile('camera');
                if (cameraConfig.motionThreshold !== undefined) settings.cameraThreshold = cameraConfig.motionThreshold;
                if (cameraConfig.motionTimeout !== undefined) settings.cameraTimeout = cameraConfig.motionTimeout;
                if (cameraConfig.frameRate !== undefined) settings.cameraFps = cameraConfig.frameRate;
            } catch (error) {
                // Camera config doesn't exist, use defaults
            }

            // Load capacitive settings
            try {
                const capacitiveConfig = await this.loadConfigFile('capacitive');
                if (capacitiveConfig.touchThreshold !== undefined) settings.capacitiveThreshold = capacitiveConfig.touchThreshold;
                if (capacitiveConfig.debounceTime !== undefined) settings.capacitiveDebounce = capacitiveConfig.debounceTime;
                if (capacitiveConfig.activePins !== undefined) settings.capacitivePins = capacitiveConfig.activePins;
            } catch (error) {
                // Capacitive config doesn't exist, use defaults
            }

            // Load audio settings
            try {
                const audioConfig = await this.loadConfigFile('audio');
                if (audioConfig.triggerLevel !== undefined) settings.audioThreshold = audioConfig.triggerLevel;
                if (audioConfig.sampleRate !== undefined) settings.audioSampleRate = audioConfig.sampleRate;
            } catch (error) {
                // Audio config doesn't exist, use defaults
            }

            // Load custom parameters
            try {
                const customConfig = await this.loadConfigFile('custom');
                const customParams = [];
                for (const [key, value] of Object.entries(customConfig)) {
                    customParams.push({
                        name: key,
                        value: value,
                        type: this.inferType(value)
                    });
                }
                settings.customParams = customParams;
            } catch (error) {
                // Custom config doesn't exist, use defaults
            }

            return {
                success: true,
                settings: settings
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update installation settings
     */
    async updateSettings(newSettings) {
        try {
            const results = [];

            // Update camera settings
            if (newSettings.cameraThreshold !== undefined || 
                newSettings.cameraTimeout !== undefined || 
                newSettings.cameraFps !== undefined) {
                
                const cameraConfig = await this.loadConfigFile('camera').catch(() => ({}));
                
                if (newSettings.cameraThreshold !== undefined) {
                    cameraConfig.motionThreshold = parseInt(newSettings.cameraThreshold);
                }
                if (newSettings.cameraTimeout !== undefined) {
                    cameraConfig.motionTimeout = parseInt(newSettings.cameraTimeout);
                }
                if (newSettings.cameraFps !== undefined) {
                    cameraConfig.frameRate = parseInt(newSettings.cameraFps);
                }
                
                await this.saveConfigFile('camera', cameraConfig);
                results.push({ category: 'camera', success: true });
            }

            // Update capacitive settings
            if (newSettings.capacitiveThreshold !== undefined || 
                newSettings.capacitiveDebounce !== undefined || 
                newSettings.capacitivePins !== undefined) {
                
                const capacitiveConfig = await this.loadConfigFile('capacitive').catch(() => ({}));
                
                if (newSettings.capacitiveThreshold !== undefined) {
                    capacitiveConfig.touchThreshold = parseInt(newSettings.capacitiveThreshold);
                }
                if (newSettings.capacitiveDebounce !== undefined) {
                    capacitiveConfig.debounceTime = parseInt(newSettings.capacitiveDebounce);
                }
                if (newSettings.capacitivePins !== undefined) {
                    capacitiveConfig.activePins = Array.isArray(newSettings.capacitivePins) 
                        ? newSettings.capacitivePins 
                        : [newSettings.capacitivePins];
                }
                
                await this.saveConfigFile('capacitive', capacitiveConfig);
                results.push({ category: 'capacitive', success: true });
            }

            // Update audio settings
            if (newSettings.audioThreshold !== undefined || newSettings.audioSampleRate !== undefined) {
                const audioConfig = await this.loadConfigFile('audio').catch(() => ({}));
                
                if (newSettings.audioThreshold !== undefined) {
                    audioConfig.triggerLevel = parseInt(newSettings.audioThreshold);
                }
                if (newSettings.audioSampleRate !== undefined) {
                    audioConfig.sampleRate = parseInt(newSettings.audioSampleRate);
                }
                
                await this.saveConfigFile('audio', audioConfig);
                results.push({ category: 'audio', success: true });
            }

            // Update custom parameters
            if (newSettings.customParams && Array.isArray(newSettings.customParams)) {
                const customConfig = {};
                newSettings.customParams.forEach(param => {
                    if (param.name && param.value !== undefined) {
                        customConfig[param.name] = this.parseValue(param.value, param.type);
                    }
                });
                
                await this.saveConfigFile('custom', customConfig);
                results.push({ category: 'custom', success: true });
            }

            return {
                success: true,
                message: `Updated ${results.length} configuration categories`,
                results: results
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test installation settings
     */
    async testSettings(settings) {
        try {
            const testResults = [];

            // Test camera settings
            if (settings.cameraThreshold !== undefined) {
                const threshold = parseInt(settings.cameraThreshold);
                testResults.push({
                    setting: 'Camera Motion Threshold',
                    value: `${threshold}%`,
                    status: threshold >= 0 && threshold <= 100 ? 'pass' : 'fail',
                    message: threshold >= 0 && threshold <= 100 
                        ? 'Valid threshold range' 
                        : 'Threshold must be between 0-100%'
                });
            }

            // Test capacitive settings
            if (settings.capacitiveThreshold !== undefined) {
                const threshold = parseInt(settings.capacitiveThreshold);
                testResults.push({
                    setting: 'Capacitive Touch Threshold',
                    value: `${threshold}%`,
                    status: threshold >= 0 && threshold <= 100 ? 'pass' : 'fail',
                    message: threshold >= 0 && threshold <= 100 
                        ? 'Valid sensitivity range' 
                        : 'Sensitivity must be between 0-100%'
                });
            }

            // Test audio settings
            if (settings.audioThreshold !== undefined) {
                const threshold = parseInt(settings.audioThreshold);
                testResults.push({
                    setting: 'Audio Trigger Level',
                    value: `${threshold}dB`,
                    status: threshold >= 0 && threshold <= 100 ? 'pass' : 'fail',
                    message: threshold >= 0 && threshold <= 100 
                        ? 'Valid audio level range' 
                        : 'Audio level must be between 0-100dB'
                });
            }

            // Test custom parameters
            if (settings.customParams && Array.isArray(settings.customParams)) {
                settings.customParams.forEach(param => {
                    testResults.push({
                        setting: `Custom: ${param.name}`,
                        value: param.value,
                        status: param.name && param.value ? 'pass' : 'fail',
                        message: param.name && param.value 
                            ? 'Valid custom parameter' 
                            : 'Custom parameter requires name and value'
                    });
                });
            }

            return {
                success: true,
                testResults: testResults,
                summary: {
                    total: testResults.length,
                    passed: testResults.filter(r => r.status === 'pass').length,
                    failed: testResults.filter(r => r.status === 'fail').length
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save installation profile
     */
    async saveProfile(name, settings) {
        try {
            const filename = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
            const filepath = path.join(this.profilesDir, filename);
            
            const profile = {
                name: name,
                created: new Date().toISOString(),
                settings: settings
            };

            await fs.writeFile(filepath, JSON.stringify(profile, null, 2));

            return {
                success: true,
                message: `Profile "${name}" saved successfully`,
                filepath: filepath
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load installation profile
     */
    async loadProfile(name) {
        try {
            const filename = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
            const filepath = path.join(this.profilesDir, filename);
            
            const data = await fs.readFile(filepath, 'utf8');
            const profile = JSON.parse(data);

            return {
                success: true,
                profile: profile.settings,
                metadata: {
                    name: profile.name,
                    created: profile.created
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List available profiles
     */
    async listProfiles() {
        try {
            const files = await fs.readdir(this.profilesDir);
            const profiles = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filepath = path.join(this.profilesDir, file);
                        const data = await fs.readFile(filepath, 'utf8');
                        const profile = JSON.parse(data);
                        
                        profiles.push({
                            name: profile.name,
                            filename: file,
                            created: profile.created
                        });
                    } catch (error) {
                        // Skip invalid profile files
                    }
                }
            }

            return {
                success: true,
                profiles: profiles
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                profiles: []
            };
        }
    }

    /**
     * Delete installation profile
     */
    async deleteProfile(name) {
        try {
            const filename = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
            const filepath = path.join(this.profilesDir, filename);
            
            await fs.unlink(filepath);

            return {
                success: true,
                message: `Profile "${name}" deleted successfully`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper methods

    async loadConfigFile(type) {
        const filepath = path.join(this.configDir, `installation-${type}-config.json`);
        const data = await fs.readFile(filepath, 'utf8');
        return JSON.parse(data);
    }

    async saveConfigFile(type, config) {
        const filepath = path.join(this.configDir, `installation-${type}-config.json`);
        await fs.writeFile(filepath, JSON.stringify(config, null, 2));
    }

    inferType(value) {
        if (typeof value === 'boolean') return 'boolean';
        if (typeof value === 'number') return 'number';
        return 'string';
    }

    parseValue(value, type) {
        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return value === 'true' || value === true;
            default:
                return String(value);
        }
    }
}

module.exports = InstallationSettingsManager;