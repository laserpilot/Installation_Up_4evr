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

    getHealthStatus() {
        const metrics = this.getSystemMetrics();
        if (!metrics) return { status: 'unknown', issues: [] };

        const issues = [];
        
        if (metrics.cpu > 80) issues.push(`High CPU usage: ${metrics.cpu.toFixed(1)}%`);
        if (metrics.memory > 85) issues.push(`High memory usage: ${metrics.memory.toFixed(1)}%`);
        if (metrics.disk > 90) issues.push(`High disk usage: ${metrics.disk.toFixed(1)}%`);

        const status = issues.length === 0 ? 'healthy' : 
                      issues.length <= 2 ? 'warning' : 'critical';

        return { status, issues };
    }
}
