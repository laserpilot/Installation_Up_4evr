/**
 * Baseline System State Logger
 * Captures regular snapshots of normal system operation for forensic analysis
 */

const os = require('os');
const { execSync } = require('child_process');
const { LOG_LEVELS } = require('./logger');

class BaselineLogger {
  constructor(logger, options = {}) {
    this.logger = logger;
    this.options = {
      interval: options.interval || 30 * 60 * 1000, // 30 minutes default
      enabled: options.enabled !== false,
      captureProcesses: options.captureProcesses !== false,
      captureNetwork: options.captureNetwork !== false,
      captureDisplays: options.captureDisplays !== false,
      captureOpenFiles: options.captureOpenFiles || false, // More intensive
      maxProcessCount: options.maxProcessCount || 50,
      ...options
    };

    this.intervalId = null;
    this.lastBaseline = null;
    this.baselineHistory = [];
    this.maxHistoryLength = 48; // Keep 24 hours at 30min intervals
  }

  /**
   * Start baseline logging
   */
  start() {
    if (!this.options.enabled || this.intervalId) {
      return;
    }

    this.logger.info('application', 'Starting baseline system logging', {
      interval: this.options.interval,
      features: {
        processes: this.options.captureProcesses,
        network: this.options.captureNetwork,
        displays: this.options.captureDisplays,
        openFiles: this.options.captureOpenFiles
      }
    });

    // Capture initial baseline
    this.captureBaseline();

    // Set up regular interval
    this.intervalId = setInterval(() => {
      this.captureBaseline();
    }, this.options.interval);
  }

  /**
   * Stop baseline logging
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info('application', 'Stopped baseline system logging');
    }
  }

  /**
   * Capture comprehensive system baseline
   */
  async captureBaseline() {
    try {
      const baseline = {
        timestamp: new Date().toISOString(),
        system: this.captureSystemMetrics(),
        processes: this.options.captureProcesses ? this.captureProcessInfo() : null,
        network: this.options.captureNetwork ? this.captureNetworkInfo() : null,
        displays: this.options.captureDisplays ? this.captureDisplayInfo() : null,
        openFiles: this.options.captureOpenFiles ? this.captureOpenFiles() : null,
        environment: this.captureEnvironmentInfo()
      };

      // Compare with last baseline to detect changes
      if (this.lastBaseline) {
        baseline.changes = this.detectChanges(this.lastBaseline, baseline);
      }

      // Store in history
      this.baselineHistory.push(baseline);
      if (this.baselineHistory.length > this.maxHistoryLength) {
        this.baselineHistory.shift(); // Remove oldest
      }

      // Log the baseline
      this.logger.logBaselineSnapshot(baseline, {
        changeCount: baseline.changes ? Object.keys(baseline.changes).length : 0,
        isInitial: !this.lastBaseline
      });

      // Log significant changes separately
      if (baseline.changes && Object.keys(baseline.changes).length > 0) {
        this.logSignificantChanges(baseline.changes);
      }

      this.lastBaseline = baseline;

    } catch (error) {
      this.logger.logException(error, {
        operation: 'captureBaseline',
        component: 'BaselineLogger'
      });
    }
  }

  /**
   * Capture core system metrics
   */
  captureSystemMetrics() {
    const memInfo = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: totalMem - freeMem,
        usagePercent: ((totalMem - freeMem) / totalMem * 100).toFixed(2),
        process: memInfo
      },
      cpu: {
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        arch: os.arch(),
        platform: os.platform()
      },
      network: {
        hostname: os.hostname(),
        networkInterfaces: Object.keys(os.networkInterfaces())
      }
    };
  }

  /**
   * Capture running process information
   */
  captureProcessInfo() {
    try {
      const isWindows = process.platform === 'win32';
      let processOutput;
      
      if (isWindows) {
        // Windows process list
        processOutput = execSync('tasklist /fo csv', { encoding: 'utf8', timeout: 5000 });
        return this.parseWindowsProcesses(processOutput);
      } else {
        // macOS/Linux process list
        processOutput = execSync('ps aux', { encoding: 'utf8', timeout: 5000 });
        return this.parseUnixProcesses(processOutput);
      }
    } catch (error) {
      this.logger.error('baseline', 'Failed to capture process info', { error: error.message });
      return { error: 'Failed to capture processes', count: 0 };
    }
  }

  /**
   * Parse Unix-style process output
   */
  parseUnixProcesses(output) {
    const lines = output.split('\n').slice(1); // Skip header
    const processes = [];

    for (const line of lines.slice(0, this.options.maxProcessCount)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 11) {
        processes.push({
          user: parts[0],
          pid: parts[1],
          cpu: parseFloat(parts[2]),
          memory: parseFloat(parts[3]),
          command: parts.slice(10).join(' ')
        });
      }
    }

    return {
      count: processes.length,
      totalLines: lines.length,
      processes: processes,
      topCpu: processes.sort((a, b) => b.cpu - a.cpu).slice(0, 5),
      topMemory: processes.sort((a, b) => b.memory - a.memory).slice(0, 5)
    };
  }

  /**
   * Parse Windows process output
   */
  parseWindowsProcesses(output) {
    const lines = output.split('\n').slice(1); // Skip header
    const processes = [];

    for (const line of lines.slice(0, this.options.maxProcessCount)) {
      const parts = line.split(',').map(part => part.replace(/"/g, ''));
      if (parts.length >= 5) {
        processes.push({
          name: parts[0],
          pid: parts[1],
          sessionName: parts[2],
          sessionNumber: parts[3],
          memUsage: parts[4]
        });
      }
    }

    return {
      count: processes.length,
      totalLines: lines.length,
      processes: processes
    };
  }

  /**
   * Capture network connection information
   */
  captureNetworkInfo() {
    try {
      const interfaces = os.networkInterfaces();
      const activeConnections = {};

      for (const [name, addresses] of Object.entries(interfaces)) {
        activeConnections[name] = addresses.filter(addr => !addr.internal);
      }

      return {
        interfaces: Object.keys(interfaces),
        activeConnections,
        defaultRoute: this.getDefaultRoute()
      };
    } catch (error) {
      this.logger.error('baseline', 'Failed to capture network info', { error: error.message });
      return { error: 'Failed to capture network info' };
    }
  }

  /**
   * Get default network route
   */
  getDefaultRoute() {
    try {
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        const output = execSync('route print 0.0.0.0', { encoding: 'utf8', timeout: 3000 });
        return { raw: output.split('\n')[0] };
      } else {
        const output = execSync('route get default', { encoding: 'utf8', timeout: 3000 });
        return { raw: output.split('\n')[0] };
      }
    } catch (error) {
      return { error: 'Failed to get default route' };
    }
  }

  /**
   * Capture display configuration (macOS specific)
   */
  captureDisplayInfo() {
    try {
      if (process.platform === 'darwin') {
        const output = execSync('system_profiler SPDisplaysDataType -json', { 
          encoding: 'utf8', 
          timeout: 5000 
        });
        const displayData = JSON.parse(output);
        return {
          displays: displayData.SPDisplaysDataType || [],
          count: (displayData.SPDisplaysDataType || []).length
        };
      } else if (process.platform === 'win32') {
        // Windows display info would go here
        return { platform: 'windows', message: 'Display info not implemented for Windows' };
      } else {
        return { platform: process.platform, message: 'Display info not available' };
      }
    } catch (error) {
      this.logger.error('baseline', 'Failed to capture display info', { error: error.message });
      return { error: 'Failed to capture display info' };
    }
  }

  /**
   * Capture open files (resource intensive)
   */
  captureOpenFiles() {
    try {
      if (process.platform === 'darwin') {
        const output = execSync('lsof | head -100', { encoding: 'utf8', timeout: 5000 });
        const lines = output.split('\n').slice(1);
        return {
          count: lines.length,
          sample: lines.slice(0, 20).map(line => {
            const parts = line.split(/\s+/);
            return {
              command: parts[0],
              pid: parts[1],
              user: parts[2],
              fd: parts[3],
              type: parts[4],
              name: parts.slice(8).join(' ')
            };
          })
        };
      }
      return { message: 'Open files capture not implemented for this platform' };
    } catch (error) {
      return { error: 'Failed to capture open files' };
    }
  }

  /**
   * Capture environment information
   */
  captureEnvironmentInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      environmentSize: Object.keys(process.env).length,
      userInfo: os.userInfo(),
      tmpdir: os.tmpdir()
    };
  }

  /**
   * Detect significant changes between baselines
   */
  detectChanges(oldBaseline, newBaseline) {
    const changes = {};

    // Check process count changes
    if (oldBaseline.processes && newBaseline.processes) {
      const oldCount = oldBaseline.processes.count;
      const newCount = newBaseline.processes.count;
      if (Math.abs(oldCount - newCount) > 5) {
        changes.processCount = { old: oldCount, new: newCount, delta: newCount - oldCount };
      }
    }

    // Check memory usage changes
    const oldMemPercent = parseFloat(oldBaseline.system.memory.usagePercent);
    const newMemPercent = parseFloat(newBaseline.system.memory.usagePercent);
    if (Math.abs(oldMemPercent - newMemPercent) > 10) {
      changes.memoryUsage = { old: oldMemPercent, new: newMemPercent, delta: newMemPercent - oldMemPercent };
    }

    // Check network interface changes
    if (oldBaseline.network && newBaseline.network) {
      const oldInterfaces = oldBaseline.network.interfaces || [];
      const newInterfaces = newBaseline.network.interfaces || [];
      if (JSON.stringify(oldInterfaces.sort()) !== JSON.stringify(newInterfaces.sort())) {
        changes.networkInterfaces = { old: oldInterfaces, new: newInterfaces };
      }
    }

    // Check display changes
    if (oldBaseline.displays && newBaseline.displays) {
      const oldCount = oldBaseline.displays.count || 0;
      const newCount = newBaseline.displays.count || 0;
      if (oldCount !== newCount) {
        changes.displayCount = { old: oldCount, new: newCount };
      }
    }

    return changes;
  }

  /**
   * Log significant changes as anomalies
   */
  logSignificantChanges(changes) {
    for (const [type, change] of Object.entries(changes)) {
      let severity = 'info';
      let description = '';

      switch (type) {
        case 'processCount':
          severity = Math.abs(change.delta) > 10 ? 'warn' : 'info';
          description = `Process count changed by ${change.delta} (${change.old} → ${change.new})`;
          break;
        case 'memoryUsage':
          severity = Math.abs(change.delta) > 20 ? 'warn' : 'info';
          description = `Memory usage changed by ${change.delta.toFixed(1)}% (${change.old}% → ${change.new}%)`;
          break;
        case 'networkInterfaces':
          severity = 'warn';
          description = `Network interfaces changed`;
          break;
        case 'displayCount':
          severity = 'info';
          description = `Display count changed (${change.old} → ${change.new})`;
          break;
        default:
          description = `System change detected in ${type}`;
      }

      this.logger.anomaly(
        severity === 'warn' ? LOG_LEVELS.WARN : LOG_LEVELS.INFO,
        description,
        {
          changeType: type,
          changeData: change,
          source: 'baseline_comparison'
        }
      );
    }
  }

  /**
   * Get recent baseline history
   */
  getHistory(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.baselineHistory.filter(baseline => 
      new Date(baseline.timestamp) > cutoff
    );
  }

  /**
   * Get current baseline data
   */
  getCurrentBaseline() {
    return this.lastBaseline;
  }
}

module.exports = BaselineLogger;