/**
 * Platform-Agnostic Monitoring Core
 * Manages monitoring functionality across different platforms
 */

const EventEmitter = require('events');
const { PlatformFactory, MonitoringDataInterface } = require('../interfaces');

class MonitoringCore extends EventEmitter {
    constructor() {
        super();
        this.installationId = this.generateInstallationId();
        this.monitoringData = new MonitoringDataInterface();
        this.watchedApplications = new Map();
        this.appHistory = new Map();
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
        
        // Initialize platform-specific provider
        try {
            this.provider = PlatformFactory.createMonitoringProvider();
        } catch (error) {
            console.warn('Failed to initialize platform-specific monitoring:', error.message);
            this.provider = null;
        }
    }

    generateInstallationId() {
        const os = require('os');
        const crypto = require('crypto');
        const hostname = os.hostname();
        const platform = os.platform();
        const arch = os.arch();
        const random = Math.random().toString(36).substring(2, 15);
        const seed = `${hostname}-${platform}-${arch}-${Date.now()}-${random}`;
        return crypto.createHash('md5').update(seed).digest('hex').substring(0, 16);
    }

    /**
     * Start monitoring system with specified interval
     */
    async startMonitoring(interval = 30000) {
        if (!this.provider) {
            throw new Error('No monitoring provider available for this platform');
        }

        console.log('[INFO] Starting monitoring system', { interval });
        
        // Start data collection
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.collectMonitoringData();
                this.evaluateAlerts();
            } catch (error) {
                console.error('[ERROR] Monitoring data collection failed:', error);
            }
        }, interval);

        // Start heartbeat
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, Math.min(interval, 60000)); // Heartbeat at least every minute

        // Initial data collection
        await this.collectMonitoringData();
        this.sendHeartbeat();
    }

    /**
     * Stop monitoring system
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        console.log('[INFO] Monitoring system stopped');
    }

    /**
     * Collect monitoring data from platform provider
     */
    async collectMonitoringData() {
        if (!this.provider) return;

        try {
            // Get system metrics
            this.monitoringData.system = await this.provider.getSystemMetrics();
            
            // Get network information
            this.monitoringData.network = await this.provider.getNetworkInfo();
            
            // Get application status
            this.monitoringData.applications = await this.provider.getApplicationStatus(
                Array.from(this.watchedApplications.keys())
            );
            
            // Get display information
            this.monitoringData.displays = await this.provider.getDisplayInfo();
            
            // Update timestamp
            this.monitoringData.timestamp = new Date().toISOString();

            // Emit monitoring data event
            this.emit('dataCollected', this.monitoringData);

        } catch (error) {
            console.error('[ERROR] Failed to collect monitoring data:', error);
            this.emit('monitoringError', error);
        }
    }

    /**
     * Evaluate alerts based on current data and thresholds
     */
    evaluateAlerts() {
        const alerts = [];
        const system = this.monitoringData.system;

        // CPU usage alert
        if (system.cpu && system.cpu.usage > this.alertThresholds.cpuUsage) {
            alerts.push({
                type: 'cpu_high',
                level: 'warning',
                message: `High CPU usage: ${system.cpu.usage.toFixed(1)}%`,
                value: system.cpu.usage,
                threshold: this.alertThresholds.cpuUsage
            });
        }

        // Memory usage alert
        if (system.memory && system.memory.usage > this.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'memory_high',
                level: 'warning',
                message: `High memory usage: ${system.memory.usage.toFixed(1)}%`,
                value: system.memory.usage,
                threshold: this.alertThresholds.memoryUsage
            });
        }

        // Disk usage alert
        if (system.disk && system.disk.usage > this.alertThresholds.diskUsage) {
            alerts.push({
                type: 'disk_high',
                level: 'critical',
                message: `High disk usage: ${system.disk.usage.toFixed(1)}%`,
                value: system.disk.usage,
                threshold: this.alertThresholds.diskUsage
            });
        }

        // Application alerts
        this.monitoringData.applications.forEach(app => {
            if (app.status === 'stopped' && app.shouldBeRunning) {
                alerts.push({
                    type: 'app_stopped',
                    level: 'critical',
                    message: `Application stopped: ${app.name}`,
                    application: app.name
                });
            }
        });

        // Emit alerts if any
        if (alerts.length > 0) {
            this.emit('alerts', alerts);
        }
    }

    /**
     * Send heartbeat signal
     */
    sendHeartbeat() {
        const heartbeat = {
            installationId: this.installationId,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            status: this.getOverallStatus(),
            quickStats: {
                cpu: this.monitoringData.system.cpu?.usage || 0,
                memory: this.monitoringData.system.memory?.usage || 0,
                apps: this.monitoringData.applications.length
            }
        };

        console.log('[DEBUG] Heartbeat sent', heartbeat);
        this.emit('heartbeat', heartbeat);
    }

    /**
     * Get overall system status
     */
    getOverallStatus() {
        const system = this.monitoringData.system;
        
        // Check for critical issues
        if (system.disk?.usage > 95) return 'critical';
        if (system.cpu?.usage > 95) return 'critical';
        if (system.memory?.usage > 95) return 'critical';
        
        // Check for warnings
        if (system.disk?.usage > this.alertThresholds.diskUsage) return 'warning';
        if (system.cpu?.usage > this.alertThresholds.cpuUsage) return 'warning';
        if (system.memory?.usage > this.alertThresholds.memoryUsage) return 'warning';
        
        // Check application status
        const stoppedApps = this.monitoringData.applications.filter(app => 
            app.status === 'stopped' && app.shouldBeRunning
        );
        if (stoppedApps.length > 0) return 'warning';
        
        return 'good';
    }

    /**
     * Add application to monitoring
     */
    addApplication(name, path, options = {}) {
        this.watchedApplications.set(name, {
            path,
            shouldBeRunning: options.shouldBeRunning !== false,
            ...options
        });
    }

    /**
     * Remove application from monitoring
     */
    removeApplication(name) {
        this.watchedApplications.delete(name);
    }

    /**
     * Update alert thresholds
     */
    updateThresholds(newThresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
        this.emit('thresholdsUpdated', this.alertThresholds);
    }

    /**
     * Get current monitoring data
     */
    getCurrentData() {
        return this.monitoringData;
    }

    /**
     * Get application history
     */
    getApplicationHistory(appName) {
        return this.appHistory.get(appName) || [];
    }
}

module.exports = MonitoringCore;