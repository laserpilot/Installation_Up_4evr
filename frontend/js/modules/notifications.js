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
    setupActionButtons();
    
    // Setup form interactions
    setupFormInteractions();
    
    // Load current configuration and setup toggles
    loadNotificationConfig();
}

function setupChannelToggles() {
    const channels = ['slack', 'discord', 'webhook'];
    
    channels.forEach(channel => {
        const toggle = document.getElementById(`${channel}-enabled`);
        const config = document.getElementById(`${channel}-config`);
        const channelElement = document.querySelector(`.notification-channel[data-channel="${channel}"]`);
        
        if (toggle && config) {
            // Note: Can't easily remove existing listeners, but this shouldn't cause issues
            
            // Add event listener
            toggle.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                config.style.display = isChecked ? 'block' : 'none';
                
                // Add/remove .enabled class for CSS styling
                if (channelElement) {
                    if (isChecked) {
                        channelElement.classList.add('enabled');
                    } else {
                        channelElement.classList.remove('enabled');
                    }
                }
                
                console.log(`[NOTIFICATIONS] ${channel} toggle:`, isChecked ? 'shown' : 'hidden');
            });
            
            // Set initial state based on current checkbox value
            const isChecked = toggle.checked;
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
}

function setupActionButtons() {
    const loadBtn = document.getElementById('load-notification-config');
    const saveBtn = document.getElementById('save-notification-config');
    
    if (loadBtn) {
        loadBtn.addEventListener('click', loadNotificationConfig);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNotificationConfig);
    }
}

function setupFormInteractions() {
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

async function loadNotificationConfig() {
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
    
    // Setup toggle events and ensure visibility is correct
    setupChannelToggles();
    
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
            
            console.log(`[NOTIFICATIONS] ${channel} config visibility:`, isChecked ? 'shown' : 'hidden');
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

async function saveNotificationConfig() {
    try {
        const config = getCurrentConfig();
        await apiCall('/api/notifications/config', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        
        showToast('Notification configuration saved', 'success');
    } catch (error) {
        console.error('Failed to save notification config:', error);
        showToast('Failed to save notification configuration', 'error');
    }
}

// Utility functions are now imported from form-helpers.js

// Export the save function for use by notification-config buttons
export { saveNotificationConfig };