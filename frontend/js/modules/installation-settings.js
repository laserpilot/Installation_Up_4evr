/**
 * @file installation-settings.js
 * @description Logic for the Installation Settings tab - handles creative technology installation parameters.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';

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

function synchronizeSliderInput(sliderId, inputId) {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    
    if (slider && input) {
        slider.addEventListener('input', (e) => {
            input.value = e.target.value;
        });
        
        input.addEventListener('input', (e) => {
            slider.value = e.target.value;
        });
    }
}

function setupActionButtons() {
    const testBtn = document.getElementById('test-installation-settings');
    const resetBtn = document.getElementById('reset-installation-settings');
    const applyBtn = document.getElementById('apply-installation-settings');
    
    if (testBtn) {
        testBtn.addEventListener('click', testInstallationSettings);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetInstallationSettings);
    }
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyInstallationSettings);
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
}

function getCurrentSettings() {
    const activePins = Array.from(document.querySelectorAll('input[name="capacitive-pins"]:checked'))
        .map(checkbox => parseInt(checkbox.value));
    
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
        }
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

// Utility functions
function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value;
    }
}

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}
