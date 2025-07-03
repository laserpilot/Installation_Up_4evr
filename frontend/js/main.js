/**
 * @file main.js
 * @description Main entry point for the Installation Up 4evr frontend.
 */

console.log("main.js loaded and executing!"); // Added for debugging

import { AuthSessionManager } from './modules/auth.js';
import { MonitoringDataManager } from './modules/monitoring.js';
import { UIManager } from './modules/UIManager.js';
import { monitoringDisplay } from './utils/monitoring-display.js';
import { initSystemPreferences } from './modules/system-preferences.js';
import { initLaunchAgents, startRealtimeStatusUpdates, stopRealtimeStatusUpdates } from './modules/launch-agents.js';
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
    // Use unified refresh button setup
    monitoringDisplay.setupRefreshButton('refresh-monitoring', async () => {
        await monitoringManager.refreshData();
    });

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
    
    // Update system metrics using unified display manager
    const metrics = data.system;
    if (metrics) {
        // Update CPU with top processes
        monitoringDisplay.updateMetricCard({
            metricId: 'cpu-usage',
            value: metrics.cpu?.usage || metrics.cpuUsage || 0,
            unit: '%',
            type: 'cpu',
            showProcesses: true,
            processes: metrics.cpu?.topProcesses || []
        });
        
        // Update Memory with top processes
        monitoringDisplay.updateMetricCard({
            metricId: 'memory-usage',
            value: metrics.memory?.usage || metrics.memoryUsage || 0,
            unit: '%',
            type: 'memory',
            showProcesses: true,
            processes: metrics.memory?.topProcesses || []
        });
        
        // Update Disk with details
        const diskUsage = metrics.disk?.usage || 0;
        monitoringDisplay.updateMetricCard({
            metricId: 'disk-usage',
            value: diskUsage,
            unit: '%',
            type: 'disk',
            diskDetails: metrics.disk ? {
                total: metrics.disk.total || 'Unknown',
                used: metrics.disk.used || 'Unknown',
                available: metrics.disk.available || 'Unknown'
            } : null
        });
    }
    
    // Update health status using monitoring data manager
    const monitoringManager = window.app?.monitoringData;
    const healthData = monitoringManager ? 
        monitoringManager.getHealthStatus() : 
        { status: 'unknown', issues: [] };
    
    monitoringDisplay.updateHealthStatus('health-status', healthData.status, healthData.issues);
    
    // Update alerts using unified display
    monitoringDisplay.updateAlertsSection('alerts-container', data.alerts || []);
    
    // Update system details
    updateSystemDetails(data);
}

// Old metric display functions replaced by unified MonitoringDisplayManager

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

// Utility functions moved to unified MonitoringDisplayManager

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

        // Handle real-time updates for launch agents tab
        if (tabId === 'launch-agents') {
            startRealtimeStatusUpdates();
        } else {
            stopRealtimeStatusUpdates();
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

// Global navigation function for use in HTML onclick handlers
window.navigateToTab = function(tabId) {
    if (window.app && window.app.navigateToTab) {
        window.app.navigateToTab(tabId);
    } else {
        console.error('[NAVIGATION] App not ready, queuing navigation to:', tabId);
        // Queue the navigation for when app is ready
        document.addEventListener('app-ready', () => {
            window.app.navigateToTab(tabId);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.app = new InstallationUp4evr();
    
    // Dispatch app ready event for any queued navigations
    setTimeout(() => {
        document.dispatchEvent(new CustomEvent('app-ready'));
    }, 100);
});
