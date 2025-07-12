/**
 * Mock Platform Manager for Testing
 * Provides a mock implementation for API testing
 */

const MockPM2ServiceManager = require('./pm2-service-manager');

class MockPlatformManager {
  constructor() {
    this.pm2Manager = new MockPM2ServiceManager();
    this.config = new Map();
    this.monitoringData = {
      system: {
        cpu: { usage: 25.0, cores: 8 },
        memory: { usage: 45.0, total: 16 * 1024 * 1024 * 1024, used: 7.2 * 1024 * 1024 * 1024 },
        disk: { usage: 60.0, total: 1000 * 1024 * 1024 * 1024, used: 600 * 1024 * 1024 * 1024 }
      },
      uptime: { seconds: 86400 },
      applications: [],
      displays: {
        display1: { online: true, resolution: '1920x1080' }
      },
      network: {
        interfaces: [
          { name: 'en0', status: 'active', ipAddress: '192.168.1.100' }
        ],
        primaryIP: '192.168.1.100'
      }
    };
    this.notifications = {
      enabled: false,
      channels: {},
      history: []
    };
  }

  async handleAPIRequest(endpoint, method, data = {}) {
    console.log(`[MOCK] API Request: ${method} ${endpoint}`);

    // Monitoring endpoints
    if (endpoint === '/monitoring/status') {
      return {
        success: true,
        data: {
          ...this.monitoringData,
          timestamp: new Date().toISOString(),
          healthy: true
        }
      };
    }

    if (endpoint === '/monitoring/applications') {
      const pm2Processes = await this.pm2Manager.getProcessList();
      return {
        success: true,
        data: pm2Processes.success ? pm2Processes.data : []
      };
    }

    if (endpoint === '/monitoring/config' && method === 'GET') {
      return {
        success: true,
        data: this.config.get('monitoring') || {
          enabled: true,
          interval: 30000,
          thresholds: {
            cpu: { warning: 70, critical: 90 },
            memory: { warning: 80, critical: 95 },
            disk: { warning: 85, critical: 95 }
          }
        }
      };
    }

    if (endpoint === '/monitoring/config' && method === 'POST') {
      this.config.set('monitoring', data.config || data);
      return {
        success: true,
        data: { message: 'Monitoring configuration saved' }
      };
    }

    // Notification endpoints
    if (endpoint === '/notifications/config' && method === 'GET') {
      return {
        success: true,
        data: this.config.get('notifications') || this.notifications
      };
    }

    if (endpoint === '/notifications/config' && method === 'POST') {
      this.config.set('notifications', data.config || data);
      this.notifications = { ...this.notifications, ...(data.config || data) };
      return {
        success: true,
        message: 'Notification configuration saved'
      };
    }

    if (endpoint.startsWith('/notifications/test/')) {
      const channel = endpoint.split('/').pop();
      const testResult = await this.testNotificationChannel(channel, data);
      return testResult;
    }

    // Application/PM2 endpoints
    if (endpoint === '/applications/create-web' && method === 'POST') {
      return await this.pm2Manager.createWebApplication(data);
    }

    if (endpoint.startsWith('/applications/') && endpoint.includes('/start')) {
      const processId = parseInt(endpoint.split('/')[2]);
      return await this.pm2Manager.startProcess(processId);
    }

    if (endpoint.startsWith('/applications/') && endpoint.includes('/stop')) {
      const processId = parseInt(endpoint.split('/')[2]);
      return await this.pm2Manager.stopProcess(processId);
    }

    if (endpoint.startsWith('/applications/') && endpoint.includes('/delete')) {
      const processId = parseInt(endpoint.split('/')[2]);
      return await this.pm2Manager.deleteProcess(processId);
    }

    if (endpoint.startsWith('/applications/') && endpoint.includes('/restart')) {
      const processId = parseInt(endpoint.split('/')[2]);
      return await this.pm2Manager.restartProcess(processId);
    }

    if (endpoint === '/applications/list') {
      return await this.pm2Manager.getProcessList();
    }

    // System endpoints
    if (endpoint === '/system/status') {
      return {
        success: true,
        data: this.monitoringData.system
      };
    }

    if (endpoint === '/system/settings' && method === 'GET') {
      return {
        success: true,
        data: this.config.get('system') || {
          screensaver: { enabled: false },
          displaySleep: { enabled: false },
          computerSleep: { enabled: false }
        }
      };
    }

    if (endpoint === '/system/settings' && method === 'POST') {
      this.config.set('system', data);
      return {
        success: true,
        message: 'System settings updated'
      };
    }

    // Health endpoints
    if (endpoint === '/health/check') {
      return {
        success: true,
        data: {
          status: 'healthy',
          score: 85,
          checks: {
            system: 'ok',
            applications: 'ok',
            network: 'ok'
          }
        }
      };
    }

    // Config endpoints
    if (endpoint === '/config/get' && method === 'POST') {
      const key = data.key;
      return {
        success: true,
        data: this.config.get(key) || null
      };
    }

    if (endpoint === '/config/set' && method === 'POST') {
      this.config.set(data.key, data.value);
      return {
        success: true,
        message: `Configuration key '${data.key}' saved`
      };
    }

    // Default response for unhandled endpoints
    return {
      success: false,
      error: `Mock endpoint not implemented: ${method} ${endpoint}`
    };
  }

  async testNotificationChannel(channel, data) {
    const testMessage = data.message || `Test notification from ${channel} channel`;
    
    // Simulate different channel behaviors
    switch (channel) {
      case 'slack':
        if (!data.webhook || !data.webhook.startsWith('http')) {
          return {
            success: false,
            error: 'Invalid webhook URL for Slack'
          };
        }
        // Simulate successful webhook call
        this.notifications.history.push({
          channel: 'slack',
          message: testMessage,
          timestamp: new Date().toISOString(),
          success: true
        });
        return {
          success: true,
          message: 'Slack test notification sent successfully'
        };

      case 'discord':
        if (!data.webhook || !data.webhook.includes('discord.com')) {
          return {
            success: false,
            error: 'Invalid webhook URL for Discord'
          };
        }
        this.notifications.history.push({
          channel: 'discord',
          message: testMessage,
          timestamp: new Date().toISOString(),
          success: true
        });
        return {
          success: true,
          message: 'Discord test notification sent successfully'
        };

      case 'email':
        if (!data.recipients || !Array.isArray(data.recipients) || data.recipients.length === 0) {
          return {
            success: false,
            error: 'No email recipients specified'
          };
        }
        this.notifications.history.push({
          channel: 'email',
          message: testMessage,
          recipients: data.recipients,
          timestamp: new Date().toISOString(),
          success: true
        });
        return {
          success: true,
          message: `Email test notification sent to ${data.recipients.length} recipient(s)`
        };

      default:
        return {
          success: false,
          error: `Unsupported notification channel: ${channel}`
        };
    }
  }

  // Utility methods for testing
  updateMonitoringData(newData) {
    this.monitoringData = { ...this.monitoringData, ...newData };
  }

  setSystemResourceUsage(cpu, memory, disk) {
    this.monitoringData.system = {
      ...this.monitoringData.system,
      cpu: { ...this.monitoringData.system.cpu, usage: cpu },
      memory: { ...this.monitoringData.system.memory, usage: memory },
      disk: { ...this.monitoringData.system.disk, usage: disk }
    };
  }

  addApplication(app) {
    this.monitoringData.applications.push(app);
  }

  getPM2Manager() {
    return this.pm2Manager;
  }

  getNotificationHistory() {
    return this.notifications.history;
  }

  reset() {
    this.config.clear();
    this.pm2Manager.reset();
    this.notifications.history = [];
    this.monitoringData.applications = [];
  }
}

module.exports = MockPlatformManager;