/**
 * macOS System Manager
 * Platform-specific system configuration management for macOS
 */

const { exec } = require('child_process');
const util = require('util');
const os = require('os');
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
                name: "Auto Restart",
                description: "Restart automatically after power failure",
                command: 'sudo pmset -c autorestart 1',
                revert: 'sudo pmset -c autorestart 0',
                verify: 'pmset -g | grep autorestart',
                required: true,
                category: 'power'
            },
            restartFreeze: {
                name: "Restart on Freeze",
                description: "Restart automatically if system freezes",
                command: 'sudo systemsetup -setrestartfreeze on',
                revert: 'sudo systemsetup -setrestartfreeze off',
                verify: 'systemsetup -getrestartfreeze',
                required: false,
                category: 'power'
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
            disableGatekeeper: {
                name: "Disable Gatekeeper",
                description: "Allow apps from unidentified developers",
                command: 'sudo spctl --master-disable',
                revert: 'sudo spctl --master-enable',
                verify: 'spctl --status',
                required: false,
                category: 'security'
            },
            allowAppsAnywhere: {
                name: "Allow Apps from Anywhere",
                description: "Allow apps from anywhere (Gatekeeper bypass)",
                command: 'sudo spctl --master-disable',
                revert: 'sudo spctl --master-enable',
                verify: 'spctl --status',
                required: false,
                category: 'security'
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
                const { stdout, stderr } = await execAsync(setting.command);
                results.push({
                    setting: key,
                    name: setting.name,
                    success: true,
                    output: stdout,
                    stderr: stderr || null
                });
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
                const { stdout, stderr } = await execAsync(setting.revert);
                results.push({
                    setting: key,
                    name: setting.name,
                    success: true,
                    output: stdout,
                    stderr: stderr || null
                });
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
                return { applied: output.includes('autorestart          1') };
            
            case 'restartFreeze':
                return { applied: output.includes('on') };
            
            case 'hideMenuBar':
                return { applied: output.trim() === '1' };
            
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
}

module.exports = MacOSSystemManager;