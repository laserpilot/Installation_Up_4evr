/**
 * @file launch-agents.js
 * @description Logic for the Launch Agents tab.
 */

import { apiCall } from '../utils/api.js';
import { showToast, showLoading, hideLoading } from '../utils/ui.js';
import { createAgentCard } from '../components/LaunchAgentCard.js';

let allAgents = [];
let agentStatusList = [];
let currentAppPath = null;

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
        const status = agentStatusList.find(s => s.label === agent.label) || {};
        return createAgentCard(agent, status);
    }).join('');

    addLaunchAgentActionListeners();
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
        await apiCall('/api/launch-agents/create', {
            method: 'POST',
            body: JSON.stringify({ appPath: currentAppPath, options })
        });
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
        await apiCall('/api/launch-agents/install', {
            method: 'POST',
            body: JSON.stringify({ appPath: currentAppPath, options })
        });
        showToast('Launch agent installed and started!', 'success');
        loadLaunchAgents();
    } catch (error) {
        showToast('Failed to install launch agent', 'error');
    } finally {
        hideLoading();
    }
}

export function initLaunchAgents() {
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

    loadLaunchAgents();
}

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
