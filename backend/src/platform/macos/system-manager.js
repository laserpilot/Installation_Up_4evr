/**
 * macOS System Manager
 * Platform-specific system configuration management for macOS
 */

const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const sudo = require('@expo/sudo-prompt');
const { SystemManagerInterface } = require('../../core/interfaces');

// Create execAsync with safe working directory
const execAsync = (command, options = {}) => {
    const safeOptions = {
        cwd: os.homedir(),
        ...options
    };
    return util.promisify(exec)(command, safeOptions);
};

class MacOSSystemManager extends SystemManagerInterface {
    constructor() {
        super();
        this.platform = 'macos';
        this.settings = this.initializeSettings();
    }

    initializeSettings() {
        return {
            screensaver: {
                name: "Screensaver",
                description: "Set screensaver to Never",
                command: 'defaults -currentHost write com.apple.screensaver idleTime 0',
                revert: 'defaults -currentHost write com.apple.screensaver idleTime 600',
                verify: 'defaults -currentHost read com.apple.screensaver idleTime',
                required: true,
                category: 'power'
            },
            displaySleep: {
                name: "Display Sleep",
                description: "Set display sleep to Never", 
                command: 'sudo pmset -c displaysleep 0',
                revert: 'sudo pmset -c displaysleep 10',
                verify: 'pmset -g | grep displaysleep',
                required: true,
                category: 'power'
            },
            computerSleep: {
                name: "Computer Sleep",
                description: "Set computer sleep to Never",
                command: 'sudo pmset -c sleep 0',
                revert: 'sudo pmset -c sleep 30',
                verify: 'pmset -g | grep sleep',
                required: true,
                category: 'power'
            },
            autoRestart: {
                name: "Auto Restart on Freeze",
                description: "Restart automatically if system freezes (recommended for installations)",
                command: 'sudo systemsetup -setrestartfreeze on',
                revert: 'sudo systemsetup -setrestartfreeze off',
                verify: 'systemsetup -getrestartfreeze',
                required: false,
                category: 'power'
            },
            powerFailureRestart: {
                name: "Restart after Power Failure",
                description: "Restart automatically after power failure (optional)",
                command: 'sudo pmset -c autorestart 1',
                revert: 'sudo pmset -c autorestart 0',
                verify: 'pmset -g | grep autorestart',
                required: false,
                category: 'power'
            },
            doNotDisturb: {
                name: "Enable Do Not Disturb",
                description: "Enable Do Not Disturb from midnight to midnight (prevents notification interruptions)",
                command: 'plutil -replace dndStart -integer 0 ~/Library/Preferences/com.apple.ncprefs.plist && plutil -replace dndEnd -integer 1440 ~/Library/Preferences/com.apple.ncprefs.plist && defaults write com.apple.ncprefs doNotDisturb -bool true',
                revert: 'defaults delete com.apple.ncprefs doNotDisturb 2>/dev/null || true',
                verify: 'defaults read com.apple.ncprefs doNotDisturb 2>/dev/null || echo "0"',
                required: false,
                category: 'ui'
            },
            hideMenuBar: {
                name: "Hide Menu Bar",
                description: "Auto-hide menu bar in full screen",
                command: 'defaults write NSGlobalDomain _HIHideMenuBar -bool true',
                revert: 'defaults write NSGlobalDomain _HIHideMenuBar -bool false',
                verify: 'defaults read NSGlobalDomain _HIHideMenuBar',
                required: false,
                category: 'ui'
            },
            hideDesktopIcons: {
                name: "Hide Desktop Icons",
                description: "Hide desktop icons for cleaner installation appearance",
                command: 'defaults write com.apple.finder CreateDesktop -bool false && killall Finder',
                revert: 'defaults write com.apple.finder CreateDesktop -bool true && killall Finder',
                verify: 'defaults read com.apple.finder CreateDesktop 2>/dev/null || echo "1"',
                required: false,
                category: 'ui'
            },
            autohideDock: {
                name: "Auto-hide Dock",
                description: "Automatically show and hide Dock (recommended for installations)",
                command: 'defaults write com.apple.dock autohide -bool true && killall Dock',
                revert: 'defaults write com.apple.dock autohide -bool false && killall Dock',
                verify: 'defaults read com.apple.dock autohide 2>/dev/null || echo "0"',
                required: false,
                category: 'ui'
            },
            disableBluetoothSetup: {
                name: "Disable Bluetooth Setup Assistant",
                description: "Prevent Bluetooth Setup Assistant from appearing",
                command: 'sudo defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice -bool false && sudo defaults write /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekKeyboard -bool false',
                revert: 'sudo defaults delete /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice 2>/dev/null || true && sudo defaults delete /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekKeyboard 2>/dev/null || true',
                verify: 'defaults read /Library/Preferences/com.apple.Bluetooth BluetoothAutoSeekPointingDevice 2>/dev/null || echo "1"',
                required: false,
                category: 'system'
            },
            disableAppNap: {
                name: "Disable App Nap",
                description: "Prevent macOS from putting apps to sleep",
                command: 'defaults write NSGlobalDomain NSAppSleepDisabled -bool YES',
                revert: 'defaults write NSGlobalDomain NSAppSleepDisabled -bool NO',
                verify: 'defaults read NSGlobalDomain NSAppSleepDisabled',
                required: false,
                category: 'performance'
            },
            disableSpotlight: {
                name: "Disable Spotlight",
                description: "Disable Spotlight indexing",
                command: 'sudo mdutil -a -i off',
                revert: 'sudo mdutil -a -i on',
                verify: 'mdutil -s /',
                required: false,
                category: 'performance'
            },
            doNotDisturb: {
                name: "Enable Do Not Disturb",
                description: "Prevent notifications from appearing over applications",
                command: 'defaults -currentHost write ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb -boolean true',
                revert: 'defaults -currentHost write ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb -boolean false',
                verify: 'defaults -currentHost read ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb 2>/dev/null || echo "false"',
                required: false,
                category: 'ui'
            },
            hideDesktopIcons: {
                name: "Hide Desktop Icons",
                description: "Hide all desktop icons for a cleaner failure state",
                command: 'defaults write com.apple.finder CreateDesktop -bool false; killall Finder',
                revert: 'defaults write com.apple.finder CreateDesktop -bool true; killall Finder',
                verify: 'defaults read com.apple.finder CreateDesktop',
                required: false,
                category: 'ui'
            },
            disableStageManager: {
                name: "Disable Stage Manager",
                description: "Disable Stage Manager (macOS Ventura+) to prevent windowing interference",
                command: 'defaults write com.apple.WindowManager GloballyEnabled -bool false; killall Dock',
                revert: 'defaults write com.apple.WindowManager GloballyEnabled -bool true; killall Dock',
                verify: 'defaults read com.apple.WindowManager GloballyEnabled 2>/dev/null || echo "false"',
                required: false,
                category: 'ui'
            },
            disableNetworkPrompts: {
                name: "Disable WiFi Network Prompts",
                description: "Prevent 'Ask to join new networks' prompts",
                command: 'sudo defaults write /Library/Preferences/SystemConfiguration/com.apple.airport JoinMode -string "Automatic"',
                revert: 'sudo defaults write /Library/Preferences/SystemConfiguration/com.apple.airport JoinMode -string "Prompt"',
                verify: 'defaults read /Library/Preferences/SystemConfiguration/com.apple.airport JoinMode 2>/dev/null || echo "Prompt"',
                required: false,
                category: 'network'
            },
            disableGatekeeper: {
                name: "Disable Gatekeeper",
                description: "⚠️ SECURITY RISK: Allow apps from unidentified developers",
                command: 'sudo spctl --master-disable',
                revert: 'sudo spctl --master-enable',
                verify: 'spctl --status',
                required: false,
                category: 'danger'
            },
            allowAppsAnywhere: {
                name: "Allow Apps from Anywhere",
                description: "⚠️ SECURITY RISK: Allow apps from anywhere (Gatekeeper bypass)",
                command: 'sudo spctl --master-disable',
                revert: 'sudo spctl --master-enable',
                verify: 'spctl --status',
                required: false,
                category: 'danger'
            },
            disableCrashReporter: {
                name: "Disable Application Crash Reporter",
                description: "⚠️ DANGER: Prevent 'Application Unexpectedly Quit' dialogs (requires SIP disabled)",
                command: 'sudo chmod 000 "/System/Library/CoreServices/Problem Reporter.app"',
                revert: 'sudo chmod 755 "/System/Library/CoreServices/Problem Reporter.app"',
                verify: 'ls -la "/System/Library/CoreServices/Problem Reporter.app" | awk \'{print $1}\'',
                required: false,
                category: 'danger'
            }
        };
    }

    async getSystemInfo() {
        try {
            const { stdout: systemVersion } = await execAsync('sw_vers -productVersion');
            const { stdout: buildVersion } = await execAsync('sw_vers -buildVersion');
            const { stdout: computerName } = await execAsync('scutil --get ComputerName');
            const { stdout: hostName } = await execAsync('hostname');

            return {
                platform: 'macOS',
                version: systemVersion.trim(),
                build: buildVersion.trim(),
                computerName: computerName.trim(),
                hostName: hostName.trim(),
                arch: process.arch,
                uptime: process.uptime()
            };
        } catch (error) {
            console.error('Failed to get system info:', error);
            return {
                platform: 'macOS',
                version: 'Unknown',
                build: 'Unknown',
                computerName: 'Unknown',
                hostName: os.hostname(),
                arch: process.arch,
                uptime: process.uptime()
            };
        }
    }

    async applySettings(settingKeys) {
        const results = [];

        for (const key of settingKeys) {
            const setting = this.settings[key];
            if (!setting) {
                results.push({
                    setting: key,
                    success: false,
                    error: 'Setting not found'
                });
                continue;
            }

            try {
                // Check if command requires sudo
                if (setting.command.startsWith('sudo ')) {
                    // Use command-specific sudo with native macOS dialog
                    const commandWithoutSudo = setting.command.replace(/^sudo /, '');
                    const result = await this.executeSudoCommand(commandWithoutSudo, setting.name);
                    
                    results.push({
                        setting: key,
                        name: setting.name,
                        success: result.success,
                        output: result.stdout || '',
                        stderr: result.stderr || null
                    });
                } else {
                    // Execute regular command without sudo
                    const { stdout, stderr } = await execAsync(setting.command);
                    results.push({
                        setting: key,
                        name: setting.name,
                        success: true,
                        output: stdout,
                        stderr: stderr || null
                    });
                }
            } catch (error) {
                results.push({
                    setting: key,
                    name: setting.name,
                    success: false,
                    error: error.message,
                    stderr: error.stderr || null
                });
            }
        }

        return {
            success: results.every(r => r.success),
            results,
            timestamp: new Date().toISOString()
        };
    }

    async verifySettings(settingKeys = null) {
        const keysToCheck = settingKeys || Object.keys(this.settings);
        const results = [];

        for (const key of keysToCheck) {
            const setting = this.settings[key];
            if (!setting) {
                results.push({
                    setting: key,
                    status: 'unknown',
                    error: 'Setting not found'
                });
                continue;
            }

            try {
                const { stdout } = await execAsync(setting.verify);
                const status = this.evaluateSettingStatus(key, stdout);
                
                results.push({
                    setting: key,
                    name: setting.name,
                    status: status.applied ? 'applied' : 'not_applied',
                    statusIcon: status.applied ? '🟢' : '🟡',
                    statusText: status.applied ? 'Applied' : 'Needs to be applied',
                    output: stdout.trim(),
                    error: null
                });
            } catch (error) {
                results.push({
                    setting: key,
                    name: setting.name,
                    status: 'error',
                    statusIcon: '🔴',
                    statusText: 'Error checking status',
                    output: error.stdout || '',
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Execute sudo command with native macOS authentication dialog
     */
    async executeSudoCommand(command, settingName) {
        return new Promise((resolve) => {
            const options = {
                name: 'Installation Up 4evr'
                // Don't include icns property to use default
            };

            console.log(`[SUDO] Executing with native dialog: ${command}`);
            console.log(`[SUDO] For setting: ${settingName}`);

            sudo.exec(command, options, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[SUDO] Error executing ${command}:`, error.message);
                    resolve({
                        success: false,
                        error: error.message,
                        stdout: null,
                        stderr: stderr
                    });
                } else {
                    console.log(`[SUDO] Successfully executed: ${command}`);
                    resolve({
                        success: true,
                        error: null,
                        stdout: stdout,
                        stderr: stderr
                    });
                }
            });
        });
    }

    async revertSettings(settingKeys) {
        const results = [];

        for (const key of settingKeys) {
            const setting = this.settings[key];
            if (!setting) {
                results.push({
                    setting: key,
                    success: false,
                    error: 'Setting not found'
                });
                continue;
            }

            try {
                // Check if revert command requires sudo
                if (setting.revert.startsWith('sudo ')) {
                    // Use command-specific sudo with native macOS dialog
                    const commandWithoutSudo = setting.revert.replace(/^sudo /, '');
                    const result = await this.executeSudoCommand(commandWithoutSudo, `Revert ${setting.name}`);
                    
                    results.push({
                        setting: key,
                        name: setting.name,
                        success: result.success,
                        output: result.stdout || '',
                        stderr: result.stderr || null
                    });
                } else {
                    // Execute regular revert command without sudo
                    const { stdout, stderr } = await execAsync(setting.revert);
                    results.push({
                        setting: key,
                        name: setting.name,
                        success: true,
                        output: stdout,
                        stderr: stderr || null
                    });
                }
            } catch (error) {
                results.push({
                    setting: key,
                    name: setting.name,
                    success: false,
                    error: error.message,
                    stderr: error.stderr || null
                });
            }
        }

        return {
            success: results.every(r => r.success),
            results,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate executable shell script for browser users
     */
    generateTerminalScript(settingKeys, options = {}) {
        const { includeVerification = true, mode = 'apply' } = options;
        
        if (settingKeys.length === 0) {
            return {
                success: false,
                error: 'No settings provided'
            };
        }

        const timestamp = new Date().toISOString();
        const validSettings = settingKeys.filter(key => this.settings[key]);
        
        if (validSettings.length === 0) {
            return {
                success: false,
                error: 'No valid settings found'
            };
        }

        // Group settings by category for better organization
        const categories = {
            power: [],
            ui: [],
            performance: [],
            security: []
        };

        validSettings.forEach(key => {
            const setting = this.settings[key];
            const category = setting.category || 'other';
            if (categories[category]) {
                categories[category].push({ key, setting });
            }
        });

        // Generate script content
        let script = `#!/bin/bash
# Installation Up 4evr - System Configuration Script
# Generated: ${timestamp}
# Mode: ${mode}
# 
# This script contains macOS system configuration commands.
# Review each command before execution.
# Some commands require administrator privileges.

set -e  # Exit on any error

echo "🚀 Installation Up 4evr - System Configuration"
echo "Generated: ${timestamp}"
echo "Settings to ${mode}: ${validSettings.length}"
echo "====================================="
echo
`;

        // Add commands by category
        Object.entries(categories).forEach(([categoryName, settings]) => {
            if (settings.length === 0) return;
            
            const categoryTitle = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
            script += `
# ${categoryTitle} Settings
echo "Applying ${categoryTitle.toLowerCase()} settings..."
`;
            
            settings.forEach(({ key, setting }) => {
                const command = mode === 'revert' ? setting.revert : setting.command;
                script += `echo "  → ${setting.name}"
${command}
`;
            });
        });

        // Add verification section if requested
        if (includeVerification) {
            script += `
# Verification
echo
echo "🔍 Verifying changes..."
`;
            
            validSettings.forEach(key => {
                const setting = this.settings[key];
                script += `echo "Checking ${setting.name}:"
${setting.verify}
echo
`;
            });
        }

        script += `
echo "✅ Script execution completed!"
echo "Review the output above for any errors."
`;

        return {
            success: true,
            script: script,
            settingsCount: validSettings.length,
            categories: Object.keys(categories).filter(cat => categories[cat].length > 0),
            timestamp: timestamp,
            mode: mode
        };
    }

    evaluateSettingStatus(settingKey, output) {
        const setting = this.settings[settingKey];
        if (!setting) return { applied: false, reason: 'Setting not found' };

        // Setting-specific evaluation logic
        switch (settingKey) {
            case 'screensaver':
                return { applied: output.trim() === '0' };
            
            case 'displaySleep':
                return { applied: output.includes('displaysleep         0') };
            
            case 'computerSleep':
                return { applied: output.includes('sleep                0') };
            
            case 'autoRestart':
                return { applied: output.includes('on') };
            
            case 'powerFailureRestart':
                return { applied: output.includes('autorestart          1') };
            
            case 'doNotDisturb':
                return { applied: output.trim() === '1' };
            
            case 'hideMenuBar':
                return { applied: output.trim() === '1' };
            
            case 'hideDesktopIcons':
                return { applied: output.trim() === '0' };
            
            case 'autohideDock':
                return { applied: output.trim() === '1' };
            
            case 'disableBluetoothSetup':
                return { applied: output.trim() === '0' };
            
            case 'disableAppNap':
                return { applied: output.trim() === '1' };
            
            case 'disableSpotlight':
                return { applied: output.includes('Indexing disabled') };
            
            case 'disableGatekeeper':
            case 'allowAppsAnywhere':
                return { applied: output.includes('disabled') };
            
            default:
                // Generic check - if command succeeded, consider it applied
                return { applied: true };
        }
    }

    getSettings() {
        return this.settings;
    }

    getRequiredSettings() {
        return Object.entries(this.settings)
            .filter(([key, setting]) => setting.required)
            .reduce((acc, [key, setting]) => {
                acc[key] = setting;
                return acc;
            }, {});
    }

    getOptionalSettings() {
        return Object.entries(this.settings)
            .filter(([key, setting]) => !setting.required)
            .reduce((acc, [key, setting]) => {
                acc[key] = setting;
                return acc;
            }, {});
    }

    getSettingsByCategory(category) {
        return Object.entries(this.settings)
            .filter(([key, setting]) => setting.category === category)
            .reduce((acc, [key, setting]) => {
                acc[key] = setting;
                return acc;
            }, {});
    }

    async checkSIPStatus() {
        try {
            const { stdout } = await execAsync('csrutil status');
            const isDisabled = stdout.includes('disabled');
            
            return {
                enabled: !isDisabled,
                status: isDisabled ? 'disabled' : 'enabled',
                message: stdout.trim(),
                recommendation: isDisabled ? 
                    'SIP is disabled - system modifications are allowed' :
                    'SIP is enabled - some system modifications may require disabling SIP'
            };
        } catch (error) {
            return {
                enabled: null,
                status: 'unknown',
                message: 'Unable to check SIP status',
                error: error.message
            };
        }
    }

    // Additional helper methods for compatibility
    async checkAllSettingsStatus() {
        return this.verifySettings();
    }

    async applyRequiredSettings() {
        const requiredKeys = Object.keys(this.getRequiredSettings());
        return this.applySettings(requiredKeys);
    }

    /**
     * Generate terminal commands for manual execution
     * @returns {Object} Commands string for manual execution
     */
    async generateCommands() {
        const commands = [];
        commands.push('#!/bin/bash');
        commands.push('# Installation Up 4evr - System Preferences Configuration');
        commands.push('# Generated on: ' + new Date().toISOString());
        commands.push('');
        commands.push('echo "Installing Up 4evr - System Preferences Configuration"');
        commands.push('echo "==========================================="');
        commands.push('');

        // Add all settings commands
        for (const [key, setting] of Object.entries(this.settings)) {
            commands.push(`echo "Configuring ${setting.name}..."`);
            commands.push(setting.command);
            commands.push('');
        }

        commands.push('echo "Configuration complete!"');
        commands.push('echo "You may need to restart for all changes to take effect."');

        return {
            success: true,
            data: {
                commands: commands.join('\n'),
                count: Object.keys(this.settings).length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Generate restore script to revert all settings
     * @returns {Object} Restore commands string
     */
    async generateRestore() {
        const commands = [];
        commands.push('#!/bin/bash');
        commands.push('# Installation Up 4evr - System Preferences Restore Script');
        commands.push('# Generated on: ' + new Date().toISOString());
        commands.push('');
        commands.push('echo "⚠️  WARNING: This will restore all system settings to defaults"');
        commands.push('echo "Press Ctrl+C to cancel or Enter to continue..."');
        commands.push('read -p "Continue? (y/N) " -n 1 -r');
        commands.push('echo');
        commands.push('if [[ ! $REPLY =~ ^[Yy]$ ]]; then');
        commands.push('    echo "Restore cancelled."');
        commands.push('    exit 0');
        commands.push('fi');
        commands.push('');
        commands.push('echo "Restoring Installation Up 4evr System Settings..."');
        commands.push('echo "==============================================="');
        commands.push('');

        // Add revert commands for all settings
        for (const [key, setting] of Object.entries(this.settings)) {
            if (setting.revert) {
                commands.push(`echo "Restoring ${setting.name}..."`);
                commands.push(setting.revert);
                commands.push('');
            }
        }

        commands.push('echo "Restore complete!"');
        commands.push('echo "You may need to restart for all changes to take effect."');

        return {
            success: true,
            data: {
                commands: commands.join('\n'),
                count: Object.keys(this.settings).filter(s => this.settings[s].revert).length,
                timestamp: new Date().toISOString()
            }
        };
    }
}

module.exports = MacOSSystemManager;