/**
 * Mock system data for testing
 */

const mockSystemData = {
  healthy: {
    system: {
      cpu: { usage: 15.0, cores: 8 },
      memory: { usage: 25.0 },
      disk: { usage: 25.0 },
      temperature: { cpu: 45 }
    },
    uptime: { seconds: 604800 }, // 1 week
    applications: [
      { name: 'TestApp1', status: 'running', shouldBeRunning: true },
      { name: 'TestApp2', status: 'running', shouldBeRunning: true }
    ],
    displays: {
      display1: { online: true },
      display2: { online: true }
    },
    network: {
      interfaces: [
        { status: 'active', ipAddress: '192.168.1.100', name: 'en0' }
      ],
      primaryIP: '192.168.1.100'
    },
    security: {
      sip: true,
      gatekeeper: true,
      firewall: true
    }
  },

  unhealthy: {
    system: {
      cpu: { usage: 95.0, cores: 8 },
      memory: { usage: 95.0 },
      disk: { usage: 95.0 },
      temperature: { cpu: 85 }
    },
    uptime: { seconds: 1800 }, // 30 minutes
    applications: [
      { name: 'CriticalApp', status: 'stopped', shouldBeRunning: true },
      { name: 'TestApp2', status: 'running', shouldBeRunning: true }
    ],
    displays: {
      display1: { online: false },
      display2: { online: true }
    },
    network: {
      interfaces: [
        { status: 'inactive', ipAddress: null, name: 'en0' }
      ],
      primaryIP: null
    },
    security: {
      sip: false,
      gatekeeper: false,
      firewall: false
    }
  },

  moderate: {
    system: {
      cpu: { usage: 45.0, cores: 8 },
      memory: { usage: 70.0 },
      disk: { usage: 60.0 },
      temperature: { cpu: 65 }
    },
    uptime: { seconds: 86400 }, // 1 day
    applications: [
      { name: 'TestApp1', status: 'running', shouldBeRunning: true },
      { name: 'OptionalApp', status: 'stopped', shouldBeRunning: false }
    ],
    displays: {
      display1: { online: true }
    },
    network: {
      interfaces: [
        { status: 'active', ipAddress: '192.168.1.100', name: 'en0' }
      ],
      primaryIP: '192.168.1.100'
    },
    security: {
      sip: true,
      gatekeeper: true,
      firewall: false
    }
  }
};

const mockConfigurations = {
  optimal: {
    monitoring: {
      enabled: true,
      thresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 75, critical: 90 },
        disk: { warning: 80, critical: 95 }
      },
      interval: 30000
    },
    notifications: {
      enabled: true,
      channels: {
        slack: { enabled: true, webhook: 'https://hooks.slack.com/test' },
        email: { enabled: true, recipients: ['admin@example.com'] }
      },
      alertLevels: ['warning', 'critical']
    },
    installation: {
      name: 'Test Installation',
      description: 'Test installation for unit tests',
      location: 'Test Lab',
      contact: 'admin@example.com'
    }
  },

  minimal: {
    monitoring: {
      enabled: true,
      interval: 60000
    },
    notifications: {
      enabled: false
    },
    installation: {
      name: 'Installation Up 4evr'
    }
  },

  disabled: {
    monitoring: {
      enabled: false
    },
    notifications: {
      enabled: false
    },
    installation: {}
  }
};

module.exports = {
  mockSystemData,
  mockConfigurations
};