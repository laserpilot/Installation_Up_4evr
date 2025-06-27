/**
 * Installation Up 4evr - Backend Server
 * Express server providing API endpoints for system automation
 */

console.log('SERVER: Starting server.js execution...');

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Initialize managers
console.log('SERVER: Initializing managers...');
const systemPrefs = new SystemPreferencesManager();
const launchAgents = new LaunchAgentManager();
const profiles = new ProfilesManager();
const monitoring = new MonitoringSystem();
const remoteControl = new RemoteControlSystem(monitoring);
const notifications = new NotificationSystem(monitoring);
const serviceControl = new ServiceControlManager();
const installationSettings = new InstallationSettingsManager();
console.log('SERVER: Managers initialized.');

// Root route - serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
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

app.post('/api/system-prefs/apply', async (req, res) => {
    try {
        const { settings } = req.body;
        const results = await systemPrefs.applySettings(settings);
        res.json(results);
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

// New status checking endpoint (read-only)
app.get('/api/system-prefs/status', async (req, res) => {
    try {
        const results = await systemPrefs.checkAllSettingsStatus();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Revert settings endpoint
app.post('/api/system-prefs/revert', async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || !Array.isArray(settings)) {
            return res.status(400).json({ error: 'Settings array is required' });
        }
        
        const results = await systemPrefs.revertSettings(settings);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Individual setting revert
app.post('/api/system-prefs/revert/:settingId', async (req, res) => {
    try {
        const { settingId } = req.params;
        const result = await systemPrefs.revertSetting(settingId);
        res.json(result);
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

app.get('/api/system-prefs/report', async (req, res) => {
    try {
        const report = await systemPrefs.generateSystemReport();
        res.json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Launch Agent API Routes
app.post('/api/launch-agents/create', async (req, res) => {
    try {
        const { appPath, options = {} } = req.body;
        const result = await launchAgents.createLaunchAgent(appPath, options);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/install', async (req, res) => {
    try {
        const { appPath, options = {} } = req.body;
        const result = await launchAgents.installLaunchAgent(appPath, options);
        res.json(result);
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

app.post('/api/launch-agents/load', async (req, res) => {
    try {
        const { labelOrPath } = req.body;
        const result = await launchAgents.loadLaunchAgent(labelOrPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/unload', async (req, res) => {
    try {
        const { labelOrPath } = req.body;
        const result = await launchAgents.unloadLaunchAgent(labelOrPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/launch-agents/:labelOrFilename', async (req, res) => {
    try {
        const { labelOrFilename } = req.params;
        const result = await launchAgents.deleteLaunchAgent(labelOrFilename);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/launch-agents/:labelOrFilename/info', async (req, res) => {
    try {
        const { labelOrFilename } = req.params;
        const info = await launchAgents.getLaunchAgentInfo(labelOrFilename);
        res.json(info);
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

app.get('/api/profiles/templates', async (req, res) => {
    try {
        const templates = await profiles.getBuiltInTemplates();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/templates/create', async (req, res) => {
    try {
        const results = await profiles.createBuiltInTemplates();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/profiles/search', async (req, res) => {
    try {
        const { category, tags, search } = req.query;
        const criteria = {};
        
        if (category) criteria.category = category;
        if (tags) criteria.tags = Array.isArray(tags) ? tags : [tags];
        if (search) criteria.search = search;
        
        const results = await profiles.searchProfiles(criteria);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles', async (req, res) => {
    try {
        const profileData = req.body;
        const profile = profiles.createProfile(profileData);
        const result = await profiles.saveProfile(profile);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/profiles/:profileId', async (req, res) => {
    try {
        const { profileId } = req.params;
        const result = await profiles.loadProfile(profileId);
        res.json(result.profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/profiles/:profileId', async (req, res) => {
    try {
        const { profileId } = req.params;
        const updates = req.body;
        
        const loadResult = await profiles.loadProfile(profileId);
        if (!loadResult.success) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        
        const updatedProfile = { ...loadResult.profile, ...updates };
        const result = await profiles.saveProfile(updatedProfile);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/profiles/:profileId', async (req, res) => {
    try {
        const { profileId } = req.params;
        const result = await profiles.deleteProfile(profileId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/:profileId/duplicate', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { newName } = req.body;
        const result = await profiles.duplicateProfile(profileId, newName);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/:profileId/export', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { exportPath } = req.body;
        const result = await profiles.exportProfile(profileId, exportPath);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/import', async (req, res) => {
    try {
        const { importPath, options = {} } = req.body;
        const result = await profiles.importProfile(importPath, options);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/profiles/:profileId/apply', async (req, res) => {
    try {
        const { profileId } = req.params;
        const loadResult = await profiles.loadProfile(profileId);
        
        if (!loadResult.success) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        
        const profile = loadResult.profile;
        const results = {
            profile: profile,
            systemSettings: [],
            launchAgents: []
        };
        
        // Apply system settings
        const enabledSettings = profile.systemSettings
            .filter(setting => setting.enabled)
            .map(setting => setting.id);
        
        if (enabledSettings.length > 0) {
            const settingsResults = await systemPrefs.applySettings(enabledSettings);
            results.systemSettings = settingsResults;
        }
        
        // Create launch agents
        for (const agentConfig of profile.launchAgents) {
            if (agentConfig.enabled) {
                try {
                    const agentResult = await launchAgents.installLaunchAgent(
                        agentConfig.appPath, 
                        agentConfig.options
                    );
                    results.launchAgents.push(agentResult);
                } catch (error) {
                    results.launchAgents.push({
                        success: false,
                        name: agentConfig.name,
                        error: error.message
                    });
                }
            }
        }
        
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Monitoring API Routes
app.get('/api/monitoring/status', (req, res) => {
    try {
        const data = monitoring.getMonitoringData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/health', (req, res) => {
    try {
        const health = monitoring.getHealthSummary();
        res.json(health);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/start', (req, res) => {
    try {
        const { interval = 30000 } = req.body;
        monitoring.startMonitoring(interval);
        res.json({ success: true, message: 'Monitoring started', interval });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/stop', (req, res) => {
    try {
        monitoring.stopMonitoring();
        res.json({ success: true, message: 'Monitoring stopped' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/watch-app', (req, res) => {
    try {
        const { appName, config = {} } = req.body;
        monitoring.addWatchedApplication(appName, config);
        res.json({ success: true, message: `Added ${appName} to monitoring` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/monitoring/watch-app/:appName', (req, res) => {
    try {
        const { appName } = req.params;
        monitoring.removeWatchedApplication(appName);
        res.json({ success: true, message: `Removed ${appName} from monitoring` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/logs', async (req, res) => {
    try {
        const { hours = 24, level } = req.query;
        const logs = await monitoring.getRecentLogs(parseInt(hours), level);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/monitoring/alerts/:alertId/acknowledge', (req, res) => {
    try {
        const { alertId } = req.params;
        const alert = monitoring.acknowledgeAlert(alertId);
        if (alert) {
            res.json({ success: true, alert });
        } else {
            res.status(404).json({ error: 'Alert not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/app-health', (req, res) => {
    try {
        const healthScores = {};
        const watchedApps = monitoring.getWatchedApplications();
        
        watchedApps.forEach(appName => {
            healthScores[appName] = monitoring.getAppHealthScore(appName);
        });
        
        res.json(healthScores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/app-health/:appName', (req, res) => {
    try {
        const { appName } = req.params;
        const healthScore = monitoring.getAppHealthScore(appName);
        res.json(healthScore);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remote Control API Routes
app.post('/api/remote-control/command', async (req, res) => {
    try {
        const { command, parameters = {}, sessionId } = req.body;
        const result = await remoteControl.executeCommand(command, parameters, sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/remote-control/capabilities', (req, res) => {
    try {
        const capabilities = remoteControl.getControlCapabilities();
        res.json(capabilities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/remote-control/session', (req, res) => {
    try {
        const { userId, permissions = [] } = req.body;
        const session = remoteControl.createControlSession(userId, permissions);
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/remote-control/session/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const success = remoteControl.endControlSession(sessionId);
        res.json({ success, message: success ? 'Session ended' : 'Session not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Notification API Routes
app.get('/api/notifications/channels', (req, res) => {
    try {
        const channels = notifications.getChannels();
        res.json(channels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications/channels', (req, res) => {
    try {
        const { name, config } = req.body;
        notifications.addChannel(name, config);
        res.json({ success: true, message: `Channel ${name} added` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notifications/channels/:name', (req, res) => {
    try {
        const { name } = req.params;
        const success = notifications.removeChannel(name);
        res.json({ success, message: success ? 'Channel removed' : 'Channel not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications/send', async (req, res) => {
    try {
        const { message, options = {} } = req.body;
        const result = await notifications.sendNotification(message, options);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/notifications/test/:channelName', async (req, res) => {
    try {
        const { channelName } = req.params;
        const result = await notifications.testChannel(channelName);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/notifications/stats', (req, res) => {
    try {
        const stats = notifications.getNotificationStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Service Control API Routes
app.get('/api/service/status', async (req, res) => {
    try {
        const status = await serviceControl.getServiceStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting service status:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service/restart', async (req, res) => {
    try {
        const result = await serviceControl.restartService();
        res.json(result);
    } catch (error) {
        console.error('Error restarting service:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service/stop', async (req, res) => {
    try {
        const result = await serviceControl.stopService();
        res.json(result);
    } catch (error) {
        console.error('Error stopping service:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service/start', async (req, res) => {
    try {
        const result = await serviceControl.startService();
        res.json(result);
    } catch (error) {
        console.error('Error starting service:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service/install', async (req, res) => {
    try {
        const result = await serviceControl.installSystemService();
        res.json(result);
    } catch (error) {
        console.error('Error installing service:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/service/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await serviceControl.getServiceLogs(limit);
        res.json(logs);
    } catch (error) {
        console.error('Error getting service logs:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/service/logs', async (req, res) => {
    try {
        const result = await serviceControl.clearServiceLogs();
        res.json(result);
    } catch (error) {
        console.error('Error clearing service logs:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/service/system-service', async (req, res) => {
    try {
        const status = await serviceControl.checkSystemService();
        res.json(status);
    } catch (error) {
        console.error('Error checking system service:', error);
        res.status(500).json({ error: error.message });
    }
});

// Installation Settings API Routes
app.get('/api/installation/settings', async (req, res) => {
    try {
        const result = await installationSettings.getSettings();
        res.json(result);
    } catch (error) {
        console.error('Error getting installation settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/installation/settings', async (req, res) => {
    try {
        const settings = req.body;
        const result = await installationSettings.updateSettings(settings);
        res.json(result);
    } catch (error) {
        console.error('Error updating installation settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/installation/test', async (req, res) => {
    try {
        const settings = req.body;
        const result = await installationSettings.testSettings(settings);
        res.json(result);
    } catch (error) {
        console.error('Error testing installation settings:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/installation/profiles', async (req, res) => {
    try {
        const result = await installationSettings.listProfiles();
        res.json(result);
    } catch (error) {
        console.error('Error listing installation profiles:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/installation/profiles', async (req, res) => {
    try {
        const { name, settings } = req.body;
        if (!name || !settings) {
            return res.status(400).json({ error: 'Profile name and settings are required' });
        }
        const result = await installationSettings.saveProfile(name, settings);
        res.json(result);
    } catch (error) {
        console.error('Error saving installation profile:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/installation/profiles/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const result = await installationSettings.loadProfile(name);
        res.json(result);
    } catch (error) {
        console.error('Error loading installation profile:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/installation/profiles/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const result = await installationSettings.deleteProfile(name);
        res.json(result);
    } catch (error) {
        console.error('Error deleting installation profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR: Express error handler caught:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Initialize monitoring system
monitoring.startMonitoring(30000); // 30 second intervals

// Add some example notification channels (can be configured via API)
// notifications.addChannel('console', {
//     type: 'webhook',
//     url: 'http://localhost:3001/api/test-webhook',
//     enabled: false
// });

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Installation Up 4evr server running on http://localhost:${PORT}`);
    console.log(`Frontend available at: http://localhost:${PORT}`);
    console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
    console.log(`📊 Monitoring system started with 30s intervals`);
    console.log(`🔧 Remote control system ready`);
    console.log(`📢 Notification system initialized`);
    console.log('SERVER: Express app listening successfully.');
    console.log(`__BACKEND_READY__`); // Specific signal for Electron startup detection
});

// Add a handler for process exit
process.on('exit', (code) => {
    console.log(`SERVER: Process is about to exit with code: ${code}`);
});

// Add handlers for common termination signals
process.on('SIGTERM', () => {
    console.log('SERVER: Received SIGTERM signal. Closing server...');
    server.close(() => {
        console.log('SERVER: HTTP server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SERVER: Received SIGINT signal. Closing server...');
    server.close(() => {
        console.log('SERVER: HTTP server closed.');
        process.exit(0);
    });
});

module.exports = app;