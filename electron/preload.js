/**
 * Installation Up 4evr - Electron Preload Script
 * Safely exposes native functionality to the renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    selectAppFile: () => ipcRenderer.invoke('select-app-file'),
    getAppInfo: (appPath) => ipcRenderer.invoke('get-app-info', appPath),
    showInFinder: (filePath) => ipcRenderer.invoke('show-in-finder', filePath),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // System preferences
    applySystemSettings: (settings) => ipcRenderer.invoke('apply-system-settings', settings),

    // Authentication
    requestSudoAccess: () => ipcRenderer.invoke('request-sudo-access'),
    checkSudoStatus: () => ipcRenderer.invoke('check-sudo-status'),

    // Launch agents
    createLaunchAgent: (appPath, options) => ipcRenderer.invoke('create-launch-agent', appPath, options),
    installLaunchAgent: (appPath, options) => ipcRenderer.invoke('install-launch-agent', appPath, options),

    // System information
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

    // Profile operations
    saveProfile: (profile) => ipcRenderer.invoke('save-profile', profile),
    loadProfile: () => ipcRenderer.invoke('load-profile'),

    // Platform info
    platform: process.platform,
    isElectron: true
});

// Enhanced error handling
window.addEventListener('DOMContentLoaded', () => {
    console.log('Installation Up 4evr - Electron App Ready');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});