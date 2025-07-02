/**
 * @file monitoring-config.js
 * @description Logic for the Monitoring configuration section.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { ConfigSection } from '../components/ConfigSection.js';

async function loadMonitoringConfig() {
    try {
        const response = await apiCall('/api/monitoring/config');
        document.getElementById('monitoring-config-editor').value = JSON.stringify(response.config, null, 2);
        showToast('Monitoring configuration loaded', 'success');
    } catch (error) {
        showToast('Failed to load monitoring configuration', 'error');
    }
}

async function saveMonitoringConfig() {
    try {
        const config = JSON.parse(document.getElementById('monitoring-config-editor').value);
        await apiCall('/api/monitoring/config', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        showToast('Monitoring configuration saved', 'success');
    } catch (error) {
        showToast('Failed to save monitoring configuration', 'error');
    }
}

function resetMonitoringConfig() {
    if (confirm('Are you sure you want to reset the monitoring configuration to defaults?')) {
        // Implement reset logic here
        showToast('Monitoring configuration reset', 'success');
    }
}

function applyMonitoringConfig() {
    // Implement apply logic here
    showToast('Monitoring configuration applied', 'success');
}

export function initMonitoringConfig() {
    console.log('[INIT] Initializing Monitoring Config tab...');
    
    // Setup direct button listeners instead of using ConfigSection
    setupMonitoringConfigButtons();
    
    // Setup additional interactions
    setupRefreshButton();
    setupStatusDisplay();
    
    // Initialize with current config and status
    loadMonitoringConfig();
    refreshSystemStatus();
}

function setupMonitoringConfigButtons() {
    const loadBtn = document.getElementById('load-monitoring-config');
    const saveBtn = document.getElementById('save-monitoring-config');
    const resetBtn = document.getElementById('reset-monitoring-config');
    const applyBtn = document.getElementById('apply-monitoring-config');
    
    if (loadBtn) {
        loadBtn.addEventListener('click', loadMonitoringConfig);
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMonitoringConfig);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetMonitoringConfig);
    }
    if (applyBtn) {
        applyBtn.addEventListener('click', applyMonitoringConfig);
    }
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-system-status');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshSystemStatus);
    }
}

function setupStatusDisplay() {
    // Set up periodic status updates for the monitoring config tab
    setInterval(refreshSystemStatus, 10000); // Update every 10 seconds
}

async function refreshSystemStatus() {
    try {
        const response = await apiCall('/api/monitoring/status');
        updateStatusCards(response);
    } catch (error) {
        console.error('Failed to refresh system status:', error);
        showToast('Failed to refresh system status', 'error');
    }
}

function updateStatusCards(data) {
    // Update CPU status
    updateStatusCard('cpu', data.system?.cpu || 0);
    
    // Update Memory status  
    updateStatusCard('memory', data.system?.memory || 0);
    
    // Update Disk status
    updateStatusCard('disk', data.system?.disk || 0);
    
    // Update Temperature status
    updateStatusCard('temperature', data.system?.temperature || 0);
}

function updateStatusCard(type, value) {
    const valueElement = document.getElementById(`current-${type}`);
    const indicatorElement = document.getElementById(`${type}-indicator`);
    const trendElement = document.getElementById(`${type}-trend`);
    
    if (valueElement) {
        if (type === 'temperature') {
            valueElement.textContent = `${Math.round(value)}°C`;
        } else {
            valueElement.textContent = `${Math.round(value)}%`;
        }
    }
    
    if (indicatorElement) {
        if (value > 80) {
            indicatorElement.textContent = '🔴';
        } else if (value > 60) {
            indicatorElement.textContent = '🟡';
        } else {
            indicatorElement.textContent = '🟢';
        }
    }
    
    if (trendElement) {
        // Add trend indication (simplified)
        trendElement.textContent = value > 50 ? '📈' : '📉';
    }
}
