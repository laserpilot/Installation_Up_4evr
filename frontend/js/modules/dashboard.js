/**
 * @file dashboard.js
 * @description Dashboard tab functionality for Installation Up 4evr.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { monitoringDisplay } from '../utils/monitoring-display.js';

// Monitoring thresholds - consistent across all monitoring modules
const MONITORING_THRESHOLDS = {
    cpu: { warning: 70, critical: 85 },
    memory: { warning: 75, critical: 90 },
    disk: { warning: 80, critical: 95 },
    temperature: { warning: 70, critical: 85 }
};

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
        
        // Update applications - fix data structure mismatch
        updateApplications(applications.data || []);
        
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
    // CPU Usage (processes display removed)
    monitoringDisplay.updateMetricCard({
        metricId: 'dashboard-cpu',
        value: systemData.cpu?.usage || 0,
        unit: '%',
        type: 'cpu',
        showProcesses: false
    });
    
    // Memory Usage (processes display removed)
    monitoringDisplay.updateMetricCard({
        metricId: 'dashboard-memory',
        value: systemData.memory?.usage || 0,
        unit: '%',
        type: 'memory',
        showProcesses: false
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
    
    // System Uptime - handle both object and number formats
    const uptimeValue = systemData.uptime?.seconds || systemData.uptime || 0;
    const uptimeFormatted = systemData.uptime?.formatted || formatDashboardUptime(uptimeValue);
    
    console.log('[DASHBOARD] Uptime update:', {
        raw: systemData.uptime,
        value: uptimeValue,
        formatted: uptimeFormatted
    });
    
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
                <button class="btn btn-link" onclick="navigateToTab('applications')">
                    <i class="fas fa-rocket"></i> Set up Applications
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = applications.map(app => {
        const isLaunchAgent = app.type === 'launch-agent';
        const isPM2Process = app.type === 'pm2-process';
        const isToolCreated = app.source === 'tool-created';
        const toolBadge = isToolCreated ? '<span class="tool-created-badge"><i class="fas fa-rocket"></i> Up4Evr</span>' : '';
        
        // Handle different running status property names
        const isRunning = app.isRunning !== undefined ? app.isRunning : app.running;
        
        return `
            <div class="app-status-card ${isToolCreated ? 'tool-created-app' : ''}">
                <div class="app-icon">
                    <i class="fas ${isRunning ? 'fa-play-circle text-green' : 'fa-stop-circle text-red'}"></i>
                </div>
                <div class="app-info">
                    <h4>${app.name} ${toolBadge}</h4>
                    <p>${isRunning ? 'Running' : 'Stopped'}</p>
                    ${app.pid ? `<small>PID: ${app.pid}</small>` : ''}
                    ${isLaunchAgent ? '<small class="app-type">Launch Agent</small>' : ''}
                    ${isPM2Process ? '<small class="app-type">PM2 Process</small>' : ''}
                </div>
                <div class="app-actions">
                    ${isLaunchAgent ? `
                        <button class="btn btn-sm ${isRunning ? 'btn-danger' : 'btn-success'}" 
                                onclick="toggleLaunchAgent('${app.agentData.label}')">
                            ${isRunning ? 'Stop' : 'Start'}
                        </button>
                        <button class="btn btn-sm btn-outline" 
                                onclick="viewLaunchAgent('${app.agentData.label}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : isPM2Process ? `
                        <button class="btn btn-sm ${isRunning ? 'btn-danger' : 'btn-success'}" 
                                onclick="togglePM2Process('${app.name}')">
                            ${isRunning ? 'Stop' : 'Start'}
                        </button>
                        <button class="btn btn-sm btn-outline" 
                                onclick="viewPM2Process('${app.name}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : `
                        <button class="btn btn-sm ${isRunning ? 'btn-danger' : 'btn-success'}" 
                                onclick="toggleApplication('${app.name}')">
                            ${isRunning ? 'Stop' : 'Start'}
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
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
function formatDashboardUptime(seconds) {
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

// Global function for launch agent toggle (called from HTML)
window.toggleLaunchAgent = async function(agentLabel) {
    try {
        // Get current status first
        const statusResponse = await apiCall('/api/launch-agents/status');
        const agent = statusResponse.find(a => a.label === agentLabel);
        
        if (!agent) {
            showToast(`Launch agent ${agentLabel} not found`, 'error');
            return;
        }
        
        // Toggle the agent
        const action = agent.isRunning ? 'stop' : 'start';
        const response = await apiCall(`/api/launch-agents/${action}`, {
            method: 'POST',
            body: JSON.stringify({ label: agentLabel })
        });
        
        if (response.success) {
            showToast(`Launch agent ${action}ed successfully`, 'success');
            refreshDashboardData(); // Refresh to show updated status
        } else {
            showToast(`Failed to ${action} launch agent`, 'error');
        }
    } catch (error) {
        console.error('Launch agent toggle failed:', error);
        showToast(`Failed to toggle launch agent`, 'error');
    }
};

// Global function for PM2 process toggle (called from HTML)
window.togglePM2Process = async function(processName) {
    try {
        // Get current process status from monitoring API
        const appsResponse = await apiCall('/api/monitoring/applications');
        const pm2Process = appsResponse.data.find(app => app.type === 'pm2-process' && app.name === processName);
        
        if (!pm2Process) {
            showToast(`PM2 process ${processName} not found`, 'error');
            return;
        }
        
        // Toggle the process using PM2 API
        const action = pm2Process.isRunning ? 'stop' : 'start';
        const response = await apiCall(`/api/pm2/${action}`, {
            method: 'POST',
            body: JSON.stringify({ name: processName })
        });
        
        if (response.success) {
            showToast(`PM2 process ${action}ed successfully`, 'success');
            refreshDashboardData(); // Refresh to show updated status
        } else {
            showToast(`Failed to ${action} PM2 process`, 'error');
        }
    } catch (error) {
        console.error('PM2 process toggle failed:', error);
        showToast(`Failed to toggle PM2 process`, 'error');
    }
};

// Global function for viewing PM2 process (called from HTML)
window.viewPM2Process = function(processName) {
    // Navigate to applications tab where PM2 processes can be managed
    if (window.navigateToTab) {
        navigateToTab('launch-agents');
        // Set a small delay to allow tab to load, then show process info
        setTimeout(() => {
            showToast(`View ${processName} in Applications tab for detailed management`, 'info');
        }, 500);
    }
};

// Global function for viewing launch agent (called from HTML)
window.viewLaunchAgent = function(agentLabel) {
    // Navigate to launch agents tab and show the specific agent
    if (window.navigateToTab) {
        navigateToTab('launch-agents');
        // Set a small delay to allow tab to load, then highlight the agent
        setTimeout(() => {
            const agentCard = document.querySelector(`[data-label="${agentLabel}"]`);
            if (agentCard) {
                agentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                agentCard.style.outline = '2px solid var(--primary-color)';
                setTimeout(() => {
                    agentCard.style.outline = '';
                }, 3000);
            }
        }, 500);
    }
};

// Cleanup function
export function cleanupDashboard() {
    stopDashboardRefresh();
    isInitialized = false;
}