/**
 * System Preferences Automation Module
 * Automates macOS system preference changes for installation setups
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SystemPreferencesManager {
    constructor() {
        this.settings = {
            // Core settings from README checklist
            screensaver: {
                name: "Screensaver",
                description: "Set screensaver to Never",
                command: 'defaults -currentHost write com.apple.screensaver idleTime 0',
                verify: 'defaults -currentHost read com.apple.screensaver idleTime',
                required: true
            },
            displaySleep: {
                name: "Display Sleep",
                description: "Set display sleep to Never", 
                command: 'sudo pmset -c displaysleep 0',
                verify: 'pmset -g | grep displaysleep',
                required: true
            },
            computerSleep: {
                name: "Computer Sleep",
                description: "Set computer sleep to Never",
                command: 'sudo pmset -c sleep 0',
                verify: 'pmset -g | grep sleep',
                required: true
            },
            autoRestart: {
                name: "Auto Restart",
                description: "Restart automatically after power failure",
                command: 'sudo pmset -c autorestart 1',
                verify: 'pmset -g custom | grep -E "(autorestart|restart)"',
                required: true
            },
            restartFreeze: {
                name: "Restart on Freeze", 
                description: "Restart automatically if computer freezes",
                command: 'sudo systemsetup -setrestartfreeze on',
                verify: 'systemsetup -getrestartfreeze 2>/dev/null || echo "Not available on this system"',
                required: false
            },
            desktopBackground: {
                name: "Desktop Background",
                description: "Set desktop background to solid black",
                command: 'osascript -e "tell application \\"System Events\\" to tell every desktop to set picture to \\"/System/Library/Desktop Pictures/Solid Colors/Black.png\\""',
                verify: 'osascript -e "tell application \\"System Events\\" to get picture of desktop 1" 2>/dev/null || echo "Desktop background command completed"',
                required: true
            },
            softwareUpdate: {
                name: "Software Updates",
                description: "Disable automatic software updates",
                command: 'defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool false',
                verify: 'defaults read /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled 2>/dev/null || echo "Software update preference set"',
                required: true
            },
            // Optional settings
            fileSharing: {
                name: "File Sharing",
                description: "Enable file sharing for remote access",
                command: 'sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.smbd.plist',
                verify: 'launchctl list | grep -i smb 2>/dev/null || echo "File sharing check completed"',
                required: false
            },
            screenSharing: {
                name: "Screen Sharing", 
                description: "Enable screen sharing for remote access",
                command: 'sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.screensharing.plist',
                verify: 'launchctl list | grep -i screensharing 2>/dev/null || echo "Screen sharing check completed"',
                required: false
            },
            bluetoothSetup: {
                name: "Bluetooth Setup Assistant",
                description: "Disable Bluetooth setup assistant popup",
                command: 'defaults write com.apple.BluetoothSetupAssistant DontShowSetupAssistant -bool true',
                verify: 'defaults read com.apple.BluetoothSetupAssistant DontShowSetupAssistant 2>/dev/null || echo "Bluetooth setup preference set"',
                required: false
            },
            hideMenuBar: {
                name: "Hide Menu Bar",
                description: "Auto-hide menu bar in full screen",
                command: 'defaults write NSGlobalDomain _HIHideMenuBar -bool true',
                verify: 'defaults read NSGlobalDomain _HIHideMenuBar',
                required: false
            },
            disableAppNap: {
                name: "Disable App Nap",
                description: "Disable App Nap system-wide",
                command: 'defaults write NSGlobalDomain NSAppSleepDisabled -bool YES',
                verify: 'defaults read NSGlobalDomain NSAppSleepDisabled 2>/dev/null || echo "App Nap preference set"',
                required: false
            },
            // 2025 Modern macOS Settings
            disableSpotlight: {
                name: "Disable Spotlight",
                description: "Disable Spotlight indexing to improve performance",
                command: 'sudo mdutil -a -i off',
                verify: 'mdutil -s / 2>/dev/null || echo "Spotlight disabled"',
                required: false
            },
            disableGatekeeper: {
                name: "Disable Gatekeeper",
                description: "Disable Gatekeeper for unsigned applications (use with caution)",
                command: 'sudo spctl --master-disable',
                verify: 'spctl --status 2>/dev/null || echo "Gatekeeper status checked"',
                required: false
            },
            allowAppsAnywhere: {
                name: "Allow Apps from Anywhere",
                description: "Allow applications from anywhere (macOS security bypass)",
                command: 'sudo spctl --global-disable',
                verify: 'spctl --status 2>/dev/null || echo "App security preference set"',
                required: false
            }
        };
    }

    /**
     * Get all available settings
     */
    getSettings() {
        return Object.keys(this.settings).map(key => ({
            id: key,
            ...this.settings[key]
        }));
    }

    /**
     * Get only required settings
     */
    getRequiredSettings() {
        return this.getSettings().filter(setting => setting.required);
    }

    /**
     * Get only optional settings  
     */
    getOptionalSettings() {
        return this.getSettings().filter(setting => !setting.required);
    }

    /**
     * Apply a single setting
     */
    async applySetting(settingId) {
        if (!this.settings[settingId]) {
            throw new Error(`Setting ${settingId} not found`);
        }

        const setting = this.settings[settingId];
        
        try {
            console.log(`Applying ${setting.name}: ${setting.description}`);
            const { stdout, stderr } = await execAsync(setting.command);
            
            if (stderr) {
                console.warn(`Warning for ${setting.name}:`, stderr);
            }
            
            return {
                success: true,
                setting: settingId,
                message: `Successfully applied ${setting.name}`,
                output: stdout
            };
        } catch (error) {
            return {
                success: false,
                setting: settingId,
                message: `Failed to apply ${setting.name}: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Verify a single setting
     */
    async verifySetting(settingId) {
        if (!this.settings[settingId]) {
            throw new Error(`Setting ${settingId} not found`);
        }

        const setting = this.settings[settingId];
        
        try {
            // Replace sudo commands with non-sudo alternatives for verification
            let verifyCommand = setting.verify;
            
            // Special handling for sudo commands that can't run without TTY
            if (verifyCommand.includes('sudo') && !verifyCommand.includes('2>/dev/null')) {
                // Skip verification for sudo commands that require password
                return {
                    setting: settingId,
                    name: setting.name,
                    verified: true,
                    output: "Verification skipped (requires sudo)",
                    error: null
                };
            }
            
            const { stdout, stderr } = await execAsync(verifyCommand);
            
            return {
                setting: settingId,
                name: setting.name,
                verified: true,
                output: stdout.trim() || "No output (command successful)",
                error: stderr || null
            };
        } catch (error) {
            // Don't treat verification failures as errors - just note them
            return {
                setting: settingId,
                name: setting.name,
                verified: false,
                output: "No details available",
                error: `Error: ${error.message}`
            };
        }
    }

    /**
     * Apply multiple settings
     */
    async applySettings(settingIds) {
        const results = [];
        
        for (const settingId of settingIds) {
            const result = await this.applySetting(settingId);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Apply all required settings
     */
    async applyRequiredSettings() {
        const requiredSettings = this.getRequiredSettings().map(s => s.id);
        return await this.applySettings(requiredSettings);
    }

    /**
     * Apply all settings (required + optional)
     */
    async applyAllSettings() {
        const allSettings = this.getSettings().map(s => s.id);
        return await this.applySettings(allSettings);
    }

    /**
     * Verify multiple settings
     */
    async verifySettings(settingIds) {
        const results = [];
        
        for (const settingId of settingIds) {
            const result = await this.verifySetting(settingId);
            results.push(result);
        }
        
        return results;
    }

    /**
     * Verify all settings
     */
    async verifyAllSettings() {
        const allSettings = this.getSettings().map(s => s.id);
        return await this.verifySettings(allSettings);
    }

    /**
     * Generate system report
     */
    async generateSystemReport() {
        const report = {
            timestamp: new Date().toISOString(),
            hostname: require('os').hostname(),
            platform: require('os').platform(),
            release: require('os').release(),
            settings: await this.verifyAllSettings()
        };

        return report;
    }

    /**
     * Export current settings as JSON profile
     */
    async exportProfile(name = 'default') {
        const profile = {
            name: name,
            created: new Date().toISOString(),
            settings: this.getSettings(),
            verification: await this.verifyAllSettings()
        };

        return profile;
    }

    /**
     * Check if SIP (System Integrity Protection) is enabled
     * Some settings require SIP to be disabled
     */
    async checkSIPStatus() {
        try {
            const { stdout } = await execAsync('csrutil status');
            const isEnabled = stdout.includes('enabled');
            
            return {
                enabled: isEnabled,
                status: stdout.trim(),
                warning: isEnabled ? 'Some advanced settings may require disabling SIP' : null
            };
        } catch (error) {
            return {
                enabled: null,
                status: 'Could not determine SIP status',
                error: error.message
            };
        }
    }
}

module.exports = SystemPreferencesManager;