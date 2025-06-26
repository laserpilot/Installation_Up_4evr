# SimpleWebServer - Test Application

A simple web server application designed to test network connectivity, display content serving, and monitoring functionality with Installation Up 4evr.

## What it does

- 🌐 **HTTP server** - Serves multiple content types and endpoints
- 📺 **Display content** - Full-screen content for installation displays
- 🏛️ **Kiosk interface** - Touch-friendly public interaction interface  
- 📊 **Health monitoring** - JSON endpoints for uptime and performance tracking
- 🔍 **Network testing** - Tools to verify connectivity and response times
- 📈 **Traffic generation** - Creates network activity for monitoring systems
- 🎨 **Multiple themes** - Configurable visual themes for different scenarios

## Server Endpoints

### Core Pages
- **`/`** - Main server information and navigation hub
- **`/health`** - JSON health check endpoint (monitoring integration)
- **`/status`** - Detailed server status and configuration
- **`/api/stats`** - Real-time statistics API endpoint

### Display Modes
- **`/display`** - Full-screen display content (black background, large text)
- **`/kiosk`** - Touch-friendly kiosk interface (colorful, interactive)
- **`/demo`** - Presentation/demo mode (animated, attention-grabbing)
- **`/test`** - Network and connectivity test tools

## Usage

```bash
# Basic usage - starts on port 8080
node web-server.js

# Or using npm
npm start
```

### Content Type Configurations

```bash
# Kiosk mode with colorful theme
npm run start:kiosk

# Display mode with dark theme
npm run start:display

# Demo mode with light theme  
npm run start:demo
```

### Network Configurations

```bash
# Different ports
npm run start:port8081
npm run start:port3000

# Local only (127.0.0.1)
npm run start:local

# Network accessible (0.0.0.0)
npm run start:network

# Quiet mode (no request logging)
npm run start:quiet

# Fast refresh (10 second auto-refresh)
npm run start:fast-refresh
```

## Configuration

Customize behavior with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_PORT` | 8080 | Server port number |
| `WEB_HOST` | "0.0.0.0" | Server bind address |
| `CONTENT_TYPE` | "installation" | Content type: installation, kiosk, demo |
| `THEME` | "dark" | Visual theme: dark, light, colorful |
| `AUTO_REFRESH` | 30 | Auto-refresh interval in seconds |
| `LOG_REQUESTS` | true | Log HTTP requests to console/file |
| `ENABLE_CORS` | true | Enable CORS headers |

### Example Configurations

```bash
# Museum installation display
CONTENT_TYPE=installation THEME=dark WEB_PORT=8080 node web-server.js

# Interactive retail kiosk
CONTENT_TYPE=kiosk THEME=colorful AUTO_REFRESH=60 node web-server.js

# Trade show demo
CONTENT_TYPE=demo THEME=light AUTO_REFRESH=10 node web-server.js

# Network testing server
WEB_HOST=0.0.0.0 WEB_PORT=3000 LOG_REQUESTS=true node web-server.js
```

## Testing with Installation Up 4evr

### 1. Basic Network Monitoring

1. **Install as launch agent** through Installation Up 4evr
2. **Enable keep-alive** to ensure server stays running
3. **Monitor network activity** in the monitoring dashboard
4. **Check port availability** and connectivity
5. **Verify health endpoints** are responding

### 2. Display Content Testing

```bash
# Full-screen display content
curl http://localhost:8080/display

# Kiosk interface testing
curl http://localhost:8080/kiosk

# Demo mode for presentations
curl http://localhost:8080/demo
```

### 3. Health Check Integration

```bash
# JSON health endpoint for monitoring
curl http://localhost:8080/health

# Detailed status information
curl http://localhost:8080/status

# Real-time statistics
curl http://localhost:8080/api/stats
```

### 4. Load Testing

Visit `/test` endpoint in browser for built-in testing tools:
- Connection speed tests
- Multiple concurrent request testing  
- Health check verification
- Real-time statistics monitoring

## Expected Output

```
🌐 SimpleWebServer started at 2025-06-26T04:30:15.123Z
📝 Log file: /Users/username/web-server.log
⚙️  Configuration: {
  "port": 8080,
  "host": "0.0.0.0", 
  "contentType": "installation",
  "theme": "dark",
  "autoRefresh": 30
}
🚀 Web server started on http://0.0.0.0:8080
📱 Content type: installation | Theme: dark
🌍 Available on network: http://192.168.1.100:8080, http://10.0.0.50:8080
📝 GET / - Mozilla/5.0... - 192.168.1.101
📝 GET /health - Installation-Up-4evr-Monitor/1.0 - 192.168.1.101
📝 GET /api/stats - curl/7.64.1 - 192.168.1.101
```

## What this demonstrates

- **Network connectivity** - Verifies network access and port availability
- **Display serving** - Content delivery for installation displays and kiosks  
- **Health monitoring** - Uptime tracking and performance metrics
- **Traffic patterns** - Network activity generation for monitoring systems
- **Port management** - Automatic fallback to alternative ports
- **CORS handling** - Cross-origin request support for web integration
- **Multi-interface binding** - Network accessibility testing

## Files Created

- `~/web-server.log` - HTTP request logs and server events
- Network traffic visible in system monitors
- Active connections trackable via monitoring tools

## Integration Features

### Health Check Endpoint (`/health`)
```json
{
  "status": "healthy",
  "uptime": 3600,
  "requests": 1250,
  "connections": 3,
  "memory": {...},
  "timestamp": "2025-06-26T04:30:15.123Z"
}
```

### Statistics API (`/api/stats`)
```json
{
  "timestamp": "2025-06-26T04:30:15.123Z",
  "uptime": 3600,
  "requests": 1250,
  "connections": 3,
  "memory": {
    "rss": 45,
    "heapUsed": 23,
    "heapTotal": 35
  },
  "cpu": {...},
  "platform": {...}
}
```

## Troubleshooting

**Port already in use:**
- Server automatically tries alternative ports (8081, 8082, 8083, 3000, 3001, 5000)
- Check what's using the port: `lsof -i :8080`
- Use a different port: `WEB_PORT=9000 node web-server.js`

**Cannot access from network:**
- Ensure `WEB_HOST=0.0.0.0` (not 127.0.0.1)
- Check firewall settings
- Verify network interface configuration

**Display content not showing correctly:**
- Try different themes: `THEME=light` or `THEME=colorful`
- Adjust auto-refresh: `AUTO_REFRESH=60`
- Check browser console for JavaScript errors

**Health checks failing:**
- Verify server is running: `curl http://localhost:8080/health`
- Check Installation Up 4evr monitoring configuration
- Ensure JSON response format is expected

## Integration Notes

This app is designed to:
- Provide realistic network service for monitoring
- Serve content for installation displays and kiosks
- Generate meaningful traffic for network monitoring
- Offer multiple testing endpoints for validation
- Demonstrate port management and fallback strategies
- Support CORS for web application integration