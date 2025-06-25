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
                verify: 'pmset -g | grep autorestart',
                required: true
            },
            restartFreeze: {
                name: "Restart on Freeze", 
                description: "Restart automatically if computer freezes",
                command: 'sudo systemsetup -setrestartfreeze on',
                verify: 'sudo systemsetup -getrestartfreeze',
                required: true
            },
            desktopBackground: {
                name: "Desktop Background",
                description: "Set desktop background to solid black",
                command: 'osascript -e "tell application \\"System Events\\" to tell every desktop to set picture to \\"/System/Library/Desktop Pictures/Solid Colors/Black.png\\""',
                verify: 'defaults read com.apple.desktop Background',
                required: true
            },
            softwareUpdate: {
                name: "Software Updates",
                description: "Disable automatic software updates",
                command: 'sudo softwareupdate --schedule off',
                verify: 'sudo softwareupdate --schedule',
                required: true
            },
            // Optional settings
            fileSharing: {
                name: "File Sharing",
                description: "Enable file sharing for remote access",
                command: 'sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.smbd.plist',
                verify: 'sudo launchctl list | grep smbd',
                required: false
            },
            screenSharing: {
                name: "Screen Sharing", 
                description: "Enable screen sharing for remote access",
                command: 'sudo launchctl load -w /System/Library/LaunchDaemons/com.apple.screensharing.plist',
                verify: 'sudo launchctl list | grep screensharing',
                required: false
            },
            bluetoothSetup: {
                name: "Bluetooth Setup Assistant",
                description: "Disable Bluetooth setup assistant popup",
                command: 'defaults write com.apple.BluetoothSetupAssistant DontShowSetupAssistant -bool true',
                verify: 'defaults read com.apple.BluetoothSetupAssistant DontShowSetupAssistant',
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
                verify: 'defaults read NSGlobalDomain NSAppSleepDisabled',
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
            const { stdout, stderr } = await execAsync(setting.verify);
            
            return {
                setting: settingId,
                name: setting.name,
                verified: true,
                output: stdout.trim(),
                error: stderr || null
            };
        } catch (error) {
            return {
                setting: settingId,
                name: setting.name,
                verified: false,
                output: null,
                error: error.message
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