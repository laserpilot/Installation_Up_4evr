/**
 * Installation Up 4evr - Electron Main Process
 * Handles native macOS integration, file access, and privilege escalation
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');
const sudo = require('sudo-prompt');

// Create a log file for debugging
const os = require('os');
const logPath = path.join(os.homedir(), 'installation-up-4evr-debug.log');
function debugLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    // Only write to log file, not console, to avoid stdio interference
    require('fs').appendFileSync(logPath, logMessage);
}

debugLog('Installation Up 4evr starting...');

class InstallationUp4evrApp {
    constructor() {
        this.mainWindow = null;
        this.backendServer = null;
        
        // CRITICAL: Prevent multiple instances
        if (!this.enforceingleInstance()) {
            return;
        }
        
        this.setupApp();
    }

    enforceingleInstance() {
        const gotTheLock = app.requestSingleInstanceLock();
        
        if (!gotTheLock) {
            debugLog('Another instance is already running - quitting this instance');
            app.quit();
            return false;
        }
        
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            debugLog('Second instance attempted to start - focusing existing window');
            // Someone tried to run a second instance, focus our window instead
            if (this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.focus();
            }
        });
        
        return true;
    }

    setupApp() {
        // App event handlers
        app.whenReady().then(() => this.createWindow());
        
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanup();
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('before-quit', () => {
            this.cleanup();
        });

        // IPC handlers
        this.setupIpcHandlers();
    }

    async createWindow() {
        // Start backend server
        await this.startBackendServer();

        // Create main window
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 1000,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            titleBarStyle: 'hiddenInset',
            title: 'Installation Up 4evr',
            icon: path.join(__dirname, 'assets', 'icon.png')
        });

        // Load the frontend
        const isDev = process.env.NODE_ENV === 'development';
        const url = isDev ? 'http://localhost:3001' : `file://${path.join(__dirname, '../frontend/index.html')}`;
        
        await this.mainWindow.loadURL(url);

        // Open DevTools in development
        if (isDev) {
            this.mainWindow.webContents.openDevTools();
        }

        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: 'deny' };
        });
    }

    async startBackendServer() {
        return new Promise((resolve, reject) => {
            // Fix path resolution for packaged vs development
            let serverPath;
            if (app.isPackaged) {
                // In packaged app, backend files are in extraResources
                serverPath = path.join(process.resourcesPath, 'backend', 'server.js');
            } else {
                // In development, use relative path
                serverPath = path.join(__dirname, '../backend/server.js');
            }
            
            debugLog('App is packaged: ' + app.isPackaged);
            debugLog('Process resources path: ' + process.resourcesPath);
            debugLog('Server path: ' + serverPath);
            debugLog('Node path: ' + process.execPath);
            
            // Check if server file exists
            const fs = require('fs');
            try {
                fs.accessSync(serverPath, fs.constants.F_OK);
                debugLog('Server file exists at: ' + serverPath);
            } catch (error) {
                debugLog('Server file NOT found at: ' + serverPath + ' - ' + error.message);
                reject(new Error(`Server file not found: ${serverPath}`));
                return;
            }
            
            // Use system Node.js instead of Electron executable to avoid recursive spawning
            let nodePath = 'node'; // Default to system PATH
            
            // Try common Node.js locations
            const possiblePaths = [
                '/usr/local/bin/node',
                '/opt/homebrew/bin/node',
                '/usr/bin/node'
            ];
            
            for (const testPath of possiblePaths) {
                try {
                    require('fs').accessSync(testPath, require('fs').constants.F_OK);
                    nodePath = testPath;
                    break;
                } catch (e) {
                    // Continue to next path
                }
            }
            debugLog('Using Electron bundled node executable: ' + nodePath);
            
            debugLog('Spawning server with: ' + nodePath + ' ' + JSON.stringify([serverPath]));
            debugLog('Working directory: ' + path.dirname(serverPath));
            debugLog('Environment PORT: 3001');
            
            // Test if we can execute node at all
            debugLog('Testing node executable...');
            const testSpawn = spawn(nodePath, ['--version'], { stdio: 'pipe' });
            testSpawn.stdout.on('data', (data) => {
                debugLog('Node version test successful: ' + data.toString().trim());
            });
            testSpawn.stderr.on('data', (data) => {
                debugLog('Node version test error: ' + data.toString());
            });
            testSpawn.on('error', (error) => {
                debugLog('Node version test spawn error: ' + error.message);
            });
            
            this.backendServer = spawn(nodePath, [serverPath], {
                stdio: 'pipe',
                env: { ...process.env, PORT: '3001' },
                cwd: path.dirname(serverPath)
            });

            let serverStarted = false;

            this.backendServer.stdout.on('data', (data) => {
                const output = data.toString();
                debugLog(`Backend stdout: ${output}`);
                debugLog(`Looking for: __BACKEND_READY__`);
                debugLog(`Found in output: ${output.includes('__BACKEND_READY__')}`);
                if (output.includes('__BACKEND_READY__')) {
                    if (!serverStarted) {
                        serverStarted = true;
                        debugLog('Server startup detected - resolving promise');
                        resolve();
                    }
                }
            });

            this.backendServer.stderr.on('data', (data) => {
                const errorOutput = data.toString();
                debugLog(`Backend stderr: ${errorOutput}`);
                
                // Handle common port conflict errors
                if (errorOutput.includes('EADDRINUSE') || errorOutput.includes('port 3001')) {
                    debugLog('Port 3001 is in use, server may already be running');
                    if (!serverStarted) {
                        serverStarted = true;
                        resolve(); // Continue anyway, server might be running elsewhere
                    }
                }
            });

            this.backendServer.on('error', (error) => {
                debugLog('Failed to start backend server: ' + error.message);
                debugLog('Error code: ' + error.code);
                debugLog('Error syscall: ' + error.syscall);
                debugLog('Error path: ' + error.path);
                if (!serverStarted) {
                    reject(error);
                }
            });

            this.backendServer.on('exit', (code, signal) => {
                debugLog(`Backend server exited with code ${code}, signal ${signal}`);
                if (code !== 0 && !serverStarted) {
                    debugLog('Server failed to start - will try to continue anyway');
                    // Still resolve - the server might be running elsewhere
                    resolve();
                } else if (code === 0) {
                    debugLog('Server exited successfully');
                }
            });

            this.backendServer.on('spawn', () => {
                debugLog('Backend server spawn event fired');
            });

            // Fallback timeout - give it time to start
            setTimeout(() => {
                if (!serverStarted) {
                    console.log('Backend server timeout - assuming it\'s running');
                    resolve();
                }
            }, 5000);
        });
    }

    setupIpcHandlers() {
        // File operations
        ipcMain.handle('select-app-file', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                title: 'Select Application',
                properties: ['openFile'],
                filters: [
                    { name: 'Applications', extensions: ['app'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                defaultPath: '/Applications'
            });

            if (!result.canceled && result.filePaths.length > 0) {
                return result.filePaths[0];
            }
            return null;
        });

        ipcMain.handle('get-app-info', async (event, appPath) => {
            try {
                // Make API call to backend server instead
                const response = await fetch('http://localhost:3001/api/launch-agents/app-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appPath })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                throw new Error(`Failed to get app info: ${error.message}`);
            }
        });

        // System preferences with sudo
        ipcMain.handle('apply-system-settings', async (event, settings) => {
            try {
                // Make API call to backend server instead
                const response = await fetch('http://localhost:3001/api/system-prefs/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ settings })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                throw new Error(`Failed to apply settings: ${error.message}`);
            }
        });

        // Launch agent operations
        ipcMain.handle('create-launch-agent', async (event, appPath, options) => {
            try {
                const response = await fetch('http://localhost:3001/api/launch-agents/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appPath, options })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                throw new Error(`Failed to create launch agent: ${error.message}`);
            }
        });

        ipcMain.handle('install-launch-agent', async (event, appPath, options) => {
            try {
                const response = await fetch('http://localhost:3001/api/launch-agents/install', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appPath, options })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                throw new Error(`Failed to install launch agent: ${error.message}`);
            }
        });

        // System information
        ipcMain.handle('get-system-info', async () => {
            try {
                const response = await fetch('http://localhost:3001/api/system-prefs/report');
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (error) {
                throw new Error(`Failed to get system info: ${error.message}`);
            }
        });

        // Profile operations
        ipcMain.handle('save-profile', async (event, profile) => {
            const result = await dialog.showSaveDialog(this.mainWindow, {
                title: 'Save Installation Profile',
                defaultPath: `${profile.name}.up4evr.json`,
                filters: [
                    { name: 'Up4evr Profiles', extensions: ['up4evr.json'] },
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });

            if (!result.canceled) {
                await fs.writeFile(result.filePath, JSON.stringify(profile, null, 2));
                return result.filePath;
            }
            return null;
        });

        ipcMain.handle('load-profile', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                title: 'Load Installation Profile',
                properties: ['openFile'],
                filters: [
                    { name: 'Up4evr Profiles', extensions: ['up4evr.json'] },
                    { name: 'JSON Files', extensions: ['json'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const content = await fs.readFile(result.filePaths[0], 'utf8');
                return JSON.parse(content);
            }
            return null;
        });

        // Utility functions
        ipcMain.handle('show-in-finder', async (event, filePath) => {
            shell.showItemInFolder(filePath);
        });

        ipcMain.handle('open-external', async (event, url) => {
            shell.openExternal(url);
        });
    }

    runSudoCommand(command, description) {
        return new Promise((resolve) => {
            const options = {
                name: 'Installation Up 4evr',
                icns: path.join(__dirname, 'assets', 'icon.icns')
            };

            sudo.exec(command, options, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        success: false,
                        setting: description,
                        message: `Failed to apply ${description}: ${error.message}`,
                        error: error.message
                    });
                } else {
                    resolve({
                        success: true,
                        setting: description,
                        message: `Successfully applied ${description}`,
                        output: stdout
                    });
                }
            });
        });
    }

    cleanup() {
        debugLog('Cleaning up resources...');
        if (this.backendServer && !this.backendServer.killed) {
            debugLog('Killing backend server process');
            this.backendServer.kill('SIGTERM');
            
            // Force kill after 5 seconds if it doesn't exit gracefully
            setTimeout(() => {
                if (this.backendServer && !this.backendServer.killed) {
                    debugLog('Force killing backend server process');
                    this.backendServer.kill('SIGKILL');
                }
            }, 5000);
        }
    }
}

// Create the app
new InstallationUp4evrApp();