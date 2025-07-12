/**
 * Integration tests for Notifications API endpoints
 */

const request = require('supertest');
const express = require('express');
const MockPlatformManager = require('../mocks/platform-manager');

describe('Notifications API Integration Tests', () => {
  let app;
  let mockPlatformManager;

  beforeEach(() => {
    // Create fresh instances for each test
    mockPlatformManager = new MockPlatformManager();
    
    // Create Express app with notification routes
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Import and use notification routes with mock platform manager
    const notificationRoutes = require('../../backend/routes/notifications')(mockPlatformManager);
    app.use('/api/notifications', notificationRoutes);
  });

  afterEach(() => {
    mockPlatformManager.reset();
  });

  describe('GET /api/notifications/config', () => {
    test('should return default notification configuration', async () => {
      const response = await request(app)
        .get('/api/notifications/config')
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('channels');
      expect(typeof response.body.enabled).toBe('boolean');
      expect(typeof response.body.channels).toBe('object');
    });

    test('should return consistent structure', async () => {
      const response = await request(app)
        .get('/api/notifications/config')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      
      const config = response.body.data;
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('channels');
      expect(config).toHaveProperty('history');
    });
  });

  describe('POST /api/notifications/config', () => {
    test('should save notification configuration successfully', async () => {
      const newConfig = {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhook: 'https://hooks.slack.com/services/test/webhook',
            channel: '#alerts'
          },
          email: {
            enabled: true,
            recipients: ['admin@example.com', 'tech@example.com'],
            smtpServer: 'smtp.example.com'
          },
          discord: {
            enabled: false,
            webhook: ''
          }
        },
        alertLevels: ['warning', 'critical'],
        throttling: {
          enabled: true,
          interval: 300000 // 5 minutes
        }
      };

      const response = await request(app)
        .post('/api/notifications/config')
        .send({ config: newConfig })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('saved');
    });

    test('should retrieve saved notification configuration', async () => {
      const newConfig = {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhook: 'https://hooks.slack.com/services/test/webhook/123',
            channel: '#system-alerts'
          }
        },
        alertLevels: ['critical']
      };

      // Save configuration
      await request(app)
        .post('/api/notifications/config')
        .send({ config: newConfig })
        .expect(200);

      // Retrieve and verify configuration
      const response = await request(app)
        .get('/api/notifications/config')
        .expect(200);

      const savedConfig = response.body.data;
      expect(savedConfig.enabled).toBe(newConfig.enabled);
      expect(savedConfig.channels.slack.enabled).toBe(newConfig.channels.slack.enabled);
      expect(savedConfig.channels.slack.webhook).toBe(newConfig.channels.slack.webhook);
      expect(savedConfig.channels.slack.channel).toBe(newConfig.channels.slack.channel);
      expect(savedConfig.alertLevels).toEqual(newConfig.alertLevels);
    });

    test('should handle partial configuration updates', async () => {
      const partialConfig = {
        enabled: false
      };

      const response = await request(app)
        .post('/api/notifications/config')
        .send({ config: partialConfig })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the update
      const getResponse = await request(app)
        .get('/api/notifications/config')
        .expect(200);

      expect(getResponse.body.data.enabled).toBe(false);
    });

    test('should handle empty configuration object', async () => {
      const response = await request(app)
        .post('/api/notifications/config')
        .send({ config: {} })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/notifications/test/slack', () => {
    test('should send test Slack notification successfully', async () => {
      const testData = {
        webhook: 'https://hooks.slack.com/services/test/webhook/valid',
        message: 'This is a test notification from Integration Up 4evr',
        channel: '#test-alerts'
      };

      const response = await request(app)
        .post('/api/notifications/test/slack')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Slack test notification sent successfully');
    });

    test('should validate Slack webhook URL', async () => {
      const testData = {
        webhook: 'invalid-webhook-url',
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/notifications/test/slack')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid webhook URL');
    });

    test('should handle missing webhook URL', async () => {
      const testData = {
        message: 'Test message without webhook'
      };

      const response = await request(app)
        .post('/api/notifications/test/slack')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    test('should use default message when none provided', async () => {
      const testData = {
        webhook: 'https://hooks.slack.com/services/test/webhook/default'
      };

      const response = await request(app)
        .post('/api/notifications/test/slack')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Check notification history
      const history = mockPlatformManager.getNotificationHistory();
      expect(history.length).toBe(1);
      expect(history[0].channel).toBe('slack');
      expect(history[0].message).toContain('Test notification from slack channel');
    });
  });

  describe('POST /api/notifications/test/discord', () => {
    test('should send test Discord notification successfully', async () => {
      const testData = {
        webhook: 'https://discord.com/api/webhooks/123456789/abcdef',
        message: 'Discord test notification'
      };

      const response = await request(app)
        .post('/api/notifications/test/discord')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Discord test notification sent successfully');
    });

    test('should validate Discord webhook URL', async () => {
      const testData = {
        webhook: 'https://hooks.slack.com/not-discord',
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/notifications/test/discord')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid webhook URL for Discord');
    });
  });

  describe('POST /api/notifications/test/email', () => {
    test('should send test email notification successfully', async () => {
      const testData = {
        recipients: ['test@example.com', 'admin@example.com'],
        subject: 'Test Email Notification',
        message: 'This is a test email from Integration Up 4evr'
      };

      const response = await request(app)
        .post('/api/notifications/test/email')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Email test notification sent to 2 recipient(s)');
    });

    test('should validate email recipients', async () => {
      const testData = {
        recipients: [],
        message: 'Test message'
      };

      const response = await request(app)
        .post('/api/notifications/test/email')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No email recipients specified');
    });

    test('should handle missing recipients field', async () => {
      const testData = {
        message: 'Test message without recipients'
      };

      const response = await request(app)
        .post('/api/notifications/test/email')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No email recipients specified');
    });
  });

  describe('Notification History', () => {
    test('should track notification history across multiple channels', async () => {
      // Send Slack notification
      await request(app)
        .post('/api/notifications/test/slack')
        .send({
          webhook: 'https://hooks.slack.com/services/test/webhook',
          message: 'Slack test 1'
        })
        .expect(200);

      // Send Discord notification
      await request(app)
        .post('/api/notifications/test/discord')
        .send({
          webhook: 'https://discord.com/api/webhooks/123/abc',
          message: 'Discord test 1'
        })
        .expect(200);

      // Send Email notification
      await request(app)
        .post('/api/notifications/test/email')
        .send({
          recipients: ['test@example.com'],
          message: 'Email test 1'
        })
        .expect(200);

      const history = mockPlatformManager.getNotificationHistory();
      expect(history).toHaveLength(3);

      const channels = history.map(h => h.channel);
      expect(channels).toContain('slack');
      expect(channels).toContain('discord');
      expect(channels).toContain('email');

      // Verify timestamps
      history.forEach(notification => {
        expect(notification).toHaveProperty('timestamp');
        expect(notification).toHaveProperty('success');
        expect(notification.success).toBe(true);
      });
    });

    test('should include notification details in history', async () => {
      await request(app)
        .post('/api/notifications/test/slack')
        .send({
          webhook: 'https://hooks.slack.com/services/test/webhook',
          message: 'Detailed test message'
        })
        .expect(200);

      const history = mockPlatformManager.getNotificationHistory();
      const slackNotification = history.find(h => h.channel === 'slack');
      
      expect(slackNotification).toBeDefined();
      expect(slackNotification.message).toBe('Detailed test message');
      expect(slackNotification.timestamp).toBeDefined();
      expect(new Date(slackNotification.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    test('should handle unsupported notification channels', async () => {
      const response = await request(app)
        .post('/api/notifications/test/unsupported')
        .send({ message: 'Test message' })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unsupported notification channel');
    });

    test('should handle malformed JSON in configuration', async () => {
      const response = await request(app)
        .post('/api/notifications/config')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json"}')
        .expect(400);
    });

    test('should handle platform manager errors gracefully', async () => {
      // Create a mock that throws errors
      const errorPlatformManager = {
        async handleAPIRequest() {
          throw new Error('Mock platform manager error');
        }
      };

      const errorApp = express();
      errorApp.use(express.json());
      const errorRoutes = require('../../backend/routes/notifications')(errorPlatformManager);
      errorApp.use('/api/notifications', errorRoutes);

      const response = await request(errorApp)
        .get('/api/notifications/config')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Mock platform manager error');
    });
  });

  describe('Configuration Validation', () => {
    test('should accept valid webhook URLs', async () => {
      const validWebhooks = [
        'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
        'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz',
        'https://api.example.com/webhook'
      ];

      for (const webhook of validWebhooks) {
        const config = {
          channels: {
            test: {
              enabled: true,
              webhook: webhook
            }
          }
        };

        const response = await request(app)
          .post('/api/notifications/config')
          .send({ config })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should handle complex configuration structures', async () => {
      const complexConfig = {
        enabled: true,
        channels: {
          slack: {
            enabled: true,
            webhook: 'https://hooks.slack.com/services/test',
            channel: '#alerts',
            username: 'Up4evr Bot',
            iconEmoji: ':robot_face:',
            alertLevels: ['warning', 'critical']
          },
          email: {
            enabled: true,
            recipients: ['admin@example.com', 'ops@example.com'],
            smtpServer: 'smtp.example.com',
            smtpPort: 587,
            smtpAuth: {
              user: 'notifications@example.com',
              pass: 'encrypted_password'
            },
            templates: {
              warning: 'Warning: {{message}}',
              critical: 'CRITICAL: {{message}}'
            }
          }
        },
        globalSettings: {
          throttling: {
            enabled: true,
            interval: 300000,
            maxPerInterval: 10
          },
          retry: {
            enabled: true,
            maxRetries: 3,
            backoffMultiplier: 2
          }
        }
      };

      const response = await request(app)
        .post('/api/notifications/config')
        .send({ config: complexConfig })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's saved correctly
      const getResponse = await request(app)
        .get('/api/notifications/config')
        .expect(200);

      const saved = getResponse.body.data;
      expect(saved.enabled).toBe(complexConfig.enabled);
      expect(saved.channels.slack.webhook).toBe(complexConfig.channels.slack.webhook);
      expect(saved.channels.email.recipients).toEqual(complexConfig.channels.email.recipients);
    });
  });

  describe('Real-time Notification Testing', () => {
    test('should handle rapid successive test notifications', async () => {
      const promises = [];
      
      // Send 5 rapid test notifications
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/notifications/test/slack')
            .send({
              webhook: 'https://hooks.slack.com/services/test/rapid',
              message: `Rapid test ${i + 1}`
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Check history count
      const history = mockPlatformManager.getNotificationHistory();
      expect(history.length).toBe(5);
    });

    test('should maintain separate state for different notification types', async () => {
      // Test different notification types with same message
      const testMessage = 'Cross-channel test message';
      
      await request(app)
        .post('/api/notifications/test/slack')
        .send({
          webhook: 'https://hooks.slack.com/services/test',
          message: testMessage
        });

      await request(app)
        .post('/api/notifications/test/discord')
        .send({
          webhook: 'https://discord.com/api/webhooks/123/abc',
          message: testMessage
        });

      const history = mockPlatformManager.getNotificationHistory();
      const slackNotification = history.find(h => h.channel === 'slack');
      const discordNotification = history.find(h => h.channel === 'discord');

      expect(slackNotification).toBeDefined();
      expect(discordNotification).toBeDefined();
      expect(slackNotification.message).toBe(testMessage);
      expect(discordNotification.message).toBe(testMessage);
      expect(slackNotification.channel).toBe('slack');
      expect(discordNotification.channel).toBe('discord');
    });
  });
});