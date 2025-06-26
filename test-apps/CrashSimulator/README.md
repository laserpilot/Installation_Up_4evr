# CrashSimulator - Test Application

A crash simulation application designed to test keep-alive functionality with Installation Up 4evr.

## What it does

- 💥 **Randomly crashes** with different failure modes to test restart capabilities
- ⏱️ **Configurable crash timing** - runs 10-60 seconds before crashing (customizable)
- 💗 **Heartbeat logging** - shows session tracking and uptime before crashes
- 📊 **Session counting** - tracks how many times the app has been restarted
- 📝 **Dual logging** - logs to console and file (`~/crash-simulator.log`)
- 🎯 **Multiple crash types** - tests different failure scenarios

## Crash Types

1. **Exception** - Throws uncaught exception (most common app failure)
2. **Exit** - Calls `process.exit(1)` (clean exit with error code)
3. **Timeout** - Creates hanging/infinite loop (simulates app freeze)
4. **Memory** - Memory leak leading to crash (simulates memory issues)

## Usage

```bash
# Basic usage - random crashes every 10-60 seconds
node crash-simulator.js

# Or using npm
npm start
```

### Testing Specific Crash Types

```bash
# Test only exception crashes
npm run test:exception

# Test only exit crashes  
npm run test:exit

# Test timeout/hanging behavior
npm run test:timeout

# Test memory leak crashes
npm run test:memory
```

### Testing Different Timings

```bash
# Fast crashes (5-15 seconds)
npm run test:fast

# Slow crashes (30-120 seconds)  
npm run test:slow

# Custom timing
CRASH_MIN_SECONDS=20 CRASH_MAX_SECONDS=40 node crash-simulator.js
```

## Configuration

Set environment variables to customize behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `CRASH_MIN_SECONDS` | 10 | Minimum seconds before crash |
| `CRASH_MAX_SECONDS` | 60 | Maximum seconds before crash |
| `HEARTBEAT_INTERVAL` | 5 | Seconds between heartbeat logs |
| `CRASH_TYPES` | "exception,exit,timeout" | Comma-separated crash types to use |

## Testing with Installation Up 4evr

### 1. Basic Keep-Alive Test

1. **Drag and drop** this folder into Installation Up 4evr
2. **Enable keep-alive options:**
   - ✅ **Keep Alive** (essential for restart testing)
   - ✅ **Run at login** (optional)
   - ✅ **Allow manual quit** (recommended for testing)
3. **Install and start** the launch agent
4. **Monitor the logs** at `~/crash-simulator.log`
5. **Watch the restart cycle:**
   - App runs and logs heartbeats
   - App crashes after random time
   - Launch agent automatically restarts it
   - Session counter increments

### 2. Advanced Testing Scenarios

```bash
# Test rapid restart cycles (crashes every 5-15 seconds)
CRASH_MIN_SECONDS=5 CRASH_MAX_SECONDS=15 node crash-simulator.js

# Test specific crash type resilience
CRASH_TYPES=memory node crash-simulator.js

# Test with longer intervals to simulate real app behavior
CRASH_MIN_SECONDS=300 CRASH_MAX_SECONDS=900 node crash-simulator.js
```

## Expected Output

```
💥 CrashSimulator Session #3 started at 2025-06-26T04:30:15.123Z
📝 Log file: /Users/username/crash-simulator.log
⚙️  Configuration: {
  "minRunTime": 10,
  "maxRunTime": 60,
  "heartbeatInterval": 5,
  "crashTypes": ["exception", "exit", "timeout", "memory"],
  "enabledCrashes": ["exception", "exit", "timeout"]
}
🚀 CrashSimulator starting - setting up crash timer and heartbeat
⏰ Next crash scheduled in 34 seconds
💗 Heartbeat - Session #3 - Uptime: 0s - Next crash: ~34s - PID: 12345
💗 Heartbeat - Session #3 - Uptime: 5s - Next crash: ~29s - PID: 12345
💗 Heartbeat - Session #3 - Uptime: 10s - Next crash: ~24s - PID: 12345
...
💀 SIMULATING CRASH: EXCEPTION after 34s uptime
🔥 Throwing uncaught exception...
[App crashes and automatically restarts as Session #4]
```

## What this demonstrates

- **Keep-alive effectiveness** - Shows how launch agents restart crashed applications
- **Different failure modes** - Tests restart behavior with various crash types
- **Session tracking** - Proves the app is actually restarting (session counter increments)
- **Monitoring integration** - Crash events appear in Installation Up 4evr monitoring
- **Real-world simulation** - Mimics common application failure patterns

## Files Created

- `~/crash-simulator.log` - Main application log with all heartbeats and crash events
- `~/.crash-simulator-sessions` - Session counter file (tracks restart count)

## Troubleshooting

**App doesn't restart after crash:**
- Check that "Keep Alive" is enabled in launch agent configuration
- Verify the launch agent was installed successfully
- Check Console.app for launch agent errors

**Session counter not incrementing:**
- Permissions issue writing to home directory
- Check file permissions on `~/.crash-simulator-sessions`

**Memory crashes affect system:**
- Memory crash type is limited to ~100MB allocation
- Safe for testing, but don't run multiple instances simultaneously

## Integration Notes

This app is specifically designed to:
- Work seamlessly with macOS launch agents
- Generate meaningful monitoring data
- Test different failure scenarios that real applications experience
- Provide clear logging for debugging keep-alive configurations