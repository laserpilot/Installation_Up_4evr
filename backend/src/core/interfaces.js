/**
 * Platform Abstraction Interfaces
 * Defines standard interfaces for cross-platform compatibility
 */

/**
 * Base System Manager Interface
 * All platform-specific system managers should implement this interface
 */
class SystemManagerInterface {
    constructor() {
        if (this.constructor === SystemManagerInterface) {
            throw new Error('Cannot instantiate abstract interface');
        }
    }

    // Required methods that each platform must implement
    async getSystemInfo() {
        throw new Error('getSystemInfo() must be implemented');
    }

    async applySettings(settings) {
        throw new Error('applySettings() must be implemented');
    }

    async verifySettings(settings) {
        throw new Error('verifySettings() must be implemented');
    }

    async revertSettings(settings) {
        throw new Error('revertSettings() must be implemented');
    }
}

/**
 * Process Management Interface
 * Standard interface for managing applications and processes
 */
class ProcessManagerInterface {
    constructor() {
        if (this.constructor === ProcessManagerInterface) {
            throw new Error('Cannot instantiate abstract interface');
        }
    }

    async startApplication(appPath, options = {}) {
        throw new Error('startApplication() must be implemented');
    }

    async stopApplication(appName) {
        throw new Error('stopApplication() must be implemented');
    }

    async restartApplication(appName) {
        throw new Error('restartApplication() must be implemented');
    }

    async getRunningApplications() {
        throw new Error('getRunningApplications() must be implemented');
    }

    async createAutoStartEntry(appPath, options = {}) {
        throw new Error('createAutoStartEntry() must be implemented');
    }
}

/**
 * Monitoring Data Interface
 * Standard structure for system monitoring data
 */
class MonitoringDataInterface {
    constructor() {
        this.system = {
            cpu: { usage: 0, cores: 0, temperature: 0 },
            memory: { usage: 0, total: 0, available: 0 },
            disk: { usage: 0, total: 0, available: 0 },
            uptime: { seconds: 0, formatted: '' },
            load: { 1: 0, 5: 0, 15: 0 }
        };
        this.network = {
            interfaces: [],
            primaryIP: null,
            connectivity: false
        };
        this.applications = [];
        this.displays = [];
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Platform Factory
 * Creates appropriate platform-specific implementations
 */
class PlatformFactory {
    static getPlatform() {
        const platform = process.platform;
        switch (platform) {
            case 'darwin':
                return 'macos';
            case 'win32':
                return 'windows';
            case 'linux':
                return 'linux';
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }

    static createSystemManager() {
        const platform = this.getPlatform();
        try {
            const SystemManager = require(`../platform/${platform}/system-manager`);
            return new SystemManager();
        } catch (error) {
            throw new Error(`Failed to load system manager for ${platform}: ${error.message}`);
        }
    }

    static createProcessManager() {
        const platform = this.getPlatform();
        try {
            const ProcessManager = require(`../platform/${platform}/process-manager`);
            return new ProcessManager();
        } catch (error) {
            throw new Error(`Failed to load process manager for ${platform}: ${error.message}`);
        }
    }

    static createMonitoringProvider() {
        const platform = this.getPlatform();
        try {
            const MonitoringProvider = require(`../platform/${platform}/monitoring-provider`);
            return new MonitoringProvider();
        } catch (error) {
            throw new Error(`Failed to load monitoring provider for ${platform}: ${error.message}`);
        }
    }
}

module.exports = {
    SystemManagerInterface,
    ProcessManagerInterface,
    MonitoringDataInterface,
    PlatformFactory
};