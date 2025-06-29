/**
 * Migration Example: Using Platform Manager
 * This shows how the existing server.js can be updated to use the new platform abstraction
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const PlatformManager = require('./core/platform-manager');

class ModernizedServer {
    constructor() {
        this.app = express();
        this.platform = new PlatformManager();
        this.port = process.env.PORT || 3001;
    }

    async initialize() {
        console.log('[SERVER] Initializing modernized server...');

        // Initialize platform manager
        await this.platform.initialize();

        // Setup Express middleware
        this.setupMiddleware();

        // Setup routes
        this.setupRoutes();

        // Setup error handling
        this.setupErrorHandling();

        console.log('[SERVER] Modernized server initialized');
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Serve static files from frontend directory
        this.app.use(express.static(path.join(__dirname, '../../frontend')));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`[API] ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Root route - serve frontend
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../../frontend/index.html'));
        });

        // Platform-agnostic API routes using the new platform manager
        this.app.use('/api', async (req, res, next) => {
            try {
                const path = req.path;
                const method = req.method;
                const data = req.body;
                const context = {
                    ip: req.ip,
                    headers: req.headers,
                    query: req.query
                };

                const result = await this.platform.handleAPIRequest(path, method, data, context);
                
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(400).json(result);
                }
            } catch (error) {
                next(error);
            }
        });

        // Legacy compatibility routes for existing frontend
        this.setupLegacyRoutes();
    }

    setupLegacyRoutes() {
        // Map existing routes to new platform manager

        // System Preferences (legacy compatibility)
        this.app.get('/api/system-prefs/settings', async (req, res) => {
            try {
                const systemManager = this.platform.getSystemManager();
                const settings = systemManager.getSettings();
                res.json(settings);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/system-prefs/status', async (req, res) => {
            try {
                const result = await this.platform.handleAPIRequest('/system/settings/status', 'GET');
                res.json(result.data); // Return data directly for legacy compatibility
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/system-prefs/apply', async (req, res) => {
            try {
                const result = await this.platform.handleAPIRequest('/system/settings/apply', 'POST', req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Monitoring (legacy compatibility)
        this.app.get('/api/monitoring/status', async (req, res) => {
            try {
                const result = await this.platform.handleAPIRequest('/monitoring/status', 'GET');
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/monitoring/system', async (req, res) => {
            try {
                const result = await this.platform.handleAPIRequest('/monitoring/status', 'GET');
                res.json(result); // Same as status for now
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/monitoring/applications', async (req, res) => {
            try {
                const result = await this.platform.handleAPIRequest('/monitoring/applications', 'GET');
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Health check
        this.app.get('/api/health', async (req, res) => {
            try {
                const result = await this.platform.handleAPIRequest('/health', 'GET');
                res.json(result.data);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupErrorHandling() {
        // Handle 404s
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Route not found',
                path: req.path,
                method: req.method
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('[SERVER ERROR]:', error);
            
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        });
    }

    async start() {
        await this.initialize();

        // Start monitoring
        try {
            await this.platform.startMonitoring();
            console.log('[SERVER] Monitoring started');
        } catch (error) {
            console.warn('[SERVER] Failed to start monitoring:', error.message);
        }

        // Start Express server
        this.app.listen(this.port, () => {
            console.log(`🚀 Modernized Installation Up 4evr server running on http://localhost:${this.port}`);
            console.log(`Frontend available at: http://localhost:${this.port}`);
            console.log(`API endpoints available at: http://localhost:${this.port}/api/*`);
            console.log(`Platform: ${this.platform.platform}`);
            console.log('Features:', this.platform.getAvailableFeatures());
        });
    }

    async shutdown() {
        console.log('[SERVER] Shutting down...');
        await this.platform.shutdown();
        process.exit(0);
    }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    if (global.serverInstance) {
        await global.serverInstance.shutdown();
    }
});

process.on('SIGINT', async () => {
    if (global.serverInstance) {
        await global.serverInstance.shutdown();
    }
});

// Export for use
module.exports = ModernizedServer;

// Example usage:
if (require.main === module) {
    const server = new ModernizedServer();
    global.serverInstance = server;
    
    server.start().catch(error => {
        console.error('[SERVER] Failed to start:', error);
        process.exit(1);
    });
}