/**
 * @file launch-agents.js
 * @description Logic for the Launch Agents tab.
 */

import { apiCall, MasterConfigAPI } from '../utils/api.js';
import { showToast, showLoading, hideLoading } from '../utils/ui.js';
import { createAgentCard } from '../components/LaunchAgentCard.js';

let allAgents = [];
let agentStatusList = [];
let currentAppPath = null;
let statusUpdateInterval = null;
let currentMode = 'app'; // 'app' or 'web'

async function loadLaunchAgents() {
    try {
        const [agentsResponse, statusResponse] = await Promise.all([
            apiCall('/api/launch-agents/list'),
            apiCall('/api/launch-agents/status')
        ]);

        allAgents = agentsResponse?.data || agentsResponse || [];
        agentStatusList = statusResponse?.data || statusResponse || [];

        renderLaunchAgents();
    } catch (error) {
        console.error('Failed to load launch agents:', error);
        showToast('Failed to load launch agents', 'error');
    }
}

function renderLaunchAgents() {
    const container = document.getElementById('launch-agents-list');
    const agents = allAgents.filter(agent => agent.plistPath && agent.plistPath.includes('/Library/LaunchAgents/'));

    if (agents.length === 0) {
        container.innerHTML = '<p>No launch agents found</p>';
        return;
    }

    container.innerHTML = agents.map(agent => {
        const statusData = agentStatusList.find(s => s.label === agent.label || s.name === agent.label) || {};
        // Convert status format to match frontend expectations
        const status = {
            isRunning: statusData.status === 'running' && statusData.loaded,
            pid: statusData.pid || 'N/A',
            lastExitStatus: statusData.lastExitStatus || 'N/A'
        };
        return createAgentCard(agent, status);
    }).join('');

    addLaunchAgentActionListeners();
}

async function updateAgentStatus() {
    try {
        const statusResponse = await apiCall('/api/launch-agents/status');
        agentStatusList = statusResponse?.data || statusResponse || [];
        
        // Update existing cards without full re-render
        updateExistingAgentCards();
    } catch (error) {
        console.error('Failed to update agent status:', error);
    }
}

function updateExistingAgentCards() {
    const agentCards = document.querySelectorAll('.agent-card');
    
    agentCards.forEach(card => {
        const label = card.dataset.label;
        const statusData = agentStatusList.find(s => s.label === label || s.name === label) || {};
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
    statusUpdateInterval = setInterval(updateAgentStatus, 5000);
    console.log('[LAUNCH-AGENTS] Started real-time status updates');
}

function stopRealtimeStatusUpdates() {
    if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
        console.log('[LAUNCH-AGENTS] Stopped real-time status updates');
    }
}

function addLaunchAgentActionListeners() {
    document.querySelectorAll('.agent-card .btn-action').forEach(button => {
        button.addEventListener('click', (e) => {
            const card = e.currentTarget.closest('.agent-card');
            const label = card.dataset.label;
            const action = e.currentTarget.dataset.action;
            handleLaunchAgentAction(label, action);
        });
    });
}

async function handleLaunchAgentAction(label, action) {
    try {
        let result;
        switch (action) {
            case 'start':
                result = await apiCall(`/api/launch-agents/start`, { method: 'POST', body: JSON.stringify({ label }) });
                break;
            case 'stop':
                result = await apiCall(`/api/launch-agents/stop`, { method: 'POST', body: JSON.stringify({ label }) });
                break;
            case 'restart':
                result = await apiCall(`/api/launch-agents/restart`, { method: 'POST', body: JSON.stringify({ label }) });
                break;
            case 'test':
                showLoading('Testing launch agent...');
                result = await apiCall(`/api/launch-agents/test`, { method: 'POST', body: JSON.stringify({ label }) });
                hideLoading();
                showTestResults(label, result);
                return;
            case 'export':
                result = await apiCall(`/api/launch-agents/export`, { method: 'POST', body: JSON.stringify({ label }) });
                downloadAgentFile(label, result);
                return;
            case 'view':
                result = await apiCall(`/api/launch-agents/view`, { method: 'POST', body: JSON.stringify({ label }) });
                showPlistContent(label, result);
                return;
            case 'edit':
                result = await apiCall(`/api/launch-agents/view`, { method: 'POST', body: JSON.stringify({ label }) });
                showPlistEditor(label, result);
                return;
            case 'delete':
                if (confirm(`Are you sure you want to delete ${label}? This cannot be undone.`)) {
                    result = await apiCall(`/api/launch-agents/delete`, { method: 'POST', body: JSON.stringify({ label }) });
                } else {
                    return;
                }
                break;
            default:
                return;
        }
        showToast(`${action} successful for ${label}`, 'success');
        loadLaunchAgents();
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
        label: document.getElementById('custom-label').value || undefined,
        programPath: document.getElementById('program-filepath').value || undefined
    };
}

async function createLaunchAgent() {
    if (!currentAppPath) {
        showToast('Please select an app first', 'warning');
        return;
    }

    const options = getLaunchAgentOptions();
    
    showLoading('Creating launch agent...');
    try {
        const result = await apiCall('/api/launch-agents/create', {
            method: 'POST',
            body: JSON.stringify({ appPath: currentAppPath, options })
        });
        
        // Add to master configuration
        if (result.success) {
            await updateMasterConfigWithAgent({
                id: options.label || `agent-${Date.now()}`,
                name: options.label || currentAppPath.split('/').pop(),
                path: currentAppPath,
                plistPath: result.data?.plistPath,
                created: new Date().toISOString(),
                type: 'app'
            });
        }
        
        showToast('Launch agent created successfully!', 'success');
        loadLaunchAgents();
    } catch (error) {
        showToast('Failed to create launch agent', 'error');
    } finally {
        hideLoading();
    }
}

async function installLaunchAgent() {
    if (!currentAppPath) {
        showToast('Please select an app first', 'warning');
        return;
    }

    const options = getLaunchAgentOptions();
    
    showLoading('Installing launch agent...');
    try {
        const result = await apiCall('/api/launch-agents/install', {
            method: 'POST',
            body: JSON.stringify({ appPath: currentAppPath, options })
        });
        
        // Add to master configuration
        if (result.success) {
            await updateMasterConfigWithAgent({
                id: options.label || `agent-${Date.now()}`,
                name: options.label || currentAppPath.split('/').pop(),
                path: currentAppPath,
                plistPath: result.data?.plistPath,
                created: new Date().toISOString(),
                type: 'app',
                installed: true
            });
        }
        
        showToast('Launch agent installed and started!', 'success');
        loadLaunchAgents();
    } catch (error) {
        showToast('Failed to install launch agent', 'error');
    } finally {
        hideLoading();
    }
}

// Master Configuration Integration
async function updateMasterConfigWithAgent(agentInfo) {
    try {
        await MasterConfigAPI.addLaunchAgent(agentInfo);
        console.log('[LAUNCH-AGENTS] Added agent to master configuration:', agentInfo.name);
    } catch (error) {
        console.warn('[LAUNCH-AGENTS] Failed to update master configuration:', error);
        // Don't fail the main operation if master config update fails
    }
}

async function removeMasterConfigAgent(agentId) {
    try {
        await MasterConfigAPI.removeLaunchAgent(agentId);
        console.log('[LAUNCH-AGENTS] Removed agent from master configuration:', agentId);
    } catch (error) {
        console.warn('[LAUNCH-AGENTS] Failed to remove from master configuration:', error);
    }
}

async function loadMasterConfigAgents() {
    try {
        const response = await MasterConfigAPI.getLaunchAgents();
        if (response.success && response.data) {
            const { agents, webApps } = response.data;
            
            // Display additional info about agents tracked in master config
            if (agents && agents.length > 0) {
                console.log('[LAUNCH-AGENTS] Master config tracks', agents.length, 'launch agents');
                
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
                console.log('[LAUNCH-AGENTS] Master config tracks', webApps.length, 'web applications');
            }
        }
    } catch (error) {
        console.warn('[LAUNCH-AGENTS] Failed to load master config agents:', error);
    }
}

// Web Application Launch Agent Functions
function switchCreationMode(mode) {
    currentMode = mode;
    
    // Save mode change to master config
    saveMasterConfig();
    
    // Update tab states
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    // Show/hide mode content
    document.getElementById('app-mode').style.display = mode === 'app' ? 'block' : 'none';
    document.getElementById('web-mode').style.display = mode === 'web' ? 'block' : 'none';
    
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
        
        showLoading('Creating web application launch agent...');
        
        const response = await apiCall('/api/launch-agents/create-web', {
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
                    keepAlive: true,
                    runAtLoad: true
                }
            })
        });
        
        if (response.success) {
            showToast(`Web app launch agent created: ${name}`, 'success');
            
            // Clear form
            document.getElementById('web-app-url').value = '';
            document.getElementById('web-app-name').value = '';
            document.getElementById('web-kiosk-mode').checked = true;
            document.getElementById('web-disable-dev-tools').checked = true;
            document.getElementById('web-disable-extensions').checked = true;
            document.getElementById('web-incognito-mode').checked = false;
            
            // Reload agents list
            loadLaunchAgents();
        } else {
            showToast(`Failed to create web app launch agent: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Failed to create web launch agent:', error);
        showToast('Failed to create web launch agent', 'error');
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

export function initLaunchAgents() {
    // Mode switching
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            switchCreationMode(mode);
        });
    });

    // Desktop app mode
    document.getElementById('create-launch-agent').addEventListener('click', createLaunchAgent);
    document.getElementById('install-launch-agent').addEventListener('click', installLaunchAgent);

    // Drag and Drop
    const dropZone = document.getElementById('app-drop-zone');
    const fileInput = document.getElementById('app-file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            const file = files[0];
            currentAppPath = file.webkitRelativePath || file.name;
            document.getElementById('app-name').textContent = currentAppPath;
        }
    });
    
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            currentAppPath = file.webkitRelativePath || file.name;
            document.getElementById('app-name').textContent = currentAppPath;
        }
    });

    // Web app mode
    document.getElementById('browser-path').addEventListener('change', handleBrowserPathChange);
    document.getElementById('create-web-launch-agent').addEventListener('click', createWebLaunchAgent);
    document.getElementById('preview-web-command').addEventListener('click', previewWebCommand);
    
    // Auto-populate web app name from URL
    document.getElementById('web-app-url').addEventListener('input', autoPopulateWebAppName);

    loadLaunchAgents();
    
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
        const response = await MasterConfigAPI.load();
        if (response.success && response.data.launchAgents) {
            console.log('[LAUNCH-AGENTS] Loaded master config state:', response.data.launchAgents);
            
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
        console.error('[LAUNCH-AGENTS] Failed to load master config state:', error);
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
        console.log('[LAUNCH-AGENTS] Master config saved:', config);
        
    } catch (error) {
        console.error('[LAUNCH-AGENTS] Failed to save master config:', error);
    }
}

// Export functions for external use (tab switching)
export { startRealtimeStatusUpdates, stopRealtimeStatusUpdates };

function showTestResults(label, result) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
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
        showToast('Failed to export launch agent', 'error');
        return;
    }
    
    const content = result.data.content || result.data.plistContent;
    const filename = result.data.filename || `${label}.plist`;
    
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showToast(`Launch agent exported as ${filename}`, 'success');
}

function showPlistContent(label, result) {
    if (!result.success || !result.data) {
        showToast('Failed to load plist content', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content script-modal">
            <div class="modal-header">
                <h3><i class="fas fa-eye"></i> View Plist: ${label}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <pre class="code-block">${result.data.content || result.content}</pre>
                <div class="modal-actions">
                    <button class="btn btn-primary" id="copy-plist-content">
                        <i class="fas fa-copy"></i> Copy to Clipboard
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.querySelector('#copy-plist-content').addEventListener('click', () => {
        const content = result.data.content || result.content;
        navigator.clipboard.writeText(content).then(() => {
            showToast('Plist content copied to clipboard!', 'success');
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

function showPlistEditor(label, result) {
    if (!result.success || !result.data) {
        showToast('Failed to load plist content', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content script-modal">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Edit Plist: ${label}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="warning-banner">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>Warning:</strong> Editing plist files directly can break launch agents. Make sure you understand the format.
                </div>
                <textarea class="code-editor" id="plist-editor">${result.data.content || result.content}</textarea>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="cancel-edit">Cancel</button>
                    <button class="btn btn-primary" id="save-plist">
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
    
    modal.querySelector('#save-plist').addEventListener('click', async () => {
        const newContent = modal.querySelector('#plist-editor').value;
        try {
            showLoading('Saving plist changes...');
            await apiCall('/api/launch-agents/update', {
                method: 'POST',
                body: JSON.stringify({ label, content: newContent })
            });
            showToast('Plist updated successfully!', 'success');
            closeModal();
            loadLaunchAgents();
        } catch (error) {
            showToast('Failed to save plist changes', 'error');
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
