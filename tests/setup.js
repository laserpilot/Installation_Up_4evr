// Jest setup file for global test configuration
console.log('Setting up Jest test environment...');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test helpers
global.testHelpers = {
  mockSystemData: {
    system: {
      cpu: { usage: 45.2, cores: 8 },
      memory: { usage: 50.0 },
      disk: { usage: 50.0 }
    },
    uptime: { seconds: 86400 },
    applications: [
      { name: 'TestApp1', status: 'running', shouldBeRunning: true }
    ],
    displays: {
      display1: { online: true }
    },
    network: {
      interfaces: [{ status: 'active', ipAddress: '192.168.1.100' }],
      primaryIP: '192.168.1.100'
    }
  },
  
  mockHealthySystem: {
    system: {
      cpu: { usage: 15.0, cores: 8 },
      memory: { usage: 25.0 },
      disk: { usage: 25.0 }
    },
    uptime: { seconds: 86400 },
    applications: [
      { name: 'TestApp1', status: 'running', shouldBeRunning: true },
      { name: 'TestApp2', status: 'running', shouldBeRunning: true }
    ],
    displays: {
      display1: { online: true },
      display2: { online: true }
    }
  },
  
  mockUnhealthySystem: {
    system: {
      cpu: { usage: 95.0, cores: 8 },
      memory: { usage: 95.0 },
      disk: { usage: 95.0 }
    },
    uptime: { seconds: 1800 },
    applications: [
      { name: 'TestApp1', status: 'stopped', shouldBeRunning: true },
      { name: 'TestApp2', status: 'running', shouldBeRunning: true }
    ],
    displays: {
      display1: { online: false },
      display2: { online: true }
    }
  }
};

// Global timeout for async operations
jest.setTimeout(30000);