/**
 * Installation Monitoring and Control System
 * Provides health monitoring, heartbeat tracking, and remote control capabilities
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

class MonitoringSystem extends EventEmitter {
    constructor() {
        super();
        this.installationId = this.generateInstallationId();
        this.logsDir = path.join(os.homedir(), '.installation-up-4evr', 'logs');
        this.monitoringData = {
            system: {},
            applications: {},
            displays: {},
            network: {},
            storage: {},
            lastHeartbeat: null,
            status: 'unknown'
        };
        this.watchedApplications = new Map();
        this.monitoringInterval = null;
        this.heartbeatInterval = null;
        this.notifications = [];
        this.alertThresholds = {
            cpuUsage: 90,
            memoryUsage: 90,
            diskUsage: 90,
            temperatureCpu: 85,
            appRestarts: 5
        };
        this.setupDirectories();
    }

    async setupDirectories() {
        try {
            await fs.mkdir(this.logsDir, { recursive: true });
        } catch (error) {
            console.warn('Could not create logs directory:', error.message);
        }
    }

    generateInstallationId() {
        const hostname = os.hostname();
        const timestamp = Date.now().toString(36);
        return `${hostname}-${timestamp}`;
    }

    /**
     * Start monitoring system
     */
    startMonitoring(intervalMs = 30000) {
        this.log('info', 'Starting monitoring system', { interval: intervalMs });
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        // Initial check
        this.collectSystemData();

        // Set up periodic monitoring
        this.monitoringInterval = setInterval(() => {
            this.collectSystemData();
        }, intervalMs);

        // Start heartbeat
        this.startHeartbeat();

        this.emit('monitoring-started');
    }

    /**
     * Stop monitoring system
     */
    stopMonitoring() {
        this.log('info', 'Stopping monitoring system');
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        this.emit('monitoring-stopped');
    }

    /**
     * Start heartbeat system
     */
    startHeartbeat(intervalMs = 60000) {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, intervalMs);

        // Send initial heartbeat
        this.sendHeartbeat();
    }

    /**
     * Send heartbeat signal
     */
    sendHeartbeat() {
        const heartbeat = {
            installationId: this.installationId,
            timestamp: new Date().toISOString(),
            uptime: os.uptime(),
            status: this.monitoringData.status,
            quickStats: {
                cpu: this.monitoringData.system.cpuUsage || 0,
                memory: this.monitoringData.system.memoryUsage || 0,
                apps: Object.keys(this.monitoringData.applications).length
            }
        };

        this.monitoringData.lastHeartbeat = heartbeat;
        this.emit('heartbeat', heartbeat);
        this.log('debug', 'Heartbeat sent', heartbeat);
    }

    /**
     * Collect comprehensive system data
     */
    async collectSystemData() {
        try {
            const [systemInfo, appInfo, displayInfo, networkInfo, storageInfo] = await Promise.all([
                this.getSystemInfo(),
                this.getApplicationInfo(),
                this.getDisplayInfo(),
                this.getNetworkInfo(),
                this.getStorageInfo()
            ]);

            this.monitoringData = {
                ...this.monitoringData,
                system: systemInfo,
                applications: appInfo,
                displays: displayInfo,
                network: networkInfo,
                storage: storageInfo,
                lastUpdated: new Date().toISOString()
            };

            // Determine overall status
            this.updateSystemStatus();

            // Check for alerts
            this.checkAlerts();

            this.emit('data-updated', this.monitoringData);
            
        } catch (error) {
            this.log('error', 'Failed to collect system data', { error: error.message });
        }
    }

    /**
     * Get system performance information
     */
    async getSystemInfo() {
        try {
            const cpuInfo = await this.getCpuUsage();
            const memoryInfo = await this.getMemoryUsage();
            const temperatureInfo = await this.getTemperature();
            const loadAverage = os.loadavg();

            return {
                hostname: os.hostname(),
                platform: os.platform(),
                release: os.release(),
                architecture: os.arch(),
                uptime: os.uptime(),
                cpuUsage: cpuInfo.usage,
                cpuCores: os.cpus().length,
                memoryUsage: memoryInfo.percentage,
                memoryTotal: memoryInfo.total,
                memoryFree: memoryInfo.free,
                loadAverage: loadAverage,
                temperature: temperatureInfo,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log('error', 'Failed to get system info', { error: error.message });
            return {};
        }
    }

    /**
     * Get CPU usage percentage
     */
    async getCpuUsage() {
        try {
            const { stdout } = await execAsync('top -l 1 -s 0 | grep "CPU usage"');
            const match = stdout.match(/(\d+\.?\d*)% user/);
            const usage = match ? parseFloat(match[1]) : 0;
            return { usage, raw: stdout.trim() };
        } catch (error) {
            return { usage: 0, error: error.message };
        }
    }

    /**
     * Get memory usage information
     */
    async getMemoryUsage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const percentage = (usedMemory / totalMemory) * 100;

        return {
            total: totalMemory,
            free: freeMemory,
            used: usedMemory,
            percentage: percentage
        };
    }

    /**
     * Get system temperature (if available)
     */
    async getTemperature() {
        try {
            // Try to get temperature on macOS
            const { stdout } = await execAsync('sudo powermetrics -n 1 --samplers smc -a --hide-cpu-duty-cycle 2>/dev/null | grep "CPU die temperature"');
            const match = stdout.match(/(\d+\.?\d*)\s*C/);
            return match ? parseFloat(match[1]) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get application status information
     */
    async getApplicationInfo() {
        const applications = {};

        // Check all watched applications
        for (const [appName, config] of this.watchedApplications) {
            try {
                const appInfo = await this.getAppStatus(appName, config);
                applications[appName] = appInfo;
            } catch (error) {
                applications[appName] = {
                    name: appName,
                    status: 'error',
                    error: error.message,
                    lastChecked: new Date().toISOString()
                };
            }
        }

        return applications;
    }

    /**
     * Get status of specific application
     */
    async getAppStatus(appName, config = {}) {
        try {
            const { stdout } = await execAsync(`ps aux | grep "${appName}" | grep -v grep`);
            const lines = stdout.trim().split('\n').filter(line => line.trim());

            if (lines.length === 0) {
                return {
                    name: appName,
                    status: 'stopped',
                    pid: null,
                    cpuUsage: 0,
                    memoryUsage: 0,
                    restartCount: config.restartCount || 0,
                    lastChecked: new Date().toISOString()
                };
            }

            // Parse process information
            const processInfo = this.parseProcessInfo(lines[0]);
            
            return {
                name: appName,
                status: 'running',
                pid: processInfo.pid,
                cpuUsage: processInfo.cpu,
                memoryUsage: processInfo.memory,
                uptime: processInfo.time,
                restartCount: config.restartCount || 0,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to get app status: ${error.message}`);
        }
    }

    /**
     * Parse process information from ps output
     */
    parseProcessInfo(processLine) {
        const parts = processLine.trim().split(/\s+/);
        return {
            user: parts[0],
            pid: parseInt(parts[1]),
            cpu: parseFloat(parts[2]),
            memory: parseFloat(parts[3]),
            vsz: parseInt(parts[4]),
            rss: parseInt(parts[5]),
            tt: parts[6],
            stat: parts[7],
            started: parts[8],
            time: parts[9],
            command: parts.slice(10).join(' ')
        };
    }

    /**
     * Get display information
     */
    async getDisplayInfo() {
        try {
            const { stdout } = await execAsync('system_profiler SPDisplaysDataType -json');
            const data = JSON.parse(stdout);
            
            const displays = {};
            
            if (data.SPDisplaysDataType) {
                data.SPDisplaysDataType.forEach((display, index) => {
                    displays[`display_${index}`] = {
                        name: display._name || `Display ${index + 1}`,
                        resolution: display.spdisplays_resolution || 'Unknown',
                        online: display.spdisplays_online === 'spdisplays_yes',
                        connection: display.spdisplays_connection_type || 'Unknown',
                        displayType: display.spdisplays_display_type || 'Unknown'
                    };
                });
            }

            return displays;
        } catch (error) {
            this.log('error', 'Failed to get display info', { error: error.message });
            return {};
        }
    }

    /**
     * Get network information
     */
    async getNetworkInfo() {
        try {
            const interfaces = os.networkInterfaces();
            const networkInfo = {};

            for (const [name, addresses] of Object.entries(interfaces)) {
                const ipv4 = addresses.find(addr => addr.family === 'IPv4' && !addr.internal);
                if (ipv4) {
                    networkInfo[name] = {
                        ip: ipv4.address,
                        netmask: ipv4.netmask,
                        mac: ipv4.mac,
                        connected: true
                    };
                }
            }

            // Test internet connectivity
            try {
                await execAsync('ping -c 1 8.8.8.8');
                networkInfo.internetConnected = true;
            } catch (error) {
                networkInfo.internetConnected = false;
            }

            return networkInfo;
        } catch (error) {
            this.log('error', 'Failed to get network info', { error: error.message });
            return {};
        }
    }

    /**
     * Get storage information
     */
    async getStorageInfo() {
        try {
            const { stdout } = await execAsync('df -h');
            const lines = stdout.trim().split('\n').slice(1); // Skip header
            
            const storage = {};
            
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 6) {
                    const mountPoint = parts[5];
                    const usageMatch = parts[4].match(/(\d+)%/);
                    
                    storage[mountPoint] = {
                        filesystem: parts[0],
                        total: parts[1],
                        used: parts[2],
                        available: parts[3],
                        usagePercent: usageMatch ? parseInt(usageMatch[1]) : 0,
                        mountPoint: mountPoint
                    };
                }
            });

            return storage;
        } catch (error) {
            this.log('error', 'Failed to get storage info', { error: error.message });
            return {};
        }
    }

    /**
     * Update overall system status
     */
    updateSystemStatus() {
        const issues = [];
        
        // Check CPU usage
        if (this.monitoringData.system.cpuUsage > this.alertThresholds.cpuUsage) {
            issues.push('high-cpu');
        }

        // Check memory usage
        if (this.monitoringData.system.memoryUsage > this.alertThresholds.memoryUsage) {
            issues.push('high-memory');
        }

        // Check disk usage
        for (const [mount, info] of Object.entries(this.monitoringData.storage)) {
            if (info.usagePercent > this.alertThresholds.diskUsage) {
                issues.push('high-disk');
                break;
            }
        }

        // Check application status
        for (const [name, app] of Object.entries(this.monitoringData.applications)) {
            if (app.status === 'stopped') {
                issues.push('app-down');
            } else if (app.restartCount > this.alertThresholds.appRestarts) {
                issues.push('app-unstable');
            }
        }

        // Check displays
        const onlineDisplays = Object.values(this.monitoringData.displays).filter(d => d.online);
        if (onlineDisplays.length === 0) {
            issues.push('no-display');
        }

        // Determine status
        if (issues.length === 0) {
            this.monitoringData.status = 'healthy';
        } else if (issues.some(issue => ['app-down', 'no-display'].includes(issue))) {
            this.monitoringData.status = 'critical';
        } else {
            this.monitoringData.status = 'warning';
        }

        this.monitoringData.issues = issues;
    }

    /**
     * Check for alert conditions
     */
    checkAlerts() {
        const now = new Date().toISOString();
        
        // CPU alert
        if (this.monitoringData.system.cpuUsage > this.alertThresholds.cpuUsage) {
            this.createAlert('high-cpu', `CPU usage at ${this.monitoringData.system.cpuUsage.toFixed(1)}%`, 'warning');
        }

        // Memory alert
        if (this.monitoringData.system.memoryUsage > this.alertThresholds.memoryUsage) {
            this.createAlert('high-memory', `Memory usage at ${this.monitoringData.system.memoryUsage.toFixed(1)}%`, 'warning');
        }

        // Application alerts
        for (const [name, app] of Object.entries(this.monitoringData.applications)) {
            if (app.status === 'stopped') {
                this.createAlert('app-stopped', `Application ${name} is not running`, 'critical');
            }
        }

        // Display alerts
        const onlineDisplays = Object.values(this.monitoringData.displays).filter(d => d.online);
        if (onlineDisplays.length === 0) {
            this.createAlert('no-display', 'No displays detected online', 'critical');
        }
    }

    /**
     * Create alert/notification
     */
    createAlert(type, message, severity = 'info') {
        const alert = {
            id: `${type}-${Date.now()}`,
            type: type,
            message: message,
            severity: severity,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };

        this.notifications.push(alert);
        this.log(severity, message, { alertType: type });
        this.emit('alert', alert);

        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(-100);
        }

        return alert;
    }

    /**
     * Add application to monitoring
     */
    addWatchedApplication(appName, config = {}) {
        this.watchedApplications.set(appName, {
            name: appName,
            restartCount: 0,
            ...config
        });
        
        this.log('info', `Added application to monitoring: ${appName}`);
    }

    /**
     * Remove application from monitoring
     */
    removeWatchedApplication(appName) {
        this.watchedApplications.delete(appName);
        delete this.monitoringData.applications[appName];
        
        this.log('info', `Removed application from monitoring: ${appName}`);
    }

    /**
     * Get current monitoring data
     */
    getMonitoringData() {
        return {
            ...this.monitoringData,
            installationId: this.installationId,
            monitoringActive: this.monitoringInterval !== null,
            watchedApps: Array.from(this.watchedApplications.keys()),
            notifications: this.notifications.slice(-20) // Last 20 notifications
        };
    }

    /**
     * Get system health summary
     */
    getHealthSummary() {
        const data = this.monitoringData;
        
        return {
            status: data.status,
            uptime: data.system.uptime || 0,
            cpu: data.system.cpuUsage || 0,
            memory: data.system.memoryUsage || 0,
            applications: {
                total: Object.keys(data.applications).length,
                running: Object.values(data.applications).filter(app => app.status === 'running').length,
                stopped: Object.values(data.applications).filter(app => app.status === 'stopped').length
            },
            displays: {
                total: Object.keys(data.displays).length,
                online: Object.values(data.displays).filter(d => d.online).length
            },
            issues: data.issues || [],
            lastHeartbeat: data.lastHeartbeat?.timestamp,
            lastUpdated: data.lastUpdated
        };
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.notifications.find(n => n.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            alert.acknowledgedAt = new Date().toISOString();
            this.emit('alert-acknowledged', alert);
            return alert;
        }
        return null;
    }

    /**
     * Clear old notifications
     */
    clearOldNotifications(olderThanHours = 24) {
        const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
        const before = this.notifications.length;
        
        this.notifications = this.notifications.filter(notification => 
            new Date(notification.timestamp) > cutoff
        );
        
        const cleared = before - this.notifications.length;
        if (cleared > 0) {
            this.log('info', `Cleared ${cleared} old notifications`);
        }
        
        return cleared;
    }

    /**
     * Log message with timestamp
     */
    log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            installationId: this.installationId,
            ...data
        };

        console.log(`[${level.toUpperCase()}] ${message}`, data);
        this.emit('log', logEntry);

        // Write to log file
        this.writeLogToFile(logEntry);
    }

    /**
     * Write log entry to file
     */
    async writeLogToFile(logEntry) {
        try {
            const date = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logsDir, `installation-${date}.log`);
            const logLine = JSON.stringify(logEntry) + '\n';
            
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.warn('Failed to write log to file:', error.message);
        }
    }

    /**
     * Get recent logs
     */
    async getRecentLogs(hours = 24, level = null) {
        try {
            const files = await fs.readdir(this.logsDir);
            const logFiles = files.filter(file => file.endsWith('.log')).sort().reverse();
            
            const logs = [];
            const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
            
            for (const file of logFiles.slice(0, 7)) { // Check last 7 days max
                try {
                    const content = await fs.readFile(path.join(this.logsDir, file), 'utf8');
                    const lines = content.trim().split('\n').filter(line => line);
                    
                    for (const line of lines) {
                        try {
                            const logEntry = JSON.parse(line);
                            const timestamp = new Date(logEntry.timestamp);
                            
                            if (timestamp > cutoff) {
                                if (!level || logEntry.level === level) {
                                    logs.push(logEntry);
                                }
                            }
                        } catch (parseError) {
                            // Skip invalid log lines
                        }
                    }
                } catch (fileError) {
                    // Skip files we can't read
                }
            }
            
            return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            this.log('error', 'Failed to get recent logs', { error: error.message });
            return [];
        }
    }
}

module.exports = MonitoringSystem;