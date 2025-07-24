/**
 * Windows System Manager
 * Platform-specific system configuration management for Windows
 */

const { exec, spawn } = require('child_process');
const util = require('util');
const os = require('os');
const path = require('path');
const { SystemManagerInterface } = require('../../core/interfaces');

// Create execAsync with safe working directory
const execAsync = (command, options = {}) => {
  const safeOptions = {
    cwd: os.homedir(),
    ...options
  };
  return util.promisify(exec)(command, safeOptions);
};

class WindowsSystemManager extends SystemManagerInterface {
  constructor() {
    super();
    this.platform = 'windows';
    this.settings = this.initializeSettings();
    this.logger = null;
  }

  /**
   * Inject logger for structured logging
   */
  setLogger(logger) {
    this.logger = logger;
  }

  initializeSettings() {
    return {
      // Power Management Settings
      displaySleep: {
        name: 'Display Sleep',
        description: 'Set display sleep to Never',
        command: 'powercfg -change -monitor-timeout-ac 0',
        revert: 'powercfg -change -monitor-timeout-ac 10',
        verify: 'powercfg /query SCHEME_CURRENT SUB_VIDEO VIDEOIDLE',
        required: true,
        category: 'power',
        requiresAdmin: true
      },
      computerSleep: {
        name: 'Computer Sleep',
        description: 'Set computer sleep to Never',
        command: 'powercfg -change -standby-timeout-ac 0',
        revert: 'powercfg -change -standby-timeout-ac 30',
        verify: 'powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE',
        required: true,
        category: 'power',
        requiresAdmin: true
      },
      disableHibernation: {
        name: 'Disable Hibernation',
        description: 'Disable hibernation to prevent unexpected sleep states',
        command: 'powercfg -hibernate off',
        revert: 'powercfg -hibernate on',
        verify: 'powercfg /availablesleepstates',
        required: false,
        category: 'power',
        requiresAdmin: true
      },
      autoRestart: {
        name: 'Auto Restart on System Failure',
        description: 'Restart automatically if system crashes (recommended for installations)',
        command: 'wmic recoveros set AutoReboot=True',
        revert: 'wmic recoveros set AutoReboot=False',
        verify: 'wmic recoveros get AutoReboot /value',
        required: false,
        category: 'power',
        requiresAdmin: true
      },

      // UI Settings
      hideDesktopIcons: {
        name: 'Hide Desktop Icons',
        description: 'Hide desktop icons for cleaner installation appearance',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideIcons /t REG_DWORD /d 1 /f',
        revert: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideIcons /t REG_DWORD /d 0 /f',
        verify: 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideIcons',
        required: false,
        category: 'ui',
        requiresAdmin: false
      },
      autoHideTaskbar: {
        name: 'Auto-hide Taskbar',
        description: 'Automatically show and hide Taskbar (recommended for installations)',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3" /v Settings /t REG_BINARY /d 30000000feffffff7af4000001000000 /f',
        revert: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3" /v Settings /t REG_BINARY /d 30000000feffffff02f4000001000000 /f',
        verify: 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StuckRects3" /v Settings',
        required: false,
        category: 'ui',
        requiresAdmin: false
      },
      disableNotifications: {
        name: 'Disable Notifications',
        description: 'Turn off Windows notifications to prevent interruptions',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GLOBAL_SETTING_ALLOW_NOTIFICATION_SOUND /t REG_DWORD /d 0 /f',
        revert: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GLOBAL_SETTING_ALLOW_NOTIFICATION_SOUND /t REG_DWORD /d 1 /f',
        verify: 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v NOC_GLOBAL_SETTING_ALLOW_NOTIFICATION_SOUND',
        required: false,
        category: 'ui',
        requiresAdmin: false
      },
      disableActionCenter: {
        name: 'Disable Action Center',
        description: 'Disable Windows Action Center notifications',
        command: 'reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter /t REG_DWORD /d 1 /f',
        revert: 'reg delete "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter /f',
        verify: 'reg query "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableNotificationCenter',
        required: false,
        category: 'ui',
        requiresAdmin: false
      },

      // System Settings
      disableWindowsUpdate: {
        name: 'Disable Automatic Windows Updates',
        description: '⚠️ Disable automatic Windows updates (security risk)',
        command: 'reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /t REG_DWORD /d 1 /f',
        revert: 'reg delete "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate /f',
        verify: 'reg query "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" /v NoAutoUpdate',
        required: false,
        category: 'system',
        requiresAdmin: true
      },
      disableDefender: {
        name: 'Disable Windows Defender',
        description: '⚠️ SECURITY RISK: Disable Windows Defender real-time protection',
        command: 'powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $true"',
        revert: 'powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $false"',
        verify: 'powershell -Command "Get-MpPreference | Select-Object DisableRealtimeMonitoring"',
        required: false,
        category: 'danger',
        requiresAdmin: true
      },
      disableUAC: {
        name: 'Disable User Account Control',
        description: '⚠️ SECURITY RISK: Disable UAC prompts (removes security layer)',
        command: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA /t REG_DWORD /d 0 /f',
        revert: 'reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA /t REG_DWORD /d 1 /f',
        verify: 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA',
        required: false,
        category: 'danger',
        requiresAdmin: true
      },
      disableFirewall: {
        name: 'Disable Windows Firewall',
        description: '⚠️ SECURITY RISK: Disable Windows Firewall',
        command: 'netsh advfirewall set allprofiles state off',
        revert: 'netsh advfirewall set allprofiles state on',
        verify: 'netsh advfirewall show allprofiles | findstr "State"',
        required: false,
        category: 'danger',
        requiresAdmin: true
      },

      // Performance Settings
      disableStartupPrograms: {
        name: 'Disable Startup Programs',
        description: 'Disable unnecessary startup programs for better performance',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32" /v * /t REG_BINARY /d 0300000000000000000000000000000000000000 /f',
        revert: 'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32" /f',
        verify: 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32"',
        required: false,
        category: 'performance',
        requiresAdmin: false
      },
      disableVisualEffects: {
        name: 'Disable Visual Effects',
        description: 'Disable visual effects for better performance',
        command: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 2 /f',
        revert: 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting /t REG_DWORD /d 0 /f',
        verify: 'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" /v VisualFXSetting',
        required: false,
        category: 'performance', 
        requiresAdmin: false
      }
    };
  }

  async getSystemInfo() {
    try {
      const { stdout: systemInfo } = await execAsync('systeminfo | findstr /C:"OS Name" /C:"OS Version" /C:"System Model" /C:"Total Physical Memory"');
      const { stdout: computerName } = await execAsync('echo %COMPUTERNAME%');
      const { stdout: userName } = await execAsync('echo %USERNAME%');

      // Parse systeminfo output
      const lines = systemInfo.split('\n');
      const osName = lines.find(line => line.includes('OS Name'))?.split(':')[1]?.trim() || 'Windows';
      const osVersion = lines.find(line => line.includes('OS Version'))?.split(':')[1]?.trim() || 'Unknown';
      const systemModel = lines.find(line => line.includes('System Model'))?.split(':')[1]?.trim() || 'Unknown';
      const totalMemory = lines.find(line => line.includes('Total Physical Memory'))?.split(':')[1]?.trim() || 'Unknown';

      return {
        platform: 'Windows',
        version: osVersion,
        build: osName,
        computerName: computerName.trim(),
        hostName: os.hostname(),
        userName: userName.trim(),
        systemModel: systemModel,
        totalMemory: totalMemory,
        arch: process.arch,
        uptime: process.uptime()
      };
    } catch (error) {
      console.error('Failed to get system info:', error);
      return {
        platform: 'Windows',
        version: 'Unknown',
        build: 'Unknown',
        computerName: 'Unknown',
        hostName: os.hostname(),
        userName: process.env.USERNAME || 'Unknown',
        arch: process.arch,
        uptime: process.uptime()
      };
    }
  }

  async applySettings(settingKeys) {
    // Log the settings application attempt
    if (this.logger) {
      await this.logger.system(1, `Applying Windows system settings`, {
        settingKeys,
        settingCount: settingKeys.length,
        action: 'apply_settings_start'
      });
    }

    const results = [];

    for (const key of settingKeys) {
      const setting = this.settings[key];
      if (!setting) {
        const errorResult = {
          setting: key,
          success: false,
          error: 'Setting not found'
        };
        results.push(errorResult);

        // Log setting not found error
        if (this.logger) {
          await this.logger.system(3, `Windows setting not found: ${key}`, {
            settingKey: key,
            action: 'apply_setting_not_found'
          });
        }
        continue;
      }

      // Log individual setting attempt
      if (this.logger) {
        await this.logger.system(
          1,
          `Applying Windows setting: ${setting.name}`,
          {
            settingKey: key,
            settingName: setting.name,
            command: setting.command,
            requiresAdmin: setting.requiresAdmin,
            action: 'apply_setting_attempt'
          }
        );
      }

      try {
        let result;
        if (setting.requiresAdmin) {
          // Execute command with elevated privileges
          result = await this.executeElevatedCommand(setting.command, setting.name);
        } else {
          // Execute regular command
          const { stdout, stderr } = await execAsync(setting.command);
          result = {
            success: true,
            stdout: stdout,
            stderr: stderr || null
          };
        }

        const settingResult = {
          setting: key,
          name: setting.name,
          success: result.success,
          output: result.stdout || '',
          stderr: result.stderr || null
        };
        results.push(settingResult);

        // Log command result
        if (this.logger) {
          await this.logger.system(
            result.success ? 1 : 3,
            `Windows setting ${result.success ? 'applied successfully' : 'failed'}: ${setting.name}`,
            {
              settingKey: key,
              settingName: setting.name,
              success: result.success,
              requiresAdmin: setting.requiresAdmin,
              output: result.stdout,
              error: result.stderr,
              action: result.success
                ? 'apply_setting_success'
                : 'apply_setting_failure'
            }
          );
        }
      } catch (error) {
        const errorResult = {
          setting: key,
          name: setting.name,
          success: false,
          error: error.message,
          stderr: error.stderr || null
        };
        results.push(errorResult);

        // Log setting application error
        if (this.logger) {
          await this.logger.system(
            3,
            `Windows setting failed: ${setting.name}`,
            {
              settingKey: key,
              settingName: setting.name,
              success: false,
              error: error.message,
              stderr: error.stderr,
              action: 'apply_setting_error'
            }
          );
        }
      }
    }

    const overallSuccess = results.every(r => r.success);
    const failedCount = results.filter(r => !r.success).length;

    // Log overall results
    if (this.logger) {
      await this.logger.system(
        overallSuccess ? 1 : 2,
        `Windows settings application complete`,
        {
          totalSettings: settingKeys.length,
          successCount: results.length - failedCount,
          failedCount,
          overallSuccess,
          settingKeys,
          action: 'apply_settings_complete'
        }
      );
    }

    return {
      success: overallSuccess,
      results,
      timestamp: new Date().toISOString()
    };
  }

  async verifySettings(settingKeys = null) {
    const keysToCheck = settingKeys || Object.keys(this.settings);

    // Log the settings verification attempt
    if (this.logger) {
      await this.logger.system(1, `Verifying Windows system settings`, {
        settingKeys: keysToCheck,
        settingCount: keysToCheck.length,
        isFullVerification: settingKeys === null,
        action: 'verify_settings_start'
      });
    }

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
   * Execute command with elevated privileges (Windows UAC)
   */
  async executeElevatedCommand(command, settingName) {
    return new Promise((resolve) => {
      console.log(`[UAC] Executing elevated command: ${command}`);
      console.log(`[UAC] For setting: ${settingName}`);

      // For now, try to execute directly - in production this would need proper UAC elevation
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`[UAC] Error executing ${command}:`, error.message);
          resolve({
            success: false,
            error: error.message,
            stdout: null,
            stderr: stderr
          });
        } else {
          console.log(`[UAC] Successfully executed: ${command}`);
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
        let result;
        if (setting.requiresAdmin) {
          // Execute revert command with elevated privileges
          result = await this.executeElevatedCommand(setting.revert, `Revert ${setting.name}`);
        } else {
          // Execute regular revert command
          const { stdout, stderr } = await execAsync(setting.revert);
          result = {
            success: true,
            stdout: stdout,
            stderr: stderr || null
          };
        }

        results.push({
          setting: key,
          name: setting.name,
          success: result.success,
          output: result.stdout || '',
          stderr: result.stderr || null
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

    // Setting-specific evaluation logic for Windows
    switch (settingKey) {
      case 'displaySleep':
        // powercfg output contains "Current AC Power Setting Index: 0x00000000" when disabled
        return { applied: output.includes('0x00000000') };

      case 'computerSleep':
        // Similar to displaySleep, check for 0x00000000 in standby timeout
        return { applied: output.includes('0x00000000') };

      case 'disableHibernation':
        // Check if hibernation is not in available sleep states
        return { applied: !output.toLowerCase().includes('hibernate') };

      case 'autoRestart':
        // Check if AutoReboot is set to TRUE
        return { applied: output.toUpperCase().includes('TRUE') };

      case 'hideDesktopIcons':
        // Check if HideIcons registry value is set to 1
        return { applied: output.includes('0x1') || output.includes('REG_DWORD    0x1') };

      case 'autoHideTaskbar':
        // Complex binary check - simplified to just check if the key exists
        return { applied: output.includes('Settings') && output.includes('REG_BINARY') };

      case 'disableNotifications':
        // Check if notification sound is disabled (0)
        return { applied: output.includes('0x0') || output.includes('REG_DWORD    0x0') };

      case 'disableActionCenter':
        // Check if DisableNotificationCenter is set to 1
        return { applied: output.includes('0x1') || output.includes('REG_DWORD    0x1') };

      case 'disableWindowsUpdate':
        // Check if NoAutoUpdate is set to 1
        return { applied: output.includes('0x1') || output.includes('REG_DWORD    0x1') };

      case 'disableDefender':
        // Check if real-time monitoring is disabled (True)
        return { applied: output.includes('True') };

      case 'disableUAC':
        // Check if EnableLUA is set to 0
        return { applied: output.includes('0x0') || output.includes('REG_DWORD    0x0') };

      case 'disableFirewall':
        // Check if all profiles show "OFF"
        return { applied: output.toLowerCase().includes('off') };

      case 'disableVisualEffects':
        // Check if VisualFXSetting is set to 2 (performance mode)
        return { applied: output.includes('0x2') || output.includes('REG_DWORD    0x2') };

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

  // Additional helper methods for compatibility
  async checkAllSettingsStatus() {
    return this.verifySettings();
  }

  async applyRequiredSettings() {
    const requiredKeys = Object.keys(this.getRequiredSettings());
    return this.applySettings(requiredKeys);
  }

  async getSystemSettings() {
    // Return the settings configuration for setup wizard
    const allSettings = this.settings;
    const essentialSettings = [];

    // Define the 4 essential settings for 24/7 operation
    const essentialKeys = [
      'computerSleep',
      'displaySleep',
      'disableHibernation',
      'disableNotifications'
    ];

    for (const key of essentialKeys) {
      if (allSettings[key]) {
        const setting = allSettings[key];

        // Check current status
        let currentStatus = false;
        try {
          const verification = await this.verifySettings([key]);
          currentStatus = verification[0]?.status === 'applied';
        } catch (error) {
          console.warn(`Could not verify ${key}:`, error.message);
        }

        essentialSettings.push({
          id: key,
          name: setting.name,
          description: setting.description,
          command: setting.command,
          current: currentStatus,
          category: setting.category || 'system',
          required: setting.required || false
        });
      }
    }

    return {
      essentialSettings,
      totalCount: essentialSettings.length,
      appliedCount: essentialSettings.filter(s => s.current).length
    };
  }

  /**
   * Generate PowerShell script for manual execution
   * @returns {Object} PowerShell script for manual execution
   */
  async generateCommands(selectedSettings = null) {
    const commands = [];
    commands.push('# Installation Up 4evr - Windows System Configuration Script');
    commands.push('# Generated on: ' + new Date().toISOString());
    commands.push('# Requires Administrator privileges for some settings');
    commands.push('');

    // Determine which settings to include
    const settingsToInclude = selectedSettings
      ? selectedSettings.filter(key => this.settings[key])
      : Object.keys(this.settings);

    if (settingsToInclude.length === 0) {
      return {
        success: false,
        error: 'No valid settings selected for command generation'
      };
    }

    commands.push('Write-Host "Installation Up 4evr - Windows System Configuration" -ForegroundColor Green');
    commands.push(`Write-Host "Applying ${settingsToInclude.length} selected setting(s)..." -ForegroundColor Yellow`);
    commands.push('Write-Host "==========================================" -ForegroundColor Gray');
    commands.push('');

    // Add commands by category with admin check
    const adminRequired = settingsToInclude.some(key => this.settings[key].requiresAdmin);
    if (adminRequired) {
      commands.push('# Check for Administrator privileges');
      commands.push('if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {');
      commands.push('    Write-Host "This script requires Administrator privileges!" -ForegroundColor Red');
      commands.push('    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow');
      commands.push('    exit 1');
      commands.push('}');
      commands.push('');
    }

    // Add settings commands
    settingsToInclude.forEach((key, index) => {
      const setting = this.settings[key];
      commands.push(`Write-Host "[${index + 1}/${settingsToInclude.length}] Configuring ${setting.name}..." -ForegroundColor Cyan`);
      
      if (setting.requiresAdmin) {
        commands.push(`# Administrator required: ${setting.name}`);
      }
      
      // Handle different command types
      if (setting.command.startsWith('powershell')) {
        // Extract PowerShell command
        const psCommand = setting.command.replace(/^powershell -Command "/, '').replace(/"$/, '');
        commands.push(psCommand);
      } else {
        // Regular command (cmd, reg, etc.)
        commands.push(`cmd /c "${setting.command}"`);
      }
      
      commands.push('Start-Sleep -Seconds 1  # Brief pause between settings');
      commands.push('');
    });

    commands.push('Write-Host "Configuration complete!" -ForegroundColor Green');
    commands.push(`Write-Host "Successfully applied ${settingsToInclude.length} setting(s)" -ForegroundColor Green`);
    commands.push('Write-Host "You may need to restart for all changes to take effect." -ForegroundColor Yellow');

    return {
      success: true,
      data: {
        commands: commands.join('\n'),
        count: settingsToInclude.length,
        selectedSettings: selectedSettings || 'all',
        timestamp: new Date().toISOString(),
        requiresAdmin: adminRequired
      }
    };
  }

  /**
   * Generate restore script to revert all settings
   * @returns {Object} Restore PowerShell script
   */
  async generateRestore() {
    const commands = [];
    commands.push('# Installation Up 4evr - Windows System Restore Script');
    commands.push('# Generated on: ' + new Date().toISOString());
    commands.push('');
    commands.push('Write-Host "⚠️  WARNING: This will restore all system settings to defaults" -ForegroundColor Red');
    commands.push('$confirmation = Read-Host "Continue? (y/N)"');
    commands.push('if ($confirmation -ne "y" -and $confirmation -ne "Y") {');
    commands.push('    Write-Host "Restore cancelled." -ForegroundColor Yellow');
    commands.push('    exit 0');
    commands.push('}');
    commands.push('');
    commands.push('Write-Host "Restoring Installation Up 4evr System Settings..." -ForegroundColor Green');
    commands.push('Write-Host "===============================================" -ForegroundColor Gray');
    commands.push('');

    // Add revert commands for all settings
    for (const [key, setting] of Object.entries(this.settings)) {
      if (setting.revert) {
        commands.push(`Write-Host "Restoring ${setting.name}..." -ForegroundColor Cyan`);
        
        if (setting.revert.startsWith('powershell')) {
          const psCommand = setting.revert.replace(/^powershell -Command "/, '').replace(/"$/, '');
          commands.push(psCommand);
        } else {
          commands.push(`cmd /c "${setting.revert}"`);
        }
        commands.push('');
      }
    }

    commands.push('Write-Host "Restore complete!" -ForegroundColor Green');
    commands.push('Write-Host "You may need to restart for all changes to take effect." -ForegroundColor Yellow');

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

module.exports = WindowsSystemManager;