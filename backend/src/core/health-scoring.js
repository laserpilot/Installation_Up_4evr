/**
 * System Health Scoring and Recommendations Engine
 * Provides comprehensive health assessment and actionable recommendations
 */

class HealthScoringEngine {
    constructor() {
        this.weights = {
            performance: 0.35,    // CPU, Memory, Disk performance
            stability: 0.25,      // Uptime, errors, restarts
            security: 0.20,       // Updates, security settings
            configuration: 0.20   // Optimal settings, completeness
        };
        
        this.thresholds = {
            excellent: 90,
            good: 75,
            fair: 60,
            poor: 40
        };
    }

    /**
     * Calculate overall system health score (0-100)
     */
    calculateHealthScore(systemData, configData = {}) {
        const scores = {
            performance: this.calculatePerformanceScore(systemData),
            stability: this.calculateStabilityScore(systemData),
            security: this.calculateSecurityScore(systemData, configData),
            configuration: this.calculateConfigurationScore(configData)
        };

        // Calculate weighted average
        const overallScore = Object.keys(scores).reduce((total, category) => {
            return total + (scores[category] * this.weights[category]);
        }, 0);

        return {
            overall: Math.round(overallScore),
            breakdown: scores,
            rating: this.getHealthRating(overallScore),
            recommendations: this.generateRecommendations(scores, systemData, configData)
        };
    }

    /**
     * Calculate performance score based on resource usage
     */
    calculatePerformanceScore(systemData) {
        const { cpu, memory, disk, temperature } = systemData.system || {};
        let score = 100;
        let factors = [];

        // CPU usage (weight: 30%)
        if (cpu?.usage !== undefined) {
            const cpuScore = this.calculateResourceScore(cpu.usage, { good: 70, fair: 85, poor: 95 });
            score -= (100 - cpuScore) * 0.3;
            if (cpuScore < 80) {
                factors.push({ type: 'cpu', score: cpuScore, usage: cpu.usage });
            }
        }

        // Memory usage (weight: 35%)
        if (memory?.usage !== undefined) {
            const memoryScore = this.calculateResourceScore(memory.usage, { good: 75, fair: 85, poor: 95 });
            score -= (100 - memoryScore) * 0.35;
            if (memoryScore < 80) {
                factors.push({ type: 'memory', score: memoryScore, usage: memory.usage });
            }
        }

        // Disk usage (weight: 25%)
        if (disk?.usage !== undefined) {
            const diskScore = this.calculateResourceScore(disk.usage, { good: 80, fair: 90, poor: 95 });
            score -= (100 - diskScore) * 0.25;
            if (diskScore < 80) {
                factors.push({ type: 'disk', score: diskScore, usage: disk.usage });
            }
        }

        // Temperature impact (weight: 10%)
        if (temperature?.cpu !== undefined) {
            const tempScore = this.calculateResourceScore(temperature.cpu, { good: 70, fair: 80, poor: 90 });
            score -= (100 - tempScore) * 0.1;
            if (tempScore < 80) {
                factors.push({ type: 'temperature', score: tempScore, value: temperature.cpu });
            }
        }

        return {
            score: Math.max(0, Math.round(score)),
            factors,
            category: 'performance'
        };
    }

    /**
     * Calculate stability score based on uptime and application health
     */
    calculateStabilityScore(systemData) {
        let score = 100;
        let factors = [];

        // System uptime (weight: 40%)
        if (systemData.uptime?.seconds !== undefined) {
            const uptimeHours = systemData.uptime.seconds / 3600;
            const uptimeScore = this.calculateUptimeScore(uptimeHours);
            score -= (100 - uptimeScore) * 0.4;
            if (uptimeScore < 80) {
                factors.push({ type: 'uptime', score: uptimeScore, hours: Math.round(uptimeHours) });
            }
        }

        // Application health (weight: 40%)
        if (systemData.applications) {
            const appScore = this.calculateApplicationScore(systemData.applications);
            score -= (100 - appScore) * 0.4;
            if (appScore < 90) {
                factors.push({ type: 'applications', score: appScore, apps: systemData.applications });
            }
        }

        // Display status (weight: 20%)
        if (systemData.displays) {
            const displayScore = this.calculateDisplayScore(systemData.displays);
            score -= (100 - displayScore) * 0.2;
            if (displayScore < 90) {
                factors.push({ type: 'displays', score: displayScore, displays: systemData.displays });
            }
        }

        return {
            score: Math.max(0, Math.round(score)),
            factors,
            category: 'stability'
        };
    }

    /**
     * Calculate security score based on system settings
     */
    calculateSecurityScore(systemData, configData) {
        let score = 100;
        let factors = [];

        // System updates and security settings would be checked here
        // For now, we'll use basic indicators

        // SIP status (weight: 40%)
        if (systemData.security?.sip !== undefined) {
            const sipScore = systemData.security.sip ? 100 : 60; // SIP enabled is better for security
            score -= (100 - sipScore) * 0.4;
            if (!systemData.security.sip) {
                factors.push({ type: 'sip', score: sipScore, enabled: false });
            }
        }

        // Gatekeeper status (weight: 30%)
        if (systemData.security?.gatekeeper !== undefined) {
            const gatekeeperScore = systemData.security.gatekeeper ? 100 : 50;
            score -= (100 - gatekeeperScore) * 0.3;
            if (!systemData.security.gatekeeper) {
                factors.push({ type: 'gatekeeper', score: gatekeeperScore, enabled: false });
            }
        }

        // Firewall status (weight: 30%)
        if (systemData.security?.firewall !== undefined) {
            const firewallScore = systemData.security.firewall ? 100 : 70;
            score -= (100 - firewallScore) * 0.3;
            if (!systemData.security.firewall) {
                factors.push({ type: 'firewall', score: firewallScore, enabled: false });
            }
        }

        return {
            score: Math.max(0, Math.round(score)),
            factors,
            category: 'security'
        };
    }

    /**
     * Calculate configuration score based on optimal settings
     */
    calculateConfigurationScore(configData) {
        let score = 100;
        let factors = [];

        // Monitoring configuration (weight: 40%)
        const monitoringScore = this.evaluateMonitoringConfig(configData.monitoring);
        score -= (100 - monitoringScore.score) * 0.4;
        if (monitoringScore.score < 90) {
            factors.push({ type: 'monitoring', ...monitoringScore });
        }

        // Notification configuration (weight: 30%)
        const notificationScore = this.evaluateNotificationConfig(configData.notifications);
        score -= (100 - notificationScore.score) * 0.3;
        if (notificationScore.score < 80) {
            factors.push({ type: 'notifications', ...notificationScore });
        }

        // Installation settings (weight: 30%)
        const installationScore = this.evaluateInstallationConfig(configData.installation);
        score -= (100 - installationScore.score) * 0.3;
        if (installationScore.score < 80) {
            factors.push({ type: 'installation', ...installationScore });
        }

        return {
            score: Math.max(0, Math.round(score)),
            factors,
            category: 'configuration'
        };
    }

    /**
     * Calculate resource usage score with different thresholds
     */
    calculateResourceScore(usage, thresholds) {
        if (usage <= thresholds.good) return 100;
        if (usage <= thresholds.fair) return 80 - ((usage - thresholds.good) / (thresholds.fair - thresholds.good)) * 20;
        if (usage <= thresholds.poor) return 60 - ((usage - thresholds.fair) / (thresholds.poor - thresholds.fair)) * 20;
        return Math.max(0, 40 - ((usage - thresholds.poor) / (100 - thresholds.poor)) * 40);
    }

    /**
     * Calculate uptime score
     */
    calculateUptimeScore(hours) {
        if (hours >= 168) return 100; // 1 week+
        if (hours >= 72) return 90;   // 3 days+
        if (hours >= 24) return 80;   // 1 day+
        if (hours >= 12) return 70;   // 12 hours+
        if (hours >= 6) return 60;    // 6 hours+
        return Math.max(30, hours * 5); // Scale linearly below 6 hours
    }

    /**
     * Calculate application health score
     */
    calculateApplicationScore(applications) {
        if (!applications || applications.length === 0) return 100;

        const runningApps = applications.filter(app => app.status === 'running').length;
        const shouldBeRunning = applications.filter(app => app.shouldBeRunning).length;
        
        if (shouldBeRunning === 0) return 100;
        
        const ratio = runningApps / shouldBeRunning;
        return Math.round(ratio * 100);
    }

    /**
     * Calculate display health score
     */
    calculateDisplayScore(displays) {
        const displayArray = Object.values(displays);
        if (displayArray.length === 0) return 100;

        const onlineDisplays = displayArray.filter(display => display.online).length;
        const ratio = onlineDisplays / displayArray.length;
        return Math.round(ratio * 100);
    }

    /**
     * Evaluate monitoring configuration quality
     */
    evaluateMonitoringConfig(monitoring = {}) {
        let score = 100;
        let issues = [];

        if (!monitoring.enabled) {
            score -= 50;
            issues.push('Monitoring is disabled');
        }

        if (!monitoring.thresholds) {
            score -= 30;
            issues.push('No monitoring thresholds configured');
        } else {
            // Check if thresholds are reasonable
            const { cpu, memory, disk } = monitoring.thresholds;
            if (cpu?.critical > 95) {
                score -= 10;
                issues.push('CPU critical threshold too high');
            }
            if (memory?.critical > 95) {
                score -= 10;
                issues.push('Memory critical threshold too high');
            }
            if (disk?.critical > 98) {
                score -= 10;
                issues.push('Disk critical threshold too high');
            }
        }

        if (monitoring.interval > 60000) {
            score -= 10;
            issues.push('Monitoring interval too long');
        }

        return { score: Math.max(0, score), issues };
    }

    /**
     * Evaluate notification configuration quality
     */
    evaluateNotificationConfig(notifications = {}) {
        let score = 100;
        let issues = [];

        if (!notifications.enabled) {
            score -= 40;
            issues.push('Notifications are disabled');
        }

        if (notifications.channels) {
            const enabledChannels = Object.values(notifications.channels).filter(ch => ch.enabled).length;
            if (enabledChannels === 0) {
                score -= 30;
                issues.push('No notification channels configured');
            }
        }

        if (!notifications.alertLevels || notifications.alertLevels.length === 0) {
            score -= 20;
            issues.push('No alert levels configured');
        } else if (!notifications.alertLevels.includes('critical')) {
            score -= 15;
            issues.push('Critical alerts not enabled');
        }

        return { score: Math.max(0, score), issues };
    }

    /**
     * Evaluate installation configuration quality
     */
    evaluateInstallationConfig(installation = {}) {
        let score = 100;
        let issues = [];

        if (!installation.name || installation.name === 'Installation Up 4evr') {
            score -= 20;
            issues.push('Installation name not customized');
        }

        if (!installation.description) {
            score -= 15;
            issues.push('No installation description provided');
        }

        if (!installation.location) {
            score -= 10;
            issues.push('Installation location not specified');
        }

        if (!installation.contact) {
            score -= 10;
            issues.push('No contact information provided');
        }

        return { score: Math.max(0, score), issues };
    }

    /**
     * Get health rating based on score
     */
    getHealthRating(score) {
        if (score >= this.thresholds.excellent) return 'excellent';
        if (score >= this.thresholds.good) return 'good';
        if (score >= this.thresholds.fair) return 'fair';
        if (score >= this.thresholds.poor) return 'poor';
        return 'critical';
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(scores, systemData, configData) {
        const recommendations = [];
        const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };

        // Performance recommendations
        if (scores.performance.score < 80) {
            scores.performance.factors.forEach(factor => {
                switch (factor.type) {
                    case 'cpu':
                        recommendations.push({
                            category: 'performance',
                            priority: factor.usage > 90 ? 'critical' : 'high',
                            title: 'High CPU Usage Detected',
                            description: `CPU usage is at ${factor.usage}%. Consider closing unnecessary applications or processes.`,
                            action: 'Check Activity Monitor for resource-intensive processes',
                            impact: 'Performance'
                        });
                        break;
                    case 'memory':
                        recommendations.push({
                            category: 'performance',
                            priority: factor.usage > 90 ? 'critical' : 'high',
                            title: 'High Memory Usage',
                            description: `Memory usage is at ${factor.usage}%. This may cause system slowdowns or crashes.`,
                            action: 'Close unused applications or add more RAM',
                            impact: 'Performance & Stability'
                        });
                        break;
                    case 'disk':
                        recommendations.push({
                            category: 'performance',
                            priority: factor.usage > 95 ? 'critical' : 'high',
                            title: 'Low Disk Space',
                            description: `Disk usage is at ${factor.usage}%. Free up space to prevent system issues.`,
                            action: 'Delete unnecessary files or move data to external storage',
                            impact: 'Performance & Stability'
                        });
                        break;
                    case 'temperature':
                        recommendations.push({
                            category: 'performance',
                            priority: factor.value > 85 ? 'high' : 'medium',
                            title: 'High System Temperature',
                            description: `CPU temperature is ${factor.value}°C. This may indicate cooling issues.`,
                            action: 'Check system ventilation and clean dust from fans',
                            impact: 'Hardware Longevity'
                        });
                        break;
                }
            });
        }

        // Stability recommendations
        if (scores.stability.score < 80) {
            scores.stability.factors.forEach(factor => {
                switch (factor.type) {
                    case 'uptime':
                        if (factor.hours < 24) {
                            recommendations.push({
                                category: 'stability',
                                priority: 'medium',
                                title: 'Recent System Restart',
                                description: `System uptime is only ${factor.hours} hours. Monitor for stability issues.`,
                                action: 'Check system logs for crash reports or unexpected restarts',
                                impact: 'Stability'
                            });
                        }
                        break;
                    case 'applications':
                        const stoppedApps = factor.apps.filter(app => app.shouldBeRunning && app.status !== 'running');
                        if (stoppedApps.length > 0) {
                            recommendations.push({
                                category: 'stability',
                                priority: 'high',
                                title: 'Critical Applications Not Running',
                                description: `${stoppedApps.length} critical application(s) are not running: ${stoppedApps.map(app => app.name).join(', ')}`,
                                action: 'Restart stopped applications and check their configuration',
                                impact: 'Installation Functionality'
                            });
                        }
                        break;
                    case 'displays':
                        const offlineDisplays = Object.values(factor.displays).filter(d => !d.online);
                        if (offlineDisplays.length > 0) {
                            recommendations.push({
                                category: 'stability',
                                priority: 'high',
                                title: 'Display Issues Detected',
                                description: `${offlineDisplays.length} display(s) are offline or not responding.`,
                                action: 'Check display connections and power status',
                                impact: 'Installation Functionality'
                            });
                        }
                        break;
                }
            });
        }

        // Security recommendations
        if (scores.security.score < 80) {
            scores.security.factors.forEach(factor => {
                switch (factor.type) {
                    case 'sip':
                        recommendations.push({
                            category: 'security',
                            priority: 'medium',
                            title: 'System Integrity Protection Disabled',
                            description: 'SIP is disabled, which reduces system security.',
                            action: 'Enable SIP unless specifically required for your installation',
                            impact: 'Security'
                        });
                        break;
                    case 'gatekeeper':
                        recommendations.push({
                            category: 'security',
                            priority: 'medium',
                            title: 'Gatekeeper Disabled',
                            description: 'Gatekeeper is disabled, allowing unsigned apps to run.',
                            action: 'Enable Gatekeeper to prevent malicious software',
                            impact: 'Security'
                        });
                        break;
                    case 'firewall':
                        recommendations.push({
                            category: 'security',
                            priority: 'medium',
                            title: 'Firewall Disabled',
                            description: 'System firewall is disabled, reducing network security.',
                            action: 'Enable firewall for better network protection',
                            impact: 'Security'
                        });
                        break;
                }
            });
        }

        // Configuration recommendations
        if (scores.configuration.score < 80) {
            scores.configuration.factors.forEach(factor => {
                switch (factor.type) {
                    case 'monitoring':
                        recommendations.push({
                            category: 'configuration',
                            priority: 'medium',
                            title: 'Improve Monitoring Configuration',
                            description: `Monitoring issues: ${factor.issues.join(', ')}`,
                            action: 'Review and optimize monitoring settings',
                            impact: 'System Visibility'
                        });
                        break;
                    case 'notifications':
                        recommendations.push({
                            category: 'configuration',
                            priority: 'medium',
                            title: 'Configure Notifications',
                            description: `Notification issues: ${factor.issues.join(', ')}`,
                            action: 'Set up notification channels for alerts',
                            impact: 'Incident Response'
                        });
                        break;
                    case 'installation':
                        recommendations.push({
                            category: 'configuration',
                            priority: 'low',
                            title: 'Complete Installation Information',
                            description: `Installation setup issues: ${factor.issues.join(', ')}`,
                            action: 'Update installation details in settings',
                            impact: 'Documentation'
                        });
                        break;
                }
            });
        }

        // Sort recommendations by priority
        return recommendations.sort((a, b) => {
            return priorityMap[b.priority] - priorityMap[a.priority];
        });
    }

    /**
     * Get health trend analysis (requires historical data)
     */
    analyzeHealthTrend(currentScore, historicalScores = []) {
        if (historicalScores.length < 2) {
            return { trend: 'insufficient_data', message: 'Not enough data for trend analysis' };
        }

        const recentScores = historicalScores.slice(-5); // Last 5 scores
        const averageRecent = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
        const difference = currentScore - averageRecent;

        if (difference > 5) {
            return { trend: 'improving', message: 'System health is improving', change: difference };
        } else if (difference < -5) {
            return { trend: 'declining', message: 'System health is declining', change: difference };
        } else {
            return { trend: 'stable', message: 'System health is stable', change: difference };
        }
    }

    /**
     * Generate summary report
     */
    generateHealthReport(systemData, configData = {}) {
        const healthScore = this.calculateHealthScore(systemData, configData);
        const timestamp = new Date().toISOString();

        return {
            timestamp,
            score: healthScore.overall,
            rating: healthScore.rating,
            breakdown: healthScore.breakdown,
            recommendations: healthScore.recommendations.slice(0, 10), // Top 10 recommendations
            summary: {
                criticalIssues: healthScore.recommendations.filter(r => r.priority === 'critical').length,
                highPriorityIssues: healthScore.recommendations.filter(r => r.priority === 'high').length,
                totalRecommendations: healthScore.recommendations.length,
                categories: {
                    performance: healthScore.breakdown.performance.score,
                    stability: healthScore.breakdown.stability.score,
                    security: healthScore.breakdown.security.score,
                    configuration: healthScore.breakdown.configuration.score
                }
            }
        };
    }
}

module.exports = HealthScoringEngine;