/**
 * Enhanced Logging System Integration
 * Unified interface for all forensic logging capabilities
 */

const { Logger, LOG_LEVELS, LOG_CATEGORIES } = require('./logger');
const BaselineLogger = require('./baseline-logger');
const ScreenshotLogger = require('./screenshot-logger');
const ForensicHelpers = require('./forensic-helpers');

class EnhancedLoggingSystem {
  constructor(configManager, monitoringCore = null) {
    this.configManager = configManager;
    this.monitoringCore = monitoringCore;
    
    // Initialize core components
    this.logger = null;
    this.baselineLogger = null;
    this.screenshotLogger = null;
    this.forensicHelpers = null;
    
    // State tracking
    this.isInitialized = false;
    this.activeIncidents = new Map();
    this.systemStatus = 'initializing';
  }

  /**
   * Initialize the enhanced logging system
   */
  async initialize() {
    try {
      // Ensure config is loaded
      if (!this.configManager.config) {
        await this.configManager.initialize();
      }

      // Initialize core logger
      await this.initializeLogger();
      
      // Initialize baseline logger
      await this.initializeBaselineLogger();
      
      // Initialize screenshot logger
      await this.initializeScreenshotLogger();
      
      // Initialize forensic helpers
      this.initializeForensicHelpers();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      this.systemStatus = 'running';
      
      this.logger.info('application', 'Enhanced Logging System initialized successfully', {
        components: {
          logger: true,
          baseline: this.baselineLogger !== null,
          screenshots: this.screenshotLogger !== null,
          forensics: this.forensicHelpers !== null
        },
        systemStatus: this.systemStatus
      });

      return true;

    } catch (error) {
      this.systemStatus = 'error';
      console.error('Failed to initialize Enhanced Logging System:', error);
      throw error;
    }
  }

  /**
   * Initialize core logger with configuration
   */
  async initializeLogger() {
    const loggingConfig = this.configManager.getLoggingConfig();
    
    const loggerOptions = {
      logLevel: LOG_LEVELS[loggingConfig.level] || LOG_LEVELS.INFO,
      maxFileSize: loggingConfig.maxFileSize,
      retentionDays: loggingConfig.retentionDays,
      enableConsole: loggingConfig.enableConsole,
      enableForensics: loggingConfig.enableForensics,
      installationId: this.configManager.get('master.installationId')
    };

    this.logger = new Logger(loggerOptions);
    await this.logger.ensureInitialized();
  }

  /**
   * Initialize baseline system logging
   */
  async initializeBaselineLogger() {
    const baselineConfig = this.configManager.getBaselineConfig();
    
    if (!baselineConfig.enabled) {
      this.logger.info('application', 'Baseline logging disabled by configuration');
      return;
    }

    this.baselineLogger = new BaselineLogger(this.logger, baselineConfig);
    this.baselineLogger.start();
  }

  /**
   * Initialize screenshot logging
   */
  async initializeScreenshotLogger() {
    const screenshotConfig = this.configManager.getScreenshotConfig();
    
    this.screenshotLogger = new ScreenshotLogger(this.logger, screenshotConfig);
    
    if (screenshotConfig.enabled) {
      await this.screenshotLogger.start();
    } else {
      this.logger.info('application', 'Screenshot logging disabled by configuration');
    }
  }

  /**
   * Initialize forensic investigation helpers
   */
  initializeForensicHelpers() {
    this.forensicHelpers = new ForensicHelpers(
      this.logger,
      this.baselineLogger,
      this.screenshotLogger
    );
  }

  /**
   * Set up event listeners for automatic incident handling
   */
  setupEventListeners() {
    // Listen for alerts from monitoring core
    if (this.monitoringCore) {
      this.monitoringCore.on('alerts', (alerts) => {
        this.handleAlerts(alerts);
      });

      this.monitoringCore.on('monitoringError', (error) => {
        this.handleMonitoringError(error);
      });
    }

    // Auto-investigate critical incidents
    const forensicsConfig = this.configManager.getForensicsConfig();
    if (forensicsConfig.autoInvestigate) {
      this.setupAutoInvestigation();
    }
  }

  /**
   * Handle alerts from monitoring system
   */
  async handleAlerts(alerts) {
    for (const alert of alerts) {
      try {
        // Log the alert
        const logLevel = alert.level === 'critical' ? LOG_LEVELS.CRITICAL : LOG_LEVELS.WARN;
        this.logger.monitoring(logLevel, alert.message, alert);

        // Determine if this should trigger an incident
        if (await this.shouldCreateIncident(alert)) {
          const incidentId = await this.createIncident(alert);
          
          // Capture screenshot if enabled and this is a critical alert
          if (alert.level === 'critical' && this.screenshotLogger) {
            await this.screenshotLogger.captureIncidentScreenshot(
              incidentId, 
              `Critical alert: ${alert.message}`
            );
          }
        }

      } catch (error) {
        this.logger.logException(error, {
          operation: 'handleAlerts',
          alert: alert
        });
      }
    }
  }

  /**
   * Handle monitoring system errors
   */
  async handleMonitoringError(error) {
    this.logger.logException(error, {
      component: 'MonitoringCore',
      operation: 'monitoring'
    });

    // Create anomaly log for monitoring failures
    this.logger.logAnomaly(
      'Monitoring system error',
      'error',
      'normal_operation',
      { error: error.message }
    );
  }

  /**
   * Determine if alert should create an incident
   */
  async shouldCreateIncident(alert) {
    const forensicsConfig = this.configManager.getForensicsConfig();
    const thresholds = forensicsConfig.incidentPriority.escalationThresholds;

    // Always create incident for critical alerts
    if (alert.level === 'critical') {
      return true;
    }

    // Check error threshold within time window
    if (alert.level === 'warning') {
      const recentErrors = await this.getRecentErrorCount(thresholds.timeWindow);
      return recentErrors >= thresholds.errorThreshold;
    }

    return false;
  }

  /**
   * Get count of recent errors within time window
   */
  async getRecentErrorCount(timeWindowMinutes) {
    try {
      const startDate = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      const logs = await this.logger.getLogs({
        startDate,
        level: LOG_LEVELS.ERROR,
        limit: 100
      });
      return logs.length;
    } catch (error) {
      this.logger.logException(error, { operation: 'getRecentErrorCount' });
      return 0;
    }
  }

  /**
   * Create new incident
   */
  async createIncident(triggerAlert) {
    const incidentId = this.logger.startIncident(`Alert triggered: ${triggerAlert.message}`);
    
    this.activeIncidents.set(incidentId, {
      id: incidentId,
      startTime: new Date().toISOString(),
      triggerAlert,
      status: 'active',
      severity: triggerAlert.level
    });

    // Trigger quick triage
    const forensicsConfig = this.configManager.getForensicsConfig();
    if (forensicsConfig.incidentPriority.autoTriage) {
      try {
        const triage = await this.forensicHelpers.quickTriage(incidentId);
        this.logger.incident(LOG_LEVELS.INFO, 'Incident triage completed', {
          incidentId,
          triage
        });
      } catch (error) {
        this.logger.logException(error, {
          operation: 'createIncident',
          incidentId
        });
      }
    }

    return incidentId;
  }

  /**
   * Resolve incident
   */
  async resolveIncident(incidentId, resolution = 'Manually resolved') {
    if (!this.activeIncidents.has(incidentId)) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    const incident = this.activeIncidents.get(incidentId);
    incident.status = 'resolved';
    incident.endTime = new Date().toISOString();
    incident.resolution = resolution;

    this.logger.endIncident(resolution);
    this.activeIncidents.delete(incidentId);

    // Perform full investigation if configured
    const forensicsConfig = this.configManager.getForensicsConfig();
    if (forensicsConfig.autoInvestigate) {
      try {
        const investigation = await this.forensicHelpers.investigateIncident(incidentId);
        
        if (forensicsConfig.exportInvestigations) {
          await this.forensicHelpers.exportInvestigation(
            investigation,
            forensicsConfig.exportFormat
          );
        }
      } catch (error) {
        this.logger.logException(error, {
          operation: 'resolveIncident',
          incidentId
        });
      }
    }

    return incident;
  }

  /**
   * Setup automatic investigation for incidents
   */
  setupAutoInvestigation() {
    // Auto-investigate incidents after they're resolved
    setInterval(async () => {
      await this.checkForAutoInvestigation();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Check for incidents that need automatic investigation
   */
  async checkForAutoInvestigation() {
    // This would typically check for recently ended incidents
    // and trigger investigations if they haven't been investigated yet
    // Implementation depends on how incidents are tracked long-term
  }

  /**
   * Manual incident investigation
   */
  async investigateIncident(incidentId, options = {}) {
    if (!this.forensicHelpers) {
      throw new Error('Forensic helpers not initialized');
    }

    const investigation = await this.forensicHelpers.investigateIncident(
      incidentId,
      options.hoursBack || this.configManager.getForensicsConfig().investigationTimeWindow
    );

    // Export if requested
    if (options.export) {
      const exportPath = await this.forensicHelpers.exportInvestigation(
        investigation,
        options.format || 'json'
      );
      investigation.exportPath = exportPath;
    }

    return investigation;
  }

  /**
   * Enable temporary screenshot logging
   */
  async enableTemporaryScreenshots(durationMinutes = 60) {
    if (!this.screenshotLogger) {
      throw new Error('Screenshot logger not initialized');
    }

    const screenshotConfig = this.configManager.getScreenshotConfig();
    if (!screenshotConfig.temporaryEnable.allowRemoteActivation) {
      throw new Error('Remote screenshot activation is disabled');
    }

    this.screenshotLogger.enableTemporary(durationMinutes);
    
    this.logger.security(LOG_LEVELS.WARN, 'Temporary screenshot logging enabled', {
      duration: durationMinutes,
      reason: 'Manual activation'
    });
  }

  /**
   * Force capture screenshot
   */
  async captureScreenshot(reason = 'Manual capture') {
    if (!this.screenshotLogger) {
      throw new Error('Screenshot logger not initialized');
    }

    return await this.screenshotLogger.captureScreenshot('manual', { reason });
  }

  /**
   * Get system status and statistics
   */
  getSystemStatus() {
    const status = {
      initialized: this.isInitialized,
      status: this.systemStatus,
      activeIncidents: this.activeIncidents.size,
      components: {
        logger: this.logger !== null,
        baseline: this.baselineLogger !== null && this.baselineLogger.isActive?.() || false,
        screenshots: this.screenshotLogger !== null && this.screenshotLogger.isActive(),
        forensics: this.forensicHelpers !== null
      },
      configuration: {
        logging: this.configManager.getLoggingConfig(),
        baseline: this.configManager.getBaselineConfig(),
        screenshots: this.configManager.getScreenshotConfig(),
        forensics: this.configManager.getForensicsConfig()
      }
    };

    // Add storage usage if available
    if (this.screenshotLogger) {
      try {
        status.storage = {
          screenshots: this.screenshotLogger.getStorageUsage()
        };
      } catch (error) {
        // Storage info optional
      }
    }

    return status;
  }

  /**
   * Update configuration and restart components
   */
  async updateConfiguration(configUpdates) {
    try {
      // Update configuration
      for (const [section, updates] of Object.entries(configUpdates)) {
        switch (section) {
          case 'logging':
            await this.configManager.updateLoggingConfig(updates);
            break;
          case 'baseline':
            await this.configManager.updateBaselineConfig(updates);
            break;
          case 'screenshots':
            await this.configManager.updateScreenshotConfig(updates);
            break;
          case 'forensics':
            await this.configManager.updateForensicsConfig(updates);
            break;
        }
      }

      // Restart affected components
      await this.restartComponents(Object.keys(configUpdates));

      this.logger.info('application', 'Configuration updated successfully', {
        sections: Object.keys(configUpdates)
      });

      return true;

    } catch (error) {
      this.logger.logException(error, {
        operation: 'updateConfiguration',
        configUpdates
      });
      throw error;
    }
  }

  /**
   * Restart specific components
   */
  async restartComponents(components) {
    for (const component of components) {
      switch (component) {
        case 'baseline':
          if (this.baselineLogger) {
            this.baselineLogger.stop();
            await this.initializeBaselineLogger();
          }
          break;
        case 'screenshots':
          if (this.screenshotLogger) {
            this.screenshotLogger.stop();
            await this.initializeScreenshotLogger();
          }
          break;
        // Logger and forensics don't need restarting for config changes
      }
    }
  }

  /**
   * Shutdown the enhanced logging system
   */
  async shutdown() {
    try {
      this.systemStatus = 'shutting_down';

      // Resolve all active incidents
      for (const [incidentId, incident] of this.activeIncidents) {
        await this.resolveIncident(incidentId, 'System shutdown');
      }

      // Stop components
      if (this.baselineLogger) {
        this.baselineLogger.stop();
      }

      if (this.screenshotLogger) {
        this.screenshotLogger.stop();
      }

      this.logger.info('application', 'Enhanced Logging System shutdown complete');
      this.systemStatus = 'stopped';

    } catch (error) {
      this.logger.logException(error, { operation: 'shutdown' });
      throw error;
    }
  }

  /**
   * Get public API for external use
   */
  getAPI() {
    return {
      // Logging methods
      log: (level, category, message, context) => this.logger.log(level, category, message, context),
      logException: (error, context) => this.logger.logException(error, context),
      logAnomaly: (description, current, expected, context) => 
        this.logger.logAnomaly(description, current, expected, context),
      
      // Incident management
      createIncident: (description) => this.createIncident({ message: description, level: 'warning' }),
      resolveIncident: (incidentId, resolution) => this.resolveIncident(incidentId, resolution),
      investigateIncident: (incidentId, options) => this.investigateIncident(incidentId, options),
      
      // System management
      getStatus: () => this.getSystemStatus(),
      captureScreenshot: (reason) => this.captureScreenshot(reason),
      enableTemporaryScreenshots: (duration) => this.enableTemporaryScreenshots(duration),
      
      // Configuration
      updateConfiguration: (updates) => this.updateConfiguration(updates),
      
      // Direct access to components (read-only)
      logger: this.logger,
      forensicHelpers: this.forensicHelpers
    };
  }
}

module.exports = EnhancedLoggingSystem;