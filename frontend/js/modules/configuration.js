/**
 * @file configuration.js
 * @description Logic for the Configuration Management tab - handles global configuration settings.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { setValue, getValue, setCheckbox, getCheckbox } from '../utils/form-helpers.js';

export function initConfiguration() {
    console.log('[INIT] Initializing Configuration tab...');
    
    // Load current configuration
    loadConfiguration();
    
    // Set up form event listeners
    setupConfigurationEvents();
    
    // Set up action button listeners
    setupActionButtons();
}

async function loadConfiguration() {
    try {
        const config = await apiCall('/api/config');
        populateConfigurationForm(config);
        showToast('Configuration loaded', 'success');
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showToast('Failed to load configuration', 'error');
        
        // Load default values
        populateConfigurationForm(getDefaultConfiguration());
    }
}

function populateConfigurationForm(config) {
    // Global Settings
    setValue('installation-name', config.installation?.name || '');
    setValue('installation-location', config.installation?.location || '');
    setValue('contact-info', config.installation?.contact || '');
    setValue('timezone', config.installation?.timezone || 'America/New_York');
    
    // Monitoring Configuration
    setValue('monitoring-interval', config.monitoring?.interval || 30);
    setValue('heartbeat-interval', config.monitoring?.heartbeatInterval || 300);
    setValue('log-retention', config.monitoring?.logRetention || 30);
    setCheckbox('debug-mode', config.monitoring?.debugMode || false);
    
    // Auto-Recovery Settings
    setCheckbox('auto-restart-apps', config.autoRecovery?.autoRestartApps !== false);
    setValue('restart-delay', config.autoRecovery?.restartDelay || 5);
    setValue('max-restart-attempts', config.autoRecovery?.maxRestartAttempts || 3);
    setCheckbox('auto-reboot', config.autoRecovery?.autoReboot || false);
    
    // Maintenance & Scheduling
    setCheckbox('scheduled-reboot', config.maintenance?.scheduledReboot || false);
    setValue('reboot-frequency', config.maintenance?.rebootFrequency || 'weekly');
    setValue('reboot-time', config.maintenance?.rebootTime || '03:00');
    setCheckbox('app-restart-cycle', config.maintenance?.appRestartCycle || false);
    setValue('restart-cycle-hours', config.maintenance?.restartCycleHours || 24);
    
    // Security Settings
    setCheckbox('remote-access', config.security?.remoteAccess !== false);
}

function getDefaultConfiguration() {
    return {
        installation: {
            name: '',
            location: '',
            contact: '',
            timezone: 'America/New_York'
        },
        monitoring: {
            interval: 30,
            heartbeatInterval: 300,
            logRetention: 30,
            debugMode: false
        },
        autoRecovery: {
            autoRestartApps: true,
            restartDelay: 5,
            maxRestartAttempts: 3,
            autoReboot: false
        },
        maintenance: {
            scheduledReboot: false,
            rebootFrequency: 'weekly',
            rebootTime: '03:00',
            appRestartCycle: false,
            restartCycleHours: 24
        },
        security: {
            remoteAccess: true
        }
    };
}

function getCurrentConfiguration() {
    return {
        installation: {
            name: getValue('installation-name'),
            location: getValue('installation-location'),
            contact: getValue('contact-info'),
            timezone: getValue('timezone')
        },
        monitoring: {
            interval: parseInt(getValue('monitoring-interval')) || 30,
            heartbeatInterval: parseInt(getValue('heartbeat-interval')) || 300,
            logRetention: parseInt(getValue('log-retention')) || 30,
            debugMode: getCheckbox('debug-mode')
        },
        autoRecovery: {
            autoRestartApps: getCheckbox('auto-restart-apps'),
            restartDelay: parseInt(getValue('restart-delay')) || 5,
            maxRestartAttempts: parseInt(getValue('max-restart-attempts')) || 3,
            autoReboot: getCheckbox('auto-reboot')
        },
        maintenance: {
            scheduledReboot: getCheckbox('scheduled-reboot'),
            rebootFrequency: getValue('reboot-frequency'),
            rebootTime: getValue('reboot-time'),
            appRestartCycle: getCheckbox('app-restart-cycle'),
            restartCycleHours: parseInt(getValue('restart-cycle-hours')) || 24
        },
        security: {
            remoteAccess: getCheckbox('remote-access')
        }
    };
}

function setupConfigurationEvents() {
    // Enable/disable dependent fields based on checkbox states
    const scheduledRebootCheckbox = document.getElementById('scheduled-reboot');
    if (scheduledRebootCheckbox) {
        scheduledRebootCheckbox.addEventListener('change', (e) => {
            const dependent = ['reboot-frequency', 'reboot-time'];
            dependent.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.disabled = !e.target.checked;
                }
            });
        });
        // Trigger initial state
        scheduledRebootCheckbox.dispatchEvent(new Event('change'));
    }
    
    const appRestartCycleCheckbox = document.getElementById('app-restart-cycle');
    if (appRestartCycleCheckbox) {
        appRestartCycleCheckbox.addEventListener('change', (e) => {
            const cycleHoursInput = document.getElementById('restart-cycle-hours');
            if (cycleHoursInput) {
                cycleHoursInput.disabled = !e.target.checked;
            }
        });
        // Trigger initial state
        appRestartCycleCheckbox.dispatchEvent(new Event('change'));
    }
}

function setupActionButtons() {
    // Load Configuration
    const loadBtn = document.getElementById('load-config');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadConfiguration);
    }
    
    // Save Configuration
    const saveBtn = document.getElementById('save-config');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                const config = getCurrentConfiguration();
                await apiCall('/api/config', {
                    method: 'POST',
                    body: JSON.stringify(config)
                });
                showToast('Configuration saved successfully', 'success');
            } catch (error) {
                console.error('Failed to save configuration:', error);
                showToast('Failed to save configuration', 'error');
            }
        });
    }
    
    // Reset to Defaults
    const resetBtn = document.getElementById('reset-config');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all configuration to defaults? This cannot be undone.')) {
                populateConfigurationForm(getDefaultConfiguration());
                showToast('Configuration reset to defaults', 'info');
            }
        });
    }
    
    // Apply Configuration
    const applyBtn = document.getElementById('apply-config');
    if (applyBtn) {
        applyBtn.addEventListener('click', async () => {
            try {
                const config = getCurrentConfiguration();
                
                // Save first
                await apiCall('/api/config', {
                    method: 'POST',
                    body: JSON.stringify(config)
                });
                
                // Then apply
                await apiCall('/api/config/apply', {
                    method: 'POST'
                });
                
                showToast('Configuration applied successfully', 'success');
            } catch (error) {
                console.error('Failed to apply configuration:', error);
                showToast('Failed to apply configuration', 'error');
            }
        });
    }
    
    // Maintenance action buttons
    const rebootNowBtn = document.getElementById('reboot-now');
    if (rebootNowBtn) {
        rebootNowBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to reboot the system now? This will interrupt all running applications.')) {
                try {
                    await apiCall('/api/system/reboot', { method: 'POST' });
                    showToast('System reboot initiated', 'warning');
                } catch (error) {
                    console.error('Failed to initiate reboot:', error);
                    showToast('Failed to initiate system reboot', 'error');
                }
            }
        });
    }
    
    const restartAppsBtn = document.getElementById('restart-apps-now');
    if (restartAppsBtn) {
        restartAppsBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to restart all applications? This may interrupt running processes.')) {
                try {
                    await apiCall('/api/system/restart-apps', { method: 'POST' });
                    showToast('Application restart initiated', 'info');
                } catch (error) {
                    console.error('Failed to restart applications:', error);
                    showToast('Failed to restart applications', 'error');
                }
            }
        });
    }
}

// Utility functions are now imported from form-helpers.js
