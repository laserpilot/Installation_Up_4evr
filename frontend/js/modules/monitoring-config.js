/**
 * @file monitoring-config.js
 * @description Logic for the Monitoring configuration section.
 */

import { apiCall, MasterConfigAPI } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { ConfigSection } from '../components/ConfigSection.js';
import { monitoringDisplay } from '../utils/monitoring-display.js';

// Monitoring thresholds - consistent across all monitoring modules
const MONITORING_THRESHOLDS = {
    cpu: { warning: 70, critical: 85 },
    memory: { warning: 75, critical: 90 },
    disk: { warning: 80, critical: 95 },
    temperature: { warning: 70, critical: 85 }
};

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
    setupLaunchAgentSuggestions();
    
    // Initialize with current config and status
    loadMonitoringConfig();
    refreshSystemStatus();
    
    // Load launch agent suggestions after initial load
    setTimeout(() => {
        loadLaunchAgentSuggestions();
    }, 1000);
}

// Launch Agent Suggestions Functionality
function setupLaunchAgentSuggestions() {
    console.log('[MONITORING-CONFIG] Setting up launch agent suggestions...');
    
    const refreshButton = document.getElementById('refresh-suggestions');
    if (refreshButton) {
        refreshButton.addEventListener('click', loadLaunchAgentSuggestions);
    }
}

async function loadLaunchAgentSuggestions() {
    try {
        showLoading('Scanning for applications...');
        
        // Get running applications and existing launch agents
        const [appsResponse, agentsResponse] = await Promise.all([
            apiCall('/api/monitoring/applications'),
            apiCall('/api/launch-agents/list')
        ]);
        
        const runningApps = appsResponse.data || [];
        const existingAgents = agentsResponse.data || [];
        
        // Filter apps that don't have launch agents yet
        const suggestions = filterApplicationSuggestions(runningApps, existingAgents);
        
        displayLaunchAgentSuggestions(suggestions);
        
    } catch (error) {
        console.error('[MONITORING-CONFIG] Failed to load launch agent suggestions:', error);
        showToast('Failed to load application suggestions', 'error');
    } finally {
        hideLoading();
    }
}

function filterApplicationSuggestions(runningApps, existingAgents) {
    const existingPaths = existingAgents.map(agent => agent.program_path || agent.path);
    const suggestions = [];
    
    runningApps.forEach(app => {
        // Skip system applications and apps that already have launch agents
        if (!app.name.startsWith('com.apple.') && 
            !existingPaths.some(path => path.includes(app.name)) &&
            !app.name.includes('System') &&
            !app.name.includes('Finder')) {
            
            suggestions.push({
                name: app.name,
                path: app.path || `/Applications/${app.name}.app`,
                pid: app.pid,
                cpu: app.cpu || 0,
                memory: app.memory || 0,
                reason: determineAutostartReason(app)
            });
        }
    });
    
    // Sort by relevance (higher CPU/memory usage indicates more important apps)
    return suggestions.sort((a, b) => (b.cpu + b.memory) - (a.cpu + a.memory));
}

function determineAutostartReason(app) {
    const name = app.name.toLowerCase();
    
    if (name.includes('creative') || name.includes('adobe') || name.includes('sketch')) {
        return 'Creative application - would benefit from auto-restart on crash';
    } else if (name.includes('browser') || name.includes('chrome') || name.includes('firefox')) {
        return 'Browser application - useful for kiosk mode installations';
    } else if (name.includes('media') || name.includes('vlc') || name.includes('quicktime')) {
        return 'Media application - important for continuous playback installations';
    } else if (app.cpu > 5 || app.memory > 100) {
        return 'High resource usage - critical application that should auto-restart';
    } else {
        return 'Running application - could benefit from launch agent protection';
    }
}

function displayLaunchAgentSuggestions(suggestions) {
    const container = document.getElementById('launch-agent-suggestions');
    if (!container) return;
    
    if (suggestions.length === 0) {
        container.innerHTML = `
            <div class="suggestion-placeholder">
                <i class="fas fa-check-circle"></i>
                <p>Great! All running applications already have launch agent protection, or no suitable applications found.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = suggestions.map(app => `
        <div class="suggestion-card" data-app-name="${app.name}" data-app-path="${app.path}">
            <div class="suggestion-header">
                <div class="app-info">
                    <h4>${app.name}</h4>
                    <small class="app-path">${app.path}</small>
                </div>
                <div class="app-stats">
                    <span class="cpu-stat">CPU: ${app.cpu.toFixed(1)}%</span>
                    <span class="memory-stat">RAM: ${app.memory.toFixed(0)}MB</span>
                </div>
            </div>
            <div class="suggestion-reason">
                <i class="fas fa-lightbulb"></i>
                <span>${app.reason}</span>
            </div>
            <div class="suggestion-actions">
                <button class="btn btn-small btn-primary create-agent-btn" 
                        data-app-name="${app.name}" 
                        data-app-path="${app.path}">
                    <i class="fas fa-rocket"></i> Create Launch Agent
                </button>
                <button class="btn btn-small btn-secondary ignore-suggestion-btn" 
                        data-app-name="${app.name}">
                    <i class="fas fa-times"></i> Ignore
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to suggestion buttons
    container.querySelectorAll('.create-agent-btn').forEach(button => {
        button.addEventListener('click', handleCreateLaunchAgent);
    });
    
    container.querySelectorAll('.ignore-suggestion-btn').forEach(button => {
        button.addEventListener('click', handleIgnoreSuggestion);
    });
}

async function handleCreateLaunchAgent(event) {
    const button = event.target.closest('.create-agent-btn');
    const appName = button.dataset.appName;
    const appPath = button.dataset.appPath;
    
    try {
        showLoading('Creating launch agent...');
        
        // Create launch agent using the API
        const response = await apiCall('/api/launch-agents/create', {
            method: 'POST',
            body: JSON.stringify({
                name: appName,
                path: appPath,
                autoStart: true,
                keepAlive: true
            })
        });
        
        if (response.success) {
            showToast(`Launch agent created for ${appName}`, 'success');
            
            // Remove the suggestion card
            const suggestionCard = button.closest('.suggestion-card');
            suggestionCard.remove();
            
            // Check if there are any suggestions left
            const container = document.getElementById('launch-agent-suggestions');
            if (container.children.length === 0) {
                displayLaunchAgentSuggestions([]);
            }
        } else {
            throw new Error(response.error || 'Failed to create launch agent');
        }
        
    } catch (error) {
        console.error('[MONITORING-CONFIG] Failed to create launch agent:', error);
        showToast(`Failed to create launch agent: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function handleIgnoreSuggestion(event) {
    const button = event.target.closest('.ignore-suggestion-btn');
    const suggestionCard = button.closest('.suggestion-card');
    
    // Add fade out animation
    suggestionCard.style.opacity = '0.5';
    suggestionCard.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        suggestionCard.remove();
        
        // Check if there are any suggestions left
        const container = document.getElementById('launch-agent-suggestions');
        if (container.children.length === 0) {
            displayLaunchAgentSuggestions([]);
        }
    }, 300);
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
};

function setupStatusDisplay() {
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
    // Update simple status cards directly (not using complex metric cards)
    const system = data.system || {};
    
    // Update CPU status
    if (system.cpu) {
        updateStatusCard('current-cpu', 'cpu-indicator', system.cpu.usage || 0, '%', 'cpu');
    }
    
    // Update Memory status  
    if (system.memory) {
        updateStatusCard('current-memory', 'memory-indicator', system.memory.usage || 0, '%', 'memory');
    }
    
    // Update Disk status
    if (system.disk) {
        updateStatusCard('current-disk', 'disk-indicator', system.disk.usage || 0, '%', 'disk');
    }
    
    // Update Temperature status (temperature data not available in current API)
    updateStatusCard('current-temperature', 'temperature-indicator', 'N/A', '', 'temperature');
}

function updateStatusCard(valueId, indicatorId, value, unit, type) {
    // Update the value display
    const valueElement = document.getElementById(valueId);
    if (valueElement) {
        const displayValue = typeof value === 'number' ? 
            `${value.toFixed(1)}${unit}` : value;
        valueElement.textContent = displayValue;
    }
    
    // Update the status indicator
    const indicatorElement = document.getElementById(indicatorId);
    if (indicatorElement && typeof value === 'number') {
        const level = monitoringDisplay.getMetricLevel(type, value);
        const icon = monitoringDisplay.getStatusIcon(level);
        indicatorElement.textContent = icon;
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
