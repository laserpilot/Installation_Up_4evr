/**
 * @file monitoring-display.js
 * @description Unified monitoring display utilities for consistent metric visualization across all tabs
 */

import { showToast } from './ui.js';

/**
 * Unified monitoring display manager for consistent metric display across all tabs
 */
export class MonitoringDisplayManager {
    constructor() {
        this.defaultConfig = {
            refreshInterval: 30000, // 30 seconds
            timeoutMs: 10000, // 10 seconds
            maxRetries: 3,
            thresholds: {
                cpu: { warning: 60, critical: 80 },
                memory: { warning: 70, critical: 90 },
                disk: { warning: 80, critical: 90 },
                temperature: { warning: 75, critical: 85 }
            }
        };
    }

    /**
     * Update a metric card with unified styling and behavior
     */
    updateMetricCard(config) {
        const {
            metricId,
            value,
            unit = '',
            type = 'percentage',
            customStatus = null,
            showProcesses = false,
            processes = [],
            diskDetails = null
        } = config;

        // Get level based on thresholds
        const level = this.getMetricLevel(type, value);
        
        // Update main metric display
        this.updateMetricValue(metricId, value, unit, level, customStatus);
        this.updateMetricBar(metricId, value, level);
        this.updateMetricStatus(metricId, level, customStatus);

        // Update additional displays if requested
        if (showProcesses && processes.length > 0) {
            this.updateTopProcesses(metricId, processes, type);
        }

        if (diskDetails) {
            this.updateDiskDetails(metricId, diskDetails);
        }
    }

    /**
     * Determine metric level based on type and value
     */
    getMetricLevel(type, value) {
        const thresholds = this.defaultConfig.thresholds[type];
        if (!thresholds || typeof value !== 'number') return 'low';

        if (value >= thresholds.critical) return 'high';
        if (value >= thresholds.warning) return 'medium';
        return 'low';
    }

    /**
     * Update metric value display
     */
    updateMetricValue(metricId, value, unit, level, customStatus) {
        const valueElement = document.getElementById(`${metricId}-value`) || 
                           document.getElementById(`dashboard-${metricId}-value`);
        
        if (valueElement) {
            const formattedValue = typeof value === 'number' ? 
                (value % 1 === 0 ? value : value.toFixed(1)) : value;
            valueElement.textContent = `${formattedValue}${unit}`;
            valueElement.className = `metric-value level-${level}`;
        }
    }

    /**
     * Update metric progress bar
     */
    updateMetricBar(metricId, value, level) {
        const barElement = document.getElementById(`${metricId}-bar`) || 
                          document.getElementById(`dashboard-${metricId}-bar`);
        
        if (barElement) {
            const percentage = typeof value === 'number' ? Math.min(Math.max(value, 0), 100) : 0;
            barElement.style.width = `${percentage}%`;
            barElement.className = `metric-fill level-${level}`;
        }
    }

    /**
     * Update metric status display
     */
    updateMetricStatus(metricId, level, customStatus) {
        const statusElement = document.getElementById(`${metricId}-status`) || 
                             document.getElementById(`dashboard-${metricId}-status`);
        
        if (statusElement) {
            const statusText = customStatus || this.getStatusText(level);
            const statusIcon = this.getStatusIcon(level);
            
            statusElement.innerHTML = `${statusIcon} ${statusText}`;
            statusElement.className = `metric-status status-${level}`;
        }
    }

    /**
     * Update top processes display
     */
    updateTopProcesses(metricId, processes, type) {
        const processContainer = document.getElementById(`${metricId}-processes`) || 
                               document.getElementById(`dashboard-${metricId}-processes`);
        
        if (!processContainer) return;

        if (!processes || processes.length === 0) {
            processContainer.innerHTML = '<div class="no-processes">No process data available</div>';
            return;
        }

        // Show top 3 processes
        const top3 = processes.slice(0, 3);
        
        processContainer.innerHTML = `
            <div class="top-processes">
                ${top3.map(process => {
                    const processName = process.name || `PID ${process.pid}`;
                    const usage = type === 'cpu' ? 
                        `${process.cpuPercent?.toFixed(1)}%` : 
                        `${process.memoryMB}MB`;
                    
                    return `
                        <div class="process-item">
                            <span class="process-name">${processName}</span>
                            <span class="process-usage">${usage}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Update disk details display
     */
    updateDiskDetails(metricId, diskDetails) {
        const diskDetailsContainer = document.getElementById(`${metricId}-details`) || 
                                   document.getElementById(`dashboard-${metricId}-details`);
        
        if (!diskDetailsContainer) return;
        
        diskDetailsContainer.innerHTML = `
            <div class="disk-details">
                ${diskDetails.total} drive, ${diskDetails.used} used, ${diskDetails.available} free
            </div>
        `;
    }

    /**
     * Setup unified refresh button with consistent loading states
     */
    setupRefreshButton(buttonId, refreshCallback, options = {}) {
        const config = { ...this.defaultConfig, ...options };
        const button = document.getElementById(buttonId);
        
        if (!button) return;

        button.addEventListener('click', async () => {
            const originalContent = button.innerHTML;
            
            try {
                // Set loading state
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                
                // Execute refresh with timeout
                await Promise.race([
                    refreshCallback(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Refresh timeout')), config.timeoutMs)
                    )
                ]);
                
                showToast('Data refreshed successfully', 'success');
                
            } catch (error) {
                console.error('[REFRESH] Failed:', error);
                showToast(`Refresh failed: ${error.message}`, 'error');
                
            } finally {
                // Restore button state
                button.disabled = false;
                button.innerHTML = originalContent;
            }
        });
    }

    /**
     * Setup auto-refresh with unified interval management
     */
    setupAutoRefresh(refreshCallback, options = {}) {
        const config = { ...this.defaultConfig, ...options };
        
        return setInterval(async () => {
            try {
                await refreshCallback();
            } catch (error) {
                console.error('[AUTO-REFRESH] Failed:', error);
                // Don't show toast for auto-refresh failures to avoid spam
            }
        }, config.refreshInterval);
    }

    /**
     * Update alerts/activity section with unified styling
     */
    updateAlertsSection(containerId, alerts) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!alerts || alerts.length === 0) {
            container.innerHTML = `
                <div class="no-alerts-message">
                    <i class="fas fa-check-circle"></i>
                    <p>No recent alerts. System running smoothly.</p>
                </div>
            `;
            return;
        }
        
        // Show most recent alerts (max 5)
        const recentAlerts = alerts.slice(-5).reverse();
        
        container.innerHTML = recentAlerts.map(alert => `
            <div class="alert-item alert-${alert.level || 'info'}">
                <div class="alert-icon">
                    <i class="fas ${this.getAlertIcon(alert.level)}"></i>
                </div>
                <div class="alert-content">
                    <p>${alert.message || alert.description || 'System alert'}</p>
                    <small>${this.formatTimestamp(alert.timestamp)}</small>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update health status with unified indicators
     */
    updateHealthStatus(containerId, status, issues = []) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const indicator = this.getHealthIndicator(status);
        const statusText = this.getHealthText(status, issues);
        
        container.innerHTML = `
            <div class="health-status status-${status}">
                <span class="health-indicator">${indicator}</span>
                <span class="health-text">${statusText}</span>
                ${issues.length > 0 ? `
                    <div class="health-issues">
                        ${issues.slice(0, 3).map(issue => `<small>${issue}</small>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Utility functions
    getStatusText(level) {
        switch (level) {
            case 'high': return 'Critical';
            case 'medium': return 'Warning';
            case 'low': return 'Normal';
            default: return 'Unknown';
        }
    }

    getStatusIcon(level) {
        switch (level) {
            case 'high': return '🔴';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚫';
        }
    }

    getAlertIcon(level) {
        switch (level) {
            case 'critical': return 'fa-exclamation-triangle';
            case 'warning': return 'fa-exclamation-circle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-bell';
        }
    }

    getHealthIndicator(status) {
        switch (status) {
            case 'good':
            case 'healthy': return '🟢';
            case 'warning': return '🟡';
            case 'error':
            case 'critical': return '🔴';
            default: return '🟡';
        }
    }

    getHealthText(status, issues) {
        switch (status) {
            case 'good':
            case 'healthy': return 'System Healthy';
            case 'warning': return `Minor Issues (${issues.length})`;
            case 'error':
            case 'critical': return `Critical Issues (${issues.length})`;
            default: return 'Checking...';
        }
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown time';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    }
}

// Export singleton instance for consistent usage
export const monitoringDisplay = new MonitoringDisplayManager();