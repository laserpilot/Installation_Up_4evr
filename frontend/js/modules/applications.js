/**
 * @file applications.js
 * @description Logic for the Applications tab.
 */

import { apiCall, MasterConfigAPI } from '../utils/api.js';
import { showToast, showLoading, hideLoading } from '../utils/ui.js';
import { createAgentCard } from '../components/LaunchAgentCard.js';

let allProcesses = [];
let processStatusList = [];
let currentAppPath = null;
let statusUpdateInterval = null;
let currentMode = 'app'; // 'app', 'web', or 'service'

async function loadProcesses() {
    try {
        const [agentsResponse, statusResponse] = await Promise.all([
            apiCall('/api/pm2-processes/list'),
            apiCall('/api/pm2-processes/status')
        ]);

        allProcesses = agentsResponse?.data || agentsResponse || [];
        processStatusList = statusResponse?.data || statusResponse || [];

        renderProcesses();
    } catch (error) {
        console.error('Failed to load processes:', error);
        showToast('Failed to load processes', 'error');
    }
}

function renderProcesses(filterType = 'all') {
    const container = document.getElementById('launch-agents-list');
    // Show PM2-managed processes and any legacy processes
    let processes = allProcesses.filter(process => 
        process.managedByTool === true || 
        (process.plistPath && 
         (process.plistPath.includes('/Users/') && process.plistPath.includes('/Library/LaunchAgents/')))
    );
    
    // Apply filter
    processes = applyProcessFilter(processes, filterType);
    
    // Sort processes: tool-created first, then alphabetical
    processes.sort((a, b) => {
        const aIsToolCreated = a.label.includes('installation-up-4evr') || 
                              a.plistPath.includes('installation-up-4evr') ||
                              (a.webAppInfo && a.webAppInfo.isWebApp);
        const bIsToolCreated = b.label.includes('installation-up-4evr') || 
                              b.plistPath.includes('installation-up-4evr') ||
                              (b.webAppInfo && b.webAppInfo.isWebApp);
        
        if (aIsToolCreated && !bIsToolCreated) return -1;
        if (!aIsToolCreated && bIsToolCreated) return 1;
        return a.label.localeCompare(b.label);
    });

    // Debug logging reduced - only show when there are issues
    if (processes.length === 0 && allProcesses.length > 0) {
        console.warn('[PROCESSES] No managed processes found despite backend data:', allProcesses.length);
    }

    if (processes.length === 0) {
        container.innerHTML = `
            <div class="no-agents-message">
                <p>No managed processes found</p>
                <p><small>Create your first application by dragging and dropping a .app file above, or use the Web Applications tab to launch browser-based apps.</small></p>
                <button onclick="loadProcesses()" class="btn btn-primary">Refresh List</button>
            </div>
        `;
        return;
    }

    container.innerHTML = processes.map(process => {
        const statusData = processStatusList.find(s => s.label === process.label || s.name === process.label) || {};
        // Convert status format to match frontend expectations
        const status = {
            isRunning: statusData.status === 'running' && statusData.loaded,
            pid: statusData.pid || 'N/A',
            lastExitStatus: statusData.lastExitStatus || 'N/A'
        };
        return createAgentCard(process, status);
    }).join('');

    addProcessActionListeners();
}

function applyProcessFilter(processes, filterType) {
    switch (filterType) {
        case 'user':
            return processes.filter(process => 
                process.plistPath.includes('/Users/') && 
                !process.label.toLowerCase().includes('apple') &&
                !process.label.toLowerCase().includes('com.apple')
            );
        case 'apps':
            return processes.filter(process => 
                process.label.includes('app') || 
                process.plistPath.includes('.app') ||
                process.label.toLowerCase().includes('chrome') ||
                process.label.toLowerCase().includes('browser')
            );
        case 'system':
            return processes.filter(process => 
                process.label.toLowerCase().includes('apple') ||
                process.label.toLowerCase().includes('com.apple') ||
                process.label.toLowerCase().includes('system')
            );
        case 'all':
        default:
            return processes;
    }
}

function filterProcesses(filterType) {
    renderProcesses(filterType);
}

async function updateProcessStatus() {
    try {
        const statusResponse = await apiCall('/api/pm2-processes/status');
        processStatusList = statusResponse?.data || statusResponse || [];
        
        // Update existing cards without full re-render
        updateExistingProcessCards();
    } catch (error) {
        console.error('Failed to update process status:', error);
    }
}

function updateExistingProcessCards() {
    const processCards = document.querySelectorAll('.agent-card');
    
    processCards.forEach(card => {
        const label = card.dataset.label;
        const statusData = processStatusList.find(s => s.label === label || s.name === label) || {};
        const isRunning = statusData.status === 'running' && statusData.loaded;
        
        // Update status class
        card.classList.toggle('status-running', isRunning);
        card.classList.toggle('status-stopped', !isRunning);
        
        // Update status text and indicator
        const statusSpan = card.querySelector('.agent-status span:last-child');
        if (statusSpan) {
            statusSpan.textContent = isRunning ? 'Running' : 'Stopped';
        }
        
        // Update PID and exit status
        const pidSpan = card.querySelector('.agent-info span:first-child');
        if (pidSpan) {
            pidSpan.textContent = `PID: ${statusData.pid || 'N/A'}`;
        }
        
        const exitSpan = card.querySelector('.agent-info span:last-child');
        if (exitSpan) {
            exitSpan.textContent = `Exit: ${statusData.lastExitStatus || 'N/A'}`;
        }
    });
}

function startRealtimeStatusUpdates() {
    // Clear any existing interval
    stopRealtimeStatusUpdates();
    
    // Update status every 5 seconds
    statusUpdateInterval = setInterval(updateProcessStatus, 5000);
    console.log('[PM2-PROCESSES] Started real-time status updates');
}

function stopRealtimeStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
        console.log('[PM2-PROCESSES] Stopped real-time status updates');
    }
}

function addProcessActionListeners() {
    document.querySelectorAll('.agent-card .btn-action').forEach(button => {
        button.addEventListener('click', (e) => {
            const card = e.currentTarget.closest('.agent-card');
            const label = card.dataset.label;
            const action = e.currentTarget.dataset.action;
            handleProcessAction(label, action);
        });
    });
}

async function handleProcessAction(label, action) {
    try {
        let result;
        switch (action) {
            case 'start':
                result = await apiCall(`/api/pm2-processes/start`, { method: 'POST', body: JSON.stringify({ label }) });
                break;
            case 'stop':
                result = await apiCall(`/api/pm2-processes/stop`, { method: 'POST', body: JSON.stringify({ label }) });
                break;
            case 'restart':
                result = await apiCall(`/api/pm2-processes/restart`, { method: 'POST', body: JSON.stringify({ label }) });
                break;
            case 'test':
                showLoading('Getting process info...');
                try {
                    result = await apiCall(`/api/pm2-processes/test`, { method: 'POST', body: JSON.stringify({ label }) });
                    hideLoading();
                    showTestResults(label, result);
                } catch (error) {
                    hideLoading();
                    showToast(`Test failed for ${label}: ${error.message}`, 'error');
                }
                return;
            case 'export':
                result = await apiCall(`/api/pm2-processes/export`, { method: 'POST', body: JSON.stringify({ label }) });
                downloadAgentFile(label, result);
                return;
            case 'view':
                result = await apiCall(`/api/pm2-processes/view`, { method: 'POST', body: JSON.stringify({ label }) });
                if (!result.success) {
                    console.error('[PROCESSES] View PM2 config failed for:', label, result);
                }
                showProcessContent(label, result);
                return;
            case 'edit':
                result = await apiCall(`/api/pm2-processes/view`, { method: 'POST', body: JSON.stringify({ label }) });
                showProcessEditor(label, result);
                return;
            case 'delete':
                if (confirm(`Are you sure you want to delete ${label}? This cannot be undone.`)) {
                    result = await apiCall(`/api/pm2-processes/delete`, { method: 'POST', body: JSON.stringify({ label }) });
                } else {
                    return;
                }
                break;
            default:
                return;
        }
        showToast(`${action} successful for ${label}`, 'success');
        loadProcesses();
    } catch (error) {
        showToast(`Failed to ${action} ${label}: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function getLaunchAgentOptions() {
    return {
        keepAlive: document.getElementById('keep-alive').checked,
        successfulExit: document.getElementById('successful-exit').checked,
        runAtLoad: document.getElementById('run-at-load').checked,
        runOnReboot: document.getElementById('run-on-reboot').checked,
        label: document.getElementById('custom-label').value || undefined,
        programPath: document.getElementById('program-filepath').value || undefined
    };
}

async function createProcess() {
    if (!currentAppPath) {
        showToast('Please select an app first', 'warning');
        return;
    }

    const options = getLaunchAgentOptions();
    
    // Choose endpoint based on "run on reboot" option
    const endpoint = options.runOnReboot ? '/api/pm2-processes/create' : '/api/pm2-processes/install';
    const actionText = options.runOnReboot ? 'Creating process (will start on reboot)...' : 'Creating and starting process...';
    
    showLoading(actionText);
    try {
        const result = await apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify({ appPath: currentAppPath, options })
        });
        
        // Add to master configuration
        if (result.success) {
            const processInfo = {
                id: options.label || `process-${Date.now()}`,
                name: options.label || currentAppPath.split('/').pop(),
                path: currentAppPath,
                pm2Id: result.data?.pm2Id,
                created: new Date().toISOString(),
                type: 'app'
            };
            
            await updateMasterConfigWithAgent(processInfo);
            
            // Add to monitoring system
            await addToMonitoring(processInfo);
        }
        
        const successMessage = options.runOnReboot 
            ? 'Process created successfully! Will start on next reboot.' 
            : 'Process created and started successfully!';
        showToast(successMessage, 'success');
        loadProcesses();
    } catch (error) {
        showToast('Failed to create application process', 'error');
    } finally {
        hideLoading();
    }
}

async function installProcess() {
    if (!currentAppPath) {
        showToast('Please select an app first', 'warning');
        return;
    }

    const options = getLaunchAgentOptions();
    
    // Show warning if "run on reboot" is checked for Install & Start
    if (options.runOnReboot) {
        showToast('Note: "Install & Start" will start the process immediately, ignoring "Run on reboot" setting.', 'warning');
    }
    
    showLoading('Installing and starting process...');
    try {
        const result = await apiCall('/api/pm2-processes/install', {
            method: 'POST',
            body: JSON.stringify({ appPath: currentAppPath, options })
        });
        
        // Add to master configuration
        if (result.success) {
            const processInfo = {
                id: options.label || `process-${Date.now()}`,
                name: options.label || currentAppPath.split('/').pop(),
                path: currentAppPath,
                pm2Id: result.data?.pm2Id,
                created: new Date().toISOString(),
                type: 'app',
                installed: true
            };
            
            await updateMasterConfigWithAgent(processInfo);
            
            // Add to monitoring system
            await addToMonitoring(processInfo);
        }
        
        showToast('Process installed and started!', 'success');
        loadProcesses();
    } catch (error) {
        showToast('Failed to install process', 'error');
    } finally {
        hideLoading();
    }
}

// Master Configuration Integration
async function updateMasterConfigWithAgent(agentInfo) {
    try {
        await MasterConfigAPI.addPM2Process(agentInfo);
        console.log('[PM2-PROCESSES] Added process to master configuration:', agentInfo.name);
    } catch (error) {
        console.warn('[PM2-PROCESSES] Failed to update master configuration:', error);
        // Don't fail the main operation if master config update fails
    }
}


async function addToMonitoring(agentInfo) {
    try {
        const response = await apiCall('/api/monitoring/applications/add', {
            method: 'POST',
            body: JSON.stringify({
                name: agentInfo.name,
                path: agentInfo.path,
                options: {
                    shouldBeRunning: true,
                    type: agentInfo.type,
                    createdByTool: true
                }
            })
        });
        
        if (response.success) {
            console.log('[PM2-PROCESSES] Added process to monitoring:', agentInfo.name);
        } else {
            console.warn('[PM2-PROCESSES] Failed to add process to monitoring:', response.error);
        }
    } catch (error) {
        console.warn('[PM2-PROCESSES] Failed to add process to monitoring:', error);
        // Don't fail the main operation if monitoring fails
    }
}

async function loadMasterConfigAgents() {
    try {
        const response = await MasterConfigAPI.getPM2Processes();
        if (response.success && response.data) {
            const { agents, webApps } = response.data;
            
            // Display additional info about agents tracked in master config
            if (agents && agents.length > 0) {
                console.log('[PM2-PROCESSES] Master config tracks', agents.length, 'PM2 processes');
                
                // Could add UI indicators for agents tracked in master config
                agents.forEach(agent => {
                    const agentCard = document.querySelector(`[data-agent-label="${agent.id}"]`);
                    if (agentCard) {
                        agentCard.classList.add('tracked-in-master');
                        agentCard.title = `Tracked in master configuration since ${new Date(agent.created).toLocaleDateString()}`;
                    }
                });
            }
            
            if (webApps && webApps.length > 0) {
                console.log('[PM2-PROCESSES] Master config tracks', webApps.length, 'web applications');
            }
        }
    } catch (error) {
        console.warn('[PM2-PROCESSES] Failed to load master config processes:', error);
    }
}

// Web Application PM2 Process Functions
function switchCreationMode(mode) {
    currentMode = mode;
    
    // Save mode change to master config
    saveLaunchAgentsMasterConfig();
    
    // Update tab states
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    // Show/hide mode content
    document.getElementById('app-mode').style.display = mode === 'app' ? 'block' : 'none';
    document.getElementById('web-mode').style.display = mode === 'web' ? 'block' : 'none';
    document.getElementById('service-mode').style.display = mode === 'service' ? 'block' : 'none';
    
    // Reset app info if switching away from app mode
    if (mode !== 'app') {
        document.getElementById('app-info').style.display = 'none';
        currentAppPath = null;
    }
}

function handleBrowserPathChange() {
    const select = document.getElementById('browser-path');
    const customInput = document.getElementById('custom-browser-path');
    
    if (select.value === 'custom') {
        customInput.style.display = 'block';
        customInput.required = true;
    } else {
        customInput.style.display = 'none';
        customInput.required = false;
    }
}

function autoPopulateWebAppName() {
    const urlInput = document.getElementById('web-app-url');
    const nameInput = document.getElementById('web-app-name');
    
    if (urlInput.value && !nameInput.value) {
        try {
            const url = new URL(urlInput.value);
            const hostname = url.hostname.replace('www.', '');
            const appName = hostname.split('.')[0];
            nameInput.value = appName.charAt(0).toUpperCase() + appName.slice(1) + ' App';
        } catch (e) {
            // Invalid URL, ignore
        }
    }
}

async function createWebLaunchAgent() {
    try {
        // Validate form
        const url = document.getElementById('web-app-url').value;
        const name = document.getElementById('web-app-name').value;
        const browserSelect = document.getElementById('browser-path');
        const customBrowserPath = document.getElementById('custom-browser-path').value;
        
        if (!url || !name) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch (e) {
            showToast('Please enter a valid URL', 'error');
            return;
        }
        
        const browserPath = browserSelect.value === 'custom' ? customBrowserPath : browserSelect.value;
        if (!browserPath) {
            showToast('Please select or specify a browser path', 'error');
            return;
        }
        
        // Get options
        const kioskMode = document.getElementById('web-kiosk-mode').checked;
        const disableDevTools = document.getElementById('web-disable-dev-tools').checked;
        const disableExtensions = document.getElementById('web-disable-extensions').checked;
        const incognitoMode = document.getElementById('web-incognito-mode').checked;
        
        showLoading('Creating web application PM2 process...');
        
        const response = await apiCall('/api/pm2-processes/create-web', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                url,
                browserPath,
                options: {
                    kioskMode,
                    disableDevTools,
                    disableExtensions,
                    incognitoMode,
                    keepAlive: false,  // Disable keepAlive for web apps to prevent Chrome restart loop
                    runAtLoad: false  // Don't auto-start to prevent immediate loop
                }
            })
        });
        
        if (response.success) {
            // Add to monitoring system
            const agentInfo = {
                id: `web-app-${Date.now()}`,
                name: name,
                path: url,
                plistPath: response.data?.plistPath,
                created: new Date().toISOString(),
                type: 'web'
            };
            
            await addToMonitoring(agentInfo);
            
            // Add to master configuration
            await updateMasterConfigWithAgent(agentInfo);
            
            showToast(`Web app PM2 process created: ${name}. Use the Start button to launch it in kiosk mode.`, 'success');
            
            // Clear form
            document.getElementById('web-app-url').value = '';
            document.getElementById('web-app-name').value = '';
            document.getElementById('web-kiosk-mode').checked = true;
            document.getElementById('web-disable-dev-tools').checked = true;
            document.getElementById('web-disable-extensions').checked = true;
            document.getElementById('web-incognito-mode').checked = false;
            
            // Reload agents list
            loadProcesses();
        } else {
            showToast(`Failed to create web app PM2 process: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Failed to create web PM2 process:', error);
        showToast('Failed to create web PM2 process', 'error');
    } finally {
        hideLoading();
    }
}

function previewWebCommand() {
    try {
        const url = document.getElementById('web-app-url').value;
        const browserSelect = document.getElementById('browser-path');
        const customBrowserPath = document.getElementById('custom-browser-path').value;
        
        if (!url) {
            showToast('Please enter a URL first', 'error');
            return;
        }
        
        const browserPath = browserSelect.value === 'custom' ? customBrowserPath : browserSelect.value;
        if (!browserPath) {
            showToast('Please select a browser first', 'error');
            return;
        }
        
        // Build command arguments
        const args = [];
        
        if (document.getElementById('web-kiosk-mode').checked) {
            args.push('--kiosk');
        }
        
        if (document.getElementById('web-disable-dev-tools').checked) {
            args.push('--disable-dev-tools');
        }
        
        if (document.getElementById('web-disable-extensions').checked) {
            args.push('--disable-extensions');
        }
        
        if (document.getElementById('web-incognito-mode').checked) {
            args.push('--incognito');
        }
        
        args.push('--no-first-run');
        args.push('--disable-default-apps');
        args.push('--disable-popup-blocking');
        args.push(url);
        
        const command = `"${browserPath}" ${args.join(' ')}`;
        
        showCommandPreview(command, url, browserPath);
    } catch (error) {
        console.error('Failed to preview command:', error);
        showToast('Failed to preview command', 'error');
    }
}

function showCommandPreview(command, url, browserPath) {
    const modal = document.createElement('div');
    modal.className = 'command-preview-modal';
    
    modal.innerHTML = `
        <div class="command-preview-content">
            <div class="command-preview-header">
                <h3><i class="fas fa-eye"></i> Browser Command Preview</h3>
                <button class="command-preview-close">&times;</button>
            </div>
            
            <div class="command-info">
                <h4><i class="fas fa-info-circle"></i> Command Details</h4>
                <ul>
                    <li><strong>URL:</strong> ${url}</li>
                    <li><strong>Browser:</strong> ${browserPath}</li>
                    <li><strong>Mode:</strong> ${document.getElementById('web-kiosk-mode').checked ? 'Kiosk (Full Screen)' : 'Windowed'}</li>
                </ul>
            </div>
            
            <h4>Generated Command:</h4>
            <div class="command-display">${command}</div>
            
            <div class="command-info">
                <h4><i class="fas fa-lightbulb"></i> What This Does</h4>
                <ul>
                    <li>Launches the specified browser with the given URL</li>
                    <li>Applies kiosk mode options for full-screen display</li>
                    <li>Disables user interface elements for installation use</li>
                    <li>Will restart automatically if the browser crashes</li>
                </ul>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary command-preview-close">
                    <i class="fas fa-check"></i> Looks Good
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close
    modal.querySelectorAll('.command-preview-close').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
        });
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Terminal Commands Toggle Function
function toggleTerminalCommands() {
    const content = document.getElementById('terminal-commands-content');
    const toggle = document.getElementById('terminal-commands-toggle');
    
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        toggle.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Terminal Commands';
    } else {
        content.style.display = 'none';
        toggle.innerHTML = '<i class="fas fa-chevron-down"></i> Show Terminal Commands';
    }
}

// Service (Background Process) Functions
async function createServiceProcess() {
    try {
        // Validate form
        const name = document.getElementById('service-name').value;
        const command = document.getElementById('service-command').value;
        const workingDir = document.getElementById('service-working-dir').value;
        const port = document.getElementById('service-port').value;
        
        if (!name || !command) {
            showToast('Please fill in service name and command', 'error');
            return;
        }
        
        // Get options
        const autoRestart = document.getElementById('service-auto-restart').checked;
        const watchFiles = document.getElementById('service-watch-files').checked;
        const logOutput = document.getElementById('service-log-output').checked;
        
        showLoading('Creating background service...');
        
        // Create service configuration
        const serviceConfig = {
            name,
            command,
            workingDir: workingDir || process.cwd(),
            port: port || null,
            options: {
                autoRestart,
                watchFiles,
                logOutput,
                runAtLoad: false,  // Don't auto-start services
                keepAlive: autoRestart
            }
        };
        
        // Create a PM2 process for the service
        const response = await apiCall('/api/pm2-processes/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `service-${name}`,
                command: command,
                workingDirectory: workingDir,
                options: serviceConfig.options
            })
        });
        
        if (response.success) {
            // Add to monitoring system
            const serviceInfo = {
                id: `service-${Date.now()}`,
                name: name,
                path: command,
                plistPath: response.data?.plistPath,
                created: new Date().toISOString(),
                type: 'service',
                port: port
            };
            
            await addToMonitoring(serviceInfo);
            
            // Add to master configuration
            await updateMasterConfigWithAgent(serviceInfo);
            
            showToast(`Background service created: ${name}. Use the Start button to launch it.`, 'success');
            
            // Clear form
            document.getElementById('service-name').value = '';
            document.getElementById('service-command').value = '';
            document.getElementById('service-working-dir').value = '';
            document.getElementById('service-port').value = '';
            document.getElementById('service-auto-restart').checked = true;
            document.getElementById('service-watch-files').checked = false;
            document.getElementById('service-log-output').checked = true;
            
            // Reload processes list
            loadProcesses();
        } else {
            showToast(`Failed to create service: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Failed to create service:', error);
        showToast('Failed to create service', 'error');
    } finally {
        hideLoading();
    }
}

function previewServiceCommand() {
    const name = document.getElementById('service-name').value;
    const command = document.getElementById('service-command').value;
    const workingDir = document.getElementById('service-working-dir').value;
    const port = document.getElementById('service-port').value;
    
    if (!name || !command) {
        showToast('Please enter service name and command first', 'error');
        return;
    }
    
    showServicePreview(name, command, workingDir, port);
}

function showServicePreview(name, command, workingDir, port) {
    const modal = document.createElement('div');
    modal.className = 'command-preview-modal';
    
    modal.innerHTML = `
        <div class="command-preview-content">
            <div class="command-preview-header">
                <h3><i class="fas fa-server"></i> Service Preview</h3>
                <button class="command-preview-close">&times;</button>
            </div>
            
            <div class="command-info">
                <h4><i class="fas fa-info-circle"></i> Service Details</h4>
                <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Command:</strong> ${command}</li>
                    <li><strong>Working Directory:</strong> ${workingDir || 'Current directory'}</li>
                    ${port ? `<li><strong>Port:</strong> ${port}</li>` : ''}
                    <li><strong>Auto-restart:</strong> ${document.getElementById('service-auto-restart').checked ? 'Yes' : 'No'}</li>
                    <li><strong>Watch files:</strong> ${document.getElementById('service-watch-files').checked ? 'Yes' : 'No'}</li>
                </ul>
            </div>
            
            <div class="command-info">
                <h4><i class="fas fa-lightbulb"></i> What This Does</h4>
                <ul>
                    <li>Creates a managed background service process</li>
                    <li>Monitors the process and provides restart capabilities</li>
                    <li>Captures logs and provides status monitoring</li>
                    <li>Integrates with the PM2 process management system</li>
                </ul>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary command-preview-close">
                    <i class="fas fa-check"></i> Looks Good
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close
    modal.querySelectorAll('.command-preview-close').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
        });
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

async function handleAppSelection(file) {
    try {
        // For .app files, we need to get the full path
        // Since web browsers don't provide full file paths for security reasons,
        // we need to work with the file name and make assumptions about common paths
        
        const fileName = file.name;
        
        // Check if it's a .app file
        if (!fileName.endsWith('.app')) {
            showToast('Please select a .app file', 'error');
            return;
        }
        
        // Show loading for app info retrieval
        showLoading('Processing application...');
        
        // For dropped .app files, assume they're in /Applications unless told otherwise
        // This is a limitation of web browsers - they don't provide full paths
        const assumedPath = `/Applications/${fileName}`;
        currentAppPath = assumedPath;
        
        // Extract app name without .app extension
        const appName = fileName.replace('.app', '');
        
        // Show app info
        document.getElementById('app-info').style.display = 'block';
        document.getElementById('app-name').textContent = appName;
        document.getElementById('app-path').textContent = assumedPath;
        
        // Auto-populate form fields
        document.getElementById('custom-label').value = `${appName}_up4evr`;
        document.getElementById('program-filepath').value = `${assumedPath}/Contents/MacOS/${appName}`;
        
        // Set some default values
        document.getElementById('app-version').textContent = 'Unknown';
        document.getElementById('app-bundle-id').textContent = 'Unknown';
        
        // Try to get app info from the backend
        await getAppInfo(assumedPath);
        
        showToast(`Selected: ${fileName}`, 'success');
    } catch (error) {
        console.error('Error in handleAppSelection:', error);
        showToast('Failed to process application', 'error');
    } finally {
        // Always clear loading state
        hideLoading();
    }
}

async function getAppInfo(appPath) {
    try {
        const response = await apiCall('/api/pm2-processes/app-info', {
            method: 'POST',
            body: JSON.stringify({ appPath })
        });
        
        if (response.success && response.data) {
            const info = response.data;
            document.getElementById('app-version').textContent = info.version || 'Unknown';
            document.getElementById('app-bundle-id').textContent = info.bundleId || 'Unknown';
            
            // Update path if backend provides a better one
            if (info.actualPath) {
                currentAppPath = info.actualPath;
                document.getElementById('app-path').textContent = info.actualPath;
                // Also update the Program File Path field if we get a better path
                document.getElementById('program-filepath').value = `${info.actualPath}/Contents/MacOS/${info.executableName || currentAppPath.split('/').pop().replace('.app', '')}`;
            }
        }
    } catch (error) {
        console.warn('Could not get app info:', error);
        // Don't show error to user since this is optional
    }
}

export function initApplications() {
    // Mode switching
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            switchCreationMode(mode);
        });
    });

    // Desktop app mode
    document.getElementById('create-launch-agent').addEventListener('click', createProcess);
    document.getElementById('install-launch-agent').addEventListener('click', installProcess);

    // Drag and Drop
    const dropZone = document.getElementById('app-drop-zone');
    const fileInput = document.getElementById('app-file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            const file = files[0];
            try {
                await handleAppSelection(file);
            } catch (error) {
                console.error('Error handling file selection:', error);
                showToast('Failed to process selected file', 'error');
            }
        }
    });
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            try {
                await handleAppSelection(file);
            } catch (error) {
                console.error('Error handling dropped file:', error);
                showToast('Failed to process dropped file', 'error');
            }
        }
    });

    // Web app mode
    document.getElementById('browser-path').addEventListener('change', handleBrowserPathChange);
    document.getElementById('create-web-launch-agent').addEventListener('click', createWebLaunchAgent);
    document.getElementById('preview-web-command').addEventListener('click', previewWebCommand);
    
    // Auto-populate web app name from URL
    document.getElementById('web-app-url').addEventListener('input', autoPopulateWebAppName);

    // Service mode
    document.getElementById('create-service-process').addEventListener('click', createServiceProcess);
    document.getElementById('preview-service-command').addEventListener('click', previewServiceCommand);

    // Terminal commands toggle
    const terminalToggle = document.getElementById('terminal-commands-toggle');
    if (terminalToggle) {
        terminalToggle.addEventListener('click', toggleTerminalCommands);
    }

    // Agent filtering buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const filter = e.target.dataset.filter;
            filterProcesses(filter);
        });
    });

    loadProcesses();
    
    // Load master configuration state after initial load
    setTimeout(() => {
        loadMasterConfigAgents();
    }, 500);
    
    // Start real-time status updates
    startRealtimeStatusUpdates();
    
    // Load master configuration state after initial load
    setTimeout(() => {
        loadLaunchAgentsMasterConfig();
    }, 500);
}

// Master Configuration Integration
async function loadLaunchAgentsMasterConfig() {
    try {
        const response = await MasterConfigAPI.getMasterProfile();
        if (response.success && response.data.launchAgents) {
            console.log('[PM2-PROCESSES] Loaded master config state:', response.data.launchAgents);
            
            // Update UI with saved configuration
            const config = response.data.launchAgents;
            
            // Apply saved mode
            if (config.currentMode) {
                switchCreationMode(config.currentMode);
            }
            
            // Apply saved web app settings
            if (config.webAppSettings) {
                const settings = config.webAppSettings;
                if (settings.url) {
                    const urlInput = document.getElementById('web-app-url');
                    if (urlInput) urlInput.value = settings.url;
                }
                if (settings.browser) {
                    const browserSelect = document.getElementById('web-browser-select');
                    if (browserSelect) browserSelect.value = settings.browser;
                }
                if (settings.options) {
                    Object.keys(settings.options).forEach(option => {
                        const checkbox = document.getElementById(`web-${option}`);
                        if (checkbox) checkbox.checked = settings.options[option];
                    });
                }
            }
        }
    } catch (error) {
        console.error('[PM2-PROCESSES] Failed to load master config state:', error);
    }
}

async function saveLaunchAgentsMasterConfig() {
    try {
        // Collect current configuration
        const config = {
            currentMode: currentMode,
            webAppSettings: {
                url: document.getElementById('web-app-url')?.value || '',
                browser: document.getElementById('web-browser-select')?.value || 'chrome',
                options: {
                    'kiosk-mode': document.getElementById('web-kiosk-mode')?.checked || false,
                    'disable-dev-tools': document.getElementById('web-disable-dev-tools')?.checked || false,
                    'disable-extensions': document.getElementById('web-disable-extensions')?.checked || false,
                    'incognito-mode': document.getElementById('web-incognito-mode')?.checked || false
                }
            },
            totalAgents: allAgents.length,
            lastUpdated: new Date().toISOString()
        };
        
        await MasterConfigAPI.update('launchAgents', config);
        console.log('[PM2-PROCESSES] Master config saved:', config);
        
    } catch (error) {
        console.error('[PM2-PROCESSES] Failed to save master config:', error);
    }
}

// Export functions for external use (tab switching)
export { startRealtimeStatusUpdates, stopRealtimeStatusUpdates };

function showTestResults(label, result) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-flask"></i> Test Results: ${label}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="test-results">
                    <div class="test-status ${result.success ? 'success' : 'error'}">
                        <i class="fas ${result.success ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        <span>${result.success ? 'Test Passed' : 'Test Failed'}</span>
                    </div>
                    <div class="test-details">
                        <h4>Test Details:</h4>
                        <pre>${result.data?.output || result.message || 'No additional details'}</pre>
                        ${result.data?.warnings ? `<div class="warnings"><h5>Warnings:</h5><ul>${result.data.warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function downloadAgentFile(label, result) {
    if (!result.success || !result.data) {
        console.error('[PM2-PROCESSES] Export failed for', label, ':', result);
        showToast('Failed to export PM2 process', 'error');
        return;
    }
    
    // Handle double-wrapped API response structure
    const dataObj = result.data.data || result.data;
    let content = dataObj.content || dataObj.processConfig;
    const filename = dataObj.filename || `${label}.json`;
    
    // TODO: Backend should filter PM2 data to remove unnecessary environment info
    // Currently includes npm_package_json, PATH, npm_execpath which are not relevant
    // for process configuration export/view
    
    // Debug content only if it appears to be invalid
    console.log('[PM2-PROCESSES] Export content analysis for', label, ':');
    console.log('  - result.data:', result.data);
    console.log('  - dataObj:', dataObj);
    console.log('  - content:', content);
    console.log('  - filename:', filename);
    
    if (!content || content === 'undefined' || content === undefined) {
        console.error('[PM2-PROCESSES] Invalid export content for', label, ':', { 
            content, 
            filename, 
            result,
            dataObj,
            'result.data.data': result.data?.data,
            'result.data.content': result.data?.content,
            'result.data.processContent': result.data?.processContent,
            'result.content': result.content
        });
        showToast('Failed to export process config - invalid content', 'error');
        return;
    }
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showToast(`Process config exported as ${filename}`, 'success');
}

function showProcessContent(label, result) {
    console.log('[PM2-PROCESSES] showProcessContent called for:', label);
    console.log('[PM2-PROCESSES] Result data structure:', result);
    
    if (!result.success || !result.data) {
        console.error('[PROCESSES] View process config failed for', label, ':', result);
        showToast('Failed to load process config', 'error');
        return;
    }
    
    // Handle nested API response structure - same fix as export bug
    const dataObj = result.data.data || result.data;
    const content = dataObj.content || dataObj.processConfig || result.content;
    
    if (!content || content === 'undefined') {
        console.error('[PM2-PROCESSES] No valid content found in result:', {
            result,
            dataObj,
            content
        });
        showToast('Failed to load process config - no valid content found', 'error');
        return;
    }
    
    console.log('[PM2-PROCESSES] Creating modal for process content...');
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-content script-modal">
            <div class="modal-header">
                <h3><i class="fas fa-eye"></i> View Process Config: ${label}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <pre class="code-block">${content}</pre>
                <div class="modal-actions">
                    <button class="btn btn-primary" id="copy-process-content">
                        <i class="fas fa-copy"></i> Copy to Clipboard
                    </button>
                </div>
            </div>
        </div>
    `;
    
    console.log('[PM2-PROCESSES] Appending modal to body...');
    document.body.appendChild(modal);
    console.log('[PM2-PROCESSES] Modal appended, checking if visible...');
    console.log('[PM2-PROCESSES] Modal element:', modal);
    console.log('[PM2-PROCESSES] Modal styles:', getComputedStyle(modal));
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#copy-process-content').addEventListener('click', () => {
        navigator.clipboard.writeText(content).then(() => {
            showToast('Process config copied to clipboard!', 'success');
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function showProcessEditor(label, result) {
    if (!result.success || !result.data) {
        showToast('Failed to load process config', 'error');
        return;
    }
    
    // Handle nested API response structure - same fix as export bug
    const dataObj = result.data.data || result.data;
    const content = dataObj.content || dataObj.processConfig || result.content;
    
    if (!content || content === 'undefined') {
        console.error('[PM2-PROCESSES] No valid content found in result for edit:', {
            result,
            dataObj,
            content
        });
        showToast('Failed to load process config for editing - no valid content found', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-content script-modal">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Edit Process Config: ${label}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="warning-banner">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Warning:</strong> Editing PM2 configs directly can break processes. Make sure you understand the JSON format.
                </div>
                <textarea class="code-editor" id="process-editor">${content}</textarea>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel-edit">Cancel</button>
                    <button class="btn btn-primary" id="save-process">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeModal = () => document.body.removeChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('#cancel-edit').addEventListener('click', closeModal);
    
    modal.querySelector('#save-process').addEventListener('click', async () => {
        const newContent = modal.querySelector('#process-editor').value;
        try {
            showLoading('Saving process config changes...');
            await apiCall('/api/pm2-processes/update', {
                method: 'POST',
                body: JSON.stringify({ label, content: newContent })
            });
            showToast('Process config updated successfully!', 'success');
            closeModal();
            loadProcesses();
        } catch (error) {
            showToast('Failed to save process config changes', 'error');
        } finally {
            hideLoading();
        }
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}
