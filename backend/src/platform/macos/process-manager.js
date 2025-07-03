/**
 * macOS Process Manager
 * Platform-specific process and application management for macOS
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { ProcessManagerInterface } = require('../../core/interfaces');

const execAsync = util.promisify(exec);

class MacOSProcessManager extends ProcessManagerInterface {
    constructor() {
        super();
        this.platform = 'macos';
        this.launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    }

    /**
     * Get the executable path from a .app bundle
     */
    async getExecutablePath(appPath) {
        // If it's not a .app bundle, return as-is
        if (!appPath.endsWith('.app')) {
            return appPath;
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
                // If we can't find the executable, fall back to using the app path
                console.warn(`Could not find executable in ${appPath}, using app path`);
                return appPath;
            }
            
            // Fall back to app path if we can't find the executable
            console.warn(`Executable not found at ${executablePath}, using app path`);
            return appPath;
        }
    }

    async startApplication(appPath, options = {}) {
        try {
            const { background = true, arguments: args = [] } = options;
            
            if (appPath.endsWith('.app')) {
                // macOS .app bundle
                const argString = args.length > 0 ? ` --args ${args.join(' ')}` : '';
                const backgroundFlag = background ? ' &' : '';
                const command = `open "${appPath}"${argString}${backgroundFlag}`;
                
                const { stdout, stderr } = await execAsync(command);
                
                return {
                    success: true,
                    message: `Application started: ${path.basename(appPath)}`,
                    command,
                    output: stdout,
                    stderr: stderr || null
                };
            } else {
                // Direct executable
                const argString = args.join(' ');
                const backgroundFlag = background ? ' &' : '';
                const command = `"${appPath}" ${argString}${backgroundFlag}`;
                
                const { stdout, stderr } = await execAsync(command);
                
                return {
                    success: true,
                    message: `Executable started: ${path.basename(appPath)}`,
                    command,
                    output: stdout,
                    stderr: stderr || null
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to start application: ${error.message}`,
                error: error.message
            };
        }
    }

    async stopApplication(appName) {
        try {
            // Try to find and kill the process
            const { stdout } = await execAsync(`pgrep -f "${appName}"`);
            const pids = stdout.trim().split('\n').filter(pid => pid);
            
            if (pids.length === 0) {
                return {
                    success: false,
                    message: `No running processes found for: ${appName}`
                };
            }

            // Kill all matching processes
            for (const pid of pids) {
                await execAsync(`kill ${pid}`);
            }

            return {
                success: true,
                message: `Stopped ${pids.length} process(es) for: ${appName}`,
                pids
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to stop application: ${error.message}`,
                error: error.message
            };
        }
    }

    async restartApplication(appName) {
        try {
            const stopResult = await this.stopApplication(appName);
            
            // Wait a moment for the process to fully stop
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // If we have a path stored somewhere, use it; otherwise user needs to provide it
            const startResult = await this.startApplication(appName);
            
            return {
                success: stopResult.success && startResult.success,
                message: `Restart attempt for ${appName}`,
                stopResult,
                startResult
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to restart application: ${error.message}`,
                error: error.message
            };
        }
    }

    async getRunningApplications() {
        try {
            // Get running applications using ps
            const { stdout } = await execAsync('ps -ax -o pid,comm,args');
            const lines = stdout.split('\n').slice(1); // Skip header
            
            const applications = [];
            
            for (const line of lines) {
                if (!line.trim()) continue;
                
                const parts = line.trim().split(/\s+/);
                if (parts.length < 3) continue;
                
                const pid = parts[0];
                const comm = parts[1];
                const args = parts.slice(2).join(' ');
                
                // Filter for actual applications (not system processes)
                if (comm.includes('.app') || args.includes('.app')) {
                    applications.push({
                        pid: parseInt(pid),
                        name: this.extractAppName(args),
                        command: comm,
                        arguments: args,
                        type: 'application'
                    });
                }
            }

            return applications;
        } catch (error) {
            console.error('Failed to get running applications:', error);
            return [];
        }
    }

    async createAutoStartEntry(appPath, options = {}) {
        try {
            const {
                name = path.basename(appPath, '.app'),
                description = `Auto-start for ${path.basename(appPath)}`,
                startInterval = null,
                keepAlive = true,
                runAtLoad = true
            } = options;

            const launchAgentName = `com.installation-up-4evr.${name.toLowerCase().replace(/\s+/g, '-')}`;
            const plistPath = path.join(this.launchAgentsDir, `${launchAgentName}.plist`);

            // Get the correct executable path for .app bundles
            const executablePath = await this.getExecutablePath(appPath);

            // Create launch agent plist
            const plistContent = this.generateLaunchAgentPlist({
                label: launchAgentName,
                program: executablePath,
                description,
                startInterval,
                keepAlive,
                runAtLoad
            });

            // Ensure LaunchAgents directory exists
            await fs.mkdir(this.launchAgentsDir, { recursive: true });

            // Write plist file
            await fs.writeFile(plistPath, plistContent);

            // Load the launch agent
            await execAsync(`launchctl load "${plistPath}"`);

            return {
                success: true,
                message: `Auto-start entry created for ${name}`,
                launchAgentName,
                plistPath,
                appPath,
                executablePath,
                loaded: true
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to create auto-start entry: ${error.message}`,
                error: error.message
            };
        }
    }

    async removeAutoStartEntry(name) {
        try {
            const launchAgentName = `com.installation-up-4evr.${name.toLowerCase().replace(/\s+/g, '-')}`;
            const plistPath = path.join(this.launchAgentsDir, `${launchAgentName}.plist`);

            // Unload the launch agent
            try {
                await execAsync(`launchctl unload "${plistPath}"`);
            } catch (unloadError) {
                console.warn('Failed to unload launch agent (may not be loaded):', unloadError.message);
            }

            // Remove plist file
            await fs.unlink(plistPath);

            return {
                success: true,
                message: `Auto-start entry removed for ${name}`,
                launchAgentName,
                plistPath
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to remove auto-start entry: ${error.message}`,
                error: error.message
            };
        }
    }

    async getAutoStartEntries() {
        try {
            // Get all launch agents from multiple directories
            const userAgentsDir = this.launchAgentsDir;
            const systemAgentsDir = '/Library/LaunchAgents';
            const systemDaemonsDir = '/Library/LaunchDaemons';
            
            const entries = [];
            
            // Check user launch agents
            try {
                const userFiles = await fs.readdir(userAgentsDir);
                const userPlists = userFiles.filter(file => file.endsWith('.plist'));
                
                for (const file of userPlists) {
                    try {
                        const plistPath = path.join(userAgentsDir, file);
                        const content = await fs.readFile(plistPath, 'utf8');
                        
                        // Parse basic info from plist
                        const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
                        const programMatch = content.match(/<key>Program<\/key>\s*<string>([^<]+)<\/string>/);
                        const descriptionMatch = content.match(/<key>ServiceDescription<\/key>\s*<string>([^<]+)<\/string>/);
                        
                        entries.push({
                            name: file.replace('.plist', ''),
                            label: labelMatch ? labelMatch[1] : 'Unknown',
                            program: programMatch ? programMatch[1] : 'Unknown',
                            description: descriptionMatch ? descriptionMatch[1] : null,
                            plistPath,
                            type: 'User Agent',
                            loaded: await this.isLaunchAgentLoaded(labelMatch ? labelMatch[1] : ''),
                            managedByTool: file.startsWith('com.installation-up-4evr.')
                        });
                    } catch (parseError) {
                        console.warn(`Failed to parse user launch agent ${file}:`, parseError.message);
                    }
                }
            } catch (userError) {
                console.warn('Could not read user launch agents:', userError.message);
            }
            
            // Check system launch agents (read-only)
            try {
                const systemFiles = await fs.readdir(systemAgentsDir);
                const systemPlists = systemFiles.filter(file => file.endsWith('.plist'));
                
                for (const file of systemPlists.slice(0, 10)) { // Limit to first 10 to avoid overwhelming
                    try {
                        const plistPath = path.join(systemAgentsDir, file);
                        const content = await fs.readFile(plistPath, 'utf8');
                        
                        // Parse basic info from plist
                        const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
                        const programMatch = content.match(/<key>Program<\/key>\s*<string>([^<]+)<\/string>/);
                        const descriptionMatch = content.match(/<key>ServiceDescription<\/key>\s*<string>([^<]+)<\/string>/);
                        
                        entries.push({
                            name: file.replace('.plist', ''),
                            label: labelMatch ? labelMatch[1] : 'Unknown',
                            program: programMatch ? programMatch[1] : 'Unknown',
                            description: descriptionMatch ? descriptionMatch[1] : null,
                            plistPath,
                            type: 'System Agent',
                            loaded: await this.isLaunchAgentLoaded(labelMatch ? labelMatch[1] : ''),
                            managedByTool: false
                        });
                    } catch (parseError) {
                        console.warn(`Failed to parse system launch agent ${file}:`, parseError.message);
                    }
                }
            } catch (systemError) {
                console.warn('Could not read system launch agents:', systemError.message);
            }
            
            // Also get running launch agents from launchctl list
            try {
                const { stdout } = await execAsync('launchctl list');
                const lines = stdout.split('\n').slice(1); // Skip header
                
                for (const line of lines) {
                    if (!line.trim()) continue;
                    
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        const pid = parts[0];
                        const status = parts[1];
                        const label = parts[2];
                        
                        // Only add if not already in our list
                        if (!entries.find(e => e.label === label)) {
                            entries.push({
                                name: label,
                                label: label,
                                program: 'Unknown',
                                plistPath: 'System managed',
                                type: 'Running Service',
                                loaded: pid !== '-',
                                pid: pid !== '-' ? parseInt(pid) : null,
                                status: parseInt(status),
                                managedByTool: false
                            });
                        }
                    }
                }
            } catch (launchctlError) {
                console.warn('Could not get launchctl list:', launchctlError.message);
            }

            return entries;
        } catch (error) {
            console.error('Failed to get auto-start entries:', error);
            return [];
        }
    }

    // Helper methods
    extractAppName(commandLine) {
        // Extract application name from command line
        const appMatch = commandLine.match(/([^\/]+)\.app/);
        if (appMatch) {
            return appMatch[1];
        }
        
        // Fallback to first part of command
        const parts = commandLine.split(' ');
        return path.basename(parts[0]);
    }

    generateLaunchAgentPlist(config) {
        const {
            label,
            program,
            description,
            startInterval,
            keepAlive,
            runAtLoad
        } = config;

        let plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    <key>Program</key>
    <string>${program}</string>`;

        if (description) {
            plist += `
    <key>ServiceDescription</key>
    <string>${description}</string>`;
        }

        if (runAtLoad) {
            plist += `
    <key>RunAtLoad</key>
    <true/>`;
        }

        if (keepAlive) {
            plist += `
    <key>KeepAlive</key>
    <true/>`;
        }

        if (startInterval) {
            plist += `
    <key>StartInterval</key>
    <integer>${startInterval}</integer>`;
        }

        plist += `
    <key>StandardOutPath</key>
    <string>/tmp/${label}.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/${label}.err</string>
</dict>
</plist>`;

        return plist;
    }

    async isLaunchAgentLoaded(label) {
        try {
            const { stdout } = await execAsync('launchctl list');
            return stdout.includes(label);
        } catch (error) {
            return false;
        }
    }

    /**
     * Test a launch agent to verify it works correctly
     */
    async testLaunchAgent(label) {
        try {
            const plistPath = path.join(this.launchAgentsDir, `${label}.plist`);
            
            // Check if plist file exists
            try {
                await fs.access(plistPath);
            } catch (error) {
                return {
                    success: false,
                    message: `Launch agent plist not found: ${plistPath}`,
                    data: { warnings: ['Plist file does not exist'] }
                };
            }

            // Check if agent is loaded
            const isLoaded = await this.isLaunchAgentLoaded(label);
            
            // Test loading the plist syntax
            try {
                const { stdout, stderr } = await execAsync(`plutil -lint "${plistPath}"`);
                const warnings = [];
                
                if (!isLoaded) {
                    warnings.push('Launch agent is not currently loaded');
                }
                
                // Try to get agent status
                let agentStatus = 'unknown';
                try {
                    const { stdout: statusOutput } = await execAsync(`launchctl list | grep "${label}"`);
                    if (statusOutput.trim()) {
                        agentStatus = 'running';
                    }
                } catch (error) {
                    agentStatus = 'stopped';
                }

                return {
                    success: true,
                    message: 'Launch agent test completed',
                    data: {
                        output: `Plist syntax: Valid\nAgent loaded: ${isLoaded ? 'Yes' : 'No'}\nAgent status: ${agentStatus}`,
                        warnings: warnings.length > 0 ? warnings : undefined,
                        agentLoaded: isLoaded,
                        agentStatus
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    message: 'Plist file has syntax errors',
                    data: { 
                        output: error.message,
                        warnings: ['Plist file is malformed']
                    }
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to test launch agent: ${error.message}`,
                data: { output: error.message }
            };
        }
    }

    /**
     * Export a launch agent plist file for download
     */
    async exportLaunchAgent(label) {
        try {
            const plistPath = path.join(this.launchAgentsDir, `${label}.plist`);
            
            try {
                const content = await fs.readFile(plistPath, 'utf8');
                return {
                    success: true,
                    message: 'Launch agent exported successfully',
                    data: {
                        content,
                        filename: `${label}.plist`,
                        plistContent: content
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Failed to read plist file: ${error.message}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to export launch agent: ${error.message}`
            };
        }
    }

    /**
     * View a launch agent plist content
     */
    async viewLaunchAgent(label) {
        try {
            const plistPath = path.join(this.launchAgentsDir, `${label}.plist`);
            
            try {
                const content = await fs.readFile(plistPath, 'utf8');
                return {
                    success: true,
                    data: {
                        content,
                        path: plistPath
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    message: `Failed to read plist file: ${error.message}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Failed to view launch agent: ${error.message}`
            };
        }
    }

    /**
     * Update a launch agent plist content
     */
    async updateLaunchAgent(label, content) {
        try {
            const plistPath = path.join(this.launchAgentsDir, `${label}.plist`);
            
            // Validate plist content by trying to parse it
            try {
                // Create a temporary file to test the content
                const tempPath = path.join(os.tmpdir(), `test-${Date.now()}.plist`);
                await fs.writeFile(tempPath, content);
                
                // Test the plist syntax
                await execAsync(`plutil -lint "${tempPath}"`);
                
                // Clean up temp file
                await fs.unlink(tempPath);
            } catch (error) {
                return {
                    success: false,
                    message: `Invalid plist content: ${error.message}`
                };
            }

            // Check if agent is currently loaded
            const wasLoaded = await this.isLaunchAgentLoaded(label);
            
            // If loaded, unload it first
            if (wasLoaded) {
                try {
                    await execAsync(`launchctl unload "${plistPath}"`);
                } catch (error) {
                    console.warn(`Warning: Could not unload agent before update: ${error.message}`);
                }
            }
            
            // Write the new content
            await fs.writeFile(plistPath, content);
            
            // Reload if it was previously loaded
            if (wasLoaded) {
                try {
                    await execAsync(`launchctl load "${plistPath}"`);
                } catch (error) {
                    return {
                        success: false,
                        message: `Plist updated but failed to reload: ${error.message}`
                    };
                }
            }
            
            return {
                success: true,
                message: 'Launch agent updated successfully',
                data: { reloaded: wasLoaded }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to update launch agent: ${error.message}`
            };
        }
    }

    /**
     * Start a launch agent
     */
    async startLaunchAgent(label) {
        try {
            const plistPath = path.join(this.launchAgentsDir, `${label}.plist`);
            
            // Check if plist exists
            try {
                await fs.access(plistPath);
            } catch (error) {
                return {
                    success: false,
                    message: `Launch agent plist not found: ${plistPath}`
                };
            }
            
            // Load the launch agent
            const { stdout, stderr } = await execAsync(`launchctl load "${plistPath}"`);
            
            return {
                success: true,
                message: `Launch agent ${label} started successfully`,
                data: { output: stdout }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to start launch agent: ${error.message}`
            };
        }
    }

    /**
     * Stop a launch agent
     */
    async stopLaunchAgent(label) {
        try {
            const plistPath = path.join(this.launchAgentsDir, `${label}.plist`);
            
            // Unload the launch agent
            const { stdout, stderr } = await execAsync(`launchctl unload "${plistPath}"`);
            
            return {
                success: true,
                message: `Launch agent ${label} stopped successfully`,
                data: { output: stdout }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to stop launch agent: ${error.message}`
            };
        }
    }

    /**
     * Restart a launch agent
     */
    async restartLaunchAgent(label) {
        try {
            // Stop first
            const stopResult = await this.stopLaunchAgent(label);
            if (!stopResult.success) {
                console.warn(`Warning during stop: ${stopResult.message}`);
            }
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Start again
            const startResult = await this.startLaunchAgent(label);
            
            return {
                success: startResult.success,
                message: startResult.success ? 
                    `Launch agent ${label} restarted successfully` : 
                    startResult.message,
                data: { 
                    stopOutput: stopResult.data?.output,
                    startOutput: startResult.data?.output 
                }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to restart launch agent: ${error.message}`
            };
        }
    }

    /**
     * Remove/delete a launch agent
     */
    async removeLaunchAgent(label) {
        try {
            const plistPath = path.join(this.launchAgentsDir, `${label}.plist`);
            
            // Check if plist exists
            try {
                await fs.access(plistPath);
            } catch (error) {
                return {
                    success: false,
                    message: `Launch agent plist not found: ${plistPath}`
                };
            }
            
            // Stop the agent first if it's running
            try {
                await this.stopLaunchAgent(label);
            } catch (error) {
                console.warn(`Warning: Could not stop agent before removal: ${error.message}`);
            }
            
            // Delete the plist file
            await fs.unlink(plistPath);
            
            return {
                success: true,
                message: `Launch agent ${label} deleted successfully`,
                data: { removedFile: plistPath }
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to delete launch agent: ${error.message}`
            };
        }
    }
}

module.exports = MacOSProcessManager;