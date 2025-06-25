/**
 * Launch Agent Generator and Manager
 * Creates and manages macOS launch agents for keeping apps running
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const os = require('os');

class LaunchAgentManager {
    constructor() {
        this.launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
        this.systemLaunchAgentsDir = '/Library/LaunchAgents';
    }

    /**
     * Extract executable path from .app bundle
     */
    async getExecutablePath(appPath) {
        if (!appPath.endsWith('.app')) {
            throw new Error('Path must point to a .app bundle');
        }

        const appName = path.basename(appPath, '.app');
        const executablePath = path.join(appPath, 'Contents', 'MacOS', appName);
        
        try {
            await fs.access(executablePath);
            return executablePath;
        } catch (error) {
            // Try to find the actual executable in MacOS folder
            const macOSDir = path.join(appPath, 'Contents', 'MacOS');
            try {
                const files = await fs.readdir(macOSDir);
                const executables = files.filter(file => !file.startsWith('.'));
                
                if (executables.length > 0) {
                    return path.join(macOSDir, executables[0]);
                }
            } catch (dirError) {
                throw new Error(`Could not find executable in ${appPath}`);
            }
            
            throw new Error(`Executable not found at ${executablePath}`);
        }
    }

    /**
     * Get app info from bundle
     */
    async getAppInfo(appPath) {
        try {
            const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
            
            // Read bundle info using plutil
            const { stdout } = await execAsync(`plutil -convert json -o - "${infoPlistPath}"`);
            const info = JSON.parse(stdout);
            
            const executablePath = await this.getExecutablePath(appPath);
            
            return {
                appPath: appPath,
                appName: path.basename(appPath, '.app'),
                bundleIdentifier: info.CFBundleIdentifier || null,
                displayName: info.CFBundleDisplayName || info.CFBundleName || path.basename(appPath, '.app'),
                version: info.CFBundleShortVersionString || info.CFBundleVersion || 'Unknown',
                executablePath: executablePath,
                icon: info.CFBundleIconFile || null
            };
        } catch (error) {
            throw new Error(`Could not read app info: ${error.message}`);
        }
    }

    /**
     * Generate launch agent plist content
     */
    generatePlist(options) {
        const {
            label,
            executablePath,
            keepAlive = true,
            successfulExit = true,
            processType = 'Interactive',
            runAtLoad = true,
            environmentVariables = {},
            workingDirectory = null,
            args = []
        } = options;

        const plistData = {
            Label: label,
            ProgramArguments: [executablePath, ...args],
            ProcessType: processType,
            RunAtLoad: runAtLoad
        };

        if (keepAlive) {
            plistData.KeepAlive = successfulExit ? { SuccessfulExit: true } : true;
        }

        if (Object.keys(environmentVariables).length > 0) {
            plistData.EnvironmentVariables = environmentVariables;
        }

        if (workingDirectory) {
            plistData.WorkingDirectory = workingDirectory;
        }

        return this.objectToPlist(plistData);
    }

    /**
     * Convert JavaScript object to plist XML
     */
    objectToPlist(obj) {
        const header = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">`;
        
        const footer = `</plist>`;
        
        return header + '\n' + this.objectToXml(obj, 0) + '\n' + footer;
    }

    /**
     * Convert object to XML recursively
     */
    objectToXml(obj, indent = 0) {
        const spaces = '  '.repeat(indent);
        
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                let xml = `${spaces}<array>\n`;
                for (const item of obj) {
                    xml += this.objectToXml(item, indent + 1) + '\n';
                }
                xml += `${spaces}</array>`;
                return xml;
            } else {
                let xml = `${spaces}<dict>\n`;
                for (const [key, value] of Object.entries(obj)) {
                    xml += `${spaces}  <key>${key}</key>\n`;
                    xml += this.objectToXml(value, indent + 1) + '\n';
                }
                xml += `${spaces}</dict>`;
                return xml;
            }
        } else if (typeof obj === 'boolean') {
            return `${spaces}<${obj ? 'true' : 'false'}/>`;
        } else if (typeof obj === 'number') {
            return Number.isInteger(obj) 
                ? `${spaces}<integer>${obj}</integer>`
                : `${spaces}<real>${obj}</real>`;
        } else {
            return `${spaces}<string>${this.escapeXml(String(obj))}</string>`;
        }
    }

    /**
     * Escape XML special characters
     */
    escapeXml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Create launch agent for an app
     */
    async createLaunchAgent(appPath, options = {}) {
        const appInfo = await this.getAppInfo(appPath);
        
        const label = options.label || `${appInfo.bundleIdentifier || appInfo.appName}.up4evr`;
        const filename = `${label}.plist`;
        const filepath = path.join(this.launchAgentsDir, filename);

        const plistOptions = {
            label: label,
            executablePath: appInfo.executablePath,
            keepAlive: options.keepAlive !== false,
            successfulExit: options.successfulExit !== false,
            processType: options.processType || 'Interactive',
            runAtLoad: options.runAtLoad !== false,
            environmentVariables: options.environmentVariables || {},
            workingDirectory: options.workingDirectory,
            args: options.args || []
        };

        const plistContent = this.generatePlist(plistOptions);

        // Ensure LaunchAgents directory exists
        try {
            await fs.mkdir(this.launchAgentsDir, { recursive: true });
        } catch (error) {
            // Directory already exists or other error
        }

        // Write plist file
        await fs.writeFile(filepath, plistContent, 'utf8');

        return {
            label: label,
            filename: filename,
            filepath: filepath,
            appInfo: appInfo,
            options: plistOptions,
            plistContent: plistContent
        };
    }

    /**
     * Load/install a launch agent
     */
    async loadLaunchAgent(labelOrPath) {
        try {
            const isPath = labelOrPath.includes('/') || labelOrPath.endsWith('.plist');
            const command = isPath 
                ? `launchctl load "${labelOrPath}"`
                : `launchctl load "${path.join(this.launchAgentsDir, labelOrPath)}.plist"`;
            
            const { stdout, stderr } = await execAsync(command);
            
            return {
                success: true,
                message: 'Launch agent loaded successfully',
                output: stdout,
                error: stderr || null
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to load launch agent: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Unload a launch agent
     */
    async unloadLaunchAgent(labelOrPath) {
        try {
            const isPath = labelOrPath.includes('/') || labelOrPath.endsWith('.plist');
            const command = isPath 
                ? `launchctl unload "${labelOrPath}"`
                : `launchctl unload "${path.join(this.launchAgentsDir, labelOrPath)}.plist"`;
            
            const { stdout, stderr } = await execAsync(command);
            
            return {
                success: true,
                message: 'Launch agent unloaded successfully',
                output: stdout,
                error: stderr || null
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to unload launch agent: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Delete a launch agent file
     */
    async deleteLaunchAgent(labelOrFilename) {
        try {
            const filename = labelOrFilename.endsWith('.plist') 
                ? labelOrFilename 
                : `${labelOrFilename}.plist`;
            
            const filepath = path.join(this.launchAgentsDir, filename);
            
            // Unload first if loaded
            await this.unloadLaunchAgent(filepath);
            
            // Delete file
            await fs.unlink(filepath);
            
            return {
                success: true,
                message: 'Launch agent deleted successfully',
                filepath: filepath
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete launch agent: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * List all launch agents in user directory
     */
    async listLaunchAgents() {
        try {
            const files = await fs.readdir(this.launchAgentsDir);
            const plistFiles = files.filter(file => file.endsWith('.plist'));
            
            const agents = [];
            
            for (const file of plistFiles) {
                const filepath = path.join(this.launchAgentsDir, file);
                try {
                    const content = await fs.readFile(filepath, 'utf8');
                    const stats = await fs.stat(filepath);
                    
                    // Try to extract label from plist
                    const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
                    const label = labelMatch ? labelMatch[1] : path.basename(file, '.plist');
                    
                    agents.push({
                        filename: file,
                        filepath: filepath,
                        label: label,
                        size: stats.size,
                        modified: stats.mtime,
                        created: stats.birthtime
                    });
                } catch (fileError) {
                    // Skip files that can't be read
                    agents.push({
                        filename: file,
                        filepath: filepath,
                        error: fileError.message
                    });
                }
            }
            
            return agents;
        } catch (error) {
            throw new Error(`Could not list launch agents: ${error.message}`);
        }
    }

    /**
     * Get status of loaded launch agents
     */
    async getLaunchAgentStatus(label = null) {
        try {
            const command = label 
                ? `launchctl list | grep "${label}"`
                : 'launchctl list';
            
            const { stdout } = await execAsync(command);
            
            const lines = stdout.trim().split('\n');
            const agents = [];
            
            for (const line of lines) {
                if (line.trim()) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        agents.push({
                            pid: parts[0] === '-' ? null : parseInt(parts[0]),
                            lastExitCode: parts[1] === '-' ? null : parseInt(parts[1]),
                            label: parts[2]
                        });
                    }
                }
            }
            
            return agents;
        } catch (error) {
            return [];
        }
    }

    /**
     * Create launch agent with full workflow (create + load)
     */
    async installLaunchAgent(appPath, options = {}) {
        try {
            // Create the plist file
            const result = await this.createLaunchAgent(appPath, options);
            
            // Load the launch agent
            const loadResult = await this.loadLaunchAgent(result.filepath);
            
            return {
                success: loadResult.success,
                message: loadResult.success 
                    ? 'Launch agent created and loaded successfully'
                    : `Launch agent created but failed to load: ${loadResult.message}`,
                launchAgent: result,
                loadResult: loadResult
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to install launch agent: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Get comprehensive launch agent info
     */
    async getLaunchAgentInfo(labelOrFilename) {
        try {
            const filename = labelOrFilename.endsWith('.plist') 
                ? labelOrFilename 
                : `${labelOrFilename}.plist`;
            
            const filepath = path.join(this.launchAgentsDir, filename);
            
            // Read plist content
            const content = await fs.readFile(filepath, 'utf8');
            const stats = await fs.stat(filepath);
            
            // Get status from launchctl
            const label = labelOrFilename.replace('.plist', '');
            const statusList = await this.getLaunchAgentStatus(label);
            const status = statusList.find(agent => agent.label === label) || null;
            
            return {
                filename: filename,
                filepath: filepath,
                content: content,
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime,
                status: status,
                loaded: status !== null,
                running: status && status.pid !== null
            };
        } catch (error) {
            throw new Error(`Could not get launch agent info: ${error.message}`);
        }
    }
}

module.exports = LaunchAgentManager;