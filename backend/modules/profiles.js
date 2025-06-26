/**
 * Installation Profiles Manager
 * Create, save, load, and share reusable installation configurations
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ProfilesManager {
    constructor() {
        this.profilesDir = path.join(os.homedir(), '.installation-up-4evr', 'profiles');
        this.templatesDir = path.join(__dirname, '../templates');
        this.ensureDirectories();
    }

    async ensureDirectories() {
        try {
            await fs.mkdir(this.profilesDir, { recursive: true });
            await fs.mkdir(this.templatesDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create profiles directories:', error.message);
        }
    }

    /**
     * Create a new installation profile
     */
    createProfile(options) {
        const {
            name,
            description = '',
            category = 'custom',
            author = 'Anonymous',
            systemSettings = [],
            launchAgents = [],
            additionalScripts = [],
            tags = []
        } = options;

        return {
            id: this.generateProfileId(name),
            name: name,
            description: description,
            category: category,
            author: author,
            version: '1.0.0',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            tags: tags,
            
            // Configuration
            systemSettings: systemSettings.map(setting => ({
                id: setting.id || setting,
                enabled: setting.enabled !== false,
                priority: setting.priority || 'normal'
            })),
            
            launchAgents: launchAgents.map(agent => ({
                name: agent.name,
                appPath: agent.appPath,
                options: {
                    keepAlive: agent.keepAlive !== false,
                    successfulExit: agent.successfulExit !== false,
                    runAtLoad: agent.runAtLoad !== false,
                    label: agent.label,
                    environmentVariables: agent.environmentVariables || {},
                    workingDirectory: agent.workingDirectory,
                    args: agent.args || []
                },
                enabled: agent.enabled !== false,
                priority: agent.priority || 'normal'
            })),
            
            additionalScripts: additionalScripts.map(script => ({
                name: script.name,
                description: script.description || '',
                content: script.content,
                type: script.type || 'shell', // shell, applescript, python
                enabled: script.enabled !== false,
                runOrder: script.runOrder || 'after', // before, during, after
                priority: script.priority || 'normal'
            })),

            // Metadata
            compatibility: {
                minMacOS: '10.14',
                maxMacOS: null,
                architecture: ['x64', 'arm64'],
                sipRequired: false
            },

            // Installation notes
            installation: {
                preInstall: [],
                postInstall: [],
                testing: [],
                troubleshooting: []
            }
        };
    }

    /**
     * Generate unique profile ID
     */
    generateProfileId(name) {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        const nameSlug = name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        return `${nameSlug}-${timestamp}-${randomStr}`;
    }

    /**
     * Save profile to disk
     */
    async saveProfile(profile, filename = null) {
        const fileName = filename || `${profile.id}.up4evr.json`;
        const filePath = path.join(this.profilesDir, fileName);
        
        // Update timestamp
        profile.updated = new Date().toISOString();
        
        await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf8');
        
        return {
            success: true,
            filePath: filePath,
            fileName: fileName,
            profile: profile
        };
    }

    /**
     * Load profile from disk
     */
    async loadProfile(profileId) {
        let filePath;
        
        if (profileId.endsWith('.json')) {
            filePath = path.join(this.profilesDir, profileId);
        } else {
            filePath = path.join(this.profilesDir, `${profileId}.up4evr.json`);
        }
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const profile = JSON.parse(content);
            
            return {
                success: true,
                profile: profile,
                filePath: filePath
            };
        } catch (error) {
            throw new Error(`Failed to load profile: ${error.message}`);
        }
    }

    /**
     * List all saved profiles
     */
    async listProfiles() {
        try {
            const files = await fs.readdir(this.profilesDir);
            const profileFiles = files.filter(file => file.endsWith('.up4evr.json'));
            
            const profiles = [];
            
            for (const file of profileFiles) {
                try {
                    const result = await this.loadProfile(file);
                    if (result.success) {
                        profiles.push({
                            id: result.profile.id,
                            name: result.profile.name,
                            description: result.profile.description,
                            category: result.profile.category,
                            author: result.profile.author,
                            version: result.profile.version,
                            created: result.profile.created,
                            updated: result.profile.updated,
                            tags: result.profile.tags,
                            fileName: file,
                            systemSettingsCount: result.profile.systemSettings.length,
                            launchAgentsCount: result.profile.launchAgents.length,
                            scriptsCount: result.profile.additionalScripts?.length || 0
                        });
                    }
                } catch (error) {
                    console.warn(`Could not load profile ${file}:`, error.message);
                }
            }
            
            return profiles.sort((a, b) => new Date(b.updated) - new Date(a.updated));
        } catch (error) {
            return [];
        }
    }

    /**
     * Delete a profile
     */
    async deleteProfile(profileId) {
        const filePath = profileId.endsWith('.json') 
            ? path.join(this.profilesDir, profileId)
            : path.join(this.profilesDir, `${profileId}.up4evr.json`);
        
        try {
            await fs.unlink(filePath);
            return { success: true, message: 'Profile deleted successfully' };
        } catch (error) {
            throw new Error(`Failed to delete profile: ${error.message}`);
        }
    }

    /**
     * Duplicate a profile
     */
    async duplicateProfile(profileId, newName) {
        const result = await this.loadProfile(profileId);
        if (!result.success) {
            throw new Error('Profile not found');
        }
        
        const profile = result.profile;
        const duplicatedProfile = {
            ...profile,
            id: this.generateProfileId(newName),
            name: newName,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };
        
        return await this.saveProfile(duplicatedProfile);
    }

    /**
     * Export profile for sharing
     */
    async exportProfile(profileId, exportPath) {
        const result = await this.loadProfile(profileId);
        if (!result.success) {
            throw new Error('Profile not found');
        }
        
        const exportData = {
            ...result.profile,
            exported: new Date().toISOString(),
            exportVersion: '1.0.0'
        };
        
        await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf8');
        
        return {
            success: true,
            filePath: exportPath,
            profile: exportData
        };
    }

    /**
     * Import profile from file
     */
    async importProfile(importPath, options = {}) {
        try {
            const content = await fs.readFile(importPath, 'utf8');
            let profile = JSON.parse(content);
            
            // Generate new ID if importing
            if (options.generateNewId !== false) {
                profile.id = this.generateProfileId(profile.name);
                profile.imported = new Date().toISOString();
            }
            
            // Validate profile structure
            this.validateProfile(profile);
            
            // Save imported profile
            const result = await this.saveProfile(profile);
            
            return {
                success: true,
                profile: result.profile,
                message: 'Profile imported successfully'
            };
        } catch (error) {
            throw new Error(`Failed to import profile: ${error.message}`);
        }
    }

    /**
     * Validate profile structure
     */
    validateProfile(profile) {
        const required = ['id', 'name', 'systemSettings', 'launchAgents'];
        
        for (const field of required) {
            if (!profile.hasOwnProperty(field)) {
                throw new Error(`Invalid profile: missing required field '${field}'`);
            }
        }
        
        if (!Array.isArray(profile.systemSettings)) {
            throw new Error('Invalid profile: systemSettings must be an array');
        }
        
        if (!Array.isArray(profile.launchAgents)) {
            throw new Error('Invalid profile: launchAgents must be an array');
        }
        
        return true;
    }

    /**
     * Create built-in template profiles
     */
    async createBuiltInTemplates() {
        const templates = [
            {
                name: 'Museum Installation',
                description: 'Standard setup for museum and gallery interactive installations',
                category: 'museum',
                author: 'Installation Up 4evr',
                systemSettings: [
                    'screensaver', 'displaySleep', 'computerSleep', 'autoRestart', 
                    'restartFreeze', 'desktopBackground', 'softwareUpdate', 'hideMenuBar'
                ],
                launchAgents: [],
                tags: ['museum', 'gallery', 'interactive', 'public'],
                installation: {
                    preInstall: [
                        'Ensure device is hardwired to network',
                        'Test all hardware connections',
                        'Backup system before changes'
                    ],
                    postInstall: [
                        'Test automatic restart scenarios',
                        'Verify display connections',
                        'Set up remote monitoring'
                    ],
                    testing: [
                        'Simulate power failure',
                        'Test app crash recovery',
                        'Verify screensaver disabled'
                    ]
                }
            },
            {
                name: 'Retail Display',
                description: 'Commercial retail environment with customer interaction',
                category: 'retail',
                author: 'Installation Up 4evr',
                systemSettings: [
                    'screensaver', 'displaySleep', 'computerSleep', 'autoRestart',
                    'desktopBackground', 'softwareUpdate', 'bluetoothSetup'
                ],
                launchAgents: [],
                tags: ['retail', 'commercial', 'customer-facing'],
                installation: {
                    preInstall: [
                        'Coordinate with store IT team',
                        'Plan installation during off-hours',
                        'Prepare customer interaction guidelines'
                    ],
                    postInstall: [
                        'Train store staff on basic troubleshooting',
                        'Set up monitoring notifications',
                        'Schedule regular maintenance'
                    ]
                }
            },
            {
                name: 'Art Gallery Kiosk',
                description: 'Gallery information kiosk or interactive art piece',
                category: 'gallery',
                author: 'Installation Up 4evr',
                systemSettings: [
                    'screensaver', 'displaySleep', 'computerSleep', 'autoRestart',
                    'restartFreeze', 'desktopBackground', 'softwareUpdate', 'hideMenuBar', 'disableAppNap'
                ],
                launchAgents: [],
                tags: ['gallery', 'kiosk', 'art', 'interactive'],
                installation: {
                    testing: [
                        'Test in gallery lighting conditions',
                        'Verify audio levels appropriate for space',
                        'Test touch interaction responsiveness'
                    ]
                }
            },
            {
                name: 'Trade Show Demo',
                description: 'Temporary installation for trade shows and events',
                category: 'event',
                author: 'Installation Up 4evr',
                systemSettings: [
                    'screensaver', 'displaySleep', 'computerSleep', 'desktopBackground', 'hideMenuBar'
                ],
                launchAgents: [],
                tags: ['trade-show', 'event', 'temporary', 'demo'],
                installation: {
                    preInstall: [
                        'Test setup in similar environment',
                        'Prepare quick setup checklist',
                        'Plan for various power/network scenarios'
                    ],
                    postInstall: [
                        'Monitor during first hour of event',
                        'Prepare troubleshooting kit',
                        'Document any issues for future events'
                    ]
                }
            },
            {
                name: 'Test Applications Suite',
                description: 'Complete test applications for validating Installation Up 4evr functionality',
                category: 'testing',
                author: 'Installation Up 4evr',
                systemSettings: [
                    'screensaver', 'displaySleep', 'computerSleep', 'autoRestart', 'desktopBackground'
                ],
                launchAgents: [
                    {
                        name: 'HeartbeatApp',
                        appPath: './test-apps/HeartbeatApp',
                        displayName: 'Heartbeat Logger',
                        description: 'Simple continuous logger for basic functionality testing',
                        keepAlive: true,
                        runAtLoad: true,
                        successfulExit: true,
                        purpose: 'Tests basic launch agent functionality and continuous logging'
                    },
                    {
                        name: 'CrashSimulator',
                        appPath: './test-apps/CrashSimulator',
                        displayName: 'Crash Recovery Tester',
                        description: 'Controlled crash testing for keep-alive validation',
                        keepAlive: true,
                        runAtLoad: true,
                        successfulExit: true,
                        purpose: 'Tests launch agent restart capabilities with different failure modes'
                    },
                    {
                        name: 'ResourceDemo',
                        appPath: './test-apps/ResourceDemo',
                        displayName: 'Resource Monitoring Tester',
                        description: 'Resource consumption testing for monitoring validation',
                        keepAlive: true,
                        runAtLoad: false,
                        successfulExit: true,
                        purpose: 'Tests monitoring system accuracy and alert thresholds'
                    },
                    {
                        name: 'SimpleWebServer',
                        appPath: './test-apps/SimpleWebServer',
                        displayName: 'Network & Display Tester',
                        description: 'Network and display content testing server',
                        keepAlive: true,
                        runAtLoad: true,
                        successfulExit: true,
                        purpose: 'Tests network monitoring, connectivity, and display content serving'
                    }
                ],
                tags: ['testing', 'validation', 'demo', 'development', 'monitoring', 'crash-recovery', 'network'],
                installation: {
                    preInstall: [
                        'Ensure Node.js >=14.0.0 is installed',
                        'Verify test-apps directory exists in Installation Up 4evr folder',
                        'Run npm install in each test app directory if needed',
                        'Check that ports 8080-8083 are available for web server'
                    ],
                    postInstall: [
                        'Monitor heartbeat logs at ~/heartbeat-app.log',
                        'Check crash simulator session cycles at ~/crash-simulator.log', 
                        'Verify resource demo metrics appear in monitoring dashboard',
                        'Test web server at http://localhost:8080',
                        'Configure alert thresholds for resource monitoring',
                        'Test notification channels with resource alerts'
                    ],
                    testing: [
                        'HeartbeatApp: Verify continuous logging every 5 seconds',
                        'CrashSimulator: Watch automatic restart cycles after crashes',
                        'ResourceDemo: Confirm resource usage increases trigger alerts',
                        'SimpleWebServer: Test all endpoints and display modes',
                        'Launch Agents: Verify all 4 apps appear as running services',
                        'Monitoring: Check all apps visible in monitoring dashboard',
                        'Keep-Alive: Stop processes manually and verify automatic restart'
                    ],
                    configuration: [
                        'HeartbeatApp: No configuration needed - runs with defaults',
                        'CrashSimulator: Set CRASH_TYPES env var to test specific failure modes',
                        'ResourceDemo: Use MAX_CPU_PERCENT and MAX_MEMORY_MB to limit resource usage',
                        'SimpleWebServer: Configure WEB_PORT and CONTENT_TYPE for display needs'
                    ]
                },
                notes: [
                    'This profile installs all four test applications that demonstrate Installation Up 4evr functionality',
                    'Ideal for new users learning the system or validating installation setups',
                    'All apps include comprehensive logging and are designed to be safe for testing',
                    'ResourceDemo will gradually increase CPU/memory usage - monitor system impact',
                    'CrashSimulator will intentionally crash and restart - this is expected behavior',
                    'SimpleWebServer provides multiple endpoints for testing network monitoring',
                    'Each app can be individually configured via environment variables'
                ]
            },
            {
                name: 'Minimal Development',
                description: 'Basic setup for development and testing',
                category: 'development',
                author: 'Installation Up 4evr',
                systemSettings: [
                    'screensaver', 'displaySleep', 'computerSleep', 'desktopBackground'
                ],
                launchAgents: [],
                tags: ['development', 'testing', 'minimal'],
                installation: {
                    preInstall: [
                        'This is a minimal profile for development use',
                        'Not recommended for production installations'
                    ]
                }
            }
        ];

        const results = [];
        for (const template of templates) {
            try {
                const profile = this.createProfile(template);
                const templatePath = path.join(this.templatesDir, `${profile.id}.up4evr.json`);
                await fs.writeFile(templatePath, JSON.stringify(profile, null, 2), 'utf8');
                results.push({ success: true, profile: profile });
            } catch (error) {
                results.push({ success: false, error: error.message, template: template.name });
            }
        }

        return results;
    }

    /**
     * Get built-in templates
     */
    async getBuiltInTemplates() {
        try {
            const files = await fs.readdir(this.templatesDir);
            const templateFiles = files.filter(file => file.endsWith('.up4evr.json'));
            
            const templates = [];
            for (const file of templateFiles) {
                try {
                    const content = await fs.readFile(path.join(this.templatesDir, file), 'utf8');
                    const template = JSON.parse(content);
                    templates.push(template);
                } catch (error) {
                    console.warn(`Could not load template ${file}:`, error.message);
                }
            }
            
            return templates.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            return [];
        }
    }

    /**
     * Search profiles by criteria
     */
    async searchProfiles(criteria = {}) {
        const profiles = await this.listProfiles();
        
        return profiles.filter(profile => {
            if (criteria.category && profile.category !== criteria.category) {
                return false;
            }
            
            if (criteria.tags && criteria.tags.length > 0) {
                const hasMatchingTag = criteria.tags.some(tag => 
                    profile.tags.includes(tag)
                );
                if (!hasMatchingTag) return false;
            }
            
            if (criteria.search) {
                const searchLower = criteria.search.toLowerCase();
                const searchFields = [
                    profile.name,
                    profile.description,
                    profile.author,
                    ...(profile.tags || [])
                ].join(' ').toLowerCase();
                
                if (!searchFields.includes(searchLower)) {
                    return false;
                }
            }
            
            return true;
        });
    }
}

module.exports = ProfilesManager;