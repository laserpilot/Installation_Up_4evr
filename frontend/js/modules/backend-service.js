/**
 * @file backend-service.js
 * @description Logic for the Backend Service tab - manages the Up4Evr backend service itself.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';

let serviceStatusInterval = null;

export function initBackendService() {
    console.log('[INIT] Initializing Backend Service tab...');
    
    updateServiceStatus();
    
    if (serviceStatusInterval) {
        clearInterval(serviceStatusInterval);
    }
    serviceStatusInterval = setInterval(updateServiceStatus, 5000); // Refresh every 5 seconds
    
    setupServiceControlButtons();
}

async function updateServiceStatus() {
    try {
        const response = await apiCall('/api/system/status');
        const status = response.data || response;
        updateServiceStatusDisplay(status);
    } catch (error) {
        console.error('Failed to fetch backend service status:', error);
        
        // Check if the error is actually a connection issue
        const isConnectionError = error.name === 'TypeError' && error.message.includes('Failed to fetch');
        const errorMessage = isConnectionError 
            ? 'Connection lost - backend may be offline'
            : `Backend error: ${error.message}`;
            
        updateServiceStatusDisplay({ 
            status: 'error', 
            message: errorMessage,
            connectionError: isConnectionError
        });
    }
}

function updateServiceStatusDisplay(status) {
    const statusIcon = document.getElementById('service-status-icon');
    const statusText = document.getElementById('service-status-text');
    const pidEl = document.getElementById('service-pid');
    const uptimeEl = document.getElementById('service-uptime');
    const managementEl = document.getElementById('service-management-mode');
    const pm2IdEl = document.getElementById('service-pm2-id');
    const restartsEl = document.getElementById('service-restart-count');
    const cpuEl = document.getElementById('service-cpu-usage');
    const memoryEl = document.getElementById('service-memory-usage');
    const errorEl = document.getElementById('service-pm2-error');

    if (!statusIcon) return; // Exit if tab is not rendered

    // Reset all fields
    [pidEl, uptimeEl, managementEl, pm2IdEl, restartsEl, cpuEl, memoryEl].forEach(el => el.textContent = '--');
    errorEl.style.display = 'none';

    if (status.status === 'error') {
        statusIcon.textContent = status.connectionError ? '🔗' : '🔴';
        statusText.textContent = status.connectionError ? 'Connection Error' : 'Error';
        errorEl.querySelector('span').textContent = status.message;
        errorEl.style.display = 'block';
        return;
    }
    
    // Handle not managed or not found states
    if (status.status === 'not_managed' || status.status === 'not_found') {
        statusIcon.textContent = '🟡';
        statusText.textContent = 'Running (Direct)';
        managementEl.textContent = 'Direct';
        managementEl.className = 'management-mode direct-managed';
        pidEl.textContent = status.pid || '--';
        uptimeEl.textContent = status.uptime ? `${status.uptime}s` : '--';
        return;
    }

    pidEl.textContent = status.pid || '--';
    uptimeEl.textContent = status.uptime ? `${status.uptime}s` : '--';
    
    if (status.pm2_managed) {
        statusIcon.textContent = '🟢';
        statusText.textContent = 'Running (PM2)';
        managementEl.textContent = 'PM2';
        managementEl.className = 'management-mode pm2-managed';
        pm2IdEl.textContent = status.pm2_id || '--';
        restartsEl.textContent = status.restart_time || '--';
        cpuEl.textContent = `${status.cpu_usage || 0}%`;
        memoryEl.textContent = status.memory_usage ? `${(status.memory_usage / 1024 / 1024).toFixed(1)} MB` : '--';
    } else {
        statusIcon.textContent = '🟡';
        statusText.textContent = 'Running (Direct)';
        managementEl.textContent = 'Direct';
        managementEl.className = 'management-mode direct-managed';
    }
}

function setupServiceControlButtons() {
    const restartBtn = document.getElementById('restart-backend');
    const stopBtn = document.getElementById('stop-backend');
    const installBtn = document.getElementById('install-pm2-service');
    const copyLogBtn = document.getElementById('copy-log-command');

    if (restartBtn) {
        restartBtn.addEventListener('click', () => handleControlClick('restart', 'Are you sure you want to restart the backend service?'));
    }
    if (stopBtn) {
        stopBtn.addEventListener('click', () => handleControlClick('stop', 'Are you sure you want to stop the backend service? This will disconnect the UI.'));
    }
    if (installBtn) {
        installBtn.addEventListener('click', () => handleControlClick('install-pm2', 'Install the backend to run on boot using PM2?'));
    }

    if (copyLogBtn) {
        copyLogBtn.addEventListener('click', () => {
            const command = document.getElementById('log-command-display').textContent;
            navigator.clipboard.writeText(command).then(() => {
                showToast('Command copied to clipboard!', 'success');
            }, () => {
                showToast('Failed to copy command.', 'error');
            });
        });
    }
}

async function handleControlClick(action, confirmMessage) {
    if (confirmMessage && !confirm(confirmMessage)) {
        return;
    }

    const button = document.getElementById(action === 'install-pm2' ? 'install-pm2-service' : `${action}-backend`);
    button.disabled = true;
    showToast(`Requesting to ${action} backend...`, 'info');

    try {
        const response = await apiCall(`/api/system/${action}`, { method: 'POST' });
        if (response.success) {
            showToast(response.message || `Backend action '${action}' successful!`, 'success');
        } else {
            showToast(response.error || `Action '${action}' failed.`, 'error');
        }
    } catch (error) {
        showToast(`Failed to execute action '${action}': ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        // Refresh status after a short delay to allow backend to process
        setTimeout(updateServiceStatus, 2000);
    }
}

// This function is called by main.js when the tab is switched away from.
export function cleanupBackendService() {
    if (serviceStatusInterval) {
        clearInterval(serviceStatusInterval);
        serviceStatusInterval = null;
    }
}