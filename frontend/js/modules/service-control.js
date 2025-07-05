/**
 * @file service-control.js
 * @description Logic for the Service Control tab - manages backend service status and controls.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';

let serviceStatusInterval = null;

export function initServiceControl() {
    console.log('[INIT] Initializing Service Control tab...');
    
    // Initialize service status display
    updateServiceStatus();
    
    // Set up periodic status updates
    if (serviceStatusInterval) {
        clearInterval(serviceStatusInterval);
    }
    serviceStatusInterval = setInterval(updateServiceStatus, 5000);
    
    // Set up button event listeners
    setupServiceControlButtons();
}

async function updateServiceStatus() {
    try {
        const response = await apiCall('/api/system/status');
        const status = response.data || response;
        updateServiceStatusDisplay(status);
    } catch (error) {
        console.error('Failed to fetch service status:', error);
        updateServiceStatusDisplay({
            status: 'error',
            message: 'Unable to connect to backend',
            pid: null,
            uptime: null
        });
    }
}

function updateServiceStatusDisplay(status) {
    const statusIndicator = document.getElementById('service-status-indicator');
    const statusIcon = document.getElementById('service-status-icon');
    const statusText = document.getElementById('service-status-text');
    const pidElement = document.getElementById('service-pid');
    const uptimeElement = document.getElementById('service-uptime');
    
    if (!statusIndicator || !statusIcon || !statusText) return;
    
    // Update status indicator
    statusIndicator.className = 'service-status-indicator';
    
    if (status.status === 'running') {
        statusIndicator.classList.add('status-running');
        statusIcon.textContent = '🟢';
        statusText.textContent = 'Running';
    } else if (status.status === 'error') {
        statusIndicator.classList.add('status-error');
        statusIcon.textContent = '🔴';
        statusText.textContent = status.message || 'Error';
    } else {
        statusIndicator.classList.add('status-unknown');
        statusIcon.textContent = '🟡';
        statusText.textContent = 'Unknown';
    }
    
    // Update service details
    if (pidElement) {
        pidElement.textContent = status.pid || '--';
    }
    if (uptimeElement) {
        uptimeElement.textContent = formatServiceUptime(status.uptime) || '--';
    }
}

function formatServiceUptime(seconds) {
    if (!seconds || seconds < 0) return null;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

function setupServiceControlButtons() {
    const restartBtn = document.getElementById('restart-backend');
    const stopBtn = document.getElementById('stop-backend');
    const startBtn = document.getElementById('start-backend');
    
    if (restartBtn) {
        restartBtn.addEventListener('click', async () => {
            try {
                restartBtn.disabled = true;
                showToast('Restarting backend service...', 'info');
                
                await apiCall('/api/system/restart', { method: 'POST' });
                showToast('Backend service restart initiated', 'success');
                
                // Wait a moment then update status
                setTimeout(updateServiceStatus, 2000);
            } catch (error) {
                console.error('Failed to restart backend:', error);
                showToast('Failed to restart backend service', 'error');
            } finally {
                restartBtn.disabled = false;
            }
        });
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to stop the backend service? This will disconnect all monitoring and controls.')) {
                return;
            }
            
            try {
                stopBtn.disabled = true;
                showToast('Stopping backend service...', 'info');
                
                await apiCall('/api/system/stop', { method: 'POST' });
                showToast('Backend service stopped', 'warning');
                
                // Update UI to show stopped state
                updateServiceStatusDisplay({
                    status: 'stopped',
                    message: 'Stopped',
                    pid: null,
                    uptime: null
                });
                
                // Show start button, hide stop button
                stopBtn.style.display = 'none';
                if (startBtn) startBtn.style.display = 'inline-block';
                
            } catch (error) {
                console.error('Failed to stop backend:', error);
                showToast('Failed to stop backend service', 'error');
            } finally {
                stopBtn.disabled = false;
            }
        });
    }
    
    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            try {
                startBtn.disabled = true;
                showToast('Starting backend service...', 'info');
                
                await apiCall('/api/system/start', { method: 'POST' });
                showToast('Backend service started', 'success');
                
                // Hide start button, show stop button
                startBtn.style.display = 'none';
                if (stopBtn) stopBtn.style.display = 'inline-block';
                
                // Wait a moment then update status
                setTimeout(updateServiceStatus, 2000);
                
            } catch (error) {
                console.error('Failed to start backend:', error);
                showToast('Failed to start backend service', 'error');
            } finally {
                startBtn.disabled = false;
            }
        });
    }
}

// Clean up interval when tab is switched
export function cleanupServiceControl() {
    if (serviceStatusInterval) {
        clearInterval(serviceStatusInterval);
        serviceStatusInterval = null;
    }
}
