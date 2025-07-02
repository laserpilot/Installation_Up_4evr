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
            case 'view':
                result = await apiCall(`/api/launch-agents/view`, { method: 'POST', body: JSON.stringify({ label }) });
                // showPlistContent(label, result.content);
                return;
            case 'edit':
                result = await apiCall(`/api/launch-agents/view`, { method: 'POST', body: JSON.stringify({ label }) });
                // showPlistEditor(label, result.content);
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
