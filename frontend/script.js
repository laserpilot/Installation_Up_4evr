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

        // Configuration Management Actions
        document.getElementById('load-config').addEventListener('click', () => this.loadConfiguration());
        document.getElementById('save-config').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('reset-config').addEventListener('click', () => this.resetConfiguration());
        document.getElementById('apply-config').addEventListener('click', () => this.applyConfiguration());
        document.getElementById('generate-api-key').addEventListener('click', () => this.generateApiKey());

        // Notification Channel Actions
        document.getElementById('test-slack').addEventListener('click', () => this.testNotificationChannel('slack'));
        document.getElementById('test-discord').addEventListener('click', () => this.testNotificationChannel('discord'));
        document.getElementById('test-email').addEventListener('click', () => this.testNotificationChannel('email'));
        document.getElementById('test-all-channels').addEventListener('click', () => this.testAllChannels());
        document.getElementById('add-webhook').addEventListener('click', () => this.addWebhook());
        document.getElementById('load-notification-config').addEventListener('click', () => this.loadNotificationConfig());
        document.getElementById('save-notification-config').addEventListener('click', () => this.saveNotificationConfig());
        document.getElementById('reset-notification-config').addEventListener('click', () => this.resetNotificationConfig());
        document.getElementById('apply-notification-config').addEventListener('click', () => this.applyNotificationConfig());

        // Channel toggle events
        document.getElementById('slack-enabled').addEventListener('change', (e) => this.toggleChannel('slack', e.target.checked));
        document.getElementById('discord-enabled').addEventListener('change', (e) => this.toggleChannel('discord', e.target.checked));
        document.getElementById('webhook-enabled').addEventListener('change', (e) => this.toggleChannel('webhook', e.target.checked));
        document.getElementById('email-enabled').addEventListener('change', (e) => this.toggleChannel('email', e.target.checked));

        // Monitoring & Alerts Actions
        document.getElementById('test-warning-alert').addEventListener('click', () => this.testAlert('warning'));
        document.getElementById('test-critical-alert').addEventListener('click', () => this.testAlert('critical'));
        document.getElementById('test-recovery-alert').addEventListener('click', () => this.testAlert('recovery'));
        document.getElementById('simulate-high-load').addEventListener('click', () => this.simulateHighLoad());
        document.getElementById('add-app-monitor').addEventListener('click', () => this.addAppMonitor());
        document.getElementById('load-monitoring-config').addEventListener('click', () => this.loadMonitoringConfig());
        document.getElementById('save-monitoring-config').addEventListener('click', () => this.saveMonitoringConfig());
        document.getElementById('reset-monitoring-config').addEventListener('click', () => this.resetMonitoringConfig());
        document.getElementById('apply-monitoring-config').addEventListener('click', () => this.applyMonitoringConfig());

        // Maintenance & Scheduling Actions
        document.getElementById('reboot-now').addEventListener('click', () => this.rebootNow());
        document.getElementById('restart-apps-now').addEventListener('click', () => this.restartAppsNow());
        
        // System Status Refresh
        document.getElementById('refresh-system-status').addEventListener('click', () => this.refreshSystemStatus());
        
        // Launch Agent Filters
        this.setupLaunchAgentFilters();

        // Threshold slider sync events
        this.setupThresholdSliders();
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
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No launch agents found</p>';
            return;
        }

        // Store original data for filtering
        this.allAgents = agents;
        this.agentStatusList = statusList;
        
        // Categorize agents
        const categories = this.categorizeAgents(agents);
        
        // Apply current filter
        const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
        this.renderFilteredAgents(categories, activeFilter);
    }

    categorizeAgents(agents) {
        const categories = {
            user: [],
            apps: [],
            system: []
        };

        agents.forEach(agent => {
            const category = this.getAgentCategory(agent);
            categories[category].push(agent);
        });

        return categories;
    }

    getAgentCategory(agent) {
        const label = agent.label.toLowerCase();
        
        // User-created agents (usually custom labels or specific patterns)
        if (label.includes('installation') || 
            label.includes('custom') || 
            label.includes('user') ||
            !label.includes('.')) {
            return 'user';
        }
        
        // System agents (Apple and macOS services)
        if (label.startsWith('com.apple.') ||
            label.startsWith('com.googlecode.') ||
            label.includes('system') ||
            label.includes('daemon') ||
            label.includes('service') ||
            label.includes('helper') ||
            label.includes('update') ||
            label.includes('spotlight') ||
            label.includes('backup')) {
            return 'system';
        }
        
        // Application agents (third-party apps)
        return 'apps';
    }

    renderFilteredAgents(categories, filter = 'all') {
        const container = document.getElementById('launch-agents-list');
        let html = '';

        if (filter === 'all') {
            // Show all categories with collapsible sections
            html += this.renderAgentCategory('User Created', categories.user, 'user', false);
            html += this.renderAgentCategory('Applications', categories.apps, 'apps', false);
            html += this.renderAgentCategory('System Services', categories.system, 'system', true);
        } else {
            // Show only selected category
            const categoryData = categories[filter];
            if (categoryData && categoryData.length > 0) {
                html = categoryData.map(agent => this.renderAgentItem(agent)).join('');
            } else {
                html = '<p style="color: var(--text-secondary); text-align: center;">No agents found in this category</p>';
            }
        }

        container.innerHTML = html;
        
        // Add click handlers for collapsible sections
        this.setupCategoryToggle();
    }

    renderAgentCategory(title, agents, categoryType, collapsed = false) {
        if (agents.length === 0) return '';
        
        const collapsedClass = collapsed ? 'collapsed' : '';
        const agentsHtml = agents.map(agent => this.renderAgentItem(agent)).join('');
        
        return `
            <div class="agent-category ${collapsedClass}" data-category="${categoryType}">
                <h5>
                    <i class="fas fa-${this.getCategoryIcon(categoryType)}"></i>
                    ${title}
                    <span class="category-count">${agents.length}</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </h5>
                <div class="category-agents">
                    ${agentsHtml}
                </div>
            </div>
        `;
    }

    renderAgentItem(agent) {
        const status = this.agentStatusList.find(s => s.label === agent.label);
        const isRunning = status && status.pid !== null;
        const statusClass = isRunning ? 'running' : 'stopped';
        const statusText = isRunning ? `Running (PID: ${status.pid})` : 'Stopped';
        const statusIcon = isRunning ? 'fa-play' : 'fa-stop';
        const category = this.getAgentCategory(agent);

        return `
            <div class="agent-item" data-category="${category}" data-label="${agent.label.toLowerCase()}">
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
    }

    getCategoryIcon(category) {
        const icons = {
            user: 'user',
            apps: 'desktop',
            system: 'cogs'
        };
        return icons[category] || 'circle';
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
        
        // Hide all other tab panes and show results
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        section.classList.add('active');
        section.style.display = 'block';
        
        // Update sidebar button states
        document.querySelectorAll('.sidebar-button').forEach(btn => btn.classList.remove('active'));
        
        // Setup close button if not already done
        const closeBtn = document.getElementById('close-results');
        if (closeBtn && !closeBtn.hasAttribute('data-setup')) {
            closeBtn.setAttribute('data-setup', 'true');
            closeBtn.addEventListener('click', () => {
                this.closeResults();
            });
        }
    }

    closeResults() {
        // Hide results section
        const resultsSection = document.getElementById('results-section');
        resultsSection.classList.remove('active');
        resultsSection.style.display = 'none';
        
        // Return to system prefs tab (first tab)
        const systemPrefsTab = document.getElementById('system-prefs-tab');
        const systemPrefsBtn = document.querySelector('[data-tab="system-prefs"]');
        
        if (systemPrefsTab && systemPrefsBtn) {
            systemPrefsTab.classList.add('active');
            systemPrefsBtn.classList.add('active');
        }
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
        const sidebarButtons = document.querySelectorAll('.sidebar-button');
        const tabPanes = document.querySelectorAll('.tab-pane');

        sidebarButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and panes
                sidebarButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button and corresponding pane
                button.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
                
                // Load monitoring data if monitoring tab is selected
                if (targetTab === 'monitoring') {
                    this.loadMonitoringData();
                    this.startMonitoringUpdates();
                }
                
                // Load monitoring config and system status if monitoring-config tab is selected
                if (targetTab === 'monitoring-config') {
                    this.loadSystemStatus();
                    this.startSystemStatusUpdates();
                }
                
                // Load service status if service control tab is selected
                if (targetTab === 'service-control') {
                    this.loadServiceStatus();
                    this.refreshServiceLogs();
                    this.startServiceStatusUpdates();
                }
                
                // Load installation settings if installation settings tab is selected
                if (targetTab === 'installation-settings') {
                    this.loadInstallationSettings();
                    this.setupInstallationSettingsHandlers();
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
            if (data.network.summary) {
                const status = data.network.summary.status;
                const ip = data.network.summary.primaryIP;
                const interfaces = data.network.summary.totalInterfaces;
                networkElement.textContent = `${status} - ${ip} (${interfaces} interfaces)`;
            } else {
                // Fallback for older data format
                const connected = data.network.internetConnected ? 'Connected' : 'Disconnected';
                const interfaces = Object.keys(data.network).filter(k => k !== 'internetConnected' && k !== 'summary').length;
                networkElement.textContent = `${connected} (${interfaces} interfaces)`;
            }
        }

        // Uptime
        const uptimeElement = document.getElementById('uptime-status');
        if (uptimeElement && data.system) {
            const uptime = this.formatUptime(data.system.uptime);
            uptimeElement.textContent = uptime;
        }

        // Monitored apps with health scores
        const appsElement = document.getElementById('apps-status');
        if (appsElement && data.watchedApps) {
            this.updateAppsStatus(appsElement, data.watchedApps);
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

    async updateAppsStatus(element, watchedApps) {
        if (watchedApps.length === 0) {
            element.innerHTML = '<div class="no-apps">No applications being monitored</div>';
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/monitoring/app-health`);
            const healthScores = await response.json();
            
            let html = `<div class="apps-summary">${watchedApps.length} applications monitored</div>`;
            html += '<div class="apps-health-list">';
            
            watchedApps.forEach(appName => {
                const health = healthScores[appName] || { score: 0, status: 'unknown' };
                const statusClass = this.getHealthStatusClass(health.status);
                const scoreColor = this.getScoreColor(health.score);
                
                html += `
                    <div class="app-health-item">
                        <div class="app-name">${appName}</div>
                        <div class="app-health">
                            <span class="health-score" style="color: ${scoreColor}">${health.score}</span>
                            <span class="health-status ${statusClass}">${health.status}</span>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            element.innerHTML = html;
        } catch (error) {
            console.error('Failed to load app health scores:', error);
            element.innerHTML = `<div class="error">${watchedApps.length} applications monitored (health scores unavailable)</div>`;
        }
    }

    getHealthStatusClass(status) {
        const statusMap = {
            'excellent': 'status-excellent',
            'good': 'status-good', 
            'warning': 'status-warning',
            'critical': 'status-critical',
            'unknown': 'status-unknown'
        };
        return statusMap[status] || 'status-unknown';
    }

    getScoreColor(score) {
        if (score >= 85) return '#34C759'; // Green
        if (score >= 60) return '#FF9500'; // Orange
        if (score >= 30) return '#FF9500'; // Orange
        return '#FF3B30'; // Red
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

    startSystemStatusUpdates() {
        // Clear existing interval
        if (this.systemStatusInterval) {
            clearInterval(this.systemStatusInterval);
        }
        
        // Update every 10 seconds when monitoring-config tab is active
        this.systemStatusInterval = setInterval(() => {
            const activeTab = document.querySelector('.tab-pane.active');
            if (activeTab && activeTab.id === 'monitoring-config-tab') {
                this.loadSystemStatus();
            } else {
                // Stop updates if not on monitoring-config tab
                clearInterval(this.systemStatusInterval);
                this.systemStatusInterval = null;
            }
        }, 10000);
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

    // Configuration Management Methods
    async loadConfiguration() {
        try {
            const config = await this.apiCall('/api/config/get');
            this.populateConfigurationForm(config);
            this.showConfigStatus('Configuration loaded successfully', 'success');
        } catch (error) {
            this.showConfigStatus('Failed to load configuration: ' + error.message, 'error');
        }
    }

    async saveConfiguration() {
        try {
            const config = this.getConfigurationFromForm();
            
            if (this.isElectron) {
                // Use Electron's save dialog
                const filePath = await window.electronAPI.saveProfile(config);
                if (filePath) {
                    this.showConfigStatus(`Configuration saved to ${filePath}`, 'success');
                } else {
                    this.showConfigStatus('Save cancelled', 'warning');
                }
            } else {
                // Download as JSON file for web version
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `installation-config-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showConfigStatus('Configuration downloaded', 'success');
            }
        } catch (error) {
            this.showConfigStatus('Failed to save configuration: ' + error.message, 'error');
        }
    }

    async resetConfiguration() {
        if (confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
            try {
                const defaults = await this.apiCall('/api/config/defaults');
                this.populateConfigurationForm(defaults);
                this.showConfigStatus('Configuration reset to defaults', 'success');
            } catch (error) {
                this.showConfigStatus('Failed to reset configuration: ' + error.message, 'error');
            }
        }
    }

    async applyConfiguration() {
        try {
            const config = this.getConfigurationFromForm();
            await this.apiCall('/api/config/apply', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            this.showConfigStatus('Configuration applied successfully - restart may be required for some changes', 'success');
        } catch (error) {
            this.showConfigStatus('Failed to apply configuration: ' + error.message, 'error');
        }
    }

    generateApiKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('api-key').value = result;
        this.showConfigStatus('New API key generated', 'success');
    }

    getConfigurationFromForm() {
        return {
            global: {
                installationName: document.getElementById('installation-name').value,
                location: document.getElementById('installation-location').value,
                contactInfo: document.getElementById('contact-info').value,
                timezone: document.getElementById('timezone').value
            },
            monitoring: {
                interval: parseInt(document.getElementById('monitoring-interval').value),
                heartbeatInterval: parseInt(document.getElementById('heartbeat-interval').value),
                logRetention: parseInt(document.getElementById('log-retention').value),
                debugMode: document.getElementById('debug-mode').checked
            },
            alerts: {
                cpuThreshold: parseInt(document.getElementById('cpu-threshold').value),
                memoryThreshold: parseInt(document.getElementById('memory-threshold').value),
                diskThreshold: parseInt(document.getElementById('disk-threshold').value),
                temperatureThreshold: parseInt(document.getElementById('temperature-threshold').value)
            },
            recovery: {
                autoRestartApps: document.getElementById('auto-restart-apps').checked,
                restartDelay: parseInt(document.getElementById('restart-delay').value),
                maxRestartAttempts: parseInt(document.getElementById('max-restart-attempts').value),
                autoReboot: document.getElementById('auto-reboot').checked
            },
            security: {
                remoteAccess: document.getElementById('remote-access').checked,
                apiKey: document.getElementById('api-key').value,
                allowedIPs: document.getElementById('allowed-ips').value.split('\n').filter(ip => ip.trim()),
                encryptionEnabled: document.getElementById('encryption-enabled').checked
            }
        };
    }

    populateConfigurationForm(config) {
        // Global settings
        if (config.global) {
            document.getElementById('installation-name').value = config.global.installationName || '';
            document.getElementById('installation-location').value = config.global.location || '';
            document.getElementById('contact-info').value = config.global.contactInfo || '';
            document.getElementById('timezone').value = config.global.timezone || 'America/New_York';
        }

        // Monitoring settings
        if (config.monitoring) {
            document.getElementById('monitoring-interval').value = config.monitoring.interval || 30;
            document.getElementById('heartbeat-interval').value = config.monitoring.heartbeatInterval || 300;
            document.getElementById('log-retention').value = config.monitoring.logRetention || 30;
            document.getElementById('debug-mode').checked = config.monitoring.debugMode || false;
        }

        // Alert thresholds
        if (config.alerts) {
            document.getElementById('cpu-threshold').value = config.alerts.cpuThreshold || 80;
            document.getElementById('memory-threshold').value = config.alerts.memoryThreshold || 85;
            document.getElementById('disk-threshold').value = config.alerts.diskThreshold || 90;
            document.getElementById('temperature-threshold').value = config.alerts.temperatureThreshold || 75;
        }

        // Recovery settings
        if (config.recovery) {
            document.getElementById('auto-restart-apps').checked = config.recovery.autoRestartApps !== false;
            document.getElementById('restart-delay').value = config.recovery.restartDelay || 5;
            document.getElementById('max-restart-attempts').value = config.recovery.maxRestartAttempts || 3;
            document.getElementById('auto-reboot').checked = config.recovery.autoReboot || false;
        }

        // Security settings
        if (config.security) {
            document.getElementById('remote-access').checked = config.security.remoteAccess !== false;
            document.getElementById('api-key').value = config.security.apiKey || '';
            document.getElementById('allowed-ips').value = (config.security.allowedIPs || []).join('\n');
            document.getElementById('encryption-enabled').checked = config.security.encryptionEnabled || false;
        }
    }

    showConfigStatus(message, type = 'success') {
        const statusElement = document.getElementById('config-status');
        const textElement = document.getElementById('config-status-text');
        
        statusElement.className = `config-status ${type}`;
        textElement.textContent = message;
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    // Notification Channel Management Methods
    toggleChannel(channel, enabled) {
        const channelElement = document.querySelector(`[data-channel="${channel}"]`);
        if (channelElement) {
            channelElement.classList.toggle('enabled', enabled);
        }
    }

    async testNotificationChannel(channel) {
        const button = document.getElementById(`test-${channel}`);
        const resultElement = document.getElementById(`${channel}-test-result`);
        
        // Show loading state
        button.classList.add('loading');
        button.disabled = true;
        resultElement.className = 'test-result loading';
        resultElement.textContent = 'Testing connection...';
        
        try {
            const config = this.getNotificationChannelConfig(channel);
            const response = await this.apiCall(`/api/notifications/test/${channel}`, {
                method: 'POST',
                body: JSON.stringify(config)
            });
            
            resultElement.className = 'test-result success';
            resultElement.textContent = response.message || 'Test notification sent successfully!';
        } catch (error) {
            resultElement.className = 'test-result error';
            resultElement.textContent = 'Test failed: ' + error.message;
        } finally {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    async testAllChannels() {
        const button = document.getElementById('test-all-channels');
        button.classList.add('loading');
        button.disabled = true;
        
        try {
            const config = this.getNotificationConfiguration();
            const response = await this.apiCall('/api/notifications/test-all', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            
            this.showNotificationStatus('Test notifications sent to all enabled channels', 'success');
        } catch (error) {
            this.showNotificationStatus('Failed to send test notifications: ' + error.message, 'error');
        } finally {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    addWebhook() {
        const name = document.getElementById('webhook-name').value.trim();
        const url = document.getElementById('webhook-url').value.trim();
        const method = document.getElementById('webhook-method').value;
        const headers = document.getElementById('webhook-headers').value.trim();
        
        if (!name || !url) {
            this.showNotificationStatus('Please provide both name and URL for the webhook', 'error');
            return;
        }
        
        let parsedHeaders = {};
        if (headers) {
            try {
                parsedHeaders = JSON.parse(headers);
            } catch (error) {
                this.showNotificationStatus('Invalid JSON in headers field', 'error');
                return;
            }
        }
        
        const webhook = {
            id: Date.now().toString(),
            name,
            url,
            method,
            headers: parsedHeaders
        };
        
        this.addWebhookToList(webhook);
        
        // Clear form
        document.getElementById('webhook-name').value = '';
        document.getElementById('webhook-url').value = '';
        document.getElementById('webhook-headers').value = '';
        
        this.showNotificationStatus('Webhook added successfully', 'success');
    }

    addWebhookToList(webhook) {
        const list = document.getElementById('webhook-list');
        const item = document.createElement('div');
        item.className = 'webhook-item';
        item.dataset.webhookId = webhook.id;
        
        item.innerHTML = `
            <div class="webhook-item-info">
                <div class="webhook-item-name">${webhook.name}</div>
                <div class="webhook-item-url">${webhook.method} ${webhook.url}</div>
            </div>
            <div class="webhook-item-actions">
                <button class="btn btn-small btn-secondary" onclick="app.testWebhook('${webhook.id}')">
                    <i class="fas fa-paper-plane"></i> Test
                </button>
                <button class="btn btn-small btn-danger" onclick="app.removeWebhook('${webhook.id}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        
        list.appendChild(item);
    }

    async testWebhook(webhookId) {
        const webhookItem = document.querySelector(`[data-webhook-id="${webhookId}"]`);
        const webhook = this.getWebhookById(webhookId);
        
        if (!webhook) {
            this.showNotificationStatus('Webhook not found', 'error');
            return;
        }
        
        try {
            const response = await this.apiCall('/api/notifications/test/webhook', {
                method: 'POST',
                body: JSON.stringify({ webhook })
            });
            
            this.showNotificationStatus(`Webhook "${webhook.name}" test successful`, 'success');
        } catch (error) {
            this.showNotificationStatus(`Webhook "${webhook.name}" test failed: ${error.message}`, 'error');
        }
    }

    removeWebhook(webhookId) {
        const webhookItem = document.querySelector(`[data-webhook-id="${webhookId}"]`);
        if (webhookItem) {
            webhookItem.remove();
            this.showNotificationStatus('Webhook removed', 'success');
        }
    }

    getWebhookById(webhookId) {
        const webhookItem = document.querySelector(`[data-webhook-id="${webhookId}"]`);
        if (!webhookItem) return null;
        
        const name = webhookItem.querySelector('.webhook-item-name').textContent;
        const urlAndMethod = webhookItem.querySelector('.webhook-item-url').textContent;
        const [method, ...urlParts] = urlAndMethod.split(' ');
        const url = urlParts.join(' ');
        
        return { id: webhookId, name, url, method, headers: {} };
    }

    getNotificationChannelConfig(channel) {
        switch (channel) {
            case 'slack':
                return {
                    enabled: document.getElementById('slack-enabled').checked,
                    webhookUrl: document.getElementById('slack-webhook-url').value,
                    channel: document.getElementById('slack-channel').value,
                    username: document.getElementById('slack-username').value,
                    icon: document.getElementById('slack-icon').value
                };
            case 'discord':
                return {
                    enabled: document.getElementById('discord-enabled').checked,
                    webhookUrl: document.getElementById('discord-webhook-url').value,
                    username: document.getElementById('discord-username').value,
                    avatar: document.getElementById('discord-avatar').value,
                    useEmbeds: document.getElementById('discord-embed').checked
                };
            case 'email':
                return {
                    enabled: document.getElementById('email-enabled').checked,
                    smtp: {
                        server: document.getElementById('smtp-server').value,
                        port: parseInt(document.getElementById('smtp-port').value),
                        username: document.getElementById('smtp-username').value,
                        password: document.getElementById('smtp-password').value,
                        useTLS: document.getElementById('email-use-tls').checked
                    },
                    from: document.getElementById('email-from').value,
                    to: document.getElementById('email-to').value.split('\n').filter(email => email.trim())
                };
            default:
                return {};
        }
    }

    getNotificationConfiguration() {
        // Get all webhooks
        const webhooks = Array.from(document.querySelectorAll('.webhook-item')).map(item => {
            return this.getWebhookById(item.dataset.webhookId);
        });

        // Get alert levels
        const alertLevels = Array.from(document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        return {
            slack: this.getNotificationChannelConfig('slack'),
            discord: this.getNotificationChannelConfig('discord'),
            email: this.getNotificationChannelConfig('email'),
            webhooks: {
                enabled: document.getElementById('webhook-enabled').checked,
                urls: webhooks
            },
            settings: {
                alertLevels,
                rateLimit: parseInt(document.getElementById('rate-limit').value) || 5,
                quietHours: {
                    start: document.getElementById('quiet-start').value,
                    end: document.getElementById('quiet-end').value
                }
            }
        };
    }

    populateNotificationConfiguration(config) {
        // Slack
        if (config.slack) {
            document.getElementById('slack-enabled').checked = config.slack.enabled || false;
            document.getElementById('slack-webhook-url').value = config.slack.webhookUrl || '';
            document.getElementById('slack-channel').value = config.slack.channel || '#alerts';
            document.getElementById('slack-username').value = config.slack.username || 'Installation Up 4evr';
            document.getElementById('slack-icon').value = config.slack.icon || ':computer:';
            this.toggleChannel('slack', config.slack.enabled);
        }

        // Discord
        if (config.discord) {
            document.getElementById('discord-enabled').checked = config.discord.enabled || false;
            document.getElementById('discord-webhook-url').value = config.discord.webhookUrl || '';
            document.getElementById('discord-username').value = config.discord.username || 'Installation Up 4evr';
            document.getElementById('discord-avatar').value = config.discord.avatar || '';
            document.getElementById('discord-embed').checked = config.discord.useEmbeds !== false;
            this.toggleChannel('discord', config.discord.enabled);
        }

        // Email
        if (config.email) {
            document.getElementById('email-enabled').checked = config.email.enabled || false;
            if (config.email.smtp) {
                document.getElementById('smtp-server').value = config.email.smtp.server || '';
                document.getElementById('smtp-port').value = config.email.smtp.port || 587;
                document.getElementById('smtp-username').value = config.email.smtp.username || '';
                document.getElementById('smtp-password').value = config.email.smtp.password || '';
                document.getElementById('email-use-tls').checked = config.email.smtp.useTLS !== false;
            }
            document.getElementById('email-from').value = config.email.from || '';
            document.getElementById('email-to').value = (config.email.to || []).join('\n');
            this.toggleChannel('email', config.email.enabled);
        }

        // Webhooks
        if (config.webhooks) {
            document.getElementById('webhook-enabled').checked = config.webhooks.enabled || false;
            this.toggleChannel('webhook', config.webhooks.enabled);
            
            // Clear existing webhooks
            document.getElementById('webhook-list').innerHTML = '';
            
            // Add webhooks
            if (config.webhooks.urls) {
                config.webhooks.urls.forEach(webhook => {
                    this.addWebhookToList(webhook);
                });
            }
        }

        // Settings
        if (config.settings) {
            // Alert levels
            document.querySelectorAll('.checkbox-group input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = config.settings.alertLevels?.includes(checkbox.value) !== false;
            });
            
            document.getElementById('rate-limit').value = config.settings.rateLimit || 5;
            
            if (config.settings.quietHours) {
                document.getElementById('quiet-start').value = config.settings.quietHours.start || '22:00';
                document.getElementById('quiet-end').value = config.settings.quietHours.end || '08:00';
            }
        }
    }

    async loadNotificationConfig() {
        try {
            const config = await this.apiCall('/api/notifications/config');
            this.populateNotificationConfiguration(config);
            this.showNotificationStatus('Notification configuration loaded successfully', 'success');
        } catch (error) {
            this.showNotificationStatus('Failed to load notification configuration: ' + error.message, 'error');
        }
    }

    async saveNotificationConfig() {
        try {
            const config = this.getNotificationConfiguration();
            
            if (this.isElectron) {
                const filePath = await window.electronAPI.saveProfile(config);
                if (filePath) {
                    this.showNotificationStatus(`Notification configuration saved to ${filePath}`, 'success');
                } else {
                    this.showNotificationStatus('Save cancelled', 'warning');
                }
            } else {
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `notification-config-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showNotificationStatus('Notification configuration downloaded', 'success');
            }
        } catch (error) {
            this.showNotificationStatus('Failed to save notification configuration: ' + error.message, 'error');
        }
    }

    async resetNotificationConfig() {
        if (confirm('Are you sure you want to reset all notification settings to defaults? This cannot be undone.')) {
            try {
                const defaults = await this.apiCall('/api/notifications/defaults');
                this.populateNotificationConfiguration(defaults);
                this.showNotificationStatus('Notification configuration reset to defaults', 'success');
            } catch (error) {
                this.showNotificationStatus('Failed to reset notification configuration: ' + error.message, 'error');
            }
        }
    }

    async applyNotificationConfig() {
        try {
            const config = this.getNotificationConfiguration();
            await this.apiCall('/api/notifications/config', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            this.showNotificationStatus('Notification configuration applied successfully', 'success');
        } catch (error) {
            this.showNotificationStatus('Failed to apply notification configuration: ' + error.message, 'error');
        }
    }

    showNotificationStatus(message, type = 'success') {
        const statusElement = document.getElementById('notification-status');
        const textElement = document.getElementById('notification-status-text');
        
        statusElement.className = `config-status ${type}`;
        textElement.textContent = message;
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    // Monitoring & Alerts Management Methods
    setupThresholdSliders() {
        const metrics = ['cpu', 'memory', 'disk', 'temperature'];
        const levels = ['warning', 'critical'];
        
        metrics.forEach(metric => {
            levels.forEach(level => {
                const slider = document.getElementById(`${metric}-${level}-slider`);
                const input = document.getElementById(`${metric}-${level}-input`);
                
                if (slider && input) {
                    slider.addEventListener('input', (e) => {
                        input.value = e.target.value;
                        this.updateThresholdVisuals(metric, level, e.target.value);
                    });
                    
                    input.addEventListener('input', (e) => {
                        slider.value = e.target.value;
                        this.updateThresholdVisuals(metric, level, e.target.value);
                    });
                }
            });
        });
    }

    updateThresholdVisuals(metric, level, value) {
        // Update the current status card if it exceeds the threshold
        const currentValueElement = document.getElementById(`current-${metric}`);
        const statusCard = document.getElementById(`${metric}-status-card`);
        
        if (currentValueElement && statusCard) {
            const currentValue = parseFloat(currentValueElement.textContent) || 0;
            const threshold = parseFloat(value);
            
            if (currentValue > threshold) {
                statusCard.classList.add(level);
            } else {
                statusCard.classList.remove(level);
            }
        }
    }

    async loadSystemStatus() {
        try {
            const status = await this.apiCall('/api/monitoring/status');
            this.updateSystemStatus(status);
        } catch (error) {
            console.log('Failed to load system status:', error.message);
            // Set loading state
            ['cpu', 'memory', 'disk', 'temperature'].forEach(metric => {
                const element = document.getElementById(`current-${metric}`);
                if (element) element.textContent = '--';
            });
        }
    }

    updateSystemStatus(status) {
        // Extract data from the monitoring status response
        const systemData = status.system || {};
        const storageData = status.storage || {};
        const temperatureData = status.temperature || {};
        
        // CPU usage
        if (systemData.cpuUsage !== undefined) {
            document.getElementById('current-cpu').textContent = `${systemData.cpuUsage.toFixed(1)}%`;
            this.updateStatusCard('cpu', systemData.cpuUsage, this.getThresholds('cpu'));
        }
        
        // Memory usage
        if (systemData.memoryUsage !== undefined) {
            document.getElementById('current-memory').textContent = `${systemData.memoryUsage.toFixed(1)}%`;
            this.updateStatusCard('memory', systemData.memoryUsage, this.getThresholds('memory'));
        }
        
        // Disk usage - get from main disk or first volume
        let diskUsage = null;
        if (storageData.mainDisk && storageData.mainDisk.usagePercent !== undefined) {
            diskUsage = storageData.mainDisk.usagePercent;
        } else if (storageData.volumes) {
            const volumes = Object.values(storageData.volumes);
            if (volumes.length > 0) {
                diskUsage = volumes[0].usagePercent;
            }
        }
        
        if (diskUsage !== null) {
            document.getElementById('current-disk').textContent = `${diskUsage.toFixed(1)}%`;
            this.updateStatusCard('disk', diskUsage, this.getThresholds('disk'));
        }
        
        // Temperature - handle different possible data structures
        let temperature = null;
        if (typeof temperatureData === 'number') {
            temperature = temperatureData;
        } else if (temperatureData.celsius !== undefined) {
            temperature = temperatureData.celsius;
        } else if (temperatureData.cpu !== undefined) {
            temperature = temperatureData.cpu;
        }
        
        if (temperature !== null && temperature > 0) {
            document.getElementById('current-temperature').textContent = `${temperature.toFixed(1)}°C`;
            this.updateStatusCard('temperature', temperature, this.getThresholds('temperature'));
        } else {
            // Temperature not available
            document.getElementById('current-temperature').textContent = 'N/A';
            this.updateStatusCard('temperature', null, this.getThresholds('temperature'));
        }
    }

    getThresholds(metric) {
        const warning = parseFloat(document.getElementById(`${metric}-warning-input`).value) || 75;
        const critical = parseFloat(document.getElementById(`${metric}-critical-input`).value) || 90;
        return { warning, critical };
    }

    updateStatusCard(metric, value, thresholds) {
        const card = document.getElementById(`${metric}-status-card`);
        const indicator = document.getElementById(`${metric}-indicator`);
        
        if (!card || !indicator) return;
        
        // Remove existing status classes
        card.classList.remove('normal', 'warning', 'critical');
        
        // Handle null/undefined values (like temperature N/A)
        if (value === null || value === undefined) {
            card.classList.add('normal');
            indicator.textContent = '⚪';
            return;
        }
        
        // Apply appropriate status
        if (value >= thresholds.critical) {
            card.classList.add('critical');
            indicator.textContent = '🔴';
        } else if (value >= thresholds.warning) {
            card.classList.add('warning');
            indicator.textContent = '🟡';
        } else {
            card.classList.add('normal');
            indicator.textContent = '🟢';
        }
    }

    async testAlert(type) {
        const button = document.getElementById(`test-${type}-alert`);
        const resultElement = document.getElementById('alert-test-result');
        
        button.classList.add('loading');
        button.disabled = true;
        resultElement.className = 'test-result loading';
        resultElement.textContent = `Sending ${type} test alert...`;
        
        try {
            const response = await this.apiCall(`/api/monitoring/test-alert/${type}`, {
                method: 'POST'
            });
            
            resultElement.className = 'test-result success';
            resultElement.textContent = response.message || `${type} alert sent successfully!`;
        } catch (error) {
            resultElement.className = 'test-result error';
            resultElement.textContent = `Failed to send ${type} alert: ${error.message}`;
        } finally {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    async simulateHighLoad() {
        const button = document.getElementById('simulate-high-load');
        const resultElement = document.getElementById('alert-test-result');
        
        button.classList.add('loading');
        button.disabled = true;
        resultElement.className = 'test-result loading';
        resultElement.textContent = 'Simulating high system load...';
        
        try {
            const response = await this.apiCall('/api/monitoring/simulate-load', {
                method: 'POST'
            });
            
            resultElement.className = 'test-result success';
            resultElement.textContent = response.message || 'Load simulation started - watch the metrics!';
            
            // Start updating status more frequently during simulation
            this.startLoadSimulationMonitoring();
        } catch (error) {
            resultElement.className = 'test-result error';
            resultElement.textContent = `Failed to simulate load: ${error.message}`;
        } finally {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    startLoadSimulationMonitoring() {
        // Update status every 2 seconds during simulation
        const interval = setInterval(() => {
            this.loadSystemStatus();
        }, 2000);
        
        // Stop after 30 seconds
        setTimeout(() => {
            clearInterval(interval);
        }, 30000);
    }

    addAppMonitor() {
        const name = document.getElementById('app-monitor-name').value.trim();
        const process = document.getElementById('app-monitor-process').value.trim();
        const critical = document.getElementById('app-monitor-critical').checked;
        const restart = document.getElementById('app-monitor-restart').checked;
        
        if (!name || !process) {
            this.showMonitoringStatus('Please provide both application name and process name', 'error');
            return;
        }
        
        const monitor = {
            id: Date.now().toString(),
            name,
            process,
            critical,
            restart
        };
        
        this.addAppMonitorToList(monitor);
        
        // Clear form
        document.getElementById('app-monitor-name').value = '';
        document.getElementById('app-monitor-process').value = '';
        document.getElementById('app-monitor-critical').checked = false;
        document.getElementById('app-monitor-restart').checked = true;
        
        this.showMonitoringStatus('Application monitor added successfully', 'success');
    }

    addAppMonitorToList(monitor) {
        const list = document.getElementById('app-monitor-list');
        const item = document.createElement('div');
        item.className = 'app-monitor-item';
        item.dataset.monitorId = monitor.id;
        
        const badges = [];
        if (monitor.critical) badges.push('<span class="app-monitor-badge critical">Critical</span>');
        if (monitor.restart) badges.push('<span class="app-monitor-badge restart">Auto-Restart</span>');
        
        item.innerHTML = `
            <div class="app-monitor-info">
                <div class="app-monitor-name">${monitor.name}</div>
                <div class="app-monitor-process">${monitor.process}</div>
                <div class="app-monitor-badges">${badges.join('')}</div>
            </div>
            <div class="app-monitor-actions">
                <button class="btn btn-small btn-secondary" onclick="app.testAppMonitor('${monitor.id}')">
                    <i class="fas fa-play"></i> Test
                </button>
                <button class="btn btn-small btn-danger" onclick="app.removeAppMonitor('${monitor.id}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        
        list.appendChild(item);
    }

    async testAppMonitor(monitorId) {
        const monitor = this.getAppMonitorById(monitorId);
        if (!monitor) {
            this.showMonitoringStatus('App monitor not found', 'error');
            return;
        }
        
        try {
            const response = await this.apiCall('/api/monitoring/test-app', {
                method: 'POST',
                body: JSON.stringify({ monitor })
            });
            
            this.showMonitoringStatus(`App monitor "${monitor.name}" test successful`, 'success');
        } catch (error) {
            this.showMonitoringStatus(`App monitor "${monitor.name}" test failed: ${error.message}`, 'error');
        }
    }

    removeAppMonitor(monitorId) {
        const item = document.querySelector(`[data-monitor-id="${monitorId}"]`);
        if (item) {
            item.remove();
            this.showMonitoringStatus('App monitor removed', 'success');
        }
    }

    getAppMonitorById(monitorId) {
        const item = document.querySelector(`[data-monitor-id="${monitorId}"]`);
        if (!item) return null;
        
        const name = item.querySelector('.app-monitor-name').textContent;
        const process = item.querySelector('.app-monitor-process').textContent;
        const critical = item.querySelector('.app-monitor-badge.critical') !== null;
        const restart = item.querySelector('.app-monitor-badge.restart') !== null;
        
        return { id: monitorId, name, process, critical, restart };
    }

    getMonitoringConfiguration() {
        // Get all app monitors
        const appMonitors = Array.from(document.querySelectorAll('.app-monitor-item')).map(item => {
            return this.getAppMonitorById(item.dataset.monitorId);
        });

        return {
            thresholds: {
                cpu: {
                    warning: parseInt(document.getElementById('cpu-warning-input').value),
                    critical: parseInt(document.getElementById('cpu-critical-input').value)
                },
                memory: {
                    warning: parseInt(document.getElementById('memory-warning-input').value),
                    critical: parseInt(document.getElementById('memory-critical-input').value)
                },
                disk: {
                    warning: parseInt(document.getElementById('disk-warning-input').value),
                    critical: parseInt(document.getElementById('disk-critical-input').value)
                },
                temperature: {
                    warning: parseInt(document.getElementById('temperature-warning-input').value),
                    critical: parseInt(document.getElementById('temperature-critical-input').value)
                }
            },
            behavior: {
                checkInterval: parseInt(document.getElementById('monitoring-interval-config').value),
                alertCooldown: parseInt(document.getElementById('alert-cooldown').value),
                escalationTime: parseInt(document.getElementById('escalation-time').value),
                autoRecovery: document.getElementById('auto-recovery-check').checked
            },
            appMonitors
        };
    }

    populateMonitoringConfiguration(config) {
        // Thresholds
        if (config.thresholds) {
            Object.keys(config.thresholds).forEach(metric => {
                const thresholds = config.thresholds[metric];
                if (thresholds.warning !== undefined) {
                    document.getElementById(`${metric}-warning-slider`).value = thresholds.warning;
                    document.getElementById(`${metric}-warning-input`).value = thresholds.warning;
                }
                if (thresholds.critical !== undefined) {
                    document.getElementById(`${metric}-critical-slider`).value = thresholds.critical;
                    document.getElementById(`${metric}-critical-input`).value = thresholds.critical;
                }
            });
        }

        // Behavior
        if (config.behavior) {
            document.getElementById('monitoring-interval-config').value = config.behavior.checkInterval || 30;
            document.getElementById('alert-cooldown').value = config.behavior.alertCooldown || 5;
            document.getElementById('escalation-time').value = config.behavior.escalationTime || 15;
            document.getElementById('auto-recovery-check').checked = config.behavior.autoRecovery !== false;
        }

        // App monitors
        if (config.appMonitors) {
            // Clear existing monitors
            document.getElementById('app-monitor-list').innerHTML = '';
            
            // Add monitors
            config.appMonitors.forEach(monitor => {
                this.addAppMonitorToList(monitor);
            });
        }
    }

    async loadMonitoringConfig() {
        try {
            const config = await this.apiCall('/api/monitoring/config');
            this.populateMonitoringConfiguration(config);
            this.showMonitoringStatus('Monitoring configuration loaded successfully', 'success');
        } catch (error) {
            this.showMonitoringStatus('Failed to load monitoring configuration: ' + error.message, 'error');
        }
    }

    async saveMonitoringConfig() {
        try {
            const config = this.getMonitoringConfiguration();
            
            if (this.isElectron) {
                const filePath = await window.electronAPI.saveProfile(config);
                if (filePath) {
                    this.showMonitoringStatus(`Monitoring configuration saved to ${filePath}`, 'success');
                } else {
                    this.showMonitoringStatus('Save cancelled', 'warning');
                }
            } else {
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `monitoring-config-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showMonitoringStatus('Monitoring configuration downloaded', 'success');
            }
        } catch (error) {
            this.showMonitoringStatus('Failed to save monitoring configuration: ' + error.message, 'error');
        }
    }

    async resetMonitoringConfig() {
        if (confirm('Are you sure you want to reset all monitoring settings to defaults? This cannot be undone.')) {
            try {
                const defaults = await this.apiCall('/api/monitoring/defaults');
                this.populateMonitoringConfiguration(defaults);
                this.showMonitoringStatus('Monitoring configuration reset to defaults', 'success');
            } catch (error) {
                this.showMonitoringStatus('Failed to reset monitoring configuration: ' + error.message, 'error');
            }
        }
    }

    async applyMonitoringConfig() {
        try {
            const config = this.getMonitoringConfiguration();
            await this.apiCall('/api/monitoring/config', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            this.showMonitoringStatus('Monitoring configuration applied successfully', 'success');
        } catch (error) {
            this.showMonitoringStatus('Failed to apply monitoring configuration: ' + error.message, 'error');
        }
    }

    showMonitoringStatus(message, type = 'success') {
        const statusElement = document.getElementById('monitoring-status');
        const textElement = document.getElementById('monitoring-status-text');
        
        statusElement.className = `config-status ${type}`;
        textElement.textContent = message;
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    // Installation Settings Management
    async loadInstallationSettings() {
        try {
            const response = await this.apiCall('/api/installation/settings');
            if (response.success) {
                this.populateInstallationSettings(response.settings);
            }
        } catch (error) {
            console.error('Failed to load installation settings:', error);
            this.showToast('Failed to load installation settings', 'error');
        }
    }

    populateInstallationSettings(settings = {}) {
        // Camera settings
        this.setSettingValue('camera-threshold-slider', settings.cameraThreshold || 25);
        this.setSettingValue('camera-threshold-input', settings.cameraThreshold || 25);
        this.setSettingValue('camera-timeout', settings.cameraTimeout || 30);
        this.setSettingValue('camera-fps', settings.cameraFps || 30);

        // Capacitive sensing settings
        this.setSettingValue('capacitive-threshold-slider', settings.capacitiveThreshold || 50);
        this.setSettingValue('capacitive-threshold-input', settings.capacitiveThreshold || 50);
        this.setSettingValue('capacitive-debounce', settings.capacitiveDebounce || 100);

        // Audio settings
        this.setSettingValue('audio-threshold-slider', settings.audioThreshold || 40);
        this.setSettingValue('audio-threshold-input', settings.audioThreshold || 40);
        this.setSettingValue('audio-sample-rate', settings.audioSampleRate || 44100);

        // Set active capacitive pins
        if (settings.capacitivePins) {
            document.querySelectorAll('#capacitive-pins input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = settings.capacitivePins.includes(parseInt(checkbox.value));
            });
        }

        // Load custom parameters
        this.loadCustomParameters(settings.customParams || []);
    }

    setSettingValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        }
    }

    setupInstallationSettingsHandlers() {
        // Sync slider and input pairs
        this.setupSliderSync('camera-threshold');
        this.setupSliderSync('capacitive-threshold');  
        this.setupSliderSync('audio-threshold');

        // Custom parameters
        document.getElementById('add-custom-param')?.addEventListener('click', () => {
            this.addCustomParameter();
        });

        // Profile management
        document.getElementById('load-profile')?.addEventListener('click', () => {
            this.loadInstallationProfile();
        });

        document.getElementById('save-profile')?.addEventListener('click', () => {
            this.saveInstallationProfile();
        });

        document.getElementById('export-profile')?.addEventListener('click', () => {
            this.exportInstallationProfile();
        });

        document.getElementById('import-profile-btn')?.addEventListener('click', () => {
            document.getElementById('import-profile').click();
        });

        document.getElementById('import-profile')?.addEventListener('change', (e) => {
            this.importInstallationProfile(e);
        });

        // Action buttons
        document.getElementById('test-installation-settings')?.addEventListener('click', () => {
            this.testInstallationSettings();
        });

        document.getElementById('reset-installation-settings')?.addEventListener('click', () => {
            this.resetInstallationSettings();
        });

        document.getElementById('apply-installation-settings')?.addEventListener('click', () => {
            this.applyInstallationSettings();
        });
    }

    setupSliderSync(baseName) {
        const slider = document.getElementById(`${baseName}-slider`);
        const input = document.getElementById(`${baseName}-input`);

        if (slider && input) {
            slider.addEventListener('input', () => {
                input.value = slider.value;
            });

            input.addEventListener('input', () => {
                slider.value = input.value;
            });
        }
    }

    loadCustomParameters(params = []) {
        const container = document.getElementById('custom-params-list');
        if (!container) return;

        container.innerHTML = '';
        params.forEach(param => {
            this.addCustomParameterItem(param.name, param.value, param.type);
        });
    }

    addCustomParameter() {
        this.addCustomParameterItem('', '', 'string');
    }

    addCustomParameterItem(name = '', value = '', type = 'string') {
        const container = document.getElementById('custom-params-list');
        if (!container) return;

        const paramDiv = document.createElement('div');
        paramDiv.className = 'custom-param-item';
        
        paramDiv.innerHTML = `
            <input type="text" placeholder="Parameter name..." value="${name}" class="param-name">
            <select class="param-type">
                <option value="string" ${type === 'string' ? 'selected' : ''}>String</option>
                <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
                <option value="boolean" ${type === 'boolean' ? 'selected' : ''}>Boolean</option>
            </select>
            <input type="text" placeholder="Value..." value="${value}" class="param-value">
            <button type="button" class="custom-param-remove">Remove</button>
        `;

        paramDiv.querySelector('.custom-param-remove').addEventListener('click', () => {
            paramDiv.remove();
        });

        container.appendChild(paramDiv);
    }

    getInstallationSettings() {
        const settings = {
            cameraThreshold: parseInt(document.getElementById('camera-threshold-input')?.value || 25),
            cameraTimeout: parseInt(document.getElementById('camera-timeout')?.value || 30),
            cameraFps: parseInt(document.getElementById('camera-fps')?.value || 30),
            capacitiveThreshold: parseInt(document.getElementById('capacitive-threshold-input')?.value || 50),
            capacitiveDebounce: parseInt(document.getElementById('capacitive-debounce')?.value || 100),
            audioThreshold: parseInt(document.getElementById('audio-threshold-input')?.value || 40),
            audioSampleRate: parseInt(document.getElementById('audio-sample-rate')?.value || 44100),
            capacitivePins: [],
            customParams: []
        };

        // Get active capacitive pins
        document.querySelectorAll('#capacitive-pins input[type="checkbox"]:checked').forEach(checkbox => {
            settings.capacitivePins.push(parseInt(checkbox.value));
        });

        // Get custom parameters
        document.querySelectorAll('.custom-param-item').forEach(item => {
            const name = item.querySelector('.param-name').value.trim();
            const type = item.querySelector('.param-type').value;
            const value = item.querySelector('.param-value').value.trim();
            
            if (name && value) {
                settings.customParams.push({ name, type, value });
            }
        });

        return settings;
    }

    async loadInstallationProfile() {
        const profileSelect = document.getElementById('installation-profile');
        const profileName = profileSelect?.value;
        
        if (!profileName) {
            this.showToast('Please select a profile to load', 'warning');
            return;
        }

        try {
            const response = await this.apiCall(`/api/installation/profiles/${profileName}`);
            if (response.success) {
                this.populateInstallationSettings(response.profile);
                this.showToast(`Profile "${profileName}" loaded successfully`, 'success');
            }
        } catch (error) {
            this.showToast(`Failed to load profile: ${error.message}`, 'error');
        }
    }

    async saveInstallationProfile() {
        const profileNameInput = document.getElementById('profile-name');
        const profileName = profileNameInput?.value.trim();
        
        if (!profileName) {
            this.showToast('Please enter a profile name', 'warning');
            return;
        }

        try {
            const settings = this.getInstallationSettings();
            const response = await this.apiCall('/api/installation/profiles', {
                method: 'POST',
                body: JSON.stringify({
                    name: profileName,
                    settings: settings
                })
            });

            if (response.success) {
                this.showToast(`Profile "${profileName}" saved successfully`, 'success');
                profileNameInput.value = '';
            }
        } catch (error) {
            this.showToast(`Failed to save profile: ${error.message}`, 'error');
        }
    }

    exportInstallationProfile() {
        const settings = this.getInstallationSettings();
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'installation-settings.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Profile exported successfully', 'success');
    }

    importInstallationProfile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                this.populateInstallationSettings(settings);
                this.showToast('Profile imported successfully', 'success');
            } catch (error) {
                this.showToast('Failed to import profile: Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    }

    async testInstallationSettings() {
        try {
            const settings = this.getInstallationSettings();
            const response = await this.apiCall('/api/installation/test', {
                method: 'POST',
                body: JSON.stringify(settings)
            });

            if (response.success) {
                this.showToast('Installation settings test completed successfully', 'success');
                this.showResultsSection(response.testResults);
            }
        } catch (error) {
            this.showToast(`Test failed: ${error.message}`, 'error');
        }
    }

    resetInstallationSettings() {
        if (confirm('Are you sure you want to reset all installation settings to defaults?')) {
            this.populateInstallationSettings({});
            this.showToast('Installation settings reset to defaults', 'info');
        }
    }

    async applyInstallationSettings() {
        try {
            const settings = this.getInstallationSettings();
            const response = await this.apiCall('/api/installation/settings', {
                method: 'POST',
                body: JSON.stringify(settings)
            });

            if (response.success) {
                this.showToast('Installation settings applied successfully', 'success');
            }
        } catch (error) {
            this.showToast(`Failed to apply settings: ${error.message}`, 'error');
        }
    }

    async rebootNow() {
        const confirmed = confirm(
            'Are you sure you want to reboot the system now?\n\n' +
            'This will shut down all applications and restart the computer.'
        );
        
        if (!confirmed) return;

        try {
            this.showToast('Initiating system reboot...', 'warning');
            
            const response = await this.apiCall('/api/remote-control/command', {
                method: 'POST',
                body: JSON.stringify({
                    command: 'reboot',
                    parameters: { delay: 5 }
                })
            });

            if (response.success) {
                this.showToast('System will reboot in 5 seconds', 'info');
            }
        } catch (error) {
            this.showToast(`Failed to reboot system: ${error.message}`, 'error');
        }
    }

    async restartAppsNow() {
        const confirmed = confirm(
            'Are you sure you want to restart all monitored applications?\n\n' +
            'This will close and reopen all watched applications.'
        );
        
        if (!confirmed) return;

        try {
            this.showToast('Restarting all monitored applications...', 'info');
            
            const response = await this.apiCall('/api/remote-control/command', {
                method: 'POST',
                body: JSON.stringify({
                    command: 'restart-applications',
                    parameters: {}
                })
            });

            if (response.success) {
                this.showToast('All monitored applications are being restarted', 'success');
            }
        } catch (error) {
            this.showToast(`Failed to restart applications: ${error.message}`, 'error');
        }
    }

    async refreshSystemStatus() {
        const button = document.getElementById('refresh-system-status');
        const icon = button.querySelector('i');
        
        // Show loading state
        button.disabled = true;
        icon.classList.add('fa-spin');
        
        try {
            await this.loadSystemStatus();
            this.showToast('System status refreshed', 'success');
        } catch (error) {
            this.showToast(`Failed to refresh status: ${error.message}`, 'error');
        } finally {
            // Restore button state
            button.disabled = false;
            icon.classList.remove('fa-spin');
        }
    }

    setupLaunchAgentFilters() {
        // Filter button handlers
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Update active state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                
                // Apply filter
                const filter = e.target.dataset.filter;
                this.filterAgents(filter);
            });
        });

        // Search input handler
        const searchInput = document.getElementById('agent-search');
        searchInput.addEventListener('input', (e) => {
            this.searchAgents(e.target.value);
        });
    }

    filterAgents(filter) {
        if (!this.allAgents) return;
        
        const categories = this.categorizeAgents(this.allAgents);
        this.renderFilteredAgents(categories, filter);
        
        // Clear search when switching filters
        const searchInput = document.getElementById('agent-search');
        if (searchInput) {
            searchInput.value = '';
        }
    }

    searchAgents(searchTerm) {
        const container = document.getElementById('launch-agents-list');
        const agentItems = container.querySelectorAll('.agent-item');
        
        if (!searchTerm.trim()) {
            // Show all agents
            agentItems.forEach(item => {
                item.style.display = 'flex';
            });
            
            // Show all categories
            const categories = container.querySelectorAll('.agent-category');
            categories.forEach(category => {
                category.style.display = 'block';
            });
            return;
        }
        
        const term = searchTerm.toLowerCase();
        let visibleCategories = new Set();
        
        agentItems.forEach(item => {
            const label = item.dataset.label;
            const isMatch = label.includes(term);
            
            item.style.display = isMatch ? 'flex' : 'none';
            
            if (isMatch) {
                visibleCategories.add(item.dataset.category);
            }
        });
        
        // Show/hide categories based on search results
        const categories = container.querySelectorAll('.agent-category');
        categories.forEach(category => {
            const categoryType = category.dataset.category;
            const hasVisibleItems = visibleCategories.has(categoryType);
            category.style.display = hasVisibleItems ? 'block' : 'none';
            
            // Expand categories with search results
            if (hasVisibleItems) {
                category.classList.remove('collapsed');
            }
        });
    }

    setupCategoryToggle() {
        const categoryHeaders = document.querySelectorAll('.agent-category h5');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                const category = e.target.closest('.agent-category');
                category.classList.toggle('collapsed');
            });
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new InstallationUp4evr();
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