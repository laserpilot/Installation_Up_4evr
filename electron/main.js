/**
 * Installation Up 4evr - Electron Main Process
 * Handles native macOS integration, file access, and privilege escalation
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');
const sudo = require('sudo-prompt');

// Import our backend modules
const SystemPreferencesManager = require('../backend/modules/system-prefs');
const LaunchAgentManager = require('../backend/modules/launch-agents');

class InstallationUp4evrApp {
    constructor() {
        this.mainWindow = null;
        this.backendServer = null;
        this.systemPrefs = new SystemPreferencesManager();
        this.launchAgents = new LaunchAgentManager();
        
        this.setupApp();
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
            const serverPath = path.join(__dirname, '../backend/server.js');
            this.backendServer = spawn('node', [serverPath], {
                stdio: 'pipe',
                env: { ...process.env, PORT: '3001' }
            });

            this.backendServer.stdout.on('data', (data) => {
                console.log(`Backend: ${data}`);
                if (data.toString().includes('server running')) {
                    resolve();
                }
            });

            this.backendServer.stderr.on('data', (data) => {
                console.error(`Backend Error: ${data}`);
            });

            this.backendServer.on('error', (error) => {
                console.error('Failed to start backend server:', error);
                reject(error);
            });

            // Fallback timeout
            setTimeout(resolve, 3000);
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
                return await this.launchAgents.getAppInfo(appPath);
            } catch (error) {
                throw new Error(`Failed to get app info: ${error.message}`);
            }
        });

        // System preferences with sudo
        ipcMain.handle('apply-system-settings', async (event, settings) => {
            try {
                const results = [];
                
                for (const settingId of settings) {
                    const setting = this.systemPrefs.settings[settingId];
                    if (!setting) continue;

                    if (setting.command.includes('sudo')) {
                        // Use sudo-prompt for commands requiring elevation
                        const result = await this.runSudoCommand(setting.command, setting.name);
                        results.push(result);
                    } else {
                        // Run regular commands
                        const result = await this.systemPrefs.applySetting(settingId);
                        results.push(result);
                    }
                }
                
                return results;
            } catch (error) {
                throw new Error(`Failed to apply settings: ${error.message}`);
            }
        });

        // Launch agent operations
        ipcMain.handle('create-launch-agent', async (event, appPath, options) => {
            try {
                return await this.launchAgents.createLaunchAgent(appPath, options);
            } catch (error) {
                throw new Error(`Failed to create launch agent: ${error.message}`);
            }
        });

        ipcMain.handle('install-launch-agent', async (event, appPath, options) => {
            try {
                return await this.launchAgents.installLaunchAgent(appPath, options);
            } catch (error) {
                throw new Error(`Failed to install launch agent: ${error.message}`);
            }
        });

        // System information
        ipcMain.handle('get-system-info', async () => {
            try {
                const report = await this.systemPrefs.generateSystemReport();
                const sipStatus = await this.systemPrefs.checkSIPStatus();
                const launchAgents = await this.launchAgents.listLaunchAgents();
                
                return {
                    ...report,
                    sip: sipStatus,
                    launchAgents: launchAgents
                };
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
        if (this.backendServer) {
            this.backendServer.kill();
        }
    }
}

// Create the app
new InstallationUp4evrApp();