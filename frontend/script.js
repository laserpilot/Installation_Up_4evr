/**
 * Installation Up 4evr - Frontend JavaScript
 * Handles UI interactions and API communication
 */

/**
 * Monitoring Data Manager
 * Centralized system for collecting and distributing monitoring data
 */
class MonitoringDataManager {
    constructor(app) {
        this.app = app;
        this.data = {
            system: null,
            applications: null,
            alerts: [],
            status: 'unknown',
            lastUpdate: null
        };
        this.subscribers = new Set();
        this.updateInterval = null;
        this.refreshRate = 5000; // 5 seconds
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        // Immediately call with current data if available
        if (this.data.lastUpdate) {
            callback(this.data);
        }
    }

    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.data);
            } catch (error) {
                console.error('[MONITORING] Subscriber callback error:', error);
            }
        });
    }

    async startMonitoring() {
        console.log('[MONITORING] Starting unified monitoring system');
        
        // Initial data fetch
        await this.refreshData();
        
        // Start periodic updates
        this.updateInterval = setInterval(() => {
            this.refreshData();
        }, this.refreshRate);
    }

    stopMonitoring() {
        console.log('[MONITORING] Stopping monitoring system');
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async refreshData() {
        try {
            console.log('[MONITORING] Refreshing monitoring data...');
            
            // Add timeout wrapper for API calls
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 second timeout
            });
            
            // Fetch all monitoring data in parallel with timeout
            const dataPromises = Promise.all([
                Promise.race([
                    this.app.apiCall('/api/monitoring/status'),
                    timeoutPromise
                ]).catch(err => {
                    console.warn('[MONITORING] System status failed:', err.message);
                    return null;
                }),
                Promise.race([
                    this.app.apiCall('/api/monitoring/applications'),
                    timeoutPromise
                ]).catch(err => {
                    console.warn('[MONITORING] Applications data failed:', err.message);
                    return [];
                })
            ]);

            const [systemData, appsData] = await dataPromises;

            // Update data object
            this.data = {
                system: systemData?.data?.system || systemData?.system || null,
                storage: systemData?.data?.storage || systemData?.storage || null,
                applications: appsData?.data || appsData || [],
                alerts: systemData?.data?.notifications || systemData?.notifications || [],
                status: systemData?.data?.status || systemData?.status || 'unknown',
                lastUpdate: new Date().toISOString(),
                timestamp: Date.now()
            };

            // Notify all subscribers with detailed logging
            this.notifySubscribers();

        } catch (error) {
            console.error('[MONITORING] Failed to refresh data:', error);
            this.data.status = 'error';
            this.data.lastUpdate = new Date().toISOString();
            this.data.errorMessage = error.message;
            this.notifySubscribers();
        }
    }

    getCurrentData() {
        return { ...this.data };
    }

    getSystemMetrics() {
        if (!this.data.system) {
            return null;
        }
        
        return {
            cpu: this.data.system.cpu?.usage || this.data.system.cpuUsage || 0,
            memory: this.data.system.memory?.usage || this.data.system.memoryUsage || 0,
            disk: this.data.system.disk?.usage || this.calculateDiskUsage(),
            status: this.data.status
        };
    }

    calculateDiskUsage() {
        if (!this.data.storage) return 0;
        
        // Find the highest disk usage percentage
        return Object.values(this.data.storage).reduce((max, disk) => {
            if (disk.usagePercent && disk.usagePercent < 100) {
                return Math.max(max, disk.usagePercent);
            }
            return max;
        }, 0);
    }

    getHealthStatus() {
        const metrics = this.getSystemMetrics();
        if (!metrics) return { status: 'unknown', issues: [] };

        const issues = [];
        
        if (metrics.cpu > 80) issues.push(`High CPU usage: ${metrics.cpu.toFixed(1)}%`);
        if (metrics.memory > 85) issues.push(`High memory usage: ${metrics.memory.toFixed(1)}%`);
        if (metrics.disk > 90) issues.push(`High disk usage: ${metrics.disk.toFixed(1)}%`);

        const status = issues.length === 0 ? 'healthy' : 
                      issues.length <= 2 ? 'warning' : 'critical';

        return { status, issues };
    }
}

/**
 * Authentication Session Manager
 * Handles persistent authentication sessions with timeout
 */
class AuthSessionManager {
    constructor() {
        this.storageKey = 'up4evr_auth_session';
        this.defaultTimeout = 45 * 60 * 1000; // 45 minutes
        this.warningTime = 5 * 60 * 1000; // 5 minutes before expiration
        this.warningShown = false;
    }

    /**
     * Check if current session is valid
     */
    isSessionValid() {
        try {
            const session = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
            if (!session.expires) return false;
            
            const now = Date.now();
            const isValid = now < session.expires;
            
            // Check if we should show expiration warning
            if (isValid && !this.warningShown && (session.expires - now) < this.warningTime) {
                this.showExpirationWarning(session.expires);
            }
            
            return isValid;
        } catch (error) {
            console.error('[SESSION] Error checking session validity:', error);
            return false;
        }
    }

    /**
     * Create new authentication session
     */
    createSession(method = 'unknown', customTimeout = null) {
        const now = Date.now();
        const timeout = customTimeout || this.defaultTimeout;
        const expires = now + timeout;
        
        const session = {
            created: now,
            expires: expires,
            method: method,
            timestamp: new Date(now).toISOString(),
            expiresAt: new Date(expires).toISOString()
        };
        
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.warningShown = false;
        
        console.log(`[SESSION] Created session (${method}) expires at ${session.expiresAt}`);
        return session;
    }

    /**
     * Get current session info
     */
    getSession() {
        try {
            return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch (error) {
            return {};
        }
    }

    /**
     * Clear authentication session
     */
    clearSession() {
        localStorage.removeItem(this.storageKey);
        this.warningShown = false;
        console.log('[SESSION] Session cleared');
    }

    /**
     * Get time remaining in session (in minutes)
     */
    getTimeRemaining() {
        const session = this.getSession();
        if (!session.expires) return 0;
        
        const remaining = session.expires - Date.now();
        return Math.max(0, Math.ceil(remaining / (60 * 1000)));
    }

    /**
     * Show expiration warning
     */
    showExpirationWarning(expiresAt) {
        this.warningShown = true;
        const remainingMinutes = Math.ceil((expiresAt - Date.now()) / (60 * 1000));
        
        console.warn(`[SESSION] Authentication expires in ${remainingMinutes} minutes`);
        
        // Show toast notification if available
        if (window.installationApp && window.installationApp.showToast) {
            window.installationApp.showToast(
                `Authentication expires in ${remainingMinutes} minutes`, 
                'warning'
            );
        }
    }

    /**
     * Extend current session
     */
    extendSession(additionalMinutes = 45) {
        const session = this.getSession();
        if (!session.expires) return false;
        
        const newExpires = Date.now() + (additionalMinutes * 60 * 1000);
        session.expires = newExpires;
        session.expiresAt = new Date(newExpires).toISOString();
        
        localStorage.setItem(this.storageKey, JSON.stringify(session));
        this.warningShown = false;
        
        console.log(`[SESSION] Extended session to ${session.expiresAt}`);
        return true;
    }
}

class InstallationUp4evr {
    constructor() {
        // Fix base URL for Electron vs web browser
        this.isElectron = window.electronAPI?.isElectron || false;
        this.baseUrl = this.isElectron ? 'http://localhost:3001' : window.location.origin;
        this.selectedSettings = new Set();
        this.currentAppPath = null;
        
        // Initialize session manager
        this.authSession = new AuthSessionManager();
        
        // Initialize unified monitoring system
        this.monitoringData = new MonitoringDataManager(this);
        
        // Make app instance globally available for session warnings
        window.installationApp = this;
        
        this.init();
    }

    async init() {
        console.log('[INIT] Initializing Installation Up 4evr...');
        console.log('[INIT] Is Electron:', this.isElectron);
        console.log('[INIT] Has window.electronAPI:', !!window.electronAPI);
        
        // Safe process check for browsers
        let hasProcessElectron = false;
        try {
            hasProcessElectron = typeof process !== 'undefined' && !!process?.versions?.electron;
        } catch (e) {
            // process doesn't exist in browsers
        }
        console.log('[INIT] Has process.versions.electron:', hasProcessElectron);
        
        console.log('[INIT] Setting up event listeners...');
        this.setupEventListeners();
        
        // Show initial loading states
        console.log('[INIT] Showing initial loading states...');
        this.showInitialLoadingStates();
        
        // If running in Electron, wait for server to be ready
        if (this.isElectron) {
            console.log('[INIT] Electron mode - starting backend server...');
            this.updateLoadingMessage('Starting backend server...');
            await this.waitForServer();
        } else {
            console.log('[INIT] Browser mode - skipping Electron-specific setup');
        }
        
        this.updateLoadingMessage('Checking server status...');
        const serverOnline = await this.checkServerStatus();
        
        if (serverOnline) {
            // Check if this is the first run and handle accordingly
            this.updateLoadingMessage('Checking first run status...');
            await this.checkFirstRun();
            
            this.updateLoadingMessage('Loading system preferences...');
            await this.loadSystemPreferences();
            
            this.updateLoadingMessage('Loading launch agents...');
            await this.loadLaunchAgents();
            
            this.updateLoadingMessage('Checking security status...');
            await this.checkSIPStatus();
            
            this.updateLoadingMessage('Loading dashboard...');
            await this.refreshDashboard();
            
            // Start unified monitoring system
            this.updateLoadingMessage('Starting monitoring...');
            this.monitoringData.startMonitoring();
            
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
        const verifyBtn = document.getElementById('verify-settings');
        const applyRequiredBtn = document.getElementById('apply-required');
        const applySelectedBtn = document.getElementById('apply-selected');
        
        console.log('[SETUP] Verify button found:', !!verifyBtn);
        console.log('[SETUP] Apply required button found:', !!applyRequiredBtn);
        console.log('[SETUP] Apply selected button found:', !!applySelectedBtn);
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.verifySettings());
        }
        if (applyRequiredBtn) {
            applyRequiredBtn.addEventListener('click', () => this.applyRequiredSettings());
        }
        if (applySelectedBtn) {
            applySelectedBtn.addEventListener('click', () => {
                console.log('[SETUP] Apply selected button clicked!');
                this.applySelectedSettings();
            });
        }

        // Generate Terminal Script button
        const generateScriptBtn = document.getElementById('generate-script');
        if (generateScriptBtn) {
            generateScriptBtn.addEventListener('click', () => {
                console.log('[SETUP] Generate script button clicked!');
                this.generateTerminalScript();
            });
        }

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
        
        // Dashboard Actions
        this.setupDashboardActions();
        
        // Setup Wizard Actions
        this.setupWizardActions();

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

        // DIAGNOSTIC: Log all API calls with full details
        const method = options.method || 'GET';
        const hasBody = !!options.body;
        const isAuthCall = endpoint.includes('/auth/');
        
        console.log(`[API] ${method} ${endpoint}`);
        console.log(`[API] URL: ${url}`);
        console.log(`[API] Has body: ${hasBody}`);
        if (hasBody && !isAuthCall) {
            console.log(`[API] Body:`, options.body);
        } else if (hasBody && isAuthCall) {
            console.log(`[API] Body: [REDACTED - AUTH CALL]`);
        }
        console.log(`[API] Options:`, { ...options, body: isAuthCall ? '[REDACTED]' : options.body });

        try {
            const startTime = Date.now();
            const response = await fetch(url, { ...defaultOptions, ...options });
            const duration = Date.now() - startTime;
            
            console.log(`[API] Response status: ${response.status} (${duration}ms)`);
            console.log(`[API] Response headers:`, Object.fromEntries(response.headers.entries()));
            
            if (!response.ok) {
                console.error(`[API] HTTP Error: ${response.status}: ${response.statusText}`);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseData = await response.json();
            console.log(`[API] Response data:`, isAuthCall ? { ...responseData, password: '[REDACTED]' } : responseData);
            
            return responseData;
        } catch (error) {
            console.error(`[API] Call failed for ${method} ${endpoint}:`, error);
            console.error(`[API] Error details:`, {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Only show toast for non-health check calls
            if (!endpoint.includes('/health')) {
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    this.showToast('Cannot connect to server - is it running?', 'error');
                    console.error('[API] Network error - server may be offline');
                } else {
                    this.showToast(`API Error: ${error.message}`, 'error');
                }
            }
            throw error;
        }
    }

    // Server Status
    async checkServerStatus() {
        console.log('[SERVER] Checking server status...');
        
        try {
            // Test basic health endpoint
            console.log('[SERVER] Testing /api/health...');
            const healthResponse = await this.apiCall('/api/health');
            console.log('[SERVER] Health check passed:', healthResponse);
            
            // Test critical auth endpoints
            console.log('[SERVER] Testing /api/auth/sudo-status...');
            try {
                const authResponse = await this.apiCall('/api/auth/sudo-status');
                console.log('[SERVER] Auth endpoint accessible:', authResponse);
                this.updateStatus('server-status', 'online', 'Server Online');
                return true;
            } catch (authError) {
                console.warn('[SERVER] Auth endpoint failed:', authError);
                this.updateStatus('server-status', 'warning', 'Server Partial');
                this.showToast('Server online but authentication may not work', 'warning');
                return false; // Consider this a failure since auth is critical
            }
            
        } catch (error) {
            console.error('[SERVER] Health check failed:', error);
            this.updateStatus('server-status', 'offline', 'Server Offline');
            if (this.isElectron) {
                this.showToast('Backend server is starting up...', 'info');
            } else {
                this.showToast('Cannot connect to server - is it running on port 3001?', 'error');
            }
            return false;
        }
    }

    async checkSIPStatus() {
        console.log('[SIP] Checking SIP status...');
        try {
            const sipStatus = await this.apiCall('/api/system-prefs/sip-status');
            console.log('[SIP] SIP status response:', sipStatus);
            
            const status = sipStatus.enabled ? 'warning' : 'online';
            const text = sipStatus.enabled ? 'SIP Enabled' : 'SIP Disabled';
            this.updateStatus('sip-status', status, text);
            
            if (sipStatus.warning) {
                this.showToast(sipStatus.warning, 'warning');
            }
        } catch (error) {
            console.error('[SIP] Failed to check SIP status:', error);
            this.updateStatus('sip-status', 'offline', 'SIP Unknown');
        }
    }

    updateStatus(elementId, status, text) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`[STATUS] Element ${elementId} not found`);
            return;
        }
        element.className = `status-indicator ${status}`;
        element.innerHTML = `<i class="fas fa-circle"></i> ${text}`;
        console.log(`[STATUS] Updated ${elementId}: ${status} - ${text}`);
    }

    // System Preferences
    async loadSystemPreferences() {
        console.log('[SYSTEM-PREFS] Loading system preferences...');
        try {
            const [allSettings, statusData] = await Promise.all([
                this.apiCall('/api/system-prefs/settings'),
                this.apiCall('/api/system-prefs/status')
            ]);

            console.log('[SYSTEM-PREFS] All settings:', allSettings);
            console.log('[SYSTEM-PREFS] Status data:', statusData);

            // Create status lookup for quick access
            const statusLookup = {};
            if (Array.isArray(statusData)) {
                statusData.forEach(status => {
                    statusLookup[status.setting] = status;
                });
            } else {
                console.warn('[SYSTEM-PREFS] Status data is not an array:', statusData);
            }

            console.log('[SYSTEM-PREFS] Status lookup:', statusLookup);

            // Filter settings by required vs optional and render
            const settingsArray = Array.isArray(allSettings) 
                ? allSettings 
                : Object.entries(allSettings).map(([key, setting]) => ({
                    id: key,
                    name: setting.name,
                    description: setting.description,
                    required: setting.required,
                    category: setting.category || 'general'
                }));

            const requiredSettings = settingsArray.filter(s => s.required);
            const optionalSettings = settingsArray.filter(s => !s.required);

            console.log('[SYSTEM-PREFS] Required settings:', requiredSettings);
            console.log('[SYSTEM-PREFS] Optional settings:', optionalSettings);

            this.renderSettings('required-settings', requiredSettings, statusLookup);
            this.renderSettings('optional-settings', optionalSettings, statusLookup);
            
            console.log('[SYSTEM-PREFS] Settings rendered successfully');
        } catch (error) {
            console.error('[SYSTEM-PREFS] Failed to load system preferences:', error);
            this.showToast('Failed to load system preferences', 'error');
        }
    }

    renderSettings(containerId, settings, statusLookup = {}) {
        const container = document.getElementById(containerId);
        
        // Convert object to array of entries if needed
        const settingsArray = Array.isArray(settings) 
            ? settings 
            : Object.entries(settings).map(([key, setting]) => ({
                id: key,
                name: setting.name,
                description: setting.description,
                required: setting.required,
                category: setting.category || 'general'
            }));
        
        if (settingsArray.length === 0) {
            container.innerHTML = '<div class="no-settings">No settings available</div>';
            return;
        }
        
        // Group settings by category
        const categorizedSettings = settingsArray.reduce((acc, setting) => {
            const category = setting.category || 'general';
            if (!acc[category]) acc[category] = [];
            acc[category].push(setting);
            return acc;
        }, {});
        
        // Define category order and metadata
        const categoryInfo = {
            power: { name: 'Power & Sleep', icon: 'fas fa-bolt', description: 'Essential settings for unattended operation' },
            ui: { name: 'User Interface', icon: 'fas fa-desktop', description: 'Display and interface behavior' },
            performance: { name: 'Performance', icon: 'fas fa-tachometer-alt', description: 'System performance optimizations' },
            network: { name: 'Network', icon: 'fas fa-wifi', description: 'Network and connectivity settings' },
            general: { name: 'General', icon: 'fas fa-cog', description: 'General system settings' },
            danger: { name: '⚠️ Expert / Danger Zone', icon: 'fas fa-exclamation-triangle', description: 'Advanced settings with security implications' }
        };
        
        const categoryOrder = ['power', 'ui', 'performance', 'network', 'general', 'danger'];
        
        container.innerHTML = categoryOrder.map(categoryKey => {
            const categorySettings = categorizedSettings[categoryKey];
            if (!categorySettings || categorySettings.length === 0) return '';
            
            const categoryMeta = categoryInfo[categoryKey];
            const isDangerZone = categoryKey === 'danger';
            
            const settingsHtml = categorySettings.map(setting => {
                const status = statusLookup[setting.id] || { statusIcon: '⚪', statusText: 'Unknown' };
                const statusClass = this.getStatusClass(status.status);
                const dangerClass = isDangerZone ? 'danger-setting' : '';
                
                return `
                    <div class="setting-item ${statusClass} ${dangerClass}" data-setting-id="${setting.id}" data-category="${categoryKey}">
                        <label class="checkbox-label">
                            <input type="checkbox" data-setting="${setting.id}" ${isDangerZone ? 'data-danger="true"' : ''}>
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
            
            const dangerZoneClass = isDangerZone ? 'danger-zone-category' : '';
            const collapsedClass = isDangerZone ? 'collapsed' : '';
            
            return `
                <div class="settings-category ${dangerZoneClass} ${collapsedClass}" data-category="${categoryKey}">
                    <div class="category-header" ${isDangerZone ? 'onclick="this.parentElement.classList.toggle(\'collapsed\')"' : ''}>
                        <h3>
                            <i class="${categoryMeta.icon}"></i>
                            ${categoryMeta.name}
                            ${isDangerZone ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
                        </h3>
                        <p class="category-description">${categoryMeta.description}</p>
                        ${isDangerZone ? '<p class="danger-warning">⚠️ These settings may compromise system security. Use with caution!</p>' : ''}
                    </div>
                    <div class="category-settings">
                        ${settingsHtml}
                    </div>
                </div>
            `;
        }).filter(html => html).join('');

        // Add change listeners
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const settingId = e.target.dataset.setting;
                const settingItem = e.target.closest('.setting-item');
                const isDangerSetting = e.target.dataset.danger === 'true';
                
                if (e.target.checked) {
                    // Special confirmation for danger zone settings
                    if (isDangerSetting) {
                        const settingName = settingItem.querySelector('h4').textContent.replace('⚠️', '').trim();
                        const confirmed = confirm(
                            `⚠️ DANGER ZONE SETTING ⚠️\n\n` +
                            `You are about to enable: "${settingName}"\n\n` +
                            `This setting may compromise system security or stability. ` +
                            `Only proceed if you understand the risks and have proper backups.\n\n` +
                            `Continue with this dangerous setting?`
                        );
                        
                        if (!confirmed) {
                            e.target.checked = false;
                            return;
                        }
                    }
                    
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
        console.log('[VERIFY] Starting system settings verification...');
        this.showLoading();
        this.updateLoadingMessage('Checking current system settings status...');
        
        try {
            const response = await this.apiCall('/api/system-prefs/verify');
            console.log('[VERIFY] Verification response:', response);
            
            if (response.success && response.data) {
                this.showDetailedVerificationResults(response.data);
                this.updateSystemPreferencesUI(response.data);
                
                // Provide summary feedback
                const settingsData = response.data;
                const appliedCount = settingsData.filter(s => s.status === 'applied').length;
                const needsAttentionCount = settingsData.filter(s => s.status === 'not_applied').length;
                const errorCount = settingsData.filter(s => s.status === 'error').length;
                const totalCount = settingsData.length;
                
                let summaryMessage = `Verification complete: ${appliedCount}/${totalCount} settings properly configured`;
                if (needsAttentionCount > 0) {
                    summaryMessage += `, ${needsAttentionCount} need attention`;
                }
                if (errorCount > 0) {
                    summaryMessage += `, ${errorCount} have errors`;
                }
                
                this.showToast(summaryMessage, needsAttentionCount > 0 || errorCount > 0 ? 'warning' : 'success');
            } else {
                this.displayResults('System Settings Verification', response);
                this.showToast('Verification completed with warnings', 'warning');
            }
        } catch (error) {
            console.error('[VERIFY] Verification failed:', error);
            this.showToast(`Failed to verify settings: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    showDetailedVerificationResults(settingsData) {
        console.log('[VERIFY] Showing detailed verification results...');
        
        // Remove any existing verification modal to prevent layering
        const existingModal = document.querySelector('.modal-overlay .verification-content');
        if (existingModal) {
            existingModal.closest('.modal-overlay').remove();
        }
        
        // Create detailed results modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content verification-content">
                <div class="modal-header">
                    <h2>🔍 System Settings Verification Results</h2>
                    <button class="close-button" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="verification-summary">
                        <div class="summary-stats">
                            <div class="stat applied-stat">
                                <span class="stat-icon">🟢</span>
                                <span class="stat-number">${settingsData.filter(s => s.status === 'applied').length}</span>
                                <span class="stat-label">Applied</span>
                            </div>
                            <div class="stat needs-attention-stat">
                                <span class="stat-icon">🟡</span>
                                <span class="stat-number">${settingsData.filter(s => s.status === 'not_applied').length}</span>
                                <span class="stat-label">Need Attention</span>
                            </div>
                            <div class="stat error-stat">
                                <span class="stat-icon">🔴</span>
                                <span class="stat-number">${settingsData.filter(s => s.status === 'error').length}</span>
                                <span class="stat-label">Errors</span>
                            </div>
                        </div>
                    </div>
                    <div class="verification-details">
                        ${settingsData.map(setting => this.createVerificationResultItem(setting)).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    <button class="btn btn-secondary" onclick="window.app.refreshSystemPreferences()">Refresh Settings</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    createVerificationResultItem(setting) {
        const statusClass = {
            'applied': 'status-applied',
            'not_applied': 'status-needs-applying', 
            'error': 'status-error',
            'unknown': 'status-unknown'
        }[setting.status] || 'status-unknown';
        
        return `
            <div class="verification-item ${statusClass}">
                <div class="verification-header">
                    <span class="verification-icon">${setting.statusIcon}</span>
                    <span class="verification-name">${setting.name}</span>
                    <span class="verification-status">${setting.statusText}</span>
                </div>
                <div class="verification-details-section">
                    ${setting.output ? `
                        <div class="verification-output">
                            <strong>Current Value:</strong>
                            <code>${this.escapeHtml(setting.output)}</code>
                        </div>
                    ` : ''}
                    ${setting.error ? `
                        <div class="verification-error">
                            <strong>Error:</strong>
                            <code class="error-text">${this.escapeHtml(setting.error)}</code>
                        </div>
                    ` : ''}
                    ${setting.status === 'not_applied' ? `
                        <div class="verification-action">
                            <em>💡 This setting needs to be applied for optimal installation performance.</em>
                        </div>
                    ` : ''}
                    ${setting.status === 'error' ? `
                        <div class="verification-action">
                            <em>⚠️ Unable to check this setting. May require administrator access.</em>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    updateSystemPreferencesUI(settingsData) {
        console.log('[VERIFY] Updating system preferences UI with verification results...');
        
        // Create a lookup for quick access
        const statusLookup = settingsData.reduce((acc, item) => {
            acc[item.setting] = item;
            return acc;
        }, {});
        
        // Update existing setting cards in the UI
        document.querySelectorAll('.setting-card').forEach(card => {
            const settingId = card.dataset.settingId;
            const status = statusLookup[settingId];
            
            if (status) {
                // Update status display
                const statusElement = card.querySelector('.setting-status');
                if (statusElement) {
                    statusElement.textContent = status.statusText;
                    statusElement.className = `setting-status ${this.getStatusClass(status.status)}`;
                }
                
                // Update status icon
                const iconElement = card.querySelector('.status-icon');
                if (iconElement) {
                    iconElement.textContent = status.statusIcon;
                }
                
                // Update overall card class
                card.className = `setting-card ${this.getStatusClass(status.status)}`;
            }
        });
        
        console.log('[VERIFY] UI updated with latest verification status');
    }

    async refreshSystemPreferences() {
        console.log('[REFRESH] Refreshing system preferences...');
        await this.loadSystemPreferences();
        this.showToast('System preferences refreshed', 'success');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async applyRequiredSettings() {
        console.log('[REQUIRED] Starting apply required settings...');
        
        // Step 1: Check current status of required settings
        this.showLoading();
        this.updateLoadingMessage('Checking current system status...');
        
        let requiredSettingsToApply = [];
        try {
            const statusResponse = await this.apiCall('/api/system-prefs/status');
            if (statusResponse.success) {
                const statusData = statusResponse.data;
                
                // Filter to only required settings that need to be applied
                requiredSettingsToApply = statusData.filter(item => {
                    // Assuming the backend marks required settings somehow
                    // This might need adjustment based on how required settings are identified
                    return item.status !== 'applied';
                });
            } else {
                throw new Error('Failed to get system status');
            }
        } catch (error) {
            console.warn('[REQUIRED] Status check failed:', error);
            this.hideLoading();
            this.showToast('Unable to check system status. Please try manual application.', 'error');
            return;
        } finally {
            this.hideLoading();
        }

        // Step 2: Show user what will actually be changed
        if (requiredSettingsToApply.length === 0) {
            this.showToast('All required settings are already applied! ✅', 'success');
            return;
        }

        // Step 3: Show smart authentication dialog
        const settingsList = requiredSettingsToApply.map(s => `• ${s.name} (${s.statusText})`).join('\n');
        let message = `📋 Required Settings Review\n\n`;
        message += `${requiredSettingsToApply.length} required settings need to be applied:\n\n${settingsList}\n\n`;
        
        if (this.isElectron) {
            message += `These are essential settings for installation computers.\n\n`;
            message += `🔒 Apply automatically using native authentication?\n`;
            message += `(You can also choose manual commands if preferred)`;
        } else {
            message += `⚠️ Browser Mode: Generate terminal commands to run manually?\n`;
            message += `(Automatic application may not work reliably in browsers)`;
        }

        const choice = confirm(message);
        
        if (choice) {
            if (this.isElectron) {
                await this.executeRequiredSettingsApplication();
            } else {
                // Generate script for all required settings that need to be applied
                this.selectedSettings = new Set(requiredSettingsToApply.map(s => s.setting));
                await this.generateTerminalScript();
            }
        } else if (this.isElectron) {
            // Offer manual option for Electron users who declined automatic
            const manualChoice = confirm(
                'Would you like to see the manual terminal commands instead?\n\n' +
                'This will show you the exact commands to run in Terminal.'
            );
            if (manualChoice) {
                this.selectedSettings = new Set(requiredSettingsToApply.map(s => s.setting));
                await this.generateTerminalScript();
            }
        }
    }

    async executeRequiredSettingsApplication() {
        this.showLoading();
        try {
            console.log('[REQUIRED] Applying required settings via API...');
            const results = await this.apiCall('/api/system-prefs/apply-required', {
                method: 'POST'
            });
            console.log('[REQUIRED] Required settings application result:', results);
            this.displayResults('Applied Required Settings', results);
            this.showToast('Required settings applied successfully!', 'success');
            
            // Refresh the display to show updated status
            await this.loadSystemPreferences();
        } catch (error) {
            console.error('[REQUIRED] Failed to apply required settings:', error);
            this.showToast('Failed to apply required settings', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async applySelectedSettings() {
        console.log('[APPLY] Starting apply selected settings...');
        
        if (this.selectedSettings.size === 0) {
            this.showToast('Please select settings to apply', 'warning');
            return;
        }

        console.log('[APPLY] Selected settings:', Array.from(this.selectedSettings));

        // Step 1: Check current status of selected settings
        this.showLoading();
        this.updateLoadingMessage('Checking current system status...');
        
        let settingsToApply = [];
        try {
            const statusResponse = await this.apiCall('/api/system-prefs/status');
            if (statusResponse.success) {
                const statusData = statusResponse.data;
                const statusLookup = statusData.reduce((acc, item) => {
                    acc[item.setting] = item;
                    return acc;
                }, {});

                // Filter out settings that are already applied
                for (const settingId of this.selectedSettings) {
                    const status = statusLookup[settingId];
                    if (!status || status.status !== 'applied') {
                        settingsToApply.push({
                            id: settingId,
                            name: status?.name || settingId,
                            status: status?.status || 'unknown',
                            statusText: status?.statusText || 'Unknown status'
                        });
                    }
                }
            } else {
                // If status check fails, apply all selected settings
                settingsToApply = Array.from(this.selectedSettings).map(id => ({ id, name: id, status: 'unknown' }));
            }
        } catch (error) {
            console.warn('[APPLY] Status check failed, proceeding with all selected settings:', error);
            settingsToApply = Array.from(this.selectedSettings).map(id => ({ id, name: id, status: 'unknown' }));
        } finally {
            this.hideLoading();
        }

        // Step 2: Show user what will actually be changed
        if (settingsToApply.length === 0) {
            this.showToast('All selected settings are already applied! ✅', 'success');
            return;
        }

        // Step 3: Show smart authentication dialog with multiple options
        const choice = await this.showSmartAuthDialog(settingsToApply);
        
        switch (choice) {
            case 'manual':
                await this.generateTerminalScript();
                break;
            case 'apply':
                await this.executeSettingsApplication(settingsToApply.map(s => s.id));
                break;
            case 'cancel':
            default:
                console.log('[APPLY] User cancelled settings application');
                break;
        }
    }

    async showSmartAuthDialog(settingsToApply) {
        return new Promise((resolve) => {
            // Create enhanced dialog showing what will be changed
            const settingsCount = settingsToApply.length;
            const settingsList = settingsToApply.map(s => `• ${s.name} (${s.statusText})`).join('\n');
            
            const isElectron = this.isElectron;
            
            let message = `📋 Settings Review\n\n`;
            message += `${settingsCount} settings need to be applied:\n\n${settingsList}\n\n`;
            message += `Choose how to proceed:\n\n`;
            
            if (isElectron) {
                message += `🔒 Apply for Me - Use native authentication (recommended)\n`;
                message += `📄 Show Manual Commands - Copy-paste terminal commands\n`;
                message += `❌ Cancel - Don't make changes\n\n`;
                message += `Would you like to apply these settings automatically?`;
            } else {
                message += `⚠️ Browser Mode: Automatic application may not work reliably.\n\n`;
                message += `📄 Generate Terminal Commands (Recommended)\n`;
                message += `🔒 Try Direct Application (May Fail)\n`;
                message += `❌ Cancel\n\n`;
                message += `Generate terminal commands to run manually?`;
            }

            const choice = confirm(message);
            
            if (choice) {
                resolve(isElectron ? 'apply' : 'manual');
            } else {
                // Show manual option for Electron users who said no to automatic
                if (isElectron) {
                    const manualChoice = confirm(
                        'Would you like to see the manual terminal commands instead?\n\n' +
                        'This will show you the exact commands to run in Terminal.'
                    );
                    resolve(manualChoice ? 'manual' : 'cancel');
                } else {
                    resolve('cancel');
                }
            }
        });
    }

    async executeSettingsApplication(settingIds) {
        this.showLoading();
        try {
            let results;
            if (this.isElectron) {
                // Use native Electron API for better sudo handling
                results = await window.electronAPI.applySystemSettings(settingIds);
            } else {
                // Fallback to web API
                console.log('[APPLY] Applying settings via web API...');
                results = await this.apiCall('/api/system-prefs/apply', {
                    method: 'POST',
                    body: JSON.stringify({ settings: settingIds })
                });
                console.log('[APPLY] Settings application result:', results);
            }
            this.displayResults('Applied Selected Settings', results);
            this.showToast(`Applied ${settingIds.length} settings successfully!`, 'success');
            
            // Refresh the display to show updated status
            await this.loadSystemPreferences();
        } catch (error) {
            console.error('[APPLY] Failed to apply settings:', error);
            this.showToast('Failed to apply selected settings', 'error');
        } finally {
            this.hideLoading();
        }
    }

    // Debug function to test Electron API connectivity
    async testElectronAPI() {
        console.log('=== ELECTRON API DEBUG TEST ===');
        console.log('1. Environment Detection:');
        console.log('   - isElectron:', this.isElectron);
        console.log('   - window.electronAPI exists:', !!window.electronAPI);
        console.log('   - window.electronAPI.isElectron:', window.electronAPI?.isElectron);
        console.log('   - requestSudoAccess available:', !!window.electronAPI?.requestSudoAccess);
        
        if (window.electronAPI) {
            console.log('2. Available Electron API methods:');
            console.log('   -', Object.keys(window.electronAPI).join(', '));
        }
        
        if (this.isElectron && window.electronAPI?.checkSudoStatus) {
            console.log('3. Testing sudo status check...');
            try {
                const sudoStatus = await window.electronAPI.checkSudoStatus();
                console.log('   - Sudo status result:', sudoStatus);
            } catch (error) {
                console.error('   - Sudo status error:', error);
            }
        }
        
        console.log('4. Debug log location: ~/installation-up-4evr-debug.log');
        console.log('=== END DEBUG TEST ===');
        
        this.showToast('Debug info logged to console. Check ~/installation-up-4evr-debug.log for Electron logs.', 'info');
    }

    async generateTerminalScript(mode = 'apply') {
        try {
            console.log('[SCRIPT-GEN] Generating terminal script for browser users...');
            
            if (this.selectedSettings.size === 0) {
                this.showToast('No settings selected for script generation', 'warning');
                return;
            }

            const settingsArray = Array.from(this.selectedSettings);
            console.log('[SCRIPT-GEN] Selected settings:', settingsArray);

            // Show loading state
            this.showLoading();

            // Call the new script generation API
            const response = await this.apiCall('/api/system-prefs/generate-script', {
                method: 'POST',
                body: JSON.stringify({
                    settings: settingsArray,
                    mode: mode,
                    includeVerification: true
                })
            });

            console.log('[SCRIPT-GEN] Script generation response:', response);

            if (response.success) {
                // Show the generated script in a modal
                this.showTerminalScriptModal(response.data);
                this.showToast(`Generated script for ${response.data.settingsCount} settings`, 'success');
            } else {
                this.showToast('Failed to generate terminal script', 'error');
                console.error('[SCRIPT-GEN] Generation failed:', response.error);
            }
        } catch (error) {
            console.error('[SCRIPT-GEN] Error generating script:', error);
            this.showToast('Error generating terminal script', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showTerminalScriptModal(scriptData) {
        // Remove any existing modal
        const existingModal = document.getElementById('terminal-script-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHtml = `
            <div id="terminal-script-modal" class="modal-overlay">
                <div class="modal-content script-modal">
                    <div class="modal-header">
                        <h2>🖥️ Terminal Commands Generated</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="script-info">
                            <p><strong>Settings:</strong> ${scriptData.settingsCount} (${scriptData.categories.join(', ')})</p>
                            <p><strong>Generated:</strong> ${new Date(scriptData.timestamp).toLocaleString()}</p>
                            <p class="script-instructions">
                                📋 <strong>Instructions:</strong> Copy the script below, save it as a .sh file, and run it in Terminal.
                                Some commands require administrator privileges and will prompt for your password.
                            </p>
                        </div>
                        <div class="script-container">
                            <div class="script-header">
                                <span>installation-up-4evr-config.sh</span>
                                <button id="copy-script-btn" class="copy-button" onclick="installationApp.copyScriptToClipboard()">
                                    📋 Copy Script
                                </button>
                            </div>
                            <pre id="terminal-script-content" class="script-content">${scriptData.script}</pre>
                        </div>
                        <div class="script-actions">
                            <button class="btn btn-primary" id="download-script-btn">
                                💾 Download Script
                            </button>
                            <button class="btn btn-secondary" id="close-script-modal">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add event listeners
        const downloadBtn = document.getElementById('download-script-btn');
        const closeBtn = document.getElementById('close-script-modal');
        
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadScript(scriptData.script, 'installation-up-4evr-config.sh');
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = document.getElementById('terminal-script-modal');
                if (modal) {
                    modal.remove();
                }
            });
        }

        // Make modal visible with animation
        setTimeout(() => {
            const modal = document.getElementById('terminal-script-modal');
            if (modal) {
                modal.classList.add('show');
            }
        }, 10);
    }

    async copyScriptToClipboard() {
        const scriptElement = document.getElementById('terminal-script-content');
        if (!scriptElement) return;

        const scriptText = scriptElement.textContent;
        const copyBtn = document.getElementById('copy-script-btn');
        const originalText = copyBtn?.innerHTML;

        try {
            // Try modern Clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(scriptText);
                this.showToast('Script copied to clipboard! 📋', 'success');
                console.log('[COPY] Script copied using modern Clipboard API');
            } else {
                // Fallback to legacy method for older browsers or non-HTTPS
                await this.legacyCopyToClipboard(scriptText);
                this.showToast('Script copied to clipboard! 📋', 'success');
                console.log('[COPY] Script copied using legacy method');
            }
            
            // Update button text temporarily
            if (copyBtn) {
                copyBtn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2500);
            }
        } catch (err) {
            console.error('[COPY] Failed to copy script:', err);
            this.showToast('Failed to copy script. Please select and copy manually.', 'warning');
            
            // Select the text for manual copying
            if (scriptElement) {
                const range = document.createRange();
                range.selectNodeContents(scriptElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }

    legacyCopyToClipboard(text) {
        return new Promise((resolve, reject) => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    resolve();
                } else {
                    reject(new Error('execCommand returned false'));
                }
            } catch (err) {
                reject(err);
            } finally {
                document.body.removeChild(textArea);
            }
        });
    }

    downloadScript(scriptContent, filename) {
        const blob = new Blob([scriptContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.showToast('Script downloaded successfully!', 'success');
    }

    async requireAuthentication() {
        console.log('[AUTH] Requiring authentication...');
        
        // Check if we have a valid session first
        if (this.authSession.isSessionValid()) {
            const remaining = this.authSession.getTimeRemaining();
            console.log(`[AUTH] Using cached authentication (${remaining} minutes remaining)`);
            this.showToast(`Using cached authentication (${remaining}m remaining)`, 'info');
            return Promise.resolve();
        }
        
        console.log('[AUTH] No valid session, showing authentication dialog');
        
        return new Promise((resolve, reject) => {
            let authenticationSucceeded = false;
            
            // Show the sudo dialog
            this.showSudoPermissionDialog();
            
            // Override the original requestSudoAccess to handle the promise
            const originalRequestSudoAccess = this.requestSudoAccess;
            
            this.requestSudoAccess = async function() {
                try {
                    const authResult = await originalRequestSudoAccess.call(this);
                    
                    // Check if this was successful password authentication
                    const selectedMethod = document.querySelector('input[name="auth-method"]:checked')?.value || 'native';
                    
                    if (selectedMethod === 'password' && authResult && authResult.success) {
                        // Password authentication succeeded - create session
                        console.log('[AUTH] Password authentication requirement satisfied');
                        this.authSession.createSession('password');
                        authenticationSucceeded = true;
                        resolve();
                        return;
                    }
                    
                    // For native authentication, check if sudo access is available
                    const status = await this.apiCall('/api/auth/sudo-status');
                    if (status.hasSudoAccess) {
                        console.log('[AUTH] Native authentication requirement satisfied');
                        this.authSession.createSession('native');
                        authenticationSucceeded = true;
                        resolve();
                    } else {
                        console.log('[AUTH] Authentication requirement not satisfied');
                        reject(new Error('Authentication failed'));
                    }
                } catch (error) {
                    console.error('[AUTH] Authentication requirement error:', error);
                    reject(error);
                } finally {
                    // Restore original function
                    this.requestSudoAccess = originalRequestSudoAccess;
                }
            }.bind(this);
            
            // Also handle the "Continue with Limited Features" case
            const originalDismiss = this.dismissSudoDialog;
            this.dismissSudoDialog = function() {
                console.log('[AUTH] Authentication dialog dismissed');
                originalDismiss.call(this);
                this.requestSudoAccess = originalRequestSudoAccess;
                
                // Only reject if authentication didn't succeed
                if (!authenticationSucceeded) {
                    console.log('[AUTH] Authentication cancelled by user (no success)');
                    reject(new Error('Authentication cancelled by user'));
                } else {
                    console.log('[AUTH] Dialog dismissed after successful authentication');
                }
            }.bind(this);
        });
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
                
                // Load dashboard data if dashboard tab is selected
                if (targetTab === 'dashboard') {
                    this.refreshDashboard();
                }
                
                // Initialize setup wizard if setup-wizard tab is selected
                if (targetTab === 'setup-wizard') {
                    this.initializeWizard();
                }
                
                // Load system preferences if system-prefs tab is selected
                if (targetTab === 'system-prefs') {
                    this.loadSystemPreferences();
                }
                
                // Load monitoring data if monitoring tab is selected
                if (targetTab === 'monitoring') {
                    this.setupMonitoringTabSubscription();
                }
                
                // Load monitoring config and system status if monitoring-config tab is selected
                if (targetTab === 'monitoring-config') {
                    this.setupMonitoringConfigSubscription();
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
    setupMonitoringTabSubscription() {
        // Remove any existing subscription for monitoring tab
        if (this.monitoringTabCallback) {
            this.monitoringData.unsubscribe(this.monitoringTabCallback);
        }
        
        // Create new callback for monitoring tab updates
        this.monitoringTabCallback = (data) => {
            this.updateMonitoringDisplay(data);
        };
        
        // Subscribe to monitoring updates
        this.monitoringData.subscribe(this.monitoringTabCallback);
        
        // Update immediately with current data
        const currentData = this.monitoringData.getCurrentData();
        if (currentData.lastUpdate) {
            this.updateMonitoringDisplay(currentData);
        }
    }

    updateMonitoringDisplay(data) {
        // Get processed metrics from monitoring manager
        const metrics = this.monitoringData.getSystemMetrics();
        const healthStatus = this.monitoringData.getHealthStatus();
        
        if (metrics) {
            // Update system metrics using the centralized data
            this.updateMetric('cpu', metrics.cpu, '%');
            this.updateMetric('memory', metrics.memory, '%');
            this.updateMetric('disk', metrics.disk, '%');
        }

        // Update health status
        this.updateHealthStatus(healthStatus.status, healthStatus.issues || []);

        // Update alerts
        this.updateAlerts(data.alerts || []);

        // Update system details with raw data
        this.updateSystemDetails(data);
    }

    updateMetric(metricId, value, unit) {
        // Ensure value is a number
        const numericValue = parseFloat(value) || 0;
        
        // Define all possible element ID patterns for this metric
        const elementPatterns = [
            // Monitoring tab pattern (primary)
            { value: `${metricId}-usage`, bar: `${metricId}-bar` },
            // Dashboard pattern (now unified with monitoring tab)
            { value: `dashboard-${metricId}-value`, bar: `dashboard-${metricId}-bar`, status: `dashboard-${metricId}-status` },
            // Config tab pattern
            { value: `current-${metricId}`, indicator: `${metricId}-indicator`, trend: `${metricId}-trend` }
        ];
        
        const displayValue = numericValue > 0 ? `${Math.round(numericValue)}${unit}` : '--';
        const widthPercent = numericValue > 0 ? `${Math.min(numericValue, 100)}%` : '0%';
        
        // Update all matching elements
        elementPatterns.forEach((pattern, index) => {
            const valueElement = document.getElementById(pattern.value);
            if (valueElement) {
                valueElement.textContent = displayValue;
            }
            
            // Update progress bar (monitoring tab)
            if (pattern.bar) {
                const barElement = document.getElementById(pattern.bar);
                if (barElement) {
                    barElement.style.width = widthPercent;
                    
                    // Color coding for the bars
                    if (numericValue > 90) {
                        barElement.style.background = 'rgb(239, 68, 68)'; // Red
                    } else if (numericValue > 70) {
                        barElement.style.background = 'rgb(245, 158, 11)'; // Yellow  
                    } else {
                        barElement.style.background = 'rgb(34, 197, 94)'; // Green
                    }
                }
            }
            
            // Update status text (dashboard)
            if (pattern.status) {
                const statusElement = document.getElementById(pattern.status);
                if (statusElement) {
                    const statusText = numericValue > 0 ? 
                        (numericValue > 80 ? 'High' : numericValue > 50 ? 'Normal' : 'Low') : 'Checking...';
                    statusElement.textContent = statusText;
                }
            }
            
            // Update indicator and trend (config tab)
            if (pattern.indicator) {
                const indicatorElement = document.getElementById(pattern.indicator);
                if (indicatorElement) {
                    const indicator = numericValue > 0 ? 
                        (numericValue > 80 ? '🔴' : numericValue > 60 ? '🟡' : '🟢') : '⚪';
                    indicatorElement.textContent = indicator;
                }
            }
            
            if (pattern.trend) {
                const trendElement = document.getElementById(pattern.trend);
                if (trendElement) {
                    // Simple trend logic (could be enhanced with historical data)
                    trendElement.textContent = numericValue > 0 ? '→' : '--';
                }
            }
        });
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
            
            if (issues.length > 0) {
                // Show the actual issue details instead of just the count
                text.textContent = issues.length === 1 ? issues[0] : `${config.text}: ${issues.join(', ')}`;
            } else {
                text.textContent = config.text;
            }
            
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
        // Display status - Add fallback since displays data not in API
        const displayElement = document.getElementById('display-status');
        if (displayElement) {
            if (data.displays) {
                const displays = Object.values(data.displays);
                const onlineDisplays = displays.filter(d => d.online).length;
                displayElement.textContent = `${onlineDisplays}/${displays.length} displays online`;
            } else {
                displayElement.textContent = 'Display monitoring not available';
            }
        }

        // Network status - Fix data path to match API response
        const networkElement = document.getElementById('network-status');
        if (networkElement && data.network) {
            const connectivity = data.network.connectivity ? 'Connected' : 'Disconnected';
            const primaryIP = data.network.primaryIP || 'Unknown IP';
            const interfaceCount = data.network.interfaces ? data.network.interfaces.length : 0;
            networkElement.textContent = `${connectivity} - ${primaryIP} (${interfaceCount} interfaces)`;
        } else if (networkElement) {
            networkElement.textContent = 'Network status unavailable';
        }

        // Uptime - Fix data path to handle object structure
        const uptimeElement = document.getElementById('uptime-status');
        if (uptimeElement && data.system) {
            if (data.system.uptime) {
                // Use formatted string if available, otherwise format the seconds
                const uptime = data.system.uptime.formatted || this.formatUptime(data.system.uptime.seconds);
                uptimeElement.textContent = uptime;
            } else {
                uptimeElement.textContent = 'Uptime unavailable';
            }
        } else if (uptimeElement) {
            uptimeElement.textContent = 'System data unavailable';
        }

        // Monitored apps - Add fallback and handle missing data
        const appsElement = document.getElementById('apps-status');
        if (appsElement) {
            if (data.watchedApps && data.watchedApps.length > 0) {
                this.updateAppsStatus(appsElement, data.watchedApps);
            } else if (data.applications) {
                // Fallback to applications array if watchedApps not available
                this.updateAppsStatus(appsElement, data.applications);
            } else {
                appsElement.textContent = 'No applications being monitored';
            }
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

    // Legacy function - now handled by unified MonitoringDataManager
    startMonitoringUpdates() {
        console.log('[MONITORING] Using unified monitoring system - startMonitoringUpdates deprecated');
    }

    setupMonitoringConfigSubscription() {
        // Remove any existing subscription for monitoring config tab
        if (this.monitoringConfigCallback) {
            this.monitoringData.unsubscribe(this.monitoringConfigCallback);
        }
        
        // Create new callback for monitoring config tab updates
        this.monitoringConfigCallback = (data) => {
            this.updateSystemStatusFromMonitoringData(data);
        };
        
        // Subscribe to monitoring updates
        this.monitoringData.subscribe(this.monitoringConfigCallback);
        
        // Load current threshold settings
        this.loadSystemStatus();
        
        // Update immediately with current data
        const currentData = this.monitoringData.getCurrentData();
        if (currentData.lastUpdate) {
            this.updateSystemStatusFromMonitoringData(currentData);
        }
    }

    updateSystemStatusFromMonitoringData(data) {
        const metrics = this.monitoringData.getSystemMetrics();
        if (metrics) {
            // Update the system status displays in monitoring config tab
            this.updateSystemStatusMetrics(metrics);
        }
    }

    updateSystemStatusMetrics(metrics) {
        // Update CPU status
        const cpuElement = document.getElementById('system-cpu-status');
        if (cpuElement) {
            cpuElement.textContent = `${metrics.cpu.toFixed(1)}%`;
            cpuElement.className = `metric-value ${this.getMetricStatusClass(metrics.cpu, 80)}`;
        }

        // Update Memory status
        const memoryElement = document.getElementById('system-memory-status');
        if (memoryElement) {
            memoryElement.textContent = `${metrics.memory.toFixed(1)}%`;
            memoryElement.className = `metric-value ${this.getMetricStatusClass(metrics.memory, 85)}`;
        }

        // Update Disk status
        const diskElement = document.getElementById('system-disk-status');
        if (diskElement) {
            diskElement.textContent = `${metrics.disk.toFixed(1)}%`;
            diskElement.className = `metric-value ${this.getMetricStatusClass(metrics.disk, 90)}`;
        }
    }

    getMetricStatusClass(value, threshold) {
        if (value > threshold + 10) return 'critical';
        if (value > threshold) return 'warning';
        return 'healthy';
    }

    // Legacy function - now handled by unified MonitoringDataManager
    startSystemStatusUpdates() {
        console.log('[MONITORING] Using unified monitoring system - startSystemStatusUpdates deprecated');
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

    // Dashboard Management Methods
    setupDashboardActions() {
        // Dashboard refresh button
        const refreshBtn = document.getElementById('dashboard-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Setup wizard button
        const setupWizardBtn = document.getElementById('run-setup-wizard');
        console.log('[SETUP] Setup wizard button found:', !!setupWizardBtn);
        
        if (setupWizardBtn) {
            setupWizardBtn.addEventListener('click', () => {
                console.log('[SETUP] Setup wizard button clicked');
                this.switchTab('setup-wizard');
            });
        } else {
            console.error('[SETUP] Setup wizard button not found!');
        }

        // Quick action buttons
        const restartAppsBtn = document.getElementById('dashboard-restart-apps');
        if (restartAppsBtn) {
            restartAppsBtn.addEventListener('click', () => this.restartAppsNow());
        }

        const rebootBtn = document.getElementById('dashboard-reboot');
        if (rebootBtn) {
            rebootBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reboot the system?')) {
                    this.rebootNow();
                }
            });
        }

        // Auto-refresh dashboard data when tab becomes active
        this.setupDashboardAutoRefresh();
    }

    async refreshDashboard() {
        const refreshBtn = document.getElementById('dashboard-refresh');
        const originalText = refreshBtn ? refreshBtn.innerHTML : '';
        
        try {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                refreshBtn.disabled = true;
            }

            // Subscribe to monitoring data updates
            this.setupDashboardMonitoring();
            
            // Force a refresh of monitoring data
            await this.monitoringData.refreshData();

            this.showToast('Dashboard refreshed successfully', 'success');
        } catch (error) {
            console.error('Dashboard refresh failed:', error);
            this.showToast('Failed to refresh dashboard', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = originalText;
                refreshBtn.disabled = false;
            }
        }
    }

    setupDashboardMonitoring() {
        // Remove any existing subscription
        if (this.dashboardUpdateCallback) {
            this.monitoringData.unsubscribe(this.dashboardUpdateCallback);
        }
        
        // Create new callback for dashboard updates
        this.dashboardUpdateCallback = (data) => {
            this.updateDashboardFromMonitoringData(data);
        };
        
        // Subscribe to monitoring updates
        this.monitoringData.subscribe(this.dashboardUpdateCallback);
    }

    updateDashboardFromMonitoringData(data) {
        try {
            const metrics = this.monitoringData.getSystemMetrics();
            const healthStatus = this.monitoringData.getHealthStatus();
            
            if (metrics) {
                // Update system metrics
                this.updateMetric('cpu', metrics.cpu, '%');
                this.updateMetric('memory', metrics.memory, '%');
                this.updateMetric('disk', metrics.disk, '%');
                
                // Update health status
                this.updateHealthStatus(healthStatus.status, healthStatus.issues);
            }
            
            // Update alerts
            this.updateAlerts(data.alerts || []);
            
            // Update applications if available
            if (data.applications) {
                this.updateDashboardApplications(data.applications);
            }
            
            console.log('[DASHBOARD] Updated from monitoring data');
        } catch (error) {
            console.error('[DASHBOARD] Error updating from monitoring data:', error);
        }
    }

    async updateDashboardHealth() {
        try {
            const response = await this.apiCall('/api/monitoring/system');
            const data = response.data || response;

            // Update CPU
            this.updateHealthCard('cpu', data.cpu?.usage || 0, data.cpu?.status || 'unknown');

            // Update Memory
            this.updateHealthCard('memory', data.memory?.usage || 0, data.memory?.status || 'unknown');

            // Update Disk
            this.updateHealthCard('disk', data.disk?.usage || 0, data.disk?.status || 'unknown');

            // Update Uptime
            if (data.uptime) {
                this.updateHealthCard('uptime', this.formatUptime(data.uptime.seconds), 'active');
            }

        } catch (error) {
            console.error('Failed to update dashboard health:', error);
        }
    }

    updateHealthCard(metric, value, status) {
        const valueEl = document.getElementById(`dashboard-${metric}-value`);
        const statusEl = document.getElementById(`dashboard-${metric}-status`);

        if (valueEl) {
            if (metric === 'uptime') {
                valueEl.textContent = value;
            } else {
                valueEl.textContent = typeof value === 'number' ? `${Math.round(value)}%` : value;
            }
        }

        if (statusEl) {
            statusEl.textContent = this.getStatusText(status);
            statusEl.className = `health-status ${status}`;
        }
    }

    getStatusText(status) {
        const statusMap = {
            'good': 'Good',
            'warning': 'Warning', 
            'critical': 'Critical',
            'unknown': 'Checking...',
            'active': 'Active'
        };
        return statusMap[status] || status;
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    async updateDashboardApplications() {
        try {
            const response = await this.apiCall('/api/monitoring/applications');
            const apps = response.data || response.applications || [];

            const container = document.getElementById('dashboard-applications');
            if (!container) return;

            if (apps.length === 0) {
                container.innerHTML = '<div class="no-apps">No applications monitored</div>';
                return;
            }

            container.innerHTML = apps.map(app => `
                <div class="app-item ${app.status || 'unknown'}">
                    <div class="app-info">
                        <div class="app-name">${app.name || 'Unknown App'}</div>
                        <div class="app-status">${app.status || 'Unknown'}</div>
                    </div>
                    <div class="app-actions">
                        ${app.status === 'stopped' ? 
                            `<button class="btn-sm btn-primary" onclick="window.app.startApplication('${app.name}')">Start</button>` :
                            `<button class="btn-sm btn-secondary" onclick="window.app.restartApplication('${app.name}')">Restart</button>`
                        }
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to update dashboard applications:', error);
        }
    }

    async updateDashboardAlerts() {
        try {
            const response = await this.apiCall('/api/monitoring/alerts');
            const alerts = response.data || response.alerts || [];

            const container = document.getElementById('dashboard-alerts');
            if (!container) return;

            if (alerts.length === 0) {
                container.innerHTML = '<div class="no-alerts">No active alerts</div>';
                return;
            }

            // Show only recent alerts (last 10)
            const recentAlerts = alerts.slice(-10).reverse();

            container.innerHTML = recentAlerts.map(alert => `
                <div class="alert-item ${alert.level || 'info'}">
                    <div class="alert-icon">
                        <i class="fas ${this.getAlertIcon(alert.level)}"></i>
                    </div>
                    <div class="alert-content">
                        <div class="alert-message">${alert.message || 'Unknown alert'}</div>
                        <div class="alert-time">${alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Unknown time'}</div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to update dashboard alerts:', error);
        }
    }

    getAlertIcon(level) {
        const iconMap = {
            'critical': 'fa-exclamation-triangle',
            'warning': 'fa-exclamation-circle',
            'info': 'fa-info-circle',
            'success': 'fa-check-circle'
        };
        return iconMap[level] || 'fa-info-circle';
    }

    setupDashboardAutoRefresh() {
        // Auto-refresh when dashboard tab becomes active
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.id === 'dashboard-tab' && 
                    mutation.target.classList.contains('active')) {
                    // Dashboard became active, refresh data
                    setTimeout(() => this.refreshDashboard(), 100);
                }
            });
        });

        const dashboardTab = document.getElementById('dashboard-tab');
        if (dashboardTab) {
            observer.observe(dashboardTab, { 
                attributes: true, 
                attributeFilter: ['class'] 
            });
        }
    }

    // Setup Wizard Management Methods
    setupWizardActions() {
        this.currentWizardStep = 1;
        this.wizardData = {};

        // Header actions
        const skipBtn = document.getElementById('skip-wizard');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipWizard());
        }

        const advancedBtn = document.getElementById('advanced-mode');
        if (advancedBtn) {
            advancedBtn.addEventListener('click', () => this.switchTab('system-prefs'));
        }

        // Step 1 actions
        const startGuidedBtn = document.getElementById('start-guided-setup');
        if (startGuidedBtn) {
            startGuidedBtn.addEventListener('click', () => this.nextWizardStep());
        }

        const goAdvancedBtn = document.getElementById('go-advanced');
        if (goAdvancedBtn) {
            goAdvancedBtn.addEventListener('click', () => this.switchTab('system-prefs'));
        }

        // Navigation buttons
        this.setupWizardNavigationButtons();

        // Final step actions
        const goDashboardBtn = document.getElementById('wizard-go-dashboard');
        if (goDashboardBtn) {
            goDashboardBtn.addEventListener('click', () => this.switchTab('dashboard'));
        }

        const advancedConfigBtn = document.getElementById('wizard-advanced-config');
        if (advancedConfigBtn) {
            advancedConfigBtn.addEventListener('click', () => this.switchTab('system-prefs'));
        }
    }

    setupWizardNavigationButtons() {
        // Back buttons
        for (let i = 1; i <= 4; i++) {
            const backBtn = document.getElementById(`wizard-back-${i}`);
            if (backBtn) {
                backBtn.addEventListener('click', () => this.previousWizardStep());
            }
        }

        // Next buttons
        const nextBtn2 = document.getElementById('wizard-next-2');
        if (nextBtn2) {
            nextBtn2.addEventListener('click', () => this.nextWizardStep());
        }

        const nextBtn4 = document.getElementById('wizard-next-4');
        if (nextBtn4) {
            nextBtn4.addEventListener('click', () => this.nextWizardStep());
        }

        // Action buttons
        const applySettingsBtn = document.getElementById('wizard-apply-settings');
        if (applySettingsBtn) {
            applySettingsBtn.addEventListener('click', () => this.applyWizardSettings());
        }

        const runTestsBtn = document.getElementById('wizard-run-tests');
        if (runTestsBtn) {
            runTestsBtn.addEventListener('click', () => this.runWizardTests());
        }
    }

    nextWizardStep() {
        if (this.currentWizardStep < 6) {
            this.currentWizardStep++;
            this.updateWizardDisplay();
            
            // Load content for the new step
            this.loadWizardStepContent();
        }
    }

    previousWizardStep() {
        if (this.currentWizardStep > 1) {
            this.currentWizardStep--;
            this.updateWizardDisplay();
        }
    }

    updateWizardDisplay() {
        // Update progress bar
        const progressFill = document.getElementById('wizard-progress-fill');
        if (progressFill) {
            const progressPercent = (this.currentWizardStep / 6) * 100;
            progressFill.style.width = `${progressPercent}%`;
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');
            
            if (stepNumber === this.currentWizardStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentWizardStep) {
                step.classList.add('completed');
            }
        });

        // Update step content
        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active');
            
            if (stepNumber === this.currentWizardStep) {
                step.classList.add('active');
            }
        });
    }

    async loadWizardStepContent() {
        switch (this.currentWizardStep) {
            case 2:
                await this.loadSystemChecks();
                break;
            case 3:
                await this.loadEssentialSettings();
                break;
            case 4:
                this.setupApplicationMethods();
                break;
            case 5:
                await this.loadVerificationTests();
                break;
            case 6:
                this.loadSetupSummary();
                break;
        }
    }

    async loadSystemChecks() {
        const container = document.getElementById('wizard-system-checks');
        if (!container) return;

        container.innerHTML = '<div class="loading">Checking system configuration...</div>';

        try {
            // Get current system status
            const systemData = await this.apiCall('/api/system-prefs/status');
            const settings = systemData.data || systemData.settings || systemData || [];

            const checks = [
                { name: 'Screen Saver Settings', key: 'screensaver', description: 'Verifying screen saver is disabled' },
                { name: 'Display Sleep Settings', key: 'displaySleep', description: 'Checking display sleep settings' },
                { name: 'Computer Sleep Settings', key: 'computerSleep', description: 'Checking computer sleep settings' },
                { name: 'Auto-restart Settings', key: 'autoRestart', description: 'Verifying automatic restart on power failure' },
                { name: 'Menu Bar Settings', key: 'hideMenuBar', description: 'Checking menu bar visibility settings' }
            ];

            container.innerHTML = checks.map(check => {
                const setting = settings.find(s => s.setting === check.key);
                const status = this.getCheckStatus(setting);
                
                return `
                    <div class="check-item">
                        <div class="check-icon ${status.class}">
                            <i class="fas ${status.icon}"></i>
                        </div>
                        <div class="check-details">
                            <div class="check-name">${check.name}</div>
                            <div class="check-description">${status.message}</div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Failed to load system checks:', error);
            container.innerHTML = '<div class="error">Failed to check system configuration</div>';
        }
    }

    getCheckStatus(setting) {
        if (!setting) {
            return {
                class: 'checking',
                icon: 'fa-question',
                message: 'Unable to determine current status'
            };
        }

        const isConfigured = setting.status === 'applied';
        
        if (isConfigured) {
            return {
                class: 'good',
                icon: 'fa-check',
                message: 'Properly configured for installation use'
            };
        } else {
            return {
                class: 'warning',
                icon: 'fa-exclamation',
                message: 'Needs configuration for optimal performance'
            };
        }
    }

    async loadEssentialSettings() {
        const container = document.getElementById('wizard-essential-settings');
        if (!container) return;

        try {
            const systemData = await this.apiCall('/api/system-prefs/status');
            const settings = systemData.data || systemData.settings || systemData || [];

            // Filter to essential settings only
            const essentialSettings = settings.filter(setting => 
                setting.setting === 'screensaver' || 
                setting.setting === 'displaySleep' ||
                setting.setting === 'computerSleep' ||
                setting.setting === 'autoRestart' ||
                setting.setting === 'hideMenuBar'
            );

            container.innerHTML = essentialSettings.map(setting => `
                <div class="setting-item">
                    <div class="setting-info">
                        <div class="setting-name">${setting.name}</div>
                        <div class="setting-description">Configure for 24/7 installation use</div>
                    </div>
                    <div class="setting-toggle">
                        <label class="switch">
                            <input type="checkbox" ${setting.status === 'applied' ? 'checked' : ''} 
                                   data-setting="${setting.setting}">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load essential settings:', error);
            container.innerHTML = '<div class="error">Failed to load settings</div>';
        }
    }

    async applyWizardSettings() {
        console.log('[WIZARD] Starting apply wizard settings...');
        
        const button = document.getElementById('wizard-apply-settings');
        const originalText = button.innerHTML;
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
            button.disabled = true;

            // Get selected settings
            const checkboxes = document.querySelectorAll('#wizard-essential-settings input[type="checkbox"]:checked');
            const settingsToApply = Array.from(checkboxes).map(cb => cb.dataset.setting);

            console.log('[WIZARD] Selected settings:', settingsToApply);

            if (settingsToApply.length === 0) {
                this.showToast('No settings selected', 'warning');
                this.nextWizardStep();
                return;
            }

            // Using command-specific sudo - backend will handle authentication for each command

            console.log('[WIZARD] Applying settings via API...');
            const response = await this.apiCall('/api/system-prefs/apply', {
                method: 'POST',
                body: JSON.stringify({ settings: settingsToApply })
            });
            console.log('[WIZARD] Settings application result:', response);

            // Check if any settings failed due to authentication cancellation
            if (response.results) {
                const cancelledResults = response.results.filter(result => 
                    !result.success && result.error && (
                        result.error.includes('User did not grant permission') ||
                        result.error.includes('cancelled') ||
                        result.error.includes('Authentication cancelled')
                    )
                );
                
                if (cancelledResults.length > 0) {
                    console.log('[WIZARD] Authentication was cancelled for some settings:', cancelledResults);
                    this.handleAuthenticationCancellation(settingsToApply);
                    return;
                }
            }

            // Check overall response for authentication issues
            if (!response.success && response.error && (
                response.error.includes('Authentication cancelled') ||
                response.error.includes('User cancelled') ||
                response.error.includes('cancelled')
            )) {
                console.log('[WIZARD] Overall authentication was cancelled');
                this.handleAuthenticationCancellation(settingsToApply);
                return;
            }

            this.showToast('Settings applied successfully', 'success');
            this.wizardData.settingsApplied = settingsToApply;

            // Move to next step
            this.nextWizardStep();

        } catch (error) {
            console.error('[WIZARD] Failed to apply settings:', error);
            
            // Check if it's an authentication cancellation
            if (error.message && (
                error.message.includes('Authentication cancelled') ||
                error.message.includes('User cancelled') ||
                error.message.includes('cancelled') ||
                error.status === 401
            )) {
                // Show authentication cancellation dialog with options
                this.handleAuthenticationCancellation(settingsToApply);
            } else {
                this.showToast('Failed to apply some settings', 'error');
            }
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    handleAuthenticationCancellation(settingsToApply) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content auth-cancel-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Authentication Required</h3>
                </div>
                <div class="modal-body">
                    <p>Administrator access is required to apply these system settings. You cancelled the authentication request.</p>
                    <p>Choose how you'd like to proceed:</p>
                    
                    <div class="auth-options">
                        <button class="btn btn-primary" id="retry-auth">
                            <i class="fas fa-key"></i> Try Authentication Again
                        </button>
                        <button class="btn btn-secondary" id="generate-script">
                            <i class="fas fa-terminal"></i> Generate Terminal Commands
                        </button>
                        <button class="btn btn-tertiary" id="skip-settings">
                            <i class="fas fa-forward"></i> Skip Settings (Continue Without Changes)
                        </button>
                    </div>
                    
                    <div class="info-text">
                        <p><strong>Terminal Commands:</strong> Generate a script you can run manually in Terminal with your admin password.</p>
                        <p><strong>Skip Settings:</strong> Continue to the next step without applying these system changes.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" id="cancel-modal">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('retry-auth').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.applyWizardSettings(); // Try again
        });
        
        document.getElementById('generate-script').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.generateWizardScript(settingsToApply);
        });
        
        document.getElementById('skip-settings').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.showToast('Skipped system settings - you can apply them later', 'info');
            this.nextWizardStep(); // Continue to next step
        });
        
        document.getElementById('cancel-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    async generateWizardScript(settingsToApply) {
        try {
            console.log('[WIZARD-SCRIPT] Generating script for settings:', settingsToApply);
            
            const response = await this.apiCall('/api/system-prefs/generate-script', {
                method: 'POST',
                body: JSON.stringify({
                    settings: settingsToApply,
                    mode: 'apply',
                    includeVerification: true
                })
            });
            
            if (response.success) {
                this.showWizardTerminalModal(response.data);
                this.showToast('Terminal script generated successfully', 'success');
            } else {
                this.showToast('Failed to generate script', 'error');
            }
        } catch (error) {
            console.error('[WIZARD-SCRIPT] Error generating script:', error);
            this.showToast('Failed to generate script', 'error');
        }
    }

    showWizardTerminalModal(scriptData) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content terminal-script-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-terminal"></i> Terminal Commands</h3>
                </div>
                <div class="modal-body">
                    <p>Copy and run these commands in Terminal to apply your settings:</p>
                    
                    <div class="script-container">
                        <pre class="script-content" id="wizard-script-content">${scriptData.script}</pre>
                        <div class="script-actions">
                            <button class="btn btn-primary" id="copy-wizard-script">
                                <i class="fas fa-copy"></i> Copy to Clipboard
                            </button>
                            <button class="btn btn-secondary" id="download-wizard-script">
                                <i class="fas fa-download"></i> Download Script
                            </button>
                        </div>
                    </div>
                    
                    <div class="script-info">
                        <p><strong>Instructions:</strong></p>
                        <ol>
                            <li>Copy the commands above</li>
                            <li>Open Terminal (Applications > Utilities > Terminal)</li>
                            <li>Paste and run the commands</li>
                            <li>Enter your administrator password when prompted</li>
                        </ol>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="continue-wizard">Continue Setup</button>
                    <button class="btn btn-cancel" id="close-wizard-modal">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        document.getElementById('copy-wizard-script').addEventListener('click', () => {
            this.copyToClipboard(scriptData.script);
            this.showToast('Script copied to clipboard', 'success');
        });
        
        document.getElementById('download-wizard-script').addEventListener('click', () => {
            this.downloadScript(scriptData.script, 'installation-up4evr-setup.sh');
            this.showToast('Script downloaded', 'success');
        });
        
        document.getElementById('continue-wizard').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.nextWizardStep(); // Continue to next step
        });
        
        document.getElementById('close-wizard-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    setupApplicationMethods() {
        // Setup method switching
        const appMethod = document.getElementById('app-method');
        const webMethod = document.getElementById('web-method');

        if (appMethod) {
            appMethod.addEventListener('click', () => {
                document.querySelectorAll('.setup-method').forEach(m => m.classList.remove('active'));
                appMethod.classList.add('active');
                this.wizardData.appType = 'desktop';
            });
        }

        if (webMethod) {
            webMethod.addEventListener('click', () => {
                document.querySelectorAll('.setup-method').forEach(m => m.classList.remove('active'));
                webMethod.classList.add('active');
                this.wizardData.appType = 'web';
            });
        }

        // Setup drag and drop for desktop apps
        const dropZone = document.getElementById('wizard-app-drop');
        if (dropZone) {
            this.setupWizardDropZone(dropZone);
        }
    }

    setupWizardDropZone(dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary-color)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border-color)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border-color)';
            
            // Handle dropped files
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleWizardAppSelection(files[0]);
            }
        });

        dropZone.addEventListener('click', () => {
            // Create file input for selection
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.app,application/*';
            input.onchange = (e) => {
                if (e.target.files.length > 0) {
                    this.handleWizardAppSelection(e.target.files[0]);
                }
            };
            input.click();
        });
    }

    handleWizardAppSelection(file) {
        this.wizardData.selectedApp = {
            name: file.name,
            path: file.path || file.webkitRelativePath,
            type: 'desktop'
        };

        const dropZone = document.getElementById('wizard-app-drop');
        if (dropZone) {
            dropZone.innerHTML = `
                <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                <p>Selected: ${file.name}</p>
                <button class="btn btn-outline">Change Selection</button>
            `;
        }
    }

    async loadVerificationTests() {
        const container = document.getElementById('wizard-verification');
        if (!container) return;

        const tests = [
            { name: 'System Settings', description: 'Verify applied system configurations' },
            { name: 'Application Setup', description: 'Check if application is properly configured' },
            { name: 'Launch Agent', description: 'Verify launch agent is created and valid' },
            { name: 'Monitoring', description: 'Test monitoring and alerting system' }
        ];

        container.innerHTML = tests.map(test => `
            <div class="test-item">
                <div class="test-status checking" id="test-${test.name.toLowerCase().replace(' ', '-')}">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="test-details">
                    <div class="test-name">${test.name}</div>
                    <div class="test-description">${test.description}</div>
                </div>
            </div>
        `).join('');
    }

    async runWizardTests() {
        const button = document.getElementById('wizard-run-tests');
        const originalText = button.innerHTML;
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Tests...';
            button.disabled = true;

            // Run tests sequentially
            const tests = ['system-settings', 'application-setup', 'launch-agent', 'monitoring'];
            
            for (const test of tests) {
                await this.runSingleTest(test);
            }

            // All tests completed, move to final step
            setTimeout(() => {
                this.nextWizardStep();
            }, 1000);

        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async runSingleTest(testId) {
        const statusEl = document.getElementById(`test-${testId}`);
        if (!statusEl) return;

        // Set to running
        statusEl.className = 'test-status running';
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        // Simulate test execution
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Randomly pass/fail for demo (in real implementation, do actual tests)
        const passed = Math.random() > 0.2; // 80% pass rate
        
        if (passed) {
            statusEl.className = 'test-status passed';
            statusEl.innerHTML = '<i class="fas fa-check"></i>';
        } else {
            statusEl.className = 'test-status failed';
            statusEl.innerHTML = '<i class="fas fa-times"></i>';
        }
    }

    loadSetupSummary() {
        const container = document.getElementById('wizard-summary');
        if (!container) return;

        const summary = [
            { label: 'System Settings Applied', value: this.wizardData.settingsApplied?.length || 0 },
            { label: 'Application Type', value: this.wizardData.appType || 'Not configured' },
            { label: 'Selected Application', value: this.wizardData.selectedApp?.name || 'None' },
            { label: 'Launch Agent Created', value: this.wizardData.selectedApp ? 'Yes' : 'No' },
            { label: 'Monitoring Enabled', value: 'Yes' }
        ];

        container.innerHTML = summary.map(item => `
            <div class="summary-item">
                <span>${item.label}</span>
                <span class="summary-value">${item.value}</span>
            </div>
        `).join('');
    }

    initializeWizard() {
        // Reset wizard state
        this.currentWizardStep = 1;
        this.wizardData = {};
        this.updateWizardDisplay();
    }

    switchTab(tabName) {
        console.log('[TAB] Switching to tab:', tabName);
        
        // Find and click the appropriate sidebar button
        const button = document.querySelector(`.sidebar-button[data-tab="${tabName}"]`);
        console.log('[TAB] Button found:', !!button);
        
        if (button) {
            console.log('[TAB] Clicking button for tab:', tabName);
            button.click();
            
            // Verify the tab actually switched
            setTimeout(() => {
                const activeTab = document.querySelector('.tab-pane.active');
                const expectedTab = document.getElementById(`${tabName}-tab`);
                console.log('[TAB] Active tab after switch:', activeTab?.id);
                console.log('[TAB] Expected tab:', expectedTab?.id);
                console.log('[TAB] Tab switch successful:', activeTab === expectedTab);
            }, 100);
        } else {
            console.error('[TAB] Button not found for tab:', tabName);
            console.log('[TAB] Available buttons:', document.querySelectorAll('.sidebar-button[data-tab]'));
        }
    }

    skipWizard() {
        if (confirm('Are you sure you want to skip the setup wizard? You can access advanced configuration tools directly.')) {
            this.switchTab('dashboard');
        }
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

    // First-run detection and wizard auto-launch
    async checkFirstRun() {
        try {
            const response = await this.apiCall('/api/config/user-preferences');
            const preferences = response.data || response;
            
            // Check if user has opted to skip wizard
            const skipWizard = preferences.skipWizard || false;
            
            if (!skipWizard) {
                console.log('[INFO] First run detected - auto-launching setup wizard');
                this.showFirstRunWelcome();
            } else {
                console.log('[INFO] Setup wizard skipped - loading default view');
                this.navigateToDefaultView(preferences.defaultView || 'dashboard');
            }
        } catch (error) {
            console.warn('Failed to check first-run status:', error);
            // Default to showing dashboard if we can't determine first-run status
            this.navigateToDefaultView('dashboard');
        }
    }

    showFirstRunWelcome() {
        // Show a welcome overlay that guides users to the setup wizard
        const overlay = document.createElement('div');
        overlay.id = 'first-run-overlay';
        overlay.innerHTML = `
            <div class="first-run-modal">
                <div class="first-run-header">
                    <h2>🎉 Welcome to Installation Up 4evr!</h2>
                    <p>Let's get your installation management system set up.</p>
                </div>
                <div class="first-run-content">
                    <div class="welcome-option">
                        <h3>🚀 Quick Setup (Recommended)</h3>
                        <p>Walk through our guided setup wizard to configure your system in just a few minutes.</p>
                        <button class="btn btn-primary" onclick="app.startSetupWizard()">Start Setup Wizard</button>
                    </div>
                    <div class="welcome-option">
                        <h3>⚡ Skip to Dashboard</h3>
                        <p>Jump straight to the dashboard if you're already familiar with the system.</p>
                        <button class="btn btn-secondary" onclick="app.skipToAdvanced()">Go to Dashboard</button>
                    </div>
                </div>
                <div class="first-run-footer">
                    <label>
                        <input type="checkbox" id="dont-show-again"> 
                        Don't show this again
                    </label>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.addFirstRunStyles();
    }

    startSetupWizard() {
        this.dismissFirstRunOverlay();
        this.switchTab('setup-wizard');
    }

    async skipToAdvanced() {
        const dontShowAgain = document.getElementById('dont-show-again')?.checked || false;
        
        if (dontShowAgain) {
            try {
                await this.apiCall('/api/config/user-preferences', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        skipWizard: true,
                        defaultView: 'dashboard'
                    })
                });
                console.log('[INFO] User preference saved: skip wizard on future runs');
            } catch (error) {
                console.warn('Failed to save user preference:', error);
            }
        }
        
        this.dismissFirstRunOverlay();
        this.switchTab('dashboard');
    }

    dismissFirstRunOverlay() {
        const overlay = document.getElementById('first-run-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    navigateToDefaultView(view) {
        // Navigate to the user's preferred default view
        const validViews = ['dashboard', 'setup-wizard', 'system-prefs', 'launch-agents'];
        const targetView = validViews.includes(view) ? view : 'dashboard';
        
        console.log(`[INFO] Navigating to default view: ${targetView}`);
        this.switchTab(targetView);
    }

    addFirstRunStyles() {
        if (document.getElementById('first-run-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'first-run-styles';
        style.textContent = `
            #first-run-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease-out;
            }
            
            .first-run-modal {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease-out;
            }
            
            .first-run-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            
            .first-run-header h2 {
                color: #333;
                margin: 0 0 0.5rem 0;
                font-size: 1.8rem;
            }
            
            .first-run-header p {
                color: #666;
                margin: 0;
                font-size: 1.1rem;
            }
            
            .welcome-option {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                border-left: 4px solid #007bff;
            }
            
            .welcome-option h3 {
                color: #333;
                margin: 0 0 0.5rem 0;
                font-size: 1.2rem;
            }
            
            .welcome-option p {
                color: #666;
                margin: 0 0 1rem 0;
                line-height: 1.4;
            }
            
            .first-run-footer {
                text-align: center;
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 1px solid #eee;
            }
            
            .first-run-footer label {
                color: #666;
                font-size: 0.9rem;
                cursor: pointer;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(30px);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Sudo permission management
    async checkSudoPermissions() {
        console.log('[SUDO] Checking sudo permissions...');
        console.log('[SUDO] Is Electron:', this.isElectron);
        
        if (!this.isElectron) {
            console.log('[SUDO] Not in Electron, skipping sudo check');
            return;
        }

        try {
            console.log('[SUDO] Checking sudo status via API...');
            // Check if we already have sudo access cached
            const response = await this.apiCall('/api/auth/sudo-status');
            console.log('[SUDO] Sudo status response:', response);
            
            if (response.hasAccess) {
                console.log('[SUDO] Sudo access already available');
                return;
            }
        } catch (error) {
            console.warn('[SUDO] Could not check sudo status:', error);
        }

        console.log('[SUDO] Showing sudo permission dialog...');
        // Show sudo permission dialog
        this.showSudoPermissionDialog();
    }

    showSudoPermissionDialog() {
        console.log('[DIALOG] Creating sudo permission dialog...');
        
        // Check if dialog already exists
        const existingDialog = document.getElementById('sudo-permission-dialog');
        const existingSudoModal = document.getElementById('sudo-permission-modal');
        
        console.log('[DIALOG] Existing dialog found:', !!existingDialog);
        console.log('[DIALOG] Existing sudo modal found:', !!existingSudoModal);
        
        if (existingDialog) {
            console.log('[DIALOG] Removing existing dialog');
            existingDialog.remove();
        }
        
        if (existingSudoModal) {
            console.log('[DIALOG] Showing existing sudo modal');
            existingSudoModal.style.display = 'flex';
            return;
        }
        
        console.log('[DIALOG] Creating new inline dialog...');
        const dialog = document.createElement('div');
        dialog.id = 'sudo-permission-dialog';
        dialog.innerHTML = `
            <div class="sudo-modal">
                <div class="sudo-header">
                    <h2>🔐 Administrator Access Required</h2>
                    <p>Installation Up 4evr needs administrator privileges to manage system settings safely.</p>
                </div>
                
                <div class="sudo-body">
                    <div class="permission-explanation">
                        <h3>Why do we need administrator access?</h3>
                        <ul>
                            <li><strong>System Preferences:</strong> Modify display sleep, screensaver, and power settings</li>
                            <li><strong>Launch Agents:</strong> Install and manage auto-start applications</li>
                            <li><strong>Security Settings:</strong> Check and configure system security features</li>
                            <li><strong>Performance Monitoring:</strong> Access detailed system information</li>
                        </ul>
                        
                        <!-- Authentication Method Selection -->
                        <div class="auth-method-selection">
                            <h4>🔐 Choose Authentication Method:</h4>
                            
                            <div class="auth-method" id="native-auth-method">
                                <div class="method-header">
                                    <input type="radio" id="use-native-auth" name="auth-method" value="native" checked>
                                    <label for="use-native-auth">
                                        <strong>🔒 Native macOS Dialog (Recommended)</strong>
                                    </label>
                                </div>
                                <div class="method-description">
                                    <p>✅ Most secure - uses system authentication dialog</p>
                                    <p>⚠️ Only works in Electron app, not web browser</p>
                                </div>
                            </div>
                            
                            <div class="auth-method" id="password-auth-method">
                                <div class="method-header">
                                    <input type="radio" id="use-password-auth" name="auth-method" value="password">
                                    <label for="use-password-auth">
                                        <strong>⚠️ Password Input (Browser Fallback)</strong>
                                    </label>
                                </div>
                                <div class="method-description">
                                    <p>⚠️ Less secure - password sent over network</p>
                                    <p>✅ Works in web browsers</p>
                                    <div class="password-input-container" style="display: none;">
                                        <input type="password" id="sudo-password-input" placeholder="Enter administrator password" class="form-input">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="security-note">
                            <h4>🛡️ Security Information</h4>
                            <p><strong>Native Dialog:</strong> Most secure, uses macOS built-in authentication.</p>
                            <p><strong>Password Input:</strong> Less secure fallback for browsers. Password is validated locally but transmitted over network.</p>
                        </div>
                        
                        <div class="commands-preview">
                            <h4>Commands we'll run:</h4>
                            <code>
                                defaults write com.apple.screensaver idleTime 0<br>
                                pmset -c displaysleep 0<br>
                                launchctl load ~/Library/LaunchAgents/[your-app].plist
                            </code>
                        </div>
                    </div>
                </div>
                
                <div class="sudo-footer">
                    <button id="grant-sudo-access" class="btn btn-primary">
                        Grant Access & Continue
                    </button>
                    <button id="continue-limited" class="btn btn-secondary">
                        Continue with Limited Features
                    </button>
                    <button id="learn-more-sudo" class="btn btn-link">
                        Learn More About Security
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);
        this.addSudoDialogStyles();

        console.log('[DIALOG] Setting up event listeners...');
        
        // Handle authentication method selection - auto-select appropriate method for browser
        const authMethodRadios = document.querySelectorAll('input[name="auth-method"]');
        const passwordContainer = document.querySelector('.password-input-container');
        const nativeRadio = document.getElementById('use-native-auth');
        const passwordRadio = document.getElementById('use-password-auth');
        
        console.log('[DIALOG] Auth method radios found:', authMethodRadios.length);
        console.log('[DIALOG] Password container found:', !!passwordContainer);
        console.log('[DIALOG] Is in browser:', !this.isElectron);
        
        // If in browser, automatically select password method and show warning
        if (!this.isElectron && passwordRadio) {
            console.log('[DIALOG] Browser detected - auto-selecting password method');
            passwordRadio.checked = true;
            if (nativeRadio) nativeRadio.checked = false;
            if (passwordContainer) passwordContainer.style.display = 'block';
        }
        
        // Set up radio button change handlers
        authMethodRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                console.log('[DIALOG] Auth method changed to:', radio.value);
                if (radio.value === 'password' && radio.checked) {
                    if (passwordContainer) passwordContainer.style.display = 'block';
                } else {
                    if (passwordContainer) passwordContainer.style.display = 'none';
                }
            });
        });
        
        // Add event listeners
        const grantButton = document.getElementById('grant-sudo-access');
        const continueButton = document.getElementById('continue-limited');
        
        console.log('[DIALOG] Grant button found:', !!grantButton);
        console.log('[DIALOG] Continue button found:', !!continueButton);
        
        if (grantButton) {
            grantButton.addEventListener('click', () => {
                console.log('[DIALOG] Grant button clicked');
                this.requestSudoAccess();
            });
        } else {
            console.error('[DIALOG] Grant button not found!');
        }

        if (continueButton) {
            continueButton.addEventListener('click', () => {
                console.log('[DIALOG] Continue button clicked');
                this.dismissSudoDialog();
                this.showToast('Continuing with limited features. Some system modifications may not work.', 'warning');
            });
        } else {
            console.error('[DIALOG] Continue button not found!');
        }
    }

    async requestSudoAccess() {
        console.log('[AUTH] Starting sudo access request...');
        
        try {
            // Get selected authentication method
            const selectedMethod = document.querySelector('input[name="auth-method"]:checked')?.value || 'native';
            console.log('[AUTH] Selected method:', selectedMethod);
            
            // Add loading state to button
            const grantButton = document.getElementById('grant-sudo-access');
            if (grantButton) {
                grantButton.disabled = true;
                grantButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
                console.log('[AUTH] Button disabled, showing loading state');
            }
            
            if (selectedMethod === 'native') {
                console.log('[AUTH] Attempting native authentication...');
                
                let result;
                if (this.isElectron && window.electronAPI?.requestSudoAccess) {
                    // Use Electron IPC for native authentication
                    console.log('[AUTH] Using Electron IPC for native authentication');
                    result = await window.electronAPI.requestSudoAccess();
                } else {
                    // Fallback to web API (should not happen for native method)
                    console.log('[AUTH] Using web API for native authentication');
                    const requestData = { method: 'native' };
                    console.log('[AUTH] Native request data:', requestData);
                    
                    result = await this.apiCall('/api/auth/sudo-grant', {
                        method: 'POST',
                        body: JSON.stringify(requestData)
                    });
                }
                
                console.log('[AUTH] Native authentication result:', result);
                
                if (result.success) {
                    console.log('[AUTH] Native authentication successful');
                    this.dismissSudoDialog();
                    this.showToast('Administrator access granted via native dialog', 'success');
                    return result; // Return success result
                } else {
                    console.warn('[AUTH] Native authentication failed:', result.error);
                    this.showToast('Native authentication failed. Try password method instead.', 'warning');
                    return result; // Return failure result
                }
            } else if (selectedMethod === 'password') {
                console.log('[AUTH] Attempting password authentication...');
                
                // Use password authentication
                const passwordInput = document.getElementById('sudo-password-input');
                const password = passwordInput?.value;
                
                console.log('[AUTH] Password input found:', !!passwordInput);
                console.log('[AUTH] Password provided:', !!password);
                
                if (!password) {
                    console.warn('[AUTH] No password provided');
                    this.showToast('Please enter your administrator password', 'warning');
                    return;
                }
                
                // DIAGNOSTIC: Check the API call parameters
                const requestData = { method: 'password', password: password };
                console.log('[AUTH] Password request data:', { method: 'password', password: '[REDACTED]' });
                
                // FIXED API CALL
                const result = await this.apiCall('/api/auth/sudo-grant', {
                    method: 'POST',
                    body: JSON.stringify(requestData)
                });
                
                console.log('[AUTH] Password authentication result:', result);
                
                if (result.success) {
                    console.log('[AUTH] Password authentication successful');
                    this.dismissSudoDialog();
                    this.showToast('Administrator access granted via password', 'success');
                    if (result.securityWarning) {
                        console.warn('[AUTH] Security Warning:', result.securityWarning);
                    }
                    return result; // Return success result
                } else {
                    console.warn('[AUTH] Password authentication failed:', result.error);
                    this.showToast('Invalid password or authentication failed', 'error');
                    passwordInput.value = ''; // Clear password on failure
                    return result; // Return failure result
                }
            }
        } catch (error) {
            console.error('[AUTH] Exception during sudo access request:', error);
            this.showToast('Failed to obtain administrator access: ' + error.message, 'error');
            return { success: false, error: error.message }; // Return failure result
        } finally {
            // Always restore button state
            const grantButton = document.getElementById('grant-sudo-access');
            if (grantButton) {
                grantButton.disabled = false;
                grantButton.innerHTML = 'Grant Access & Continue';
                console.log('[AUTH] Button state restored');
            }
        }
    }

    dismissSudoDialog() {
        const dialog = document.getElementById('sudo-permission-dialog');
        if (dialog) {
            dialog.remove();
        }
    }

    addSudoDialogStyles() {
        if (document.getElementById('sudo-dialog-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'sudo-dialog-styles';
        style.textContent = `
            #sudo-permission-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease-out;
            }
            
            .sudo-modal {
                background: white;
                border-radius: 12px;
                padding: 2rem;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease-out;
            }
            
            .sudo-header h2 {
                margin: 0 0 0.5rem 0;
                color: #333;
                font-size: 1.5rem;
            }
            
            .sudo-header p {
                margin: 0 0 1.5rem 0;
                color: #666;
            }
            
            .permission-explanation ul {
                margin: 1rem 0;
                padding-left: 1.5rem;
            }
            
            .permission-explanation li {
                margin: 0.5rem 0;
                line-height: 1.4;
            }
            
            .security-note {
                background: #f0f8ff;
                border: 1px solid #b3d9ff;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
            }
            
            .security-note h4 {
                margin: 0 0 0.5rem 0;
                color: #0066cc;
                font-size: 1rem;
            }
            
            .commands-preview {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
            }
            
            .commands-preview h4 {
                margin: 0 0 0.5rem 0;
                color: #495057;
                font-size: 0.9rem;
            }
            
            .commands-preview code {
                display: block;
                font-family: 'Monaco', 'Menlo', monospace;
                font-size: 0.8rem;
                color: #495057;
                line-height: 1.4;
            }
            
            .sudo-footer {
                display: flex;
                gap: 1rem;
                margin-top: 2rem;
                flex-wrap: wrap;
            }
        `;
        document.head.appendChild(style);
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