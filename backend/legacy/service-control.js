/**
 * Service Control Manager
 * Manages the backend service lifecycle and provides control APIs
 */

const { exec, spawn } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ServiceControlManager {
    constructor() {
        this.serverProcess = null;
        this.startTime = new Date();
        this.logs = [];
        this.maxLogs = 1000;
        this.logFile = path.join(os.homedir(), 'installation-up-4evr-service.log');
        
        // Initialize logging
        this.log('Service Control Manager initialized');
    }
    
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message
        };
        
        this.logs.push(logEntry);
        
        // Keep only the latest logs in memory
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        // Also write to file
        const logLine = `[${timestamp}] [${level}] ${message}\n`;
        fs.appendFile(this.logFile, logLine).catch(err => {
            console.error('Failed to write to service log file:', err);
        });
    }
    
    /**
     * Get current service status
     */
    async getServiceStatus() {
        try {
            // Check if backend is running by trying to connect to it
            const response = await this.checkHealth();
            
            if (response) {
                const uptime = Math.floor((new Date() - this.startTime) / 1000);
                return {
                    status: 'online',
                    pid: process.pid,
                    uptime: uptime,
                    mode: 'Electron-managed',
                    port: process.env.PORT || 3001
                };
            } else {
                return {
                    status: 'offline',
                    error: 'Backend not responding'
                };
            }
        } catch (error) {
            this.log(`Error checking service status: ${error.message}`, 'ERROR');
            return {
                status: 'offline',
                error: error.message
            };
        }
    }
    
    async checkHealth() {
        try {
            // Simple health check - if we can execute this, the backend is running
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Restart the backend service
     */
    async restartService() {
        this.log('Restart service requested');
        
        try {
            // For Electron-managed backend, we can't easily restart ourselves
            // Instead, we'll simulate a restart by clearing caches and resetting state
            this.log('Simulating backend restart (Electron-managed mode)');
            
            // Reset start time
            this.startTime = new Date();
            
            // Clear some caches if they exist
            if (global.gc) {
                global.gc();
            }
            
            return {
                success: true,
                message: 'Backend restart simulated (Electron-managed mode)',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log(`Failed to restart service: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * Stop the backend service
     */
    async stopService() {
        this.log('Stop service requested');
        
        try {
            // For Electron-managed backend, stopping would disconnect the frontend
            // We'll implement a graceful shutdown in the future
            this.log('Stop request received - this will disconnect the frontend');
            
            // Schedule a graceful shutdown
            setTimeout(() => {
                this.log('Initiating graceful shutdown');
                process.exit(0);
            }, 1000);
            
            return {
                success: true,
                message: 'Backend shutdown initiated',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log(`Failed to stop service: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * Start the backend service (for future standalone mode)
     */
    async startService() {
        this.log('Start service requested');
        
        // In current Electron mode, service is already running
        return {
            success: false,
            message: 'Service is already running in Electron-managed mode',
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Install backend as system service
     */
    async installSystemService() {
        this.log('System service installation requested');
        
        try {
            const serviceName = 'com.up4evr.installation-backend';
            const serviceLabel = 'Installation Up 4evr Backend';
            const nodePath = '/usr/local/bin/node';
            const serverPath = path.join(__dirname, '../server.js');
            const launchAgentDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
            const plistPath = path.join(launchAgentDir, `${serviceName}.plist`);
            
            // Create launch agent plist for the backend service
            const plistContent = this.createServicePlist(serviceName, serviceLabel, nodePath, serverPath);
            
            // Ensure LaunchAgents directory exists
            await fs.mkdir(launchAgentDir, { recursive: true });
            
            // Write the plist file
            await fs.writeFile(plistPath, plistContent, 'utf8');
            
            // Load the launch agent
            await execAsync(`launchctl load ${plistPath}`);
            
            this.log(`System service installed: ${serviceName}`);
            
            return {
                success: true,
                message: `Backend service installed as ${serviceName}`,
                details: [
                    `Service name: ${serviceName}`,
                    `Plist location: ${plistPath}`,
                    `Auto-start: Enabled`,
                    `Keep-alive: Enabled`
                ],
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log(`Failed to install system service: ${error.message}`, 'ERROR');
            throw new Error(`Service installation failed: ${error.message}`);
        }
    }
    
    createServicePlist(serviceName, serviceLabel, nodePath, serverPath) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${serviceName}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>${nodePath}</string>
        <string>${serverPath}</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>${path.dirname(serverPath)}</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>3001</string>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>SERVICE_MODE</key>
        <string>standalone</string>
    </dict>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>${this.logFile}</string>
    
    <key>StandardErrorPath</key>
    <string>${this.logFile}</string>
    
    <key>ProcessType</key>
    <string>Background</string>
    
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>`;
    }
    
    /**
     * Get service logs
     */
    async getServiceLogs(limit = 50) {
        try {
            // Return recent logs from memory
            const recentLogs = this.logs.slice(-limit);
            
            return {
                success: true,
                logs: recentLogs,
                total: this.logs.length,
                logFile: this.logFile
            };
        } catch (error) {
            this.log(`Failed to get service logs: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * Clear service logs
     */
    async clearServiceLogs() {
        try {
            this.logs = [];
            
            // Also clear the log file
            await fs.writeFile(this.logFile, '');
            
            this.log('Service logs cleared');
            
            return {
                success: true,
                message: 'Service logs cleared',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.log(`Failed to clear service logs: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * Check if system service is installed
     */
    async checkSystemService() {
        try {
            const serviceName = 'com.up4evr.installation-backend';
            const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${serviceName}.plist`);
            
            // Check if plist file exists
            await fs.access(plistPath);
            
            // Check if service is loaded
            const { stdout } = await execAsync('launchctl list');
            const isLoaded = stdout.includes(serviceName);
            
            return {
                installed: true,
                loaded: isLoaded,
                plistPath: plistPath
            };
        } catch (error) {
            return {
                installed: false,
                loaded: false,
                error: error.message
            };
        }
    }
}

module.exports = ServiceControlManager;