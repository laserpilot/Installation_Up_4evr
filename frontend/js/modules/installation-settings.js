/**
 * @file installation-settings.js
 * @description Logic for the Installation Settings tab - handles creative technology installation parameters.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { setValue, getValue, synchronizeSliderInput } from '../utils/form-helpers.js';

export function initInstallationSettings() {
    console.log('[INIT] Initializing Installation Settings tab...');
    
    // Set up form event listeners
    setupSliderSynchronization();
    setupActionButtons();
    
    // Load current settings
    loadInstallationSettings();
}

function setupSliderSynchronization() {
    // Synchronize sliders with number inputs
    synchronizeSliderInput('camera-threshold-slider', 'camera-threshold-input');
    synchronizeSliderInput('capacitive-threshold-slider', 'capacitive-threshold-input');
    synchronizeSliderInput('audio-threshold-slider', 'audio-threshold-input');
    synchronizeSliderInput('proximity-threshold-slider', 'proximity-threshold-input');
}

// synchronizeSliderInput is now imported from form-helpers.js

function setupActionButtons() {
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
