# HeartbeatApp - Test Application

A simple Node.js application designed to test launch agent functionality with Installation Up 4evr.

## What it does

- 💓 **Logs heartbeat** every 5 seconds with timestamp and uptime
- 📝 **Dual logging** to both console and log file (`~/heartbeat-app.log`)
- 🔄 **Runs indefinitely** - perfect for testing keep-alive functionality
- 🛑 **Graceful shutdown** on SIGTERM/SIGINT signals
- 📊 **Shows uptime** in human-readable format (hours, minutes, seconds)

## Usage

```bash
# Start the app
node heartbeat.js

# Or using npm
npm start
```

## Testing with Installation Up 4evr

1. **Drag and drop** this folder into the Installation Up 4evr launch agent interface
2. **Configure options:**
   - ✅ Keep Alive (recommended)
   - ✅ Run at login  
   - ✅ Allow manual quit
3. **Install and start** the launch agent
4. **Monitor logs** at `~/heartbeat-app.log`
5. **Test keep-alive** by killing the process - it should restart automatically

## Expected Output

```
[2025-06-26T04:30:15.123Z] [INFO] 🚀 HeartbeatApp starting heartbeat cycle
[2025-06-26T04:30:15.124Z] [HEARTBEAT] 💓 Heartbeat - Uptime: 0s - PID: 12345
[2025-06-26T04:30:20.125Z] [HEARTBEAT] 💓 Heartbeat - Uptime: 5s - PID: 12345
[2025-06-26T04:30:25.126Z] [HEARTBEAT] 💓 Heartbeat - Uptime: 10s - PID: 12345
```

## What this demonstrates

- **Basic launch agent functionality** - keeps running in background
- **Keep-alive behavior** - process restarts if it crashes or is killed
- **Logging and monitoring** - shows up in system monitoring
- **Resource usage** - minimal CPU/memory footprint for baseline testing