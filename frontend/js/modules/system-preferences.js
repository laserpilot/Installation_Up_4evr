/**
 * @file system-preferences.js
 * @description Logic for the System Preferences tab.
 */

import { apiCall } from '../utils/api.js';
import { showToast, showLoading, hideLoading } from '../utils/ui.js';
import { renderSettings } from '../components/SystemSettings.js';

let selectedSettings = new Set();

async function loadSystemPreferences() {
    console.log('[SYSTEM-PREFS] Loading system preferences...');
    try {
        const [allSettings, statusData] = await Promise.all([
            apiCall('/api/system-prefs/settings'),
            apiCall('/api/system-prefs/status')
        ]);

        const statusLookup = (statusData.data || statusData).reduce((acc, status) => {
            acc[status.setting] = status;
            return acc;
        }, {});

        const requiredContainer = document.getElementById('required-settings');
        const optionalContainer = document.getElementById('optional-settings');

        const settings = allSettings.data || allSettings;
        const requiredSettings = Object.values(settings).filter(s => s.required);
        const optionalSettings = Object.values(settings).filter(s => !s.required);

        renderSettings(requiredContainer, requiredSettings, statusLookup);
        renderSettings(optionalContainer, optionalSettings, statusLookup);

        addCheckboxListeners(requiredContainer);
        addCheckboxListeners(optionalContainer);

    } catch (error) {
        console.error('[SYSTEM-PREFS] Failed to load system preferences:', error);
        showToast('Failed to load system preferences', 'error');
    }
}

function addCheckboxListeners(container) {
    container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const settingId = e.target.dataset.setting;
            const settingItem = e.target.closest('.setting-item');
            const isDangerSetting = e.target.dataset.danger === 'true';

            if (e.target.checked) {
                if (isDangerSetting) {
                    const settingName = settingItem.querySelector('h4').textContent.replace('⚠️', '').trim();
                    const confirmed = confirm(
                        `⚠️ DANGER ZONE SETTING ⚠️\n\n` +
                        `You are about to enable: "${settingName}"\n\n` +
                        `This setting may compromise system security or stability. ` +
                        `Only proceed if you understand the risks and have proper backups.\n\n` +
                        `Continue with this dangerous setting?`
                    );
                    
                    if (!confirmed) {
                        e.target.checked = false;
                        return;
                    }
                }
                
                selectedSettings.add(settingId);
                settingItem.classList.add('selected');
            } else {
                selectedSettings.delete(settingId);
                settingItem.classList.remove('selected');
            }
        });
    });
}

async function verifySettings() {
    console.log('[VERIFY] Starting system settings verification...');
    showLoading('Checking current system settings status...');
    
    try {
        const response = await apiCall('/api/system-prefs/verify');
        if (response.success && response.data) {
            // Re-render the settings with the new status
            loadSystemPreferences();

            const settingsData = response.data;
            const appliedCount = settingsData.filter(s => s.status === 'applied').length;
            const needsAttentionCount = settingsData.filter(s => s.status === 'not_applied').length;
            const errorCount = settingsData.filter(s => s.status === 'error').length;
            const totalCount = settingsData.length;
            
            let summaryMessage = `Verification complete: ${appliedCount}/${totalCount} settings properly configured`;
            if (needsAttentionCount > 0) {
                summaryMessage += `, ${needsAttentionCount} need attention`;
            }
            if (errorCount > 0) {
                summaryMessage += `, ${errorCount} have errors`;
            }
            
            showToast(summaryMessage, needsAttentionCount > 0 || errorCount > 0 ? 'warning' : 'success');
        } else {
            showToast('Verification completed with warnings', 'warning');
        }
    } catch (error) {
        console.error('[VERIFY] Verification failed:', error);
        showToast(`Failed to verify settings: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function applySelectedSettings() {
    if (selectedSettings.size === 0) {
        showToast('Please select settings to apply', 'warning');
        return;
    }

    showLoading('Applying selected settings...');
    try {
        const results = await apiCall('/api/system-prefs/apply', {
            method: 'POST',
            body: JSON.stringify({ settings: Array.from(selectedSettings) })
        });
        showToast(`Applied ${selectedSettings.size} settings successfully!`, 'success');
        loadSystemPreferences(); // Refresh the view
    } catch (error) {
        showToast('Failed to apply selected settings', 'error');
    }
} 

async function applyRequiredSettings() {
    showLoading('Applying required settings...');
    try {
        const results = await apiCall('/api/system-prefs/apply-required', {
            method: 'POST'
        });
        showToast('Required settings applied successfully!', 'success');
        loadSystemPreferences(); // Refresh the view
    } catch (error) {
        showToast('Failed to apply required settings', 'error');
    }
} 

export function initSystemPreferences() {
    document.getElementById('verify-settings').addEventListener('click', verifySettings);
    document.getElementById('apply-required').addEventListener('click', applyRequiredSettings);
    document.getElementById('apply-selected').addEventListener('click', applySelectedSettings);

    loadSystemPreferences();
}
