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

// API Routes
const authRoutes = require('./routes/auth');
const systemRoutes = require('./routes/system')(platformManager);
const monitoringRoutes = require('./routes/monitoring')(platformManager);
const profilesRoutes = require('./routes/profiles');
const configRoutes = require('./routes/config')(platformManager);
const platformRoutes = require('./routes/platform')(platformManager);
const healthRoutes = require('./routes/health')(platformManager);
const validationRoutes = require('./routes/validation')(platformManager);
const notificationRoutes = require('./routes/notifications')(platformManager);

app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/notifications', notificationRoutes);

// Legacy compatibility routes for system-prefs (redirect to new system routes)
app.get('/api/system-prefs/settings', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/status', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/status', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/verify', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/verify', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/apply', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/apply', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/apply-required', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/apply-required', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/generate-commands', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/generate-commands', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system-prefs/generate-commands', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/generate-commands', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/system-prefs/generate-restore', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/system/settings/generate-restore', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Launch Agents API Routes
app.get('/api/launch-agents/list', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/list', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/launch-agents/status', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/status', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/create', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/create', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/install', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/install', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/remove', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/remove', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/app-info', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/app-info', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/test', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/test', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/launch-agents/export', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/launch-agents/export', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Installation Settings API Routes
app.get('/api/installation/settings', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/installation/settings', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/installation/settings', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/installation/settings', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/installation/test', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/installation/settings/test', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Setup Wizard API endpoints
app.get('/api/setup-wizard/system-check', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/setup-wizard/system-check', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/setup-wizard/essential-settings', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/setup-wizard/essential-settings', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/setup-wizard/apply-settings', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/setup-wizard/apply-settings', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/setup-wizard/run-tests', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/setup-wizard/run-tests', 'POST', req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/setup-wizard/verification', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/setup-wizard/verification', 'GET');
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/setup-wizard/summary', async (req, res) => {
    try {
        const result = await platformManager.handleAPIRequest('/setup-wizard/summary', 'GET');
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
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path,
        method: req.method
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

        // Get platform info for startup message
        let platformInfo = { platform: 'macos', mode: 'platform', version: '1.0.0-alpha.2', features: {} };
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