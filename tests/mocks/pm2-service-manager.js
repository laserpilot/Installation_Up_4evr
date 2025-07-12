/**
 * Mock PM2 Service Manager for Testing
 * Prevents actual PM2 calls during integration tests
 */

class MockPM2ServiceManager {
  constructor() {
    this.processes = new Map();
    this.nextId = 1;
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
    return { success: true, message: 'Mock PM2 initialized' };
  }

  async createWebApplication(config) {
    if (!this.isInitialized) {
      throw new Error('PM2 Service Manager not initialized');
    }

    const processId = this.nextId++;
    const process = {
      id: processId,
      name: config.name || `web-app-${processId}`,
      port: config.port || 3000,
      script: config.script || 'app.js',
      status: 'online',
      pid: Math.floor(Math.random() * 10000) + 1000,
      cpu: Math.random() * 10,
      memory: Math.floor(Math.random() * 100) + 50,
      uptime: Date.now(),
      restarts: 0,
      created: new Date().toISOString(),
      ...config
    };

    this.processes.set(processId, process);

    return {
      success: true,
      data: {
        processId,
        name: process.name,
        port: process.port,
        status: process.status,
        pid: process.pid
      },
      message: `Mock web application '${process.name}' created successfully`
    };
  }

  async startProcess(processId) {
    const process = this.processes.get(processId);
    if (!process) {
      return {
        success: false,
        error: `Process ${processId} not found`
      };
    }

    process.status = 'online';
    process.pid = Math.floor(Math.random() * 10000) + 1000;
    process.uptime = Date.now();

    return {
      success: true,
      data: {
        processId,
        name: process.name,
        status: process.status,
        pid: process.pid
      },
      message: `Process '${process.name}' started successfully`
    };
  }

  async stopProcess(processId) {
    const process = this.processes.get(processId);
    if (!process) {
      return {
        success: false,
        error: `Process ${processId} not found`
      };
    }

    process.status = 'stopped';
    process.pid = null;

    return {
      success: true,
      data: {
        processId,
        name: process.name,
        status: process.status
      },
      message: `Process '${process.name}' stopped successfully`
    };
  }

  async deleteProcess(processId) {
    const process = this.processes.get(processId);
    if (!process) {
      return {
        success: false,
        error: `Process ${processId} not found`
      };
    }

    const processName = process.name;
    this.processes.delete(processId);

    return {
      success: true,
      message: `Process '${processName}' deleted successfully`
    };
  }

  async getProcessList() {
    const processes = Array.from(this.processes.values()).map(process => ({
      id: process.id,
      name: process.name,
      status: process.status,
      pid: process.pid,
      cpu: process.cpu + Math.random() * 2 - 1, // Slight variation
      memory: process.memory + Math.floor(Math.random() * 10 - 5),
      uptime: process.uptime ? Date.now() - process.uptime : 0,
      restarts: process.restarts || 0
    }));

    return {
      success: true,
      data: processes,
      count: processes.length
    };
  }

  async getProcessInfo(processId) {
    const process = this.processes.get(processId);
    if (!process) {
      return {
        success: false,
        error: `Process ${processId} not found`
      };
    }

    return {
      success: true,
      data: {
        id: process.id,
        name: process.name,
        status: process.status,
        pid: process.pid,
        port: process.port,
        script: process.script,
        cpu: process.cpu + Math.random() * 2 - 1,
        memory: process.memory + Math.floor(Math.random() * 10 - 5),
        uptime: process.uptime ? Date.now() - process.uptime : 0,
        restarts: process.restarts || 0,
        created: process.created
      }
    };
  }

  async restartProcess(processId) {
    const process = this.processes.get(processId);
    if (!process) {
      return {
        success: false,
        error: `Process ${processId} not found`
      };
    }

    process.status = 'online';
    process.pid = Math.floor(Math.random() * 10000) + 1000;
    process.uptime = Date.now();
    process.restarts = (process.restarts || 0) + 1;

    return {
      success: true,
      data: {
        processId,
        name: process.name,
        status: process.status,
        pid: process.pid,
        restarts: process.restarts
      },
      message: `Process '${process.name}' restarted successfully`
    };
  }

  async getSystemInfo() {
    return {
      success: true,
      data: {
        totalProcesses: this.processes.size,
        runningProcesses: Array.from(this.processes.values()).filter(p => p.status === 'online').length,
        stoppedProcesses: Array.from(this.processes.values()).filter(p => p.status === 'stopped').length,
        systemUptime: Math.floor(Math.random() * 86400) + 3600, // 1-24 hours
        nodeVersion: process.version,
        pm2Version: '5.3.0-mock',
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  // Utility methods for testing
  reset() {
    this.processes.clear();
    this.nextId = 1;
    this.isInitialized = false;
  }

  setProcessStatus(processId, status) {
    const process = this.processes.get(processId);
    if (process) {
      process.status = status;
      if (status === 'stopped') {
        process.pid = null;
      } else if (status === 'online' && !process.pid) {
        process.pid = Math.floor(Math.random() * 10000) + 1000;
      }
    }
  }

  simulateProcessCrash(processId) {
    const process = this.processes.get(processId);
    if (process) {
      process.status = 'errored';
      process.pid = null;
      process.restarts = (process.restarts || 0) + 1;
    }
  }

  getProcessCount() {
    return this.processes.size;
  }
}

module.exports = MockPM2ServiceManager;