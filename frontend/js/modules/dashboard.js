/**
 * @file dashboard.js
 * @description Dashboard tab functionality for Installation Up 4evr.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';

let isInitialized = false;
let refreshInterval = null;

export function initDashboard() {
    console.log('[INIT] Initializing Dashboard tab...');
    
    if (isInitialized) {
        console.log('[DASHBOARD] Already initialized, refreshing data...');
        refreshDashboardData();
        return;
    }
    
    setupEventListeners();
    setupQuickActions();
    startDashboardRefresh();
    
    isInitialized = true;
    
    // Initial data load
    refreshDashboardData();
}

function setupEventListeners() {
    // Dashboard refresh button
    const refreshBtn = document.getElementById('dashboard-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            
            try {
                await refreshDashboardData();
                showToast('Dashboard refreshed successfully', 'success');
            } catch (error) {
                console.error('Dashboard refresh failed:', error);
                showToast('Failed to refresh dashboard', 'error');
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            }
        });
    }
    
    // Setup wizard button
    const wizardBtn = document.getElementById('run-setup-wizard');
    if (wizardBtn) {
        wizardBtn.addEventListener('click', () => {
            if (window.app && window.app.navigateToTab) {
                window.app.navigateToTab('setup-wizard');
            } else {
                showToast('Navigation not available', 'error');
            }
        });
    }
}

function setupQuickActions() {
    // Restart Apps button
    const restartAppsBtn = document.getElementById('dashboard-restart-apps');
    if (restartAppsBtn) {
        restartAppsBtn.addEventListener('click', async () => {
            if (confirm('Restart all monitored applications?')) {
                restartAppsBtn.disabled = true;
                restartAppsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restarting...';
                
                try {
                    const response = await apiCall('/api/system/restart-apps', {
                        method: 'POST'
                    });
                    
                    if (response.success) {
                        showToast('Applications restart initiated', 'success');
                    } else {
                        showToast('Failed to restart applications', 'error');
                    }
                } catch (error) {
                    console.error('Restart apps failed:', error);
                    showToast('Failed to restart applications', 'error');
                } finally {
                    restartAppsBtn.disabled = false;
                    restartAppsBtn.innerHTML = '<i class="fas fa-redo"></i> <span>Restart Apps</span>';
                }
            }
        });
    }
    
    // Reboot System button
    const rebootBtn = document.getElementById('dashboard-reboot');
    if (rebootBtn) {
        rebootBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reboot the system? This will interrupt any running installations.')) {
                rebootBtn.disabled = true;
                rebootBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rebooting...';
                
                try {
                    const response = await apiCall('/api/system/reboot', {
                        method: 'POST'
                    });
                    
                    if (response.success) {
                        showToast('System reboot initiated', 'info');
                    } else {
                        showToast('Failed to reboot system', 'error');
                    }
                } catch (error) {
                    console.error('Reboot failed:', error);
                    showToast('Failed to reboot system', 'error');
                } finally {
                    rebootBtn.disabled = false;
                    rebootBtn.innerHTML = '<i class="fas fa-power-off"></i> <span>Reboot System</span>';
                }
            }
        });
    }
}

async function refreshDashboardData() {
    try {
        // Fetch all dashboard data in parallel
        const [systemStatus, applications, healthData] = await Promise.all([
            apiCall('/api/monitoring/status').catch(() => ({ system: {} })),
            apiCall('/api/monitoring/applications').catch(() => ({ applications: [] })),
            apiCall('/api/health').catch(() => ({ health: { status: 'unknown' } }))
        ]);
        
        // Update system metrics
        updateSystemMetrics(systemStatus.system || {});
        
        // Update applications
        updateApplications(applications.applications || []);
        
        // Update alerts/activity
        updateRecentActivity(systemStatus.alerts || []);
        
        console.log('[DASHBOARD] Data refreshed successfully');
        
    } catch (error) {
        console.error('[DASHBOARD] Failed to refresh data:', error);
        
        // Show fallback data
        updateSystemMetrics({});
        updateApplications([]);
        updateRecentActivity([]);
    }
}

function updateSystemMetrics(systemData) {
    // CPU Usage
    const cpuValue = systemData.cpu?.usage || 0;
    const cpuTopProcesses = systemData.cpu?.topProcesses || [];
    updateMetricCard('cpu', cpuValue, '%', cpuValue > 80 ? 'high' : cpuValue > 60 ? 'medium' : 'low');
    updateTopProcesses('cpu', cpuTopProcesses);
    
    // Memory Usage  
    const memoryValue = systemData.memory?.usage || 0;
    const memoryTopProcesses = systemData.memory?.topProcesses || [];
    updateMetricCard('memory', memoryValue, '%', memoryValue > 90 ? 'high' : memoryValue > 70 ? 'medium' : 'low');
    updateTopProcesses('memory', memoryTopProcesses);
    
    // Disk Usage
    const diskValue = systemData.disk?.usage || 0;
    const diskDetails = {
        total: systemData.disk?.total || 'Unknown',
        used: systemData.disk?.used || 'Unknown', 
        available: systemData.disk?.available || 'Unknown'
    };
    updateMetricCard('disk', diskValue, '%', diskValue > 90 ? 'high' : diskValue > 80 ? 'medium' : 'low');
    updateDiskDetails(diskDetails);
    
    // System Uptime
    const uptimeValue = systemData.uptime?.seconds || 0;
    const uptimeFormatted = systemData.uptime?.formatted || formatUptime(uptimeValue);
    updateMetricCard('uptime', uptimeFormatted, '', 'low', uptimeValue > 0 ? 'Active' : 'Unknown');
}

function updateMetricCard(metric, value, unit, level, customStatus) {
    const valueElement = document.getElementById(`dashboard-${metric}-value`);
    const barElement = document.getElementById(`dashboard-${metric}-bar`);
    const statusElement = document.getElementById(`dashboard-${metric}-status`);
    
    if (valueElement) {
        valueElement.textContent = `${value}${unit}`;
    }
    
    if (barElement) {
        const percentage = typeof value === 'number' ? Math.min(value, 100) : 0;
        barElement.style.width = `${percentage}%`;
        
        // Update color based on level
        barElement.className = `metric-fill level-${level}`;
    }
    
    if (statusElement) {
        statusElement.textContent = customStatus || getStatusText(level);
        statusElement.className = `metric-status status-${level}`;
    }
}

function updateTopProcesses(metric, topProcesses) {
    const processContainer = document.getElementById(`dashboard-${metric}-processes`);
    if (!processContainer) return;
    
    if (!topProcesses || topProcesses.length === 0) {
        processContainer.innerHTML = '<div class="no-processes">No process data available</div>';
        return;
    }
    
    // Show top 3 processes
    const top3 = topProcesses.slice(0, 3);
    
    processContainer.innerHTML = top3.map(process => {
        const processName = process.name || `PID ${process.pid}`;
        const usage = metric === 'cpu' ? 
            `${process.cpuPercent?.toFixed(1)}%` : 
            `${process.memoryMB}MB`;
        
        return `
            <div class="process-item">
                <span class="process-name">${processName}</span>
                <span class="process-usage">${usage}</span>
            </div>
        `;
    }).join('');
}

function updateDiskDetails(diskDetails) {
    const diskDetailsContainer = document.getElementById('dashboard-disk-details');
    if (!diskDetailsContainer) return;
    
    diskDetailsContainer.innerHTML = `
        <div class="disk-details">
            ${diskDetails.total} drive, ${diskDetails.used} used, ${diskDetails.available} free
        </div>
    `;
}

function updateApplications(applications) {
    const container = document.getElementById('dashboard-applications');
    if (!container) return;
    
    if (!applications || applications.length === 0) {
        container.innerHTML = `
            <div class="no-apps-message">
                <i class="fas fa-info-circle"></i>
                <p>No applications are currently being monitored.</p>
                <button class="btn btn-link" onclick="window.app.navigateToTab('launch-agents')">
                    <i class="fas fa-rocket"></i> Set up Launch Agents
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = applications.map(app => `
        <div class="app-status-card">
            <div class="app-icon">
                <i class="fas ${app.running ? 'fa-play-circle text-green' : 'fa-stop-circle text-red'}"></i>
            </div>
            <div class="app-info">
                <h4>${app.name}</h4>
                <p>${app.running ? 'Running' : 'Stopped'}</p>
                ${app.pid ? `<small>PID: ${app.pid}</small>` : ''}
            </div>
            <div class="app-actions">
                <button class="btn btn-sm ${app.running ? 'btn-danger' : 'btn-success'}" 
                        onclick="toggleApplication('${app.name}')">
                    ${app.running ? 'Stop' : 'Start'}
                </button>
            </div>
        </div>
    `).join('');
}

function updateRecentActivity(alerts) {
    const container = document.getElementById('dashboard-alerts');
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
    
    // Show only the last 5 alerts
    const recentAlerts = alerts.slice(-5).reverse();
    
    container.innerHTML = recentAlerts.map(alert => `
        <div class="alert-item alert-${alert.level || 'info'}">
            <div class="alert-icon">
                <i class="fas ${getAlertIcon(alert.level)}"></i>
            </div>
            <div class="alert-content">
                <p>${alert.message}</p>
                <small>${formatTimestamp(alert.timestamp)}</small>
            </div>
        </div>
    `).join('');
}

function startDashboardRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Set up automatic refresh every 30 seconds
    refreshInterval = setInterval(() => {
        refreshDashboardData();
    }, 30000);
    
    console.log('[DASHBOARD] Auto-refresh started (30s interval)');
}

function stopDashboardRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
        console.log('[DASHBOARD] Auto-refresh stopped');
    }
}

// Utility functions
function formatUptime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

function getStatusText(level) {
    switch (level) {
        case 'high': return 'Critical';
        case 'medium': return 'Warning';
        case 'low': return 'Normal';
        default: return 'Unknown';
    }
}

function getAlertIcon(level) {
    switch (level) {
        case 'critical': return 'fa-exclamation-triangle';
        case 'warning': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-bell';
    }
}

function formatTimestamp(timestamp) {
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

// Global function for app toggle (called from HTML)
window.toggleApplication = async function(appName) {
    try {
        const response = await apiCall(`/api/launch-agents/toggle`, {
            method: 'POST',
            body: JSON.stringify({ name: appName })
        });
        
        if (response.success) {
            showToast(`Application ${appName} toggled successfully`, 'success');
            refreshDashboardData(); // Refresh to show updated status
        } else {
            showToast(`Failed to toggle ${appName}`, 'error');
        }
    } catch (error) {
        console.error('App toggle failed:', error);
        showToast(`Failed to toggle ${appName}`, 'error');
    }
};

// Cleanup function
export function cleanupDashboard() {
    stopDashboardRefresh();
    isInitialized = false;
}