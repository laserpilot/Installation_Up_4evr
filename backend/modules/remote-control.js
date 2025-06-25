/**
 * Remote Control System
 * Provides remote control capabilities for installations
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const EventEmitter = require('events');

class RemoteControlSystem extends EventEmitter {
    constructor(monitoringSystem) {
        super();
        this.monitoring = monitoringSystem;
        this.controlSessions = new Map();
        this.allowedCommands = new Set([
            'restart-app',
            'start-app', 
            'stop-app',
            'restart-system',
            'sleep-display',
            'wake-display',
            'set-volume',
            'screenshot',
            'run-script',
            'update-settings',
            'emergency-stop'
        ]);
    }

    /**
     * Execute remote command
     */
    async executeCommand(command, parameters = {}, sessionId = null) {
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.monitoring.log('info', `Remote command received: ${command}`, { 
            commandId, sessionId, parameters 
        });

        try {
            // Validate command
            if (!this.allowedCommands.has(command)) {
                throw new Error(`Command '${command}' is not allowed`);
            }

            // Execute command
            const result = await this.handleCommand(command, parameters);
            
            const response = {
                commandId: commandId,
                command: command,
                parameters: parameters,
                success: true,
                result: result,
                timestamp: new Date().toISOString(),
                sessionId: sessionId
            };

            this.monitoring.log('info', `Command executed successfully: ${command}`, response);
            this.emit('command-executed', response);
            
            return response;
        } catch (error) {
            const response = {
                commandId: commandId,
                command: command,
                parameters: parameters,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                sessionId: sessionId
            };

            this.monitoring.log('error', `Command failed: ${command}`, response);
            this.emit('command-failed', response);
            
            return response;
        }
    }

    /**
     * Handle specific commands
     */
    async handleCommand(command, params) {
        switch (command) {
            case 'restart-app':
                return await this.restartApplication(params.appName);
            
            case 'start-app':
                return await this.startApplication(params.appPath || params.appName);
            
            case 'stop-app':
                return await this.stopApplication(params.appName);
            
            case 'restart-system':
                return await this.restartSystem(params.delay || 0);
            
            case 'sleep-display':
                return await this.sleepDisplays();
            
            case 'wake-display':
                return await this.wakeDisplays();
            
            case 'set-volume':
                return await this.setVolume(params.level);
            
            case 'screenshot':
                return await this.takeScreenshot(params.path);
            
            case 'run-script':
                return await this.runScript(params.script, params.args);
            
            case 'update-settings':
                return await this.updateSettings(params.settings);
            
            case 'emergency-stop':
                return await this.emergencyStop();
            
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    /**
     * Restart application
     */
    async restartApplication(appName) {
        if (!appName) {
            throw new Error('Application name is required');
        }

        this.monitoring.log('info', `Restarting application: ${appName}`);
        
        // Stop application first
        await this.stopApplication(appName);
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start application
        const startResult = await this.startApplication(appName);
        
        // Update restart count
        const watchedApp = this.monitoring.watchedApplications.get(appName);
        if (watchedApp) {
            watchedApp.restartCount = (watchedApp.restartCount || 0) + 1;
        }
        
        return {
            action: 'restart',
            appName: appName,
            message: 'Application restarted successfully',
            ...startResult
        };
    }

    /**
     * Start application
     */
    async startApplication(appPath) {
        if (!appPath) {
            throw new Error('Application path is required');
        }

        this.monitoring.log('info', `Starting application: ${appPath}`);
        
        let command;
        if (appPath.endsWith('.app')) {
            command = `open "${appPath}"`;
        } else {
            command = appPath;
        }
        
        const { stdout, stderr } = await execAsync(command);
        
        return {
            action: 'start',
            appPath: appPath,
            message: 'Application started successfully',
            output: stdout,
            error: stderr || null
        };
    }

    /**
     * Stop application
     */
    async stopApplication(appName) {
        if (!appName) {
            throw new Error('Application name is required');
        }

        this.monitoring.log('info', `Stopping application: ${appName}`);
        
        try {
            // Try graceful quit first
            await execAsync(`osascript -e 'tell application "${appName}" to quit'`);
            
            // Wait a moment for graceful quit
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if still running, force kill if necessary
            try {
                const { stdout } = await execAsync(`ps aux | grep "${appName}" | grep -v grep`);
                if (stdout.trim()) {
                    await execAsync(`killall "${appName}"`);
                    this.monitoring.log('warning', `Force killed application: ${appName}`);
                }
            } catch (error) {
                // App not running, which is what we want
            }
            
            return {
                action: 'stop',
                appName: appName,
                message: 'Application stopped successfully'
            };
        } catch (error) {
            // Try force kill as fallback
            try {
                await execAsync(`killall "${appName}"`);
                return {
                    action: 'stop',
                    appName: appName,
                    message: 'Application force-stopped',
                    method: 'force'
                };
            } catch (killError) {
                throw new Error(`Failed to stop application: ${error.message}`);
            }
        }
    }

    /**
     * Restart system
     */
    async restartSystem(delaySeconds = 0) {
        this.monitoring.log('warning', `System restart requested, delay: ${delaySeconds}s`);
        
        const command = delaySeconds > 0 
            ? `sudo shutdown -r +${Math.ceil(delaySeconds / 60)}`
            : 'sudo shutdown -r now';
        
        // Don't await this as system will restart
        execAsync(command).catch(() => {
            // Expected to fail as system restarts
        });
        
        return {
            action: 'restart-system',
            delay: delaySeconds,
            message: `System restart initiated${delaySeconds > 0 ? ` (${delaySeconds}s delay)` : ''}`
        };
    }

    /**
     * Sleep displays
     */
    async sleepDisplays() {
        this.monitoring.log('info', 'Sleeping displays');
        
        await execAsync('pmset displaysleepnow');
        
        return {
            action: 'sleep-display',
            message: 'Displays put to sleep'
        };
    }

    /**
     * Wake displays
     */
    async wakeDisplays() {
        this.monitoring.log('info', 'Waking displays');
        
        // Move mouse slightly to wake displays
        await execAsync('osascript -e "tell application \\"System Events\\" to key code 126"');
        
        return {
            action: 'wake-display',
            message: 'Displays awakened'
        };
    }

    /**
     * Set system volume
     */
    async setVolume(level) {
        if (level === undefined || level < 0 || level > 100) {
            throw new Error('Volume level must be between 0 and 100');
        }

        this.monitoring.log('info', `Setting volume to ${level}%`);
        
        await execAsync(`osascript -e "set volume output volume ${level}"`);
        
        return {
            action: 'set-volume',
            level: level,
            message: `Volume set to ${level}%`
        };
    }

    /**
     * Take screenshot
     */
    async takeScreenshot(outputPath = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultPath = `/tmp/installation-screenshot-${timestamp}.png`;
        const path = outputPath || defaultPath;

        this.monitoring.log('info', `Taking screenshot: ${path}`);
        
        await execAsync(`screencapture "${path}"`);
        
        return {
            action: 'screenshot',
            path: path,
            message: `Screenshot saved to ${path}`
        };
    }

    /**
     * Run custom script
     */
    async runScript(script, args = []) {
        if (!script) {
            throw new Error('Script content is required');
        }

        this.monitoring.log('info', 'Running custom script', { script: script.substring(0, 100) + '...' });
        
        // Create temporary script file
        const timestamp = Date.now();
        const scriptPath = `/tmp/remote-script-${timestamp}.sh`;
        
        try {
            const fs = require('fs').promises;
            await fs.writeFile(scriptPath, script, { mode: 0o755 });
            
            const command = args.length > 0 
                ? `"${scriptPath}" ${args.map(arg => `"${arg}"`).join(' ')}`
                : `"${scriptPath}"`;
            
            const { stdout, stderr } = await execAsync(command);
            
            // Clean up
            await fs.unlink(scriptPath);
            
            return {
                action: 'run-script',
                output: stdout,
                error: stderr || null,
                message: 'Script executed successfully'
            };
        } catch (error) {
            // Try to clean up script file
            try {
                const fs = require('fs').promises;
                await fs.unlink(scriptPath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
            
            throw new Error(`Script execution failed: ${error.message}`);
        }
    }

    /**
     * Update system settings
     */
    async updateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            throw new Error('Settings object is required');
        }

        this.monitoring.log('info', 'Updating system settings', { settings });
        
        const results = [];
        
        for (const [key, value] of Object.entries(settings)) {
            try {
                const result = await this.updateSingleSetting(key, value);
                results.push({ setting: key, success: true, result });
            } catch (error) {
                results.push({ setting: key, success: false, error: error.message });
            }
        }
        
        return {
            action: 'update-settings',
            results: results,
            message: `Updated ${results.filter(r => r.success).length} of ${results.length} settings`
        };
    }

    /**
     * Update single setting
     */
    async updateSingleSetting(key, value) {
        switch (key) {
            case 'volume':
                return await this.setVolume(value);
            
            case 'brightness':
                await execAsync(`osascript -e "tell application \\"System Events\\" to set brightness of (first display whose brightness is not missing value) to ${value / 100}"`);
                return { message: `Brightness set to ${value}%` };
            
            case 'screensaver':
                const delay = value === 'never' ? 0 : parseInt(value) * 60;
                await execAsync(`defaults -currentHost write com.apple.screensaver idleTime ${delay}`);
                return { message: `Screensaver delay set to ${value}` };
            
            default:
                throw new Error(`Unknown setting: ${key}`);
        }
    }

    /**
     * Emergency stop - stop all monitored applications
     */
    async emergencyStop() {
        this.monitoring.log('warning', 'Emergency stop initiated');
        
        const results = [];
        const watchedApps = Array.from(this.monitoring.watchedApplications.keys());
        
        for (const appName of watchedApps) {
            try {
                const result = await this.stopApplication(appName);
                results.push({ app: appName, success: true, result });
            } catch (error) {
                results.push({ app: appName, success: false, error: error.message });
            }
        }
        
        return {
            action: 'emergency-stop',
            results: results,
            message: `Emergency stop completed. Stopped ${results.filter(r => r.success).length} of ${results.length} applications`
        };
    }

    /**
     * Get system control capabilities
     */
    getControlCapabilities() {
        return {
            commands: Array.from(this.allowedCommands),
            applications: Array.from(this.monitoring.watchedApplications.keys()),
            systemInfo: {
                platform: require('os').platform(),
                hostname: require('os').hostname(),
                canRestart: true,
                canControlDisplay: true,
                canControlVolume: true,
                canTakeScreenshot: true
            }
        };
    }

    /**
     * Create control session
     */
    createControlSession(userId, permissions = []) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
            id: sessionId,
            userId: userId,
            permissions: permissions,
            created: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            commandCount: 0
        };
        
        this.controlSessions.set(sessionId, session);
        
        this.monitoring.log('info', `Control session created: ${sessionId}`, { userId, permissions });
        
        return session;
    }

    /**
     * Validate control session
     */
    validateSession(sessionId, requiredPermission = null) {
        const session = this.controlSessions.get(sessionId);
        
        if (!session) {
            throw new Error('Invalid session');
        }
        
        if (requiredPermission && !session.permissions.includes(requiredPermission) && !session.permissions.includes('admin')) {
            throw new Error('Insufficient permissions');
        }
        
        // Update last activity
        session.lastActivity = new Date().toISOString();
        session.commandCount += 1;
        
        return session;
    }

    /**
     * End control session
     */
    endControlSession(sessionId) {
        const session = this.controlSessions.get(sessionId);
        if (session) {
            this.controlSessions.delete(sessionId);
            this.monitoring.log('info', `Control session ended: ${sessionId}`);
            return true;
        }
        return false;
    }

    /**
     * Clean up old sessions
     */
    cleanupOldSessions(maxAgeHours = 24) {
        const cutoff = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
        let cleaned = 0;
        
        for (const [sessionId, session] of this.controlSessions.entries()) {
            if (new Date(session.lastActivity) < cutoff) {
                this.controlSessions.delete(sessionId);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.monitoring.log('info', `Cleaned up ${cleaned} old control sessions`);
        }
        
        return cleaned;
    }
}

module.exports = RemoteControlSystem;