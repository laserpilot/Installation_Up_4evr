/**
 * Platform-Agnostic Monitoring Core
 * Manages monitoring functionality across different platforms
 */

const EventEmitter = require('events');
const { PlatformFactory, MonitoringDataInterface } = require('../interfaces');
const { LOG_LEVELS } = require('../logger');

class MonitoringCore extends EventEmitter {
  constructor(configManager) {
    super();
    this.configManager = configManager; // Store the config manager
    this.installationId = this.generateInstallationId();
    this.monitoringData = new MonitoringDataInterface();
    this.watchedApplications = new Map();
    this.appHistory = new Map();
    this.monitoringInterval = null;
    this.heartbeatInterval = null;
    this.dailyReportInterval = null;
    this.notifications = [];
    this.alertThresholds = {
      cpuUsage: 90,
      memoryUsage: 90,
      diskUsage: 90,
      temperatureCpu: 85,
      appRestarts: 5
    };
    this.logger = null;
    
    // Daily reporting data
    this.dailyMetrics = [];
    this.lastDailyReport = null;
    this.dailyStats = {
      alerts: [],
      uptimeEvents: [],
      performanceSpikes: [],
      errors: []
    };

    // Initialize platform-specific provider
    try {
      this.provider = PlatformFactory.createMonitoringProvider();
    } catch (error) {
      console.warn(
        'Failed to initialize platform-specific monitoring:',
        error.message
      );
      this.provider = null;
    }
  }

  /**
   * Inject logger for structured logging
   */
  setLogger(logger) {
    this.logger = logger;
  }

  generateInstallationId() {
    const os = require('os');
    const crypto = require('crypto');
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const random = Math.random().toString(36).substring(2, 15);
    const seed = `${hostname}-${platform}-${arch}-${Date.now()}-${random}`;
    return crypto.createHash('md5').update(seed).digest('hex').substring(0, 16);
  }

  /**
   * Start monitoring system with specified interval
   */
  async startMonitoring(interval = 30000) {
    if (!this.provider) {
      throw new Error('No monitoring provider available for this platform');
    }

    console.log('[INFO] Starting monitoring system', { interval });

    // Start data collection
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMonitoringData();
        this.evaluateAlerts();
        this.collectDailyMetrics(); // Collect metrics for daily reporting
      } catch (error) {
        console.error('[ERROR] Monitoring data collection failed:', error);
      }
    }, interval);

    // Start heartbeat
    this.heartbeatInterval = setInterval(
      () => {
        this.sendHeartbeat();
      },
      Math.min(interval, 60000)
    ); // Heartbeat at least every minute

    // Start daily reporting
    this.startDailyReporting();

    // Initial data collection
    await this.collectMonitoringData();
    this.sendHeartbeat();
  }

  /**
   * Stop monitoring system
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.dailyReportInterval) {
      clearInterval(this.dailyReportInterval);
      this.dailyReportInterval = null;
    }
    console.log('[INFO] Monitoring system stopped');
  }

  /**
   * Collect monitoring data from platform provider
   */
  async collectMonitoringData() {
    if (!this.provider) return;

    try {
      // Get system metrics
      this.monitoringData.system = await this.provider.getSystemMetrics();
      
      // Add system uptime to the data
      const uptimeSeconds = process.uptime();
      this.monitoringData.system.uptime = {
        seconds: Math.floor(uptimeSeconds),
        formatted: this.formatUptime(uptimeSeconds)
      };

      // Get network information
      this.monitoringData.network = await this.provider.getNetworkInfo();

      // Get application status
      this.monitoringData.applications =
        await this.provider.getApplicationStatus(
          Array.from(this.watchedApplications.keys())
        );

      // Get display information
      this.monitoringData.displays = await this.provider.getDisplayInfo();

      // Update timestamp
      this.monitoringData.timestamp = new Date().toISOString();

      // Emit monitoring data event
      this.emit('dataCollected', this.monitoringData);
    } catch (error) {
      console.error('[ERROR] Failed to collect monitoring data:', error);
      this.emit('monitoringError', error);
    }
  }

  /**
   * Evaluate alerts based on current data and thresholds
   */
  evaluateAlerts() {
    const alerts = [];
    const system = this.monitoringData.system;
    const notificationConfig = this.configManager.get('notifications') || {};
    const triggers = notificationConfig.triggers || {};

    // CPU usage alert
    if (
      triggers.high_cpu &&
      system.cpu &&
      system.cpu.usage > this.alertThresholds.cpuUsage
    ) {
      alerts.push({
        type: 'cpu_high',
        level: 'warning',
        message: `High CPU usage: ${system.cpu.usage.toFixed(1)}%`,
        value: system.cpu.usage,
        threshold: this.alertThresholds.cpuUsage
      });
    }

    // Memory usage alert
    if (
      triggers.high_memory &&
      system.memory &&
      system.memory.usage > this.alertThresholds.memoryUsage
    ) {
      alerts.push({
        type: 'memory_high',
        level: 'warning',
        message: `High memory usage: ${system.memory.usage.toFixed(1)}%`,
        value: system.memory.usage,
        threshold: this.alertThresholds.memoryUsage
      });
    }

    // Disk usage alert
    if (
      triggers.low_disk &&
      system.disk &&
      system.disk.usage > this.alertThresholds.diskUsage
    ) {
      alerts.push({
        type: 'disk_high',
        level: 'critical',
        message: `High disk usage: ${system.disk.usage.toFixed(1)}%`,
        value: system.disk.usage,
        threshold: this.alertThresholds.diskUsage
      });
    }

    // Application alerts
    if (triggers.app_crash) {
      this.monitoringData.applications.forEach(app => {
        if (app.status === 'stopped' && app.shouldBeRunning) {
          alerts.push({
            type: 'app_stopped',
            level: 'critical',
            message: `Application stopped: ${app.name}`,
            application: app.name
          });
        }
      });
    }

    // Filter alerts based on severity level configuration
    const severityConfig = notificationConfig.severity || {
      warning: true,
      critical: true,
      info: false
    };
    const filteredAlerts = alerts.filter(alert => {
      return severityConfig[alert.level] === true;
    });

    // Emit alerts if any pass the severity filter
    if (filteredAlerts.length > 0) {
      this.emit('alerts', filteredAlerts);
    }
  }

  /**
   * Format uptime seconds into human readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Send heartbeat signal
   */
  sendHeartbeat() {
    const heartbeat = {
      installationId: this.installationId,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      status: this.getOverallStatus(),
      quickStats: {
        cpu: this.monitoringData.system.cpu?.usage || 0,
        memory: this.monitoringData.system.memory?.usage || 0,
        apps: this.monitoringData.applications.length
      }
    };

    // Heartbeat logging reduced - only log on errors or major status changes
    this.emit('heartbeat', heartbeat);
  }

  /**
   * Get overall system status
   */
  getOverallStatus() {
    const system = this.monitoringData.system;

    // Check for critical issues
    if (system.disk?.usage > 95) return 'critical';
    if (system.cpu?.usage > 95) return 'critical';
    if (system.memory?.usage > 95) return 'critical';

    // Check for warnings
    if (system.disk?.usage > this.alertThresholds.diskUsage) return 'warning';
    if (system.cpu?.usage > this.alertThresholds.cpuUsage) return 'warning';
    if (system.memory?.usage > this.alertThresholds.memoryUsage)
      return 'warning';

    // Check application status
    const stoppedApps = this.monitoringData.applications.filter(
      app => app.status === 'stopped' && app.shouldBeRunning
    );
    if (stoppedApps.length > 0) return 'warning';

    return 'good';
  }

  /**
   * Add application to monitoring
   */
  addApplication(name, path, options = {}) {
    this.watchedApplications.set(name, {
      path,
      shouldBeRunning: options.shouldBeRunning !== false,
      ...options
    });
  }

  /**
   * Remove application from monitoring
   */
  removeApplication(name) {
    this.watchedApplications.delete(name);
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    this.emit('thresholdsUpdated', this.alertThresholds);
  }

  /**
   * Get current monitoring data
   */
  getCurrentData() {
    return this.monitoringData;
  }

  /**
   * Get application history
   */
  getApplicationHistory(appName) {
    return this.appHistory.get(appName) || [];
  }

  /**
   * Start daily reporting system
   */
  startDailyReporting() {
    const notificationConfig = this.configManager.get('notifications') || {};
    const triggers = notificationConfig.triggers || {};
    
    if (!triggers.daily_status) {
      return; // Daily reporting disabled
    }

    // Calculate next 9 AM
    const now = new Date();
    let nextReport = new Date();
    nextReport.setHours(9, 0, 0, 0); // 9 AM
    
    if (nextReport <= now) {
      // If it's past 9 AM today, schedule for tomorrow
      nextReport.setDate(nextReport.getDate() + 1);
    }

    const msUntilNextReport = nextReport.getTime() - now.getTime();

    if (this.logger) {
      this.logger.info('monitoring', `Daily report scheduled for ${nextReport.toISOString()}`, {
        millisecondsUntil: msUntilNextReport
      });
    }

    // Set timeout for first report
    setTimeout(() => {
      this.generateDailyReport();
      
      // Then set up daily interval (24 hours)
      this.dailyReportInterval = setInterval(() => {
        this.generateDailyReport();
      }, 24 * 60 * 60 * 1000);
      
    }, msUntilNextReport);
  }

  /**
   * Collect metrics for daily reporting
   */
  collectDailyMetrics() {
    const timestamp = new Date();
    const system = this.monitoringData.system;

    if (!system) return;

    const metric = {
      timestamp: timestamp.toISOString(),
      cpu: system.cpu?.usage || 0,
      memory: system.memory?.usage || 0,
      disk: system.disk?.usage || 0,
      uptime: system.uptime?.seconds || 0,
      applicationCount: this.monitoringData.applications?.length || 0,
      status: this.getOverallStatus()
    };

    this.dailyMetrics.push(metric);

    // Keep only last 24 hours of metrics (assuming 30-second intervals = 2880 data points)
    const maxMetrics = 2880;
    if (this.dailyMetrics.length > maxMetrics) {
      this.dailyMetrics = this.dailyMetrics.slice(-maxMetrics);
    }

    // Detect performance spikes
    this.detectPerformanceSpikes(metric);
  }

  /**
   * Detect performance spikes for daily reporting
   */
  detectPerformanceSpikes(currentMetric) {
    if (this.dailyMetrics.length < 10) return; // Need some history

    const recentMetrics = this.dailyMetrics.slice(-10);
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;

    // Detect spikes (current usage 50% higher than recent average)
    if (currentMetric.cpu > avgCpu * 1.5 && currentMetric.cpu > 60) {
      this.dailyStats.performanceSpikes.push({
        timestamp: currentMetric.timestamp,
        type: 'cpu',
        value: currentMetric.cpu,
        average: avgCpu
      });
    }

    if (currentMetric.memory > avgMemory * 1.5 && currentMetric.memory > 60) {
      this.dailyStats.performanceSpikes.push({
        timestamp: currentMetric.timestamp,
        type: 'memory',
        value: currentMetric.memory,
        average: avgMemory
      });
    }

    // Limit spike history to prevent memory bloat
    if (this.dailyStats.performanceSpikes.length > 100) {
      this.dailyStats.performanceSpikes = this.dailyStats.performanceSpikes.slice(-50);
    }
  }

  /**
   * Generate comprehensive daily report
   */
  async generateDailyReport() {
    try {
      const report = await this.compileDailyReport();
      const notificationData = this.formatDailyReportForNotification(report);

      // Emit daily report event
      this.emit('dailyReport', report);

      // Log the daily report
      if (this.logger) {
        this.logger.monitoring(LOG_LEVELS.INFO, 'Daily system report generated', {
          report: report.summary,
          notificationChannels: notificationData.channels
        });
      }

      // Send notification if configured
      const notificationConfig = this.configManager.get('notifications') || {};
      if (notificationConfig.enabled) {
        this.emit('notification', {
          type: 'daily_report',
          data: notificationData,
          timestamp: new Date().toISOString()
        });
      }

      this.lastDailyReport = report;

      // Reset daily stats for next day
      this.resetDailyStats();

    } catch (error) {
      if (this.logger) {
        this.logger.logException(error, {
          operation: 'generateDailyReport',
          component: 'MonitoringCore'
        });
      }
    }
  }

  /**
   * Compile comprehensive daily report data
   */
  async compileDailyReport() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const todayMetrics = this.dailyMetrics.filter(m => 
      new Date(m.timestamp) > yesterday
    );

    // Calculate statistics
    const stats = this.calculateDailyStats(todayMetrics);
    
    // Get log statistics if logger is available
    let logStats = {};
    if (this.logger) {
      try {
        logStats = await this.logger.getLogStats(24);
      } catch (error) {
        logStats = { error: 'Failed to get log statistics' };
      }
    }

    const report = {
      generatedAt: now.toISOString(),
      installationId: this.installationId,
      period: {
        start: yesterday.toISOString(),
        end: now.toISOString(),
        hours: 24
      },
      summary: {
        status: this.getOverallStatus(),
        uptime: this.formatUptime(process.uptime()),
        dataPoints: todayMetrics.length,
        alertCount: this.dailyStats.alerts.length,
        errorCount: logStats.errorCount || 0,
        spikeCount: this.dailyStats.performanceSpikes.length
      },
      performance: stats,
      applications: {
        monitored: this.watchedApplications.size,
        current: this.monitoringData.applications?.length || 0,
        issues: this.monitoringData.applications?.filter(app => 
          app.status === 'stopped' && app.shouldBeRunning
        ).length || 0
      },
      alerts: this.dailyStats.alerts.slice(-10), // Last 10 alerts
      spikes: this.dailyStats.performanceSpikes.slice(-5), // Last 5 spikes
      logs: logStats,
      trends: this.calculateTrends(todayMetrics),
      recommendations: this.generateRecommendations(stats, logStats)
    };

    return report;
  }

  /**
   * Calculate daily statistics from metrics
   */
  calculateDailyStats(metrics) {
    if (metrics.length === 0) {
      return {
        cpu: { min: 0, max: 0, avg: 0 },
        memory: { min: 0, max: 0, avg: 0 },
        disk: { min: 0, max: 0, avg: 0 }
      };
    }

    const calculate = (values) => ({
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length
    });

    return {
      cpu: calculate(metrics.map(m => m.cpu)),
      memory: calculate(metrics.map(m => m.memory)),
      disk: calculate(metrics.map(m => m.disk)),
      statusDistribution: this.calculateStatusDistribution(metrics)
    };
  }

  /**
   * Calculate status distribution
   */
  calculateStatusDistribution(metrics) {
    const distribution = { good: 0, warning: 0, critical: 0 };
    metrics.forEach(metric => {
      distribution[metric.status] = (distribution[metric.status] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Calculate performance trends
   */
  calculateTrends(metrics) {
    if (metrics.length < 2) return { cpu: 'stable', memory: 'stable', disk: 'stable' };

    const recent = metrics.slice(-Math.min(10, metrics.length));
    const earlier = metrics.slice(0, Math.min(10, metrics.length));

    const calculateTrend = (recentVals, earlierVals) => {
      const recentAvg = recentVals.reduce((sum, val) => sum + val, 0) / recentVals.length;
      const earlierAvg = earlierVals.reduce((sum, val) => sum + val, 0) / earlierVals.length;
      const diff = recentAvg - earlierAvg;
      
      if (Math.abs(diff) < 5) return 'stable';
      return diff > 0 ? 'increasing' : 'decreasing';
    };

    return {
      cpu: calculateTrend(recent.map(m => m.cpu), earlier.map(m => m.cpu)),
      memory: calculateTrend(recent.map(m => m.memory), earlier.map(m => m.memory)),
      disk: calculateTrend(recent.map(m => m.disk), earlier.map(m => m.disk))
    };
  }

  /**
   * Generate recommendations based on daily statistics
   */
  generateRecommendations(stats, logStats) {
    const recommendations = [];

    // Performance recommendations
    if (stats.cpu.avg > 70) {
      recommendations.push({
        type: 'performance',
        severity: 'warning',
        message: `Average CPU usage is high (${stats.cpu.avg.toFixed(1)}%). Consider identifying resource-intensive processes.`
      });
    }

    if (stats.memory.avg > 80) {
      recommendations.push({
        type: 'performance',
        severity: 'warning',
        message: `Average memory usage is high (${stats.memory.avg.toFixed(1)}%). Consider checking for memory leaks.`
      });
    }

    if (stats.disk.avg > 85) {
      recommendations.push({
        type: 'storage',
        severity: 'critical',
        message: `Disk usage is high (${stats.disk.avg.toFixed(1)}%). Clean up unnecessary files or expand storage.`
      });
    }

    // Error recommendations
    if (logStats.errorCount > 50) {
      recommendations.push({
        type: 'stability',
        severity: 'warning',
        message: `High error count detected (${logStats.errorCount} errors in 24h). Review error logs for patterns.`
      });
    }

    // Stability recommendations
    const statusDist = stats.statusDistribution || {};
    const totalStatuses = Object.values(statusDist).reduce((sum, count) => sum + count, 0);
    if (totalStatuses > 0) {
      const criticalPercent = (statusDist.critical || 0) / totalStatuses * 100;
      if (criticalPercent > 10) {
        recommendations.push({
          type: 'stability',
          severity: 'critical',
          message: `System spent ${criticalPercent.toFixed(1)}% of time in critical status. Investigate root causes.`
        });
      }
    }

    return recommendations;
  }

  /**
   * Format daily report for notification channels
   */
  formatDailyReportForNotification(report) {
    const summary = report.summary;
    const performance = report.performance;

    // Status emoji
    const statusEmoji = {
      good: '🟢',
      warning: '🟡', 
      critical: '🔴'
    };

    // Trend arrows
    const trendEmoji = {
      increasing: '📈',
      decreasing: '📉',
      stable: '➡️'
    };

    const message = [
      `📊 **Daily System Report - ${new Date().toLocaleDateString()}**`,
      `${statusEmoji[summary.status]} **Status:** ${summary.status.toUpperCase()}`,
      `⏱️ **Uptime:** ${summary.uptime}`,
      '',
      '**Performance (24h averages):**',
      `🔥 CPU: ${performance.cpu.avg.toFixed(1)}% (${performance.cpu.min}-${performance.cpu.max}%) ${trendEmoji[report.trends.cpu]}`,
      `🧠 Memory: ${performance.memory.avg.toFixed(1)}% (${performance.memory.min}-${performance.memory.max}%) ${trendEmoji[report.trends.memory]}`,
      `💾 Disk: ${performance.disk.avg.toFixed(1)}% (${performance.disk.min}-${performance.disk.max}%) ${trendEmoji[report.trends.disk]}`,
      '',
      '**Activity Summary:**',
      `📱 Applications: ${report.applications.current}/${report.applications.monitored} monitored`,
      `⚠️ Alerts: ${summary.alertCount}`,
      `❌ Errors: ${summary.errorCount}`,
      `📊 Performance spikes: ${summary.spikeCount}`
    ];

    // Add recommendations if any
    if (report.recommendations.length > 0) {
      message.push('', '**🔍 Recommendations:**');
      report.recommendations.slice(0, 3).forEach(rec => {
        const emoji = rec.severity === 'critical' ? '🚨' : '⚠️';
        message.push(`${emoji} ${rec.message}`);
      });
    }

    // Add recent alerts if any
    if (report.alerts.length > 0) {
      message.push('', '**🚨 Recent Alerts:**');
      report.alerts.slice(-3).forEach(alert => {
        const time = new Date(alert.timestamp).toLocaleTimeString();
        message.push(`• ${time}: ${alert.message}`);
      });
    }

    return {
      message: message.join('\n'),
      channels: ['slack', 'discord', 'webhook'],
      attachments: [{
        color: summary.status === 'critical' ? '#FF0000' : 
               summary.status === 'warning' ? '#FFA500' : '#00FF00',
        title: `Installation Up 4evr - Daily Report`,
        text: `System ID: ${this.installationId}`,
        fields: [
          { title: 'Status', value: summary.status, short: true },
          { title: 'Uptime', value: summary.uptime, short: true },
          { title: 'Avg CPU', value: `${performance.cpu.avg.toFixed(1)}%`, short: true },
          { title: 'Avg Memory', value: `${performance.memory.avg.toFixed(1)}%`, short: true }
        ],
        footer: 'Installation Up 4evr Monitoring',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
  }

  /**
   * Reset daily statistics for new day
   */
  resetDailyStats() {
    this.dailyStats = {
      alerts: [],
      uptimeEvents: [],
      performanceSpikes: [],
      errors: []
    };
  }

  /**
   * Add alert to daily statistics
   */
  addAlertToDailyStats(alert) {
    this.dailyStats.alerts.push({
      timestamp: new Date().toISOString(),
      ...alert
    });

    // Limit alert history
    if (this.dailyStats.alerts.length > 100) {
      this.dailyStats.alerts = this.dailyStats.alerts.slice(-50);
    }
  }

  /**
   * Get last daily report
   */
  getLastDailyReport() {
    return this.lastDailyReport;
  }

  /**
   * Force generate daily report (for testing)
   */
  async forceDailyReport() {
    await this.generateDailyReport();
    return this.lastDailyReport;
  }
}

module.exports = MonitoringCore;
