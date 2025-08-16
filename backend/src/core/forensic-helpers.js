/**
 * Forensic Investigation Helpers
 * Tools for analyzing incidents, correlating events, and reconstructing timelines
 */

const fs = require('fs').promises;
const path = require('path');
const { LOG_LEVELS } = require('./logger');

class ForensicHelpers {
  constructor(logger, baselineLogger = null, screenshotLogger = null) {
    this.logger = logger;
    this.baselineLogger = baselineLogger;
    this.screenshotLogger = screenshotLogger;
  }

  /**
   * Investigate incident by correlation ID
   */
  async investigateIncident(incidentId, hoursBack = 2) {
    try {
      // Get all logs related to this incident
      const incidentLogs = await this.getIncidentLogs(incidentId, hoursBack);
      
      // Get baseline data around the incident
      const baselineData = this.baselineLogger ? 
        this.getBaselineAroundIncident(incidentId, hoursBack) : null;
      
      // Get screenshots if available
      const screenshots = this.screenshotLogger ? 
        this.screenshotLogger.getIncidentScreenshots(incidentId) : [];

      // Construct timeline
      const timeline = await this.constructTimeline(incidentLogs, baselineData, screenshots);
      
      // Analyze patterns
      const analysis = this.analyzeIncidentPatterns(incidentLogs);
      
      // Generate investigation report
      const report = {
        incidentId,
        investigatedAt: new Date().toISOString(),
        timeRange: {
          start: new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
          hoursBack
        },
        summary: {
          totalEvents: incidentLogs.length,
          errorCount: incidentLogs.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL').length,
          screenshotCount: screenshots.length,
          baselineChanges: baselineData ? baselineData.changeCount : 0
        },
        timeline,
        analysis,
        relatedEvents: this.findRelatedEvents(incidentLogs),
        recommendations: this.generateIncidentRecommendations(analysis),
        artifacts: {
          logs: incidentLogs.length,
          baselines: baselineData ? baselineData.snapshots.length : 0,
          screenshots: screenshots.length
        }
      };

      this.logger.incident(
        LOG_LEVELS.INFO,
        `Forensic investigation completed for incident ${incidentId}`,
        { 
          investigationSummary: report.summary,
          timelineEvents: timeline.length
        }
      );

      return report;

    } catch (error) {
      this.logger.logException(error, {
        operation: 'investigateIncident',
        incidentId,
        component: 'ForensicHelpers'
      });
      throw error;
    }
  }

  /**
   * Get all logs related to an incident
   */
  async getIncidentLogs(incidentId, hoursBack = 2) {
    const startDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    try {
      // Get logs from all categories that might be related
      const categories = ['incident', 'exception', 'anomaly', 'system', 'application', 'monitoring'];
      const allLogs = [];

      for (const category of categories) {
        const categoryLogs = await this.logger.getLogs({
          category,
          startDate,
          limit: 1000
        });
        allLogs.push(...categoryLogs);
      }

      // Filter logs related to this incident or its timeframe
      const relatedLogs = allLogs.filter(log => {
        // Direct incident relation
        if (log.incidentId === incidentId) return true;
        if (log.correlationId && this.isCorrelationRelated(log.correlationId, incidentId)) return true;
        
        // Time-based relation (errors around incident time)
        if (log.level === 'ERROR' || log.level === 'CRITICAL') return true;
        
        // Anomaly or exception logs
        if (['exception', 'anomaly'].includes(log.category)) return true;
        
        return false;
      });

      // Sort by timestamp
      return relatedLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    } catch (error) {
      this.logger.logException(error, {
        operation: 'getIncidentLogs',
        incidentId
      });
      return [];
    }
  }

  /**
   * Check if correlation ID is related to incident
   */
  isCorrelationRelated(correlationId, incidentId) {
    // Simple check - in a more sophisticated system, you'd track correlation chains
    return correlationId === incidentId || correlationId.includes(incidentId);
  }

  /**
   * Get baseline data around incident time
   */
  getBaselineAroundIncident(incidentId, hoursBack = 2) {
    if (!this.baselineLogger) return null;

    try {
      // Get baseline history for the time period
      const baselines = this.baselineLogger.getHistory(hoursBack);
      
      // Look for significant changes
      const changes = [];
      for (let i = 1; i < baselines.length; i++) {
        const current = baselines[i];
        const previous = baselines[i - 1];
        
        if (current.changes && Object.keys(current.changes).length > 0) {
          changes.push({
            timestamp: current.timestamp,
            changes: current.changes,
            severity: this.assessChangesSeverity(current.changes)
          });
        }
      }

      return {
        snapshots: baselines,
        changeCount: changes.length,
        significantChanges: changes.filter(c => c.severity === 'high'),
        timeRange: {
          start: baselines.length > 0 ? baselines[0].timestamp : null,
          end: baselines.length > 0 ? baselines[baselines.length - 1].timestamp : null
        }
      };

    } catch (error) {
      this.logger.logException(error, {
        operation: 'getBaselineAroundIncident',
        incidentId
      });
      return null;
    }
  }

  /**
   * Assess severity of baseline changes
   */
  assessChangesSeverity(changes) {
    let severity = 'low';
    
    for (const [type, change] of Object.entries(changes)) {
      switch (type) {
        case 'processCount':
          if (Math.abs(change.delta) > 20) severity = 'high';
          else if (Math.abs(change.delta) > 10) severity = 'medium';
          break;
        case 'memoryUsage':
          if (Math.abs(change.delta) > 30) severity = 'high';
          else if (Math.abs(change.delta) > 15) severity = 'medium';
          break;
        case 'networkInterfaces':
          severity = 'high'; // Network changes are usually significant
          break;
        case 'displayCount':
          severity = 'medium';
          break;
      }
    }
    
    return severity;
  }

  /**
   * Construct chronological timeline of events
   */
  async constructTimeline(logs, baselineData, screenshots) {
    const events = [];

    // Add log events
    logs.forEach(log => {
      events.push({
        timestamp: log.timestamp,
        type: 'log',
        category: log.category,
        level: log.level,
        message: log.message,
        source: 'logger',
        context: log.context,
        correlationId: log.correlationId,
        incidentId: log.incidentId
      });
    });

    // Add baseline change events
    if (baselineData && baselineData.significantChanges) {
      baselineData.significantChanges.forEach(change => {
        events.push({
          timestamp: change.timestamp,
          type: 'baseline_change',
          message: `System baseline change detected`,
          source: 'baseline',
          changes: change.changes,
          severity: change.severity
        });
      });
    }

    // Add screenshot events
    screenshots.forEach(screenshot => {
      events.push({
        timestamp: screenshot.timestamp,
        type: 'screenshot',
        message: `Screenshot captured: ${screenshot.trigger}`,
        source: 'screenshot',
        filepath: screenshot.filepath,
        trigger: screenshot.trigger,
        metadata: screenshot.metadata
      });
    });

    // Sort chronologically
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Add sequence numbers and time deltas
    events.forEach((event, index) => {
      event.sequence = index + 1;
      if (index > 0) {
        const prevTime = new Date(events[index - 1].timestamp);
        const currentTime = new Date(event.timestamp);
        event.timeDelta = currentTime - prevTime; // milliseconds
        event.timeDeltaHuman = this.formatTimeDelta(event.timeDelta);
      }
    });

    return events;
  }

  /**
   * Format time delta in human readable format
   */
  formatTimeDelta(deltaMs) {
    if (deltaMs < 1000) return `${deltaMs}ms`;
    if (deltaMs < 60000) return `${(deltaMs / 1000).toFixed(1)}s`;
    if (deltaMs < 3600000) return `${Math.floor(deltaMs / 60000)}m ${Math.floor((deltaMs % 60000) / 1000)}s`;
    return `${Math.floor(deltaMs / 3600000)}h ${Math.floor((deltaMs % 3600000) / 60000)}m`;
  }

  /**
   * Analyze patterns in incident logs
   */
  analyzeIncidentPatterns(logs) {
    const analysis = {
      errorPatterns: this.identifyErrorPatterns(logs),
      escalationPath: this.analyzeEscalationPath(logs),
      affectedComponents: this.identifyAffectedComponents(logs),
      timingPatterns: this.analyzeTimingPatterns(logs),
      severity: this.assessIncidentSeverity(logs)
    };

    return analysis;
  }

  /**
   * Identify error patterns
   */
  identifyErrorPatterns(logs) {
    const errorLogs = logs.filter(log => log.level === 'ERROR' || log.level === 'CRITICAL');
    const patterns = {};

    errorLogs.forEach(log => {
      // Group by error message patterns
      const messageKey = this.extractErrorPattern(log.message);
      if (!patterns[messageKey]) {
        patterns[messageKey] = {
          count: 0,
          firstSeen: log.timestamp,
          lastSeen: log.timestamp,
          category: log.category,
          examples: []
        };
      }
      patterns[messageKey].count++;
      patterns[messageKey].lastSeen = log.timestamp;
      if (patterns[messageKey].examples.length < 3) {
        patterns[messageKey].examples.push({
          timestamp: log.timestamp,
          message: log.message,
          context: log.context
        });
      }
    });

    // Sort by frequency
    return Object.entries(patterns)
      .sort(([, a], [, b]) => b.count - a.count)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
  }

  /**
   * Extract error pattern from message
   */
  extractErrorPattern(message) {
    // Remove specific details to find patterns
    return message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[a-f0-9]{8,}/g, 'HEX') // Replace long hex strings
      .replace(/\/[^\s]+/g, 'PATH') // Replace file paths
      .replace(/\b\w+@\w+\.\w+/g, 'EMAIL') // Replace emails
      .replace(/https?:\/\/[^\s]+/g, 'URL'); // Replace URLs
  }

  /**
   * Analyze escalation path from info to critical
   */
  analyzeEscalationPath(logs) {
    const levelOrder = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3, 'CRITICAL': 4 };
    const escalations = [];
    
    let currentLevel = 0;
    logs.forEach(log => {
      const logLevel = levelOrder[log.level] || 0;
      if (logLevel > currentLevel) {
        escalations.push({
          from: Object.keys(levelOrder)[currentLevel] || 'UNKNOWN',
          to: log.level,
          timestamp: log.timestamp,
          message: log.message,
          category: log.category
        });
        currentLevel = logLevel;
      }
    });

    return escalations;
  }

  /**
   * Identify affected components
   */
  identifyAffectedComponents(logs) {
    const components = {};

    logs.forEach(log => {
      const component = log.category || 'unknown';
      if (!components[component]) {
        components[component] = {
          eventCount: 0,
          errorCount: 0,
          firstEvent: log.timestamp,
          lastEvent: log.timestamp,
          severityLevels: new Set()
        };
      }

      components[component].eventCount++;
      components[component].lastEvent = log.timestamp;
      components[component].severityLevels.add(log.level);

      if (log.level === 'ERROR' || log.level === 'CRITICAL') {
        components[component].errorCount++;
      }
    });

    // Convert Set to Array for JSON serialization
    Object.values(components).forEach(comp => {
      comp.severityLevels = Array.from(comp.severityLevels);
    });

    return components;
  }

  /**
   * Analyze timing patterns
   */
  analyzeTimingPatterns(logs) {
    if (logs.length < 2) return { pattern: 'insufficient_data' };

    const intervals = [];
    for (let i = 1; i < logs.length; i++) {
      const interval = new Date(logs[i].timestamp) - new Date(logs[i-1].timestamp);
      intervals.push(interval);
    }

    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    const maxInterval = Math.max(...intervals);

    // Determine pattern
    let pattern = 'irregular';
    if (maxInterval - minInterval < avgInterval * 0.5) {
      pattern = 'regular';
    } else if (intervals.slice(-5).every(i => i < avgInterval * 0.5)) {
      pattern = 'accelerating';
    } else if (intervals.some(i => i > avgInterval * 3)) {
      pattern = 'burst';
    }

    return {
      pattern,
      averageInterval: Math.round(avgInterval),
      minInterval: Math.round(minInterval),
      maxInterval: Math.round(maxInterval),
      totalDuration: Math.round(intervals.reduce((sum, val) => sum + val, 0)),
      eventRate: logs.length / (maxInterval / 1000 / 60) // events per minute
    };
  }

  /**
   * Assess overall incident severity
   */
  assessIncidentSeverity(logs) {
    const criticalCount = logs.filter(log => log.level === 'CRITICAL').length;
    const errorCount = logs.filter(log => log.level === 'ERROR').length;
    const duration = logs.length > 1 ? 
      new Date(logs[logs.length - 1].timestamp) - new Date(logs[0].timestamp) : 0;

    let severity = 'low';
    
    if (criticalCount > 0) severity = 'critical';
    else if (errorCount > 10) severity = 'high';
    else if (errorCount > 3) severity = 'medium';
    else if (duration > 30 * 60 * 1000) severity = 'medium'; // > 30 minutes

    return {
      level: severity,
      criticalEvents: criticalCount,
      errorEvents: errorCount,
      duration: duration,
      durationHuman: this.formatTimeDelta(duration)
    };
  }

  /**
   * Find related events across different correlation IDs
   */
  findRelatedEvents(logs) {
    const correlations = {};
    const related = [];

    // Group by correlation ID
    logs.forEach(log => {
      if (log.correlationId) {
        if (!correlations[log.correlationId]) {
          correlations[log.correlationId] = [];
        }
        correlations[log.correlationId].push(log);
      }
    });

    // Find patterns across correlations
    Object.entries(correlations).forEach(([corrId, corrLogs]) => {
      if (corrLogs.length > 1) {
        related.push({
          correlationId: corrId,
          eventCount: corrLogs.length,
          timeSpan: new Date(corrLogs[corrLogs.length - 1].timestamp) - 
                   new Date(corrLogs[0].timestamp),
          categories: [...new Set(corrLogs.map(log => log.category))],
          severity: Math.max(...corrLogs.map(log => 
            ({ 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3, 'CRITICAL': 4 }[log.level] || 0)
          ))
        });
      }
    });

    return related.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Generate recommendations based on incident analysis
   */
  generateIncidentRecommendations(analysis) {
    const recommendations = [];

    // Error pattern recommendations
    if (Object.keys(analysis.errorPatterns).length > 0) {
      const topError = Object.values(analysis.errorPatterns)[0];
      if (topError.count > 5) {
        recommendations.push({
          type: 'error_pattern',
          priority: 'high',
          message: `Recurring error pattern detected (${topError.count} occurrences). Investigate root cause.`,
          details: topError.examples[0]
        });
      }
    }

    // Escalation recommendations
    if (analysis.escalationPath.length > 2) {
      recommendations.push({
        type: 'escalation',
        priority: 'medium',
        message: `Rapid error escalation detected. Implement early warning systems.`,
        details: { escalationSteps: analysis.escalationPath.length }
      });
    }

    // Component recommendations
    const criticalComponents = Object.entries(analysis.affectedComponents)
      .filter(([, comp]) => comp.errorCount > 5)
      .map(([name]) => name);

    if (criticalComponents.length > 0) {
      recommendations.push({
        type: 'component',
        priority: 'high',
        message: `Critical components identified: ${criticalComponents.join(', ')}. Requires immediate attention.`,
        details: { components: criticalComponents }
      });
    }

    // Timing recommendations
    if (analysis.timingPatterns.pattern === 'accelerating') {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        message: 'Error rate is accelerating. System may be approaching failure cascade.',
        details: analysis.timingPatterns
      });
    }

    // Severity recommendations
    if (analysis.severity.level === 'critical') {
      recommendations.push({
        type: 'severity',
        priority: 'critical',
        message: 'Critical incident detected. Immediate intervention required.',
        details: analysis.severity
      });
    }

    return recommendations.sort((a, b) => {
      const priority = { critical: 4, high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });
  }

  /**
   * Export incident investigation to file
   */
  async exportInvestigation(investigation, format = 'json') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `incident-investigation-${investigation.incidentId}-${timestamp}.${format}`;
      const exportDir = path.join(this.logger.options.logDir, 'investigations');
      
      // Ensure export directory exists
      await fs.mkdir(exportDir, { recursive: true });
      
      const filepath = path.join(exportDir, filename);
      
      if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(investigation, null, 2));
      } else if (format === 'txt') {
        const textReport = this.formatInvestigationAsText(investigation);
        await fs.writeFile(filepath, textReport);
      }

      this.logger.info('forensic', `Investigation exported to ${filepath}`, {
        incidentId: investigation.incidentId,
        format,
        fileSize: (await fs.stat(filepath)).size
      });

      return filepath;

    } catch (error) {
      this.logger.logException(error, {
        operation: 'exportInvestigation',
        incidentId: investigation.incidentId
      });
      throw error;
    }
  }

  /**
   * Format investigation as human-readable text
   */
  formatInvestigationAsText(investigation) {
    const lines = [
      `INCIDENT INVESTIGATION REPORT`,
      `${'='.repeat(50)}`,
      `Incident ID: ${investigation.incidentId}`,
      `Investigation Date: ${investigation.investigatedAt}`,
      `Time Range: ${investigation.timeRange.start} to ${investigation.timeRange.end}`,
      ``,
      `SUMMARY`,
      `-------`,
      `Total Events: ${investigation.summary.totalEvents}`,
      `Error Count: ${investigation.summary.errorCount}`,
      `Screenshots: ${investigation.summary.screenshotCount}`,
      `Baseline Changes: ${investigation.summary.baselineChanges}`,
      ``,
      `ANALYSIS`,
      `--------`,
      `Severity: ${investigation.analysis.severity.level.toUpperCase()}`,
      `Duration: ${investigation.analysis.severity.durationHuman}`,
      `Event Pattern: ${investigation.analysis.timingPatterns.pattern}`,
      ``,
      `AFFECTED COMPONENTS`,
      `------------------`
    ];

    Object.entries(investigation.analysis.affectedComponents).forEach(([name, comp]) => {
      lines.push(`${name}: ${comp.eventCount} events, ${comp.errorCount} errors`);
    });

    if (investigation.recommendations.length > 0) {
      lines.push('', 'RECOMMENDATIONS', '---------------');
      investigation.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }

    if (investigation.timeline.length > 0) {
      lines.push('', 'TIMELINE (Recent Events)', '------------------------');
      investigation.timeline.slice(-10).forEach(event => {
        const time = new Date(event.timestamp).toLocaleString();
        lines.push(`${time} [${event.type}] ${event.message}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Quick triage for incoming incidents
   */
  async quickTriage(incidentId) {
    try {
      // Get recent logs (last 30 minutes)
      const recentLogs = await this.getIncidentLogs(incidentId, 0.5);
      
      // Quick analysis
      const errorCount = recentLogs.filter(log => 
        log.level === 'ERROR' || log.level === 'CRITICAL'
      ).length;
      
      const criticalCount = recentLogs.filter(log => 
        log.level === 'CRITICAL'
      ).length;

      let priority = 'low';
      if (criticalCount > 0) priority = 'critical';
      else if (errorCount > 5) priority = 'high';
      else if (errorCount > 1) priority = 'medium';

      const triage = {
        incidentId,
        priority,
        eventCount: recentLogs.length,
        errorCount,
        criticalCount,
        timeWindow: '30 minutes',
        needsImmediate: criticalCount > 0 || errorCount > 10,
        summary: `${errorCount} errors, ${criticalCount} critical events in 30 minutes`
      };

      this.logger.incident(
        LOG_LEVELS.INFO,
        `Quick triage completed for incident ${incidentId}`,
        triage
      );

      return triage;

    } catch (error) {
      this.logger.logException(error, {
        operation: 'quickTriage',
        incidentId
      });
      return {
        incidentId,
        priority: 'unknown',
        error: 'Triage failed',
        needsImmediate: true
      };
    }
  }
}

module.exports = ForensicHelpers;