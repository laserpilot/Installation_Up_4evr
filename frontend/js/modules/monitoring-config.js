/**
 * @file monitoring-config.js
 * @description Logic for the Monitoring configuration section.
 */

import { apiCall, MasterConfigAPI } from '../utils/api.js';
import { showToast } from '../utils/ui.js';
import { monitoringDisplay } from '../utils/monitoring-display.js';

async function loadMonitoringConfig() {
    try {
        console.log('[MONITORING-CONFIG] Loading monitoring configuration...');
        const response = await apiCall('/api/monitoring/config');
        const config = response.config || response.data || {};
        
        console.log('[MONITORING-CONFIG] Loaded config:', config);
        
        // Load threshold values into UI elements
        if (config.thresholds) {
            const thresholds = config.thresholds;
            
            // CPU thresholds
            if (thresholds.cpu) {
                const cpuWarningSlider = document.getElementById('cpu-warning-slider');
                const cpuWarningInput = document.getElementById('cpu-warning-input');
                const cpuCriticalSlider = document.getElementById('cpu-critical-slider');
                const cpuCriticalInput = document.getElementById('cpu-critical-input');
                
                if (cpuWarningSlider && cpuWarningInput) {
                    cpuWarningSlider.value = thresholds.cpu.warning || 70;
                    cpuWarningInput.value = thresholds.cpu.warning || 70;
                }
                if (cpuCriticalSlider && cpuCriticalInput) {
                    cpuCriticalSlider.value = thresholds.cpu.critical || 85;
                    cpuCriticalInput.value = thresholds.cpu.critical || 85;
                }
            }
            
            // Memory thresholds
            if (thresholds.memory) {
                const memWarningSlider = document.getElementById('memory-warning-slider');
                const memWarningInput = document.getElementById('memory-warning-input');
                const memCriticalSlider = document.getElementById('memory-critical-slider');
                const memCriticalInput = document.getElementById('memory-critical-input');
                
                if (memWarningSlider && memWarningInput) {
                    memWarningSlider.value = thresholds.memory.warning || 75;
                    memWarningInput.value = thresholds.memory.warning || 75;
                }
                if (memCriticalSlider && memCriticalInput) {
                    memCriticalSlider.value = thresholds.memory.critical || 90;
                    memCriticalInput.value = thresholds.memory.critical || 90;
                }
            }
            
            // Disk thresholds
            if (thresholds.disk) {
                const diskWarningSlider = document.getElementById('disk-warning-slider');
                const diskWarningInput = document.getElementById('disk-warning-input');
                const diskCriticalSlider = document.getElementById('disk-critical-slider');
                const diskCriticalInput = document.getElementById('disk-critical-input');
                
                if (diskWarningSlider && diskWarningInput) {
                    diskWarningSlider.value = thresholds.disk.warning || 80;
                    diskWarningInput.value = thresholds.disk.warning || 80;
                }
                if (diskCriticalSlider && diskCriticalInput) {
                    diskCriticalSlider.value = thresholds.disk.critical || 95;
                    diskCriticalInput.value = thresholds.disk.critical || 95;
                }
            }
            
            // Temperature thresholds
            if (thresholds.temperature) {
                const tempWarningSlider = document.getElementById('temperature-warning-slider');
                const tempWarningInput = document.getElementById('temperature-warning-input');
                const tempCriticalSlider = document.getElementById('temperature-critical-slider');
                const tempCriticalInput = document.getElementById('temperature-critical-input');
                
                if (tempWarningSlider && tempWarningInput) {
                    tempWarningSlider.value = thresholds.temperature.warning || 75;
                    tempWarningInput.value = thresholds.temperature.warning || 75;
                }
                if (tempCriticalSlider && tempCriticalInput) {
                    tempCriticalSlider.value = thresholds.temperature.critical || 85;
                    tempCriticalInput.value = thresholds.temperature.critical || 85;
                }
            }
        }
        
        // Load monitoring settings
        if (config.monitoring) {
            const intervalInput = document.getElementById('monitoring-interval-config');
            const cooldownInput = document.getElementById('alert-cooldown');
            const escalationInput = document.getElementById('escalation-time');
            const autoRecoveryCheck = document.getElementById('auto-recovery-check');
            
            if (intervalInput) intervalInput.value = config.monitoring.interval || 30;
            if (cooldownInput) cooldownInput.value = config.monitoring.alertCooldown || 5;
            if (escalationInput) escalationInput.value = config.monitoring.escalationTime || 15;
            if (autoRecoveryCheck) autoRecoveryCheck.checked = config.monitoring.autoRecovery !== false;
        }
        
        showToast('Monitoring configuration loaded successfully', 'success');
    } catch (error) {
        console.error('[MONITORING-CONFIG] Load failed:', error);
        showToast('Failed to load monitoring configuration', 'error');
    }
}

async function saveMonitoringConfig() {
    try {
        console.log('[MONITORING-CONFIG] Saving monitoring configuration...');
        
        // Collect threshold values from sliders and inputs
        const config = {
            thresholds: {
                cpu: {
                    warning: parseInt(document.getElementById('cpu-warning-input')?.value || 70),
                    critical: parseInt(document.getElementById('cpu-critical-input')?.value || 85)
                },
                memory: {
                    warning: parseInt(document.getElementById('memory-warning-input')?.value || 75),
                    critical: parseInt(document.getElementById('memory-critical-input')?.value || 90)
                },
                disk: {
                    warning: parseInt(document.getElementById('disk-warning-input')?.value || 80),
                    critical: parseInt(document.getElementById('disk-critical-input')?.value || 95)
                },
                temperature: {
                    warning: parseInt(document.getElementById('temperature-warning-input')?.value || 75),
                    critical: parseInt(document.getElementById('temperature-critical-input')?.value || 85)
                }
            },
            monitoring: {
                interval: parseInt(document.getElementById('monitoring-interval-config')?.value || 30),
                alertCooldown: parseInt(document.getElementById('alert-cooldown')?.value || 5),
                escalationTime: parseInt(document.getElementById('escalation-time')?.value || 15),
                autoRecovery: document.getElementById('auto-recovery-check')?.checked || true
            },
            pingMonitors: window.pingMonitorManager?.pingMonitors || [],
            lastUpdated: new Date().toISOString()
        };
        
        console.log('[MONITORING-CONFIG] Configuration to save:', config);
        
        await apiCall('/api/monitoring/config', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        
        // Update master configuration
        await updateMasterConfigWithMonitoring();
        
        showToast('Monitoring configuration saved successfully', 'success');
    } catch (error) {
        console.error('[MONITORING-CONFIG] Save failed:', error);
        showToast(`Failed to save monitoring configuration: ${error.message}`, 'error');
    }
}

async function resetMonitoringConfig() {
    if (confirm('Are you sure you want to reset the monitoring configuration to defaults?')) {
        try {
            const response = await apiCall('/api/monitoring/config/reset', {
                method: 'POST'
            });
            
            // Load the reset configuration into UI elements
            const config = response.config || {};
            console.log('[MONITORING-CONFIG] Reset config received:', config);
            
            // Reload the configuration into the UI
            await loadMonitoringConfig();
            
            // Refresh the monitoring display to show reset values
            if (window.app?.monitoringData) {
                window.app.monitoringData.refreshData();
            }
            
            showToast('Monitoring configuration reset to defaults', 'success');
        } catch (error) {
            console.error('Reset failed:', error);
            showToast('Failed to reset monitoring configuration', 'error');
        }
    }
}

async function applyMonitoringConfig() {
    try {
        // Collect current configuration from UI elements (same as save)
        const config = {
            thresholds: {
                cpu: {
                    warning: parseInt(document.getElementById('cpu-warning-input')?.value || 70),
                    critical: parseInt(document.getElementById('cpu-critical-input')?.value || 85)
                },
                memory: {
                    warning: parseInt(document.getElementById('memory-warning-input')?.value || 75),
                    critical: parseInt(document.getElementById('memory-critical-input')?.value || 90)
                },
                disk: {
                    warning: parseInt(document.getElementById('disk-warning-input')?.value || 80),
                    critical: parseInt(document.getElementById('disk-critical-input')?.value || 95)
                },
                temperature: {
                    warning: parseInt(document.getElementById('temperature-warning-input')?.value || 75),
                    critical: parseInt(document.getElementById('temperature-critical-input')?.value || 85)
                }
            },
            monitoring: {
                interval: parseInt(document.getElementById('monitoring-interval-config')?.value || 30),
                alertCooldown: parseInt(document.getElementById('alert-cooldown')?.value || 5),
                escalationTime: parseInt(document.getElementById('escalation-time')?.value || 15),
                autoRecovery: document.getElementById('auto-recovery-check')?.checked || true
            },
            pingMonitors: window.pingMonitorManager?.pingMonitors || []
        };
        
        const response = await apiCall('/api/monitoring/config/apply', {
            method: 'POST',
            body: JSON.stringify({ config })
        });
        
        if (response.restartRequired) {
            showToast('Monitoring configuration applied and monitoring system restarted', 'success');
        } else {
            showToast('Monitoring configuration applied successfully', 'success');
        }
        
        // Refresh monitoring display to show the applied changes
        if (window.app?.monitoringData) {
            window.app.monitoringData.refreshData();
        }
        
    } catch (error) {
        console.error('Apply failed:', error);
        showToast('Failed to apply monitoring configuration', 'error');
    }
}

export function initMonitoringConfig() {
    console.log('[INIT] Initializing Monitoring Config tab...');
    
    // Setup direct button listeners and interactions
    setupMonitoringConfigButtons();
    setupStatusDisplay();
    setupThresholdControls();
    setupLaunchAgentSuggestions();
    
    // Initialize with current config and status
    loadMonitoringConfig();
    
    // Refresh monitoring display
    if (window.app?.monitoringData) {
        window.app.monitoringData.refreshData();
    }
    
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


// Master Configuration Integration and Launch Agent Suggestions
async function updateMasterConfigWithMonitoring() {
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




function setupStatusDisplay() {
    // Use unified auto-refresh with 10-second interval for monitoring config
    const refreshFunction = () => {
        // Refresh monitoring data through the global monitoring manager
        if (window.app?.monitoringData) {
            window.app.monitoringData.refreshData();
        }
    };
    
    monitoringDisplay.setupAutoRefresh(refreshFunction, {
        refreshInterval: 10000
    });
}

// Redundant status update functions removed - now using unified monitoring-grid display

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
    updateThresholdIndicator(type, level);
    
    // Save threshold to configuration (could be enhanced to auto-save)
    saveThresholdValue(type, level, value);
}

function updateThresholdIndicator(type, level) {
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
