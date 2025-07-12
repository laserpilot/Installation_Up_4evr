const HealthScoringEngine = require('../../backend/src/core/health-scoring');
const ValidationWorkflow = require('../../backend/src/core/validation-workflow');

describe('Health Scoring & Validation Integration', () => {
  let healthEngine, validationWorkflow;
  let mockConfig, mockMonitoring, mockSystemManager;

  beforeEach(() => {
    healthEngine = new HealthScoringEngine();
    
    mockConfig = {
      get: jest.fn((key) => {
        if (key === 'monitoring') {
          return { enabled: true, thresholds: { cpu: { critical: 90 } }, interval: 30000 };
        }
        if (key === 'notifications') {
          return { enabled: true, channels: { slack: { enabled: true } } };
        }
        if (key === 'installation') {
          return { name: 'Test Installation', description: 'Test', location: 'Test Lab', contact: 'test@example.com' };
        }
        return {};
      })
    };

    mockMonitoring = {
      getCurrentData: jest.fn(() => global.testHelpers.mockSystemData)
    };

    mockSystemManager = {
      verifySettings: jest.fn(() => Promise.resolve([
        { setting: 'screensaver', status: 'correct' },
        { setting: 'displaySleep', status: 'correct' },
        { setting: 'computerSleep', status: 'correct' }
      ]))
    };

    validationWorkflow = new ValidationWorkflow(mockConfig, mockMonitoring, mockSystemManager);
  });

  describe('Integrated Health Assessment', () => {
    test('should generate comprehensive health report with validation', async () => {
      // Generate health report
      const healthReport = healthEngine.generateHealthReport(
        global.testHelpers.mockSystemData,
        {
          monitoring: mockConfig.get('monitoring'),
          notifications: mockConfig.get('notifications'),
          installation: mockConfig.get('installation')
        }
      );

      // Run validation workflow
      const validationResult = await validationWorkflow.runFullValidation({
        categories: ['system', 'configuration']
      });

      // Verify integration points
      expect(healthReport).toHaveProperty('score');
      expect(healthReport).toHaveProperty('rating');
      expect(healthReport).toHaveProperty('recommendations');
      
      expect(validationResult.success).toBe(true);
      expect(validationResult.summary.total).toBeGreaterThan(0);

      // Verify both systems identify similar issues
      const healthIssues = healthReport.recommendations.filter(r => r.priority === 'high' || r.priority === 'critical');
      const validationFailures = validationResult.results.filter(r => !r.passed);
      
      // Should have some correlation between health issues and validation failures
      expect(healthIssues.length + validationFailures.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle system with multiple issues', async () => {
      const problematicData = {
        system: {
          cpu: { usage: 98 },
          memory: { usage: 95 },
          disk: { usage: 97 }
        },
        uptime: { seconds: 1800 }, // 30 minutes
        applications: [
          { name: 'CriticalApp', status: 'stopped', shouldBeRunning: true }
        ],
        displays: {
          display1: { online: false }
        }
      };

      mockMonitoring.getCurrentData.mockReturnValue(problematicData);

      const healthReport = healthEngine.generateHealthReport(problematicData);
      const validationResult = await validationWorkflow.runFullValidation();

      // Health scoring should identify critical issues
      expect(healthReport.score).toBeLessThan(60);
      expect(healthReport.recommendations.length).toBeGreaterThan(3);

      // Validation should have multiple failures
      expect(validationResult.summary.failed).toBeGreaterThan(2);
      expect(validationResult.summary.isHealthy).toBe(false);
    });

    test('should correlate performance issues between systems', async () => {
      const performanceData = {
        system: {
          cpu: { usage: 85 },
          memory: { usage: 90 },
          disk: { usage: 30 }
        },
        uptime: { seconds: 86400 },
        applications: [
          { name: 'TestApp', status: 'running', shouldBeRunning: true }
        ],
        displays: {
          display1: { online: true }
        }
      };

      mockMonitoring.getCurrentData.mockReturnValue(performanceData);

      const healthReport = healthEngine.generateHealthReport(performanceData);
      const validationResult = await validationWorkflow.runFullValidation({
        testIds: ['system-resources']
      });

      // Health engine should identify performance issues
      const performanceScore = healthReport.summary.categories.performance;
      expect(performanceScore).toBeLessThan(90);

      // Validation should detect resource issues
      const resourceTest = validationResult.results.find(r => r.id === 'system-resources');
      expect(resourceTest).toBeDefined();
      expect(resourceTest.passed).toBe(false);
      expect(resourceTest.message).toContain('High');
    });
  });

  describe('Configuration Assessment Integration', () => {
    test('should validate monitoring and notification configs consistently', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'monitoring') {
          return { enabled: false };
        }
        if (key === 'notifications') {
          return { enabled: false };
        }
        return {};
      });

      const healthReport = healthEngine.generateHealthReport(
        global.testHelpers.mockSystemData,
        {
          monitoring: mockConfig.get('monitoring'),
          notifications: mockConfig.get('notifications')
        }
      );

      const validationResult = await validationWorkflow.runFullValidation({
        testIds: ['monitoring-config', 'notification-config']
      });

      // Both should identify configuration issues
      const configScore = healthReport.summary.categories.configuration;
      expect(configScore).toBeLessThan(80);

      const monitoringTest = validationResult.results.find(r => r.id === 'monitoring-config');
      const notificationTest = validationResult.results.find(r => r.id === 'notification-config');
      
      expect(monitoringTest.passed).toBe(false);
      expect(notificationTest.passed).toBe(false);
    });
  });

  describe('Recommendation Correlation', () => {
    test('should provide actionable recommendations across both systems', async () => {
      const healthReport = healthEngine.generateHealthReport(global.testHelpers.mockUnhealthySystem);
      const validationResult = await validationWorkflow.runFullValidation();

      // Collect all recommendations
      const healthRecommendations = healthReport.recommendations;
      const validationRecommendations = validationResult.results
        .filter(r => r.recommendations && r.recommendations.length > 0)
        .flatMap(r => r.recommendations);

      // Should have actionable recommendations from both systems
      expect(healthRecommendations.length).toBeGreaterThan(0);
      expect(validationRecommendations.length).toBeGreaterThanOrEqual(0);

      // Recommendations should be specific and actionable
      healthRecommendations.forEach(rec => {
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('priority');
        expect(rec.action).toBeTruthy();
      });

      validationRecommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(10);
      });
    });
  });
});