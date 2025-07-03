/**
 * @file monitoring-config.js
 * @description Logic for the Monitoring configuration section.
 */

import { apiCall } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { ConfigSection } from '../components/ConfigSection.js';

async function loadMonitoringConfig() {
    try {
        const response = await apiCall('/api/monitoring/config');
        document.getElementById('monitoring-config-editor').value = JSON.stringify(response.config, null, 2);
        showToast('Monitoring configuration loaded', 'success');
    } catch (error) {
        showToast('Failed to load monitoring configuration', 'error');
    }
}

async function saveMonitoringConfig() {
    try {
        const config = JSON.parse(document.getElementById('monitoring-config-editor').value);
        await apiCall('/api/monitoring/config', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        showToast('Monitoring configuration saved', 'success');
    } catch (error) {
        showToast('Failed to save monitoring configuration', 'error');
    }
}

async function resetMonitoringConfig() {
    if (confirm('Are you sure you want to reset the monitoring configuration to defaults?')) {
        try {
            const response = await apiCall('/api/monitoring/config/reset', {
                method: 'POST'
            });
            
            // Update the editor with the reset configuration
            document.getElementById('monitoring-config-editor').value = JSON.stringify(response.config, null, 2);
            
            // Refresh the status display to show reset values
            refreshSystemStatus();
            
            showToast('Monitoring configuration reset to defaults', 'success');
        } catch (error) {
            console.error('Reset failed:', error);
            showToast('Failed to reset monitoring configuration', 'error');
        }
    }
}

async function applyMonitoringConfig() {
    try {
        const configText = document.getElementById('monitoring-config-editor').value;
        let config;
        
        try {
            config = JSON.parse(configText);
        } catch (parseError) {
            showToast('Invalid JSON configuration format', 'error');
            return;
        }
        
        const response = await apiCall('/api/monitoring/config/apply', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        
        if (response.restartRequired) {
            showToast('Monitoring configuration applied and monitoring system restarted', 'success');
        } else {
            showToast('Monitoring configuration applied successfully', 'success');
        }
        
        // Refresh status to show the applied changes
        refreshSystemStatus();
        
    } catch (error) {
        console.error('Apply failed:', error);
        showToast('Failed to apply monitoring configuration', 'error');
    }
}

export function initMonitoringConfig() {
    console.log('[INIT] Initializing Monitoring Config tab...');
    
    // Setup direct button listeners instead of using ConfigSection
    setupMonitoringConfigButtons();
    
    // Setup additional interactions
    setupRefreshButton();
    setupStatusDisplay();
    setupThresholdControls();
    
    // Initialize with current config and status
    loadMonitoringConfig();
    refreshSystemStatus();
}

function setupMonitoringConfigButtons() {
    const loadBtn = document.getElementById('load-monitoring-config');
    const saveBtn = document.getElementById('save-monitoring-config');
    const resetBtn = document.getElementById('reset-monitoring-config');
    const applyBtn = document.getElementById('apply-monitoring-config');
    
    if (loadBtn) {
        loadBtn.addEventListener('click', loadMonitoringConfig);
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMonitoringConfig);
    }
    if (resetBtn) {
        resetBtn.addEventListener('click', resetMonitoringConfig);
    }
    if (applyBtn) {
        applyBtn.addEventListener('click', applyMonitoringConfig);
    }
}

function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-system-status');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshSystemStatus);
    }
}

function setupStatusDisplay() {
    // Set up periodic status updates for the monitoring config tab
    setInterval(refreshSystemStatus, 10000); // Update every 10 seconds
}

async function refreshSystemStatus() {
    try {
        const response = await apiCall('/api/monitoring/status');
        updateStatusCards(response);
    } catch (error) {
        console.error('Failed to refresh system status:', error);
        showToast('Failed to refresh system status', 'error');
    }
}

function updateStatusCards(data) {
    // Update CPU status
    updateStatusCard('cpu', data.system?.cpu || 0);
    
    // Update Memory status  
    updateStatusCard('memory', data.system?.memory || 0);
    
    // Update Disk status
    updateStatusCard('disk', data.system?.disk || 0);
    
    // Update Temperature status
    updateStatusCard('temperature', data.system?.temperature || 0);
}

function updateStatusCard(type, value) {
    const valueElement = document.getElementById(`current-${type}`);
    const indicatorElement = document.getElementById(`${type}-indicator`);
    const trendElement = document.getElementById(`${type}-trend`);
    
    if (valueElement) {
        if (type === 'temperature') {
            valueElement.textContent = `${Math.round(value)}°C`;
        } else {
            valueElement.textContent = `${Math.round(value)}%`;
        }
    }
    
    if (indicatorElement) {
        if (value > 80) {
            indicatorElement.textContent = '🔴';
        } else if (value > 60) {
            indicatorElement.textContent = '🟡';
        } else {
            indicatorElement.textContent = '🟢';
        }
    }
    
    if (trendElement) {
        // Add trend indication (simplified)
        trendElement.textContent = value > 50 ? '📈' : '📉';
    }
}

function setupThresholdControls() {
    // Setup synchronization between sliders and number inputs
    const thresholdTypes = ['cpu', 'memory', 'disk', 'temperature'];
    const thresholdLevels = ['warning', 'critical'];
    
    thresholdTypes.forEach(type => {
        thresholdLevels.forEach(level => {
            const sliderId = `${type}-${level}-slider`;
            const inputId = `${type}-${level}-input`;
            
            const slider = document.getElementById(sliderId);
            const input = document.getElementById(inputId);
            
            if (slider && input) {
                // Sync slider to input
                slider.addEventListener('input', () => {
                    input.value = slider.value;
                    onThresholdChange(type, level, slider.value);
                });
                
                // Sync input to slider
                input.addEventListener('input', () => {
                    slider.value = input.value;
                    onThresholdChange(type, level, input.value);
                });
                
                // Validate input range
                input.addEventListener('blur', () => {
                    const min = parseInt(input.min);
                    const max = parseInt(input.max);
                    let value = parseInt(input.value);
                    
                    if (isNaN(value) || value < min) {
                        value = min;
                    } else if (value > max) {
                        value = max;
                    }
                    
                    input.value = value;
                    slider.value = value;
                    onThresholdChange(type, level, value);
                });
            }
        });
    });
}

function onThresholdChange(type, level, value) {
    console.log(`[THRESHOLD] ${type} ${level} threshold changed to ${value}%`);
    
    // Update visual indicators
    updateThresholdIndicator(type, level, value);
    
    // Save threshold to configuration (could be enhanced to auto-save)
    saveThresholdValue(type, level, value);
}

function updateThresholdIndicator(type, level, value) {
    // Add visual feedback for threshold changes
    const slider = document.getElementById(`${type}-${level}-slider`);
    if (slider) {
        // Add a brief highlight effect
        slider.style.boxShadow = '0 0 5px rgba(0, 123, 255, 0.5)';
        setTimeout(() => {
            slider.style.boxShadow = '';
        }, 300);
    }
}

function saveThresholdValue(type, level, value) {
    // Store threshold values for later saving
    if (!window.thresholdSettings) {
        window.thresholdSettings = {};
    }
    
    if (!window.thresholdSettings[type]) {
        window.thresholdSettings[type] = {};
    }
    
    window.thresholdSettings[type][level] = parseInt(value);
    
    // Could implement auto-save or show "unsaved changes" indicator
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} ${level} threshold set to ${value}%`, 'info');
}
