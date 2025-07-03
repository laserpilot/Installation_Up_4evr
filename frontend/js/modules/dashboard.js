/**
 * @file dashboard.js
 * @description Dashboard tab functionality for Installation Up 4evr.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { monitoringDisplay } from '../utils/monitoring-display.js';

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
    // Dashboard refresh button using unified display manager
    monitoringDisplay.setupRefreshButton('dashboard-refresh', refreshDashboardData);
    
    // Setup wizard button
    const wizardBtn = document.getElementById('run-setup-wizard');
    if (wizardBtn) {
        wizardBtn.addEventListener('click', () => {
            if (window.navigateToTab) {
                navigateToTab('setup-wizard');
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
    // CPU Usage with top processes
    monitoringDisplay.updateMetricCard({
        metricId: 'dashboard-cpu',
        value: systemData.cpu?.usage || 0,
        unit: '%',
        type: 'cpu',
        showProcesses: true,
        processes: systemData.cpu?.topProcesses || []
    });
    
    // Memory Usage with top processes
    monitoringDisplay.updateMetricCard({
        metricId: 'dashboard-memory',
        value: systemData.memory?.usage || 0,
        unit: '%',
        type: 'memory',
        showProcesses: true,
        processes: systemData.memory?.topProcesses || []
    });
    
    // Disk Usage with details
    monitoringDisplay.updateMetricCard({
        metricId: 'dashboard-disk',
        value: systemData.disk?.usage || 0,
        unit: '%',
        type: 'disk',
        diskDetails: {
            total: systemData.disk?.total || 'Unknown',
            used: systemData.disk?.used || 'Unknown', 
            available: systemData.disk?.available || 'Unknown'
        }
    });
    
    // System Uptime
    const uptimeValue = systemData.uptime?.seconds || 0;
    const uptimeFormatted = systemData.uptime?.formatted || formatUptime(uptimeValue);
    monitoringDisplay.updateMetricCard({
        metricId: 'dashboard-uptime',
        value: uptimeFormatted,
        unit: '',
        type: 'uptime',
        customStatus: uptimeValue > 0 ? 'Active' : 'Unknown'
    });
}

// Old metric functions replaced by unified MonitoringDisplayManager

function updateApplications(applications) {
    const container = document.getElementById('dashboard-applications');
    if (!container) return;
    
    if (!applications || applications.length === 0) {
        container.innerHTML = `
            <div class="no-apps-message">
                <i class="fas fa-info-circle"></i>
                <p>No applications are currently being monitored.</p>
                <button class="btn btn-link" onclick="navigateToTab('launch-agents')">
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
    // Use unified alerts display
    monitoringDisplay.updateAlertsSection('dashboard-alerts', alerts);
}

function startDashboardRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Use unified auto-refresh with 30-second interval
    refreshInterval = monitoringDisplay.setupAutoRefresh(refreshDashboardData, {
        refreshInterval: 30000
    });
    
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

// Utility functions moved to unified MonitoringDisplayManager

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