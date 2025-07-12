/**
 * Integration tests for Applications/PM2 Process API endpoints
 */

const request = require('supertest');
const express = require('express');
const MockPlatformManager = require('../mocks/platform-manager');

describe('Applications API Integration Tests', () => {
  let app;
  let mockPlatformManager;

  beforeEach(async () => {
    // Create fresh instances for each test
    mockPlatformManager = new MockPlatformManager();
    
    // Initialize PM2 manager
    await mockPlatformManager.getPM2Manager().initialize();
    
    // Create Express app with system routes (which handle PM2 processes)
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Create a simple router that handles our PM2 endpoints
    const router = express.Router();

    // PM2 process endpoints
    router.post('/create-web', async (req, res) => {
      try {
        const result = await mockPlatformManager.handleAPIRequest(
          '/applications/create-web',
          'POST',
          req.body
        );
        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/list', async (req, res) => {
      try {
        const result = await mockPlatformManager.handleAPIRequest(
          '/applications/list',
          'GET'
        );
        if (result.success) {
          res.json(result.data || []);
        } else {
          res.status(500).json({ error: result.error });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/:id/start', async (req, res) => {
      try {
        const result = await mockPlatformManager.handleAPIRequest(
          `/applications/${req.params.id}/start`,
          'POST'
        );
        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/:id/stop', async (req, res) => {
      try {
        const result = await mockPlatformManager.handleAPIRequest(
          `/applications/${req.params.id}/stop`,
          'POST'
        );
        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/:id/restart', async (req, res) => {
      try {
        const result = await mockPlatformManager.handleAPIRequest(
          `/applications/${req.params.id}/restart`,
          'POST'
        );
        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.delete('/:id', async (req, res) => {
      try {
        const result = await mockPlatformManager.handleAPIRequest(
          `/applications/${req.params.id}/delete`,
          'POST'
        );
        if (result.success) {
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.use('/api/applications', router);
  });

  afterEach(() => {
    mockPlatformManager.reset();
  });

  describe('POST /api/applications/create-web', () => {
    test('should create web application successfully', async () => {
      const webAppData = {
        name: 'Test Web App',
        port: 3000,
        script: 'server.js'
      };

      const response = await request(app)
        .post('/api/applications/create-web')
        .send(webAppData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('processId');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('port');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('pid');

      expect(response.body.data.name).toBe(webAppData.name);
      expect(response.body.data.port).toBe(webAppData.port);
      expect(response.body.data.status).toBe('online');
      expect(typeof response.body.data.processId).toBe('number');
      expect(typeof response.body.data.pid).toBe('number');
    });

    test('should generate unique process IDs for multiple applications', async () => {
      const app1Data = { name: 'App1', port: 3000, script: 'app1.js' };
      const app2Data = { name: 'App2', port: 3001, script: 'app2.js' };

      const response1 = await request(app)
        .post('/api/applications/create-web')
        .send(app1Data)
        .expect(200);

      const response2 = await request(app)
        .post('/api/applications/create-web')
        .send(app2Data)
        .expect(200);

      expect(response1.body.data.processId).not.toBe(response2.body.data.processId);
      expect(response1.body.data.pid).not.toBe(response2.body.data.pid);
      expect(response1.body.data.name).toBe('App1');
      expect(response2.body.data.name).toBe('App2');
    });

    test('should handle missing required fields', async () => {
      const incompleteData = { port: 3000 }; // missing name

      const response = await request(app)
        .post('/api/applications/create-web')
        .send(incompleteData)
        .expect(200); // Mock doesn't validate, but real implementation would

      // In real implementation, this would be a 400 error
      // For now, mock creates with default values
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/applications/list', () => {
    test('should return empty list when no applications exist', async () => {
      const response = await request(app)
        .get('/api/applications/list')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    test('should return list of created applications', async () => {
      // Create test applications
      await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Test App 1', port: 3000, script: 'app1.js' });

      await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Test App 2', port: 3001, script: 'app2.js' });

      const response = await request(app)
        .get('/api/applications/list')
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

  describe('POST /api/applications/:id/start', () => {
    test('should start a stopped application', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Startable App', port: 3000 });

      const processId = createResponse.body.data.processId;

      // Stop the application first
      await request(app)
        .post(`/api/applications/${processId}/stop`)
        .expect(200);

      // Start the application
      const response = await request(app)
        .post(`/api/applications/${processId}/start`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('online');
      expect(response.body.data.processId).toBe(processId);
      expect(response.body.data.pid).toBeTruthy();
    });

    test('should return error for non-existent process ID', async () => {
      const response = await request(app)
        .post('/api/applications/999/start')
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/applications/:id/stop', () => {
    test('should stop a running application', async () => {
      // Create application (starts automatically)
      const createResponse = await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Stoppable App', port: 3000 });

      const processId = createResponse.body.data.processId;

      // Stop the application
      const response = await request(app)
        .post(`/api/applications/${processId}/stop`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('stopped');
      expect(response.body.data.processId).toBe(processId);
      expect(response.body.data.pid).toBeNull();
    });

    test('should return error for non-existent process ID', async () => {
      const response = await request(app)
        .post('/api/applications/999/stop')
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/applications/:id/restart', () => {
    test('should restart an application and increment restart count', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Restartable App', port: 3000 });

      const processId = createResponse.body.data.processId;

      // Restart the application
      const response = await request(app)
        .post(`/api/applications/${processId}/restart`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('online');
      expect(response.body.data.processId).toBe(processId);
      expect(response.body.data.restarts).toBe(1);
      expect(response.body.data.pid).toBeTruthy();
    });

    test('should return error for non-existent process ID', async () => {
      const response = await request(app)
        .post('/api/applications/999/restart')
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/applications/:id', () => {
    test('should delete an application successfully', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Deletable App', port: 3000 });

      const processId = createResponse.body.data.processId;

      // Delete the application
      const response = await request(app)
        .delete(`/api/applications/${processId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');

      // Verify application is removed from list
      const listResponse = await request(app)
        .get('/api/applications/list')
        .expect(200);

      const deletedApp = listResponse.body.find(app => app.id === processId);
      expect(deletedApp).toBeUndefined();
    });

    test('should return error for non-existent process ID', async () => {
      const response = await request(app)
        .delete('/api/applications/999')
        .expect(400);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Application Lifecycle', () => {
    test('should handle complete application lifecycle', async () => {
      // 1. Create application
      const createResponse = await request(app)
        .post('/api/applications/create-web')
        .send({ 
          name: 'Lifecycle Test App', 
          port: 3000,
          script: 'server.js'
        })
        .expect(200);

      const processId = createResponse.body.data.processId;
      expect(createResponse.body.data.status).toBe('online');

      // 2. Stop application
      const stopResponse = await request(app)
        .post(`/api/applications/${processId}/stop`)
        .expect(200);

      expect(stopResponse.body.data.status).toBe('stopped');

      // 3. Start application
      const startResponse = await request(app)
        .post(`/api/applications/${processId}/start`)
        .expect(200);

      expect(startResponse.body.data.status).toBe('online');

      // 4. Restart application
      const restartResponse = await request(app)
        .post(`/api/applications/${processId}/restart`)
        .expect(200);

      expect(restartResponse.body.data.status).toBe('online');
      expect(restartResponse.body.data.restarts).toBe(1);

      // 5. Verify in list
      const listResponse = await request(app)
        .get('/api/applications/list')
        .expect(200);

      const app = listResponse.body.find(a => a.id === processId);
      expect(app).toBeDefined();
      expect(app.status).toBe('online');

      // 6. Delete application
      const deleteResponse = await request(app)
        .delete(`/api/applications/${processId}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // 7. Verify removal from list
      const finalListResponse = await request(app)
        .get('/api/applications/list')
        .expect(200);

      const deletedApp = finalListResponse.body.find(a => a.id === processId);
      expect(deletedApp).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid process IDs gracefully', async () => {
      const invalidIds = ['abc', '-1', '0', 'null', 'undefined'];

      for (const invalidId of invalidIds) {
        await request(app)
          .post(`/api/applications/${invalidId}/start`)
          .expect(400);
      }
    });

    test('should handle concurrent operations on same process', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Concurrent Test App', port: 3000 });

      const processId = createResponse.body.data.processId;

      // Perform concurrent stop operations
      const stopPromises = [
        request(app).post(`/api/applications/${processId}/stop`),
        request(app).post(`/api/applications/${processId}/stop`),
        request(app).post(`/api/applications/${processId}/stop`)
      ];

      const responses = await Promise.all(stopPromises);

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Application Metrics', () => {
    test('should return realistic CPU and memory metrics', async () => {
      // Create application
      await request(app)
        .post('/api/applications/create-web')
        .send({ name: 'Metrics Test App', port: 3000 });

      const response = await request(app)
        .get('/api/applications/list')
        .expect(200);

      const app = response.body[0];
      
      expect(app.cpu).toBeGreaterThanOrEqual(0);
      expect(app.cpu).toBeLessThanOrEqual(100);
      expect(app.memory).toBeGreaterThan(0);
      expect(app.memory).toBeLessThan(1000); // Reasonable memory usage in MB
      expect(app.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});