/**
 * Installation Up 4evr - Backend Server
 * Modern platform abstraction architecture - Alpha v1.0.0
 * 
 * This server uses the new platform abstraction layer for cross-platform compatibility.
 * Legacy modules have been moved to backend/legacy/ for reference.
 */

console.log('SERVER: Starting server execution...');

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('SERVER ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('SERVER ERROR: Uncaught Exception:', error);
});

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import modern platform architecture
console.log('SERVER: Loading platform management system...');
const PlatformManager = require('./src/core/platform-manager');
console.log('SERVER: Platform manager loaded');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize platform manager
console.log('SERVER: Initializing platform manager...');
const platformManager = new PlatformManager();
console.log('SERVER: Platform manager initialized.');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Request logging
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} (platform mode)`);
    next();
});

// Root route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Authentication endpoints for sudo access
const sudo = require('@expo/sudo-prompt');

app.get('/api/auth/sudo-status', async (req, res) => {
    try {
        // Check if we have recent sudo credentials cached
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            // Test if we can run a simple sudo command without password prompt
            // Using -n flag to make sudo fail rather than prompt for password
            await execAsync('sudo -n true', { timeout: 3000 });
            
            res.json({
                success: true,
                hasSudoAccess: true,
                message: 'Administrator access is available',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // If sudo -n fails, we don't have cached credentials
            res.json({
                success: true,
                hasSudoAccess: false,
                message: 'Administrator access required',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to check sudo status',
            details: error.message
        });
    }
});

app.post('/api/auth/sudo-grant', async (req, res) => {
    try {
        const { password, method } = req.body;
        
        // Detect if we're in Electron vs Browser environment
        const isElectron = process.env.ELECTRON_RUN_AS_NODE || 
                          process.versions.electron ||
                          req.headers['user-agent']?.includes('Electron');
        
        if (method === 'native' || (isElectron && !password)) {
            // Method 1: Use native @expo/sudo-prompt (Electron/Native)
            console.log('[AUTH] Using native authentication method');
            console.log('[AUTH] Is Electron detected:', isElectron);
            console.log('[AUTH] Method requested:', method);
            
            const options = {
                name: 'Installation Up 4evr',
                icns: '/Applications/Utilities/Terminal.app/Contents/Resources/Terminal.icns'
            };
            
            const command = 'true'; // Simple command that just returns success
            
            console.log('[AUTH] Calling sudo.exec with options:', options);
            sudo.exec(command, options, (error, stdout, stderr) => {
                console.log('[AUTH] sudo.exec callback - error:', error);
                console.log('[AUTH] sudo.exec callback - stdout:', stdout);
                console.log('[AUTH] sudo.exec callback - stderr:', stderr);
                if (error) {
                    if (error.message.includes('User did not grant permission') || 
                        error.message.includes('cancelled')) {
                        return res.status(401).json({
                            success: false,
                            error: 'Authentication cancelled',
                            message: 'User cancelled administrator access request',
                            method: 'native'
                        });
                    } else {
                        return res.status(401).json({
                            success: false,
                            error: 'Authentication failed',
                            message: 'Invalid administrator password or insufficient privileges',
                            method: 'native'
                        });
                    }
                }
                
                res.json({
                    success: true,
                    message: 'Administrator access granted via native dialog',
                    method: 'native',
                    timestamp: new Date().toISOString()
                });
            });
            
        } else if (password) {
            // Method 2: Password-based authentication (Browser fallback)
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            try {
                // Test the password by running a simple sudo command
                await execAsync(`echo "${password}" | sudo -S true`, { timeout: 5000 });
                
                res.json({
                    success: true,
                    message: 'Administrator access granted via password',
                    method: 'password',
                    securityWarning: 'Password authentication is less secure than native dialog',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication failed',
                    message: 'Invalid administrator password or insufficient privileges',
                    method: 'password'
                });
            }
        } else {
            // No password provided and not in native environment
            res.status(400).json({
                success: false,
                error: 'Authentication method required',
                message: 'Either provide password or use native authentication method',
                supportedMethods: ['native', 'password'],
                isElectron: isElectron
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to process authentication',
            details: error.message
        });
    }
});

// Enhanced API Routes with Platform Manager Support

// Platform manager route handler (priority routing for new features)
app.all('/api/*', async (req, res, next) => {
    try {
        const apiPath = req.path.replace('/api', '');
        const method = req.method;
        const data = method === 'GET' ? req.query : req.body;
        
        console.log(`[API] ${method} ${req.path} (platform mode)`);
        const result = await platformManager.handleAPIRequest(apiPath, method, data);
        
        if (result.success) {
            res.json(result);
            return; // Don't fall through to legacy routes
        } else if (result.error?.code === 'ROUTE_NOT_FOUND') {
            // Route not found in platform manager, try legacy routes
            next();
        } else {
            // Other errors should be returned immediately
            res.status(result.error?.status || 500).json(result);
            return;
        }
    } catch (error) {
        console.warn(`[API] Platform manager error for ${method} ${req.path}:`, error.message);
        // Fall through to legacy routes on error
        next();
    }
});

// Health check route
app.get('/api/health', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/health', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Terminal Script Generator API Route
app.post('/api/system-prefs/generate-script', async (req, res) => {
    try {
        const { settings = [], mode = 'apply', includeVerification = true } = req.body;
        
        console.log('[SCRIPT-GEN] Generating terminal script for settings:', settings);
        
        // Get the system manager from platform manager
        const systemManager = platformManager.getSystemManager();
        
        if (!systemManager || !systemManager.generateTerminalScript) {
            throw new Error('System manager or script generator not available');
        }
        
        const result = systemManager.generateTerminalScript(settings, {
            mode,
            includeVerification
        });
        
        if (result.success) {
            res.json({
                success: true,
                data: {
                    script: result.script,
                    settingsCount: result.settingsCount,
                    categories: result.categories,
                    timestamp: result.timestamp,
                    mode: result.mode
                },
                message: `Generated script for ${result.settingsCount} settings`
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                message: 'Failed to generate script'
            });
        }
    } catch (error) {
        console.error('[SCRIPT-GEN] Error generating script:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Server error generating script'
        });
    }
});

// System Preferences API Routes with platform manager integration
app.get('/api/system-prefs/settings', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings', 'GET');
        const settings = result.data;
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/status', async (req, res) => {
    try {
        // Use platform manager for system status
        const result = await platformManager.handleAPIRequest('/system/settings/status', 'GET');
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/apply', async (req, res) => {
    try {
        // Use platform manager for applying settings
        const result = await platformManager.handleAPIRequest('/system/settings/apply', 'POST', req.body);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy system-prefs routes (preserved for compatibility)
app.get('/api/system-prefs/required', async (req, res) => {
    try {
        // Get all settings and filter for required ones
        const result = await platformManager.handleAPIRequest('/system/settings', 'GET');
        if (result.success) {
            const requiredSettings = Object.entries(result.data)
                .filter(([key, setting]) => setting.required)
                .reduce((acc, [key, setting]) => {
                    acc[key] = setting;
                    return acc;
                }, {});
            res.json(requiredSettings);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/optional', async (req, res) => {
    try {
        // Get all settings and filter for optional ones
        const result = await platformManager.handleAPIRequest('/system/settings', 'GET');
        if (result.success) {
            const optionalSettings = Object.entries(result.data)
                .filter(([key, setting]) => !setting.required)
                .reduce((acc, [key, setting]) => {
                    acc[key] = setting;
                    return acc;
                }, {});
            res.json(optionalSettings);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/apply-required', async (req, res) => {
    try {
        // Get all settings and filter for required ones, then apply them
        const settingsResult = await platformManager.handleAPIRequest('/system/settings', 'GET');
        if (!settingsResult.success) {
            return res.status(500).json({ error: settingsResult.error });
        }
        
        const requiredSettingKeys = Object.entries(settingsResult.data)
            .filter(([key, setting]) => setting.required)
            .map(([key]) => key);
            
        const result = await platformManager.handleAPIRequest('/system/settings/apply', 'POST', { 
            settings: requiredSettingKeys 
        });
        res.json(result.success ? result : { error: result.error });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/verify', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/status', 'GET');
        res.json(result.success ? result : { error: result.error });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/sip-status', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/sip-status', 'GET');
        res.json(result.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Monitoring API Routes with platform manager integration
app.get('/api/monitoring/status', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/monitoring/status', 'GET');
        res.json(result.success ? result.data : { error: result.error });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/system', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/monitoring/status', 'GET');
        if (result.success) {
            res.json(result.data || {});
        } else {
            res.status(500).json({ error: result.error || 'Failed to get system data' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/applications', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/monitoring/applications', 'GET');
        if (result.success) {
            res.json(result.data || []);
        } else {
            res.status(500).json({ error: result.error || 'Failed to get applications data' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Missing Monitoring endpoints
app.get('/api/monitoring/alerts', async (req, res) => {
    try {
        // For now, return empty alerts since the platform manager doesn't expose alerts directly
        // The monitoring system generates alerts in the console but doesn't store them in a queryable way
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/app-health', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/monitoring/app-health', 'GET');
        res.json(result.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/config', async (req, res) => {
    try {
        const config = monitoring.config;
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/config', async (req, res) => {
    try {
        const { config } = req.body;
        // Update monitoring configuration
        Object.assign(monitoring.config, config);
        res.json({ success: true, message: 'Configuration updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/defaults', async (req, res) => {
    try {
        const defaults = {
            interval: 30000,
            alertThreshold: 85,
            retainLogs: 7,
            enableNotifications: true
        };
        res.json({ success: true, defaults });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/simulate-load', async (req, res) => {
    try {
        const { type, duration = 5000 } = req.body;
        res.json({ 
            success: true, 
            message: `Simulating ${type} load for ${duration}ms`,
            note: 'Load simulation not implemented in this demo'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/test-app', async (req, res) => {
    try {
        const { appName } = req.body;
        const status = await monitoring.getAppStatus(appName);
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/test-alert/:type', async (req, res) => {
    try {
        const { type } = req.params;
        res.json({ 
            success: true, 
            message: `Test alert of type ${type} sent`,
            note: 'Alert testing not fully implemented in this demo'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Configuration API Routes (new platform manager features)
app.get('/api/config', async (req, res) => {
    try {
        const config = await platformManager.handleAPIRequest("/config", "GET");
        res.json(config);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            note: 'Configuration management requires platform manager mode'
        });
    }
});

app.put('/api/config', async (req, res) => {
    try {
        const { path, value } = req.body;
        const result = await platformManager.handleAPIRequest("/config", "PUT")(path, value);
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            note: 'Configuration management requires platform manager mode'
        });
    }
});

// Platform information endpoint
app.get('/api/platform', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/platform', 'GET');
        const platformInfo = result.data;
        res.json(platformInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User preferences endpoints for first-run detection
app.get('/api/config/user-preferences', async (req, res) => {
    try {
        if (true) {
            const config = platformManager.getConfig();
            const preferences = config.get('userPreferences') || {};
            res.json({ success: true, data: preferences });
        } else {
            // Legacy mode - return default preferences
            res.json({ 
                success: true, 
                data: {
                    skipWizard: false,
                    defaultView: 'dashboard',
                    showTooltips: true,
                    confirmActions: true
                }
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

app.post('/api/config/user-preferences', async (req, res) => {
    try {
        if (true) {
            const config = platformManager.getConfig();
            const currentPrefs = config.get('userPreferences') || {};
            const updatedPrefs = { ...currentPrefs, ...req.body };
            
            await config.update('userPreferences', updatedPrefs);
            res.json({ 
                success: true, 
                message: 'User preferences updated',
                data: updatedPrefs
            });
        } else {
            console.warn('[LEGACY] User preferences update not supported in legacy mode');
            res.json({ 
                success: false, 
                message: 'User preferences management requires platform manager mode',
                note: 'Preferences not persisted in legacy mode'
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// All other legacy routes preserved exactly as they were...
// (Launch Agents, Profiles, Notifications, Remote Control, etc.)

// Launch Agents API Routes
app.get('/api/launch-agents', async (req, res) => {
    try {
        const agents = await launchAgents.listLaunchAgents();
        res.json(agents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/create', async (req, res) => {
    try {
        const { appPath, options } = req.body;
        const result = await launchAgents.createLaunchAgent(appPath, options);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/install', async (req, res) => {
    try {
        const { plistPath } = req.body;
        const result = await launchAgents.installLaunchAgent(plistPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Missing Launch Agents endpoints
app.get('/api/launch-agents/list', async (req, res) => {
    try {
        const agents = await launchAgents.listLaunchAgents();
        res.json(agents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/launch-agents/status', async (req, res) => {
    try {
        const status = await launchAgents.getLaunchAgentStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/app-info', async (req, res) => {
    try {
        const { appPath } = req.body;
        const appInfo = await launchAgents.getAppInfo(appPath);
        res.json(appInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Profiles API Routes
app.get('/api/profiles', async (req, res) => {
    try {
        const profilesList = await profiles.listProfiles();
        res.json(profilesList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/save', async (req, res) => {
    try {
        const { name, description, settings } = req.body;
        const result = await profiles.saveProfile(name, description, settings);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/load', async (req, res) => {
    try {
        const { profileId } = req.body;
        const result = await profiles.loadProfile(profileId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('[SERVER ERROR]:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        mode: req.compatibility?.mode || 'unknown',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        method: req.method,
        mode: req.compatibility?.mode || 'unknown'
    });
});

// Server startup
async function startServer() {
    try {
        // Initialize platform manager
        console.log('[PLATFORM] Initializing platform manager...');
        await platformManager.initialize();
        console.log('[PLATFORM] Platform manager ready');

        // Start monitoring system
        console.log('[INFO] Starting monitoring system...');
        try {
            const monitoring = platformManager.getMonitoring();
            await monitoring.startMonitoring();
            console.log('📊 Monitoring system started');
        } catch (error) {
            console.warn('Failed to start monitoring:', error.message);
        }

        // Health scoring route
        app.get('/api/health-score', async (req, res) => {
            try {
                const result = await platformManager.handleAPIRequest('/health/score', 'GET');
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Test validation workflow route
        app.post('/api/validation-test', async (req, res) => {
            try {
                if (true) {
                    const result = await platformManager.handleAPIRequest('/validation/run', 'POST', req.body);
                    res.json(result);
                } else {
                    res.status(501).json({ error: 'Validation workflow requires platform manager mode' });
                }
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });


        // Get platform info for startup message
        let platformInfo = { platform: 'macos', mode: 'platform', version: '1.0.0-alpha.1', features: {} };
        try {
            const platformResult = await platformManager.handleAPIRequest('/platform', 'GET');
            platformInfo = platformResult.data;
        } catch (error) {
            console.warn('Could not get platform info:', error.message);
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Installation Up 4evr server running on http://localhost:${PORT}`);
            console.log(`Frontend available at: http://localhost:${PORT}`);
            console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
            console.log(`📊 Mode: ${platformInfo.mode} (v${platformInfo.version})`);
            console.log(`🖥️  Platform: ${platformInfo.platform}`);
            console.log('🔧 Features:', Object.keys(platformInfo.features || {}).filter(k => platformInfo.features[k]).join(', '));
            
            if (platformInfo.mode === 'platform') {
                console.log('✨ Platform abstraction active - ready for cross-platform expansion');
            } else {
                console.log('⚙️  Legacy mode active - set USE_PLATFORM_MANAGER=true to enable new features');
            }
        });

    } catch (error) {
        console.error('[SERVER] Failed to start:', error);
        process.exit(1);
    }
}

// Graceful shutdown
async function shutdown() {
    console.log('[SERVER] Shutting down...');
    // Platform manager cleanup if needed
    console.log('[SERVER] Shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer().catch(error => {
    console.error('[SERVER] Startup failed:', error);
    process.exit(1);
});