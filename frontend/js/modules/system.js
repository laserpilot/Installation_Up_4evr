/**
 * @file system-preferences.js
 * @description Logic for the System Preferences tab.
 */

import { apiCall, MasterConfigAPI } from '../utils/api.js';
import { showToast, showLoading, hideLoading } from '../utils/ui.js';
import { renderSettings } from '../components/SystemSettings.js';
import { setValue, getValue, synchronizeSliderInput, loadMasterConfigState, saveMasterConfig } from '../utils/form-helpers.js';

let selectedSettings = new Set();

async function loadSystemPreferences() {
    console.log('[SYSTEM-PREFS] Loading system preferences...');
    try {
        const [allSettings, statusData] = await Promise.all([
            apiCall('/api/system-prefs/settings'),
            apiCall('/api/system/settings/status')
        ]);

        const statusLookup = statusData.reduce((acc, status) => {
            acc[status.setting] = status;
            return acc;
        }, {});
        
        const requiredContainer = document.getElementById('required-settings');
        const optionalContainer = document.getElementById('optional-settings');

        const settings = allSettings.data || allSettings;
        
        // Convert settings object to array with proper IDs
        const settingsWithIds = Object.entries(settings).map(([key, setting]) => ({
            id: key,
            ...setting
        }));
        
        const requiredSettings = settingsWithIds.filter(s => s.required);
        const optionalSettings = settingsWithIds.filter(s => !s.required);
        
        console.log('[SYSTEM-PREFS] Settings with IDs:', settingsWithIds.map(s => s.id));
        console.log('[SYSTEM-PREFS] Status lookup keys:', Object.keys(statusLookup));
        console.log('[SYSTEM-PREFS] Status data sample:', statusData.slice(0, 3));
        console.log('[SYSTEM-PREFS] First setting with ID:', settingsWithIds[0]);

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
                    e.target.checked = false; // Uncheck immediately
                    const settingName = settingItem.querySelector('h4').textContent.replace('⚠️', '').trim();
                    const settingDescription = settingItem.querySelector('p').textContent;
                    
                    showExpertWarningModal(settingId, settingName, settingDescription, () => {
                        // Only check after confirmation
                        e.target.checked = true;
                        selectedSettings.add(settingId);
                        settingItem.classList.add('selected');
                    });
                    return;
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

async function refreshSettings() {
    console.log('[REFRESH] Refreshing system preferences...');
    const refreshButton = document.getElementById('refresh-settings');
    const originalText = refreshButton.innerHTML;
    
    // Update button to show loading state
    refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshButton.disabled = true;
    
    try {
        // Clear selected settings to start fresh
        selectedSettings.clear();
        
        // Reload all system preferences
        await loadSystemPreferences();
        
        showToast('Settings status refreshed successfully!', 'success');
    } catch (error) {
        console.error('[REFRESH] Failed to refresh settings:', error);
        showToast('Failed to refresh settings status', 'error');
    } finally {
        // Restore button
        refreshButton.innerHTML = originalText;
        refreshButton.disabled = false;
    }
}

async function verifySettings() {
    console.log('[VERIFY] Starting system settings verification...');
    showLoading('Checking current system settings status...');
    
    try {
        const settingsData = await apiCall('/api/system/settings/status');
        if (settingsData && Array.isArray(settingsData)) {
            // Re-render the settings with the new status
            loadSystemPreferences();

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
        if (selectedSettings.size === 0) {
            showToast('Please select settings to generate commands for', 'warning');
            return;
        }
        
        showLoading('Generating terminal commands...');
        const response = await apiCall('/api/system-prefs/generate-commands', {
            method: 'POST',
            body: JSON.stringify({ settings: Array.from(selectedSettings) })
        });
        
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
                        <p>Copy and paste these commands into Terminal to apply the ${selectedSettings.size} selected system settings manually:</p>
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

async function loadSystemPrefsMasterConfig() {
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

// Expert Warning Modal System
function showExpertWarningModal(settingId, settingName, settingDescription, onConfirm) {
    const existingModal = document.querySelector('.expert-warning-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'expert-warning-modal';
    
    // Define risk information for different danger settings
    const riskInfo = {
        disableGatekeeper: {
            risks: [
                'Allows unsigned applications to run without warning',
                'Increases risk of malware installation',
                'May void system security compliance',
                'Could allow malicious code execution'
            ],
            severity: 'CRITICAL SECURITY RISK'
        },
        allowAppsAnywhere: {
            risks: [
                'Bypasses all application signature verification',
                'Extremely high malware risk',
                'May violate organizational security policies',
                'Could compromise system integrity'
            ],
            severity: 'EXTREME SECURITY RISK'
        },
        disableCrashReporter: {
            risks: [
                'Requires disabling System Integrity Protection (SIP)',
                'May hide critical application failures',
                'Could mask security vulnerabilities',
                'System becomes less debuggable'
            ],
            severity: 'SYSTEM INTEGRITY RISK'
        }
    };

    const currentRisk = riskInfo[settingId] || {
        risks: [
            'May compromise system security',
            'Could affect system stability',
            'May have unintended side effects',
            'Requires advanced system knowledge'
        ],
        severity: 'SECURITY RISK'
    };

    modal.innerHTML = `
        <div class="expert-warning-content">
            <div class="expert-warning-header">
                <div class="expert-warning-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div>
                    <h2 class="expert-warning-title">⚠️ EXPERT / DANGER ZONE</h2>
                    <p class="expert-warning-subtitle">${currentRisk.severity}</p>
                </div>
            </div>
            
            <div class="expert-warning-body">
                <p>You are about to enable a dangerous system setting:</p>
                <p class="setting-name-highlight">${settingName}</p>
                <p><strong>Description:</strong> ${settingDescription}</p>
                
                <div class="risk-list">
                    <h4><i class="fas fa-exclamation-circle"></i> Potential Risks:</h4>
                    <ul>
                        ${currentRisk.risks.map(risk => `<li>${risk}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="confirmation-section">
                    <p class="confirmation-text">⚠️ Only proceed if you:</p>
                    <div class="confirmation-checkbox">
                        <input type="checkbox" id="understand-risks">
                        <label for="understand-risks">Understand the security implications and risks</label>
                    </div>
                    <div class="confirmation-checkbox">
                        <input type="checkbox" id="have-backups">
                        <label for="have-backups">Have current system backups and recovery plan</label>
                    </div>
                    <div class="confirmation-checkbox">
                        <input type="checkbox" id="accept-responsibility">
                        <label for="accept-responsibility">Accept full responsibility for any system issues</label>
                    </div>
                </div>
            </div>
            
            <div class="expert-warning-actions">
                <button class="btn-expert-cancel">
                    <i class="fas fa-times"></i> Cancel (Recommended)
                </button>
                <button class="btn-expert-proceed" id="proceed-button" disabled>
                    <i class="fas fa-exclamation-triangle"></i> I Accept the Risks
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Handle checkbox validation
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
    const proceedButton = modal.querySelector('#proceed-button');
    
    function updateProceedButton() {
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        if (allChecked) {
            proceedButton.disabled = false;
            proceedButton.classList.add('enabled');
        } else {
            proceedButton.disabled = true;
            proceedButton.classList.remove('enabled');
        }
    }

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateProceedButton);
    });

    // Handle button clicks
    modal.querySelector('.btn-expert-cancel').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('.btn-expert-proceed').addEventListener('click', () => {
        if (!proceedButton.disabled) {
            modal.remove();
            onConfirm();
            showToast(`Enabled dangerous setting: ${settingName}`, 'warning');
        }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Close on escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Educational tooltips and help system
function initializeTooltips() {
    console.log('[SYSTEM-PREFS] Initializing educational tooltips...');
    
    // Add tooltip to Verify Settings button
    addTooltip('verify-settings', {
        title: "Why verify settings?",
        content: "Check your current macOS settings against recommended values for creative installations. This helps ensure your system won't sleep during performances or automatically restart applications.",
        undoInfo: "Verification is read-only and makes no changes to your system."
    });
    
    // Add tooltip to Apply Required button
    addTooltip('apply-required', {
        title: "Why these settings matter",
        content: "Required settings prevent system sleep, disable screensavers, and stop automatic updates during creative performances. These are essential for uninterrupted installations.",
        undoInfo: "To undo: Use 'Generate Restore Script' button to create commands that revert to macOS defaults."
    });
    
    // Add tooltip to Generate Script button
    addTooltip('generate-script', {
        title: "Why generate terminal commands?",
        content: "Terminal commands let you verify what changes will be made before applying them. You can also run these commands manually for precise control over your system configuration.",
        undoInfo: "These commands are safe and match exactly what the 'Apply' buttons do."
    });
    
    // Add help text to setting sections
    addSectionHelp('required-settings', {
        title: "💡 Essential Settings for Creative Installations",
        content: "These settings ensure your installation runs continuously without interruption. They prevent system sleep, disable screensavers, and stop automatic restarts.",
        benefits: [
            "No interruptions during performances",
            "Consistent uptime for multi-day installations", 
            "Prevents unexpected system updates",
            "Maintains display brightness and connectivity"
        ]
    });
    
    addSectionHelp('optional-settings', {
        title: "🔧 Additional Optimizations",
        content: "Optional settings that can improve performance and user experience for specific installation types.",
        benefits: [
            "Enhanced security for public installations",
            "Better performance for graphics-intensive work",
            "Improved accessibility and user experience"
        ]
    });
}

function addTooltip(elementId, config) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'educational-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <i class="fas fa-info-circle"></i>
            <span>${config.title}</span>
        </div>
        <div class="tooltip-content">
            <p>${config.content}</p>
            ${config.undoInfo ? `
                <div class="undo-info">
                    <i class="fas fa-undo"></i>
                    <span>How to undo: ${config.undoInfo}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    // Position tooltip optimally to avoid covering button
    const buttonContainer = element.closest('.button-group, .action-buttons, .actions-container, .modal-actions') || element.parentNode;
    
    // Add button-group class if not already present to enable better positioning
    if (!buttonContainer.classList.contains('button-group') && 
        !buttonContainer.classList.contains('action-buttons') &&
        !buttonContainer.classList.contains('actions-container') && 
        !buttonContainer.classList.contains('modal-actions')) {
        buttonContainer.classList.add('button-group');
    }
    
    // Append tooltip to button container for better positioning
    buttonContainer.appendChild(tooltip);
    
    // Add show/hide on hover
    element.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
        setTimeout(() => tooltip.classList.add('show'), 10);
    });
    
    element.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
        setTimeout(() => tooltip.style.display = 'none', 200);
    });
}

function addSectionHelp(sectionId, config) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    // Find or create section header
    let header = section.previousElementSibling;
    if (!header || !header.classList.contains('section-header')) {
        header = document.createElement('div');
        header.className = 'section-header';
        section.parentNode.insertBefore(header, section);
    }
    
    // Add help info to header
    const helpInfo = document.createElement('div');
    helpInfo.className = 'section-help-info';
    helpInfo.innerHTML = `
        <div class="help-toggle">
            <span class="help-title">${config.title}</span>
            <button class="help-expand-btn">
                <i class="fas fa-chevron-down"></i>
            </button>
        </div>
        <div class="help-content">
            <p>${config.content}</p>
            <ul class="benefits-list">
                ${config.benefits.map(benefit => `<li><i class="fas fa-check"></i> ${benefit}</li>`).join('')}
            </ul>
        </div>
    `;
    
    header.appendChild(helpInfo);
    
    // Add expand/collapse functionality
    const toggleBtn = helpInfo.querySelector('.help-expand-btn');
    const helpContent = helpInfo.querySelector('.help-content');
    
    toggleBtn.addEventListener('click', () => {
        const isExpanded = helpContent.classList.contains('expanded');
        helpContent.classList.toggle('expanded', !isExpanded);
        toggleBtn.querySelector('i').style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
    });
}

export function initSystem() {
    document.getElementById('verify-settings').addEventListener('click', verifySettings);
    document.getElementById('apply-required').addEventListener('click', applyRequiredSettings);
    document.getElementById('apply-selected').addEventListener('click', applySelectedSettings);
    document.getElementById('generate-script').addEventListener('click', generateTerminalCommands);
    document.getElementById('generate-restore-script').addEventListener('click', generateRestoreScript);
    document.getElementById('refresh-settings').addEventListener('click', refreshSettings);

    // Initialize educational tooltips
    initializeTooltips();

    loadSystemPreferences();
    
    // Initialize installation settings functionality
    initInstallationSettings();
    
    // Load master configuration state after initial load
    setTimeout(() => {
        loadSystemPrefsMasterConfig();
    }, 500);
}

// Installation Settings Functions (consolidated from installation-settings.js)

function initInstallationSettings() {
    console.log('[INIT] Initializing Installation Settings tab...');
    
    // Set up form event listeners
    setupSliderSynchronization();
    setupInstallationActionButtons();
    
    // Load current settings
    loadInstallationSettings();
    
    // Load master configuration state after initial load
    setTimeout(() => {
        loadInstallationMasterConfig();
    }, 500);
}

// Master Configuration Integration
async function loadInstallationMasterConfig() {
    try {
        const response = await MasterConfigAPI.load();
        if (response.success && response.data.installationSettings) {
            console.log('[INSTALLATION-SETTINGS] Loaded master config state:', response.data.installationSettings);
            
            // Update UI with saved configuration
            const config = response.data.installationSettings;
            
            // Apply saved settings
            if (config.settings) {
                Object.keys(config.settings).forEach(key => {
                    setValue(key, config.settings[key]);
                });
            }
            
            // Apply saved custom parameters
            if (config.customParameters) {
                config.customParameters.forEach(param => {
                    addCustomParameter(param.name, param.value, param.description);
                });
            }
        }
    } catch (error) {
        console.error('[INSTALLATION-SETTINGS] Failed to load master config state:', error);
    }
}

async function saveInstallationMasterConfig() {
    try {
        // Collect current configuration
        const config = {
            settings: {
                refreshRate: getValue('refresh-rate'),
                maxCpuUsage: getValue('max-cpu-usage'),
                memoryThreshold: getValue('memory-threshold'),
                diskSpaceThreshold: getValue('disk-space-threshold'),
                networkTimeout: getValue('network-timeout'),
                autoRestart: getValue('auto-restart'),
                failsafeMode: getValue('failsafe-mode'),
                debugMode: getValue('debug-mode')
            },
            customParameters: getCustomParameters(),
            lastUpdated: new Date().toISOString()
        };
        
        await MasterConfigAPI.update('installationSettings', config);
        console.log('[INSTALLATION-SETTINGS] Master config saved:', config);
        
    } catch (error) {
        console.error('[INSTALLATION-SETTINGS] Failed to save master config:', error);
    }
}

function getCustomParameters() {
    const parameters = [];
    const customSection = document.getElementById('custom-parameters');
    if (customSection) {
        const paramRows = customSection.querySelectorAll('.custom-param-row');
        paramRows.forEach(row => {
            const nameInput = row.querySelector('.param-name');
            const valueInput = row.querySelector('.param-value');
            const descInput = row.querySelector('.param-desc');
            
            if (nameInput && valueInput && nameInput.value.trim()) {
                parameters.push({
                    name: nameInput.value.trim(),
                    value: valueInput.value.trim(),
                    description: descInput ? descInput.value.trim() : ''
                });
            }
        });
    }
    return parameters;
}

function setupSliderSynchronization() {
    // Synchronize sliders with number inputs
    synchronizeSliderInput('camera-threshold-slider', 'camera-threshold-input');
    synchronizeSliderInput('capacitive-threshold-slider', 'capacitive-threshold-input');
    synchronizeSliderInput('audio-threshold-slider', 'audio-threshold-input');
    synchronizeSliderInput('proximity-threshold-slider', 'proximity-threshold-input');
}

// synchronizeSliderInput is now imported from form-helpers.js

function setupInstallationActionButtons() {
    const testBtn = document.getElementById('test-installation-settings');
    const resetBtn = document.getElementById('reset-installation-settings');
    const applyBtn = document.getElementById('apply-installation-settings');
    
    // Profile buttons
    const addCustomParamBtn = document.getElementById('add-custom-param');
    const loadProfileBtn = document.getElementById('load-profile');
    const saveProfileBtn = document.getElementById('save-profile');
    const exportProfileBtn = document.getElementById('export-profile');
    const importProfileBtn = document.getElementById('import-profile-btn');
    const importProfileInput = document.getElementById('import-profile');
    
    if (testBtn) {
        testBtn.addEventListener('click', testInstallationSettings);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetInstallationSettings);
    }
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyInstallationSettings);
    }
    
    // Profile functionality
    if (addCustomParamBtn) {
        addCustomParamBtn.addEventListener('click', addCustomParameter);
    }
    
    if (loadProfileBtn) {
        loadProfileBtn.addEventListener('click', loadInstallationProfile);
    }
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveInstallationProfile);
    }
    
    if (exportProfileBtn) {
        exportProfileBtn.addEventListener('click', exportInstallationProfile);
    }
    
    if (importProfileBtn) {
        importProfileBtn.addEventListener('click', () => importProfileInput.click());
    }
    
    if (importProfileInput) {
        importProfileInput.addEventListener('change', importInstallationProfile);
    }
}

async function loadInstallationSettings() {
    try {
        const response = await apiCall('/api/installation/settings');
        populateSettings(response.settings || getDefaultSettings());
        showToast('Installation settings loaded', 'success');
    } catch (error) {
        console.error('Failed to load installation settings:', error);
        showToast('Failed to load settings, using defaults', 'warning');
        populateSettings(getDefaultSettings());
    }
}

function getDefaultSettings() {
    return {
        camera: {
            threshold: 25,
            timeout: 30,
            fps: 30
        },
        capacitive: {
            threshold: 50,
            debounce: 100,
            activePins: [0, 1]
        },
        audio: {
            threshold: 60,
            sampleRate: 44100,
            bufferSize: 1024
        },
        proximity: {
            threshold: 75,
            maxDistance: 100,
            units: 'cm'
        }
    };
}

function populateSettings(settings) {
    // Camera Settings
    setValue('camera-threshold-slider', settings.camera?.threshold || 25);
    setValue('camera-threshold-input', settings.camera?.threshold || 25);
    setValue('camera-timeout', settings.camera?.timeout || 30);
    setValue('camera-fps', settings.camera?.fps || 30);
    
    // Capacitive Settings
    setValue('capacitive-threshold-slider', settings.capacitive?.threshold || 50);
    setValue('capacitive-threshold-input', settings.capacitive?.threshold || 50);
    setValue('capacitive-debounce', settings.capacitive?.debounce || 100);
    
    // Set active pins
    const activePins = settings.capacitive?.activePins || [0, 1];
    document.querySelectorAll('input[name="capacitive-pins"]').forEach(checkbox => {
        checkbox.checked = activePins.includes(parseInt(checkbox.value));
    });
    
    // Audio Settings (if they exist in HTML)
    if (settings.audio) {
        setValue('audio-threshold-slider', settings.audio.threshold || 60);
        setValue('audio-threshold-input', settings.audio.threshold || 60);
        setValue('audio-sample-rate', settings.audio.sampleRate || 44100);
        setValue('audio-buffer-size', settings.audio.bufferSize || 1024);
    }
    
    // Proximity Settings (if they exist in HTML)
    if (settings.proximity) {
        setValue('proximity-threshold-slider', settings.proximity.threshold || 75);
        setValue('proximity-threshold-input', settings.proximity.threshold || 75);
        setValue('proximity-max-distance', settings.proximity.maxDistance || 100);
        setValue('proximity-units', settings.proximity.units || 'cm');
    }
    
    // Custom Parameters
    const customParamsList = document.getElementById('custom-params-list');
    if (customParamsList && settings.customParameters) {
        // Clear existing custom parameters
        customParamsList.innerHTML = '';
        
        // Add custom parameters from settings
        Object.entries(settings.customParameters).forEach(([name, value]) => {
            const paramElement = document.createElement('div');
            paramElement.className = 'custom-param-item';
            paramElement.innerHTML = `
                <div class="custom-param-fields">
                    <input type="text" placeholder="Parameter name" class="param-name" value="${name}" />
                    <input type="text" placeholder="Parameter value" class="param-value" value="${value}" />
                    <button type="button" class="btn btn-danger btn-sm remove-param" onclick="this.parentElement.parentElement.remove()">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            customParamsList.appendChild(paramElement);
        });
    }
}

function getCurrentSettings() {
    const activePins = Array.from(document.querySelectorAll('input[name="capacitive-pins"]:checked'))
        .map(checkbox => parseInt(checkbox.value));
    
    // Get custom parameters
    const customParams = {};
    const customParamItems = document.querySelectorAll('#custom-params-list .custom-param-item');
    customParamItems.forEach(item => {
        const nameInput = item.querySelector('.param-name');
        const valueInput = item.querySelector('.param-value');
        if (nameInput && valueInput && nameInput.value.trim()) {
            customParams[nameInput.value.trim()] = valueInput.value.trim();
        }
    });
    
    return {
        camera: {
            threshold: parseInt(getValue('camera-threshold-input')) || 25,
            timeout: parseInt(getValue('camera-timeout')) || 30,
            fps: parseInt(getValue('camera-fps')) || 30
        },
        capacitive: {
            threshold: parseInt(getValue('capacitive-threshold-input')) || 50,
            debounce: parseInt(getValue('capacitive-debounce')) || 100,
            activePins: activePins
        },
        audio: {
            threshold: parseInt(getValue('audio-threshold-input')) || 60,
            sampleRate: parseInt(getValue('audio-sample-rate')) || 44100,
            bufferSize: parseInt(getValue('audio-buffer-size')) || 1024
        },
        proximity: {
            threshold: parseInt(getValue('proximity-threshold-input')) || 75,
            maxDistance: parseInt(getValue('proximity-max-distance')) || 100,
            units: getValue('proximity-units') || 'cm'
        },
        customParameters: customParams
    };
}

async function testInstallationSettings() {
    try {
        const settings = getCurrentSettings();
        const response = await apiCall('/api/installation/test', {
            method: 'POST',
            body: JSON.stringify({ settings })
        });
        
        if (response.success) {
            showToast('Installation settings validated successfully', 'success');
        } else {
            showToast(`Validation failed: ${response.message}`, 'error');
        }
    } catch (error) {
        console.error('Failed to test installation settings:', error);
        showToast('Failed to validate settings', 'error');
    }
}

function resetInstallationSettings() {
    if (confirm('Are you sure you want to reset all installation settings to defaults? This cannot be undone.')) {
        populateSettings(getDefaultSettings());
        showToast('Installation settings reset to defaults', 'info');
    }
}

async function applyInstallationSettings() {
    try {
        const settings = getCurrentSettings();
        await apiCall('/api/installation/settings', {
            method: 'POST',
            body: JSON.stringify({ settings })
        });
        
        showToast('Installation settings applied successfully', 'success');
    } catch (error) {
        console.error('Failed to apply installation settings:', error);
        showToast('Failed to apply installation settings', 'error');
    }
}

// Profile and Custom Parameter Functions

function addCustomParameter() {
    const customParamsList = document.getElementById('custom-params-list');
    if (!customParamsList) return;
    
    const paramId = `custom-param-${Date.now()}`;
    const paramElement = document.createElement('div');
    paramElement.className = 'custom-param-item';
    paramElement.innerHTML = `
        <div class="custom-param-fields">
            <input type="text" placeholder="Parameter name" class="param-name" />
            <input type="text" placeholder="Parameter value" class="param-value" />
            <button type="button" class="btn btn-danger btn-sm remove-param" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    customParamsList.appendChild(paramElement);
    showToast('Custom parameter added', 'info');
}

async function loadInstallationProfile() {
    const profileSelect = document.getElementById('installation-profile');
    if (!profileSelect || !profileSelect.value) {
        showToast('Please select a profile to load', 'warning');
        return;
    }
    
    try {
        const response = await apiCall(`/api/profiles/${profileSelect.value}`);
        if (response.settings) {
            populateSettings(response.settings);
            showToast(`Profile "${profileSelect.value}" loaded successfully`, 'success');
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

async function saveInstallationProfile() {
    const profileNameInput = document.getElementById('profile-name');
    if (!profileNameInput || !profileNameInput.value.trim()) {
        showToast('Please enter a profile name', 'warning');
        return;
    }
    
    try {
        const settings = getCurrentSettings();
        const profileData = {
            name: profileNameInput.value.trim(),
            settings: settings,
            timestamp: new Date().toISOString()
        };
        
        await apiCall('/api/profiles', {
            method: 'POST',
            body: JSON.stringify(profileData)
        });
        
        showToast(`Profile "${profileData.name}" saved successfully`, 'success');
        profileNameInput.value = '';
    } catch (error) {
        console.error('Failed to save profile:', error);
        showToast('Failed to save profile', 'error');
    }
}

function exportInstallationProfile() {
    try {
        const settings = getCurrentSettings();
        const profileData = {
            name: document.getElementById('profile-name')?.value || 'installation-settings',
            settings: settings,
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            type: 'installation-settings'
        };
        
        const dataStr = JSON.stringify(profileData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${profileData.name}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        showToast('Profile exported successfully', 'success');
    } catch (error) {
        console.error('Failed to export profile:', error);
        showToast('Failed to export profile', 'error');
    }
}

function importInstallationProfile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const profileData = JSON.parse(e.target.result);
            
            if (profileData.settings) {
                populateSettings(profileData.settings);
                showToast(`Profile "${profileData.name || 'imported'}" loaded successfully`, 'success');
                
                // Update profile name field if available
                const profileNameInput = document.getElementById('profile-name');
                if (profileNameInput && profileData.name) {
                    profileNameInput.value = profileData.name;
                }
            } else {
                showToast('Invalid profile format', 'error');
            }
        } catch (error) {
            console.error('Failed to parse profile file:', error);
            showToast('Failed to import profile - invalid JSON format', 'error');
        }
    };
    
    reader.readAsText(file);
    // Clear the file input for future use
    event.target.value = '';
}

// Utility functions are now imported from form-helpers.js
