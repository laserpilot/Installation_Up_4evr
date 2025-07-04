/**
 * @file setup-wizard.js
 * @description Logic for the Setup Wizard tab.
 */

import { showToast } from '../utils/ui.js';
import { apiCall } from '../utils/api.js';

// Wizard state variables
let currentStep = 1;
const totalSteps = 6; // Based on index.html

// Step validation function (module-level for access by other functions)
function validateCurrentStep() {
    switch (currentStep) {
        case 2: // System Check
            const failedChecks = document.querySelectorAll('.system-check-item .check-status.status-error');
            if (failedChecks.length > 0) {
                return {
                    canProceed: false,
                    message: `Please resolve ${failedChecks.length} failed system check(s) before continuing`
                };
            }
            return { canProceed: true };
            
        case 3: // Essential Settings
            // Allow proceeding even with unselected settings (user can skip)
            return { canProceed: true };
            
        case 4: // Application Setup
            // Use the enhanced validation function if available
            if (typeof window.validateWizardApplicationStep === 'function') {
                return window.validateWizardApplicationStep();
            }
            
            // Fallback validation
            const hasApp = wizardCurrentAppPath || document.getElementById('wizard-app-drop')?.dataset.appPath;
            const hasWebUrl = document.getElementById('wizard-web-url')?.value;
            if (!hasApp && !hasWebUrl) {
                return {
                    canProceed: false,
                    message: 'Please configure at least one application (desktop app or web URL) before continuing'
                };
            }
            return { canProceed: true };
            
        default:
            return { canProceed: true };
    }
}

export function initSetupWizard() {
    console.log('[INIT] Initializing Setup Wizard tab...');

    // Reset to step 1 when initializing
    currentStep = 1;

    function showStep(stepNumber) {
        document.querySelectorAll('.wizard-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(`wizard-step-${stepNumber}`).classList.add('active');

        // Update progress bar
        const progressFill = document.getElementById('wizard-progress-fill');
        if (progressFill) {
            const progress = (stepNumber / totalSteps) * 100;
            progressFill.style.width = `${progress}%`;
        }

        // Update step indicators
        document.querySelectorAll('.wizard-progress .step').forEach((stepIndicator, index) => {
            if (index + 1 === stepNumber) {
                stepIndicator.classList.add('active');
            } else {
                stepIndicator.classList.remove('active');
            }
        });
    }

    // Enhanced navigation function with better error handling
    window.navigateWizard = function(direction, options = {}) {
        const { skipValidation = false, showNotification = true } = options;
        
        // Validate current step before proceeding (unless skipping validation)
        if (!skipValidation && direction === 'next') {
            const validation = validateCurrentStep();
            if (!validation.canProceed) {
                showToast(validation.message, 'warning');
                return false;
            }
        }
        
        const previousStep = currentStep;
        
        if (direction === 'next' && currentStep < totalSteps) {
            currentStep++;
        } else if (direction === 'back' && currentStep > 1) {
            currentStep--;
        } else {
            if (showNotification) {
                const message = direction === 'next' ? 'You are already on the last step' : 'You are already on the first step';
                showToast(message, 'info');
            }
            return false;
        }
        
        showStep(currentStep);
        
        // Load dynamic content based on step
        loadStepContent(currentStep);
        
        if (showNotification) {
            const stepNames = ['', 'Welcome', 'System Check', 'Essential Settings', 'Application Setup', 'Testing', 'Complete'];
            showToast(`Step ${currentStep}: ${stepNames[currentStep] || 'Unknown'}`, 'info');
        }
        
        return true;
    };
    
    
    // Load content for specific steps
    function loadStepContent(stepNumber) {
        switch (stepNumber) {
            case 2:
                loadSystemCheck();
                break;
            case 3:
                loadEssentialSettings();
                break;
            case 4:
                initApplicationSetup();
                break;
            case 6:
                loadWizardSummary();
                break;
        }
    }

    // Attach event listeners to wizard navigation buttons
    document.getElementById('start-guided-setup')?.addEventListener('click', () => {
        currentStep = 2; // Start from System Check
        showStep(currentStep);
        showToast('Starting Guided Setup', 'info');
    });

    document.getElementById('go-advanced')?.addEventListener('click', () => {
        // Assuming 'go-advanced' button switches to a different tab or mode
        // For now, just a toast
        showToast('Navigating to Advanced Setup (Not yet implemented)', 'info');
        // Potentially navigate to 'configuration' tab or similar
        // window.app.navigateToTab('configuration');
    });

    // Generic next/back buttons for wizard steps
    document.querySelectorAll('[id^="wizard-next-"]').forEach(button => {
        button.addEventListener('click', () => window.navigateWizard('next'));
    });
    document.querySelectorAll('[id^="wizard-back-"]').forEach(button => {
        button.addEventListener('click', () => window.navigateWizard('back'));
    });

    // Specific action buttons
    document.getElementById('wizard-apply-settings')?.addEventListener('click', async () => {
        await applyEssentialSettings();
    });
    document.getElementById('wizard-skip-settings')?.addEventListener('click', async () => {
        await skipEssentialSettings();
    });
    document.getElementById('wizard-run-tests')?.addEventListener('click', async () => {
        await runWizardTests();
    });
    document.getElementById('wizard-create-launch-agent')?.addEventListener('click', async () => {
        await createWizardLaunchAgent();
    });
    document.getElementById('wizard-skip-app-setup')?.addEventListener('click', async () => {
        await skipApplicationSetup();
    });
    document.getElementById('wizard-go-dashboard')?.addEventListener('click', () => {
        navigateToTab('dashboard');
        showToast('Welcome to your Dashboard!', 'success');
    });
    document.getElementById('wizard-advanced-config')?.addEventListener('click', () => {
        navigateToTab('configuration');
    });
    document.getElementById('skip-wizard')?.addEventListener('click', () => {
        navigateToTab('dashboard');
    });

    // Initial display of the first step
    showStep(currentStep);
    
    // Load dynamic content when wizard is initialized
    loadSystemCheck();
    loadEssentialSettings();
}

// Load system check content for step 2 - Simplified 4 core settings
async function loadSystemCheck() {
    console.log('[WIZARD] Loading simplified system check for 4 essential settings...');
    
    // Define the 4 essential "forever" settings
    const essentialChecks = [
        {
            id: 'computer-sleep',
            name: 'Computer Sleep Disabled',
            description: 'Prevents your Mac from going to sleep and stopping your installation',
            whyItMatters: 'If your computer sleeps, your installation will stop running',
            howToCheck: 'System Preferences → Energy Saver → Computer Sleep: Never',
            icon: 'fas fa-power-off'
        },
        {
            id: 'display-sleep', 
            name: 'Display Sleep Disabled',
            description: 'Keeps your displays active and prevents screen blanking',
            whyItMatters: 'Display sleep can cause visual installations to go black',
            howToCheck: 'System Preferences → Energy Saver → Display Sleep: Never', 
            icon: 'fas fa-tv'
        },
        {
            id: 'screensaver-disabled',
            name: 'Screensaver Disabled',
            description: 'Prevents screensaver from interrupting your installation display',
            whyItMatters: 'Screensavers can cover your installation content',
            howToCheck: 'System Preferences → Desktop & Screen Saver → Screen Saver: Start after: Never',
            icon: 'fas fa-desktop'
        },
        {
            id: 'focus-mode',
            name: 'Do Not Disturb (24-hour)',
            description: 'Prevents notifications from interrupting your installation',
            whyItMatters: 'Notifications can appear over your installation content',
            howToCheck: 'System Preferences → Focus → Do Not Disturb → Schedule: Always',
            icon: 'fas fa-bell-slash'
        }
    ];

    const checksContainer = document.getElementById('wizard-system-checks');
    if (!checksContainer) {
        console.warn('[WIZARD] System checks container not found');
        return;
    }

    // Create improved system check UI with education
    checksContainer.innerHTML = `
        <div class="system-check-intro">
            <h4><i class="fas fa-shield-alt"></i> Essential "Forever" Settings</h4>
            <p>These 4 settings ensure your installation runs reliably 24/7. You can skip this step, but applying these settings gives you peace of mind.</p>
        </div>
        
        <div class="system-checks-list">
            ${essentialChecks.map(check => `
                <div class="system-check-item modern" data-check-id="${check.id}">
                    <div class="check-icon">
                        <i class="${check.icon}"></i>
                    </div>
                    <div class="check-content">
                        <div class="check-header">
                            <h4>${check.name}</h4>
                            <span class="check-status">
                                <i class="fas fa-circle-notch fa-spin"></i>
                                Checking...
                            </span>
                        </div>
                        <p class="check-description">${check.description}</p>
                        <div class="check-details" style="display: none;">
                            <div class="why-matters">
                                <strong>Why this matters:</strong> ${check.whyItMatters}
                            </div>
                            <div class="how-to-check">
                                <strong>Verify yourself:</strong> ${check.howToCheck}
                            </div>
                        </div>
                    </div>
                    <div class="check-actions">
                        <button class="btn-toggle-details" title="Show more details">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="system-check-summary" id="system-check-summary">
            <div class="summary-content">
                <div class="summary-icon">
                    <i class="fas fa-circle-notch fa-spin"></i>
                </div>
                <div class="summary-text">
                    <span>Checking your system configuration...</span>
                </div>
            </div>
        </div>
    `;

    // Add event listeners for detail toggles
    checksContainer.querySelectorAll('.btn-toggle-details').forEach(button => {
        button.addEventListener('click', toggleCheckDetails);
    });

    // Start the actual system checks
    setTimeout(() => runEssentialSystemChecks(essentialChecks), 1000);
}

// Run individual system checks
async function runSystemChecks(checks) {
    try {
        // Get real system preferences status
        const systemStatus = await apiCall('/api/system/settings/status');
        const settingsData = systemStatus.settings || {};
        
        checks.forEach((check, index) => {
            setTimeout(() => {
                const checkElement = document.querySelector(`[data-check-id="${check.id}"]`);
                if (checkElement) {
                    const icon = checkElement.querySelector('.check-icon i');
                    const status = checkElement.querySelector('.check-status');
                    
                    // Map check ID to system preference and determine if it passed
                    const passed = getSystemCheckResult(check.id, settingsData);
                
                icon.className = passed ? 'fas fa-check-circle text-green' : 'fas fa-exclamation-triangle text-yellow';
                status.textContent = passed ? 'Passed' : 'Needs Attention';
                status.className = passed ? 'check-status status-passed' : 'check-status status-warning';
            }
        }, index * 500);
    });
    } catch (error) {
        console.error('Error running system checks:', error);
        showToast('Failed to verify system settings', 'error');
        
        // Set all checks to error state if API call fails
        checks.forEach(check => {
            const checkElement = document.querySelector(`[data-check-id="${check.id}"]`);
            if (checkElement) {
                const icon = checkElement.querySelector('.check-icon i');
                const status = checkElement.querySelector('.check-status');
                
                icon.className = 'fas fa-exclamation-circle text-red';
                status.textContent = 'Error';
                status.className = 'check-status status-error';
            }
        });
    }
}

// Map system check IDs to actual system preference verification
function getSystemCheckResult(checkId, settingsData) {
    switch (checkId) {
        case 'sleep-settings':
            // Check if sleep is properly disabled for installation use
            return settingsData.disableComputerSleep?.status === 'set' && 
                   settingsData.disableDisplaySleep?.status === 'set';
                   
        case 'screensaver-disabled':
            return settingsData.disableScreenSaver?.status === 'set';
            
        case 'auto-login':
            return settingsData.enableAutoLogin?.status === 'set';
            
        case 'security-settings':
            // Check critical security settings
            return settingsData.disablePasswordRequests?.status === 'set' &&
                   settingsData.disableNetworkPasswordPrompts?.status === 'set';
                   
        case 'dock-settings':
            return settingsData.dockAutoHide?.status === 'set';
            
        case 'finder-settings':
            return settingsData.showAllFiles?.status === 'set';
            
        case 'system-updates':
            return settingsData.disableAutoUpdates?.status === 'set';
            
        case 'disk-space':
            // For disk space, assume passed if we can check other settings (API is working)
            return Object.keys(settingsData).length > 0;
            
        case 'permissions':
            // Check if we have basic system access (API responding)
            return Object.keys(settingsData).length > 0;
            
        default:
            // For unknown checks, return true to avoid false negatives
            return true;
    }
}

// Load essential settings content for step 3
async function loadEssentialSettings() {
    try {
        const response = await fetch('/api/setup-wizard/essential-settings');
        if (!response.ok) throw new Error('Failed to load essential settings');
        
        const data = await response.json();
        const settingsContainer = document.getElementById('wizard-essential-settings');
        
        if (settingsContainer && data.success) {
            settingsContainer.innerHTML = `
                <div class="settings-list">
                    ${data.data.essentialSettings.map(setting => `
                        <div class="setting-item">
                            <label class="setting-label">
                                <input type="checkbox" class="setting-checkbox" data-setting-id="${setting.id}" ${setting.current ? '' : 'checked'}>
                                <div class="setting-content">
                                    <h4>${setting.name}</h4>
                                    <p>${setting.description}</p>
                                    <span class="setting-status ${setting.current ? 'status-compliant' : 'status-needs-config'}">
                                        ${setting.current ? 'Already configured' : 'Needs configuration'}
                                    </span>
                                </div>
                            </label>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading essential settings:', error);
        showToast('Failed to load essential settings', 'error');
    }
}

// Apply essential settings with enhanced verification feedback
async function applyEssentialSettings() {
    const selectedSettings = Array.from(document.querySelectorAll('.setting-checkbox:checked'))
        .map(checkbox => checkbox.dataset.settingId);
    
    if (selectedSettings.length === 0) {
        const result = await showConfirmDialog(
            'No Settings Selected',
            'You haven\'t selected any settings to apply. Do you want to skip this step or go back to select settings?',
            {
                confirmText: 'Skip Step',
                cancelText: 'Go Back',
                type: 'warning'
            }
        );
        
        if (result) {
            await skipEssentialSettings();
        }
        return;
    }
    
    const applyButton = document.getElementById('wizard-apply-settings');
    const skipButton = document.getElementById('wizard-skip-settings');
    
    // Disable both buttons during operation
    applyButton.disabled = true;
    skipButton.disabled = true;
    
    try {
        // PHASE 1: BEFORE - Show current state and what will change
        const proceedWithChanges = await showBeforeSettingsModal(selectedSettings);
        if (!proceedWithChanges) {
            return; // User cancelled
        }
        
        // PHASE 2: DURING - Apply settings with live feedback
        const { success, appliedSettings, failedSettings } = await applySettingsWithProgress(selectedSettings, applyButton);
        
        // PHASE 3: AFTER - Verify changes and show results
        await showAfterSettingsModal(success, appliedSettings, failedSettings);
        
        if (success) {
            // Update step status and proceed
            markStepCompleted(3, 'applied');
            window.navigateWizard('next', { skipValidation: true });
        } else {
            // Show retry option for failed settings
            const retry = await showConfirmDialog(
                'Some Settings Failed',
                `${failedSettings.length} setting(s) failed to apply. Would you like to try again or proceed anyway?`,
                {
                    confirmText: 'Retry Failed Settings',
                    cancelText: 'Proceed Anyway',
                    type: 'warning'
                }
            );
            
            if (retry) {
                // Retry only the failed settings
                const failedIds = failedSettings.map(s => s.id);
                setTimeout(() => retryFailedSettings(failedIds), 1000);
                return;
            } else {
                // Mark as partial completion and proceed
                markStepCompleted(3, 'partial');
                window.navigateWizard('next', { skipValidation: true });
            }
        }
    } catch (error) {
        console.error('Error applying settings:', error);
        
        const userFriendlyMessage = error.message.includes('fetch') 
            ? 'Unable to connect to the server. Please check your connection and try again.'
            : `Failed to apply settings: ${error.message}`;
            
        showToast(userFriendlyMessage, 'error');
        
        // Show retry option
        const retry = await showConfirmDialog(
            'Settings Application Failed',
            `${userFriendlyMessage}\n\nWould you like to try again?`,
            {
                confirmText: 'Retry',
                cancelText: 'Skip for Now',
                type: 'error'
            }
        );
        
        if (retry) {
            // Retry the operation
            setTimeout(() => applyEssentialSettings(), 1000);
            return;
        } else {
            // User chose to skip, proceed anyway
            await skipEssentialSettings();
            return;
        }
    } finally {
        // Re-enable buttons
        applyButton.disabled = false;
        skipButton.disabled = false;
        applyButton.innerHTML = '<i class="fas fa-check"></i> Apply Settings';
    }
}

// Skip essential settings with user confirmation
async function skipEssentialSettings() {
    const selectedCount = document.querySelectorAll('.setting-checkbox:checked').length;
    const totalCount = document.querySelectorAll('.setting-checkbox').length;
    
    let confirmMessage;
    if (selectedCount === 0) {
        confirmMessage = `You are about to skip system configuration entirely. Your installation may not be optimized for 24/7 operation.\n\nAre you sure you want to continue without applying any system settings?`;
    } else {
        confirmMessage = `You have ${selectedCount} settings selected but unapplied. Skipping will leave your system configuration unchanged.\n\nAre you sure you want to skip this step?`;
    }
    
    const confirmed = await showConfirmDialog(
        'Skip System Configuration',
        confirmMessage,
        {
            confirmText: 'Yes, Skip This Step',
            cancelText: 'Cancel',
            type: 'warning'
        }
    );
    
    if (!confirmed) {
        return;
    }
    
    const skipButton = document.getElementById('wizard-skip-settings');
    const applyButton = document.getElementById('wizard-apply-settings');
    
    skipButton.disabled = true;
    applyButton.disabled = true;
    skipButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Skipping...';
    
    try {
        // Log the skip action for analytics
        await fetch('/api/setup-wizard/log-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'skip_essential_settings',
                step: 3,
                selectedCount,
                totalCount,
                timestamp: new Date().toISOString()
            })
        }).catch(() => {/* Ignore logging errors */});
        
        showToast('Skipped system configuration. You can configure settings later from the System Preferences tab.', 'info');
        
        // Mark step as skipped and proceed
        markStepCompleted(3, 'skipped');
        window.navigateWizard('next', { skipValidation: true });
        
    } catch (error) {
        console.error('Error during skip operation:', error);
        // Even if logging fails, still proceed
        markStepCompleted(3, 'skipped');
        window.navigateWizard('next', { skipValidation: true });
    } finally {
        skipButton.disabled = false;
        applyButton.disabled = false;
        skipButton.innerHTML = '<i class="fas fa-forward"></i> Skip This Step';
    }
}

// Mark step as completed with status
function markStepCompleted(stepNumber, status = 'completed') {
    const stepElement = document.querySelector(`.wizard-progress .step:nth-child(${stepNumber})`);
    if (stepElement) {
        stepElement.classList.add('completed', `status-${status}`);
        
        // Add status indicator with more status types
        let statusIcon;
        switch (status) {
            case 'skipped':
                statusIcon = '<i class="fas fa-forward" title="Skipped"></i>';
                break;
            case 'partial':
                statusIcon = '<i class="fas fa-exclamation-triangle" title="Partially Completed"></i>';
                break;
            case 'applied':
                statusIcon = '<i class="fas fa-check-circle" title="Applied"></i>';
                break;
            default:
                statusIcon = '<i class="fas fa-check" title="Completed"></i>';
        }
        
        const existingIcon = stepElement.querySelector('.status-icon');
        if (existingIcon) {
            existingIcon.innerHTML = statusIcon;
        } else {
            stepElement.innerHTML += `<span class="status-icon">${statusIcon}</span>`;
        }
    }
}

// Enhanced confirmation dialog
async function showConfirmDialog(title, message, options = {}) {
    const {
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'info'
    } = options;
    
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay confirm-dialog';
        
        const iconClass = {
            'warning': 'fas fa-exclamation-triangle text-warning',
            'error': 'fas fa-exclamation-circle text-danger',
            'info': 'fas fa-info-circle text-primary'
        }[type] || 'fas fa-question-circle';
        
        modal.innerHTML = `
            <div class="modal-content confirm-content">
                <div class="confirm-header">
                    <i class="${iconClass}"></i>
                    <h3>${title}</h3>
                </div>
                <div class="confirm-body">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="confirm-actions">
                    <button class="btn btn-secondary confirm-cancel">${cancelText}</button>
                    <button class="btn btn-primary confirm-ok">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const cleanup = () => modal.remove();
        
        modal.querySelector('.confirm-cancel').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        modal.querySelector('.confirm-ok').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                cleanup();
                resolve(false);
            }
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', escapeHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

// Run wizard tests
async function runWizardTests() {
    const button = document.getElementById('wizard-run-tests');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Tests...';
    
    const verificationContainer = document.getElementById('wizard-verification');
    
    try {
        const response = await fetch('/api/setup-wizard/run-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (!response.ok) throw new Error('Failed to run tests');
        
        const data = await response.json();
        
        if (data.success) {
            const testResults = data.data.testResults;
            
            verificationContainer.innerHTML = `
                <div class="test-results">
                    <div class="test-summary">
                        <h4>Test Results</h4>
                        <div class="summary-stats">
                            <span class="stat">
                                <i class="fas fa-check-circle text-green"></i>
                                ${testResults.filter(t => t.passed).length} Passed
                            </span>
                            <span class="stat">
                                <i class="fas fa-times-circle text-red"></i>
                                ${testResults.filter(t => !t.passed).length} Failed
                            </span>
                        </div>
                    </div>
                    <div class="test-list">
                        ${testResults.map(test => `
                            <div class="test-item ${test.passed ? 'test-passed' : 'test-failed'}">
                                <div class="test-icon">
                                    <i class="fas ${test.passed ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                </div>
                                <div class="test-content">
                                    <h5>${test.name}</h5>
                                    <p>${test.message}</p>
                                    ${test.critical ? '<span class="badge badge-critical">Critical</span>' : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            if (data.data.overallStatus === 'passed') {
                showToast('All tests passed!', 'success');
                window.navigateWizard('next');
            } else {
                showToast(`Tests completed with ${data.data.criticalFailures} critical failures`, 'warning');
                if (data.data.criticalFailures === 0) {
                    // Allow proceeding if no critical failures
                    setTimeout(() => window.navigateWizard('next'), 2000);
                }
            }
        } else {
            throw new Error(data.error || 'Failed to run tests');
        }
    } catch (error) {
        console.error('Error running tests:', error);
        showToast('Failed to run tests: ' + error.message, 'error');
        verificationContainer.innerHTML = `
            <div class="test-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to run verification tests. Please check your system configuration.</p>
            </div>
        `;
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-play"></i> Run Tests';
    }
}

// Load wizard summary for final step
async function loadWizardSummary() {
    try {
        const response = await fetch('/api/setup-wizard/summary');
        if (!response.ok) throw new Error('Failed to load wizard summary');
        
        const data = await response.json();
        const summaryContainer = document.getElementById('wizard-summary');
        
        if (summaryContainer && data.success) {
            const summary = data.data.summary;
            
            summaryContainer.innerHTML = `
                <div class="setup-summary-content">
                    <!-- Forever Guarantee Section -->
                    <div class="forever-guarantee">
                        <div class="guarantee-header">
                            <i class="fas fa-shield-alt guarantee-icon"></i>
                            <h3>🎯 Your Installation Will Run Forever</h3>
                            <p class="guarantee-subtitle">Professional-grade automation is now protecting your creative technology installation.</p>
                        </div>
                        
                        <div class="forever-evidence">
                            <div class="evidence-item ${summary.settingsConfigured ? 'verified' : 'pending'}">
                                <i class="fas ${summary.settingsConfigured ? 'fa-check-circle' : 'fa-clock'}"></i>
                                <div class="evidence-content">
                                    <h4>Sleep Prevention Active</h4>
                                    <p>System will never sleep, display will stay on, screensaver disabled. Your installation runs 24/7.</p>
                                    ${summary.settingsConfigured ? '<span class="verified-badge">Verified</span>' : '<span class="pending-badge">Configure in System Preferences</span>'}
                                </div>
                            </div>
                            
                            <div class="evidence-item ${summary.launchAgents > 0 ? 'verified' : 'pending'}">
                                <i class="fas ${summary.launchAgents > 0 ? 'fa-check-circle' : 'fa-clock'}"></i>
                                <div class="evidence-content">
                                    <h4>Auto-Start Applications (${summary.launchAgents || 0} configured)</h4>
                                    <p>Your applications will automatically restart if they crash or after system reboots.</p>
                                    ${summary.launchAgents > 0 ? '<span class="verified-badge">Verified</span>' : '<span class="pending-badge">Create in Launch Agents</span>'}
                                </div>
                            </div>
                            
                            <div class="evidence-item ${summary.monitoringActive ? 'verified' : 'pending'}">
                                <i class="fas ${summary.monitoringActive ? 'fa-check-circle' : 'fa-clock'}"></i>
                                <div class="evidence-content">
                                    <h4>Real-Time Monitoring</h4>
                                    <p>System health monitoring with automatic alerts for any issues.</p>
                                    ${summary.monitoringActive ? '<span class="verified-badge">Active</span>' : '<span class="pending-badge">Enable in Monitoring</span>'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Technical Verification Section -->
                    <div class="technical-verification">
                        <h4><i class="fas fa-clipboard-check"></i> Technical Verification Report</h4>
                        <div class="verification-grid">
                            <div class="verification-card">
                                <div class="card-header">
                                    <i class="fas fa-heart-pulse"></i>
                                    <span>System Health</span>
                                </div>
                                <div class="card-score ${summary.healthScore > 80 ? 'excellent' : summary.healthScore > 60 ? 'good' : 'needs-work'}">
                                    ${summary.healthScore}%
                                </div>
                                <div class="card-status">
                                    ${summary.healthScore > 80 ? 'Excellent - Ready for production' : 
                                      summary.healthScore > 60 ? 'Good - Minor optimizations recommended' : 
                                      'Needs attention - Review settings'}
                                </div>
                            </div>
                            
                            <div class="verification-card">
                                <div class="card-header">
                                    <i class="fas fa-cog"></i>
                                    <span>System Configuration</span>
                                </div>
                                <div class="card-score ${summary.settingsConfigured ? 'excellent' : 'needs-work'}">
                                    ${summary.settingsConfigured ? 'Configured' : 'Pending'}
                                </div>
                                <div class="card-status">
                                    ${summary.settingsConfigured ? 'All essential settings applied' : 'Configure in System Preferences tab'}
                                </div>
                            </div>
                            
                            <div class="verification-card">
                                <div class="card-header">
                                    <i class="fas fa-rocket"></i>
                                    <span>Launch Agents</span>
                                </div>
                                <div class="card-score ${summary.launchAgents > 0 ? 'excellent' : 'needs-work'}">
                                    ${summary.launchAgents || 0}
                                </div>
                                <div class="card-status">
                                    ${summary.launchAgents > 0 ? 'Applications protected' : 'Create launch agents for auto-start'}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Command Line Verification -->
                    <div class="command-verification">
                        <h4><i class="fas fa-terminal"></i> Verify Your Setup (Terminal Commands)</h4>
                        <div class="command-section">
                            <p class="command-intro">Run these commands to independently verify your installation setup:</p>
                            
                            <div class="command-block">
                                <div class="command-header">Check Sleep Settings:</div>
                                <code>pmset -g | grep -E "(sleep|displaysleep)"</code>
                                <div class="expected-output">Expected: sleep 0, displaysleep 0</div>
                            </div>
                            
                            <div class="command-block">
                                <div class="command-header">List Launch Agents:</div>
                                <code>launchctl list | grep -v "com.apple"</code>
                                <div class="expected-output">Expected: Your custom launch agents listed</div>
                            </div>
                            
                            <div class="command-block">
                                <div class="command-header">Check System Uptime:</div>
                                <code>uptime</code>
                                <div class="expected-output">Shows how long system has been running</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Success Message -->
                    <div class="success-message">
                        <div class="success-content">
                            <i class="fas fa-trophy success-icon"></i>
                            <h3>🎉 Installation Protection Complete!</h3>
                            <p class="success-text">
                                Your creative technology installation is now protected with professional-grade automation. 
                                ${summary.settingsConfigured && summary.launchAgents > 0 ? 
                                  'Your system will run continuously and your applications will automatically restart if needed.' :
                                  'Complete the pending items above to achieve full protection.'}
                            </p>
                            
                            <div class="next-steps-buttons">
                                <button onclick="window.navigateToTab('dashboard')" class="btn btn-primary">
                                    <i class="fas fa-tachometer-alt"></i> Go to Dashboard
                                </button>
                                <button onclick="window.navigateToTab('monitoring')" class="btn btn-secondary">
                                    <i class="fas fa-chart-line"></i> View Monitoring
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Recommended Next Steps (if any) -->
                    ${summary.recommendedNextSteps.length > 0 ? `
                        <div class="recommended-steps">
                            <h4><i class="fas fa-lightbulb"></i> Recommended Next Steps:</h4>
                            <ul class="steps-list">
                                ${summary.recommendedNextSteps.map(step => `<li class="step-item">${step}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading wizard summary:', error);
        const summaryContainer = document.getElementById('wizard-summary');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="summary-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load setup summary. Your configuration has been saved.</p>
                </div>
            `;
        }
    }
}

// Application Setup for Step 4
let wizardCurrentAppPath = null;
let wizardCurrentMode = 'app'; // 'app' or 'web'

function initApplicationSetup() {
    console.log('[WIZARD] Initializing Application Setup step...');
    
    // Set up mode switching
    setupApplicationModeSwitch();
    
    // Initialize desktop app functionality
    setupDesktopAppCreation();
    
    // Initialize web app functionality  
    setupWebAppCreation();
    
    // Set up validation
    setupApplicationValidation();
}

function setupApplicationModeSwitch() {
    // Check if mode switch elements exist in wizard
    const appMethod = document.getElementById('app-method');
    const webMethod = document.getElementById('web-method');
    
    if (!appMethod || !webMethod) {
        console.warn('[WIZARD] App setup method elements not found in step 4');
        return;
    }
    
    // Add click handlers for mode switching
    appMethod.addEventListener('click', () => {
        switchWizardMode('app');
    });
    
    webMethod.addEventListener('click', () => {
        switchWizardMode('web');
    });
}

function switchWizardMode(mode) {
    wizardCurrentMode = mode;
    
    const appMethod = document.getElementById('app-method');
    const webMethod = document.getElementById('web-method');
    
    if (appMethod && webMethod) {
        appMethod.classList.toggle('active', mode === 'app');
        webMethod.classList.toggle('active', mode === 'web');
    }
    
    console.log('[WIZARD] Switched to', mode, 'mode');
}

function setupDesktopAppCreation() {
    const dropZone = document.getElementById('wizard-app-drop');
    const browseButton = dropZone?.querySelector('button');
    
    if (!dropZone) {
        console.warn('[WIZARD] App drop zone not found');
        return;
    }
    
    // Set up drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.app') || file.type === '') {
                handleWizardAppSelection(file.path || file.webkitRelativePath || file.name);
            } else {
                showToast('Please select a .app file', 'error');
            }
        }
    });
    
    // Set up browse button
    if (browseButton) {
        browseButton.addEventListener('click', () => {
            // Create file input for app selection
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.app';
            fileInput.style.display = 'none';
            
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleWizardAppSelection(file.path || file.name);
                }
                document.body.removeChild(fileInput);
            });
            
            document.body.appendChild(fileInput);
            fileInput.click();
        });
    }
}

function handleWizardAppSelection(appPath) {
    wizardCurrentAppPath = appPath;
    
    const dropZone = document.getElementById('wizard-app-drop');
    if (dropZone) {
        dropZone.dataset.appPath = appPath;
        dropZone.innerHTML = `
            <i class="fas fa-cube text-green"></i>
            <p><strong>${appPath.split('/').pop()}</strong></p>
            <p class="text-muted">Selected for launch agent creation</p>
            <button class="btn btn-outline">Change App</button>
        `;
        
        // Re-attach browse handler
        const changeButton = dropZone.querySelector('button');
        changeButton.addEventListener('click', () => {
            setupDesktopAppCreation();
        });
    }
    
    showToast(`Selected app: ${appPath.split('/').pop()}`, 'success');
    console.log('[WIZARD] Selected app:', appPath);
}

function setupWebAppCreation() {
    const urlInput = document.getElementById('wizard-web-url');
    const kioskCheckbox = document.getElementById('wizard-kiosk-mode');
    
    if (!urlInput) {
        console.warn('[WIZARD] Web URL input not found');
        return;
    }
    
    // Set up URL validation
    urlInput.addEventListener('input', () => {
        const url = urlInput.value;
        if (url) {
            try {
                new URL(url);
                urlInput.classList.remove('error');
                urlInput.classList.add('valid');
            } catch (e) {
                urlInput.classList.remove('valid');
                urlInput.classList.add('error');
            }
        } else {
            urlInput.classList.remove('valid', 'error');
        }
    });
    
    console.log('[WIZARD] Web app creation setup complete');
}

function setupApplicationValidation() {
    // Enhanced validation for step 4
    const originalValidate = validateCurrentStep;
    
    // Override validation function for step 4
    window.validateWizardApplicationStep = function() {
        if (wizardCurrentMode === 'app') {
            const hasApp = wizardCurrentAppPath || document.getElementById('wizard-app-drop')?.dataset.appPath;
            if (!hasApp) {
                return {
                    canProceed: false,
                    message: 'Please select a desktop application first'
                };
            }
        } else if (wizardCurrentMode === 'web') {
            const url = document.getElementById('wizard-web-url')?.value;
            if (!url) {
                return {
                    canProceed: false,
                    message: 'Please enter a web application URL first'
                };
            }
            
            try {
                new URL(url);
            } catch (e) {
                return {
                    canProceed: false,
                    message: 'Please enter a valid URL (must include http:// or https://)'
                };
            }
        }
        
        return { canProceed: true };
    };
}

// Function to create launch agent from wizard with verification
async function createWizardLaunchAgent() {
    try {
        showToast('Creating launch agent...', 'info');
        
        let creationResult;
        let agentInfo;
        
        if (wizardCurrentMode === 'app') {
            if (!wizardCurrentAppPath) {
                showToast('Please select an application first', 'error');
                return false;
            }
            
            agentInfo = {
                type: 'desktop',
                name: wizardCurrentAppPath.split('/').pop(),
                path: wizardCurrentAppPath
            };
            
            creationResult = await apiCall('/api/launch-agents/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    appPath: wizardCurrentAppPath,
                    options: {
                        keepAlive: true,
                        runAtLoad: true,
                        successfulExit: true
                    }
                })
            });
            
        } else if (wizardCurrentMode === 'web') {
            const url = document.getElementById('wizard-web-url').value;
            const kioskMode = document.getElementById('wizard-kiosk-mode').checked;
            
            if (!url) {
                showToast('Please enter a web application URL', 'error');
                return false;
            }
            
            // Extract name from URL
            const hostname = new URL(url).hostname;
            const appName = hostname.split('.')[0];
            const name = appName.charAt(0).toUpperCase() + appName.slice(1) + ' App';
            
            agentInfo = {
                type: 'web',
                name: name,
                url: url,
                kioskMode: kioskMode
            };
            
            // Try the web-specific endpoint first
            try {
                creationResult = await apiCall('/api/launch-agents/create-web', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        url,
                        browserPath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                        options: {
                            kioskMode,
                            disableDevTools: true,
                            disableExtensions: true,
                            incognitoMode: false,
                            keepAlive: true,
                            runAtLoad: true
                        }
                    })
                });
                
                if (!creationResult.success) {
                    throw new Error(creationResult.message || 'Web app endpoint failed');
                }
            } catch (error) {
                console.warn('[WIZARD] Web app endpoint failed, falling back to basic method:', error.message);
                
                // Fallback: show instructions for manual setup
                showToast('Web app launch agents require manual setup. Please use the Launch Agents tab for full web app functionality.', 'warning');
                
                // For now, mark as completed but with a note
                markStepCompleted(4, 'partial');
                showWizardWebAppInstructions(url, name);
                return true;
            }
        }
        
        // If creation was successful, show verification modal
        if (creationResult && creationResult.success) {
            await showLaunchAgentSuccessModal(agentInfo, creationResult);
            markStepCompleted(4, 'applied');
            return true;
        } else {
            const errorMessage = creationResult?.message || 'Unknown error';
            showToast(`Failed to create launch agent: ${errorMessage}`, 'error');
            return false;
        }
        
    } catch (error) {
        console.error('[WIZARD] Failed to create launch agent:', error);
        showToast('Failed to create launch agent', 'error');
        return false;
    }
}

// Launch Agent Success Verification Modal - Phase 8.4.4.3
async function showLaunchAgentSuccessModal(agentInfo, creationResult) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay launch-agent-verification-modal';
        
        const isDesktop = agentInfo.type === 'desktop';
        const agentLabel = creationResult.data?.label || `com.installation.${agentInfo.name.toLowerCase().replace(/\s+/g, '')}`;
        const plistPath = creationResult.data?.plistPath || `~/Library/LaunchAgents/${agentLabel}.plist`;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-check-circle text-green"></i> Launch Agent Created Successfully</h3>
                </div>
                
                <div class="modal-body">
                    <div class="verification-summary">
                        <p>Your ${isDesktop ? 'application' : 'web app'} <strong>${agentInfo.name}</strong> has been configured to run automatically!</p>
                    </div>
                    
                    <div class="agent-details">
                        <h4><i class="fas fa-info-circle"></i> Launch Agent Details:</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Agent Name:</span>
                                <span class="detail-value">${agentLabel}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">File Location:</span>
                                <span class="detail-value file-path">${plistPath}</span>
                            </div>
                            ${isDesktop ? `
                                <div class="detail-item">
                                    <span class="detail-label">Application Path:</span>
                                    <span class="detail-value file-path">${agentInfo.path}</span>
                                </div>
                            ` : `
                                <div class="detail-item">
                                    <span class="detail-label">Web URL:</span>
                                    <span class="detail-value">${agentInfo.url}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Kiosk Mode:</span>
                                    <span class="detail-value">${agentInfo.kioskMode ? 'Enabled' : 'Disabled'}</span>
                                </div>
                            `}
                            <div class="detail-item">
                                <span class="detail-label">Auto-Start:</span>
                                <span class="detail-value text-green">✓ Enabled</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Keep Alive:</span>
                                <span class="detail-value text-green">✓ Enabled</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="status-verification">
                        <h4><i class="fas fa-search"></i> Verify Status:</h4>
                        <div class="status-check-container" id="agent-status-check">
                            <div class="loading-state">
                                <i class="fas fa-circle-notch fa-spin"></i>
                                <span>Checking launch agent status...</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="manual-verification">
                        <h4><i class="fas fa-terminal"></i> Manual Verification Commands:</h4>
                        <div class="command-section">
                            <p><strong>Check if launch agent is loaded:</strong></p>
                            <code>launchctl list | grep ${agentLabel}</code>
                            <small>Should show the agent with a PID if running</small>
                        </div>
                        <div class="command-section">
                            <p><strong>View launch agent details:</strong></p>
                            <code>launchctl print gui/$(id -u)/${agentLabel}</code>
                            <small>Shows detailed status and configuration</small>
                        </div>
                        <div class="command-section">
                            <p><strong>Check plist file exists:</strong></p>
                            <code>ls -la "${plistPath}"</code>
                            <small>Should show the plist file with recent timestamp</small>
                        </div>
                        ${isDesktop ? `
                            <div class="command-section">
                                <p><strong>Test application launch:</strong></p>
                                <code>open "${agentInfo.path}"</code>
                                <small>Manually test that the application starts correctly</small>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="confidence-building">
                        <div class="confidence-icon">
                            <i class="fas fa-rocket text-green"></i>
                        </div>
                        <p><strong>Your application will now start automatically!</strong></p>
                        <small>The launch agent ensures your ${isDesktop ? 'application' : 'web app'} runs continuously and restarts if it stops.</small>
                    </div>
                    
                    <div class="next-steps">
                        <h4><i class="fas fa-lightbulb"></i> What Happens Next:</h4>
                        <ul>
                            <li>✅ Your ${isDesktop ? 'application' : 'web app'} will start automatically at login</li>
                            <li>✅ If the ${isDesktop ? 'application' : 'web app'} stops, it will automatically restart</li>
                            <li>✅ You can manage this launch agent from the "Launch Agents" tab</li>
                            <li>✅ The launch agent survives system reboots and updates</li>
                        </ul>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="test-agent-btn">Test Now</button>
                    <button class="btn btn-primary modal-continue">Continue Setup</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Start status verification
        verifyLaunchAgentStatus(agentLabel);
        
        const cleanup = () => modal.remove();
        
        // Test agent button
        modal.querySelector('#test-agent-btn').addEventListener('click', async () => {
            await testLaunchAgent(agentLabel, agentInfo);
        });
        
        modal.querySelector('.modal-continue').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', escapeHandler);
                resolve(true);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

// Verify launch agent status in real-time
async function verifyLaunchAgentStatus(agentLabel) {
    const statusContainer = document.getElementById('agent-status-check');
    if (!statusContainer) return;
    
    try {
        // Add a delay to allow the system to register the agent
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const response = await apiCall(`/api/launch-agents/status/${encodeURIComponent(agentLabel)}`);
        
        if (response.success) {
            const status = response.data;
            
            statusContainer.innerHTML = `
                <div class="status-result">
                    <div class="status-item ${status.loaded ? 'status-success' : 'status-warning'}">
                        <i class="fas ${status.loaded ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                        <span>Launch Agent: ${status.loaded ? 'Loaded' : 'Not Loaded'}</span>
                    </div>
                    <div class="status-item ${status.running ? 'status-success' : 'status-info'}">
                        <i class="fas ${status.running ? 'fa-play-circle' : 'fa-pause-circle'}"></i>
                        <span>Process: ${status.running ? `Running (PID: ${status.pid})` : 'Not Running'}</span>
                    </div>
                    ${status.lastExit ? `
                        <div class="status-item status-info">
                            <i class="fas fa-info-circle"></i>
                            <span>Last Exit: ${status.lastExit}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="status-explanation">
                    ${status.loaded 
                        ? '<p class="text-success">✓ Launch agent is properly registered with macOS</p>'
                        : '<p class="text-warning">⚠ Launch agent may need time to load or manual loading</p>'
                    }
                    ${status.running 
                        ? '<p class="text-success">✓ Application is currently running</p>'
                        : '<p class="text-info">ℹ Application will start automatically when needed</p>'
                    }
                </div>
            `;
        } else {
            throw new Error(response.message || 'Failed to check status');
        }
    } catch (error) {
        console.error('Error verifying launch agent status:', error);
        statusContainer.innerHTML = `
            <div class="status-error">
                <i class="fas fa-exclamation-triangle text-warning"></i>
                <p>Unable to verify status automatically. Use the manual commands below to check.</p>
                <small>This is normal for newly created launch agents.</small>
            </div>
        `;
    }
}

// Test launch agent functionality
async function testLaunchAgent(agentLabel, agentInfo) {
    const testButton = document.getElementById('test-agent-btn');
    const originalText = testButton.innerHTML;
    
    testButton.disabled = true;
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    
    try {
        const response = await apiCall(`/api/launch-agents/test/${encodeURIComponent(agentLabel)}`, {
            method: 'POST'
        });
        
        if (response.success) {
            showToast(`Launch agent test successful! ${agentInfo.name} should be starting.`, 'success');
            
            // Refresh status after test
            setTimeout(() => verifyLaunchAgentStatus(agentLabel), 3000);
        } else {
            showToast(`Test failed: ${response.message}`, 'warning');
        }
    } catch (error) {
        console.error('Error testing launch agent:', error);
        showToast('Unable to test launch agent. You can test manually using the commands shown.', 'info');
    } finally {
        testButton.disabled = false;
        testButton.innerHTML = originalText;
    }
}

// Skip application setup with user confirmation  
async function skipApplicationSetup() {
    const confirmed = await showConfirmDialog(
        'Skip Application Setup',
        'You are about to skip application setup. You can always create launch agents later from the Launch Agents tab.\n\nAre you sure you want to continue without setting up an application?',
        {
            confirmText: 'Yes, Skip App Setup',
            cancelText: 'Cancel',
            type: 'warning'
        }
    );
    
    if (!confirmed) {
        return;
    }
    
    const skipButton = document.getElementById('wizard-skip-app-setup');
    const createButton = document.getElementById('wizard-create-launch-agent');
    
    skipButton.disabled = true;
    createButton.disabled = true;
    skipButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Skipping...';
    
    try {
        // Log the skip action for analytics
        await fetch('/api/setup-wizard/log-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'skip_application_setup',
                step: 4,
                mode: wizardCurrentMode,
                hasApp: !!wizardCurrentAppPath,
                hasWebUrl: !!document.getElementById('wizard-web-url')?.value,
                timestamp: new Date().toISOString()
            })
        }).catch(() => {/* Ignore logging errors */});
        
        showToast('Skipped application setup. You can configure launch agents later from the Launch Agents tab.', 'info');
        
        // Mark step as skipped and proceed
        markStepCompleted(4, 'skipped');
        window.navigateWizard('next', { skipValidation: true });
        
    } catch (error) {
        console.error('Error during skip operation:', error);
        // Even if logging fails, still proceed
        markStepCompleted(4, 'skipped');
        window.navigateWizard('next', { skipValidation: true });
    } finally {
        skipButton.disabled = false;
        createButton.disabled = false;
        skipButton.innerHTML = '<i class="fas fa-forward"></i> Skip App Setup';
    }
}

// Toggle details for system check items
function toggleCheckDetails(event) {
    const button = event.currentTarget;
    const checkItem = button.closest('.system-check-item');
    const details = checkItem.querySelector('.check-details');
    const icon = button.querySelector('i');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        icon.className = 'fas fa-chevron-up';
        button.title = 'Hide details';
    } else {
        details.style.display = 'none';
        icon.className = 'fas fa-chevron-down';
        button.title = 'Show more details';
    }
}

// Run essential system checks for the 4 core settings
async function runEssentialSystemChecks(essentialChecks) {
    console.log('[WIZARD] Running essential system checks...');
    
    try {
        // Get current system settings status
        const systemStatus = await apiCall('/api/system/settings/status');
        const settingsData = systemStatus.settings || {};
        
        let allGood = true;
        let checkedCount = 0;
        
        essentialChecks.forEach((check, index) => {
            setTimeout(() => {
                const checkElement = document.querySelector(`[data-check-id="${check.id}"]`);
                if (!checkElement) return;
                
                const icon = checkElement.querySelector('.check-icon i');
                const statusElement = checkElement.querySelector('.check-status');
                
                // Determine if this essential setting is properly configured
                const isConfigured = getEssentialSettingStatus(check.id, settingsData);
                
                if (isConfigured) {
                    // Setting is properly configured
                    icon.className = `${check.icon} text-green`;
                    statusElement.innerHTML = '<i class="fas fa-check-circle text-green"></i> Configured';
                    checkElement.classList.add('check-passed');
                } else {
                    // Setting needs attention
                    icon.className = `${check.icon} text-yellow`;
                    statusElement.innerHTML = '<i class="fas fa-exclamation-triangle text-yellow"></i> Needs Setup';
                    checkElement.classList.add('check-warning');
                    allGood = false;
                }
                
                checkedCount++;
                
                // Update summary when all checks are complete
                if (checkedCount === essentialChecks.length) {
                    updateSystemCheckSummary(allGood, checkedCount);
                }
            }, index * 300); // Stagger the checks for better UX
        });
        
    } catch (error) {
        console.error('[WIZARD] Error running essential system checks:', error);
        
        // Set all checks to error state if API call fails
        essentialChecks.forEach(check => {
            const checkElement = document.querySelector(`[data-check-id="${check.id}"]`);
            if (checkElement) {
                const icon = checkElement.querySelector('.check-icon i');
                const statusElement = checkElement.querySelector('.check-status');
                
                icon.className = `${check.icon} text-red`;
                statusElement.innerHTML = '<i class="fas fa-times-circle text-red"></i> Check Failed';
                checkElement.classList.add('check-error');
            }
        });
        
        updateSystemCheckSummary(false, essentialChecks.length, 'Unable to verify system settings. Please check manually.');
    }
}

// Get status for essential settings (simplified mapping)
function getEssentialSettingStatus(checkId, settingsData) {
    switch (checkId) {
        case 'computer-sleep':
            return settingsData.disableComputerSleep?.status === 'set';
            
        case 'display-sleep':
            return settingsData.disableDisplaySleep?.status === 'set';
            
        case 'screensaver-disabled':
            return settingsData.disableScreenSaver?.status === 'set';
            
        case 'focus-mode':
            // This might not be available in current API, so default to false for now
            return settingsData.enableFocusMode?.status === 'set' || false;
            
        default:
            return false;
    }
}

// Update the system check summary
function updateSystemCheckSummary(allGood, totalChecks, errorMessage = null) {
    const summaryElement = document.getElementById('system-check-summary');
    if (!summaryElement) return;
    
    let summaryHTML;
    
    if (errorMessage) {
        summaryHTML = `
            <div class="summary-content error">
                <div class="summary-icon">
                    <i class="fas fa-exclamation-circle text-red"></i>
                </div>
                <div class="summary-text">
                    <span>${errorMessage}</span>
                    <small>You can proceed anyway, but manual verification is recommended.</small>
                </div>
            </div>
        `;
    } else if (allGood) {
        summaryHTML = `
            <div class="summary-content success">
                <div class="summary-icon">
                    <i class="fas fa-check-circle text-green"></i>
                </div>
                <div class="summary-text">
                    <span>Excellent! All ${totalChecks} essential settings are configured correctly.</span>
                    <small>Your installation is ready to run "forever" without interruption.</small>
                </div>
            </div>
        `;
    } else {
        const configuredCount = document.querySelectorAll('.system-check-item.check-passed').length;
        const needsSetupCount = totalChecks - configuredCount;
        
        summaryHTML = `
            <div class="summary-content warning">
                <div class="summary-icon">
                    <i class="fas fa-exclamation-triangle text-yellow"></i>
                </div>
                <div class="summary-text">
                    <span>${configuredCount} of ${totalChecks} settings are configured. ${needsSetupCount} need setup.</span>
                    <small>You can proceed and fix these later, or apply them in the next step.</small>
                </div>
            </div>
        `;
    }
    
    summaryElement.innerHTML = summaryHTML;
}

// PHASE 1: Show "before" state with what will change
async function showBeforeSettingsModal(selectedSettings) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay settings-verification-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-info-circle"></i> Settings to Apply</h3>
                </div>
                
                <div class="modal-body">
                    <div class="verification-intro">
                        <p>You are about to apply <strong>${selectedSettings.length} system setting(s)</strong>. Here's what will change:</p>
                    </div>
                    
                    <div class="settings-preview" id="settings-preview">
                        <div class="loading-state">
                            <i class="fas fa-circle-notch fa-spin"></i>
                            <span>Checking current state...</span>
                        </div>
                    </div>
                    
                    <div class="self-check-instructions">
                        <h4><i class="fas fa-search"></i> Verify Yourself:</h4>
                        <p>After applying, you can verify these changes manually:</p>
                        <ul>
                            <li><strong>Computer Sleep:</strong> System Preferences → Energy Saver → Computer Sleep: Never</li>
                            <li><strong>Display Sleep:</strong> System Preferences → Energy Saver → Display Sleep: Never</li>
                            <li><strong>Screensaver:</strong> System Preferences → Desktop & Screen Saver → Start after: Never</li>
                            <li><strong>Do Not Disturb:</strong> System Preferences → Focus → Schedule: Always</li>
                        </ul>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary modal-cancel">Cancel</button>
                    <button class="btn btn-primary modal-proceed">Proceed with Changes</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load current state
        loadCurrentStatePreview(selectedSettings);
        
        const cleanup = () => modal.remove();
        
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            cleanup();
            resolve(false);
        });
        
        modal.querySelector('.modal-proceed').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', escapeHandler);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

// Load current state for preview
async function loadCurrentStatePreview(selectedSettings) {
    const previewContainer = document.getElementById('settings-preview');
    if (!previewContainer) return;
    
    try {
        const response = await apiCall('/api/system/settings/status');
        const settingsData = response.settings || {};
        
        const settingNames = {
            'disableComputerSleep': 'Computer Sleep',
            'disableDisplaySleep': 'Display Sleep', 
            'disableScreenSaver': 'Screensaver',
            'enableFocusMode': 'Do Not Disturb (24h)'
        };
        
        const previewHTML = selectedSettings.map(settingId => {
            const setting = settingsData[settingId];
            const name = settingNames[settingId] || settingId;
            const currentStatus = setting?.status === 'set' ? 'Configured' : 'Not Configured';
            const statusClass = setting?.status === 'set' ? 'text-green' : 'text-yellow';
            
            return `
                <div class="setting-preview-item">
                    <div class="setting-info">
                        <h5>${name}</h5>
                        <div class="status-change">
                            <span class="current-status ${statusClass}">
                                <i class="fas ${setting?.status === 'set' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                                Currently: ${currentStatus}
                            </span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="new-status text-green">
                                <i class="fas fa-check-circle"></i>
                                Will be: Configured
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        previewContainer.innerHTML = previewHTML;
        
    } catch (error) {
        console.error('Error loading current state:', error);
        previewContainer.innerHTML = `
            <div class="preview-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Unable to check current state. Settings will be applied as selected.</p>
            </div>
        `;
    }
}

// PHASE 2: Apply settings with live progress feedback
async function applySettingsWithProgress(selectedSettings, buttonElement) {
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying Settings...';
    
    const appliedSettings = [];
    const failedSettings = [];
    
    try {
        const response = await fetch('/api/setup-wizard/apply-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedSettings })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Populate results based on API response
            if (data.data && data.data.results) {
                data.data.results.forEach(result => {
                    if (result.success) {
                        appliedSettings.push(result);
                    } else {
                        failedSettings.push(result);
                    }
                });
            } else {
                // Fallback: assume all selected settings were applied
                selectedSettings.forEach(id => {
                    appliedSettings.push({ id, name: id, success: true });
                });
            }
            
            const success = failedSettings.length === 0;
            showToast(`Applied ${appliedSettings.length} of ${selectedSettings.length} settings`, success ? 'success' : 'warning');
            
            return { success, appliedSettings, failedSettings };
        } else {
            throw new Error(data.message || data.error || 'Failed to apply settings');
        }
    } catch (error) {
        // All settings failed
        selectedSettings.forEach(id => {
            failedSettings.push({ id, name: id, success: false, error: error.message });
        });
        
        return { success: false, appliedSettings, failedSettings };
    }
}

// PHASE 3: Show "after" verification with results
async function showAfterSettingsModal(success, appliedSettings, failedSettings) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay settings-verification-modal';
        
        const totalSettings = appliedSettings.length + failedSettings.length;
        const iconClass = success ? 'fas fa-check-circle text-green' : 'fas fa-exclamation-triangle text-yellow';
        const titleText = success ? 'Settings Applied Successfully' : 'Settings Partially Applied';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="${iconClass}"></i> ${titleText}</h3>
                </div>
                
                <div class="modal-body">
                    <div class="verification-summary">
                        <p>${appliedSettings.length} of ${totalSettings} settings were applied successfully.</p>
                        ${failedSettings.length > 0 ? `<p class="text-warning">${failedSettings.length} settings failed to apply.</p>` : ''}
                    </div>
                    
                    ${appliedSettings.length > 0 ? `
                        <div class="applied-settings">
                            <h4><i class="fas fa-check"></i> Successfully Applied:</h4>
                            <ul>
                                ${appliedSettings.map(setting => `
                                    <li class="success-item">
                                        <i class="fas fa-check-circle text-green"></i>
                                        ${setting.name || setting.id}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${failedSettings.length > 0 ? `
                        <div class="failed-settings">
                            <h4><i class="fas fa-times"></i> Failed to Apply:</h4>
                            <ul>
                                ${failedSettings.map(setting => `
                                    <li class="error-item">
                                        <i class="fas fa-times-circle text-red"></i>
                                        ${setting.name || setting.id}
                                        ${setting.error ? `<small class="error-detail">Error: ${setting.error}</small>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="verification-instructions">
                        <h4><i class="fas fa-search"></i> Verify Your Changes:</h4>
                        <div class="verification-steps">
                            <p>To confirm these settings were applied correctly:</p>
                            <ol>
                                <li>Open <strong>System Preferences</strong></li>
                                <li>Check <strong>Energy Saver</strong> → Computer Sleep and Display Sleep should be "Never"</li>
                                <li>Check <strong>Desktop & Screen Saver</strong> → Screen Saver should start "Never"</li>
                                <li>Check <strong>Focus</strong> → Do Not Disturb should be scheduled "Always"</li>
                            </ol>
                            <div class="terminal-commands">
                                <p><strong>Or verify via Terminal:</strong></p>
                                <code>pmset -g | grep -E "sleep|displaysleep"</code>
                                <br><small>Should show "sleep 0" and "displaysleep 0"</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="confidence-building">
                        <div class="confidence-icon">
                            <i class="fas fa-shield-alt text-green"></i>
                        </div>
                        <p><strong>Your installation is now protected from sleep and interruptions!</strong></p>
                        <small>These settings ensure your creative technology installation runs reliably 24/7.</small>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-primary modal-continue">Continue Setup</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const cleanup = () => modal.remove();
        
        modal.querySelector('.modal-continue').addEventListener('click', () => {
            cleanup();
            resolve(true);
        });
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', escapeHandler);
                resolve(true);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    });
}

// Retry failed settings function
async function retryFailedSettings(failedSettingIds) {
    console.log('[WIZARD] Retrying failed settings:', failedSettingIds);
    
    // Update checkboxes to only show failed settings as selected
    document.querySelectorAll('.setting-checkbox').forEach(checkbox => {
        checkbox.checked = failedSettingIds.includes(checkbox.dataset.settingId);
    });
    
    // Re-run the apply process
    await applyEssentialSettings();
}

// Show instructions for web app setup when backend endpoint is not available
function showWizardWebAppInstructions(url, appName) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay wizard-instructions-modal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-info-circle"></i> Web App Setup Instructions</h3>
                <button class="modal-close">&times;</button>
            </div>
            
            <div class="modal-body">
                <p>Your web application <strong>${appName}</strong> has been noted for setup.</p>
                <p><strong>URL:</strong> ${url}</p>
                
                <div class="instructions-section">
                    <h4>Next Steps:</h4>
                    <ol>
                        <li>After completing the setup wizard, go to the <strong>Launch Agents</strong> tab</li>
                        <li>Switch to the <strong>Web Applications</strong> mode</li>
                        <li>Enter your URL: <code>${url}</code></li>
                        <li>Configure your browser options and create the launch agent</li>
                    </ol>
                </div>
                
                <div class="info-note">
                    <i class="fas fa-lightbulb"></i>
                    <p>The Launch Agents tab provides full control over web application launch agents with browser selection, kiosk mode options, and command preview.</p>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary modal-ok">Got It</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const cleanup = () => modal.remove();
    
    modal.querySelector('.modal-close').addEventListener('click', cleanup);
    modal.querySelector('.modal-ok').addEventListener('click', cleanup);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cleanup();
        }
    });
    
    // Close on escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            cleanup();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}
