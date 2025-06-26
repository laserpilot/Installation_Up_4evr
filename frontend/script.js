/**
 * Installation Up 4evr - Frontend JavaScript
 * Handles UI interactions and API communication
 */

class InstallationUp4evr {
    constructor() {
        // Fix base URL for Electron vs web browser
        this.isElectron = window.electronAPI?.isElectron || false;
        this.baseUrl = this.isElectron ? 'http://localhost:3001' : window.location.origin;
        this.selectedSettings = new Set();
        this.currentAppPath = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        
        // Show initial loading states
        this.showInitialLoadingStates();
        
        // If running in Electron, wait for server to be ready
        if (this.isElectron) {
            this.updateLoadingMessage('Starting backend server...');
            await this.waitForServer();
        }
        
        this.updateLoadingMessage('Checking server status...');
        const serverOnline = await this.checkServerStatus();
        
        if (serverOnline) {
            this.updateLoadingMessage('Loading system preferences...');
            await this.loadSystemPreferences();
            
            this.updateLoadingMessage('Loading launch agents...');
            await this.loadLaunchAgents();
            
            this.updateLoadingMessage('Checking security status...');
            await this.checkSIPStatus();
            
            this.hideLoadingStates();
        } else {
            this.showServerOfflineState();
        }
    }

    async waitForServer(maxAttempts = 10, delay = 2000) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                this.updateLoadingMessage(`Connecting to server... (${i + 1}/${maxAttempts})`);
                const response = await fetch(`${this.baseUrl}/api/health`);
                if (response.ok) {
                    console.log('Server is ready');
                    this.updateLoadingMessage('Server connected successfully!');
                    return true;
                }
            } catch (error) {
                console.log(`Waiting for server... attempt ${i + 1}/${maxAttempts}`);
            }
            
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.warn('Server did not become ready within timeout');
        this.updateLoadingMessage('Server connection timeout - will attempt to continue...');
        return false;
    }

    setupEventListeners() {
        // Tab navigation
        this.setupTabNavigation();
        
        // System Preferences
        document.getElementById('verify-settings').addEventListener('click', () => this.verifySettings());
        document.getElementById('apply-required').addEventListener('click', () => this.applyRequiredSettings());
        document.getElementById('apply-selected').addEventListener('click', () => this.applySelectedSettings());

        // Launch Agents - Drag and Drop
        const dropZone = document.getElementById('app-drop-zone');
        const fileInput = document.getElementById('app-file-input');

        if (this.isElectron) {
            // Enhanced Electron file selection
            dropZone.addEventListener('click', () => this.selectAppFileElectron());
        } else {
            // Fallback for web version
            dropZone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
        
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));

        // Launch Agent Actions
        document.getElementById('create-launch-agent').addEventListener('click', () => this.createLaunchAgent());
        document.getElementById('install-launch-agent').addEventListener('click', () => this.installLaunchAgent());

        // Service Control Actions
        document.getElementById('restart-backend').addEventListener('click', () => this.restartBackend());
        document.getElementById('stop-backend').addEventListener('click', () => this.stopBackend());
        document.getElementById('start-backend').addEventListener('click', () => this.startBackend());
        document.getElementById('install-service').addEventListener('click', () => this.installService());
        document.getElementById('refresh-logs').addEventListener('click', () => this.refreshServiceLogs());
        document.getElementById('clear-logs').addEventListener('click', () => this.clearServiceLogs());
    }

    // API Communication
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            
            // Only show toast for non-health check calls
            if (!endpoint.includes('/health')) {
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    this.showToast('Cannot connect to server - is it running?', 'error');
                } else {
                    this.showToast(`API Error: ${error.message}`, 'error');
                }
            }
            throw error;
        }
    }

    // Server Status
    async checkServerStatus() {
        try {
            await this.apiCall('/api/health');
            this.updateStatus('server-status', 'online', 'Server Online');
            return true;
        } catch (error) {
            this.updateStatus('server-status', 'offline', 'Server Offline');
            if (this.isElectron) {
                this.showToast('Backend server is starting up...', 'info');
            }
            return false;
        }
    }

    async checkSIPStatus() {
        try {
            const sipStatus = await this.apiCall('/api/system-prefs/sip-status');
            const status = sipStatus.enabled ? 'warning' : 'online';
            const text = sipStatus.enabled ? 'SIP Enabled' : 'SIP Disabled';
            this.updateStatus('sip-status', status, text);
            
            if (sipStatus.warning) {
                this.showToast(sipStatus.warning, 'warning');
            }
        } catch (error) {
            this.updateStatus('sip-status', 'offline', 'SIP Unknown');
        }
    }

    updateStatus(elementId, status, text) {
        const element = document.getElementById(elementId);
        element.className = `status-indicator ${status}`;
        element.innerHTML = `<i class="fas fa-circle"></i> ${text}`;
    }

    // System Preferences
    async loadSystemPreferences() {
        try {
            const [required, optional, statusData] = await Promise.all([
                this.apiCall('/api/system-prefs/required'),
                this.apiCall('/api/system-prefs/optional'),
                this.apiCall('/api/system-prefs/status')
            ]);

            // Create status lookup for quick access
            const statusLookup = {};
            statusData.forEach(status => {
                statusLookup[status.setting] = status;
            });

            this.renderSettings('required-settings', required, statusLookup);
            this.renderSettings('optional-settings', optional, statusLookup);
        } catch (error) {
            this.showToast('Failed to load system preferences', 'error');
        }
    }

    renderSettings(containerId, settings, statusLookup = {}) {
        const container = document.getElementById(containerId);
        container.innerHTML = settings.map(setting => {
            const status = statusLookup[setting.id] || { statusIcon: '⚪', statusText: 'Unknown' };
            const statusClass = this.getStatusClass(status.status);
            
            return `
                <div class="setting-item ${statusClass}" data-setting-id="${setting.id}">
                    <label class="checkbox-label">
                        <input type="checkbox" data-setting="${setting.id}">
                        <span class="checkbox-custom"></span>
                        <div class="setting-content">
                            <div class="setting-header">
                                <h4>${setting.name} <span class="status-emoji">${status.statusIcon}</span></h4>
                                <span class="status-text">${status.statusText}</span>
                            </div>
                            <p>${setting.description}</p>
                        </div>
                    </label>
                </div>
            `;
        }).join('');

        // Add change listeners
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const settingId = e.target.dataset.setting;
                const settingItem = e.target.closest('.setting-item');
                
                if (e.target.checked) {
                    this.selectedSettings.add(settingId);
                    settingItem.classList.add('selected');
                } else {
                    this.selectedSettings.delete(settingId);
                    settingItem.classList.remove('selected');
                }
            });
        });
    }

    getStatusClass(status) {
        switch (status) {
            case 'applied': return 'status-applied';
            case 'not_applied': return 'status-needs-applying';
            case 'error': return 'status-error';
            case 'unknown': return 'status-unknown';
            default: return 'status-unknown';
        }
    }

    async verifySettings() {
        this.showLoading();
        try {
            const results = await this.apiCall('/api/system-prefs/verify');
            this.displayResults('System Settings Verification', results);
        } catch (error) {
            this.showToast('Failed to verify settings', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async applyRequiredSettings() {
        if (!confirm('This will apply all required system settings. Some changes require admin privileges. Continue?')) {
            return;
        }

        this.showLoading();
        try {
            const results = await this.apiCall('/api/system-prefs/apply-required', {
                method: 'POST'
            });
            this.displayResults('Applied Required Settings', results);
            this.showToast('Required settings applied successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to apply required settings', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async applySelectedSettings() {
        if (this.selectedSettings.size === 0) {
            this.showToast('Please select settings to apply', 'warning');
            return;
        }

        if (!confirm(`This will apply ${this.selectedSettings.size} selected settings. Some changes require admin privileges. Continue?`)) {
            return;
        }

        this.showLoading();
        try {
            let results;
            if (this.isElectron) {
                // Use native Electron API for better sudo handling
                results = await window.electronAPI.applySystemSettings(Array.from(this.selectedSettings));
            } else {
                // Fallback to web API
                results = await this.apiCall('/api/system-prefs/apply', {
                    method: 'POST',
                    body: JSON.stringify({ settings: Array.from(this.selectedSettings) })
                });
            }
            this.displayResults('Applied Selected Settings', results);
            this.showToast(`Applied ${this.selectedSettings.size} settings successfully!`, 'success');
        } catch (error) {
            this.showToast('Failed to apply selected settings', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Drag and Drop
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }

    async handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.app')) {
                await this.processAppFile(file.path || file.webkitRelativePath || file.name);
            } else {
                this.showToast('Please drop a .app file', 'warning');
            }
        }
    }

    async handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            const file = files[0];
            await this.processAppFile(file.path || file.webkitRelativePath || `/Applications/${file.name}`);
        }
    }

    async selectAppFileElectron() {
        try {
            const appPath = await window.electronAPI.selectAppFile();
            if (appPath) {
                await this.processAppFile(appPath);
            }
        } catch (error) {
            this.showToast(`Failed to select app: ${error.message}`, 'error');
        }
    }

    async processAppFile(appPath) {
        this.showLoading();
        try {
            let appInfo;
            
            if (this.isElectron) {
                // Use native Electron API for real file access
                appInfo = await window.electronAPI.getAppInfo(appPath);
            } else {
                // Fallback for web version with common apps simulation
                const commonApps = {
                    'TextEdit.app': '/Applications/TextEdit.app',
                    'Calculator.app': '/Applications/Calculator.app',
                    'Safari.app': '/Applications/Safari.app',
                    'Chrome.app': '/Applications/Google Chrome.app',
                    'Firefox.app': '/Applications/Firefox.app'
                };

                const appName = appPath.split('/').pop() || appPath;
                const resolvedPath = commonApps[appName] || `/Applications/${appName}`;
                
                appInfo = await this.apiCall('/api/launch-agents/app-info', {
                    method: 'POST',
                    body: JSON.stringify({ appPath: resolvedPath })
                });
            }

            this.currentAppPath = appPath;
            this.displayAppInfo(appInfo);
            this.showToast(`App info loaded: ${appInfo.displayName}`, 'success');
        } catch (error) {
            this.showToast(`Failed to load app info: ${error.message}`, 'error');
            // Show a demo app info for testing
            this.showDemoAppInfo(appPath);
        } finally {
            this.hideLoading();
        }
    }

    showDemoAppInfo(appPath) {
        const demoInfo = {
            appName: appPath.split('/').pop().replace('.app', ''),
            displayName: appPath.split('/').pop().replace('.app', ''),
            appPath: appPath,
            version: '1.0.0',
            bundleIdentifier: `com.example.${appPath.split('/').pop().replace('.app', '').toLowerCase()}`
        };
        
        this.currentAppPath = appPath;
        this.displayAppInfo(demoInfo);
    }

    displayAppInfo(appInfo) {
        document.getElementById('app-name').textContent = appInfo.displayName;
        document.getElementById('app-path').textContent = appInfo.appPath;
        document.getElementById('app-version').textContent = `v${appInfo.version}`;
        document.getElementById('app-bundle-id').textContent = appInfo.bundleIdentifier || 'No Bundle ID';
        
        // Set default label
        const defaultLabel = appInfo.bundleIdentifier 
            ? `${appInfo.bundleIdentifier}.up4evr`
            : `com.up4evr.${appInfo.appName.toLowerCase()}`;
        document.getElementById('custom-label').value = defaultLabel;
        
        document.getElementById('app-info').style.display = 'block';
    }

    async createLaunchAgent() {
        if (!this.currentAppPath) {
            this.showToast('Please select an app first', 'warning');
            return;
        }

        const options = this.getLaunchAgentOptions();
        
        this.showLoading();
        try {
            let result;
            if (this.isElectron) {
                result = await window.electronAPI.createLaunchAgent(this.currentAppPath, options);
            } else {
                result = await this.apiCall('/api/launch-agents/create', {
                    method: 'POST',
                    body: JSON.stringify({ appPath: this.currentAppPath, options })
                });
            }

            this.displayResults('Launch Agent Created', [result]);
            this.showToast('Launch agent created successfully!', 'success');
            await this.loadLaunchAgents();
        } catch (error) {
            this.showToast('Failed to create launch agent', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async installLaunchAgent() {
        if (!this.currentAppPath) {
            this.showToast('Please select an app first', 'warning');
            return;
        }

        const options = this.getLaunchAgentOptions();
        
        this.showLoading();
        try {
            let result;
            if (this.isElectron) {
                result = await window.electronAPI.installLaunchAgent(this.currentAppPath, options);
            } else {
                result = await this.apiCall('/api/launch-agents/install', {
                    method: 'POST',
                    body: JSON.stringify({ appPath: this.currentAppPath, options })
                });
            }

            this.displayResults('Launch Agent Installed', [result]);
            this.showToast('Launch agent installed and started!', 'success');
            await this.loadLaunchAgents();
        } catch (error) {
            this.showToast('Failed to install launch agent', 'error');
        } finally {
            this.hideLoading();
        }
    }

    getLaunchAgentOptions() {
        return {
            keepAlive: document.getElementById('keep-alive').checked,
            successfulExit: document.getElementById('successful-exit').checked,
            runAtLoad: document.getElementById('run-at-load').checked,
            label: document.getElementById('custom-label').value || undefined
        };
    }

    // Launch Agents List
    async loadLaunchAgents() {
        try {
            const [agents, status] = await Promise.all([
                this.apiCall('/api/launch-agents/list'),
                this.apiCall('/api/launch-agents/status')
            ]);

            this.renderLaunchAgents(agents, status);
        } catch (error) {
            console.error('Failed to load launch agents:', error);
        }
    }

    renderLaunchAgents(agents, statusList) {
        const container = document.getElementById('launch-agents-list');
        
        if (agents.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No custom launch agents found</p>';
            return;
        }

        container.innerHTML = agents.map(agent => {
            const status = statusList.find(s => s.label === agent.label);
            const isRunning = status && status.pid !== null;
            const statusClass = isRunning ? 'running' : 'stopped';
            const statusText = isRunning ? `Running (PID: ${status.pid})` : 'Stopped';
            const statusIcon = isRunning ? 'fa-play' : 'fa-stop';

            return `
                <div class="agent-item">
                    <div class="agent-info">
                        <h5>${agent.label}</h5>
                        <p>${agent.filename}</p>
                    </div>
                    <div class="agent-status ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${statusText}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Results Display
    displayResults(title, results) {
        const section = document.getElementById('results-section');
        const content = document.getElementById('results-content');
        
        const resultItems = Array.isArray(results) ? results : [results];
        
        const html = `
            <h3>${title}</h3>
            <div class="results-list">
                ${resultItems.map(result => {
                    const type = result.success === false ? 'error' : 
                                result.verified === false ? 'warning' : 'success';
                    const icon = type === 'error' ? 'fa-times' : 
                                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-check';
                    
                    return `
                        <div class="result-item ${type}">
                            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                <i class="fas ${icon}" style="margin-right: 8px;"></i>
                                <strong>${result.setting || result.name || 'Action'}</strong>
                            </div>
                            <div>${result.message || result.output || 'No details available'}</div>
                            ${result.error ? `<div style="color: #ff6b6b; margin-top: 4px;">Error: ${result.error}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        content.innerHTML = html;
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
    }

    // UI Helpers
    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas ${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.getElementById('toast-container').appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Tab Navigation
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
                
                // Load monitoring data if monitoring tab is selected
                if (targetTab === 'monitoring') {
                    this.loadMonitoringData();
                    this.startMonitoringUpdates();
                }
                
                // Load service status if service control tab is selected
                if (targetTab === 'service-control') {
                    this.loadServiceStatus();
                    this.refreshServiceLogs();
                    this.startServiceStatusUpdates();
                }
            });
        });
    }

    // Monitoring Dashboard
    async loadMonitoringData() {
        try {
            const monitoringData = await this.apiCall('/api/monitoring/status');
            this.updateMonitoringDisplay(monitoringData);
        } catch (error) {
            console.error('Failed to load monitoring data:', error);
            this.showToast('Failed to load monitoring data', 'error');
        }
    }

    updateMonitoringDisplay(data) {
        // Update system metrics
        if (data.system) {
            this.updateMetric('cpu', data.system.cpuUsage, '%');
            this.updateMetric('memory', data.system.memoryUsage, '%');
            
            // Calculate disk usage from storage data
            if (data.storage) {
                const totalDisk = Object.values(data.storage).reduce((acc, disk) => {
                    if (disk.usagePercent && disk.usagePercent < 100) {
                        return Math.max(acc, disk.usagePercent);
                    }
                    return acc;
                }, 0);
                this.updateMetric('disk', totalDisk, '%');
            }
        }

        // Update health status
        this.updateHealthStatus(data.status, data.issues || []);

        // Update alerts
        this.updateAlerts(data.notifications || []);

        // Update details
        this.updateSystemDetails(data);
    }

    updateMetric(metricId, value, unit) {
        const valueElement = document.getElementById(`${metricId}-usage`);
        const barElement = document.getElementById(`${metricId}-bar`);
        
        if (valueElement && barElement) {
            valueElement.textContent = value !== undefined ? `${Math.round(value)}${unit}` : '--';
            barElement.style.width = value !== undefined ? `${Math.min(value, 100)}%` : '0%';
            
            // Color coding for the bars
            if (value > 90) {
                barElement.style.background = 'rgb(239, 68, 68)'; // Red
            } else if (value > 70) {
                barElement.style.background = 'rgb(245, 158, 11)'; // Yellow  
            } else {
                barElement.style.background = 'rgb(34, 197, 94)'; // Green
            }
        }
    }

    updateHealthStatus(status, issues) {
        const indicator = document.getElementById('health-indicator');
        const text = document.getElementById('health-text');
        
        const statusConfig = {
            'healthy': { icon: '🟢', text: 'Healthy', color: 'rgb(34, 197, 94)' },
            'warning': { icon: '🟡', text: 'Warning', color: 'rgb(245, 158, 11)' },
            'critical': { icon: '🔴', text: 'Critical', color: 'rgb(239, 68, 68)' },
            'unknown': { icon: '⚪', text: 'Unknown', color: 'rgb(107, 114, 128)' }
        };
        
        const config = statusConfig[status] || statusConfig.unknown;
        
        if (indicator && text) {
            indicator.textContent = config.icon;
            text.textContent = issues.length > 0 ? `${config.text} (${issues.length} issues)` : config.text;
            text.style.color = config.color;
        }
    }

    updateAlerts(notifications) {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<div class="alert-item info"><span>No active alerts</span></div>';
            return;
        }

        // Show recent 10 alerts
        const recentAlerts = notifications.slice(-10).reverse();
        
        container.innerHTML = recentAlerts.map(alert => {
            const severity = this.getSeverityClass(alert.severity);
            const time = new Date(alert.timestamp).toLocaleTimeString();
            
            return `
                <div class="alert-item ${severity}">
                    <span>${alert.message}</span>
                    <span class="alert-time">${time}</span>
                </div>
            `;
        }).join('');
    }

    getSeverityClass(severity) {
        const mapping = {
            'critical': 'critical',
            'warning': 'warning',
            'info': 'info'
        };
        return mapping[severity] || 'info';
    }

    updateSystemDetails(data) {
        // Display status
        const displayElement = document.getElementById('display-status');
        if (displayElement && data.displays) {
            const displays = Object.values(data.displays);
            const onlineDisplays = displays.filter(d => d.online).length;
            displayElement.textContent = `${onlineDisplays}/${displays.length} displays online`;
        }

        // Network status
        const networkElement = document.getElementById('network-status');
        if (networkElement && data.network) {
            const connected = data.network.internetConnected ? 'Connected' : 'Disconnected';
            const interfaces = Object.keys(data.network).filter(k => k !== 'internetConnected').length;
            networkElement.textContent = `${connected} (${interfaces} interfaces)`;
        }

        // Uptime
        const uptimeElement = document.getElementById('uptime-status');
        if (uptimeElement && data.system) {
            const uptime = this.formatUptime(data.system.uptime);
            uptimeElement.textContent = uptime;
        }

        // Monitored apps
        const appsElement = document.getElementById('apps-status');
        if (appsElement && data.watchedApps) {
            appsElement.textContent = `${data.watchedApps.length} applications monitored`;
        }
    }

    formatUptime(seconds) {
        if (!seconds) return 'Unknown';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    startMonitoringUpdates() {
        // Clear existing interval
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        // Update every 5 seconds when monitoring tab is active
        this.monitoringInterval = setInterval(() => {
            const activeTab = document.querySelector('.tab-pane.active');
            if (activeTab && activeTab.id === 'monitoring-tab') {
                this.loadMonitoringData();
            } else {
                // Stop updates if not on monitoring tab
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }
        }, 5000);
    }
    
    // Service Control Management
    async loadServiceStatus() {
        try {
            const status = await this.apiCall('/api/service/status');
            this.updateServiceStatus(status);
        } catch (error) {
            console.error('Failed to load service status:', error);
            this.updateServiceStatus({
                status: 'offline',
                error: error.message
            });
        }
    }
    
    updateServiceStatus(status) {
        const statusIcon = document.getElementById('service-status-icon');
        const statusText = document.getElementById('service-status-text');
        const pidElement = document.getElementById('service-pid');
        const uptimeElement = document.getElementById('service-uptime');
        const modeElement = document.getElementById('service-mode');
        
        if (status.status === 'online') {
            statusIcon.textContent = '🟢';
            statusText.textContent = 'Running';
            statusText.style.color = 'rgb(34, 197, 94)';
            
            pidElement.textContent = status.pid || '--';
            uptimeElement.textContent = status.uptime ? this.formatUptime(status.uptime) : '--';
            modeElement.textContent = status.mode || 'Electron-managed';
            
            // Show stop/restart buttons, hide start button
            document.getElementById('stop-backend').style.display = 'inline-block';
            document.getElementById('restart-backend').style.display = 'inline-block';
            document.getElementById('start-backend').style.display = 'none';
        } else {
            statusIcon.textContent = '🔴';
            statusText.textContent = status.error ? `Error: ${status.error}` : 'Offline';
            statusText.style.color = 'rgb(239, 68, 68)';
            
            pidElement.textContent = '--';
            uptimeElement.textContent = '--';
            modeElement.textContent = 'Stopped';
            
            // Show start button, hide stop/restart buttons
            document.getElementById('stop-backend').style.display = 'none';
            document.getElementById('restart-backend').style.display = 'none';
            document.getElementById('start-backend').style.display = 'inline-block';
        }
    }
    
    async restartBackend() {
        if (!confirm('This will restart the backend server. Continue?')) {
            return;
        }
        
        this.showLoading();
        try {
            const result = await this.apiCall('/api/service/restart', {
                method: 'POST'
            });
            
            this.showToast('Backend restart initiated...', 'info');
            
            // Wait for server to restart and reload status
            setTimeout(() => {
                this.loadServiceStatus();
                this.hideLoading();
            }, 3000);
            
        } catch (error) {
            this.showToast(`Failed to restart backend: ${error.message}`, 'error');
            this.hideLoading();
        }
    }
    
    async stopBackend() {
        if (!confirm('This will stop the backend server. You may need to restart the application to reconnect. Continue?')) {
            return;
        }
        
        this.showLoading();
        try {
            await this.apiCall('/api/service/stop', {
                method: 'POST'
            });
            
            this.showToast('Backend stopped', 'info');
            
            // Update status immediately
            setTimeout(() => {
                this.loadServiceStatus();
                this.hideLoading();
            }, 1000);
            
        } catch (error) {
            // Expected if backend actually stops
            this.showToast('Backend stop command sent', 'info');
            setTimeout(() => {
                this.loadServiceStatus();
                this.hideLoading();
            }, 1000);
        }
    }
    
    async startBackend() {
        this.showLoading();
        try {
            const result = await this.apiCall('/api/service/start', {
                method: 'POST'
            });
            
            this.showToast('Backend start initiated...', 'info');
            
            // Wait for server to start and reload status
            setTimeout(() => {
                this.loadServiceStatus();
                this.hideLoading();
            }, 3000);
            
        } catch (error) {
            this.showToast(`Failed to start backend: ${error.message}`, 'error');
            this.hideLoading();
        }
    }
    
    async installService() {
        if (!confirm('This will install the backend as a system service that starts automatically on boot. Continue?')) {
            return;
        }
        
        this.showLoading();
        try {
            const result = await this.apiCall('/api/service/install', {
                method: 'POST'
            });
            
            this.displayResults('Service Installation', [result]);
            this.showToast('Service installation completed!', 'success');
            
            // Reload status to show new service mode
            setTimeout(() => {
                this.loadServiceStatus();
            }, 2000);
            
        } catch (error) {
            this.showToast(`Failed to install service: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async refreshServiceLogs() {
        try {
            const logs = await this.apiCall('/api/service/logs');
            this.updateServiceLogs(logs.logs || []);
        } catch (error) {
            console.error('Failed to load service logs:', error);
            this.updateServiceLogs([{
                timestamp: new Date().toISOString(),
                level: 'ERROR',
                message: `Failed to load logs: ${error.message}`
            }]);
        }
    }
    
    updateServiceLogs(logs) {
        const container = document.getElementById('service-logs');
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="log-entry"><span class="log-message">No logs available</span></div>';
            return;
        }
        
        // Show latest 50 logs
        const recentLogs = logs.slice(-50);
        
        container.innerHTML = recentLogs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            return `
                <div class="log-entry">
                    <span class="log-timestamp">[${timestamp}]</span>
                    <span class="log-level ${log.level}">${log.level}</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `;
        }).join('');
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    clearServiceLogs() {
        const container = document.getElementById('service-logs');
        container.innerHTML = '<div class="log-entry"><span class="log-message">Logs cleared</span></div>';
    }
    
    startServiceStatusUpdates() {
        // Clear existing interval
        if (this.serviceInterval) {
            clearInterval(this.serviceInterval);
        }
        
        // Update every 10 seconds when service control tab is active
        this.serviceInterval = setInterval(() => {
            const activeTab = document.querySelector('.tab-pane.active');
            if (activeTab && activeTab.id === 'service-control-tab') {
                this.loadServiceStatus();
                
                // Auto-refresh logs if enabled
                const autoRefresh = document.getElementById('auto-refresh-logs');
                if (autoRefresh && autoRefresh.checked) {
                    this.refreshServiceLogs();
                }
            } else {
                // Stop updates if not on service control tab
                clearInterval(this.serviceInterval);
                this.serviceInterval = null;
            }
        }, 10000);
    }
    
    // Loading State Management
    showInitialLoadingStates() {
        // Add loading indicators to empty sections
        document.getElementById('required-settings').innerHTML = this.createLoadingIndicator('Loading required settings...');
        document.getElementById('optional-settings').innerHTML = this.createLoadingIndicator('Loading optional settings...');
        document.getElementById('launch-agents-list').innerHTML = this.createLoadingIndicator('Loading launch agents...');
    }
    
    updateLoadingMessage(message) {
        // Update any existing loading indicators with new message
        const loadingElements = document.querySelectorAll('.loading-indicator .loading-text');
        loadingElements.forEach(element => {
            element.textContent = message;
        });
        
        // Also show in toast for Electron users
        if (this.isElectron) {
            console.log(`Loading: ${message}`);
        }
    }
    
    hideLoadingStates() {
        // Remove loading indicators (they'll be replaced by actual content)
        document.querySelectorAll('.loading-indicator').forEach(element => {
            element.remove();
        });
    }
    
    showServerOfflineState() {
        this.showToast('Backend server is not available - some features may be limited', 'error');
        
        // Show offline state in sections
        const offlineHtml = this.createOfflineIndicator();
        document.getElementById('required-settings').innerHTML = offlineHtml;
        document.getElementById('optional-settings').innerHTML = offlineHtml;
        document.getElementById('launch-agents-list').innerHTML = offlineHtml;
        
        // Update status indicator
        this.updateStatus('server-status', 'offline', 'Server Offline');
    }
    
    createLoadingIndicator(message = 'Loading...') {
        return `
            <div class="loading-indicator">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">${message}</div>
            </div>
        `;
    }
    
    createOfflineIndicator() {
        return `
            <div class="offline-indicator">
                <div class="offline-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="offline-content">
                    <h4>Backend Server Offline</h4>
                    <p>The backend server is not responding. Please check:</p>
                    <ul>
                        <li>Server is running on port 3001</li>
                        <li>No firewall blocking connections</li>
                        <li>Check console/logs for errors</li>
                    </ul>
                    ${this.isElectron ? '<p><strong>Electron users:</strong> Try restarting the application.</p>' : '<p><strong>Web users:</strong> Start the backend with <code>cd backend && npm start</code></p>'}
                </div>
            </div>
        `;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InstallationUp4evr();
});

// Add slideOut animation to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);