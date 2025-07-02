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
    new ConfigSection('monitoring-config-section', {
        load: loadMonitoringConfig,
        save: saveMonitoringConfig,
        reset: resetMonitoringConfig,
        apply: applyMonitoringConfig
    });
}
