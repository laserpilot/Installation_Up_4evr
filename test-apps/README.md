# Installation Up 4evr - Test Applications

A collection of test applications designed to demonstrate and validate the functionality of Installation Up 4evr automation tool. These apps provide immediate value for testing system monitoring, launch agent management, crash recovery, and network connectivity.

## 🎯 Purpose

These test applications allow you to:
- **Validate Installation Up 4evr features** - Test all major functionality immediately
- **Demonstrate automation capabilities** - Show launch agents, monitoring, and alerts working
- **Provide learning examples** - See how real applications integrate with the system
- **Enable quick testing** - Get started without needing external applications
- **Create installation templates** - Use as baseline configurations for different scenarios

## 📦 Available Test Applications

### 1. 💓 HeartbeatApp
**Simple continuous logger for basic functionality testing**

- **Purpose**: Tests basic launch agent functionality and keep-alive behavior
- **Behavior**: Logs heartbeat every 5 seconds with timestamp and uptime
- **Demonstrates**: 
  - Launch agent creation and installation
  - Continuous logging and monitoring
  - Graceful shutdown handling
  - Basic process management
- **Best for**: First-time users learning the system basics

**Quick start:**
```bash
cd test-apps/HeartbeatApp && npm start
```

### 2. 💥 CrashSimulator  
**Controlled crash testing for keep-alive validation**

- **Purpose**: Tests launch agent restart capabilities with different failure modes
- **Behavior**: Runs normally for 10-60 seconds, then crashes with random failure types
- **Demonstrates**:
  - Keep-alive functionality and automatic restarts
  - Different crash scenarios (exceptions, exits, timeouts, memory)
  - Session tracking across restarts
  - Restart cycle monitoring
- **Best for**: Validating critical keep-alive functionality

**Quick start:**
```bash
cd test-apps/CrashSimulator && npm start
```

**Crash types available:**
- **Exception**: Uncaught JavaScript exceptions
- **Exit**: Clean process exit with error code
- **Timeout**: Hanging/infinite loops
- **Memory**: Memory leak leading to crash

### 3. 📊 ResourceDemo
**Resource consumption testing for monitoring validation**

- **Purpose**: Tests monitoring system accuracy and alert thresholds
- **Behavior**: Gradually increases CPU and memory usage with configurable patterns
- **Demonstrates**:
  - Real-time resource monitoring
  - Alert threshold triggering
  - Notification system activation
  - Performance tracking accuracy
- **Best for**: Testing monitoring dashboards and alert systems

**Quick start:**
```bash
cd test-apps/ResourceDemo && npm start
```

**Consumption patterns:**
- **Gradual**: Slow increase over time (default)
- **Spike**: Sudden jump to maximum usage
- **Wave**: Oscillating up and down
- **Plateau**: Quick ramp to sustained high usage

### 4. 🌐 SimpleWebServer
**Network and display content testing**

- **Purpose**: Tests network monitoring, connectivity, and display content serving
- **Behavior**: Runs HTTP server with multiple endpoints and display modes
- **Demonstrates**:
  - Network connectivity monitoring
  - Port availability testing
  - Display content serving (kiosk, installation, demo modes)
  - Health check endpoints
  - Traffic generation for monitoring
- **Best for**: Testing network features and display installations

**Quick start:**
```bash
cd test-apps/SimpleWebServer && npm start
# Then visit http://localhost:8080
```

**Available endpoints:**
- `/` - Main server info and navigation
- `/health` - JSON health check for monitoring
- `/display` - Full-screen installation display
- `/kiosk` - Touch-friendly kiosk interface
- `/demo` - Presentation/demo mode
- `/test` - Built-in connectivity testing tools

## 🚀 Quick Setup Guide

### Option 1: Individual App Testing
```bash
# Test heartbeat functionality
cd test-apps/HeartbeatApp && npm start

# Test crash recovery (in separate terminal)
cd test-apps/CrashSimulator && npm start

# Test resource monitoring (in separate terminal) 
cd test-apps/ResourceDemo && npm start

# Test network connectivity (in separate terminal)
cd test-apps/SimpleWebServer && npm start
```

### Option 2: Installation Up 4evr Integration
1. **Open Installation Up 4evr** (web interface or Electron app)
2. **Navigate to Launch Agents tab**
3. **Drag and drop** any `test-apps/[AppName]` folder into the interface
4. **Configure options** (keep-alive recommended for all apps)
5. **Install and start** the launch agent
6. **Monitor results** in the Monitoring tab

### Option 3: All Apps via Launch Agents
Use Installation Up 4evr to install all four apps as launch agents:
1. Install HeartbeatApp (basic functionality)
2. Install CrashSimulator (test restarts) 
3. Install ResourceDemo (test monitoring)
4. Install SimpleWebServer (test network)

## 📋 Testing Scenarios

### 🎯 Scenario 1: Basic Functionality Validation
**Goal**: Verify Installation Up 4evr core features work
```bash
1. Install HeartbeatApp as launch agent with keep-alive
2. Verify it appears in monitoring dashboard
3. Check log files are created (~heartbeat-app.log)
4. Stop and restart to test launch agent management
```

### 🔄 Scenario 2: Crash Recovery Testing  
**Goal**: Validate automatic restart capabilities
```bash
1. Install CrashSimulator with keep-alive enabled
2. Watch crash cycles in monitoring dashboard
3. Verify session counter increments after crashes
4. Test different crash types with environment variables
```

### 📈 Scenario 3: Monitoring & Alerts Testing
**Goal**: Test monitoring accuracy and alert systems
```bash
1. Install ResourceDemo with monitoring enabled
2. Configure alert thresholds (CPU: 70%, Memory: 80%)
3. Watch resource consumption increase in dashboard
4. Verify alerts trigger and notifications are sent
```

### 🌐 Scenario 4: Network & Display Testing
**Goal**: Test network monitoring and display capabilities
```bash
1. Install SimpleWebServer as launch agent
2. Verify server appears as running service in monitoring
3. Test display modes for installation use cases
4. Check network connectivity and health endpoints
```

### 🏗️ Scenario 5: Complete Installation Simulation
**Goal**: Simulate real installation environment
```bash
1. Install all four apps as launch agents
2. Configure system preferences for installation use
3. Set up monitoring with appropriate thresholds
4. Configure notification channels (Slack, Discord)
5. Test complete automation workflow
```

## ⚙️ Configuration Examples

### Environment Variables for Testing

```bash
# HeartbeatApp - No configuration needed
cd test-apps/HeartbeatApp && npm start

# CrashSimulator - Test specific crash types
CRASH_TYPES=exception CRASH_MIN_SECONDS=5 CRASH_MAX_SECONDS=15 npm start

# ResourceDemo - Light resource usage for testing
MAX_CPU_PERCENT=30 MAX_MEMORY_MB=100 RESOURCE_PATTERN=gradual npm start

# SimpleWebServer - Kiosk mode on port 3000
WEB_PORT=3000 CONTENT_TYPE=kiosk THEME=colorful npm start
```

### Realistic Installation Profiles

**Museum Installation:**
- HeartbeatApp: Basic uptime monitoring
- SimpleWebServer: Display content serving (port 8080)
- ResourceDemo: Light monitoring (30% CPU max)
- System Preferences: Screensaver off, auto-restart enabled

**Retail Kiosk:**
- SimpleWebServer: Kiosk interface (colorful theme)
- CrashSimulator: Crash recovery testing
- ResourceDemo: Moderate monitoring (60% CPU max)
- System Preferences: Sleep disabled, updates off

**Trade Show Demo:**
- SimpleWebServer: Demo mode (fast refresh)
- ResourceDemo: Wave pattern for dynamic display
- HeartbeatApp: Continuous uptime demonstration
- All apps: Keep-alive enabled for reliability

## 📊 Expected Results

### Successful Test Indicators

**HeartbeatApp:**
- ✅ Log file created at `~/heartbeat-app.log`
- ✅ Continuous heartbeat entries every 5 seconds
- ✅ Appears in monitoring dashboard as running process
- ✅ Graceful shutdown on stop command

**CrashSimulator:**
- ✅ Session counter increments after each crash
- ✅ Different crash types execute successfully
- ✅ Launch agent automatically restarts process
- ✅ Crash events logged with timestamps

**ResourceDemo:**
- ✅ Resource usage visible in monitoring dashboard
- ✅ CPU and memory consumption increases over time
- ✅ Alert thresholds trigger notifications
- ✅ Resource patterns work as configured

**SimpleWebServer:**
- ✅ Server accessible at configured port
- ✅ All endpoints respond correctly
- ✅ Display modes render properly
- ✅ Health checks return valid JSON

## 🔍 Troubleshooting

### Common Issues

**Apps won't start:**
- Check Node.js version (requires >=14.0.0)
- Verify file permissions: `chmod +x test-apps/*/package.json`
- Run `npm install` in each app directory if needed

**Launch agents not restarting:**
- Ensure "Keep Alive" is enabled in configuration
- Check launch agent status in Installation Up 4evr
- Verify plist files were created correctly

**Monitoring not showing data:**
- Confirm monitoring service is running
- Check that apps are generating log files
- Verify monitoring dashboard is refreshing

**Network server not accessible:**
- Check firewall settings
- Try different ports: `WEB_PORT=3000 npm start`
- Use localhost only: `WEB_HOST=127.0.0.1 npm start`

### Log File Locations

All test apps create log files in the user's home directory:
- `~/heartbeat-app.log` - HeartbeatApp activity
- `~/crash-simulator.log` - CrashSimulator events and crashes
- `~/resource-demo.log` - ResourceDemo metrics and changes
- `~/web-server.log` - SimpleWebServer HTTP requests and events

## 🎓 Learning Path

### For New Users:
1. **Start with HeartbeatApp** - Learn basic launch agent concepts
2. **Try SimpleWebServer** - Understand network monitoring
3. **Test CrashSimulator** - See keep-alive functionality
4. **Experiment with ResourceDemo** - Explore monitoring alerts

### For Installation Professionals:
1. **Test all apps individually** - Understand each component
2. **Create installation profile** - Configure complete setup
3. **Simulate failure scenarios** - Test recovery procedures  
4. **Configure monitoring thresholds** - Set appropriate alerts
5. **Set up notification channels** - Connect to your workflow

### For Developers:
1. **Examine app code structure** - See integration patterns
2. **Customize configurations** - Modify for your use cases
3. **Create new test apps** - Add application-specific tests
4. **Contribute improvements** - Enhance existing functionality

## 📄 Integration Notes

These test applications are designed to:
- **Work immediately** - No external dependencies or complex setup
- **Demonstrate best practices** - Show proper integration patterns
- **Scale appropriately** - Safe resource usage for testing
- **Provide realistic scenarios** - Mirror real installation challenges
- **Support customization** - Environment variables for different configs
- **Generate useful data** - Meaningful logs and metrics for monitoring

The apps serve as both **validation tools** for Installation Up 4evr functionality and **learning examples** for creating your own automated installation applications.