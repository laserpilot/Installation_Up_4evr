# ResourceDemo - Test Application

A resource consumption application designed to test monitoring and alerting functionality with Installation Up 4evr.

## What it does

- 📈 **Gradually increases resource usage** - CPU and memory consumption over time
- 🔄 **Multiple consumption patterns** - gradual, spike, wave, and plateau behaviors
- 📊 **Detailed metrics logging** - tracks CPU workers, memory blocks, and system stats
- 🚨 **Tests alert thresholds** - triggers monitoring system notifications
- ⚙️ **Highly configurable** - customize timing, limits, and consumption patterns
- 🧹 **Clean shutdown** - properly releases all resources on exit

## Resource Patterns

### 1. **Gradual** (default)
Slowly increases CPU and memory usage over time until reaching configured limits.
- CPU increases by 10% every 15 seconds
- Memory increases by 25MB every 20 seconds

### 2. **Spike** 
Suddenly jumps to maximum resource usage after a brief startup period.
- Immediate spike to test alert responsiveness
- Useful for testing critical threshold notifications

### 3. **Wave**
Oscillates resource usage up and down in a wave pattern.
- Tests monitoring system's handling of fluctuating resources
- Simulates applications with variable load

### 4. **Plateau**
Quickly ramps up to ~70% of maximum, then maintains steady usage.
- Tests sustained high resource usage
- Simulates applications with consistent heavy load

## Usage

```bash
# Basic usage - gradual pattern with default limits
node resource-demo.js

# Or using npm
npm start
```

### Testing Different Patterns

```bash
# Test gradual resource increase
npm run test:gradual

# Test sudden resource spike
npm run test:spike

# Test wave/oscillating pattern
npm run test:wave

# Test plateau pattern  
npm run test:plateau
```

### Testing Different Resource Levels

```bash
# Light resource usage (30% CPU, 100MB memory)
npm run test:light

# Heavy resource usage (90% CPU, 1GB memory)
npm run test:heavy

# Fast ramp-up timing
npm run test:fast

# Slow ramp-up timing
npm run test:slow
```

## Configuration

Customize behavior with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `RESOURCE_PATTERN` | "gradual" | Pattern: gradual, spike, wave, plateau |
| `MAX_CPU_PERCENT` | 80 | Maximum CPU usage percentage |
| `MAX_MEMORY_MB` | 500 | Maximum memory consumption in MB |
| `CPU_STEP_PERCENT` | 10 | CPU increase per step |
| `MEMORY_STEP_MB` | 25 | Memory increase per step |
| `CPU_RAMP_INTERVAL` | 15 | Seconds between CPU increases |
| `MEMORY_RAMP_INTERVAL` | 20 | Seconds between memory increases |
| `LOG_INTERVAL` | 10 | Seconds between resource logs |

### Example Custom Configuration

```bash
# Conservative resource test
MAX_CPU_PERCENT=50 MAX_MEMORY_MB=200 RESOURCE_PATTERN=gradual node resource-demo.js

# Aggressive spike test for alerts
RESOURCE_PATTERN=spike MAX_CPU_PERCENT=95 MAX_MEMORY_MB=800 node resource-demo.js

# Fast wave pattern for dynamic testing
RESOURCE_PATTERN=wave CPU_RAMP_INTERVAL=5 LOG_INTERVAL=3 node resource-demo.js
```

## Testing with Installation Up 4evr

### 1. Basic Monitoring Test

1. **Install the app** as a launch agent through Installation Up 4evr
2. **Start monitoring** in the dashboard
3. **Watch resource metrics** increase over time
4. **Verify alerts** trigger at configured thresholds
5. **Check notification channels** (Slack, Discord, etc.)

### 2. Alert Threshold Testing

```bash
# Test CPU alerts
MAX_CPU_PERCENT=90 RESOURCE_PATTERN=gradual node resource-demo.js

# Test memory alerts  
MAX_MEMORY_MB=1000 RESOURCE_PATTERN=spike node resource-demo.js

# Test combined resource pressure
MAX_CPU_PERCENT=80 MAX_MEMORY_MB=800 RESOURCE_PATTERN=plateau node resource-demo.js
```

### 3. Performance Impact Testing

```bash
# Test system response to high load
npm run test:heavy

# Test monitoring overhead during resource stress
RESOURCE_PATTERN=wave LOG_INTERVAL=1 node resource-demo.js
```

## Expected Output

```
📊 ResourceDemo started at 2025-06-26T04:30:15.123Z
📝 Log file: /Users/username/resource-demo.log
⚙️  Configuration: {
  "cpuRampInterval": 15,
  "memoryRampInterval": 20,
  "logInterval": 10,
  "maxCpuPercent": 80,
  "maxMemoryMB": 500,
  "pattern": "gradual"
}
🚀 ResourceDemo starting - initializing resource consumption
📈 Pattern: gradual - Max CPU: 80% - Max Memory: 500MB
📊 Resources - uptime: 0s | cpuWorkers: 0 | cpuEstimate: 0% | heapUsed: 8MB | rss: 25MB | memoryBlocks: 0 | allocatedMemory: 0MB | pid: 12345 | cycle: 0
🔥 CPU increased to ~10% (1 workers)
🧠 Memory increased to ~25MB (25 blocks)
📊 Resources - uptime: 20s | cpuWorkers: 1 | cpuEstimate: 10% | heapUsed: 35MB | rss: 45MB | memoryBlocks: 25 | allocatedMemory: 25MB | pid: 12345 | cycle: 2
```

## What this demonstrates

- **Monitoring accuracy** - Real-time tracking of CPU and memory usage
- **Alert responsiveness** - How quickly monitoring system detects threshold breaches
- **Resource management** - System behavior under controlled resource pressure
- **Notification delivery** - Alert channels working properly
- **Dashboard functionality** - Visual representation of resource metrics
- **Performance impact** - How monitoring affects system performance

## Files Created

- `~/resource-demo.log` - Detailed resource consumption and metrics log
- Memory/CPU consumption visible in system monitors

## Safety Notes

- **Memory usage is controlled** - won't exceed configured limits
- **CPU usage is interruptible** - responds to shutdown signals
- **Graceful cleanup** - releases all resources on exit
- **System-friendly** - designed not to crash the system

## Troubleshooting

**High CPU usage not showing in system monitor:**
- CPU estimation is approximate
- Try lower ramp intervals for more noticeable usage
- Check if other system processes are interfering

**Memory usage not increasing as expected:**
- Node.js garbage collection may be running
- Try running with `--expose-gc` flag for more control
- Monitor RSS memory instead of heap usage

**Monitoring alerts not triggering:**
- Check alert threshold configuration in Installation Up 4evr
- Verify notification channels are properly configured
- Ensure monitoring service is actively running

## Integration Notes

This app is designed to:
- Generate realistic resource consumption patterns
- Test monitoring system accuracy and responsiveness  
- Validate alert threshold configurations
- Stress-test notification delivery systems
- Provide controlled load for performance testing