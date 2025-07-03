/**
 * @file notifications-config.js
 * @description Logic for the Notifications configuration section.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { ConfigSection } from '../components/ConfigSection.js';

// Import notification functions from the main notifications module
import { saveNotificationConfig as saveConfig } from './notifications.js';

async function loadNotificationConfig() {
    try {
        const response = await apiCall('/api/notifications/config');
        document.getElementById('notification-config-editor').value = JSON.stringify(response.config, null, 2);
        showToast('Notification configuration loaded', 'success');
    } catch (error) {
        showToast('Failed to load notification configuration', 'error');
    }
}

// Use the shared save function
const saveNotificationConfig = saveConfig;

function resetNotificationConfig() {
    if (confirm('Are you sure you want to reset the notification configuration to defaults?')) {
        // Implement reset logic here
        showToast('Notification configuration reset', 'success');
    }
}

function applyNotificationConfig() {
    // Implement apply logic here
    showToast('Notification configuration applied', 'success');
}

export function initNotificationConfig() {
    console.log('[INIT] Initializing Notification Config tab...');
    
    // Setup direct button listeners instead of using ConfigSection
    setupNotificationConfigButtons();
    
    // Initialize with current config
    loadNotificationConfig();
}

function setupNotificationConfigButtons() {
    const loadBtn = document.getElementById('load-notification-config');
    const saveBtn = document.getElementById('save-notification-config');
    const resetBtn = document.getElementById('reset-notification-config');
    const applyBtn = document.getElementById('apply-notification-config');
    
    if (loadBtn) {
        loadBtn.addEventListener('click', loadNotificationConfig);
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNotificationConfig);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetNotificationConfig);
    }
    if (applyBtn) {
        applyBtn.addEventListener('click', applyNotificationConfig);
    }
}
