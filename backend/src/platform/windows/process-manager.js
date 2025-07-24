/**
 * Windows Process Manager
 * Platform-specific process and application management for Windows
 * Primarily uses PM2 for consistency with macOS implementation
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const pm2 = require('pm2');
const { ProcessManagerInterface } = require('../../core/interfaces');

const execAsync = util.promisify(exec);

class WindowsProcessManager extends ProcessManagerInterface {
  constructor() {
    super();
    this.platform = 'windows';
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
   * Get the executable path - Windows doesn't have .app bundles like macOS
   */
  async getExecutablePath(appPath) {
    // For Windows, the path is usually directly to the .exe file
    if (appPath.endsWith('.exe')) {
      return appPath;
    }

    // If it's a directory, look for common executable names
    try {
      const stats = await fs.stat(appPath);
      if (stats.isDirectory()) {
        // Look for common executable patterns
        const commonNames = [
          path.basename(appPath) + '.exe',
          'main.exe',
          'app.exe',
          'launcher.exe'
        ];

        for (const name of commonNames) {
          const execPath = path.join(appPath, name);
          try {
            await fs.access(execPath);
            return execPath;
          } catch (error) {
            // Continue looking
          }
        }

        // If no standard executable found, return the directory path
        console.warn(`No executable found in directory ${appPath}, using directory path`);
        return appPath;
      }
    } catch (error) {
      console.warn(`Could not access path ${appPath}:`, error.message);
    }

    // Return the original path if we can't determine anything else
    return appPath;
  }

  async startApplication(appPath, options = {}) {
    try {
      const { background = true, arguments: args = [] } = options;

      // Get the actual executable path
      const executablePath = await this.getExecutablePath(appPath);

      // Build command with arguments
      const argString = args.length > 0 ? ` ${args.join(' ')}` : '';
      const command = `"${executablePath}"${argString}`;

      // On Windows, we can use 'start' command to run in background
      const finalCommand = background ? `start "" "${executablePath}"${argString}` : command;

      const { stdout, stderr } = await execAsync(finalCommand, { shell: true });

      return {
        success: true,
        message: `Application started: ${path.basename(executablePath)}`,
        command: finalCommand,
        output: stdout,
        stderr: stderr || null
      };
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
      // Use taskkill to stop processes on Windows
      const { stdout } = await execAsync(`tasklist /fi "imagename eq ${appName}" /fo csv`);
      const lines = stdout.split('\n').filter(line => line.includes(appName));

      if (lines.length <= 1) { // Only header line means no processes
        return {
          success: false,
          message: `No running processes found for: ${appName}`
        };
      }

      // Kill the processes
      await execAsync(`taskkill /f /im "${appName}"`);

      return {
        success: true,
        message: `Stopped processes for: ${appName}`,
        processCount: lines.length - 1 // Subtract header line
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
      await new Promise(resolve => setTimeout(resolve, 2000));

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
      // Get running applications using tasklist
      const { stdout } = await execAsync('tasklist /fo csv');
      const lines = stdout.split('\n').slice(1); // Skip header

      const applications = [];

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          // Parse CSV line (Image Name, PID, Session Name, Session#, Mem Usage)
          const columns = line.split('","');
          if (columns.length >= 5) {
            const name = columns[0].replace(/^"/, '');
            const pid = parseInt(columns[1]);
            const sessionName = columns[2];
            const memoryStr = columns[4].replace(/"$/, '').replace(/,/g, '');
            const memory = parseInt(memoryStr) * 1024; // Convert from KB to bytes

            // Filter for GUI applications (usually in console session and with significant memory)
            if (sessionName === 'Console' && memory > 10 * 1024 * 1024 && name.endsWith('.exe')) {
              applications.push({
                pid: pid,
                name: name,
                command: name,
                arguments: '',
                memory: memory,
                type: 'application'
              });
            }
          }
        } catch (parseError) {
          // Skip malformed lines
          continue;
        }
      }

      // Sort by memory usage and return top applications
      applications.sort((a, b) => b.memory - a.memory);
      return applications.slice(0, 20);
    } catch (error) {
      console.error('Failed to get running applications:', error);
      return [];
    }
  }

  async createAutoStartEntry(appPath, options = {}) {
    try {
      const {
        name = path.basename(appPath, '.exe'),
        description = `PM2 managed process: ${path.basename(appPath)}`,
        args = []
      } = options;

      if (!this.pm2Connected) {
        return {
          success: false,
          message: 'PM2 not connected'
        };
      }

      // Get the correct executable path
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
          },
          // Windows-specific settings
          max_memory_restart: '500M', // Restart if memory usage exceeds 500MB
          error_file: path.join(os.tmpdir(), `${name}.error.log`),
          out_file: path.join(os.tmpdir(), `${name}.out.log`),
          log_file: path.join(os.tmpdir(), `${name}.log`)
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
            label: proc.name,
            program: proc.pm2_env.pm_exec_path,
            description: proc.pm2_env.description || `PM2 managed process: ${proc.name}`,
            plistPath: 'Managed by PM2',
            type: proc.pm2_env.exec_mode === 'fork_mode' ? 'GUI Application' : 'Background Process',
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
    const parts = commandLine.split(' ');
    return path.basename(parts[0], '.exe');
  }

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
   * Export PM2 process config
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
   * Update PM2 process (not supported via content editing)
   */
  async updatePM2Process(label, content) {
    return {
      success: false,
      message: 'PM2 process configuration update not supported via content editing. Use PM2 CLI or restart process.'
    };
  }

  /**
   * Start a PM2 process
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
   * Stop a PM2 process
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
   * Restart a PM2 process
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
   * Remove/delete a PM2 process
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
            this.logger.application(2, `PM2 process removed successfully: ${label}`, {
              label,
              action: 'remove_pm2_process_success'
            });
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
   * Create a web application PM2 process (Windows version)
   */
  async createWebAppPM2Process(name, url, browserPath, options = {}) {
    // Log the PM2 process creation attempt
    if (this.logger) {
      await this.logger.application(1, `Creating web app PM2 process: ${name}`, {
        name,
        url,
        browserPath,
        options,
        action: 'create_web_app_pm2_process'
      });
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

      // Get the actual executable path from the browser
      const executablePath = await this.getExecutablePath(browserPath);

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

      // Create PM2 process configuration
      const pm2Config = {
        name: label,
        script: executablePath,
        args: args,
        cwd: os.homedir(),
        autorestart: options.keepAlive || false,
        max_restarts: options.keepAlive ? 10 : 0,
        restart_delay: 5000,
        log_file: path.join(os.tmpdir(), `${label}.log`),
        error_file: path.join(os.tmpdir(), `${label}.error.log`),
        out_file: path.join(os.tmpdir(), `${label}.out.log`),
        env: {
          NODE_ENV: 'production',
          WEB_APP_URL: url,
          WEB_APP_NAME: name
        }
      };

      // Start the PM2 process
      return new Promise((resolve, reject) => {
        pm2.start(pm2Config, (err, apps) => {
          if (err) {
            console.error(`[PM2] Failed to start ${label}:`, err);
            if (this.logger) {
              this.logger.application(3, `Failed to create web app PM2 process: ${name}`, {
                name,
                url,
                browserPath,
                executablePath,
                error: err.message,
                action: 'create_web_app_pm2_process_error'
              });
            }
            resolve({
              success: false,
              message: `Failed to create PM2 process: ${err.message}`
            });
          } else {
            // Log successful creation
            if (this.logger) {
              this.logger.application(1, `Web app PM2 process created successfully: ${name}`, {
                name,
                label,
                url,
                browserPath,
                executablePath,
                pm2Id: apps[0]?.pm_id,
                action: 'create_web_app_pm2_process_success'
              });
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
        await this.logger.application(3, `Failed to create web app PM2 process: ${name}`, {
          name,
          url,
          browserPath,
          error: error.message,
          action: 'create_web_app_pm2_process_error'
        });
      }

      return {
        success: false,
        message: `Failed to create web app PM2 process: ${error.message}`
      };
    }
  }

  extractWebAppInfo(processContent) {
    try {
      // Check if this is a browser-based process configuration
      if (
        processContent.includes('chrome.exe') ||
        processContent.includes('msedge.exe') ||
        processContent.includes('firefox.exe') ||
        processContent.includes('--kiosk') ||
        processContent.includes('--app=') ||
        processContent.includes('browser')
      ) {
        // Extract URL if present
        const urlMatch = processContent.match(/--app=(https?:\/\/[^\s"]+)/i) || 
                        processContent.match(/(https?:\/\/[^\s"]+)/i);
        const kioskMatch = processContent.includes('--kiosk');

        let browser = 'browser';
        if (processContent.includes('chrome')) browser = 'chrome';
        else if (processContent.includes('edge')) browser = 'edge';
        else if (processContent.includes('firefox')) browser = 'firefox';

        return {
          isWebApp: true,
          url: urlMatch ? urlMatch[1] : null,
          isKioskMode: kioskMatch,
          browser: browser
        };
      }

      return null; // Not a web app process
    } catch (error) {
      console.warn('Error extracting web app info:', error.message);
      return null;
    }
  }
}

module.exports = WindowsProcessManager;