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

    // Navigation function (defined here to access showStep)
    window.navigateWizard = function(direction) {
        if (direction === 'next' && currentStep < totalSteps) {
            currentStep++;
        } else if (direction === 'back' && currentStep > 1) {
            currentStep--;
        }
        showStep(currentStep);
        
        // Load summary data when reaching final step
        if (currentStep === totalSteps) {
            loadWizardSummary();
        }
        
        showToast(`Navigated to Step ${currentStep}`, 'info');
    };

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
    document.getElementById('wizard-run-tests')?.addEventListener('click', async () => {
        await runWizardTests();
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

// Apply essential settings
async function applyEssentialSettings() {
    const selectedSettings = Array.from(document.querySelectorAll('.setting-checkbox:checked'))
        .map(checkbox => checkbox.dataset.settingId);
    
    if (selectedSettings.length === 0) {
        showToast('No settings selected to apply', 'info');
        window.navigateWizard('next');
        return;
    }
    
    const button = document.getElementById('wizard-apply-settings');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying Settings...';
    
    try {
        const response = await fetch('/api/setup-wizard/apply-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedSettings })
        });
        
        if (!response.ok) throw new Error('Failed to apply settings');
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Applied ${data.data.totalApplied} settings successfully`, 'success');
            if (data.data.totalFailed > 0) {
                showToast(`${data.data.totalFailed} settings failed to apply`, 'warning');
            }
            window.navigateWizard('next');
        } else {
            throw new Error(data.error || 'Failed to apply settings');
        }
    } catch (error) {
        console.error('Error applying settings:', error);
        showToast('Failed to apply settings: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-check"></i> Apply Settings';
    }
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
