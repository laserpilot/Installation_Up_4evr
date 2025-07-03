/**
 * @file system-preferences.js
 * @description Logic for the System Preferences tab.
 */

import { apiCall, MasterConfigAPI } from '../utils/api.js';
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
        
        // Update master configuration with applied settings
        await updateMasterConfigWithAppliedSettings(Array.from(selectedSettings));
        
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
        
        // Update master configuration with required settings
        const allSettings = await apiCall('/api/system-prefs/settings');
        const requiredSettingIds = Object.values(allSettings.data || allSettings)
            .filter(s => s.required)
            .map(s => s.id);
        await updateMasterConfigWithAppliedSettings(requiredSettingIds);
        
        showToast('Required settings applied successfully!', 'success');
        loadSystemPreferences(); // Refresh the view
    } catch (error) {
        showToast('Failed to apply required settings', 'error');
    }
}

async function generateTerminalCommands() {
    try {
        showLoading('Generating terminal commands...');
        const response = await apiCall('/api/system-prefs/generate-commands');
        
        if (response.success && response.data) {
            // Extract commands from nested structure
            const commands = response.data.data?.commands || response.data.commands || 'No commands available';
            
            // Create a modal to display the commands
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-terminal"></i> Terminal Commands</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Copy and paste these commands into Terminal to apply system settings manually:</p>
                        <pre class="code-block" id="terminal-commands">${commands}</pre>
                        <div class="modal-actions">
                            <button class="btn btn-primary" id="copy-commands">
                                <i class="fas fa-copy"></i> Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add show class for animation
            setTimeout(() => modal.classList.add('show'), 10);
            
            // Add event listeners
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => document.body.removeChild(modal), 200);
            });
            
            modal.querySelector('#copy-commands').addEventListener('click', () => {
                const commands = modal.querySelector('#terminal-commands').textContent;
                navigator.clipboard.writeText(commands).then(() => {
                    showToast('Commands copied to clipboard!', 'success');
                });
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    setTimeout(() => document.body.removeChild(modal), 200);
                }
            });
        }
    } catch (error) {
        console.error('[SYSTEM-PREFS] Failed to generate terminal commands:', error);
        showToast('Failed to generate terminal commands', 'error');
    } finally {
        hideLoading();
    }
}

async function generateRestoreScript() {
    try {
        showLoading('Generating restore script...');
        const response = await apiCall('/api/system-prefs/generate-restore');
        
        if (response.success && response.data) {
            // Extract commands from nested structure
            const commands = response.data.data?.commands || response.data.commands || 'No commands available';
            
            // Create a modal to display the restore script
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-undo"></i> Restore Script</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="warning-banner">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Warning:</strong> This will restore all system settings to macOS defaults.
                        </div>
                        <p>Copy and paste these commands into Terminal to restore system settings:</p>
                        <pre class="code-block" id="restore-commands">${commands}</pre>
                        <div class="modal-actions">
                            <button class="btn btn-primary" id="copy-restore-commands">
                                <i class="fas fa-copy"></i> Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add show class for animation
            setTimeout(() => modal.classList.add('show'), 10);
            
            // Add event listeners
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => document.body.removeChild(modal), 200);
            });
            
            modal.querySelector('#copy-restore-commands').addEventListener('click', () => {
                const commands = modal.querySelector('#restore-commands').textContent;
                navigator.clipboard.writeText(commands).then(() => {
                    showToast('Restore commands copied to clipboard!', 'success');
                });
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                    setTimeout(() => document.body.removeChild(modal), 200);
                }
            });
        }
    } catch (error) {
        console.error('[SYSTEM-PREFS] Failed to generate restore script:', error);
        showToast('Failed to generate restore script', 'error');
    } finally {
        hideLoading();
    }
}

// Master Configuration Integration
async function updateMasterConfigWithAppliedSettings(appliedSettings) {
    try {
        // Get current state
        const statusResponse = await apiCall('/api/system-prefs/status');
        const currentState = (statusResponse.data || statusResponse).reduce((acc, status) => {
            acc[status.setting] = status.status;
            return acc;
        }, {});
        
        // Update master config with applied settings and current state
        await MasterConfigAPI.updateSystemPreferencesState(appliedSettings, currentState);
        
        console.log('[SYSTEM-PREFS] Updated master configuration with applied settings');
    } catch (error) {
        console.warn('[SYSTEM-PREFS] Failed to update master configuration:', error);
        // Don't fail the main operation if master config update fails
    }
}

async function loadMasterConfigState() {
    try {
        const response = await MasterConfigAPI.getSystemPreferencesState();
        if (response.success && response.data) {
            const { applied, currentState, lastVerified } = response.data;
            
            // Update UI to show previously applied settings
            if (applied && Array.isArray(applied)) {
                applied.forEach(settingId => {
                    const checkbox = document.querySelector(`input[data-setting="${settingId}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        selectedSettings.add(settingId);
                        checkbox.closest('.setting-item')?.classList.add('selected');
                    }
                });
            }
            
            // Show last verification time if available
            if (lastVerified) {
                const verifyButton = document.getElementById('verify-settings');
                if (verifyButton) {
                    const lastVerifiedDate = new Date(lastVerified).toLocaleString();
                    verifyButton.title = `Last verified: ${lastVerifiedDate}`;
                }
            }
        }
    } catch (error) {
        console.warn('[SYSTEM-PREFS] Failed to load master config state:', error);
        // Continue without master config integration
    }
}

export function initSystemPreferences() {
    document.getElementById('verify-settings').addEventListener('click', verifySettings);
    document.getElementById('apply-required').addEventListener('click', applyRequiredSettings);
    document.getElementById('apply-selected').addEventListener('click', applySelectedSettings);
    document.getElementById('generate-script').addEventListener('click', generateTerminalCommands);
    document.getElementById('generate-restore-script').addEventListener('click', generateRestoreScript);

    loadSystemPreferences();
    
    // Load master configuration state after initial load
    setTimeout(() => {
        loadMasterConfigState();
    }, 500);
}
