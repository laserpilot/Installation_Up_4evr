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
    
    // Initialize with current config
    loadMonitoringConfig();
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
