/**
 * macOS Process Manager
 * Platform-specific process and application management for macOS
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const pm2 = require('pm2');
const { ProcessManagerInterface } = require('../../core/interfaces');

const execAsync = util.promisify(exec);

class MacOSProcessManager extends ProcessManagerInterface {
  constructor() {
    super();
    this.platform = 'macos';
    this.launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents'); // Legacy directory for compatibility
    this.logger = null;
    this.pm2Connected = false;

    // Connect to PM2
    this.initializePM2();
  }

  /**
   * Initialize PM2 connection
   */
  async initializePM2() {
    return new Promise((resolve, reject) => {
      pm2.connect(err => {
        if (err) {
          console.error('[PM2] Connection Error:', err);
          this.pm2Connected = false;
          resolve(false); // Don't fail constructor, just log error
        } else {
          console.log('[PM2] Connected successfully');
          this.pm2Connected = true;
          resolve(true);
        }
      });
    });
  }

  /**
   * Disconnect from PM2 (for graceful shutdown)
   */
  async shutdownPM2() {
    if (this.pm2Connected) {
      return new Promise(resolve => {
        pm2.disconnect(() => {
          console.log('[PM2] Disconnected');
          this.pm2Connected = false;
          resolve();
        });
      });
    }
  }

  /**
   * Inject logger for structured logging
   */
  setLogger(logger) {
    this.logger = logger;
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
      const pids = stdout
        .trim()
        .split('\n')
        .filter(pid => pid);

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
        description = `PM2 managed process: ${path.basename(appPath)}`,
        args = []
      } = options;

      if (!this.pm2Connected) {
        return {
          success: false,
          message: 'PM2 not connected'
        };
      }

      // Get the correct executable path for .app bundles
      const executablePath = await this.getExecutablePath(appPath);

      return new Promise(resolve => {
        const pm2Config = {
          name: name,
          script: executablePath,
          args: args,
          autorestart: options.keepAlive !== false,
          watch: false,
          env: {
            ...process.env,
            PM2_MANAGED: 'true',
            INSTALLATION_UP_4EVR: 'true'
          }
        };

        pm2.start(pm2Config, (err, apps) => {
          if (err) {
            resolve({
              success: false,
              message: `Failed to create PM2 process: ${err.message}`,
              error: err.message
            });
          } else {
            // Save PM2 process list to disk
            pm2.save(saveErr => {
              if (saveErr) {
                console.warn('[PM2] Failed to save process list:', saveErr);
              }
            });

            resolve({
              success: true,
              message: `Auto-start entry created for ${name}`,
              name: name,
              appPath,
              executablePath,
              pm2_id: apps.length > 0 ? apps[0].pm_id : null,
              loaded: true
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        message: `Failed to create auto-start entry: ${error.message}`,
        error: error.message
      };
    }
  }

  async removeAutoStartEntry(name) {
    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected'
        });
        return;
      }

      pm2.delete(name, err => {
        if (err) {
          resolve({
            success: false,
            message: `Failed to remove PM2 process: ${err.message}`,
            error: err.message
          });
        } else {
          resolve({
            success: true,
            message: `Auto-start entry removed for ${name}`,
            processName: name
          });
        }
      });
    });
  }

  async getAutoStartEntries() {
    try {
      // Get all processes from PM2
      return new Promise((resolve, reject) => {
        if (!this.pm2Connected) {
          console.warn('[PM2] Not connected, returning empty list');
          resolve([]);
          return;
        }

        pm2.list((err, list) => {
          if (err) {
            console.error('[PM2] Failed to list processes:', err);
            resolve([]);
            return;
          }

          // Transform PM2 data to match expected format
          const transformedList = list.map(proc => ({
            name: proc.name,
            label: proc.name, // Use name for label for consistency
            program: proc.pm2_env.pm_exec_path,
            description:
              proc.pm2_env.description || `PM2 managed process: ${proc.name}`,
            plistPath: 'Managed by PM2', // This is no longer a .plist
            type:
              proc.pm2_env.exec_mode === 'fork_mode'
                ? 'GUI Application'
                : 'Background Process',
            loaded: proc.pm2_env.status === 'online',
            isRunning: proc.pm2_env.status === 'online',
            pid: proc.pid,
            cpu: proc.monit.cpu,
            memory: proc.monit.memory,
            restarts: proc.pm2_env.restart_time,
            managedByTool: true,
            // Additional PM2-specific data
            pm2_id: proc.pm_id,
            status: proc.pm2_env.status,
            uptime: proc.pm2_env.pm_uptime,
            mode: proc.pm2_env.exec_mode
          }));

          resolve(transformedList);
        });
      });
    } catch (error) {
      console.error('[PM2] Failed to get auto-start entries:', error);
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

  // Legacy plist generation removed - replaced with PM2 management

  // Legacy isLaunchAgentLoaded removed - replaced with PM2 status checking

  /**
   * Test a PM2 process to verify it works correctly
   */
  async testPM2Process(label) {
    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected',
          data: { warnings: ['PM2 service is not available'] }
        });
        return;
      }

      pm2.describe(label, (err, processDescription) => {
        if (err) {
          resolve({
            success: false,
            message: `Process not found: ${label}`,
            data: { warnings: ['Process is not managed by PM2'] }
          });
        } else if (processDescription.length === 0) {
          resolve({
            success: false,
            message: `Process not found: ${label}`,
            data: { warnings: ['Process does not exist in PM2'] }
          });
        } else {
          const proc = processDescription[0];
          const warnings = [];

          if (proc.pm2_env.status !== 'online') {
            warnings.push(`Process is ${proc.pm2_env.status}, not running`);
          }

          resolve({
            success: true,
            message: 'PM2 process test completed',
            data: {
              output: `Process name: ${proc.name}\nStatus: ${proc.pm2_env.status}\nPID: ${proc.pid || 'N/A'}\nCPU: ${proc.monit.cpu}%\nMemory: ${Math.round(proc.monit.memory / 1024 / 1024)}MB`,
              warnings: warnings.length > 0 ? warnings : undefined,
              processLoaded: proc.pm2_env.status === 'online',
              processStatus: proc.pm2_env.status,
              pm2_id: proc.pm_id,
              cpu: proc.monit.cpu,
              memory: proc.monit.memory
            }
          });
        }
      });
    });
  }

  /**
   * PM2 process description (replaces view/export functionality)
   */
  async viewPM2Process(label) {
    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected'
        });
        return;
      }

      pm2.describe(label, (err, processDescription) => {
        if (err || processDescription.length === 0) {
          resolve({
            success: false,
            message: `Process not found: ${label}`
          });
        } else {
          const proc = processDescription[0];
          resolve({
            success: true,
            data: {
              content: JSON.stringify(proc, null, 2),
              path: `PM2 Process: ${label}`,
              processInfo: {
                name: proc.name,
                script: proc.pm2_env.pm_exec_path,
                status: proc.pm2_env.status,
                pid: proc.pid,
                cpu: proc.monit.cpu,
                memory: proc.monit.memory,
                restarts: proc.pm2_env.restart_time,
                uptime: proc.pm2_env.pm_uptime
              }
            }
          });
        }
      });
    });
  }

  /**
   * Export PM2 process config (replaces plist export)
   */
  async exportPM2Process(label) {
    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected'
        });
        return;
      }

      pm2.describe(label, (err, processDescription) => {
        if (err || processDescription.length === 0) {
          resolve({
            success: false,
            message: `Process not found: ${label}`
          });
        } else {
          const proc = processDescription[0];
          const exportData = {
            name: proc.name,
            script: proc.pm2_env.pm_exec_path,
            args: proc.pm2_env.args || [],
            autorestart: proc.pm2_env.autorestart,
            watch: proc.pm2_env.watch,
            env: proc.pm2_env.env || {}
          };

          resolve({
            success: true,
            message: 'PM2 process config exported successfully',
            data: {
              content: JSON.stringify(exportData, null, 2),
              filename: `${label}-pm2-config.json`,
              plistContent: JSON.stringify(exportData, null, 2)
            }
          });
        }
      });
    });
  }

  /**
   * Update PM2 process (replaces plist update)
   */
  async updatePM2Process(label, content) {
    return {
      success: false,
      message:
        'PM2 process configuration update not supported via content editing. Use PM2 CLI or restart process.'
    };
  }

  /**
   * Start a launch agent
   */
  async startPM2Process(label) {
    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected'
        });
        return;
      }

      pm2.start(label, (err, proc) => {
        if (err) {
          resolve({
            success: false,
            message: `Failed to start process: ${err.message}`
          });
        } else {
          resolve({
            success: true,
            message: `Process ${label} started successfully`,
            data: { pm2_id: proc.length > 0 ? proc[0].pm_id : null }
          });
        }
      });
    });
  }

  /**
   * Stop a launch agent
   */
  async stopPM2Process(label) {
    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected'
        });
        return;
      }

      pm2.stop(label, err => {
        if (err) {
          resolve({
            success: false,
            message: `Failed to stop process: ${err.message}`
          });
        } else {
          resolve({
            success: true,
            message: `Process ${label} stopped successfully`
          });
        }
      });
    });
  }

  /**
   * Restart a launch agent
   */
  async restartPM2Process(label) {
    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected'
        });
        return;
      }

      pm2.restart(label, err => {
        if (err) {
          resolve({
            success: false,
            message: `Failed to restart process: ${err.message}`
          });
        } else {
          resolve({
            success: true,
            message: `Process ${label} restarted successfully`
          });
        }
      });
    });
  }

  /**
   * Remove/delete a launch agent
   */
  async removePM2Process(label) {
    // Log the process removal attempt
    if (this.logger) {
      await this.logger.application(2, `Removing PM2 process: ${label}`, {
        label,
        action: 'remove_pm2_process'
      });
    }

    return new Promise(resolve => {
      if (!this.pm2Connected) {
        resolve({
          success: false,
          message: 'PM2 not connected'
        });
        return;
      }

      pm2.delete(label, err => {
        if (err) {
          resolve({
            success: false,
            message: `Failed to delete process: ${err.message}`
          });
        } else {
          // Log successful removal
          if (this.logger) {
            this.logger.application(
              2,
              `PM2 process removed successfully: ${label}`,
              {
                label,
                action: 'remove_pm2_process_success'
              }
            );
          }

          resolve({
            success: true,
            message: `Process ${label} deleted successfully`
          });
        }
      });
    });
  }

  /**
   * Extract web app information from launch agent plist content
   * This looks for Chrome/browser-specific launch agent patterns
   */
  /**
   * Create a web application PM2 process
   */
  async createWebAppPM2Process(name, url, browserPath, options = {}) {
    // Log the PM2 process creation attempt
    if (this.logger) {
      await this.logger.application(
        1,
        `Creating web app PM2 process: ${name}`,
        {
          name,
          url,
          browserPath,
          options,
          action: 'create_web_app_pm2_process'
        }
      );
    }

    try {
      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        return {
          success: false,
          message: `Invalid URL: ${url}`
        };
      }

      // Ensure PM2 is connected
      if (!this.pm2Connected) {
        await this.initializePM2();
        if (!this.pm2Connected) {
          return {
            success: false,
            message: 'PM2 connection failed'
          };
        }
      }

      // Create safe label
      const label = name.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();

      // Get the actual executable path from the browser app bundle
      const executablePath = await this.getExecutablePath(browserPath);

      // Debug logging
      console.log('[PM2-DEBUG] Browser path:', browserPath);
      console.log('[PM2-DEBUG] Executable path:', executablePath);

      // Build browser arguments
      const args = [];

      if (options.kioskMode) {
        args.push('--kiosk');
      }

      if (options.disableDevTools) {
        args.push('--disable-dev-tools');
      }

      if (options.disableExtensions) {
        args.push('--disable-extensions');
      }

      if (options.incognitoMode) {
        args.push('--incognito');
      }

      // Add standard args for kiosk environments
      args.push('--no-first-run');
      args.push('--disable-default-apps');
      args.push('--disable-popup-blocking');
      args.push('--disable-infobars');
      args.push(url);

      // For executables with spaces, PM2 sometimes has issues
      // Use shell execution mode with proper escaping
      const quotedPath = `"${executablePath}"`;
      const command = `${quotedPath} ${args.map(arg => `"${arg}"`).join(' ')}`;

      // Debug logging
      console.log('[PM2-DEBUG] Command to execute:', command);

      // Create PM2 process configuration using shell mode
      const pm2Config = {
        name: label,
        script: '/bin/bash',
        args: ['-c', command],
        cwd: os.homedir(),
        autorestart: options.keepAlive || false,
        max_restarts: options.keepAlive ? 10 : 0,
        restart_delay: 5000,
        log_file: `/tmp/${label}.log`,
        error_file: `/tmp/${label}.error.log`,
        out_file: `/tmp/${label}.out.log`,
        env: {
          NODE_ENV: 'production',
          WEB_APP_URL: url,
          WEB_APP_NAME: name
        }
      };

      // Debug logging
      console.log(
        '[PM2-DEBUG] PM2 Config:',
        JSON.stringify(pm2Config, null, 2)
      );

      // Start the PM2 process
      return new Promise((resolve, reject) => {
        pm2.start(pm2Config, (err, apps) => {
          if (err) {
            console.error(`[PM2] Failed to start ${label}:`, err);
            if (this.logger) {
              this.logger.application(
                3,
                `Failed to create web app PM2 process: ${name}`,
                {
                  name,
                  url,
                  browserPath,
                  executablePath,
                  error: err.message,
                  action: 'create_web_app_pm2_process_error'
                }
              );
            }
            resolve({
              success: false,
              message: `Failed to create PM2 process: ${err.message}`
            });
          } else {
            // Log successful creation
            if (this.logger) {
              this.logger.application(
                1,
                `Web app PM2 process created successfully: ${name}`,
                {
                  name,
                  label,
                  url,
                  browserPath,
                  executablePath,
                  pm2Id: apps[0]?.pm_id,
                  action: 'create_web_app_pm2_process_success'
                }
              );
            }

            resolve({
              success: true,
              message: `Web application PM2 process created: ${name}`,
              data: {
                label,
                pm2Id: apps[0]?.pm_id,
                url,
                browserPath,
                executablePath,
                processType: 'web-app'
              }
            });
          }
        });
      });
    } catch (error) {
      // Log creation failure
      if (this.logger) {
        await this.logger.application(
          3,
          `Failed to create web app PM2 process: ${name}`,
          {
            name,
            url,
            browserPath,
            executablePath: executablePath || 'Failed to determine',
            error: error.message,
            action: 'create_web_app_pm2_process_error'
          }
        );
      }

      return {
        success: false,
        message: `Failed to create web app PM2 process: ${error.message}`
      };
    }
  }

  extractWebAppInfo(plistContent) {
    try {
      // Check if this is a Chrome kiosk mode or browser-based launch agent
      if (
        plistContent.includes('google-chrome') ||
        plistContent.includes('Google Chrome') ||
        plistContent.includes('--kiosk') ||
        plistContent.includes('--app=') ||
        plistContent.includes('browser')
      ) {
        // Extract URL if present
        const urlMatch = plistContent.match(/--app=(https?:\/\/[^\s<]+)/i);
        const kioskMatch = plistContent.includes('--kiosk');

        return {
          isWebApp: true,
          url: urlMatch ? urlMatch[1] : null,
          isKioskMode: kioskMatch,
          browser: plistContent.includes('google-chrome') ? 'chrome' : 'browser'
        };
      }

      return null; // Not a web app launch agent
    } catch (error) {
      console.warn('Error extracting web app info:', error.message);
      return null;
    }
  }
}

module.exports = MacOSProcessManager;
