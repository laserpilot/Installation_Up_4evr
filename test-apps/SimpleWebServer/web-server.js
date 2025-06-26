#!/usr/bin/env node

/**
 * SimpleWebServer - Test Application for Installation Up 4evr
 * 
 * This app demonstrates network monitoring and display functionality by:
 * - Running a simple HTTP server with multiple endpoints
 * - Serving content that can be displayed on screens/displays
 * - Generating network traffic for monitoring testing
 * - Providing health check endpoints for uptime monitoring
 * - Testing port availability and network connectivity
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');

class SimpleWebServer {
    constructor() {
        this.isRunning = true;
        this.logFile = path.join(os.homedir(), 'web-server.log');
        this.startTime = new Date();
        this.requestCount = 0;
        this.clients = new Set();
        
        // Configuration (can be overridden by environment variables)
        this.config = {
            port: parseInt(process.env.WEB_PORT) || 8080,
            host: process.env.WEB_HOST || '0.0.0.0',
            logRequests: process.env.LOG_REQUESTS !== 'false',
            enableCORS: process.env.ENABLE_CORS !== 'false',
            contentType: process.env.CONTENT_TYPE || 'installation', // 'installation', 'kiosk', 'demo'
            autoRefresh: parseInt(process.env.AUTO_REFRESH) || 30, // seconds
            theme: process.env.THEME || 'dark' // 'dark', 'light', 'colorful'
        };
        
        console.log(`🌐 SimpleWebServer started at ${this.startTime.toISOString()}`);
        console.log(`📝 Log file: ${this.logFile}`);
        console.log(`⚙️  Configuration: ${JSON.stringify(this.config, null, 2)}`);
        
        this.setupSignalHandlers();
        this.createServer();
    }
    
    setupSignalHandlers() {
        process.on('SIGTERM', () => {
            this.log('📴 Received SIGTERM - shutting down gracefully...', 'INFO');
            this.gracefulShutdown();
        });
        
        process.on('SIGINT', () => {
            this.log('📴 Received SIGINT - shutting down gracefully...', 'INFO');
            this.gracefulShutdown();
        });
        
        process.on('uncaughtException', (error) => {
            this.log(`💥 Uncaught Exception: ${error.message}`, 'ERROR');
            this.gracefulShutdown();
            process.exit(1);
        });
    }
    
    createServer() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
        
        this.server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                this.log(`❌ Port ${this.config.port} is already in use. Trying alternative ports...`, 'ERROR');
                this.tryAlternativePort();
            } else {
                this.log(`❌ Server error: ${error.message}`, 'ERROR');
            }
        });
        
        this.server.on('connection', (socket) => {
            this.clients.add(socket);
            socket.on('close', () => {
                this.clients.delete(socket);
            });
        });
        
        this.startServer();
    }
    
    startServer() {
        this.server.listen(this.config.port, this.config.host, () => {
            const address = this.server.address();
            this.log(`🚀 Web server started on http://${address.address}:${address.port}`, 'INFO');
            this.log(`📱 Content type: ${this.config.contentType} | Theme: ${this.config.theme}`, 'INFO');
            this.logNetworkInterfaces();
        });
    }
    
    tryAlternativePort() {
        const alternativePorts = [8081, 8082, 8083, 3000, 3001, 5000];
        
        for (const port of alternativePorts) {
            try {
                this.config.port = port;
                this.server.listen(port, this.config.host, () => {
                    this.log(`✅ Successfully started on alternative port ${port}`, 'INFO');
                });
                break;
            } catch (error) {
                continue;
            }
        }
    }
    
    logNetworkInterfaces() {
        const interfaces = os.networkInterfaces();
        const addresses = [];
        
        Object.keys(interfaces).forEach(name => {
            interfaces[name].forEach(iface => {
                if (!iface.internal && iface.family === 'IPv4') {
                    addresses.push(`http://${iface.address}:${this.config.port}`);
                }
            });
        });
        
        if (addresses.length > 0) {
            this.log(`🌍 Available on network: ${addresses.join(', ')}`, 'INFO');
        }
    }
    
    handleRequest(req, res) {
        this.requestCount++;
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        if (this.config.logRequests) {
            this.log(`📝 ${req.method} ${pathname} - ${req.headers['user-agent'] || 'Unknown'} - ${req.connection.remoteAddress}`, 'REQUEST');
        }
        
        // Enable CORS if configured
        if (this.config.enableCORS) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        }
        
        // Handle OPTIONS preflight requests
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // Route requests
        try {
            switch (pathname) {
                case '/':
                    this.serveMainPage(req, res);
                    break;
                case '/health':
                    this.serveHealthCheck(req, res);
                    break;
                case '/status':
                    this.serveStatus(req, res);
                    break;
                case '/api/stats':
                    this.serveStats(req, res);
                    break;
                case '/display':
                    this.serveDisplayContent(req, res);
                    break;
                case '/kiosk':
                    this.serveKioskContent(req, res);
                    break;
                case '/demo':
                    this.serveDemoContent(req, res);
                    break;
                case '/test':
                    this.serveTestPage(req, res);
                    break;
                default:
                    this.serve404(req, res);
            }
        } catch (error) {
            this.log(`❌ Error handling request ${pathname}: ${error.message}`, 'ERROR');
            this.serve500(req, res, error);
        }
    }
    
    serveMainPage(req, res) {
        const html = this.generateMainPageHTML();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    
    serveHealthCheck(req, res) {
        const health = {
            status: 'healthy',
            uptime: Math.floor((new Date() - this.startTime) / 1000),
            requests: this.requestCount,
            connections: this.clients.size,
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health, null, 2));
    }
    
    serveStatus(req, res) {
        const status = {
            server: 'SimpleWebServer',
            version: '1.0.0',
            startTime: this.startTime.toISOString(),
            uptime: this.formatUptime(Math.floor((new Date() - this.startTime) / 1000)),
            port: this.config.port,
            host: this.config.host,
            requests: this.requestCount,
            activeConnections: this.clients.size,
            configuration: this.config
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status, null, 2));
    }
    
    serveStats(req, res) {
        const stats = {
            timestamp: new Date().toISOString(),
            uptime: Math.floor((new Date() - this.startTime) / 1000),
            requests: this.requestCount,
            connections: this.clients.size,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            cpu: process.cpuUsage(),
            platform: {
                arch: process.arch,
                platform: process.platform,
                version: process.version
            }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats, null, 2));
    }
    
    serveDisplayContent(req, res) {
        const html = this.generateDisplayHTML();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    
    serveKioskContent(req, res) {
        const html = this.generateKioskHTML();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    
    serveDemoContent(req, res) {
        const html = this.generateDemoHTML();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    
    serveTestPage(req, res) {
        const html = this.generateTestPageHTML();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    
    serve404(req, res) {
        const html = this.generate404HTML();
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    
    serve500(req, res, error) {
        const html = this.generate500HTML(error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(html);
    }
    
    generateMainPageHTML() {
        const uptime = this.formatUptime(Math.floor((new Date() - this.startTime) / 1000));
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SimpleWebServer - Installation Up 4evr</title>
    <style>
        ${this.getBaseCSS()}
        .nav-links { display: flex; gap: 1rem; margin: 2rem 0; }
        .nav-links a { padding: 0.5rem 1rem; background: #333; color: white; text-decoration: none; border-radius: 4px; }
        .nav-links a:hover { background: #555; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .stat-card { background: #f5f5f5; padding: 1rem; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2rem; font-weight: bold; color: #007acc; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🌐 SimpleWebServer</h1>
            <p>Test web server for Installation Up 4evr monitoring</p>
        </header>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${uptime}</div>
                <div>Uptime</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.requestCount}</div>
                <div>Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.clients.size}</div>
                <div>Active Connections</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.config.port}</div>
                <div>Port</div>
            </div>
        </div>
        
        <div class="nav-links">
            <a href="/health">Health Check</a>
            <a href="/status">Server Status</a>
            <a href="/api/stats">API Stats</a>
            <a href="/display">Display Mode</a>
            <a href="/kiosk">Kiosk Mode</a>
            <a href="/demo">Demo Mode</a>
            <a href="/test">Test Page</a>
        </div>
        
        <div class="info">
            <h3>🎯 Purpose</h3>
            <p>This web server demonstrates:</p>
            <ul>
                <li><strong>Network connectivity testing</strong> - Verify network access and port availability</li>
                <li><strong>Display content serving</strong> - Content for installation displays and kiosks</li>
                <li><strong>Health monitoring</strong> - Endpoints for uptime and performance monitoring</li>
                <li><strong>Traffic generation</strong> - Network activity for monitoring systems</li>
            </ul>
            
            <h3>🔗 Available Endpoints</h3>
            <ul>
                <li><code>/</code> - This main page with server information</li>
                <li><code>/health</code> - JSON health check endpoint</li>
                <li><code>/status</code> - Detailed server status information</li>
                <li><code>/api/stats</code> - Real-time statistics API</li>
                <li><code>/display</code> - Full-screen display content</li>
                <li><code>/kiosk</code> - Kiosk-style interface</li>
                <li><code>/demo</code> - Demo/presentation content</li>
                <li><code>/test</code> - Network and connectivity test page</li>
            </ul>
        </div>
        
        <footer>
            <p>Started: ${this.startTime.toISOString()} | PID: ${process.pid}</p>
            <p>Configuration: ${this.config.contentType} content, ${this.config.theme} theme</p>
        </footer>
    </div>
    
    <script>
        // Auto-refresh page every ${this.config.autoRefresh} seconds
        setTimeout(() => location.reload(), ${this.config.autoRefresh * 1000});
    </script>
</body>
</html>`;
    }
    
    generateDisplayHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Display - Installation Up 4evr</title>
    <style>
        ${this.getBaseCSS()}
        body { margin: 0; padding: 0; background: black; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-size: 2rem; }
        .display-content { text-align: center; max-width: 80%; }
        .time { font-size: 4rem; margin: 2rem 0; font-family: 'Courier New', monospace; }
        .status { color: #00ff00; margin: 1rem 0; }
        .info { font-size: 1.5rem; opacity: 0.8; margin: 1rem 0; }
    </style>
</head>
<body>
    <div class="display-content">
        <h1>🎨 Installation Display</h1>
        <div class="time" id="clock">--:--:--</div>
        <div class="status">✅ System Online</div>
        <div class="info">Server: ${this.config.host}:${this.config.port}</div>
        <div class="info">Uptime: <span id="uptime">${this.formatUptime(Math.floor((new Date() - this.startTime) / 1000))}</span></div>
        <div class="info">Requests: <span id="requests">${this.requestCount}</span></div>
    </div>
    
    <script>
        function updateClock() {
            const now = new Date();
            document.getElementById('clock').textContent = now.toLocaleTimeString();
        }
        
        function updateStats() {
            fetch('/api/stats')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('uptime').textContent = formatUptime(data.uptime);
                    document.getElementById('requests').textContent = data.requests;
                })
                .catch(e => console.log('Stats update failed:', e));
        }
        
        function formatUptime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return h > 0 ? \`\${h}h \${m}m \${s}s\` : m > 0 ? \`\${m}m \${s}s\` : \`\${s}s\`;
        }
        
        updateClock();
        updateStats();
        setInterval(updateClock, 1000);
        setInterval(updateStats, 5000);
    </script>
</body>
</html>`;
    }
    
    generateKioskHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kiosk - Installation Up 4evr</title>
    <style>
        ${this.getBaseCSS()}
        body { margin: 0; padding: 2rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
        .kiosk-header { text-align: center; margin-bottom: 3rem; }
        .kiosk-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
        .kiosk-card { background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 12px; backdrop-filter: blur(10px); }
        .large-text { font-size: 3rem; font-weight: bold; margin: 1rem 0; }
        .button { display: inline-block; padding: 1rem 2rem; background: rgba(255,255,255,0.2); border-radius: 8px; text-decoration: none; color: white; margin: 0.5rem; }
        .button:hover { background: rgba(255,255,255,0.3); }
    </style>
</head>
<body>
    <div class="kiosk-header">
        <h1>🏛️ Interactive Kiosk</h1>
        <p>Touch-friendly interface for public installations</p>
    </div>
    
    <div class="kiosk-content">
        <div class="kiosk-card">
            <h2>📊 System Status</h2>
            <div class="large-text" style="color: #00ff88;">ONLINE</div>
            <p>All systems operational</p>
            <p>Uptime: ${this.formatUptime(Math.floor((new Date() - this.startTime) / 1000))}</p>
        </div>
        
        <div class="kiosk-card">
            <h2>📈 Statistics</h2>
            <div class="large-text">${this.requestCount}</div>
            <p>Total interactions</p>
            <p>Active sessions: ${this.clients.size}</p>
        </div>
        
        <div class="kiosk-card">
            <h2>🎯 Navigation</h2>
            <a href="/display" class="button">Display Mode</a>
            <a href="/demo" class="button">Demo Mode</a>
            <a href="/test" class="button">Test Functions</a>
            <a href="/" class="button">Main Menu</a>
        </div>
        
        <div class="kiosk-card">
            <h2>⏰ Information</h2>
            <div class="large-text" id="kiosk-time">--:--</div>
            <p>Current time</p>
            <p>Server: ${this.config.host}:${this.config.port}</p>
        </div>
    </div>
    
    <script>
        function updateTime() {
            document.getElementById('kiosk-time').textContent = new Date().toLocaleTimeString();
        }
        updateTime();
        setInterval(updateTime, 1000);
        
        // Auto-refresh every 60 seconds
        setTimeout(() => location.reload(), 60000);
    </script>
</body>
</html>`;
    }
    
    generateDemoHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demo - Installation Up 4evr</title>
    <style>
        ${this.getBaseCSS()}
        body { margin: 0; padding: 0; background: #1a1a1a; color: white; overflow: hidden; }
        .demo-container { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
        .demo-title { font-size: 4rem; margin-bottom: 2rem; animation: pulse 2s infinite; }
        .demo-content { font-size: 1.5rem; max-width: 80%; }
        .demo-stats { display: flex; gap: 3rem; margin: 3rem 0; }
        .demo-stat { text-align: center; }
        .demo-stat-value { font-size: 3rem; font-weight: bold; color: #00ff88; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .rotating { animation: rotate 10s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="demo-container">
        <div class="demo-title">
            <span class="rotating">⚙️</span> Installation Demo <span class="rotating">⚙️</span>
        </div>
        
        <div class="demo-content">
            <p>Demonstrating automated installation monitoring and management</p>
            <p>Real-time system health and performance tracking</p>
        </div>
        
        <div class="demo-stats">
            <div class="demo-stat">
                <div class="demo-stat-value" id="demo-uptime">${Math.floor((new Date() - this.startTime) / 1000)}</div>
                <div>Seconds Online</div>
            </div>
            <div class="demo-stat">
                <div class="demo-stat-value">${this.requestCount}</div>
                <div>Requests Served</div>
            </div>
            <div class="demo-stat">
                <div class="demo-stat-value">${this.clients.size}</div>
                <div>Active Connections</div>
            </div>
        </div>
        
        <div class="demo-content">
            <p style="font-size: 1rem; opacity: 0.7;">
                Server: ${this.config.host}:${this.config.port} | 
                Started: ${this.startTime.toLocaleString()} |
                PID: ${process.pid}
            </p>
        </div>
    </div>
    
    <script>
        function updateDemoStats() {
            const startTime = new Date('${this.startTime.toISOString()}');
            const uptime = Math.floor((new Date() - startTime) / 1000);
            document.getElementById('demo-uptime').textContent = uptime;
        }
        
        updateDemoStats();
        setInterval(updateDemoStats, 1000);
        
        // Auto-refresh every 2 minutes
        setTimeout(() => location.reload(), 120000);
    </script>
</body>
</html>`;
    }
    
    generateTestPageHTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Page - Installation Up 4evr</title>
    <style>
        ${this.getBaseCSS()}
        .test-section { margin: 2rem 0; padding: 1rem; background: #f9f9f9; border-radius: 8px; }
        .test-button { padding: 0.5rem 1rem; margin: 0.5rem; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .test-button:hover { background: #005a9e; }
        .test-result { margin: 1rem 0; padding: 1rem; background: #e8f4f8; border-radius: 4px; font-family: monospace; }
        .test-success { background: #d4edda; color: #155724; }
        .test-error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Network & Connectivity Tests</h1>
        
        <div class="test-section">
            <h3>📡 Connection Test</h3>
            <p>Test network connectivity and response times</p>
            <button class="test-button" onclick="testConnection()">Test Connection</button>
            <div id="connection-result" class="test-result" style="display: none;"></div>
        </div>
        
        <div class="test-section">
            <h3>📊 Load Test</h3>
            <p>Generate multiple requests to test server performance</p>
            <button class="test-button" onclick="testLoad()">Start Load Test</button>
            <div id="load-result" class="test-result" style="display: none;"></div>
        </div>
        
        <div class="test-section">
            <h3>🔍 Health Check</h3>
            <p>Verify all endpoints are responding correctly</p>
            <button class="test-button" onclick="testHealth()">Check Health</button>
            <div id="health-result" class="test-result" style="display: none;"></div>
        </div>
        
        <div class="test-section">
            <h3>📈 Real-time Stats</h3>
            <p>Current server statistics</p>
            <button class="test-button" onclick="updateStats()">Refresh Stats</button>
            <div id="stats-result" class="test-result"></div>
        </div>
        
        <div class="test-section">
            <h3>🖥️ Display Tests</h3>
            <p>Test display modes and content rendering</p>
            <button class="test-button" onclick="window.open('/display', '_blank')">Open Display Mode</button>
            <button class="test-button" onclick="window.open('/kiosk', '_blank')">Open Kiosk Mode</button>
            <button class="test-button" onclick="window.open('/demo', '_blank')">Open Demo Mode</button>
        </div>
    </div>
    
    <script>
        async function testConnection() {
            const result = document.getElementById('connection-result');
            result.style.display = 'block';
            result.textContent = 'Testing connection...';
            result.className = 'test-result';
            
            try {
                const start = performance.now();
                const response = await fetch('/health');
                const end = performance.now();
                const data = await response.json();
                
                result.className = 'test-result test-success';
                result.innerHTML = \`
✅ Connection successful!<br>
Response time: \${Math.round(end - start)}ms<br>
Status: \${data.status}<br>
Server uptime: \${data.uptime} seconds
                \`;
            } catch (error) {
                result.className = 'test-result test-error';
                result.textContent = \`❌ Connection failed: \${error.message}\`;
            }
        }
        
        async function testLoad() {
            const result = document.getElementById('load-result');
            result.style.display = 'block';
            result.textContent = 'Running load test (10 concurrent requests)...';
            result.className = 'test-result';
            
            try {
                const requests = [];
                const start = performance.now();
                
                for (let i = 0; i < 10; i++) {
                    requests.push(fetch('/api/stats'));
                }
                
                const responses = await Promise.all(requests);
                const end = performance.now();
                
                const successful = responses.filter(r => r.ok).length;
                
                result.className = 'test-result test-success';
                result.innerHTML = \`
✅ Load test completed!<br>
Total time: \${Math.round(end - start)}ms<br>
Successful requests: \${successful}/10<br>
Average response time: \${Math.round((end - start) / 10)}ms
                \`;
            } catch (error) {
                result.className = 'test-result test-error';
                result.textContent = \`❌ Load test failed: \${error.message}\`;
            }
        }
        
        async function testHealth() {
            const result = document.getElementById('health-result');
            result.style.display = 'block';
            result.textContent = 'Checking all endpoints...';
            result.className = 'test-result';
            
            const endpoints = ['/', '/health', '/status', '/api/stats'];
            const results = [];
            
            for (const endpoint of endpoints) {
                try {
                    const start = performance.now();
                    const response = await fetch(endpoint);
                    const end = performance.now();
                    results.push(\`✅ \${endpoint}: \${response.status} (\${Math.round(end - start)}ms)\`);
                } catch (error) {
                    results.push(\`❌ \${endpoint}: \${error.message}\`);
                }
            }
            
            result.className = 'test-result test-success';
            result.innerHTML = results.join('<br>');
        }
        
        async function updateStats() {
            const result = document.getElementById('stats-result');
            result.textContent = 'Loading stats...';
            
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();
                
                result.innerHTML = \`
<strong>Server Statistics:</strong><br>
Uptime: \${formatUptime(stats.uptime)}<br>
Requests: \${stats.requests}<br>
Connections: \${stats.connections}<br>
Memory: \${stats.memory.rss}MB RSS, \${stats.memory.heapUsed}MB heap<br>
Platform: \${stats.platform.platform} \${stats.platform.arch}<br>
Node.js: \${stats.platform.version}<br>
Last updated: \${new Date(stats.timestamp).toLocaleTimeString()}
                \`;
            } catch (error) {
                result.textContent = \`❌ Failed to load stats: \${error.message}\`;
            }
        }
        
        function formatUptime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            return h > 0 ? \`\${h}h \${m}m \${s}s\` : m > 0 ? \`\${m}m \${s}s\` : \`\${s}s\`;
        }
        
        // Load initial stats
        updateStats();
    </script>
</body>
</html>`;
    }
    
    generate404HTML() {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Not Found</title>
    <style>
        ${this.getBaseCSS()}
        .error-container { text-align: center; padding: 4rem 2rem; }
        .error-code { font-size: 8rem; font-weight: bold; color: #ff6b6b; margin: 0; }
        .error-message { font-size: 2rem; margin: 1rem 0; }
        .back-link { display: inline-block; padding: 1rem 2rem; background: #007acc; color: white; text-decoration: none; border-radius: 4px; margin-top: 2rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-container">
            <div class="error-code">404</div>
            <div class="error-message">Page Not Found</div>
            <p>The requested resource could not be found on this server.</p>
            <a href="/" class="back-link">← Back to Home</a>
        </div>
    </div>
</body>
</html>`;
    }
    
    generate500HTML(error) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>500 - Server Error</title>
    <style>
        ${this.getBaseCSS()}
        .error-container { text-align: center; padding: 4rem 2rem; }
        .error-code { font-size: 8rem; font-weight: bold; color: #ff6b6b; margin: 0; }
        .error-message { font-size: 2rem; margin: 1rem 0; }
        .error-details { background: #f8f8f8; padding: 1rem; border-radius: 4px; text-align: left; font-family: monospace; margin: 2rem 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-container">
            <div class="error-code">500</div>
            <div class="error-message">Internal Server Error</div>
            <p>An error occurred while processing your request.</p>
            <div class="error-details">${error.message}</div>
            <a href="/" class="back-link">← Back to Home</a>
        </div>
    </div>
</body>
</html>`;
    }
    
    getBaseCSS() {
        return `
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        h1, h2, h3 { color: #2c3e50; }
        ul { padding-left: 2rem; }
        code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; font-family: 'Courier New', monospace; }
        .info { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; }
        footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #eee; color: #666; font-size: 0.9rem; }
        `;
    }
    
    gracefulShutdown() {
        this.isRunning = false;
        
        if (this.server) {
            this.server.close(() => {
                const endTime = new Date();
                const totalUptime = Math.floor((endTime - this.startTime) / 1000);
                
                this.log(`🛑 SimpleWebServer stopped - Uptime: ${this.formatUptime(totalUptime)} - Requests: ${this.requestCount}`, 'INFO');
                this.log('👋 Server shutdown complete', 'INFO');
                
                process.exit(0);
            });
            
            // Force close connections
            this.clients.forEach(socket => {
                socket.destroy();
            });
        } else {
            process.exit(0);
        }
    }
    
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${level}] ${message}`;
        
        // Console output
        console.log(logLine);
        
        // File output
        try {
            fs.appendFileSync(this.logFile, logLine + '\n');
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
    }
    
    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Start the application
if (require.main === module) {
    new SimpleWebServer();
}

module.exports = SimpleWebServer;