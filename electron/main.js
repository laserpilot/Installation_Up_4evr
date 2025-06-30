/**
 * Installation Up 4evr - Electron Main Process
 * Handles native macOS integration, file access, and privilege escalation
 */

const { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage } = require('electron');
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
        this.tray = null;
        this.isQuitting = false;
        this.quitMode = 'ask'; // 'ask', 'keep-backend', 'quit-all'
        this.backendStatus = 'unknown';
        
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
        app.whenReady().then(() => {
            this.createWindow();
            this.createApplicationMenu();
            this.createTray();
        });
        
        app.on('window-all-closed', () => {
            // Always quit on non-macOS platforms
            if (process.platform !== 'darwin') {
                this.handleAppQuit();
            }
            // On macOS, we keep the app running by default (standard behavior)
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('before-quit', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.handleAppQuit();
            }
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

        // Handle window close
        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                if (this.quitMode === 'keep-backend') {
                    // Just hide the window when in keep-backend mode
                    this.mainWindow.hide();
                    this.updateTrayMenu();
                } else {
                    this.handleWindowClose();
                }
            }
        });
    }

    createApplicationMenu() {
        const template = [
            {
                label: 'Installation Up 4evr',
                submenu: [
                    {
                        label: 'About Installation Up 4evr',
                        role: 'about'
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit Mode: Keep Backend Running',
                        type: 'radio',
                        checked: this.quitMode === 'keep-backend',
                        click: () => {
                            this.quitMode = 'keep-backend';
                            this.updateMenuCheckmarks();
                        }
                    },
                    {
                        label: 'Quit Mode: Ask Each Time',
                        type: 'radio',
                        checked: this.quitMode === 'ask',
                        click: () => {
                            this.quitMode = 'ask';
                            this.updateMenuCheckmarks();
                        }
                    },
                    {
                        label: 'Quit Mode: Close Everything',
                        type: 'radio',
                        checked: this.quitMode === 'quit-all',
                        click: () => {
                            this.quitMode = 'quit-all';
                            this.updateMenuCheckmarks();
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: 'CmdOrCtrl+Q',
                        click: () => {
                            this.handleAppQuit();
                        }
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectall' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'close' }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
        this.applicationMenu = menu;
    }

    updateMenuCheckmarks() {
        if (this.applicationMenu) {
            this.createApplicationMenu();
        }
    }

    async handleWindowClose() {
        const options = {
            type: 'question',
            buttons: ['Keep Running in Background', 'Quit Completely', 'Cancel'],
            defaultId: 0,
            cancelId: 2,
            title: 'Installation Up 4evr',
            message: 'What would you like to do?',
            detail: 'Keep Running: The backend service continues running for monitoring and remote control.\nQuit Completely: Stops all processes including backend service.'
        };

        const { response } = await dialog.showMessageBox(this.mainWindow, options);

        switch (response) {
            case 0: // Keep Running
                this.mainWindow.hide();
                break;
            case 1: // Quit Completely
                this.quitMode = 'quit-all';
                this.forceQuit();
                break;
            case 2: // Cancel
                // Do nothing
                break;
        }
    }

    async handleAppQuit() {
        switch (this.quitMode) {
            case 'keep-backend':
                this.quitApp(false);
                break;
            case 'quit-all':
                this.quitApp(true);
                break;
            case 'ask':
            default:
                await this.askUserQuitPreference();
                break;
        }
    }

    async askUserQuitPreference() {
        const options = {
            type: 'question',
            buttons: ['Keep Backend Running', 'Quit Everything', 'Cancel'],
            defaultId: 0,
            cancelId: 2,
            title: 'Installation Up 4evr',
            message: 'How would you like to quit?',
            detail: 'Keep Backend Running: The monitoring and automation service continues in the background.\nQuit Everything: Stops all processes completely.',
            checkboxLabel: 'Remember this choice',
            checkboxChecked: false
        };

        const { response, checkboxChecked } = await dialog.showMessageBox(this.mainWindow, options);

        if (checkboxChecked) {
            switch (response) {
                case 0:
                    this.quitMode = 'keep-backend';
                    break;
                case 1:
                    this.quitMode = 'quit-all';
                    break;
            }
            this.updateMenuCheckmarks();
        }

        switch (response) {
            case 0: // Keep Backend Running
                this.quitApp(false);
                break;
            case 1: // Quit Everything
                this.quitApp(true);
                break;
            case 2: // Cancel
                // Do nothing
                break;
        }
    }

    forceQuit() {
        this.isQuitting = true;
        this.cleanup();
        app.quit();
    }

    quitApp(killBackend = false) {
        debugLog(`Quitting app - killBackend: ${killBackend}`);
        this.isQuitting = true;
        
        if (killBackend) {
            this.cleanup();
        } else {
            debugLog('Keeping backend running - not calling cleanup');
        }
        
        app.quit();
    }

    createTray() {
        // Create tray icon - use a simple template icon for macOS
        let trayIcon;
        try {
            // Try to load custom icon first
            const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
            if (require('fs').existsSync(iconPath)) {
                trayIcon = nativeImage.createFromPath(iconPath);
            } else {
                // Fallback to a simple template icon
                trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafJQQLwcJCG1sLwcJCG1sLwcK2sLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCw');
            }
        } catch (error) {
            debugLog('Failed to load tray icon: ' + error.message);
            // Create a simple 16x16 black square as fallback
            trayIcon = nativeImage.createFromBuffer(Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
                0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10,
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x91, 0x68, 0x36, 0x00, 0x00, 0x00,
                0x0C, 0x49, 0x44, 0x41, 0x54, 0x28, 0x91, 0x63, 0x60, 0x18, 0x05, 0xA3,
                0x60, 0x14, 0x8C, 0x02, 0x08, 0x00, 0x00, 0x04, 0x10, 0x00, 0x01, 0x27,
                0x6F, 0xBE, 0x54, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
                0x42, 0x60, 0x82
            ]));
        }

        // Make it template on macOS for proper dark mode support
        if (process.platform === 'darwin') {
            trayIcon.setTemplateImage(true);
        }

        this.tray = new Tray(trayIcon);
        this.tray.setToolTip('Installation Up 4evr - Monitoring & Automation');
        
        // Create context menu
        this.updateTrayMenu();

        // Double-click to show/hide window
        this.tray.on('double-click', () => {
            this.toggleWindow();
        });

        // Periodically update backend status
        this.startBackendStatusUpdater();
    }

    updateTrayMenu() {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Installation Up 4evr',
                type: 'normal',
                enabled: false
            },
            {
                label: `Backend: ${this.getBackendStatusLabel()}`,
                type: 'normal',
                enabled: false
            },
            { type: 'separator' },
            {
                label: 'Show Window',
                click: () => this.showWindow()
            },
            {
                label: 'Hide Window',
                click: () => this.hideWindow(),
                enabled: this.mainWindow && this.mainWindow.isVisible()
            },
            { type: 'separator' },
            {
                label: 'Open in Browser',
                click: () => shell.openExternal('http://localhost:3001')
            },
            {
                label: 'Service Control',
                submenu: [
                    {
                        label: 'Start Backend Service',
                        click: () => this.startBackendFromTray(),
                        enabled: this.backendStatus !== 'running'
                    },
                    {
                        label: 'Stop Backend Service',
                        click: () => this.stopBackendFromTray(),
                        enabled: this.backendStatus === 'running'
                    },
                    {
                        label: 'Restart Backend Service',
                        click: () => this.restartBackendFromTray(),
                        enabled: this.backendStatus === 'running'
                    }
                ]
            },
            { type: 'separator' },
            {
                label: 'Quit Mode',
                submenu: [
                    {
                        label: 'Keep Backend Running',
                        type: 'radio',
                        checked: this.quitMode === 'keep-backend',
                        click: () => {
                            this.quitMode = 'keep-backend';
                            this.updateMenuCheckmarks();
                            this.updateTrayMenu();
                        }
                    },
                    {
                        label: 'Ask Each Time',
                        type: 'radio',
                        checked: this.quitMode === 'ask',
                        click: () => {
                            this.quitMode = 'ask';
                            this.updateMenuCheckmarks();
                            this.updateTrayMenu();
                        }
                    },
                    {
                        label: 'Quit Everything',
                        type: 'radio',
                        checked: this.quitMode === 'quit-all',
                        click: () => {
                            this.quitMode = 'quit-all';
                            this.updateMenuCheckmarks();
                            this.updateTrayMenu();
                        }
                    }
                ]
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => this.handleAppQuit()
            }
        ]);

        this.tray.setContextMenu(contextMenu);
    }

    getBackendStatusLabel() {
        switch (this.backendStatus) {
            case 'running': return '🟢 Running';
            case 'stopped': return '🔴 Stopped';
            case 'error': return '🟡 Error';
            case 'starting': return '🟡 Starting';
            default: return '⚪ Unknown';
        }
    }

    toggleWindow() {
        if (this.mainWindow) {
            if (this.mainWindow.isVisible()) {
                this.mainWindow.hide();
            } else {
                this.showWindow();
            }
        } else {
            this.createWindow();
        }
    }

    showWindow() {
        if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
        } else {
            this.createWindow();
        }
        this.updateTrayMenu();
    }

    hideWindow() {
        if (this.mainWindow) {
            this.mainWindow.hide();
        }
        this.updateTrayMenu();
    }

    async startBackendFromTray() {
        try {
            this.backendStatus = 'starting';
            this.updateTrayMenu();
            
            const response = await fetch('http://localhost:3001/api/service/start', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.backendStatus = 'running';
                this.showNotification('Backend service started successfully');
            } else {
                this.backendStatus = 'error';
                this.showNotification('Failed to start backend service');
            }
        } catch (error) {
            debugLog('Failed to start backend from tray: ' + error.message);
            this.backendStatus = 'error';
            this.showNotification('Failed to start backend service: ' + error.message);
        }
        this.updateTrayMenu();
    }

    async stopBackendFromTray() {
        try {
            const response = await fetch('http://localhost:3001/api/service/stop', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.backendStatus = 'stopped';
                this.showNotification('Backend service stopped');
            } else {
                this.backendStatus = 'error';
                this.showNotification('Failed to stop backend service');
            }
        } catch (error) {
            debugLog('Failed to stop backend from tray: ' + error.message);
            this.backendStatus = 'stopped'; // Assume it's stopped if we can't reach it
            this.showNotification('Backend service appears to be stopped');
        }
        this.updateTrayMenu();
    }

    async restartBackendFromTray() {
        await this.stopBackendFromTray();
        setTimeout(() => this.startBackendFromTray(), 2000);
    }

    showNotification(message) {
        if (this.tray) {
            this.tray.displayBalloon({
                title: 'Installation Up 4evr',
                content: message
            });
        }
    }

    startBackendStatusUpdater() {
        // Initial status check
        setTimeout(async () => {
            try {
                const response = await fetch('http://localhost:3001/api/service/status', {
                    timeout: 5000
                });
                
                if (response.ok) {
                    const status = await response.json();
                    this.backendStatus = status.status === 'online' ? 'running' : 'stopped';
                } else {
                    this.backendStatus = 'error';
                }
            } catch (error) {
                this.backendStatus = 'stopped';
            }
            
            this.updateTrayMenu();
        }, 2000);

        // Check backend status every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch('http://localhost:3001/api/service/status', {
                    timeout: 5000
                });
                
                if (response.ok) {
                    const status = await response.json();
                    this.backendStatus = status.status === 'online' ? 'running' : 'stopped';
                } else {
                    this.backendStatus = 'error';
                }
            } catch (error) {
                this.backendStatus = 'stopped';
            }
            
            this.updateTrayMenu();
        }, 30000);
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
            debugLog('Using system Node.js executable: ' + nodePath);
            
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

        // Authentication handlers
        ipcMain.handle('request-sudo-access', async () => {
            debugLog('IPC: request-sudo-access called');
            return new Promise((resolve) => {
                const options = {
                    name: 'Installation Up 4evr',
                    icns: '/Applications/Utilities/Terminal.app/Contents/Resources/Terminal.icns'
                };
                
                debugLog('IPC: Calling sudo.exec with native dialog');
                sudo.exec('true', options, (error, stdout, stderr) => {
                    debugLog(`IPC: sudo.exec result - error: ${error}, stdout: ${stdout}, stderr: ${stderr}`);
                    
                    if (error) {
                        if (error.message.includes('User did not grant permission') || 
                            error.message.includes('cancelled')) {
                            resolve({
                                success: false,
                                error: 'Authentication cancelled',
                                message: 'User cancelled administrator access request',
                                method: 'native'
                            });
                        } else {
                            resolve({
                                success: false,
                                error: 'Authentication failed',
                                message: 'Invalid administrator password or insufficient privileges',
                                method: 'native'
                            });
                        }
                    } else {
                        resolve({
                            success: true,
                            message: 'Administrator access granted via native dialog',
                            method: 'native',
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            });
        });

        ipcMain.handle('check-sudo-status', async () => {
            debugLog('IPC: check-sudo-status called');
            return new Promise((resolve) => {
                // Test if we can run a simple sudo command without password prompt
                exec('sudo -n true', { timeout: 3000 }, (error, stdout, stderr) => {
                    if (error) {
                        resolve({
                            success: true,
                            hasSudoAccess: false,
                            message: 'Administrator access required',
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        resolve({
                            success: true,
                            hasSudoAccess: true,
                            message: 'Administrator access is available',
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            });
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
        
        // Destroy tray
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
        
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