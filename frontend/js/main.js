/**
 * @file main.js
 * @description Main entry point for the Installation Up 4evr frontend.
 */

console.log("main.js loaded and executing!"); // Added for debugging

import { AuthSessionManager } from './modules/auth.js';
import { MonitoringDataManager, PingMonitorManager } from './modules/monitoring.js';
import { UIManager } from './modules/UIManager.js';
import { monitoringDisplay } from './utils/monitoring-display.js';
import { initMonitoringConfig } from './modules/monitoring-config.js';
import { initSystem } from './modules/system.js';
import { initApplications, startRealtimeStatusUpdates, stopRealtimeStatusUpdates } from './modules/applications.js';
// Removed redundant notifications-config.js - all functionality consolidated in notifications.js
import { initNotifications } from './modules/notifications.js';
import { initBackendService } from './modules/backend-service.js';
import { initGlobalSettings } from './modules/global-settings.js';
import { initSetupWizard } from './modules/setup-wizard.js';
import { initDashboard } from './modules/dashboard.js';
import { apiCall } from './utils/api.js';

// Header status indicator management
let headerStatusInterval = null;

async function updateHeaderStatusIndicators() {
    await updateServerStatus();
}

async function updateServerStatus() {
    const serverStatusElement = document.getElementById('server-status');
    if (!serverStatusElement) return;
    
    try {
        const response = await apiCall('/api/system/status');
        
        // If we get a response, the server is running
        // Clear existing status classes
        serverStatusElement.className = 'status-indicator online';
        serverStatusElement.querySelector('i').style.color = '#28a745'; // Green
        serverStatusElement.title = 'Server Online';
        
    } catch (error) {
        // Server is not responding
        serverStatusElement.className = 'status-indicator offline';
        serverStatusElement.querySelector('i').style.color = '#dc3545'; // Red
        serverStatusElement.title = 'Server Offline';
    }
}


function startHeaderStatusUpdates() {
    // Update immediately
    updateHeaderStatusIndicators();
    
    // Update every 30 seconds
    if (headerStatusInterval) {
        clearInterval(headerStatusInterval);
    }
    headerStatusInterval = setInterval(updateHeaderStatusIndicators, 30000);
}

function stopHeaderStatusUpdates() {
    if (headerStatusInterval) {
        clearInterval(headerStatusInterval);
        headerStatusInterval = null;
    }
}

function initMonitoringTab() {
    console.log('[INIT] Initializing Monitoring tab...');
    
    // Get the global monitoring data manager instance
    const monitoringManager = window.app?.monitoringData;
    if (!monitoringManager) {
        console.error('[MONITORING] MonitoringDataManager not available');
        return;
    }

    // Subscribe to monitoring updates with async wrapper
    monitoringManager.subscribe((data) => {
        updateMonitoringDisplay(data).catch(error => {
            console.error('[MONITORING] Failed to update display:', error);
        });
    });
    
    // Setup monitoring controls
    setupMonitoringControls(monitoringManager);
    
    // Initialize monitoring configuration functionality
    initMonitoringConfig();
    
    // Force initial update
    const currentData = monitoringManager.getCurrentData();
    if (currentData.lastUpdate) {
        updateMonitoringDisplay(currentData).catch(error => {
            console.error('[MONITORING] Failed initial display update:', error);
        });
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

    // Settings button - scroll to monitoring config section
    const settingsBtn = document.getElementById('monitoring-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const configSection = document.querySelector('.monitoring-config-section');
            if (configSection) {
                configSection.scrollIntoView({ behavior: 'smooth' });
            }
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

async function updateMonitoringDisplay(data) {
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
    
    // Update health status using monitoring data manager (now includes PM2 health)
    const monitoringManager = window.app?.monitoringData;
    const healthData = monitoringManager ? 
        await monitoringManager.getHealthStatus() : 
        { status: 'unknown', issues: [] };
    
    // Update health status with enhanced PM2 information
    monitoringDisplay.updateHealthStatus('health-status', healthData.status, healthData.issues);
    
    // Update health indicator element if it exists (for better PM2 visibility)
    const healthIndicator = document.getElementById('health-indicator');
    const healthText = document.getElementById('health-text');
    if (healthIndicator && healthText) {
        healthIndicator.textContent = monitoringDisplay.getHealthIndicator(healthData.status);
        
        // Enhanced health text that includes PM2 summary
        let statusText = monitoringDisplay.getHealthText(healthData.status, healthData.issues);
        if (healthData.pm2Health && healthData.pm2Health !== 'No PM2 processes') {
            statusText += ` • PM2: ${healthData.pm2Health}`;
        }
        healthText.textContent = statusText;
    }
    
    // Update alerts using unified display
    monitoringDisplay.updateAlertsSection('alerts-container', data.alerts || []);
    
    // Update PM2 process metrics with already-fetched data
    updatePM2Metrics(data.applications || []);
    
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
            if (data && typeof data === 'number' && !isNaN(data) && data > 0) {
                const hours = Math.floor(data / 3600);
                const days = Math.floor(hours / 24);
                element.textContent = days > 0 ? `${days} days, ${hours % 24} hours` : `${hours} hours`;
            } else {
                element.textContent = 'Uptime unavailable';
            }
            break;
            
        case 'apps-status':
            updateApplicationsStatus(element, data);
            break;
    }
}

/**
 * Update PM2 process metrics in both dashboard and monitoring sections
 */
function updatePM2Metrics(applications = []) {
    try {
        // Use passed application data instead of making API call
        const allApplications = applications || [];
        const pm2Processes = allApplications.filter(app => app.type === 'pm2-process');

        // Calculate PM2 metrics
        const totalProcesses = pm2Processes.length;
        const runningProcesses = pm2Processes.filter(proc => proc.isRunning).length;
        const healthPercentage = totalProcesses > 0 ? Math.round((runningProcesses / totalProcesses) * 100) : 0;
        
        console.log('[PM2] Updating metrics:', {
            total: totalProcesses,
            running: runningProcesses,
            health: healthPercentage
        });

        // Calculate average CPU and memory usage
        const activeCPU = pm2Processes
            .filter(proc => proc.isRunning && proc.pm2Data?.cpu > 0)
            .reduce((sum, proc) => sum + (proc.pm2Data?.cpu || 0), 0);
        const activeMemory = pm2Processes
            .filter(proc => proc.isRunning)
            .reduce((sum, proc) => sum + (proc.pm2Data?.memory || 0), 0);


        // Update monitoring PM2 card
        const monitoringCard = document.getElementById('pm2-usage-value');
        if (monitoringCard) {
            monitoringCard.textContent = `${runningProcesses}/${totalProcesses}`;
            
            const monitoringBar = document.getElementById('pm2-usage-bar');
            if (monitoringBar) {
                monitoringBar.style.width = `${healthPercentage}%`;
                monitoringBar.className = `metric-fill ${getMetricLevelClass(healthPercentage)}`;
            }
            
            const monitoringStatus = document.getElementById('pm2-usage-status');
            if (monitoringStatus) {
                if (totalProcesses === 0) {
                    monitoringStatus.textContent = 'No PM2 processes found';
                } else {
                    const cpuAvg = activeCPU > 0 ? (activeCPU / pm2Processes.filter(p => p.isRunning).length) : 0;
                    const memoryMB = Math.round(activeMemory / 1024 / 1024);
                    monitoringStatus.textContent = `${cpuAvg.toFixed(1)}% CPU avg, ${memoryMB}MB total`;
                }
            }
            
            const monitoringProcesses = document.getElementById('pm2-usage-processes');
            if (monitoringProcesses) {
                updatePM2ProcessList(monitoringProcesses, pm2Processes);
            }
        }

    } catch (error) {
        console.error('[PM2] Failed to update PM2 metrics:', error);
        
        // Set error states for monitoring card
        const monitoringValue = document.getElementById('pm2-usage-value');
        if (monitoringValue) monitoringValue.textContent = 'Error';
        
        const monitoringStatus = document.getElementById('pm2-usage-status');
        if (monitoringStatus) monitoringStatus.textContent = 'PM2 connection failed';
    }
}

/**
 * Update PM2 process list display
 */
function updatePM2ProcessList(container, processes) {
    if (!container || !Array.isArray(processes)) return;

    if (processes.length === 0) {
        container.innerHTML = '<div class="no-processes">No PM2 processes running</div>';
        return;
    }

    container.innerHTML = processes.map(proc => `
        <div class="process-item">
            <div class="process-info">
                <span class="process-name">${proc.name}</span>
                <span class="process-status ${proc.isRunning ? 'running' : 'stopped'}">
                    ${proc.isRunning ? '🟢' : '🔴'} ${proc.status || 'unknown'}
                </span>
            </div>
            <div class="process-metrics">
                ${proc.pm2Data ? `
                    <span class="cpu-metric">CPU: ${proc.pm2Data.cpu}%</span>
                    <span class="memory-metric">RAM: ${Math.round(proc.pm2Data.memory / 1024 / 1024)}MB</span>
                    ${proc.pm2Data.restartTime > 0 ? `<span class="restart-metric">↻${proc.pm2Data.restartTime}</span>` : ''}
                ` : '<span class="no-metrics">No metrics</span>'}
            </div>
        </div>
    `).join('');
}

/**
 * Get metric level CSS class based on percentage
 */
function getMetricLevelClass(percentage) {
    if (percentage >= 80) return 'good';
    if (percentage >= 60) return 'warning';
    return 'critical';
}

/**
 * Enhanced application status display with PM2 integration
 */
async function updateApplicationsStatus(element, launchAgentData) {
    try {
        // Fetch enhanced applications data (includes PM2 processes)
        const appsResponse = await fetch('/api/monitoring/applications');
        let allApplications = [];
        let pm2Processes = [];
        let launchAgents = [];
        
        if (appsResponse.ok) {
            const appsData = await appsResponse.json();
            allApplications = appsData.data?.data || appsData.data || [];
            
            // Separate PM2 processes and launch agents
            pm2Processes = allApplications.filter(app => app.type === 'pm2-process');
            launchAgents = allApplications.filter(app => app.type === 'launch-agent' || !app.type);
        } else {
            // Fallback to passed launchAgentData if API fails
            launchAgents = Array.isArray(launchAgentData) ? launchAgentData : [];
        }

        const totalApps = pm2Processes.length + launchAgents.length;
        
        if (totalApps === 0) {
            element.innerHTML = `
                <div class="no-apps">
                    <i class="fas fa-info-circle"></i>
                    <span>No managed applications</span>
                </div>
            `;
            return;
        }

        // Count running applications
        const runningPM2Processes = launchAgents.filter(app => app.isRunning || app.status === 'running').length;
        const runningPM2 = pm2Processes.filter(proc => proc.status === 'online').length;
        const totalRunning = runningPM2Processes + runningPM2;

        // Create enhanced status display
        element.innerHTML = `
            <div class="apps-summary">
                <div class="apps-count">
                    <span class="running-count">${totalRunning}</span>/<span class="total-count">${totalApps}</span> apps running
                </div>
                <div class="apps-breakdown">
                    ${pm2Processes.length > 0 ? `<span class="pm2-badge">PM2: ${runningPM2}/${pm2Processes.length}</span>` : ''}
                    ${launchAgents.length > 0 ? `<span class="pm2-process-badge">Processes: ${runningPM2Processes}/${launchAgents.length}</span>` : ''}
                </div>
            </div>
            <div class="apps-list">
                ${pm2Processes.slice(0, 2).map(proc => `
                    <div class="app-item pm2-app">
                        <span class="app-status ${proc.isRunning ? 'running' : 'stopped'}">
                            <i class="fas fa-server"></i>
                            ${proc.name}
                        </span>
                        <small class="app-metrics">CPU: ${proc.pm2Data?.cpu || 0}% | RAM: ${Math.round((proc.pm2Data?.memory || 0) / 1024 / 1024)}MB</small>
                    </div>
                `).join('')}
                ${launchAgents.slice(0, 2).map(app => `
                    <div class="app-item launch-agent-app">
                        <span class="app-status ${app.isRunning || app.status === 'running' ? 'running' : 'stopped'}">
                            <i class="fas fa-rocket"></i>
                            ${app.name}
                        </span>
                        <small class="app-type">Launch Agent</small>
                    </div>
                `).join('')}
                ${totalApps > 4 ? `<div class="more-apps">+${totalApps - 4} more...</div>` : ''}
            </div>
        `;

    } catch (error) {
        console.error('[APPS] Failed to update applications status:', error);
        // Fallback to basic display
        const launchAgents = Array.isArray(launchAgentData) ? launchAgentData : [];
        if (launchAgents.length > 0) {
            const running = launchAgents.filter(app => app.isRunning || app.status === 'running').length;
            element.innerHTML = `
                <div>${running}/${launchAgents.length} launch agents running</div>
                <div class="apps-list">${launchAgents.slice(0, 3).map(app => 
                    `<span class="app-status ${app.isRunning || app.status === 'running' ? 'running' : 'stopped'}">${app.name}</span>`
                ).join('')}</div>
            `;
        } else {
            element.textContent = 'No monitored applications';
        }
    }
}

// Utility functions moved to unified MonitoringDisplayManager

class InstallationUp4evr {
    constructor() {
        console.log('[INIT] InstallationUp4evr constructor starting...');
        try {
            this.authSession = new AuthSessionManager();
            console.log('[INIT] ✅ AuthSessionManager created');
            
            this.monitoringData = new MonitoringDataManager();
            console.log('[INIT] ✅ MonitoringDataManager created');
            
            this.pingMonitorManager = new PingMonitorManager();
            console.log('[INIT] ✅ PingMonitorManager created');
            
            this.uiManager = new UIManager();
            console.log('[INIT] ✅ UIManager created');
            
            // Attach PingMonitorManager to global window object
            window.pingMonitorManager = this.pingMonitorManager;
            console.log('[INIT] ✅ PingMonitorManager attached to window');
            
            // Use async initialization properly
            this.init().catch(error => {
                console.error('[INIT] ❌ Init error:', error);
            });
            console.log('[INIT] ✅ init() called');
        } catch (error) {
            console.error('[INIT] ❌ Constructor error:', error);
        }
    }

    async init() {
        console.log('[INIT] Initializing Installation Up 4evr...');

        await this.uiManager.init();

        this.setupTabNavigation();
        
        // Setup mobile navigation
        this.setupMobileNavigation();

        // Start global monitoring
        this.monitoringData.startMonitoring();

        // Initialize the default tab (Dashboard)
        this.navigateToTab('dashboard');
    }

    setupMobileNavigation() {
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (mobileToggle && sidebar) {
            mobileToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
                const isOpen = sidebar.classList.contains('mobile-open');
                mobileToggle.setAttribute('aria-expanded', isOpen);
                mobileToggle.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                    sidebar.classList.remove('mobile-open');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
            });
        }
    }

    setupTabNavigation() {
        console.log('[INIT] Setting up tab navigation...');
        const tabs = document.querySelectorAll('.sidebar-button');
        console.log(`[INIT] Found ${tabs.length} sidebar buttons`);
        
        tabs.forEach((tab, index) => {
            const dataTab = tab.getAttribute('data-tab');
            console.log(`[INIT] Button ${index + 1}: data-tab="${dataTab}"`);
            
            tab.addEventListener('click', (e) => {
                // Close mobile menu on tab click
                const sidebar = document.querySelector('.sidebar');
                const mobileToggle = document.getElementById('mobile-menu-toggle');
                if (sidebar && mobileToggle && window.innerWidth <= 768) {
                    sidebar.classList.remove('mobile-open');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
                e.preventDefault();
                console.log(`[CLICK] Tab clicked: ${dataTab}`);
                const targetId = tab.getAttribute('data-tab');
                this.navigateToTab(targetId);
            });
        });
        console.log('[INIT] ✅ Tab navigation setup complete');
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
        if (tabId === 'applications') {
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
    'system': initSystem,
    'applications': initApplications,
    'monitoring': () => { 
        initMonitoringTab();
        // Initialize ping monitor manager when monitoring tab is opened
        if (window.app && window.app.pingMonitorManager) {
            window.app.pingMonitorManager.initialize();
        }
    },
    'backend-service': initBackendService,
    'global': initGlobalSettings,
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
    console.log('[INIT] DOM Content Loaded, creating app...');
    try {
        window.app = new InstallationUp4evr();
        console.log('[INIT] ✅ window.app created successfully');
        
        // Start header status indicator updates
        startHeaderStatusUpdates();
        console.log('[INIT] ✅ Header status indicators started');
        
        // Dispatch app ready event for any queued navigations
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('app-ready'));
            console.log('[INIT] ✅ app-ready event dispatched');
        }, 100);
    } catch (error) {
        console.error('[INIT] ❌ Failed to create app:', error);
    }
});
