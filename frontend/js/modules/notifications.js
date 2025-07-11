/**
 * @file notifications.js
 * @description Logic for the Notifications tab - handles notification channel setup and testing.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { setValue, getValue, setCheckbox, getCheckbox } from '../utils/form-helpers.js';

export function initNotifications() {
    console.log('[INIT] Initializing Notifications tab...');
    
    // Setup test buttons
    setupTestButtons();
    
    // Setup action buttons
    setupNotificationActionButtons();
    
    // Setup form interactions
    setupFormInteractions();
    
    // Setup toggles first (before config load)
    setupChannelToggles();
    
    // Load current configuration
    loadMainNotificationConfig();
}

function setupChannelToggles() {
    const channels = ['slack', 'discord', 'webhook', 'email'];
    
    channels.forEach(channel => {
        const toggle = document.getElementById(`${channel}-enabled`);
        const config = document.getElementById(`${channel}-config`);
        const channelElement = document.querySelector(`.notification-channel[data-channel="${channel}"]`);
        
        if (toggle && config) {
            console.log(`[NOTIFICATIONS] Setting up ${channel} toggle`);
            
            // Remove any existing event listeners by cloning the element
            const newToggle = toggle.cloneNode(true);
            toggle.parentNode.replaceChild(newToggle, toggle);

            // FIX: Find the visual slider and link its click to the actual checkbox
            const slider = channelElement ? channelElement.querySelector('.toggle-slider') : null;
            if (slider) {
                slider.addEventListener('click', () => newToggle.click());
            }
            
            // Add event listener to the new element
            newToggle.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                console.log(`[NOTIFICATIONS] ${channel} toggle changed:`, isChecked);
                
                config.style.display = isChecked ? 'block' : 'none';
                
                // Add/remove .enabled class for CSS styling
                if (channelElement) {
                    if (isChecked) {
                        channelElement.classList.add('enabled');
                    } else {
                        channelElement.classList.remove('enabled');
                    }
                }
                
                console.log(`[NOTIFICATIONS] ${channel} config visibility:`, isChecked ? 'shown' : 'hidden');
            });
            
            // Set initial state based on current checkbox value
            const isChecked = newToggle.checked;
            config.style.display = isChecked ? 'block' : 'none';
            
            // Set initial .enabled class state
            if (channelElement) {
                if (isChecked) {
                    channelElement.classList.add('enabled');
                } else {
                    channelElement.classList.remove('enabled');
                }
            }
            
            console.log(`[NOTIFICATIONS] ${channel} initial state:`, isChecked ? 'shown' : 'hidden');
        } else {
            console.warn(`[NOTIFICATIONS] Could not find elements for ${channel}:`, { toggle: !!toggle, config: !!config });
        }
    });
}

function setupTestButtons() {
    const testSlackBtn = document.getElementById('test-slack');
    const testDiscordBtn = document.getElementById('test-discord');
    const testWebhookBtn = document.getElementById('test-webhook');
    
    if (testSlackBtn) {
        testSlackBtn.addEventListener('click', () => testNotificationChannel('slack'));
    }
    
    if (testDiscordBtn) {
        testDiscordBtn.addEventListener('click', () => testNotificationChannel('discord'));
    }
    
    if (testWebhookBtn) {
        testWebhookBtn.addEventListener('click', () => testNotificationChannel('webhook'));
    }

    const testAllBtn = document.getElementById('test-all-channels');
    if (testAllBtn) {
        testAllBtn.addEventListener('click', testAllChannels);
    }
}

function setupNotificationActionButtons() {
    const loadBtn = document.getElementById('load-notification-config');
    const saveBtn = document.getElementById('save-notification-config');
    
    if (loadBtn) {
        loadBtn.addEventListener('click', loadMainNotificationConfig);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNotificationConfig);
    }
}

function setupFormInteractions() {
    // Auto-save configuration when fields change
    setupAutoSave();
    
    // Auto-fill Slack channel if webhook URL is detected
    const slackWebhookInput = document.getElementById('slack-webhook-url');
    if (slackWebhookInput) {
        slackWebhookInput.addEventListener('blur', () => {
            const url = slackWebhookInput.value;
            if (url && url.includes('hooks.slack.com')) {
                // Valid Slack webhook detected
                showToast('Slack webhook URL detected', 'success');
            }
        });
    }
    
    // Auto-fill Discord username when webhook URL is provided
    const discordWebhookInput = document.getElementById('discord-webhook-url');
    if (discordWebhookInput) {
        discordWebhookInput.addEventListener('blur', () => {
            const url = discordWebhookInput.value;
            if (url && url.includes('discord.com/api/webhooks')) {
                // Valid Discord webhook detected
                showToast('Discord webhook URL detected', 'success');
            }
        });
    }
}

function setupAutoSave() {
    // List of input fields that should trigger auto-save
    const fieldsToWatch = [
        'slack-webhook-url', 'slack-channel', 'slack-username', 'slack-icon',
        'discord-webhook-url', 'discord-username', 'discord-avatar-url',
        'webhook-url', 'webhook-method', 'webhook-format'
    ];
    
    // List of checkboxes that should trigger auto-save
    const checkboxesToWatch = [
        'slack-enabled', 'discord-enabled', 'webhook-enabled',
        'notify-app-crash', 'notify-high-cpu', 'notify-high-memory', 
        'notify-low-disk', 'notify-daily-status',
        'notify-severity-warning', 'notify-severity-critical', 'notify-severity-info'
    ];
    
    // Debounce function to avoid excessive saves
    let saveTimeout;
    function debouncedSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveNotificationConfig(true); // Silent auto-save
        }, 1000); // Save 1 second after last change
    }
    
    // Setup auto-save for text inputs
    fieldsToWatch.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', debouncedSave);
            field.addEventListener('change', debouncedSave);
        }
    });
    
    // Setup auto-save for checkboxes
    checkboxesToWatch.forEach(checkboxId => {
        const checkbox = document.getElementById(checkboxId);
        if (checkbox) {
            checkbox.addEventListener('change', debouncedSave);
        }
    });
}

async function loadMainNotificationConfig() {
    try {
        const response = await apiCall('/api/notifications/config');
        populateNotificationConfig(response.config || getDefaultConfig());
    } catch (error) {
        console.error('Failed to load notification config:', error);
        populateNotificationConfig(getDefaultConfig());
    }
}

function getDefaultConfig() {
    return {
        slack: {
            enabled: false,
            webhookUrl: '',
            channel: '#alerts',
            username: 'Installation Up 4evr',
            icon: ':computer:'
        },
        discord: {
            enabled: false,
            webhookUrl: '',
            username: 'Installation Up 4evr',
            avatarUrl: ''
        },
        webhook: {
            enabled: false,
            url: '',
            method: 'POST',
            headers: {},
            format: 'json'
        }
    };
}

function populateNotificationConfig(config) {
    // Slack configuration
    setCheckbox('slack-enabled', config.slack?.enabled || false);
    setValue('slack-webhook-url', config.slack?.webhookUrl || '');
    setValue('slack-channel', config.slack?.channel || '#alerts');
    setValue('slack-username', config.slack?.username || 'Installation Up 4evr');
    setValue('slack-icon', config.slack?.icon || ':computer:');
    
    // Discord configuration
    setCheckbox('discord-enabled', config.discord?.enabled || false);
    setValue('discord-webhook-url', config.discord?.webhookUrl || '');
    setValue('discord-username', config.discord?.username || 'Installation Up 4evr');
    setValue('discord-avatar-url', config.discord?.avatarUrl || '');
    
    // Webhook configuration
    setCheckbox('webhook-enabled', config.webhook?.enabled || false);
    setValue('webhook-url', config.webhook?.url || '');
    setValue('webhook-method', config.webhook?.method || 'POST');
    setValue('webhook-format', config.webhook?.format || 'json');

    // Notification triggers
    if (config.triggers) {
        setCheckbox('notify-app-crash', config.triggers.app_crash !== false); // Default to true
        setCheckbox('notify-high-cpu', config.triggers.high_cpu !== false); // Default to true
        setCheckbox('notify-high-memory', config.triggers.high_memory);
        setCheckbox('notify-low-disk', config.triggers.low_disk);
        setCheckbox('notify-daily-status', config.triggers.daily_status);
    }

    // Severity level filters
    if (config.severity) {
        setCheckbox('notify-severity-warning', config.severity.warning !== false); // Default to true
        setCheckbox('notify-severity-critical', config.severity.critical !== false); // Default to true
        setCheckbox('notify-severity-info', config.severity.info || false); // Default to false
    }

    // Update visibility and enabled class based on toggle states after config is loaded
    const channels = ['slack', 'discord', 'webhook'];
    channels.forEach(channel => {
        const toggle = document.getElementById(`${channel}-enabled`);
        const configDiv = document.getElementById(`${channel}-config`);
        const channelElement = document.querySelector(`.notification-channel[data-channel="${channel}"]`);
        
        if (toggle && configDiv) {
            const isChecked = toggle.checked;
            configDiv.style.display = isChecked ? 'block' : 'none';
            
            // Add/remove .enabled class for CSS styling
            if (channelElement) {
                if (isChecked) {
                    channelElement.classList.add('enabled');
                } else {
                    channelElement.classList.remove('enabled');
                }
            }
            
            console.log(`[NOTIFICATIONS] ${channel} config loaded with visibility:`, isChecked ? 'shown' : 'hidden');
        }
    });
}

function getCurrentConfig() {
    return {
        slack: {
            enabled: getCheckbox('slack-enabled'),
            webhookUrl: getValue('slack-webhook-url'),
            channel: getValue('slack-channel'),
            username: getValue('slack-username'),
            icon: getValue('slack-icon')
        },
        discord: {
            enabled: getCheckbox('discord-enabled'),
            webhookUrl: getValue('discord-webhook-url'),
            username: getValue('discord-username'),
            avatarUrl: getValue('discord-avatar-url')
        },
        webhook: {
            enabled: getCheckbox('webhook-enabled'),
            url: getValue('webhook-url'),
            method: getValue('webhook-method'),
            format: getValue('webhook-format')
        },
        triggers: {
            app_crash: getCheckbox('notify-app-crash'),
            high_cpu: getCheckbox('notify-high-cpu'),
            high_memory: getCheckbox('notify-high-memory'),
            low_disk: getCheckbox('notify-low-disk'),
            daily_status: getCheckbox('notify-daily-status')
        },
        severity: {
            warning: getCheckbox('notify-severity-warning'),
            critical: getCheckbox('notify-severity-critical'),
            info: getCheckbox('notify-severity-info')
        }
    };
}

async function testNotificationChannel(channel) {
    try {
        const config = getCurrentConfig();
        const channelConfig = config[channel];
        
        if (!channelConfig.enabled) {
            showToast(`${channel} notifications are not enabled`, 'warning');
            return;
        }
        
        const response = await apiCall(`/api/notifications/test/${channel}`, {
            method: 'POST',
            body: JSON.stringify({
                config: channelConfig,
                message: `Test notification from Installation Up 4evr at ${new Date().toLocaleString()}`
            })
        });
        
        if (response.success) {
            showToast(`${channel} test notification sent successfully`, 'success');
        } else {
            showToast(`${channel} test failed: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error(`Failed to test ${channel} notification:`, error);
        showToast(`Failed to test ${channel} notification`, 'error');
    }
}

async function saveNotificationConfig(silent = false) {
    try {
        const config = getCurrentConfig();
        const response = await apiCall('/api/notifications/config', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        
        if (!silent) {
            showToast('Notification configuration saved', 'success');
        }
        
        console.log('[NOTIFICATIONS] Configuration saved successfully', { config });
        return response;
    } catch (error) {
        console.error('Failed to save notification config:', error);
        if (!silent) {
            showToast('Failed to save notification configuration', 'error');
        }
        throw error;
    }
}

async function testAllChannels() {
    showToast('Sending test notifications to all enabled channels...', 'info');
    const config = getCurrentConfig();
    const channels = ['slack', 'discord', 'webhook', 'email'];
    let testsSent = 0;

    for (const channel of channels) {
        if (config[channel] && config[channel].enabled) {
            try {
                await testNotificationChannel(channel);
                testsSent++;
            } catch (error) {
                // The error is already shown by testNotificationChannel
            }
        }
    }

    if (testsSent === 0) {
        showToast('No notification channels are enabled.', 'warning');
    }
}

// Utility functions are now imported from form-helpers.js

async function resetNotificationConfig() {
    if (confirm('Are you sure you want to reset the notification configuration to defaults?')) {
        try {
            // Reset to default configuration
            const defaultConfig = getDefaultConfig();
            populateNotificationConfig(defaultConfig);
            await saveNotificationConfig();
            showToast('Notification configuration reset to defaults', 'success');
        } catch (error) {
            console.error('Failed to reset notification config:', error);
            showToast('Failed to reset notification configuration', 'error');
        }
    }
}

// Export functions for external use
export { saveNotificationConfig, loadMainNotificationConfig, getCurrentConfig, resetNotificationConfig };