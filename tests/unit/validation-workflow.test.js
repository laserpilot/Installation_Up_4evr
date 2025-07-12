const ValidationWorkflow = require('../../backend/src/core/validation-workflow');

describe('ValidationWorkflow', () => {
  let validationWorkflow;
  let mockConfig, mockMonitoring, mockSystemManager;

  beforeEach(() => {
    // Mock dependencies
    mockConfig = {
      get: jest.fn()
    };

    mockMonitoring = {
      getCurrentData: jest.fn()
    };

    mockSystemManager = {
      verifySettings: jest.fn()
    };

    validationWorkflow = new ValidationWorkflow(mockConfig, mockMonitoring, mockSystemManager);
  });

  describe('constructor', () => {
    test('should initialize with correct properties', () => {
      expect(validationWorkflow.config).toBe(mockConfig);
      expect(validationWorkflow.monitoring).toBe(mockMonitoring);
      expect(validationWorkflow.systemManager).toBe(mockSystemManager);
      expect(validationWorkflow.validationTests).toBeDefined();
      expect(validationWorkflow.testResults).toEqual([]);
      expect(validationWorkflow.isRunning).toBe(false);
    });

    test('should setup validation tests', () => {
      expect(validationWorkflow.validationTests.length).toBeGreaterThan(0);
      expect(validationWorkflow.validationTests.every(test => 
        test.id && test.name && test.category && test.priority && test.test
      )).toBe(true);
    });
  });

  describe('getAvailableTests', () => {
    test('should return test metadata without test functions', () => {
      const tests = validationWorkflow.getAvailableTests();
      
      expect(tests.length).toBeGreaterThan(0);
      tests.forEach(test => {
        expect(test).toHaveProperty('id');
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('category');
        expect(test).toHaveProperty('priority');
        expect(test).toHaveProperty('description');
        expect(test).not.toHaveProperty('test');
      });
    });
  });

  describe('filterTests', () => {
    test('should filter tests by category', () => {
      const systemTests = validationWorkflow.filterTests({ categories: ['system'] });
      expect(systemTests.every(test => test.category === 'system')).toBe(true);
    });

    test('should filter tests by priority', () => {
      const criticalTests = validationWorkflow.filterTests({ priorities: ['critical'] });
      expect(criticalTests.every(test => test.priority === 'critical')).toBe(true);
    });

    test('should filter tests by test IDs', () => {
      const specificTests = validationWorkflow.filterTests({ testIds: ['system-uptime'] });
      expect(specificTests).toHaveLength(1);
      expect(specificTests[0].id).toBe('system-uptime');
    });

    test('should return all tests when no filters provided', () => {
      const allTests = validationWorkflow.filterTests({});
      expect(allTests.length).toBe(validationWorkflow.validationTests.length);
    });
  });

  describe('testSystemUptime', () => {
    test('should pass for sufficient uptime', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        uptime: { seconds: 7200 } // 2 hours
      });

      const result = await validationWorkflow.testSystemUptime();
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('2 hours');
      expect(result.details.uptimeHours).toBe(2);
    });

    test('should fail for insufficient uptime', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        uptime: { seconds: 1800 } // 30 minutes
      });

      const result = await validationWorkflow.testSystemUptime();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Insufficient uptime');
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('should handle missing uptime data', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({});

      const result = await validationWorkflow.testSystemUptime();
      
      expect(result.passed).toBe(false);
      expect(result.details.uptimeSeconds).toBe(0);
    });
  });

  describe('testSystemResources', () => {
    test('should pass for healthy resource usage', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        system: {
          cpu: { usage: 30 },
          memory: { usage: 60 },
          disk: { usage: 50 }
        }
      });

      const result = await validationWorkflow.testSystemResources();
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('System resources healthy');
      expect(result.details.cpu).toBe(30);
      expect(result.details.memory).toBe(60);
      expect(result.details.disk).toBe(50);
    });

    test('should fail for high CPU usage', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        system: {
          cpu: { usage: 95 },
          memory: { usage: 60 },
          disk: { usage: 50 }
        }
      });

      const result = await validationWorkflow.testSystemResources();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('High CPU usage');
      expect(result.recommendations).toBeDefined();
    });

    test('should fail for high memory usage', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        system: {
          cpu: { usage: 30 },
          memory: { usage: 90 },
          disk: { usage: 50 }
        }
      });

      const result = await validationWorkflow.testSystemResources();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('High memory usage');
    });

    test('should fail for high disk usage', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        system: {
          cpu: { usage: 30 },
          memory: { usage: 60 },
          disk: { usage: 95 }
        }
      });

      const result = await validationWorkflow.testSystemResources();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('High disk usage');
    });

    test('should handle missing system data', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({});

      const result = await validationWorkflow.testSystemResources();
      
      expect(result.passed).toBe(true);
      expect(result.details.cpu).toBe(0);
      expect(result.details.memory).toBe(0);
      expect(result.details.disk).toBe(0);
    });
  });

  describe('testDisplayConnectivity', () => {
    test('should pass when all displays are online', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        displays: {
          display1: { online: true },
          display2: { online: true }
        }
      });

      const result = await validationWorkflow.testDisplayConnectivity();
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('All 2 display(s) are online');
      expect(result.details.totalDisplays).toBe(2);
      expect(result.details.onlineDisplays).toBe(2);
    });

    test('should fail when some displays are offline', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        displays: {
          display1: { online: true },
          display2: { online: false }
        }
      });

      const result = await validationWorkflow.testDisplayConnectivity();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('1 of 2 displays are offline');
      expect(result.recommendations).toBeDefined();
    });

    test('should fail when no displays detected', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        displays: {}
      });

      const result = await validationWorkflow.testDisplayConnectivity();
      
      expect(result.passed).toBe(false);
      expect(result.message).toBe('No displays detected');
      expect(result.details.totalDisplays).toBe(0);
    });
  });

  describe('testNetworkConnectivity', () => {
    test('should pass with active network interface', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        network: {
          interfaces: [
            { status: 'active', ipAddress: '192.168.1.100' }
          ],
          primaryIP: '192.168.1.100'
        }
      });

      const result = await validationWorkflow.testNetworkConnectivity();
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Network connectivity available');
    });

    test('should fail with no active interfaces', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        network: {
          interfaces: [
            { status: 'inactive', ipAddress: null }
          ]
        }
      });

      const result = await validationWorkflow.testNetworkConnectivity();
      
      expect(result.passed).toBe(false);
      expect(result.message).toBe('No active network connectivity detected');
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('testSystemPreferences', () => {
    test('should pass when all settings are correct', async () => {
      mockSystemManager.verifySettings.mockResolvedValue([
        { setting: 'screensaver', status: 'correct' },
        { setting: 'displaySleep', status: 'correct' },
        { setting: 'computerSleep', status: 'correct' }
      ]);

      const result = await validationWorkflow.testSystemPreferences();
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('All 3 system preferences are correctly configured');
    });

    test('should fail when some settings are incorrect', async () => {
      mockSystemManager.verifySettings.mockResolvedValue([
        { setting: 'screensaver', status: 'incorrect' },
        { setting: 'displaySleep', status: 'correct' },
        { setting: 'computerSleep', status: 'correct' }
      ]);

      const result = await validationWorkflow.testSystemPreferences();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('1 system preferences need adjustment');
      expect(result.recommendations).toBeDefined();
    });

    test('should fail when system manager is not available', async () => {
      const workflowWithoutSystemManager = new ValidationWorkflow(mockConfig, mockMonitoring, null);
      
      const result = await workflowWithoutSystemManager.testSystemPreferences();
      
      expect(result.passed).toBe(false);
      expect(result.message).toBe('System manager not available for testing');
    });

    test('should handle verification errors', async () => {
      mockSystemManager.verifySettings.mockRejectedValue(new Error('Permission denied'));

      const result = await validationWorkflow.testSystemPreferences();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Failed to verify system preferences');
      expect(result.details.error).toBe('Permission denied');
    });
  });

  describe('testMonitoringConfiguration', () => {
    test('should pass with optimal monitoring config', async () => {
      mockConfig.get.mockReturnValue({
        enabled: true,
        thresholds: { cpu: { critical: 90 } },
        interval: 30000
      });

      const result = await validationWorkflow.testMonitoringConfiguration();
      
      expect(result.passed).toBe(true);
      expect(result.message).toBe('Monitoring configuration is optimal');
    });

    test('should fail when monitoring is disabled', async () => {
      mockConfig.get.mockReturnValue({
        enabled: false
      });

      const result = await validationWorkflow.testMonitoringConfiguration();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Monitoring is disabled');
    });
  });

  describe('testCriticalApplications', () => {
    test('should pass when all critical apps are running', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        applications: [
          { name: 'App1', status: 'running', shouldBeRunning: true },
          { name: 'App2', status: 'running', shouldBeRunning: true }
        ]
      });

      const result = await validationWorkflow.testCriticalApplications();
      
      expect(result.passed).toBe(true);
      expect(result.message).toContain('All 2 critical applications are running');
    });

    test('should fail when critical apps are stopped', async () => {
      mockMonitoring.getCurrentData.mockReturnValue({
        applications: [
          { name: 'App1', status: 'stopped', shouldBeRunning: true },
          { name: 'App2', status: 'running', shouldBeRunning: true }
        ]
      });

      const result = await validationWorkflow.testCriticalApplications();
      
      expect(result.passed).toBe(false);
      expect(result.message).toContain('1 critical applications are not running');
      expect(result.details.stoppedApps).toContain('App1');
    });
  });

  describe('runSingleTest', () => {
    test('should run test and capture results', async () => {
      const mockTest = {
        id: 'test-1',
        name: 'Test 1',
        category: 'test',
        priority: 'medium',
        description: 'Test description',
        test: jest.fn().mockResolvedValue({
          passed: true,
          message: 'Test passed'
        })
      };

      const result = await validationWorkflow.runSingleTest(mockTest);
      
      expect(result.id).toBe('test-1');
      expect(result.passed).toBe(true);
      expect(result.status).toBe('passed');
      expect(result.message).toBe('Test passed');
      expect(result.duration).toBeGreaterThan(0);
      expect(validationWorkflow.testResults).toContain(result);
    });

    test('should handle test failures', async () => {
      const mockTest = {
        id: 'test-2',
        name: 'Test 2',
        category: 'test',
        priority: 'high',
        description: 'Test description',
        test: jest.fn().mockResolvedValue({
          passed: false,
          message: 'Test failed',
          recommendations: ['Fix this issue']
        })
      };

      const result = await validationWorkflow.runSingleTest(mockTest);
      
      expect(result.passed).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.recommendations).toEqual(['Fix this issue']);
    });

    test('should handle test errors', async () => {
      const mockTest = {
        id: 'test-3',
        name: 'Test 3',
        category: 'test',
        priority: 'low',
        description: 'Test description',
        test: jest.fn().mockRejectedValue(new Error('Test error'))
      };

      const result = await validationWorkflow.runSingleTest(mockTest);
      
      expect(result.passed).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toBe('Test error');
    });
  });

  describe('generateValidationSummary', () => {
    beforeEach(() => {
      validationWorkflow.testResults = [
        { id: '1', category: 'system', priority: 'high', passed: true, status: 'passed' },
        { id: '2', category: 'system', priority: 'medium', passed: false, status: 'failed' },
        { id: '3', category: 'config', priority: 'low', passed: true, status: 'warning' },
        { id: '4', category: 'config', priority: 'high', passed: false, status: 'error' }
      ];
    });

    test('should generate correct summary statistics', () => {
      const summary = validationWorkflow.generateValidationSummary();
      
      expect(summary.total).toBe(4);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(2);
      expect(summary.warnings).toBe(1);
      expect(summary.errors).toBe(1);
      expect(summary.score).toBe(50);
      expect(summary.isHealthy).toBe(false);
    });

    test('should categorize results correctly', () => {
      const summary = validationWorkflow.generateValidationSummary();
      
      expect(summary.byCategory.system.total).toBe(2);
      expect(summary.byCategory.system.passed).toBe(1);
      expect(summary.byCategory.system.failed).toBe(1);
      
      expect(summary.byCategory.config.total).toBe(2);
      expect(summary.byCategory.config.passed).toBe(1);
      expect(summary.byCategory.config.failed).toBe(1);
    });

    test('should prioritize results correctly', () => {
      const summary = validationWorkflow.generateValidationSummary();
      
      expect(summary.byPriority.high.total).toBe(2);
      expect(summary.byPriority.medium.total).toBe(1);
      expect(summary.byPriority.low.total).toBe(1);
    });
  });

  describe('runFullValidation', () => {
    test('should prevent concurrent runs', async () => {
      validationWorkflow.isRunning = true;
      
      await expect(validationWorkflow.runFullValidation()).rejects.toThrow(
        'Validation workflow is already running'
      );
    });

    test('should run all tests and return summary', async () => {
      // Mock system data for tests
      mockMonitoring.getCurrentData.mockReturnValue(global.testHelpers.mockSystemData);
      mockConfig.get.mockReturnValue({ enabled: true });
      mockSystemManager.verifySettings.mockResolvedValue([]);

      const result = await validationWorkflow.runFullValidation();
      
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(validationWorkflow.isRunning).toBe(false);
    });
  });
});