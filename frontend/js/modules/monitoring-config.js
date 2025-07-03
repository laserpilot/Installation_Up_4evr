/**
 * @file monitoring-config.js
 * @description Logic for the Monitoring configuration section.
 */

import { apiCall, MasterConfigAPI } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { ConfigSection } from '../components/ConfigSection.js';
import { monitoringDisplay } from '../utils/monitoring-display.js';

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
        
        // Update master configuration
        await updateMasterConfigWithMonitoring(config);
        
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
    
    // Load launch agent suggestions after initial load
    setTimeout(() => {
        loadLaunchAgentSuggestions();
    }, 1000);
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
    // Use unified refresh button setup
    monitoringDisplay.setupRefreshButton('refresh-system-status', refreshSystemStatus);
}

// Master Configuration Integration and Launch Agent Suggestions
async function updateMasterConfigWithMonitoring(config) {
    try {
        // Update monitoring configuration in master config
        const masterProfile = await MasterConfigAPI.getMasterProfile();
        if (masterProfile.success) {
            await MasterConfigAPI.updateMasterProfile({
                lastModified: new Date().toISOString()
            });
        }
        
        console.log('[MONITORING-CONFIG] Updated master configuration with monitoring settings');
    } catch (error) {
        console.warn('[MONITORING-CONFIG] Failed to update master configuration:', error);
    }
}

async function loadLaunchAgentSuggestions() {
    try {
        const response = await MasterConfigAPI.getLaunchAgents();
        if (response.success && response.data) {
            const { agents, webApps } = response.data;
            const allApps = [...(agents || []), ...(webApps || [])];
            
            if (allApps.length > 0) {
                addLaunchAgentSuggestionsUI(allApps);
            }
        }
    } catch (error) {
        console.warn('[MONITORING-CONFIG] Failed to load launch agent suggestions:', error);
    }
}

function addLaunchAgentSuggestionsUI(agents) {
    const configEditor = document.getElementById('monitoring-config-editor');
    if (!configEditor) return;
    
    // Add suggestions section if it doesn't exist
    let suggestionsSection = document.getElementById('launch-agent-suggestions');
    if (!suggestionsSection) {
        suggestionsSection = document.createElement('div');
        suggestionsSection.id = 'launch-agent-suggestions';
        suggestionsSection.className = 'launch-agent-suggestions';
        suggestionsSection.innerHTML = `
            <h4><i class="fas fa-lightbulb"></i> Suggested Applications to Monitor</h4>
            <p>Based on your launch agents, consider monitoring these applications:</p>
            <div class="suggestions-grid" id="suggestions-grid"></div>
        `;
        
        // Insert before the config editor
        configEditor.parentNode.insertBefore(suggestionsSection, configEditor);
    }
    
    const suggestionsGrid = document.getElementById('suggestions-grid');
    suggestionsGrid.innerHTML = agents.map(agent => `
        <div class="suggestion-card" data-agent-id="${agent.id}">
            <div class="suggestion-info">
                <span class="suggestion-name">${agent.name}</span>
                <small class="suggestion-path">${agent.path}</small>
            </div>
            <button class="btn btn-small btn-primary" onclick="addAgentToMonitoring('${agent.id}', '${agent.name}', '${agent.path}')">
                <i class="fas fa-plus"></i> Add to Monitoring
            </button>
        </div>
    `).join('');
    
    console.log('[MONITORING-CONFIG] Added suggestions for', agents.length, 'launch agents');
}

// Global function for adding agents to monitoring (called from suggestion buttons)
window.addAgentToMonitoring = function(agentId, agentName, agentPath) {
    try {
        const configEditor = document.getElementById('monitoring-config-editor');
        const currentConfig = JSON.parse(configEditor.value);
        
        // Add to applications array
        if (!currentConfig.applications) {
            currentConfig.applications = [];
        }
        
        // Check if already exists
        const exists = currentConfig.applications.find(app => app.name === agentName);
        if (exists) {
            showToast(`${agentName} is already being monitored`, 'warning');
            return;
        }
        
        currentConfig.applications.push({
            name: agentName,
            path: agentPath,
            type: 'launch-agent',
            enabled: true,
            thresholds: {
                cpu: { warning: 50, critical: 80 },
                memory: { warning: 500, critical: 1000 }
            },
            autoGenerated: true,
            source: 'launch-agent-suggestion'
        });
        
        // Update editor
        configEditor.value = JSON.stringify(currentConfig, null, 2);
        
        // Hide the suggestion
        const suggestionCard = document.querySelector(`[data-agent-id="${agentId}"]`);
        if (suggestionCard) {
            suggestionCard.style.display = 'none';
        }
        
        showToast(`Added ${agentName} to monitoring configuration`, 'success');
    } catch (error) {
        console.error('Failed to add agent to monitoring:', error);
        showToast('Failed to add agent to monitoring', 'error');
    }
};\n\nfunction setupStatusDisplay() {
    // Use unified auto-refresh with 10-second interval for monitoring config
    monitoringDisplay.setupAutoRefresh(refreshSystemStatus, {
        refreshInterval: 10000
    });
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
    // Update status cards using unified display manager
    const system = data.system || {};
    
    // Update CPU status
    if (system.cpu) {
        monitoringDisplay.updateMetricCard({
            metricId: 'current-cpu',
            value: system.cpu.usage || 0,
            unit: '%',
            type: 'cpu'
        });
    }
    
    // Update Memory status  
    if (system.memory) {
        monitoringDisplay.updateMetricCard({
            metricId: 'current-memory',
            value: system.memory.usage || 0,
            unit: '%',
            type: 'memory'
        });
    }
    
    // Update Disk status
    if (system.disk) {
        monitoringDisplay.updateMetricCard({
            metricId: 'current-disk',
            value: system.disk.usage || 0,
            unit: '%',
            type: 'disk'
        });
    }
    
    // Update Temperature status
    if (system.temperature) {
        monitoringDisplay.updateMetricCard({
            metricId: 'current-temperature',
            value: system.temperature || 0,
            unit: '°C',
            type: 'temperature'
        });
    }
}

// Old updateStatusCard function replaced by unified MonitoringDisplayManager

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
