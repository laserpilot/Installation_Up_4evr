/**
 * Centralized Logging System for Installation Up 4evr
 * Provides structured, rotated logging with configurable levels and categories
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    CRITICAL: 4
};

/**
 * Log categories for organized logging
 */
const LOG_CATEGORIES = {
    SYSTEM: 'system',
    APPLICATION: 'application', 
    SECURITY: 'security',
    PERFORMANCE: 'performance',
    USER_ACTION: 'user_action',
    API: 'api',
    MONITORING: 'monitoring',
    INTEGRATION: 'integration'
};

class Logger {
    constructor(options = {}) {
        this.options = {
            logDir: options.logDir || path.join(os.homedir(), '.installation-up-4evr', 'logs'),
            logLevel: options.logLevel || LOG_LEVELS.INFO,
            maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
            retentionDays: options.retentionDays || 30,
            enableConsole: options.enableConsole !== false,
            installationId: options.installationId || null,
            ...options
        };
        
        this.initPromise = this.initialize();
    }

    /**
     * Initialize logging directory and cleanup old files
     */
    async initialize() {
        try {
            await fs.mkdir(this.options.logDir, { recursive: true });
            await this.cleanupOldLogs();
            return true;
        } catch (error) {
            console.error('Failed to initialize logger:', error);
            return false;
        }
    }

    /**
     * Ensure logger is initialized before logging
     */
    async ensureInitialized() {
        if (!this.initPromise) {
            this.initPromise = this.initialize();
        }
        return await this.initPromise;
    }

    /**
     * Generate log filename based on category and date
     */
    getLogFilename(category, date = new Date()) {
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.options.logDir, `${category}-${dateStr}.log`);
    }

    /**
     * Create structured log entry
     */
    createLogEntry(level, category, message, context = {}) {
        return {
            timestamp: new Date().toISOString(),
            level: Object.keys(LOG_LEVELS)[level],
            category,
            message,
            installationId: this.options.installationId,
            pid: process.pid,
            hostname: os.hostname(),
            platform: os.platform(),
            context,
            ...context // Allow context to override any field
        };
    }

    /**
     * Write log entry to file
     */
    async writeLogEntry(entry) {
        await this.ensureInitialized();
        
        const filename = this.getLogFilename(entry.category);
        const logLine = JSON.stringify(entry) + '\n';
        
        try {
            // Check file size before writing
            const stats = await fs.stat(filename).catch(() => ({ size: 0 }));
            if (stats.size > this.options.maxFileSize) {
                await this.rotateLogFile(filename);
            }
            
            await fs.appendFile(filename, logLine);
        } catch (error) {
            if (this.options.enableConsole) {
                console.error('Failed to write log entry:', error);
                console.log('Log entry:', entry);
            }
        }
    }

    /**
     * Rotate log file when it gets too large
     */
    async rotateLogFile(filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFilename = filename.replace('.log', `-${timestamp}.log`);
        
        try {
            await fs.rename(filename, rotatedFilename);
            
            // Compress rotated file (optional, could implement gzip)
            // await this.compressFile(rotatedFilename);
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }

    /**
     * Clean up old log files based on retention policy
     */
    async cleanupOldLogs() {
        try {
            const files = await fs.readdir(this.options.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);
            
            for (const file of files) {
                if (!file.endsWith('.log')) continue;
                
                const filePath = path.join(this.options.logDir, file);
                const stats = await fs.stat(filePath);
                
                if (stats.mtime < cutoffDate) {
                    await fs.unlink(filePath);
                    console.log(`[LOGGER] Cleaned up old log file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }

    /**
     * Core logging method
     */
    async log(level, category, message, context = {}) {
        // Check if this log level should be written
        if (level < this.options.logLevel) {
            return;
        }

        const entry = this.createLogEntry(level, category, message, context);

        // Write to file
        await this.writeLogEntry(entry);

        // Also log to console if enabled
        if (this.options.enableConsole) {
            const levelName = Object.keys(LOG_LEVELS)[level];
            const contextStr = Object.keys(context).length > 0 ? 
                ` | ${JSON.stringify(context)}` : '';
            console.log(`[${levelName}] [${category}] ${message}${contextStr}`);
        }
    }

    // Convenience methods for different log levels
    debug(category, message, context = {}) {
        return this.log(LOG_LEVELS.DEBUG, category, message, context);
    }

    info(category, message, context = {}) {
        return this.log(LOG_LEVELS.INFO, category, message, context);
    }

    warn(category, message, context = {}) {
        return this.log(LOG_LEVELS.WARN, category, message, context);
    }

    error(category, message, context = {}) {
        return this.log(LOG_LEVELS.ERROR, category, message, context);
    }

    critical(category, message, context = {}) {
        return this.log(LOG_LEVELS.CRITICAL, category, message, context);
    }

    // Convenience methods for specific categories
    system(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.SYSTEM, message, context);
    }

    application(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.APPLICATION, message, context);
    }

    security(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.SECURITY, message, context);
    }

    performance(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.PERFORMANCE, message, context);
    }

    userAction(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.USER_ACTION, message, context);
    }

    api(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.API, message, context);
    }

    monitoring(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.MONITORING, message, context);
    }

    integration(level, message, context = {}) {
        return this.log(level, LOG_CATEGORIES.INTEGRATION, message, context);
    }

    /**
     * Get log entries for a specific time range and category
     */
    async getLogs(options = {}) {
        const {
            category = null,
            startDate = null,
            endDate = null,
            level = null,
            limit = 1000
        } = options;

        const logs = [];
        const files = await fs.readdir(this.options.logDir);
        
        for (const file of files.sort().reverse()) { // Most recent first
            if (!file.endsWith('.log')) continue;
            if (category && !file.startsWith(category)) continue;
            
            const filePath = path.join(this.options.logDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    const entryDate = new Date(entry.timestamp);
                    
                    // Apply filters
                    if (startDate && entryDate < startDate) continue;
                    if (endDate && entryDate > endDate) continue;
                    if (level && LOG_LEVELS[entry.level] < level) continue;
                    
                    logs.push(entry);
                    if (logs.length >= limit) break;
                } catch (error) {
                    // Skip invalid JSON lines
                    continue;
                }
            }
            
            if (logs.length >= limit) break;
        }
        
        return logs;
    }

    /**
     * Get log summary statistics
     */
    async getLogStats(hours = 24) {
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);
        
        const logs = await this.getLogs({ startDate, limit: 10000 });
        const stats = {
            total: logs.length,
            byLevel: {},
            byCategory: {},
            errorCount: 0,
            timeRange: { start: startDate.toISOString(), end: new Date().toISOString() }
        };
        
        for (const log of logs) {
            // Count by level
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
            
            // Count by category
            stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
            
            // Count errors
            if (LOG_LEVELS[log.level] >= LOG_LEVELS.ERROR) {
                stats.errorCount++;
            }
        }
        
        return stats;
    }
}

module.exports = {
    Logger,
    LOG_LEVELS,
    LOG_CATEGORIES
};