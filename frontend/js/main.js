/**
 * @file main.js
 * @description Main entry point for the Installation Up 4evr frontend.
 */

console.log("main.js loaded and executing!"); // Added for debugging

import { AuthSessionManager } from './modules/auth.js';
import { MonitoringDataManager } from './modules/monitoring.js';
import { UIManager } from './modules/UIManager.js';
import { initSystemPreferences } from './modules/system-preferences.js';
import { initLaunchAgents } from './modules/launch-agents.js';
import { initMonitoringConfig } from './modules/monitoring-config.js';
import { initNotificationConfig } from './modules/notifications-config.js';
import { initNotifications } from './modules/notifications.js';
import { initInstallationSettings } from './modules/installation-settings.js';
import { initServiceControl } from './modules/service-control.js';
import { initConfiguration } from './modules/configuration.js';
import { initSetupWizard } from './modules/setup-wizard.js';
import { initDashboard } from './modules/dashboard.js';

function initMonitoringTab() {
    console.log('[INIT] Initializing Monitoring tab...');
    
    // Get the global monitoring data manager instance
    const monitoringManager = window.app?.monitoringData;
    if (!monitoringManager) {
        console.error('[MONITORING] MonitoringDataManager not available');
        return;
    }

    // Subscribe to monitoring updates
    monitoringManager.subscribe(updateMonitoringDisplay);
    
    // Setup monitoring controls
    setupMonitoringControls(monitoringManager);
    
    // Force initial update
    const currentData = monitoringManager.getCurrentData();
    if (currentData.lastUpdate) {
        updateMonitoringDisplay(currentData);
    }
}

function setupMonitoringControls(monitoringManager) {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-monitoring');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('[MONITORING] Manual refresh requested');
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            
            try {
                await monitoringManager.refreshData();
                showToast('Monitoring data refreshed', 'success');
            } catch (error) {
                showToast('Failed to refresh monitoring data', 'error');
            } finally {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            }
        });
    }

    // Export button
    const exportBtn = document.getElementById('export-monitoring-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            exportMonitoringData(monitoringManager);
        });
    }

    // Settings button - navigate to monitoring config
    const settingsBtn = document.getElementById('monitoring-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            navigateToTab('monitoring-config');
        });
    }
}

function exportMonitoringData(monitoringManager) {
    try {
        const data = monitoringManager.getCurrentData();
        const exportData = {
            timestamp: new Date().toISOString(),
            system: data.system,
            applications: data.applications,
            displays: data.displays,
            network: data.network,
            alerts: data.alerts,
            status: data.status,
            lastUpdate: data.lastUpdate,
            metadata: {
                exportedBy: 'Installation Up 4evr',
                version: '1.0.0-alpha.1',
                platform: navigator.platform
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const filename = `monitoring-data-${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        showToast(`Monitoring data exported as ${filename}`, 'success');
    } catch (error) {
        console.error('[MONITORING] Export failed:', error);
        showToast('Failed to export monitoring data', 'error');
    }
}

function updateMonitoringDisplay(data) {
    console.log('[MONITORING] Updating display with data:', data);
    
    // Update system metrics
    const metrics = data.system;
    if (metrics) {
        // Update CPU
        const cpuUsage = metrics.cpu?.usage || metrics.cpuUsage || 0;
        updateMetricCard('cpu-usage', 'cpu-bar', cpuUsage, '%');
        
        // Update Memory
        const memoryUsage = metrics.memory?.usage || metrics.memoryUsage || 0;
        updateMetricCard('memory-usage', 'memory-bar', memoryUsage, '%');
        
        // Update Disk
        let diskUsage = 0;
        if (data.storage) {
            diskUsage = Math.max(...Object.values(data.storage).map(disk => disk.usagePercent || 0));
        }
        updateMetricCard('disk-usage', 'disk-bar', diskUsage, '%');
    }
    
    // Update health status
    updateHealthStatus(data);
    
    // Update alerts
    updateAlertsSection(data.alerts || []);
    
    // Update system details
    updateSystemDetails(data);
}

function updateMetricCard(valueId, barId, value, unit) {
    const valueElement = document.getElementById(valueId);
    const barElement = document.getElementById(barId);
    
    if (valueElement) {
        valueElement.textContent = `${value.toFixed(1)}${unit}`;
    }
    
    if (barElement) {
        barElement.style.width = `${Math.min(value, 100)}%`;
        
        // Add color coding
        barElement.className = 'metric-fill';
        if (value > 80) barElement.classList.add('critical');
        else if (value > 60) barElement.classList.add('warning');
        else barElement.classList.add('normal');
    }
}

function updateHealthStatus(data) {
    const indicator = document.getElementById('health-indicator');
    const text = document.getElementById('health-text');
    
    if (!indicator || !text) return;
    
    const status = data.status || 'unknown';
    
    switch (status) {
        case 'good':
            indicator.textContent = '🟢';
            text.textContent = 'System Healthy';
            break;
        case 'warning':
            indicator.textContent = '🟡';
            text.textContent = 'Minor Issues';
            break;
        case 'error':
        case 'critical':
            indicator.textContent = '🔴';
            text.textContent = 'Critical Issues';
            break;
        default:
            indicator.textContent = '🟡';
            text.textContent = 'Checking...';
    }
}

function updateAlertsSection(alerts) {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    
    if (alerts.length === 0) {
        container.innerHTML = '<p class="no-alerts">No active alerts</p>';
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="alert alert-${alert.level || 'info'}">
            <i class="fas fa-${getAlertIcon(alert.level)}"></i>
            <div class="alert-content">
                <strong>${alert.title || 'System Alert'}</strong>
                <p>${alert.message || alert.description || 'No details available'}</p>
                <small>${new Date(alert.timestamp || Date.now()).toLocaleString()}</small>
            </div>
        </div>
    `).join('');
}

function updateSystemDetails(data) {
    // Update display status
    updateDetailCard('display-status', data.displays);
    
    // Update network status
    updateDetailCard('network-status', data.network);
    
    // Update uptime
    updateDetailCard('uptime-status', data.system?.uptime);
    
    // Update monitored apps
    updateDetailCard('apps-status', data.applications);
}

function updateDetailCard(elementId, data) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    switch (elementId) {
        case 'display-status':
            if (Array.isArray(data) && data.length > 0) {
                element.innerHTML = data.map(display => 
                    `<div>${display.name || 'Display'}: ${display.resolution || 'Unknown'}</div>`
                ).join('');
            } else {
                element.textContent = 'No displays detected';
            }
            break;
            
        case 'network-status':
            if (data) {
                element.innerHTML = `
                    <div>Status: ${data.connected ? 'Connected' : 'Disconnected'}</div>
                    <div>IP: ${data.ip || 'Unknown'}</div>
                `;
            } else {
                element.textContent = 'Network information unavailable';
            }
            break;
            
        case 'uptime-status':
            if (data) {
                const hours = Math.floor(data / 3600);
                const days = Math.floor(hours / 24);
                element.textContent = days > 0 ? `${days} days, ${hours % 24} hours` : `${hours} hours`;
            } else {
                element.textContent = 'Uptime unavailable';
            }
            break;
            
        case 'apps-status':
            if (Array.isArray(data) && data.length > 0) {
                const running = data.filter(app => app.isRunning).length;
                element.innerHTML = `
                    <div>${running}/${data.length} apps running</div>
                    <div class="apps-list">${data.slice(0, 3).map(app => 
                        `<span class="app-status ${app.isRunning ? 'running' : 'stopped'}">${app.name}</span>`
                    ).join('')}</div>
                `;
            } else {
                element.textContent = 'No monitored applications';
            }
            break;
    }
}

function getAlertIcon(level) {
    switch (level) {
        case 'critical': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'bell';
    }
}

class InstallationUp4evr {
    constructor() {
        this.authSession = new AuthSessionManager();
        this.monitoringData = new MonitoringDataManager();
        this.uiManager = new UIManager();
        this.init();
    }

    async init() {
        console.log('[INIT] Initializing Installation Up 4evr...');

        await this.uiManager.init();

        this.setupTabNavigation();

        // Start global monitoring
        this.monitoringData.startMonitoring();

        // Initialize the default tab (Dashboard)
        this.navigateToTab('dashboard');
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.sidebar-button');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = tab.getAttribute('data-tab');
                this.navigateToTab(targetId);
            });
        });
    }

    navigateToTab(tabId) {
        console.log(`[NAV] Navigating to tab: ${tabId}`);
        
        const tabs = document.querySelectorAll('.sidebar-button');
        const tabContents = document.querySelectorAll('.tab-pane');

        // Deactivate all tabs and content panes
        tabs.forEach(t => {
            t.classList.remove('active');
            console.log(`[NAV] Deactivated button:`, t.getAttribute('data-tab'));
        });
        tabContents.forEach(c => {
            c.classList.remove('active');
            // Also remove any inline display styles that might override CSS
            c.style.display = '';
            console.log(`[NAV] Deactivated content:`, c.id);
        });

        // Activate the selected tab button and content pane
        const newActiveTabButton = document.querySelector(`.sidebar-button[data-tab="${tabId}"]`);
        const newActiveContent = document.getElementById(`${tabId}-tab`);

        console.log(`[NAV] Found button:`, newActiveTabButton);
        console.log(`[NAV] Found content:`, newActiveContent);

        if (newActiveTabButton) {
            newActiveTabButton.classList.add('active');
            console.log(`[NAV] Activated button for tab: ${tabId}`);
        } else {
            console.error(`[NAV] Button not found for tab: ${tabId}`);
        }
        
        if (newActiveContent) {
            newActiveContent.classList.add('active');
            console.log(`[NAV] Activated content for tab: ${tabId}`);
        } else {
            console.error(`[NAV] Content not found for tab: ${tabId}, looking for ID: ${tabId}-tab`);
        }

        // Dynamically initialize module for the activated tab
        const initializer = this.moduleInitializers[tabId];
        if (initializer) {
            console.log(`[INIT] Initializing module for tab: ${tabId}`);
            initializer();
        } else {
            console.warn(`[INIT] No initializer found for tab: ${tabId}`);
        }
    }
}

// Add module initializers to the InstallationUp4evr class prototype
InstallationUp4evr.prototype.moduleInitializers = {
    'dashboard': initDashboard,
    'setup-wizard': initSetupWizard,
    'system-prefs': initSystemPreferences,
    'launch-agents': initLaunchAgents,
    'monitoring': () => { initMonitoringTab(); },
    'monitoring-config': initMonitoringConfig,
    'installation-settings': initInstallationSettings,
    'service-control': initServiceControl,
    'configuration': initConfiguration,
    'notifications': initNotifications
};

document.addEventListener('DOMContentLoaded', () => {
    window.app = new InstallationUp4evr();
});
