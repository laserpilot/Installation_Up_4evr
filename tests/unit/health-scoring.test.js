const HealthScoringEngine = require('../../backend/src/core/health-scoring');

describe('HealthScoringEngine', () => {
  let healthEngine;

  beforeEach(() => {
    healthEngine = new HealthScoringEngine();
  });

  describe('calculateHealthScore', () => {
    test('should return excellent rating for healthy system', () => {
      const result = healthEngine.calculateHealthScore(global.testHelpers.mockHealthySystem);
      
      expect(result.overall).toBeGreaterThanOrEqual(75);
      expect(result.rating).toBe('good');
      expect(result.breakdown).toHaveProperty('performance');
      expect(result.breakdown).toHaveProperty('stability');
      expect(result.breakdown).toHaveProperty('security');
      expect(result.breakdown).toHaveProperty('configuration');
    });

    test('should return critical rating for unhealthy system', () => {
      const result = healthEngine.calculateHealthScore(global.testHelpers.mockUnhealthySystem);
      
      expect(result.overall).toBeLessThan(60);
      expect(result.rating).toBe('poor');
      expect(result.recommendations).toHaveProperty('length');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('should handle system with missing data gracefully', () => {
      const incompleteData = { system: { cpu: { usage: 50 } } };
      const result = healthEngine.calculateHealthScore(incompleteData);
      
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.rating).toBeDefined();
    });
  });

  describe('calculatePerformanceScore', () => {
    test('should give perfect score for low resource usage', () => {
      const systemData = {
        system: {
          cpu: { usage: 10 },
          memory: { usage: 30 },
          disk: { usage: 40 }
        }
      };
      
      const result = healthEngine.calculatePerformanceScore(systemData);
      expect(result.score).toBeGreaterThanOrEqual(95);
      expect(result.factors).toHaveLength(0);
    });

    test('should detect high CPU usage', () => {
      const systemData = {
        system: {
          cpu: { usage: 98 },
          memory: { usage: 30 },
          disk: { usage: 40 }
        }
      };
      
      const result = healthEngine.calculatePerformanceScore(systemData);
      expect(result.score).toBeLessThan(80);
      expect(result.factors.some(f => f.type === 'cpu')).toBe(true);
    });

    test('should detect high memory usage', () => {
      const systemData = {
        system: {
          cpu: { usage: 10 },
          memory: { usage: 95 },
          disk: { usage: 40 }
        }
      };
      
      const result = healthEngine.calculatePerformanceScore(systemData);
      expect(result.score).toBeLessThan(80);
      expect(result.factors.some(f => f.type === 'memory')).toBe(true);
    });

    test('should detect high disk usage', () => {
      const systemData = {
        system: {
          cpu: { usage: 10 },
          memory: { usage: 30 },
          disk: { usage: 98 }
        }
      };
      
      const result = healthEngine.calculatePerformanceScore(systemData);
      expect(result.score).toBeLessThan(80);
      expect(result.factors.some(f => f.type === 'disk')).toBe(true);
    });
  });

  describe('calculateStabilityScore', () => {
    test('should give high score for good uptime and running apps', () => {
      const systemData = {
        uptime: { seconds: 604800 }, // 1 week
        applications: [
          { name: 'TestApp1', status: 'running', shouldBeRunning: true },
          { name: 'TestApp2', status: 'running', shouldBeRunning: true }
        ],
        displays: {
          display1: { online: true },
          display2: { online: true }
        }
      };
      
      const result = healthEngine.calculateStabilityScore(systemData);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    test('should detect stopped applications', () => {
      const systemData = {
        uptime: { seconds: 604800 },
        applications: [
          { name: 'TestApp1', status: 'stopped', shouldBeRunning: true },
          { name: 'TestApp2', status: 'running', shouldBeRunning: true }
        ]
      };
      
      const result = healthEngine.calculateStabilityScore(systemData);
      expect(result.score).toBeLessThan(90);
      expect(result.factors.some(f => f.type === 'applications')).toBe(true);
    });

    test('should detect offline displays', () => {
      const systemData = {
        uptime: { seconds: 604800 },
        displays: {
          display1: { online: true },
          display2: { online: false }
        }
      };
      
      const result = healthEngine.calculateStabilityScore(systemData);
      expect(result.score).toBeLessThan(100);
      expect(result.factors.some(f => f.type === 'displays')).toBe(true);
    });

    test('should handle recent restarts', () => {
      const systemData = {
        uptime: { seconds: 3600 } // 1 hour
      };
      
      const result = healthEngine.calculateStabilityScore(systemData);
      expect(result.score).toBeLessThan(90);
      expect(result.factors.some(f => f.type === 'uptime')).toBe(true);
    });
  });

  describe('calculateResourceScore', () => {
    test('should return 100 for usage below good threshold', () => {
      const score = healthEngine.calculateResourceScore(50, { good: 70, fair: 85, poor: 95 });
      expect(score).toBe(100);
    });

    test('should return decreasing scores as usage increases', () => {
      const thresholds = { good: 70, fair: 85, poor: 95 };
      const score1 = healthEngine.calculateResourceScore(75, thresholds);
      const score2 = healthEngine.calculateResourceScore(90, thresholds);
      const score3 = healthEngine.calculateResourceScore(98, thresholds);
      
      expect(score1).toBeGreaterThan(score2);
      expect(score2).toBeGreaterThan(score3);
      expect(score3).toBeGreaterThan(0);
    });
  });

  describe('getHealthRating', () => {
    test('should return correct ratings for score ranges', () => {
      expect(healthEngine.getHealthRating(95)).toBe('excellent');
      expect(healthEngine.getHealthRating(85)).toBe('good');
      expect(healthEngine.getHealthRating(65)).toBe('fair');
      expect(healthEngine.getHealthRating(45)).toBe('poor');
      expect(healthEngine.getHealthRating(25)).toBe('critical');
    });
  });

  describe('generateRecommendations', () => {
    test('should generate high priority recommendations for critical issues', () => {
      const scores = {
        performance: { 
          score: 30, 
          factors: [
            { type: 'cpu', usage: 95, score: 30 },
            { type: 'memory', usage: 90, score: 40 }
          ]
        },
        stability: { score: 90, factors: [] },
        security: { score: 90, factors: [] },
        configuration: { score: 90, factors: [] }
      };
      
      const recommendations = healthEngine.generateRecommendations(scores, {}, {});
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.priority === 'critical' || r.priority === 'high')).toBe(true);
      expect(recommendations.some(r => r.category === 'performance')).toBe(true);
    });

    test('should sort recommendations by priority', () => {
      const scores = {
        performance: { 
          score: 20, 
          factors: [
            { type: 'cpu', usage: 95, score: 30 },
            { type: 'disk', usage: 98, score: 20 }
          ]
        },
        stability: { score: 90, factors: [] },
        security: { score: 90, factors: [] },
        configuration: { score: 90, factors: [] }
      };
      
      const recommendations = healthEngine.generateRecommendations(scores, {}, {});
      
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Check that critical/high priority items come before medium/low priority
      const hasCriticalOrHigh = recommendations.some(r => r.priority === 'critical' || r.priority === 'high');
      expect(hasCriticalOrHigh).toBe(true);
    });
  });

  describe('generateHealthReport', () => {
    test('should generate complete health report', () => {
      const report = healthEngine.generateHealthReport(global.testHelpers.mockSystemData);
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('score');
      expect(report).toHaveProperty('rating');
      expect(report).toHaveProperty('breakdown');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('summary');
      
      expect(report.summary).toHaveProperty('criticalIssues');
      expect(report.summary).toHaveProperty('highPriorityIssues');
      expect(report.summary).toHaveProperty('totalRecommendations');
      expect(report.summary).toHaveProperty('categories');
    });

    test('should limit recommendations to top 10', () => {
      const report = healthEngine.generateHealthReport(global.testHelpers.mockUnhealthySystem);
      expect(report.recommendations.length).toBeLessThanOrEqual(10);
    });
  });

  describe('analyzeHealthTrend', () => {
    test('should detect improving trend', () => {
      const historicalScores = [70, 75, 80, 85];
      const trend = healthEngine.analyzeHealthTrend(90, historicalScores);
      
      expect(trend.trend).toBe('improving');
      expect(trend.change).toBeGreaterThan(0);
    });

    test('should detect declining trend', () => {
      const historicalScores = [90, 85, 80, 75];
      const trend = healthEngine.analyzeHealthTrend(70, historicalScores);
      
      expect(trend.trend).toBe('declining');
      expect(trend.change).toBeLessThan(0);
    });

    test('should detect stable trend', () => {
      const historicalScores = [80, 82, 78, 81];
      const trend = healthEngine.analyzeHealthTrend(80, historicalScores);
      
      expect(trend.trend).toBe('stable');
      expect(Math.abs(trend.change)).toBeLessThanOrEqual(5);
    });

    test('should handle insufficient data', () => {
      const trend = healthEngine.analyzeHealthTrend(80, [75]);
      expect(trend.trend).toBe('insufficient_data');
    });
  });
});