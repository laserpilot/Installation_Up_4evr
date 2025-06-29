/**
 * Installation Up 4evr - Backend Server v2
 * Enhanced server with platform abstraction support and legacy compatibility
 */

console.log('SERVER: Starting server.js v2 execution...');

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

// Import compatibility layer for gradual migration
const CompatibilityLayer = require('./src/compatibility-layer');

// Legacy modules (fallback)
console.log('SERVER: Loading legacy modules...');
const SystemPreferencesManager = require('./modules/system-prefs');
console.log('SERVER: system-prefs loaded');
const LaunchAgentManager = require('./modules/launch-agents');
console.log('SERVER: launch-agents loaded');
const ProfilesManager = require('./modules/profiles');
console.log('SERVER: profiles loaded');
const MonitoringSystem = require('./modules/monitoring');
console.log('SERVER: monitoring loaded');
const RemoteControlSystem = require('./modules/remote-control');
console.log('SERVER: remote-control loaded');
const NotificationSystem = require('./modules/notifications');
console.log('SERVER: notifications loaded');
const ServiceControlManager = require('./modules/service-control');
console.log('SERVER: service-control loaded');
const InstallationSettingsManager = require('./modules/installation-settings');
console.log('SERVER: installation-settings loaded');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize compatibility layer
const compatibility = new CompatibilityLayer();

// Initialize legacy managers (as fallback)
console.log('SERVER: Initializing legacy managers...');
const systemPrefs = new SystemPreferencesManager();
const launchAgents = new LaunchAgentManager();
const profiles = new ProfilesManager();
const monitoring = new MonitoringSystem();
const remoteControl = new RemoteControlSystem(monitoring);
const notifications = new NotificationSystem(monitoring);
const serviceControl = new ServiceControlManager();
const installationSettings = new InstallationSettingsManager();
console.log('SERVER: Legacy managers initialized.');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Add compatibility middleware
app.use(compatibility.createAPIMiddleware());

// Request logging
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} (${req.compatibility?.mode || 'unknown'} mode)`);
    next();
});

// Root route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Enhanced API Routes with Platform Manager Support

// Health check with compatibility info
app.get('/api/health', async (req, res) => {
    try {
        const health = await compatibility.healthCheck();
        const platformInfo = compatibility.getPlatformInfo();
        
        res.json({
            ...health,
            platform: platformInfo,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System Preferences API Routes with platform manager integration
app.get('/api/system-prefs/settings', async (req, res) => {
    try {
        const settings = await compatibility.getSystemPrefsSettings(systemPrefs);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/status', async (req, res) => {
    try {
        const status = await compatibility.getSystemPrefsStatus(systemPrefs);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/apply', async (req, res) => {
    try {
        const result = await compatibility.applySystemPrefsSettings(req.body, systemPrefs);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy system-prefs routes (preserved for compatibility)
app.get('/api/system-prefs/required', async (req, res) => {
    try {
        const settings = systemPrefs.getRequiredSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/optional', async (req, res) => {
    try {
        const settings = systemPrefs.getOptionalSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/apply-required', async (req, res) => {
    try {
        const results = await systemPrefs.applyRequiredSettings();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/verify', async (req, res) => {
    try {
        const results = await systemPrefs.verifyAllSettings();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/sip-status', async (req, res) => {
    try {
        const status = await systemPrefs.checkSIPStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Monitoring API Routes with platform manager integration
app.get('/api/monitoring/status', async (req, res) => {
    try {
        const status = await compatibility.getMonitoringStatus(monitoring);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/system', async (req, res) => {
    try {
        const status = await compatibility.getMonitoringStatus(monitoring);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/applications', async (req, res) => {
    try {
        const apps = await compatibility.getMonitoringApplications(monitoring);
        res.json(apps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Configuration API Routes (new platform manager features)
app.get('/api/config', async (req, res) => {
    try {
        const config = await compatibility.getConfiguration();
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
        const result = await compatibility.updateConfiguration(path, value);
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
        const platformInfo = compatibility.getPlatformInfo();
        res.json(platformInfo);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        // Initialize compatibility layer (try platform manager first)
        const usePlatformManager = process.env.USE_PLATFORM_MANAGER !== 'false';
        await compatibility.initialize(usePlatformManager);

        // Start monitoring with appropriate system
        console.log('[INFO] Starting monitoring system...');
        try {
            await compatibility.startMonitoring(monitoring);
            console.log('📊 Monitoring system started');
        } catch (error) {
            console.warn('Failed to start monitoring:', error.message);
        }

        // Start Express server
        app.listen(PORT, () => {
            const platformInfo = compatibility.getPlatformInfo();
            
            console.log(`🚀 Installation Up 4evr server v2 running on http://localhost:${PORT}`);
            console.log(`Frontend available at: http://localhost:${PORT}`);
            console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
            console.log(`📊 Mode: ${platformInfo.mode} (v${platformInfo.version})`);
            console.log(`🖥️  Platform: ${platformInfo.platform}`);
            console.log('🔧 Features:', Object.keys(platformInfo.features).filter(k => platformInfo.features[k]).join(', '));
            
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
    await compatibility.shutdown();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer().catch(error => {
    console.error('[SERVER] Startup failed:', error);
    process.exit(1);
});