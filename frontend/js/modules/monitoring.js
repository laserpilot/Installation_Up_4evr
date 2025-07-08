/**
 * @file monitoring.js
 * @description Monitoring data management for Installation Up 4evr.
 */

import { apiCall } from '../utils/api.js';

/**
 * Centralized system for collecting and distributing monitoring data
 */
export class MonitoringDataManager {
    constructor() {
        this.data = {
            system: null,
            applications: null,
            displays: null,
            network: null,
            alerts: [],
            status: 'unknown',
            lastUpdate: null
        };
        this.subscribers = new Set();
        this.updateInterval = null;
        this.refreshRate = 5000; // 5 seconds
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        if (this.data.lastUpdate) {
            callback(this.data);
        }
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.data);
            } catch (error) {
                console.error('[MONITORING] Subscriber callback error:', error);
            }
        });
    }

    async startMonitoring() {
        console.log('[MONITORING] Starting unified monitoring system');
        await this.refreshData();
        this.updateInterval = setInterval(() => {
            this.refreshData();
        }, this.refreshRate);
    }

    stopMonitoring() {
        console.log('[MONITORING] Stopping monitoring system');
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async refreshData() {
        try {
            console.log('[MONITORING] Refreshing monitoring data...');
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 10000);
            });
            
            const [systemData, appsData] = await Promise.all([
                Promise.race([
                    apiCall('/api/monitoring/status'),
                    timeoutPromise
                ]).catch(err => {
                    console.warn('[MONITORING] System status failed:', err.message);
                    return null;
                }),
                Promise.race([
                    apiCall('/api/monitoring/applications'),
                    timeoutPromise
                ]).catch(err => {
                    console.warn('[MONITORING] Applications data failed:', err.message);
                    return [];
                })
            ]);

            this.data = {
                system: systemData?.system || null,
                storage: systemData?.storage || null,
                displays: systemData?.displays || [],
                network: systemData?.network || null,
                applications: appsData?.data || appsData || [],
                alerts: systemData?.notifications || [],
                status: 'good', // Calculate from system health
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now()
            };

            this.notifySubscribers();

        } catch (error) {
            console.error('[MONITORING] Failed to refresh data:', error);
            this.data.status = 'error';
            this.data.lastUpdate = new Date().toISOString();
            this.data.errorMessage = error.message;
            this.notifySubscribers();
        }
    }

    getCurrentData() {
        return { ...this.data };
    }

    getSystemMetrics() {
        if (!this.data.system) {
            return null;
        }
        
        return {
            cpu: this.data.system.cpu?.usage || this.data.system.cpuUsage || 0,
            memory: this.data.system.memory?.usage || this.data.system.memoryUsage || 0,
            disk: this.data.system.disk?.usage || this.calculateDiskUsage(),
            status: this.data.status
        };
    }

    calculateDiskUsage() {
        if (!this.data.storage) return 0;
        
        return Object.values(this.data.storage).reduce((max, disk) => {
            if (disk.usagePercent && disk.usagePercent < 100) {
                return Math.max(max, disk.usagePercent);
            }
            return max;
        }, 0);
    }

    async getHealthStatus() {
        const metrics = this.getSystemMetrics();
        if (!metrics) return { status: 'unknown', issues: [] };

        const issues = [];
        
        // System resource checks
        if (metrics.cpu > 80) issues.push(`High CPU usage: ${metrics.cpu.toFixed(1)}%`);
        if (metrics.memory > 85) issues.push(`High memory usage: ${metrics.memory.toFixed(1)}%`);
        if (metrics.disk > 90) issues.push(`High disk usage: ${metrics.disk.toFixed(1)}%`);

        // PM2 process health checks
        const pm2Health = await this.getPM2HealthStatus();
        if (pm2Health.issues.length > 0) {
            issues.push(...pm2Health.issues);
        }

        // Calculate overall status including PM2 health impact
        let status;
        const systemIssues = issues.filter(issue => !issue.includes('PM2'));
        const pm2Issues = issues.filter(issue => issue.includes('PM2'));

        if (issues.length === 0) {
            status = 'healthy';
        } else if (pm2Issues.length > 0 && pm2Health.severity === 'critical') {
            status = 'critical'; // Critical PM2 issues elevate to critical
        } else if (systemIssues.length >= 3 || (systemIssues.length >= 2 && pm2Issues.length > 0)) {
            status = 'critical';
        } else if (systemIssues.length >= 1 || pm2Issues.length > 0) {
            status = 'warning';
        } else {
            status = 'healthy';
        }

        return { 
            status, 
            issues,
            pm2Health: pm2Health.summary,
            breakdown: {
                systemIssues: systemIssues.length,
                pm2Issues: pm2Issues.length,
                pm2Health: pm2Health.healthPercentage
            }
        };
    }

    /**
     * Get PM2 process health status
     */
    async getPM2HealthStatus() {
        try {
            const response = await fetch('/api/monitoring/applications');
            if (!response.ok) {
                return {
                    issues: ['PM2: Connection failed'],
                    severity: 'warning',
                    healthPercentage: 0,
                    summary: 'PM2 unavailable'
                };
            }

            const data = await response.json();
            const allApplications = data.data?.data || data.data || [];
            const pm2Processes = allApplications.filter(app => app.type === 'pm2-process');

            if (pm2Processes.length === 0) {
                return {
                    issues: [],
                    severity: 'none',
                    healthPercentage: 100,
                    summary: 'No PM2 processes'
                };
            }

            const runningProcesses = pm2Processes.filter(proc => proc.isRunning);
            const stoppedProcesses = pm2Processes.filter(proc => !proc.isRunning);
            const healthPercentage = Math.round((runningProcesses.length / pm2Processes.length) * 100);

            const issues = [];
            let severity = 'none';

            // Check for stopped processes
            if (stoppedProcesses.length > 0) {
                if (stoppedProcesses.length === pm2Processes.length) {
                    issues.push(`PM2: All ${pm2Processes.length} processes stopped`);
                    severity = 'critical';
                } else if (stoppedProcesses.length >= pm2Processes.length / 2) {
                    issues.push(`PM2: ${stoppedProcesses.length}/${pm2Processes.length} processes stopped`);
                    severity = 'critical';
                } else {
                    issues.push(`PM2: ${stoppedProcesses.length} process(es) stopped`);
                    severity = 'warning';
                }
            }

            // Check for high resource usage
            const highCpuProcesses = runningProcesses.filter(proc => 
                proc.pm2Data?.cpu > 90
            );
            if (highCpuProcesses.length > 0) {
                issues.push(`PM2: ${highCpuProcesses.length} process(es) high CPU usage`);
                severity = severity === 'critical' ? 'critical' : 'warning';
            }

            // Check for excessive restarts
            const highRestartProcesses = runningProcesses.filter(proc => 
                proc.pm2Data?.restartTime > 10
            );
            if (highRestartProcesses.length > 0) {
                issues.push(`PM2: ${highRestartProcesses.length} process(es) restarting frequently`);
                severity = severity === 'critical' ? 'critical' : 'warning';
            }

            return {
                issues,
                severity,
                healthPercentage,
                summary: `${runningProcesses.length}/${pm2Processes.length} healthy`
            };

        } catch (error) {
            console.error('[PM2-HEALTH] Failed to get PM2 health status:', error);
            return {
                issues: ['PM2: Health check failed'],
                severity: 'warning',
                healthPercentage: 0,
                summary: 'PM2 health unknown'
            };
        }
    }
}

/**
 * Ping Monitor Management System
 */
export class PingMonitorManager {
    constructor() {
        this.pingMonitors = [];
        this.refreshInterval = null;
        this.refreshRate = 30000; // 30 seconds
    }

    async initialize() {
        console.log('[PING] Initializing ping monitor system');
        await this.loadPingMonitors();
        this.setupEventListeners();
        this.startRefreshCycle();
    }

    async loadPingMonitors() {
        try {
            const response = await apiCall('/api/monitoring/ping-monitors');
            this.pingMonitors = response.data || response || [];
            this.renderPingMonitorList();
        } catch (error) {
            console.error('[PING] Failed to load ping monitors:', error);
            this.pingMonitors = [];
        }
    }

    setupEventListeners() {
        console.log('[PING] Setting up event listeners...');
        const addButton = document.getElementById('add-ping-monitor');
        console.log('[PING] Add button found:', !!addButton);
        if (addButton) {
            addButton.addEventListener('click', (e) => this.handleAddPingMonitor(e));
            console.log('[PING] Event listener attached to add-ping-monitor button');
        } else {
            console.error('[PING] add-ping-monitor button not found in DOM');
        }
    }

    async handleAddPingMonitor(e) {
        e.preventDefault();
        console.log('[PING] Add ping monitor button clicked');
        
        const ipAddress = document.getElementById('ping-ip-address').value.trim();
        console.log('[PING] IP address input value:', ipAddress);
        const description = document.getElementById('ping-description').value.trim();
        const interval = parseInt(document.getElementById('ping-interval').value) || 30;
        const timeout = parseInt(document.getElementById('ping-timeout').value) || 5;

        // Validation
        if (!ipAddress) {
            this.showError('IP address is required');
            return;
        }

        if (!this.isValidIPOrHostname(ipAddress)) {
            this.showError('Please enter a valid IP address or hostname');
            return;
        }

        if (interval < 10 || interval > 300) {
            this.showError('Interval must be between 10 and 300 seconds');
            return;
        }

        if (timeout < 1 || timeout > 30) {
            this.showError('Timeout must be between 1 and 30 seconds');
            return;
        }

        try {
            let response;
            let successMessage;

            if (this._editingMonitorId) {
                // Update existing monitor
                response = await apiCall(`/api/monitoring/ping-monitors/${this._editingMonitorId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        ipAddress,
                        description,
                        interval,
                        timeout
                    })
                });
                successMessage = 'Ping monitor updated successfully';
            } else {
                // Create new monitor
                response = await apiCall('/api/monitoring/ping-monitors', {
                    method: 'POST',
                    body: JSON.stringify({
                        ipAddress,
                        description,
                        interval,
                        timeout
                    })
                });
                successMessage = 'Ping monitor added successfully';
            }

            if (response.success !== false) {
                // Clear form and reset editing state
                this.clearForm();
                this._editingMonitorId = null;
                
                // Reset button text
                const addButton = document.getElementById('add-ping-monitor');
                if (addButton) {
                    addButton.innerHTML = '<i class="fas fa-plus"></i> Add Ping Monitor';
                }
                
                // Reload monitors
                await this.loadPingMonitors();
                
                this.showSuccess(successMessage);
            } else {
                this.showError(response.error || 'Failed to save ping monitor');
            }
        } catch (error) {
            console.error('[PING] Failed to save ping monitor:', error);
            this.showError('Failed to save ping monitor: ' + error.message);
        }
    }

    async editPingMonitor(monitorId) {
        const monitor = this.pingMonitors.find(m => m.id === monitorId);
        if (!monitor) {
            this.showError('Ping monitor not found');
            return;
        }

        // Pre-fill the form with current values
        document.getElementById('ping-ip-address').value = monitor.ipAddress;
        document.getElementById('ping-description').value = monitor.description || '';
        document.getElementById('ping-interval').value = monitor.interval;
        document.getElementById('ping-timeout').value = monitor.timeout;

        // Scroll to the form
        document.getElementById('ping-ip-address').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('ping-ip-address').focus();

        // Store the ID for updating instead of creating
        this._editingMonitorId = monitorId;

        // Update button text temporarily
        const addButton = document.getElementById('add-ping-monitor');
        if (addButton) {
            addButton.textContent = 'Update Ping Monitor';
            addButton.innerHTML = '<i class="fas fa-save"></i> Update Ping Monitor';
        }
    }

    async deletePingMonitor(monitorId) {
        if (!confirm('Are you sure you want to delete this ping monitor?')) {
            return;
        }

        try {
            await apiCall(`/api/monitoring/ping-monitors/${monitorId}`, {
                method: 'DELETE'
            });

            await this.loadPingMonitors();
            this.showSuccess('Ping monitor deleted successfully');
        } catch (error) {
            console.error('[PING] Failed to delete ping monitor:', error);
            this.showError('Failed to delete ping monitor: ' + error.message);
        }
    }

    async testPingMonitor(monitorId) {
        try {
            const response = await apiCall(`/api/monitoring/ping-monitors/${monitorId}/test`, {
                method: 'POST'
            });

            if (response.result) {
                const result = response.result;
                const message = result.success 
                    ? `Ping successful! Response time: ${result.responseTime}ms`
                    : `Ping failed: ${result.error}`;
                
                this.showSuccess(message);
            }
        } catch (error) {
            console.error('[PING] Failed to test ping monitor:', error);
            this.showError('Failed to test ping monitor: ' + error.message);
        }
    }

    renderPingMonitorList() {
        const container = document.getElementById('ping-monitor-list');
        if (!container) return;

        if (this.pingMonitors.length === 0) {
            container.innerHTML = `
                <div class="ping-monitor-empty">
                    <p><i class="fas fa-info-circle"></i> No ping monitors configured yet. Add an IP address or hostname below to start monitoring network connectivity.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.pingMonitors.map(monitor => `
            <div class="ping-monitor-item" data-id="${monitor.id}">
                <div class="ping-monitor-header">
                    <div class="ping-monitor-info">
                        <div class="ping-monitor-title">
                            <strong>${monitor.description || monitor.ipAddress}</strong>
                            <span class="ping-monitor-address">${monitor.ipAddress}</span>
                        </div>
                        <div class="ping-monitor-status">
                            <span class="status-indicator ${monitor.status || 'pending'}">
                                ${this.getStatusIcon(monitor.status)}
                                ${this.getStatusText(monitor.status)}
                            </span>
                            ${monitor.responseTime ? `<span class="response-time">${monitor.responseTime}ms</span>` : ''}
                        </div>
                    </div>
                    <div class="ping-monitor-actions">
                        <button class="btn-action" onclick="window.pingMonitorManager.testPingMonitor('${monitor.id}')" title="Test Now">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn-action" onclick="window.pingMonitorManager.editPingMonitor('${monitor.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="window.pingMonitorManager.deletePingMonitor('${monitor.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="ping-monitor-details">
                    <span>Interval: ${monitor.interval}s</span>
                    <span>Timeout: ${monitor.timeout}s</span>
                    ${monitor.lastCheck ? `<span>Last Check: ${new Date(monitor.lastCheck).toLocaleTimeString()}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    getStatusIcon(status) {
        switch (status) {
            case 'online': return '🟢';
            case 'offline': return '🔴';
            case 'pending': return '🟡';
            default: return '⚪';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'online': return 'Online';
            case 'offline': return 'Offline';
            case 'pending': return 'Pending';
            default: return 'Unknown';
        }
    }

    isValidIPOrHostname(input) {
        // Basic IP address validation (IPv4)
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        // Basic hostname validation
        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        return ipRegex.test(input) || hostnameRegex.test(input);
    }

    clearForm() {
        document.getElementById('ping-ip-address').value = '';
        document.getElementById('ping-description').value = '';
        document.getElementById('ping-interval').value = '30';
        document.getElementById('ping-timeout').value = '5';
    }

    showSuccess(message) {
        // You can integrate with your existing toast/notification system
        console.log('[PING] Success:', message);
        if (window.showToast) {
            window.showToast(message, 'success');
        }
    }

    showError(message) {
        // You can integrate with your existing toast/notification system
        console.error('[PING] Error:', message);
        if (window.showToast) {
            window.showToast(message, 'error');
        }
    }

    startRefreshCycle() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.loadPingMonitors();
        }, this.refreshRate);
    }

    stopRefreshCycle() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopRefreshCycle();
    }
}
