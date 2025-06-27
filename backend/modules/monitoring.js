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
        this.appHistory = new Map(); // Historical app performance data
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
                memoryUsage: memoryInfo.pressurePercentage, // Use pressure instead of simple percentage
                memoryPressure: memoryInfo.pressurePercentage,
                memoryTotal: memoryInfo.total,
                memoryFree: memoryInfo.free,
                memoryActive: memoryInfo.active,
                memoryWired: memoryInfo.wired,
                memoryCompressed: memoryInfo.compressed,
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
     * Get CPU usage percentage (improved to show total CPU usage)
     */
    async getCpuUsage() {
        try {
            // Use top with 2 samples for more accurate averaging
            const { stdout } = await execAsync('top -l 2 -s 1 | grep "CPU usage" | tail -1');
            
            // Parse both user and system CPU to get total usage
            const userMatch = stdout.match(/(\d+\.?\d*)% user/);
            const systemMatch = stdout.match(/(\d+\.?\d*)% sys/);
            const idleMatch = stdout.match(/(\d+\.?\d*)% idle/);
            
            const userCpu = userMatch ? parseFloat(userMatch[1]) : 0;
            const systemCpu = systemMatch ? parseFloat(systemMatch[1]) : 0;
            const idleCpu = idleMatch ? parseFloat(idleMatch[1]) : 0;
            
            // Calculate total CPU usage (user + system)
            const totalUsage = userCpu + systemCpu;
            
            // Alternative calculation: 100 - idle (sometimes more accurate)
            const usageFromIdle = idleCpu ? 100 - idleCpu : totalUsage;
            
            // Use the more conservative estimate
            const finalUsage = Math.min(totalUsage, usageFromIdle);
            
            return {
                usage: Math.min(finalUsage, 100), // Cap at 100%
                userCpu: userCpu,
                systemCpu: systemCpu,
                idleCpu: idleCpu,
                totalCpu: totalUsage,
                raw: stdout.trim()
            };
        } catch (error) {
            // Fallback to simpler approach if the above fails
            try {
                const { stdout } = await execAsync('top -l 1 -s 0 | grep "CPU usage"');
                const userMatch = stdout.match(/(\d+\.?\d*)% user/);
                const systemMatch = stdout.match(/(\d+\.?\d*)% sys/);
                
                const userCpu = userMatch ? parseFloat(userMatch[1]) : 0;
                const systemCpu = systemMatch ? parseFloat(systemMatch[1]) : 0;
                const totalUsage = Math.min(userCpu + systemCpu, 100);
                
                return {
                    usage: totalUsage,
                    userCpu: userCpu,
                    systemCpu: systemCpu,
                    raw: stdout.trim()
                };
            } catch (fallbackError) {
                return { usage: 0, error: fallbackError.message };
            }
        }
    }

    /**
     * Get memory usage information (macOS-specific with vm_stat)
     */
    async getMemoryUsage() {
        try {
            // Get total physical memory
            const totalMemory = os.totalmem();
            
            // Use vm_stat for accurate macOS memory statistics
            const { stdout } = await execAsync('vm_stat');
            const pageSize = 4096; // Default page size on macOS
            
            // Parse vm_stat output to get accurate memory usage
            const lines = stdout.split('\n');
            let freePages = 0;
            let activePages = 0;
            let inactivePages = 0;
            let wiredPages = 0;
            let compressedPages = 0;
            
            lines.forEach(line => {
                const match = line.match(/^Pages\s+([^:]+):\s+(\d+)\./);
                if (match) {
                    const pages = parseInt(match[2]);
                    const type = match[1].toLowerCase().trim();
                    
                    if (type.includes('free')) freePages = pages;
                    else if (type.includes('active')) activePages = pages;
                    else if (type.includes('inactive')) inactivePages = pages;
                    else if (type.includes('wired down')) wiredPages = pages;
                    else if (type.includes('compressed')) compressedPages = pages;
                }
            });
            
            // Calculate actual memory usage
            const freeMemory = freePages * pageSize;
            const activeMemory = activePages * pageSize;
            const inactiveMemory = inactivePages * pageSize;
            const wiredMemory = wiredPages * pageSize;
            const compressedMemory = compressedPages * pageSize;
            
            // Calculate memory pressure (more accurate than simple used/free)
            const usedMemory = activeMemory + wiredMemory;
            const availableMemory = freeMemory + inactiveMemory;
            const pressuredMemory = usedMemory + compressedMemory;
            
            // Memory pressure percentage (what users should actually see)
            const pressurePercentage = (pressuredMemory / totalMemory) * 100;
            
            // Traditional usage percentage for compatibility
            const usagePercentage = (usedMemory / totalMemory) * 100;
            
            return {
                total: totalMemory,
                free: freeMemory,
                used: usedMemory,
                active: activeMemory,
                inactive: inactiveMemory,
                wired: wiredMemory,
                compressed: compressedMemory,
                available: availableMemory,
                percentage: Math.min(usagePercentage, 100), // Cap at 100%
                pressurePercentage: Math.min(pressurePercentage, 100), // Memory pressure metric
                raw: stdout.trim()
            };
        } catch (error) {
            // Fallback to basic Node.js memory info if vm_stat fails
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;
            const percentage = Math.min((usedMemory / totalMemory) * 100, 100);

            return {
                total: totalMemory,
                free: freeMemory,
                used: usedMemory,
                percentage: percentage,
                pressurePercentage: percentage,
                error: error.message
            };
        }
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
     * Get status of specific application with enhanced monitoring
     */
    async getAppStatus(appName, config = {}) {
        try {
            const { stdout } = await execAsync(`ps aux | grep "${appName}" | grep -v grep`);
            const lines = stdout.trim().split('\n').filter(line => line.trim());

            if (lines.length === 0) {
                const stoppedStatus = {
                    name: appName,
                    status: 'stopped',
                    pid: null,
                    cpuUsage: 0,
                    memoryUsage: 0,
                    memoryMB: 0,
                    restartCount: config.restartCount || 0,
                    lastChecked: new Date().toISOString()
                };
                
                // Record this status in history
                this.recordAppMetrics(appName, stoppedStatus);
                return stoppedStatus;
            }

            // Parse basic process information
            const processInfo = this.parseProcessInfo(lines[0]);
            
            // Get enhanced metrics using top for this specific PID
            let enhancedMetrics = null;
            try {
                enhancedMetrics = await this.getEnhancedAppMetrics(processInfo.pid);
            } catch (error) {
                // Fall back to ps data if top fails
                console.warn(`Failed to get enhanced metrics for ${appName}: ${error.message}`);
            }
            
            const appStatus = {
                name: appName,
                status: 'running',
                pid: processInfo.pid,
                cpuUsage: enhancedMetrics ? enhancedMetrics.cpu : processInfo.cpu,
                memoryUsage: enhancedMetrics ? enhancedMetrics.memoryPercent : processInfo.memory,
                memoryMB: enhancedMetrics ? enhancedMetrics.memoryMB : (processInfo.rss / 1024), // Convert KB to MB
                rss: processInfo.rss,
                vsz: processInfo.vsz,
                uptime: processInfo.time,
                restartCount: config.restartCount || 0,
                lastChecked: new Date().toISOString(),
                enhanced: !!enhancedMetrics
            };
            
            // Record metrics in history for trend analysis
            this.recordAppMetrics(appName, appStatus);
            
            return appStatus;
        } catch (error) {
            throw new Error(`Failed to get app status: ${error.message}`);
        }
    }

    /**
     * Get enhanced app metrics using top command for specific PID
     */
    async getEnhancedAppMetrics(pid) {
        try {
            const { stdout } = await execAsync(`top -pid ${pid} -l 2 -s 1 | tail -1`);
            const lines = stdout.trim().split('\n');
            
            // Find the process line (skip header)
            for (const line of lines) {
                if (line.includes(pid.toString())) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 12) {
                        return {
                            cpu: parseFloat(parts[2]) || 0,
                            memoryMB: this.parseMemorySize(parts[7]),
                            memoryPercent: parseFloat(parts[8]) || 0
                        };
                    }
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parse memory size from top output (e.g., "123M", "45K", "1.2G")
     */
    parseMemorySize(memStr) {
        if (!memStr) return 0;
        
        const match = memStr.match(/^(\d+\.?\d*)[KMGT]?$/i);
        if (!match) return 0;
        
        const value = parseFloat(match[1]);
        const unit = memStr.slice(-1).toUpperCase();
        
        switch (unit) {
            case 'K': return value / 1024; // KB to MB
            case 'M': return value;        // Already MB
            case 'G': return value * 1024; // GB to MB
            case 'T': return value * 1024 * 1024; // TB to MB
            default: return value / (1024 * 1024); // Assume bytes, convert to MB
        }
    }

    /**
     * Record app metrics in historical data
     */
    recordAppMetrics(appName, metrics) {
        if (!this.appHistory.has(appName)) {
            this.appHistory.set(appName, {
                name: appName,
                dataPoints: [],
                baseline: null,
                anomalies: [],
                lastCalculated: null
            });
        }
        
        const history = this.appHistory.get(appName);
        const timestamp = new Date().toISOString();
        
        // Add new data point
        history.dataPoints.push({
            timestamp: timestamp,
            cpuUsage: metrics.cpuUsage || 0,
            memoryMB: metrics.memoryMB || 0,
            memoryUsage: metrics.memoryUsage || 0,
            status: metrics.status,
            pid: metrics.pid
        });
        
        // Keep only last 24 hours of data (assuming 30s intervals = 2880 points)
        const maxDataPoints = 2880;
        if (history.dataPoints.length > maxDataPoints) {
            history.dataPoints = history.dataPoints.slice(-maxDataPoints);
        }
        
        // Update baseline and check for anomalies if we have enough data
        if (history.dataPoints.length >= 10) {
            this.updateAppBaseline(appName);
            this.checkAppAnomalies(appName, metrics);
        }
    }

    /**
     * Update baseline performance metrics for an app
     */
    updateAppBaseline(appName) {
        const history = this.appHistory.get(appName);
        if (!history || history.dataPoints.length < 10) return;
        
        // Use data from last hour for baseline (assuming 30s intervals = 120 points)
        const recentData = history.dataPoints.slice(-120);
        const runningData = recentData.filter(point => point.status === 'running');
        
        if (runningData.length === 0) return;
        
        // Calculate baseline metrics
        const avgCpu = runningData.reduce((sum, point) => sum + point.cpuUsage, 0) / runningData.length;
        const avgMemory = runningData.reduce((sum, point) => sum + point.memoryMB, 0) / runningData.length;
        const maxMemory = Math.max(...runningData.map(point => point.memoryMB));
        const minMemory = Math.min(...runningData.map(point => point.memoryMB));
        
        history.baseline = {
            avgCpuUsage: avgCpu,
            avgMemoryMB: avgMemory,
            maxMemoryMB: maxMemory,
            minMemoryMB: minMemory,
            memoryGrowthRate: this.calculateMemoryGrowthRate(runningData),
            calculatedAt: new Date().toISOString(),
            sampleSize: runningData.length
        };
        
        history.lastCalculated = new Date().toISOString();
    }

    /**
     * Calculate memory growth rate to detect memory leaks
     */
    calculateMemoryGrowthRate(dataPoints) {
        if (dataPoints.length < 5) return 0;
        
        // Simple linear regression to detect memory growth trend
        const n = dataPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        dataPoints.forEach((point, index) => {
            const x = index;
            const y = point.memoryMB;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return slope || 0; // MB per data point
    }

    /**
     * Check for anomalies in app behavior
     */
    checkAppAnomalies(appName, currentMetrics) {
        const history = this.appHistory.get(appName);
        if (!history || !history.baseline || currentMetrics.status !== 'running') return;
        
        const baseline = history.baseline;
        const anomalies = [];
        
        // Check for CPU spikes (>3x baseline)
        if (currentMetrics.cpuUsage > baseline.avgCpuUsage * 3 && baseline.avgCpuUsage > 1) {
            anomalies.push({
                type: 'cpu-spike',
                severity: 'warning',
                current: currentMetrics.cpuUsage,
                baseline: baseline.avgCpuUsage,
                message: `CPU usage spike: ${currentMetrics.cpuUsage.toFixed(1)}% (baseline: ${baseline.avgCpuUsage.toFixed(1)}%)`
            });
        }
        
        // Check for memory leaks (significant growth above baseline)
        if (currentMetrics.memoryMB > baseline.maxMemoryMB * 1.5 && baseline.memoryGrowthRate > 0.1) {
            anomalies.push({
                type: 'memory-leak',
                severity: 'critical',
                current: currentMetrics.memoryMB,
                baseline: baseline.avgMemoryMB,
                growthRate: baseline.memoryGrowthRate,
                message: `Possible memory leak: ${currentMetrics.memoryMB.toFixed(1)}MB (baseline: ${baseline.avgMemoryMB.toFixed(1)}MB, growth: ${baseline.memoryGrowthRate.toFixed(2)}MB/check)`
            });
        }
        
        // Record anomalies
        if (anomalies.length > 0) {
            const timestamp = new Date().toISOString();
            anomalies.forEach(anomaly => {
                anomaly.timestamp = timestamp;
                anomaly.appName = appName;
                history.anomalies.push(anomaly);
                
                // Log the anomaly
                this.log('warning', `App anomaly detected: ${appName}`, anomaly);
                
                // Send notification for critical anomalies
                if (anomaly.severity === 'critical') {
                    this.sendNotification(`🚨 ${appName}: ${anomaly.message}`, {
                        severity: 'critical',
                        category: 'app-anomaly',
                        data: anomaly
                    });
                }
            });
            
            // Keep only recent anomalies (last 50)
            if (history.anomalies.length > 50) {
                history.anomalies = history.anomalies.slice(-50);
            }
        }
    }

    /**
     * Get app performance history
     */
    getAppHistory(appName) {
        return this.appHistory.get(appName) || null;
    }

    /**
     * Get app health score based on recent performance
     */
    getAppHealthScore(appName) {
        const history = this.appHistory.get(appName);
        if (!history || history.dataPoints.length < 5) {
            return { score: 100, status: 'unknown', reason: 'Insufficient data' };
        }
        
        const recentData = history.dataPoints.slice(-10);
        const runningPoints = recentData.filter(p => p.status === 'running');
        
        if (runningPoints.length === 0) {
            return { score: 0, status: 'critical', reason: 'App not running' };
        }
        
        let score = 100;
        const issues = [];
        
        // Deduct points for recent anomalies
        const recentAnomalies = history.anomalies.filter(a => {
            const anomalyTime = new Date(a.timestamp);
            const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
            return anomalyTime > hourAgo;
        });
        
        recentAnomalies.forEach(anomaly => {
            if (anomaly.severity === 'critical') {
                score -= 30;
                issues.push(anomaly.message);
            } else if (anomaly.severity === 'warning') {
                score -= 15;
                issues.push(anomaly.message);
            }
        });
        
        // Deduct points for high restart count
        if (history.dataPoints[history.dataPoints.length - 1]?.restartCount > 3) {
            score -= 20;
            issues.push('High restart count');
        }
        
        // Ensure score doesn't go below 0
        score = Math.max(0, score);
        
        let status = 'excellent';
        if (score < 30) status = 'critical';
        else if (score < 60) status = 'warning';
        else if (score < 85) status = 'good';
        
        return {
            score: score,
            status: status,
            issues: issues,
            recentAnomalies: recentAnomalies.length
        };
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
     * Get storage information (filtered for relevant disks only)
     */
    async getStorageInfo() {
        try {
            const { stdout } = await execAsync('df -h');
            const lines = stdout.trim().split('\n').slice(1); // Skip header
            
            const storage = {};
            const mainDisk = { usagePercent: 0, mountPoint: '/' }; // Track main disk for summary
            
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 6) {
                    const filesystem = parts[0];
                    const mountPoint = parts[5];
                    const usageMatch = parts[4].match(/(\d+)%/);
                    const usagePercent = usageMatch ? parseInt(usageMatch[1]) : 0;
                    
                    // Filter out irrelevant filesystems for cleaner reporting
                    const isRelevant = this.isRelevantFilesystem(filesystem, mountPoint);
                    
                    if (isRelevant) {
                        storage[mountPoint] = {
                            filesystem: filesystem,
                            total: parts[1],
                            used: parts[2],
                            available: parts[3],
                            usagePercent: usagePercent,
                            mountPoint: mountPoint,
                            isMain: mountPoint === '/'
                        };
                        
                        // Track main disk for overall system health
                        if (mountPoint === '/' || (mountPoint.includes('Macintosh') && usagePercent > mainDisk.usagePercent)) {
                            mainDisk.usagePercent = usagePercent;
                            mainDisk.mountPoint = mountPoint;
                            mainDisk.total = parts[1];
                            mainDisk.used = parts[2];
                            mainDisk.available = parts[3];
                        }
                    }
                }
            });

            // Return both detailed storage info and main disk summary
            return {
                volumes: storage,
                mainDisk: mainDisk,
                primaryUsage: mainDisk.usagePercent // For dashboard display
            };
        } catch (error) {
            this.log('error', 'Failed to get storage info', { error: error.message });
            return {
                volumes: {},
                mainDisk: { usagePercent: 0, mountPoint: '/', error: error.message },
                primaryUsage: 0
            };
        }
    }

    /**
     * Determine if a filesystem is relevant for monitoring
     */
    isRelevantFilesystem(filesystem, mountPoint) {
        // Skip these filesystem types/mount points
        const skipFilesystems = [
            'devfs',           // Device filesystem
            'map',             // Automount map
            'localhost:',      // Network mounts
            'tmpfs',           // Temporary filesystems
            '//.',             // Windows shares
            'osxfuse',         // FUSE filesystems
        ];
        
        const skipMountPoints = [
            '/dev',
            '/net',
            '/tmp',
            '/var/folders',    // Temporary folders
            '/private/var',    // Private temp
            '/System/Volumes', // System volumes in Big Sur+
            '/Library/Developer', // Xcode simulators
        ];
        
        // Check if filesystem should be skipped
        for (const skip of skipFilesystems) {
            if (filesystem.toLowerCase().includes(skip.toLowerCase())) {
                return false;
            }
        }
        
        // Check if mount point should be skipped
        for (const skip of skipMountPoints) {
            if (mountPoint.startsWith(skip)) {
                return false;
            }
        }
        
        // Include main filesystems and external drives
        return true;
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

        // Check disk usage (updated for new storage format)
        if (this.monitoringData.storage) {
            // Check main disk usage first
            if (this.monitoringData.storage.mainDisk && 
                this.monitoringData.storage.mainDisk.usagePercent > this.alertThresholds.diskUsage) {
                issues.push('high-disk');
            } else if (this.monitoringData.storage.volumes) {
                // Check all volumes if main disk check didn't trigger
                for (const [mount, info] of Object.entries(this.monitoringData.storage.volumes)) {
                    if (info.usagePercent > this.alertThresholds.diskUsage) {
                        issues.push('high-disk');
                        break;
                    }
                }
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