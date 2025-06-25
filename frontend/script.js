/**
 * Installation Up 4evr - Frontend JavaScript
 * Handles UI interactions and API communication
 */

class InstallationUp4evr {
    constructor() {
        this.baseUrl = window.location.origin;
        this.selectedSettings = new Set();
        this.currentAppPath = null;
        this.isElectron = window.electronAPI?.isElectron || false;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkServerStatus();
        await this.loadSystemPreferences();
        await this.loadLaunchAgents();
        await this.checkSIPStatus();
    }

    setupEventListeners() {
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
            this.showToast(`API Error: ${error.message}`, 'error');
            throw error;
        }
    }

    // Server Status
    async checkServerStatus() {
        try {
            await this.apiCall('/api/health');
            this.updateStatus('server-status', 'online', 'Server Online');
        } catch (error) {
            this.updateStatus('server-status', 'offline', 'Server Offline');
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
            const [required, optional] = await Promise.all([
                this.apiCall('/api/system-prefs/required'),
                this.apiCall('/api/system-prefs/optional')
            ]);

            this.renderSettings('required-settings', required);
            this.renderSettings('optional-settings', optional);
        } catch (error) {
            this.showToast('Failed to load system preferences', 'error');
        }
    }

    renderSettings(containerId, settings) {
        const container = document.getElementById(containerId);
        container.innerHTML = settings.map(setting => `
            <div class="setting-item" data-setting-id="${setting.id}">
                <label class="checkbox-label">
                    <input type="checkbox" data-setting="${setting.id}">
                    <span class="checkbox-custom"></span>
                    <div>
                        <h4>${setting.name}</h4>
                        <p>${setting.description}</p>
                    </div>
                </label>
            </div>
        `).join('');

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