/**
 * Installation Up 4evr - Legacy Backend Server (DEPRECATED)
 * 
 * ⚠️ NOTICE: This is the legacy server implementation, preserved for reference.
 * The main server is now server-v2.js with platform abstraction support.
 * 
 * Use server-v2.js for all new development.
 * This file is maintained for fallback compatibility only.
 * 
 * Express server providing API endpoints for system automation
 */

console.log('⚠️ WARNING: You are running the LEGACY server (server-legacy.js)');
console.log('   The main server is now server-v2.js with enhanced features.');
console.log('   Please use "npm run dev" to run the new server.');
console.log('');
console.log('SERVER: Starting legacy server.js execution...');

// Note: The rest of this file contains the original server.js implementation
// It has been preserved for compatibility but is no longer the primary server

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

// Legacy modules
console.log('SERVER: Loading modules...');
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

// Initialize managers
console.log('SERVER: Initializing managers...');
const systemPrefs = new SystemPreferencesManager();
const launchAgents = new LaunchAgentManager();
const profiles = new ProfilesManager();
const monitoring = new MonitoringSystem();
const remoteControl = new RemoteControlSystem();
const notifications = new NotificationSystem();
const serviceControl = new ServiceControlManager();
const installationSettings = new InstallationSettingsManager();
console.log('SERVER: Managers initialized.');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Add CORS headers specifically for the frontend
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} (legacy mode)`);
    next();
});

// Root route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: 'legacy',
        version: '0.9.0',
        warning: 'This is the legacy server. Consider upgrading to server-v2.js for new features.'
    });
});

// System Preferences API Routes
app.get('/api/system-prefs/settings', async (req, res) => {
    try {
        const settings = systemPrefs.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/status', async (req, res) => {
    try {
        const status = await systemPrefs.checkAllSettingsStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/apply', async (req, res) => {
    try {
        const { settings } = req.body;
        const results = await systemPrefs.applySettings(settings);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/sip-status', async (req, res) => {
    try {
        const sipStatus = await systemPrefs.checkSIPStatus();
        res.json(sipStatus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/verify', async (req, res) => {
    try {
        const results = await systemPrefs.verifyAllSettings();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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

app.post('/api/launch-agents/uninstall', async (req, res) => {
    try {
        const { agentName } = req.body;
        const result = await launchAgents.uninstallLaunchAgent(agentName);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/control', async (req, res) => {
    try {
        const { agentName, action } = req.body;
        const result = await launchAgents.controlLaunchAgent(agentName, action);
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

app.delete('/api/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await profiles.deleteProfile(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/export', async (req, res) => {
    try {
        const { profileId, format } = req.body;
        const result = await profiles.exportProfile(profileId, format);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Monitoring API Routes
app.get('/api/monitoring/system', async (req, res) => {
    try {
        const systemStatus = await monitoring.getSystemStatus();
        res.json(systemStatus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/applications', async (req, res) => {
    try {
        const appStatus = await monitoring.getApplicationStatus();
        res.json(appStatus);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/applications/add', async (req, res) => {
    try {
        const { name, path, settings } = req.body;
        const result = await monitoring.addApplicationMonitor(name, path, settings);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/monitoring/applications/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const result = await monitoring.removeApplicationMonitor(name);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/start', async (req, res) => {
    try {
        const { interval } = req.body;
        const result = await monitoring.startBasicMonitoring(interval);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/stop', async (req, res) => {
    try {
        const result = await monitoring.stopBasicMonitoring();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/config', async (req, res) => {
    try {
        const config = await monitoring.getMonitoringConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/config', async (req, res) => {
    try {
        const result = await monitoring.updateMonitoringConfig(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remote Control API Routes
app.get('/api/remote/status', async (req, res) => {
    try {
        const status = await remoteControl.getSystemStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/remote/command', async (req, res) => {
    try {
        const { command, args } = req.body;
        const result = await remoteControl.executeCommand(command, args);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Notification API Routes
app.get('/api/notifications/config', async (req, res) => {
    try {
        const config = await notifications.getNotificationConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications/config', async (req, res) => {
    try {
        const result = await notifications.updateNotificationConfig(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications/test', async (req, res) => {
    try {
        const { channel, message } = req.body;
        const result = await notifications.sendTestNotification(channel, message);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Installation Settings API Routes
app.get('/api/installation/settings', async (req, res) => {
    try {
        const settings = await installationSettings.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/installation/settings', async (req, res) => {
    try {
        const result = await installationSettings.updateSettings(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Service Control API Routes
app.get('/api/service/status', async (req, res) => {
    try {
        const status = await serviceControl.getServiceStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service/install', async (req, res) => {
    try {
        const result = await serviceControl.installSystemService();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service/uninstall', async (req, res) => {
    try {
        const result = await serviceControl.uninstallSystemService();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function startServer() {
    try {
        // Initialize monitoring
        console.log('[INFO] Starting monitoring system...');
        try {
            await monitoring.startBasicMonitoring();
            console.log('📊 Monitoring system started');
        } catch (error) {
            console.warn('Failed to start monitoring:', error.message);
        }

        // Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Installation Up 4evr LEGACY server running on http://localhost:${PORT}`);
            console.log(`📊 Mode: legacy (v0.9.0)`);
            console.log(`⚠️  WARNING: This is the legacy server. Consider upgrading to server-v2.js`);
            console.log(`Frontend available at: http://localhost:${PORT}`);
            console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
        });

    } catch (error) {
        console.error('[SERVER] Failed to start:', error);
        process.exit(1);
    }
}

// Graceful shutdown
async function shutdown() {
    console.log('[SERVER] Shutting down...');
    await monitoring.stopBasicMonitoring();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer().catch(error => {
    console.error('[SERVER] Startup failed:', error);
    process.exit(1);
});