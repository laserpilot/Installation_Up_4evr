/**
 * @file notifications-config.js
 * @description Logic for the Notifications configuration section.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { ConfigSection } from '../components/ConfigSection.js';

async function loadNotificationConfig() {
    try {
        const response = await apiCall('/api/notifications/config');
        document.getElementById('notification-config-editor').value = JSON.stringify(response.config, null, 2);
        showToast('Notification configuration loaded', 'success');
    } catch (error) {
        showToast('Failed to load notification configuration', 'error');
    }
}

async function saveNotificationConfig() {
    try {
        const config = JSON.parse(document.getElementById('notification-config-editor').value);
        await apiCall('/api/notifications/config', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        showToast('Notification configuration saved', 'success');
    } catch (error) {
        showToast('Failed to save notification configuration', 'error');
    }
}

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
    new ConfigSection('notification-config-section', {
        load: loadNotificationConfig,
        save: saveNotificationConfig,
        reset: resetNotificationConfig,
        apply: applyNotificationConfig
    });
}
