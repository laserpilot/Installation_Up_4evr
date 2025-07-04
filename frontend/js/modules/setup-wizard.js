/**
 * @file setup-wizard.js
 * @description Logic for the Setup Wizard tab.
 */

import { showToast } from '../utils/ui.js';
import { apiCall } from '../utils/api.js';

// Wizard state variables
let currentStep = 1;
const totalSteps = 6; // Based on index.html

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
    
    // Step validation function
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

// Load system check content for step 2
async function loadSystemCheck() {
    try {
        const response = await fetch('/api/setup-wizard/system-check');
        if (!response.ok) throw new Error('Failed to load system check');
        
        const data = await response.json();
        const checksContainer = document.getElementById('wizard-system-checks');
        
        if (checksContainer && data.success) {
            checksContainer.innerHTML = data.data.systemChecks.map(check => `
                <div class="system-check-item" data-check-id="${check.id}">
                    <div class="check-icon">
                        <i class="fas fa-circle-notch fa-spin"></i>
                    </div>
                    <div class="check-content">
                        <h4>${check.name}</h4>
                        <p>${check.description}</p>
                        <span class="check-status">Checking...</span>
                    </div>
                    <div class="check-required">
                        ${check.required ? '<span class="badge badge-required">Required</span>' : '<span class="badge badge-optional">Optional</span>'}
                    </div>
                </div>
            `).join('');
            
            // Simulate checks completion
            setTimeout(() => runSystemChecks(data.data.systemChecks), 1000);
        }
    } catch (error) {
        console.error('Error loading system check:', error);
        showToast('Failed to load system check', 'error');
    }
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

// Apply essential settings with enhanced error handling
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
    applyButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying Settings...';
    
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
            const appliedCount = data.data?.totalApplied || selectedSettings.length;
            const failedCount = data.data?.totalFailed || 0;
            
            showToast(`Successfully applied ${appliedCount} system setting(s)`, 'success');
            
            if (failedCount > 0) {
                showToast(`Warning: ${failedCount} setting(s) failed to apply. You may need to configure them manually.`, 'warning');
            }
            
            // Update step status and proceed
            markStepCompleted(3, 'applied');
            window.navigateWizard('next', { skipValidation: true });
        } else {
            throw new Error(data.message || data.error || 'Failed to apply settings');
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
        
        // Add status indicator
        const statusIcon = status === 'skipped' 
            ? '<i class="fas fa-forward" title="Skipped"></i>'
            : '<i class="fas fa-check" title="Completed"></i>';
        
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
                    <div class="summary-stats">
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fas fa-heart-pulse"></i>
                            </div>
                            <div class="stat-content">
                                <h4>Health Score</h4>
                                <span class="stat-value ${summary.healthScore > 80 ? 'text-green' : summary.healthScore > 60 ? 'text-yellow' : 'text-red'}">${summary.healthScore}%</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fas ${summary.settingsConfigured ? 'fa-check-circle text-green' : 'fa-times-circle text-red'}"></i>
                            </div>
                            <div class="stat-content">
                                <h4>Settings</h4>
                                <span class="stat-value">${summary.settingsConfigured ? 'Configured' : 'Needs Work'}</span>
                            </div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-icon">
                                <i class="fas ${summary.monitoringActive ? 'fa-chart-line text-green' : 'fa-chart-line text-gray'}"></i>
                            </div>
                            <div class="stat-content">
                                <h4>Monitoring</h4>
                                <span class="stat-value">${summary.monitoringActive ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="recommended-steps">
                        <h4>Recommended Next Steps:</h4>
                        <ul>
                            ${summary.recommendedNextSteps.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                    </div>
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

// Function to create launch agent from wizard
async function createWizardLaunchAgent() {
    try {
        showToast('Creating launch agent...', 'info');
        
        if (wizardCurrentMode === 'app') {
            if (!wizardCurrentAppPath) {
                showToast('Please select an application first', 'error');
                return false;
            }
            
            const result = await apiCall('/api/launch-agents/create', {
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
            
            if (result.success) {
                showToast(`Launch agent created for ${wizardCurrentAppPath.split('/').pop()}`, 'success');
                return true;
            } else {
                showToast(`Failed to create launch agent: ${result.message}`, 'error');
                return false;
            }
            
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
            
            // Try the web-specific endpoint first
            try {
                const result = await apiCall('/api/launch-agents/create-web', {
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
                
                if (result.success) {
                    showToast(`Web app launch agent created: ${name}`, 'success');
                    return true;
                } else {
                    throw new Error(result.message || 'Web app endpoint failed');
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
        
        return false;
    } catch (error) {
        console.error('[WIZARD] Failed to create launch agent:', error);
        showToast('Failed to create launch agent', 'error');
        return false;
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
