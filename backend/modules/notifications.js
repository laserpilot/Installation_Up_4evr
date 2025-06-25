/**
 * Notification System
 * Handles various notification channels (Slack, email, webhooks, etc.)
 */

const https = require('https');
const EventEmitter = require('events');

class NotificationSystem extends EventEmitter {
    constructor(monitoringSystem) {
        super();
        this.monitoring = monitoringSystem;
        this.channels = new Map();
        this.notificationQueue = [];
        this.rateLimits = new Map();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen to monitoring system events
        this.monitoring.on('alert', (alert) => {
            this.handleAlert(alert);
        });

        this.monitoring.on('heartbeat', (heartbeat) => {
            this.handleHeartbeat(heartbeat);
        });

        this.monitoring.on('data-updated', (data) => {
            this.handleDataUpdate(data);
        });
    }

    /**
     * Add notification channel
     */
    addChannel(name, config) {
        this.channels.set(name, {
            name: name,
            type: config.type, // 'slack', 'webhook', 'email', 'discord'
            config: config,
            enabled: config.enabled !== false,
            rateLimitMs: config.rateLimitMs || 60000, // 1 minute default
            lastSent: null
        });

        this.monitoring.log('info', `Notification channel added: ${name}`, { type: config.type });
    }

    /**
     * Remove notification channel
     */
    removeChannel(name) {
        if (this.channels.delete(name)) {
            this.monitoring.log('info', `Notification channel removed: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Send notification to all enabled channels
     */
    async sendNotification(message, options = {}) {
        const notification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: message,
            timestamp: new Date().toISOString(),
            severity: options.severity || 'info',
            category: options.category || 'general',
            installationId: this.monitoring.installationId,
            ...options
        };

        this.monitoring.log('info', `Sending notification: ${message}`, notification);

        const results = [];

        for (const [name, channel] of this.channels.entries()) {
            if (!channel.enabled) continue;

            try {
                // Check rate limiting
                if (this.isRateLimited(name)) {
                    this.monitoring.log('debug', `Notification rate limited for channel: ${name}`);
                    continue;
                }

                const result = await this.sendToChannel(channel, notification);
                results.push({ channel: name, success: true, result });

                // Update rate limit
                this.updateRateLimit(name);

            } catch (error) {
                results.push({ channel: name, success: false, error: error.message });
                this.monitoring.log('error', `Failed to send notification to ${name}`, { error: error.message });
            }
        }

        this.emit('notification-sent', { notification, results });
        return { notification, results };
    }

    /**
     * Send notification to specific channel
     */
    async sendToChannel(channel, notification) {
        switch (channel.type) {
            case 'slack':
                return await this.sendToSlack(channel, notification);
            case 'discord':
                return await this.sendToDiscord(channel, notification);
            case 'webhook':
                return await this.sendToWebhook(channel, notification);
            case 'email':
                return await this.sendToEmail(channel, notification);
            default:
                throw new Error(`Unknown channel type: ${channel.type}`);
        }
    }

    /**
     * Send to Slack
     */
    async sendToSlack(channel, notification) {
        const webhookUrl = channel.config.webhookUrl;
        if (!webhookUrl) {
            throw new Error('Slack webhook URL not configured');
        }

        const color = this.getSeverityColor(notification.severity);
        const emoji = this.getSeverityEmoji(notification.severity);

        const payload = {
            username: channel.config.username || 'Installation Monitor',
            icon_emoji: channel.config.icon || ':desktop_computer:',
            attachments: [{
                color: color,
                title: `${emoji} Installation Alert`,
                text: notification.message,
                fields: [
                    {
                        title: 'Installation ID',
                        value: notification.installationId,
                        short: true
                    },
                    {
                        title: 'Severity',
                        value: notification.severity.toUpperCase(),
                        short: true
                    },
                    {
                        title: 'Time',
                        value: new Date(notification.timestamp).toLocaleString(),
                        short: true
                    }
                ],
                footer: 'Installation Up 4evr',
                ts: Math.floor(new Date(notification.timestamp).getTime() / 1000)
            }]
        };

        if (notification.data) {
            payload.attachments[0].fields.push({
                title: 'Details',
                value: this.formatDataForSlack(notification.data),
                short: false
            });
        }

        return await this.makeHttpRequest(webhookUrl, 'POST', payload);
    }

    /**
     * Send to Discord
     */
    async sendToDiscord(channel, notification) {
        const webhookUrl = channel.config.webhookUrl;
        if (!webhookUrl) {
            throw new Error('Discord webhook URL not configured');
        }

        const color = this.getSeverityColorCode(notification.severity);
        const emoji = this.getSeverityEmoji(notification.severity);

        const payload = {
            username: channel.config.username || 'Installation Monitor',
            avatar_url: channel.config.avatarUrl,
            embeds: [{
                title: `${emoji} Installation Alert`,
                description: notification.message,
                color: color,
                fields: [
                    {
                        name: 'Installation ID',
                        value: notification.installationId,
                        inline: true
                    },
                    {
                        name: 'Severity',
                        value: notification.severity.toUpperCase(),
                        inline: true
                    }
                ],
                timestamp: notification.timestamp,
                footer: {
                    text: 'Installation Up 4evr'
                }
            }]
        };

        if (notification.data) {
            payload.embeds[0].fields.push({
                name: 'Details',
                value: this.formatDataForDiscord(notification.data),
                inline: false
            });
        }

        return await this.makeHttpRequest(webhookUrl, 'POST', payload);
    }

    /**
     * Send to generic webhook
     */
    async sendToWebhook(channel, notification) {
        const webhookUrl = channel.config.url;
        if (!webhookUrl) {
            throw new Error('Webhook URL not configured');
        }

        const payload = {
            notification: notification,
            installationId: this.monitoring.installationId,
            timestamp: notification.timestamp
        };

        const headers = channel.config.headers || {};

        return await this.makeHttpRequest(webhookUrl, 'POST', payload, headers);
    }

    /**
     * Send email notification
     */
    async sendToEmail(channel, notification) {
        // This would require an email service integration
        // For now, we'll log that email would be sent
        this.monitoring.log('info', 'Email notification would be sent', {
            to: channel.config.to,
            subject: `Installation Alert: ${notification.message}`,
            notification: notification
        });

        return { message: 'Email notification logged (implementation needed)' };
    }

    /**
     * Handle alert from monitoring system
     */
    async handleAlert(alert) {
        const message = `🚨 ${alert.message}`;
        
        await this.sendNotification(message, {
            severity: alert.severity,
            category: 'alert',
            data: {
                alertType: alert.type,
                alertId: alert.id
            }
        });
    }

    /**
     * Handle heartbeat from monitoring system
     */
    async handleHeartbeat(heartbeat) {
        // Only send heartbeat notifications for critical status changes
        if (heartbeat.status === 'critical') {
            const message = `💔 Installation heartbeat shows critical status`;
            
            await this.sendNotification(message, {
                severity: 'critical',
                category: 'heartbeat',
                data: heartbeat.quickStats
            });
        }
    }

    /**
     * Handle data updates
     */
    async handleDataUpdate(data) {
        // Send notifications for status changes
        if (data.status !== this.lastKnownStatus) {
            let message, severity;
            
            switch (data.status) {
                case 'healthy':
                    message = '✅ Installation status: All systems healthy';
                    severity = 'info';
                    break;
                case 'warning':
                    message = '⚠️ Installation status: Warning conditions detected';
                    severity = 'warning';
                    break;
                case 'critical':
                    message = '🔴 Installation status: Critical issues detected';
                    severity = 'critical';
                    break;
            }

            if (message) {
                await this.sendNotification(message, {
                    severity: severity,
                    category: 'status-change',
                    data: {
                        previousStatus: this.lastKnownStatus,
                        newStatus: data.status,
                        issues: data.issues
                    }
                });
            }

            this.lastKnownStatus = data.status;
        }
    }

    /**
     * Check if channel is rate limited
     */
    isRateLimited(channelName) {
        const channel = this.channels.get(channelName);
        if (!channel || !channel.lastSent) return false;

        const timeSinceLastSent = Date.now() - channel.lastSent;
        return timeSinceLastSent < channel.rateLimitMs;
    }

    /**
     * Update rate limit for channel
     */
    updateRateLimit(channelName) {
        const channel = this.channels.get(channelName);
        if (channel) {
            channel.lastSent = Date.now();
        }
    }

    /**
     * Get severity color for Slack
     */
    getSeverityColor(severity) {
        const colors = {
            info: 'good',
            warning: 'warning',
            error: 'danger',
            critical: 'danger'
        };
        return colors[severity] || 'good';
    }

    /**
     * Get severity color code for Discord
     */
    getSeverityColorCode(severity) {
        const colors = {
            info: 0x36a64f,     // Green
            warning: 0xffcc00,  // Yellow  
            error: 0xff6b6b,    // Red
            critical: 0xff0000  // Bright Red
        };
        return colors[severity] || 0x36a64f;
    }

    /**
     * Get severity emoji
     */
    getSeverityEmoji(severity) {
        const emojis = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            critical: '🚨'
        };
        return emojis[severity] || 'ℹ️';
    }

    /**
     * Format data for Slack
     */
    formatDataForSlack(data) {
        if (typeof data === 'object') {
            return '```' + JSON.stringify(data, null, 2) + '```';
        }
        return String(data);
    }

    /**
     * Format data for Discord
     */
    formatDataForDiscord(data) {
        if (typeof data === 'object') {
            const formatted = JSON.stringify(data, null, 2);
            // Discord has a 1024 character limit for field values
            return formatted.length > 1000 
                ? '```json\n' + formatted.substring(0, 990) + '...\n```'
                : '```json\n' + formatted + '\n```';
        }
        return String(data);
    }

    /**
     * Make HTTP request
     */
    async makeHttpRequest(url, method = 'POST', data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const postData = data ? JSON.stringify(data) : null;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (postData) {
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ statusCode: res.statusCode, body: body });
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                });
            });

            req.on('error', reject);

            if (postData) {
                req.write(postData);
            }

            req.end();
        });
    }

    /**
     * Test notification channel
     */
    async testChannel(channelName) {
        const channel = this.channels.get(channelName);
        if (!channel) {
            throw new Error(`Channel not found: ${channelName}`);
        }

        const testNotification = {
            id: `test_${Date.now()}`,
            message: 'Test notification from Installation Up 4evr',
            timestamp: new Date().toISOString(),
            severity: 'info',
            category: 'test',
            installationId: this.monitoring.installationId,
            data: {
                test: true,
                channelName: channelName,
                channelType: channel.type
            }
        };

        try {
            const result = await this.sendToChannel(channel, testNotification);
            this.monitoring.log('info', `Test notification sent successfully to ${channelName}`);
            return { success: true, result };
        } catch (error) {
            this.monitoring.log('error', `Test notification failed for ${channelName}`, { error: error.message });
            throw error;
        }
    }

    /**
     * Get notification statistics
     */
    getNotificationStats() {
        const stats = {
            channels: this.channels.size,
            enabledChannels: Array.from(this.channels.values()).filter(c => c.enabled).length,
            channelTypes: {},
            rateLimitedChannels: 0
        };

        for (const channel of this.channels.values()) {
            stats.channelTypes[channel.type] = (stats.channelTypes[channel.type] || 0) + 1;
            
            if (this.isRateLimited(channel.name)) {
                stats.rateLimitedChannels++;
            }
        }

        return stats;
    }

    /**
     * Get configured channels
     */
    getChannels() {
        return Array.from(this.channels.entries()).map(([name, channel]) => ({
            name: name,
            type: channel.type,
            enabled: channel.enabled,
            rateLimited: this.isRateLimited(name),
            lastSent: channel.lastSent
        }));
    }
}

module.exports = NotificationSystem;