/**
 * Integration tests for Monitoring API endpoints
 */

const request = require('supertest');
const express = require('express');
const MockPlatformManager = require('../mocks/platform-manager');

describe('Monitoring API Integration Tests', () => {
  let app;
  let mockPlatformManager;

  beforeEach(() => {
    // Create fresh instances for each test
    mockPlatformManager = new MockPlatformManager();
    
    // Create Express app with monitoring routes
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Import and use monitoring routes with mock platform manager
    const monitoringRoutes = require('../../backend/routes/monitoring')(mockPlatformManager);
    app.use('/api/monitoring', monitoringRoutes);
  });

  afterEach(() => {
    mockPlatformManager.reset();
  });

  describe('GET /api/monitoring/status', () => {
    test('should return monitoring status with correct data structure', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('healthy');

      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('disk');

      expect(response.body.system.cpu).toHaveProperty('usage');
      expect(response.body.system.cpu).toHaveProperty('cores');
      expect(response.body.system.memory).toHaveProperty('usage');
      expect(response.body.system.disk).toHaveProperty('usage');
    });

    test('should return valid numeric values for system metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      const { system } = response.body;
      
      expect(typeof system.cpu.usage).toBe('number');
      expect(system.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(system.cpu.usage).toBeLessThanOrEqual(100);

      expect(typeof system.memory.usage).toBe('number');
      expect(system.memory.usage).toBeGreaterThanOrEqual(0);
      expect(system.memory.usage).toBeLessThanOrEqual(100);

      expect(typeof system.disk.usage).toBe('number');
      expect(system.disk.usage).toBeGreaterThanOrEqual(0);
      expect(system.disk.usage).toBeLessThanOrEqual(100);
    });

    test('should include timestamp in ISO format', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(() => new Date(response.body.timestamp)).not.toThrow();
      
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('GET /api/monitoring/applications', () => {
    test('should return empty array when no applications are running', async () => {
      const response = await request(app)
        .get('/api/monitoring/applications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('should return applications list with proper structure', async () => {
      // Create mock applications
      const pm2Manager = mockPlatformManager.getPM2Manager();
      await pm2Manager.initialize();
      await pm2Manager.createWebApplication({
        name: 'test-app-1',
        port: 3000,
        script: 'app.js'
      });
      await pm2Manager.createWebApplication({
        name: 'test-app-2',
        port: 3001,
        script: 'server.js'
      });

      const response = await request(app)
        .get('/api/monitoring/applications')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      response.body.forEach(app => {
        expect(app).toHaveProperty('id');
        expect(app).toHaveProperty('name');
        expect(app).toHaveProperty('status');
        expect(app).toHaveProperty('pid');
        expect(app).toHaveProperty('cpu');
        expect(app).toHaveProperty('memory');
        expect(app).toHaveProperty('uptime');
        expect(app).toHaveProperty('restarts');

        expect(typeof app.id).toBe('number');
        expect(typeof app.name).toBe('string');
        expect(['online', 'stopped', 'errored']).toContain(app.status);
        expect(typeof app.cpu).toBe('number');
        expect(typeof app.memory).toBe('number');
        expect(typeof app.uptime).toBe('number');
        expect(typeof app.restarts).toBe('number');
      });
    });
  });

  describe('GET /api/monitoring/config', () => {
    test('should return default monitoring configuration', async () => {
      const response = await request(app)
        .get('/api/monitoring/config')
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('interval');
      expect(response.body).toHaveProperty('thresholds');

      expect(response.body.thresholds).toHaveProperty('cpu');
      expect(response.body.thresholds).toHaveProperty('memory');
      expect(response.body.thresholds).toHaveProperty('disk');

      expect(response.body.thresholds.cpu).toHaveProperty('warning');
      expect(response.body.thresholds.cpu).toHaveProperty('critical');
      expect(response.body.thresholds.memory).toHaveProperty('warning');
      expect(response.body.thresholds.memory).toHaveProperty('critical');
      expect(response.body.thresholds.disk).toHaveProperty('warning');
      expect(response.body.thresholds.disk).toHaveProperty('critical');
    });

    test('should return valid threshold values', async () => {
      const response = await request(app)
        .get('/api/monitoring/config')
        .expect(200);

      const { thresholds } = response.body;

      expect(thresholds.cpu.warning).toBeGreaterThan(0);
      expect(thresholds.cpu.warning).toBeLessThan(thresholds.cpu.critical);
      expect(thresholds.cpu.critical).toBeLessThanOrEqual(100);

      expect(thresholds.memory.warning).toBeGreaterThan(0);
      expect(thresholds.memory.warning).toBeLessThan(thresholds.memory.critical);
      expect(thresholds.memory.critical).toBeLessThanOrEqual(100);

      expect(thresholds.disk.warning).toBeGreaterThan(0);
      expect(thresholds.disk.warning).toBeLessThan(thresholds.disk.critical);
      expect(thresholds.disk.critical).toBeLessThanOrEqual(100);
    });
  });

  describe('POST /api/monitoring/config', () => {
    test('should save monitoring configuration successfully', async () => {
      const newConfig = {
        enabled: true,
        interval: 15000,
        thresholds: {
          cpu: { warning: 60, critical: 85 },
          memory: { warning: 70, critical: 90 },
          disk: { warning: 80, critical: 95 }
        }
      };

      const response = await request(app)
        .post('/api/monitoring/config')
        .send({ config: newConfig })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('saved');
    });

    test('should retrieve saved monitoring configuration', async () => {
      const newConfig = {
        enabled: false,
        interval: 45000,
        thresholds: {
          cpu: { warning: 50, critical: 80 },
          memory: { warning: 75, critical: 95 },
          disk: { warning: 85, critical: 98 }
        }
      };

      // Save configuration
      await request(app)
        .post('/api/monitoring/config')
        .send({ config: newConfig })
        .expect(200);

      // Retrieve and verify configuration
      const response = await request(app)
        .get('/api/monitoring/config')
        .expect(200);

      expect(response.body.enabled).toBe(newConfig.enabled);
      expect(response.body.interval).toBe(newConfig.interval);
      expect(response.body.thresholds.cpu.warning).toBe(newConfig.thresholds.cpu.warning);
      expect(response.body.thresholds.cpu.critical).toBe(newConfig.thresholds.cpu.critical);
      expect(response.body.thresholds.memory.warning).toBe(newConfig.thresholds.memory.warning);
      expect(response.body.thresholds.memory.critical).toBe(newConfig.thresholds.memory.critical);
      expect(response.body.thresholds.disk.warning).toBe(newConfig.thresholds.disk.warning);
      expect(response.body.thresholds.disk.critical).toBe(newConfig.thresholds.disk.critical);
    });

    test('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        interval: 'invalid',
        thresholds: {
          cpu: { warning: 150, critical: 50 }, // Invalid: warning > critical
        }
      };

      const response = await request(app)
        .post('/api/monitoring/config')
        .send({ config: invalidConfig })
        .expect(200);

      // Mock should still accept and save the configuration
      // In a real implementation, validation would be added
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    test('should handle platform manager errors gracefully', async () => {
      // Create a mock that throws errors
      const errorPlatformManager = {
        async handleAPIRequest() {
          throw new Error('Mock platform manager error');
        }
      };

      const errorApp = express();
      errorApp.use(express.json());
      const errorRoutes = require('../../backend/routes/monitoring')(errorPlatformManager);
      errorApp.use('/api/monitoring', errorRoutes);

      const response = await request(errorApp)
        .get('/api/monitoring/status')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Mock platform manager error');
    });

    test('should handle malformed JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/monitoring/config')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}')
        .expect(400);
    });
  });

  describe('Real-time Updates', () => {
    test('should reflect resource usage changes in status endpoint', async () => {
      // Get initial status
      const initialResponse = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      const initialCPU = initialResponse.body.system.cpu.usage;

      // Update system resource usage
      mockPlatformManager.setSystemResourceUsage(75, 50, 30);

      // Get updated status
      const updatedResponse = await request(app)
        .get('/api/monitoring/status')
        .expect(200);

      expect(updatedResponse.body.system.cpu.usage).toBe(75);
      expect(updatedResponse.body.system.memory.usage).toBe(50);
      expect(updatedResponse.body.system.disk.usage).toBe(30);
      expect(updatedResponse.body.system.cpu.usage).not.toBe(initialCPU);
    });

    test('should reflect application changes in applications endpoint', async () => {
      const pm2Manager = mockPlatformManager.getPM2Manager();
      await pm2Manager.initialize();

      // Initially no applications
      let response = await request(app)
        .get('/api/monitoring/applications')
        .expect(200);
      expect(response.body).toHaveLength(0);

      // Add application
      await pm2Manager.createWebApplication({
        name: 'dynamic-app',
        port: 3000
      });

      // Should now show the application
      response = await request(app)
        .get('/api/monitoring/applications')
        .expect(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('dynamic-app');
    });
  });
});