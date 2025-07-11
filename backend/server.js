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
  console.error(
    'SERVER ERROR: Unhandled Rejection at:',
    promise,
    'reason:',
    reason
  );
});

// Catch uncaught exceptions
process.on('uncaughtException', error => {
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
// Fix path resolution for packaged vs development
let frontendPath;
if (__dirname.includes('.app/Contents/Resources')) {
  // In packaged Electron app, frontend files are in extraResources
  frontendPath = path.join(__dirname, '../frontend');
} else {
  // In development
  frontendPath = path.join(__dirname, '../frontend');
}

console.log('SERVER: Serving static files from:', frontendPath);
console.log('SERVER: __dirname is:', __dirname);
console.log(
  'SERVER: Frontend path exists:',
  require('fs').existsSync(frontendPath)
);

// Also log the contents of the parent directory to debug
try {
  const parentDir = path.dirname(__dirname);
  console.log(
    'SERVER: Parent directory contents:',
    require('fs').readdirSync(parentDir)
  );
} catch (error) {
  console.log('SERVER: Could not read parent directory:', error.message);
}

app.use(express.static(frontendPath));

// Selective request logging - only important operations
app.use((req, res, next) => {
  // Skip logging for frequent monitoring endpoints
  const skipLogging =
    req.path.includes('/monitoring/') ||
    req.path.includes('/health') ||
    req.path.includes('/status') ||
    req.path.includes('/.well-known/') ||
    req.path.includes('/api/platform');

  if (!skipLogging) {
    console.log(`[API] ${req.method} ${req.path} (platform mode)`);
    // Enhanced logging with structured logger (once platform manager is initialized)
    if (platformManager.getLogger) {
      const logger = platformManager.getLogger();
      if (logger) {
        logger
          .api(1, `API Request: ${req.method} ${req.path}`, {
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            query: req.query,
            bodySize: req.body ? JSON.stringify(req.body).length : 0
          })
          .catch(() => {}); // Don't block on logging errors
      }
    }
  }
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
    const result = await platformManager.handleAPIRequest(
      '/system/settings',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system-prefs/status', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/status',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET endpoint for verifying current system settings status (read-only)
app.get('/api/system-prefs/verify', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/verify',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST endpoint for verifying selected system settings
app.post('/api/system-prefs/verify', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/verify',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system-prefs/apply', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/apply',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system-prefs/apply-required', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/apply-required',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system-prefs/generate-commands', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/generate-commands',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system-prefs/generate-commands', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/generate-commands',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system-prefs/generate-restore', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/system/settings/generate-restore',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PM2 Processes API Routes
app.get('/api/pm2-processes/list', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/list',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pm2-processes/status', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/status',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/create', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/create',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/install', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/install',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/remove', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/remove',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/app-info', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/app-info',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/test', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/test',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/export', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/export',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Web Application PM2 Process
app.post('/api/pm2-processes/create-web', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/create-web',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PM2 Process Action Routes
app.post('/api/pm2-processes/start', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/start',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/stop', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/stop',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/restart', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/restart',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/view', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/view',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/update', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/update',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pm2-processes/delete', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/pm2-processes/delete',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Installation Settings API Routes
app.get('/api/installation/settings', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/installation/settings', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/installation/test', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/test',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/installation/settings/reset', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/reset',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Granular Installation Settings API Routes
app.get('/api/installation/settings/camera', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/camera',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/installation/settings/camera/threshold', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/camera/threshold',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/installation/settings/audio', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/audio',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/installation/settings/audio/threshold', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/audio/threshold',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/installation/settings/sensor', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/sensor',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/installation/settings/sensor/polling', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/sensor/polling',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/installation/settings/network', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/network',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/installation/settings/network/timeout', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/installation/settings/network/timeout',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup Wizard API endpoints
app.get('/api/setup-wizard/system-check', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/setup-wizard/system-check',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/setup-wizard/essential-settings', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/setup-wizard/essential-settings',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/setup-wizard/apply-settings', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/setup-wizard/apply-settings',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/setup-wizard/run-tests', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/setup-wizard/run-tests',
      'POST',
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/setup-wizard/verification', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/setup-wizard/verification',
      'GET'
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/setup-wizard/summary', async (req, res) => {
  try {
    const result = await platformManager.handleAPIRequest(
      '/setup-wizard/summary',
      'GET'
    );
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

    // Get logger instance for structured logging
    const logger = platformManager.getLogger();

    // Log successful platform initialization
    if (logger) {
      await logger.system(1, 'Platform manager initialized successfully', {
        platform: platformManager.platform,
        features: [
          'monitoring',
          'launch-agents',
          'system-preferences',
          'notifications'
        ]
      });
    }

    // Start monitoring system
    console.log('[INFO] Starting monitoring system...');
    try {
      const monitoring = platformManager.getMonitoring();
      await monitoring.startMonitoring();
      console.log('📊 Monitoring system started');

      if (logger) {
        await logger.monitoring(1, 'Monitoring system started successfully', {
          interval: monitoring.options?.interval || 30000
        });
      }
    } catch (error) {
      console.warn('Failed to start monitoring:', error.message);

      if (logger) {
        await logger.monitoring(3, 'Failed to start monitoring system', {
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Get platform info for startup message
    let platformInfo = {
      platform: 'macos',
      mode: 'platform',
      version: '1.0.0-alpha.2',
      features: {}
    };
    try {
      const platformResult = await platformManager.handleAPIRequest(
        '/platform',
        'GET'
      );
      platformInfo = platformResult.data;
    } catch (error) {
      console.warn('Could not get platform info:', error.message);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(
        `🚀 Installation Up 4evr server running on http://localhost:${PORT}`
      );
      console.log(`Frontend available at: http://localhost:${PORT}`);
      console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
      console.log(`📊 Mode: ${platformInfo.mode} (v${platformInfo.version})`);
      console.log(`🖥️  Platform: ${platformInfo.platform}`);
      console.log(
        '🔧 Features:',
        Object.keys(platformInfo.features || {})
          .filter(k => platformInfo.features[k])
          .join(', ')
      );

      // Structured logging for server startup
      if (logger) {
        logger
          .system(1, 'Server started successfully', {
            port: PORT,
            mode: platformInfo.mode,
            version: platformInfo.version,
            platform: platformInfo.platform,
            features: Object.keys(platformInfo.features || {}).filter(
              k => platformInfo.features[k]
            ),
            frontendUrl: `http://localhost:${PORT}`,
            apiUrl: `http://localhost:${PORT}/api/*`
          })
          .catch(() => {}); // Don't block on logging errors
      }

      if (platformInfo.mode === 'platform') {
        console.log(
          '✨ Platform abstraction active - ready for cross-platform expansion'
        );
      } else {
        console.log(
          '⚙️  Legacy mode active - set USE_PLATFORM_MANAGER=true to enable new features'
        );
      }

      // Signal to Electron that the backend is ready
      console.log('__BACKEND_READY__');
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
